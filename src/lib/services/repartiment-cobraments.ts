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
import { nitsPerMes, ocupaMesDunMes, periodesCoberts, resumNitsPerMes } from '@/lib/repartiment';
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
  /** Repartiment que es farà (només si s'ha demanat la proposta). Null si no se'n pot fer. */
  proposta?: { dataInici: string; dataFi: string; nits: number; import: number }[] | null;
}

/**
 * Pagaments positius d'allotjament SENSE repartir d'estades que ocupen més d'un
 * mes natural. Si l'estada té més d'un pagament (p. ex. un per mes), no és
 * automàtic: repartir cadascun entre tots els mesos seria incorrecte.
 */
export async function pagamentsPerRepartir(
  opts: { ambProposta?: boolean } = {},
): Promise<PagamentPerRepartir[]> {
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
      // Tots es reparteixen sols: els d'estades llargues pagades a trossos, per les
      // nits que cobreix cada pagament (`repartimentAutomaticNou`).
      automatic: true,
      pagamentsEstada: n,
    });
  }

  // Vista prèvia: el mateix repartiment que es desarà (calculadora + nits de cada mes).
  if (opts.ambProposta) {
    for (const p of out) {
      const prop = await proposaPeriodesPerMes(p.estanciaId, p.import);
      p.proposta = prop.ok && prop.periodes.length >= 2
        ? prop.periodes.map((x) => ({ dataInici: x.dataInici, dataFi: x.dataFi, nits: x.nits, import: x.import }))
        : null;
    }
  }
  return out;
}

/**
 * Estada llarga pagada a trossos: quines nits cobreix aquest pagament. Els
 * pagaments d'allotjament de l'estada cobreixen les nits per ordre (data de
 * cobrament); el preu de l'estada és el més gran entre la calculadora i el que
 * s'ha pactat (pagat + pagaments previstos pendents).
 */
async function periodesSeguents(
  cobramentId: string,
  estanciaId: string,
  entrada: string,
  sortida: string,
  importPagament: number,
  calculadoraTotal: number,
) {
  const [cobs, previstos] = await Promise.all([
    prisma.cobrament.findMany({
      where: { estanciaId, concepte: 'ALLOTJAMENT', import: { gt: 0 } },
      orderBy: [{ data: 'asc' }, { createdAt: 'asc' }],
      select: { id: true, import: true },
    }),
    prisma.pagamentPrevist.aggregate({ where: { estanciaId, pagat: false }, _sum: { import: true } }),
  ]);
  const pagatTot = cobs.reduce((a, x) => a + Number(x.import), 0);
  const idx = cobs.findIndex((x) => x.id === cobramentId);
  const pagatAbans = cobs.slice(0, Math.max(idx, 0)).reduce((a, x) => a + Number(x.import), 0);
  const pendent = Number(previstos._sum.import ?? 0);
  const pactat = pagatTot + pendent;
  // Estada ja acabada i res pendent: el preu és el que s'ha pagat (cobreix tota l'estada).
  const acabada = sortida <= new Date().toISOString().slice(0, 10) && pendent === 0;
  const totalEstada = acabada ? pagatTot : Math.max(calculadoraTotal, pactat);
  return periodesCoberts(entrada, sortida, totalEstada, pagatAbans, importPagament);
}

/**
 * En registrar un pagament nou d'allotjament d'una estada que passa d'un mes a
 * l'altre, el reparteix sol (Balanç per dies), sense preguntar. El Balanç de
 * caixa no en depèn. Regles:
 * - estada d'un mes com a molt (≤31 nits), o pagament de tota l'estada: per les
 *   nits de cada mes (segons la calculadora);
 * - estada més llarga pagada a trossos: cada pagament cobreix les nits següents a
 *   les que ja cobrien els anteriors (`periodesCoberts`).
 * Mai fa fallar el registre del pagament: si no pot, el deixa sense repartir.
 */
export async function repartimentAutomaticNou(
  cobramentId: string,
  actor: { id: string } | null,
  ip: string | null,
): Promise<boolean> {
  try {
    const c = await prisma.cobrament.findUnique({
      where: { id: cobramentId },
      select: {
        import: true,
        concepte: true,
        estanciaId: true,
        _count: { select: { periodes: true } },
        estancia: { select: { dataEntrada: true, dataSortida: true } },
      },
    });
    if (!c || c._count.periodes > 0 || c.concepte !== 'ALLOTJAMENT') return false;
    const total = r2(Number(c.import));
    if (total <= 0 || !c.estancia.dataEntrada || !c.estancia.dataSortida) return false;
    const entrada = iso(c.estancia.dataEntrada);
    const sortida = iso(c.estancia.dataSortida);
    if (!ocupaMesDunMes(entrada, sortida)) return false;

    const prop = await proposaPeriodesPerMes(c.estanciaId, total);
    const nits = nitsPerMes(entrada, sortida).reduce((a, m) => a + m.nits, 0);
    const cobreixTot = prop.ok && prop.calculadoraTotal > 0 && total >= prop.calculadoraTotal * 0.95;
    let periodes: { dataInici: string; dataFi: string; import: number }[];
    if (prop.ok && prop.periodes.length >= 2 && (nits <= NITS_MAX_AUTOMATIC || cobreixTot)) {
      periodes = prop.periodes;
    } else {
      // Estada llarga pagada a trossos: aquest pagament cobreix les nits que venen
      // després de les que ja cobrien els anteriors.
      periodes = await periodesSeguents(cobramentId, c.estanciaId, entrada, sortida, total, prop.ok ? prop.calculadoraTotal : 0);
    }
    if (periodes.length === 0) return false;

    await desaRepartiment(
      cobramentId,
      { periodes: periodes.map((x) => ({ dataInici: x.dataInici, dataFi: x.dataFi, import: x.import })) },
      actor,
      ip,
    );
    return true;
  } catch (err) {
    console.error('[repartiment automàtic]', err instanceof Error ? err.message : err);
    return false;
  }
}

/** Reparteix tots els que es poden fer automàticament (estades d'un sol pagament). */
export async function repartirTotsAutomatics(actor: { id: string } | null, ip: string | null) {
  // Tots: els d'estades llargues pagades a trossos també (cada un, les nits que cobreix).
  // Per ordre de cobrament, perquè cada un sàpiga què cobrien els anteriors.
  const llista = (await pagamentsPerRepartir()).sort((a, b) => a.data.localeCompare(b.data));
  let fets = 0;
  const errors: string[] = [];
  for (const p of llista) {
    if (await repartimentAutomaticNou(p.id, actor, ip)) fets++;
    else errors.push(`${p.titular}: no s’ha pogut repartir`);
  }
  return { fets, errors };
}
