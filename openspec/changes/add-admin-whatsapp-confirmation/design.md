# Design: Secure admin review and non-blocking WhatsApp document receipts

## Decision summary

Implement the change as a small server-rendered Astro vertical slice backed entirely by Turso. A registration is committed first; creation and dispatch of its receipt notification happen afterward and can never roll the registration back. Admin authentication uses one pre-hashed password, a signed opaque cookie, and revocable Turso sessions. The admin panel is a view over persisted registration rows only: it does not maintain an expected roster or infer anything about people who never submitted the form.

WhatsApp is reached only through a narrow `ReceiptMessenger` boundary whose command always carries the immutable PDF media URL, filename, MIME type, and Spanish caption. Its Evolution API implementation is a configurable document/media adapter, not a flat text sender. A normal successful outcome requires trustworthy provider acceptance of that document/media submission; acceptance of text containing only the URL is a failure, not `sent`. Endpoint path, authentication, nested request field paths, and response-success evidence remain configurable because the operated Evolution API contract has not been verified in the repository. Dispatch remains disabled until the exact operated instance and non-secret profile fingerprint have passed the document-receipt release check.

The initial terms artifact is centralized as `draft-2026-09-v1`, published at `/documentos/bases-y-categorias/borrador-2026-09-v1.pdf`, generated offline from versioned repository content, committed under `public/`, checksum-verified during build, and never overwritten. A correction requires a new version, source, URL, filename, checksum, and current-manifest selection; rows and retries keep using their original immutable snapshot.

The first release records accepted document submission as `sent`; it does not implement webhooks, `delivered`, or `read`.

## Goals and constraints

- Keep Astro 5 server output, Vercel, Turso/libSQL, strict TypeScript, and zero client framework.
- Keep `/api/signups` successful after the registration commit even if every notification step fails.
- Submit the referenced PDF as a WhatsApp document/media attachment on every normal attempt; never substitute a URL-only text send.
- Model review state, participant response, and receipt notification independently.
- List and report only persisted registrations and their own statuses; do not add expected-roster import, comparison, or synthetic “unregistered” people.
- Keep provider wire uncertainty inside a validated server-only profile and keep dispatch off until validation.
- Do not host Evolution API, a WhatsApp session, a queue worker, or PDF generation in Vercel request handlers.
- Do not message historical registrations automatically.
- Do not present draft categories or unresolved facts as approved legal terms.

## Architecture and data flow

```text
Public browser
  -> POST /api/signups
  -> validation + conservative Argentina normalizer
  -> registration service -> Turso registration commit
  -> receipt service -> Turso logical notification + immutable attachment snapshot
                     -> claim one attempt lease
                     -> ReceiptMessenger.send(document command)
                     -> EvolutionDocumentHttpMessenger
                          -> validated document/media profile
                          -> external HTTPS Evolution API
                     -> Turso attempt outcome
  <- saved-registration response, independent of receipt result

Admin browser
  -> /admin/login -> password verifier + Turso throttle/session
  -> middleware -> signed cookie + live Turso session
  -> server-rendered list/detail pages
       -> SELECT from persisted barber_signups
       -> LEFT JOIN each row's receipt state
       -> no roster or absent-person data source
  -> CSRF-protected POST endpoints -> lifecycle/retry services -> Turso

Versioned terms source
  -> offline PDF generator
  -> committed immutable public PDF + SHA-256 manifest
  -> build verification
  -> absolute URL snapshot in notification
  -> Evolution API retrieves that URL for the document submission
```

HTTP handlers only parse requests and format responses. Domain services own ordering and state transitions; repositories own parameterized SQL; the provider adapter owns all Evolution-specific wire behavior. Services receive repositories, clock, random source, current-terms manifest, configuration, and messenger as dependencies so automated tests do not import real secrets or call networks.

## Domain contracts

Use readonly discriminated unions rather than boolean “confirmed” fields:

```ts
type ReviewState = 'received' | 'under_review' | 'selected' | 'rejected' | 'withdrawn';
type ParticipantResponseState = 'not_requested' | 'pending' | 'confirmed' | 'declined';
type ReceiptStatus = 'pending' | 'sent' | 'failed' | 'uncertain';

type ReceiptDocument = Readonly<{
  kind: 'document';
  mediaUrl: string;                 // absolute immutable HTTPS URL
  filename: string;                 // immutable .pdf display filename
  mimeType: 'application/pdf';
  caption: string;                  // receipt-only Spanish copy, including fallback URL
}>;

type SendReceiptCommand = Readonly<{
  logicalMessageKey: string;
  attemptKey: string;
  toE164: `+54${string}`;
  attachment: ReceiptDocument;
}>;

type SendReceiptResult =
  | {
      kind: 'accepted';
      acceptedArtifact: 'document';
      evidence: 'validated-document-status' | 'document-response-marker';
      providerMessageId?: string;
      httpStatus: number;
    }
  | { kind: 'rejected'; code: SafeErrorCode; httpStatus?: number }
  | { kind: 'uncertain'; code: SafeErrorCode; httpStatus?: number };

interface ReceiptMessenger {
  send(command: SendReceiptCommand): Promise<SendReceiptResult>;
}
```

`ReceiptMessenger.send` has no text-only overload. An adapter may return `accepted` only when all of these are true:

1. the command passed domain validation for an immutable HTTPS PDF URL, `.pdf` filename, exact `application/pdf` MIME type, and non-empty receipt-only caption;
2. the adapter constructed every configured document/media field, including destination, media URL, filename, MIME type, and caption;
3. the active non-secret wire profile matches the fingerprint validated against the operated instance; and
4. the response matches the profile's validated document-acceptance rule.

Provider acceptance means only that the operated provider accepted the requested document/media submission. It is not proof of WhatsApp delivery, reading, PDF opening, selection, participant response, or legal consent. No provider-specific type appears in public registration, admin lifecycle, or repository APIs.

## Current draft-terms manifest and attachment snapshot

Define one typed server-safe manifest entry and one explicit current pointer, for example in `src/lib/terms/draft-terms-manifest.ts`:

```ts
const DRAFT_TERMS = {
  'draft-2026-09-v1': {
    version: 'draft-2026-09-v1',
    sourcePath: 'content/draft-terms/draft-2026-09-v1.json',
    publicPath: '/documentos/bases-y-categorias/borrador-2026-09-v1.pdf',
    filename: 'bases-y-categorias-batalla-de-barberos-borrador-2026-09-v1.pdf',
    mimeType: 'application/pdf',
    legalMarker: 'BORRADOR — PENDIENTE DE REVISIÓN LEGAL',
    sha256: '<committed-build-output>',
  },
} as const;

export const CURRENT_DRAFT_TERMS_VERSION = 'draft-2026-09-v1' as const;
```

The registration service resolves the current entry once, combines `publicPath` with `CANONICAL_SITE_ORIGIN`, validates the resulting URL, builds the caption, and persists the complete immutable attachment/copy snapshot in the logical notification. Retries read that row; they never resolve “latest” terms or rebuild the caption from the then-current pointer. Changing the current pointer is allowed only together with a newly named immutable manifest entry and generated file. Existing entries and bytes remain available.

## Data model and migration

### Additive migration

Extend `scripts/migrate.mjs` into a versioned runner with `schema_migrations(version TEXT PRIMARY KEY, applied_at TEXT NOT NULL)`. It first retains the current `CREATE TABLE IF NOT EXISTS barber_signups`, then applies `002_admin_whatsapp` once in a write transaction. The migration adds these columns to `barber_signups`:

| Column | Definition and use |
| --- | --- |
| `phone_e164` | Nullable `TEXT`; required by application code for new rows, `NULL` for unverifiable historical values. |
| `submission_key` | Nullable `TEXT`; client UUID for replay recognition; unique partial index when non-null. |
| `submission_fingerprint` | Nullable 64-character SHA-256 hex of canonical accepted input; required for new rows. |
| `review_state` | `TEXT NOT NULL DEFAULT 'received'` with enum `CHECK`. |
| `participant_response_state` | `TEXT NOT NULL DEFAULT 'not_requested'` with enum `CHECK`. |
| `terms_version` | Nullable `TEXT`; exact draft version associated with a new signup. |
| `notice_version` | Nullable `TEXT`; participation/privacy copy version acknowledged by a new signup. |
| `receipt_required` | `INTEGER NOT NULL DEFAULT 0 CHECK (receipt_required IN (0,1))`; application writes `1` for new rows. |
| `state_version` | `INTEGER NOT NULL DEFAULT 0`; optimistic concurrency for admin lifecycle writes. |

Historical rows therefore receive explicit lifecycle defaults, `receipt_required = 0`, and no terms version, notification, or automatic message. Their original `phone` remains untouched and their normalized phone is shown as “No disponible (registro anterior)” rather than guessed. Historical rows still appear because they are persisted submissions; no non-submitter is synthesized.

Create these tables:

```sql
CREATE TABLE receipt_notifications (
  id TEXT PRIMARY KEY,
  logical_message_key TEXT NOT NULL UNIQUE,
  registration_id TEXT NOT NULL,
  terms_version TEXT NOT NULL,
  attachment_kind TEXT NOT NULL CHECK (attachment_kind = 'document'),
  media_url TEXT NOT NULL,
  media_filename TEXT NOT NULL,
  media_mime_type TEXT NOT NULL CHECK (media_mime_type = 'application/pdf'),
  media_sha256 TEXT NOT NULL CHECK (length(media_sha256) = 64),
  caption_text TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','sent','failed','uncertain')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  provider_message_id TEXT,
  last_error_code TEXT,
  last_error_message TEXT,
  last_attempt_at TEXT,
  sent_at TEXT,
  lease_token TEXT,
  lease_expires_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (registration_id, terms_version),
  FOREIGN KEY (registration_id) REFERENCES barber_signups(id) ON DELETE RESTRICT
);

CREATE TABLE receipt_notification_attempts (
  id TEXT PRIMARY KEY,
  notification_id TEXT NOT NULL,
  attempt_no INTEGER NOT NULL CHECK (attempt_no > 0),
  attempt_key TEXT NOT NULL UNIQUE,
  trigger TEXT NOT NULL CHECK (trigger IN ('automatic','admin_retry','admin_reconcile')),
  outcome TEXT NOT NULL CHECK (outcome IN ('in_progress','sent','failed','uncertain')),
  provider_http_status INTEGER,
  provider_message_id TEXT,
  acceptance_evidence TEXT CHECK (
    acceptance_evidence IS NULL OR
    acceptance_evidence IN ('validated-document-status','document-response-marker')
  ),
  error_code TEXT,
  error_message TEXT,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  UNIQUE (notification_id, attempt_no),
  FOREIGN KEY (notification_id) REFERENCES receipt_notifications(id) ON DELETE RESTRICT
);

CREATE TABLE admin_sessions (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  csrf_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  last_seen_at TEXT NOT NULL
);

CREATE TABLE admin_login_throttle (
  key_hash TEXT PRIMARY KEY,
  window_started_at TEXT NOT NULL,
  failure_count INTEGER NOT NULL CHECK (failure_count >= 0),
  blocked_until TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE admin_audit_events (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  registration_id TEXT,
  action TEXT NOT NULL,
  from_value TEXT,
  to_value TEXT,
  request_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);
```

Application validation additionally limits URL/filename/caption lengths, requires the media URL to equal the selected manifest path under `CANONICAL_SITE_ORIGIN`, and permits only the manifest SHA-256. Add indexes for registration `(created_at DESC, id DESC)`, admin state filters, notification `(status, updated_at)`, attempts `(notification_id, attempt_no DESC)`, and session expiry. New timestamps are application-produced UTC ISO-8601 values. The runner records the migration version in the same transaction; any failure aborts deployment rather than partially applying the version.

### Identity and idempotency

`(registration_id, terms_version)` is the database authority for one logical receipt. `logical_message_key` is deterministic SHA-256 over a versioned prefix, registration UUID, and terms version. Every network attempt has a separate random `attempt_key`.

The updated browser creates one UUID submission key and retains it until a successful response. The endpoint accepts it in `Idempotency-Key`; omission remains compatible with existing callers. The server also hashes canonical validated input, including canonical phone, terms version, and notice version:

1. Insert a new registration with both values.
2. On a submission-key conflict, return a replay only when the fingerprint matches; otherwise return `409`.
3. On the existing unique-email conflict, load that row. An equal fingerprint is the same accepted submission and returns a replay; a different fingerprint returns the existing Spanish duplicate-email `409`.
4. A replay may create a missing logical notification for that persisted registration, but may dispatch only when it has zero attempts and wins the attempt lease. It never starts another attempt for an existing or stale attempt.

A first creation returns `201`; a recognized replay returns `200`. Both use the same non-committal public success copy.

## Lifecycle transitions

| Axis | Rules |
| --- | --- |
| Registration review | New rows start `received`. A CSRF-protected admin action may deliberately move from any allowed value to any other allowed value so organizers can correct disposition without invented business rules. No-op writes are rejected. |
| Participant response | New rows start `not_requested`. It has a separate control and may deliberately move among its four values. It is never changed by review or receipt code. The UI warns that it records a later human response, not receipt delivery. |
| Receipt | Creation is `pending`; a completed attempt moves it to `sent`, `failed`, or `uncertain`. Only `failed`/`uncertain` allow normal retry. `sent` is terminal for this slice. `delivered` is intentionally absent until an authenticated provider-event contract exists. |

Lifecycle updates use `state_version`: update with `WHERE id = ? AND state_version = ?`, increment on success, and return `409` on a stale form. The state update and allowlisted audit event are one transaction. No transition on one axis updates another axis.

## Argentina `+54` normalization

Add pinned `libphonenumber-js` as a server dependency, use its `max` metadata, and wrap it with a conservative policy rather than accepting every parser guess.

1. Trim and NFKC-normalize the input; allow only ASCII digits, spaces, `+`, parentheses, hyphen, and dot. `+` is allowed only first. Reject extensions, letters, control characters, repeated country prefixes, and values outside 8–32 characters.
2. Remove formatting into digits while remembering whether `+` or `00` was explicit.
3. Explicit international forms must be `+54…` or `0054…`. Bare international mobile `549` plus ten national digits is also accepted. Other country codes are rejected.
4. Domestic mobile notation must contain an explicit `15`. Remove one optional trunk `0`, try every split with a 2–4 digit area code followed by literal `15`, remove that `15`, and construct `+549<area><subscriber>`. Keep only candidates the pinned library validates as Argentina. Exactly one distinct valid candidate is required; zero or multiple candidates are rejected.
5. Bare ten-digit national inputs without `15`, bare `54` forms without the international mobile `9`, and any value requiring an inferred area/mobile split are rejected as ambiguous. The Spanish hint asks for `+54 9 …` or domestic `0… 15 …` notation.
6. Re-parse the one candidate, require country `AR`, library validity, and canonical E.164 matching `^\+54\d{10,11}$`; return that exact E.164 string. Do not infer WhatsApp availability.

Golden tests cover `+54 9 11 2345-6789`, `0054 9 11 2345-6789`, `5491123456789`, `011 15-2345-6789`, and a valid 3-digit-area-code domestic fixture, plus ambiguous national, foreign, extension, malformed, invalid-area, and multiple-candidate cases. Fixtures are pinned to the installed metadata version so future metadata changes are reviewed rather than silently altering normalization.

## Signup ordering, dispatch, and reconciliation

The registration service executes this exact sequence:

1. Validate fields, normalize phone, resolve `CURRENT_DRAFT_TERMS_VERSION`, derive its absolute immutable URL and caption, and derive idempotency values.
2. Commit the registration by itself. Before this commit no provider or notification call is permitted.
3. Insert-or-load the logical notification in a separate database operation, snapshotting terms version, document kind, media URL, filename, MIME type, SHA-256, and caption. Failure is logged safely and the response remains successful; `receipt_required = 1` plus a left join from that registration makes the absent notification record visible to admins.
4. If dispatch is disabled, or the configured non-secret profile does not match a recorded validated fingerprint, leave the notification `pending` with zero attempts and return success. Do not call Evolution API and do not downgrade to text.
5. Otherwise atomically claim a lease only when `status = pending`, `attempt_count = 0`, and no live lease exists. The claim increments `attempt_count`, inserts the `in_progress` attempt, and lasts provider timeout plus five seconds.
6. Revalidate the persisted attachment snapshot and await exactly one bounded `ReceiptMessenger.send` call. There is no hidden HTTP retry, fallback text endpoint, or unawaited promise.
7. Finalize notification and attempt while matching the lease token. Only `acceptedArtifact: 'document'` stores `sent`, provider message ID, acceptance evidence, and `sent_at`. Known document/media rejection, media-retrieval failure, or URL-only/text-only acceptance stores `failed`; timeout or ambiguous evidence stores `uncertain`.
8. Return saved-registration copy regardless of steps 3–7.

A Vercel termination after network send but before finalization leaves an expired `in_progress` lease. Admin queries label it “Pendiente vencido — resultado incierto”. Reconciliation first finalizes the stale attempt as `uncertain`; retry then requires the same explicit uncertainty acknowledgement as any other uncertain item. A persisted registration with no notification and a zero-attempt pending notification have a separate “Crear/enviar acuse pendiente” action. Concurrent claim failure returns `409` and sends nothing.

Reconciliation always starts from an existing `barber_signups` row. It cannot create a registration, import a name, or assign any state to a person absent from that table.

## Evolution API document/media boundary

### Configurable wire profile

`EvolutionDocumentHttpMessenger` receives an `EvolutionDocumentWireProfile` that alone constructs and interprets provider HTTP. There is no shipped flat-text profile. The profile contains:

- an HTTPS base URL and a document/media path template containing exactly one `{instance}`;
- authentication header name and `raw` or `bearer` formatting;
- safe, configurable dotted JSON field paths for destination, media URL, filename, MIME type, and caption;
- an optional media-kind field path plus its validated constant value (for example, a provider-specific value meaning `document`) when the endpoint does not encode the kind entirely in its path;
- destination formatting as `e164` or `digits`;
- an exact allowlist of HTTP statuses that can establish acceptance on the validated endpoint;
- success mode `status-only` or `json-value`;
- for `json-value`, a safe result field path and allowlists for accepted, known media-rejected, and known URL/text-only values;
- an optional provider-message-ID JSON path;
- an optional provider idempotency-header name; and
- a SHA-256 fingerprint over canonicalized non-secret profile values.

The profile parser rejects empty or duplicate required paths, ancestor/descendant collisions, arrays, numeric segments, and prototype-pollution segments such as `__proto__`, `prototype`, and `constructor`. It constructs a new JSON object from the typed command; it does not accept arbitrary JSON templates. All five command values—destination, media URL, filename, MIME type, and caption—must map exactly once. If the operated API requires a contract that cannot be represented safely by this profile, implementation adds another adapter behind `ReceiptMessenger`; domain and registration code do not gain provider wire fields.

`status-only` is valid only after an operator demonstrates that the configured status on that exact document/media endpoint means the document submission was accepted. `json-value` additionally requires a configured response value proving document/media acceptance. A generic 2xx from an unvalidated endpoint is never enough. A profile change alters its fingerprint and blocks dispatch until the changed profile is validated again.

If an idempotency header is configured only after operator verification, its value is the stable logical message key on every retry. When absent, the UI retains the duplicate-send warning for `uncertain` results.

The adapter requires the final URL to remain on the configured HTTPS origin, rejects credentials/query/hash in the base URL, uses `redirect: 'error'`, `Content-Type: application/json`, an `AbortController` timeout (default 7 seconds, allowed 1–15 seconds), and a 64 KiB response limit. It never logs headers, credentials, destination, caption, media URL query, raw request body, or raw response body. The attachment URL is not user-controlled; it must equal the immutable URL snapshotted from the terms manifest.

### Result mapping

| Observation | Domain result |
| --- | --- |
| Dispatch disabled or profile fingerprint absent/mismatched before a claim | Keep `pending` with zero attempts; no fetch and no text fallback. |
| Invalid local profile/attachment command discovered after a claim | `failed / CONFIG_INVALID`; no fetch. |
| Configured accepted HTTP status on a fingerprint-validated media endpoint, with `status-only` semantics validated for document acceptance | `accepted` with evidence `validated-document-status`. |
| Configured accepted HTTP status plus a matching configured document-acceptance JSON value | `accepted` with evidence `document-response-marker`. |
| Provider explicitly reports media rejection or media retrieval failure | `failed / PROVIDER_MEDIA_REJECTED` or `PROVIDER_MEDIA_FETCH_FAILED`. |
| Provider explicitly reports that text/URL was accepted without the requested attachment | `failed / PROVIDER_ATTACHMENT_NOT_ACCEPTED`; never `sent`. |
| 2xx with malformed JSON, a missing required result, or no trustworthy document-acceptance/rejection evidence | `uncertain / PROVIDER_MALFORMED_RESPONSE`. |
| HTTP 400/401/403/404/405/413/415/422/429 | `failed` with a static allowlisted code and status unless a validated body mapping gives the more specific media code. |
| HTTP 408/409, any 5xx, abort timeout, network/TLS error, oversized response, or result-finalization uncertainty | `uncertain` with a static allowlisted code. |
| Redirect or unsupported status | `failed` unless the validated operated profile explicitly classifies the status; redirects are never followed. |

An accepted result persists only an allowlisted provider ID string of at most 200 characters plus the acceptance-evidence enum. A response that appears to accept message text but rejects, omits, or cannot fetch the attachment is failed. The system never sends a compensating text-only message and never converts fallback-link visibility into attachment success.

The adapter does not claim delivery/read state. Before enabling dispatch, a release owner must verify endpoint path, auth scheme, destination encoding, every attachment field, caption limit, public media retrieval, success/rejection semantics, provider ID path, timeout behavior, and provider idempotency against the operated instance. The validation must receive the expected PDF as an actual WhatsApp document with the configured filename and caption; seeing only the URL or text fails validation.

### Receipt caption and attachment copy

A pure builder creates this Spanish caption without applicant PII:

> Recibimos tu inscripción a Batalla de Barberos.
>
> Este mensaje confirma únicamente la recepción de tu inscripción. No implica selección, aceptación para competir, confirmación de participación ni asignación de categoría.
>
> Adjuntamos las bases y categorías: BORRADOR — PENDIENTE DE REVISIÓN LEGAL.
>
> Si no podés abrir el documento adjunto, consultá esta misma versión: `<immutable absolute URL>`

For the initial version, `ReceiptMessenger.send` receives:

| Attachment field | Value source |
| --- | --- |
| `kind` | Literal `document`. |
| `mediaUrl` | Persisted absolute URL for `/documentos/bases-y-categorias/borrador-2026-09-v1.pdf`. |
| `filename` | Persisted `bases-y-categorias-batalla-de-barberos-borrador-2026-09-v1.pdf`. |
| `mimeType` | Literal and persisted `application/pdf`. |
| `caption` | Persisted copy above, including the same immutable URL only as fallback. |

The terms version, attachment metadata, and caption come from the notification row on retry, never from “current latest”. The fallback URL does not replace the required document attachment.

## Admin security, scope, and routes

### Submitted-registration-only read model

Every admin list, detail, filter, badge count, export-like response, and reconciliation query is rooted in `barber_signups`. Receipt data is joined by registration ID. The panel has no expected-roster table, import endpoint, comparison service, inferred record, or denominator representing invited/expected people.

- A persisted row may be labeled with its own review, participant-response, and receipt status.
- A persisted row whose required notification row is absent may be labeled “Inscripción recibida; acuse pendiente de conciliación”. This describes the persisted registration, not an absent person.
- A person with no persisted registration produces no row and no status.
- The empty state says “Todavía no hay inscripciones recibidas”; it does not say that named or expected people are unregistered.
- Aggregate counts are explicitly counts of submitted/persisted registrations only.

### Password and sessions

- Store only `ADMIN_PASSWORD_HASH`, encoded as `scrypt$v1$N=32768,r=8,p=1$<16-byte-salt-b64url>$<32-byte-hash-b64url>`. Verify asynchronously with Node `crypto.scrypt` (`maxmem` 64 MiB) and `timingSafeEqual`. A local interactive script generates hashes without putting plaintext in source, argv, logs, or Vercel variables.
- On login, generate independent 32-byte session and CSRF tokens. Store only SHA-256 hashes in `admin_sessions`.
- Cookie payload is `v1.<session-token>.<csrf-token>.<HMAC-SHA256 signature>` using independent `ADMIN_SESSION_SECRET_B64`. Verify signature before database lookup. Tampering fails closed; database lookup supplies revocation.
- Production cookie is `__Host-bdb_admin`; local development uses `bdb_admin`. Set `HttpOnly`, `Secure` in production, `SameSite=Strict`, `Path=/`, no `Domain`, and an absolute/max-age expiry of 8 hours. Every protected request checks both signed cookie and unrevoked, unexpired database row.
- Logout is POST-only, CSRF-protected, sets `revoked_at`, and expires the cookie. Session-secret rotation invalidates every cookie; password, session, Turso, and Evolution credentials rotate independently.

### Login throttling and CSRF

Use Turso, not the existing in-memory limiter. Hash `clientAddress` with HMAC under the session secret and never store/log the raw address. Atomically count failed attempts in a 15-minute fixed window: block after 5 per-address failures and after 60 global failures; return generic Spanish errors and `Retry-After`. A success clears the address bucket. Missing addresses share a bounded `unknown` bucket. Passwords and hashes are never logged.

GET `/admin/login` issues a short-lived signed pre-auth CSRF token in an HttpOnly Strict cookie and hidden field. Login POST verifies token and same-origin. Authenticated forms receive the session CSRF token as a hidden field; POST handlers compare field, signed-cookie value, and stored hash in constant time. Existing Astro `security.checkOrigin: true` remains defense in depth. Missing/invalid proof returns `403` before mutation.

### Protected surface

`src/middleware.ts` protects `/admin/**` and `/api/admin/**`, excluding login. HTML requests redirect invalid sessions to `/admin/login`; APIs return `401`. All protected responses use `Cache-Control: private, no-store`, `X-Frame-Options: DENY`/`frame-ancestors 'none'`, and `Referrer-Policy: no-referrer`.

| Route | Behavior |
| --- | --- |
| `GET /admin/login` | Password form; redirects an authenticated session to `/admin`. |
| `POST /api/admin/login` | CSRF/throttle/password checks, session creation, then `303 /admin`. |
| `POST /api/admin/logout` | Revokes active session and redirects to login. |
| `GET /admin` | Keyset-paginated 50-row list of persisted registrations, newest first, with three separately labeled state areas and a notification-attention filter. |
| `GET /admin/inscripciones/[id]` | PII detail for one persisted registration, canonical phone, terms/versioned attachment link, lifecycle controls, attempts, sanitized diagnostic, and audit history. |
| `POST /api/admin/registrations/[id]/review-state` | Validated review transition plus optimistic version/audit. |
| `POST /api/admin/registrations/[id]/participant-response` | Independent participant-response transition plus optimistic version/audit. |
| `POST /api/admin/registrations/[id]/receipt/retry` | Only failed/uncertain; uncertain requires explicit `ackUncertain=1`. |
| `POST /api/admin/registrations/[id]/receipt/reconcile` | Existing registration with an absent notification, zero-attempt pending, or stale-pending state; never a known sent item. |

Pages are server-rendered Astro with plain HTML forms and Post/Redirect/Get; no hydrated framework is introduced. The visual treatment extends the existing dark, gold, industrial event language but prioritizes readable tables, text labels plus color, keyboard focus, field errors, and responsive definition lists. Spanish labels are explicit: “Revisión de inscripción”, “Respuesta del participante”, and “Acuse documental por WhatsApp”. A sent badge reads “Documento aceptado por el proveedor; entrega no verificada”. The uncertain retry warning says the provider may already have accepted the document and retrying may duplicate it.

## PDF, legal copy, and privacy boundaries

- Version source: `content/draft-terms/draft-2026-09-v1.json`; manifest key: `draft-2026-09-v1`; public path: `/documentos/bases-y-categorias/borrador-2026-09-v1.pdf`; attachment filename: `bases-y-categorias-batalla-de-barberos-borrador-2026-09-v1.pdf`.
- `scripts/generate-terms-pdf.mjs` uses `pdfkit` offline with fixed metadata/timestamps and a page model that repeats `BORRADOR — PENDIENTE DE REVISIÓN LEGAL` on every page. It renders the four proposal categories and retains every unresolved `[A DEFINIR]`/legal-review placeholder.
- The generated PDF is committed. A committed SHA-256 manifest and `pnpm terms:verify` reproduce and compare exact bytes; generation refuses to replace different bytes at an existing version path. `pnpm build` runs verification first. A correction requires a new source version, URL, filename, manifest entry, and current-version pointer; old bytes remain.
- Vercel serves the PDF statically with `Content-Type: application/pdf` and `Cache-Control: public, max-age=31536000, immutable`. It contains no names, registrations, tokens, secret query parameters, personalized generation, analytics identifiers, or runtime data.
- A shared `DraftTermsLink.astro` always renders the exact marker beside the versioned link. Signup success, signup acknowledgement, participation, privacy, and every terms/rules label use that component or the same constant. Tests prohibit an unmarked terms-link component usage.

Public success copy states that the registration is saved, does not mean selection or a confirmed place, and that a WhatsApp receipt with the draft PDF attached will be attempted but non-arrival does not invalidate the registration. It does not vary by provider outcome or claim submission/delivery success. The form acknowledgement is described as reading the displayed participation/privacy notices, not acceptance of final competition rules.

Participation copy separates application receipt, organizer selection, and later participant response. Privacy copy states that the normalized number, receipt caption, immutable PDF URL, filename, and MIME type are processed through the organization’s external Evolution API/WhatsApp path, that a provider failure does not invalidate storage, and that message/PDF receipt or opening is not legal consent. Unknown processor owner, hosting location, retention, official contact, event facts, and legal basis remain explicit `[A DEFINIR CON REVISIÓN LEGAL]`; implementation must not invent them. Removing the draft marker or placeholders is a separate approved content/version change.

## Observability and sanitization

Use small structured `console` records suitable for Vercel, with `event`, `requestId`, internal registration/notification/attempt/session IDs, outcome, duration, allowlisted HTTP status, acceptance-evidence enum, and safe error code. Never record name, email, raw/canonical phone, caption, media URL, filename when it could contain user data, password/hash, cookies, CSRF value, IP, provider credential/header, full provider URL, raw response, or SQL arguments.

Persist only static Spanish diagnostics of at most 240 characters selected by `SafeErrorCode`: `CONFIG_INVALID`, `PROVIDER_TIMEOUT`, `PROVIDER_NETWORK`, `PROVIDER_AUTH`, `PROVIDER_RATE_LIMIT`, `PROVIDER_REJECTED`, `PROVIDER_MEDIA_REJECTED`, `PROVIDER_MEDIA_FETCH_FAILED`, `PROVIDER_ATTACHMENT_NOT_ACCEPTED`, `PROVIDER_SERVER`, `PROVIDER_MALFORMED_RESPONSE`, `PROVIDER_RESPONSE_TOO_LARGE`, and `ATTEMPT_BUSY`. Raw `Error.message`, stack, and body never enter notification tables or admin HTML. Unexpected internals receive a request ID and generic UI message. Audit rows contain only internal IDs, action, old/new enum values, request ID, and timestamp.

## Environment and configuration

All values are server-only and typed/validated at startup or first use. Provider settings are required only when dispatch is requested. Preview deployments keep dispatch disabled. There is no default text-send endpoint or payload.

| Variable | Rule |
| --- | --- |
| `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` | Existing Turso credentials. |
| `ADMIN_PASSWORD_HASH` | Required valid scrypt encoding for admin login. |
| `ADMIN_SESSION_SECRET_B64` | Required independent random secret, at least 32 decoded bytes. |
| `CANONICAL_SITE_ORIGIN` | HTTPS production origin, no path/query/hash; builds absolute immutable PDF URLs. |
| `WHATSAPP_DISPATCH_ENABLED` | Exact `true` requests calls; absent/false leaves visible pending work. It is not sufficient without a validated profile match. |
| `EVOLUTION_API_BASE_URL`, `EVOLUTION_API_INSTANCE`, `EVOLUTION_API_KEY` | External instance connection; base must be HTTPS outside local test. |
| `EVOLUTION_API_SEND_DOCUMENT_PATH_TEMPLATE` | Relative document/media path containing exactly one `{instance}`; no text-path fallback. |
| `EVOLUTION_API_AUTH_HEADER`, `EVOLUTION_API_AUTH_SCHEME` | Valid header token and `raw`/`bearer`. |
| `EVOLUTION_API_DESTINATION_FIELD_PATH` | Safe dotted JSON path for the normalized destination. |
| `EVOLUTION_API_MEDIA_URL_FIELD_PATH` | Safe dotted JSON path for the immutable PDF source URL. |
| `EVOLUTION_API_FILENAME_FIELD_PATH` | Safe dotted JSON path for the immutable PDF filename. |
| `EVOLUTION_API_MIME_TYPE_FIELD_PATH` | Safe dotted JSON path for `application/pdf`. |
| `EVOLUTION_API_CAPTION_FIELD_PATH` | Safe dotted JSON path for the receipt-only caption. |
| `EVOLUTION_API_MEDIA_KIND_FIELD_PATH`, `EVOLUTION_API_MEDIA_KIND_VALUE` | Optional pair when the operated endpoint requires an explicit provider-specific document kind. |
| `EVOLUTION_API_DESTINATION_FORMAT` | `e164` or `digits`, verified for the operated instance. |
| `EVOLUTION_API_ACCEPTED_HTTP_STATUSES` | Required comma-separated exact statuses demonstrated to accept a document/media submission. |
| `EVOLUTION_API_SUCCESS_MODE` | `status-only` or `json-value`, with the trust requirements described above. |
| `EVOLUTION_API_RESULT_FIELD_PATH` | Required safe dot path for `json-value`; omitted for validated `status-only`. |
| `EVOLUTION_API_ACCEPTED_VALUES` | Required allowlisted scalar values for `json-value` document acceptance. |
| `EVOLUTION_API_MEDIA_REJECTED_VALUES` | Optional known scalar values proving attachment rejection/media-fetch failure. |
| `EVOLUTION_API_URL_ONLY_VALUES` | Optional known scalar values proving only URL/text acceptance; these map to failure. |
| `EVOLUTION_API_MESSAGE_ID_PATH` | Optional allowlisted dot path to an ID string. |
| `EVOLUTION_API_IDEMPOTENCY_HEADER` | Optional; set only after provider support is verified. |
| `EVOLUTION_API_TIMEOUT_MS` | Optional 1,000–15,000; default 7,000. |
| `EVOLUTION_API_VALIDATED_PROFILE_SHA256` | Required when dispatch is enabled; must equal the computed SHA-256 of canonical non-secret profile fields recorded by the successful operated-instance document validation. Any profile change invalidates it. |

Configuration parsing returns only domain-safe configuration errors and never echoes values. If `WHATSAPP_DISPATCH_ENABLED=true` but the profile is incomplete, unsafe, or fingerprint-mismatched, provider calls remain blocked and pending registrations remain reconcilable.

## File change map

| Area | Files |
| --- | --- |
| Dependencies/scripts | Modify `package.json`, `pnpm-lock.yaml`; add Vitest config, interactive password-hash script, PDF generate/verify scripts, and versioned migration definitions used by `scripts/migrate.mjs`. |
| Configuration/operations | Modify `astro.config.mjs`, `vercel.json`, `environment.example`, and `README.md`; add typed server configuration and profile-fingerprint validation. |
| Registration | Refactor `src/lib/barber-signups.ts`, `src/pages/api/signups.ts`, and `src/components/SignupForm.astro`; add Argentina phone, registration repository/service, idempotency, and draft-terms manifest modules. |
| Notifications | Add provider-neutral `contracts.ts`, receipt caption builder, receipt service, and Evolution document-profile/HTTP-adapter modules under `src/lib/server/notifications/`. Do not add a text-send profile. |
| Admin security | Add password, cookie/session, CSRF, throttle, audit/repository helpers, `src/middleware.ts`, and Astro locals typing. |
| Admin UI | Add admin layout/components, login/list/detail pages, and the protected POST routes listed above; extend `src/styles/global.css`. No roster/import/comparison page or API is added. |
| Legal/PDF | Modify `src/pages/participacion.astro`, `src/pages/privacidad.astro`, relevant signup/public copy, and a shared terms-link component; add `content/draft-terms/draft-2026-09-v1.json`, its checksum manifest entry, and `public/documentos/bases-y-categorias/borrador-2026-09-v1.pdf`. |
| Tests | Add focused `tests/unit/` and `tests/integration/` suites plus local in-memory libSQL fixtures using the real migrations. |

## Failure modes

| Failure | Required behavior |
| --- | --- |
| Invalid/ambiguous phone | `422`, Spanish field error, no registration. |
| Registration database failure | `500`, no notification creation and no provider call. |
| Same accepted submission replay | `200`, no extra registration/logical notification/attempt. |
| Logical notification insert failure | Registration remains saved; `201`; admin left join over that persisted row shows receipt reconciliation is needed. |
| Dispatch disabled or profile not validated/matched | Registration remains saved; notification stays `pending` with zero attempts; no provider or text fallback call. |
| Attachment command/profile invalid after claim | Registration success; notification `failed` with `CONFIG_INVALID`; no provider call. |
| Provider accepts the exact configured document submission with trustworthy evidence | Registration success; notification `sent`; persist allowlisted ID/evidence only; do not claim delivery. |
| Provider rejects/cannot retrieve PDF media | Registration success; notification `failed`; safe diagnostic and retry available. |
| Provider establishes URL-only/text-only acceptance | Registration success; notification `failed` with `PROVIDER_ATTACHMENT_NOT_ACCEPTED`; never `sent`. |
| Generic 2xx without trustworthy document evidence | Registration success; notification `uncertain`; never `sent`. |
| Timeout/network/5xx/malformed response | Registration success; notification `uncertain`; duplicate warning required. |
| Result persistence failure after call | Expired lease becomes visible/uncertain; never silently treated as failed. |
| Concurrent signup/retry | Unique keys and lease allow one attempt; loser sends nothing. |
| Auth/session database outage | Fail closed with no PII; login/protected actions unavailable. |
| Invalid/expired/revoked session or CSRF | `401`/redirect or `403`; no mutation. |
| Person has no persisted registration | No admin row, inferred status, aggregate classification, or action exists for that person. |
| PDF missing, checksum changed, or existing version replaced | `terms:verify` and build fail. |
| Current terms pointer changes without a new immutable entry/file | Manifest verification fails; existing notification snapshots remain unchanged. |

## Testing strategy and strict TDD

Add `vitest` and `@vitest/coverage-v8`; add `test`, `test:watch`, and `test:coverage` scripts. Vitest is preferred over a new end-to-end stack because it handles TypeScript/ESM cleanly and can exercise pure services plus local `file::memory:` libSQL while keeping Astro route modules thin.

Implement each slice red-green-refactor in this order:

1. **Phone policy:** normalizer golden/rejection tests and registration validation.
2. **Migration/repositories:** historical defaults, notification attachment snapshot fields, constraints, one logical notification per registration/version, pagination, joins rooted in registrations, and optimistic updates.
3. **Signup orchestration:** registration commit precedes notification/provider work; notification failure, disabled dispatch, unvalidated profile, replay, conflict, and concurrent lease behavior; saved response never claims WhatsApp success.
4. **Domain attachment contract and copy:** `ReceiptMessenger.send` receives exact media URL, filename, `application/pdf`, and required caption; retries use the stored snapshot; the caption contains receipt-only semantics, draft marker, and fallback URL without PII.
5. **Evolution document adapter:** exact flat or nested field-path construction from one command; all required fields appear once; unsafe/colliding paths fail; auth/path/destination mapping; no hidden retry, redirects, text endpoint, or text-only fallback.
6. **Provider outcome mapping:** validated status-only and JSON-marker acceptance can return `acceptedArtifact: 'document'`; unvalidated/mismatched profiles cannot fetch; media rejection/fetch failure and known URL-only outcomes are `failed`; generic 2xx/malformed evidence, timeout, 5xx, and oversize responses are `uncertain`; provider ID and diagnostics are allowlisted.
7. **Admin security:** password vectors, cookie signature/tamper/expiry/revocation, login throttling, pre-auth/session CSRF, unauthorized route behavior, and logout.
8. **Lifecycle/retry/admin scope:** independent transitions and audit, sent retry denial, uncertainty acknowledgement, and reconciliation only for an existing persisted registration. Seed a non-database “expected person” fixture and prove it never appears; list/count/filter tests return only inserted `barber_signups` rows and their own statuses.
9. **PDF/current version/public copy:** active manifest is exactly `draft-2026-09-v1` with the expected source, path, filename, MIME, and hash; retry snapshots do not change after a newer manifest entry is selected; generation refuses in-place replacement; every page/reference has the draft marker and all placeholders/categories remain.

Route-contract tests invoke exported handlers with dependency-injected fakes and assert status/redirect/cache behavior; critical SQL tests use the real migration against local libSQL. No live Turso or Evolution instance is used in automated tests. A provider contract fixture is explicitly only a fixture, not evidence that a production Evolution version behaves that way.

Release smoke tests separately verify unauthenticated denial, login/logout, CSRF rejection, one test registration, provider-disabled behavior, submitted-registration-only list semantics, PDF direct `GET`/`HEAD`/checksum, and—only after profile validation—a designated test-recipient send that visibly receives the PDF as a document with expected filename, MIME handling, and caption. URL-only receipt fails the release check. Gates are `pnpm test`, `pnpm check`, `pnpm build`; `pnpm migrate` is run only against an explicitly selected database.

## Rollout and rollback

1. Generate `draft-2026-09-v1`, obtain content/legal review acknowledging its draft status, commit its checksum, and verify the immutable public URL in preview without changing any old assets.
2. Configure admin/site variables with `WHATSAPP_DISPATCH_ENABLED=false`; take the normal Turso backup/branch used by operations; apply the additive migration.
3. Deploy and smoke-test registration persistence, receipt-pending visibility on persisted rows, submitted-registration-only admin behavior, auth/session/logout/CSRF, lifecycle controls, and PDF availability. Preview dispatch stays disabled.
4. From the operated Evolution environment, verify that the exact public URL returns the committed PDF directly without authentication or secret query parameters, with `application/pdf`, expected filename/bytes, and stable cache behavior.
5. Validate the exact Evolution document/media profile from Vercel against the operated instance and a designated test recipient. Confirm endpoint path, auth, request field paths, document-kind semantics, filename, MIME, caption, provider media retrieval, response acceptance/rejection evidence, limits, timeout, and idempotency. Receiving only text or a URL is a failed validation. Record the successful non-secret profile fingerprint and operational owner, credential rotation, session recovery, and outage contact outside application code.
6. Set `EVOLUTION_API_VALIDATED_PROFILE_SHA256` to that exact fingerprint while leaving dispatch disabled, redeploy, and verify configuration readiness. Any later profile change requires revalidation and a new fingerprint.
7. Enable dispatch, submit one controlled registration, verify the received document and sanitized attempt state/logs, then open general traffic. Existing registrations remain untouched.

Contain incidents by setting `WHATSAPP_DISPATCH_ENABLED=false`; registration remains available and new notifications remain pending/reconcilable. Revoke Evolution credentials without changing admin secrets, or rotate password/session secret independently. An application rollback may remove admin routes and provider calls because all schema changes are additive and the old app ignores them. Do not drop columns/tables or notification/audit history in routine rollback. Never overwrite/delete a referenced PDF. Already sent messages cannot be recalled; corrections use a new immutable version and separate communication.

## Explicit assumptions and deferred work

- The configurable document/media profile is a design mechanism, not verified Evolution API documentation. Dispatch stays off until the operated instance accepts the actual PDF attachment and the matching profile fingerprint is recorded.
- The operated provider may or may not support idempotency; optional header configuration records that difference.
- The first slice is Argentina-only and deliberately rejects formats that need a guessed mobile/area split.
- Legal and provider-operations owners are release inputs but are not invented here.
- Authenticated delivery webhooks, read receipts, automated retry schedules, multiple admins, expected-roster import/comparison, category assignment, international phones, and historical outreach are deferred.
