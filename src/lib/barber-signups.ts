import { getDatabase } from './database';

export const EXPERIENCE_OPTIONS = ['estudiante', 'profesional', 'educador'] as const;
export type Experience = (typeof EXPERIENCE_OPTIONS)[number];

export type SignupInput = {
  fullName: string;
  email: string;
  phone: string;
  barbershop: string;
  experience: Experience;
  acceptedRules: boolean;
};

export type ValidationResult =
  | { success: true; data: SignupInput }
  | { success: false; errors: Record<string, string> };

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^[+\d][\d\s().-]{6,24}$/;

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function validateSignup(value: unknown): ValidationResult {
  const input = typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};
  const fullName = text(input.fullName);
  const email = text(input.email).toLowerCase();
  const phone = text(input.phone);
  const barbershop = text(input.barbershop);
  const experience = text(input.experience);
  const acceptedRules = input.acceptedRules === true;
  const errors: Record<string, string> = {};

  if (fullName.length < 3 || fullName.length > 100) errors.fullName = 'Ingresá tu nombre completo.';
  if (!emailPattern.test(email) || email.length > 160) errors.email = 'Ingresá un correo electrónico válido.';
  if (!phonePattern.test(phone)) errors.phone = 'Ingresá un teléfono válido.';
  if (barbershop.length > 120) errors.barbershop = 'El nombre de la barbería es demasiado largo.';
  if (!EXPERIENCE_OPTIONS.includes(experience as Experience)) errors.experience = 'Elegí tu nivel de experiencia.';
  if (!acceptedRules) errors.acceptedRules = 'Tenés que aceptar el reglamento y la política de privacidad.';

  if (Object.keys(errors).length > 0) return { success: false, errors };

  return {
    success: true,
    data: { fullName, email, phone, barbershop, experience: experience as Experience, acceptedRules },
  };
}

export async function createSignup(input: SignupInput): Promise<void> {
  await getDatabase().execute({
    sql: `INSERT INTO barber_signups
      (id, full_name, email, phone, barbershop, experience, accepted_rules)
      VALUES (?, ?, ?, ?, ?, ?, 1)`,
    args: [crypto.randomUUID(), input.fullName, input.email, input.phone, input.barbershop || null, input.experience],
  });
}
