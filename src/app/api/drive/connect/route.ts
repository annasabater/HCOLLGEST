import { NextResponse } from 'next/server';
import { authorize } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { buildAuthUrl, driveConfigured } from '@/lib/drive';

// GET /api/drive/connect — inicia el consentiment OAuth de Google Drive (ADMIN).
export async function GET(req: Request) {
  const auth = await authorize(ROLES_ADMIN);
  if (auth instanceof Response) return auth;
  if (!driveConfigured()) {
    return NextResponse.redirect(new URL('/config?drive=noconfig', req.url));
  }
  const redirectUri = `${new URL(req.url).origin}/api/drive/callback`;
  return NextResponse.redirect(buildAuthUrl(redirectUri, 'hcoll'));
}

export const dynamic = 'force-dynamic';
