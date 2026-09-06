# Batalla de Barberos — OpenSpec Project Context

## Executive context

Batalla de Barberos is an independent Spanish-language Astro site for the Entre Cortes barbering competition in Florencio Varela. The current application accepts public barber registrations and stores them in Turso/libSQL; the upcoming SDD change will add protected administration and WhatsApp confirmation workflows.

## Current stack and architecture

- Astro 5 in server output mode with the Vercel adapter.
- TypeScript with strict settings; Node.js 20+ and pnpm 9+.
- File-based Astro pages under `src/pages/`, including the server endpoint `src/pages/api/signups.ts`.
- Astro components and layouts, with no client UI framework; the signup form uses progressive enhancement.
- Shared domain/database helpers under `src/lib/`.
- Turso/libSQL persistence through `@libsql/client`; migrations run with `scripts/migrate.mjs`.
- Vercel deployment, with server-only database environment variables.
- In-memory request limiting currently scopes abuse control to an individual serverless instance.

## Existing conventions and boundaries

The public interface is Spanish while technical documentation is English. Registration input is validated and normalized before persistence, and email addresses are unique. Secrets must remain server-only. The current repository has no dedicated test runner or test script.

## Upcoming change constraints

The requested feature is a simple password-protected admin panel for reviewing barber registrations, plus automatic WhatsApp confirmation containing a PDF of formal contest terms. WhatsApp integration must use a self-hosted Evolution API, Baileys, WPPConnect-style alternative and must not use Google auth, Meta Cloud API, or Twilio. Formal terms should be drafted from the repository's existing categories and rules and remain explicitly subject to legal review before publication.

The design phase must resolve authentication/session storage, authorization, PDF generation or hosting, WhatsApp provider contract and failure/retry behavior, privacy/secret handling, and deployment suitability for Vercel serverless execution. It must preserve the public signup path and avoid presenting legally unreviewed terms as final.

## Validation baseline

```sh
pnpm install
pnpm check
pnpm build
pnpm migrate
```

`pnpm check` and `pnpm build` are the primary automated validations. `pnpm migrate` is an operational database command and should only target an explicitly configured database. No dedicated unit or integration test runner is currently configured, so future implementation work should add focused tests or document equivalent verification.

## SDD operating context

- Artifact store: OpenSpec.
- Strict TDD: enabled for later implementation phases.
- Delivery strategy: ask-on-risk.
- Review budget: 400 lines.
- Chaining: deferred unless workload requires it.
