import { createClient, type Client } from '@libsql/client';

let client: Client | undefined;

export function getDatabase(): Client {
  if (client) return client;

  const url = import.meta.env.TURSO_DATABASE_URL;
  const authToken = import.meta.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    throw new Error('TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be configured.');
  }

  client = createClient({ url, authToken });
  return client;
}
