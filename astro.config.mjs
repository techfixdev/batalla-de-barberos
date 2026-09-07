import vercel from '@astrojs/vercel';
import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'server',
  adapter: vercel({ includeFiles: [
    'content/admin-export/fonts/NotoSans-Regular.ttf',
    'content/admin-export/fonts/NotoSans-Bold.ttf',
    'content/draft-terms/branding/entre-cortes-emblem.jpg',
      'public/documentos/bases-y-categorias/borrador-2026-09-v1.pdf',
      'public/documentos/bases-y-categorias/borrador-2026-09-v2.pdf',
      'public/documentos/bases-y-categorias/borrador-2026-09-v3.pdf',
  ] }),
  security: {
    checkOrigin: true,
    allowedDomains: [{ protocol: 'https', hostname: 'batalladebarberos.com.ar' }],
  },
});
