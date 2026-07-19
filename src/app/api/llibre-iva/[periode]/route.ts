import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { ok, badRequest, handleApiError } from '@/lib/http';
import { LlibreIvaSaveSchema } from '@/lib/validation/llibre-iva';

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

// POST /api/llibre-iva/:periode — desa (crea/actualitza) el llibre d'IVA del
// trimestre. periode = "aaaa-T" (p. ex. 2026-3).
export async function POST(req: Request, ctx: { params: Promise<{ periode: string }> }) {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;
    const { periode } = await ctx.params;
    const m = periode.match(/^(\d{4})-([1-4])$/);
    if (!m) return badRequest('Període no vàlid (aaaa-T)');
    const any = Number(m[1]);
    const trimestre = Number(m[2]);

    const body = await req.json().catch(() => null);
    const input = LlibreIvaSaveSchema.parse(body);

    const totalBase = round2(input.files.reduce((a, f) => a + f.base, 0));
    const totalIva = round2(input.files.reduce((a, f) => a + f.iva, 0));
    const totalTotal = round2(input.files.reduce((a, f) => a + f.total, 0));

    const data = {
      any, trimestre, etiqueta: input.etiqueta, files: input.files,
      totalBase, totalIva, totalTotal, usuariId: auth.id,
    };
    const desat = await prisma.llibreIvaTrimestre.upsert({
      where: { periode },
      create: { periode, ...data },
      update: data,
    });

    await audit({ usuariId: auth.id, accio: 'MODIFICACIO', entitat: 'llibre_iva', entitatId: desat.id, detall: { periode, files: input.files.length }, ip: clientIp(req) });
    return ok({ ok: true, periode, updatedAt: desat.updatedAt });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
