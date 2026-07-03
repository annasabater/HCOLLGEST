/**
 * Helpers de respuesta para los Route Handlers REST.
 * Estandariza el formato JSON y el mapeo de errores (Zod, Prisma).
 */
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, { status: 200, ...init });
}

export function created<T>(data: T) {
  return NextResponse.json(data, { status: 201 });
}

export function noContent() {
  return new NextResponse(null, { status: 204 });
}

export function badRequest(message: string, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status: 400 });
}

export function unauthorized(message = 'No autenticat') {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbidden(message = 'Permisos insuficients') {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function notFound(message = 'No trobat') {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function conflict(message: string) {
  return NextResponse.json({ error: message }, { status: 409 });
}

export function serverError(message = 'Error intern del servidor') {
  return NextResponse.json({ error: message }, { status: 500 });
}

/** Lee y parsea el body JSON. Devuelve null si no es JSON válido. */
export async function readJson<T = unknown>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Descriu una violació de restricció única (P2002) indicant QUÈ ha fallat i quin
 * camp del formulari cal marcar. `target` és una clau que el client mapeja a l'input.
 */
function describeP2002(err: Prisma.PrismaClientKnownRequestError): { message: string; target: string } {
  const raw = (err.meta as { target?: unknown } | undefined)?.target;
  const t = (Array.isArray(raw) ? raw.join(',') : String(raw ?? '')).toLowerCase();

  if (t.includes('contracte')) {
    return {
      message:
        'Ja existeix una estada amb aquest número de contracte per a l’any indicat. ' +
        'Canvia el número de contracte i torna-ho a provar.',
      target: 'estancia.numContracte',
    };
  }
  if (t.includes('document') || t.includes('huesped')) {
    return {
      message:
        'Ja hi ha un hoste registrat amb aquest tipus i número de document. Cerca’l amb la ' +
        'lupa per reutilitzar la seva fitxa, o revisa el número de document.',
      target: 'numDocument',
    };
  }
  if (t.includes('email') || t.includes('correu')) {
    return { message: 'Aquest correu electrònic ja està registrat.', target: 'email' };
  }
  if (t.includes('numero') || t.includes('factura')) {
    return { message: 'Ja existeix una factura amb aquest número.', target: 'numero' };
  }
  return {
    message: t
      ? `Ja existeix un registre amb el mateix valor a: ${t}.`
      : 'Ja existeix un registre amb aquest valor únic.',
    target: t,
  };
}

/**
 * Mapea excepciones comunes a respuestas HTTP. Úsalo en el catch de cada handler.
 */
export function handleApiError(err: unknown): NextResponse {
  if (err instanceof ZodError) {
    return NextResponse.json(
      { error: 'Dades no vàlides', details: err.flatten() },
      { status: 400 },
    );
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const { message, target } = describeP2002(err);
      // Retornem també el camp (`target`) perquè el formulari el pugui marcar en vermell.
      return NextResponse.json({ error: message, details: { code: 'P2002', target } }, { status: 409 });
    }
    if (err.code === 'P2025') {
      return notFound();
    }
    // Base de dades no preparada (taula/columna inexistent) → cal migrar.
    if (err.code === 'P2021' || err.code === 'P2022') {
      console.error('[API] Base de dades no migrada:', err.code);
      return NextResponse.json(
        { error: 'Base de dades no preparada (falten taules). Cal executar les migracions.', code: err.code },
        { status: 503 },
      );
    }
  }
  // No es pot connectar a la base de dades (URL/credencials/Supabase).
  if (
    err instanceof Prisma.PrismaClientInitializationError ||
    (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P1001')
  ) {
    console.error('[API] Error de connexió a la BD:', err);
    return NextResponse.json(
      { error: 'No es pot connectar amb la base de dades. Revisa la configuració.', code: 'DB_CONN' },
      { status: 503 },
    );
  }
  // Variables d'entorn obligatòries que falten (JWT_SECRET, clau de xifrat…).
  if (err instanceof Error && err.message.includes('variable de entorno')) {
    console.error('[API] Config incompleta:', err.message);
    return NextResponse.json({ error: 'Configuració del servidor incompleta.', code: 'ENV' }, { status: 503 });
  }
  // Errores de validación de negocio lanzados como Error con mensaje legible.
  if (err instanceof Error && err.message.startsWith('Validación fallida')) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
  console.error('[API] Error no controlado:', err);
  return serverError();
}
