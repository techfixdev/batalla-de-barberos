# Proposal: Admin review and non-blocking WhatsApp receipt with PDF attachment

## Decision summary

Add a small, password-protected admin workflow for organizers to review received registrations and their statuses. The panel represents only people who submitted a registration; it does not infer who has not registered. After a valid public registration is persisted, the Vercel application immediately attempts to send a WhatsApp receipt confirmation with the versioned draft PDF attached as a document/media message through an externally hosted Evolution API. The public signup still succeeds if that dispatch fails, and the failure is persisted for admin visibility and retry.

The message confirms receipt only. It must explicitly state that registration does not mean selection, acceptance, participant confirmation, or category assignment. Attaching the exact immutable, versioned PDF is required normal behavior. Evolution API may retrieve that attachment from the same public URL, and the message may also show that URL as a fallback link, but a text-only message containing the URL does not satisfy successful normal dispatch. The PDF contains draft competition categories and requirements but no personal data.

All legal documents and every user-facing reference to those documents or rules must visibly display the exact marker `BORRADOR — PENDIENTE DE REVISIÓN LEGAL` until an approved version is provided.

## Intent

### Business problem

The current public flow stores applications but gives organizers no protected way to review them and gives applicants no immediate WhatsApp acknowledgement. This creates avoidable uncertainty for applicants and ad hoc operational work for organizers, while making it easy to confuse “registration received” with “selected to compete.”

### Product outcome

After this change:

- applicants receive a prompt, unambiguous receipt acknowledgement on WhatsApp with the referenced PDF attached as a document/media item;
- a provider outage never invalidates an otherwise valid saved registration;
- organizers can securely inspect received registrations, their statuses, and notification failures without implying visibility into people who never registered;
- organizers can deliberately retry failed receipt notifications without treating retries as new registrations;
- registration, selection, participant response, and message delivery remain distinct concepts;
- applicants can access the exact draft terms version referenced by their message;
- legally unapproved rules are never presented as final.

## Goals

1. Preserve the existing public registration contract while adding deterministic Argentina-first phone normalization.
2. Attempt one logical receipt confirmation, including the versioned PDF as a WhatsApp document/media attachment, immediately after each new valid registration is persisted.
3. Isolate WhatsApp document/media delivery behind an HTTP integration with an external, self-hosted Evolution API.
4. Provide a minimal authenticated admin surface listing received registrations and their statuses for review and notification retry.
5. Persist enough notification state to explain failures, support safe retries, and avoid ordinary duplicate sends.
6. Publish a versioned, non-personal draft terms PDF with four coherent proposed competition categories.
7. Align participation, privacy, signup-success, admin, WhatsApp, and PDF copy with the same lifecycle semantics and legal-draft status.

## Non-goals

- Automatically selecting or accepting competitors.
- Treating a sent, delivered, or read WhatsApp message as selection, participant acceptance, or legal acceptance.
- Building competition scoring, brackets, payments, prizes, scheduling, or event-day operations.
- Building inbound WhatsApp automation, a chatbot, or automated participant responses.
- Implementing multiple admin users, roles, invitations, account recovery, or OAuth.
- Using Google authentication, Meta Cloud API, Twilio, a custom Baileys service, or WPPConnect in this slice.
- Hosting any persistent WhatsApp session or long-lived worker in Vercel.
- Producing legally final terms or silently filling unknown event facts.
- Adding personal data to the public PDF or its URL.
- Retrospectively messaging existing registrations by default.
- Importing or maintaining an expected participant roster, comparing registrations against such a roster, or identifying people who never registered.

## Scope

### Public registration

- Continue validating and persisting a valid signup before any provider call.
- Normalize Argentine phone inputs to a canonical `+54` E.164 destination using documented handling of domestic prefixes and mobile notation.
- Create a durable logical notification record after persistence and immediately attempt the Evolution API HTTP document/media dispatch, with the versioned PDF attached, using a bounded timeout.
- Return the successful registration response even if notification creation, provider dispatch, timeout handling, or provider response processing fails after the signup has been saved.
- Show signup-success copy that distinguishes saved registration from WhatsApp status and from selection.
- Reject malformed or ambiguous phone values before persistence according to the documented Argentina-first policy; never guess a destination.

### Admin workflow

- Provide one shared admin identity authenticated by a server-side secret/password; no OAuth is introduced.
- Use secure session defaults: signed or otherwise tamper-resistant sessions, `httpOnly`, `Secure` in production, appropriate `SameSite`, bounded expiry, explicit logout, throttled login, and CSRF protection for mutations.
- Allow authenticated organizers to list and inspect only received registration records, including normalized phone, registration/review state, participant-response state, terms version, notification status, attempt timestamps, and sanitized last error.
- Make clear that an absent person cannot be classified as unregistered because no expected roster or roster import exists in this slice.
- Allow deliberate review-state changes and manual retry of failed or uncertain receipt notifications.
- Do not expose the admin password, session secret, Turso credentials, Evolution API credential, raw authorization headers, or provider responses that may contain secrets.

### WhatsApp integration

- Use an external, self-hosted Evolution API reached over HTTPS from Vercel.
- Send the versioned PDF through Evolution API as a WhatsApp document/media attachment on every normal receipt attempt; sending only text with a PDF URL is not a successful receipt dispatch.
- Use the PDF's immutable public URL as the Evolution API media source when supported by the validated instance contract. The same URL may also appear in the caption or message as a fallback link without replacing the required attachment.
- Keep the provider behind a narrow application boundary so provider-specific payloads do not define registration or admin domain semantics.
- Store an internal logical message key, attempt count, terms version and immutable media URL, timestamps, sanitized failure information, and provider message ID when returned.
- Do not assume fire-and-forget execution continues after the Vercel request ends.
- Do not claim delivery or read status unless the operated Evolution API instance provides trustworthy, authenticated events. Such receipts remain informational only.

### Draft PDF and public copy

- Publish the PDF at an immutable, stable, versioned public URL suitable for Evolution API retrieval as the required WhatsApp document/media attachment source.
- Keep each published version available after a message references it; a newer version receives a new URL rather than replacing old bytes.
- Include no applicant or other personal data.
- Display `BORRADOR — PENDIENTE DE REVISIÓN LEGAL` prominently in the PDF and beside every user-facing link, label, or summary that refers to these terms or rules.
- Update participation and privacy content to explain WhatsApp processing, the external provider, receipt-only semantics, notification failure behavior, and the non-final status of the PDF.
- Removal of the draft marker requires a separately approved content/version change; it is not implied by implementing this proposal.

## Product semantics

### Independent lifecycle axes

The product must not compress unrelated states into one “confirmed” flag.

| Axis | Proposed states | Meaning |
| --- | --- | --- |
| Registration review | `received`, `under_review`, `selected`, `rejected`, `withdrawn` | Organizer disposition of the application. New registrations start as `received`. |
| Participant response | `not_requested`, `pending`, `confirmed`, `declined` | Whether a selected applicant has later accepted participation. The receipt message does not change this axis. |
| Receipt notification | `pending`, `sent`, `failed`, `uncertain`, optionally `delivered` | Technical state of the WhatsApp receipt for a specific terms version. `delivered` is used only when supported by authenticated provider evidence. |

State labels shown to organizers and applicants must be in clear Spanish. “Confirmación” without a qualifier is prohibited where it could mean either receipt, organizer selection, participant response, or provider delivery.

### Dispatch ordering and failure behavior

1. Validate the signup and normalize the phone destination.
2. Persist the registration exactly once.
3. Persist a logical receipt notification for the referenced terms version.
4. Immediately call the external Evolution API document/media endpoint over HTTP with a bounded timeout, supplying the immutable versioned PDF as the attachment source.
5. Persist `sent` plus the provider message ID only on a known successful document/media submission, or a sanitized `failed`/`uncertain` result when the attachment is rejected, cannot be fetched, the provider fails, or the result is ambiguous.
6. Return signup success because persistence already succeeded; provider health does not decide registration validity.

If notification-state persistence itself fails after the registration insert, the registration still remains successful and must be discoverable by admins as needing notification reconciliation. The design must avoid a database transaction that rolls back the registration because of provider behavior.

### Idempotency and retry

- One registration plus one terms version identifies one logical receipt notification.
- Ordinary request retries must not create a second logical receipt notification.
- A manual admin retry adds an attempt to the same logical notification rather than creating a new registration.
- A known provider success cannot be retried through the normal failed-item action.
- An ambiguous timeout may have reached the provider. The admin must see that ambiguity before retrying because provider-level idempotency support has not been established by this proposal.
- Any intentional resend after a known success is outside the normal retry path and is not required in this slice.

### Receipt message and attachment intent

The normal WhatsApp receipt consists of a text/caption plus the exact versioned PDF sent as a document/media attachment through Evolution API. The final Spanish copy may be refined, but it must retain all of these statements:

> Recibimos tu inscripción a Batalla de Barberos.
>
> Este mensaje confirma únicamente la recepción de tu inscripción. No implica selección, aceptación para competir, confirmación de participación ni asignación de categoría.
>
> Adjuntamos las bases y categorías: BORRADOR — PENDIENTE DE REVISIÓN LEGAL.

The immutable PDF URL may additionally appear as a fallback link. It does not replace the required attachment, and a text-only URL send must be recorded as failed or uncertain rather than successful. The message may include event identity and support contact once authoritative values are supplied. It must not imply that opening the PDF, receiving the message, or a provider read receipt constitutes legal consent.

## Draft competition categories

> **BORRADOR — PENDIENTE DE REVISIÓN LEGAL**
>
> The repository confirms that the event advertises four cups but does not contain authoritative category names or complete competition rules. The following is a coherent first draft for product and document design, not final event policy.

| Proposed category | Draft eligibility | Required work | Facts still requiring organizer approval |
| --- | --- | --- | --- |
| **Copa Estudiante — Degradado** | Adult barber currently enrolled in training or graduated within `[PLAZO A DEFINIR]`; proof method `[A DEFINIR]`. | Execute a complete, blended fade and finished top on one consenting adult model within `[TIEMPO A DEFINIR]`. | Accepted fade variants, minimum starting length, permitted finishing products, time, capacity, and proof of student status. |
| **Copa Profesional — Fade** | Adult professional barber; minimum experience, if any, `[A DEFINIR]`. | Execute a competition-grade fade with balanced shape, transitions, outline, and final styling within `[TIEMPO A DEFINIR]`. | Exact technical brief, required skin level, model starting condition, tools, products, time, and capacity. |
| **Copa Clásico y Barba** | Adult barber with one consenting adult model whose hair and beard meet `[CONDICIÓN INICIAL A DEFINIR]`. | Complete a coordinated classic haircut and beard design while preserving skin safety and overall harmony. | Allowed styles, minimum hair/beard length, razor policy, time, tools, products, and capacity. |
| **Copa Freestyle — Diseño Creativo** | Adult barber; open experience level unless the organizer sets a restriction. | Produce an original creative cut/design on one consenting adult model within the approved safety and product rules. | Whether color, pre-color, stencils, extensions, or prepared elements are allowed; time, theme, tools, and capacity. |

### Shared draft requirements

The PDF may structure these as formal clauses, but each unresolved value remains an explicit placeholder:

- competitors and models are adults, and model consent requirements are `[A DEFINIR CON REVISIÓN LEGAL]`;
- each entry uses one registered competitor and one model unless the organizer approves otherwise;
- sanitation, tool handling, skin protection, respectful conduct, and compliance with staff safety instructions are mandatory;
- permitted and prohibited tools, products, pre-cut/pre-color work, model starting conditions, and station setup remain `[A DEFINIR]` per category;
- round duration, check-in, late arrival, substitution, abandonment, disqualification, tie-break, protest, and appeal rules remain `[A DEFINIR]`;
- judging dimensions may include technical execution, cleanliness, balance, finish, difficulty, creativity where relevant, and rule compliance, but weights and rubric remain `[A DEFINIR]`;
- schedule, venue, organizer identity, jury, category capacity, selection method, prizes, image authorization, cancellation policy, privacy retention, and official contact remain `[A DEFINIR]`;
- the organizer/jury decision language already present on the site must not be expanded into an unlimited waiver or final legal clause without review.

The existing signup `experience` value is not a competition category and must not be silently mapped to one. Category application, assignment, or later reassignment remains a separate organizer decision unless a later approved design explicitly adds it to the public form.

## Assumptions and constraints

- The application remains Astro 5 server output deployed to Vercel, with Turso/libSQL as the source of registration and notification state.
- The Evolution API instance, WhatsApp session, uptime, backups, upgrades, and QR/session recovery are operated outside Vercel by an explicitly assigned owner.
- The exact Evolution API version, document/media endpoint contract, authentication scheme, media-source retrieval behavior, timeout behavior, and webhook signing capabilities must be validated against that operated instance during design; attachment delivery remains a required capability rather than an optional enhancement.
- The initial automated path is Argentina-first: domestic inputs are interpreted as Argentine and canonicalized to `+54` E.164. As a bounded first-slice assumption, numbers that cannot be unambiguously normalized to an Argentine destination are rejected rather than guessed.
- Existing registrations are initialized to safe migration defaults and are not automatically sent historical receipt messages.
- The PDF is a committed or build-produced static asset rather than an on-demand personalized document.
- Low event volume does not remove the need for login throttling, idempotency, bounded provider calls, or sanitized logs.
- A sent message is operational evidence only, not proof of delivery, reading, selection, participation, or legal consent.

## Acceptance intent

Implementation and verification should make the following observable:

- A valid new registration is persisted exactly once before WhatsApp dispatch begins.
- The public signup reports success after persistence even when Evolution API is unavailable, times out, or returns a malformed/error response.
- Each new registration records a notification outcome or is visibly reconcilable as requiring an attempt.
- The automatic message explicitly says that receipt is not selection or acceptance and sends the exact draft PDF version as a WhatsApp document/media attachment; its immutable URL may also be present as a fallback.
- Argentine phone formats covered by the policy normalize deterministically to `+54` E.164; malformed or ambiguous inputs receive clear Spanish validation feedback.
- An unauthenticated or expired session cannot list registrations, inspect details, change lifecycle state, or retry notifications.
- Login is throttled, mutations are CSRF-protected, logout invalidates the active session, and secrets remain server-only.
- An authenticated organizer can distinguish registration review, participant response, and notification states for received registration records, while the panel makes no claim about people absent from the registration data.
- Failed and uncertain sends are visible with sanitized diagnostics and can be deliberately retried; a known successful send is not exposed as an ordinary failed retry.
- Concurrent or repeated requests do not create duplicate logical receipt notifications for the same registration and terms version.
- The public PDF URL is versioned, stable, provider-accessible, contains no personal data, and is used as the source for the required WhatsApp document/media attachment.
- The PDF and all user-facing references to its rules visibly show `BORRADOR — PENDIENTE DE REVISIÓN LEGAL`.
- Existing registrations survive migration with explicit defaults and receive no surprise retrospective message.
- Focused automated tests cover phone normalization, auth/session protection, lifecycle transitions, persistence-before-dispatch, provider failures, payload semantics, and idempotency; repository `pnpm check` and `pnpm build` remain green.

## Success criteria

1. Every otherwise valid registration remains saved and receives a successful public response regardless of simulated Evolution API failure after persistence.
2. Every new saved registration is represented in the admin workflow with separate review and receipt-notification status.
3. All automatically generated receipts use receipt-only language and submit the exact immutable PDF version associated with the notification as a WhatsApp document/media attachment; a URL-only send does not count as success.
4. Organizers can identify and retry failed/uncertain attachment sends without exposing credentials or creating a second registration.
5. No unauthenticated admin read or mutation succeeds in the acceptance verification matrix.
6. All tested accepted Argentine phone variants produce the documented canonical `+54` E.164 result, and ambiguous inputs are rejected consistently.
7. No reviewed user-facing legal reference or PDF page omits the required draft marker before legal approval.
8. The admin panel lists received registrations and their statuses only; it neither reports nor infers people who never registered.

## Affected areas

| Area | Expected impact |
| --- | --- |
| Public signup form/API | Phone policy, post-persistence PDF-attachment dispatch attempt, and clearer success semantics. |
| Turso schema and domain helpers | Review state, participant response, notification lifecycle, immutable media version/URL, idempotency, provider metadata, migration defaults, and admin queries over received registrations. |
| Astro pages and API routes | Admin login/logout, protected received-registration list/detail/actions, and CSRF-safe mutations; no expected-roster comparison. |
| Server-only configuration | Admin password/secret, session signing secret, Evolution API base URL/instance identifier/credential, and canonical public base URL used for provider media retrieval. |
| Participation and privacy pages | Selection lifecycle, provider processing, failure semantics, public PDF, and mandatory draft labeling. |
| Public assets | Immutable versioned Spanish draft PDF with no personal data. |
| Operations/support | Evolution API ownership, session health, credential rotation, failed-send review, retry procedure, and legal/content version ownership. |
| Verification | New focused test capability or equivalent test harness plus existing Astro check/build gates. |

## Risks and mitigations

| Risk | Product impact | Mitigation intent |
| --- | --- | --- |
| Evolution API or WhatsApp session outage | Applicants do not receive immediate acknowledgement with its PDF attachment. | Persist the signup first, record failure/uncertainty, keep public success, and expose admin retry. |
| Evolution API cannot retrieve or submit the PDF media | Applicants receive no valid attached-document receipt, or staff mistake a URL-only message for completion. | Validate document/media capability and public retrieval before release; treat media rejection or fetch failure as failed/uncertain, with the URL only as a fallback for the applicant. |
| Ambiguous provider timeout | A retry could duplicate a message and attachment. | Mark `uncertain`, retain attempt/provider evidence, show a warning, and validate provider idempotency during design. |
| Shared admin password compromise | Registration personal data and admin actions are exposed. | Server-only secret, secure short-lived session, throttling, CSRF controls, rotation/runbook, sanitized logs, and HTTPS. |
| Legal draft mistaken for final rules | Applicants rely on incomplete categories or requirements. | Exact prominent marker in every document/reference, explicit placeholders, immutable versions, and no silent marker removal. |
| Public PDF URL leaks personal data | Privacy breach. | Generate one event-wide static document with no applicant data or secret query parameters. |
| Incorrect Argentine normalization | Message goes to the wrong person or cannot be sent. | Deterministic normalization, reject ambiguity, preserve audit-safe original/canonical values, and test representative area-code/mobile forms. |
| Lifecycle labels are conflated | Staff or applicants infer acceptance from receipt. | Separate state axes and prohibit ambiguous “confirmed” labels. |
| Serverless execution ends early | Notification state and actual dispatch diverge. | Use a bounded in-request provider call after durable state creation; do not depend on unawaited work. |
| Provider response contains sensitive details | Secrets enter the database or admin UI. | Persist only allowlisted identifiers and sanitized errors. |
| Published PDF changes in place | Earlier messages no longer identify what was sent. | Immutable versioned URL; publish corrections as a new version. |

## Rollback and operational containment

- Provide an operational way to disable new WhatsApp document/media dispatches without disabling registration; new signups remain saved and visibly require notification handling.
- Revoke or rotate Evolution API credentials and the shared admin/session secrets independently if compromised.
- If the admin UI must be withdrawn, preserve compatible schema fields and registration data so rollback does not lose review or notification history.
- Do not remove or mutate a PDF URL already sent to applicants; publish a correction/new version and communicate it separately if necessary.
- Already sent WhatsApp messages cannot be recalled by an application rollback. Operational response must rely on corrected follow-up communication.
- Database rollback must be additive/compatibility-oriented; destructive removal of new columns or notification history is not part of a routine application rollback.

## Release boundaries

The first releasable slice includes public persistence-first dispatch of the versioned PDF as a WhatsApp document/media attachment, external Evolution API integration, one shared-secret admin session, received-registration/status visibility, failed/uncertain retry, versioned draft PDF, and aligned Spanish legal/privacy copy. Expected-roster import or comparison and identification of people who never registered remain outside this slice.

A later slice may add provider webhooks, richer delivery telemetry, multiple admin identities, non-Argentine phone policy, category selection on the public form, automated participant responses, or approved final terms. None is required to claim this proposal complete.

## Proposal question round

A live question round was not run because the delegated handoff explicitly supplied confirmed decisions and instructed this phase not to interview the user. The proposal adopts those decisions unchanged. The following residual product questions are recorded with bounded assumptions for later review rather than treated as blockers:

1. **Should the first slice accept non-Argentine numbers?** Assumption: automated registration requires an unambiguous Argentine `+54` E.164 destination; broader international handling is later work.
2. **Are the four proposed category names and eligibility boundaries authoritative?** Assumption: no; they remain clearly labeled draft content with placeholders until organizers and legal reviewers approve them.
3. **Should historical registrations receive the new receipt message?** Assumption: no automatic backfill; any future historical outreach requires a separate deliberate operation.
4. **Is provider `delivered` status required for launch?** Assumption: no; known API acceptance of the document/media submission is enough for `sent`, while authenticated delivery telemetry is optional and never legal proof.
5. **Who owns legal approval and Evolution API operations?** Assumption: named owners are release-readiness inputs, but this proposal does not invent their identities.
