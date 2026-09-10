type ManualConfirmationInput = Readonly<{
  fullName: string;
  phoneE164: string | null;
  registrationNumber?: number;
}>;

const ARGENTINA_MOBILE_E164 = /^\+549\d{10,11}$/;

/** Creates a client-opened WhatsApp receipt acknowledgement without recording or dispatching a message. */
export function buildManualWhatsAppConfirmationUrl(input: ManualConfirmationInput): string | null {
  const name = input.fullName.normalize('NFKC').trim();
  if (!name || !input.phoneE164 || !ARGENTINA_MOBILE_E164.test(input.phoneE164)) return null;
  const text = `Hola ${name}, recibimos tu inscripción a Batalla de Barberos. ¡Gracias por participar!`;
  return `https://wa.me/${input.phoneE164.slice(1)}?text=${encodeURIComponent(text)}`;
}
