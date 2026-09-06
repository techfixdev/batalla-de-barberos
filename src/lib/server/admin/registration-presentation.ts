import type { RegistrationReadRecord } from './registration-read-repository';

const reviewLabels = {
  received: 'Recibida', under_review: 'En revisión', selected: 'Seleccionada', rejected: 'No seleccionada', withdrawn: 'Retirada',
} as const;
const participantLabels = {
  not_requested: 'No solicitada', pending: 'Pendiente', confirmed: 'Confirmada', declined: 'Rechazada',
} as const;
const receiptLabels = {
  pending: 'Acuse documental pendiente', failed: 'Acuse documental fallido', uncertain: 'Estado del acuse incierto',
  sent: 'Documento aceptado por el proveedor; entrega no verificada',
} as const;

export type RegistrationPresentation = Readonly<{
  phone: string;
  review: Readonly<{ heading: 'Revisión de inscripción'; label: string }>;
  participantResponse: Readonly<{ heading: 'Respuesta del participante'; label: string }>;
  receipt: Readonly<{ heading: 'Acuse documental por WhatsApp'; label: string }>;
}>;

export function presentRegistration(record: RegistrationReadRecord): RegistrationPresentation {
  return {
    phone: record.phoneE164 ?? 'No disponible (registro anterior)',
    review: { heading: 'Revisión de inscripción', label: reviewLabels[record.reviewState] },
    participantResponse: { heading: 'Respuesta del participante', label: participantLabels[record.participantResponseState] },
    receipt: { heading: 'Acuse documental por WhatsApp', label: record.receipt
      ? receiptLabels[record.receipt.status] : record.receiptRequired
        ? 'Inscripción recibida; acuse pendiente de conciliación' : 'No corresponde a registros anteriores' },
  };
}
