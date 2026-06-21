import { z } from 'zod';
import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { badRequest, created, handleApiError } from '@/lib/http';

type Ctx = { params: Promise<{ id: string; vid: string }> };

// Captura de firma posterior (§ Bloque E): el viajero firma después del alta.
const FirmaSchema = z.object({
  imatge: z.string().min(1, 'Cal la imatge de la firma'), // data URL base64
  llocSignatura: z.string().optional(),
  data: z.coerce.date().optional(),
  hora: z.string().optional(),
});

export async function POST(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { vid } = await ctx.params;

    const body = await req.json().catch(() => null);
    const data = FirmaSchema.parse(body);

    const viatger = await prisma.estanciaViatger.findUnique({ where: { id: vid } });
    if (!viatger) return badRequest('Viatger no trobat');

    const now = new Date();
    const signatura = await prisma.signatura.upsert({
      where: { estanciaViatgerId: vid },
      create: {
        estanciaViatgerId: vid,
        imatge: data.imatge,
        llocSignatura: data.llocSignatura ?? null,
        data: data.data ?? now,
        hora: data.hora ?? now.toTimeString().slice(0, 5),
        usuariId: auth.id,
      },
      update: {
        imatge: data.imatge,
        llocSignatura: data.llocSignatura ?? null,
        data: data.data ?? now,
        hora: data.hora ?? now.toTimeString().slice(0, 5),
        usuariId: auth.id,
      },
    });

    await audit({
      usuariId: auth.id,
      accio: 'FIRMA',
      entitat: 'signatura',
      entitatId: signatura.id,
      detall: { estanciaViatgerId: vid },
      ip: clientIp(req),
    });

    return created({ signatura: { id: signatura.id, data: signatura.data, hora: signatura.hora } });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
