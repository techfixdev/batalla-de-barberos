import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import ExcelJS from 'exceljs';
import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';

import { loadRegistrationExportAssets } from '../../src/lib/server/admin/registration-export-assets';
import { createRegistrationPdf, createRegistrationXlsx } from '../../src/lib/server/admin/registration-export-documents';
import type { RegistrationExportRecord } from '../../src/lib/server/admin/registration-read-repository';

const run = promisify(execFile);
const record: RegistrationExportRecord = Object.freeze({ registrationNumber: 42, fullName: '=Ana Álvarez Ελληνικά Кириллица 😀', email: '+ana@example.test', phone: '@5491112345678',
  barbershop: '-Corte'.repeat(200), experience: 'profesional', createdAt: '2026-09-05T12:34:56.000Z', review: 'selected', participant: 'confirmed', receipt: 'sent' });

async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'bdb-pdf-text-'));
  const pdfPath = join(directory, 'registrations.pdf');
  const textPath = join(directory, 'registrations.txt');
  try {
    await writeFile(pdfPath, bytes);
    await run('pdftotext', [pdfPath, textPath]);
    return await readFile(textPath, 'utf8');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

describe('real branded admin export documents', () => {
  it('creates a parseable XLSX with numeric registration numbers and literal untrusted text', async () => {
    const bytes = await createRegistrationXlsx([record], await loadRegistrationExportAssets());
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(bytes as never);
    const sheet = workbook.getWorksheet('Inscripciones')!;
    expect(sheet.getCell('A5').value).toBe(42);
    for (const cell of ['B5', 'C5', 'D5', 'E5']) {
      expect(typeof sheet.getCell(cell).value).toBe('string');
      expect(sheet.getCell(cell).hyperlink).toBeUndefined();
      expect(sheet.getCell(cell).formula).toBeUndefined();
    }
    expect(sheet.getCell('B5').value).toContain('Ελληνικά Кириллица');
    expect(sheet.getImages()).toHaveLength(1);
    expect(sheet.autoFilter).toBeTruthy();
  });

  it('creates byte-identical PDFs for the same frozen vector and generation time', async () => {
    const assets = await loadRegistrationExportAssets();
    const generatedAt = '2026-09-05T12:34:56.000Z';
    const first = await createRegistrationPdf(Object.freeze([record]), assets, { generatedAt });
    const second = await createRegistrationPdf(Object.freeze([record]), assets, { generatedAt });
    expect(Buffer.from(first)).toEqual(Buffer.from(second));
  }, 10_000);

  it('creates a paginated PDF with embedded Noto Sans and emblem bytes', async () => {
    const bytes = await createRegistrationPdf([record, record, record], await loadRegistrationExportAssets());
    const text = Buffer.from(bytes).toString('latin1');
    expect(text.startsWith('%PDF-')).toBe(true);
    expect(text).toContain('/Subtype /Image');
    const document = await PDFDocument.load(bytes);
    expect(document.getPageCount()).toBeGreaterThan(1);
    expect(bytes.byteLength).toBeGreaterThan(100_000);
    const extracted = await extractPdfText(bytes);
    expect(extracted).toContain('=Ana Álvarez Ελληνικά Кириллица ?');
  }, 10_000);
});
