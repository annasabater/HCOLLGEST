import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_ADMIN, ROLES_WRITE } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { ok, badRequest, handleApiError } from '@/lib/http';
import { EdicioDadesSchema, TIPUS_EDICIO, type TipusEdicio } from '@/lib/edicions';

// PUT /api/edicions/:tipus/:ref — desa tot el que s'ha escrit en un document
// imprimible i no té camp propi a la BD (veure src/lib/edicions.ts).
export async function PUT(req: Request, ctx: { params: Promise<{ tipus: string; ref: string }> }) {
  try {
    const { tipus, ref } = await ctx.params;
    if (!(TIPUS_EDICIO as readonly string[]).includes(tipus)) return badRequest('Tipus de document no vàlid');
    // El llibre d'IVA només el pot desar l'administració (com /api/llibre-iva).
    const auth = await authorize(tipus === 'trimestre' ? ROLES_ADMIN : ROLES_WRITE);
    if (auth instanceof Response) return auth;
    if (!ref || ref.length > 100) return badRequest('Referència no vàlida');

    const body = await req.json().catch(() => null);
    const dades = EdicioDadesSchema.parse(body);

    const desat = await prisma.edicioDocument.upsert({
      where: { tipus_ref: { tipus, ref } },
      create: { tipus: tipus as TipusEdicio, ref, dades, usuariId: auth.id },
      update: { dades, usuariId: auth.id },
    });

    await audit({
      usuariId: auth.id,
      accio: 'MODIFICACIO',
      entitat: 'edicio_document',
      entitatId: desat.id,
      detall: { tipus, ref, camps: Object.keys(dades.camps).length },
      ip: clientIp(req),
    });
    return ok({ ok: true, updatedAt: desat.updatedAt });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
