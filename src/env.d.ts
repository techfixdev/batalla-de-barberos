/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly NODE_ENV?: 'development' | 'production' | 'test';
  readonly TURSO_DATABASE_URL?: string;
  readonly TURSO_AUTH_TOKEN?: string;
  readonly ADMIN_PASSWORD_HASH?: string;
  readonly ADMIN_SESSION_SECRET_B64?: string;
  readonly CANONICAL_SITE_ORIGIN?: string;
  readonly WHATSAPP_DISPATCH_ENABLED?: 'true' | 'false';
  readonly EVOLUTION_API_BASE_URL?: string;
  readonly EVOLUTION_API_INSTANCE?: string;
  readonly EVOLUTION_API_KEY?: string;
  readonly EVOLUTION_API_SEND_DOCUMENT_PATH_TEMPLATE?: string;
  readonly EVOLUTION_API_AUTH_HEADER?: string;
  readonly EVOLUTION_API_AUTH_SCHEME?: 'raw' | 'bearer';
  readonly EVOLUTION_API_DESTINATION_FIELD_PATH?: string;
  readonly EVOLUTION_API_MEDIA_URL_FIELD_PATH?: string;
  readonly EVOLUTION_API_FILENAME_FIELD_PATH?: string;
  readonly EVOLUTION_API_MIME_TYPE_FIELD_PATH?: string;
  readonly EVOLUTION_API_CAPTION_FIELD_PATH?: string;
  readonly EVOLUTION_API_MEDIA_KIND_FIELD_PATH?: string;
  readonly EVOLUTION_API_MEDIA_KIND_VALUE?: string;
  readonly EVOLUTION_API_DESTINATION_FORMAT?: 'e164' | 'digits';
  readonly EVOLUTION_API_ACCEPTED_HTTP_STATUSES?: string;
  readonly EVOLUTION_API_SUCCESS_MODE?: 'status-only' | 'json-value';
  readonly EVOLUTION_API_RESULT_FIELD_PATH?: string;
  readonly EVOLUTION_API_ACCEPTED_VALUES?: string;
  readonly EVOLUTION_API_MEDIA_REJECTED_VALUES?: string;
  readonly EVOLUTION_API_URL_ONLY_VALUES?: string;
  readonly EVOLUTION_API_MESSAGE_ID_PATH?: string;
  readonly EVOLUTION_API_IDEMPOTENCY_HEADER?: string;
  readonly EVOLUTION_API_TIMEOUT_MS?: string;
  readonly EVOLUTION_API_VALIDATED_PROFILE_SHA256?: string;
}

declare namespace App {
  interface Locals {
    adminSession?: Readonly<{ id: string; expiresAt: string }>;
    adminCsrfToken?: string;
  }
}
