import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  CURRENT_DRAFT_TERMS_VERSION,
  DRAFT_TERMS,
  getCurrentDraftTerms,
} from '../../src/lib/terms/draft-terms-manifest';
import { wrapPdfLine } from '../../scripts/generate-terms-pdf.mjs';

const root = process.cwd();

describe('draft terms manifest', () => {
  it('pins the current immutable draft to its exact public identity and committed bytes', async () => {
    const terms = getCurrentDraftTerms();

    expect(CURRENT_DRAFT_TERMS_VERSION).toBe('draft-2026-09-v1');
    expect(DRAFT_TERMS).toEqual({
      'draft-2026-09-v1': {
        version: 'draft-2026-09-v1',
        sourcePath: 'content/draft-terms/draft-2026-09-v1.json',
        publicPath: '/documentos/bases-y-categorias/borrador-2026-09-v1.pdf',
        filename: 'bases-y-categorias-batalla-de-barberos-borrador-2026-09-v1.pdf',
        mimeType: 'application/pdf',
        legalMarker: 'BORRADOR — PENDIENTE DE REVISIÓN LEGAL',
        sha256: terms.sha256,
      },
    });
    expect(terms.sha256).toBe('215148280563df021b09b1634e63deba401cd9418a638f91a3450a8c2abe178e');

    const bytes = await readFile(resolve(root, 'public', terms.publicPath.slice(1)));
    expect(createHash('sha256').update(bytes).digest('hex')).toBe('215148280563df021b09b1634e63deba401cd9418a638f91a3450a8c2abe178e');
  });

  it('wraps long draft text before it can extend beyond a PDF page', () => {
    expect(wrapPdfLine('Cronograma, sede, organizador, jurado, cupos, selección, premios, imagen y privacidad: [A DEFINIR].', 48))
      .toEqual([
        'Cronograma, sede, organizador, jurado, cupos,',
        'selección, premios, imagen y privacidad: [A',
        'DEFINIR].',
      ]);
  });
});
