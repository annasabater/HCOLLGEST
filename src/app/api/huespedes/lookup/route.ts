import { prisma } from '@/lib/db';
import { authorize } from '@/lib/auth/guard';
import { badRequest, ok } from '@/lib/http';
import { TipusDocumentEnum } from '@/lib/validation/enums';

// GET /api/huespedes/lookup?tipus=DNI_NIF&doc=12345678Z
// Dedup CRM (§8 Fase 2): si el huésped ya existe, devuelve su ficha + estadísticas.
export async function GET(req: Request) {
  const auth = await authorize();
  if (auth instanceof Response) return auth;

  const url = new URL(req.url);
  const tipus = TipusDocumentEnum.safeParse(url.searchParams.get('tipus') ?? '');
  const doc = url.searchParams.get('doc')?.trim();
  if (!tipus.success || !doc) {
    return badRequest('Cal indicar tipus i doc');
  }

  const huesped = await prisma.huesped.findUnique({
    where: { huesped_document: { tipusDocument: tipus.data, numDocument: doc } },
    include: {
      // Només estades vives (no eliminades) per al recompte de visites.
      estancies: { where: { estancia: { deletedAt: null } }, include: { estancia: true } },
      anotacions: { where: { deletedAt: null }, orderBy: { data: 'desc' } },
    },
  });

  if (!huesped) return ok({ huesped: null });

  const visites = huesped.estancies.length;
  const noAcollir = huesped.anotacions.some((a) => a.noAcollir);

  return ok({
    huesped,
    estadistiques: { visites, noAcollir, anotacions: huesped.anotacions.length },
  });
}

export const dynamic = 'force-dynamic';
