import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { DRAFT_TERMS, getCurrentDraftTerms } from '../../src/lib/terms/draft-terms-manifest';
import {
  createTermsPdf,
  generateTermsPdf,
  getPdfImages,
  getPdfPageTexts,
  loadDraftTermsSource,
} from '../../scripts/generate-terms-pdf.mjs';
import { verifyManifestIdentity, verifyTermsPdf } from '../../scripts/verify-terms-pdf.mjs';

const root = process.cwd();
const marker = 'BORRADOR — PENDIENTE DE REVISIÓN LEGAL';
const historicalV1Sha256 = '215148280563df021b09b1634e63deba401cd9418a638f91a3450a8c2abe178e';
const historicalV2Sha256 = 'c64ba9a04d2e57f1fadb9dcc267227b6f5d5a532c93f4824a658c734e31d544e';

type DraftTermsSource = {
  categories: Array<{
    name: string;
    rules: string[];
  }>;
};

describe('immutable draft terms PDFs', () => {
  it('verifies every committed version while selecting marker-free terms as current', async () => {
    const terms = getCurrentDraftTerms();
    const result = await verifyTermsPdf({ root });

    expect(result.current).toEqual({ version: terms.version, sha256: terms.sha256, pages: expect.any(Number) });
    expect(result.documents.map(({ version }) => version)).toEqual(['draft-2026-09-v1', 'draft-2026-09-v2', 'draft-2026-09-v3', 'terms-2026-09-v1']);
    expect(result.documents.find(({ version }) => version === 'draft-2026-09-v1')?.sha256).toBe(historicalV1Sha256);
    expect(result.documents.find(({ version }) => version === 'draft-2026-09-v2')?.sha256).toBe(historicalV2Sha256);
  });

  it('keeps the current PDF marker-free and each complete approved category together', async () => {
    const terms = getCurrentDraftTerms();
    const source: DraftTermsSource = await loadDraftTermsSource({ root, sourcePath: terms.sourcePath });
    const bytes = await readFile(resolve(root, 'public', terms.publicPath.slice(1)));
    const pages = getPdfPageTexts(bytes);

    expect(pages.length).toBe(7);
    expect(source.categories.reduce((total, category) => total + category.rules.length, 0)).toBe(66);
    expect(pages.every((page) => !page.includes(marker))).toBe(true);
    for (const category of source.categories) {
      const matchingPages = pages.filter((page) => page.includes(category.name));
      expect(matchingPages).toHaveLength(1);
      for (const rule of category.rules) expect(matchingPages[0]).toContain(rule);
    }
    expect(pages.join('\n')).toContain('La experiencia indicada en la inscripción no es una categoría de competencia');
  });

  it('copies all substantive rules and placeholders exactly from branded v3', async () => {
    const [historical, current] = await Promise.all([
      loadDraftTermsSource({ root, sourcePath: DRAFT_TERMS['draft-2026-09-v3'].sourcePath }),
      loadDraftTermsSource({ root, sourcePath: DRAFT_TERMS['terms-2026-09-v1'].sourcePath }),
    ]);

    expect(current.categories).toEqual(historical.categories);
    expect(current.sharedRequirements).toEqual(historical.sharedRequirements);
    expect(current.legalMarker).toBeUndefined();
  });

  it('embeds the pinned branded JPEG as a decoded PDF image XObject', async () => {
    const terms = getCurrentDraftTerms();
    const [pdf, emblem] = await Promise.all([
      readFile(resolve(root, 'public', terms.publicPath.slice(1))),
      readFile(resolve(root, 'content/draft-terms/branding/entre-cortes-emblem.jpg')),
    ]);
    const images = getPdfImages(pdf);

    expect(images).toHaveLength(1);
    const [image] = images;
    if (!image) throw new Error('Expected the branded PDF image XObject.');
    expect(image).toEqual(expect.objectContaining({ width: 600, height: 400, filter: 'DCTDecode' }));
    expect(image.bytes).toEqual(emblem);
  });

  it('reproduces all historical and current bytes exactly', async () => {
    for (const terms of Object.values(DRAFT_TERMS)) {
      const source = await loadDraftTermsSource({ root, sourcePath: terms.sourcePath });
      const actual = await readFile(resolve(root, 'public', terms.publicPath.slice(1)));
      expect(createHash('sha256').update(actual).digest('hex')).toBe(terms.sha256);
      expect(createTermsPdf(source)).toEqual(actual);
    }
  });

  it('rejects coordinated immutable identity drift without touching published files', async () => {
    const manifest = await readFile(resolve(root, 'src/lib/terms/draft-terms-manifest.ts'), 'utf8');

    expect(() => verifyManifestIdentity(manifest.replace(historicalV1Sha256, '0'.repeat(64))))
      .toThrow(/immutable identity/i);
  });

  it('refuses to replace bytes for an existing version path', async () => {
    const terms = getCurrentDraftTerms();
    const outputPath = resolve(root, 'public', terms.publicPath.slice(1));
    const source = await loadDraftTermsSource({ root, sourcePath: terms.sourcePath });
    const original = await readFile(outputPath);

    await expect(generateTermsPdf({ root, outputPath, source: { ...source, intro: 'Cambio no permitido' } }))
      .rejects.toThrow('Refusing to replace immutable draft terms bytes');
    expect(await readFile(outputPath)).toEqual(original);
  });
});
