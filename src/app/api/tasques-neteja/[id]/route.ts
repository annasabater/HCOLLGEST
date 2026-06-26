import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { handleApiError, ok } from '@/lib/http';
import { TascaNetejaUpdateSchema } from '@/lib/validation/neteja';

type Ctx = { params: Promise<{ id: string }> };

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

// Recalcula i fa upsert de la jornada automàtica per (treballadorId, data).
// S'identifica per notes que comença amb "[auto]".
async function syncJornadaAuto(treballadorId: string, data: Date) {
  const treballador = await prisma.treballador.findFirst({
    where: { id: treballadorId, deletedAt: null },
    select: { preuSortida: true, preuManteniment: true, preuZones: true },
  });
  if (!treballador) return;

  const pS = treballador.preuSortida ? Number(treballador.preuSortida) : 0;
  const pM = treballador.preuManteniment ? Number(treballador.preuManteniment) : 0;
  if (pS === 0 && pM === 0) return; // sense tarifes configurades, no fem res

  // Totes les tasques FETA d'aquest treballador en aquest dia
  const dayStart = new Date(data); dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(data); dayEnd.setHours(23, 59, 59, 999);
  const tasques = await prisma.tascaNeteja.findMany({
    where: {
      assignadaA: treballadorId,
      estat: 'FETA',
      data: { gte: dayStart, lte: dayEnd },
    },
    select: { tipus: true },
  });

  const sortides = tasques.filter((t) => t.tipus === 'CANVI_COMPLET').length;
  const manteniments = tasques.filter((t) => t.tipus === 'REPAS').length;
  const importTotal = round2(sortides * pS + manteniments * pM);

  const parts: string[] = [];
  if (sortides) parts.push(`${sortides} sortida${sortides > 1 ? 'es' : ''}`);
  if (manteniments) parts.push(`${manteniments} manteniment${manteniments > 1 ? 's' : ''}`);
  const notes = `[auto] Neteja: ${parts.join(', ') || 'cap tasca'}`;

  // Busca jornada auto existent per aquest treballador i dia
  const existing = await prisma.jornada.findFirst({
    where: {
      treballadorId,
      data: { gte: dayStart, lte: dayEnd },
      notes: { startsWith: '[auto]' },
    },
  });

  if (importTotal > 0) {
    if (existing) {
      await prisma.jornada.update({
        where: { id: existing.id },
        data: { import: importTotal, notes },
      });
    } else {
      await prisma.jornada.create({
        data: {
          treballadorId,
          data,
          hores: 0,
          preuHora: 0,
          import: importTotal,
          notes,
        },
      });
    }
  } else if (existing) {
    // Totes les tasques desmarcades → eliminar la jornada auto (si no pagada)
    if (!existing.pagada) {
      await prisma.jornada.delete({ where: { id: existing.id } });
    }
  }
}

// PATCH /api/tasques-neteja/:id — marcar FETA, reasignar, cambiar tipo/fecha…
export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;

    const body = await req.json().catch(() => null);
    const data = TascaNetejaUpdateSchema.parse(body);

    const tasca = await prisma.tascaNeteja.update({
      where: { id },
      data,
      include: { habitacio: true, treballador: true },
    });

    // Sincronitza la jornada automàtica quan canvia l'estat o s'assigna un treballador
    const treballadorId = tasca.assignadaA;
    if (treballadorId && (data.estat !== undefined || data.assignadaA !== undefined)) {
      await syncJornadaAuto(treballadorId, tasca.data);
    }

    await audit({
      usuariId: auth.id,
      accio: 'MODIFICACIO',
      entitat: 'tasca_neteja',
      entitatId: id,
      detall: { camps: Object.keys(data) },
      ip: clientIp(req),
    });
    return ok({ tasca });
  } catch (err) {
    return handleApiError(err);
  }
}

// DELETE /api/tasques-neteja/:id — elimina una tasca de neteja.
export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;

    const tasca = await prisma.tascaNeteja.findUnique({ where: { id } });
    await prisma.tascaNeteja.delete({ where: { id } });

    // Recalcula la jornada auto si la tasca tenia treballador
    if (tasca?.assignadaA) {
      await syncJornadaAuto(tasca.assignadaA, tasca.data);
    }

    await audit({
      usuariId: auth.id,
      accio: 'ELIMINACIO',
      entitat: 'tasca_neteja',
      entitatId: id,
      ip: clientIp(req),
    });
    return ok({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
