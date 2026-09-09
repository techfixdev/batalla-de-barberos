export const CURRENT_DRAFT_TERMS_VERSION = 'terms-2026-09-v1' as const;

export const DRAFT_TERMS = {
  'draft-2026-09-v1': {
    version: 'draft-2026-09-v1',
    sourcePath: 'content/draft-terms/draft-2026-09-v1.json',
    publicPath: '/documentos/bases-y-categorias/borrador-2026-09-v1.pdf',
    filename: 'bases-y-categorias-batalla-de-barberos-borrador-2026-09-v1.pdf',
    mimeType: 'application/pdf',
    legalMarker: 'BORRADOR — PENDIENTE DE REVISIÓN LEGAL',
    sha256: '215148280563df021b09b1634e63deba401cd9418a638f91a3450a8c2abe178e',
  },
  'draft-2026-09-v2': {
    version: 'draft-2026-09-v2',
    sourcePath: 'content/draft-terms/draft-2026-09-v2.json',
    publicPath: '/documentos/bases-y-categorias/borrador-2026-09-v2.pdf',
    filename: 'bases-y-categorias-batalla-de-barberos-borrador-2026-09-v2.pdf',
    mimeType: 'application/pdf',
    legalMarker: 'BORRADOR — PENDIENTE DE REVISIÓN LEGAL',
    sha256: 'c64ba9a04d2e57f1fadb9dcc267227b6f5d5a532c93f4824a658c734e31d544e',
  },
  'draft-2026-09-v3': {
    version: 'draft-2026-09-v3',
    sourcePath: 'content/draft-terms/draft-2026-09-v3.json',
    publicPath: '/documentos/bases-y-categorias/borrador-2026-09-v3.pdf',
    filename: 'bases-y-categorias-batalla-de-barberos-borrador-2026-09-v3.pdf',
    mimeType: 'application/pdf',
    legalMarker: 'BORRADOR — PENDIENTE DE REVISIÓN LEGAL',
    sha256: '23f380e1313da25e1385f9ec48ff2bcda58a7d9c35045538ecabae0a0f88ce8a',
  },
  'terms-2026-09-v1': {
    version: 'terms-2026-09-v1',
    sourcePath: 'content/draft-terms/terms-2026-09-v1.json',
    publicPath: '/documentos/bases-y-categorias/bases-2026-09-v1.pdf',
    filename: 'bases-y-categorias-batalla-de-barberos-2026-09-v1.pdf',
    mimeType: 'application/pdf',
    legalMarker: '',
    sha256: '1882ac441d84a8f409e8d5e7aca3628039bbf2c7b6bad5bf4baed3128a9fcda7',
  },
} as const;

export type DraftTerms = (typeof DRAFT_TERMS)[keyof typeof DRAFT_TERMS];

export function getDraftTermsByVersion(version: string): DraftTerms | null {
  return DRAFT_TERMS[version as keyof typeof DRAFT_TERMS] ?? null;
}

export function getCurrentDraftTerms() {
  return getDraftTermsByVersion(CURRENT_DRAFT_TERMS_VERSION)!;
}
