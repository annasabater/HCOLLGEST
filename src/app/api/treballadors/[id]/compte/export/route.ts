import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { badRequest, handleApiError, notFound } from '@/lib/http';
import { movimentsCompte } from '@/lib/services/compte-treballador';
import { buildCompteXlsx } from '@/lib/exports/compte-treballador-xlsx';

type Ctx = { params: Promise<{ id: string }> };

const RE_DATA = /^\d{4}-\d{2}-\d{2}$/;

/** Nom de fitxer segur: sense accents, espais ni signes. */
function slug(nom: string): string {
  return nom
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

// GET /api/treballadors/:id/compte/export?desde=YYYY-MM-DD&fins=YYYY-MM-DD
// Excel del compte del període (neteja + bugaderia, amb el que està pagat).
export async function GET(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;

    const sp = new URL(req.url).searchParams;
    const desdeParam = sp.get('desde') ?? '';
    const finsParam = sp.get('fins') ?? '';
    if (!RE_DATA.test(desdeParam) || !RE_DATA.test(finsParam)) {
      return badRequest('Cal desde i fins en format YYYY-MM-DD');
    }
    const treballador = await prisma.treballador.findFirst({
      where: { id, deletedAt: null },
      select: { nom: true },
    });
    if (!treballador) return notFound();

    const moviments = await movimentsCompte(id, { desde: desdeParam, fins: finsParam });
    const xlsx = await buildCompteXlsx(treballador.nom, desdeParam, finsParam, moviments);
    const filename = `compte-${slug(treballador.nom) || 'treballador'}-${desdeParam}_${finsParam}.xlsx`;

    await audit({
      usuariId: auth.id,
      accio: 'DESCARREGA',
      entitat: 'treballador',
      entitatId: id,
      detall: { export: 'compte-xlsx', desde: desdeParam, fins: finsParam, linies: moviments.length },
      ip: clientIp(req),
    });

    return new NextResponse(new Uint8Array(xlsx), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
