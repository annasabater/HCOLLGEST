/**
 * Càrrega dels ingressos d'un període per a l'informe d'ingressos: cobraments i
 * dipòsits/fiances rebuts, pel dia que entren. L'agrupació és a `lib/informes-ingressos.ts`.
 */
import 'server-only';
import { prisma } from '../db';
import { ocultaDelLlibre } from '../auth/restriccions';
import { nomPropi } from '../nom-propi';
import type { IngresInforme } from '../informes-ingressos';

const estadaSel = {
  observacions: true,
  habitacio: { select: { nom: true } },
  viatgers: { where: { esTitular: true }, take: 1, select: { huesped: { select: { nom: true, cognom1: true } } } },
} as const;

type Estada = {
  observacions: string | null;
  habitacio: { nom: string } | null;
  viatgers: { huesped: { nom: string; cognom1: string } }[];
};
const client = (e: Estada) => {
  const h = e.viatgers[0]?.huesped;
  return h ? nomPropi(`${h.nom} ${h.cognom1}`.replace(/\s+/g, ' ').trim()) : '—';
};

/** Cobraments i dipòsits entre dos dies inclosos. Restringit: sense «Altres», ni estades ocultes, ni fiances. */
export async function ingressosPeriode(desde: string, fins: string, restringit: boolean): Promise<IngresInforme[]> {
  const gte = new Date(`${desde}T00:00:00.000Z`);
  const lt = new Date(`${fins}T00:00:00.000Z`);
  lt.setUTCDate(lt.getUTCDate() + 1);
  const [cobs, dips] = await Promise.all([
    prisma.cobrament.findMany({
      where: { data: { gte, lt }, estancia: { deletedAt: null } },
      select: { import: true, data: true, metode: true, factura: { select: { numero: true } }, estancia: { select: estadaSel } },
    }),
    restringit
      ? Promise.resolve([])
      : prisma.diposit.findMany({
          where: { data: { gte, lt }, estancia: { deletedAt: null } },
          select: { import: true, data: true, metode: true, factura: { select: { numero: true } }, estancia: { select: estadaSel } },
        }),
  ]);
  const out: IngresInforme[] = [];
  for (const [llista, fianca] of [[cobs, false], [dips, true]] as const) {
    for (const c of llista) {
      if (restringit && (c.metode === 'ALTRES' || ocultaDelLlibre(c.estancia.observacions))) continue;
      out.push({
        data: c.data.toISOString().slice(0, 10),
        import: Number(c.import),
        metode: c.metode,
        client: client(c.estancia),
        habitacio: c.estancia.habitacio?.nom ?? null,
        factura: c.factura?.numero ?? null,
        ...(fianca ? { fianca: true } : {}),
      });
    }
  }
  return out;
}
