export const REGISTRATION_DELETION_VERSION = '003_registration_numbers_and_deletion';

export const REGISTRATION_DELETION_STATEMENTS = [
  `CREATE TABLE registration_numbers (
    number INTEGER PRIMARY KEY AUTOINCREMENT,
    registration_id TEXT NOT NULL UNIQUE,
    FOREIGN KEY (registration_id) REFERENCES barber_signups(id) ON DELETE CASCADE
  )`,
  `INSERT INTO registration_numbers (registration_id)
    SELECT id FROM barber_signups ORDER BY created_at ASC, id ASC`,
  `CREATE TRIGGER barber_signups_allocate_registration_number
    AFTER INSERT ON barber_signups
    BEGIN
      INSERT INTO registration_numbers (registration_id) VALUES (NEW.id);
    END`,
  `CREATE UNIQUE INDEX admin_audit_events_registration_deletion_request_unique_idx
    ON admin_audit_events (request_id)
    WHERE action = 'registrations_deleted'`,
];
