import { Buffer } from 'node:buffer';

import { createAdminPasswordHash } from './admin-password-crypto.mjs';

const MAX_PASSWORD_BYTES = 1024;

function readPasswordFromStdin() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let rejected = false;

    process.stdin.on('data', (chunk) => {
      if (rejected) return;
      size += chunk.length;
      if (size > MAX_PASSWORD_BYTES + 1) {
        rejected = true;
        reject(new Error('input-limit'));
      } else {
        chunks.push(chunk);
      }
    });
    process.stdin.once('error', reject);
    process.stdin.once('end', () => {
      if (rejected) return;
      const input = Buffer.concat(chunks);
      const password = input.subarray(input.length - 1)[0] === 0x0a
        ? input.subarray(0, input.length - (input.length > 1 && input[input.length - 2] === 0x0d ? 2 : 1))
        : input;
      if (password.length === 0 || password.length > MAX_PASSWORD_BYTES || password.includes(0x0a) || password.includes(0x0d)) {
        reject(new Error('invalid-input'));
      } else {
        resolve(password.toString('utf8'));
      }
    });
  });
}

async function main() {
  if (process.argv.length !== 2) {
    process.stderr.write('Password arguments are not accepted; provide one password only on standard input.\n');
    process.exitCode = 1;
    return;
  }

  try {
    const password = await readPasswordFromStdin();
    process.stdout.write(`${await createAdminPasswordHash(password)}\n`);
  } catch {
    process.stderr.write(`Password input must be one non-empty line of at most ${MAX_PASSWORD_BYTES} bytes.\n`);
    process.exitCode = 1;
  }
}

void main();
