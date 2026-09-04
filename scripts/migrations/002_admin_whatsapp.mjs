export const ADMIN_WHATSAPP_VERSION = '002_admin_whatsapp';

export const ADMIN_WHATSAPP_MIGRATION = `
  ALTER TABLE barber_signups ADD COLUMN phone_e164 TEXT;
  ALTER TABLE barber_signups ADD COLUMN submission_key TEXT;
  ALTER TABLE barber_signups ADD COLUMN submission_fingerprint TEXT;
  ALTER TABLE barber_signups ADD COLUMN review_state TEXT NOT NULL DEFAULT 'received'
    CHECK (review_state IN ('received', 'under_review', 'selected', 'rejected', 'withdrawn'));
  ALTER TABLE barber_signups ADD COLUMN participant_response_state TEXT NOT NULL DEFAULT 'not_requested'
    CHECK (participant_response_state IN ('not_requested', 'pending', 'confirmed', 'declined'));
  ALTER TABLE barber_signups ADD COLUMN terms_version TEXT;
  ALTER TABLE barber_signups ADD COLUMN notice_version TEXT;
  ALTER TABLE barber_signups ADD COLUMN receipt_required INTEGER NOT NULL DEFAULT 0
    CHECK (receipt_required IN (0, 1));
  ALTER TABLE barber_signups ADD COLUMN state_version INTEGER NOT NULL DEFAULT 0;

  CREATE UNIQUE INDEX barber_signups_submission_key_unique_idx
    ON barber_signups (submission_key) WHERE submission_key IS NOT NULL;
  CREATE INDEX barber_signups_created_at_id_idx ON barber_signups (created_at DESC, id DESC);
  CREATE INDEX barber_signups_review_state_idx ON barber_signups (review_state, created_at DESC, id DESC);
  CREATE INDEX barber_signups_participant_response_state_idx
    ON barber_signups (participant_response_state, created_at DESC, id DESC);

  CREATE TABLE receipt_notifications (
    id TEXT PRIMARY KEY,
    logical_message_key TEXT NOT NULL UNIQUE,
    registration_id TEXT NOT NULL,
    terms_version TEXT NOT NULL,
    attachment_kind TEXT NOT NULL CHECK (attachment_kind = 'document'),
    media_url TEXT NOT NULL,
    media_filename TEXT NOT NULL,
    media_mime_type TEXT NOT NULL CHECK (media_mime_type = 'application/pdf'),
    media_sha256 TEXT NOT NULL CHECK (length(media_sha256) = 64),
    caption_text TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed', 'uncertain')),
    attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
    provider_message_id TEXT,
    last_error_code TEXT,
    last_error_message TEXT,
    last_attempt_at TEXT,
    sent_at TEXT,
    lease_token TEXT,
    lease_expires_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (registration_id, terms_version),
    FOREIGN KEY (registration_id) REFERENCES barber_signups(id) ON DELETE RESTRICT
  );
  CREATE INDEX receipt_notifications_status_updated_at_idx ON receipt_notifications (status, updated_at);

  CREATE TABLE receipt_notification_attempts (
    id TEXT PRIMARY KEY,
    notification_id TEXT NOT NULL,
    attempt_no INTEGER NOT NULL CHECK (attempt_no > 0),
    attempt_key TEXT NOT NULL UNIQUE,
    trigger TEXT NOT NULL CHECK (trigger IN ('automatic', 'admin_retry', 'admin_reconcile')),
    outcome TEXT NOT NULL CHECK (outcome IN ('in_progress', 'sent', 'failed', 'uncertain')),
    provider_http_status INTEGER,
    provider_message_id TEXT,
    acceptance_evidence TEXT CHECK (acceptance_evidence IS NULL OR acceptance_evidence IN
      ('validated-document-status', 'document-response-marker')),
    error_code TEXT,
    error_message TEXT,
    started_at TEXT NOT NULL,
    completed_at TEXT,
    UNIQUE (notification_id, attempt_no),
    FOREIGN KEY (notification_id) REFERENCES receipt_notifications(id) ON DELETE RESTRICT
  );
  CREATE INDEX receipt_notification_attempts_notification_attempt_no_idx
    ON receipt_notification_attempts (notification_id, attempt_no DESC);

  CREATE TABLE admin_sessions (
    id TEXT PRIMARY KEY,
    token_hash TEXT NOT NULL UNIQUE,
    csrf_hash TEXT NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    revoked_at TEXT,
    last_seen_at TEXT NOT NULL
  );
  CREATE INDEX admin_sessions_expires_at_idx ON admin_sessions (expires_at);

  CREATE TABLE admin_login_throttle (
    key_hash TEXT PRIMARY KEY,
    window_started_at TEXT NOT NULL,
    failure_count INTEGER NOT NULL CHECK (failure_count >= 0),
    blocked_until TEXT,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE admin_audit_events (
    id TEXT PRIMARY KEY,
    session_id TEXT,
    registration_id TEXT,
    action TEXT NOT NULL,
    from_value TEXT,
    to_value TEXT,
    request_id TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`;

export const ADMIN_WHATSAPP_STATEMENTS = ADMIN_WHATSAPP_MIGRATION
  .trim()
  .split(/;\s*(?:\n|$)/)
  .filter(Boolean);
