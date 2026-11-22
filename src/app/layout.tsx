import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { Manrope, Cormorant_Garamond, Montserrat } from 'next/font/google';
import { BARRA_COOKIE, ESTIL_COOKIE, barraValida, estilValid } from '@/lib/estil';
import './globals.css';

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-manrope',
  display: 'swap',
});

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-cormorant',
  display: 'swap',
});

// Títols del nou estil (vegeu src/lib/estil.ts).
const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-montserrat',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Hostal Coll — Gestió',
  description: 'PMS + ERP del Hostal Coll: registre de viatgers, CRM, facturació i gestió.',
  robots: { index: false, follow: false },
  // Instal·lable al mòbil (pantalla d'inici): cal per a les notificacions a l'iPhone.
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/favicon-48.png', sizes: '48x48', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: { capable: true, title: 'Hostal Coll', statusBarStyle: 'default' },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const galetes = await cookies();
  const estil = estilValid(galetes.get(ESTIL_COOKIE)?.value);
  const barra = barraValida(galetes.get(BARRA_COOKIE)?.value);
  return (
    <html lang="ca" data-estil={estil} data-barra={barra} className={`${manrope.variable} ${cormorant.variable} ${montserrat.variable}`}>
      <body>{children}</body>
    </html>
  );
}
