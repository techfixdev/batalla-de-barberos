# Preproposal: Admin registration review and WhatsApp confirmation

## Proposed outcome

Add a small password-protected admin workflow that lets organizers review barber registrations, distinguish registration/review/participant-confirmation status, and trigger or observe an automatic WhatsApp confirmation containing a Spanish competition-terms PDF. The public signup remains available even when WhatsApp delivery is unavailable.

## Proposed shape

1. Extend the existing Turso `barber_signups` model with explicit lifecycle and notification fields, using migration-safe defaults for existing rows.
2. Add server-side admin authentication with a single configured secret, short-lived httpOnly session cookies, login throttling, CSRF-safe mutations, and no Google OAuth.
3. Add protected list/detail/update/retry routes and a simple Astro admin page; do not expose database credentials or provider errors containing secrets.
4. Send through an external self-hosted/alternative WhatsApp service behind a narrow adapter (Evolution API, Baileys, or WPPConnect style). Do not run a persistent WhatsApp client in Vercel.
5. Persist notification attempts and idempotency state. A provider failure is visible to admins and retryable; it does not roll back a saved registration.
6. Attach a versioned PDF whose cover and content clearly say `BORRADOR — PENDIENTE DE REVISIÓN LEGAL` until the organizer/legal owner approves publication.
7. Update participation and privacy copy to describe the actual selection lifecycle, WhatsApp processing, PDF contents, and limitations of delivery/read status.

## Scope guardrails

- No legal finalization, automatic competitor selection, payments, scoring system, or broad multi-role authorization.
- No Meta Cloud API, Twilio, or Google authentication.
- No assumption of durable local storage, background execution, or a long-lived process in Vercel functions.
- No provider-specific implementation choice is final until design resolves hosting, API contract, authentication, webhook/retry behavior, and ownership.

## Acceptance intent for design

The design should make these behaviors testable:

- An unauthenticated request cannot read registrations or mutate review/notification state.
- A valid signup is stored once and receives a stable lifecycle state.
- The selected dispatch event creates at most one logical notification per terms version unless an admin explicitly retries.
- Provider outages and malformed provider responses produce a visible failed/queued state without failing the public registration response.
- Admins can distinguish received, under review, selected/confirmed, rejected/withdrawn, queued, sent, failed, and (if supported) delivered states.
- Phone normalization and consent behavior are deterministic and documented.
- The PDF is versioned, retrievable by the provider, and visibly draft-only until legal approval.
- `pnpm check` and `pnpm build` pass; migration instructions are safe for an explicitly configured Turso database; focused tests or an equivalent verification record cover auth, state transitions, payloads, and idempotency.

## Open product decisions

| Decision | Why it blocks design |
| --- | --- |
| Send on registration, selection, or explicit confirmation? | “Automatic confirmation” conflicts with current copy saying the organizer contacts selected people later. |
| What are the canonical categories and rules? | The repository has no category list or complete rule set; the PDF cannot be authoritative without organizer input. |
| What country/number policy applies? | Current phone validation accepts loosely formatted numbers and does not guarantee WhatsApp addressability. |
| Which provider and who operates it? | Vercel cannot own the persistent session; service ownership and endpoint security determine the adapter. |
| Is a public PDF URL acceptable? | Provider access and participant privacy differ between public static hosting and authenticated/expiring delivery. |
| What is the admin secret/session policy? | A shared secret is simple but requires explicit rotation, expiry, throttling, and logout expectations. |
| What does “confirmation” mean legally and operationally? | Message sent/delivered is not the same as organizer acceptance or legal acceptance of terms. |

## Recommended design questions

Resolve the open decisions with the smallest operational footprint: a single admin identity, an external HTTP-capable WhatsApp service, explicit database state machines, bounded synchronous dispatch or a separately managed retry worker, and a committed/versioned draft PDF. Keep legal review and provider operations as visible release gates rather than implicit assumptions.
