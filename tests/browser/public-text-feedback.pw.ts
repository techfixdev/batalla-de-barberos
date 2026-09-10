import { dev } from 'astro';
import { expect, test, type CDPSession, type Locator, type Page } from '@playwright/test';

let astroServer: Awaited<ReturnType<typeof dev>>;
let appOrigin: string;

test.beforeAll(async () => {
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

async function centerOf(locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error('Expected feedback target to have a bounding box.');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function directTextPoint(locator: Locator) {
  return locator.evaluate((element) => {
    const textNode = [...element.childNodes].find((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim());
    if (!textNode?.textContent) throw new Error('Expected direct text content.');
    const offset = textNode.textContent.search(/\S/);
    const range = document.createRange();
    range.setStart(textNode, offset);
    range.setEnd(textNode, Math.min(offset + 3, textNode.textContent.length));
    const rect = range.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  });
}

async function startTouch(page: Page, point: { x: number; y: number }) {
  const session = await page.context().newCDPSession(page);
  await sendTouch(session, 'touchStart', point);
  return session;
}

async function sendTouch(session: CDPSession, type: 'touchStart' | 'touchMove' | 'touchEnd' | 'touchCancel', point?: { x: number; y: number }) {
  await session.send('Input.dispatchTouchEvent', {
    type,
    touchPoints: point ? [{ x: point.x, y: point.y }] : [],
  });
  if (type === 'touchEnd' || type === 'touchCancel') await session.detach();
}

test('fine-pointer hover highlights public text and leaves focus feedback available', async ({ page }) => {
  await page.goto(`${appOrigin}/`);
  const heading = page.getByRole('heading', { name: 'Tres pasos. Una silla.' });
  const originalColor = await heading.evaluate((element) => getComputedStyle(element).color);

  await heading.hover();
  await expect.poll(() => heading.evaluate((element) => getComputedStyle(element).color)).not.toBe(originalColor);

  const participation = page.getByRole('link', { name: /Cómo participar/ });
  await participation.focus();
  await expect(participation).toBeFocused();
  await expect(participation).toHaveCSS('outline-style', 'solid');
});

test.describe('non-mouse pointer feedback', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 900, height: 900 } });

  test('appears throughout a held touch and clears on release without delayed reappearance', async ({ page }) => {
    await page.goto(`${appOrigin}/`);
    const heading = page.getByRole('heading', { name: 'Tres pasos. Una silla.' });
    await heading.scrollIntoViewIfNeeded();
    const originalColor = await heading.evaluate((element) => getComputedStyle(element).color);
    const point = await centerOf(heading);

    const session = await startTouch(page, point);
    await expect(heading).toHaveAttribute('data-public-press', '');
    await page.waitForTimeout(300);
    await expect(heading).toHaveAttribute('data-public-press', '');
    await expect(heading).not.toHaveCSS('color', originalColor);

    await sendTouch(session, 'touchEnd');
    await expect(heading).not.toHaveAttribute('data-public-press');
    await page.waitForTimeout(500);
    await expect(heading).not.toHaveAttribute('data-public-press');
    await expect(heading).toHaveCSS('color', originalColor);

    await page.getByRole('link', { name: /Cómo participar/ }).tap();
    await expect(page).toHaveURL(`${appOrigin}/participacion`);
  });

  test('clears transient feedback on cancel, movement, and scrolling', async ({ page }) => {
    await page.goto(`${appOrigin}/`);
    const heading = page.getByRole('heading', { name: 'Tres pasos. Una silla.' });
    await heading.scrollIntoViewIfNeeded();
    let point = await centerOf(heading);

    let session = await startTouch(page, point);
    await expect(heading).toHaveAttribute('data-public-press', '');
    await sendTouch(session, 'touchCancel');
    await expect(heading).not.toHaveAttribute('data-public-press');

    point = await centerOf(heading);
    session = await startTouch(page, point);
    await sendTouch(session, 'touchMove', { x: point.x + 20, y: point.y + 20 });
    await expect(heading).not.toHaveAttribute('data-public-press');
    await sendTouch(session, 'touchEnd');

    point = await centerOf(heading);
    session = await startTouch(page, point);
    await expect(heading).toHaveAttribute('data-public-press', '');
    await page.evaluate(() => window.scrollBy(0, 20));
    await expect(heading).not.toHaveAttribute('data-public-press');
    await sendTouch(session, 'touchEnd');
  });

  test('targets terms consent copy and signup-aside spans without selecting their containers', async ({ page }) => {
    await page.goto(`${appOrigin}/`);
    await page.getByLabel('Nombre y apellido').fill('Ada Lovelace');
    await page.getByLabel('Correo electrónico').fill('ada@example.com');
    await page.getByLabel('Teléfono').fill('+54 11 5555 1234');
    await page.getByLabel('Experiencia').selectOption('profesional');
    await page.getByRole('button', { name: 'Enviar inscripción' }).click();

    const dialog = page.getByRole('dialog', { name: 'Bases y categorías' });
    await expect(dialog).toBeVisible();
    const consentLabel = dialog.locator('.terms-dialog__consent');
    const consentCopy = consentLabel.getByText('Acepto las bases', { exact: true });
    await consentCopy.scrollIntoViewIfNeeded();
    let point = await directTextPoint(consentCopy);

    let session = await startTouch(page, point);
    await expect(consentLabel).toHaveAttribute('data-public-press', '');
    await expect(consentCopy).not.toHaveAttribute('data-public-press');
    await expect(dialog.locator('.terms-dialog__footer')).not.toHaveAttribute('data-public-press');
    await sendTouch(session, 'touchEnd');

    await page.getByRole('button', { name: 'Cancelar' }).click();
    await expect(dialog).not.toBeVisible();

    const asideText = page.locator('.signup-aside > span').first();
    await asideText.scrollIntoViewIfNeeded();
    point = await centerOf(asideText);
    session = await startTouch(page, point);
    await expect(asideText).toHaveAttribute('data-public-press', '');
    await expect(page.locator('.signup-aside')).not.toHaveAttribute('data-public-press');
    await sendTouch(session, 'touchEnd');
  });
});
