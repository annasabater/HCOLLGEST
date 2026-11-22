import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { created, handleApiError, ok, readJson } from '@/lib/http';
import { ConsultaDespesesSchema, FiltreDespesaSchema } from '@/lib/validation/consulta-despeses';

// GET /api/gastos/consultes — consultes desades de la llista de despeses.
export async function GET() {
  try {
    const auth = await authorize();
    if (auth instanceof Response) return auth;
    const rows = await prisma.consultaDespeses.findMany({ orderBy: { createdAt: 'asc' } });
    // Una consulta amb filtres que ja no s'entenen es mostra sense aquells filtres.
    const consultes = rows.map((r) => ({
      id: r.id,
      nom: r.nom,
      comparacio: r.comparacio,
      filtres: (Array.isArray(r.filtres) ? r.filtres : []).flatMap((f) => {
        const p = FiltreDespesaSchema.safeParse(f);
        return p.success ? [p.data] : [];
      }),
    }));
    return ok({ consultes });
  } catch (err) {
    return handleApiError(err);
  }
}

// POST /api/gastos/consultes — desa el que s'està mirant.
export async function POST(req: Request) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const d = ConsultaDespesesSchema.parse(await readJson(req));
    const c = await prisma.consultaDespeses.create({ data: { nom: d.nom, filtres: d.filtres, comparacio: d.comparacio } });
    await audit({ usuariId: auth.id, accio: 'CREACIO', entitat: 'consulta_despeses', entitatId: c.id, detall: { nom: c.nom }, ip: clientIp(req) });
    return created({ consulta: { id: c.id, nom: c.nom, comparacio: c.comparacio, filtres: d.filtres } });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
