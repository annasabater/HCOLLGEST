import { authorize } from '@/lib/auth/guard';
import { handleApiError } from '@/lib/http';
import { prisma } from '@/lib/db';
import { proximNumeroFactura, proximNumeroFacturaContracte, proximNumeroFacturaFiscal } from '@/lib/services/factura';
import { NextResponse } from 'next/server';

// GET /api/factures/seguent-numero?estanciaId=&tipus= — següent número suggerit.
// tipus=FACTURA (fiscal) → sèrie contínua NN/YY (01/26…). Si no, basat en el
// número de contracte de l'estada (26004, 26004.1…). Sense res → global de l'any.
export async function GET(req: Request) {
  try {
    const auth = await authorize();
    if (auth instanceof Response) return auth;

    const url = new URL(req.url);
    const estanciaId = url.searchParams.get('estanciaId');
    const tipus = url.searchParams.get('tipus');
    let numero = '';
    if (tipus === 'FACTURA') numero = await proximNumeroFacturaFiscal(prisma, new Date().getFullYear());
    else if (estanciaId) numero = await proximNumeroFacturaContracte(prisma, estanciaId);
    if (!numero) numero = await proximNumeroFactura(prisma, new Date().getFullYear());
    return NextResponse.json({ numero });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
