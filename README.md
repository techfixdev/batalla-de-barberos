# Batalla de Barberos

Independent Astro website for **Entre Cortes — Batalla de Barberos**, a barbering competition in Florencio Varela. The public interface is in Spanish; technical documentation is in English.

## Stack

- Astro in server output mode
- Vercel adapter
- Turso/libSQL for signup storage
- TypeScript with strict settings
- No client UI framework; only a small progressive-enhancement script for the form

## Local setup

1. Install Node.js 22.x and pnpm 9+. Node.js 22.x is the tested production runtime.
2. Install dependencies:

   ```sh
   pnpm install
   ```

3. Copy `environment.example` to `.env`; use the complete server-variable and disabled-dispatch guidance in [Operación segura](#operación-segura).
4. Before `pnpm migrate`, confirm the explicitly selected target and take a backup or branch; never assume production from the current shell.
5. Start the development server:

   ```sh
   pnpm dev
   ```

## Browser regression tests

Run the native admin-form regression against the disposable local database with:

```sh
pnpm test:browser
```

The runner uses an installed Chromium or Chrome when available. If neither is installed, provision Playwright's official headless Chromium in its normal user cache with `pnpm exec playwright install chromium`, then rerun the command. The test never targets production or injects an `Origin` header.

## Environment variables

[Operación segura](#operación-segura) is the canonical list of server variables and release steps. Keep secrets server-only; local and preview environments retain `WHATSAPP_DISPATCH_ENABLED=false`.

## Deployment

Follow the complete [Operación segura](#operación-segura) configuration before deploying. Do not deploy with a partial configuration. Configure every listed server variable in Vercel, keeping `WHATSAPP_DISPATCH_ENABLED=false` for preview and local environments. Before `pnpm migrate`, select and confirm the intended database target, take its backup or branch, then inspect `schema_migrations` after the migration. `@astrojs/vercel` provides the serverless runtime for the signup endpoint.

The in-memory request limiter is a lightweight abuse control scoped to each serverless instance. For high-volume production traffic, add a shared Vercel-compatible rate-limit store or platform firewall rule.

## Data flow

`POST /api/signups` validates and normalizes form data, applies a small rate limit, and inserts accepted submissions into Turso. Email addresses are unique. Run `pnpm migrate` before accepting signups.

## Bases y categorías publicadas

La versión vigente es `draft-2026-09-v3`: publica las cinco categorías y sus 66 reglas completas desde una única fuente compartida por la web y el PDF, ahora con la identidad visual Entre Cortes en negro, dorado y fondo claro de lectura. Conserva la marca `BORRADOR — PENDIENTE DE REVISIÓN LEGAL` y los pendientes generales; no asigna una categoría durante la inscripción.

Las versiones históricas `draft-2026-09-v1` y `draft-2026-09-v2`, con sus PDF, permanecen disponibles con sus URL y checksums originales. Nunca se reemplazan bytes de una versión publicada: cada actualización agrega una fuente, un PDF, una entrada de manifiesto y cabeceras inmutables nuevos.

El JPEG reproducible incrustado en v3 se derivó una sola vez del PNG original, sin metadatos ni dependencia de generación, con:

```sh
/usr/bin/magick src/assets/barber-battle/entre-cortes-logo-ai.png -resize 600x400! -strip -colorspace sRGB -sampling-factor 4:4:4 -interlace none -quality 90 content/draft-terms/branding/entre-cortes-emblem.jpg
```

## Admin export assets

Authenticated Excel and PDF exports load their fonts and emblem directly from the server bundle; they never fetch assets from a public URL. The static Noto Sans Regular and Bold fonts are licensed under the SIL Open Font License 1.1 in `content/admin-export/fonts/OFL.txt`. Noto Sans covers Latin, Greek, and Cyrillic text used by the export; unsupported glyphs are rendered as a visible, text-extractable `?` fallback rather than silently omitted.

| Asset | Pinned provenance | SHA-256 |
|---|---|---|
| `NotoSans-Regular.ttf` | `https://raw.githubusercontent.com/notofonts/noto-fonts/c971829a87e7920f960e7277c3dafd9bedd3c601/hinted/ttf/NotoSans/NotoSans-Regular.ttf` | `b85c38ecea8a7cfb39c24e395a4007474fa5a4fc864f6ee33309eb4948d232d5` |
| `NotoSans-Bold.ttf` | `https://raw.githubusercontent.com/notofonts/noto-fonts/c971829a87e7920f960e7277c3dafd9bedd3c601/hinted/ttf/NotoSans/NotoSans-Bold.ttf` | `c976e4b1b99edc88775377fcc21692ca4bfa46b6d6ca6522bfda505b28ff9d6a` |
| `OFL.txt` | `https://raw.githubusercontent.com/notofonts/noto-fonts/c971829a87e7920f960e7277c3dafd9bedd3c601/LICENSE` | `0dab92d0544f7b233403f14b84a663bdbfa746982eda629e7f4f9ffe1b036feb` |
| Entre Cortes emblem (existing original) | `content/draft-terms/branding/entre-cortes-emblem.jpg` | `c321de2f807c4c205a62e5cc3eed9ac103eda08756f9db21dbca754a4f413bd6` |

## Admin registration workflow

`/admin` is the direct registration queue. Open a registration to edit its five submitted answers or launch a prefilled `wa.me` receipt acknowledgement. The link confirms only that the registration was received: opening it does not send from the server, mutate lifecycle state, or record delivery. Response edits use the existing authenticated CSRF form boundary, optimistic `state_version` concurrency, normalized Argentine mobile storage, and a PII-free audit event.

`/admin?tools=1` keeps filters, exports, organization PDF sending, recent sends, row selection, and permanent deletion available as secondary tools. Registration detail keeps state operations, receipt recovery, provider-backed place confirmation, and audit history under the advanced section.

Private provider dispatch remains **disabled until controlled human validation**. While blocked, the UI explains the reason before creating jobs or contacting the provider; exports, deletion, lifecycle states, and existing receipts remain operational. “Accepted by the provider” does not mean delivered, read, or answered.

## Accessibility

The site uses semantic landmarks, a skip link, visible focus states, associated form labels, live status messages, reduced-motion handling, responsive layouts, and server/client validation. Manual keyboard and screen-reader testing is still recommended before launch.

## License

Source code is available under the MIT License. The event poster at `src/assets/barber-battle/barber-battle-poster.jpeg` is explicitly excluded from MIT and remains under its owner's copyright and publication rights.

## Operación segura

- [ ] Copiar `environment.example` sin versionar secretos; local y preview conservan `WHATSAPP_DISPATCH_ENABLED=false` y `WHATSAPP_PRIVATE_MEDIA_ENABLED=false`.
- [ ] Ejecutar `pnpm admin:password-hash` y entregar una sola contraseña por stdin; no usar argumentos ni registrar su salida salvo el hash.
- [ ] Crear `ADMIN_SESSION_SECRET_B64` y `ADMIN_MESSAGE_RECIPIENT_HMAC_SECRET_B64` aleatorios, independientes y de al menos 32 bytes; el segundo protege la huella de destinatario del ledger y no debe derivarse de teléfonos.
- [ ] Usar `CANONICAL_SITE_ORIGIN` HTTPS sin ruta, consulta, fragmento ni credenciales; no confiar en `Host` entrante.
- [ ] Antes de `pnpm migrate`, seleccionar y confirmar la base explícitamente, tomar backup o branch, y revisar `schema_migrations`; nunca asumir producción.
- [ ] Validar Evolution con un destinatario de prueba y PDF adjunto real antes de habilitar despacho; URL o texto solo no son aceptación. El transporte privado base64 de Evolution 2.3.7 exige una validación humana separada y su propio fingerprint antes de activar `WHATSAPP_PRIVATE_MEDIA_ENABLED=true`.
- [ ] Un acuse `uncertain` puede duplicarse: revisar su advertencia antes de reintentar; para contener un incidente, desactivar despacho sin detener inscripciones.
- [ ] Rotar por separado hash administrativo, secreto de sesión, `TURSO_AUTH_TOKEN` y `EVOLUTION_API_KEY`; rotar sesión invalida cookies firmadas.
- [ ] Nunca sobrescribir un PDF publicado: una corrección crea versión, URL, archivo y checksum nuevos, conserva los anteriores y mantiene `BORRADOR — PENDIENTE DE REVISIÓN LEGAL` hasta aprobación legal.

Variables servidor reales: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `ADMIN_PASSWORD_HASH`, `ADMIN_SESSION_SECRET_B64`, `CANONICAL_SITE_ORIGIN`, `WHATSAPP_DISPATCH_ENABLED`, `WHATSAPP_PRIVATE_MEDIA_ENABLED`, `ADMIN_MESSAGE_RECIPIENT_HMAC_SECRET_B64`, `EVOLUTION_API_BASE_URL`, `EVOLUTION_API_INSTANCE`, `EVOLUTION_API_KEY`, `EVOLUTION_API_SEND_DOCUMENT_PATH_TEMPLATE`, `EVOLUTION_API_AUTH_HEADER`, `EVOLUTION_API_AUTH_SCHEME`, `EVOLUTION_API_DESTINATION_FIELD_PATH`, `EVOLUTION_API_MEDIA_URL_FIELD_PATH`, `EVOLUTION_API_FILENAME_FIELD_PATH`, `EVOLUTION_API_MIME_TYPE_FIELD_PATH`, `EVOLUTION_API_CAPTION_FIELD_PATH`, `EVOLUTION_API_MEDIA_KIND_FIELD_PATH`, `EVOLUTION_API_MEDIA_KIND_VALUE`, `EVOLUTION_API_DESTINATION_FORMAT`, `EVOLUTION_API_ACCEPTED_HTTP_STATUSES`, `EVOLUTION_API_SUCCESS_MODE`, `EVOLUTION_API_RESULT_FIELD_PATH`, `EVOLUTION_API_ACCEPTED_VALUES`, `EVOLUTION_API_MEDIA_REJECTED_VALUES`, `EVOLUTION_API_URL_ONLY_VALUES`, `EVOLUTION_API_MESSAGE_ID_PATH`, `EVOLUTION_API_IDEMPOTENCY_HEADER`, `EVOLUTION_API_TIMEOUT_MS`, `EVOLUTION_API_VALIDATED_PROFILE_SHA256` y `EVOLUTION_API_PRIVATE_MEDIA_VALIDATED_PROFILE_SHA256`.

Cada cambio de URL, ruta, campos, estados, timeout, formato Evolution o límites privados (4 MiB crudos/6 MiB serializados) requiere revalidar el PDF adjunto y actualizar el fingerprint no secreto. El cambio de `client_max_body_size` del proxy es solo fuente y requiere despliegue manual; la capacidad privada permanece deshabilitada hasta esa validación. Las cabeceras globales no fijan caché privada; el PDF inmutable recibe MIME/caché específica y las respuestas admin mantienen `private, no-store`, `DENY` y `no-referrer`.
