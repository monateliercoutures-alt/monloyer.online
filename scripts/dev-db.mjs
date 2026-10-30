/**
 * Base de démonstration locale — PGlite (PostgreSQL compilé en WASM) exposé sur
 * le protocole réseau PostgreSQL. Permet de faire tourner l'application sans
 * installer Postgres ni disposer d'une base Neon.
 *
 *   npm run db:local        → démarre la base, applique la migration, seed
 *   npm run db:local:reset  → repart d'une base vierge
 *
 * En production, pointez simplement DATABASE_URL vers Neon : ce script n'est
 * pas utilisé.
 */
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const reset = process.argv.includes('--reset');
const dataDir = path.join(root, '.pglite');
const port = Number(process.env.PGLITE_PORT ?? 5433);
const connectionString = `postgresql://postgres:postgres@127.0.0.1:${port}/postgres?schema=public`;

if (reset && fs.existsSync(dataDir)) {
  fs.rmSync(dataDir, { recursive: true, force: true });
  console.log('[db] base locale réinitialisée');
}

const db = await PGlite.create({ dataDir });

const exists = await db.query(
  `SELECT 1 FROM information_schema.tables WHERE table_name = 'Organization' LIMIT 1`,
);

if (!exists.rows.length) {
  const migrationsDir = path.join(root, 'prisma/migrations');
  const folders = fs
    .readdirSync(migrationsDir)
    .filter((name) => fs.existsSync(path.join(migrationsDir, name, 'migration.sql')))
    .sort();

  for (const folder of folders) {
    const sql = fs.readFileSync(path.join(migrationsDir, folder, 'migration.sql'), 'utf8');
    await db.exec(sql);
    console.log(`[db] migration appliquée : ${folder}`);
  }
}

const server = new PGLiteSocketServer({ db, port, host: '127.0.0.1', maxConnections: 10 });
await server.start();
console.log(`[db] PostgreSQL de démonstration à l'écoute sur 127.0.0.1:${port}`);

const { rows } = await db.query('SELECT COUNT(*)::int AS count FROM "Organization"');
if (rows[0].count === 0) {
  console.log('[db] base vide : exécution du seed de démonstration…');
  await new Promise((resolve, reject) => {
    const child = spawn('node', ['--import', 'tsx', 'prisma/seed.ts'], {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: connectionString },
    });
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`seed échoué (${code})`))));
  });
}

console.log(`[db] prêt.\nDATABASE_URL="${connectionString}"`);

let stopping = false;
const shutdown = async () => {
  if (stopping) return;
  stopping = true;
  await server.stop();
  await db.close();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
