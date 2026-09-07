import fontkit from '@pdf-lib/fontkit';
import ExcelJS from 'exceljs';
import { PDFDocument, PageSizes, rgb, type PDFFont, type PDFPage } from 'pdf-lib';

import { experienceLabel, participantResponseLabel, receiptStatusLabel, reviewStateLabel } from './registration-labels';
import type { RegistrationExportAssets } from './registration-export-assets';
import type { RegistrationExportRecord } from './registration-read-repository';

const HEADERS = ['N.º', 'Nombre completo', 'Correo electrónico', 'Teléfono', 'Barbería', 'Experiencia', 'Fecha de inscripción', 'Revisión', 'Respuesta', 'Acuse'] as const;
const GOLD = 'D2A43B';

function values(record: RegistrationExportRecord): Array<string | number> {
  return [record.registrationNumber, record.fullName, record.email, record.phone, record.barbershop, experienceLabel(record.experience), record.createdAt,
    reviewStateLabel(record.review), participantResponseLabel(record.participant), record.receipt === 'not_required' ? 'No requerido' : receiptStatusLabel(record.receipt)];
}

export async function createRegistrationXlsx(records: readonly RegistrationExportRecord[], assets: RegistrationExportAssets): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Entre Cortes';
  const sheet = workbook.addWorksheet('Inscripciones', { views: [{ state: 'frozen', ySplit: 4 }] });
  sheet.mergeCells('A1:J1');
  sheet.getCell('A1').value = 'ENTRE CORTES — BATALLA DE BARBEROS';
  sheet.getCell('A1').font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 18 };
  sheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF080909' } };
  sheet.getRow(1).height = 46;
  const image = workbook.addImage({ base64: `data:image/jpeg;base64,${Buffer.from(assets.emblemJpeg).toString('base64')}`, extension: 'jpeg' });
  sheet.addImage(image, { tl: { col: 8.4, row: 0.05 }, ext: { width: 105, height: 55 } });
  sheet.mergeCells('A2:J2');
  sheet.getCell('A2').value = `${records.length} inscripciones exportadas`;
  sheet.getCell('A2').font = { color: { argb: `FF${GOLD}` }, bold: true };
  sheet.getCell('A2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF080909' } };
  sheet.addRow([]);
  const header = sheet.addRow([...HEADERS]);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${GOLD}` } };
  for (const record of records) {
    const row = sheet.addRow(values(record));
    row.eachCell((cell, column) => {
      if (column !== 1) cell.value = String(cell.value ?? '');
      cell.numFmt = column === 1 ? '0' : '@';
      cell.alignment = { vertical: 'top', wrapText: true };
    });
  }
  sheet.autoFilter = { from: 'A4', to: `J${Math.max(4, sheet.rowCount)}` };
  sheet.columns.forEach((column, index) => { column.width = [10, 28, 32, 20, 24, 18, 27, 19, 19, 17][index]; });
  sheet.eachRow((row, rowNumber) => row.eachCell((cell) => {
    if (rowNumber >= 4) cell.border = { top: { style: 'thin', color: { argb: 'FFB7A56F' } }, left: { style: 'thin', color: { argb: 'FFB7A56F' } }, bottom: { style: 'thin', color: { argb: 'FFB7A56F' } }, right: { style: 'thin', color: { argb: 'FFB7A56F' } } };
  }));
  return new Uint8Array(await workbook.xlsx.writeBuffer());
}

function supportedText(value: string, bytes: Uint8Array): string {
  const font = fontkit.create(bytes);
  return [...value].map((character) => font.hasGlyphForCodePoint(character.codePointAt(0)!) ? character : '?').join('');
}

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    let line = '';
    for (const character of [...paragraph]) {
      if (line && font.widthOfTextAtSize(line + character, size) > width) { lines.push(line); line = character; }
      else line += character;
    }
    lines.push(line);
  }
  return lines.length ? lines : [''];
}

export type RegistrationPdfOptions = Readonly<{ generatedAt?: Date | string }>;

export async function createRegistrationPdf(records: readonly RegistrationExportRecord[], assets: RegistrationExportAssets, options: RegistrationPdfOptions = {}): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  if (options.generatedAt !== undefined) {
    const fixed = options.generatedAt instanceof Date ? options.generatedAt : new Date(options.generatedAt);
    if (!Number.isFinite(fixed.getTime())) throw new Error('Invalid fixed PDF generation time.');
    document.setCreationDate(fixed);
    document.setModificationDate(fixed);
  }
  document.setCreator('Entre Cortes');
  document.setProducer('Entre Cortes');
  document.registerFontkit(fontkit);
  const regular = await document.embedFont(assets.regularFont, { subset: true });
  const bold = await document.embedFont(assets.boldFont, { subset: true });
  const emblem = await document.embedJpg(assets.emblemJpeg);
  const [width, height] = PageSizes.A4;
  const pages: PDFPage[] = [];
  let page = document.addPage([width, height]);
  let y = height - 104;
  const decorate = () => {
    pages.push(page);
    page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(.97, .96, .92) });
    page.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: rgb(.03, .035, .035) });
    page.drawImage(emblem, { x: 34, y: height - 70, width: 72, height: 48 });
    page.drawText('ENTRE CORTES', { x: 120, y: height - 42, font: bold, size: 17, color: rgb(.82, .64, .23) });
    page.drawText('BATALLA DE BARBEROS — INSCRIPCIONES', { x: 120, y: height - 60, font: regular, size: 9, color: rgb(1, 1, 1) });
    y = height - 104;
  };
  const newPage = () => { page = document.addPage([width, height]); decorate(); };
  decorate();
  const labels = HEADERS;
  for (const record of records) {
    const entries = values(record).map((value, index) => [labels[index], supportedText(String(value), assets.regularFont)] as const);
    const lineCount = entries.reduce((sum, [, value]) => sum + wrap(value, regular, 8, width - 180).length, 0);
    const estimated = Math.max(42, lineCount * 10 + 16);
    if (y - estimated < 42) newPage();
    page.drawRectangle({ x: 28, y: y - estimated + 8, width: width - 56, height: estimated, color: rgb(1, 1, 1), borderColor: rgb(.72, .64, .43), borderWidth: .6 });
    for (const [label, value] of entries) {
      const lines = wrap(value, regular, 8, width - 180);
      if (y - lines.length * 10 < 36) newPage();
      page.drawText(label!, { x: 38, y, font: bold, size: 7.5, color: rgb(.13, .13, .12) });
      lines.forEach((line, index) => page.drawText(line, { x: 145, y: y - index * 10, font: regular, size: 8, color: rgb(.08, .08, .08) }));
      y -= Math.max(12, lines.length * 10);
    }
    y -= 12;
  }
  if (records.length === 0) page!.drawText('No hay inscripciones para exportar.', { x: 38, y: y!, font: regular, size: 11, color: rgb(.1, .1, .1) });
  pages.forEach((current, index) => {
    const footer = `Página ${index + 1} de ${pages.length} · Total: ${records.length}`;
    current.drawText(footer, { x: 34, y: 20, font: regular, size: 8, color: rgb(.25, .25, .22) });
  });
  return document.save();
}
