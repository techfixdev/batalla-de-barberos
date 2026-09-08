import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

async function source(path: string) {
  return readFile(resolve(root, path), 'utf8');
}

describe('public sponsors carousel', () => {
  it('places the sponsors carousel between the rules and signup sections', async () => {
    const page = await source('src/pages/index.astro');

    expect(page).toContain("import SponsorsCarousel from '../components/SponsorsCarousel.astro';");
    expect(page).toMatch(/<BarberRules \/>\s*<SponsorsCarousel \/>\s*<section id="inscripcion"/);
  });

  it('renders all five visually verified sponsors as direct static images', async () => {
    const [component, css] = await Promise.all([
      source('src/components/SponsorsCarousel.astro'),
      source('src/styles/global.css'),
    ]);

    expect(component).not.toContain("from 'astro:assets'");
    for (const name of [
      'TBH Estudio',
      'Harakiri Barber Studio',
      'Jr Estudio 203',
      'Entre Cortes Stream',
      'Giovato Estudio',
    ]) {
      expect(component).toContain(`name: '${name}'`);
    }
    expect(component).toContain('<img');
    expect(component).toContain('src={sponsor.logo.src}');
    expect(component).toContain('width={sponsor.logo.width}');
    expect(component).toContain('height={sponsor.logo.height}');
    expect(component).toContain('alt={`Logo de ${sponsor.name}`}');
    expect(component).toContain('loading="lazy"');
    expect(component).toContain('decoding="async"');
    expect(component).not.toMatch(/\bwidths=|\bsizes=/);
    expect(css).toMatch(/\.sponsor-logo img\s*\{[^}]*object-fit:\s*contain/);
  });

  it('provides labelled controls, automatic playback, keyboard navigation, and motion safeguards', async () => {
    const component = await source('src/components/SponsorsCarousel.astro');
    const css = await source('src/styles/global.css');

    expect(component).toContain('aria-label="Sponsors del evento"');
    expect(component).toContain('aria-label="Sponsor anterior"');
    expect(component).toContain('aria-label="Sponsor siguiente"');
    expect(component).toContain('aria-label="Pausar reproducción automática"');
    expect(component).toContain('data-sponsors-autoplay');
    expect(component).toContain('const autoplayDelay = 3000;');
    expect(component).toContain("case 'ArrowLeft':");
    expect(component).toContain("case 'ArrowRight':");
    expect(component).toContain("case 'Home':");
    expect(component).toContain("case 'End':");
    expect(component).toContain("document.addEventListener('visibilitychange'");
    expect(component).toContain("matchMedia('(prefers-reduced-motion: reduce)')");
    expect(css).toMatch(/\.sponsors-track\s*\{[^}]*overflow-x:\s*auto[^}]*scroll-snap-type:\s*x mandatory/);
    expect(css).toMatch(/\.sponsor-card\s*\{[^}]*flex:\s*0 0 17rem[^}]*scroll-snap-align:\s*start/);
    expect(css).toMatch(/\.sponsor-logo\s*\{[^}]*height:\s*10\.625rem/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[^]*\.sponsors-track\s*\{[^}]*scroll-behavior:\s*auto/);
  });
});
