export const DRAFT_LEGAL_MARKER = 'BORRADOR — PENDIENTE DE REVISIÓN LEGAL';

export function createReceiptCaption(mediaUrl: string, legalMarker = DRAFT_LEGAL_MARKER): string {
  return `Recibimos tu inscripción a Batalla de Barberos.\n\nEste mensaje confirma únicamente la recepción de tu inscripción. No implica selección, aceptación para competir, confirmación de participación ni asignación de categoría.\n\nAdjuntamos las bases y categorías: ${legalMarker}.\n\nSi no podés abrir el documento adjunto, consultá esta misma versión: ${mediaUrl}`;
}
