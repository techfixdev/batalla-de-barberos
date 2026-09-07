import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createClient, type Client } from '@libsql/client';
import { dev } from 'astro';
import { expect, test } from '@playwright/test';
import { migrate } from '../../scripts/migrate.mjs';

const PASSWORD = 'correct horse battery staple';
const HASH = 'scrypt$v1$N=32768,r=8,p=1$AAECAwQFBgcICQoLDA0ODw$eo40JB24mNWRdcaWU4xBdGepdf_laQaEJfFhiNMVnFg';
const SECRET = 'AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=';
const ENV = ['TURSO_DATABASE_URL', 'TURSO_AUTH_TOKEN', 'ADMIN_PASSWORD_HASH', 'ADMIN_SESSION_SECRET_B64', 'CANONICAL_SITE_ORIGIN', 'ASTRO_DISABLE_UPDATE_CHECK', 'WHATSAPP_DISPATCH_ENABLED'] as const;
let server: Awaited<ReturnType<typeof dev>>, client: Client, directory: string, origin: string, previous: Record<string, string | undefined>;

test.beforeAll(async () => {
  previous = Object.fromEntries(ENV.map((key) => [key, process.env[key]])); directory = await mkdtemp(join(tmpdir(), 'bdb-export-'));
  process.env.TURSO_DATABASE_URL = pathToFileURL(join(directory, 'export.db')).href; process.env.TURSO_AUTH_TOKEN = 'local';
  process.env.ADMIN_PASSWORD_HASH = HASH; process.env.ADMIN_SESSION_SECRET_B64 = SECRET; process.env.CANONICAL_SITE_ORIGIN = 'http://127.0.0.1';
  process.env.ASTRO_DISABLE_UPDATE_CHECK = 'true'; process.env.WHATSAPP_DISPATCH_ENABLED = 'false'; client = createClient({ url: process.env.TURSO_DATABASE_URL }); await migrate(client);
  for (let i = 1; i <= 3; i++) await client.execute({ sql: `INSERT INTO barber_signups (id, full_name, email, phone, phone_e164, barbershop, experience, accepted_rules, created_at, review_state)
    VALUES (?, ?, ?, '1', '+5491112345678', 'Barbería', 'profesional', 1, ?, ?)`, args: [`${i}0000000-0000-4000-8000-00000000000${i}`, `Persona ${i}`, `p${i}@test.local`, `2026-03-0${i}T00:00:00.000Z`, i === 3 ? 'selected' : 'received'] });
  server = await dev({ root: process.cwd(), server: { host: '127.0.0.1', port: 0 }, logLevel: 'silent' }); origin = `http://127.0.0.1:${server.address.port}`;
});
test.afterAll(async () => { await server?.stop(); client?.close(); for (const key of ENV) previous[key] === undefined ? delete process.env[key] : process.env[key] = previous[key]; if (directory) await rm(directory, { recursive: true, force: true }); });

test('downloads real filtered and selected exports with synchronized counts on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 }); await page.goto(`${origin}/admin/login`); await page.getByLabel('Contraseña').fill(PASSWORD); await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page.getByText('Exportar 3 inscripciones con los filtros actuales')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const xlsx = page.waitForEvent('download'); const exportResponse = page.waitForResponse((response) => response.url().includes('/export')); await page.getByRole('button', { name: 'Descargar Excel' }).click();
  const firstResponse = await exportResponse; expect(firstResponse.status()).toBe(200); expect((await xlsx).suggestedFilename()).toMatch(/\.xlsx$/);
  await page.locator('.registration-selection').first().check(); await expect(page.getByText('Exportar 1 inscripciones seleccionadas')).toBeVisible();
  const pdf = page.waitForEvent('download'); await page.getByRole('button', { name: 'Descargar PDF' }).click(); expect((await pdf).suggestedFilename()).toMatch(/\.pdf$/);
  await page.setViewportSize({ width: 390, height: 900 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
