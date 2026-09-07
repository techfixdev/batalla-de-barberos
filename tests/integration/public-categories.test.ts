import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const expectedCategories = [
  { name: 'Fade Profesional', duration: '45 minutos', rules: 14 },
  { name: 'Fast Fade', duration: '15 minutos', rules: 15 },
  { name: 'Lady Barbers', duration: '45 minutos', rules: 14 },
  { name: 'Freestyle', duration: '45 minutos', rules: 12 },
  { name: 'Total Look', duration: '1 hora', rules: 11 },
];

describe('public competition categories', () => {
  it('renders the approved five-category source on the home page without adding category selection to signup', async () => {
    const [component, index, signup, sourceText] = await Promise.all([
      readFile(resolve(root, 'src/components/BarberRules.astro'), 'utf8'),
      readFile(resolve(root, 'src/pages/index.astro'), 'utf8'),
      readFile(resolve(root, 'src/components/SignupForm.astro'), 'utf8'),
      readFile(resolve(root, 'content/draft-terms/draft-2026-09-v2.json'), 'utf8'),
    ]);
    const source = JSON.parse(sourceText) as { categories: Array<{ name: string; duration: string; rules: string[] }> };

    expect(component).toContain("import terms from '../../content/draft-terms/draft-2026-09-v2.json';");
    expect(component).toContain('terms.categories.map');
    expect(index).toContain("import BarberRules from '../components/BarberRules.astro';");
    expect(index).toContain('<BarberRules />');
    expect(source.categories.map(({ name, duration, rules }) => ({ name, duration, rules: rules.length })))
      .toEqual(expectedCategories);
    expect(signup).not.toMatch(/name=["']category|name=["']categoria/i);
  });

  it('keeps every approved historical requirement, restriction, and judging criterion verbatim', async () => {
    const source = JSON.parse(await readFile(resolve(root, 'content/draft-terms/draft-2026-09-v2.json'), 'utf8')) as {
      categories: Array<{ rules: string[] }>;
    };
    const rules = source.categories.flatMap((category) => category.rules);

    expect(rules).toEqual(expect.arrayContaining([
      'Base mínima: alza N.° 2',
      'El competidor puede ser descalificado por trabajo previo',
      'Rapidez en la ejecución',
      'El diseño comienza a partir de 2 o 3 líneas realizadas por el jurado',
      'Trabajo de luces y sombras',
      'Coherencia del corte con el personaje',
      'Integración general del personaje',
      'Impacto visual final',
    ]));
  });
});
