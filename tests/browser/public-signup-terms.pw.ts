import { mkdir } from 'node:fs/promises';
import { dev } from 'astro';
import { expect, test, type Page, type Request } from '@playwright/test';

let astroServer: Awaited<ReturnType<typeof dev>>;
let appOrigin: string;
const previewDir = '/tmp/barber-terms-preview';

const validSignup = {
  fullName: 'Ada Lovelace',
  email: 'ada@example.com',
  phone: '+54 11 5555 1234',
  experience: 'profesional',
};

async function completeSignup(page: Page) {
  await page.getByLabel('Nombre y apellido').fill(validSignup.fullName);
  await page.getByLabel('Correo electrónico').fill(validSignup.email);
  await page.getByLabel('Teléfono').fill(validSignup.phone);
  await page.getByLabel('Experiencia').selectOption(validSignup.experience);
}

async function reachTermsBottom(page: Page) {
  const body = page.getByRole('region', { name: 'Bases completas' });
  await body.focus();
  await page.keyboard.press('End');
  await expect(page.getByLabel('Acepto las bases')).toBeEnabled();
}

async function openTerms(page: Page) {
  await completeSignup(page);
  await page.getByRole('button', { name: 'Enviar inscripción' }).click();
  await expect(page.getByRole('dialog', { name: 'Bases y categorías' })).toBeVisible();
}

test.beforeAll(async () => {
  await mkdir(previewDir, { recursive: true });
  astroServer = await dev({
    root: process.cwd(),
    server: { host: '127.0.0.1', port: 0 },
    logLevel: 'silent',
  });
  appOrigin = `http://127.0.0.1:${astroServer.address.port}`;
});

test.afterAll(async () => {
  await astroServer?.stop();
});

test.beforeEach(async ({ page }) => {
  await page.goto(`${appOrigin}/#inscripcion`);
});

test('validates before opening and sends exactly once only after the reading gate and explicit acceptance', async ({ page }) => {
  const requests: Request[] = [];
  await page.route('**/api/signups', async (route) => {
    requests.push(route.request());
    await new Promise((resolve) => setTimeout(resolve, 80));
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ message: 'saved' }) });
  });

  const trigger = page.getByRole('button', { name: 'Enviar inscripción' });
  await trigger.click();
  await expect(page.getByText('Revisá los campos obligatorios.')).toBeVisible();
  await expect(page.locator('#fullName')).toBeFocused();
  expect(requests).toHaveLength(0);

  await openTerms(page);
  expect(requests).toHaveLength(0);
  const dialog = page.getByRole('dialog', { name: 'Bases y categorías' });
  await expect(dialog.getByText('terms-2026-09-v1')).toBeVisible();
  await expect(dialog.getByText('Este documento incorpora las categorías y reglas de competencia aprobadas por la organización.')).toBeVisible();
  await expect(dialog.locator('[data-terms-category]')).toHaveCount(5);
  await expect(dialog.locator('[data-terms-rule]')).toHaveCount(66);
  await expect(dialog.getByText('[A DEFINIR CON REVISIÓN LEGAL]', { exact: false })).toBeVisible();
  await expect(dialog.getByRole('link', { name: 'Bases y categorías (PDF)' })).toHaveAttribute('href', '/documentos/bases-y-categorias/bases-2026-09-v1.pdf');
  await expect(dialog.getByRole('link', { name: 'aviso de participación' })).toHaveAttribute('href', '/participacion');
  await expect(dialog.getByRole('link', { name: 'política de privacidad' })).toHaveAttribute('href', '/privacidad');

  const accepted = page.getByLabel('Acepto las bases');
  const finalSubmit = page.getByRole('button', { name: 'Aceptar y enviar' });
  await expect(accepted).not.toBeChecked();
  await expect(accepted).toBeDisabled();
  await expect(finalSubmit).toBeDisabled();
  await reachTermsBottom(page);
  await expect(page.getByText('Llegaste al final de las bases.')).toBeVisible();
  await expect(accepted).not.toBeChecked();
  await accepted.check();
  await expect(finalSubmit).toBeEnabled();
  await finalSubmit.dblclick();

  await expect.poll(() => requests.length).toBe(1);
  expect(requests[0]!.postDataJSON()).toMatchObject({ ...validSignup, barbershop: '', acceptedRules: true });
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect(page.getByText('Guardamos tu inscripción.', { exact: false })).toBeVisible();
});

test('cancel and Escape retain fields, restore focus, reset the gate, and keep focus trapped', async ({ page }) => {
  await page.route('**/api/signups', (route) => route.abort());
  await openTerms(page);
  const dialog = page.getByRole('dialog', { name: 'Bases y categorías' });
  const trigger = page.getByRole('button', { name: 'Enviar inscripción' });

  await expect.poll(() => page.evaluate(() => document.activeElement?.closest('dialog')?.id)).toBe('terms-acceptance-dialog');
  await page.keyboard.press('Shift+Tab');
  await expect.poll(() => page.evaluate(() => document.activeElement?.closest('dialog')?.id)).toBe('terms-acceptance-dialog');
  await reachTermsBottom(page);
  await page.getByLabel('Acepto las bases').check();
  await page.getByRole('button', { name: 'Cancelar' }).click();
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect(page.locator('#fullName')).toHaveValue(validSignup.fullName);

  await trigger.click();
  await expect(page.getByLabel('Acepto las bases')).toBeDisabled();
  await expect(page.getByLabel('Acepto las bases')).not.toBeChecked();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect(page.locator('#email')).toHaveValue(validSignup.email);
});

test('enables immediately for fitting content and re-evaluates the gate on resize', async ({ page }) => {
  await openTerms(page);
  const body = page.getByRole('region', { name: 'Bases completas' });
  const accepted = page.getByLabel('Acepto las bases');
  await expect(accepted).toBeDisabled();

  await body.evaluate((element) => {
    element.replaceChildren(Object.assign(document.createElement('p'), { textContent: 'Bases breves.' }));
    element.style.height = '400px';
  });
  await page.evaluate(() => window.dispatchEvent(new Event('resize')));
  await expect(accepted).toBeEnabled();
  await expect(accepted).not.toBeChecked();
});

test('revokes acceptance when resize or reverse scrolling moves the body away from the bottom', async ({ page }) => {
  const requests: Request[] = [];
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${appOrigin}/#inscripcion`);
  await page.route('**/api/signups', async (route) => {
    requests.push(route.request());
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ message: 'saved' }) });
  });
  await openTerms(page);
  const body = page.getByRole('region', { name: 'Bases completas' });
  const accepted = page.getByLabel('Acepto las bases');
  const confirm = page.getByRole('button', { name: 'Aceptar y enviar' });

  await reachTermsBottom(page);
  await accepted.check();
  await expect(confirm).toBeEnabled();
  await page.setViewportSize({ width: 1280, height: 500 });
  await expect(accepted).toBeDisabled();
  await expect(accepted).not.toBeChecked();
  await expect(confirm).toBeDisabled();
  expect(requests).toHaveLength(0);

  await reachTermsBottom(page);
  await accepted.check();
  await body.evaluate((element) => element.scrollTo({ top: 0, behavior: 'instant' }));
  await expect(accepted).toBeDisabled();
  await expect(accepted).not.toBeChecked();
  await expect(confirm).toBeDisabled();
  expect(requests).toHaveLength(0);

  await reachTermsBottom(page);
  await accepted.check();
  await confirm.click();
  await expect.poll(() => requests.length).toBe(1);
});

test('keeps the idempotency key across server and network errors, blocks in-flight cancellation, then rotates it after success', async ({ page }) => {
  const keys: string[] = [];
  let attempt = 0;
  await page.route('**/api/signups', async (route) => {
    keys.push(route.request().headers()['idempotency-key'] ?? '');
    attempt += 1;
    if (attempt === 1) {
      await new Promise((resolve) => setTimeout(resolve, 120));
      await route.fulfill({ status: 429, contentType: 'application/json', body: JSON.stringify({ message: 'Demasiados intentos.' }) });
    } else if (attempt === 2) {
      await route.fulfill({ status: 422, contentType: 'application/json', body: JSON.stringify({ message: 'Revisá los datos.', errors: { fullName: 'Nombre inválido.' } }) });
    } else if (attempt === 3) {
      await route.abort('failed');
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ message: 'saved' }) });
    }
  });

  const submitAttempt = async () => {
    await openTerms(page);
    await reachTermsBottom(page);
    await page.getByLabel('Acepto las bases').check();
    await page.getByRole('button', { name: 'Aceptar y enviar' }).click();
  };

  await submitAttempt();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
  await expect(page.getByText('Demasiados intentos.')).toBeVisible();
  await expect(page.getByRole('dialog')).toBeHidden();

  await submitAttempt();
  await expect(page.getByText('Revisá los datos.')).toBeVisible();
  await expect(page.locator('#fullName')).toBeFocused();
  await expect(page.locator('#fullName')).toHaveAttribute('aria-invalid', 'true');
  await submitAttempt();
  await expect(page.getByText('No hay conexión. Revisá tu red e intentá nuevamente.')).toBeVisible();
  await submitAttempt();
  await expect(page.getByText('Guardamos tu inscripción.', { exact: false })).toBeVisible();
  expect(keys[0]).toBeTruthy();
  expect(new Set(keys)).toEqual(new Set([keys[0]]));
});

test('keeps footer actions reachable without horizontal overflow on a narrow dynamic viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto(`${appOrigin}/#inscripcion`);
  await openTerms(page);
  const dialog = page.getByRole('dialog', { name: 'Bases y categorías' });
  await expect(dialog.getByRole('button', { name: 'Cancelar' })).toBeInViewport();
  expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  await dialog.screenshot({ path: `${previewDir}/mobile-modal-top.png` });
  await reachTermsBottom(page);
  await dialog.screenshot({ path: `${previewDir}/mobile-modal-bottom.png` });

  await page.setViewportSize({ width: 1280, height: 800 });
  await dialog.screenshot({ path: `${previewDir}/desktop-modal-bottom.png` });
});
