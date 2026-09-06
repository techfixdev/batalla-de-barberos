export const CURRENT_DRAFT_TERMS_VERSION = 'draft-2026-09-v1' as const;

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
} as const;

export type DraftTerms = (typeof DRAFT_TERMS)[keyof typeof DRAFT_TERMS];

export function getDraftTermsByVersion(version: string): DraftTerms | null {
  return DRAFT_TERMS[version as keyof typeof DRAFT_TERMS] ?? null;
}

export function getCurrentDraftTerms() {
  return getDraftTermsByVersion(CURRENT_DRAFT_TERMS_VERSION)!;
}
