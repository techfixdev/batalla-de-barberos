import { readFileSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const DEFAULT_SOURCE = 'content/draft-terms/draft-2026-09-v3.json';
const DEFAULT_OUTPUT = 'public/documentos/bases-y-categorias/borrador-2026-09-v3.pdf';
const EMBLEM_PATH = new URL('../content/draft-terms/branding/entre-cortes-emblem.jpg', import.meta.url);
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

function brandedText(value, x, y, size = 10, font = 'F1', color = '0.08 0.08 0.08') {
  return `BT\n/${font} ${size} Tf\n${color} rg\n${x} ${y} Td\n(${pdfText(toWin1252(value))}) Tj\nET`;
}

function brandedBody(lines, startY) {
  const wrapped = lines.flatMap((line) => wrapPdfLine(line, 84));
  return `BT\n/F1 10 Tf\n0.08 0.08 0.08 rg\n50 ${startY} Td\n${wrapped.map((line, index) => `${index ? '0 -17 Td\n' : ''}(${pdfText(toWin1252(line))}) Tj`).join('\n')}\nET`;
}

function brandedPageStream({ page, total, title, lines, cover = false, legalMarker = MARKER, footerLabel = 'BORRADOR LEGAL' }) {
  const header = [
    '1 1 1 rg 0 0 612 792 re f',
    '0.035 0.035 0.035 rg 0 712 612 80 re f',
    'q 90 0 0 60 28 722 cm /Im1 Do Q',
    brandedText('ENTRE CORTES', 132, 758, 15, 'F2', '0.91 0.70 0.24'),
    brandedText('BATALLA DE BARBEROS', 132, 738, 12, 'F2', '1 1 1'),
    ...(legalMarker ? [brandedText(legalMarker, 378, 746, 7.5, 'F2', '1 1 1')] : []),
    '0.82 0.61 0.16 rg 28 703 556 2 re f',
  ];
  const footer = [
    '0.82 0.61 0.16 rg 28 43 556 1 re f',
    brandedText('ENTRE CORTES · BATALLA DE BARBEROS', 28, 26, 7.5, 'F2', '0.32 0.27 0.18'),
    brandedText(`${footerLabel} · ${page}/${total}`, 470, 26, 7.5, 'F2', '0.32 0.27 0.18'),
  ];
  if (cover) {
    return [...header,
      '0.035 0.035 0.035 rg 156 414 300 200 re f',
      'q 270 0 0 180 171 424 cm /Im1 Do Q',
      brandedText(title, 50, 374, 22, 'F2', '0.08 0.08 0.08'),
      '0.82 0.61 0.16 rg 50 356 180 3 re f',
      brandedBody(lines, 326),
      ...footer].join('\n');
  }
  return [...header,
    brandedText(title, 50, 672, 20, 'F2', '0.08 0.08 0.08'),
    '0.82 0.61 0.16 rg 50 654 140 3 re f',
    brandedBody(lines, 628),
    ...footer].join('\n');
}

function createBrandedTermsPdf(source) {
  const historical = source.version === 'draft-2026-09-v3' && source.legalMarker === MARKER;
  const current = source.version === 'terms-2026-09-v1' && source.legalMarker === undefined;
  if ((!historical && !current) || source.categories?.length !== 5) {
    throw new Error('Terms source does not match a branded immutable contract');
  }
  const pageDefinitions = [
    {
      title: 'BASES Y CATEGORÍAS',
      cover: true,
      lines: [
        `Versión: ${source.version}`,
        source.intro,
        '5 categorías · 66 reglas de competencia',
        ...(historical ? ['Contenido general pendiente de revisión legal. La inscripción no asigna una categoría.'] : []),
      ],
    },
    ...source.categories.map((category) => ({
      title: `${category.number} — ${category.name}`,
      lines: [`Duración: ${category.duration}`, ...category.rules],
    })),
    {
      title: 'REQUISITOS COMPARTIDOS',
      lines: [...(historical ? ['Contenido pendiente de revisión legal.'] : []), ...source.sharedRequirements],
    },
  ];
  const streams = pageDefinitions.map((definition, index) => brandedPageStream({
    ...definition,
    page: index + 1,
    total: pageDefinitions.length,
    legalMarker: historical ? MARKER : '',
    footerLabel: historical ? 'BORRADOR LEGAL' : 'BASES Y CATEGORÍAS',
  }));
  const emblem = readFileSync(EMBLEM_PATH);
  const pageIds = pageDefinitions.map((_, index) => 6 + index * 2);
  const infoId = pageIds.at(-1) + 2;
  const objects = [
    Buffer.from(object(1, '<< /Type /Catalog /Pages 2 0 R >>'), 'latin1'),
    Buffer.from(object(2, `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageDefinitions.length} >>`), 'latin1'),
    Buffer.from(object(3, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'), 'latin1'),
    Buffer.from(object(4, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'), 'latin1'),
    Buffer.concat([
      Buffer.from(`5 0 obj\n<< /Type /XObject /Subtype /Image /Width 600 /Height 400 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${emblem.length} >>\nstream\n`, 'latin1'),
      emblem,
      Buffer.from('\nendstream\nendobj\n', 'latin1'),
    ]),
    ...streams.flatMap((stream, index) => [
      Buffer.from(object(pageIds[index], `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> /XObject << /Im1 5 0 R >> >> /Contents ${pageIds[index] + 1} 0 R >>`), 'latin1'),
      Buffer.from(object(pageIds[index] + 1, `<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`), 'latin1'),
    ]),
    Buffer.from(object(infoId, '<< /Title (Bases y categorias - Entre Cortes) /Creator (offline deterministic generator) /CreationDate (D:20260901000000Z) /ModDate (D:20260901000000Z) >>'), 'latin1'),
  ];
  const header = Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n', 'latin1');
  const offsets = [];
  let cursor = header.length;
  for (const item of objects) { offsets.push(cursor); cursor += item.length; }
  const xref = Buffer.from(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info ${infoId} 0 R >>\nstartxref\n${cursor}\n%%EOF\n`, 'latin1');
  return Buffer.concat([header, ...objects, xref]);
}

function pagesForSource(source) {
  if (source.version === 'draft-2026-09-v1' && source.legalMarker === MARKER && source.categories?.length === 4) {
    const categoryLines = source.categories.flatMap((category) => [category.name, category.eligibility, category.work, category.unresolved]);
    return [
      [MARKER, source.title, source.intro, 'Versión: draft-2026-09-v1', 'Categorías propuestas — contenido no final.'],
      [MARKER, ...categoryLines.slice(0, 8)],
      [MARKER, ...categoryLines.slice(8), 'Requisitos compartidos — contenido no final.', ...source.sharedRequirements.slice(0, 3)],
      [MARKER, ...source.sharedRequirements.slice(3)],
    ];
  }
  if (source.version === 'draft-2026-09-v2' && source.legalMarker === MARKER && source.categories?.length === 5) {
    return [
      [MARKER, source.title, source.intro, `Versión: ${source.version}`, 'Cinco categorías y reglas de competencia.'],
      ...source.categories.map((category) => [MARKER, `${category.number} — ${category.name}`, `Duración: ${category.duration}`, ...category.rules]),
      [MARKER, 'Requisitos compartidos — contenido pendiente de revisión legal.', ...source.sharedRequirements],
    ];
  }
  throw new Error('Draft terms source does not match a supported immutable contract');
}

export function createTermsPdf(source) {
  if (source.version === 'draft-2026-09-v3' || source.version === 'terms-2026-09-v1') return createBrandedTermsPdf(source);
  const pages = pagesForSource(source);
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
  return [...bytes.toString('latin1').matchAll(/\d+ 0 obj\n(<<[^\n]+>>)\nstream\n([\s\S]*?)\nendstream\nendobj/g)]
    .filter(([, dictionary]) => !dictionary.includes('/Subtype /Image'))
    .map(([, , stream]) => [...stream.matchAll(/\((.*?)\) Tj/g)]
      .map(([, encoded]) => decoder.decode(Buffer.from(encoded.replace(/\\([0-7]{3})/g, (_, octal) => String.fromCharCode(Number.parseInt(octal, 8))), 'latin1'))).join('\n'));
}

export function getPdfImages(bytes) {
  const images = [];
  const marker = Buffer.from('/Subtype /Image', 'latin1');
  let markerAt = bytes.indexOf(marker);
  while (markerAt !== -1) {
    const dictionaryStart = bytes.lastIndexOf(Buffer.from('<<', 'latin1'), markerAt);
    const streamStart = bytes.indexOf(Buffer.from('>>\nstream\n', 'latin1'), markerAt);
    const dictionary = bytes.subarray(dictionaryStart, streamStart + 2).toString('latin1');
    const length = Number(dictionary.match(/\/Length (\d+)/)?.[1]);
    const dataStart = streamStart + Buffer.byteLength('>>\nstream\n', 'latin1');
    images.push({
      width: Number(dictionary.match(/\/Width (\d+)/)?.[1]),
      height: Number(dictionary.match(/\/Height (\d+)/)?.[1]),
      filter: dictionary.match(/\/Filter \/([^\s>]+)/)?.[1],
      bytes: bytes.subarray(dataStart, dataStart + length),
    });
    markerAt = bytes.indexOf(marker, dataStart + length);
  }
  return images;
}

if (process.argv[1] && resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  await generateTermsPdf();
}
