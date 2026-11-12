/**
 * Registre de Deure i Haver de la caixa i del banc (/balanc/deure-haver).
 *
 * Fonts (el dia que es mouen els diners, sense repartir per mesos):
 *   - Cobraments de les estades → Deure (negatiu = devolució → Haver)
 *   - Dipòsits/fiances rebuts → Deure; la part tornada → Haver el dia que es torna
 *   - Despeses (també les fiances pagades: els diners surten igualment) → Haver
 *   - Moviments entrats a mà: saldo inicial, traspassos, altres entrades/sortides
 * La forma de pagament decideix el compte (`compteDeMetode`); «Altres» no hi entra
 * i es compta a part perquè es vegi. Les nòmines i pagaments al personal no
 * porten forma de pagament: s'entren a mà si cal.
 */
import 'server-only';
import { prisma } from '../db';
import { audit } from '../audit';
import { MovimentTresoreriaSchema } from '../validation/tresoreria';
import {
  altreCompte,
  calculaRegistre,
  compteDeMetode,
  costats,
  NOM_COMPTE,
  round2,
  type CompteTresoreria,
  type MovimentCompte,
  type RegistreCompte,
  type SaldoInicial,
} from '../tresoreria';

type Actor = { id: string } | null;

const aDia = (d: Date) => d.toISOString().slice(0, 10);
const aData = (dia: string) => new Date(`${dia}T00:00:00.000Z`);
const diaSeguent = (dia: string) => {
  const d = aData(dia);
  d.setUTCDate(d.getUTCDate() + 1);
  return d;
};

export interface RegistreTresoreria {
  desde: string;
  fins: string;
  comptes: RegistreCompte[];
  /** Moviments del període amb forma de pagament «Altres»: no se sap on van. */
  senseCompte: { n: number; import: number };
}

function nomTitular(e: { viatgers: { huesped: { nom: string; cognom1: string | null } | null }[]; habitacio: { nom: string } | null }) {
  const h = e.viatgers[0]?.huesped;
  const nom = h ? `${h.nom} ${h.cognom1 ?? ''}`.trim() : 'Estada';
  return e.habitacio ? `${nom} · hab. ${e.habitacio.nom}` : nom;
}

const estadaSel = {
  select: {
    id: true,
    habitacio: { select: { nom: true } },
    viatgers: {
      where: { esTitular: true },
      take: 1,
      select: { huesped: { select: { nom: true, cognom1: true } } },
    },
  },
} as const;

/** Tots els moviments de diners entre dos dies (inclosos), ja assignats a un compte. */
async function moviments(desde: string, fins: string) {
  const gte = aData(desde);
  const lt = diaSeguent(fins);
  const [cobraments, diposits, tornats, gastos, manuals] = await Promise.all([
    prisma.cobrament.findMany({
      where: {
        estancia: { deletedAt: null },
        OR: [{ facturaId: null }, { factura: { deletedAt: null } }],
        data: { gte, lt },
      },
      select: { id: true, data: true, import: true, metode: true, descripcio: true, factura: { select: { numero: true } }, estancia: estadaSel },
    }),
    prisma.diposit.findMany({
      where: { estancia: { deletedAt: null }, data: { gte, lt } },
      select: { id: true, data: true, import: true, metode: true, esDiposit: true, estancia: estadaSel },
    }),
    prisma.diposit.findMany({
      where: { estancia: { deletedAt: null }, estat: { in: ['TORNAT', 'RETINGUT'] }, dataResolucio: { gte, lt } },
      select: { id: true, dataResolucio: true, import: true, importRetingut: true, estat: true, metode: true, metodeResolucio: true, esDiposit: true, estancia: estadaSel },
    }),
    prisma.gasto.findMany({
      where: { deletedAt: null, data: { gte, lt } },
      select: { id: true, data: true, import: true, metodePagament: true, descripcio: true, numFactura: true, esFianca: true, proveidor: { select: { nom: true } } },
    }),
    prisma.movimentTresoreria.findMany({ where: { deletedAt: null, data: { lte: aData(fins) } }, orderBy: { data: 'asc' } }),
  ]);

  const movs: MovimentCompte[] = [];
  const senseCompte = { n: 0, import: 0 };
  const afegeix = (metode: string, dia: string, entrada: number, m: Omit<MovimentCompte, 'compte' | 'dia' | 'deure' | 'haver'>) => {
    if (round2(entrada) === 0) return;
    const compte = compteDeMetode(metode);
    if (!compte) {
      if (dia >= desde) {
        senseCompte.n += 1;
        senseCompte.import = round2(senseCompte.import + Math.abs(entrada));
      }
      return;
    }
    movs.push({ compte, dia, ...costats(entrada), ...m });
  };

  for (const c of cobraments) {
    afegeix(c.metode, aDia(c.data), Number(c.import), {
      concepte: `Pagament · ${nomTitular(c.estancia)}`,
      referencia: c.factura?.numero ?? c.descripcio ?? null,
      origen: 'COBRAMENT', id: c.id, href: `/estancies/${c.estancia.id}`,
    });
  }
  for (const d of diposits) {
    afegeix(d.metode, aDia(d.data), Number(d.import), {
      concepte: `${d.esDiposit ? 'Dipòsit' : 'Fiança'} rebut · ${nomTitular(d.estancia)}`,
      referencia: null, origen: 'DIPOSIT', id: d.id, href: `/estancies/${d.estancia.id}`,
    });
  }
  for (const d of tornats) {
    const tornat = d.estat === 'TORNAT' ? Number(d.import) : Number(d.import) - Number(d.importRetingut ?? d.import);
    if (!d.dataResolucio) continue;
    afegeix(d.metodeResolucio ?? d.metode, aDia(d.dataResolucio), -tornat, {
      concepte: `${d.esDiposit ? 'Dipòsit' : 'Fiança'} tornat · ${nomTitular(d.estancia)}`,
      referencia: null, origen: 'DEVOLUCIO_DIPOSIT', id: `${d.id}-tornat`, href: `/estancies/${d.estancia.id}`,
    });
  }
  for (const g of gastos) {
    const qui = g.proveidor?.nom ? `${g.proveidor.nom} · ` : '';
    afegeix(g.metodePagament, aDia(g.data), -Number(g.import), {
      concepte: `${qui}${g.descripcio}${g.esFianca ? ' (fiança)' : ''}`,
      referencia: g.numFactura ?? null, origen: 'GASTO', id: g.id, href: '/gastos',
    });
  }

  const saldos: SaldoInicial[] = [];
  for (const m of manuals) {
    const dia = aDia(m.data);
    const compte = m.compte as CompteTresoreria;
    const imp = Number(m.import);
    const base = { referencia: m.referencia, origen: 'MANUAL' as const, id: m.id, href: null };
    if (m.tipus === 'SALDO_INICIAL') {
      saldos.push({ id: m.id, compte, dia, import: imp });
    } else if (m.tipus === 'TRASPAS') {
      const desti = altreCompte(compte);
      const nota = m.concepte ? ` · ${m.concepte}` : '';
      movs.push({ compte, dia, deure: 0, haver: imp, concepte: `Traspàs a ${NOM_COMPTE[desti].toLowerCase()}${nota}`, ...base });
      movs.push({ compte: desti, dia, deure: imp, haver: 0, concepte: `Traspàs de ${NOM_COMPTE[compte].toLowerCase()}${nota}`, ...base });
    } else {
      movs.push({ compte, dia, ...costats(m.tipus === 'ENTRADA' ? imp : -imp), concepte: m.concepte, ...base });
    }
  }
  return { movs, saldos, senseCompte };
}

export async function registreTresoreria(desde: string, fins: string): Promise<RegistreTresoreria> {
  // El saldo de partida de cada compte surt del seu últim saldo inicial ≤ desde
  // més els moviments d'ençà: la finestra comença a la més antiga d'aquestes dates.
  const ancores = await prisma.movimentTresoreria.groupBy({
    by: ['compte'],
    where: { deletedAt: null, tipus: 'SALDO_INICIAL', data: { lte: aData(desde) } },
    _max: { data: true },
  });
  const maxs = ancores.map((a) => a._max.data).filter((d): d is Date => !!d).map(aDia);
  const inici = [desde, ...maxs].sort()[0]!;

  const { movs, saldos, senseCompte } = await moviments(inici, fins);
  return {
    desde,
    fins,
    comptes: (['BANC', 'CAIXA'] as const).map((c) => calculaRegistre(c, movs, saldos, desde, fins)),
    senseCompte,
  };
}

export async function creaMovimentTresoreria(raw: unknown, actor: Actor, ip: string | null) {
  const v = MovimentTresoreriaSchema.parse(raw);
  const concepte = v.concepte || (v.tipus === 'SALDO_INICIAL' ? 'Saldo inicial' : '');
  const m = await prisma.movimentTresoreria.create({
    data: {
      compte: v.compte,
      tipus: v.tipus,
      data: aData(v.data),
      import: round2(v.import),
      concepte,
      referencia: v.referencia || null,
    },
  });
  await audit({
    usuariId: actor?.id ?? null, accio: 'CREACIO', entitat: 'moviment_tresoreria', entitatId: m.id,
    detall: { compte: v.compte, tipus: v.tipus, data: v.data, import: round2(v.import) }, ip,
  });
  return { id: m.id };
}

export async function eliminaMovimentTresoreria(id: string, actor: Actor, ip: string | null) {
  const m = await prisma.movimentTresoreria.update({ where: { id }, data: { deletedAt: new Date() } });
  await audit({
    usuariId: actor?.id ?? null, accio: 'ELIMINACIO', entitat: 'moviment_tresoreria', entitatId: id,
    detall: { compte: m.compte, tipus: m.tipus, data: aDia(m.data), import: Number(m.import) }, ip,
  });
}
