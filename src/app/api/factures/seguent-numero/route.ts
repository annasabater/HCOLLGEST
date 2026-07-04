import { authorize } from '@/lib/auth/guard';
import { handleApiError } from '@/lib/http';
import { prisma } from '@/lib/db';
import { proximNumeroFactura, proximNumeroFacturaContracte } from '@/lib/services/factura';
import { NextResponse } from 'next/server';

// GET /api/factures/seguent-numero?estanciaId= — següent número suggerit.
// Amb estanciaId → basat en el número de contracte (26004, 26004.1…); sense, el
// global de l'any.
export async function GET(req: Request) {
  try {
    const auth = await authorize();
    if (auth instanceof Response) return auth;

    const estanciaId = new URL(req.url).searchParams.get('estanciaId');
    let numero = '';
    if (estanciaId) numero = await proximNumeroFacturaContracte(prisma, estanciaId);
    if (!numero) numero = await proximNumeroFactura(prisma, new Date().getFullYear());
    return NextResponse.json({ numero });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
