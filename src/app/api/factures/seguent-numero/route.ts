import { authorize } from '@/lib/auth/guard';
import { handleApiError } from '@/lib/http';
import { prisma } from '@/lib/db';
import { proximNumeroFactura } from '@/lib/services/factura';
import { NextResponse } from 'next/server';

// GET /api/factures/seguent-numero — retorna el següent número de factura suggerit
export async function GET() {
  try {
    const auth = await authorize();
    if (auth instanceof Response) return auth;

    const numero = await proximNumeroFactura(prisma, new Date().getFullYear());
    return NextResponse.json({ numero });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
