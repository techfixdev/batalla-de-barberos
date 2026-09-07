import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { DRAFT_TERMS, getCurrentDraftTerms } from '../../src/lib/terms/draft-terms-manifest';
import {
  createTermsPdf,
  generateTermsPdf,
  getPdfPageTexts,
  loadDraftTermsSource,
} from '../../scripts/generate-terms-pdf.mjs';
import { verifyTermsPdf } from '../../scripts/verify-terms-pdf.mjs';

const root = process.cwd();
const marker = 'BORRADOR — PENDIENTE DE REVISIÓN LEGAL';
const historicalV1Sha256 = '215148280563df021b09b1634e63deba401cd9418a638f91a3450a8c2abe178e';

describe('immutable draft terms PDFs', () => {
  it('verifies every committed version while selecting v2 as the current immutable draft', async () => {
    const terms = getCurrentDraftTerms();
    const result = await verifyTermsPdf({ root });

    expect(result.current).toEqual({ version: terms.version, sha256: terms.sha256, pages: expect.any(Number) });
    expect(result.documents.map(({ version }) => version)).toEqual(['draft-2026-09-v1', 'draft-2026-09-v2']);
    expect(result.documents.find(({ version }) => version === 'draft-2026-09-v1')?.sha256).toBe(historicalV1Sha256);
  });

  it('puts the legal marker on every v2 page and keeps each complete approved category together', async () => {
    const terms = getCurrentDraftTerms();
    const source = await loadDraftTermsSource({ root, sourcePath: terms.sourcePath });
    const bytes = await readFile(resolve(root, 'public', terms.publicPath.slice(1)));
    const pages = getPdfPageTexts(bytes);

    expect(pages.length).toBe(7);
    expect(pages.every((page) => page.includes(marker))).toBe(true);
    for (const category of source.categories) {
      const matchingPages = pages.filter((page) => page.includes(category.name));
      expect(matchingPages).toHaveLength(1);
      for (const rule of category.rules) expect(matchingPages[0]).toContain(rule);
    }
    expect(pages.join('\n')).toContain('La experiencia indicada en la inscripción no es una categoría de competencia');
  });

  it('reproduces frozen v1 bytes without writing them and reproduces current v2 bytes exactly', async () => {
    for (const terms of Object.values(DRAFT_TERMS)) {
      const source = await loadDraftTermsSource({ root, sourcePath: terms.sourcePath });
      const actual = await readFile(resolve(root, 'public', terms.publicPath.slice(1)));
      expect(createHash('sha256').update(actual).digest('hex')).toBe(terms.sha256);
      expect(createTermsPdf(source)).toEqual(actual);
    }
  });

  it('rejects coordinated immutable identity drift', async () => {
    const tempRoot = resolve(root, 'tests', '.terms-pdf-identity-drift');
    const manifestPath = resolve(tempRoot, 'src/lib/terms/draft-terms-manifest.ts');
    try {
      await mkdir(resolve(tempRoot, 'content/draft-terms'), { recursive: true });
      await mkdir(resolve(tempRoot, 'public/documentos/bases-y-categorias'), { recursive: true });
      await mkdir(resolve(tempRoot, 'src/lib/terms'), { recursive: true });
      for (const terms of Object.values(DRAFT_TERMS)) {
        await writeFile(resolve(tempRoot, terms.sourcePath), await readFile(resolve(root, terms.sourcePath)));
        await writeFile(resolve(tempRoot, 'public', terms.publicPath.slice(1)), await readFile(resolve(root, 'public', terms.publicPath.slice(1))));
      }
      const manifest = await readFile(resolve(root, 'src/lib/terms/draft-terms-manifest.ts'), 'utf8');
      await writeFile(manifestPath, manifest.replace(historicalV1Sha256, '0'.repeat(64)));

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
