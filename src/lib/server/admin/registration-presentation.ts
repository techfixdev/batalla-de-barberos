import { participantResponseLabel, reviewStateLabel } from './registration-labels';
import type { RegistrationReadRecord } from './registration-read-repository';

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
    review: { heading: 'Revisión de inscripción', label: reviewStateLabel(record.reviewState) },
    participantResponse: { heading: 'Respuesta del participante', label: participantResponseLabel(record.participantResponseState) },
    receipt: { heading: 'Acuse documental por WhatsApp', label: record.receipt
      ? receiptLabels[record.receipt.status] : record.receiptRequired
        ? 'Inscripción recibida; acuse pendiente de conciliación' : 'No corresponde a registros anteriores' },
  };
}
