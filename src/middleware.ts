/**
 * Middleware de autenticación (edge). Protege todo salvo login y assets.
 *   - No autenticado + ruta de página  → redirección a /login?from=…
 *   - No autenticado + ruta /api        → 401 JSON
 *   - Autenticado visitando /login       → redirección al dashboard
 * La autorización fina por rol se hace en cada Route Handler (guard.authorize).
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionToken, signSession, getSessionMaxAge } from '@/lib/auth/jwt';
import { SESSION_COOKIE } from '@/lib/auth/types';
import { esNomesLectura, teVistaRestringida } from '@/lib/auth/restriccions';

/**
 * Sessió lliscant: renova la cookie de sessió amb cada petició autenticada,
 * així la sessió no caduca mentre s'està fent servir l'app (p. ex. omplint un
 * formulari llarg). Sense això, caducava 8 h després del login encara que
 * estiguessis treballant.
 */
async function renovaSessio(res: NextResponse, user: Parameters<typeof signSession>[0]): Promise<NextResponse> {
  try {
    const fresh = await signSession(user);
    res.cookies.set(SESSION_COOKIE, fresh, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: getSessionMaxAge(),
    });
  } catch {
    /* si la firma falla, deixem passar sense renovar (no bloquegem la petició) */
  }
  return res;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Endpoints sempre accessibles: autenticació, diagnòstic (/api/health),
  // cron (/api/cron/*, que es protegeix ell mateix amb CRON_SECRET) i
  // l'API pública (/api/public/*: valoracions dels hostes des de la web,
  // que es protegeix amb CORS i validació).
  if (
    pathname.startsWith('/api/auth') ||
    pathname === '/api/health' ||
    pathname.startsWith('/api/cron') ||
    pathname.startsWith('/api/public')
  ) {
    return NextResponse.next();
  }

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

  // Mòduls només per a ADMIN (diners i gestió): si no ho és, fora.
  const ADMIN_ONLY = ['/factures', '/balanc', '/tarifes', '/verifactu', '/gastos', '/personal', '/config', '/pressupostos'];
  const isAdminOnly = ADMIN_ONLY.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (isAdminOnly && user.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/', req.url));
  }

  // Vista restringida de propietat (hcoll): amaga mòduls operatius. Bloqueja
  // també l'accés directe per URL a les pàgines (neteja, personal, tarifes).
  if (!isApi && teVistaRestringida(user)) {
    const OCULT_RESTRINGIT = ['/neteja', '/personal', '/tarifes'];
    if (OCULT_RESTRINGIT.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
      return NextResponse.redirect(new URL('/', req.url));
    }
  }

  // Compte de NOMÉS LECTURA: ho veu tot (entra com ADMIN) però no pot escriure
  // res. Bloqueja qualsevol mètode mutador (les lectures GET/HEAD passen). El
  // login/logout (/api/auth) ja s'ha deixat passar abans, així que pot sortir.
  const esSegur = req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS';
  if (!esSegur && esNomesLectura(user)) {
    if (isApi) {
      return NextResponse.json({ error: 'Aquest compte és de només lectura.' }, { status: 403 });
    }
    return NextResponse.redirect(new URL('/', req.url));
  }

  // Tot correcte: deixem passar i renovem la sessió (sessió lliscant).
  return renovaSessio(NextResponse.next(), user);
}

export const config = {
  // Ejecuta en todo menos assets estáticos de Next y ficheros con extensión.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.[\\w]+$).*)'],
};
