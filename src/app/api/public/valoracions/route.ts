/**
 * Endpoint PÚBLIC (sense auth) per rebre les valoracions dels hostes des de
 * hostalcoll.com/benvinguda.html. El middleware deixa passar /api/public/*.
 * Es protegeix amb CORS (només hostalcoll.com), validació i límits de longitud.
 * Només escriu (POST); el panell llegeix directament de la BD.
 */
import { prisma } from '@/lib/db';
import { ValoracioCreateSchema } from '@/lib/validation/valoracio';
import { handleApiError } from '@/lib/http';
import { NextResponse } from 'next/server';

const ALLOW_ORIGIN = 'https://hostalcoll.com';

function withCors(res: NextResponse): NextResponse {
  res.headers.set('Access-Control-Allow-Origin', ALLOW_ORIGIN);
  res.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  res.headers.set('Vary', 'Origin');
  return res;
}

// Preflight CORS
export function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

// POST /api/public/valoracions — l'hoste envia la seva valoració
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const data = ValoracioCreateSchema.parse(body);
    const valoracio = await prisma.valoracio.create({
      data: {
        puntuacio: data.puntuacio,
        comentari: data.comentari ?? null,
        nom: data.nom ?? null,
        habitacio: data.habitacio ?? null,
        idioma: data.idioma ?? null,
        estanciaId: data.estanciaId ?? null,
      },
    });
    return withCors(NextResponse.json({ ok: true, id: valoracio.id }, { status: 201 }));
  } catch (err) {
    return withCors(handleApiError(err));
  }
}

export const dynamic = 'force-dynamic';
