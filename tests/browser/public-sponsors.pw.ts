import { dev } from 'astro';
import { expect, test } from '@playwright/test';

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

test('shows five uncropped sponsor logos before signup and navigates with controls and keyboard', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`${appOrigin}/`);

  const sponsors = page.getByRole('region', { name: 'Sponsors del evento' });
  const track = sponsors.getByRole('group', { name: 'Logos de sponsors' });
  const previous = sponsors.getByRole('button', { name: 'Sponsor anterior' });
  const next = sponsors.getByRole('button', { name: 'Sponsor siguiente' });

  await expect(sponsors.locator('.sponsor-card')).toHaveCount(5);
  await expect.poll(() => page.evaluate(() => {
    const rules = document.querySelector('#categorias');
    const sponsorsSection = document.querySelector('[data-sponsors-carousel]');
    const signup = document.querySelector('#inscripcion');
    if (!rules || !sponsorsSection || !signup) return false;
    return Boolean(rules.compareDocumentPosition(sponsorsSection) & Node.DOCUMENT_POSITION_FOLLOWING)
      && Boolean(sponsorsSection.compareDocumentPosition(signup) & Node.DOCUMENT_POSITION_FOLLOWING);
  })).toBe(true);
  await expect(sponsors.locator('img')).toHaveCount(5);
  for (const image of await sponsors.locator('img').all()) {
    await expect(image).toHaveCSS('object-fit', 'contain');
  }

  await expect(previous).toBeDisabled();
  const initialLeft = await track.evaluate((element) => element.scrollLeft);
  await next.click();
  await expect.poll(() => track.evaluate((element) => element.scrollLeft)).toBeGreaterThan(initialLeft);
  await expect(previous).toBeEnabled();

  await track.focus();
  await page.keyboard.press('End');
  await expect.poll(() => track.evaluate((element) => element.scrollLeft)).toBeGreaterThan(initialLeft);
  await expect(next).toBeDisabled();
  await page.keyboard.press('Home');
  await expect.poll(() => track.evaluate((element) => element.scrollLeft)).toBeLessThanOrEqual(5);
  await expect(previous).toBeDisabled();
});

test.describe('mobile sponsor carousel', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });

  test('keeps cards responsive and exposes native horizontal scrolling for swipe', async ({ page }) => {
    await page.goto(`${appOrigin}/`);
    const sponsors = page.getByRole('region', { name: 'Sponsors del evento' });
    const track = sponsors.getByRole('group', { name: 'Logos de sponsors' });
    const firstCard = sponsors.locator('.sponsor-card').first();

    const [trackBox, cardBox] = await Promise.all([track.boundingBox(), firstCard.boundingBox()]);
    expect(trackBox).not.toBeNull();
    expect(cardBox).not.toBeNull();
    expect(cardBox!.width).toBeLessThan(trackBox!.width);
    await expect.poll(() => track.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);

    await track.evaluate((element) => element.scrollTo({ left: element.scrollWidth, behavior: 'instant' }));
    await expect.poll(() => track.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  });
});
