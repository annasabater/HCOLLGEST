/**
 * Resum de despeses d'un període: el que gasta el hostal, partit en les tres
 * fonts que es veuen a /gastos i que sumades donen la despesa real.
 *
 *   Variables → `Gasto` sense servei recurrent (compres del dia a dia)
 *   Fixes     → `Gasto` lligat a un servei recurrent (llum, aigua, gestoria…)
 *   Personal  → nòmines + jornades de neteja + bugaderia
 *
 * Les fiances (`Gasto.esFianca`) queden FORA del total: són dipòsits que es
 * recuperen, no despesa. Es retornen a part per poder-les ensenyar igualment.
 *
 * Les dates viatgen com a `YYYY-MM-DD`; una nòmina compta com si es pagués
 * l'últim dia del seu mes, així tot el mòdul filtra amb la mateixa regla.
 */
import 'server-only';
import { prisma } from '@/lib/db';
import { costBugaderia, preusBugaderia, type ItemBugaderia } from './compte-treballador';
import { periodeAnterior } from '../periode';

export interface MesDespeses {
  /** `YYYY-MM`. */
  mes: string;
  variables: number;
  fixes: number;
  personal: number;
}

export interface PersonaPeriode {
  id: string;
  nom: string;
  carrec: string;
  nomines: number;
  neteja: number;
  bugaderia: number;
  total: number;
  /** Pagat i pendent només de neteja i bugaderia: les nòmines no porten estat. */
  pagat: number;
  pendent: number;
}

export interface ResumDespeses {
  desde: string;
  fins: string;
  variables: number;
  fixes: number;
  personal: number;
  fiances: number;
  total: number;
  nVariables: number;
  nFixes: number;
  personalPendent: number;
  /** Mateix nombre de dies, desplaçats enrere, per comparar. */
  anterior: { desde: string; fins: string; total: number };
  /** Per categoria, amb el repartiment entre les tres fonts (per saber on porta el clic). */
  categories: { nom: string; import: number; variables: number; fixes: number; personal: number }[];
  fiancesDetall: { proveidor: string; import: number }[];
  personalDetall: PersonaPeriode[];
  /** Any que dibuixa el gràfic (el de `fins`) i els seus 12 mesos. */
  any: number;
  mesos: MesDespeses[];
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const aDia = (d: Date) => d.toISOString().slice(0, 10);
const mesDe = (dia: string) => dia.slice(0, 7);

/** Últim dia del mes d'un període de nòmina `YYYY-MM`. */
function ultimDiaDelMes(periode: string): string {
  const [y, m] = periode.split('-').map(Number);
  if (!y || !m) return periode;
  return aDia(new Date(Date.UTC(y, m, 0)));
}

/** Línia interna: qualsevol cosa que surti de caixa, amb el seu dia i grup. */
interface Linia {
  dia: string;
  import: number;
  grup: 'variables' | 'fixes' | 'personal';
  categoria: string;
}

export async function resumDespeses(desde: string, fins: string): Promise<ResumDespeses> {
  const any = Number(fins.slice(0, 4));
  const ant = periodeAnterior(desde, fins);

  // Una sola finestra que cobreix el període, el període anterior i tot l'any
  // del gràfic: així es calcula tot en memòria amb una passada de consultes.
  const inici = [desde, ant.desde, `${any}-01-01`].sort()[0]!;
  const final = [fins, `${any}-12-31`].sort().reverse()[0]!;
  const gte = new Date(`${inici}T00:00:00.000Z`);
  const lt = new Date(`${final}T00:00:00.000Z`);
  lt.setUTCDate(lt.getUTCDate() + 1);

  const [gastos, jornades, tasques, preus, nomines] = await Promise.all([
    prisma.gasto.findMany({
      where: { deletedAt: null, data: { gte, lt } },
      select: {
        data: true,
        import: true,
        esFianca: true,
        descripcio: true,
        serveiRecurrentId: true,
        categoria: { select: { nom: true } },
        proveidor: { select: { nom: true } },
      },
    }),
    prisma.jornada.findMany({
      where: { data: { gte, lt } },
      select: {
        data: true,
        import: true,
        pagada: true,
        treballador: { select: { id: true, nom: true, carrec: true } },
      },
    }),
    prisma.tascaNeteja.findMany({
      where: { data: { gte, lt }, assignadaA: { not: null } },
      select: {
        data: true,
        bugaderia: true,
        bugaderiaPagadaEl: true,
        treballador: { select: { id: true, nom: true, carrec: true } },
      },
    }),
    preusBugaderia(),
    prisma.nomina.findMany({
      where: { periode: { gte: mesDe(inici), lte: mesDe(final) } },
      select: {
        periode: true,
        total: true,
        treballador: { select: { id: true, nom: true, carrec: true } },
      },
    }),
  ]);

  const linies: Linia[] = [];
  const fiances: { dia: string; import: number; proveidor: string }[] = [];

  for (const g of gastos) {
    const dia = aDia(g.data);
    const imp = Number(g.import);
    if (g.esFianca) {
      fiances.push({ dia, import: imp, proveidor: g.proveidor?.nom ?? g.descripcio });
      continue;
    }
    linies.push({
      dia,
      import: imp,
      grup: g.serveiRecurrentId ? 'fixes' : 'variables',
      categoria: g.categoria?.nom ?? 'Sense categoria',
    });
  }

  // ── Personal ───────────────────────────────────────────────────────────────
  const gent = new Map<string, PersonaPeriode>();
  const dinsPeriode = (dia: string) => dia >= desde && dia <= fins;
  const persona = (t: { id: string; nom: string; carrec: string | null } | null) => {
    if (!t) return null;
    let p = gent.get(t.id);
    if (!p) {
      p = {
        id: t.id,
        nom: t.nom,
        carrec: t.carrec ?? '',
        nomines: 0,
        neteja: 0,
        bugaderia: 0,
        total: 0,
        pagat: 0,
        pendent: 0,
      };
      gent.set(t.id, p);
    }
    return p;
  };

  for (const j of jornades) {
    const dia = aDia(j.data);
    const imp = Number(j.import);
    linies.push({ dia, import: imp, grup: 'personal', categoria: 'Personal' });
    if (!dinsPeriode(dia)) continue;
    const p = persona(j.treballador);
    if (!p) continue;
    p.neteja += imp;
    if (j.pagada) p.pagat += imp;
    else p.pendent += imp;
  }

  for (const t of tasques) {
    if (!Array.isArray(t.bugaderia) || (t.bugaderia as unknown[]).length === 0) continue;
    const items = (t.bugaderia as unknown as ItemBugaderia[]).filter((i) => i.qty > 0);
    const imp = costBugaderia(items, preus);
    if (imp <= 0) continue;
    const dia = aDia(t.data);
    linies.push({ dia, import: imp, grup: 'personal', categoria: 'Personal' });
    if (!dinsPeriode(dia)) continue;
    const p = persona(t.treballador);
    if (!p) continue;
    p.bugaderia += imp;
    if (t.bugaderiaPagadaEl) p.pagat += imp;
    else p.pendent += imp;
  }

  for (const n of nomines) {
    // La nòmina compta el dia que tanca el mes: així només entra al període
    // quan el període cobreix el mes sencer.
    const dia = ultimDiaDelMes(n.periode);
    const imp = Number(n.total);
    linies.push({ dia, import: imp, grup: 'personal', categoria: 'Personal' });
    if (!dinsPeriode(dia)) continue;
    const p = persona(n.treballador);
    if (!p) continue;
    p.nomines += imp;
  }

  for (const p of gent.values()) {
    p.nomines = round2(p.nomines);
    p.neteja = round2(p.neteja);
    p.bugaderia = round2(p.bugaderia);
    p.pagat = round2(p.pagat);
    p.pendent = round2(p.pendent);
    p.total = round2(p.nomines + p.neteja + p.bugaderia);
  }

  // ── Totals del període ─────────────────────────────────────────────────────
  const delPeriode = linies.filter((l) => dinsPeriode(l.dia));
  const suma = (ls: Linia[]) => round2(ls.reduce((s, l) => s + l.import, 0));
  const deGrup = (g: Linia['grup']) => delPeriode.filter((l) => l.grup === g);

  const variables = suma(deGrup('variables'));
  const fixes = suma(deGrup('fixes'));
  const personal = suma(deGrup('personal'));

  const perCat = new Map<string, { variables: number; fixes: number; personal: number }>();
  for (const l of delPeriode) {
    const c = perCat.get(l.categoria) ?? { variables: 0, fixes: 0, personal: 0 };
    c[l.grup] += l.import;
    perCat.set(l.categoria, c);
  }
  const categories = [...perCat.entries()]
    .map(([nom, c]) => ({
      nom,
      import: round2(c.variables + c.fixes + c.personal),
      variables: round2(c.variables),
      fixes: round2(c.fixes),
      personal: round2(c.personal),
    }))
    .filter((c) => c.import > 0.005)
    .sort((a, b) => b.import - a.import);

  const perProv = new Map<string, number>();
  for (const f of fiances) {
    if (!dinsPeriode(f.dia)) continue;
    perProv.set(f.proveidor, (perProv.get(f.proveidor) ?? 0) + f.import);
  }
  const fiancesDetall = [...perProv.entries()]
    .map(([proveidor, imp]) => ({ proveidor, import: round2(imp) }))
    .sort((a, b) => b.import - a.import);

  const totalAnterior = suma(linies.filter((l) => l.dia >= ant.desde && l.dia <= ant.fins));

  // ── Sèrie mensual de l'any (la dibuixa el gràfic) ──────────────────────────
  const mesos: MesDespeses[] = Array.from({ length: 12 }, (_, i) => ({
    mes: `${any}-${String(i + 1).padStart(2, '0')}`,
    variables: 0,
    fixes: 0,
    personal: 0,
  }));
  for (const l of linies) {
    if (!l.dia.startsWith(`${any}-`)) continue;
    const m = mesos[Number(l.dia.slice(5, 7)) - 1];
    if (m) m[l.grup] += l.import;
  }
  for (const m of mesos) {
    m.variables = round2(m.variables);
    m.fixes = round2(m.fixes);
    m.personal = round2(m.personal);
  }

  return {
    desde,
    fins,
    variables,
    fixes,
    personal,
    fiances: round2(fiancesDetall.reduce((s, f) => s + f.import, 0)),
    total: round2(variables + fixes + personal),
    nVariables: deGrup('variables').length,
    nFixes: deGrup('fixes').length,
    personalPendent: round2([...gent.values()].reduce((s, p) => s + p.pendent, 0)),
    anterior: { desde: ant.desde, fins: ant.fins, total: totalAnterior },
    categories,
    fiancesDetall,
    personalDetall: [...gent.values()].filter((p) => p.total > 0).sort((a, b) => b.total - a.total),
    any,
    mesos,
  };
}
