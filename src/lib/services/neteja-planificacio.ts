/**
 * Planificació de la neteja: llegir el full per setmanes, planificar habitacions,
 * observacions del dia / de la setmana i «Repetir la setmana passada».
 * La lògica pura és a lib/neteja-planificacio.ts.
 */
import 'server-only';
import { z } from 'zod';
import { prisma } from '../db';
import { audit } from '../audit';
import {
  construeixSetmanes,
  copiaSetmana,
  dillunsDe,
  tipusProposat,
  type SetmanaNeteja,
} from '../neteja-planificacio';
import { sumaDiesDia } from '../prorroga';

const RE_DIA = /^\d{4}-\d{2}-\d{2}$/;
const diaDate = (d: string) => new Date(`${d}T00:00:00.000Z`);
const isoDia = (d: Date) => d.toISOString().slice(0, 10);
const r2 = (n: number) => Math.round(n * 100) / 100;

type Actor = { id: string } | null;

/** Claus «dia|habitacioId» de les sortides (estades que acaben) entre dues dates. */
async function sortidesEntre(desde: string, fins: string): Promise<Set<string>> {
  const est = await prisma.estancia.findMany({
    where: {
      deletedAt: null,
      estat: { not: 'CANCELLADA' },
      habitacioId: { not: null },
      dataSortida: { gte: diaDate(desde), lte: new Date(`${fins}T23:59:59.999Z`) },
    },
    select: { habitacioId: true, dataSortida: true },
  });
  return new Set(est.map((e) => `${isoDia(e.dataSortida!)}|${e.habitacioId}`));
}

export interface Planificacio {
  setmanes: SetmanaNeteja[];
  habitacions: { id: string; nom: string }[];
  treballadors: { id: string; nom: string }[];
  /** «dia|habitacioId» de les sortides del període (per proposar «sortida»). */
  sortides: string[];
  resum: { dies: number; sortides: number; manteniments: number; bugaderia: number; perPagar: number };
}

export async function getPlanificacio(desde: string, fins: string): Promise<Planificacio> {
  const dl = dillunsDe(desde);
  const gte = diaDate(dl);
  const lte = new Date(`${fins}T23:59:59.999Z`);
  const [plans, tasques, notes, jornades, habitacions, treballadors, sortides] = await Promise.all([
    prisma.netejaPlanificada.findMany({
      where: { data: { gte, lte } },
      include: { habitacio: { select: { nom: true } } },
    }),
    prisma.tascaNeteja.findMany({
      where: { data: { gte, lte } },
      include: { habitacio: { select: { nom: true } } },
    }),
    prisma.notaNeteja.findMany({ where: { data: { gte, lte } } }),
    prisma.jornada.findMany({
      where: { data: { gte, lte }, OR: [{ notes: { startsWith: 'Neteja:' } }, { notes: { startsWith: '[auto]' } }] },
      select: { data: true, pagada: true, import: true },
    }),
    prisma.habitacio.findMany({ where: { deletedAt: null }, select: { id: true, nom: true } }),
    prisma.treballador.findMany({ where: { deletedAt: null }, select: { id: true, nom: true }, orderBy: { nom: 'asc' } }),
    sortidesEntre(dl, fins),
  ]);

  const setmanes = construeixSetmanes({
    desde,
    fins,
    plans: plans.map((p) => ({
      id: p.id,
      data: isoDia(p.data),
      habitacioId: p.habitacioId,
      habitacio: p.habitacio.nom,
      tipus: p.tipus,
      treballadorId: p.treballadorId,
      nota: p.nota,
    })),
    tasques: tasques.map((t) => ({
      id: t.id,
      data: isoDia(t.data),
      habitacioId: t.habitacioId,
      habitacio: t.habitacio?.nom ?? null,
      tipus: t.tipus,
      estat: t.estat,
      treballadorId: t.assignadaA,
      notes: t.notes,
      bugaderia: Array.isArray(t.bugaderia) && t.bugaderia.length > 0,
    })),
    notes: notes.map((n) => ({ id: n.id, data: isoDia(n.data), ambit: n.ambit, text: n.text })),
    jornades: jornades.map((j) => ({ data: isoDia(j.data), pagada: j.pagada })),
  });

  // Resum del període (només el que és dins el rang).
  const diesRang = setmanes.flatMap((s) => s.dies);
  const habs = diesRang.flatMap((d) => d.habitacions).filter((h) => h.habitacioId !== null);
  const perPagar = jornades
    .filter((j) => !j.pagada && isoDia(j.data) >= desde && isoDia(j.data) <= fins)
    .reduce((a, j) => a + Number(j.import), 0);

  return {
    setmanes,
    habitacions: habitacions.sort((a, b) => a.nom.localeCompare(b.nom, 'ca', { numeric: true })),
    treballadors,
    sortides: [...sortides],
    resum: {
      dies: diesRang.length,
      sortides: habs.filter((h) => h.tipus === 'CANVI_COMPLET').length,
      manteniments: habs.filter((h) => h.tipus === 'REPAS').length,
      bugaderia: habs.filter((h) => h.bugaderia).length,
      perPagar: r2(perPagar),
    },
  };
}

const PlaSchema = z.object({
  data: z.string().regex(RE_DIA),
  habitacioId: z.string().min(1),
  tipus: z.enum(['CANVI_COMPLET', 'REPAS']).optional(),
  treballadorId: z.string().min(1).nullable().optional(),
  nota: z.string().max(500).nullable().optional(),
});

/** Planifica una habitació un dia (si ja hi era, l'actualitza). Sense tipus, es proposa. */
export async function planificar(raw: unknown, actor: Actor, ip: string | null) {
  const i = PlaSchema.parse(raw);
  const tipus = i.tipus ?? tipusProposat(i.data, i.habitacioId, await sortidesEntre(i.data, i.data));
  const nota = i.nota?.trim() || null;
  const pla = await prisma.netejaPlanificada.upsert({
    where: { data_habitacioId: { data: diaDate(i.data), habitacioId: i.habitacioId } },
    create: { data: diaDate(i.data), habitacioId: i.habitacioId, tipus, treballadorId: i.treballadorId ?? null, nota },
    update: { tipus, ...(i.treballadorId !== undefined ? { treballadorId: i.treballadorId } : {}), ...(i.nota !== undefined ? { nota } : {}) },
  });
  await audit({ usuariId: actor?.id, accio: 'CREACIO', entitat: 'neteja_planificada', entitatId: pla.id, detall: { data: i.data, habitacioId: i.habitacioId, tipus }, ip });
  return pla;
}

const PatchSchema = z.object({
  tipus: z.enum(['CANVI_COMPLET', 'REPAS']).optional(),
  nota: z.string().max(500).nullable().optional(),
  treballadorId: z.string().min(1).nullable().optional(),
});

export async function actualitzarPla(id: string, raw: unknown, actor: Actor, ip: string | null) {
  const i = PatchSchema.parse(raw);
  const pla = await prisma.netejaPlanificada.update({
    where: { id },
    data: {
      ...(i.tipus ? { tipus: i.tipus } : {}),
      ...(i.nota !== undefined ? { nota: i.nota?.trim() || null } : {}),
      ...(i.treballadorId !== undefined ? { treballadorId: i.treballadorId } : {}),
    },
  });
  await audit({ usuariId: actor?.id, accio: 'MODIFICACIO', entitat: 'neteja_planificada', entitatId: id, detall: i, ip });
  return pla;
}

export async function esborrarPla(id: string, actor: Actor, ip: string | null) {
  await prisma.netejaPlanificada.delete({ where: { id } });
  await audit({ usuariId: actor?.id, accio: 'ELIMINACIO', entitat: 'neteja_planificada', entitatId: id, ip });
}

/** Treu les planificacions d'un dia i la seva observació (per esborrar un dia sencer). */
export async function esborrarDia(data: string, actor: Actor, ip: string | null) {
  z.string().regex(RE_DIA).parse(data);
  const r = await prisma.netejaPlanificada.deleteMany({ where: { data: diaDate(data) } });
  await prisma.notaNeteja.deleteMany({ where: { data: diaDate(data), ambit: 'DIA' } });
  await audit({ usuariId: actor?.id, accio: 'ELIMINACIO', entitat: 'neteja_planificada', detall: { dia: data, n: r.count }, ip });
  return r.count;
}

const NotaSchema = z.object({
  data: z.string().regex(RE_DIA),
  ambit: z.enum(['DIA', 'SETMANA']),
  text: z.string().max(1000),
});

/** Desa l'observació del dia o de la setmana; amb el text buit, l'esborra. */
export async function desarNota(raw: unknown, actor: Actor, ip: string | null) {
  const i = NotaSchema.parse(raw);
  const data = diaDate(i.ambit === 'SETMANA' ? dillunsDe(i.data) : i.data);
  const text = i.text.trim();
  if (!text) {
    const r = await prisma.notaNeteja.deleteMany({ where: { data, ambit: i.ambit } });
    if (r.count) await audit({ usuariId: actor?.id, accio: 'ELIMINACIO', entitat: 'nota_neteja', detall: { data: isoDia(data), ambit: i.ambit }, ip });
    return null;
  }
  const nota = await prisma.notaNeteja.upsert({
    where: { data_ambit: { data, ambit: i.ambit } },
    create: { data, ambit: i.ambit, text },
    update: { text },
  });
  await audit({ usuariId: actor?.id, accio: 'MODIFICACIO', entitat: 'nota_neteja', entitatId: nota.id, detall: { ambit: i.ambit }, ip });
  return nota;
}

/**
 * «Repetir la setmana passada»: copia a la setmana del `dilluns` les habitacions i
 * els dies de la setmana anterior (fetes o planificades), com a planificació.
 */
export interface ResultatRepetir {
  /** Habitacions noves copiades. */
  creades: number;
  /** Dilluns de la setmana d'on s'ha copiat (la d'abans o, si estava buida, la darrera amb neteja). */
  origen: string | null;
  /** Habitacions de l'origen que ja hi eren a la setmana (no es dupliquen). */
  jaHi: number;
}

/** Màxim de setmanes enrere on busquem una setmana amb neteja si la d'abans és buida. */
const SETMANES_ENRERE = 8;

export async function repetirSetmana(dilluns: string, actor: Actor, ip: string | null): Promise<ResultatRepetir> {
  z.string().regex(RE_DIA).parse(dilluns);
  const dl = dillunsDe(dilluns);
  const lt = diaDate(dl);
  const fiNova = diaDate(sumaDiesDia(dl, 7));

  // La setmana d'origen és la d'abans; si no hi havia res, la darrera amb neteja (fins a 8 setmanes enrere).
  const llegeixOrigen = async (antDl: string) => {
    const gte = diaDate(antDl);
    const fi = diaDate(sumaDiesDia(antDl, 7));
    const [plans, tasques] = await Promise.all([
      prisma.netejaPlanificada.findMany({ where: { data: { gte, lt: fi } } }),
      prisma.tascaNeteja.findMany({ where: { data: { gte, lt: fi }, habitacioId: { not: null } } }),
    ]);
    return [
      ...tasques.map((t) => ({ data: isoDia(t.data), habitacioId: t.habitacioId!, treballadorId: t.assignadaA })),
      ...plans.map((p) => ({ data: isoDia(p.data), habitacioId: p.habitacioId, treballadorId: p.treballadorId })),
    ];
  };
  let origen: Awaited<ReturnType<typeof llegeixOrigen>> = [];
  let origenDl: string | null = null;
  for (let n = 1; n <= SETMANES_ENRERE; n++) {
    const antDl = sumaDiesDia(dl, -7 * n);
    const x = await llegeixOrigen(antDl);
    if (x.length) { origen = x; origenDl = antDl; break; }
  }
  if (!origenDl) return { creades: 0, origen: null, jaHi: 0 };

  // Dies de la setmana d'origen es porten a la nova (mateix dia de la setmana).
  const desplaca = (7 * (Math.round((Date.parse(`${dl}T00:00:00Z`) - Date.parse(`${origenDl}T00:00:00Z`)) / 86_400_000 / 7))) - 7;
  const origenAlineat = origen.map((o) => ({ ...o, data: sumaDiesDia(o.data, desplaca) }));

  const [jaPlans, jaTasques, sortides] = await Promise.all([
    prisma.netejaPlanificada.findMany({ where: { data: { gte: lt, lt: fiNova } }, select: { data: true, habitacioId: true } }),
    prisma.tascaNeteja.findMany({ where: { data: { gte: lt, lt: fiNova }, habitacioId: { not: null } }, select: { data: true, habitacioId: true } }),
    sortidesEntre(dl, sumaDiesDia(dl, 6)),
  ]);
  const jaHiSon = new Set([...jaPlans, ...jaTasques].map((x) => `${isoDia(x.data)}|${x.habitacioId}`));
  const nous = copiaSetmana(origenAlineat, sortides, jaHiSon);
  const jaHi = new Set(origenAlineat.map((o) => `${sumaDiesDia(o.data, 7)}|${o.habitacioId}`).filter((k) => jaHiSon.has(k))).size;
  if (nous.length) {
    await prisma.netejaPlanificada.createMany({
      data: nous.map((n) => ({ data: diaDate(n.data), habitacioId: n.habitacioId, tipus: n.tipus, treballadorId: n.treballadorId })),
      skipDuplicates: true,
    });
  }
  await audit({ usuariId: actor?.id, accio: 'CREACIO', entitat: 'neteja_planificada', detall: { repetirSetmana: dl, origen: origenDl, n: nous.length }, ip });
  return { creades: nous.length, origen: origenDl, jaHi };
}

/** Planificació d'un dia (per proposar-la al «Full del dia»). */
export async function plansDelDia(data: string) {
  if (!RE_DIA.test(data)) return [];
  const [plans, nota] = await Promise.all([
    prisma.netejaPlanificada.findMany({ where: { data: diaDate(data) }, select: { id: true, habitacioId: true, tipus: true, treballadorId: true, nota: true } }),
    prisma.notaNeteja.findUnique({ where: { data_ambit: { data: diaDate(data), ambit: 'DIA' } }, select: { text: true } }),
  ]);
  return { plans, notaDia: nota?.text ?? null };
}
