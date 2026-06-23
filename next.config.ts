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

  // Capçaleres de seguretat HTTP (anti-clickjacking, HSTS, sniffing, etc.).
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'off' },
          // La càmera (escàner de DNI) només per al propi origen; res més.
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(), payment=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
