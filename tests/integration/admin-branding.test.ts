import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

describe('authenticated admin branding', () => {
  it('uses the original Entre Cortes emblem and a declarative admin identity without public interactions', async () => {
    const layout = await readFile(resolve(root, 'src/layouts/AdminLayout.astro'), 'utf8');

    expect(layout).toContain("import emblem from '../assets/barber-battle/entre-cortes-logo-ai.png';");
    expect(layout).toContain('<img src={emblem.src}');
    expect(layout).toContain('<span class="admin-brand__presenter">Entre Cortes</span>');
    expect(layout).toContain('<span class="admin-brand__event">Batalla de Barberos</span>');
    expect(layout).toContain('<span class="admin-brand__area">Administración</span>');
    expect(layout).not.toMatch(/public-site|brand-emblem-spin|barber-hit-zone|pointerevents/i);
  });

  it('preserves the authenticated navigation and exact CSRF logout form semantics', async () => {
    const layout = await readFile(resolve(root, 'src/layouts/AdminLayout.astro'), 'utf8');

    expect(layout).toContain('<a class="admin-brand" href="/admin">');
    expect(layout).toContain('<form action="/api/admin/logout" method="post">');
    expect(layout).toContain('<input type="hidden" name="csrf" value={csrfToken} />');
    expect(layout).toContain('<button class="admin-logout" type="submit">Cerrar sesión</button>');
  });
});
