import { z } from 'zod';
import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { handleApiError, notFound, ok } from '@/lib/http';

type Ctx = { params: Promise<{ id: string }> };

// Confirmación manual del envío (mientras el conector Playwright está pendiente §9.5):
// el recepcionista sube el .txt al portal y registra aquí el resultado/justificante.
const PatchSchema = z.object({
  estat: z.enum(['PENDENT', 'ENVIAT', 'ACCEPTAT', 'REBUTJAT', 'ERROR']),
  justificantPath: z.string().optional(),
  codiValidacio: z.string().optional(),
  numRegistre: z.string().optional(),
  respostaRaw: z.string().optional(),
  errorMsg: z.string().optional(),
  dataEnviament: z.coerce.date().optional(),
});

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;

    const body = await req.json().catch(() => null);
    const data = PatchSchema.parse(body);

    const dataEnviament =
      data.dataEnviament ??
      (data.estat === 'ENVIAT' || data.estat === 'ACCEPTAT' ? new Date() : undefined);

    const enviament = await prisma.enviamentMossos.update({
      where: { id },
      data: { ...data, dataEnviament },
    });

    await audit({
      usuariId: auth.id,
      accio: 'ENVIAMENT',
      entitat: 'enviament_mossos',
      entitatId: id,
      detall: { estat: data.estat },
      ip: clientIp(req),
    });

    return ok({ enviament });
  } catch (err) {
    return handleApiError(err);
  }
}

// DELETE /api/enviaments/:id — elimina un comprovant/justificant de Mossos creat
// per error. NO toca l'estada: aquesta torna a quedar com a pendent de comunicar.
export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;

    const exists = await prisma.enviamentMossos.findUnique({
      where: { id },
      select: { id: true, estanciaId: true, estat: true },
    });
    if (!exists) return notFound();

    await prisma.enviamentMossos.delete({ where: { id } });

    await audit({
      usuariId: auth.id,
      accio: 'ELIMINACIO',
      entitat: 'enviament_mossos',
      entitatId: id,
      detall: { estanciaId: exists.estanciaId, estat: exists.estat },
      ip: clientIp(req),
    });
    return ok({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
