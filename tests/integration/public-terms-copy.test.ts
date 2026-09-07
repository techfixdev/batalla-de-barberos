import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { getCurrentDraftTerms } from '../../src/lib/terms/draft-terms-manifest';

const root = process.cwd();
const marker = 'BORRADOR — PENDIENTE DE REVISIÓN LEGAL';
const validationAcknowledgement = 'Tenés que confirmar que leíste el aviso de participación, la política de privacidad y las bases y categorías (PDF): BORRADOR — PENDIENTE DE REVISIÓN LEGAL.';
const apiSuccessMessage = 'Guardamos tu inscripción. Intentaremos enviar un acuse por WhatsApp con el PDF adjunto; si no lo recibís, no invalida la inscripción guardada. La selección la decide más adelante la organización y la respuesta posterior de la persona participante se registra por separado. El acuse no constituye consentimiento legal ni confirma selección o participación.';
const staticSuccessMessage = 'Guardamos tu inscripción. Intentaremos enviarte un acuse por WhatsApp con el PDF adjunto; si no lo recibís, no invalida la inscripción guardada. La selección la decide más adelante la organización y la respuesta posterior de la persona participante se registra por separado. El acuse no constituye consentimiento legal ni confirma selección o participación.';
const publicFiles = [
  { path: 'src/components/SignupForm.astro', importPath: './DraftTermsLink.astro' },
  { path: 'src/pages/participacion.astro', importPath: '../components/DraftTermsLink.astro' },
  { path: 'src/pages/privacidad.astro', importPath: '../components/DraftTermsLink.astro' },
];

async function source(path: string) {
  return readFile(resolve(root, path), 'utf8');
}

describe('public draft terms copy', () => {
  it('uses one shared immutable draft-terms link with the legal marker in every public legal surface', async () => {
    const link = await source('src/components/DraftTermsLink.astro');
    const surfaces = await Promise.all(publicFiles.map(async ({ path, importPath }) => ({
      page: await source(path),
      importPath,
    })));

    expect(link).toContain("import { getCurrentDraftTerms } from '../lib/terms/draft-terms-manifest';");
    expect(link).toContain('href={terms.publicPath}');
    expect(link).toContain('{terms.legalMarker}');
    expect(link).toContain('Bases y categorías (PDF)');
    for (const { page, importPath } of surfaces) {
      expect(page).toContain(`import DraftTermsLink from '${importPath}';`);
      expect(page).toContain('<DraftTermsLink />');
      expect(page).not.toMatch(/\/documentos\/bases-y-categorias\/borrador-2026-09-v[12]\.pdf/);
    }
    expect(getCurrentDraftTerms()).toEqual(expect.objectContaining({
      version: 'draft-2026-09-v2',
      legalMarker: marker,
      publicPath: '/documentos/bases-y-categorias/borrador-2026-09-v2.pdf',
    }));
  });

  it('keeps all public draft references behind the marked shared component', async () => {
    const [signup, participation, privacy, link] = await Promise.all([
      source('src/components/SignupForm.astro'),
      source('src/pages/participacion.astro'),
      source('src/pages/privacidad.astro'),
      source('src/components/DraftTermsLink.astro'),
    ]);

    expect((link.match(/href=/g) ?? [])).toHaveLength(1);
    expect((signup.match(/<DraftTermsLink/g) ?? [])).toHaveLength(2);
    expect((participation.match(/<DraftTermsLink/g) ?? [])).toHaveLength(2);
    expect((privacy.match(/<DraftTermsLink/g) ?? [])).toHaveLength(2);
    for (const page of [signup, participation, privacy]) {
      expect(page).not.toMatch(/borrador-2026-09-v[12]\.pdf/);
    }
  });

  it('uses an exact read-state validation message instead of claiming acceptance of regulations', async () => {
    const validation = await source('src/lib/barber-signups.ts');

    expect(validation).toContain(`errors.acceptedRules = '${validationAcknowledgement}';`);
    expect(validation).not.toContain('aceptar el reglamento y la política de privacidad');
    expect(validation).not.toContain('aceptar reglas finales');
  });

  it('returns an exact saved-registration response that separates the receipt attempt and later outcomes', async () => {
    const signupApi = await source('src/pages/api/signups.ts');

    expect(signupApi).toContain(`message: '${apiSuccessMessage}'`);
    expect(signupApi).not.toContain('Pronto nos vamos a comunicar con vos');
    expect(signupApi).not.toContain('confirmación de participación');
  });

  it('uses exact static signup success copy for the later participant response and non-consent receipt', async () => {
    const signup = await source('src/components/SignupForm.astro');

    expect(signup).toContain(`status.textContent = '${staticSuccessMessage}';`);
    expect(signup).not.toContain('Esto no confirma selección, tu participación ni la aceptación de reglas finales.');
  });

  it('uses exact participation and privacy copy that keeps every lifecycle state distinct', async () => {
    const [participation, privacy] = await Promise.all([
      source('src/pages/participacion.astro'),
      source('src/pages/privacidad.astro'),
    ]);

    expect(participation).toContain('la respuesta posterior de la persona participante se registrará por separado');
    expect(participation).not.toContain('su respuesta posterior de la persona participante');
    expect(participation).toContain('no implica selección');
    expect(participation).toContain('no invalida la inscripción guardada');
    expect(participation).toContain('no asignan una categoría');
    expect(participation).toContain('BORRADOR — PENDIENTE DE REVISIÓN LEGAL');
    expect(participation).not.toContain('Los datos de categorías, requisitos, horarios, materiales, criterios de evaluación');
    expect(privacy).toContain('Evolution API/WhatsApp');
    expect(privacy).toContain('no invalida la inscripción guardada');
    expect(privacy).toContain('no constituye consentimiento legal');
    expect(privacy).toContain('[A DEFINIR CON REVISIÓN LEGAL]');
  });
});
