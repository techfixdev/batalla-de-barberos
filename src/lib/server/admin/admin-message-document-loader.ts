import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { getDraftTermsByVersion } from '../../terms/draft-terms-manifest';
import { loadRegistrationExportAssets } from './registration-export-assets';
import { createRegistrationPdf } from './registration-export-documents';
import type { RegistrationExportRecord } from './registration-read-repository';
import type { LoadedAdminPdf } from './admin-message-service';

function digest(bytes: Uint8Array) { return createHash('sha256').update(bytes).digest('hex'); }
function validPdf(bytes: Uint8Array) { return bytes.byteLength >= 5 && bytes.byteLength <= 4 * 1024 * 1024 && Buffer.from(bytes.subarray(0, 5)).toString() === '%PDF-'; }

export async function loadHistoricalConfirmationPdf(termsVersion: string, root = process.cwd()): Promise<LoadedAdminPdf> {
  const terms = getDraftTermsByVersion(termsVersion);
  if (!terms) throw new Error('Unknown historical terms document.');
  const relative = terms.publicPath.replace(/^\//, '');
  const bytes = new Uint8Array(await readFile(resolve(root, 'public', relative)));
  if (!validPdf(bytes) || digest(bytes) !== terms.sha256) throw new Error('Historical terms document verification failed.');
  return Object.freeze({ bytes, filename: `bases-${terms.version}.pdf`, sha256: terms.sha256 });
}

export async function createOrganizationListPdf(records: readonly RegistrationExportRecord[], generatedAt: string, root = process.cwd()): Promise<LoadedAdminPdf> {
  const bytes = await createRegistrationPdf(records, await loadRegistrationExportAssets(root), { generatedAt });
  if (!validPdf(bytes)) throw new Error('Organization PDF is invalid.');
  return Object.freeze({ bytes, filename: `listado-inscripciones-${records.length}.pdf`, sha256: digest(bytes) });
}
