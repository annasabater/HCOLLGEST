/**
 * Compte d'un treballador: tot el que se li deu en un període, vingui de
 * jornades de neteja o de bugaderia.
 *
 * Són dos orígens diferents a la base de dades —`Jornada` i la bugaderia
 * marcada dins de `TascaNeteja`— però per a qui paga és una sola llista: un
 * dia, un concepte, un import i si està pagat o no.
 *
 * Les dates viatgen com a `YYYY-MM-DD` (mai com a Date) perquè els dies es
 * desen a mitjanit UTC: convertir-los amb l'hora local els desplaçaria un dia.
 */
import 'server-only';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';

export type TipusMoviment = 'NETEJA' | 'BUGADERIA';

export interface MovimentCompte {
  /** id de la jornada (NETEJA) o de la tasca de neteja (BUGADERIA). */
  id: string;
  tipus: TipusMoviment;
  /** Dia del moviment, `YYYY-MM-DD`. */
  dia: string;
  concepte: string;
  import: number;
  pagat: boolean;
  /** Dia en què es va pagar, `YYYY-MM-DD`, o null si està pendent. */
  pagatEl: string | null;
  /** Només per a jornades per hores; 0 quan es cobra per tasques. */
  hores: number;
  preuHora: number;
}

interface ItemBugaderia {
  article: string;
  qty: number;
}

/** Rang de dies `YYYY-MM-DD`; `fins` és inclusiu. */
export interface RangCompte {
  desde?: string;
  fins?: string;
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Els accents poden venir descompostos: normalitza per casar amb el catàleg. */
const clau = (s: string) => s.normalize('NFC');

const aDia = (d: Date) => d.toISOString().slice(0, 10);

/** Filtre de dates de Prisma per al rang (o `undefined` si no n'hi ha). */
function filtreData({ desde, fins }: RangCompte) {
  if (!desde && !fins) return undefined;
  const where: { gte?: Date; lt?: Date } = {};
  if (desde) where.gte = new Date(`${desde}T00:00:00.000Z`);
  if (fins) {
    // `fins` és inclusiu: el límit superior és la mitjanit del dia següent.
    const d = new Date(`${fins}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    where.lt = d;
  }
  return where;
}

/**
 * Tots els moviments del compte, del més recent al més antic.
 * Sense rang, retorna l'històric sencer (limitat per seguretat).
 */
export async function movimentsCompte(
  treballadorId: string,
  rang: RangCompte = {},
): Promise<MovimentCompte[]> {
  const data = filtreData(rang);

  const [jornades, cataleg, tasques] = await Promise.all([
    prisma.jornada.findMany({
      where: { treballadorId, ...(data ? { data } : {}) },
      orderBy: { data: 'desc' },
      take: 2000,
      select: {
        id: true,
        data: true,
        hores: true,
        preuHora: true,
        import: true,
        notes: true,
        pagada: true,
        dataPagament: true,
      },
    }),
    prisma.articleBugaderia.findMany({
      where: { deletedAt: null },
      select: { nom: true, preu: true },
    }),
    prisma.tascaNeteja.findMany({
      where: { assignadaA: treballadorId, ...(data ? { data } : {}) },
      orderBy: { data: 'desc' },
      take: 2000,
      select: {
        id: true,
        data: true,
        tipus: true,
        bugaderia: true,
        bugaderiaPagadaEl: true,
        habitacio: { select: { nom: true } },
      },
    }),
  ]);

  const preus = new Map(cataleg.map((a) => [clau(a.nom), Number(a.preu)]));
  const costDe = (items: ItemBugaderia[]) =>
    round2(items.reduce((s, i) => s + (preus.get(clau(i.article)) ?? 0) * i.qty, 0));

  const deJornades: MovimentCompte[] = jornades.map((j) => ({
    id: j.id,
    tipus: 'NETEJA',
    dia: aDia(j.data),
    concepte: j.notes ? j.notes.replace('[auto] ', '') : 'Jornada',
    import: Number(j.import),
    pagat: j.pagada,
    pagatEl: j.dataPagament ? aDia(j.dataPagament) : null,
    hores: Number(j.hores),
    preuHora: Number(j.preuHora),
  }));

  const deBugaderia: MovimentCompte[] = tasques
    .filter((t) => Array.isArray(t.bugaderia) && (t.bugaderia as unknown[]).length > 0)
    .map((t) => {
      const items = (t.bugaderia as unknown as ItemBugaderia[]).filter((i) => i.qty > 0);
      const hab = t.habitacio?.nom ? `Hab. ${t.habitacio.nom}` : 'Zones comunes';
      const tipus = t.tipus === 'CANVI_COMPLET' ? 'Sortida' : 'Repàs';
      return {
        id: t.id,
        tipus: 'BUGADERIA' as const,
        dia: aDia(t.data),
        concepte: `${hab} · ${tipus} · ${items.map((i) => `${i.qty}× ${i.article}`).join(', ')}`,
        import: costDe(items),
        pagat: t.bugaderiaPagadaEl !== null,
        pagatEl: t.bugaderiaPagadaEl ? aDia(t.bugaderiaPagadaEl) : null,
        hores: 0,
        preuHora: 0,
      };
    })
    // Un article sense preu al catàleg surt a 0 €: no és res a cobrar.
    .filter((m) => m.import > 0);

  return [...deJornades, ...deBugaderia].sort((a, b) => b.dia.localeCompare(a.dia));
}

/**
 * Marca com a pagat (o torna a pendent) tot el que hi ha al període.
 * `tipus` limita l'acció a un dels dos conceptes. Retorna quantes línies canvien.
 */
export async function marcarPeriode(
  treballadorId: string,
  rang: RangCompte,
  pagat: boolean,
  tipus?: TipusMoviment,
): Promise<{ neteja: number; bugaderia: number }> {
  const data = filtreData(rang);
  const quan = pagat ? new Date() : null;

  // Només toquem les línies que realment canvien d'estat: així "marcar el
  // pendent" no reescriu la data de pagament de les que ja estaven pagades.
  const neteja =
    tipus === 'BUGADERIA'
      ? 0
      : (
          await prisma.jornada.updateMany({
            where: { treballadorId, pagada: !pagat, ...(data ? { data } : {}) },
            data: { pagada: pagat, dataPagament: quan },
          })
        ).count;

  const bugaderia =
    tipus === 'NETEJA'
      ? 0
      : (
          await prisma.tascaNeteja.updateMany({
            where: {
              assignadaA: treballadorId,
              bugaderia: { not: Prisma.DbNull },
              bugaderiaPagadaEl: pagat ? null : { not: null },
              ...(data ? { data } : {}),
            },
            data: { bugaderiaPagadaEl: quan },
          })
        ).count;

  return { neteja, bugaderia };
}

/** Marca una sola línia del compte. */
export async function marcarMoviment(
  treballadorId: string,
  tipus: TipusMoviment,
  id: string,
  pagat: boolean,
): Promise<boolean> {
  const quan = pagat ? new Date() : null;
  if (tipus === 'NETEJA') {
    const res = await prisma.jornada.updateMany({
      where: { id, treballadorId },
      data: { pagada: pagat, dataPagament: quan },
    });
    return res.count > 0;
  }
  const res = await prisma.tascaNeteja.updateMany({
    where: { id, assignadaA: treballadorId },
    data: { bugaderiaPagadaEl: quan },
  });
  return res.count > 0;
}
