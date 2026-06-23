import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { created, handleApiError, notFound } from '@/lib/http';
import { DipositCreateSchema } from '@/lib/validation/factura';

type Ctx = { params: Promise<{ id: string }> };

// POST /api/estancies/:id/diposits — registra un dipòsit/fiança (en custòdia)
export async function POST(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;

    const est = await prisma.estancia.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
    if (!est) return notFound();

    const body = await req.json().catch(() => null);
    const data = DipositCreateSchema.parse(body);

    // INGRES (p. ex. finança mascota): es crea RETINGUT → ja compta com a ingrés
    // (amb data de resolució), però es pot tornar després. CUSTODIA: fiança normal.
    const esIngres = data.destinacio === 'INGRES';
    const diposit = await prisma.diposit.create({
      data: {
        estanciaId: id,
        import: data.import,
        data: data.data ?? new Date(),
        metode: data.metode,
        notes: data.notes ?? null,
        estat: esIngres ? 'RETINGUT' : 'EN_CUSTODIA',
        dataResolucio: esIngres ? (data.data ?? new Date()) : null,
      },
    });
    await audit({
      usuariId: auth.id,
      accio: 'CREACIO',
      entitat: 'diposit',
      entitatId: diposit.id,
      detall: { estanciaId: id, import: data.import },
      ip: clientIp(req),
    });
    return created({ diposit });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
