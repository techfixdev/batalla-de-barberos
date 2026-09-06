# Public Registration Receipts Specification

## Purpose

Accept Argentine public registrations without making WhatsApp availability a condition of saving the application, and issue an unambiguous, traceable receipt notification with the referenced immutable draft PDF attached as WhatsApp document/media.

## Requirements

### Requirement: Argentina-first phone validation and normalization

The system MUST validate the public registration phone value before persistence. It MUST deterministically normalize supported Argentine domestic-prefix and mobile-notation inputs to one canonical `+54` E.164 destination. It MUST reject malformed or ambiguous values with clear Spanish feedback and MUST NOT guess a destination. The audit-safe original input and canonical destination MUST remain distinguishable where retained.

#### Scenario: Supported Argentine input is canonicalized

- GIVEN an otherwise valid registration with a supported Argentine phone representation
- WHEN the registration is submitted
- THEN the system MUST persist and use its deterministic `+54` E.164 destination.

#### Scenario: Ambiguous phone is rejected

- GIVEN a registration whose phone cannot be unambiguously normalized to an Argentine destination
- WHEN the registration is submitted
- THEN the system MUST reject it before persistence with Spanish validation feedback.

### Requirement: Persistence precedes receipt dispatch

The system MUST validate and persist each valid new registration exactly once before any Evolution API dispatch begins. It MUST then create one durable logical receipt-notification record for the registration and the referenced terms version, and MUST attempt its HTTP dispatch immediately in the same request with a bounded timeout. Provider behavior, notification-record failure, timeout handling, or provider-response handling MUST NOT roll back or invalidate the saved registration.

#### Scenario: Provider is unavailable after a saved registration

- GIVEN a valid registration has been persisted
- WHEN the initial receipt dispatch cannot reach the provider
- THEN the public registration response MUST remain successful and the registration MUST remain available for notification reconciliation.

#### Scenario: Notification persistence fails after registration persistence

- GIVEN a valid registration has been persisted
- WHEN creation of its receipt-notification record fails
- THEN the registration MUST remain successful and administrators MUST be able to identify it as requiring notification reconciliation.

### Requirement: Logical notification identity and ordinary-request idempotency

The system MUST identify a logical receipt notification by exactly one registration and one terms version. Concurrent or repeated ordinary registration requests MUST NOT create more than one logical notification for that identity, and MUST NOT create an additional registration for the same accepted submission. A retry attempt MUST remain associated with that logical notification.

#### Scenario: Repeated submission reaches the receipt workflow

- GIVEN an accepted registration and its logical notification already exist for a terms version
- WHEN an ordinary duplicate request is processed
- THEN no second logical notification for that registration and terms version MUST be created.

### Requirement: Evolution API document/media receipt dispatch

The system MUST call only the externally operated Evolution API over HTTPS for automated WhatsApp receipts and MUST use a bounded in-request call rather than relying on unawaited work after the request ends. For every normal receipt attempt, it MUST submit the immutable versioned PDF associated with the notification as an actual WhatsApp document/media attachment. The provider request MUST identify the normalized destination, the immutable public PDF URL as the media source, and receipt-only Spanish caption or message text. That text MUST state that the application was received and that the message does not mean selection, acceptance to compete, participant confirmation, or category assignment, and it MUST include the exact marker `BORRADOR — PENDIENTE DE REVISIÓN LEGAL`. The public PDF URL MAY additionally appear as a fallback link in the caption or message, but a text-only URL message MUST NOT satisfy successful receipt dispatch. The system MUST NOT treat sending, delivery, reading, or opening the PDF as legal consent or any lifecycle decision.

#### Scenario: Attachment payload is submitted

- GIVEN a durable pending notification with a normalized destination, terms version, and immutable public PDF URL
- WHEN the system constructs the normal Evolution API receipt request
- THEN it MUST submit a document/media attachment using that exact URL as the media source and MUST include the required receipt-only language and draft marker.

#### Scenario: Provider accepts the document/media submission

- GIVEN a durable pending notification and a provider response that establishes acceptance of the requested document/media attachment
- WHEN the automatic dispatch completes
- THEN the notification MUST be recorded as `sent` with the provider message ID when returned.

#### Scenario: Provider retrieves the referenced media

- GIVEN Evolution API retrieves the immutable public PDF URL supplied for a normal receipt
- WHEN the provider accepts the document/media submission
- THEN the receipt MUST be eligible to be recorded as `sent` only because the PDF is submitted as the document/media attachment, not merely because its URL appears in text.

#### Scenario: Provider rejects or cannot retrieve the media

- GIVEN a provider response establishes that the immutable public PDF source was rejected, unavailable, or could not be retrieved as the requested document/media attachment
- WHEN the attempt is finalized
- THEN the notification MUST be recorded as `failed` with sanitized diagnostic information and MUST NOT be recorded as `sent`.

#### Scenario: URL-only message is not a successful receipt

- GIVEN a provider outcome establishes that only receipt text containing the PDF URL was submitted or accepted without the PDF document/media attachment
- WHEN the attempt is finalized
- THEN the notification MUST be recorded as `failed` and MUST NOT be recorded as `sent`.

### Requirement: Notification outcomes, uncertainty, and retries

The system MUST record a notification status of `pending`, `sent`, `failed`, or `uncertain` for each logical receipt notification, and MAY record `delivered` only from trustworthy authenticated provider evidence. It MUST record attempt count, attempt timestamps, terms version, immutable media URL, allowlisted provider message ID when returned, and sanitized failure information. A known accepted document/media submission MUST map to `sent`; a known media rejection, media-retrieval failure, provider failure, or known URL-only submission MUST map to `failed`; and a timeout, malformed response, or other result that cannot establish document/media submission MUST map to `uncertain`. It MUST NOT represent an ambiguous result as known failure or success. Known `sent` notifications MUST NOT be eligible for the normal failed-item retry action. Failed and uncertain notifications MUST be eligible for an explicit administrator retry that adds an attempt to the same logical notification, with uncertainty shown before an uncertain retry.

#### Scenario: Ambiguous timeout is preserved

- GIVEN the provider request times out without trustworthy evidence that the document/media attachment was submitted
- WHEN the attempt is finalized
- THEN the notification MUST be `uncertain`, retain its sanitized attempt evidence, and be visible as potentially already sent before a retry.

#### Scenario: Malformed provider response leaves attachment outcome unknown

- GIVEN the provider responds without trustworthy evidence that it accepted or rejected the requested document/media attachment
- WHEN the attempt is finalized
- THEN the notification MUST be recorded as `uncertain` and MUST NOT be recorded as `sent`.

#### Scenario: Failed notification is retried

- GIVEN an administrator deliberately retries a failed notification
- WHEN the retry is accepted
- THEN the system MUST add an attempt to the existing logical notification and MUST NOT create a registration or a new logical-notification identity.

### Requirement: Public registration and privacy communication

The public signup-success experience MUST distinguish a saved registration from WhatsApp receipt status and from organizer selection or participant response. Participation and privacy information MUST explain WhatsApp processing by the external provider, receipt-only semantics, notification-failure behavior, and the non-final status of the draft terms. Public-facing legal or rules references MUST visibly display `BORRADOR — PENDIENTE DE REVISIÓN LEGAL` until a separately approved content/version change removes it.

#### Scenario: Receipt dispatch fails after signup

- GIVEN a registration was saved but its initial receipt notification failed or is uncertain
- WHEN the applicant receives the signup-success response
- THEN the response MUST confirm the saved registration without claiming WhatsApp delivery, selection, or participation confirmation.

### Requirement: Existing-registration migration safety and dispatch containment

Existing registrations MUST receive explicit safe defaults for the independent lifecycle information introduced by this change and MUST NOT receive retrospective WhatsApp receipts by default. The system MUST support disabling new automated WhatsApp dispatches without disabling valid registration persistence; registrations created while dispatch is disabled MUST remain visible as requiring notification handling. Removing or changing an already referenced draft-PDF URL or destructively removing notification history MUST NOT be part of ordinary rollback behavior.

#### Scenario: Existing registration is migrated

- GIVEN a registration existed before this feature is deployed
- WHEN its data is made compatible with the new workflow
- THEN it MUST have explicit defaults and MUST NOT trigger an automatic historical receipt message.
