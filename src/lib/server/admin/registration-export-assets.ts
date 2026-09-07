import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export type RegistrationExportAssets = Readonly<{ regularFont: Uint8Array; boldFont: Uint8Array; emblemJpeg: Uint8Array }>;

export async function loadRegistrationExportAssets(root = process.cwd()): Promise<RegistrationExportAssets> {
  const paths = [
    'content/admin-export/fonts/NotoSans-Regular.ttf',
    'content/admin-export/fonts/NotoSans-Bold.ttf',
    'content/draft-terms/branding/entre-cortes-emblem.jpg',
  ];
  const files = await Promise.all(paths.map((path) => readFile(resolve(root, path))));
  return Object.freeze({ regularFont: files[0]!, boldFont: files[1]!, emblemJpeg: files[2]! });
}
