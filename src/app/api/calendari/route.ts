import { prisma } from '@/lib/db';
import { authorize } from '@/lib/auth/guard';
import { badRequest, ok } from '@/lib/http';
import { occurrencesInRange } from '@/lib/services/serveis-recurrents';
import type { FrequenciaServeiValue } from '@/lib/validation/servei';

// GET /api/calendari?desde=&fins= — agrega entrades, sortides i tasques de neteja.
export async function GET(req: Request) {
  const auth = await authorize();
  if (auth instanceof Response) return auth;

  const url = new URL(req.url);
  const desde = url.searchParams.get('desde');
  const fins = url.searchParams.get('fins');
  if (!desde || !fins) return badRequest('Cal indicar desde i fins');

  const range = { gte: new Date(desde), lte: new Date(fins) };
  const titularInclude = {
    viatgers: { where: { esTitular: true }, include: { huesped: true } },
    habitacio: true,
  } as const;

  const [entrades, sortides, tasques, serveisActius, plansRaw, notesDiaRaw] = await Promise.all([
    prisma.estancia.findMany({
      where: { deletedAt: null, dataEntrada: range },
      include: titularInclude,
      orderBy: { dataEntrada: 'asc' },
    }),
    prisma.estancia.findMany({
      // També les que han dit que marxaran abans (sortida probable dins del rang).
      where: { deletedAt: null, OR: [
          { dataSortida: range },
          { sortidaProbable: range, sortidaAnticipada: false },
          // Ja ha marxat abans: la sortida oficial (la del contracte) també surt, d'un altre color.
          { sortidaAnticipada: true, dataSortidaPrevista: range },
        ],
      },
      include: titularInclude,
      orderBy: { dataSortida: 'asc' },
    }),
    prisma.tascaNeteja.findMany({
      where: { data: range },
      include: { habitacio: true, treballador: true },
      orderBy: { data: 'asc' },
    }),
    prisma.serveiRecurrent.findMany({
      where: { deletedAt: null, actiu: true },
      include: { proveidor: { select: { nom: true } } },
    }),
    // Neteja planificada (a /neteja, encara sense desar al full del dia) i observacions del dia.
    prisma.netejaPlanificada.findMany({
      where: { data: range },
      include: { habitacio: { select: { nom: true } }, treballador: { select: { nom: true } } },
      orderBy: { data: 'asc' },
    }),
    prisma.notaNeteja.findMany({ where: { data: range, ambit: 'DIA' } }),
  ]);

  // Una planificada ja desada al full del dia (hi ha tasca la mateixa habitació el mateix dia) no es repeteix.
  const diaIso = (d: Date) => d.toISOString().slice(0, 10);
  const jaTasca = new Set(tasques.map((t) => `${diaIso(t.data)}|${t.habitacioId}`));
  const plans = plansRaw
    .filter((p) => !jaTasca.has(`${diaIso(p.data)}|${p.habitacioId}`))
    .map((p) => ({
      id: p.id,
      data: p.data,
      tipus: p.tipus,
      habitacio: p.habitacio.nom,
      assignada: p.treballador?.nom ?? null,
      nota: p.nota ?? null,
    }));
  const notesDia = notesDiaRaw.map((n) => ({ id: n.id, data: n.data, text: n.text }));

  // Projecta cada servei recurrent a totes les seves ocurrències dins del rang.
  const desdeD = new Date(desde);
  const finsD = new Date(fins);
  const serveis = serveisActius.flatMap((s) =>
    occurrencesInRange(s.properaData, s.frequencia as FrequenciaServeiValue, desdeD, finsD).map((data) => ({
      id: `${s.id}-${data.toISOString().slice(0, 10)}`,
      data,
      activitat: s.activitat,
      proveidor: s.proveidor?.nom ?? null,
      import: s.importPrevist != null ? Number(s.importPrevist) : null,
    })),
  );

  const titular = (e: (typeof entrades)[number]) => {
    const h = e.viatgers[0]?.huesped;
    return h ? `${h.nom} ${h.cognom1}` : 'Sense titular';
  };

  return ok({
    entrades: entrades.map((e) => ({
      id: e.id,
      data: e.dataEntrada,
      titular: titular(e),
      habitacio: e.habitacio?.nom ?? null,
    })),
    // «Marxarà abans»: surt el dia probable (marcat «probable») i el dia oficial (marcat «oficial»).
    // Si ja ha marxat abans: la real (normal) i l'oficial (marcada «marxat»).
    sortides: sortides.flatMap((e) => {
      const base = { id: e.id, titular: titular(e), habitacio: e.habitacio?.nom ?? null };
      const probable = e.sortidaProbable && !e.sortidaAnticipada ? e.sortidaProbable : null;
      const dins = (d: Date | null) => !!d && d >= range.gte && d <= range.lte;
      return [
        ...(probable && dins(probable) ? [{ ...base, data: probable, marca: 'probable' as const }] : []),
        ...(dins(e.dataSortida) ? [{ ...base, data: e.dataSortida, marca: probable ? ('oficial' as const) : null }] : []),
        ...(e.sortidaAnticipada && e.dataSortidaPrevista && dins(e.dataSortidaPrevista)
          ? [{ ...base, data: e.dataSortidaPrevista, marca: 'marxat' as const, real: e.dataSortida }]
          : []),
      ];
    }),
    tasques: tasques.map((t) => ({
      id: t.id,
      data: t.data,
      tipus: t.tipus,
      estat: t.estat,
      habitacio: t.habitacio?.nom ?? null,
      assignada: t.treballador?.nom ?? null,
      estanciaId: t.vinculadaSortidaId ?? null, // estada de la qual surt la neteja
    })),
    serveis,
    plans,
    notesDia,
  });
}

export const dynamic = 'force-dynamic';
