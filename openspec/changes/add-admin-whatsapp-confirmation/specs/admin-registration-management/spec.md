# Admin Registration Management Specification

## Purpose

Provide one securely authenticated organizer workflow to review submitted registrations, keep independent lifecycle meanings visible, and deliberately handle receipt-notification problems without inferring people who never registered.

## Requirements

### Requirement: Shared administrator authentication and session protection

The system MUST authenticate the single shared administrator identity using a server-side secret/password and MUST NOT introduce OAuth, multiple identities, roles, invitations, or account recovery in this change. It MUST use tamper-resistant sessions with `httpOnly`, `Secure` in production, appropriate `SameSite` protection, and bounded expiry. Login MUST be throttled, logout MUST invalidate the active session, and every state-changing admin action MUST have CSRF protection.

#### Scenario: Unauthenticated access is denied

- GIVEN a requester has no valid unexpired administrator session
- WHEN the requester attempts to list or inspect registrations, change state, or retry a notification
- THEN the system MUST deny the request without disclosing registration data.

#### Scenario: Logout ends the active session

- GIVEN an authenticated administrator logs out
- WHEN that session is used for a protected admin operation
- THEN the operation MUST be denied.

#### Scenario: Mutation lacks CSRF proof

- GIVEN an authenticated administrator session
- WHEN a review-state change or notification retry is submitted without valid CSRF protection
- THEN the system MUST reject the mutation.

### Requirement: Protected registration review

Authenticated administrators MUST be able to list and inspect submitted registration records with normalized phone, registration-review state, participant-response state, terms version, receipt-notification status, attempt timestamps, and sanitized last error. The admin experience MUST present these state concepts separately in clear Spanish and MUST NOT use an unqualified “Confirmación” where it could mean receipt, selection, participant response, or delivery.

#### Scenario: Organizer inspects a registration with a receipt failure

- GIVEN an authenticated administrator and a submitted registration with a failed receipt notification
- WHEN the administrator inspects the registration
- THEN the separate lifecycle states, notification attempts, and sanitized diagnostic MUST be visible in clear Spanish.

### Requirement: Submitted-registration-only scope

The admin panel MUST list, inspect, and report only persisted registration records submitted through the public registration workflow and their associated statuses. It MUST NOT create, infer, classify, or report any person as unregistered, missing, pending, or otherwise absent when that person has no registration record. Expected-roster import, maintenance, and comparison are out of scope for this change.

#### Scenario: Person without a registration is absent from the panel

- GIVEN a person has not submitted a persisted registration record
- WHEN an authenticated administrator views the registration list or its reported statuses
- THEN the panel MUST show no record or status for that person and MUST NOT state or imply that the person is unregistered or missing.

#### Scenario: Panel reports received registrations

- GIVEN one or more persisted registration records exist
- WHEN an authenticated administrator views the registration list
- THEN the panel MUST report only those submitted records and their separate lifecycle statuses.

### Requirement: Independent lifecycle state axes

The system MUST maintain registration review, participant response, and receipt notification as independent state axes. New registrations MUST begin with review state `received`; permitted review states are `received`, `under_review`, `selected`, `rejected`, and `withdrawn`. Participant-response states are `not_requested`, `pending`, `confirmed`, and `declined`. Receipt-notification states are `pending`, `sent`, `failed`, `uncertain`, and optionally `delivered` under authenticated provider evidence. A receipt notification MUST NOT change review or participant-response state, and a delivery/read signal MUST NOT imply selection, participant response, or legal acceptance.

#### Scenario: Receipt is sent for a new application

- GIVEN a new registration with review state `received` and participant-response state `not_requested`
- WHEN its receipt notification is recorded as `sent`
- THEN the registration-review and participant-response states MUST remain unchanged.

#### Scenario: Organizer changes review disposition

- GIVEN an authenticated administrator viewing a registration
- WHEN the administrator deliberately changes its review state to a permitted value
- THEN the changed review state MUST be retained without representing that action as WhatsApp delivery or participant response.

### Requirement: Deliberate retry control

The protected admin workflow MUST allow a deliberate retry for `failed` and `uncertain` receipt notifications and MUST show the uncertainty warning before retrying an uncertain notification. It MUST not expose a known `sent` notification through the ordinary failed-item retry action. Retry activity MUST remain observable as another attempt on the original logical notification.

#### Scenario: Known successful notification is reviewed

- GIVEN a notification with known status `sent`
- WHEN an administrator views ordinary retry actions
- THEN the notification MUST NOT be offered as a failed-item retry.

### Requirement: Secret-safe administration and observability

The system MUST keep the administrator password, session secret, database credentials, Evolution API credentials, raw authorization headers, and provider responses that may contain secrets out of admin responses and observability records. Admin-visible failures and operational records MUST use sanitized, allowlisted diagnostic information sufficient to distinguish failed from uncertain attempts and support investigation. The system MUST allow Evolution API credentials and administrator/session secrets to be rotated independently.

#### Scenario: Provider response contains sensitive fields

- GIVEN an Evolution API response or error includes authorization or other sensitive data
- WHEN notification diagnostics are persisted, logged, or displayed to an administrator
- THEN only sanitized allowlisted information MUST be exposed.
