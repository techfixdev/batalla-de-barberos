import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const DEFAULT_SOURCE = 'content/draft-terms/draft-2026-09-v1.json';
const DEFAULT_OUTPUT = 'public/documentos/bases-y-categorias/borrador-2026-09-v1.pdf';
const MARKER = 'BORRADOR — PENDIENTE DE REVISIÓN LEGAL';
const decoder = new TextDecoder('windows-1252');

function pdfText(value) {
  const bytes = Buffer.from(value, 'latin1');
  return [...bytes].map((byte) => {
    if (byte === 40 || byte === 41 || byte === 92) return `\\${String.fromCharCode(byte)}`;
    return byte < 32 || byte > 126 ? `\\${byte.toString(8).padStart(3, '0')}` : String.fromCharCode(byte);
  }).join('');
}

function toWin1252(value) {
  return value.replaceAll('—', String.fromCharCode(0x97)).replaceAll('á', String.fromCharCode(0xe1))
    .replaceAll('é', String.fromCharCode(0xe9)).replaceAll('í', String.fromCharCode(0xed))
    .replaceAll('ó', String.fromCharCode(0xf3)).replaceAll('ú', String.fromCharCode(0xfa))
    .replaceAll('ñ', String.fromCharCode(0xf1)).replaceAll('ü', String.fromCharCode(0xfc)).replaceAll('¿', String.fromCharCode(0xbf));
}

export function wrapPdfLine(line, width = 82) {
  return line.split(' ').reduce((lines, word) => {
    const current = lines.at(-1) ?? '';
    if (current && current.length + word.length + 1 > width) lines.push(word);
    else lines[lines.length - 1] = current ? `${current} ${word}` : word;
    return lines;
  }, ['']);
}

function pageStream(lines) {
  const wrapped = lines.flatMap((line) => wrapPdfLine(line));
  return `BT\n/F1 10 Tf\n50 775 Td\n${wrapped.map((line, index) => `${index ? '0 -16 Td\n' : ''}(${pdfText(toWin1252(line))}) Tj`).join('\n')}\nET`;
}

function object(id, body) { return `${id} 0 obj\n${body}\nendobj\n`; }

export function createTermsPdf(source) {
  if (source.version !== 'draft-2026-09-v1' || source.legalMarker !== MARKER || source.categories?.length !== 4) {
    throw new Error('Draft terms source does not match the immutable v1 contract');
  }
  const categoryLines = source.categories.flatMap((category) => [category.name, category.eligibility, category.work, category.unresolved]);
  const pages = [
    [MARKER, source.title, source.intro, 'Versión: draft-2026-09-v1', 'Categorías propuestas — contenido no final.'],
    [MARKER, ...categoryLines.slice(0, 8)],
    [MARKER, ...categoryLines.slice(8), 'Requisitos compartidos — contenido no final.', ...source.sharedRequirements.slice(0, 3)],
    [MARKER, ...source.sharedRequirements.slice(3)],
  ];
  const streams = pages.map(pageStream);
  const pageIds = pages.map((_, index) => 4 + index * 2);
  const objects = [
    object(1, '<< /Type /Catalog /Pages 2 0 R >>'),
    object(2, `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`),
    object(3, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'),
    ...streams.flatMap((stream, index) => [
      object(pageIds[index], `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${pageIds[index] + 1} 0 R >>`),
      object(pageIds[index] + 1, `<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`),
    ]),
    object(pageIds.at(-1) + 2, '<< /Title (Bases y categorias - borrador) /Creator (offline deterministic generator) /CreationDate (D:20260901000000Z) /ModDate (D:20260901000000Z) >>'),
  ];
  let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  const offsets = [0];
  for (const item of objects) { offsets.push(Buffer.byteLength(pdf, 'latin1')); pdf += item; }
  const xref = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info ${pageIds.at(-1) + 2} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1');
}

export async function loadDraftTermsSource({ root = process.cwd(), sourcePath = DEFAULT_SOURCE } = {}) {
  return JSON.parse(await readFile(resolve(root, sourcePath), 'utf8'));
}

/** @param {{ root?: string, outputPath?: string, source?: object }} [options] */
export async function generateTermsPdf({ root = process.cwd(), outputPath = resolve(root, DEFAULT_OUTPUT), source } = {}) {
  const bytes = createTermsPdf(source ?? await loadDraftTermsSource({ root }));
  try {
    const existing = await readFile(outputPath);
    if (!existing.equals(bytes)) throw new Error('Refusing to replace immutable draft terms bytes');
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, bytes);
  }
  return bytes;
}

export function getPdfPageTexts(bytes) {
  return [...bytes.toString('latin1').matchAll(/stream\n([\s\S]*?)\nendstream/g)].map(([, stream]) =>
    [...stream.matchAll(/\((.*?)\) Tj/g)].map(([, encoded]) => decoder.decode(Buffer.from(encoded.replace(/\\([0-7]{3})/g, (_, octal) => String.fromCharCode(Number.parseInt(octal, 8))), 'latin1'))).join('\n'));
}

if (process.argv[1] && resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  await generateTermsPdf();
}
