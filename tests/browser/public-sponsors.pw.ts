import { dev } from 'astro';
import { expect, test, type Page } from '@playwright/test';

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

async function expectSponsorArtworkContained(page: Page, viewportWidth: number) {
  await page.setViewportSize({ width: viewportWidth, height: 900 });
  await page.goto(`${appOrigin}/`);

  const cards = page.locator('[data-sponsor-card]');
  await expect(cards).toHaveCount(8);

  for (let index = 0; index < 8; index += 1) {
    const card = cards.nth(index);
    const image = card.locator('.sponsor-logo img');
    await image.scrollIntoViewIfNeeded();
    await image.evaluate(async (element) => {
      const sponsorImage = element as HTMLImageElement;
      if (!sponsorImage.complete) {
        await new Promise<void>((resolve, reject) => {
          sponsorImage.addEventListener('load', () => resolve(), { once: true });
          sponsorImage.addEventListener('error', () => reject(new Error(`Failed to load ${sponsorImage.src}`)), { once: true });
        });
      }
      await sponsorImage.decode();
    });

    const geometry = await card.evaluate((element) => {
      const panel = element.querySelector('.sponsor-logo')!.getBoundingClientRect();
      const artwork = element.querySelector('.sponsor-logo img')!.getBoundingClientRect();
      const caption = element.querySelector('figcaption')!.getBoundingClientRect();
      return {
        panel: { top: panel.top, right: panel.right, bottom: panel.bottom, left: panel.left },
        artwork: { top: artwork.top, right: artwork.right, bottom: artwork.bottom, left: artwork.left },
        caption: { top: caption.top },
      };
    });

    const tolerance = 1;
    expect(geometry.artwork.left).toBeGreaterThanOrEqual(geometry.panel.left - tolerance);
    expect(geometry.artwork.right).toBeLessThanOrEqual(geometry.panel.right + tolerance);
    expect(geometry.artwork.top).toBeGreaterThanOrEqual(geometry.panel.top - tolerance);
    expect(geometry.artwork.bottom).toBeLessThanOrEqual(geometry.panel.bottom + tolerance);
    expect(geometry.panel.bottom).toBeLessThanOrEqual(geometry.caption.top + tolerance);
    expect(geometry.artwork.bottom).toBeLessThanOrEqual(geometry.caption.top - tolerance);
    expect(Math.abs(
      (geometry.artwork.left + geometry.artwork.right) / 2
      - (geometry.panel.left + geometry.panel.right) / 2,
    )).toBeLessThanOrEqual(tolerance);
    expect(Math.abs(
      (geometry.artwork.top + geometry.artwork.bottom) / 2
      - (geometry.panel.top + geometry.panel.bottom) / 2,
    )).toBeLessThanOrEqual(tolerance);
  }
}

test('keeps every sponsor artwork centered inside its panel and above its caption responsively', async ({ page }) => {
  for (const viewportWidth of [1280, 768, 390, 320]) {
    await expectSponsorArtworkContained(page, viewportWidth);
  }
});

test('shows eight large uncropped sponsor logos and navigates with controls and keyboard', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`${appOrigin}/`);

  const sponsors = page.getByRole('region', { name: 'Sponsors del evento' });
  const track = sponsors.getByRole('group', { name: 'Logos de sponsors' });
  const previous = sponsors.getByRole('button', { name: 'Sponsor anterior' });
  const next = sponsors.getByRole('button', { name: 'Sponsor siguiente' });

  const sponsorCards = sponsors.locator('.sponsor-card');
  await expect(sponsorCards).toHaveCount(8);
  const cardMetrics = await sponsorCards.evaluateAll((cards) => cards.map((card) => ({
    width: card.getBoundingClientRect().width,
    logoHeight: card.querySelector('.sponsor-logo')?.getBoundingClientRect().height ?? 0,
  })));
  expect(new Set(cardMetrics.map(({ width }) => width)).size).toBe(1);
  for (const { width, logoHeight } of cardMetrics) {
    expect(width).toBeCloseTo(336, 0);
    expect(logoHeight).toBeCloseTo(224, 0);
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
  await expect(sponsorImages).toHaveCount(8);

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

  for (let index = 0; index < 8; index += 1) {
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

  test('shows one large card with the next card peeking and supports native swipe scrolling', async ({ page }) => {
    await page.goto(`${appOrigin}/`);
    const sponsors = page.getByRole('region', { name: 'Sponsors del evento' });
    const track = sponsors.getByRole('group', { name: 'Logos de sponsors' });
    const firstCard = sponsors.locator('.sponsor-card').first();

    const [trackBox, cardBox] = await Promise.all([track.boundingBox(), firstCard.boundingBox()]);
    expect(trackBox).not.toBeNull();
    expect(cardBox).not.toBeNull();
    expect(cardBox!.width).toBeGreaterThan(trackBox!.width * 0.7);
    expect(cardBox!.width).toBeLessThan(trackBox!.width * 0.85);
    await expect(firstCard.locator('.sponsor-logo')).toHaveCSS('height', '208px');
    await expect.poll(() => track.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);

    await track.evaluate((element) => element.scrollTo({ left: element.scrollWidth, behavior: 'instant' }));
    await expect.poll(() => track.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  });
});
