import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_ADMIN } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { ok, handleApiError } from '@/lib/http';
import { TarifaTipusBulkSchema, DIES_EDICIO } from '@/lib/validation/tarifa-tipus';

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

/** Instantània d'una versió: les files sense id (els ids canvien en esborrar/crear). */
function instantania(rows: Parameters<typeof serialitza>[0][]) {
  return rows.map((r) => {
    const { id: _id, ...resta } = serialitza(r);
    return resta;
  });
}

/** JSON amb les claus ordenades (el JSONB de Postgres no conserva l'ordre). */
function estable(v: unknown): string {
  return JSON.stringify(v, (_k, x) =>
    x && typeof x === 'object' && !Array.isArray(x)
      ? Object.fromEntries(Object.entries(x as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)))
      : x,
  );
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
      // Primer desat amb historial: guarda també els preus d'abans, perquè no es perdin.
      if ((await tx.tarifaTipusVersio.count()) === 0) {
        const abans = await tx.tarifaTipus.findMany({ orderBy: [{ grup: 'asc' }, { ordre: 'asc' }] });
        if (abans.length > 0) {
          const desDe = new Date(Math.max(...abans.map((r) => r.updatedAt.getTime())));
          await tx.tarifaTipusVersio.create({ data: { files: instantania(abans), createdAt: desDe } });
        }
      }

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
      const ara = await tx.tarifaTipus.findMany({ orderBy: [{ grup: 'asc' }, { ordre: 'asc' }] });

      // Els desats dels DIES_EDICIO primers dies d'una versió (feta des d'aquí, no la
      // inicial) s'hi acumulen: editar els preus durant uns dies és una sola versió.
      // Passat aquest termini, el següent canvi en comença una de nova.
      const [ultima, previa] = await tx.tarifaTipusVersio.findMany({ orderBy: { createdAt: 'desc' }, take: 2 });
      const versio = instantania(ara);
      const oberta = !!ultima?.usuariId && Date.now() - ultima.createdAt.getTime() < DIES_EDICIO * 86_400_000;
      if (oberta) {
        // Si s'ha desfet tot el canvi (torna a ser com la versió d'abans), la versió sobra.
        if (previa && estable(previa.files) === estable(versio)) await tx.tarifaTipusVersio.delete({ where: { id: ultima!.id } });
        else await tx.tarifaTipusVersio.update({ where: { id: ultima!.id }, data: { files: versio, usuariId: auth.id, editadaEl: new Date() } });
      } else if (!ultima || estable(ultima.files) !== estable(versio)) {
        await tx.tarifaTipusVersio.create({ data: { files: versio, usuariId: auth.id } });
      }
      return ara;
    });

    await audit({ usuariId: auth.id, accio: 'MODIFICACIO', entitat: 'tarifa_tipus', detall: { files: files.length }, ip: clientIp(req) });
    return ok({ files: saved.map(serialitza) });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
