import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

async function source(path: string) {
  return readFile(resolve(root, path), 'utf8');
}

describe('public navbar branding', () => {
  it('keeps the animated emblem structurally separate from fixed brand copy', async () => {
    const layout = await source('src/layouts/Layout.astro');

    expect(layout).toContain("import logo from '../assets/barber-battle/entre-cortes-logo-ai.png';");
    expect(layout).toMatch(/<span class="brand-emblem"[^>]*>\s*<img[^>]+alt=""\s*\/>\s*<\/span>\s*<span class="brand-copy">/);
    expect(layout).toContain('<span class="brand-name">ENTRECORTES</span>');
    expect(layout).toContain('<span class="brand-subtitle">batalla de barberos</span>');
  });

  it('removes only the header corner rule while retaining navigation cues and the neutral border', async () => {
    const css = await source('src/styles/global.css');

    expect(css).not.toContain('.site-header::after');
    expect(css).toMatch(/\.site-header\s*\{[^}]*border-bottom:\s*1px solid var\(--line-soft\)/);
    expect(css).toContain('.site-header nav a::after');
    expect(css).toContain(".site-header nav a[aria-current='page']::after");
  });

  it('sizes and animates only the emblem with a long rest and reduced-motion protection', async () => {
    const css = await source('src/styles/global.css');

    expect(css).toMatch(/\.brand-emblem\s*\{[^}]*width:\s*5\.8rem[^}]*height:\s*4\.35rem/);
    expect(css).toMatch(/\.brand-emblem img\s*\{[^}]*animation:\s*brand-emblem-spin 12s/);
    expect(css).not.toMatch(/\.(?:brand|brand-copy|brand-name|brand-subtitle)\s*\{[^}]*animation:/);
    expect(css).toMatch(/@keyframes brand-emblem-spin\s*\{[^]*0%,\s*82%[^}]*rotateY\(0deg\)[^]*96%,\s*100%[^}]*rotateY\(360deg\)/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[^]*animation:\s*none !important/);
    expect(css).toMatch(/@media \(max-width: 650px\)[^]*\.brand-emblem\s*\{[^}]*width:\s*3\.6rem[^}]*height:\s*2\.7rem/);
  });

  it('uses a readable two-row header at narrow mobile widths', async () => {
    const css = await source('src/styles/global.css');

    expect(css).toMatch(/@media \(max-width: 480px\)[^]*\.site-header\s*\{[^}]*flex-direction:\s*column[^}]*padding-inline:\s*\.75rem/);
    expect(css).toMatch(/@media \(max-width: 480px\)[^]*\.site-header \.brand-emblem\s*\{[^}]*width:\s*4rem[^}]*height:\s*3rem/);
    expect(css).toMatch(/@media \(max-width: 480px\)[^]*\.site-header \.brand-subtitle\s*\{[^}]*font-size:\s*\.6875rem/);
    expect(css).toMatch(/@media \(max-width: 480px\)[^]*\.site-header nav\s*\{[^}]*width:\s*100%[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/);
    expect(css).toMatch(/@media \(max-width: 480px\)[^]*\.site-header nav a\s*\{[^}]*min-width:\s*44px[^}]*min-height:\s*44px[^}]*font-size:\s*\.6875rem/);
    expect(css).not.toMatch(/@media \(max-width: 370px\)[^]*\.site-header(?:\s|\.)/);
  });
});
