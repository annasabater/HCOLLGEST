import { NextResponse } from 'next/server';
import { authorize } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { buildBusinessAuthUrl, businessConfigured } from '@/lib/google-business';

// GET /api/ressenyes/google/connect — consentiment OAuth per llegir les ressenyes (ADMIN).
export async function GET(req: Request) {
  const auth = await authorize(ROLES_ADMIN);
  if (auth instanceof Response) return auth;
  if (!businessConfigured()) return NextResponse.redirect(new URL('/ressenyes?google=noconfig', req.url));
  const redirectUri = `${new URL(req.url).origin}/api/ressenyes/google/callback`;
  return NextResponse.redirect(buildBusinessAuthUrl(redirectUri, 'hcoll-ressenyes'));
}

export const dynamic = 'force-dynamic';
