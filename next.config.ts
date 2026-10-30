import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // PGlite / pg / pdf-lib sont utilisés uniquement côté serveur (runtime Node).
  serverExternalPackages: ['@electric-sql/pglite', '@prisma/adapter-pg', 'pg'],
  experimental: {
    // Photos de biens et justificatifs envoyés en base64 (MVP, sans stockage objet)
    serverActions: { bodySizeLimit: '6mb' },
  },
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
