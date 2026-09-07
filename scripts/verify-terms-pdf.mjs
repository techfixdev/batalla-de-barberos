import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { createTermsPdf, getPdfPageTexts, loadDraftTermsSource } from './generate-terms-pdf.mjs';

const MANIFEST = 'src/lib/terms/draft-terms-manifest.ts';
const MARKER = 'BORRADOR — PENDIENTE DE REVISIÓN LEGAL';
const IMMUTABLE_IDENTITIES = [
  {
    version: 'draft-2026-09-v1',
    sourcePath: 'content/draft-terms/draft-2026-09-v1.json',
    publicPath: '/documentos/bases-y-categorias/borrador-2026-09-v1.pdf',
    filename: 'bases-y-categorias-batalla-de-barberos-borrador-2026-09-v1.pdf',
    mimeType: 'application/pdf',
    sha256: '215148280563df021b09b1634e63deba401cd9418a638f91a3450a8c2abe178e',
  },
  {
    version: 'draft-2026-09-v2',
    sourcePath: 'content/draft-terms/draft-2026-09-v2.json',
    publicPath: '/documentos/bases-y-categorias/borrador-2026-09-v2.pdf',
    filename: 'bases-y-categorias-batalla-de-barberos-borrador-2026-09-v2.pdf',
    mimeType: 'application/pdf',
    sha256: 'c64ba9a04d2e57f1fadb9dcc267227b6f5d5a532c93f4824a658c734e31d544e',
  },
];

function readManifestIdentity(manifest) {
  const current = manifest.match(/CURRENT_DRAFT_TERMS_VERSION = '([^']+)'/);
  const entries = [...manifest.matchAll(/'(draft-[^']+)': \{\s+version: '([^']+)',\s+sourcePath: '([^']+)',\s+publicPath: '([^']+)',\s+filename: '([^']+)',\s+mimeType: '([^']+)',\s+legalMarker: '([^']+)',\s+sha256: '([a-f0-9]{64})'/g)]
    .map(([, key, version, sourcePath, publicPath, filename, mimeType, legalMarker, sha256]) => ({ key, version, sourcePath, publicPath, filename, mimeType, legalMarker, sha256 }));
  if (!current || entries.length !== IMMUTABLE_IDENTITIES.length) throw new Error('Draft terms immutable identity is malformed');
  return { current: current[1], entries };
}

export async function verifyTermsPdf({ root = process.cwd() } = {}) {
  const manifest = await readFile(resolve(root, MANIFEST), 'utf8');
  const active = readManifestIdentity(manifest);
  const expectedEntries = IMMUTABLE_IDENTITIES.map((identity) => ({
    key: identity.version,
    version: identity.version,
    sourcePath: identity.sourcePath,
    publicPath: identity.publicPath,
    filename: identity.filename,
    mimeType: identity.mimeType,
    legalMarker: MARKER,
    sha256: identity.sha256,
  }));
  if (active.current !== 'draft-2026-09-v2' || JSON.stringify(active.entries) !== JSON.stringify(expectedEntries)) {
    throw new Error('Draft terms immutable identity mismatch');
  }

  const documents = [];
  for (const identity of IMMUTABLE_IDENTITIES) {
    const [source, actual] = await Promise.all([
      loadDraftTermsSource({ root, sourcePath: identity.sourcePath }),
      readFile(resolve(root, 'public', identity.publicPath.slice(1))),
    ]);
    const expected = createTermsPdf(source);
    const sha256 = createHash('sha256').update(actual).digest('hex');
    const pages = getPdfPageTexts(actual);
    if (source.version !== identity.version || sha256 !== identity.sha256 || !actual.equals(expected)) {
      throw new Error(`Draft terms PDF checksum or bytes do not match the committed source: ${identity.version}`);
    }
    if (!pages.length || pages.some((page) => !page.includes(MARKER))) {
      throw new Error(`Every draft terms PDF page must contain the legal marker: ${identity.version}`);
    }
    if (identity.version === 'draft-2026-09-v2') {
      for (const category of source.categories) {
        const matchingPages = pages.filter((page) => page.includes(category.name));
        if (matchingPages.length !== 1 || category.rules.some((rule) => !matchingPages[0].includes(rule))) {
          throw new Error(`Complete category rules must fit on one PDF page: ${category.name}`);
        }
      }
    }
    documents.push({ version: identity.version, sha256, pages: pages.length });
  }

  return { current: documents.find(({ version }) => version === active.current), documents };
}

if (process.argv[1] && resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  console.log(await verifyTermsPdf());
}
