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
      return conflict('Ja existeix un registre amb aquest valor únic.');
    }
    if (err.code === 'P2025') {
      return notFound();
    }
  }
  // Errores de validación de negocio lanzados como Error con mensaje legible.
  if (err instanceof Error && err.message.startsWith('Validación fallida')) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
  console.error('[API] Error no controlado:', err);
  return serverError();
}
