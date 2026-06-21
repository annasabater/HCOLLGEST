import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // El proyecto vive dentro de la carpeta home (que tiene otro lockfile);
  // fijamos la raíz de tracing a este proyecto.
  outputFileTracingRoot: path.join(import.meta.dirname),
  experimental: {
    // Server Actions body size for document uploads (DNI/passport scans).
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // Documentos de identidad y justificantes NUNCA en el bundle del cliente.
  serverExternalPackages: ['@prisma/client', 'bcryptjs'],
};

export default nextConfig;
