import { authorize } from '@/lib/auth/guard';
import { handleApiError } from '@/lib/http';
import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';

// GET /api/factures/seguent-numero — retorna el següent número de factura suggerit
export async function GET() {
  try {
    const auth = await authorize();
    if (auth instanceof Response) return auth;

    const year = new Date().getFullYear();
    const count = await prisma.factura.count({ where: { numero: { startsWith: `${year}-` } } });
    const numero = `${year}-${String(count + 1).padStart(4, '0')}`;

    return NextResponse.json({ numero });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
