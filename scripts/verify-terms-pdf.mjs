import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { createTermsPdf, getPdfImages, getPdfPageTexts, loadDraftTermsSource } from './generate-terms-pdf.mjs';

const MANIFEST = 'src/lib/terms/draft-terms-manifest.ts';
const MARKER = 'BORRADOR — PENDIENTE DE REVISIÓN LEGAL';
const EMBLEM_PATH = 'content/draft-terms/branding/entre-cortes-emblem.jpg';
const EMBLEM_SHA256 = 'c321de2f807c4c205a62e5cc3eed9ac103eda08756f9db21dbca754a4f413bd6';
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
  {
    version: 'draft-2026-09-v3',
    sourcePath: 'content/draft-terms/draft-2026-09-v3.json',
    publicPath: '/documentos/bases-y-categorias/borrador-2026-09-v3.pdf',
    filename: 'bases-y-categorias-batalla-de-barberos-borrador-2026-09-v3.pdf',
    mimeType: 'application/pdf',
    sha256: '23f380e1313da25e1385f9ec48ff2bcda58a7d9c35045538ecabae0a0f88ce8a',
  },
];

function readManifestIdentity(manifest) {
  const current = manifest.match(/CURRENT_DRAFT_TERMS_VERSION = '([^']+)'/);
  const entries = [...manifest.matchAll(/'(draft-[^']+)': \{\s+version: '([^']+)',\s+sourcePath: '([^']+)',\s+publicPath: '([^']+)',\s+filename: '([^']+)',\s+mimeType: '([^']+)',\s+legalMarker: '([^']+)',\s+sha256: '([a-f0-9]{64})'/g)]
    .map(([, key, version, sourcePath, publicPath, filename, mimeType, legalMarker, sha256]) => ({ key, version, sourcePath, publicPath, filename, mimeType, legalMarker, sha256 }));
  if (!current || entries.length !== IMMUTABLE_IDENTITIES.length) throw new Error('Draft terms immutable identity is malformed');
  return { current: current[1], entries };
}

export function verifyManifestIdentity(manifest) {
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
  if (active.current !== 'draft-2026-09-v3' || JSON.stringify(active.entries) !== JSON.stringify(expectedEntries)) {
    throw new Error('Draft terms immutable identity mismatch');
  }
  return active;
}

export async function verifyTermsPdf({ root = process.cwd() } = {}) {
  const manifest = await readFile(resolve(root, MANIFEST), 'utf8');
  const active = verifyManifestIdentity(manifest);
  const [v2Source, v3Source, emblem] = await Promise.all([
    loadDraftTermsSource({ root, sourcePath: IMMUTABLE_IDENTITIES[1].sourcePath }),
    loadDraftTermsSource({ root, sourcePath: IMMUTABLE_IDENTITIES[2].sourcePath }),
    readFile(resolve(root, EMBLEM_PATH)),
  ]);
  if (createHash('sha256').update(emblem).digest('hex') !== EMBLEM_SHA256) {
    throw new Error('Branded draft terms emblem identity mismatch');
  }
  for (const field of ['intro', 'categories', 'sharedRequirements']) {
    if (JSON.stringify(v3Source[field]) !== JSON.stringify(v2Source[field])) {
      throw new Error(`Branded v3 substantive content drift: ${field}`);
    }
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
    if (identity.version === 'draft-2026-09-v2' || identity.version === 'draft-2026-09-v3') {
      for (const category of source.categories) {
        const matchingPages = pages.filter((page) => page.includes(category.name));
        if (matchingPages.length !== 1 || category.rules.some((rule) => !matchingPages[0].includes(rule))) {
          throw new Error(`Complete category rules must fit on one PDF page: ${category.name}`);
        }
      }
    }
    if (identity.version === 'draft-2026-09-v3') {
      const images = getPdfImages(actual);
      if (images.length !== 1 || images[0].filter !== 'DCTDecode' || images[0].width !== 600 || images[0].height !== 400 || !images[0].bytes.equals(emblem)) {
        throw new Error('Branded v3 PDF must embed the pinned emblem as one JPEG image XObject');
      }
    }
    documents.push({ version: identity.version, sha256, pages: pages.length });
  }

  return { current: documents.find(({ version }) => version === active.current), documents };
}

if (process.argv[1] && resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  console.log(await verifyTermsPdf());
}
