import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { dev } from 'astro';
import { expect, it } from 'vitest';

const PDF_PATH = '/documentos/bases-y-categorias/borrador-2026-09-v1.pdf';
const PDF_SHA256 = '215148280563df021b09b1634e63deba401cd9418a638f91a3450a8c2abe178e';

it('declares Vercel PDF headers and serves the immutable PDF and Astro static asset locally', async () => {
  const [pdf, vercelJson] = await Promise.all([
    readFile(resolve(process.cwd(), `public${PDF_PATH}`)),
    readFile(resolve(process.cwd(), 'vercel.json'), 'utf8'),
  ]);
  const expectedHash = createHash('sha256').update(pdf).digest('hex');
  const headers = JSON.parse(vercelJson) as { headers: Array<{ source: string; headers: Array<{ key: string; value: string }> }> };
  const declaration = headers.headers.find((rule) => rule.source === PDF_PATH);

  expect(expectedHash).toBe(PDF_SHA256);
  expect(declaration?.headers).toEqual(expect.arrayContaining([
    { key: 'Content-Type', value: 'application/pdf' },
    { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
  ]));

  const previousUpdateCheck = process.env.ASTRO_DISABLE_UPDATE_CHECK;
  let server: Awaited<ReturnType<typeof dev>> | undefined;
  try {
    process.env.ASTRO_DISABLE_UPDATE_CHECK = 'true';
    server = await dev({ root: process.cwd(), server: { host: '127.0.0.1', port: 0 }, logLevel: 'silent' });
    const origin = `http://127.0.0.1:${server.address.port}`;
    const [get, head, home] = await Promise.all([
      fetch(`${origin}${PDF_PATH}`),
      fetch(`${origin}${PDF_PATH}`, { method: 'HEAD' }),
      fetch(origin),
    ]);
    expect(await home.text()).toContain('src="/src/styles/global.css"');

    expect(get.status).toBe(200);
    expect(get.headers.get('content-type')).toContain('application/pdf');
    expect(createHash('sha256').update(Buffer.from(await get.arrayBuffer())).digest('hex')).toBe(expectedHash);
    expect(head.status).toBe(200);
    expect(head.headers.get('content-type')).toContain('application/pdf');
    expect((await fetch(`${origin}/src/styles/global.css`)).status).toBe(200);
  } finally {
    await server?.stop();
    if (previousUpdateCheck === undefined) delete process.env.ASTRO_DISABLE_UPDATE_CHECK;
    else process.env.ASTRO_DISABLE_UPDATE_CHECK = previousUpdateCheck;
  }
}, 30_000);
