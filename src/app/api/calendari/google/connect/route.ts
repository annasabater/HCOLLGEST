import { NextResponse } from 'next/server';
import { authorize } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { businessConfigured } from '@/lib/google-business';
import { buildCalendarAuthUrl, ESTAT_CALENDARI } from '@/lib/google-calendar';

// GET /api/calendari/google/connect — permís de Google Calendar (ADMIN).
// Torna per /api/ressenyes/google/callback (adreça ja registrada a Google Cloud),
// que el reconeix per l'`state` i el deriva al calendari.
export async function GET(req: Request) {
  const auth = await authorize(ROLES_ADMIN);
  if (auth instanceof Response) return auth;
  if (!businessConfigured()) return NextResponse.redirect(new URL('/config?calendari=noconfig', req.url));
  const redirectUri = `${new URL(req.url).origin}/api/ressenyes/google/callback`;
  return NextResponse.redirect(buildCalendarAuthUrl(redirectUri, ESTAT_CALENDARI));
}

export const dynamic = 'force-dynamic';
