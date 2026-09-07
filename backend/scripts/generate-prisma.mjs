import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = new URL('../', import.meta.url);
const source = await readFile(new URL('../prisma/schema.prisma', root), 'utf8');
const generator = /generator client\s*\{[^}]*\}/;
if (!generator.test(source))
  throw new Error('Shared Prisma client generator not found');
// Keep the root schema authoritative and generate an isolated backend client.
const schema = source.replace(
  generator,
  'generator client {\n  provider = "prisma-client-js"\n  output = "../generated/client"\n}',
);
await mkdir(new URL('.prisma/', root), { recursive: true });
await writeFile(new URL('.prisma/schema.prisma', root), schema);
const require = createRequire(import.meta.url);
execFileSync(
  process.execPath,
  [
    join(dirname(require.resolve('prisma/package.json')), 'build/index.js'),
    'generate',
    '--schema',
    '.prisma/schema.prisma',
  ],
  {
    cwd: fileURLToPath(root),
    stdio: 'inherit',
    env: {
      ...process.env,
      CHECKPOINT_DISABLE: '1',
      PRISMA_HIDE_UPDATE_MESSAGE: '1',
    },
  },
);
