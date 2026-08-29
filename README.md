# Batalla de Barberos

Independent Astro website for **Entre Cortes — Batalla de Barberos**, a barbering competition in Florencio Varela. The public interface is in Spanish; technical documentation is in English.

## Stack

- Astro in server output mode
- Vercel adapter
- Turso/libSQL for signup storage
- TypeScript with strict settings
- No client UI framework; only a small progressive-enhancement script for the form

## Local setup

1. Install Node.js 20+ and pnpm 9+.
2. Install dependencies:

   ```sh
   pnpm install
   ```

3. Copy `environment.example` to `.env` and set a Turso database URL and auth token.
4. Apply the database migration:

   ```sh
   pnpm migrate
   ```

5. Start the development server:

   ```sh
   pnpm dev
   ```

## Environment variables

| Variable | Purpose |
| --- | --- |
| `TURSO_DATABASE_URL` | Turso/libSQL database URL, beginning with `libsql://` |
| `TURSO_AUTH_TOKEN` | Server-only Turso authentication token |

Configure both values in the Vercel project settings for production. They must never be exposed as public environment variables.

## Deployment

Import the repository into Vercel, configure the two environment variables, run `pnpm migrate` against the production database once, and deploy. `@astrojs/vercel` provides the serverless runtime for the signup endpoint.

The in-memory request limiter is a lightweight abuse control scoped to each serverless instance. For high-volume production traffic, add a shared Vercel-compatible rate-limit store or platform firewall rule.

## Data flow

`POST /api/signups` validates and normalizes form data, applies a small rate limit, and inserts accepted submissions into Turso. Email addresses are unique. Run `pnpm migrate` before accepting signups.

## Accessibility

The site uses semantic landmarks, a skip link, visible focus states, associated form labels, live status messages, reduced-motion handling, responsive layouts, and server/client validation. Manual keyboard and screen-reader testing is still recommended before launch.

## License

Source code is available under the MIT License. The event poster at `src/assets/barber-battle/barber-battle-poster.jpeg` is explicitly excluded from MIT and remains under its owner's copyright and publication rights.
