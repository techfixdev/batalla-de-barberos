import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { createClient, type Client } from '@libsql/client';
import { dev } from 'astro';
import { expect, test } from '@playwright/test';

import { migrate } from '../../scripts/migrate.mjs';

const FIXTURE_PASSWORD = 'correct horse battery staple';
const PASSWORD_HASH = 'scrypt$v1$N=32768,r=8,p=1$AAECAwQFBgcICQoLDA0ODw$eo40JB24mNWRdcaWU4xBdGepdf_laQaEJfFhiNMVnFg';
const SESSION_SECRET = 'AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=';
const LONG_ID = `registro-${'12345678-abcd-'.repeat(5)}final`;
const LONG_NAME = 'Alejandra María de los Ángeles del Valle con un nombre deliberadamente extenso';
const LONG_EMAIL = 'administracion.inscripcion.con.nombre.muy.extenso@example.test';
const ENVIRONMENT = ['TURSO_DATABASE_URL', 'TURSO_AUTH_TOKEN', 'ADMIN_PASSWORD_HASH', 'ADMIN_SESSION_SECRET_B64', 'CANONICAL_SITE_ORIGIN', 'ASTRO_DISABLE_UPDATE_CHECK', 'WHATSAPP_DISPATCH_ENABLED'] as const;

let server: Awaited<ReturnType<typeof dev>>;
let client: Client;
let temporaryDirectory: string;
let origin: string;
let beforeEnvironment: Record<string, string | undefined>;

async function login(page: import('@playwright/test').Page) {
  await page.goto(`${origin}/admin/login`);
  await page.getByLabel('Contraseña').fill(FIXTURE_PASSWORD);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page).toHaveURL(`${origin}/admin`);
}

async function expectNoHorizontalOverflow(page: import('@playwright/test').Page, width: number) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  const tableWrap = page.locator('.admin-table-wrap');
  if (await tableWrap.count()) {
    expect(await tableWrap.evaluate((element) => element.scrollWidth)).toBeLessThanOrEqual(
      await tableWrap.evaluate((element) => element.clientWidth),
    );
  }
}

async function expectMinimumTouchHeight(locator: import('@playwright/test').Locator) {
  const count = await locator.count();
  for (let index = 0; index < count; index += 1) {
    expect(await locator.nth(index).evaluate((element) => element.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
  }
}

test.beforeAll(async () => {
  beforeEnvironment = Object.fromEntries(ENVIRONMENT.map((key) => [key, process.env[key]]));
  temporaryDirectory = await mkdtemp(join(tmpdir(), 'bdb-admin-mobile-'));
  process.env.TURSO_DATABASE_URL = pathToFileURL(join(temporaryDirectory, 'mobile.db')).href;
  process.env.TURSO_AUTH_TOKEN = 'local-test-token';
  process.env.ADMIN_PASSWORD_HASH = PASSWORD_HASH;
  process.env.ADMIN_SESSION_SECRET_B64 = SESSION_SECRET;
  process.env.CANONICAL_SITE_ORIGIN = 'http://127.0.0.1';
  process.env.ASTRO_DISABLE_UPDATE_CHECK = 'true';
  process.env.WHATSAPP_DISPATCH_ENABLED = 'false';

  client = createClient({ url: process.env.TURSO_DATABASE_URL });
  await migrate(client);
  await client.execute({
    sql: `INSERT INTO barber_signups (id, full_name, email, phone, phone_e164, experience, accepted_rules, created_at,
      terms_version, review_state, participant_response_state, receipt_required)
      VALUES (?, ?, ?, ?, ?, 'educador', 1, ?, 'draft-2026-09-v3', 'under_review', 'pending', 0)`,
    args: [LONG_ID, LONG_NAME, LONG_EMAIL, '+54 9 11 9999-8888', '+5491199998888', '2026-09-05T12:00:00.000Z'],
  });
  server = await dev({ root: process.cwd(), server: { host: '127.0.0.1', port: 0 }, logLevel: 'silent' });
  origin = `http://127.0.0.1:${server.address.port}`;
});

test.afterAll(async () => {
  await server?.stop();
  client?.close();
  for (const key of ENVIRONMENT) {
    if (beforeEnvironment[key] === undefined) delete process.env[key];
    else process.env[key] = beforeEnvironment[key];
  }
  if (temporaryDirectory) await rm(temporaryDirectory, { recursive: true, force: true });
});

test('presents Spanish filters with English storage values and an honest empty result', async ({ page }) => {
  await login(page);
  await page.getByRole('link', { name: 'Herramientas' }).click();
  const expectedOptions = {
    review: [['', 'Todas'], ['received', 'Recibida'], ['under_review', 'En revisión'], ['selected', 'Seleccionada'], ['rejected', 'No seleccionada'], ['withdrawn', 'Retirada']],
    participant: [['', 'Todas'], ['not_requested', 'No solicitada'], ['pending', 'Pendiente'], ['confirmed', 'Confirmada'], ['declined', 'Rechazada']],
    receipt: [['', 'Todos'], ['pending', 'Pendiente'], ['sent', 'Enviado'], ['failed', 'Fallido'], ['uncertain', 'Incierto']],
  };
  for (const [name, expected] of Object.entries(expectedOptions)) {
    expect(await page.locator(`select[name="${name}"] option`).evaluateAll((options) => options.map((option) => [(option as HTMLOptionElement).value, option.textContent?.trim()]))).toEqual(expected);
  }

  await page.getByLabel('Respuesta').selectOption('declined');
  await page.getByRole('button', { name: 'Filtrar' }).click();
  await expect(page.getByText('No hay inscripciones con estos filtros.')).toBeVisible();
  expect(new URL(page.url()).searchParams.get('participant')).toBe('declined');
});

for (const width of [320, 360, 390, 650]) {
  test(`keeps the populated list and detail usable without horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await login(page);

    await expect(page.getByText(LONG_NAME, { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: LONG_EMAIL })).toHaveAttribute('href', `mailto:${LONG_EMAIL}`);
    await expect(page.getByRole('link', { name: '+5491199998888' })).toHaveAttribute('href', 'tel:+5491199998888');
    await expectMinimumTouchHeight(page.locator('.admin-filters select, .admin-filters button, .admin-filters a, .admin-registration-card__detail'));
    await expectNoHorizontalOverflow(page, width);

    await page.getByRole('link', { name: 'Herramientas' }).click();
    await page.getByLabel('Revisión').focus();
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Respuesta')).toBeFocused();

    await page.getByRole('link', { name: 'Ver inscripción' }).click();
    await expect(page).toHaveURL(`${origin}/admin/inscripciones/${encodeURIComponent(LONG_ID)}`);
    await expect(page.getByRole('heading', { level: 1, name: LONG_NAME })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Datos enviados' })).toBeVisible();
    await expect(page.getByLabel('Nombre completo')).toHaveValue(LONG_NAME);
    await expect(page.getByLabel('Correo electrónico')).toHaveValue(LONG_EMAIL);
    await expect(page.getByLabel('Teléfono argentino')).toHaveValue('+54 9 11 9999-8888');
    await expect(page.getByLabel('Experiencia')).toHaveValue('educador');
    await expect(page.getByRole('link', { name: `Abrir mensaje para ${LONG_NAME}` })).toHaveAttribute('href', /wa\.me\/5491199998888\?text=Hola%20/);
    await expectMinimumTouchHeight(page.locator('.admin-detail a:visible, .admin-detail button:visible, .admin-detail select:visible, .admin-detail input:visible'));
    await expectNoHorizontalOverflow(page, width);
  });
}

test('preserves the semantic desktop table without overflow', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page);
  await expect(page.locator('.admin-table-wrap table')).toBeVisible();
  await expect(page.locator('thead')).toBeVisible();
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await expectNoHorizontalOverflow(page, 1440);
});

test('edits all submitted answers and refreshes the manual receipt message without changing lifecycle state', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 1000 });
  await login(page);
  await page.getByRole('link', { name: 'Ver inscripción' }).click();
  await page.getByLabel('Nombre completo').fill('Alejandra Editada');
  await page.getByLabel('Correo electrónico').fill('alejandra.editada@example.test');
  await page.getByLabel('Teléfono argentino').fill('011 15-4444-5555');
  await page.getByLabel('Barbería').fill('Barbería Sur');
  await page.getByLabel('Experiencia').selectOption('profesional');
  await page.getByRole('button', { name: 'Guardar datos enviados' }).click();

  await expect(page).toHaveURL(`${origin}/admin/inscripciones/${encodeURIComponent(LONG_ID)}?updated=1`);
  await expect(page.getByRole('status')).toHaveText('Los datos enviados se actualizaron.');
  await expect(page.getByRole('link', { name: 'Abrir mensaje para Alejandra Editada' })).toHaveAttribute('href', /wa\.me\/5491144445555/);
  expect((await client.execute({ sql: `SELECT full_name, email, phone, phone_e164, barbershop, experience, review_state,
    participant_response_state, state_version FROM barber_signups WHERE id = ?`, args: [LONG_ID] })).rows).toEqual([{
      full_name: 'Alejandra Editada', email: 'alejandra.editada@example.test', phone: '011 15-4444-5555', phone_e164: '+5491144445555',
      barbershop: 'Barbería Sur', experience: 'profesional', review_state: 'under_review', participant_response_state: 'pending', state_version: 1,
    }]);
  expect((await client.execute({ sql: `SELECT action, from_value, to_value FROM admin_audit_events WHERE registration_id = ?`, args: [LONG_ID] })).rows)
    .toEqual([{ action: 'registration_responses_updated', from_value: null, to_value: null }]);
});
