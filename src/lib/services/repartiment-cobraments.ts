/**
 * Repartir per mesos un pagament JA FET (també si ja és en una factura), perquè
 * el Balanç compti cada part en el seu mes en lloc de tot el dia que es va cobrar.
 * Fa el mateix que el repartiment en crear el pagament (`CobramentPeriode`).
 *
 * ⚠ La factura no canvia (número, data, import, Veri*Factu): només la comptabilitat
 * de gestió (Balanç, tauler). El llibre d'IVA va per la data de la factura.
 */
import 'server-only';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { audit } from '@/lib/audit';
import { PeriodeInputSchema } from '@/lib/validation/factura';
import { nitsPerMes, ocupaMesDunMes, resumNitsPerMes } from '@/lib/repartiment';
import { proposaPeriodesPerMes, type PropostaPeriodes } from './calcul-preu';

const iso = (d: Date) => d.toISOString().slice(0, 10);
/** Estada d'"un mes" (fins a 31 nits): els seus pagaments es poden repartir sols. */
const NITS_MAX_AUTOMATIC = 31;
const r2 = (n: number) => Math.round(n * 100) / 100;

export const RepartimentSchema = z.object({ periodes: z.array(PeriodeInputSchema).max(36) });

/**
 * Desa (o treu, amb `[]`) el repartiment d'un pagament. La suma ha de ser
 * exactament l'import del pagament.
 */
export async function desaRepartiment(
  cobramentId: string,
  raw: unknown,
  actor: { id: string } | null,
  ip: string | null,
) {
  const { periodes } = RepartimentSchema.parse(raw);
  return prisma.$transaction(async (tx) => {
    const c = await tx.cobrament.findUnique({ where: { id: cobramentId } });
    if (!c) throw new Error('Validación fallida: pagament no trobat');
    const total = r2(Number(c.import));
    if (total <= 0) throw new Error('Validación fallida: només es poden repartir pagaments positius');
    if (periodes.length > 0) {
      const suma = r2(periodes.reduce((a, p) => a + p.import, 0));
      if (Math.abs(suma - total) > 0.01) {
        throw new Error(
          `Validación fallida: la suma dels períodes (${suma.toFixed(2)} €) no és l'import del pagament (${total.toFixed(2)} €)`,
        );
      }
      if (periodes.some((p) => p.import < 0)) throw new Error('Validación fallida: cap període pot ser negatiu');
    }

    await tx.cobramentPeriode.deleteMany({ where: { cobramentId } });
    if (periodes.length > 0) {
      await tx.cobramentPeriode.createMany({
        data: periodes.map((p) => ({ cobramentId, dataInici: p.dataInici, dataFi: p.dataFi, import: r2(p.import) })),
      });
    }
    await audit(
      {
        usuariId: actor?.id ?? null,
        accio: 'MODIFICACIO',
        entitat: 'cobrament',
        entitatId: cobramentId,
        detall: {
          repartiment: periodes.map((p) => ({ desde: iso(p.dataInici), fins: iso(p.dataFi), import: r2(p.import) })),
        },
        ip,
      },
      tx,
    );
    return { ok: true, periodes: periodes.length };
  });
}

/** Proposta automàtica per a un pagament (segons la calculadora i les nits de cada mes). */
export async function proposaRepartiment(cobramentId: string): Promise<PropostaPeriodes> {
  const c = await prisma.cobrament.findUniqueOrThrow({ where: { id: cobramentId }, select: { estanciaId: true, import: true } });
  return proposaPeriodesPerMes(c.estanciaId, Number(c.import));
}

export interface PagamentPerRepartir {
  id: string;
  estanciaId: string;
  titular: string;
  contracte: string | null;
  entrada: string;
  sortida: string;
  nitsPerMes: string;
  data: string;
  import: number;
  facturaNumero: string | null;
  /** Es pot repartir automàticament amb seguretat (un sol pagament o estada d'un mes). */
  automatic: boolean;
  pagamentsEstada: number;
}

/**
 * Pagaments positius d'allotjament SENSE repartir d'estades que ocupen més d'un
 * mes natural. Si l'estada té més d'un pagament (p. ex. un per mes), no és
 * automàtic: repartir cadascun entre tots els mesos seria incorrecte.
 */
export async function pagamentsPerRepartir(): Promise<PagamentPerRepartir[]> {
  const cobs = await prisma.cobrament.findMany({
    where: {
      import: { gt: 0 },
      concepte: 'ALLOTJAMENT',
      estancia: { deletedAt: null, dataEntrada: { not: null }, dataSortida: { not: null } },
    },
    orderBy: { data: 'desc' },
    select: {
      id: true,
      import: true,
      data: true,
      estanciaId: true,
      factura: { select: { numero: true } },
      _count: { select: { periodes: true } },
      estancia: {
        select: {
          dataEntrada: true,
          dataSortida: true,
          numContracte: true,
          viatgers: { where: { esTitular: true }, take: 1, select: { huesped: { select: { nom: true, cognom1: true } } } },
        },
      },
    },
  });

  // Pagaments d'allotjament per estada (per saber si n'hi ha més d'un).
  const perEstada = new Map<string, number>();
  for (const c of cobs) perEstada.set(c.estanciaId, (perEstada.get(c.estanciaId) ?? 0) + 1);

  const out: PagamentPerRepartir[] = [];
  for (const c of cobs) {
    const e = c.estancia;
    if (c._count.periodes > 0 || !e.dataEntrada || !e.dataSortida) continue;
    const entrada = iso(e.dataEntrada);
    const sortida = iso(e.dataSortida);
    if (!ocupaMesDunMes(entrada, sortida)) continue;
    const h = e.viatgers[0]?.huesped;
    const n = perEstada.get(c.estanciaId) ?? 1;
    const nits = nitsPerMes(entrada, sortida).reduce((a, m) => a + m.nits, 0);
    out.push({
      id: c.id,
      estanciaId: c.estanciaId,
      titular: h ? `${h.nom} ${h.cognom1}`.trim() : 'Sense titular',
      contracte: e.numContracte || null,
      entrada,
      sortida,
      nitsPerMes: resumNitsPerMes(entrada, sortida),
      data: iso(c.data),
      import: r2(Number(c.import)),
      facturaNumero: c.factura?.numero ?? null,
      // Un sol pagament, o una estada d'un mes com a molt (cada pròrroga és una estada
      // nova): els pagaments són parts de la mateixa mensualitat i repartir-los per
      // nits és correcte. Estada llarga + diversos pagaments → cadascun pot ser d'un
      // mes diferent: a mà.
      automatic: n === 1 || nits <= NITS_MAX_AUTOMATIC,
      pagamentsEstada: n,
    });
  }
  return out;
}

/** Reparteix tots els que es poden fer automàticament (estades d'un sol pagament). */
export async function repartirTotsAutomatics(actor: { id: string } | null, ip: string | null) {
  const llista = (await pagamentsPerRepartir()).filter((p) => p.automatic);
  let fets = 0;
  const errors: string[] = [];
  for (const p of llista) {
    const prop = await proposaPeriodesPerMes(p.estanciaId, p.import);
    if (!prop.ok || prop.periodes.length < 2) {
      errors.push(`${p.titular}: ${prop.error ?? 'no s’ha pogut proposar'}`);
      continue;
    }
    await desaRepartiment(
      p.id,
      { periodes: prop.periodes.map((x) => ({ dataInici: x.dataInici, dataFi: x.dataFi, import: x.import })) },
      actor,
      ip,
    );
    fets++;
  }
  return { fets, errors };
}
