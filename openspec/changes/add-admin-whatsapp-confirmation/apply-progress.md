# Apply Progress: Admin WhatsApp Confirmation

## 2026-04-19 — Task 1.1 pre-implementation boundary assessment

### Structured status consumed

- `artifactStore`: `openspec`; authoritative change: `add-admin-whatsapp-confirmation`.
- `applyState`: `ready`; `actionContext.mode`: `repo-local`.
- Allowed edit root: `/home/charlydev/Projects/DEV/batalla-de-barberos`.
- Delivery path resolved by parent: `auto-chain`, `stacked-to-main`; no size exception.
- Warning: the task artifact's stored delivery forecast remains `ask-on-risk`/`pending`, but the parent supplied the resolved authoritative delivery path above.

### Result

Blocked before RED because one honest implementation of task 1.1 cannot fit the mandated 400 changed-line work-unit budget. The required Vitest harness and lockfile, two focused test suites, conservative normalizer, versioned additive migration with six tables/columns/indexes, and registration domain/repository primitives are a cohesive foundation but conservatively exceed the budget (estimated 550–700 authored additions before progress evidence). No production code, test, dependency, migration, or task-checkbox change was made.

### Proposed narrower split

1. **1.1a — phone harness and normalization:** Vitest configuration/dependencies, `tests/unit/phone-normalization.test.ts`, and `src/lib/server/phone/argentina.ts`.
2. **1.1b — migration and repository primitives:** `tests/integration/migrations.test.ts`, versioned migration runner/definitions, and registration domain/repository modules.

Each split must retain its own RED → GREEN → TRIANGULATE → REFACTOR evidence and stay under the 400-line review budget. Task 1.1 remains unchecked until both slices are complete and reconciled under the approved task plan.

### Files changed

- `openspec/changes/add-admin-whatsapp-confirmation/apply-progress.md` (this cumulative blocked-progress record only).

### Tests

- Not run: strict TDD prohibits production implementation before RED, and no within-budget implementation slice was authorized for this oversized task.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1.1 | N/A | N/A | N/A | Not started: budget gate | Not started | Not started | Not started |

### Remaining implementation tasks

- [ ] **[1.1 — foundation; depends on: none]** RED in `tests/unit/phone-normalization.test.ts` and `tests/integration/migrations.test.ts`: pin the accepted Argentine fixtures (`+54 9 11 2345-6789`, `0054 9 11 2345-6789`, `5491123456789`, domestic `011 15-2345-6789`, and a valid three-digit-area fixture), ambiguous/foreign/malformed rejections, and real-migration assertions for historical defaults, indexes, notification uniqueness, and no historical receipt requirement. GREEN/TRIANGULATE/REFACTOR `package.json`, `pnpm-lock.yaml`, Vitest configuration, `src/lib/server/phone/argentina.ts`, repository/domain modules under `src/lib/server/registrations/`, and versioned definitions consumed by `scripts/migrate.mjs`; use pinned `libphonenumber-js` max metadata, a conservative policy, and parameterized SQL. Verify `pnpm test -- tests/unit/phone-normalization.test.ts tests/integration/migrations.test.ts`, then `pnpm check`; runtime harness: `pnpm migrate` only against a disposable explicitly selected local/test database. Rollback boundary: the new dependency, test harness, phone normalizer, repository modules, and additive `002_admin_whatsapp` migration definitions; do not destructively remove applied Turso fields/tables. <!-- sdd-owner: implementation -->

### Workload / PR boundary

Current stacked-to-main boundary: blocked pending an approved subdivision of task 1.1 into the two proposed independently rollbackable work units. No commit, PR, migration, provider call, or live credential access occurred.

## 2026-04-19 — Task 1.1a artifact-readiness assessment

### Structured status consumed

- `artifactStore`: `openspec`; authoritative change: `add-admin-whatsapp-confirmation`.
- `applyState`: `ready`; `actionContext.mode`: `repo-local`.
- Allowed edit root: `/home/charlydev/Projects/DEV/batalla-de-barberos`.
- Delivery path resolved by parent: `auto-chain`, `stacked-to-main`; one-run authorization for work unit `1.1a-vitest-phone-normalization`; 400 changed-line maximum.
- Strict TDD is active; required focused command: `pnpm test -- tests/unit/phone-normalization.test.ts`; required follow-up: `pnpm check`.

### Result

Blocked before RED: the required OpenSpec spec artifact, `openspec/changes/add-admin-whatsapp-confirmation/spec.md`, is absent (confirmed by direct read and directory listing). The proposal and design are present but do not replace the required `sdd/{change}/spec` input under the apply contract. No source, dependency, test, lockfile, task checkbox, migration, credential, or provider change was made.

### Files changed

- `openspec/changes/add-admin-whatsapp-confirmation/apply-progress.md` (this cumulative blocker record only).

### Tests

- Not run: required artifact readiness failed before strict-TDD RED. No production code was written.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1.1a | `tests/unit/phone-normalization.test.ts` | Unit | Not started: required spec absent | Not started | Not started | Not started | Not started |

### Remaining implementation tasks

- [ ] **[1.1a — Vitest harness and Argentina normalization; depends on: none; target: 180–260 changed lines]** Required spec artifact is missing; restore `openspec/changes/add-admin-whatsapp-confirmation/spec.md` before RED. <!-- sdd-owner: implementation -->

### Workload / PR boundary

Current stacked-to-main work-unit boundary: `1.1a-vitest-phone-normalization` only. No commit, PR, migration, provider call, live credential access, or task-checkbox update occurred.

## 2026-04-19 — Task 1.1a Vitest harness and Argentina normalization

### Structured status consumed

```yaml
schemaName: spec-driven
changeName: add-admin-whatsapp-confirmation
artifactStore: openspec
planningHome:
  root: /home/charlydev/Projects/DEV/batalla-de-barberos/openspec
  changesDir: /home/charlydev/Projects/DEV/batalla-de-barberos/openspec/changes
changeRoot: /home/charlydev/Projects/DEV/batalla-de-barberos/openspec/changes/add-admin-whatsapp-confirmation
artifactPaths:
  proposal: [openspec/changes/add-admin-whatsapp-confirmation/proposal.md]
  specs: [openspec/changes/add-admin-whatsapp-confirmation/spec.md]
  design: [openspec/changes/add-admin-whatsapp-confirmation/design.md]
  tasks: [openspec/changes/add-admin-whatsapp-confirmation/tasks.md]
  applyProgress: [openspec/changes/add-admin-whatsapp-confirmation/apply-progress.md]
  verifyReport: [openspec/changes/add-admin-whatsapp-confirmation/verify-report.md]
  syncReport: [openspec/changes/add-admin-whatsapp-confirmation/sync-report.md]
artifacts:
  proposal: done
  specs: done
  design: done
  tasks: done
  applyProgress: partial
  verifyReport: missing
  syncReport: missing
taskProgress:
  total: 12
  complete: 1
  remaining: 11
applyState: ready
dependencies:
  apply: ready
  verify: ready
  sync: blocked
  archive: blocked
actionContext:
  mode: repo-local
  workspaceRoot: /home/charlydev/Projects/DEV/batalla-de-barberos
  allowedEditRoots: [/home/charlydev/Projects/DEV/batalla-de-barberos]
  warnings: ["Parent restricted edits to the 1.1a allowlist; no out-of-scope files were edited."]
nextRecommended: apply
isNonAuthoritative: false
```

### Completed work

- Completed implementation-owned task **1.1a** and immediately updated its persisted checkbox to `- [x]` in `tasks.md`.
- Added pinned `vitest@3.2.4`, `@vitest/coverage-v8@3.2.4`, and `libphonenumber-js@1.12.15`, with Node-only Vitest scripts/configuration.
- Added a pure `normalizeArgentinaPhone()` policy using `libphonenumber-js/max`; it accepts only the listed explicit Argentine mobile and domestic-`15` forms, returns canonical `+549...` E.164, and rejects unsupported/ambiguous formats.
- Added 12 focused acceptance, boundary, and metadata-rejection assertions. Runtime harness: N/A — the focused Vitest command is the executable harness for this pure function.

### Files changed

- `package.json` — `+9/-3` lines.
- `pnpm-lock.yaml` — `+514/-0` generated resolution lines.
- `vitest.config.ts` — `+12/-0` lines.
- `src/lib/server/phone/argentina.ts` — `+79/-0` lines.
- `tests/unit/phone-normalization.test.ts` — `+27/-0` lines.
- `openspec/changes/add-admin-whatsapp-confirmation/tasks.md` — `+1/-1` checkbox update.
- `openspec/changes/add-admin-whatsapp-confirmation/apply-progress.md` — this cumulative entry.

### Tests

- RED — `pnpm test -- tests/unit/phone-normalization.test.ts`: failed as expected because `src/lib/server/phone/argentina.ts` did not exist.
- GREEN — the focused command passed: 5 tests.
- TRIANGULATE — added explicit-prefix/domestic-`15` boundary and metadata-pinned rejection cases; the first run exposed the multiple-split path, then the focused command passed: 12 tests.
- REFACTOR — extracted input-format validation; focused command passed: 12 tests.
- Final required check — `pnpm check`: passed with 0 errors, 0 warnings, and 0 hints.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1.1a | `tests/unit/phone-normalization.test.ts` | Unit | N/A (new files) | Expected import failure recorded | 5/5 passed | 12/12 passed after explicit-prefix/domestic-`15` and rejection coverage | 12/12 passed after parser-helper extraction; `pnpm check` passed |

### Deviations from design

- The domestic parser rejects more than one metadata-valid area/`15` split even when those splits collapse to the same E.164 digits; this is deliberately stricter than the design's distinct-candidate wording and satisfies the task's explicit multiple-candidate rejection requirement without widening accepted input.

### Remaining implementation tasks (exact persisted unchecked rows)
- [ ] **[1.1b — versioned local-libSQL migration foundation and registration primitives; depends on: 1.1a; target: 300–390 changed lines]** RED in `tests/integration/migrations.test.ts`: use a disposable local in-memory libSQL database and the real migration runner to prove historical `barber_signups` rows retain explicit lifecycle defaults, `receipt_required = 0`, and no receipt record; assert `002_admin_whatsapp` is recorded once, required indexes exist, and registration/terms notification uniqueness is enforced. GREEN `scripts/migrate.mjs`, versioned migration definitions consumed by it, and the minimum parameterized registration domain/repository primitives under `src/lib/server/registrations/` needed to open the migrated schema; make the additive `002_admin_whatsapp` migration transactional and idempotent, including the design-required registration columns, receipt/admin tables, constraints, and indexes. TRIANGULATE rerunning the real runner and violating each uniqueness boundary; REFACTOR shared SQL/domain constants without adding signup orchestration or provider dispatch. Verify RED, GREEN, TRIANGULATE, and REFACTOR with `pnpm test -- tests/integration/migrations.test.ts`, then `pnpm check`; runtime harness: run `pnpm migrate` only with an explicitly selected disposable local/test database and record that `schema_migrations` contains one `002_admin_whatsapp` row and historical rows remain unchanged except additive defaults. Rollback boundary: the migration runner/definitions, local-libSQL fixture, and minimal registration primitives; never destructively remove applied Turso fields, tables, or history. <!-- sdd-owner: implementation -->
- [ ] **[1.2 — immutable terms; depends on: 1.1b]** RED in `tests/unit/draft-terms-manifest.test.ts` and `tests/integration/terms-pdf.test.ts`: assert exact `draft-2026-09-v1` source/path/filename/MIME/checksum, every PDF page and public reference has `BORRADOR — PENDIENTE DE REVISIÓN LEGAL`, all four proposed categories and `[A DEFINIR]` placeholders remain, and existing version bytes cannot be replaced. GREEN/TRIANGULATE/REFACTOR `content/draft-terms/draft-2026-09-v1.json`, `src/lib/terms/draft-terms-manifest.ts`, `scripts/generate-terms-pdf.mjs`, `scripts/verify-terms-pdf.mjs`, `public/documentos/bases-y-categorias/borrador-2026-09-v1.pdf`, and `package.json` scripts so generation is deterministic, offline, committed, checksum verified, and build-blocking. Verify `pnpm terms:verify && pnpm test -- tests/unit/draft-terms-manifest.test.ts tests/integration/terms-pdf.test.ts && pnpm build`; runtime harness: `curl -I http://localhost:<port>/documentos/bases-y-categorias/borrador-2026-09-v1.pdf` during `pnpm dev`, confirming PDF content type and immutable cache policy once configured. Rollback boundary: new versioned source, generator/verifier, manifest, and asset only; never delete or overwrite a published referenced URL. <!-- sdd-owner: implementation -->
- [ ] **[1.3 — public legal copy; depends on: 1.2]** RED in `tests/integration/public-terms-copy.test.ts`: assert `DraftTermsLink.astro` (or its concrete replacement) is the only terms/rules link primitive and that `src/components/SignupForm.astro`, `src/pages/participacion.astro`, `src/pages/privacidad.astro`, and signup-success copy distinguish saved registration, receipt attempt, selection, participant response, and legal consent. GREEN/TRIANGULATE/REFACTOR the shared component and listed public files, retaining the exact marker beside every reference and no unapproved legal facts. Verify `pnpm test -- tests/integration/public-terms-copy.test.ts && pnpm check && pnpm build`; runtime harness: inspect rendered `/`, `/participacion`, and `/privacidad` with `pnpm dev` and confirm the marker is visible. Rollback boundary: public copy/link component only; retain the immutable PDF artifact. <!-- sdd-owner: implementation -->
- [ ] **[2.1 — signup identity and orchestration; depends on: 1.1a, 1.1b, 1.2, 1.3]** RED in `tests/integration/signup-orchestration.test.ts`: prove validation precedes persistence, a registration commits before notification/provider work, notification-insert failure still returns saved success and reconciliation visibility, replay returns `200` only for matching fingerprint, conflicting idempotency key returns `409`, and concurrent requests create one registration/logical notification/claimed attempt. GREEN/TRIANGULATE/REFACTOR `src/lib/barber-signups.ts`, `src/pages/api/signups.ts`, `src/components/SignupForm.astro`, and concrete services/repositories under `src/lib/server/registrations/` and `src/lib/server/notifications/`; retain a browser UUID in `Idempotency-Key` until success and never make provider health decide signup success. Verify `pnpm test -- tests/integration/signup-orchestration.test.ts && pnpm check`; runtime harness: submit the same form payload twice against local in-memory/test configuration and record `201` then `200` with one persisted row. Rollback boundary: signup idempotency/client submission-key behavior and new orchestration modules; database remains additive and dispatch may be disabled independently. <!-- sdd-owner: implementation -->
- [ ] **[2.2 — provider-neutral receipt contract; depends on: 2.1]** RED in `tests/unit/receipt-caption-and-service.test.ts`: require `ReceiptMessenger.send` to receive only a document command with the persisted immutable PDF URL, `.pdf` filename, `application/pdf`, deterministic logical/attempt keys, and Spanish receipt-only caption including the fallback URL and exact marker; assert retry reads the stored snapshot after current terms changes and that no text-only overload exists. GREEN/TRIANGULATE/REFACTOR `src/lib/server/notifications/contracts.ts`, caption builder, receipt service, safe error-code mapping, lease/attempt repository methods, and tests. A normal `sent` transition must require `acceptedArtifact: 'document'`; a URL-only outcome is failed, not sent. Verify `pnpm test -- tests/unit/receipt-caption-and-service.test.ts`; runtime harness: `N/A — pure domain service is exercised through injected fake messenger and local libSQL integration tests.` Rollback boundary: provider-neutral contract/caption/receipt-service modules; pending records remain reconcilable. <!-- sdd-owner: implementation -->
- [ ] **[2.3 — validated Evolution document adapter; depends on: 2.2]** RED in `tests/unit/evolution-document-adapter.test.ts`: cover HTTPS-only base/path validation, profile fingerprint mismatch blocking fetch, safe non-colliding dotted field paths, exact-once destination/media URL/filename/MIME/caption construction, document-kind support, raw/bearer auth formatting without logs, timeout/response-size/redirect handling, and no text endpoint, hidden retry, or fallback send. GREEN/TRIANGULATE/REFACTOR `src/lib/server/config.ts` and `src/lib/server/notifications/evolution-document-http-messenger.ts` with a typed profile parser and bounded `fetch`; provider-specific types must not leave the adapter. Verify `pnpm test -- tests/unit/evolution-document-adapter.test.ts && pnpm check`; runtime harness: run a local fixture HTTP server to capture one JSON request and verify all document fields once, then confirm the profile-disabled path makes zero requests. Rollback boundary: config/profile/adapter modules and environment documentation; set dispatch false before removing runtime use. <!-- sdd-owner: implementation -->
- [ ] **[2.4 — dispatch outcome finalization; depends on: 2.2, 2.3]** RED in `tests/integration/receipt-dispatch-outcomes.test.ts`: prove disabled/unvalidated profile leaves zero-attempt pending with no fetch; known validated document acceptance alone becomes `sent` with allowlisted ID/evidence; media rejection/fetch failure and URL-only acceptance become `failed`; malformed 2xx, timeout, network/5xx, oversized responses, stale leases, and result-finalization ambiguity become `uncertain`; registration response remains successful throughout. GREEN/TRIANGULATE/REFACTOR receipt claim/finalize code and `src/pages/api/signups.ts` wiring. Verify `pnpm test -- tests/integration/receipt-dispatch-outcomes.test.ts && pnpm check && pnpm build`; runtime harness: local fixture server returns accepted-document, URL-only, and timeout fixtures and records the expected persisted states. Rollback boundary: automatic dispatch invocation only; `WHATSAPP_DISPATCH_ENABLED=false` stops calls while preserving signup and pending/reconcilable data. <!-- sdd-owner: implementation -->
- [ ] **[3.1 — secure admin session boundary; depends on: 1.1b]** RED in `tests/unit/admin-auth.test.ts` and `tests/integration/admin-route-security.test.ts`: cover scrypt password vectors, signed opaque cookie tamper/expiry/revocation failure, production/local cookie attributes, pre-auth and authenticated CSRF rejection, same-origin checks, per-address/global Turso throttle, logout invalidation, and unauthenticated HTML redirect/API `401` with no PII. GREEN/TRIANGULATE/REFACTOR `src/lib/server/admin/` password/session/CSRF/throttle helpers, `src/middleware.ts`, Astro locals types, `src/pages/admin/login.astro`, and `src/pages/api/admin/login.ts`/`logout.ts`; log only allowlisted IDs/outcomes. Verify `pnpm test -- tests/unit/admin-auth.test.ts tests/integration/admin-route-security.test.ts && pnpm check`; runtime harness: use local test configuration to login, access a protected route, logout, and verify the old cookie is denied. Rollback boundary: admin routes/middleware/session helpers; revoke sessions and unset admin routes without modifying registration storage. <!-- sdd-owner: implementation -->
- [ ] **[3.2 — submitted-registration-only read model and lifecycle writes; depends on: 3.1, 2.4]** RED in `tests/integration/admin-registration-management.test.ts`: seed registrations plus a non-database expected-person fixture and prove list/count/filter/detail are rooted exclusively in `barber_signups`; cover keyset pagination, historical normalized-phone display, separate Spanish state labels, optimistic state-version conflict, independent review/participant transitions, no-op rejection, and atomic allowlisted audit events. GREEN/TRIANGULATE/REFACTOR admin repositories/services and `src/pages/admin/index.astro`, `src/pages/admin/inscripciones/[id].astro`, `src/pages/api/admin/registrations/[id]/review-state.ts`, and `participant-response.ts`; do not add roster/import/comparison/export behavior. Verify `pnpm test -- tests/integration/admin-registration-management.test.ts && pnpm check`; runtime harness: seed two registrations, render `/admin`, and confirm only those two appear with three independent status areas. Rollback boundary: admin read/detail/lifecycle UI and routes; retain additive states/audit history. <!-- sdd-owner: implementation -->
- [ ] **[3.3 — controlled retry and reconciliation; depends on: 3.2]** RED in `tests/integration/admin-receipt-recovery.test.ts`: prove only failed/uncertain notifications retry on the original logical record, uncertain retries require `ackUncertain=1`, sent notifications have no normal retry action, stale in-progress leases first become uncertain, and reconcile acts only on an existing persisted registration with missing/zero-attempt/stale-pending receipt state. GREEN/TRIANGULATE/REFACTOR retry/reconcile services and `src/pages/api/admin/registrations/[id]/receipt/retry.ts`, `reconcile.ts`, plus detail forms; enforce CSRF, lease concurrency, PRG redirects, sanitized diagnostics, and no new registration. Verify `pnpm test -- tests/integration/admin-receipt-recovery.test.ts && pnpm check && pnpm build`; runtime harness: use local fixture provider to fail then retry one registration and confirm attempt count increments while registration count remains one. Rollback boundary: retry/reconcile endpoints/forms only; disable dispatch to contain future attempts while retaining historical attempts. <!-- sdd-owner: implementation -->
- [ ] **[3.4 — configuration, hardening, and operator documentation; depends on: 2.3, 3.1, 3.3]** RED in `tests/unit/server-config-and-observability.test.ts`: reject missing/unsafe server configuration and assert logs/persisted diagnostics never include credentials, headers, cookies, IPs, phone, names, caption, raw provider body, or secrets. GREEN/TRIANGULATE/REFACTOR `environment.example`, `README.md`, `astro.config.mjs`, `vercel.json`, password-hash utility under `scripts/`, and server config/logging modules; document `WHATSAPP_DISPATCH_ENABLED=false` containment, independent credential rotation, profile-fingerprint validation, PDF immutability, and the migration command warning. Verify `pnpm test -- tests/unit/server-config-and-observability.test.ts && pnpm check && pnpm build`; runtime harness: start with dispatch disabled and confirm startup/config parsing exposes no secret values. Rollback boundary: configuration/docs/header hardening and utility script; preserve safe disabled-dispatch defaults. <!-- sdd-owner: implementation -->

### Deferred lifecycle actions

Parent-owned tasks remain byte-for-byte unchanged: R2 legal/content approval, R3 Turso migration, R4 Evolution document capability validation, R5 controlled deployment, and R6 bounded post-apply review.

### Workload / PR boundary

- Delivery path: `auto-chain`, `stacked-to-main`.
- Current PR/work-unit boundary: **1.1a-vitest-phone-normalization** only; rollback removes the listed harness/dependency/normalizer/test files and touches no schema or persisted data.
- Authored source, test, config, and manifest delta is 130 lines before SDD evidence; the 514-line `pnpm-lock.yaml` change is generated dependency-resolution output required by the pinned dependencies. No commit, PR, migration, provider call, live credential access, or disposable-database migration occurred.

## 2026-04-19 — Task 1.1a correction-verification rerun

### Structured status consumed

```yaml
schemaName: spec-driven
changeName: add-admin-whatsapp-confirmation
artifactStore: openspec
planningHome:
  root: /home/charlydev/Projects/DEV/batalla-de-barberos/openspec
  changesDir: /home/charlydev/Projects/DEV/batalla-de-barberos/openspec/changes
changeRoot: /home/charlydev/Projects/DEV/batalla-de-barberos/openspec/changes/add-admin-whatsapp-confirmation
artifactPaths:
  proposal: [openspec/changes/add-admin-whatsapp-confirmation/proposal.md]
  specs: [openspec/changes/add-admin-whatsapp-confirmation/spec.md]
  design: [openspec/changes/add-admin-whatsapp-confirmation/design.md]
  tasks: [openspec/changes/add-admin-whatsapp-confirmation/tasks.md]
  applyProgress: [openspec/changes/add-admin-whatsapp-confirmation/apply-progress.md]
  verifyReport: [openspec/changes/add-admin-whatsapp-confirmation/verify-report.md]
  syncReport: [openspec/changes/add-admin-whatsapp-confirmation/sync-report.md]
contextFiles:
  proposal: [openspec/changes/add-admin-whatsapp-confirmation/proposal.md]
  specs: [openspec/changes/add-admin-whatsapp-confirmation/spec.md, openspec/changes/add-admin-whatsapp-confirmation/specs/public-registration-receipts/spec.md]
  design: [openspec/changes/add-admin-whatsapp-confirmation/design.md]
  tasks: [openspec/changes/add-admin-whatsapp-confirmation/tasks.md]
  applyProgress: [openspec/changes/add-admin-whatsapp-confirmation/apply-progress.md]
  verifyReport: []
  syncReport: []
artifacts:
  proposal: done
  specs: done
  design: done
  tasks: done
  applyProgress: partial
  verifyReport: missing
  syncReport: missing
taskProgress:
  total: 12
  complete: 1
  remaining: 11
  unchecked: [1.1b, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4]
deferredParentActions:
  total: 6
  complete: 1
  remaining: 5
  unchecked: [R2, R3, R4, R5, R6]
taskArtifactErrors: []
applyState: ready
dependencies:
  apply: ready
  verify: ready
  sync: blocked
  archive: blocked
actionContext:
  mode: repo-local
  workspaceRoot: /home/charlydev/Projects/DEV/batalla-de-barberos
  allowedEditRoots: [/home/charlydev/Projects/DEV/batalla-de-barberos/openspec/changes/add-admin-whatsapp-confirmation/apply-progress.md]
  warnings: ["Correction verification is read-only outside apply-progress.md; source, test, configuration, manifest, lockfile, and task checkbox were not edited."]
nextRecommended: apply
isNonAuthoritative: false
```

### Authorized exception and correction scope

- The user explicitly authorized the generated `pnpm-lock.yaml` size exception for this correction run.
- This rerun is bound to remediation evidence `sha256:62a5f7f9dba3a410c7bacb56f41aa72c1bd07ed66586c10846956619fb0eeb94`; no settlement was created or approved here.
- No RED/GREEN/TRIANGULATE/REFACTOR changes were rerun, no implementation file or task checkbox was changed, and no migration, credential, live service, commit, or push was used.

### Rerun evidence

- `pnpm test -- tests/unit/phone-normalization.test.ts` passed: 1 test file and 12 tests passed.
- `pnpm check` passed: 17 files checked with 0 errors, 0 warnings, and 0 hints.
- The persisted `1.1a` checkbox remains visibly checked; all remaining implementation rows, beginning with the exact unchecked `1.1b` row recorded above, remain unchanged.

### Conformance and scope assessment

- The task-owned harness, pinned dependencies, max-metadata normalizer, listed accepted fixtures, and listed rejection fixtures are present. They cover the Argentina-first prerequisite in the aggregate and public-registration-receipts specifications; persistence, dispatch, and public-flow requirements remain deliberately assigned to later unchecked tasks.
- No scope drift was introduced by this correction run. The pre-existing implementation surface is limited to the task's package manifest, generated lockfile, Vitest configuration, pure server normalizer, and focused unit test; this record is the sole modification from this run.
- Static review found one unresolved policy discrepancy: `normalizeExplicitInternational()` accepts `+0054 9 11 2345-6789` because it strips leading `00` from digits even when the input begins with `+`. The design permits only explicit `+54…` or `0054…` forms, so this mixed prefix should be rejected. The focused suite does not cover it, and this correction-only run was not authorized to alter source or tests.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1.1a correction verification | `tests/unit/phone-normalization.test.ts` | Unit | 12/12 passed on rerun | Not rerun: existing completed cycle | Not rerun: source edits prohibited | Not rerun: test edits prohibited | Not rerun: source edits prohibited |

### Workload / settlement boundary

- Work-unit boundary: `1.1a-vitest-phone-normalization`; the authorized generated-lockfile exception is recorded above.
- The command evidence passes, but the mixed-prefix discrepancy prevents this actor from declaring the work unit ready to settle **passed** under the stated remediation binding. A separately authorized implementation correction and focused regression test are required; this actor did not make them.

## 2026-04-19 — Work unit 1.1a-mixed-prefix-rejection-correction

### Structured status consumed

```yaml
schemaName: spec-driven
changeName: add-admin-whatsapp-confirmation
artifactStore: openspec
planningHome:
  root: /home/charlydev/Projects/DEV/batalla-de-barberos/openspec
  changesDir: /home/charlydev/Projects/DEV/batalla-de-barberos/openspec/changes
changeRoot: /home/charlydev/Projects/DEV/batalla-de-barberos/openspec/changes/add-admin-whatsapp-confirmation
artifactPaths:
  proposal: [openspec/changes/add-admin-whatsapp-confirmation/proposal.md]
  specs: [openspec/changes/add-admin-whatsapp-confirmation/spec.md]
  design: [openspec/changes/add-admin-whatsapp-confirmation/design.md]
  tasks: [openspec/changes/add-admin-whatsapp-confirmation/tasks.md]
  applyProgress: [openspec/changes/add-admin-whatsapp-confirmation/apply-progress.md]
  verifyReport: [openspec/changes/add-admin-whatsapp-confirmation/verify-report.md]
  syncReport: [openspec/changes/add-admin-whatsapp-confirmation/sync-report.md]
artifacts:
  proposal: done
  specs: done
  design: done
  tasks: done
  applyProgress: partial
  verifyReport: missing
  syncReport: missing
taskProgress:
  total: 12
  complete: 1
  remaining: 11
  unchecked: [1.1b, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4]
deferredParentActions:
  total: 6
  complete: 1
  remaining: 5
  unchecked: [R2, R3, R4, R5, R6]
taskArtifactErrors: []
applyState: ready
dependencies:
  apply: ready
  verify: ready
  sync: blocked
  archive: blocked
actionContext:
  mode: repo-local
  workspaceRoot: /home/charlydev/Projects/DEV/batalla-de-barberos
  allowedEditRoots:
    - /home/charlydev/Projects/DEV/batalla-de-barberos/src/lib/server/phone/argentina.ts
    - /home/charlydev/Projects/DEV/batalla-de-barberos/tests/unit/phone-normalization.test.ts
    - /home/charlydev/Projects/DEV/batalla-de-barberos/openspec/changes/add-admin-whatsapp-confirmation/apply-progress.md
  warnings: ["Correction was confined to the user-authorized edit surfaces; tasks.md was intentionally not edited."]
nextRecommended: apply
isNonAuthoritative: false
```

### Completed corrective work

- Remediated failed verification evidence `sha256:33637289185a8183d827c668255b3a681a921ea7be29ecb0185f1ec6fe1501f8` for work unit `1.1a-mixed-prefix-rejection-correction`.
- Added direct regression coverage rejecting `+0054 9 11 2345-6789` and a triangulating `+00549 11 2345-6789` mixed-prefix form.
- Preserved accepted `+54`, `+549`, and `0054` forms by rejecting only the invalid combination of a leading `+` with a `00` digit prefix.
- The persisted task artifact was re-read after completion: implementation task `1.1a` remains visibly `- [x]`; no checkbox was changed because this was a corrective slice and the allowed edit surfaces expressly excluded `tasks.md`.

### Files changed

- `src/lib/server/phone/argentina.ts` — added a leading-`+`/`00` mixed-prefix guard.
- `tests/unit/phone-normalization.test.ts` — added one RED regression case and two prefix-form triangulation fixtures.
- `openspec/changes/add-admin-whatsapp-confirmation/apply-progress.md` — appended this cumulative evidence.

Correction delta before this evidence: 10 added lines, 0 deleted lines across source and test; below the 400-line work-unit budget. No dependency, package, lockfile, migration, task-checkbox, credential, provider, commit, push, or live-service change occurred.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1.1a-mixed-prefix-rejection-correction | `tests/unit/phone-normalization.test.ts` | Unit | Existing focused suite passed in the prior correction-verification entry; user-required RED was run first in this corrective cycle | `pnpm test -- tests/unit/phone-normalization.test.ts` failed as expected: 1 failed / 12 passed; `+0054 9 11 2345-6789` incorrectly returned `+5491123456789` | Added the minimal mixed-prefix guard; focused command passed 13/13 | Added accepted `+5491123456789` and rejected `+00549 11 2345-6789`; focused command passed 15/15 | No refactor needed; final focused command passed 15/15 |

### Verification commands

- RED: `pnpm test -- tests/unit/phone-normalization.test.ts` — expected failure: 1 test failed, 12 passed.
- GREEN: `pnpm test -- tests/unit/phone-normalization.test.ts` — passed: 1 file, 13 tests.
- TRIANGULATE: `pnpm test -- tests/unit/phone-normalization.test.ts` — passed: 1 file, 15 tests.
- Final focused: `pnpm test -- tests/unit/phone-normalization.test.ts` — passed: 1 file, 15 tests.
- Final static check: `pnpm check` — passed: 17 files, 0 errors, 0 warnings, 0 hints.
- Runtime harness: N/A — this pure server normalizer has no network, database, or HTTP runtime boundary; the focused Vitest command is its executable harness.

### Deviations from design

None. The correction enforces the design's explicit-prefix rule without broadening accepted formats.

### Remaining tasks and delivery boundary

- Remaining implementation work is unchanged: `1.1b`, `1.2`, `1.3`, `2.1`, `2.2`, `2.3`, `2.4`, `3.1`, `3.2`, `3.3`, and `3.4` (their exact unchecked task lines remain in the preceding cumulative progress entry).
- Deferred lifecycle actions remain unchanged: R2 legal/content approval, R3 Turso migration, R4 Evolution document capability validation, R5 controlled deployment, and R6 bounded post-apply review.
- Work-unit/PR boundary: `1.1a-mixed-prefix-rejection-correction` only; rollback removes the mixed-prefix guard and the three prefix fixtures from the two source/test files without affecting unrelated behavior.
- This corrective work unit is ready for the parent to seek a passed settlement; this apply actor did not create, approve, or settle any receipt.


## 2026-04-19 — Task 1.1b versioned migration foundation and registration primitives

### Structured status consumed

- `artifactStore`: `openspec`; authoritative change: `add-admin-whatsapp-confirmation`; `applyState`: `ready`.
- `actionContext.mode`: `repo-local`; allowed edit root: `/home/charlydev/Projects/DEV/batalla-de-barberos`; warnings: none.
- Delivery path: `auto-chain`, `stacked-to-main`; PR-1 work-unit `1.1b-versioned-migrations-registration-primitives`; no size exception.
- Strict TDD active; required focused command and `pnpm check` were executed.

### Completed work and persisted checkbox

- Completed implementation-owned task **1.1b** and changed only its persisted task checkbox to `- [x]`.
- Replaced the one-off migration script with a versioned runner: it retains the legacy schema, records `002_admin_whatsapp` once, and applies additive schema SQL atomically in a write batch.
- Added all design-required signup columns, partial submission-key uniqueness, lifecycle/index boundaries, receipt notification/attempt tables, and bounded admin persistence tables without signup orchestration, dispatch, UI, auth behavior, or live service access.
- Added registration lifecycle constants and a parameterized lookup repository primitive.
- Added real-runner integration coverage against a disposable in-memory libSQL database for historical defaults, rerun idempotence, indexes, and composite/logical/submission uniqueness.

### Files changed

`scripts/migrate.mjs`, `scripts/migrations/002_admin_whatsapp.mjs`, `src/lib/server/registrations/domain.ts`, `src/lib/server/registrations/repository.ts`, `tests/integration/migrations.test.ts`, `openspec/changes/add-admin-whatsapp-confirmation/tasks.md` (1.1b checkbox only), and this progress artifact.

The corrected full 1.1b accounting, including source, test, checkbox, and its progress evidence, is recorded in the corrective entry below.

### Verification

- RED — `pnpm test -- tests/integration/migrations.test.ts`: failed as expected with `migrate is not a function` (2 failing integration assertions); no migration production interface existed.
- GREEN — the focused command passed the historical-default/idempotence and index/composite-notification cases.
- TRIANGULATE — added duplicate submission-key and duplicate logical-message identity cases; focused command passed 3 migration tests.
- REFACTOR — extracted the shared `ADMIN_WHATSAPP_VERSION` and statement list; final focused command passed 3 migration tests (18 total Vitest tests because the configured runner also collected the existing phone suite).
- Final required static check — `pnpm check`: passed with 0 errors, 0 warnings, and 0 hints.
- Disposable runtime harness — seeded an explicit local temporary `file:` libSQL database, ran `pnpm migrate`, and observed `schema_migrations = [{"version":"002_admin_whatsapp"}]`; historical row retained `phone: "011 15 2345 6789"`, `receipt_required: 0`, and `review_state: "received"`. The temporary database was deleted after the command; no Turso credential, Evolution service, or production target was used.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1.1b | `tests/integration/migrations.test.ts` | Integration | N/A (new migration test and modules) | Expected missing `migrate` export failure | Historical defaults, migration recording, indexes, and composite notification uniqueness passed | Submission-key and logical-message duplicate boundaries passed | Shared version/statement constants extracted; focused command passed |

### Deviations from design

None. The test harness uses in-memory libSQL; the separately required runtime harness used an explicitly temporary local `file:` database because it must be runnable through the CLI in a fresh process.

### Remaining implementation tasks (exact persisted unchecked rows)
- [ ] **[1.2 — immutable terms; depends on: 1.1b]** RED in `tests/unit/draft-terms-manifest.test.ts` and `tests/integration/terms-pdf.test.ts`: assert exact `draft-2026-09-v1` source/path/filename/MIME/checksum, every PDF page and public reference has `BORRADOR — PENDIENTE DE REVISIÓN LEGAL`, all four proposed categories and `[A DEFINIR]` placeholders remain, and existing version bytes cannot be replaced. GREEN/TRIANGULATE/REFACTOR `content/draft-terms/draft-2026-09-v1.json`, `src/lib/terms/draft-terms-manifest.ts`, `scripts/generate-terms-pdf.mjs`, `scripts/verify-terms-pdf.mjs`, `public/documentos/bases-y-categorias/borrador-2026-09-v1.pdf`, and `package.json` scripts so generation is deterministic, offline, committed, checksum verified, and build-blocking. Verify `pnpm terms:verify && pnpm test -- tests/unit/draft-terms-manifest.test.ts tests/integration/terms-pdf.test.ts && pnpm build`; runtime harness: `curl -I http://localhost:<port>/documentos/bases-y-categorias/borrador-2026-09-v1.pdf` during `pnpm dev`, confirming PDF content type and immutable cache policy once configured. Rollback boundary: new versioned source, generator/verifier, manifest, and asset only; never delete or overwrite a published referenced URL. <!-- sdd-owner: implementation -->
- [ ] **[1.3 — public legal copy; depends on: 1.2]** RED in `tests/integration/public-terms-copy.test.ts`: assert `DraftTermsLink.astro` (or its concrete replacement) is the only terms/rules link primitive and that `src/components/SignupForm.astro`, `src/pages/participacion.astro`, `src/pages/privacidad.astro`, and signup-success copy distinguish saved registration, receipt attempt, selection, participant response, and legal consent. GREEN/TRIANGULATE/REFACTOR the shared component and listed public files, retaining the exact marker beside every reference and no unapproved legal facts. Verify `pnpm test -- tests/integration/public-terms-copy.test.ts && pnpm check && pnpm build`; runtime harness: inspect rendered `/`, `/participacion`, and `/privacidad` with `pnpm dev` and confirm the marker is visible. Rollback boundary: public copy/link component only; retain the immutable PDF artifact. <!-- sdd-owner: implementation -->
- [ ] **[2.1 — signup identity and orchestration; depends on: 1.1a, 1.1b, 1.2, 1.3]** RED in `tests/integration/signup-orchestration.test.ts`: prove validation precedes persistence, a registration commits before notification/provider work, notification-insert failure still returns saved success and reconciliation visibility, replay returns `200` only for matching fingerprint, conflicting idempotency key returns `409`, and concurrent requests create one registration/logical notification/claimed attempt. GREEN/TRIANGULATE/REFACTOR `src/lib/barber-signups.ts`, `src/pages/api/signups.ts`, `src/components/SignupForm.astro`, and concrete services/repositories under `src/lib/server/registrations/` and `src/lib/server/notifications/`; retain a browser UUID in `Idempotency-Key` until success and never make provider health decide signup success. Verify `pnpm test -- tests/integration/signup-orchestration.test.ts && pnpm check`; runtime harness: submit the same form payload twice against local in-memory/test configuration and record `201` then `200` with one persisted row. Rollback boundary: signup idempotency/client submission-key behavior and new orchestration modules; database remains additive and dispatch may be disabled independently. <!-- sdd-owner: implementation -->
- [ ] **[2.2 — provider-neutral receipt contract; depends on: 2.1]** RED in `tests/unit/receipt-caption-and-service.test.ts`: require `ReceiptMessenger.send` to receive only a document command with the persisted immutable PDF URL, `.pdf` filename, `application/pdf`, deterministic logical/attempt keys, and Spanish receipt-only caption including the fallback URL and exact marker; assert retry reads the stored snapshot after current terms changes and that no text-only overload exists. GREEN/TRIANGULATE/REFACTOR `src/lib/server/notifications/contracts.ts`, caption builder, receipt service, safe error-code mapping, lease/attempt repository methods, and tests. A normal `sent` transition must require `acceptedArtifact: 'document'`; a URL-only outcome is failed, not sent. Verify `pnpm test -- tests/unit/receipt-caption-and-service.test.ts`; runtime harness: `N/A — pure domain service is exercised through injected fake messenger and local libSQL integration tests.` Rollback boundary: provider-neutral contract/caption/receipt-service modules; pending records remain reconcilable. <!-- sdd-owner: implementation -->
- [ ] **[2.3 — validated Evolution document adapter; depends on: 2.2]** RED in `tests/unit/evolution-document-adapter.test.ts`: cover HTTPS-only base/path validation, profile fingerprint mismatch blocking fetch, safe non-colliding dotted field paths, exact-once destination/media URL/filename/MIME/caption construction, document-kind support, raw/bearer auth formatting without logs, timeout/response-size/redirect handling, and no text endpoint, hidden retry, or fallback send. GREEN/TRIANGULATE/REFACTOR `src/lib/server/config.ts` and `src/lib/server/notifications/evolution-document-http-messenger.ts` with a typed profile parser and bounded `fetch`; provider-specific types must not leave the adapter. Verify `pnpm test -- tests/unit/evolution-document-adapter.test.ts && pnpm check`; runtime harness: run a local fixture HTTP server to capture one JSON request and verify all document fields once, then confirm the profile-disabled path makes zero requests. Rollback boundary: config/profile/adapter modules and environment documentation; set dispatch false before removing runtime use. <!-- sdd-owner: implementation -->
- [ ] **[2.4 — dispatch outcome finalization; depends on: 2.2, 2.3]** RED in `tests/integration/receipt-dispatch-outcomes.test.ts`: prove disabled/unvalidated profile leaves zero-attempt pending with no fetch; known validated document acceptance alone becomes `sent` with allowlisted ID/evidence; media rejection/fetch failure and URL-only acceptance become `failed`; malformed 2xx, timeout, network/5xx, oversized responses, stale leases, and result-finalization ambiguity become `uncertain`; registration response remains successful throughout. GREEN/TRIANGULATE/REFACTOR receipt claim/finalize code and `src/pages/api/signups.ts` wiring. Verify `pnpm test -- tests/integration/receipt-dispatch-outcomes.test.ts && pnpm check && pnpm build`; runtime harness: local fixture server returns accepted-document, URL-only, and timeout fixtures and records the expected persisted states. Rollback boundary: automatic dispatch invocation only; `WHATSAPP_DISPATCH_ENABLED=false` stops calls while preserving signup and pending/reconcilable data. <!-- sdd-owner: implementation -->
- [ ] **[3.1 — secure admin session boundary; depends on: 1.1b]** RED in `tests/unit/admin-auth.test.ts` and `tests/integration/admin-route-security.test.ts`: cover scrypt password vectors, signed opaque cookie tamper/expiry/revocation failure, production/local cookie attributes, pre-auth and authenticated CSRF rejection, same-origin checks, per-address/global Turso throttle, logout invalidation, and unauthenticated HTML redirect/API `401` with no PII. GREEN/TRIANGULATE/REFACTOR `src/lib/server/admin/` password/session/CSRF/throttle helpers, `src/middleware.ts`, Astro locals types, `src/pages/admin/login.astro`, and `src/pages/api/admin/login.ts`/`logout.ts`; log only allowlisted IDs/outcomes. Verify `pnpm test -- tests/unit/admin-auth.test.ts tests/integration/admin-route-security.test.ts && pnpm check`; runtime harness: use local test configuration to login, access a protected route, logout, and verify the old cookie is denied. Rollback boundary: admin routes/middleware/session helpers; revoke sessions and unset admin routes without modifying registration storage. <!-- sdd-owner: implementation -->
- [ ] **[3.2 — submitted-registration-only read model and lifecycle writes; depends on: 3.1, 2.4]** RED in `tests/integration/admin-registration-management.test.ts`: seed registrations plus a non-database expected-person fixture and prove list/count/filter/detail are rooted exclusively in `barber_signups`; cover keyset pagination, historical normalized-phone display, separate Spanish state labels, optimistic state-version conflict, independent review/participant transitions, no-op rejection, and atomic allowlisted audit events. GREEN/TRIANGULATE/REFACTOR admin repositories/services and `src/pages/admin/index.astro`, `src/pages/admin/inscripciones/[id].astro`, `src/pages/api/admin/registrations/[id]/review-state.ts`, and `participant-response.ts`; do not add roster/import/comparison/export behavior. Verify `pnpm test -- tests/integration/admin-registration-management.test.ts && pnpm check`; runtime harness: seed two registrations, render `/admin`, and confirm only those two appear with three independent status areas. Rollback boundary: admin read/detail/lifecycle UI and routes; retain additive states/audit history. <!-- sdd-owner: implementation -->
- [ ] **[3.3 — controlled retry and reconciliation; depends on: 3.2]** RED in `tests/integration/admin-receipt-recovery.test.ts`: prove only failed/uncertain notifications retry on the original logical record, uncertain retries require `ackUncertain=1`, sent notifications have no normal retry action, stale in-progress leases first become uncertain, and reconcile acts only on an existing persisted registration with missing/zero-attempt/stale-pending receipt state. GREEN/TRIANGULATE/REFACTOR retry/reconcile services and `src/pages/api/admin/registrations/[id]/receipt/retry.ts`, `reconcile.ts`, plus detail forms; enforce CSRF, lease concurrency, PRG redirects, sanitized diagnostics, and no new registration. Verify `pnpm test -- tests/integration/admin-receipt-recovery.test.ts && pnpm check && pnpm build`; runtime harness: use local fixture provider to fail then retry one registration and confirm attempt count increments while registration count remains one. Rollback boundary: retry/reconcile endpoints/forms only; disable dispatch to contain future attempts while retaining historical attempts. <!-- sdd-owner: implementation -->
- [ ] **[3.4 — configuration, hardening, and operator documentation; depends on: 2.3, 3.1, 3.3]** RED in `tests/unit/server-config-and-observability.test.ts`: reject missing/unsafe server configuration and assert logs/persisted diagnostics never include credentials, headers, cookies, IPs, phone, names, caption, raw provider body, or secrets. GREEN/TRIANGULATE/REFACTOR `environment.example`, `README.md`, `astro.config.mjs`, `vercel.json`, password-hash utility under `scripts/`, and server config/logging modules; document `WHATSAPP_DISPATCH_ENABLED=false` containment, independent credential rotation, profile-fingerprint validation, PDF immutability, and the migration command warning. Verify `pnpm test -- tests/unit/server-config-and-observability.test.ts && pnpm check && pnpm build`; runtime harness: start with dispatch disabled and confirm startup/config parsing exposes no secret values. Rollback boundary: configuration/docs/header hardening and utility script; preserve safe disabled-dispatch defaults. <!-- sdd-owner: implementation -->

### Deferred lifecycle actions

Parent-owned tasks remain byte-for-byte unchanged: R2 legal/content approval, R3 Turso migration, R4 Evolution document capability validation, R5 controlled deployment, and R6 bounded post-apply review.

### Workload / PR boundary

- PR-1, stacked-to-main work-unit: `1.1b-versioned-migrations-registration-primitives` only; independently rollbackable by removing the runner/definition, local fixture, and minimal primitives while preserving any applied database history.
- No commit, push, deployment, receipt creation, review, settlement, Turso migration, or Evolution call occurred.

## 2026-04-19 — Task 1.1b budget and coverage correction

### Corrective TDD Cycle Evidence
| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1.1b correction | `tests/integration/migrations.test.ts` | Integration | 18/18 passed | Preserved recorded prior RED | New assertions passed against existing migration | Required index and uniqueness boundaries exercised | Test helpers compacted; rerun passed |

### Corrected accounting and scope
- Status: authoritative OpenSpec `ready`, `repo-local`, `auto-chain`/`stacked-to-main`; only the authorized correction surfaces changed, with no design deviation.
- Added explicit required-index assertions and duplicate `attempt_key`, `(notification_id, attempt_no)`, and `token_hash` assertions; 1.1b remains visibly checked.
- Full 1.1b standard diff against the pre-1.1b baseline is **+377/-23 = 400 lines**, including implementation, tests, checkbox, and this cumulative evidence.

### Verification
- Safety net, coverage run, and post-refactor focused `pnpm test -- tests/integration/migrations.test.ts` each passed 18/18; `pnpm check` passed with 0 errors, warnings, and hints.

### Remaining tasks and PR boundary
- Exact unchecked implementation rows and unchanged parent-owned lifecycle actions remain in the preceding cumulative record.
- PR-1 work unit `1.1b-budget-coverage-correction` is complete; no live service, commit, push, deployment, review, receipt, or settlement action occurred.

## 2026-04-19 — Task 1.2 immutable draft terms (corrected evidence)

### Structured status consumed

- Authoritative OpenSpec change `add-admin-whatsapp-confirmation`; `artifactStore: openspec`, `applyState: ready`.
- `actionContext.mode: repo-local`; all edits stayed under `/home/charlydev/Projects/DEV/batalla-de-barberos` within the authorized correction surfaces.
- Delivery path: `auto-chain`, `stacked-to-main`; work unit `1.2-binary-identity-coverage-correction`; 400 changed-line maximum; strict TDD active.

### Completed implementation and persisted task state

- Task 1.2 remains visibly `- [x]` in `tasks.md`; its original deterministic source, manifest, generator, committed four-page PDF, package build verification, and immutable-write rejection remain intact.
- The PDF SHA-256 was regenerated and remains `215148280563df021b09b1634e63deba401cd9418a638f91a3450a8c2abe178e`.
- Added the narrow `public/documentos/bases-y-categorias/*.pdf binary` attribute; `git check-attr` reports `binary: set`, `diff: unset`, and `text: unset` for the committed PDF.
- The verifier now parses the active manifest entry and rejects any mismatch of current key, version, source path, public path, filename, MIME, or the literal SHA before regenerating and comparing bytes.
- Tests pin that literal SHA, compare all 16 approved placeholder tokens in source and PDF text, and prove coordinated active-entry identity drift is rejected.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1.2 correction | `tests/unit/draft-terms-manifest.test.ts`, `tests/integration/terms-pdf.test.ts` | Unit + integration | 22/22 focused tests passed before edits | 1 new coordinated-drift assertion failed because verification resolved | Minimal manifest-identity validation and PDF attribute made 23/23 pass | Literal SHA plus all 16 source/PDF placeholder tokens exercise distinct identity/content boundaries | Replaced the verbose 1.2 evidence with this cumulative compact record; focused tests stayed green |

### Verification

- RED: focused command failed only on coordinated identity drift; GREEN/TRIANGULATE/REFACTOR focused command passed 23/23.
- `pnpm terms:generate` preserved the existing bytes and SHA; `pnpm terms:verify`, `pnpm check`, and `pnpm build` passed.
- `git diff --no-index --numstat /dev/null public/documentos/bases-y-categorias/borrador-2026-09-v1.pdf` reports `-	-`, not 168 text lines.

### Remaining work and boundary

- Exact unchecked implementation rows and unchanged parent-owned lifecycle rows remain in the preceding cumulative entries; no task other than the already-complete implementation-owned 1.2 row was changed.
- No deviation from the approved design, commit, push, deployment, live service access, legal approval, receipt, review, settlement, or lifecycle reset occurred.
- PR boundary: `1.2-binary-identity-coverage-correction` only; standard-text accounting is recorded after final measurement below.

### Corrected full-task accounting

- **346 standard changed lines**: 303 across the seven task files including `.gitattributes`, `+3/-1` package scripts (4), `+1/-1` persisted checkbox (2), and this 37-line 1.2 evidence record; the 4,569-byte PDF is binary (`-/-`) and excluded. This is 54 lines below the 400-line limit.

## 2026-04-19 — Task 1.3 public legal copy

### Structured status consumed

- Authoritative OpenSpec change `add-admin-whatsapp-confirmation`; `artifactStore: openspec`, `applyState: ready`, and dependency task 1.2 complete.
- `actionContext.mode: repo-local`; workspace and allowed edit root: `/home/charlydev/Projects/DEV/batalla-de-barberos`.
- Delivery path: `auto-chain`, `stacked-to-main`; assigned work unit `1.3-public-legal-copy`; no size exception; strict TDD active.
- Parent legal approval R2 remains deferred and unchanged; no provider, live service, settlement, review, commit, push, or deployment action occurred.

### Completed work and persisted checkbox

- Completed implementation-owned task **1.3** and immediately changed its persisted checkbox to `- [x]`; no parent-owned row changed.
- Added `DraftTermsLink.astro` as the only public draft-terms link primitive. It resolves the immutable manifest path and renders `BORRADOR — PENDIENTE DE REVISIÓN LEGAL` beside the PDF link.
- Updated signup, participation, privacy, and browser success copy to keep registration storage, a WhatsApp receipt attempt, organizer selection, later participant response, and legal consent explicitly separate.
- Replaced unsupported privacy assurances with the required external Evolution API/WhatsApp processing description and `[A DEFINIR CON REVISIÓN LEGAL]` facts. The immutable PDF was retained untouched.

### Files changed

- `src/components/DraftTermsLink.astro`
- `src/components/SignupForm.astro`
- `src/pages/participacion.astro`
- `src/pages/privacidad.astro`
- `tests/integration/public-terms-copy.test.ts`
- `openspec/changes/add-admin-whatsapp-confirmation/tasks.md` (task 1.3 checkbox only)
- `openspec/changes/add-admin-whatsapp-confirmation/apply-progress.md` (this cumulative entry)

### Verification and runtime harness

- RED: `pnpm test -- tests/integration/public-terms-copy.test.ts` failed as expected: missing `DraftTermsLink.astro` and absent saved-registration/lifecycle copy (2 failures; 23 existing tests passed).
- GREEN: the same focused command passed with 2 public-copy assertions (25 total tests).
- TRIANGULATE: added the distinct no-bypass assertion for one shared `href` and component use across all three public surfaces; the focused command passed 3 public-copy assertions (26 total tests).
- REFACTOR: tightened test mapping for strict TypeScript after `pnpm check` exposed possible-undefined destructuring; reran the focused command successfully (26/26). No production refactor was needed because the shared component is the single declarative link primitive.
- Final commands passed: `pnpm test -- tests/integration/public-terms-copy.test.ts` (5 files, 26 tests), `pnpm check` (0 errors, warnings, hints), and `pnpm build` (including immutable terms verification).
- Runtime harness: started local `pnpm exec astro dev --host 127.0.0.1 --port 4321`, inspected rendered `/`, `/participacion`, and `/privacidad`, and confirmed the exact marker, immutable PDF link, lifecycle/privacy copy, and loaded signup-success message. Termination was attempted; a later independent gate found a stale Astro process group, terminated it, and confirmed port 4321 closed.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1.3 | `tests/integration/public-terms-copy.test.ts` | Integration | N/A (new focused suite; no prior public-copy test existed) | Expected missing-component and absent-copy failures | Shared component and minimum public copy passed 2 assertions | Added independent no-bypass coverage across signup, participation, and privacy; 3 assertions passed | Strict-TypeScript-safe test mapping; focused suite, check, and build passed |

### Deviations from design

None. Public copy uses conditional receipt-attempt language and never asserts a provider outcome, legal approval, selection, acceptance, delivery, or participant response.

### Remaining implementation tasks (exact persisted unchecked rows)

- [ ] **[2.1 — signup identity and orchestration; depends on: 1.1a, 1.1b, 1.2, 1.3]** RED in `tests/integration/signup-orchestration.test.ts`: prove validation precedes persistence, a registration commits before notification/provider work, notification-insert failure still returns saved success and reconciliation visibility, replay returns `200` only for matching fingerprint, conflicting idempotency key returns `409`, and concurrent requests create one registration/logical notification/claimed attempt. GREEN/TRIANGULATE/REFACTOR `src/lib/barber-signups.ts`, `src/pages/api/signups.ts`, `src/components/SignupForm.astro`, and concrete services/repositories under `src/lib/server/registrations/` and `src/lib/server/notifications/`; retain a browser UUID in `Idempotency-Key` until success and never make provider health decide signup success. Verify `pnpm test -- tests/integration/signup-orchestration.test.ts && pnpm check`; runtime harness: submit the same form payload twice against local in-memory/test configuration and record `201` then `200` with one persisted row. Rollback boundary: signup idempotency/client submission-key behavior and new orchestration modules; database remains additive and dispatch may be disabled independently. <!-- sdd-owner: implementation -->
- [ ] **[2.2 — provider-neutral receipt contract; depends on: 2.1]** RED in `tests/unit/receipt-caption-and-service.test.ts`: require `ReceiptMessenger.send` to receive only a document command with the persisted immutable PDF URL, `.pdf` filename, `application/pdf`, deterministic logical/attempt keys, and Spanish receipt-only caption including the fallback URL and exact marker; assert retry reads the stored snapshot after current terms changes and that no text-only overload exists. GREEN/TRIANGULATE/REFACTOR `src/lib/server/notifications/contracts.ts`, caption builder, receipt service, safe error-code mapping, lease/attempt repository methods, and tests. A normal `sent` transition must require `acceptedArtifact: 'document'`; a URL-only outcome is failed, not sent. Verify `pnpm test -- tests/unit/receipt-caption-and-service.test.ts`; runtime harness: `N/A — pure domain service is exercised through injected fake messenger and local libSQL integration tests.` Rollback boundary: provider-neutral contract/caption/receipt-service modules; pending records remain reconcilable. <!-- sdd-owner: implementation -->
- [ ] **[2.3 — validated Evolution document adapter; depends on: 2.2]** RED in `tests/unit/evolution-document-adapter.test.ts`: cover HTTPS-only base/path validation, profile fingerprint mismatch blocking fetch, safe non-colliding dotted field paths, exact-once destination/media URL/filename/MIME/caption construction, document-kind support, raw/bearer auth formatting without logs, timeout/response-size/redirect handling, and no text endpoint, hidden retry, or fallback send. GREEN/TRIANGULATE/REFACTOR `src/lib/server/config.ts` and `src/lib/server/notifications/evolution-document-http-messenger.ts` with a typed profile parser and bounded `fetch`; provider-specific types must not leave the adapter. Verify `pnpm test -- tests/unit/evolution-document-adapter.test.ts && pnpm check`; runtime harness: run a local fixture HTTP server to capture one JSON request and verify all document fields once, then confirm the profile-disabled path makes zero requests. Rollback boundary: config/profile/adapter modules and environment documentation; set dispatch false before removing runtime use. <!-- sdd-owner: implementation -->
- [ ] **[2.4 — dispatch outcome finalization; depends on: 2.2, 2.3]** RED in `tests/integration/receipt-dispatch-outcomes.test.ts`: prove disabled/unvalidated profile leaves zero-attempt pending with no fetch; known validated document acceptance alone becomes `sent` with allowlisted ID/evidence; media rejection/fetch failure and URL-only acceptance become `failed`; malformed 2xx, timeout, network/5xx, oversized responses, stale leases, and result-finalization ambiguity become `uncertain`; registration response remains successful throughout. GREEN/TRIANGULATE/REFACTOR receipt claim/finalize code and `src/pages/api/signups.ts` wiring. Verify `pnpm test -- tests/integration/receipt-dispatch-outcomes.test.ts && pnpm check && pnpm build`; runtime harness: local fixture server returns accepted-document, URL-only, and timeout fixtures and records the expected persisted states. Rollback boundary: automatic dispatch invocation only; `WHATSAPP_DISPATCH_ENABLED=false` stops calls while preserving signup and pending/reconcilable data. <!-- sdd-owner: implementation -->
- [ ] **[3.1 — secure admin session boundary; depends on: 1.1b]** RED in `tests/unit/admin-auth.test.ts` and `tests/integration/admin-route-security.test.ts`: cover scrypt password vectors, signed opaque cookie tamper/expiry/revocation failure, production/local cookie attributes, pre-auth and authenticated CSRF rejection, same-origin checks, per-address/global Turso throttle, logout invalidation, and unauthenticated HTML redirect/API `401` with no PII. GREEN/TRIANGULATE/REFACTOR `src/lib/server/admin/` password/session/CSRF/throttle helpers, `src/middleware.ts`, Astro locals types, `src/pages/admin/login.astro`, and `src/pages/api/admin/login.ts`/`logout.ts`; log only allowlisted IDs/outcomes. Verify `pnpm test -- tests/unit/admin-auth.test.ts tests/integration/admin-route-security.test.ts && pnpm check`; runtime harness: use local test configuration to login, access a protected route, logout, and verify the old cookie is denied. Rollback boundary: admin routes/middleware/session helpers; revoke sessions and unset admin routes without modifying registration storage. <!-- sdd-owner: implementation -->
- [ ] **[3.2 — submitted-registration-only read model and lifecycle writes; depends on: 3.1, 2.4]** RED in `tests/integration/admin-registration-management.test.ts`: seed registrations plus a non-database expected-person fixture and prove list/count/filter/detail are rooted exclusively in `barber_signups`; cover keyset pagination, historical normalized-phone display, separate Spanish state labels, optimistic state-version conflict, independent review/participant transitions, no-op rejection, and atomic allowlisted audit events. GREEN/TRIANGULATE/REFACTOR admin repositories/services and `src/pages/admin/index.astro`, `src/pages/admin/inscripciones/[id].astro`, `src/pages/api/admin/registrations/[id]/review-state.ts`, and `participant-response.ts`; do not add roster/import/comparison/export behavior. Verify `pnpm test -- tests/integration/admin-registration-management.test.ts && pnpm check`; runtime harness: seed two registrations, render `/admin`, and confirm only those two appear with three independent status areas. Rollback boundary: admin read/detail/lifecycle UI and routes; retain additive states/audit history. <!-- sdd-owner: implementation -->
- [ ] **[3.3 — controlled retry and reconciliation; depends on: 3.2]** RED in `tests/integration/admin-receipt-recovery.test.ts`: prove only failed/uncertain notifications retry on the original logical record, uncertain retries require `ackUncertain=1`, sent notifications have no normal retry action, stale in-progress leases first become uncertain, and reconcile acts only on an existing persisted registration with missing/zero-attempt/stale-pending receipt state. GREEN/TRIANGULATE/REFACTOR retry/reconcile services and `src/pages/api/admin/registrations/[id]/receipt/retry.ts`, `reconcile.ts`, plus detail forms; enforce CSRF, lease concurrency, PRG redirects, sanitized diagnostics, and no new registration. Verify `pnpm test -- tests/integration/admin-receipt-recovery.test.ts && pnpm check && pnpm build`; runtime harness: use local fixture provider to fail then retry one registration and confirm attempt count increments while registration count remains one. Rollback boundary: retry/reconcile endpoints/forms only; disable dispatch to contain future attempts while retaining historical attempts. <!-- sdd-owner: implementation -->
- [ ] **[3.4 — configuration, hardening, and operator documentation; depends on: 2.3, 3.1, 3.3]** RED in `tests/unit/server-config-and-observability.test.ts`: reject missing/unsafe server configuration and assert logs/persisted diagnostics never include credentials, headers, cookies, IPs, phone, names, caption, raw provider body, or secrets. GREEN/TRIANGULATE/REFACTOR `environment.example`, `README.md`, `astro.config.mjs`, `vercel.json`, password-hash utility under `scripts/`, and server config/logging modules; document `WHATSAPP_DISPATCH_ENABLED=false` containment, independent credential rotation, profile-fingerprint validation, PDF immutability, and the migration command warning. Verify `pnpm test -- tests/unit/server-config-and-observability.test.ts && pnpm check && pnpm build`; runtime harness: start with dispatch disabled and confirm startup/config parsing exposes no secret values. Rollback boundary: configuration/docs/header hardening and utility script; preserve safe disabled-dispatch defaults. <!-- sdd-owner: implementation -->

### Deferred lifecycle actions

Parent-owned tasks remain byte-for-byte unchanged: R2 legal/content approval, R3 Turso migration, R4 Evolution document capability validation, R5 controlled deployment, and R6 bounded post-apply review.

### Workload / PR boundary and exact accounting

- Delivery path: `auto-chain`, `stacked-to-main`; current PR/work-unit boundary: **1.3-public-legal-copy** only.
- Standard-text delta before this evidence: `+111/-26` across the shared component, public copy, integration test, and persisted checkbox. This entry added 66 lines, yielding the exact work-unit delta **+177/-26 = 203 changed lines**, 197 lines below the 400-line limit.
- Rollback removes only the shared public link, legal-copy/test changes, and task evidence; it preserves the immutable PDF. No commit was made.

## 2026-04-19 — Task 1.3 public-copy corrective continuation blocked

### Structured status consumed

- Native authoritative OpenSpec status: `add-admin-whatsapp-confirmation`, `artifactStore: openspec`, `applyState: blocked`, `nextRecommended: resolve-blockers`.
- `actionContext.mode: repo-local`; the parent supplied the project root and a correction-only allowlist, but native status reports `blocked(edit_authority_missing)` because tasks target `/` outside native edit authority.
- Parent continuation context identified `auto-chain` / `stacked-to-main`, work unit `1.3-public-legal-copy`, a 400-line maximum, strict TDD, and a corrective evidence binding. These do not override an authoritative `applyState: blocked`.

### Result

Blocked before the strict-TDD safety net or RED. No source, test, or task-checkbox change was made; task 1.3 remains at its pre-existing visible `- [x]` state and is not re-affirmed as complete by this blocked continuation.

### Required resolution

A maintainer must resolve the native `edit_authority_missing` blocker (the status command identifies `/` as the missing root) or repair the task-plan path metadata, then provide fresh authoritative `applyState: ready` status for the same bounded continuation.

### Files changed

- `openspec/changes/add-admin-whatsapp-confirmation/apply-progress.md` (this cumulative blocker record only).

### Tests and TDD Cycle Evidence

No test command was run and no RED test was added because the authoritative status guard stopped implementation before editing code or tests.

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1.3 corrective continuation | `tests/integration/public-terms-copy.test.ts` | Integration | Not run: authoritative status blocked | Not started | Not started | Not started | Not started |

### Remaining work and boundary

- The correction targets remain unresolved: validation acknowledgement wording, API saved-registration response semantics, static success wording, the participation Spanish correction, and per-surface public-copy test assertions.
- Implementation-owned tasks reported unchecked by native status: 1.3's correction is blocked; later work remains 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, and 3.4. Parent-owned lifecycle actions remain unchanged.
- PR/work-unit boundary remains `1.3-public-legal-copy`; no commit, push, deployment, live service, review, receipt, or settlement action occurred.

## 2026-04-19 — Work unit 1.3 public-copy conformance correction

### Structured status consumed

- Native authoritative status: `schemaName: spec-driven`, change `add-admin-whatsapp-confirmation`, `artifactStore: openspec`, `applyState: ready`, `nextRecommended: apply`, and `isNonAuthoritative: false`.
- Native authorization: `proceed`, token `sha256:a7e02d4660396e11d3f705f10515d42b36f760503fa9b860e3193f9e70405747`; this bounded work unit remediates failed evidence `sha256:f4009cbf243a2498e04be166eb672e57a63bc67777129c525dc959c4822c34a8`.
- `actionContext.mode: repo-local`; all edits are within the supplied workspace and allowed correction surfaces. The prior `edit_authority_missing` blocker is resolved; runtime URLs in the task row are explicitly read-only.
- Delivery path: `auto-chain`, `stacked-to-main`; PR boundary `1.3-public-copy-conformance-correction`; strict TDD active; maximum 400 changed lines.

### Completed corrective work and persisted task state

- Replaced the validation error's false acceptance claim with a read-state acknowledgement that includes `BORRADOR — PENDIENTE DE REVISIÓN LEGAL`.
- Replaced the API's promised future contact with saved-registration, separate WhatsApp-attempt, later-selection, later-participant-response, and non-consent semantics.
- Updated static form success copy with the later participant-response and non-consent boundaries, and corrected the participation-page Spanish to `la respuesta posterior de la persona participante`.
- Added exact per-surface assertions for validation, API response, static success copy, participation wording, and existing privacy boundaries; unrelated text cannot satisfy the new assertions.
- Re-read `tasks.md`: implementation-owned task **1.3** remains visibly `- [x]`; no task 2.1 behavior or parent-owned row changed. The pre-existing one-line task-plan read-only metadata correction remains intact.

### Files changed

- `src/lib/barber-signups.ts`
- `src/pages/api/signups.ts`
- `src/components/SignupForm.astro`
- `src/pages/participacion.astro`
- `tests/integration/public-terms-copy.test.ts`
- `openspec/changes/add-admin-whatsapp-confirmation/apply-progress.md`

### Verification

- Safety net: `pnpm test -- tests/integration/public-terms-copy.test.ts` passed 26/26 before the RED change.
- RED: the focused command failed as expected with four missing exact-copy assertions.
- GREEN, TRIANGULATE, and REFACTOR: the focused command passed 29/29 after each stage.
- `pnpm check` passed: 28 files, 0 errors, 0 warnings, 0 hints.
- `pnpm build` passed, including immutable-terms verification for `draft-2026-09-v1` (`215148280563df021b09b1634e63deba401cd9418a638f91a3450a8c2abe178e`); the only build warning was the existing local Node 26/Vercel Node 22 compatibility notice.
- Read-only runtime inspection: started local Astro dev on `127.0.0.1:4321`, rendered `/`, `/participacion`, and `/privacidad`, confirmed the visible marker and corrected participation copy, then terminated the process and removed temporary captures.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1.3 public-copy correction | `tests/integration/public-terms-copy.test.ts` | Integration | 26/26 passed | Four exact-copy assertions failed as expected | 29/29 passed after minimum copy changes | Added per-surface negative boundaries; 29/29 passed | Extracted exact-copy constants; 29/29 passed |

### Deviations, remaining work, and workload boundary

- No design deviation, live service access, commit, push, deployment, review, receipt, settlement, or task 2.1 behavior occurred.
- Remaining implementation-owned unchecked rows are unchanged: `- [ ]` 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, and 3.4; their exact persisted task lines remain in the preceding cumulative entries. Deferred parent-owned rows R2–R6 remain byte-for-byte unchanged.
- Independent final accounting against the post-1.2 baseline is `+286/-28 = 314` changed text lines: `+138/-27` production/tests, `+1/-1` consolidated task-checkbox/runtime-route metadata, and 147 lines of task 1.3 progress evidence; this is 86 below the 400-line limit.
- Rollback removes only this correction's four copy replacements and focused assertions; it retains the shared `DraftTermsLink` and immutable PDF route.

## 2026-04-19 — Task 2.1 signup identity and orchestration

### Structured status consumed

- Authoritative OpenSpec: `add-admin-whatsapp-confirmation`, `artifactStore: openspec`, `applyState: ready`, `nextRecommended: apply`, and `repo-local` root `/home/charlydev/Projects/DEV/batalla-de-barberos`.
- Native authorization `proceed` (`sha256:15c2207e4bf0370b5e945f20d8638886ba3c65129f1015a8c3e880b8437b779b`) assigned only `2.1-signup-identity-orchestration`; strict TDD and the 400-line limit applied.
- Delivery path: `auto-chain`, `stacked-to-main`; no exception. Parent-owned R2–R6 remain byte-for-byte unchanged. No provider, Turso, deployment, commit, push, review, receipt, or settlement action occurred.

### Completed work and persisted checkbox

- Completed implementation-owned task **2.1** and changed only its checkbox to `- [x]`; re-read confirmation follows below.
- Validation normalizes the Argentina phone before persistence; canonical `phone_e164`, submission key, SHA-256 accepted-input fingerprint, terms/notice versions, and `receipt_required = 1` persist with the registration.
- Registration commits before the notification repository runs. Notification failure is swallowed after that commit, leaving the required registration visible for later reconciliation.
- Matching submission key or equal email fingerprint replays at `200`; a conflicting idempotency key and different duplicate email return `409`.
- The receipt repository creates one logical notification and atomically permits one initial claimed attempt. It makes no provider call or dispatch decision.
- The browser keeps one UUID in `Idempotency-Key` across errors and rotates it only after a successful response.

### Files changed

`src/lib/barber-signups.ts`, `src/pages/api/signups.ts`, `src/components/SignupForm.astro`, `src/lib/server/registrations/signup-orchestrator.ts`, `src/lib/server/notifications/registration-receipts.ts`, `tests/integration/signup-orchestration.test.ts`, `tasks.md` (2.1 checkbox only), and this progress artifact.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2.1 | `tests/integration/signup-orchestration.test.ts` | Integration | `public-terms-copy`: 29/29 passed | Missing `createSignupPost`: 4 expected failures | 4 orchestration cases passed | Added no-key replay, persisted-before-notification, browser-key, and concurrent cases; 6 passed | Removed obsolete direct signup persistence and retained focused suite green |

### Verification, deviation, and boundary

- Required focused command passed: `pnpm test -- tests/integration/signup-orchestration.test.ts` (6 files, 35 tests). `pnpm check` passed with 0 errors, warnings, and hints.
- Disposable in-memory libSQL runtime harness submitted the identical payload twice and proved `201`, then `200`, with one persisted registration; every client closed in `afterEach`.
- Bounded deferred-config deviation: until task 3.4 supplies validated canonical-origin configuration, the immutable URL snapshot uses the request origin; provider health cannot determine signup success, and actual provider dispatch is deliberately deferred to 2.2–2.4.
- Re-read `tasks.md` confirms 2.1 is visibly checked. Remaining implementation rows are the unchanged exact persisted `- [ ]` rows 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, and 3.4 recorded above; deferred lifecycle rows are R2–R6.
- PR boundary: `2.1-signup-identity-orchestration`. Work-unit accounting: 281 source/test lines plus 2 checkbox and 34 progress lines = **317 changed lines**, below 400; rollback removes only these identity/orchestration files and retains additive schema data.
## 2026-04-19 — Task 2.1 atomic receipt-claim correction
### Structured status consumed
- Manual authoritative OpenSpec status: `add-admin-whatsapp-confirmation`, `openspec`, `ready`, `nextRecommended: apply`; native CLI is unavailable (`gentle-ai sdd` is unknown).
- `actionContext`: `repo-local`; workspace and supplied allowed surfaces are `/home/charlydev/Projects/DEV/batalla-de-barberos`; no edit-root warning.
- Parent continuation: `proceed` for `2.1-signup-identity-orchestration`, `auto-chain`/`stacked-to-main`, strict TDD, 400-line maximum; parent retains settlement of `sha256:396ce8274fe4400f9969041367eaecbe479e5f4f5a8417589a028421ffc061c1`.
### Completed corrective work and task state
- Replaced separate lease update/attempt insert with one local-libSQL `batch(..., 'write')`: the conditional pending/zero-attempt/no-live-lease update and token-owned `INSERT … SELECT` commit or roll back together.
- A trigger-aborted attempt insert now leaves the persisted notification `pending`, `attempt_count = 0`, both lease fields `NULL`, and zero attempt rows while the registration still returns `201`.
- Task 2.1 remains visibly `- [x]` in `tasks.md`; no checkbox changed because this is a bounded correction to completed task work.
### Files and verification
- Changed: `src/lib/server/notifications/registration-receipts.ts`, `tests/integration/signup-orchestration.test.ts`, and this cumulative progress artifact.
- Safety net: `pnpm test -- tests/integration/signup-orchestration.test.ts` passed 35/35 before RED.
- RED: the new local trigger regression failed as expected with persisted `attempt_count = 1` and lease fields set.
- GREEN: corrected the batch mode to libSQL-supported `'write'`; focused command passed 36/36.
- TRIANGULATE: the forced rollback boundary and existing concurrent `201`/`200` single-registration/logical-notification/attempt boundary both passed.
- REFACTOR: guarded the batch result index for strict TypeScript; focused command passed 36/36 and `pnpm check` passed with 0 errors, warnings, and hints.
### TDD Cycle Evidence
| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2.1 correction | `tests/integration/signup-orchestration.test.ts` | Integration | 35/35 passed | Trigger regression failed | 36/36 passed | Rollback + concurrency passed | 36/36 and check passed |
### Deviations
- None; the temporary local trigger was dropped in `finally`, and no provider dispatch, live service, commit, push, deployment, review, receipt, or settlement was performed.
### Remaining implementation tasks (exact persisted unchecked rows)
- [ ] **[2.2 — provider-neutral receipt contract; depends on: 2.1]** RED in `tests/unit/receipt-caption-and-service.test.ts`: require `ReceiptMessenger.send` to receive only a document command with the persisted immutable PDF URL, `.pdf` filename, `application/pdf`, deterministic logical/attempt keys, and Spanish receipt-only caption including the fallback URL and exact marker; assert retry reads the stored snapshot after current terms changes and that no text-only overload exists. GREEN/TRIANGULATE/REFACTOR `src/lib/server/notifications/contracts.ts`, caption builder, receipt service, safe error-code mapping, lease/attempt repository methods, and tests. A normal `sent` transition must require `acceptedArtifact: 'document'`; a URL-only outcome is failed, not sent. Verify `pnpm test -- tests/unit/receipt-caption-and-service.test.ts`; runtime harness: `N/A — pure domain service is exercised through injected fake messenger and local libSQL integration tests.` Rollback boundary: provider-neutral contract/caption/receipt-service modules; pending records remain reconcilable. <!-- sdd-owner: implementation -->
- [ ] **[2.3 — validated Evolution document adapter; depends on: 2.2]** RED in `tests/unit/evolution-document-adapter.test.ts`: cover HTTPS-only base/path validation, profile fingerprint mismatch blocking fetch, safe non-colliding dotted field paths, exact-once destination/media URL/filename/MIME/caption construction, document-kind support, raw/bearer auth formatting without logs, timeout/response-size/redirect handling, and no text endpoint, hidden retry, or fallback send. GREEN/TRIANGULATE/REFACTOR `src/lib/server/config.ts` and `src/lib/server/notifications/evolution-document-http-messenger.ts` with a typed profile parser and bounded `fetch`; provider-specific types must not leave the adapter. Verify `pnpm test -- tests/unit/evolution-document-adapter.test.ts && pnpm check`; runtime harness: run a local fixture HTTP server to capture one JSON request and verify all document fields once, then confirm the profile-disabled path makes zero requests. Rollback boundary: config/profile/adapter modules and environment documentation; set dispatch false before removing runtime use. <!-- sdd-owner: implementation -->
- [ ] **[2.4 — dispatch outcome finalization; depends on: 2.2, 2.3]** RED in `tests/integration/receipt-dispatch-outcomes.test.ts`: prove disabled/unvalidated profile leaves zero-attempt pending with no fetch; known validated document acceptance alone becomes `sent` with allowlisted ID/evidence; media rejection/fetch failure and URL-only acceptance become `failed`; malformed 2xx, timeout, network/5xx, oversized responses, stale leases, and result-finalization ambiguity become `uncertain`; registration response remains successful throughout. GREEN/TRIANGULATE/REFACTOR receipt claim/finalize code and `src/pages/api/signups.ts` wiring. Verify `pnpm test -- tests/integration/receipt-dispatch-outcomes.test.ts && pnpm check && pnpm build`; runtime harness: local fixture server returns accepted-document, URL-only, and timeout fixtures and records the expected persisted states. Rollback boundary: automatic dispatch invocation only; `WHATSAPP_DISPATCH_ENABLED=false` stops calls while preserving signup and pending/reconcilable data. <!-- sdd-owner: implementation -->
- [ ] **[3.1 — secure admin session boundary; depends on: 1.1b]** RED in `tests/unit/admin-auth.test.ts` and `tests/integration/admin-route-security.test.ts`: cover scrypt password vectors, signed opaque cookie tamper/expiry/revocation failure, production/local cookie attributes, pre-auth and authenticated CSRF rejection, same-origin checks, per-address/global Turso throttle, logout invalidation, and unauthenticated HTML redirect/API `401` with no PII. GREEN/TRIANGULATE/REFACTOR `src/lib/server/admin/` password/session/CSRF/throttle helpers, `src/middleware.ts`, Astro locals types, `src/pages/admin/login.astro`, and `src/pages/api/admin/login.ts`/`logout.ts`; log only allowlisted IDs/outcomes. Verify `pnpm test -- tests/unit/admin-auth.test.ts tests/integration/admin-route-security.test.ts && pnpm check`; runtime harness: use local test configuration to login, access a protected route, logout, and verify the old cookie is denied. Rollback boundary: admin routes/middleware/session helpers; revoke sessions and unset admin routes without modifying registration storage. <!-- sdd-owner: implementation -->
- [ ] **[3.2 — submitted-registration-only read model and lifecycle writes; depends on: 3.1, 2.4]** RED in `tests/integration/admin-registration-management.test.ts`: seed registrations plus a non-database expected-person fixture and prove list/count/filter/detail are rooted exclusively in `barber_signups`; cover keyset pagination, historical normalized-phone display, separate Spanish state labels, optimistic state-version conflict, independent review/participant transitions, no-op rejection, and atomic allowlisted audit events. GREEN/TRIANGULATE/REFACTOR admin repositories/services and `src/pages/admin/index.astro`, `src/pages/admin/inscripciones/[id].astro`, `src/pages/api/admin/registrations/[id]/review-state.ts`, and `participant-response.ts`; do not add roster/import/comparison/export behavior. Verify `pnpm test -- tests/integration/admin-registration-management.test.ts && pnpm check`; runtime harness: seed two registrations, render `/admin`, and confirm only those two appear with three independent status areas. Rollback boundary: admin read/detail/lifecycle UI and routes; retain additive states/audit history. <!-- sdd-owner: implementation -->
- [ ] **[3.3 — controlled retry and reconciliation; depends on: 3.2]** RED in `tests/integration/admin-receipt-recovery.test.ts`: prove only failed/uncertain notifications retry on the original logical record, uncertain retries require `ackUncertain=1`, sent notifications have no normal retry action, stale in-progress leases first become uncertain, and reconcile acts only on an existing persisted registration with missing/zero-attempt/stale-pending receipt state. GREEN/TRIANGULATE/REFACTOR retry/reconcile services and `src/pages/api/admin/registrations/[id]/receipt/retry.ts`, `reconcile.ts`, plus detail forms; enforce CSRF, lease concurrency, PRG redirects, sanitized diagnostics, and no new registration. Verify `pnpm test -- tests/integration/admin-receipt-recovery.test.ts && pnpm check && pnpm build`; runtime harness: use local fixture provider to fail then retry one registration and confirm attempt count increments while registration count remains one. Rollback boundary: retry/reconcile endpoints/forms only; disable dispatch to contain future attempts while retaining historical attempts. <!-- sdd-owner: implementation -->
- [ ] **[3.4 — configuration, hardening, and operator documentation; depends on: 2.3, 3.1, 3.3]** RED in `tests/unit/server-config-and-observability.test.ts`: reject missing/unsafe server configuration and assert logs/persisted diagnostics never include credentials, headers, cookies, IPs, phone, names, caption, raw provider body, or secrets. GREEN/TRIANGULATE/REFACTOR `environment.example`, `README.md`, `astro.config.mjs`, `vercel.json`, password-hash utility under `scripts/`, and server config/logging modules; document `WHATSAPP_DISPATCH_ENABLED=false` containment, independent credential rotation, profile-fingerprint validation, PDF immutability, and the migration command warning. Verify `pnpm test -- tests/unit/server-config-and-observability.test.ts && pnpm check && pnpm build`; runtime harness: start with dispatch disabled and confirm startup/config parsing exposes no secret values. Rollback boundary: configuration/docs/header hardening and utility script; preserve safe disabled-dispatch defaults. <!-- sdd-owner: implementation -->
### Workload / PR boundary
- Correction delta is `+33/-11 = 44` changed text lines (`+17/-11` atomic repository, `+16/-0` regression); this 33-line entry gives exact cumulative accounting `317 + 44 + 33 = 394/400`.
- Boundary remains `2.1-signup-identity-orchestration`; parent-owned R2–R6 are deferred unchanged and parent lifecycle owns settlement.

## 2026-04-19 — Task 2.2 provider-neutral receipt contract

### Structured status consumed

- Native `gentle-ai.sdd-status@2`: authoritative `openspec` change `add-admin-whatsapp-confirmation`, `applyState: ready`, `blockedReasons: []`, and `nextRecommended: apply`.
- `actionContext.mode: repo-local`; allowed root: `/home/charlydev/Projects/DEV/batalla-de-barberos`. This work used only the supplied notification, test, task, and progress surfaces.
- Delivery path: `auto-chain`, `stacked-to-main`, task work-unit `2.2-provider-neutral-receipts`, 400-line cap; no size exception. The native acquire was `proceed`; parent retains settlement.

### Completed work and persisted checkbox

- Completed implementation-owned task **2.2** and immediately changed only its task checkbox to `- [x]`; a final artifact re-read confirmed it.
- Added a document-only `ReceiptMessenger` contract, safe allowlisted error-code mapping, exact Spanish receipt caption builder, and a service that only records `sent` after runtime confirmation of `acceptedArtifact: 'document'`.
- Added local-libSQL repository claim/finalize methods that atomically create a deterministic logical/attempt identity, retain the persisted PDF snapshot, and update only the token-owned in-progress attempt. URL-only acceptance is persisted as `failed / PROVIDER_ATTACHMENT_NOT_ACCEPTED`.
- Kept the completed 2.1 signup repository boundary: its wrapper still creates the one initial atomic claimed attempt, while 2.2 exposes the provider-neutral dispatch service without wiring any provider or HTTP adapter.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2.2 | `tests/unit/receipt-caption-and-service.test.ts` | Unit + local-libSQL repository boundary | Existing 36 tests passed during initial focused run before the new suite loaded | Expected missing `receipt-caption` module import; 36 existing tests passed, new suite failed | 3 receipt tests passed with document acceptance and persisted snapshot command assertions | A corrupted runtime URL-only `accepted` outcome failed before the guard; after the guard, two failed attempts retained the old snapshot even after current terms were changed | Extracted the repeated static Spanish safe diagnostic; focused suite remained green |

### Verification and boundary

- `pnpm test -- tests/unit/receipt-caption-and-service.test.ts` passed: 7 files, 39 tests.
- `pnpm check` passed: 35 files, 0 errors, 0 warnings, 0 hints.
- `pnpm test` passed: 7 files, 39 tests. Runtime harness: N/A — injected fake messenger plus a disposable `file::memory:` libSQL database and the real migration runner exercised the repository boundary; no credential or live service was accessed.
- Baseline/diff accounting: the pre-unit 2.1 receipt repository was 55 lines; its 2.2 replacement is `+62/-34`. New contract/caption/service modules add 57 lines and the focused test adds 99 lines; checkbox `+1/-1` and this 41-line progress record produce an authored work-unit total of **260 additions + 35 deletions = 295 changed lines**, below 400.
- Rollback boundary: `src/lib/server/notifications/{contracts.ts,receipt-caption.ts,receipt-service.ts,registration-receipts.ts}` and `tests/unit/receipt-caption-and-service.test.ts`; pending records remain reconcilable. No Evolution adapter, public dispatch wiring, admin surface, commit, push, deploy, live provider, receipt, review, or settlement was created.

### Remaining implementation tasks (exact persisted unchecked rows)

- [ ] **[2.3 — validated Evolution document adapter; depends on: 2.2]** RED in `tests/unit/evolution-document-adapter.test.ts`: cover HTTPS-only base/path validation, profile fingerprint mismatch blocking fetch, safe non-colliding dotted field paths, exact-once destination/media URL/filename/MIME/caption construction, document-kind support, raw/bearer auth formatting without logs, timeout/response-size/redirect handling, and no text endpoint, hidden retry, or fallback send. GREEN/TRIANGULATE/REFACTOR `src/lib/server/config.ts` and `src/lib/server/notifications/evolution-document-http-messenger.ts` with a typed profile parser and bounded `fetch`; provider-specific types must not leave the adapter. Verify `pnpm test -- tests/unit/evolution-document-adapter.test.ts && pnpm check`; runtime harness: run a local fixture HTTP server to capture one JSON request and verify all document fields once, then confirm the profile-disabled path makes zero requests. Rollback boundary: config/profile/adapter modules and environment documentation; set dispatch false before removing runtime use. <!-- sdd-owner: implementation -->
- [ ] **[2.4 — dispatch outcome finalization; depends on: 2.2, 2.3]** RED in `tests/integration/receipt-dispatch-outcomes.test.ts`: prove disabled/unvalidated profile leaves zero-attempt pending with no fetch; known validated document acceptance alone becomes `sent` with allowlisted ID/evidence; media rejection/fetch failure and URL-only acceptance become `failed`; malformed 2xx, timeout, network/5xx, oversized responses, stale leases, and result-finalization ambiguity become `uncertain`; registration response remains successful throughout. GREEN/TRIANGULATE/REFACTOR receipt claim/finalize code and `src/pages/api/signups.ts` wiring. Verify `pnpm test -- tests/integration/receipt-dispatch-outcomes.test.ts && pnpm check && pnpm build`; runtime harness: local fixture server returns accepted-document, URL-only, and timeout fixtures and records the expected persisted states. Rollback boundary: automatic dispatch invocation only; `WHATSAPP_DISPATCH_ENABLED=false` stops calls while preserving signup and pending/reconcilable data. <!-- sdd-owner: implementation -->
- [ ] **[3.1 — secure admin session boundary; depends on: 1.1b]** RED in `tests/unit/admin-auth.test.ts` and `tests/integration/admin-route-security.test.ts`: cover scrypt password vectors, signed opaque cookie tamper/expiry/revocation failure, production/local cookie attributes, pre-auth and authenticated CSRF rejection, same-origin checks, per-address/global Turso throttle, logout invalidation, and unauthenticated HTML redirect/API `401` with no PII. GREEN/TRIANGULATE/REFACTOR `src/lib/server/admin/` password/session/CSRF/throttle helpers, `src/middleware.ts`, Astro locals types, `src/pages/admin/login.astro`, and `src/pages/api/admin/login.ts` and `src/pages/api/admin/logout.ts`; log only allowlisted IDs/outcomes. Verify `pnpm test -- tests/unit/admin-auth.test.ts tests/integration/admin-route-security.test.ts && pnpm check`; runtime harness: use local test configuration to login, access a protected route, logout, and verify the old cookie is denied. Rollback boundary: admin routes/middleware/session helpers; revoke sessions and unset admin routes without modifying registration storage. <!-- sdd-owner: implementation -->
- [ ] **[3.2 — submitted-registration-only read model and lifecycle writes; depends on: 3.1, 2.4]** RED in `tests/integration/admin-registration-management.test.ts`: seed registrations plus a non-database expected-person fixture and prove list/count/filter/detail are rooted exclusively in `barber_signups`; cover keyset pagination, historical normalized-phone display, separate Spanish state labels, optimistic state-version conflict, independent review/participant transitions, no-op rejection, and atomic allowlisted audit events. GREEN/TRIANGULATE/REFACTOR admin repositories/services and `src/pages/admin/index.astro`, `src/pages/admin/inscripciones/[id].astro`, `src/pages/api/admin/registrations/[id]/review-state.ts`, and `participant-response.ts`; do not add roster/import/comparison/export behavior. Verify `pnpm test -- tests/integration/admin-registration-management.test.ts && pnpm check`; runtime harness: seed two registrations, render `/admin` (read-only), and confirm only those two appear with three independent status areas. Rollback boundary: admin read/detail/lifecycle UI and routes; retain additive states/audit history. <!-- sdd-owner: implementation -->
- [ ] **[3.3 — controlled retry and reconciliation; depends on: 3.2]** RED in `tests/integration/admin-receipt-recovery.test.ts`: prove only failed/uncertain notifications retry on the original logical record, uncertain retries require `ackUncertain=1`, sent notifications have no normal retry action, stale in-progress leases first become uncertain, and reconcile acts only on an existing persisted registration with missing/zero-attempt/stale-pending receipt state. GREEN/TRIANGULATE/REFACTOR retry/reconcile services and `src/pages/api/admin/registrations/[id]/receipt/retry.ts`, `reconcile.ts`, plus detail forms; enforce CSRF, lease concurrency, PRG redirects, sanitized diagnostics, and no new registration. Verify `pnpm test -- tests/integration/admin-receipt-recovery.test.ts && pnpm check && pnpm build`; runtime harness: use local fixture provider to fail then retry one registration and confirm attempt count increments while registration count remains one. Rollback boundary: retry/reconcile endpoints/forms only; disable dispatch to contain future attempts while retaining historical attempts. <!-- sdd-owner: implementation -->
- [ ] **[3.4 — configuration, hardening, and operator documentation; depends on: 2.3, 3.1, 3.3]** RED in `tests/unit/server-config-and-observability.test.ts`: reject missing/unsafe server configuration and assert logs/persisted diagnostics never include credentials, headers, cookies, IPs, phone, names, caption, raw provider body, or secrets. GREEN/TRIANGULATE/REFACTOR `environment.example`, `README.md`, `astro.config.mjs`, `vercel.json`, password-hash utility under `scripts/`, and server config/logging modules; document `WHATSAPP_DISPATCH_ENABLED=false` containment, independent credential rotation, profile-fingerprint validation, PDF immutability, and the migration command warning. Verify `pnpm test -- tests/unit/server-config-and-observability.test.ts && pnpm check && pnpm build`; runtime harness: start with dispatch disabled and confirm startup/config parsing exposes no secret values. Rollback boundary: configuration/docs/header hardening and utility script; preserve safe disabled-dispatch defaults. <!-- sdd-owner: implementation -->

### Deferred lifecycle actions

Parent-owned R2 legal/content approval, R3 Turso migration, R4 Evolution document validation, R5 controlled deployment, and R6 bounded post-apply review remain byte-for-byte unchanged.

## 2026-04-19 — Task 2.2 correction budget gate

### Structured status consumed

- Parent-supplied authoritative `gentle-ai.sdd-status@2`: OpenSpec, `applyState: ready`, `nextRecommended: apply`, `repo-local`, canonical repository allowed root, and native continuation `proceed`.
- Delivery path is `auto-chain` / `stacked-to-main`; strict TDD applies. This actor did not create a receipt or settlement.

### Correction assessment

- The prior 2.2 accounting is **295 changed lines**, leaving **105 lines** of the 400-line cumulative cap before this correction.
- The required regressions and smallest honest fixes are estimated at **150–235 authored lines**: persisted-snapshot validation (35–50 tests, 25–40 implementation), atomic dual-row ownership finalization/concurrency (35–50 tests, 30–50 implementation), and deterministic-key/redaction coverage (20–30 tests, 5–15 implementation). This cannot fit the remaining budget without code-golfing or omitting mandated coverage.
- The existing 2.2 completion claim is therefore invalid. Its implementation-owned persisted checkbox was restored to `- [ ]`; no production or test file was edited and no RED change was begun.

### Verification and TDD evidence

- Safety net: `pnpm test -- tests/unit/receipt-caption-and-service.test.ts` passed, collecting 7 files / 39 tests.
- No RED/GREEN/TRIANGULATE/REFACTOR cycle began because the review-budget gate stopped work before code or test edits.

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2.2 correction | `tests/unit/receipt-caption-and-service.test.ts` | Unit + local-libSQL | 39/39 passed | Not started: 105-line remainder insufficient | Not started | Not started | Not started |

### Required replan and boundary

- Proposed cohesive stacked slices: **2.2a snapshot-command validation and deterministic-key regressions**; then **2.2b atomic notification-and-attempt lease-owned finalization, stale/concurrent-finalization regressions, and raw-secret redaction**. Each remains provider-neutral and does not add adapter, dispatch, or admin work.
- Exact restored unchecked implementation row:
- [ ] **[2.2 — provider-neutral receipt contract; depends on: 2.1]** RED in `tests/unit/receipt-caption-and-service.test.ts`: require `ReceiptMessenger.send` to receive only a document command with the persisted immutable PDF URL, `.pdf` filename, `application/pdf`, deterministic logical/attempt keys, and Spanish receipt-only caption including the fallback URL and exact marker; assert retry reads the stored snapshot after current terms changes and that no text-only overload exists. GREEN/TRIANGULATE/REFACTOR `src/lib/server/notifications/contracts.ts`, caption builder, receipt service, safe error-code mapping, lease/attempt repository methods, and tests. A normal `sent` transition must require `acceptedArtifact: 'document'`; a URL-only outcome is failed, not sent. Verify `pnpm test -- tests/unit/receipt-caption-and-service.test.ts`; runtime harness: `N/A — pure domain service is exercised through injected fake messenger and local libSQL integration tests.` Rollback boundary: provider-neutral contract/caption/receipt-service modules; pending records remain reconcilable. <!-- sdd-owner: implementation -->
- No design deviation, commit, push, deployment, provider/live call, review, receipt, or settlement occurred. Parent lifecycle owns the delivery decision and settlement.

## 2026-04-19 — Task 2.2a document snapshot validation and stable key correction

### Structured status consumed

- Native `gentle-ai.sdd-status@2` supplied by the parent: authoritative `openspec` change `add-admin-whatsapp-confirmation`, `applyState: ready`, `blockedReasons: []`, and `nextRecommended: apply`.
- `actionContext.mode: repo-local`; authoritative workspace and allowed root: `/home/charlydev/Projects/DEV/batalla-de-barberos`.
- Delivery path: `auto-chain`, `stacked-to-main`, independently rollbackable work unit `2.2a-document-snapshot-validation`; 400-line cap; no size exception. The parent acquired `proceed` and owns settlement.

### Baseline and completed work

- Before RED, `HEAD` was `d99fd535ff6d883303368fb18c4f7a17898a894a`; the allowed notification/test/task/progress surfaces were already untracked inherited work. Their captured baseline SHA-256 values were: `contracts.ts` `e8909c26a45405d9195fc1bb99ea4ff9b6afd8ab51996fcae9c4c2c6a5172dcf`, `receipt-caption.ts` `cce07498299e82742fc889e9ba9ed0e4d9e6a16ef1fd4c8ed3ee0e48dc662505`, `receipt-service.ts` `dcc002816200314de72ba361a2712223edeef5d6461c4754b022d72901394ff8`, `registration-receipts.ts` `3fe8d5efca427b531fa3ec346db9834a4444965618a681397c0a58418c53fd0a`, and the focused test `c86c56aa41b26a77fd10d80e319b0ebd3c3e8ee304090ca78d5a500ffda6fb11`.
- Completed implementation-owned task **2.2a** and immediately changed only its persisted checkbox to `- [x]`; task **2.2b** remains unchecked.
- Added fail-closed validation of a complete stored document snapshot before a claim and again before messenger dispatch: HTTPS immutable PDF URL, `.pdf` filename, exact MIME, document kind, and exact receipt-only caption with the required marker and same fallback URL.
- Exported the stable SHA-256 logical-message-key derivation and replaced predictable attempt derivation with a distinct opaque UUID key. Retries retain and dispatch the original persisted attachment snapshot rather than current terms.
- Actual work-unit accounting is hash-auditable against the captured inherited baseline above; `git diff --numstat` cannot provide a false unit delta because all these inherited surfaces are untracked. No generated or extraneous repository artifact was created.

### Files changed

- `src/lib/server/notifications/contracts.ts`
- `src/lib/server/notifications/receipt-service.ts`
- `src/lib/server/notifications/registration-receipts.ts`
- `tests/unit/receipt-caption-and-service.test.ts`
- `openspec/changes/add-admin-whatsapp-confirmation/tasks.md` (2.2a checkbox only)
- `openspec/changes/add-admin-whatsapp-confirmation/apply-progress.md`

### TDD Cycle Evidence

| Task | Test file | RED | GREEN | TRIANGULATE | REFACTOR |
| --- | --- | --- | --- | --- | --- |
| 2.2a | `tests/unit/receipt-caption-and-service.test.ts` | Focused command failed as expected: invalid persisted HTTP PDF was sent and `deriveLogicalMessageKey` was absent (2 failed, 39 passed). | After validation and key changes, the focused suite passed 41/41. | Added same-registration/different-version key non-collision assertion; focused suite passed 41/41. | Extracted immutable-PDF URL validation; focused suite passed 41/41, then `pnpm check` passed. |

### Verification

- `pnpm test -- tests/unit/receipt-caption-and-service.test.ts` — passed: 7 files, 41 tests.
- `pnpm check` — passed: 35 files, 0 errors, 0 warnings, 0 hints.
- `pnpm test` — passed: 7 files, 41 tests.
- Runtime harness: local `file::memory:` libSQL with the real migration runner and injected fake `ReceiptMessenger`; eight malformed/corrupt stored snapshots each produced zero messenger sends, with no network request, provider credential, or live service.

### Deviations and remaining work

- No design deviation. The database check constraint blocks direct bad-MIME writes, so the regression deliberately uses local libSQL `PRAGMA ignore_check_constraints` to prove service fail-closed behavior for corrupted persisted data.
- The stale-finalizer/atomic lease ownership bug is intentionally unresolved and assigned exclusively to **2.2b**; this snapshot-only unit does not claim the whole receipt feature or prior 2.2 findings complete.
- Remaining implementation tasks include 2.2b, 2.3, 2.4, 3.1, 3.2, 3.3, and 3.4; parent-owned R2–R6 remain byte-for-byte unchanged.
- Exact deferred 2.2b row: `- [ ] **[2.2b — atomic lease-owned finalization, concurrency, and redaction correction; depends on: 2.2a; target: 300–390 changed lines]** RED with \`pnpm test -- tests/integration/receipt-lease-finalization.test.ts\`: using the real migrations and disposable local in-memory libSQL, prove one atomic claim increments \`attempt_count\` and inserts exactly one \`in_progress\` attempt, a concurrent claimant loses and sends nothing, and only the matching lease token can finalize its attempt. GREEN only the receipt lease/attempt repository methods, receipt finalization service, safe error-code mapping, and this focused test: finalize a normal \`sent\` transition only for \`acceptedArtifact: 'document'\`, persist only allowlisted provider ID/evidence, map URL-only acceptance to \`failed\`, and map stale/finalization ambiguity to \`uncertain\`. TRIANGULATE with the same command: race two finalizers, expire a lease after simulated send, and assert persisted diagnostics/log records redact caption, media URL, destination, credentials, headers, raw body, and raw error text. REFACTOR transactional claim/finalize helpers without widening dispatch behavior, then rerun \`pnpm test -- tests/integration/receipt-lease-finalization.test.ts && pnpm check\`. Runtime harness: execute the same local-libSQL race with injected messenger results and confirm one send attempt, one lease-owned terminal outcome, and no external/provider request; do not use Turso or Evolution credentials. Rollback boundary: atomic lease/finalization and safe-diagnostic modules plus their focused local-libSQL tests; disable dispatch to contain future calls while retained pending/uncertain records remain reconcilable. <!-- sdd-owner: implementation -->`

### Workload / PR boundary

- Stacked-to-main PR boundary: `2.2a-document-snapshot-validation` only; rollback removes the snapshot validator, logical-key export/opaque attempt-key change, focused regression coverage, and this checkbox/progress entry while pending rows remain reconcilable.
- No commit, push, deployment, live provider, credential, review, receipt, validation gate, or settlement was created; parent lifecycle owns settlement and subsequent delivery actions.

## 2026-04-19 — Task 2.2b atomic lease-owned finalization, concurrency, and redaction correction

### Structured status consumed

```yaml
schemaName: spec-driven
changeName: add-admin-whatsapp-confirmation
artifactStore: openspec
planningHome:
  root: /home/charlydev/Projects/DEV/batalla-de-barberos/openspec
  changesDir: /home/charlydev/Projects/DEV/batalla-de-barberos/openspec/changes
changeRoot: /home/charlydev/Projects/DEV/batalla-de-barberos/openspec/changes/add-admin-whatsapp-confirmation
artifacts:
  proposal: done
  specs: done
  design: done
  tasks: done
  applyProgress: partial
  verifyReport: missing
  syncReport: missing
taskProgress:
  total: 13
  complete: 7
  remaining: 6
deferredParentActions:
  total: 6
  complete: 1
  remaining: 5
taskArtifactErrors: []
applyState: ready
dependencies:
  apply: ready
  verify: ready
  sync: blocked
  archive: blocked
actionContext:
  mode: repo-local
  workspaceRoot: /home/charlydev/Projects/DEV/batalla-de-barberos
  allowedEditRoots:
    - /home/charlydev/Projects/DEV/batalla-de-barberos/src/lib/server/notifications
    - /home/charlydev/Projects/DEV/batalla-de-barberos/tests/integration/receipt-lease-finalization.test.ts
    - /home/charlydev/Projects/DEV/batalla-de-barberos/openspec/changes/add-admin-whatsapp-confirmation/tasks.md
    - /home/charlydev/Projects/DEV/batalla-de-barberos/openspec/changes/add-admin-whatsapp-confirmation/apply-progress.md
  warnings: ["The task is a parent-acquired work unit; this actor did not settle it."]
nextRecommended: apply
isNonAuthoritative: false
```

### Baseline and completed work

- The parent supplied a fresh authoritative native `sdd-status@2` with `applyState: ready`, `nextRecommended: apply`, `auto-chain`, and `stacked-to-main` for the `2.2b-atomic-receipt-finalization` work unit. Strict TDD was active.
- The inherited notification surfaces remain untracked in Git, so repository diff statistics cannot isolate this work unit from settled 2.2a work. The final 2.2b target hashes are `contracts.ts` `dd761472de181e81361b63d02e1c23d3832c9260bb84af5486052e9ecf72c19f`, `receipt-service.ts` `48e5002a001f83ffd6e139bbf67b1bec43f520f85dc9b2a5da5e5ea0018ebd4f`, `registration-receipts.ts` `c7f3bb6eddcd3e3dc2f910b288d8e26ed2e21511a662d33fe911f563fcc13247`, and the new focused test `c0fabbb0cdee988e0705e6e6ab81eda8540712390a026f02b31ce0dcfee106fc`.
- Completed implementation-owned task **2.2b** and immediately changed only its persisted checkbox to `- [x]`.
- The claim update now compares the observed `attempt_count`, increments it, grants a unique lease, and creates exactly one `in_progress` attempt in one libSQL write batch.
- Finalization uses one write batch whose notification transition requires the matching live token, permitted status, unexpired lease, and matching `in_progress` attempt; its attempt transition then requires the just-finalized notification state, cleared lease, and matching timestamp. A stale or expired owner changes neither row and returns `false`, so it can never change an old attempt after a replacement claim or falsely mark a send as `sent`.
- Accepted document results alone become `sent`; URL-only results are `failed` with `PROVIDER_ATTACHMENT_NOT_ACCEPTED`; unknown runtime error codes are mapped to static allowlisted codes. Provider IDs are retained only when matching the bounded safe identifier format, and diagnostic messages remain static Spanish text.
- An expiry after simulated send intentionally remains a pending expired lease/in-progress attempt rather than a false terminal state; later reconciliation owns conversion of that recoverable ambiguity to `uncertain`.

### Files changed

- `src/lib/server/notifications/contracts.ts`
- `src/lib/server/notifications/receipt-service.ts`
- `src/lib/server/notifications/registration-receipts.ts`
- `tests/integration/receipt-lease-finalization.test.ts`
- `openspec/changes/add-admin-whatsapp-confirmation/tasks.md` (2.2b checkbox only)
- `openspec/changes/add-admin-whatsapp-confirmation/apply-progress.md`

The final owned source/test files total 311 physical lines, but that is not a work-unit diff: three notification files include inherited settled 2.2a content. The new 2.2b integration test is 140 lines; no code-golf, commit, provider call, live credential, Turso target, deployment, review, receipt creation, or settlement occurred.

### TDD Cycle Evidence

| Task | Test file | RED | GREEN | TRIANGULATE | REFACTOR |
| --- | --- | --- | --- | --- | --- |
| 2.2b | `tests/integration/receipt-lease-finalization.test.ts` | Focused command failed as expected: stale finalization threw after updating the stale attempt, and an expired lease was incorrectly finalized `sent`. | Conditional atomic claim/finalization and safe output handling made the focused suite pass 4/4. | Added same-lease dual-finalizer race plus URL-only, raw provider-ID, raw error/body/credential/PII diagnostic redaction cases; focused suite passed 5/5. | Centralized bounded provider-ID redaction in contracts and reran focused suite (5/5) and `pnpm check` (0 diagnostics). |

### Verification and runtime harness

- `pnpm test -- tests/integration/receipt-lease-finalization.test.ts` — final pass: 8 files, 46 tests.
- `pnpm check` — pass: 36 files, 0 errors, 0 warnings, 0 hints.
- `pnpm test` — pass: 8 files, 46 tests.
- Runtime harness: the focused integration suite uses the real migration runner, disposable `file::memory:` libSQL, and an injected fake messenger. It demonstrated one send while a concurrent claimant loses, a single terminal result when finalizers race, no mutation by stale/expired owners, and persisted diagnostic redaction; no network request, provider credential, Turso database, or Evolution service was used.

### Deviations from design

None. The expired-owner branch deliberately preserves the design's reconciliation boundary: it cannot safely self-finalize after lease ownership has expired, so it remains a visible stale pending attempt instead of claiming `sent` or letting the stale worker mutate data.

### Remaining implementation tasks (exact persisted unchecked rows)

- [ ] **[2.3 — validated Evolution document adapter; depends on: 2.2b]** RED in `tests/unit/evolution-document-adapter.test.ts`: cover HTTPS-only base/path validation, profile fingerprint mismatch blocking fetch, safe non-colliding dotted field paths, exact-once destination/media URL/filename/MIME/caption construction, document-kind support, raw/bearer auth formatting without logs, timeout/response-size/redirect handling, and no text endpoint, hidden retry, or fallback send. GREEN/TRIANGULATE/REFACTOR `src/lib/server/config.ts` and `src/lib/server/notifications/evolution-document-http-messenger.ts` with a typed profile parser and bounded `fetch`; provider-specific types must not leave the adapter. Verify `pnpm test -- tests/unit/evolution-document-adapter.test.ts && pnpm check`; runtime harness: run a local fixture HTTP server to capture one JSON request and verify all document fields once, then confirm the profile-disabled path makes zero requests. Rollback boundary: config/profile/adapter modules and environment documentation; set dispatch false before removing runtime use. <!-- sdd-owner: implementation -->
- [ ] **[2.4 — dispatch outcome finalization; depends on: 2.2b, 2.3]** RED in `tests/integration/receipt-dispatch-outcomes.test.ts`: prove disabled/unvalidated profile leaves zero-attempt pending with no fetch; known validated document acceptance alone becomes `sent` with allowlisted ID/evidence; media rejection/fetch failure and URL-only acceptance become `failed`; malformed 2xx, timeout, network/5xx, oversized responses, stale leases, and result-finalization ambiguity become `uncertain`; registration response remains successful throughout. GREEN/TRIANGULATE/REFACTOR receipt claim/finalize code and `src/pages/api/signups.ts` wiring. Verify `pnpm test -- tests/integration/receipt-dispatch-outcomes.test.ts && pnpm check && pnpm build`; runtime harness: local fixture server returns accepted-document, URL-only, and timeout fixtures and records the expected persisted states. Rollback boundary: automatic dispatch invocation only; `WHATSAPP_DISPATCH_ENABLED=false` stops calls while preserving signup and pending/reconcilable data. <!-- sdd-owner: implementation -->
- [ ] **[3.1 — secure admin session boundary; depends on: 1.1b]** RED in `tests/unit/admin-auth.test.ts` and `tests/integration/admin-route-security.test.ts`: cover scrypt password vectors, signed opaque cookie tamper/expiry/revocation failure, production/local cookie attributes, pre-auth and authenticated CSRF rejection, same-origin checks, per-address/global Turso throttle, logout invalidation, and unauthenticated HTML redirect/API `401` with no PII. GREEN/TRIANGULATE/REFACTOR `src/lib/server/admin/` password/session/CSRF/throttle helpers, `src/middleware.ts`, Astro locals types, `src/pages/admin/login.astro`, and `src/pages/api/admin/login.ts` and `src/pages/api/admin/logout.ts`; log only allowlisted IDs/outcomes. Verify `pnpm test -- tests/unit/admin-auth.test.ts tests/integration/admin-route-security.test.ts && pnpm check`; runtime harness: use local test configuration to login, access a protected route, logout, and verify the old cookie is denied. Rollback boundary: admin routes/middleware/session helpers; revoke sessions and unset admin routes without modifying registration storage. <!-- sdd-owner: implementation -->
- [ ] **[3.2 — submitted-registration-only read model and lifecycle writes; depends on: 3.1, 2.4]** RED in `tests/integration/admin-registration-management.test.ts`: seed registrations plus a non-database expected-person fixture and prove list/count/filter/detail are rooted exclusively in `barber_signups`; cover keyset pagination, historical normalized-phone display, separate Spanish state labels, optimistic state-version conflict, independent review/participant transitions, no-op rejection, and atomic allowlisted audit events. GREEN/TRIANGULATE/REFACTOR admin repositories/services and `src/pages/admin/index.astro`, `src/pages/admin/inscripciones/[id].astro`, `src/pages/api/admin/registrations/[id]/review-state.ts`, and `participant-response.ts`; do not add roster/import/comparison/export behavior. Verify `pnpm test -- tests/integration/admin-registration-management.test.ts && pnpm check`; runtime harness: seed two registrations, render `/admin` (read-only), and confirm only those two appear with three independent status areas. Rollback boundary: admin read/detail/lifecycle UI and routes; retain additive states/audit history. <!-- sdd-owner: implementation -->
- [ ] **[3.3 — controlled retry and reconciliation; depends on: 3.2]** RED in `tests/integration/admin-receipt-recovery.test.ts`: prove only failed/uncertain notifications retry on the original logical record, uncertain retries require `ackUncertain=1`, sent notifications have no normal retry action, stale in-progress leases first become uncertain, and reconcile acts only on an existing persisted registration with missing/zero-attempt/stale-pending receipt state. GREEN/TRIANGULATE/REFACTOR retry/reconcile services and `src/pages/api/admin/registrations/[id]/receipt/retry.ts`, `reconcile.ts`, plus detail forms; enforce CSRF, lease concurrency, PRG redirects, sanitized diagnostics, and no new registration. Verify `pnpm test -- tests/integration/admin-receipt-recovery.test.ts && pnpm check && pnpm build`; runtime harness: use local fixture provider to fail then retry one registration and confirm attempt count increments while registration count remains one. Rollback boundary: retry/reconcile endpoints/forms only; disable dispatch to contain future attempts while retaining historical attempts. <!-- sdd-owner: implementation -->
- [ ] **[3.4 — configuration, hardening, and operator documentation; depends on: 2.3, 3.1, 3.3]** RED in `tests/unit/server-config-and-observability.test.ts`: reject missing/unsafe server configuration and assert logs/persisted diagnostics never include credentials, headers, cookies, IPs, phone, names, caption, raw provider body, or secrets. GREEN/TRIANGULATE/REFACTOR `environment.example`, `README.md`, `astro.config.mjs`, `vercel.json`, password-hash utility under `scripts/`, and server config/logging modules; document `WHATSAPP_DISPATCH_ENABLED=false` containment, independent credential rotation, profile-fingerprint validation, PDF immutability, and the migration command warning. Verify `pnpm test -- tests/unit/server-config-and-observability.test.ts && pnpm check && pnpm build`; runtime harness: start with dispatch disabled and confirm startup/config parsing exposes no secret values. Rollback boundary: configuration/docs/header hardening and utility script; preserve safe disabled-dispatch defaults. <!-- sdd-owner: implementation -->

### Deferred lifecycle actions

Parent-owned rows remain byte-for-byte unchanged: R2 legal/content approval, R3 Turso migration, R4 Evolution document capability validation, R5 controlled deployment, and R6 bounded post-apply review.

### Workload / PR boundary

- Delivery path: `auto-chain`, `stacked-to-main`.
- Work-unit/PR boundary: **2.2b-atomic-receipt-finalization** only. Rollback removes the conditional claim/finalization and diagnostic hardening in the listed notification files plus its local-libSQL test; pending and expired records remain reconcilable.
- The parent owns settlement and all lifecycle/review actions. This actor did not create or approve a receipt, run review/validation actors, commit, push, or deploy.

## 2026-04-19 — Task 2.3 pre-implementation budget assessment

### Structured status consumed

```yaml
schemaName: spec-driven
changeName: add-admin-whatsapp-confirmation
artifactStore: openspec
applyState: ready
nextRecommended: apply
actionContext:
  mode: repo-local
  workspaceRoot: /home/charlydev/Projects/DEV/batalla-de-barberos
  allowedEditRoots:
    - src/lib/server/config.ts
    - src/lib/server/notifications/evolution-document-http-messenger.ts
    - tests/unit/evolution-document-adapter.test.ts
    - environment.example
    - openspec/changes/add-admin-whatsapp-confirmation/tasks.md
    - openspec/changes/add-admin-whatsapp-confirmation/apply-progress.md
deliveryPath: auto-chain / stacked-to-main
strictTdd: true
```

### Result

Blocked before RED by the explicit 400-line full-diff budget. An honest, non-code-golf estimate for the required typed profile parser (125–155 lines), bounded HTTP adapter (130–160), focused RED/GREEN/TRIANGULATE test fixture coverage (145–180), environment documentation (25–35), task checkbox (2), and this cumulative evidence (45–60) is **472–592 changed lines**. The required HTTPS validation, collision-safe path parser, canonical fingerprint, injected-fetch seam, response-byte reader, and timeout/redirect/error mappings are cohesive safety behavior; removing tests, documentation, or evidence would not be an honest fit.

### Proposed cohesive split

1. **2.3a — Evolution wire-profile parser and safety tests:** `src/lib/server/config.ts`, `tests/unit/evolution-document-adapter.test.ts`, and `environment.example`; validate HTTPS/path/auth/path-collision/fingerprint/disabled-profile behavior without any fetch implementation.
2. **2.3b — bounded document HTTP adapter:** `src/lib/server/notifications/evolution-document-http-messenger.ts` and the same focused test file; add injected-fetch JSON construction, auth, timeout, redirect/response-byte handling, and provider result mapping against the parsed profile.

The current task checkbox remains visibly unchecked and was not changed. The parent must authorize this subdivision before a strict-TDD RED test or production code can be added.

### TDD Cycle Evidence

| Task | Test file | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2.3 | `tests/unit/evolution-document-adapter.test.ts` | Unit | N/A — new files | Not started: budget gate | Not started | Not started | Not started |

### Verification and scope

- No tests ran because strict TDD and the workload gate stop before RED.
- No source, test, environment, or task-checkbox change was made; this cumulative progress artifact is the only edit.
- CodeGraph MCP was unavailable; the installed read-only CLI was used, but its index is stale for the inherited untracked notification files, so direct reads were used as the documented fallback.
- No local fixture server, network/provider request, credential access, commit, push, deployment, review, receipt, or settlement occurred.

### Remaining assigned task (exact persisted unchecked row)

- [ ] **[2.3 — validated Evolution document adapter; depends on: 2.2b]** RED in `tests/unit/evolution-document-adapter.test.ts`: cover HTTPS-only base/path validation, profile fingerprint mismatch blocking fetch, safe non-colliding dotted field paths, exact-once destination/media URL/filename/MIME/caption construction, document-kind support, raw/bearer auth formatting without logs, timeout/response-size/redirect handling, and no text endpoint, hidden retry, or fallback send. GREEN/TRIANGULATE/REFACTOR `src/lib/server/config.ts` and `src/lib/server/notifications/evolution-document-http-messenger.ts` with a typed profile parser and bounded `fetch`; provider-specific types must not leave the adapter. Verify `pnpm test -- tests/unit/evolution-document-adapter.test.ts && pnpm check`; runtime harness: run a local fixture HTTP server to capture one JSON request and verify all document fields once, then confirm the profile-disabled path makes zero requests. Rollback boundary: config/profile/adapter modules and environment documentation; set dispatch false before removing runtime use. <!-- sdd-owner: implementation -->

### Deferred lifecycle actions and PR boundary

Parent-owned rows R2–R6 remain byte-for-byte unchanged. The proposed stacked-to-main boundary is **2.3a-wire-profile-parser** followed by **2.3b-bounded-document-adapter**; both require parent authorization, and parent owns settlement.

## 2026-04-19 — Task 2.3a wire-profile parser

### Status and completion

- Consumed parent-native status: `openspec`, authoritative `applyState: ready`, `nextRecommended: apply`, task progress `8/20`; `repo-local` root and the supplied five edit surfaces were allowed. The parent owns the active attempt and settlement.
- Completed implementation-owned **2.3a** and immediately marked its persisted `tasks.md` checkbox `- [x]`; no parent-owned row changed.
- Added server-only typed configuration and a pure Evolution document profile parser. It permits only an HTTPS origin without credentials/query/hash, a relative single-`{instance}` document path, safe non-colliding dotted request paths, exact required mappings, validated modes/status/value rules, optional document-kind/message-ID/idempotency fields, and raw/bearer authorization formatting.
- Non-secret canonical fingerprints gate readiness. Disabled, invalid, absent, or mismatched fingerprints expose no profile/endpoint capability; this task performs no provider call or request construction.

### Files and verification

- `src/lib/server/config.ts`; `src/lib/server/notifications/evolution-document-wire-profile.ts`; `tests/unit/evolution-document-profile.test.ts`; `tasks.md` (2.3a checkbox); this progress record.
- RED: `pnpm test -- tests/unit/evolution-document-profile.test.ts` failed with the expected missing `src/lib/server/config` import. GREEN: 47 tests passed. TRIANGULATE: added exact-status, canonicalization, JSON-mode, unsafe URL/path, collision/prototype/numeric, optional-field, and raw/bearer cases; 51 tests passed. REFACTOR: extracted safe path-collision detection; focused command, `pnpm check`, and `pnpm test` passed (9 files, 51 tests; check: 0 diagnostics).
- Runtime harness: N/A — pure parser exercised only with read-only HTTPS URL fixture strings; no fetch, provider credential, adapter, network request, live service, migration, commit, or deployment occurred.

### TDD Cycle Evidence

| Task | Test file | Layer | Safety net | RED | GREEN | TRIANGULATE | REFACTOR |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2.3a | `tests/unit/evolution-document-profile.test.ts` | Unit | N/A (new files) | Expected missing-module failure | 47/47 passed | 51/51 passed with boundary cases | Path-collision helper; 51/51, check passed |

### Remaining / delivery boundary

- Remaining implementation keys: `2.3b`, `2.4`, `3.1`, `3.2`, `3.3`, and `3.4`; the persisted task artifact remains authoritative. Immediate exact unchecked row: `- [ ] **[2.3b — bounded document adapter; depends on: 2.3a; target: 300–390 changed lines]**`.
- PR boundary: `2.3a-wire-profile-parser`, stacked-to-main. Rollback removes only the two parser/config files and its focused test; `WHATSAPP_DISPATCH_ENABLED=false` remains containment. No design deviation.

## 2026-04-19 — Gate 2.3a independent correction

### Status consumed / produced

- Authoritative `openspec` artifacts were present; reconstructed status is `applyState: ready`, `nextRecommended: apply`, `repo-local`, with the five parent-supplied edit surfaces only. Native status CLI was unavailable (`gentle-ai sdd` is not installed); parent supplied correction acquire/proceed and retains settlement.
- The correction baseline bytes were saved separately at `/tmp/batalla-de-barberos-2.3a-correction-baseline`; `/tmp/batalla-de-barberos-2.3a-baseline` was retained unchanged.

### Corrective implementation and evidence

- The fingerprint now excludes `EVOLUTION_API_KEY`, retaining only authentication header/scheme shape; key rotation cannot invalidate a recorded non-secret profile fingerprint.
- `json-value` requires a nonempty result path; raw `?`/`#` base delimiters and reserved/colliding auth or idempotency headers are invalid; profile timeout is typed, defaults to 7000, and permits only integer 1000–15000 values for adapter consumption.
- RED: the focused command failed as expected on fingerprint rotation. GREEN: 52/52 tests passed. TRIANGULATE: distinct safe headers plus timeout boundaries passed (53/53). REFACTOR: extracted reserved-header validation; 53/53 passed again.

### TDD Cycle Evidence

| Task | Test file | Layer | Safety net | RED | GREEN | TRIANGULATE | REFACTOR |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2.3a correction | `tests/unit/evolution-document-profile.test.ts` | Unit | 51/51 passed | rotation fingerprint failed | 52/52 passed | 53/53 passed | 53/53 passed; `pnpm check` passed |

### Files, verification, and remaining work

- Changed: `src/lib/server/notifications/evolution-document-wire-profile.ts`, `tests/unit/evolution-document-profile.test.ts`, `tasks.md`, and this progress record; no adapter, fetch, live call, credential, commit, or 2.3b edit occurred.
- Verified: `pnpm test -- tests/unit/evolution-document-profile.test.ts` (53/53) and `pnpm check` (0 errors, 0 warnings, 0 hints). Runtime harness: N/A — pure parser with read-only HTTPS fixture strings only.
- Independent gate acceptance is still required, so 2.3a is visibly unchecked; 2.3b is unchanged.
- [ ] **[2.3a — wire-profile parser; depends on: 2.2b; target: 280–380 changed lines]** RED in `tests/unit/evolution-document-profile.test.ts`: add failing fixtures for complete typed configuration, HTTPS-only base URL with no credentials/query/hash, relative document/media path containing exactly one `{instance}`, final URL constrained to the configured HTTPS origin, exact profile fingerprint canonicalization/mismatch gating, safe distinct dotted paths, optional document-kind pair, `e164`/`digits` destination formatting, exact accepted-status allowlists, `status-only`/`json-value` success modes with their required result/accepted/media-rejected/URL-only value configuration, optional message-ID/idempotency paths, and raw/bearer authorization formatting without secret logging. Label all URL fixtures and runtime URLs as **read-only HTTP request targets, never filesystem paths**, so native URL parsing cannot infer filesystem roots. GREEN `src/lib/server/config.ts` and `src/lib/server/notifications/evolution-document-wire-profile.ts`: parse server-only environment into a validated typed profile; reject missing/duplicate required paths, ancestor/descendant collisions, arrays, numeric segments, `__proto__`, `prototype`, and `constructor`; require exactly one mapping each for destination, media URL, filename, MIME type, and caption; and block dispatch on absent/mismatched validated fingerprint before any adapter fetch. TRIANGULATE status-only versus json-value requirements, the optional message-ID/idempotency fields, and invalid raw/bearer/header/path/status/value combinations; REFACTOR parser, canonicalization, and safe-path helpers without constructing a provider request or performing network I/O. Verify RED, GREEN, TRIANGULATE, and REFACTOR with `pnpm test -- tests/unit/evolution-document-profile.test.ts && pnpm check`; runtime harness: `N/A — this parser performs no fetch; run it with read-only HTTPS URL fixture strings and confirm a mismatched/absent fingerprint returns a blocked profile with zero request capability.` Rollback boundary: typed config/profile parser and its focused tests only; `WHATSAPP_DISPATCH_ENABLED=false` remains containment and no adapter/runtime invocation is introduced. <!-- sdd-owner: implementation -->
- Work-unit/PR boundary: `2.3a-wire-profile-parser` correction only; correction-baseline source/test/task delta is 58 lines before this concise evidence, within the parent-reported 99-line remainder. Rollback removes only these parser/test corrections; dispatch remains disabled containment.
## 2026-04-19 — Task 2.3b bounded document adapter
### Structured status consumed
- Authoritative `openspec` status supplied by parent: `applyState: ready`, `nextRecommended: apply`, fresh apply `9/20`; native status command is unavailable locally.
- `actionContext.mode: repo-local`; edits remained within the parent-authorized 2.3b allowlist; `auto-chain` / `stacked-to-main` is the resolved delivery path.
### Completed and persisted checkbox
- Completed implementation-owned **2.3b** and immediately changed only its task row to visibly `- [x]`.
- Added the validated-profile-only adapter: one fresh document JSON request, raw/bearer auth, optional idempotency/kind, bounded body read, and safe accepted/rejected/uncertain mappings without environment reparsing, retry, or text fallback.
### Files changed
- `src/lib/server/notifications/evolution-document-http-messenger.ts`, `tests/unit/evolution-document-adapter.test.ts`, `tests/fixtures/evolution-document-server.ts`, `tasks.md`, and this progress record.
### Tests
- RED: `pnpm test -- tests/unit/evolution-document-adapter.test.ts` failed as expected because the adapter module was absent.
- GREEN: focused command passed after minimal request construction; `pnpm check` passed.
- TRIANGULATE: local fixture covered flat/nested fields, accepted/media-rejected/URL-only/malformed JSON, blocked/network/timeout/oversize/redirect; 62 tests passed.
- REFACTOR/final: focused command and `pnpm check` passed; `pnpm test` passed 10 files / 62 tests.
| Task | Test file | Layer | Safety net | RED | GREEN | TRIANGULATE | REFACTOR |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2.3b | `tests/unit/evolution-document-adapter.test.ts` | Unit/local HTTP fixture | N/A (new files) | missing-module failure | focused pass | 9 adapter cases | focused/check/full pass |
### Deviations
- None; fixture URLs are local read-only HTTP request targets reached only through an injected transport that preserves the production HTTPS profile validation.
### Remaining implementation tasks (exact persisted unchecked rows)
- [ ] **[2.4 — dispatch outcome finalization; depends on: 2.2b, 2.3b]** RED in `tests/integration/receipt-dispatch-outcomes.test.ts`: prove disabled/unvalidated profile leaves zero-attempt pending with no fetch; known validated document acceptance alone becomes `sent` with allowlisted ID/evidence; media rejection/fetch failure and URL-only acceptance become `failed`; malformed 2xx, timeout, network/5xx, oversized responses, stale leases, and result-finalization ambiguity become `uncertain`; registration response remains successful throughout. GREEN/TRIANGULATE/REFACTOR receipt claim/finalize code and `src/pages/api/signups.ts` wiring. Verify `pnpm test -- tests/integration/receipt-dispatch-outcomes.test.ts && pnpm check && pnpm build`; runtime harness: local fixture server returns accepted-document, URL-only, and timeout fixtures and records the expected persisted states. Rollback boundary: automatic dispatch invocation only; `WHATSAPP_DISPATCH_ENABLED=false` stops calls while preserving signup and pending/reconcilable data. <!-- sdd-owner: implementation -->
- [ ] **[3.1 — secure admin session boundary; depends on: 1.1b]** RED in `tests/unit/admin-auth.test.ts` and `tests/integration/admin-route-security.test.ts`: cover scrypt password vectors, signed opaque cookie tamper/expiry/revocation failure, production/local cookie attributes, pre-auth and authenticated CSRF rejection, same-origin checks, per-address/global Turso throttle, logout invalidation, and unauthenticated HTML redirect/API `401` with no PII. GREEN/TRIANGULATE/REFACTOR `src/lib/server/admin/` password/session/CSRF/throttle helpers, `src/middleware.ts`, Astro locals types, `src/pages/admin/login.astro`, and `src/pages/api/admin/login.ts` and `src/pages/api/admin/logout.ts`; log only allowlisted IDs/outcomes. Verify `pnpm test -- tests/unit/admin-auth.test.ts tests/integration/admin-route-security.test.ts && pnpm check`; runtime harness: use local test configuration to login, access a protected route, logout, and verify the old cookie is denied. Rollback boundary: admin routes/middleware/session helpers; revoke sessions and unset admin routes without modifying registration storage. <!-- sdd-owner: implementation -->
- [ ] **[3.2 — submitted-registration-only read model and lifecycle writes; depends on: 3.1, 2.4]** RED in `tests/integration/admin-registration-management.test.ts`: seed registrations plus a non-database expected-person fixture and prove list/count/filter/detail are rooted exclusively in `barber_signups`; cover keyset pagination, historical normalized-phone display, separate Spanish state labels, optimistic state-version conflict, independent review/participant transitions, no-op rejection, and atomic allowlisted audit events. GREEN/TRIANGULATE/REFACTOR admin repositories/services and `src/pages/admin/index.astro`, `src/pages/admin/inscripciones/[id].astro`, `src/pages/api/admin/registrations/[id]/review-state.ts`, and `participant-response.ts`; do not add roster/import/comparison/export behavior. Verify `pnpm test -- tests/integration/admin-registration-management.test.ts && pnpm check`; runtime harness: seed two registrations, render `/admin` (read-only), and confirm only those two appear with three independent status areas. Rollback boundary: admin read/detail/lifecycle UI and routes; retain additive states/audit history. <!-- sdd-owner: implementation -->
- [ ] **[3.3 — controlled retry and reconciliation; depends on: 3.2]** RED in `tests/integration/admin-receipt-recovery.test.ts`: prove only failed/uncertain notifications retry on the original logical record, uncertain retries require `ackUncertain=1`, sent notifications have no normal retry action, stale in-progress leases first become uncertain, and reconcile acts only on an existing persisted registration with missing/zero-attempt/stale-pending receipt state. GREEN/TRIANGULATE/REFACTOR retry/reconcile services and `src/pages/api/admin/registrations/[id]/receipt/retry.ts`, `reconcile.ts`, plus detail forms; enforce CSRF, lease concurrency, PRG redirects, sanitized diagnostics, and no new registration. Verify `pnpm test -- tests/integration/admin-receipt-recovery.test.ts && pnpm check && pnpm build`; runtime harness: use local fixture provider to fail then retry one registration and confirm attempt count increments while registration count remains one. Rollback boundary: retry/reconcile endpoints/forms only; disable dispatch to contain future attempts while retaining historical attempts. <!-- sdd-owner: implementation -->
- [ ] **[3.4 — configuration, hardening, and operator documentation; depends on: 2.3b, 3.1, 3.3]** RED in `tests/unit/server-config-and-observability.test.ts`: reject missing/unsafe server configuration and assert logs/persisted diagnostics never include credentials, headers, cookies, IPs, phone, names, caption, raw provider body, or secrets. GREEN/TRIANGULATE/REFACTOR `environment.example`, `README.md`, `astro.config.mjs`, `vercel.json`, password-hash utility under `scripts/`, and server config/logging modules; document `WHATSAPP_DISPATCH_ENABLED=false` containment, independent credential rotation, profile-fingerprint validation, PDF immutability, and the migration command warning. Verify `pnpm test -- tests/unit/server-config-and-observability.test.ts && pnpm check && pnpm build`; runtime harness: start with dispatch disabled and confirm startup/config parsing exposes no secret values. Rollback boundary: configuration/docs/header hardening and utility script; preserve safe disabled-dispatch defaults. <!-- sdd-owner: implementation -->
- Parent-owned R2–R6 remain byte-for-byte unchanged and deferred.
### Workload / PR boundary
- `2.3b-bounded-document-adapter` is the stacked-to-main slice; its source/test/fixture delta is 370 lines, with the 2-line checkbox and this 28-line evidence reaching the 400-line budget exactly; rollback removes only this adapter, fixture, and test while `WHATSAPP_DISPATCH_ENABLED=false` contains future calls.

## 2026-09-04 — Work unit 2.3b HTTP outcomes and fixture correction

### Structured status consumed

- Native authoritative OpenSpec status: `applyState: ready`, `nextRecommended: apply`, artifacts proposal/specs/design/tasks present, and `actionContext.mode: repo-local` under `/home/charlydev/Projects/DEV/batalla-de-barberos`.
- Native attempt is already running for `2.3b-http-outcomes-and-fixture-correction`, attempt `1/2`, cap `400`; parent resolved `auto-chain` / `stacked-to-main` and restricted edits to the five listed surfaces.

### Corrective work and persisted task state

- HTTP `408` and `409` now return `uncertain / PROVIDER_NETWORK`, never accepted, while other 4xx responses may use configured JSON evidence only for media rejection or URL-only rejection before static generic mapping.
- The local fixture tracks response timers and pending responses, cancels/destroys both on idempotent close, and exposes a deterministic zero-pending-work regression assertion.
- Per parent instruction, restored **2.3b** to visible `- [ ]` pending the independent gate; **2.3a** remains `- [x]`. No parent-owned task changed.

### TDD Cycle Evidence

| Task | Test file | Layer | Safety net | RED | GREEN | TRIANGULATE | REFACTOR |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2.3b HTTP-outcomes correction | `tests/unit/evolution-document-adapter.test.ts` | Unit/local HTTP fixture | 62/62 passed | 408/409, configured 4xx evidence, and close cleanup failed (5 failures) | 68/68 passed | 69/69 passed with a 400 accepted-marker rejection case | Typed JSON rejection helper; 69/69 passed |

### Verification and accounting

- `pnpm test -- tests/unit/evolution-document-adapter.test.ts`: passed, 10 files / 69 tests.
- `pnpm check`: passed, 0 errors, 0 warnings, 0 hints.
- `pnpm test`: passed, 10 files / 69 tests. Runtime harness: the local fixture made no external request and closes with `{ timers: 0, responses: 0 }`.
- Correction baseline: `/tmp/batalla-de-barberos-2.3b-correction-baseline.20260904T225918.tar` SHA-256 `49643223b7810dd6f20f664042c56b86bd14532828c514f313d7905be5a902b0`; source/test/fixture delta is `+88/-6` (94 changed lines). The requested retained original `/tmp/batalla-de-barberos-2.3b-baseline.Ruf9AY` was absent before edits.

### Files, deviation, and remaining work

- Changed: `src/lib/server/notifications/evolution-document-http-messenger.ts`, `tests/unit/evolution-document-adapter.test.ts`, `tests/fixtures/evolution-document-server.ts`, `tasks.md` (2.3b unchecked), and this progress record.
- No design deviation: 408/409 precedence remains uncertain; validated media/URL rejection cannot become `sent`; response limits, timeout, redirect rejection, exact-once request behavior, and redaction remain unchanged.
- Remaining immediate implementation row: `- [ ] **[2.3b — bounded document adapter; depends on: 2.3a; target: 300–390 changed lines]**` pending independent gate; existing exact unchecked rows for 2.4 and 3.1–3.4 remain in the preceding cumulative record. Parent-owned R2–R6 remain deferred and byte-for-byte unchanged.
- PR boundary: `2.3b-http-outcomes-and-fixture-correction` only; rollback removes the three correction files, restores the 2.3b checkbox only after independent approval, and leaves dispatch disabled containment intact. No commit, live service, credential, deployment, review, receipt, or settlement action occurred.

## 2026-09-04 — Task 2.4 receipt-dispatch wiring and outcomes

### Structured status consumed

- Native `gentle-ai.sdd-status@2`: `changeName: add-admin-whatsapp-confirmation`, authoritative `artifactStore: openspec`, `applyState: ready`, `nextRecommended: apply`, with `apply` ready and no blocked reasons.
- `actionContext.mode: repo-local`; workspace and all edited files are within the parent-supplied canonical allowed edit roots.
- Delivery path is `auto-chain` / `stacked-to-main`, cap 400, work-unit boundary `2.4-receipt-dispatch-outcomes`; strict TDD is active. The parent owns the acquire token, independent gate, and settlement.

### Implemented dispatch wiring (pending independent gate)

- `createSignupPost` now uses the durable receipt repository for notification insertion without pre-claiming it, then—only after successful registration persistence—awaits a ready, fingerprint-validated dispatch configuration and receipt service.
- Disabled, malformed, or unvalidated profile configurations return the successful registration response with a zero-attempt `pending` notification and no provider request.
- Ready dispatch invokes the bounded document messenger in-request, maps known document acceptance to `sent`, known media/URL-only outcomes to `failed`, and malformed/timeout/network/5xx/oversize outcomes to `uncertain`; post-send expiry/finalization ambiguity remains a pending in-progress lease for task 3.3 reconciliation.
- The persistence failure boundary is unchanged: registration persistence failures still return `500`; only notification/dispatch work after that durable commit is isolated from the public success response.

### Files changed

- `src/pages/api/signups.ts`
- `tests/integration/receipt-dispatch-outcomes.test.ts`
- `openspec/changes/add-admin-whatsapp-confirmation/apply-progress.md`

### TDD Cycle Evidence

| Task | Test file | Layer | Safety net | RED | GREEN | TRIANGULATE | REFACTOR |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2.4 | `tests/integration/receipt-dispatch-outcomes.test.ts` | local-libSQL integration + local HTTP fixture | `pnpm test -- tests/integration/signup-orchestration.test.ts tests/integration/receipt-lease-finalization.test.ts tests/unit/evolution-document-adapter.test.ts`: 69/69 passed before edits | New suite failed as expected: disabled path pre-claimed an attempt and ready outcomes stayed pending | Injection seam and awaited ready-only dispatch made the new outcome assertions pass | Added malformed/unvalidated gating, media/URL rejection, malformed/5xx/oversize/network/timeout uncertainty, and stale post-send reconciliation cases; direct focused run passed 13/13 | No behavior-preserving refactor was needed; final direct focused run remained 13/13 |

### Verification

- `pnpm exec vitest run tests/integration/receipt-dispatch-outcomes.test.ts` — passed: 1 file, 13 tests.
- `pnpm check` — passed: 43 files, 0 errors, 0 warnings, 0 hints.
- `pnpm build` — passed; terms checksum verification and Astro/Vercel build completed. Vercel warned that local Node 26 will target Node 22.
- `pnpm test -- tests/integration/receipt-dispatch-outcomes.test.ts` and `pnpm test` both ran the whole configured suite and failed only `tests/integration/signup-orchestration.test.ts`'s obsolete assertion that disabled/default dispatch creates an `in_progress` attempt. The required task 2.4 behavior is zero-attempt pending when disabled; that test is outside this work unit's allowed edit surfaces.
- Runtime harness: the new suite uses real migrations and `file::memory:` libSQL with a local fixture server/injected transport. It made no Turso, Evolution, credential, or external request.

### Accounting and task state

- Baseline retained at `/tmp/add-admin-whatsapp-confirmation-2.4-baseline.J6MbWg` with manifest and the previously absent test-file entry.
- Baseline-to-current task source/test delta: `src/pages/api/signups.ts +41/-8` and `tests/integration/receipt-dispatch-outcomes.test.ts +145/-0`, total 194 changed lines before this progress evidence; below the 400-line cap.
- Per parent instruction, task 2.4 remains visibly unchecked until the independent gate. No parent-owned row changed.

### Remaining implementation task

- [ ] **[2.4 — dispatch outcome finalization; depends on: 2.2b, 2.3b]** RED in `tests/integration/receipt-dispatch-outcomes.test.ts`: prove disabled/unvalidated profile leaves zero-attempt pending with no fetch; known validated document acceptance alone becomes `sent` with allowlisted ID/evidence; media rejection/fetch failure and URL-only acceptance become `failed`; malformed 2xx, timeout, network/5xx, oversized responses, stale leases, and result-finalization ambiguity become `uncertain`; registration response remains successful throughout. GREEN/TRIANGULATE/REFACTOR receipt claim/finalize code and `src/pages/api/signups.ts` wiring. Verify `pnpm test -- tests/integration/receipt-dispatch-outcomes.test.ts && pnpm check && pnpm build`; runtime harness: local fixture server returns accepted-document, URL-only, and timeout fixtures and records the expected persisted states. Rollback boundary: automatic dispatch invocation only; `WHATSAPP_DISPATCH_ENABLED=false` stops calls while preserving signup and pending/reconcilable data. <!-- sdd-owner: implementation -->

### Deferred lifecycle actions and PR boundary

- Parent-owned R2–R6 remain byte-for-byte unchanged and deferred.
- Rollback boundary: remove the API receipt-service invocation and this focused test; `WHATSAPP_DISPATCH_ENABLED=false` remains containment while durable registrations and pending/reconcilable notifications remain intact.
- No commit, migration, Turso/Evolution access, credential use, deployment, review actor, receipt, or settlement was created.

## 2026-09-04 — Task 2.4 suite-compatibility correction

### Structured status consumed

- Native authoritative OpenSpec status: `applyState: ready`, `nextRecommended: apply`, `artifactStore: openspec`, tasks `10/20` complete, and no blocked reasons.
- `actionContext.mode: repo-local`; all edits stayed within the parent-provided surfaces. Delivery is `auto-chain` / `stacked-to-main`; the parent owns the active acquire and settlement.

### Baseline, RED, and correction

- Saved correction baseline including the existing signup test at `/tmp/add-admin-whatsapp-confirmation-2.4-correction-baseline.EZOATz/surfaces.tar` (`sha256:daa6087dc3030a8ed6acff3bf9d9746b1c805b827cf061cae6e692d3130c0f9c`); the manifest records all four scoped input hashes.
- RED — `pnpm test` failed exactly once: `signup-orchestration` expected one `in_progress` attempt but observed zero; all other 81 tests passed.
- Corrected that obsolete API expectation, rather than weakening it: two concurrent same-key API calls must return `201`/`200`, persist exactly one registration and `pending` zero-attempt logical notification, and persist no attempt when default dispatch is disabled.
- No production file changed. Direct repository lease claim/concurrency coverage remains in `receipt-lease-finalization.test.ts` and was rerun separately.

### TDD Cycle Evidence

| Task | Test file | Layer | Safety net | RED | GREEN | TRIANGULATE | REFACTOR |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2.4 suite compatibility | `tests/integration/signup-orchestration.test.ts` | local-libSQL API integration | Required full-suite RED: 81/82 passed | Old disabled-dispatch `in_progress` assertion failed | Focused API suite: 7/7 passed; full `pnpm test`: 82/82 passed | API idempotence/persistence plus direct atomic-claim/concurrency suite: 12/12 passed | No behavior-preserving refactor needed; focused suites remained green |

### Verification and accounting

- `pnpm test` — passed: 11 files / 82 tests; `pnpm check` — passed: 43 files, 0 errors/warnings/hints; `pnpm build` — passed (local Node 26 → Vercel Node 22 warning only).
- Correction delta including this evidence: `tests/integration/signup-orchestration.test.ts +4/-3` and progress `+31/-0` = 38 lines. Cumulative task delta is `194 + 38 = 232` lines, below the 400-line cap.
- Runtime harness: local in-memory libSQL and the existing local fixture only; no Turso, Evolution, credential, live service, commit, deploy, review, receipt, or settlement action occurred.
- Task 2.4 remains visibly unchecked by explicit parent instruction pending the independent gate; `tasks.md` was intentionally not modified. Remaining implementation rows are 2.4 and 3.1–3.4; parent-owned R2–R6 remain byte-for-byte deferred.

### Workload / PR boundary

- Work-unit boundary: `2.4-receipt-dispatch-outcomes` correction only. Rollback restores the archived signup test bytes; disabled dispatch continues to preserve registrations and zero-attempt pending notifications.

## 2026-09-04 — Task 2.4 safe-dispatch diagnostics correction
- Status: native authoritative OpenSpec `ready/apply`, repo-local canonical root; `auto-chain`/`stacked-to-main`, attempt 2/2, 400-line cap; no live service, secret, commit, or deploy was used.
- Fixed distinct configured `media-fetch-failed` mapping; static reconciliation-only diagnostics now cover notification persistence, dispatch operation, and unsuccessful finalization without raw errors or PII.
### TDD Cycle Evidence
| Task | RED | GREEN / TRIANGULATE / REFACTOR |
| --- | --- | --- |
| 2.4 correction | media-fetch code plus stale-finalization and tainted-error diagnostics failed; unit configured fetch failure also failed | 41 focused tests passed after minimal fixes; replay-after-sent and concurrent same-key API coverage passed; extracted shared media rejection mapper and reran focused tests. |
- Evidence: `pnpm test` 11 files/87 tests, `pnpm check` 0 errors, and `pnpm build` passed; runtime used only in-memory libSQL and local fixtures.
- Native accounting is authoritative: 286 pre-correction; this correction is `+86/-15` (101) before this 11-line progress entry, within 400; baseline `/tmp/add-admin-whatsapp-confirmation-2.4-baseline.ptWyxB` retained.
- Task 2.4 remains visibly unchecked pending independent verification; parent-owned R2–R6 are unchanged; stale post-send leases remain in-progress for task 3.3 reconciliation.

## 2026-09-05 — Work unit same2.4-safe-dispatch-diagnostics-correction

### Structured status and scope

- Consumed the parent-native authoritative OpenSpec `ready/apply` status for `add-admin-whatsapp-confirmation`; `repo-local`, `auto-chain`/`stacked-to-main`, cap 400, and strict TDD apply. Parent `allowedEditRoots` restricted edits to `src/pages/api/signups.ts`, `tests/integration/receipt-dispatch-outcomes.test.ts`, and this progress artifact; all edits conform.
- The parent-owned acquire is `proceed` for this same correction work unit (maximum two attempts); the parent retains settlement.
- Saved a pre-edit scoped byte baseline at `/tmp/add-admin-whatsapp-confirmation-2.4-safe-dispatch-diagnostics-correction-baseline.20260905T024820Z/surfaces.tar` (`sha256:5bb3a067a1fb6381fcfddb81a20f21ad47f43ccfb7347c5affec324fe2b3a647`).

### Corrective work and TDD evidence

- Split the ready-only notification-key lookup from receipt dispatch so a libSQL lookup-query failure reports static `dispatch-lookup-failed`; claim/dispatch failures still use `dispatch-operation-failed` and unresolved finalization still uses its dedicated diagnostic.
- Added an injected real-libSQL lookup-query failure regression that proves the saved `201` response, pending zero-attempt notification, no attempt rows, no messenger send, and diagnostics without the tainted email/phone text.
- Safety net: `pnpm test -- tests/integration/receipt-dispatch-outcomes.test.ts` passed 11 files / 87 tests before edits.

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2.4 safe diagnostics correction | `tests/integration/receipt-dispatch-outcomes.test.ts` | local-libSQL integration | 87/87 passed | New lookup-specific assertion failed: expected `dispatch-lookup-failed`, received `dispatch-operation-failed` | 88/88 passed after a lookup-only catch | The lookup no-send counter stayed zero and the existing injected claim-failure case still reports `dispatch-operation-failed`; focused suite passed 88/88 | No further refactor needed; focused suite and `pnpm check` passed |

### Verification, accounting, and remaining work

- `pnpm test`: passed 11 files / 88 tests; `pnpm check`: passed with 0 errors, 0 warnings, and 0 hints. Runtime harness used in-memory libSQL only; no live request, credential, commit, deployment, review, receipt, or settlement occurred.
- Accounting from the new saved baseline is `+7/-2` production, `+28/-0` test, and `+27/-1` progress lines: `+62/-3 = 65` current changed lines. Together with the prior correction's 112 lines, the active correction total is 177, while the unrelated pre-reset 286 lines are not part of this active correction budget.
- Task **2.4** remains visibly `- [ ]` pending the parent-owned independent gate; parent-owned R2–R6 remain byte-for-byte deferred.
- Remaining exact implementation rows: `- [ ] **[2.4 — dispatch outcome finalization; depends on: 2.2b, 2.3b]**` and the unchanged `- [ ]` rows 3.1, 3.2, 3.3, and 3.4 in `tasks.md`.
- PR boundary: `same2.4-safe-dispatch-diagnostics-correction` only; rollback removes the lookup-only diagnostic branch and its integration regression, while disabled dispatch still preserves saved registrations and pending reconciliation.
## 2026-09-05 — Work unit 3.1a admin crypto primitives
- Status: native authoritative OpenSpec `ready/apply` (attempt 11/25), `repo-local`, strict TDD, `auto-chain`/`stacked-to-main`; all edits use the parent allowlist, and parent retains gate/checkbox control.
| Task | Safety net | RED | GREEN | TRIANGULATE | REFACTOR |
| --- | --- | --- | --- | --- | --- |
| 3.1a | N/A (new files) | missing-module failure | 5 tests passed | 6 tests passed | no behavior change needed; focused rerun passed |
- Verification: `pnpm test -- tests/unit/admin-password-and-cookie-crypto.test.ts` RED then passes; `pnpm test` 12 files/94 tests passed; `pnpm check` 0 errors/warnings/hints.
- Added async 64-MiB scrypt verification, strict/canonical token and secret decoding, independent 32-byte tokens, versioned HMAC cookie verification before token exposure, and production/local eight-hour cookie serialization; baseline manifest is `/tmp/sdd-3.1a-admin-crypto-primitives-baseline/manifest.sha256`, delta `+190/-0` source/test lines.
- No deviation: cookie wire deliberately has no timestamp and the `Max-Age=28800` policy is tested; database expiry/revocation remains deferred to 3.1b. Per parent instruction, 3.1a remains visibly `- [ ]` pending its gate; no task row or parent-owned row changed.
- Boundary: `3.1a-admin-crypto-primitives` only; runtime harness N/A (pure crypto with non-production vectors, no network/database); rollback removes the two admin crypto modules and focused test, with no route, session persistence, credential, or live call.

## Apply — 3.1b-admin-persisted-sessions
- Completed `3.1b`; its implementation-owned persisted checkbox is now `- [x]` (re-read confirmed); `session-repository.ts`, `session-service.ts`, and integration test total 211 source+test lines (target 195–270).
- Tests: focused RED (missing service module), GREEN `pnpm test -- tests/integration/admin-session-repository.test.ts` 97/97, `pnpm test` 97/97, `pnpm check` 0 diagnostics.
| TDD Cycle Evidence | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
| 3.1b | `tests/integration/admin-session-repository.test.ts` | Integration | N/A new | missing-module failure | 3 tests pass | two sessions/expiry/outage | clean rerun |
- Deviation: none; local `file::memory:` migration fixture only, no credentials, services, logs, or schema changes.
- [ ] **[3.1c — DB throttle; depends on: 3.1b; target: 220–300 changed lines]** RED in `tests/integration/admin-login-throttle.test.ts`: with real migrations/disposable local in-memory libSQL, require HMAC-hashed client-address keys, bounded `unknown` bucket, 15-minute fixed window, blocks after five per-address and 60 global failures, generic Spanish denial/`Retry-After`, and success clearing its address bucket. GREEN only `src/lib/server/admin/login-throttle-repository.ts` and `src/lib/server/admin/login-throttle-service.ts`: atomically use Turso/libSQL rather than the in-memory limiter and never store/log raw addresses, passwords, hashes, or secrets. TRIANGULATE threshold races and injected-clock window/block expiry; REFACTOR parameterized SQL/key derivation only. Verify `pnpm test -- tests/integration/admin-login-throttle.test.ts && pnpm check`; runtime harness: local-libSQL fixture records five failures then one generic blocked result, without HTTP, live Turso, or credentials. Rollback boundary: throttle modules/test only; retain additive records and leave registrations untouched. <!-- sdd-owner: implementation -->
- Workload/status: stacked-to-main auto-chain slice `3.1b-admin-persisted-sessions`; consumed `gentle-ai.sdd-status@2` apply-ready (12/25), actionContext repo-local canonical allowed root, no warnings.

## 2026-09-05 — Task 3.1c DB throttle
- Status: authoritative OpenSpec `applyState: ready`; repo-local allowlist honored; `auto-chain`/`stacked-to-main`, 400-line slice; parent-gate warning: `tasks.md` intentionally unchanged.
| Task | RED | GREEN | TRIANGULATE | REFACTOR |
| --- | --- | --- | --- | --- |
| 3.1c | missing-module failure | focused test passed | global/unknown, race, expiry, outage | key reuse; focused test passed |
- Files: throttle repository/service plus local-libSQL integration test; HMAC domain-separated keys, fixed 15-minute counters, no raw address/secret persistence or logging, and documented 3.1e precheck/failure/success API.
- Verification: `pnpm test` 14 files/101 tests passed; `pnpm check` 0 errors, warnings, hints; local-libSQL runtime harness is the integration test (no HTTP, Turso, or credentials).
- Boundary: 3.1c only; baseline `/tmp/bdb-sdd-baselines/3.1c-20260905T033532Z.tar` sha256 `b7f399f96ffdf9d2c70b598bf3891053f133630ca0841c76e73e5b5fd12314d6`; no commit/staging/live operations; persisted checkbox remains unchecked pending parent gate.

## 2026-09-05 — Correct 3.1c final-success concurrency

### Structured status consumed

```yaml
schemaName: spec-driven
changeName: add-admin-whatsapp-confirmation
artifactStore: openspec
applyState: ready
nextRecommended: apply
actionContext:
  mode: repo-local
  workspaceRoot: /home/charlydev/Projects/DEV/batalla-de-barberos
  allowedEditRoots: [src/lib/server/admin/login-throttle-repository.ts, src/lib/server/admin/login-throttle-service.ts, tests/integration/admin-login-throttle.test.ts, openspec/changes/add-admin-whatsapp-confirmation/apply-progress.md]
  warnings: ["Parent holds native correction acquire=proceed and settlement; local gentle-ai sdd status is unavailable."]
```

### Corrective work and TDD evidence

- RED after the 4/4 safety net: an allowed precheck followed by 60 concurrent global failures made `recordSuccess` incorrectly return allowed; no production code preceded this test.
- GREEN: one write-batch conditional delete now retains the address bucket when the current fixed-window address or global row is actively blocked, then returns that authoritative decision; unblocked success still clears only its address bucket. No in-flight reservation was added.
- TRIANGULATE: an actual libSQL proxy injects a failing second failure statement and verifies both address/global increments roll back; this existing atomic failure batch passed the new real-database regression.
- REFACTOR: none needed; retained parameterized SQL and service decision helpers.

| Task | Test file | Layer | Safety net | RED | GREEN | TRIANGULATE | REFACTOR |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 3.1c correction | `tests/integration/admin-login-throttle.test.ts` | local-libSQL integration | 4/4 passed | 1/5 failed as expected | 5/5 passed | 6/6 passed | none needed |

### Verification, accounting, and boundary

- `pnpm test` passed: 14 files, 103 tests; `pnpm check` passed: 52 files, 0 errors, 0 warnings, 0 hints. Runtime harness was disposable `file::memory:` libSQL only; no HTTP, Turso, credentials, commit, staging, review, receipt, native operation, or live call occurred.
- Scoped baseline: `/tmp/bdb-3.1c-concurrency-correction-baseline.20260905T034826Z.tar` (`sha256:dd7425d48515715e6ab44688ba1388f9b6435f7f7840b70766ee5b6e652cddf8`). Delta including this 36-line progress entry is repository `+9/-2`, service `+5/-3`, test `+40/-0`, progress `+36/-0`: `+90/-5 = 95` physical lines; cumulative `232 + 95 = 327`, leaving 73 of 400.
- Accounting correction: the prior ledger label of 231 content lines is corrected to 232 physical lines before this correction.
- Task **3.1c** remains intentionally unchecked pending the parent-owned gate; re-read confirmed 19 implementation rows: 12 checked, 7 unchecked, and no malformed ownership markers. Exact remaining target: `- [ ] **[3.1c — DB throttle; depends on: 3.1b; target: 220–300 changed lines]**`.
- PR boundary: `3.1c-final-success-concurrency-correction` only; rollback restores the saved baseline bytes for the repository, service, test, and this evidence while retaining additive throttle records.

## 2026-09-05 — Work unit 3.1d middleware/locals
- Status consumed: authoritative OpenSpec `ready/apply`, `repo-local` canonical root, `auto-chain`/`stacked-to-main`, parent-acquired `proceed` (14/25); allowed surfaces were middleware, env types, route-security test, and this artifact, so `tasks.md` remains unchanged for the parent gate.
- Added testable `createAdminMiddleware` plus Astro `onRequest`: exact login exclusions only; `/admin` and `/api/admin` descendants fail closed after signature verification and before lazy database/session lookup, returning redirect/401 without PII or calling `next`.
- Valid sessions add only `{ id, expiresAt }` to `locals.adminSession`; protected authorized and denied responses receive no-store, frame denial/CSP, and referrer headers, while login/public routes remain unmodified and avoid database resolution.
- TDD: safety net `pnpm test -- tests/integration/admin-session-repository.test.ts` passed 103/103; RED missing-module failure; GREEN 108/108; TRIANGULATE signed DI plus tampered/expired/revoked, path-segmentation, and outage cases 109/109; REFACTOR not needed after extracted classification/header helpers.
- Evidence: `pnpm test` 15 files/109 tests, `pnpm check` 0 diagnostics, and `pnpm build` passed; the runtime boundary is local in-memory libSQL only, with no live calls, secrets, commit, staging, or native operation.
- Accounting: `src/middleware.ts` 72, `src/env.d.ts` 11, and `tests/integration/admin-route-security.test.ts` 143 added lines = 226 source/test lines; no pre-edit `/tmp` byte baseline was captured before this delegated run, so no baseline hash is claimed.
- Remaining persisted row: `- [ ] **[3.1d — middleware/locals; depends on: 3.1c; target: 220–305 changed lines]**`; parent must reconcile that checkbox after its gate, and parent-owned R2–R6 remain deferred byte-for-byte.
- PR boundary: `3.1d-middleware-locals` on stacked-to-main; rollback removes only the three listed implementation/test files, leaving sessions, registrations, migrations, routes, and public behavior intact.
## 2026-09-05 — Correct 3.1d canonical middleware/CSP
- Status/files/accounting: authoritative OpenSpec `ready/apply`; parent correction `proceed`, strict TDD, `repo-local`, `auto-chain`/`stacked-to-main`, cap 400; allowed edits were middleware, route-security test, and this artifact, so 3.1d stays unchecked for parent settlement; changed `src/middleware.ts` and `tests/integration/admin-route-security.test.ts`; before-bytes `/tmp/bdb-3.1d-middleware-correction-baseline-20260905T040822Z/surfaces.tar` sha256 `e115889c5a3a8243f89e329636321a9913043446d7dcf22dc07b6264a7880f63`; delta `+35/-11` source, `+44/-0` test, `+6/-0` progress = 96 physical; `235 + 96 = 331`, leaving 69.
| TDD Cycle Evidence | Safety net | RED | GREEN | TRIANGULATE | REFACTOR |
| --- | --- | --- | --- | --- | --- |
| 3.1d correction | focused suite 109/109 | encoded roots/slashes/login plus CSP-preservation tests failed 2/111 | canonical bounded decoding and CSP merge passed 111/111 | CSP-without-frame-ancestors case passed 112/112 | helper extraction reran 112/112 |
- Verification/remaining: focused refactor 112/112; `pnpm test` 15 files/112 tests, `pnpm check` 55 files/0 diagnostics, and `pnpm build` passed (Node 26→22 Vercel warning); no deviation, live call, commit, staging, native operation, or runtime harness; all persisted unchecked rows, including 3.1d, remain unchanged, and this PR boundary rolls back only the two correction files.
## 2026-09-05 — Correct 3.1d malformed-path/CSP fail-closed handling
- Status: authoritative OpenSpec `ready/apply`; parent-acquired `proceed` (14/25), strict TDD, `repo-local`, `auto-chain`/`stacked-to-main`; only the supplied correction surfaces were edited.
- Completed correction: malformed or unresolved-after-two-decodes paths return protected `400` before `next`/session lookup; valid encoded public paths and raw-exact login exemptions remain unchanged; CSP now appends a separate `frame-ancestors 'none'` policy without parsing existing CSP.
- TDD: safety 112/112; RED 3 failures (invalid/overbound paths and CSP preservation); GREEN 113/113; TRIANGULATE added overbound encoded API path, 113/113; REFACTOR none needed.
- Verification: `pnpm test` 15 files/113 tests, `pnpm check` 55 files/0 diagnostics, and `pnpm build` passed (local Node 26→Vercel Node 22 warning); no live call, commit, staging, or native action.
- Baseline `/tmp/gentle-ai-baselines/add-admin-whatsapp-confirmation-narrow3.1d-20260905T082347.tar` sha256 `22b10d6c01ed47ff83fbd9481590d428e6e22505ab44e64e046c023f659a4cc8`; correction delta is source `+11/-13`, test `+27/-6`, progress `+6/-0` (63 physical), cumulative `394/400` (6 remaining); 3.1d remains unchecked for parent settlement as previously authorized.

## 2026-09-05 — Work unit 3.1e canonical login

### Structured status consumed

- Authoritative OpenSpec `ready/apply`; parent-acquired `proceed` (15/25), `repo-local`, strict TDD, `auto-chain`/`stacked-to-main`.
- Allowed surfaces were the four login source/test files and this artifact. `tasks.md` is expressly parent-gated and was not edited; its 3.1e row remains visibly unchecked for parent reconciliation.

### Completed implementation slice

- Added a domain-separated `p1` HMAC pre-auth proof using the session secret, a fresh canonical 32-byte random value, a signed absolute 10-minute expiry, strict decoding, and local/production HttpOnly Strict cookie serializers without `Domain`.
- Added the Spanish login page: it resolves a valid existing session to `303 /admin`; otherwise it emits the signed hidden proof and pre-auth cookie. Its API factory checks exact `Origin`, proof cookie/field equality and validity before any throttle, password, or session action; it requires URL-encoded forms, returns static `400`/`403`/`503` responses, has a lazy production database wrapper, and extracts only the first forwarded address for the HMAC throttle bucket.
- The ordered successful path is throttle precheck → scrypt verification → final `recordSuccess` → session creation → `303 /admin`; password failure records once and never creates a session. Login responses add no-store, frame, referrer, and CSP headers because middleware excludes login.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 3.1e | `tests/integration/admin-login-route.test.ts` | local-libSQL HTTP-handler integration | `pnpm test --` session/throttle/middleware suites: 113/113 | missing login-route module; added-address test failed before its helper existed | 3 route scenarios passed | added production-cookie and forwarded-address scenarios; 5 route scenarios and 118 suite tests passed | response/policy helpers retained; final rerun passed |

### Verification and accounting

- `pnpm test -- tests/integration/admin-login-route.test.ts` and final `pnpm test` passed 16 files/118 tests; `pnpm check` passed with 0 diagnostics; `pnpm build` passed. Build warned that local Node 26 targets Vercel Node 22.
- The local in-memory libSQL fixture exercised the exported POST handler with a real migrated schema and redacted cookie assertions; it made no network, Turso, credential, provider, or live HTTP call.
- Baseline including absent-file manifest: `/tmp/bdb-3.1e-login-baseline-20260905T113249Z` (`manifest.txt` sha256 `84d2575738e21ec387512a8965afac1572f8a284977a00a5a54e4adfcc202253`; `manifest.sha256` sha256 `e8f6b0be5a8e322c51ab564216ecc31485af732ae3b653154baa68192e6e8794`). Source/test files total 290 lines; this evidence keeps the 275–365 work-unit target with margin.

### Files, deviations, and remaining work

- Changed: `src/lib/server/admin/preauth-csrf.ts`, `src/pages/api/admin/login.ts`, `src/pages/admin/login.astro`, `tests/integration/admin-login-route.test.ts`, and this artifact.
- Deviation: none. The 10-minute pre-auth TTL is the documented reasonable policy decision for this slice; the larger server-config refactor remains 3.4.
- Remaining exact implementation row: `- [ ] **[3.1e — login; depends on: 3.1d; target: 275–365 changed lines]**`; parent-owned deferred lifecycle actions R2–R6 remain byte-for-byte unchanged.
- PR boundary: stacked-to-main `3.1e-canonical-login`; rollback removes only the listed login/helper/test files and leaves additive sessions, throttles, registrations, and migrations intact. No commit, staging, deployment, receipt, review, native operation, or task-checkbox update occurred.
## 2026-09-05 — Correct 3.1e malformed password hash
- Status/scope: authoritative OpenSpec `ready/apply`, parent correction `proceed`, strict TDD, repo-local auto-chain; exported one parser-backed validator and made GET/POST return `503` before DB/throttle for malformed salt/hash or parameters.
- TDD: safety 118/118; RED malformed salt/hash/parameter route regression failed before throttle; GREEN 119/119; TRIANGULATE adds pre-auth tamper alongside existing expiry/origin coverage; REFACTOR only type narrowing.
- Evidence/boundary: `pnpm test` 16 files/119, `pnpm check` 0 diagnostics, `pnpm build` passed (Node 26→22 warning); baseline `/tmp/bdb-3.1e-malformed-hash-baseline-20260905T114734Z/surfaces.tar` sha256 `01fef8079bfb27fd5954e3969178b31222d36977975a697155c429c77d5bdafa`; delta +30/-6 source/test plus +4 evidence = 40, `322+40=362`/400 (38 left); 3.1e checkbox intentionally unchanged, no live calls/commit/staging.

## 2026-09-05 — Work unit 3.1f authenticated CSRF/logout: blocked by checkbox scope
- Status consumed/produced: authoritative OpenSpec `ready/apply` (parent-native `proceed`, 16/25); strict TDD; repo-local `auto-chain`/`stacked-to-main`; actionContext permits only authenticated-CSRF/logout source, test, and this artifact, but omits required persisted task artifact `openspec/changes/add-admin-whatsapp-confirmation/tasks.md`.
- Blocked before safety-net/RED and before source/test edits: the apply contract requires this executor to mark a completed implementation task in `tasks.md`, while the explicit `checkboxparentonly` instruction and allowed-edit roots prohibit that target; no task can be completed or reconciled safely under both constraints.
- Baseline bytes saved at `/tmp/bdb-sdd-3.1f-authenticated-csrf-logout-baseline-20260905T000000Z/surfaces.tar` (`sha256:b4ae97abf65de5909b03c6c9cd3567236997cde7c685efccf97b9ef960e9bbab`); no source/test, cookie, session, database, credential, network, commit, stage, receipt, or task-checkbox mutation occurred; tests not run because strict TDD cannot begin a non-reconcilable implementation cycle.
- TDD Cycle Evidence: safety net/RED/GREEN/TRIANGULATE/REFACTOR all not started due the pre-edit persisted-checkbox scope blocker; the exact assigned unchecked implementation row remains `- [ ] **[3.1f — authenticated CSRF/logout; depends on: 3.1e; target: 165–230 changed lines]**` and parent-owned R2–R6 remain deferred byte-for-byte.
- Required parent action: add `openspec/changes/add-admin-whatsapp-confirmation/tasks.md` to `allowedEditRoots` and authorize executor-owned checkbox reconciliation, or explicitly delegate the checkbox update to the parent with a contract exception before relaunching this work unit.
## 2026-09-05 — Task 3.1f authenticated CSRF/logout
- Status: authoritative OpenSpec `ready/apply`, `repo-local`, `auto-chain`/`stacked-to-main`; parent resolved the prior task-checkbox scope and allowed exactly the two source files, test, `tasks.md`, and this progress file; no action-context warning remains.
- Completed: implementation-owned **3.1f** is visibly `- [x]`; added constant-time submitted/signed/stored-CSRF triple agreement, POST-only local/production-expiring logout, lazy production DB wrapper, static no-PII error headers, and real local-libSQL login → middleware → logout → old-cookie denial coverage in `authenticated-csrf.ts`, `logout.ts`, and `admin-authenticated-csrf-logout.test.ts`.
- TDD Cycle Evidence: | Task | Safety net | RED | GREEN | TRIANGULATE | REFACTOR | | 3.1f | `admin-route-security`: 16 files/119 tests passed | missing logout module: 1 failed suite/119 passed | 17 files/121 passed | invalid field/signed/stored/origin proofs, harmless GET, production flags, DB outage, repeated logout, and old-cookie denial: 121 passed | response helper extraction: 121 passed |
- Verification/baseline: baseline `/tmp/bdb-3.1f-authenticated-csrf-logout-baseline-ijtXK9/surfaces.tar` sha256 `387c57de896c00d706b00c6760dd89d5f3bf678f94c2daba5cdd1907c776a432`; `pnpm test` 17 files/121, `pnpm check` 62 files/0 diagnostics, and `pnpm build` passed (only existing Node 26→22 Vercel warning); runtime harness is the local in-memory libSQL login/protected/logout/old-cookie scenario with no Turso, credentials, network, migration target, commit, stage, or native operation.
- Deviation: none; source+test is 194 physical lines (within 165–230), progress append is six physical lines, current stacked PR boundary is `3.1f-authenticated-csrf-logout`, and rollback removes only these source/test changes while retaining revoked/additive session data; remaining exact unchecked implementation rows are `- [ ] **[3.2 — submitted-registration-only read model and lifecycle writes; depends on: 3.1f, 2.4]**`, `- [ ] **[3.3 — controlled retry and reconciliation; depends on: 3.2]**`, and `- [ ] **[3.4 — configuration, hardening, and operator documentation; depends on: 2.3b, 3.1f, 3.3]**`; parent-owned R2–R6 remain byte-for-byte deferred.
## 2026-09-05 — Correct 3.1f logout store-failure classification
- Status/scope: authoritative OpenSpec `ready/apply`, parent correction `proceed`, strict TDD, repo-local `auto-chain`/`stacked-to-main`; only the supplied canonical source/test/progress surfaces changed.
- TDD: safety net was 17 files/121 tests; RED injected real local-libSQL first/second lookup and revoke failures after valid CSRF, yielding the expected 401 defect; GREEN 122/122; TRIANGULATE added expired/revoked 401-without-expiry and persisted-revoke-before-clear, 123/123; refactor made strict a narrow opt-in service throw mode, 123/123.
- Verification: final `pnpm test` passed 17 files/123 tests, `pnpm check` 62 files/0 diagnostics, and `pnpm build` passed; runtime harness was local in-memory libSQL only, with no live calls, credentials, staging, commit, receipt, or native operation.
- Accounting: before bytes remain at `/tmp/gentle-ai-before-3.1f` (236439 total); source/test delta is `+59/-7 = 66`, this six-line evidence makes `72/100`, and no task/repository-test bytes changed.
- Checkbox/boundary: re-read confirms implementation-owned 3.1f visibly `- [x]`; parent settlement remains independent, R2–R6 are unchanged, and rollback restores logout/service/test/progress baseline bytes only.

## 2026-09-05 — Work unit 3.2a submitted-only read model
- Status: parent-native authoritative OpenSpec `ready/apply` (fresh 17/29), `repo-local`, strict TDD, parent-acquired `proceed`, `auto-chain`/`stacked-to-main`, 400 cap; canonical allowed roots honored and parent retains settlement.
- Completed/persisted: implementation-owned **3.2a** is visibly `- [x]`; registration-rooted parameterized list/count/detail uses a matching persisted-terms receipt join, 50-row `(created_at,id)` cursor, safe allowlisted receipt/attempt/audit data, no absent-person synthesis, and separate Spanish labels.
- TDD: RED missing read-repository module; GREEN seeded list/count/detail passed; TRIANGULATE added 50/51 tie-break, all independent enum filters, absent/multiple-term receipts, corrupt cursor/filter, historical-null phone, and tainted diagnostics; REFACTOR centralized diagnostic/cursor/filter projection helpers and reran green.
- Evidence: `pnpm test -- tests/integration/admin-registration-management.test.ts` passed 18 files/125 tests; `pnpm check` passed 65 files/0 diagnostics; runtime harness was real migrations plus local `file::memory:` libSQL only, so no HTTP route, Turso, credentials, live call, commit, deploy, review, receipt, or migration target occurred.
- Baseline `/tmp/bdb-3.2a-submitted-read-model-baseline-20260905T123557Z/surfaces.tar` SHA-256 `da47538defccc93f119fdc1f2e8c2cfade1adce64e8518d3e707ac0402feb3ba` includes absent-file manifest; source/test delta is 290 lines before this 6-line evidence, no design deviation; stacked slice `3.2a-submitted-read-model` rolls back only two read modules/test, with 3.2b–3.4 remaining and parent R2–R6 deferred unchanged.

## 2026-09-05 — 3.2a audit-axis correction
- Status: authoritative OpenSpec `ready/apply`, `repo-local`, strict TDD, parent correction `proceed`, `auto-chain`/`stacked-to-main`, canonical allowed roots; task state `17/23` implementation complete and `1/6` parent complete, warnings none.
- Completed/persisted: no new checkbox was truthful to mark—3.2a remains visibly `- [x]`; changed only its read repository/test so audit from/to values are action-axis enum allowlisted, with invalid, cross-axis, and tainted values safely `null` and never echoed.
- TDD/evidence: safety `125/125`; RED expected 1 failure/125 pass; GREEN and TRIANGULATE `126/126`; REFACTOR assessed helper clean; final `pnpm test` `18 files/126`, `pnpm check` `65 files/0`; real migrations plus `file::memory:` libSQL only, no live/native/commit/stage.
- Baseline `/tmp/bdb-3.2a-audit-axis-baseline-2xKpGK4l/surfaces.tar` SHA-256 `c4dadf4a1698ad307b25255994a478afb8298e42a8cf7817d04e7a3ad80b6ee3` (`19,343` bytes); source/test delta `+35/-2 = 37` (<50), rollback is the two code/test files, no design deviation; exact unchecked rows remain the persisted implementation rows `3.2b–3.4` and parent `R2–R6` recorded above.
## 2026-09-05 — Task 3.2b optimistic lifecycle and atomic audit
- Status: authoritative native OpenSpec `ready/apply` (fresh 18/29), `repo-local`, strict TDD, `auto-chain`/`stacked-to-main`, parent-acquired `proceed`; allowed roots were exactly the two new admin modules, focused integration test, tasks, and this progress artifact, with no action-context warnings.
- Completed/persisted: implementation-owned **3.2b** is visibly `- [x]`; separate `changeReview`/`changeParticipantResponse` typed service outcomes validate finite nonnegative versions, IDs, and enum targets, reject no-op/missing/stale cases without writes, and use guarded local-libSQL write batches for one-axis version increment plus one allowlisted ID-only audit row; receipt status remains unrelated. Files: lifecycle repository, management service, and integration test; deviation: none.
- TDD Cycle Evidence: | 3.2b | local-libSQL integration | safety 18 files/126 tests | RED missing repository-module import failed | GREEN review update/audit 127 | TRIANGULATE invalid/no-op/missing/stale, every axis target, concurrent same-version (one success/one conflict/one audit), and duplicate-audit SQL failure rollback 130 | REFACTOR static mutation allowlist plus strict persisted enum snapshot; rerun passed |
- Verification: focused/final `pnpm test -- tests/integration/admin-registration-management.test.ts` and `pnpm test` passed 18 files/130 tests; `pnpm check` passed 67 files with 0 errors, warnings, hints; runtime harness was real migrations plus `file::memory:` libSQL only, with no live calls, stage, commit, receipt, review, or native operation.
- Remaining exact unchecked implementation labels are `- [ ] 3.2c`, `- [ ] 3.2d`, `- [ ] 3.2e`, `- [ ] 3.3`, and `- [ ] 3.4`; parent R2–R6 remain byte-for-byte deferred. PR boundary `3.2b-lifecycle-atomic-audit` rolls back only the two modules and focused additions; baseline manifest (new modules absent; test/tasks/progress SHA-256 `47cd03adae2dbd58c2d1363e94868c1b1923971c4e86d1fcefa264ed9187c763`, `59094fe0d4364266ac2e801f1cb12824bfdf1d80ce24a6f88de34e1c4dff58f2`, `6d048ca6f8620c514b3c500cc8e83df8556f95ff48be6bf59afa7ebba723327f`) was captured before edits; no `/tmp` bytes archive was written because it was outside the supplied edit surfaces. Current physical delta is +250 source/test, +1 task, +6 progress = 257, below the 400 cap.
## 2026-09-05 — Correct 3.2b canonical audit guard
- Status: manual authoritative OpenSpec `ready/apply`, strict TDD, `repo-local`, `auto-chain`/`stacked-to-main`, 400 cap; allowed roots were the two source/test files, `tasks.md`, and this artifact (no action-context warning); CodeGraph MCP initialization failed, so scoped direct reads were used.
- TDD Cycle Evidence: | 3.2b correction | local-libSQL integration | safety 130/130 | RED same-target/different-request-ID review race produced two audits (131 tests, one failure) | `changes() = 1` same-write-batch guard: 131/131 | identical-target races for review and participant axes: one success/conflict and one audit each | none needed |
- Verification: `pnpm test -- tests/integration/admin-registration-management.test.ts` GREEN 131/131; final `pnpm test` 18 files/131, `pnpm check` 67 files/0 diagnostics, and `pnpm build` passed (Node 26→Vercel Node 22 warning); real migration plus `file::memory:` libSQL proved connection-local `changes()` semantics with no live calls.
- Accounting/task/rollback: before bytes `/tmp/bdb-32b-correction-YTOQO5` (source `9c07d0…`, test `582b15…`); correction `+2/-2` source and `+24/-0` test = 28 physical, prior 258 → 286/400; re-read confirms 3.2b remains truthful `- [x]` without checkbox mutation; remaining exact implementation labels stay `- [ ] 3.2c`, `- [ ] 3.2d`, `- [ ] 3.2e`, `- [ ] 3.3`, `- [ ] 3.4`, and R2–R6 remain deferred; rollback restores only these two files from the baseline.

## 2026-04-19 — Task 3.2c authenticated lifecycle forms/API PRG
| TDD Cycle Evidence | RED | GREEN | TRIANGULATE | REFACTOR |
| --- | --- | --- | --- | --- |
| 3.2c integration routes | expected missing route-module import | 145/145 tests passed | CSRF/origin/duplicate/cross-axis/version/session/outcome/storage cases | shared bridge extracted; focused tests and `pnpm check` passed |
- Status: native OpenSpec `apply: ready`, 20/29 complete, repo-local root allowed with no warnings; completed implementation task `3.2c` and persisted its `[x]` checkbox; files: authenticated-form bridge, two POST routes, middleware/locals types, and two integration suites; deviations none; stacked-to-main PR 3.2c boundary remains ≤400 with no commit, live call, or settlement.
- Verification: RED route import failed as expected; final `pnpm test` 18 files/146 tests, `pnpm check` 0 errors/warnings/hints, and `pnpm build` passed (local Node 26→Vercel Node 22 warning only); injected local authenticated handler harness verified both POST/303 PRG paths with no network/database credentials.
- Remaining exact persisted unchecked rows: - [ ] **[3.2d — submitted-registration list UI; depends on: 3.2a, 3.2c; target: 245–320 changed lines]** RED in `tests/integration/admin-registration-management.test.ts`: render the authenticated list and require `AdminLayout` to expose a clear Spanish submitted-registration heading/count, the exact empty state `Todavía no hay inscripciones recibidas`, a newest-first 50-row table, keyset next-page link, notification-attention filter, canonical or unavailable historical phone presentation, and three separately named status areas—`Revisión de inscripción`, `Respuesta del participante`, and `Acuse documental por WhatsApp`—without unqualified `Confirmación`, roster language, import, comparison, or export controls. GREEN only `src/layouts/AdminLayout.astro`, `src/components/admin/RegistrationStates.astro`, `src/pages/admin/index.astro`, and `src/styles/global.css`: render the 3.2a projection and cursor/filter request values, link to persisted detail IDs, include text labels alongside status color, keyboard focus, and responsive table behavior; no detail actions or lifecycle business logic belongs here. TRIANGULATE a no-registration state, historical row, failed/uncertain attention rows, and a second page with stable cursor ordering. REFACTOR presentational status/table helpers without changing repository queries or API routes. Verify RED, GREEN, TRIANGULATE, and REFACTOR with `pnpm test -- tests/integration/admin-registration-management.test.ts && pnpm check && pnpm build`; runtime harness: request `GET /admin?attention=1` (read-only HTTP request target) and the returned keyset next-page `GET /admin?cursor=<opaque-cursor>` (read-only HTTP request target) against local fixtures, recording submitted-only rows and visible three-axis labels. Rollback boundary: `AdminLayout.astro`, `RegistrationStates.astro`, list page, global styles, and focused render tests only; no persisted data, mutation handler, roster/import/export surface, or detail page is removed. <!-- sdd-owner: implementation --><br>- [ ] **[3.2e — registration detail UI; depends on: 3.2b, 3.2c, 3.2d; target: 285–360 changed lines]** RED in `tests/integration/admin-registration-management.test.ts`: render one authenticated persisted registration detail and require normalized phone or historical-unavailable text, terms/versioned attachment link, receipt status/attempt timestamps/sanitized diagnostic, audit history, and three Spanish status areas; require distinct review and participant-response forms with current `state_version`, authenticated CSRF proof, and explicit labels, while no detail is synthesized for a non-database expected person. GREEN only `src/pages/admin/inscripciones/[id].astro`, `src/components/admin/RegistrationStates.astro`, and scoped additions in `src/styles/global.css`: consume 3.2a detail projections, render the 3.2c PRG forms and safe success/conflict feedback, show `Documento aceptado por el proveedor; entrega no verificada` for `sent`, and preserve the warning that participant response is not receipt delivery; do not add retry/reconcile controls, roster/import/comparison/export behavior, or new lifecycle writes. TRIANGULATE missing ID, stale-version feedback after a competing write, each receipt status including absent/pending attention, and audit values proving one axis did not change the others. REFACTOR detail definition-list/form presentation helpers without changing route, service, or repository contracts. Verify RED, GREEN, TRIANGULATE, and REFACTOR with `pnpm test -- tests/integration/admin-registration-management.test.ts && pnpm check && pnpm build`; runtime harness: request `GET /admin/inscripciones/<persisted-id>` (read-only HTTP request target) with a local authenticated fixture, submit a valid lifecycle form, follow its `303` redirect to `GET /admin/inscripciones/<persisted-id>` (read-only HTTP request target), and record independent statuses plus sanitized audit history. Rollback boundary: detail page, shared state component, scoped global styles, and focused render/form test cases only; lifecycle/audit records remain additive and receipt recovery is untouched. <!-- sdd-owner: implementation --><br>- [ ] **[3.3 — controlled retry and reconciliation; depends on: 3.2a, 3.2b, 3.2c, 3.2d, 3.2e]** RED in `tests/integration/admin-receipt-recovery.test.ts`: prove only failed/uncertain notifications retry on the original logical record, uncertain retries require `ackUncertain=1`, sent notifications have no normal retry action, stale in-progress leases first become uncertain, and reconcile acts only on an existing persisted registration with missing/zero-attempt/stale-pending receipt state. GREEN/TRIANGULATE/REFACTOR retry/reconcile services and `src/pages/api/admin/registrations/[id]/receipt/retry.ts`, `reconcile.ts`, plus detail forms; enforce CSRF, lease concurrency, PRG redirects, sanitized diagnostics, and no new registration. Verify `pnpm test -- tests/integration/admin-receipt-recovery.test.ts && pnpm check && pnpm build`; runtime harness: use local fixture provider to fail then retry one registration and confirm attempt count increments while registration count remains one. Rollback boundary: retry/reconcile endpoints/forms only; disable dispatch to contain future attempts while retaining historical attempts. <!-- sdd-owner: implementation --><br>- [ ] **[3.4 — configuration, hardening, and operator documentation; depends on: 2.3b, 3.1f, 3.3]** RED in `tests/unit/server-config-and-observability.test.ts`: reject missing/unsafe server configuration and assert logs/persisted diagnostics never include credentials, headers, cookies, IPs, phone, names, caption, raw provider body, or secrets. GREEN/TRIANGULATE/REFACTOR `environment.example`, `README.md`, `astro.config.mjs`, `vercel.json`, password-hash utility under `scripts/`, and server config/logging modules; document `WHATSAPP_DISPATCH_ENABLED=false` containment, independent credential rotation, profile-fingerprint validation, PDF immutability, and the migration command warning. Verify `pnpm test -- tests/unit/server-config-and-observability.test.ts && pnpm check && pnpm build`; runtime harness: start with dispatch disabled and confirm startup/config parsing exposes no secret values. Rollback boundary: configuration/docs/header hardening and utility script; preserve safe disabled-dispatch defaults. <!-- sdd-owner: implementation -->

## 2026-04-19 — Task 3.2d submitted-registration list UI

### Structured status consumed

```yaml
schemaName: spec-driven
changeName: add-admin-whatsapp-confirmation
artifactStore: openspec
planningHome:
  root: /home/charlydev/Projects/DEV/batalla-de-barberos/openspec
  changesDir: /home/charlydev/Projects/DEV/batalla-de-barberos/openspec/changes
changeRoot: /home/charlydev/Projects/DEV/batalla-de-barberos/openspec/changes/add-admin-whatsapp-confirmation
artifacts: { proposal: done, specs: done, design: done, tasks: done, applyProgress: partial, verifyReport: missing, syncReport: missing }
taskProgress: { total: 23, complete: 19, remaining: 4 }
deferredParentActions: { total: 6, complete: 1, remaining: 5 }
taskArtifactErrors: []
applyState: ready
dependencies: { apply: ready, verify: ready, sync: blocked, archive: blocked }
actionContext:
  mode: repo-local
  workspaceRoot: /home/charlydev/Projects/DEV/batalla-de-barberos
  allowedEditRoots:
    - src/layouts/AdminLayout.astro
    - src/components/admin/RegistrationStates.astro
    - src/pages/admin/index.astro
    - src/styles/global.css
    - tests/integration/admin-registration-management.test.ts
    - openspec/changes/add-admin-whatsapp-confirmation/tasks.md
    - openspec/changes/add-admin-whatsapp-confirmation/apply-progress.md
  warnings:
    - Native attempt status supplied by the parent is active for 3.2d; parent owns settlement.
    - Astro Container is present, but this Vitest configuration cannot transform .astro modules and no compiler package is installed.
nextRecommended: apply
isNonAuthoritative: false
```

### Implementation and verification status

- Added the protected, server-rendered list surface: `AdminLayout` has a POST logout form with the allowlisted CSRF local only, and never renders session records or cookie values.
- Added the three explicit Spanish state areas with text and color treatment, including `Documento aceptado por el proveedor; entrega no verificada` for `sent`.
- Added a `barber_signups`-rooted list page using only the existing read repository's `list()` and `count()` methods. It validates duplicate/unknown/invalid query input as safe `400`, maps data-access failures to generic `503`, has no GET mutation path, preserves allowed filters in opaque-cursor next links, and encodes persisted IDs in the existing future detail target.
- Added scoped `.admin-*` and `.registration-states` responsive/table/focus styling without modifying public UI styles.
- The task checkbox remains unchecked. Strict TDD cannot treat this task as complete because rendered Astro output could not run in the current Vitest harness; no checkbox was falsely advanced.

### Files changed

- `src/layouts/AdminLayout.astro` (26 physical lines)
- `src/components/admin/RegistrationStates.astro` (12 physical lines)
- `src/pages/admin/index.astro` (61 physical lines)
- `src/styles/global.css` (+12 physical lines)
- `tests/integration/admin-registration-management.test.ts` (+3 current-work-unit physical lines; one explicit skipped harness-gap marker)
- `openspec/changes/add-admin-whatsapp-confirmation/apply-progress.md`

### Test commands

- Safety net: `pnpm test -- tests/integration/admin-registration-management.test.ts` — 18 files / 146 tests passed before RED.
- RED: the same command failed as expected because `AdminLayout.astro` did not exist.
- GREEN attempt: after the UI files were added, Vitest failed before test execution because this project has no Astro Vite transform for `.astro` modules.
- Capability check: `astro/container` exports `experimental_AstroContainer`, but `@astrojs/compiler` is not installed/exportable and the current Vitest configuration cannot import `.astro` modules. The rendered-output test is explicitly skipped rather than replaced with brittle source-string assertions.
- Final focused suite: `pnpm test -- tests/integration/admin-registration-management.test.ts` — 18 files / 146 tests passed; 1 rendering-harness gap skipped.
- `pnpm check` — passed: 73 files, 0 errors, 0 warnings, 0 hints.
- `pnpm build` — passed, including `pnpm terms:verify`; local Node 26 produced the existing Vercel Node-22 compatibility warning.
- Runtime harness: deferred intentionally. A real authenticated local `GET /admin` and its keyset next-page GET remain mandatory once the parent provides the runtime validation path; no live secret, Turso, provider, or external network call occurred.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 3.2d | `tests/integration/admin-registration-management.test.ts` | Astro rendered integration | 146/146 passed | Expected absent `AdminLayout.astro` import failure | Blocked by missing Astro Vitest transform before component execution | Blocked with GREEN; no rendered cases could execute | UI query/count handling clarified and focused suite/check/build rerun |

### Deviations and risks

- No production-design deviation was introduced; implementation uses existing middleware locals, existing logout endpoint, and existing registration read repository only.
- The missing Astro-aware Vitest transform is a strict-TDD blocker for the required rendered-output assertions. Add/configure an Astro Vitest integration (or provide an approved compiler/container harness) within an allowed edit surface before checking 3.2d.
- The UI was type-checked and server-built, but this is not a substitute for the deferred authenticated local runtime GET validation.

### Remaining implementation task (persisted checkbox is intentionally unchanged)
- [ ] **[3.2d — submitted-registration list UI; depends on: 3.2a, 3.2c; target: 245–320 changed lines]** RED in `tests/integration/admin-registration-management.test.ts`: render the authenticated list and require `AdminLayout` to expose a clear Spanish submitted-registration heading/count, the exact empty state `Todavía no hay inscripciones recibidas`, a newest-first 50-row table, keyset next-page link, notification-attention filter, canonical or unavailable historical phone presentation, and three separately named status areas—`Revisión de inscripción`, `Respuesta del participante`, and `Acuse documental por WhatsApp`—without unqualified `Confirmación`, roster language, import, comparison, or export controls. GREEN only `src/layouts/AdminLayout.astro`, `src/components/admin/RegistrationStates.astro`, `src/pages/admin/index.astro`, and `src/styles/global.css`: render the 3.2a projection and cursor/filter request values, link to persisted detail IDs, include text labels alongside status color, keyboard focus, and responsive table behavior; no detail actions or lifecycle business logic belongs here. TRIANGULATE a no-registration state, historical row, failed/uncertain attention rows, and a second page with stable cursor ordering. REFACTOR presentational status/table helpers without changing repository queries or API routes. Verify RED, GREEN, TRIANGULATE, and REFACTOR with `pnpm test -- tests/integration/admin-registration-management.test.ts && pnpm check && pnpm build`; runtime harness: request `GET /admin?attention=1` (read-only HTTP request target) and the returned keyset next-page `GET /admin?cursor=<opaque-cursor>` (read-only HTTP request target) against local fixtures, recording submitted-only rows and visible three-axis labels. Rollback boundary: `AdminLayout.astro`, `RegistrationStates.astro`, list page, global styles, and focused render tests only; no persisted data, mutation handler, roster/import/export surface, or detail page is removed. <!-- sdd-owner: implementation -->

### Deferred lifecycle actions

Parent-owned task rows remain byte-for-byte unchanged: R2 legal/content approval, R3 Turso migration, R4 Evolution document capability validation, R5 controlled deployment, and R6 bounded post-apply review.

### Workload / PR boundary

- Delivery path: `auto-chain`, `stacked-to-main`.
- Current work-unit boundary: `3.2d-admin-registration-list-ui`; authored implementation is 99 new Astro lines plus 12 CSS lines, 3 test-marker lines, and this evidence, below the 400-line budget.
- Rollback boundary: remove only `AdminLayout.astro`, `RegistrationStates.astro`, `admin/index.astro`, the appended admin CSS, and the test/progress evidence; it does not alter persisted data, repositories, mutation handlers, credentials, imports/exports, roster surfaces, or detail UI behavior.
- No commit, stage, push, review, receipt, migration, deployment, live credential use, or attempt settlement was performed.

## 2026-04-19 — Task 3.2d real local-Astro HTTP render regression
- Completed implementation-owned **3.2d** and visibly checked its persisted checkbox; removed the obsolete three-line skipped-render block, added `tests/integration/admin-astro-runtime.test.ts` (144 lines), and fixed the real filtered-count defect in `src/pages/admin/index.astro` by passing the validated list input to `repository.count(input)`; no design deviation, repository/API mutation, provider, live Turso, external request, dependency, stage, commit, or settlement occurred.
- TDD/status: authoritative `openspec` status manually reconstructed after the unavailable native CLI (`schemaName: spec-driven`, `applyState: ready`, `actionContext: repo-local`, allowed roots supplied by parent, `auto-chain`/`stacked-to-main`, native correction `proceed` held/settled by parent); safety baseline `pnpm test -- tests/integration/admin-registration-management.test.ts` was 18 files/146 passed/1 skipped; RED was the local authenticated HTTP assertion expecting 51 filtered rows but received 52; GREEN passed after the one-line count fix; TRIANGULATE passed real unauth redirect, login pre-auth/cookies/303, 52-row historical state, failed/uncertain labels, 50+1 no-duplicate keyset page preserving `attention=1`, escaped XSS text, empty state, logout CSRF/old-cookie denial, and headers; REFACTOR: none needed; final `pnpm test` was 19 files/147 passed/0 skipped, `pnpm check` 74 files/0 errors/0 warnings/0 hints, `pnpm build` passed (terms SHA-256 `215148280563df021b09b1634e63deba401cd9418a638f91a3450a8c2abe178e`; only existing local Node-26/Vercel-22 warning); runtime used only a migrated owned temporary `file:` libSQL database with fake token, disabled dispatch/update checks, then stopped Astro, closed the client, restored environment, and deleted that owned temp directory; PR boundary is `3.2d-admin-registration-list-ui` (current correction delta 145 additions/4 deletions before this four-line evidence; parent reports prior 203, so ~52 authored lines remain under 400); rollback removes the runtime test, one count argument, skip removal, and this evidence; parent-owned R2–R6 remain byte-for-byte deferred.
- [ ] **[3.2e — registration detail UI; depends on: 3.2b, 3.2c, 3.2d; target: 285–360 changed lines]** RED in `tests/integration/admin-registration-management.test.ts`: render one authenticated persisted registration detail and require normalized phone or historical-unavailable text, terms/versioned attachment link, receipt status/attempt timestamps/sanitized diagnostic, audit history, and three Spanish status areas; require distinct review and participant-response forms with current `state_version`, authenticated CSRF proof, and explicit labels, while no detail is synthesized for a non-database expected person. GREEN only `src/pages/admin/inscripciones/[id].astro`, `src/components/admin/RegistrationStates.astro`, and scoped additions in `src/styles/global.css`: consume 3.2a detail projections, render the 3.2c PRG forms and safe success/conflict feedback, show `Documento aceptado por el proveedor; entrega no verificada` for `sent`, and preserve the warning that participant response is not receipt delivery; do not add retry/reconcile controls, roster/import/comparison/export behavior, or new lifecycle writes. TRIANGULATE missing ID, stale-version feedback after a competing write, each receipt status including absent/pending attention, and audit values proving one axis did not change the others. REFACTOR detail definition-list/form presentation helpers without changing route, service, or repository contracts. Verify RED, GREEN, TRIANGULATE, and REFACTOR with `pnpm test -- tests/integration/admin-registration-management.test.ts && pnpm check && pnpm build`; runtime harness: request `GET /admin/inscripciones/<persisted-id>` (read-only HTTP request target) with a local authenticated fixture, submit a valid lifecycle form, follow its `303` redirect to `GET /admin/inscripciones/<persisted-id>` (read-only HTTP request target), and record independent statuses plus sanitized audit history. Rollback boundary: detail page, shared state component, scoped global styles, and focused render/form test cases only; lifecycle/audit records remain additive and receipt recovery is untouched. <!-- sdd-owner: implementation --> ; - [ ] **[3.3 — controlled retry and reconciliation; depends on: 3.2a, 3.2b, 3.2c, 3.2d, 3.2e]** RED in `tests/integration/admin-receipt-recovery.test.ts`: prove only failed/uncertain notifications retry on the original logical record, uncertain retries require `ackUncertain=1`, sent notifications have no normal retry action, stale in-progress leases first become uncertain, and reconcile acts only on an existing persisted registration with missing/zero-attempt/stale-pending receipt state. GREEN/TRIANGULATE/REFACTOR retry/reconcile services and `src/pages/api/admin/registrations/[id]/receipt/retry.ts`, `reconcile.ts`, plus detail forms; enforce CSRF, lease concurrency, PRG redirects, sanitized diagnostics, and no new registration. Verify `pnpm test -- tests/integration/admin-receipt-recovery.test.ts && pnpm check && pnpm build`; runtime harness: use local fixture provider to fail then retry one registration and confirm attempt count increments while registration count remains one. Rollback boundary: retry/reconcile endpoints/forms only; disable dispatch to contain future attempts while retaining historical attempts. <!-- sdd-owner: implementation --> ; - [ ] **[3.4 — configuration, hardening, and operator documentation; depends on: 2.3b, 3.1f, 3.3]** RED in `tests/unit/server-config-and-observability.test.ts`: reject missing/unsafe server configuration and assert logs/persisted diagnostics never include credentials, headers, cookies, IPs, phone, names, caption, raw provider body, or secrets. GREEN/TRIANGULATE/REFACTOR `environment.example`, `README.md`, `astro.config.mjs`, `vercel.json`, password-hash utility under `scripts/`, and server config/logging modules; document `WHATSAPP_DISPATCH_ENABLED=false` containment, independent credential rotation, profile-fingerprint validation, PDF immutability, and the migration command warning. Verify `pnpm test -- tests/unit/server-config-and-observability.test.ts && pnpm check && pnpm build`; runtime harness: start with dispatch disabled and confirm startup/config parsing exposes no secret values. Rollback boundary: configuration/docs/header hardening and utility script; preserve safe disabled-dispatch defaults. <!-- sdd-owner: implementation -->
## 2026-09-05 — Task 3.2e registration detail UI
- Status: authoritative OpenSpec `ready/apply`; parent-native `proceed` (fresh 21/29), strict TDD, `repo-local`, allowed surfaces honored, `auto-chain`/`stacked-to-main`; CodeGraph MCP initialization failed, so scoped direct reads were used.
- Completed/persisted: implementation-owned **3.2e** is visibly `- [x]`; new registration-rooted detail renders escaped persisted PII/historical phone, independent Spanish axes, immutable HTTPS-only PDF links, receipt attempts/safe diagnostics, allowlisted audit values, distinct CSRF/versioned forms, and no retry/reconcile control.
- TDD Cycle Evidence: safety 19 files/147; RED real local authenticated GET detail expected 200 but received 404; GREEN 19/147; TRIANGULATE exercised invalid-CSRF 403 → review 303 → refreshed version → stale other axis 409 → participant 303, missing 404, XSS, JavaScript-link rejection, every receipt state, and independent audit values; REFACTOR added scoped detail/mobile CSS and reran 19/147.
- Verification: `pnpm test -- tests/integration/admin-astro-runtime.test.ts`, `pnpm check` (75 files/0 diagnostics), full `pnpm test` (19 files/147), and `pnpm build` passed; local migrated `file:` libSQL/Astro HTTP only, no production calls/credentials, with the existing Node 26→Vercel 22 warning.
- Boundary/remaining: baseline `/tmp/bdb-3.2e-detail-baseline-20260905T142947Z/surfaces.tar` SHA-256 `4a83221e5a9c682cd752fd57d44b10d9de25d858cff73c5119d2bd0c94c2764b`; current delta before this six-line entry +200/-2 (202 physical), rollback is detail/CSS/runtime-test/task/progress only; remaining implementation rows are 3.3 and 3.4, and parent-owned R2–R6 remain deferred byte-for-byte.
## 2026-09-05 — Task 3.3a trigger-aware leases and stale settlement
| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 3.3a | `receipt-lease-finalization`, `receipt-dispatch-outcomes`, `receipt-caption-and-service` | local-libSQL integration/unit | 19 files/147 tests passed | 4 failures proved stale/automatic replay regressions | 19 files/150 passed | rollback-on-second-statement failure plus explicit reconcile/retry and failed/uncertain HTTP replay, 19 files/151 passed | No further duplication found; final rerun stayed green |
- Status: authoritative OpenSpec `ready/apply`, strict TDD, `repo-local`; parent supplied native fresh `22/31` `proceed` with max `2/400` and owns settlement; only its allowlisted notification/test/task/progress surfaces were edited, `auto-chain`/`stacked-to-main` PR boundary is `3.3a-trigger-aware-leases`.
- Completed/persisted: checked implementation task **3.3a**; `registration-receipts.ts` adds `ReceiptAttemptTrigger`, `claim(key, trigger = 'automatic')`, `settleExpired(key)`, a documented 30,000-ms lease (15-s provider maximum plus DB margin), atomic latest-attempt CAS settlement/rollback, and no expired-lease reclaim; `receipt-service.ts` forwards its explicit trigger default; focused tests now require `admin_retry` and prove trigger history, stale-owner denial, rollback, and signup replay zero extra sends/attempts after failed/uncertain outcomes. Verification: RED 4 failures; focused/full `pnpm test` 19 files/151 tests passed; `pnpm check` 75 files/0 diagnostics; `pnpm build` passed with terms SHA `215148280563df021b09b1634e63deba401cd9418a638f91a3450a8c2abe178e` and only the existing Node-26/Vercel-22 warning; runtime was injected local in-memory libSQL/local fixture only, no provider call. No design deviation; remaining persisted unchecked implementation rows are `- [ ] 3.3b`, `- [ ] 3.3c`, and `- [ ] 3.4`, while parent-owned R2–R6 remain deferred byte-for-byte; rollback removes only the listed lease/service/test changes, and source baseline `/tmp/add-admin-whatsapp-confirmation-2.4-baseline.J6MbWg` (registration-receipts SHA-256 `c7f3bb6eddcd3e3dc2f910b288d8e26ed2e21511a662d33fe911f563fcc13247`, receipt-service `48e5002a001f83ffd6e139bbf67b1bec43f520f85dc9b2a5da5e5ea0018ebd4f`) measures source at +65/-27; the pre-3.3a lease-test baseline was not persisted because these files are untracked, so no dishonest aggregate line count is claimed; the source slice is below 400 lines.

## 2026-09-05 — Task 3.3b registration-rooted receipt recovery
- Status/action context: consumed authoritative OpenSpec `applyState: ready` (`23/31` before this checkbox), `repo-local` workspace root with the parent’s exact allowlist; parent supplied native fresh `proceed` (`max 2/400`) and owns settlement; `auto-chain`/`stacked-to-main` boundary is `3.3b-registration-rooted-recovery-policy`.
- Completed/persisted: implementation-owned **3.3b** is visibly `- [x]`; `createReceiptRecoveryService` returns only `accepted|conflict|notfound|invalid|unavailable`, roots lookup in `barber_signups`, permits no client logical key or new registration, requires exact `ackUncertain === '1'`, rejects sent/not-required/unknown rows, settles stale pending to `uncertain` without sending that action, and retains the same notification identity for retry.
- Interfaces: `getDraftTermsByVersion(version)` is an exact-version resolver with no current-version fallback; `RegistrationRecord.termsVersion` and `ReceiptNotificationRepository.getByRegistrationAndVersion()` expose only bounded recovery state; every candidate matches persisted URL, filename, MIME, SHA-256, and caption against the injected canonical HTTPS origin before an injected messenger can run.
- TDD Cycle Evidence: safety baseline `pnpm test -- tests/integration/receipt-lease-finalization.test.ts` and `receipt-dispatch-outcomes.test.ts` was 151 passing; RED `pnpm test -- tests/integration/admin-receipt-recovery.test.ts` failed on the absent recovery service; GREEN was 152 passing; TRIANGULATE covered exact acknowledgement, sent/non-required/unknown denial, missing-snapshot repair while unavailable, unknown manifest/non-HTTPS origin zero side effects, stale separate retry, and concurrent loser zero sends (156 passing); REFACTOR renamed stale settlement intent and reran 156 passing.
- Verification/runtime: focused test, full `pnpm test` (20 files/156 tests), `pnpm check` (77 files/0 diagnostics), and `pnpm build` passed; build verified terms SHA `215148280563df021b09b1634e63deba401cd9418a638f91a3450a8c2abe178e` and emitted only the existing Node-26/Vercel-22 warning. The runtime harness is real local in-memory libSQL plus injected fake messengers, with no Turso, provider, staging, live credential, commit, review, or settlement action.
- Files/boundary: `receipt-recovery-service.ts`, `registration-receipts.ts`, `registrations/repository.ts`, `draft-terms-manifest.ts`, and `admin-receipt-recovery.test.ts`, plus this checkbox/progress artifact; no routes, detail controls, immutable PDF bytes, generic audit stream, or registration creation changed. The new recovery service/test are 200 physical lines; supporting bounded projection/resolver changes and this evidence remain below the 400-line work-unit budget. Rollback removes only those policy/projection/resolver/test changes while retaining additive rows.
- [ ] **[3.3c — authenticated recovery routes, PRG, and detail controls; depends on: 3.3b; target: 325–395 changed lines]** RED in `tests/integration/admin-receipt-recovery-routes.test.ts` and `tests/integration/admin-registration-management.test.ts`: invoke `POST /api/admin/registrations/[id]/receipt/retry` (read-only HTTP request target) and `POST /api/admin/registrations/[id]/receipt/reconcile` (read-only HTTP request target) with authenticated local fixtures; require same-origin/authenticated-CSRF checks before recovery service calls, `ackUncertain=1` for uncertain retry, retry denial for `sent`, safe no-op/conflict/missing outcomes, and `303` Post/Redirect/Get to `GET /admin/inscripciones/[id]` (read-only HTTP request target). Require the registration-rooted read model and detail page to show attempt trigger history, “Pendiente vencido — resultado incierto” only while stale settlement needs action, clear duplicate-send warning/acknowledgement for uncertain retry, separate missing/zero-attempt pending reconciliation action, and no stale implicit-claim control. GREEN only `src/pages/api/admin/registrations/[id]/receipt/retry.ts`, `src/pages/api/admin/registrations/[id]/receipt/reconcile.ts`, `src/lib/server/admin/registration-read-repository.ts`, `src/lib/server/admin/registration-presentation.ts`, `src/pages/admin/inscripciones/[id].astro`, scoped `src/styles/global.css`, and focused tests: use the existing authenticated form/local HTTP harness, route only to the 3.3b service, render Spanish detail controls from persisted registration/receipt state, and expose no generic audit UI or roster behavior. TRIANGULATE failed retry, acknowledged uncertain retry, absent notification reconcile, zero-attempt pending reconcile, stale settlement followed by acknowledgement retry, and a competing request returning `409` without a provider call; REFACTOR PRG/detail-control helpers without altering lifecycle forms or creating another audit type. Verify RED, GREEN, TRIANGULATE, and REFACTOR with `pnpm test -- tests/integration/admin-receipt-recovery-routes.test.ts tests/integration/admin-registration-management.test.ts && pnpm check && pnpm build`; runtime harness: use the existing local authenticated-form HTTP harness to submit each recovery form, follow its `303` to `GET /admin/inscripciones/[id]` (read-only HTTP request target), and record one registration, preserved immutable version, trigger history, and no external provider request. Rollback boundary: two recovery routes, registration-rooted read/presentation additions, detail controls/styles, and focused route/render tests only; disable dispatch to contain future sends while notification/attempt history remains intact. <!-- sdd-owner: implementation -->
- [ ] **[3.4 — configuration, hardening, and operator documentation; depends on: 2.3b, 3.1f, 3.3c]** RED in `tests/unit/server-config-and-observability.test.ts`: reject missing/unsafe server configuration and assert logs/persisted diagnostics never include credentials, headers, cookies, IPs, phone, names, caption, raw provider body, or secrets. GREEN/TRIANGULATE/REFACTOR `environment.example`, `README.md`, `astro.config.mjs`, `vercel.json`, password-hash utility under `scripts/`, and server config/logging modules; document `WHATSAPP_DISPATCH_ENABLED=false` containment, independent credential rotation, profile-fingerprint validation, PDF immutability, and the migration command warning. Verify `pnpm test -- tests/unit/server-config-and-observability.test.ts && pnpm check && pnpm build`; runtime harness: start with dispatch disabled and confirm startup/config parsing exposes no secret values. Rollback boundary: configuration/docs/header hardening and utility script; preserve safe disabled-dispatch defaults. <!-- sdd-owner: implementation -->
- Deferred lifecycle actions remain byte-for-byte parent-owned: R2 legal/content approval, R3 Turso migration, R4 Evolution capability, R5 controlled deployment, and R6 bounded review.
- Deviations from design: none; the manifest resolver is intentionally exact-version only and recovery routes/detail controls remain deferred to 3.3c.

## 2026-09-05 — Task 3.3b atomic recovery-claim TOCTOU correction

### Structured status consumed

```yaml
schemaName: spec-driven
changeName: add-admin-whatsapp-confirmation
artifactStore: openspec
planningHome:
  root: /home/charlydev/Projects/DEV/batalla-de-barberos/openspec
  changesDir: /home/charlydev/Projects/DEV/batalla-de-barberos/openspec/changes
changeRoot: /home/charlydev/Projects/DEV/batalla-de-barberos/openspec/changes/add-admin-whatsapp-confirmation
artifacts:
  proposal: done
  specs: done
  design: done
  tasks: done
  applyProgress: partial
  verifyReport: missing
  syncReport: missing
taskProgress:
  total: 25
  complete: 23
  remaining: 2
deferredParentActions:
  total: 6
  complete: 1
  remaining: 5
taskArtifactErrors: []
applyState: ready
dependencies:
  apply: ready
  verify: ready
  sync: blocked
  archive: blocked
actionContext:
  mode: repo-local
  workspaceRoot: /home/charlydev/Projects/DEV/batalla-de-barberos
  allowedEditRoots:
    - src/lib/server/admin/receipt-recovery-service.ts
    - src/lib/server/notifications/registration-receipts.ts
    - src/lib/server/notifications/receipt-service.ts
    - tests/integration/admin-receipt-recovery.test.ts
    - tests/integration/receipt-lease-finalization.test.ts
    - tests/unit/receipt-caption-and-service.test.ts
    - openspec/changes/add-admin-whatsapp-confirmation/tasks.md
    - openspec/changes/add-admin-whatsapp-confirmation/apply-progress.md
  warnings:
    - Native status CLI was unavailable; this authoritative OpenSpec status was reconstructed from the required artifacts and persisted task rows.
    - Parent owns attempt settlement, reviews, delivery gates, and all parent-owned task rows.
nextRecommended: apply
isNonAuthoritative: false
```

### Completed corrective work

- Corrected task **3.3b** without changing its already-visible persisted `- [x]` checkbox.
- Added a narrow typed claim precondition path from recovery policy through `ReceiptService` to the SQL claim CAS.
- The atomic update now compares the validated notification status, attempt count, registration ID, terms version, media URL, filename, MIME type, SHA-256, and caption; it also reasserts the live registration has `receipt_required = 1` and the same terms version.
- `admin_retry` now permits `uncertain` only when the atomic claim receives `acknowledgeUncertain: true`; failed retries retain their existing safe contract and automatic claims retain their default behavior.
- The real local-libSQL injected-barrier regression creates an intervening failed-to-uncertain attempt after policy validation. The original recovery returns `conflict`, makes zero recovery sends, and cannot create a duplicate claim; a separately acknowledged retry then succeeds.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 3.3b TOCTOU correction | `tests/integration/admin-receipt-recovery.test.ts`, `tests/integration/receipt-lease-finalization.test.ts` | Real local-libSQL integration | 156/156 passed before RED | Recovery returned `accepted` instead of required `conflict`; direct unacknowledged uncertain claim was non-null | Both guarded paths passed | Intervening real attempt advanced count `1 → 2` and status `failed → uncertain`; recovery sent zero, while explicit acknowledgement safely created attempt 3 | No duplication remained after the narrow precondition propagation; focused suite rerun passed |

### Verification

- `pnpm test -- tests/integration/admin-receipt-recovery.test.ts` — RED: 1 failing test / 156 passing; final: 20 files, 157 tests passed.
- `pnpm test -- tests/integration/receipt-lease-finalization.test.ts` — RED: unacknowledged uncertain retry incorrectly claimed; final: 20 files, 157 tests passed.
- `pnpm test -- tests/unit/receipt-caption-and-service.test.ts` — 20 files, 157 tests passed.
- `pnpm test` — 20 files, 157 tests passed.
- `pnpm check` — 77 files, 0 errors, 0 warnings, 0 hints.
- `pnpm build` — passed; immutable terms SHA-256 remained `215148280563df021b09b1634e63deba401cd9418a638f91a3450a8c2abe178e`. The existing local Node 26/Vercel Node 22 compatibility warning remained.
- Runtime harness: real disposable local in-memory libSQL plus injected fake messenger only; no Turso, Evolution, staging, live credentials, external calls, stage, commit, review, or settlement occurred.

### Scope, counts, and boundary

- Correction work unit: `3.3b-atomic-recovery-claim-toctou`, delivered under parent-approved `auto-chain` / `stacked-to-main`, max 2 / 400; no size exception.
- The scoped correction is below 100 changed source/test lines and below the 400-line work-unit budget. The affected notification files are already untracked in this worktree, so Git cannot produce a truthful isolated baseline diff for them; the pre-correction safety baseline was 156 passing tests and the post-correction total is 157.
- Files changed: `receipt-recovery-service.ts`, `registration-receipts.ts`, `receipt-service.ts`, `admin-receipt-recovery.test.ts`, and `receipt-lease-finalization.test.ts`, plus this cumulative progress artifact. `receipt-caption-and-service.test.ts` was safety-checked only.
- Rollback boundary: remove the recovery claim preconditions, SQL predicates, acknowledgement gate, and the two corrective regression assertions; retain additive notification/attempt history and all unrelated recovery behavior.
- Deviations from design: none. No generic framework, route, detail control, current-terms substitution, new registration, provider payload, audit stream, or live operation was introduced.

### Remaining implementation tasks (exact persisted unchecked rows)
- [ ] **[3.3c — authenticated recovery routes, PRG, and detail controls; depends on: 3.3b; target: 325–395 changed lines]** RED in `tests/integration/admin-receipt-recovery-routes.test.ts` and `tests/integration/admin-registration-management.test.ts`: invoke `POST /api/admin/registrations/[id]/receipt/retry` (read-only HTTP request target) and `POST /api/admin/registrations/[id]/receipt/reconcile` (read-only HTTP request target) with authenticated local fixtures; require same-origin/authenticated-CSRF checks before recovery service calls, `ackUncertain=1` for uncertain retry, retry denial for `sent`, safe no-op/conflict/missing outcomes, and `303` Post/Redirect/Get to `GET /admin/inscripciones/[id]` (read-only HTTP request target). Require the registration-rooted read model and detail page to show attempt trigger history, “Pendiente vencido — resultado incierto” only while stale settlement needs action, clear duplicate-send warning/acknowledgement for uncertain retry, separate missing/zero-attempt pending reconciliation action, and no stale implicit-claim control. GREEN only `src/pages/api/admin/registrations/[id]/receipt/retry.ts`, `src/pages/api/admin/registrations/[id]/receipt/reconcile.ts`, `src/lib/server/admin/registration-read-repository.ts`, `src/lib/server/admin/registration-presentation.ts`, `src/pages/admin/inscripciones/[id].astro`, scoped `src/styles/global.css`, and focused tests: use the existing authenticated form/local HTTP harness, route only to the 3.3b service, render Spanish detail controls from persisted registration/receipt state, and expose no generic audit UI or roster behavior. TRIANGULATE failed retry, acknowledged uncertain retry, absent notification reconcile, zero-attempt pending reconcile, stale settlement followed by acknowledgement retry, and a competing request returning `409` without a provider call; REFACTOR PRG/detail-control helpers without altering lifecycle forms or creating another audit type. Verify RED, GREEN, TRIANGULATE, and REFACTOR with `pnpm test -- tests/integration/admin-receipt-recovery-routes.test.ts tests/integration/admin-registration-management.test.ts && pnpm check && pnpm build`; runtime harness: use the existing local authenticated-form HTTP harness to submit each recovery form, follow its `303` to `GET /admin/inscripciones/[id]` (read-only HTTP request target), and record one registration, preserved immutable version, trigger history, and no external provider request. Rollback boundary: two recovery routes, registration-rooted read/presentation additions, detail controls/styles, and focused route/render tests only; disable dispatch to contain future sends while notification/attempt history remains intact. <!-- sdd-owner: implementation -->
- [ ] **[3.4 — configuration, hardening, and operator documentation; depends on: 2.3b, 3.1f, 3.3c]** RED in `tests/unit/server-config-and-observability.test.ts`: reject missing/unsafe server configuration and assert logs/persisted diagnostics never include credentials, headers, cookies, IPs, phone, names, caption, raw provider body, or secrets. GREEN/TRIANGULATE/REFACTOR `environment.example`, `README.md`, `astro.config.mjs`, `vercel.json`, password-hash utility under `scripts/`, and server config/logging modules; document `WHATSAPP_DISPATCH_ENABLED=false` containment, independent credential rotation, profile-fingerprint validation, PDF immutability, and the migration command warning. Verify `pnpm test -- tests/unit/server-config-and-observability.test.ts && pnpm check && pnpm build`; runtime harness: start with dispatch disabled and confirm startup/config parsing exposes no secret values. Rollback boundary: configuration/docs/header hardening and utility script; preserve safe disabled-dispatch defaults. <!-- sdd-owner: implementation -->

### Deferred lifecycle actions

Parent-owned rows remain byte-for-byte unchanged: R2 legal/content approval, R3 Turso migration, R4 Evolution document capability validation, R5 controlled deployment, and R6 bounded post-apply review.

## 2026-09-05 — Task 3.3c close
- Canonical recovery route helper already uses production `CANONICAL_SITE_ORIGIN`, routes only to recovery policy after same-origin/session/CSRF checks, and exposes no sent or stale implicit-claim control; fixed only test trailing whitespace and the task's test-path drift.
- `pnpm test` passed 20 files/163 tests, `pnpm check`, `pnpm build`, and `git diff --check` passed; 3.3c remains visibly `- [x]`, no provider, live service, dev-server, stage, commit, review, or settlement action occurred.

## 2026-09-05 — Task 3.4a canonical server configuration and redacted observability
- Status: manual authoritative OpenSpec `ready/apply` (native CLI unavailable), `artifactStore: openspec`, `taskProgress: 25/26`, `repo-local` under the parent’s listed roots, strict TDD, parent-held `proceed`/settlement, and `auto-chain`/`stacked-to-main`; warnings: no source outside the allowlist and parent owns lifecycle gates.
- Completed/persisted: **3.4a** is visibly `- [x]`; typed config canonicalizes configured origins, rejects production path/query/hash/credential and missing origin before database construction, allows only non-production injected fallback, and independently reports admin/database/dispatch readiness; signup snapshots use config origin and safe diagnostics copy only validated allowlist fields. Files: `config.ts`, new `safe-diagnostics.ts`, signup API, env types, and focused tests; scope deviation: the allowed surface used safe-diagnostics/API wiring while existing receipt persistence already stores static diagnostics.
- TDD Cycle Evidence: safety `163/163`; RED missing safe-diagnostics import (163 pass/1 suite failed), then canonical/diagnostic assertions passed `170/170`; integration RED had five expected legacy-origin/diagnostic failures, GREEN `171/171`; TRIANGULATE covered hostile Host, production 503-before-DB construction, disabled/incomplete dispatch, tainted configuration/database/provider failures `174/174`; encoded-path RED (`https://example.test/%2e`) then canonical raw-origin guard GREEN/REFACTOR `175/175`.
- Verification/runtime: `pnpm test` passed `21 files/175 tests`; `pnpm check` passed `82 files/0 errors/0 warnings/0 hints`; `pnpm build` passed with immutable terms SHA `215148280563df021b09b1634e63deba401cd9418a638f91a3450a8c2abe178e` (only Node 26→Vercel 22 warning); local Astro/local-libSQL and injected provider paths only, no Turso, provider, staging, commit, or settlement.
    - [ ] **[3.4b — provisioning utility, operator documentation, and safe delivery headers; depends on: 3.4a; target: 300–390 changed lines]** RED in `tests/unit/server-config-and-observability.test.ts` and `tests/integration/deployment-headers.test.ts`: require the password-hash CLI to read plaintext only from stdin, emit only the required default `scrypt$v1$N=32768,r=8,p=1` hash, and reject password argv/options; require `environment.example` to enumerate exactly `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `ADMIN_PASSWORD_HASH`, `ADMIN_SESSION_SECRET_B64`, `CANONICAL_SITE_ORIGIN`, `WHATSAPP_DISPATCH_ENABLED`, `EVOLUTION_API_BASE_URL`, `EVOLUTION_API_INSTANCE`, `EVOLUTION_API_KEY`, `EVOLUTION_API_SEND_DOCUMENT_PATH_TEMPLATE`, `EVOLUTION_API_AUTH_HEADER`, `EVOLUTION_API_AUTH_SCHEME`, `EVOLUTION_API_DESTINATION_FIELD_PATH`, `EVOLUTION_API_MEDIA_URL_FIELD_PATH`, `EVOLUTION_API_FILENAME_FIELD_PATH`, `EVOLUTION_API_MIME_TYPE_FIELD_PATH`, `EVOLUTION_API_CAPTION_FIELD_PATH`, `EVOLUTION_API_MEDIA_KIND_FIELD_PATH`, `EVOLUTION_API_MEDIA_KIND_VALUE`, `EVOLUTION_API_DESTINATION_FORMAT`, `EVOLUTION_API_ACCEPTED_HTTP_STATUSES`, `EVOLUTION_API_SUCCESS_MODE`, `EVOLUTION_API_RESULT_FIELD_PATH`, `EVOLUTION_API_ACCEPTED_VALUES`, `EVOLUTION_API_MEDIA_REJECTED_VALUES`, `EVOLUTION_API_URL_ONLY_VALUES`, `EVOLUTION_API_MESSAGE_ID_PATH`, `EVOLUTION_API_IDEMPOTENCY_HEADER`, `EVOLUTION_API_TIMEOUT_MS`, and `EVOLUTION_API_VALIDATED_PROFILE_SHA256`, with no values that enable dispatch and no invented throttle key; require global headers to retain existing asset-compatible behavior while protected admin responses retain their route-specific protections, and require the immutable PDF path to serve `application/pdf` with `Cache-Control: public, max-age=31536000, immutable` without a CSP that breaks Astro/Vercel assets. GREEN only `scripts/generate-admin-password-hash.mjs`, `environment.example`, `README.md`, `astro.config.mjs`, `vercel.json`, and the two focused tests: provide an interactive stdin-only hash utility that reuses the production password module/crypto defaults and never logs plaintext; document exact environment names, preview/local disabled-dispatch posture, `CANONICAL_SITE_ORIGIN`, profile-fingerprint validation, independent password/session/Turso/Evolution credential rotation, backup confirmation and explicitly selected-target warning before `pnpm migrate`, immutable-version terms correction, and incident containment; configure only safe global/static headers and the versioned PDF immutable cache policy. TRIANGULATE empty/non-TTY stdin, forbidden password arguments, profile fingerprint change/revalidation, rotation isolation, a backup-before-migration operator walkthrough, old-PDF retention after a new immutable terms version, PDF `GET`/`HEAD`, and representative Astro static asset requests; REFACTOR CLI/documentation/header declarations without adding a provider text fallback or weakening protected-route no-store/frame/referrer protections. Verify RED, GREEN, TRIANGULATE, and REFACTOR with `pnpm test -- tests/unit/server-config-and-observability.test.ts tests/integration/deployment-headers.test.ts && pnpm check && pnpm build`; runtime harness: pipe a non-production fixture password to the CLI, inspect only its hash-format result, then issue read-only HTTP `GET`/`HEAD` requests to `/documentos/bases-y-categorias/borrador-2026-09-v1.pdf` (read-only) and representative static assets, recording PDF MIME/immutable cache headers and no broken asset response. Rollback boundary: `scripts/generate-admin-password-hash.mjs`, `environment.example`, `README.md`, `astro.config.mjs`, `vercel.json`, and the two focused tests only; retain safe disabled-dispatch defaults, existing static headers, and published immutable PDF bytes. <!-- sdd-owner: implementation --> | Workload/PR boundary: `3.4a-canonical-config-observability`, `+343/-29` source/test/config/task delta before this six-line progress entry plus six progress lines (`349` additions), within 400; baseline `/tmp/add-admin-whatsapp-confirmation-3.4a-before-20260905T132830Z.tar` SHA-256 `acf701b6a60af387cac9824e2a204cefb9616c64393ac46372d6ca8c95d0e9d6`; rollback removes only this slice’s listed files, and parent rows R2–R6 remain byte-for-byte deferred.

## 2026-09-05 — 3.4a exported `POST` wrapper coverage correction

### Structured status consumed

```yaml
schemaName: spec-driven
changeName: add-admin-whatsapp-confirmation
artifactStore: openspec
artifacts: {proposal: done, specs: done, design: done, tasks: done, applyProgress: partial}
taskProgress: {total: 26, complete: 25, remaining: 1}
deferredParentActions: {total: 6, complete: 1, remaining: 5}
taskArtifactErrors: []
applyState: ready
dependencies: {apply: ready, verify: ready, sync: blocked, archive: blocked}
actionContext:
  mode: repo-local
  workspaceRoot: /home/charlydev/Projects/DEV/batalla-de-barberos
  allowedEditRoots: [tests/integration/signup-orchestration.test.ts, src/pages/api/signups.ts, openspec/changes/add-admin-whatsapp-confirmation/tasks.md, openspec/changes/add-admin-whatsapp-confirmation/apply-progress.md]
  warnings: ["Native status command is unavailable; status was reconstructed from authoritative OpenSpec artifacts.", "Parent owns attempt settlement and lifecycle gates."]
nextRecommended: apply
isNonAuthoritative: false
```

### Completed coverage work

- Added one integration regression that invokes the actual exported `POST` wrapper, with only `getDatabase` mocked at its module boundary and a real local in-memory libSQL database.
- In production mode, a configured `https://public.example.test` canonical origin persists the immutable PDF URL despite the `https://attacker.example.test` request origin; disabled dispatch makes zero `fetch` calls.
- Missing and path-unsafe production origins each return `503` before `getDatabase`; the test restores `NODE_ENV`, `CANONICAL_SITE_ORIGIN`, and `WHATSAPP_DISPATCH_ENABLED`, resets the database mock, and restores spies.
- Task **3.4a** was already visibly `- [x]`; no checkbox changed. No production source change was needed because the wrapper behavior was already correct.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 3.4a wrapper coverage correction | `tests/integration/signup-orchestration.test.ts` | Integration/local libSQL | 21 files, 175 tests passed | N/A — existing behavior was correct and the user directed coverage-only regression rather than a fabricated failure | 21 files, 176 tests passed | One wrapper test covers configured hostile-origin persistence plus missing and unsafe `503` pre-DB paths | None needed; no production code changed |

### Verification, scope, and boundary

- `pnpm test -- tests/integration/signup-orchestration.test.ts` — 21 files, 176 tests passed; the configured runner collects the full suite.
- `pnpm test` — 21 files, 176 tests passed; `pnpm check` — 82 files, 0 errors, 0 warnings, 0 hints; `pnpm build` — passed with immutable terms SHA-256 `215148280563df021b09b1634e63deba401cd9418a638f91a3450a8c2abe178e` and only the pre-existing local Node 26/Vercel Node 22 warning.
- Files changed by this correction: `tests/integration/signup-orchestration.test.ts` and this cumulative progress artifact; a temporary reconstructed baseline reports the test-file correction as `+55/-3`, under 100 changed lines. No source, task, provider, dev server, live credential, commit, review, receipt, or settlement action occurred. The wrapper regression is one test; full-suite count increased exactly from 175 to 176.
- Work-unit/PR boundary: `3.4a-exported-post-wrapper-coverage`, parent-authorized `auto-chain`/`stacked-to-main`, under the 100-line correction and 400-line budget; rollback removes only the hoisted database mock, environment helper, and wrapper regression. Deviations from design: none.

### Remaining implementation tasks (exact persisted unchecked rows)
    - [ ] **[3.4b — provisioning utility, operator documentation, and safe delivery headers; depends on: 3.4a; target: 300–390 changed lines]** RED in `tests/unit/server-config-and-observability.test.ts` and `tests/integration/deployment-headers.test.ts`: require the password-hash CLI to read plaintext only from stdin, emit only the required default `scrypt$v1$N=32768,r=8,p=1` hash, and reject password argv/options; require `environment.example` to enumerate exactly `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `ADMIN_PASSWORD_HASH`, `ADMIN_SESSION_SECRET_B64`, `CANONICAL_SITE_ORIGIN`, `WHATSAPP_DISPATCH_ENABLED`, `EVOLUTION_API_BASE_URL`, `EVOLUTION_API_INSTANCE`, `EVOLUTION_API_KEY`, `EVOLUTION_API_SEND_DOCUMENT_PATH_TEMPLATE`, `EVOLUTION_API_AUTH_HEADER`, `EVOLUTION_API_AUTH_SCHEME`, `EVOLUTION_API_DESTINATION_FIELD_PATH`, `EVOLUTION_API_MEDIA_URL_FIELD_PATH`, `EVOLUTION_API_FILENAME_FIELD_PATH`, `EVOLUTION_API_MIME_TYPE_FIELD_PATH`, `EVOLUTION_API_CAPTION_FIELD_PATH`, `EVOLUTION_API_MEDIA_KIND_FIELD_PATH`, `EVOLUTION_API_MEDIA_KIND_VALUE`, `EVOLUTION_API_DESTINATION_FORMAT`, `EVOLUTION_API_ACCEPTED_HTTP_STATUSES`, `EVOLUTION_API_SUCCESS_MODE`, `EVOLUTION_API_RESULT_FIELD_PATH`, `EVOLUTION_API_ACCEPTED_VALUES`, `EVOLUTION_API_MEDIA_REJECTED_VALUES`, `EVOLUTION_API_URL_ONLY_VALUES`, `EVOLUTION_API_MESSAGE_ID_PATH`, `EVOLUTION_API_IDEMPOTENCY_HEADER`, `EVOLUTION_API_TIMEOUT_MS`, and `EVOLUTION_API_VALIDATED_PROFILE_SHA256`, with no values that enable dispatch and no invented throttle key; require global headers to retain existing asset-compatible behavior while protected admin responses retain their route-specific protections, and require the immutable PDF path to serve `application/pdf` with `Cache-Control: public, max-age=31536000, immutable` without a CSP that breaks Astro/Vercel assets. GREEN only `scripts/generate-admin-password-hash.mjs`, `environment.example`, `README.md`, `astro.config.mjs`, `vercel.json`, and the two focused tests: provide an interactive stdin-only hash utility that reuses the production password module/crypto defaults and never logs plaintext; document exact environment names, preview/local disabled-dispatch posture, `CANONICAL_SITE_ORIGIN`, profile-fingerprint validation, independent password/session/Turso/Evolution credential rotation, backup confirmation and explicitly selected-target warning before `pnpm migrate`, immutable-version terms correction, and incident containment; configure only safe global/static headers and the versioned PDF immutable cache policy. TRIANGULATE empty/non-TTY stdin, forbidden password arguments, profile fingerprint change/revalidation, rotation isolation, a backup-before-migration operator walkthrough, old-PDF retention after a new immutable terms version, PDF `GET`/`HEAD`, and representative Astro static asset requests; REFACTOR CLI/documentation/header declarations without adding a provider text fallback or weakening protected-route no-store/frame/referrer protections. Verify RED, GREEN, TRIANGULATE, and REFACTOR with `pnpm test -- tests/unit/server-config-and-observability.test.ts tests/integration/deployment-headers.test.ts && pnpm check && pnpm build`; runtime harness: pipe a non-production fixture password to the CLI, inspect only its hash-format result, then issue read-only HTTP `GET`/`HEAD` requests to `/documentos/bases-y-categorias/borrador-2026-09-v1.pdf` (read-only) and representative static assets, recording PDF MIME/immutable cache headers and no broken asset response. Rollback boundary: `scripts/generate-admin-password-hash.mjs`, `environment.example`, `README.md`, `astro.config.mjs`, `vercel.json`, and the two focused tests only; retain safe disabled-dispatch defaults, existing static headers, and published immutable PDF bytes. <!-- sdd-owner: implementation -->

### Deferred lifecycle actions

Parent-owned rows remain byte-for-byte unchanged: R2 legal/content approval, R3 Turso migration, R4 Evolution document capability validation, R5 controlled deployment, and R6 bounded post-apply review.

## 2026-09-05 — Task 3.4b provisioning, documentation, and headers
- Status: authoritative OpenSpec `ready/apply` consumed from required artifacts; parent supplied `native fresh ready 26/32`, `acquire proceed`, `max 2/400`, `auto-chain`/`stacked-to-main`, and retains settlement; repo-local allowlist honored (CodeGraph MCP was unavailable after index detection).
- Completed/persisted: implementation task **3.4b** is `- [x]`; shared Node-20-compatible `.mjs` scrypt implementation now powers typed production verification and the stdin-only CLI, while env/docs enumerate real names, disabled dispatch, migration/rotation/immutable-PDF/uncertain-retry operations, and Vercel declares safe global/PDF headers.
- TDD Cycle Evidence: RED `pnpm test -- tests/unit/server-config-and-observability.test.ts` failed (missing CLI/env/header declarations); GREEN passed 178 tests; TRIANGULATE added non-TTY no-final-newline, CRLF, empty/multiple/oversized input and forbidden-argv coverage (179 passed); REFACTOR centralized crypto defaults and reran focused tests (179 passed).
- Verification: focused and full `pnpm test` 21 files/179 tests passed; `pnpm check` 84 files/0 diagnostics; `pnpm build` passed with terms SHA `215148280563df021b09b1634e63deba401cd9418a638f91a3450a8c2abe178e` and only the pre-existing Node-26→Vercel-22 warning; CLI pipe emitted one redacted canonical hash and forbidden argv emitted no stdout/plaintext.
- Files: `password.ts`, two password scripts, unit config test, `package.json`, `environment.example`, `README.md`, and `vercel.json`; no Astro-config change, credentials, install, provider, migration, deployment, stage, commit, review, receipt, or settlement; deployment-header runtime GET/HEAD remains parent-owned because no Vercel emulator/deploy is permitted.
- Boundary: `3.4b-provisioning-docs-headers`, baseline `/tmp/add-admin-whatsapp-confirmation-3.4b-baseline-20260905T165853Z/surfaces.tar` SHA-256 `9caa5755053d4cf3c565b177b863fc2c2764a88c9adfb480958e7caca0a4feb0`, +265/-30 before checkbox/evidence (under 400); no deviation, no implementation rows remain unchecked, and parent-owned R2–R6 remain deferred byte-for-byte.
| Task | TDD Cycle Evidence |
| --- | --- |
| 3.4b documentation/header correction | Status: parent-provided native correction `proceed`, authoritative OpenSpec artifacts (`openspec`, `repo-local`, `auto-chain`/`stacked-to-main`) and allowed roots consumed; normal task state is 26/26 implementation rows checked, with 3.4b re-read visibly `- [x]` and parent R2–R6 unchanged/deferred. Safety: 21 files/179 tests; RED: the new README canonical-operations assertion failed; GREEN: early setup now links the complete operations section and requires an explicitly selected target plus backup/branch; TRIANGULATE: `vercel.json` exact PDF declaration and local Astro PDF GET/HEAD MIME/bytes SHA-256 `215148280563df021b09b1634e63deba401cd9418a638f91a3450a8c2abe178e` plus stylesheet retrieval passed; REFACTOR: removed one blank line and reran. Files: `README.md`, `tests/unit/server-config-and-observability.test.ts`, new `tests/integration/deployment-headers.test.ts`, this progress artifact; scoped correction is +74/-21 = 95 lines (prior 305 + 95 = 400), rollback removes only these. Node 22.23.2 validation: `pnpm test` 22/181, `pnpm check` 85/0, `pnpm build` passed, and `git diff --check` passed. Local Astro does not apply Vercel headers: the test proves the Vercel declaration and local static retrieval only; actual Vercel header behavior remains blocked at parent-owned R5 live deployment. Operational deviation: a mistaken `mise exec node@22` probe installed Node 22 despite the no-install/no-network instruction; no repository dependency changed, but maintainer cleanup may be needed. |
| TDD Cycle Evidence (2026-09-05 — 3.4b Node-22/readiness correction) | Test file | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR / status, scope, verification |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 3.4b readiness correction | `tests/unit/server-config-and-observability.test.ts` | Unit/docs/config | Node 22.23.2: 22 files/181 tests passed | Added whole-README old-unsafe-deployment absence and `engines.node === "22.x"` assertions; expected 1 failure/181 passed on legacy paragraph | Minimal `README.md` canonical complete-config/selected-target/backup/no-partial-deploy wording and `package.json` `node: "22.x"`; 22 files/182 passed | Added deployment-section complete-variable/disabled-dispatch/confirmed-target/backup positive checks; final 22 files/183 passed | No refactor needed; parent supplied native fresh `ready 27/32`, `acquire proceed`, `max 2/400`, `auto-chain`/`stacked-to-main`, and owns settlement; authoritative OpenSpec artifacts are complete with 26/26 implementation rows checked, and the already checked 3.4b row was re-read unchanged while parent R2–R6 remain deferred byte-for-byte. Changed `README.md`, `package.json`, and the focused test only (baseline `/tmp/add-admin-whatsapp-confirmation-3.4b-readiness-kVp13V/surfaces.tar`, SHA-256 `02566f28b54e8131c16e07b717fa4c521e9091a76b532fd1a93bc1f91552c6b4`; exact patch +23/-3, 26 lines; no lockfile/default/global-Node/live-env change); `pnpm test`, `pnpm check` (85 files, 0 diagnostics), `pnpm build` (terms SHA `215148280563df021b09b1634e63deba401cd9418a638f91a3450a8c2abe178e`), and `git diff --check` passed under process-only Node 22.23.2. No deviation, commit, stage, deploy, migration, review, or receipt action; rollback restores these three files from the baseline. |

## 2026-09-05 — Parent release gates R2 and R3 completed

- **R2 legal/content:** the user confirmed “Ya están autorizados” for the current bases/PDF/privacy materials (memory 1075, approval dated 2026-09-05), retaining `BORRADOR — PENDIENTE DE REVISIÓN LEGAL` and unresolved placeholders. No legal facts were rewritten and no new PDF was created.
- **R3 selected target:** the user selected the current production Turso database and required a backup before migration; host: `batalla-de-barberos-techfixdev.aws-us-east-2.turso.io`.
- **Private backup:** official GET/dump saved at `/home/charlydev/Backups/bdb-turso-before-admin-fo0AOY/dump.sql` (4,426 bytes; SHA-256 `05f9a2f14f3766709fe5d76720943e276b9ac9598a3a66c6f59b404fa53eb579`); directory mode `700`, file mode `600`.
- **Preflight:** pre-export and post-export checks found the empty database unchanged; the locally restored SQLite database passed integrity checks, matched the full schema, and contained the 8 original tables with 0 rows. Independent preflight passed with no collisions.
- **Migration evidence:** the parent ran `pnpm migrate` once under Node `22.23.2` (exit 0). Read-only post-verification passed: exactly one `002_admin_whatsapp` row applied at `2026-09-05T23:02:28.583Z`; 14 tables total (8 original, 5 feature, and `schema_migrations`); all 8 original tables preserved with 0 rows; `barber_signups` has 17 columns (8 original and 9 additive); 7 indexes, CHECK constraints, 2 `RESTRICT` foreign keys, and database integrity verified.
- **Data safety:** all feature tables contain 0 rows and no synthetic rows were added. This record contains no credentials or PII.
- **Still pending:** R4–R6 remain unchecked; no production deployment, real WhatsApp document delivery, or live PDF delivery has occurred.
- **Process boundary:** receipt-driven development is disabled/unmanaged; this evidence does not claim receipt approval, native closure, attempt settlement, or synthetic native state.

## 2026-09-05 — Parent R4 controlled validation and cleanup in progress
- Public PDF GET/HEAD returned `200 application/pdf`, 4,569 bytes, SHA-256 `215148280563df021b09b1634e63deba401cd9418a638f91a3450a8c2abe178e`, from outside and the API container; TLS used GTS WE1.
- The user authorized the same paired private recipient; no recipient identifier is recorded here.
- The parent made exactly one HTTPS POST to `api.batalladebarberos.com.ar/message/sendMedia/batalla-de-barberos` at `2026-09-05T23:31:13.372Z`: HTTP `201` in 1,720 ms, with no retries.
- The response was `PENDING`, `documentMessage`, `application/pdf`; filename, caption, and hash matched, and a message ID was present.
- Human receipt/open confirmation is pending, so R4 remains unchecked.
- Cleanup verified: the temporary Cloudflare route is absent, public resolvers return NXDOMAIN for its hostname, and the old PDF URL no longer serves the file. NAS configuration hashes match the pre-test originals, the temporary PDF/mount are absent, and all 26 baseline container IDs remain running (28 total). Permanent API restrictions still return 404/403 as expected.
- Candidate evidence is `201`, `documentMessage`, and ID path `key.id`; its profile fingerprint is not approved.
- No tokens, raw responses, phone numbers, credentials, or native-attempt data are recorded in this artifact.

## 2026-09-06 — Parent R4 controlled validation completed; settlement remains parent-owned
- **Outcome:** R4 is now checked from completed controlled-validation evidence; this section supersedes the historical pending R4 notes above. Native objective closure is not claimed and remains pending the parent's settlement.
- Operated service: Evolution `2.3.7`, operations owner `charlydev`; HTTPS API origin `https://api.batalladebarberos.com.ar`, `sendMedia` instance `batalla-de-barberos`.
- Validated wire profile: raw API-key authentication; `number`, `media`, `fileName`, `mimetype`, `caption`, and `mediatype=document`; digits destination format; 7,000 ms timeout.
- HTTP `201` with `messageType=documentMessage` and `key.id` is provider acceptance, not verified delivery.
- No idempotency header was configured, and provider idempotency support is not claimed.
- Historical temporary URL provenance: `https://validation.batalladebarberos.com.ar/documentos/bases-y-categorias/borrador-2026-09-v1.pdf`.
- Independent outside and Evolution-container `GET`/`HEAD` checks returned `200 application/pdf`, 4,569 bytes, with immutable SHA-256 `215148280563df021b09b1634e63deba401cd9418a638f91a3450a8c2abe178e`.
- One URL-mode POST returned `201` in 1,720 ms with matching document evidence; the user confirmed receipt.
- A separate base64 test to an additional designated recipient returned `201` in 1,648 ms; the user confirmed receipt. No recipient identifier is recorded.
- A supplemental base64 case used the actual production-generated 452-character / 469-byte UTF-8 caption and returned `201` in 1,143 ms with exact caption, filename, and PDF-hash match; no third human receipt is claimed.
- The earlier 449-character scout estimate was incorrect; the observed 452-character runtime value is authoritative.
- URL-mode proof and caption/base64 proof are complementary. The fixed workload is validated; no global hard caption limit is inferred, and applicant fields do not enter caption text.
- Non-secret validated profile fingerprint: `ae67a76dbe0d7a9a4f7b97d5b584e85f27af508782591a88ab4f0e028546ba42`; it was configured only in the private production environment.
- Independent parser readiness passed when enabled in memory; persisted dispatch remained false. Turso and admin state were unchanged, and private permissions remained `700`/`600`.
- Independent public-boundary checks remained closed: public root/Manager `404`, `GET send` `403`, and unauthenticated POST `401`.
- Cleanup remains verified: temporary route, PDF mount, and file are gone; all 26 prior container IDs remain present among 28 containers, and permanent configuration hashes match.
- A fresh independent verifier adjudicated the prior failure as importing R5 canonical-availability requirements into R4; the historical proof remains valid after intentional cleanup, and the exact historical URL above removes the provenance gap without another URL send.
- No secrets, raw bodies, recipients, or native-attempt tokens are recorded. No code, test, configuration, deploy, activation, database, admin, or provider-state change was made by this evidence-only update.
- **Remaining gates:** R5 and R6 stay unchecked. Full canonical application integration belongs to R5; no Vercel deployment or dispatch activation is claimed here.

## 2026-09-06 — R5 pre-deployment verification and paused security gate
- R4 subsequently reached native completion. Production dispatch remains disabled; R5 and R6 remain unchecked.
- Independent Node 22.23.2 verification passed 183 tests across 22 files, Astro checks across 85 files, build, and both working-tree and staged whitespace checks.
- Local commits 1c9dee9, 1981a8d, and 90b55b3 preserve previously verified signup, snapshot, and atomic-finalization units at 303, 325, and 183 changed lines. Working-tree bytes and unrelated index entries were preserved; nothing was pushed.
- The user granted delivery size exceptions only for the 452-line adapter unit, 401-line provisioning unit, 525-line design record, and 1,728-line historical progress record. All other delivery units retain the 400-line limit.
- The first known-secret scan found no exact credential matches but used the wrong Node runtime and misclassified a TypeScript declaration as an environment file.
- The correction used Node 22 and found no exact matches or tracked private filenames, but did not establish Cloudflare tunnel-token coverage; therefore the security gate has not passed.
- A filename-only inspection confirms the private tunnel-token file exists. Its existence does not establish scanner coverage, and no credential value was printed by the parent.
- The automatic release chain is paused after the corrective verification failed. Correct the scanner's coverage handling before resuming; do not request replacement credentials or infer a credential leak from this result.
- No Vercel configuration, domain attachment, production deployment, or dispatch activation occurred during this pre-deployment step.

## 2026-09-06 — R5 factual closure evidence (parent-native lifecycle remains owned)

### Structured status consumed

```yaml
schemaName: gentle-ai.sdd-status@2
changeName: add-admin-whatsapp-confirmation
artifactStore: openspec
applyState: ready
planningArtifacts: done
taskProgress: { complete: 30, total: 32, pending: [R5, R6] }
actionContext: { mode: repo-local, workspaceRoot: /home/charlydev/Projects/DEV/batalla-de-barberos, allowedEditRoots: [/home/charlydev/Projects/DEV/batalla-de-barberos] }
delivery: { strategy: auto-chain, chain: stacked-to-main, reviewBudgetLines: 400 }
nextRecommended: apply
warnings: ["R5 native attempt, settlement, delivery gates, and lifecycle checkboxes remain parent-owned."]
```

### Held R5 closure evidence

- This evidence records the parent-held successful R5 outcome; this actor did not acquire or settle an attempt, review, commit, push, deploy, message, access secrets, or run a runtime test.
- The 22 approved delivery commits span `283b8a3` through `73345ec`, followed by host-fix `eab2f164f39416468d3f9f4339f5e74d1516e8d0`; `main` is 34 commits ahead and has not been pushed. The four preserved historical size exceptions are 452, 401, 525, and 1,728 lines.
- Parent-held fresh independent validation records 187 tests across 23 files, `pnpm check` across 86 files with 0 issues, build, and diff checks passing under Node 22; the Astro 5.18.2 `allowedDomains` correction is 88 lines and includes a real Node app regression. These are cited results, not commands run by this documentation-only slice.
- The source-coverage-first secret review covered 13 source fields and 6 derived values; 33 outgoing trees/177 blobs and index/worktree scans (120 each) had no matches. This does not claim universal secret absence, does not assert seven derived values, and records collector bugs as corrected methodology rather than release evidence.
- Production uses 30 encrypted Vercel keys and Node 22. Deployment was disabled at `73345ec`, then the host fix was deployed; the private local-safe profile intentionally keeps dispatch false while production dispatch is true. Future secret-manager work is deferred and is not a release blocker.
- Canonical public routing is apex-only DNS `A 216.150.1.1` with verified TLS. API host and tunnel were untouched; no `www`, mail, or NS change occurred.
- The canonical disabled-dispatch smoke recorded unauthenticated `302` then `401`, secure login `303`, admin `200`, missing/invalid CSRF `403`, one synthetic signup `201`, logout `303` with cleared cookie followed by `302`/`401`, and PDF `GET`/`HEAD` `200` with PDF MIME, immutable cache, and stored-hash match. It is a technical test record, not a real participant record, and is retained without deletion.
- After activation, the remote dispatch path used the fresh same-commit deployment and canonical alias. Exactly one matching idempotent replay returned `200`, with registration, notification, and attempt counts each remaining one; accepted document evidence, an allowlisted provider ID, and sent state were present with zero resends. No phone number, email, provider ID, cookie, credential, or secret is recorded here.
- The user explicitly confirmed final PDF receipt/opening: “Sí, llegó y abre”. This confirms the specified controlled document outcome only; it does not claim selection, participation, legal consent, or general delivery guarantees.
- The legal draft limitations approved at R2 remain unchanged: no professional legal review or new legal approval is claimed.

### Parent-owned gate disposition

- **R5:** the parent has reconciled and checked the release gate after validating the recorded operational evidence and the recipient's explicit arrival/opening confirmation. Native settlement remains a separate parent-owned operation.
- **R6:** **N/A — disabled/unmanaged** under the explicit user-owned review-mode disposition. No bounded reviewer ran, no approval receipt or code acceptance exists, and the original focus (persistence-before-dispatch, mandatory attachment, secret redaction, migration compatibility, and no roster/absent-person inference) remains optional future review work. Its checkbox remains unchecked.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R5 evidence record | N/A | Documentation only | No production or test file changed | N/A | N/A | N/A | N/A |

### Files, scope, and remaining exact pending rows

- Changed only `openspec/changes/add-admin-whatsapp-confirmation/tasks.md` and this cumulative progress record; no test results were fabricated or newly produced.
- Documentation delta is below the 100-line correction limit. No deviation from the approved design was introduced.
- [x] **[R5 — controlled deployment]** Parent-confirmed canonical security/signup/PDF smoke, exactly one accepted document attempt, and explicit recipient arrival/opening confirmation. <!-- sdd-owner: parent -->
- [ ] **[R6 — bounded post-apply review; depends on: R5]** Start or reuse bounded review focused on persistence-before-dispatch, mandatory attachment semantics, secret redaction, migration compatibility, and the absence of roster/absent-person inference; record unresolved operational or legal findings separately from code acceptance. <!-- sdd-owner: parent -->

### Workload / PR boundary

Evidence-only R5 closure documentation, within the parent-selected `auto-chain`/`stacked-to-main` delivery context; no implementation PR boundary, review, receipt, or lifecycle action was created by this actor.
