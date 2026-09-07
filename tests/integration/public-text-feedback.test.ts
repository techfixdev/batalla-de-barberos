import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

async function source(path: string) {
  return readFile(resolve(root, path), 'utf8');
}

describe('public typography interaction feedback', () => {
  it('scopes feedback to an explicit public layout class', async () => {
    const [layout, css] = await Promise.all([
      source('src/layouts/Layout.astro'),
      source('src/styles/global.css'),
    ]);

    expect(layout).toMatch(/<body class="public-site">/);
    expect(css).toContain('.public-site');
    expect(css).not.toMatch(/(?:^|[},]\s*)(?:h1|h2|h3|p|a|label):(?:hover|active|focus-visible)/m);
    expect(css).not.toMatch(/\.admin-[^,{]*(?:hover|active|focus-visible)[^{]*\{[^}]*(?:text-shadow|--public-text-feedback)/);
  });

  it('uses fine-pointer hover plus delegated non-mouse press feedback without sticky touch active state', async () => {
    const [layout, css] = await Promise.all([
      source('src/layouts/Layout.astro'),
      source('src/styles/global.css'),
    ]);

    expect(css).toMatch(/@media \(hover: hover\) and \(pointer: fine\)\s*\{[^]*\.public-site[^{}]*:hover/);
    expect(css).not.toMatch(/@media \(hover: none\)[^]*\.public-site[^{}]*:hover/);
    expect(css).toMatch(/\.public-site[^{}]*\[data-public-press\][^{]*\{[^}]*(?:color:\s*var\(--public-feedback-color\)|text-shadow:)/);
    expect(css).toMatch(/\.public-site[^{}]*(?:\.poster-rule|\.phrase-rule|hr)[^{}]*\[data-public-press\]/);
    expect(layout).toContain("event.pointerType === 'mouse'");
    expect(layout).toContain("target.setAttribute('data-public-press', '')");
    expect(layout).toMatch(/addEventListener\('pointer(?:up|cancel|move|lostpointercapture)'/);
    expect(layout).toMatch(/addEventListener\('(?:blur|scroll|visibilitychange)'/);
    expect(layout).not.toMatch(/preventDefault|stopPropagation|setPointerCapture|\.click\(\)/);
  });

  it('includes linked consent labels and signup-aside text without targeting broad containers', async () => {
    const [layout, css] = await Promise.all([
      source('src/layouts/Layout.astro'),
      source('src/styles/global.css'),
    ]);

    expect(layout).toMatch(/feedbackSelector\s*=\s*['"][^'"]*label/);
    expect(layout).toMatch(/feedbackSelector\s*=\s*['"][^'"]*\.signup-aside > span/);
    expect(layout).not.toMatch(/feedbackSelector\s*=\s*['"][^'"]*(?:body|\.signup-aside(?:,|['"]))/);
    expect(css).toContain('label, legend');
    expect(css).toContain('.signup-aside > span');
    expect(css).not.toMatch(/label:not\(:has\(a\)\)/);
  });

  it('provides keyboard feedback for interactive text while preserving control contrast and outlines', async () => {
    const css = await source('src/styles/global.css');

    expect(css).toMatch(/\.public-site[^{}]*(?:a|button|input|select)[^{}]*:focus-visible/);
    expect(css).toMatch(/\.public-site[^{}]*\.button-primary[^{}]*:(?:hover|active|focus-visible)[^{]*\{[^}]*color:\s*var\(--ink\)/);
    expect(css).toMatch(/\.public-site[^{}]*\.signup-form \.button-primary[^{}]*:(?:hover|active|focus-visible)[^{]*\{[^}]*color:\s*var\(--ivory\)/);
    expect(css).toMatch(/\.public-site[^{}]*(?:input|select)[^{}]*:(?:hover|active|focus-visible)[^{]*\{[^}]*box-shadow:/);
    expect(css).not.toMatch(/\.public-site[^{}]*:(?:hover|active|focus-visible)[^{]*\{[^}]*outline:\s*none/);
  });

  it('limits feedback transitions and disables them under reduced motion', async () => {
    const css = await source('src/styles/global.css');

    expect(css).toMatch(/\.public-site[^{}]*\{[^}]*(?:transition:[^}]*(?:150ms|180ms|200ms)|transition-duration:\s*(?:150ms|180ms|200ms))/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[^]*\.public-site[^{}]*\{[^}]*transition:\s*none !important/);
  });
});
