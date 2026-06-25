import { z } from 'zod';
import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { created, badRequest, handleApiError, notFound } from '@/lib/http';

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

const Schema = z.object({
  treballadorId: z.string().min(1),
  data: z.coerce.date(),
  sortides: z.coerce.number().int().min(0).default(0),
  manteniments: z.coerce.number().int().min(0).default(0),
  zones: z.boolean().default(false),
});

// POST /api/neteja/pagament — registra el pagament a la dona de neteja d'un dia
// segons les tarifes (sortides × preu + manteniments × preu + zones). Crea una
// jornada amb l'import calculat (va a "Despeses (personal)" del balanç).
export async function POST(req: Request) {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;
    const input = Schema.parse(await req.json().catch(() => null));

    const treballador = await prisma.treballador.findFirst({
      where: { id: input.treballadorId, deletedAt: null },
      select: { id: true, preuSortida: true, preuManteniment: true, preuZones: true },
    });
    if (!treballador) return notFound();

    const pS = treballador.preuSortida ? Number(treballador.preuSortida) : 0;
    const pM = treballador.preuManteniment ? Number(treballador.preuManteniment) : 0;
    const pZ = treballador.preuZones ? Number(treballador.preuZones) : 0;
    const importTotal = round2(
      input.sortides * pS + input.manteniments * pM + (input.zones ? pZ : 0),
    );
    if (importTotal <= 0) {
      return badRequest('Import 0: configura les tarifes a Configuració i marca alguna feina.');
    }

    const parts: string[] = [];
    if (input.sortides) parts.push(`${input.sortides} sortida${input.sortides > 1 ? 'es' : ''}`);
    if (input.manteniments) parts.push(`${input.manteniments} manteniment${input.manteniments > 1 ? 's' : ''}`);
    if (input.zones) parts.push('zones comunes');

    const jornada = await prisma.jornada.create({
      data: {
        treballadorId: input.treballadorId,
        data: input.data,
        hores: 0,
        preuHora: 0,
        import: importTotal,
        notes: `Neteja: ${parts.join(', ')}`,
      },
    });

    await audit({
      usuariId: auth.id,
      accio: 'CREACIO',
      entitat: 'jornada',
      entitatId: jornada.id,
      detall: { neteja: true, import: importTotal, ...input },
      ip: clientIp(req),
    });
    return created({ jornada, import: importTotal });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
