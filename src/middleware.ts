/**
 * Middleware de autenticación (edge). Protege todo salvo login y assets.
 *   - No autenticado + ruta de página  → redirección a /login?from=…
 *   - No autenticado + ruta /api        → 401 JSON
 *   - Autenticado visitando /login       → redirección al dashboard
 * La autorización fina por rol se hace en cada Route Handler (guard.authorize).
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionToken } from '@/lib/auth/jwt';
import { SESSION_COOKIE } from '@/lib/auth/types';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Los endpoints de autenticación son siempre accesibles.
  if (pathname.startsWith('/api/auth')) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const user = token ? await verifySessionToken(token) : null;
  const isApi = pathname.startsWith('/api');
  const isLogin = pathname === '/login';

  if (isLogin) {
    // Ya logueado → fuera de la pantalla de login.
    if (user) return NextResponse.redirect(new URL('/', req.url));
    return NextResponse.next();
  }

  if (!user) {
    if (isApi) {
      return NextResponse.json({ error: 'No autenticat' }, { status: 401 });
    }
    const url = new URL('/login', req.url);
    url.searchParams.set('from', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Ejecuta en todo menos assets estáticos de Next y ficheros con extensión.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.[\\w]+$).*)'],
};
