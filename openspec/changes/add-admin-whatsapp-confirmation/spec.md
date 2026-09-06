# Admin WhatsApp Confirmation Specification

## Purpose

This is the authoritative change-level index for admin review, WhatsApp receipt confirmations, and draft competition terms. The three capability specifications below are collectively binding; this index does not replace, narrow, or weaken any of their requirements or scenarios.

## Authoritative Capability Specifications

| Binding capability | Authoritative specification | Required outcome retained by this change |
| --- | --- | --- |
| Public registration receipts | [`specs/public-registration-receipts/spec.md`](specs/public-registration-receipts/spec.md) | Every normal receipt uses the referenced immutable PDF as a WhatsApp document/media attachment; a URL-only message is not a successful receipt. |
| Admin registration management | [`specs/admin-registration-management/spec.md`](specs/admin-registration-management/spec.md) | Only submitted registrations are visible; registration review, participant response, and receipt-notification states remain independent; all admin access and mutations require the specified protected authentication. |
| Draft competition terms | [`specs/draft-competition-terms/spec.md`](specs/draft-competition-terms/spec.md) | The immutable public draft PDF and every user-facing terms/rules reference retain `BORRADOR — PENDIENTE DE REVISIÓN LEGAL` until separately approved change. |

## Requirements

### Requirement: Complete capability conformance

The system MUST conform to every requirement and scenario in all three authoritative capability specifications listed above. Their complete requirement text and scenarios are the binding source for the listed outcomes, including mandatory PDF document/media attachment, submitted-registration-only scope, independent lifecycle states, protected admin authentication, and the required privacy/legal-draft marker. This aggregate specification SHALL NOT be interpreted to alter product scope or implementation tasks.

#### Scenario: Change acceptance review

- GIVEN an implementation is evaluated for `add-admin-whatsapp-confirmation`
- WHEN the change-level specification is used to determine acceptance
- THEN reviewers MUST evaluate conformance against each of the three linked capability specifications without treating this index as a replacement for their requirements or scenarios.
