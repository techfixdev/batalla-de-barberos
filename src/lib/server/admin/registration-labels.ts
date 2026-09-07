import type { Experience } from '../../barber-signups';
import type { ParticipantResponseState, ReceiptStatus, ReviewState } from '../registrations/domain';

export type AdminMessageAttemptOutcome = 'in_progress' | 'sent' | 'failed' | 'uncertain';

export const REGISTRATION_LABELS = {
  review: {
    received: 'Recibida',
    under_review: 'En revisión',
    selected: 'Seleccionada',
    rejected: 'No seleccionada',
    withdrawn: 'Retirada',
  } satisfies Record<ReviewState, string>,
  participantResponse: {
    not_requested: 'No solicitada',
    pending: 'Pendiente',
    confirmed: 'Confirmada',
    declined: 'Rechazada',
  } satisfies Record<ParticipantResponseState, string>,
  receiptStatus: {
    pending: 'Pendiente',
    sent: 'Enviado',
    failed: 'Fallido',
    uncertain: 'Incierto',
  } satisfies Record<ReceiptStatus, string>,
  adminMessageAttemptOutcome: {
    in_progress: 'En curso',
    sent: 'Aceptado por el proveedor',
    failed: 'Fallido',
    uncertain: 'Resultado incierto',
  } satisfies Record<AdminMessageAttemptOutcome, string>,
  experience: {
    estudiante: 'Estudiante',
    profesional: 'Profesional',
    educador: 'Educador',
  } satisfies Record<Experience, string>,
} as const;

export const REVIEW_STATE_OPTIONS = [
  ['received', REGISTRATION_LABELS.review.received],
  ['under_review', REGISTRATION_LABELS.review.under_review],
  ['selected', REGISTRATION_LABELS.review.selected],
  ['rejected', REGISTRATION_LABELS.review.rejected],
  ['withdrawn', REGISTRATION_LABELS.review.withdrawn],
] as const satisfies ReadonlyArray<readonly [ReviewState, string]>;
export const PARTICIPANT_RESPONSE_OPTIONS = [
  ['not_requested', REGISTRATION_LABELS.participantResponse.not_requested],
  ['pending', REGISTRATION_LABELS.participantResponse.pending],
  ['confirmed', REGISTRATION_LABELS.participantResponse.confirmed],
  ['declined', REGISTRATION_LABELS.participantResponse.declined],
] as const satisfies ReadonlyArray<readonly [ParticipantResponseState, string]>;
export const RECEIPT_STATUS_OPTIONS = [
  ['pending', REGISTRATION_LABELS.receiptStatus.pending],
  ['sent', REGISTRATION_LABELS.receiptStatus.sent],
  ['failed', REGISTRATION_LABELS.receiptStatus.failed],
  ['uncertain', REGISTRATION_LABELS.receiptStatus.uncertain],
] as const satisfies ReadonlyArray<readonly [ReceiptStatus, string]>;

export function reviewStateLabel(value: string): string {
  switch (value) {
    case 'received': case 'under_review': case 'selected': case 'rejected': case 'withdrawn': return REGISTRATION_LABELS.review[value];
    default: return 'Estado no disponible';
  }
}

export function participantResponseLabel(value: string): string {
  switch (value) {
    case 'not_requested': case 'pending': case 'confirmed': case 'declined': return REGISTRATION_LABELS.participantResponse[value];
    default: return 'Estado no disponible';
  }
}

export function receiptStatusLabel(value: string): string {
  switch (value) {
    case 'pending': case 'sent': case 'failed': case 'uncertain': return REGISTRATION_LABELS.receiptStatus[value];
    default: return 'Estado no disponible';
  }
}

export function adminMessageAttemptOutcomeLabel(value: string): string {
  switch (value) {
    case 'in_progress': case 'sent': case 'failed': case 'uncertain': return REGISTRATION_LABELS.adminMessageAttemptOutcome[value];
    default: return 'Estado no disponible';
  }
}

export function experienceLabel(value: string): string {
  switch (value) {
    case 'estudiante': case 'profesional': case 'educador': return REGISTRATION_LABELS.experience[value];
    default: return 'Experiencia no disponible';
  }
}
