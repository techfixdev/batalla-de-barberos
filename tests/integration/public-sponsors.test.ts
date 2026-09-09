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

  it('renders all eight visually verified sponsors as direct static images', async () => {
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
      'Zeta Distribuciones',
      'Everest',
      'Pimp Paradise Pomada',
    ]) {
      expect(component).toContain(`name: '${name}'`);
    }
    for (const asset of ['zeta-distribuciones.webp', 'everest.webp', 'pimp-paradise.webp']) {
      expect(component).toContain(asset);
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
    expect(css).toMatch(/\.sponsor-card\s*\{[^}]*flex:\s*0 0 21rem[^}]*scroll-snap-align:\s*start/);
    expect(css).toMatch(/\.sponsor-card figure\s*\{[^}]*grid-template-rows:\s*14rem minmax\(4\.5rem, auto\)/);
    expect(css).toMatch(/\.sponsor-logo\s*\{[^}]*min-width:\s*0[^}]*min-height:\s*0[^}]*padding:\s*1\.25rem/);
    expect(css).toMatch(/\.sponsor-logo img\s*\{[^}]*width:\s*auto[^}]*height:\s*auto[^}]*max-width:\s*100%[^}]*max-height:\s*100%[^}]*object-fit:\s*contain/);
    expect(css).toMatch(/@media \(max-width: 650px\)[^]*\.sponsor-card\s*\{[^}]*flex-basis:\s*78%/);
    expect(css).toMatch(/@media \(max-width: 650px\)[^]*\.sponsor-card figure\s*\{[^}]*grid-template-rows:\s*13rem minmax\(4rem, auto\)/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[^]*\.sponsors-track\s*\{[^}]*scroll-behavior:\s*auto/);
  });
});
