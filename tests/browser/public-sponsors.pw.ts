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

test('shows five uniform uncropped sponsor logos and navigates with controls and keyboard', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`${appOrigin}/`);

  const sponsors = page.getByRole('region', { name: 'Sponsors del evento' });
  const track = sponsors.getByRole('group', { name: 'Logos de sponsors' });
  const previous = sponsors.getByRole('button', { name: 'Sponsor anterior' });
  const next = sponsors.getByRole('button', { name: 'Sponsor siguiente' });

  const sponsorCards = sponsors.locator('.sponsor-card');
  await expect(sponsorCards).toHaveCount(5);
  const cardMetrics = await sponsorCards.evaluateAll((cards) => cards.map((card) => ({
    width: card.getBoundingClientRect().width,
    logoHeight: card.querySelector('.sponsor-logo')?.getBoundingClientRect().height ?? 0,
  })));
  expect(new Set(cardMetrics.map(({ width }) => width)).size).toBe(1);
  for (const { width, logoHeight } of cardMetrics) {
    expect(width).toBeCloseTo(272, 0);
    expect(logoHeight).toBeCloseTo(170, 0);
  }
  await expect.poll(() => page.evaluate(() => {
    const rules = document.querySelector('#categorias');
    const sponsorsSection = document.querySelector('[data-sponsors-carousel]');
    const signup = document.querySelector('#inscripcion');
    if (!rules || !sponsorsSection || !signup) return false;
    return Boolean(rules.compareDocumentPosition(sponsorsSection) & Node.DOCUMENT_POSITION_FOLLOWING)
      && Boolean(sponsorsSection.compareDocumentPosition(signup) & Node.DOCUMENT_POSITION_FOLLOWING);
  })).toBe(true);
  const sponsorImages = sponsors.locator('img');
  await expect(sponsorImages).toHaveCount(5);

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

  for (let index = 0; index < 5; index += 1) {
    const image = sponsorImages.nth(index);
    await image.scrollIntoViewIfNeeded();
    const dimensions = await image.evaluate(async (element) => {
      const imageElement = element as HTMLImageElement;
      await imageElement.decode();
      return {
        naturalWidth: imageElement.naturalWidth,
        naturalHeight: imageElement.naturalHeight,
      };
    });
    expect(dimensions.naturalWidth).toBeGreaterThan(0);
    expect(dimensions.naturalHeight).toBeGreaterThan(0);
    await expect(image).toHaveCSS('object-fit', 'contain');
  }
});

test('automatically advances, loops, and supports explicit and contextual pausing', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`${appOrigin}/`);

  const sponsors = page.getByRole('region', { name: 'Sponsors del evento' });
  const track = sponsors.getByRole('group', { name: 'Logos de sponsors' });
  const autoplay = sponsors.locator('[data-sponsors-autoplay]');
  const scrollLeft = () => track.evaluate((element) => element.scrollLeft);

  const initialLeft = await scrollLeft();
  await expect.poll(scrollLeft, { timeout: 4_000 }).toBeGreaterThan(initialLeft);

  await autoplay.click();
  await expect(autoplay).toHaveAccessibleName('Reanudar reproducción automática');
  await track.evaluate((element) => element.scrollTo({ left: 0, behavior: 'instant' }));
  await page.waitForTimeout(3_200);
  expect(await scrollLeft()).toBeLessThanOrEqual(5);

  await autoplay.click();
  await autoplay.evaluate((element) => element.blur());
  await sponsors.hover();
  await page.waitForTimeout(3_200);
  expect(await scrollLeft()).toBeLessThanOrEqual(5);
  await page.mouse.move(0, 0);
  await expect.poll(scrollLeft, { timeout: 4_000 }).toBeGreaterThan(5);

  await track.focus();
  const focusedLeft = await scrollLeft();
  await page.waitForTimeout(3_200);
  expect(await scrollLeft()).toBeCloseTo(focusedLeft, 0);
  await track.evaluate((element) => element.blur());

  await track.evaluate((element) => element.scrollTo({ left: element.scrollWidth, behavior: 'instant' }));
  await expect.poll(scrollLeft, { timeout: 4_000 }).toBeLessThan(20);
});

test('disables autoplay and smooth scrolling when reduced motion is requested', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${appOrigin}/`);

  const sponsors = page.getByRole('region', { name: 'Sponsors del evento' });
  const track = sponsors.getByRole('group', { name: 'Logos de sponsors' });
  const autoplay = sponsors.getByRole('button', { name: 'Reproducción automática desactivada por movimiento reducido' });
  await expect(autoplay).toBeDisabled();
  await expect(track).toHaveCSS('scroll-behavior', 'auto');
  await page.waitForTimeout(3_200);
  expect(await track.evaluate((element) => element.scrollLeft)).toBeLessThanOrEqual(5);
});

test.describe('mobile sponsor carousel', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });

  test('fits more than one card and exposes native horizontal scrolling for swipe', async ({ page }) => {
    await page.goto(`${appOrigin}/`);
    const sponsors = page.getByRole('region', { name: 'Sponsors del evento' });
    const track = sponsors.getByRole('group', { name: 'Logos de sponsors' });
    const firstCard = sponsors.locator('.sponsor-card').first();

    const [trackBox, cardBox] = await Promise.all([track.boundingBox(), firstCard.boundingBox()]);
    expect(trackBox).not.toBeNull();
    expect(cardBox).not.toBeNull();
    expect(cardBox!.width).toBeLessThan(trackBox!.width / 2);
    expect(cardBox!.width).toBeGreaterThan(140);
    await expect(firstCard.locator('.sponsor-logo')).toHaveCSS('height', '120px');
    await expect.poll(() => track.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);

    await track.evaluate((element) => element.scrollTo({ left: element.scrollWidth, behavior: 'instant' }));
    await expect.poll(() => track.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  });
});
