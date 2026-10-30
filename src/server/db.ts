import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

/**
 * Client Prisma unique (singleton) — évite l'explosion du pool de connexions
 * lors des rechargements à chaud en développement.
 *
 * Le driver adapter `@prisma/adapter-pg` fonctionne aussi bien avec Neon qu'avec
 * un PostgreSQL classique (ou le Postgres local en WASM utilisé pour la démo).
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL n'est pas défini. Copiez .env.example vers .env puis renseignez votre base Neon.",
    );
  }

  const adapter = new PrismaPg({
    connectionString,
    max: Number(process.env.DATABASE_POOL_MAX ?? 5),
    // Neon exige TLS ; sslmode=require est déjà présent dans l'URL de connexion.
  });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
