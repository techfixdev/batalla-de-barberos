import type { RegistrationExportAssets } from './registration-export-assets';
import type { RegistrationExportFormat } from './registration-export-form';
import type { RegistrationExportRecord, RegistrationListInput } from './registration-read-repository';

export type RegistrationExportServiceInput = Readonly<{ format: RegistrationExportFormat; filters: RegistrationListInput; registrationIds: readonly string[] }>;
export type RegistrationExportServiceResult =
  | Readonly<{ kind: 'document'; format: RegistrationExportFormat; records: readonly RegistrationExportRecord[]; bytes: Uint8Array }>
  | Readonly<{ kind: 'empty' }>
  | Readonly<{ kind: 'too_many' }>
  | Readonly<{ kind: 'conflict' }>;

type Repository = Readonly<{ listForExport(input: RegistrationListInput, ids?: readonly string[]): Promise<readonly RegistrationExportRecord[]> }>;
type Options = Readonly<{
  repository: Repository;
  loadAssets(): Promise<RegistrationExportAssets>;
  createXlsx(records: readonly RegistrationExportRecord[], assets: RegistrationExportAssets): Promise<Uint8Array>;
  createPdf(records: readonly RegistrationExportRecord[], assets: RegistrationExportAssets): Promise<Uint8Array>;
}>;

/** Reusable UNIT 4 boundary: one immutable safe projection is passed to either generator without rereading PII. */
export function createRegistrationExportService(options: Options) {
  return async (input: RegistrationExportServiceInput): Promise<RegistrationExportServiceResult> => {
    let records: readonly RegistrationExportRecord[];
    try { records = await options.repository.listForExport(input.filters, input.registrationIds); }
    catch (error) {
      if (error instanceof Error && error.message === 'Registration selection conflict.') return { kind: 'conflict' };
      throw error;
    }
    if (records.length === 0) return { kind: 'empty' };
    if (records.length > 1000) return { kind: 'too_many' };
    const immutable = Object.freeze([...records]);
    const assets = await options.loadAssets();
    const bytes = input.format === 'xlsx' ? await options.createXlsx(immutable, assets) : await options.createPdf(immutable, assets);
    return { kind: 'document', format: input.format, records: immutable, bytes };
  };
}
