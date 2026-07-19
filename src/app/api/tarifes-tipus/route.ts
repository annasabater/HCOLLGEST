import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { ok, handleApiError } from '@/lib/http';
import { TarifaTipusBulkSchema } from '@/lib/validation/tarifa-tipus';

const num = (d: unknown) => (d == null ? null : Number(d));

function serialitza(r: {
  id: string; grup: string; etiqueta: string; ordre: number; mesos: number[];
  preuDia: unknown; preuDia4: unknown; preuSetmana: unknown; preuDosSetmanes: unknown; preuMes: unknown;
  reserva: unknown; nota: string | null; actiu: boolean;
}) {
  return {
    id: r.id, grup: r.grup, etiqueta: r.etiqueta, ordre: r.ordre, mesos: r.mesos,
    preuDia: num(r.preuDia), preuDia4: num(r.preuDia4), preuSetmana: num(r.preuSetmana),
    preuDosSetmanes: num(r.preuDosSetmanes), preuMes: num(r.preuMes), reserva: num(r.reserva),
    nota: r.nota, actiu: r.actiu,
  };
}

// GET /api/tarifes-tipus — matriu de tarifes per tipus + temporada (ADMIN).
export async function GET() {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;
    const files = await prisma.tarifaTipus.findMany({ orderBy: [{ grup: 'asc' }, { ordre: 'asc' }] });
    return ok({ files: files.map(serialitza) });
  } catch (err) {
    return handleApiError(err);
  }
}

// PUT /api/tarifes-tipus — desa TOTA la matriu en bloc: crea/actualitza les files
// del payload i esborra les que ja no hi són (columnes eliminades a la web).
export async function PUT(req: Request) {
  try {
    const auth = await authorize(ROLES_ADMIN);
    if (auth instanceof Response) return auth;
    const body = await req.json().catch(() => null);
    const { files } = TarifaTipusBulkSchema.parse(body);

    const saved = await prisma.$transaction(async (tx) => {
      const conservats: string[] = [];
      for (const f of files) {
        const data = {
          grup: f.grup, etiqueta: f.etiqueta, ordre: f.ordre, mesos: f.mesos,
          preuDia: f.preuDia, preuDia4: f.preuDia4, preuSetmana: f.preuSetmana,
          preuDosSetmanes: f.preuDosSetmanes, preuMes: f.preuMes, reserva: f.reserva,
          nota: f.nota ?? null, actiu: f.actiu ?? true,
        };
        if (f.id) {
          const r = await tx.tarifaTipus.update({ where: { id: f.id }, data });
          conservats.push(r.id);
        } else {
          const r = await tx.tarifaTipus.create({ data });
          conservats.push(r.id);
        }
      }
      // Esborra les files que ja no són al payload.
      await tx.tarifaTipus.deleteMany({ where: { id: { notIn: conservats.length ? conservats : ['__cap__'] } } });
      return tx.tarifaTipus.findMany({ orderBy: [{ grup: 'asc' }, { ordre: 'asc' }] });
    });

    await audit({ usuariId: auth.id, accio: 'MODIFICACIO', entitat: 'tarifa_tipus', detall: { files: files.length }, ip: clientIp(req) });
    return ok({ files: saved.map(serialitza) });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
