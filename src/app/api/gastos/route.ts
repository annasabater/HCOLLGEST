import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { created, handleApiError, ok } from '@/lib/http';
import { GastoCreateSchema } from '@/lib/validation/gasto';

// GET /api/gastos?desde=&fins=&categoriaId=
export async function GET(req: Request) {
  const auth = await authorize();
  if (auth instanceof Response) return auth;

  const url = new URL(req.url);
  const desde = url.searchParams.get('desde');
  const fins = url.searchParams.get('fins');
  const categoriaId = url.searchParams.get('categoriaId');
  // Vista "Variables": exclou les despeses generades per un servei recurrent
  // (aquestes es gestionen a la pestanya "Fixes").
  const nomesVariables = url.searchParams.get('variables') === '1';

  const where: Prisma.GastoWhereInput = { deletedAt: null };
  if (desde || fins) {
    where.data = {};
    if (desde) where.data.gte = new Date(desde);
    if (fins) where.data.lte = new Date(fins);
  }
  if (categoriaId) where.categoriaId = categoriaId;
  if (nomesVariables) where.serveiRecurrentId = null;

  const gastos = await prisma.gasto.findMany({
    where,
    orderBy: { data: 'desc' },
    take: 300,
    include: { categoria: true, proveidor: true, habitacio: true, animal: true },
  });

  // El total i el desglossament per categoria NOMÉS compten les despeses reals
  // (les fiances/dipòsits no són despesa). La llista, però, les inclou (amb badge).
  const reals = gastos.filter((g) => !g.esFianca);
  const total = reals.reduce((a, g) => a + Number(g.import), 0);
  const perCategoria: Record<string, number> = {};
  for (const g of reals) {
    perCategoria[g.categoria.nom] = (perCategoria[g.categoria.nom] ?? 0) + Number(g.import);
  }

  return ok({ gastos, total, perCategoria });
}

// POST /api/gastos
export async function POST(req: Request) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const body = await req.json().catch(() => null);
    const data = GastoCreateSchema.parse(body);

    // Si no s'ha triat proveïdor però l'escàner n'ha detectat un (nom/NIF), el
    // busquem (per CIF, o pel nom) o el creem, així la despesa surt amb NIF i
    // proveïdor al llibre del trimestre.
    let proveidorId = data.proveidorId ?? null;
    if (!proveidorId && (data.proveidorNom || data.proveidorNif)) {
      const nif = data.proveidorNif?.toUpperCase().replace(/\s+/g, '');
      const nom = data.proveidorNom?.trim();
      const existent = await prisma.proveidor.findFirst({
        where: {
          deletedAt: null,
          OR: [
            ...(nif ? [{ cif: { equals: nif, mode: 'insensitive' as const } }] : []),
            ...(nom ? [{ nom: { equals: nom, mode: 'insensitive' as const } }] : []),
          ],
        },
      });
      if (existent) {
        proveidorId = existent.id;
      } else if (nom) {
        const nou = await prisma.proveidor.create({
          data: {
            nom,
            cif: nif ?? null,
            activitat: data.proveidorActivitat ?? null,
            telefon: data.proveidorTelefon ?? null,
            email: data.proveidorEmail ?? null,
            adreca: data.proveidorAdreca ?? null,
            web: data.proveidorWeb ?? null,
          },
        });
        proveidorId = nou.id;
      }
    }

    const gasto = await prisma.gasto.create({
      data: {
        data: data.data,
        import: data.import,
        categoriaId: data.categoriaId,
        proveidorId,
        habitacioId: data.habitacioId ?? null,
        animalId: data.animalId ?? null,
        descripcio: data.descripcio,
        numFactura: data.numFactura ?? null,
        baseImposable: data.baseImposable ?? null,
        ivaPercent: data.ivaPercent ?? null,
        irpfPercent: data.irpfPercent ?? null,
        metodePagament: data.metodePagament,
        adjuntPath: data.adjuntPath ?? null,
        esFianca: data.esFianca ?? false,
      },
    });

    await audit({
      usuariId: auth.id,
      accio: 'CREACIO',
      entitat: 'gasto',
      entitatId: gasto.id,
      detall: { import: data.import, categoriaId: data.categoriaId },
      ip: clientIp(req),
    });
    return created({ gasto });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
