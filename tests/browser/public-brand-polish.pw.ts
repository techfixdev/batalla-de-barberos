import { dev } from 'astro';
import { expect, test } from '@playwright/test';

let astroServer: Awaited<ReturnType<typeof dev>>;
let appOrigin: string;

const expectedRuleCount = 66;

async function heroMeasurements(page: import('@playwright/test').Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => {
    const hero = document.querySelector('.hero');
    return hero && !hero.classList.contains('hero-shears-pending') && !hero.classList.contains('hero-shears-ready');
  });
  return page.evaluate(() => {
    const hero = document.querySelector<HTMLElement>('.hero');
    const shears = document.querySelector<HTMLElement>('.beam-scissor');
    const emblem = document.querySelector<HTMLElement>('.hero-emblem');
    const presenter = document.querySelector<HTMLElement>('.event-presenter');
    const actions = document.querySelector<HTMLElement>('.hero-actions');
    if (!hero || !shears || !emblem || !presenter || !actions) throw new Error('Hero branding is missing.');
    const range = document.createRange();
    range.selectNodeContents(presenter);
    const heroRect = hero.getBoundingClientRect();
    const shearsRect = shears.getBoundingClientRect();
    const emblemRect = emblem.getBoundingClientRect();
    const presenterRect = presenter.getBoundingClientRect();
    const actionsRect = actions.getBoundingClientRect();
    return {
      ratio: emblemRect.width / range.getBoundingClientRect().width,
      shearsToEmblem: emblemRect.top - shearsRect.bottom,
      emblemToTitle: presenterRect.top - emblemRect.bottom,
      titleToActions: actionsRect.top - presenterRect.bottom,
      topInset: shearsRect.top - heroRect.top,
      bottomInset: heroRect.bottom - actionsRect.bottom,
    };
  });
}

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

test('navbar reaches categories and desktop emblem is nearly as wide as Entre Cortes', async ({ page }) => {
  await page.goto(`${appOrigin}/`);

  const navigation = page.getByRole('navigation', { name: 'Navegación principal' });
  await expect(navigation.getByRole('link')).toHaveCount(4);
  await expect(navigation.getByRole('link').allTextContents()).resolves.toEqual([
    'Inicio',
    'Categorías',
    'Inscripción',
    'Participación',
  ]);
  for (const link of await navigation.getByRole('link').all()) {
    const box = await link.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }

  await navigation.getByRole('link', { name: 'Categorías' }).click();
  await expect(page).toHaveURL(`${appOrigin}/#categorias`);
  await expect(page.locator('#categorias')).toBeInViewport();
  const hero = await heroMeasurements(page);
  expect(hero.ratio).toBeCloseTo(.85, 1);
  expect(hero).toMatchObject({
    shearsToEmblem: expect.any(Number),
    emblemToTitle: expect.any(Number),
    titleToActions: expect.any(Number),
    topInset: expect.any(Number),
    bottomInset: expect.any(Number),
  });
  expect(Math.min(hero.shearsToEmblem, hero.emblemToTitle, hero.titleToActions, hero.topInset, hero.bottomInset)).toBeGreaterThanOrEqual(0);
});

test('settled desktop scissors keep clear of the full-size emblem at common viewport heights', async ({ page }) => {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 651, height: 768 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${appOrigin}/`);

    const hero = await heroMeasurements(page);
    expect(hero.ratio).toBeCloseTo(.85, 1);
    expect(hero.shearsToEmblem, `${viewport.width}x${viewport.height} scissors-to-emblem gap`).toBeGreaterThanOrEqual(16);
    expect(hero.emblemToTitle).toBeGreaterThanOrEqual(0);
    expect(hero.titleToActions).toBeGreaterThanOrEqual(0);
    expect(hero.bottomInset).toBeGreaterThanOrEqual(0);

    await page.locator('.hero-actions').scrollIntoViewIfNeeded();
    await expect(page.locator('.event-presenter')).toBeVisible();
    await expect(page.locator('.hero-actions')).toBeVisible();
  }
});

test('category disclosures toggle independently by click and keyboard while retaining all rules', async ({ page }) => {
  await page.goto(`${appOrigin}/#categorias`);
  const cards = page.locator('details.rule-card');
  const summaries = cards.locator('summary');

  await expect(cards).toHaveCount(5);
  await expect(page.locator('.rule-card li')).toHaveCount(expectedRuleCount);
  for (let index = 0; index < 5; index += 1) await expect(cards.nth(index)).not.toHaveAttribute('open', '');

  await summaries.nth(0).click();
  await expect(cards.nth(0)).toHaveAttribute('open', '');
  await expect(cards.nth(1)).not.toHaveAttribute('open', '');

  await summaries.nth(0).focus();
  await page.keyboard.press('Enter');
  await expect(cards.nth(0)).not.toHaveAttribute('open', '');

  await summaries.nth(1).focus();
  await expect(summaries.nth(1)).toHaveCSS('outline-style', 'solid');
  await page.keyboard.press('Space');
  await expect(cards.nth(1)).toHaveAttribute('open', '');
  await expect(cards.nth(0)).not.toHaveAttribute('open', '');
});

test.describe('mobile category polish', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });

  test('four navigation targets fit and touch opens one category without opening its neighbors', async ({ page }) => {
    await page.goto(`${appOrigin}/`);
    const links = page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('link');
    await expect(links).toHaveCount(4);
    for (const link of await links.all()) {
      const box = await link.boundingBox();
      expect(box?.width).toBeGreaterThanOrEqual(44);
      expect(box?.height).toBeGreaterThanOrEqual(44);
      expect(Number.parseFloat(await link.evaluate((element) => getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(11);
    }

    const hero = await heroMeasurements(page);
    expect(hero.ratio).toBeCloseTo(.88, 1);
    expect(Math.min(hero.shearsToEmblem, hero.emblemToTitle, hero.titleToActions, hero.topInset, hero.bottomInset)).toBeGreaterThanOrEqual(0);
    const cards = page.locator('details.rule-card');
    await cards.nth(2).locator('summary').tap();
    await expect(cards.nth(2)).toHaveAttribute('open', '');
    await expect(cards.nth(1)).not.toHaveAttribute('open', '');
    await expect(cards.nth(3)).not.toHaveAttribute('open', '');
  });
});
