# Exploration: Admin registration review and WhatsApp confirmation

## Result

The feature is feasible as an Astro/Vercel change only if WhatsApp is treated as an external, self-hosted service. The Vercel application can own registration state, admin authentication, PDF delivery, and an idempotent notification boundary; it should not host a persistent Baileys/WPPConnect/Evolution process.

## Repository baseline

| Area | Finding | Consequence |
| --- | --- | --- |
| Runtime | Astro 5 server output with `@astrojs/vercel` | API/page handlers are serverless; no durable process or local filesystem should be assumed. |
| Persistence | Turso/libSQL via `@libsql/client`; one `barber_signups` table | Extend the migration and domain queries rather than introduce a second store. |
| Public flow | `SignupForm.astro` POSTs JSON to `/api/signups`; `signups.ts` validates, rate-limits, inserts, and returns 201 | Preserve this contract and avoid making provider availability block signup. |
| Signup fields | Name, email, phone, optional barbershop, experience (`estudiante`, `profesional`, `educador`), accepted rules, created timestamp | Phone is the WhatsApp destination but is not currently normalized to a country-specific E.164 value. |
| Admin surface | None | Add a server-only authenticated route/page and protected API endpoints. |
| Auth | No auth/session implementation or secret beyond Turso credentials | A password/secret-based session design is required; Google OAuth is out of scope. |
| Notification/PDF | No provider client, job queue, PDF generator, or terms asset | Choose a provider contract and a deployable PDF strategy. |
| Tests | No test runner/script; `pnpm check` and `pnpm build` are the automated baseline | Later implementation must add focused tests or document equivalent endpoint/manual verification. |
| Deployment | Vercel adapter; `vercel.json` only adds security headers | Provider credentials, admin secret, session signing secret, and public/base URLs must be configured as server-only settings. |

CodeGraph was not callable in this executor runtime; `.codegraph/` exists, so the findings were verified through targeted repository reads after the mandated index check. No implementation was performed.

## Existing rules, categories, and assets

The repository contains only preliminary participation language in `src/pages/participacion.astro`: adults may apply; registration does not guarantee a place; selected people receive categories, schedule, allowed materials, judging criteria, and extra requirements later; safety, respectful conduct, and organizer/jury decisions apply; audiovisual conditions and operational changes are to be communicated later. The homepage identifies a first edition, 8 November, Florencio Varela, and four cups, but does not define four categories.

There is no authoritative category list, scoring rubric, schedule, prize allocation, organizer identity/contact, venue, cancellation policy, consent wording, or WhatsApp opt-out wording. Existing images/video are event-promotion assets, not a terms PDF. Therefore the feature may include a Spanish draft terms document assembled from these known facts plus explicit placeholders, but it must be labeled `BORRADOR — PENDIENTE DE REVISIÓN LEGAL` and must not be presented as final terms or silently invent missing competition rules.

## Feasible boundaries

### In scope for the change

- Admin login using a server-side password/secret and an httpOnly, secure, same-site session cookie.
- A small admin view of registrations with registration status and confirmation/notification status, plus a deliberate action to update status or retry notification.
- Database fields/tables for review status, notification lifecycle, timestamps, provider message ID/error, and audit-relevant metadata without storing provider secrets.
- Public phone validation/normalization sufficient for the chosen country policy, with an explicit policy for invalid or non-WhatsApp numbers.
- A provider adapter interface, with one Evolution API/Baileys/WPPConnect-style implementation selected during design. Meta Cloud API and Twilio remain excluded.
- Asynchronous or failure-tolerant confirmation dispatch so a provider outage does not turn a successful registration into a failed registration.
- A versioned PDF terms asset or server-generated PDF with a stable URL; the exact generation strategy must account for Vercel runtime limits.
- Spanish user-facing copy that distinguishes “registration received”, “selected/confirmed”, “WhatsApp queued/sent”, and “WhatsApp failed”.

### Out of scope

- Google OAuth, Meta Cloud API, Twilio, or a broad role/permission system.
- Hosting a persistent WhatsApp session inside Vercel functions.
- Automatic acceptance/selection of competitors, payment processing, or competition scoring.
- Treating delivery/read receipts as proof of legal acceptance.
- Publishing legally final terms before organizer and legal review.
- Open-web provider research in this phase; the research lane is unselected and no evidence grant is available.

## Concrete gaps and risks

1. **Selection semantics are undefined.** The current site says signup is not acceptance. The data model needs separate registration, organizer review, and participant confirmation states; one boolean is insufficient.
2. **Dispatch trigger is undefined.** Decide whether WhatsApp is sent on every registration, only after admin confirmation, or in two messages. Product direction says automatic confirmation, but the existing copy describes later organizer contact, so the exact event must be confirmed.
3. **Phone policy is undefined.** Decide country/default prefix, formatting, duplicate handling, and whether to allow a separate WhatsApp number.
4. **Provider operations are undefined.** An external worker/instance must own QR/session lifecycle, uptime, retries, rate limiting, and webhook security. Low volume reduces scale needs but does not remove operational ownership.
5. **Admin security is underspecified.** Decide password storage/verification (prefer a pre-hashed secret), session expiry/revocation, login throttling, CSRF protection for mutating actions, and whether one shared admin identity is acceptable.
6. **Delivery semantics need idempotency.** Retries must not send duplicate confirmations. Persist an event/idempotency key and provider response state; define how manual retry behaves.
7. **PDF/legal source is missing.** There is not enough source material to produce legally complete terms. Missing facts need placeholders and an approval/version process.
8. **Privacy disclosure must be updated.** WhatsApp processing, provider location/retention, PDF contents, and notification failure handling are absent from `privacidad.astro`.
9. **Serverless scheduling is constrained.** Fire-and-forget work from a Vercel request is unsafe. Use a provider API call with bounded timeout and persisted state, or a separately invoked worker/cron/retry mechanism.
10. **Testing is limited.** Add unit coverage for validation/state transitions/provider payloads and route-level auth/idempotency tests using mocked Turso/provider clients, or record a reproducible manual matrix if test tooling remains intentionally absent.

## Decisions required before design

- Exact lifecycle states and which admin action causes the WhatsApp/PDF send.
- Chosen provider family and deployment location/ownership; Evolution API is the most natural HTTP adapter candidate, while Baileys/WPPConnect require a separately managed long-lived Node service.
- Whether the PDF is a committed static asset, generated during build, or generated on demand; whether it is public-by-URL or fetched through an authenticated/provider-safe mechanism.
- Admin session strategy and required environment variables.
- Country/phone normalization policy and consent/opt-out language.
- Retry schedule, manual retry behavior, timeout, webhook/receipt requirements, and retention of provider errors.
- Authoritative categories, criteria, prizes, event logistics, organizer contact, and legal-review owner for the terms draft.

## Recommended next phase boundary

Design a minimal vertical slice around: `registration -> admin review/confirmation -> idempotent WhatsApp dispatch with versioned draft-PDF attachment -> visible status`. Keep the provider behind an adapter, keep secrets server-only, and make all legally incomplete content visibly draft-only. Preserve the existing public endpoint response behavior except for an explicit, non-blocking notification status.
