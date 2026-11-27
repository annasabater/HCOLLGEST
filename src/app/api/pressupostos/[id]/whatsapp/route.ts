import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { ok, notFound, handleApiError } from '@/lib/http';

type Ctx = { params: Promise<{ id: string }> };

// POST /api/pressupostos/:id/whatsapp — anota que s'ha obert el WhatsApp per enviar
// el pressupost (l'enviament el fa la persona des del WhatsApp; aquí no s'envia res).
export async function POST(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;
    const p = await prisma.pressupost.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
    if (!p) return notFound('Pressupost no trobat');

    const ara = new Date();
    await prisma.pressupost.update({ where: { id }, data: { whatsappEnviatEl: ara } });
    // Sense el telèfon ni el text als logs: només que s'ha enviat.
    await audit({ usuariId: auth.id, accio: 'ENVIAMENT', entitat: 'pressupost', entitatId: id, detall: { canal: 'whatsapp' }, ip: clientIp(req) });
    return ok({ ok: true, whatsappEnviatEl: ara.toISOString() });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
