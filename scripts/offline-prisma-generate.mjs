/**
 * Génération du client Prisma sans accès à binaries.prisma.sh.
 *
 * En temps normal, `prisma generate` télécharge le "schema engine" avant de
 * produire le client. Dans les environnements verrouillés (CI sans accès au CDN
 * Prisma), ce script court-circuite cette étape : il calcule le DMMF avec le
 * WASM de @prisma/internals puis pilote le générateur `prisma-client-js`
 * directement via son protocole JSON-RPC.
 *
 * Usage : node scripts/offline-prisma-generate.mjs
 * (non nécessaire si `prisma generate` fonctionne dans votre environnement)
 */
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const root = process.cwd();
const schemaPath = path.join(root, 'prisma/schema.prisma');
const output = path.join(root, 'node_modules/.prisma/client');
const datamodel = fs.readFileSync(schemaPath, 'utf8');

let getDMMF;
try {
  ({ getDMMF } = require('@prisma/internals'));
} catch {
  console.error('Installez @prisma/internals (dev) pour utiliser ce script.');
  process.exit(1);
}

const dmmf = await getDMMF({ datamodel, datamodelPath: schemaPath });
console.log(`Schéma valide — ${dmmf.datamodel.models.length} modèles, ${dmmf.datamodel.enums.length} énumérations.`);

const child = spawn(process.execPath, [path.join(root, 'node_modules/@prisma/client/generator-build/index.js')], {
  stdio: ['pipe', 'pipe', 'pipe'],
});

let buffer = '';
const pending = new Map();
const handle = (chunk) => {
  buffer += chunk.toString();
  let idx;
  while ((idx = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, idx).trim();
    buffer = buffer.slice(idx + 1);
    if (!line) continue;
    let msg;
    try { msg = JSON.parse(line); } catch { continue; }
    const waiter = pending.get(msg.id);
    if (waiter) { pending.delete(msg.id); waiter(msg); }
  }
};
child.stdout.on('data', handle);
child.stderr.on('data', handle);

const rpc = (id, method, params) =>
  new Promise((resolve) => {
    pending.set(id, resolve);
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  });

await rpc(1, 'getManifest', { config: { engineType: 'client' } });

const result = await rpc(2, 'generate', {
  generator: {
    name: 'client',
    provider: { fromEnvVar: null, value: 'prisma-client-js' },
    output: { fromEnvVar: null, value: output },
    config: { engineType: 'client' },
    binaryTargets: [],
    previewFeatures: ['driverAdapters', 'queryCompiler'],
    sourceFilePath: schemaPath,
  },
  otherGenerators: [],
  schemaPath,
  datamodel,
  datasources: [
    {
      name: 'db',
      provider: 'postgresql',
      activeProvider: 'postgresql',
      url: { fromEnvVar: 'DATABASE_URL', value: null },
      sourceFilePath: schemaPath,
    },
  ],
  envPaths: { rootEnvPath: null, schemaEnvPath: null },
  version: require('@prisma/engines-version').enginesVersion,
  postinstall: false,
  dmmf,
  binaryPaths: {},
});

if (result.error) {
  console.error('Échec de la génération :', result.error.message);
  process.exit(1);
}
console.log('Client Prisma généré dans node_modules/.prisma/client');
child.stdin.end();
process.exit(0);
