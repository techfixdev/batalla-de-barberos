# Draft Competition Terms Specification

## Purpose

Publish a non-personal, stable version of proposed competition terms that applicants can identify from a receipt without presenting unapproved rules as final.

## Requirements

### Requirement: Immutable versioned public draft PDF

The system MUST publish the draft competition terms as a public, provider-accessible PDF at an immutable, stable, versioned URL. Every published version referenced by a receipt MUST remain available at its original URL; a correction or newer version MUST use a new URL and MUST NOT replace prior bytes. The PDF and its URL MUST contain no applicant or other personal data and MUST NOT require secret query parameters.

#### Scenario: Later terms version is published

- GIVEN a receipt references a published draft-PDF version
- WHEN a newer terms version is published
- THEN the older referenced URL MUST remain available unchanged and the newer version MUST have a distinct URL.

### Requirement: Mandatory legal-draft marker

The PDF and every user-facing link, label, or summary that refers to its terms or rules MUST prominently display the exact marker `BORRADOR — PENDIENTE DE REVISIÓN LEGAL`. The marker MUST remain until a separately approved content/version change removes it; implementation of this change MUST NOT imply legal approval or remove it.

#### Scenario: Applicant views a rules reference

- GIVEN an applicant views the draft-PDF link, related rules summary, or the PDF itself
- WHEN the reference is rendered
- THEN the exact legal-draft marker MUST be visibly displayed.

### Requirement: Draft category and unresolved-facts disclosure

The draft PDF MUST present the four proposed categories: `Copa Estudiante — Degradado`, `Copa Profesional — Fade`, `Copa Clásico y Barba`, and `Copa Freestyle — Diseño Creativo`. It MUST identify them as draft content and MUST retain explicit `[A DEFINIR]` or legal-review placeholders for unresolved eligibility, technical, timing, capacity, safety, judging, operational, and event facts. It MUST state that the existing signup experience value is not a competition category and MUST NOT imply category application, assignment, or reassignment.

#### Scenario: Reader reviews a proposed category

- GIVEN a reader opens the published draft PDF
- WHEN the reader reviews any proposed category or shared requirement
- THEN unresolved facts MUST remain visibly identified as unresolved rather than presented as final policy.

### Requirement: Non-final participation and privacy information

User-facing participation and privacy content associated with the terms MUST explain that the document is non-final, that WhatsApp processing uses an external provider for receipt-only acknowledgements, and that notification failures do not invalidate a saved registration. It MUST NOT state or imply that the PDF, message receipt, delivery, read status, or document opening constitutes legal consent, selection, acceptance to compete, participant confirmation, or category assignment.

#### Scenario: Applicant reads privacy or participation information

- GIVEN an applicant accesses user-facing participation or privacy information
- WHEN the information describes the registration receipt and draft terms
- THEN it MUST distinguish those concepts from selection, participation confirmation, and legal consent.
