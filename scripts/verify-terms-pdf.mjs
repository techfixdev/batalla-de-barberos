import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { createTermsPdf, getPdfPageTexts, loadDraftTermsSource } from './generate-terms-pdf.mjs';

const MANIFEST = 'src/lib/terms/draft-terms-manifest.ts';
const MARKER = 'BORRADOR — PENDIENTE DE REVISIÓN LEGAL';
const IMMUTABLE_IDENTITY = {
  version: 'draft-2026-09-v1',
  sourcePath: 'content/draft-terms/draft-2026-09-v1.json',
  publicPath: '/documentos/bases-y-categorias/borrador-2026-09-v1.pdf',
  filename: 'bases-y-categorias-batalla-de-barberos-borrador-2026-09-v1.pdf',
  mimeType: 'application/pdf',
  sha256: '215148280563df021b09b1634e63deba401cd9418a638f91a3450a8c2abe178e',
};

function readActiveIdentity(manifest) {
  const current = manifest.match(/CURRENT_DRAFT_TERMS_VERSION = '([^']+)'/);
  const entry = manifest.match(/'([^']+)': \{\s+version: '([^']+)',\s+sourcePath: '([^']+)',\s+publicPath: '([^']+)',\s+filename: '([^']+)',\s+mimeType: '([^']+)',[\s\S]*?sha256: '([a-f0-9]{64})'/);
  if (!current || !entry) throw new Error('Draft terms immutable identity is malformed');
  const [, key, version, sourcePath, publicPath, filename, mimeType, sha256] = entry;
  return { current: current[1], key, version, sourcePath, publicPath, filename, mimeType, sha256 };
}

export async function verifyTermsPdf({ root = process.cwd() } = {}) {
  const manifest = await readFile(resolve(root, MANIFEST), 'utf8');
  const active = readActiveIdentity(manifest);
  const expectedIdentity = { current: IMMUTABLE_IDENTITY.version, key: IMMUTABLE_IDENTITY.version, ...IMMUTABLE_IDENTITY };
  if (JSON.stringify(active) !== JSON.stringify(expectedIdentity)) throw new Error('Draft terms immutable identity mismatch');
  const [source, actual] = await Promise.all([
    loadDraftTermsSource({ root, sourcePath: active.sourcePath }),
    readFile(resolve(root, 'public', active.publicPath.slice(1))),
  ]);
  const expected = createTermsPdf(source);
  const sha256 = createHash('sha256').update(actual).digest('hex');
  const pages = getPdfPageTexts(actual);
  if (source.version !== active.version || sha256 !== active.sha256 || !actual.equals(expected)) throw new Error('Draft terms PDF checksum or bytes do not match the committed source');
  if (!pages.length || pages.some((page) => !page.includes(MARKER))) throw new Error('Every draft terms PDF page must contain the legal marker');
  return { version: active.version, sha256, pages: pages.length };
}

if (process.argv[1] && resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  console.log(await verifyTermsPdf());
}
