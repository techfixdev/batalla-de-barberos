import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

async function source(path: string) {
  return readFile(resolve(root, path), 'utf8');
}

describe('public hero branding', () => {
  it('replaces only the edition marker with the shared decorative EntreCortes emblem', async () => {
    const page = await source('src/pages/index.astro');

    expect(page).toContain("import logo from '../assets/barber-battle/entre-cortes-logo-ai.png';");
    expect(page).toMatch(/<img class="hero-emblem"[^>]+data-hero-shears-origin[^>]+alt=""[^>]*\/>/);
    expect(page).not.toContain('<p class="edition"><span>1ra</span> edición</p>');
    expect(page).toContain('<h1 id="hero-title">');
    expect(page).toContain('<dl class="event-facts" aria-label="Datos del evento">');
  });

  it('enlarges the centered hero emblem by 25% at desktop and mobile scales without rotating it', async () => {
    const css = await source('src/styles/global.css');

    expect(css).toMatch(/\.hero-emblem\s*\{[^}]*width:\s*clamp\(8\.125rem,\s*17\.5vw,\s*11\.25rem\)[^}]*margin:\s*0 auto/);
    expect(css).not.toMatch(/\.hero-emblem\s*\{[^}]*rotate/);
    expect(css).toMatch(/@media \(max-width: 650px\)[^]*\.hero-emblem\s*\{[^}]*width:\s*clamp\(7\.1875rem,\s*32\.5vw,\s*9\.0625rem\)/);
    expect(css).toMatch(/@media \(max-width: 650px\)[^]*\.event-presenter\s*\{[^}]*font-size:\s*clamp\(2\.65rem,\s*13\.25vw,\s*3\.9rem\)/);
  });

  it('measures both logo-to-scissors axes after fonts settle and triggers one rise', async () => {
    const page = await source('src/pages/index.astro');
    const css = await source('src/styles/global.css');

    expect(page).toContain('document.fonts.ready');
    expect(page).toContain("getBoundingClientRect()");
    expect(page).toContain("--hero-origin-x");
    expect(page).toContain("--hero-origin-y");
    expect(page).toContain("hero-shears-ready");
    expect(css).toMatch(/\.hero-shears-ready \.beam-scissor\s*\{[^}]*animation:\s*beam-shears-rise 1\.8s[^}]*forwards/);
    expect(css).toMatch(/@keyframes beam-shears-rise\s*\{[^]*var\(--hero-origin-x[^]*var\(--hero-origin-y[^]*translateX\(-50%\)/);
    expect(css).not.toMatch(/beam-shears-rise[^;]*infinite/);
    expect(css).not.toContain('beam-shears-float-mobile');
  });

  it('keeps the exact final position as the no-JS and reduced-motion fallback', async () => {
    const css = await source('src/styles/global.css');

    expect(css).toMatch(/\.beam-scissor\s*\{[^}]*top:\s*calc\(var\(--beam-size\) \* \.167\)[^}]*left:\s*50%[^}]*transform:\s*translateX\(-50%\)/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[^]*\.beam-scissor\s*\{[^}]*opacity:\s*1[^}]*transform:\s*translateX\(-50%\)/);
  });
});
