import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { getCurrentDraftTerms } from '../../src/lib/terms/draft-terms-manifest';
import {
  generateTermsPdf,
  getPdfPageTexts,
  loadDraftTermsSource,
} from '../../scripts/generate-terms-pdf.mjs';
import { verifyTermsPdf } from '../../scripts/verify-terms-pdf.mjs';

const root = process.cwd();
const marker = 'BORRADOR — PENDIENTE DE REVISIÓN LEGAL';
const categories = [
  'Copa Estudiante — Degradado',
  'Copa Profesional — Fade',
  'Copa Clásico y Barba',
  'Copa Freestyle — Diseño Creativo',
];
const placeholders = [
  '[PLAZO A DEFINIR]', '[A DEFINIR]', '[TIEMPO A DEFINIR]', '[A DEFINIR]',
  '[A DEFINIR]', '[TIEMPO A DEFINIR]', '[A DEFINIR]', '[CONDICIÓN INICIAL A DEFINIR]',
  '[A DEFINIR]', '[A DEFINIR]', '[A DEFINIR]', '[A DEFINIR CON REVISIÓN LEGAL]',
  '[A DEFINIR]', '[A DEFINIR]', '[A DEFINIR]', '[A DEFINIR]',
];
const placeholderTokens = (text: string) => text.match(/\[[^\]]*A DEFINIR[^\]]*\]/g) ?? [];

describe('immutable draft terms PDF', () => {
  it('verifies the committed offline PDF and keeps the marker and unresolved draft content on every page', async () => {
    const terms = getCurrentDraftTerms();
    const result = await verifyTermsPdf({ root });
    const bytes = await readFile(resolve(root, 'public', terms.publicPath.slice(1)));
    const pages = getPdfPageTexts(bytes);

    expect(result).toEqual({ version: terms.version, sha256: terms.sha256, pages: pages.length });
    expect(pages.length).toBeGreaterThan(1);
    const source = await loadDraftTermsSource({ root, sourcePath: terms.sourcePath });
    const pdfText = pages.join('\n');
    expect(pages.every((page) => page.includes(marker))).toBe(true);
    const sourceText = [
      ...source.categories.flatMap((category: { eligibility: string; work: string; unresolved: string }) => [category.eligibility, category.work, category.unresolved]),
      ...source.sharedRequirements,
    ].join('\n');
    expect(placeholderTokens(sourceText)).toEqual(placeholders);
    expect(placeholderTokens(pdfText.replace(/\s+/g, ' '))).toEqual(placeholders);
    expect(pdfText).toEqual(expect.stringContaining('La experiencia indicada en la inscripción no es una categoría de competencia'));
    for (const category of categories) expect(pdfText).toEqual(expect.stringContaining(category));
  });

  it('rejects coordinated active-manifest identity drift', async () => {
    const tempRoot = resolve(root, 'tests', '.terms-pdf-identity-drift');
    const manifestPath = resolve(tempRoot, 'src/lib/terms/draft-terms-manifest.ts');
    try {
      await mkdir(resolve(tempRoot, 'content/draft-terms'), { recursive: true });
      await mkdir(resolve(tempRoot, 'public/documentos/bases-y-categorias'), { recursive: true });
      await mkdir(resolve(tempRoot, 'src/lib/terms'), { recursive: true });
      await writeFile(resolve(tempRoot, 'content/draft-terms/draft-2026-09-v1.json'), await readFile(resolve(root, 'content/draft-terms/draft-2026-09-v1.json')));
      await writeFile(resolve(tempRoot, 'public/documentos/bases-y-categorias/borrador-2026-09-v1.pdf'), await readFile(resolve(root, 'public/documentos/bases-y-categorias/borrador-2026-09-v1.pdf')));
      const manifest = await readFile(resolve(root, 'src/lib/terms/draft-terms-manifest.ts'), 'utf8');
      await writeFile(manifestPath, manifest.replaceAll('draft-2026-09-v1', 'draft-2026-10-v1').replace('application/pdf', 'application/x-pdf'));

      await expect(verifyTermsPdf({ root: tempRoot })).rejects.toThrow(/immutable identity/i);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('refuses to replace bytes for an existing version path', async () => {
    const terms = getCurrentDraftTerms();
    const outputPath = resolve(root, 'public', terms.publicPath.slice(1));
    const source = await loadDraftTermsSource({ root, sourcePath: terms.sourcePath });
    const original = await readFile(outputPath);

    await expect(generateTermsPdf({ root, outputPath, source: { ...source, title: 'Cambio no permitido' } }))
      .rejects.toThrow('Refusing to replace immutable draft terms bytes');
    expect(await readFile(outputPath)).toEqual(original);
  });
});
