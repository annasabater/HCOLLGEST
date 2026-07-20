/**
 * Serveis/manteniments recurrents (assegurances, extintors, sistema contra
 * incendis, LOPD…). Quan la `properaData` venç, es genera AUTOMÀTICAMENT una
 * despesa (si té import) i s'avança la data segons la freqüència. La generació
 * és idempotent: avança la data amb un "claim" optimista (updateMany condicional)
 * abans de crear la despesa, de manera que dues execucions concurrents (cron +
 * càrrega de pàgina) mai dupliquen la mateixa despesa.
 */
import 'server-only';
import { prisma } from '../db';
import { audit } from '../audit';
import { FREQUENCIA_MESOS, type FrequenciaServeiValue } from '../validation/servei';
import type { Prisma } from '@prisma/client';

const CATEGORIA_DEFECTE = 'Serveis i manteniments';

/** Suma `n` mesos conservant el dia del mes (a diferència de l'addMonths de dates.ts). */
export function addMonthsKeepDay(d: Date, n: number): Date {
  const r = new Date(d);
  r.setMonth(r.getMonth() + n);
  return r;
}

/** Categoria de despesa per defecte per als serveis (la crea si no existeix). */
async function ensureCategoriaServeis(): Promise<string> {
  const existing = await prisma.categoriaGasto.findFirst({ where: { nom: CATEGORIA_DEFECTE } });
  if (existing) return existing.id;
  const creada = await prisma.categoriaGasto.create({ data: { nom: CATEGORIA_DEFECTE } });
  return creada.id;
}

type ServeiRow = Prisma.ServeiRecurrentGetPayload<object>;

/** Crea la despesa associada a una ocurrència d'un servei. */
async function crearDespesaServei(s: ServeiRow, data: Date, import_: number, categoriaId: string) {
  const gasto = await prisma.gasto.create({
    data: {
      data,
      import: import_,
      categoriaId,
      proveidorId: s.proveidorId,
      serveiRecurrentId: s.id,
      descripcio: `Servei: ${s.activitat}`,
      // Copia el desglossament fiscal (lloguer amb IVA/IRPF) al gasto generat,
      // perquè el llibre d'IVA el mostri correctament sense derivar-lo.
      baseImposable: s.baseImposable,
      ivaPercent: s.ivaPercent,
      irpfPercent: s.irpfPercent,
      metodePagament: s.metodePagament,
    },
  });
  await audit({
    usuariId: null,
    accio: 'CREACIO',
    entitat: 'gasto',
    entitatId: gasto.id,
    detall: { origen: 'servei_recurrent', serveiId: s.id, import: import_ },
  });
}

/**
 * Genera les despeses de tots els serveis vençuts (properaData ≤ ara) i avança
 * la data. Retorna el nombre de despeses creades. Segur per cridar sovint.
 */
export async function generarDespesesVencudes(now: Date = new Date()): Promise<number> {
  const deguts = await prisma.serveiRecurrent.findMany({
    where: { deletedAt: null, actiu: true, generaDespesa: true, properaData: { lte: now } },
  });
  if (deguts.length === 0) return 0;

  let creats = 0;
  let categoriaDefecte: string | null = null;
  const categoriaPer = async (s: ServeiRow) => {
    if (s.categoriaId) return s.categoriaId;
    if (!categoriaDefecte) categoriaDefecte = await ensureCategoriaServeis();
    return categoriaDefecte;
  };

  for (const s of deguts) {
    const mesos = FREQUENCIA_MESOS[s.frequencia as FrequenciaServeiValue];
    const import_ = Number(s.importPrevist ?? 0);

    // PUNTUAL: una sola vegada → generar i desactivar.
    if (mesos == null) {
      const claim = await prisma.serveiRecurrent.updateMany({
        where: { id: s.id, actiu: true, properaData: { lte: now } },
        data: { actiu: false },
      });
      if (claim.count === 1 && import_ > 0) {
        await crearDespesaServei(s, s.properaData, import_, await categoriaPer(s));
        creats++;
      }
      continue;
    }

    // Recurrent: avançar període a període fins arribar al futur (límit de seguretat).
    let data = s.properaData;
    let guard = 0;
    while (data <= now && guard < 120) {
      const seguent = addMonthsKeepDay(data, mesos);
      const claim = await prisma.serveiRecurrent.updateMany({
        where: { id: s.id, properaData: data },
        data: { properaData: seguent },
      });
      if (claim.count !== 1) break; // ja avançat per una altra execució concurrent
      if (import_ > 0) {
        await crearDespesaServei(s, data, import_, await categoriaPer(s));
        creats++;
      }
      data = seguent;
      guard++;
    }
  }
  return creats;
}

/**
 * Ocurrències d'un servei dins [desde, fins] (per projectar-lo al calendari).
 * Per als puntuals, només la pròpia data si cau dins del rang.
 */
export function occurrencesInRange(
  properaData: Date,
  frequencia: FrequenciaServeiValue,
  desde: Date,
  fins: Date,
  cap = 60,
): Date[] {
  const mesos = FREQUENCIA_MESOS[frequencia];
  const res: Date[] = [];
  if (mesos == null) {
    if (properaData >= desde && properaData <= fins) res.push(new Date(properaData));
    return res;
  }
  let d = new Date(properaData);
  let guard = 0;
  while (d < desde && guard < 1000) {
    d = addMonthsKeepDay(d, mesos);
    guard++;
  }
  guard = 0;
  while (d <= fins && guard < cap) {
    res.push(new Date(d));
    d = addMonthsKeepDay(d, mesos);
    guard++;
  }
  return res;
}
