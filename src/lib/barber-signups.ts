import { normalizeArgentinaPhone } from './server/phone/argentina';

export const EXPERIENCE_OPTIONS = ['estudiante', 'profesional', 'educador'] as const;
export type Experience = (typeof EXPERIENCE_OPTIONS)[number];

export type SignupInput = {
  fullName: string;
  email: string;
  phone: string;
  phoneE164: string;
  barbershop: string;
  experience: Experience;
  acceptedRules: boolean;
};

export type ValidationResult =
  | { success: true; data: SignupInput }
  | { success: false; errors: Record<string, string> };

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function validateSignup(value: unknown): ValidationResult {
  const input = typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};
  const fullName = text(input.fullName);
  const email = text(input.email).toLowerCase();
  const phone = text(input.phone);
  const phoneE164 = normalizeArgentinaPhone(phone);
  const barbershop = text(input.barbershop);
  const experience = text(input.experience);
  const acceptedRules = input.acceptedRules === true;
  const errors: Record<string, string> = {};

  if (fullName.length < 3 || fullName.length > 100) errors.fullName = 'Ingresá tu nombre completo.';
  if (!emailPattern.test(email) || email.length > 160) errors.email = 'Ingresá un correo electrónico válido.';
  if (!phoneE164) errors.phone = 'Ingresá un teléfono argentino válido con +54 9 … o 0… 15 ….';
  if (barbershop.length > 120) errors.barbershop = 'El nombre de la barbería es demasiado largo.';
  if (!EXPERIENCE_OPTIONS.includes(experience as Experience)) errors.experience = 'Elegí tu nivel de experiencia.';
  if (!acceptedRules) errors.acceptedRules = 'Tenés que confirmar que leíste el aviso de participación, la política de privacidad y las bases y categorías (PDF): BORRADOR — PENDIENTE DE REVISIÓN LEGAL.';

  if (!phoneE164 || Object.keys(errors).length > 0) return { success: false, errors };
  return { success: true, data: { fullName, email, phone, phoneE164, barbershop, experience: experience as Experience, acceptedRules } };
}
