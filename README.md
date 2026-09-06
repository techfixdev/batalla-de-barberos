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

## Environment variables

[Operación segura](#operación-segura) is the canonical list of server variables and release steps. Keep secrets server-only; local and preview environments retain `WHATSAPP_DISPATCH_ENABLED=false`.

## Deployment

Follow the complete [Operación segura](#operación-segura) configuration before deploying. Do not deploy with a partial configuration. Configure every listed server variable in Vercel, keeping `WHATSAPP_DISPATCH_ENABLED=false` for preview and local environments. Before `pnpm migrate`, select and confirm the intended database target, take its backup or branch, then inspect `schema_migrations` after the migration. `@astrojs/vercel` provides the serverless runtime for the signup endpoint.

The in-memory request limiter is a lightweight abuse control scoped to each serverless instance. For high-volume production traffic, add a shared Vercel-compatible rate-limit store or platform firewall rule.

## Data flow

`POST /api/signups` validates and normalizes form data, applies a small rate limit, and inserts accepted submissions into Turso. Email addresses are unique. Run `pnpm migrate` before accepting signups.

## Accessibility

The site uses semantic landmarks, a skip link, visible focus states, associated form labels, live status messages, reduced-motion handling, responsive layouts, and server/client validation. Manual keyboard and screen-reader testing is still recommended before launch.

## License

Source code is available under the MIT License. The event poster at `src/assets/barber-battle/barber-battle-poster.jpeg` is explicitly excluded from MIT and remains under its owner's copyright and publication rights.

## Operación segura

- [ ] Copiar `environment.example` sin versionar secretos; local y preview conservan `WHATSAPP_DISPATCH_ENABLED=false`.
- [ ] Ejecutar `pnpm admin:password-hash` y entregar una sola contraseña por stdin; no usar argumentos ni registrar su salida salvo el hash.
- [ ] Crear `ADMIN_SESSION_SECRET_B64` aleatorio de al menos 32 bytes e independiente de contraseña, Turso y Evolution.
- [ ] Usar `CANONICAL_SITE_ORIGIN` HTTPS sin ruta, consulta, fragmento ni credenciales; no confiar en `Host` entrante.
- [ ] Antes de `pnpm migrate`, seleccionar y confirmar la base explícitamente, tomar backup o branch, y revisar `schema_migrations`; nunca asumir producción.
- [ ] Validar Evolution con un destinatario de prueba y PDF adjunto real antes de habilitar despacho; URL o texto solo no son aceptación.
- [ ] Un acuse `uncertain` puede duplicarse: revisar su advertencia antes de reintentar; para contener un incidente, desactivar despacho sin detener inscripciones.
- [ ] Rotar por separado hash administrativo, secreto de sesión, `TURSO_AUTH_TOKEN` y `EVOLUTION_API_KEY`; rotar sesión invalida cookies firmadas.
- [ ] Nunca sobrescribir un PDF publicado: una corrección crea versión, URL, archivo y checksum nuevos, conserva los anteriores y mantiene `BORRADOR — PENDIENTE DE REVISIÓN LEGAL` hasta aprobación legal.

Variables servidor reales: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `ADMIN_PASSWORD_HASH`, `ADMIN_SESSION_SECRET_B64`, `CANONICAL_SITE_ORIGIN`, `WHATSAPP_DISPATCH_ENABLED`, `EVOLUTION_API_BASE_URL`, `EVOLUTION_API_INSTANCE`, `EVOLUTION_API_KEY`, `EVOLUTION_API_SEND_DOCUMENT_PATH_TEMPLATE`, `EVOLUTION_API_AUTH_HEADER`, `EVOLUTION_API_AUTH_SCHEME`, `EVOLUTION_API_DESTINATION_FIELD_PATH`, `EVOLUTION_API_MEDIA_URL_FIELD_PATH`, `EVOLUTION_API_FILENAME_FIELD_PATH`, `EVOLUTION_API_MIME_TYPE_FIELD_PATH`, `EVOLUTION_API_CAPTION_FIELD_PATH`, `EVOLUTION_API_MEDIA_KIND_FIELD_PATH`, `EVOLUTION_API_MEDIA_KIND_VALUE`, `EVOLUTION_API_DESTINATION_FORMAT`, `EVOLUTION_API_ACCEPTED_HTTP_STATUSES`, `EVOLUTION_API_SUCCESS_MODE`, `EVOLUTION_API_RESULT_FIELD_PATH`, `EVOLUTION_API_ACCEPTED_VALUES`, `EVOLUTION_API_MEDIA_REJECTED_VALUES`, `EVOLUTION_API_URL_ONLY_VALUES`, `EVOLUTION_API_MESSAGE_ID_PATH`, `EVOLUTION_API_IDEMPOTENCY_HEADER`, `EVOLUTION_API_TIMEOUT_MS` y `EVOLUTION_API_VALIDATED_PROFILE_SHA256`.

Cada cambio de URL, ruta, campos, estados, timeout o formato Evolution requiere revalidar el PDF adjunto y actualizar el fingerprint no secreto. Las cabeceras globales no fijan caché privada; el PDF inmutable recibe MIME/caché específica y las respuestas admin mantienen `private, no-store`, `DENY` y `no-referrer`.
