/**
 * Resumen del tauler (§2.4 + Fase 7): alertas de lo legalmente urgente
 * (envíos/firmas pendientes, errores) + KPIs financieros (ingresos, gastos,
 * beneficio, ocupación) + alertas de facturas pendientes y activos.
 */
import 'server-only';
import { prisma } from '../db';
import { computeActiuInfo } from '../actiu-alerts';

export async function getResum() {
  const now = new Date();
  const in7 = new Date(now.getTime() + 7 * 86_400_000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);

  const [
    pendentsEnviament,
    pendentsFirmaCount,
    enviamentsError,
    properesEntrades,
    properesSortides,
    totalHostes,
    totalEstancies,
    ingressosMes,
    ingressosAny,
    despesesMes,
    despesesAny,
    facturesPendents,
    actius,
    habitacionsCount,
    enCursCount,
  ] = await Promise.all([
    prisma.estancia.findMany({
      where: {
        deletedAt: null,
        estat: { in: ['EN_CURS', 'RESERVA'] },
        enviaments: { none: { estat: { in: ['ENVIAT', 'ACCEPTAT'] } } },
      },
      orderBy: { dataEntrada: 'asc' },
      take: 20,
      include: { viatgers: { where: { esTitular: true }, include: { huesped: true } } },
    }),
    prisma.estanciaViatger.count({
      where: { signatura: { is: null }, estancia: { estat: 'EN_CURS', deletedAt: null } },
    }),
    prisma.enviamentMossos.findMany({
      where: { estat: { in: ['ERROR', 'REBUTJAT'] } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { estancia: true },
    }),
    prisma.estancia.findMany({
      where: { deletedAt: null, dataEntrada: { gte: now, lte: in7 } },
      orderBy: { dataEntrada: 'asc' },
      take: 10,
      include: { viatgers: { where: { esTitular: true }, include: { huesped: true } }, habitacio: true },
    }),
    prisma.estancia.findMany({
      where: { deletedAt: null, dataSortida: { gte: now, lte: in7 } },
      orderBy: { dataSortida: 'asc' },
      take: 10,
      include: { viatgers: { where: { esTitular: true }, include: { huesped: true } }, habitacio: true },
    }),
    prisma.huesped.count({ where: { deletedAt: null } }),
    prisma.estancia.count({ where: { deletedAt: null } }),
    prisma.cobrament.aggregate({
      _sum: { import: true },
      where: { data: { gte: monthStart, lte: monthEnd }, factura: { deletedAt: null } },
    }),
    prisma.cobrament.aggregate({
      _sum: { import: true },
      where: { data: { gte: yearStart, lte: yearEnd }, factura: { deletedAt: null } },
    }),
    prisma.gasto.aggregate({ _sum: { import: true }, where: { deletedAt: null, data: { gte: monthStart, lte: monthEnd } } }),
    prisma.gasto.aggregate({ _sum: { import: true }, where: { deletedAt: null, data: { gte: yearStart, lte: yearEnd } } }),
    prisma.factura.findMany({ where: { deletedAt: null, estat: 'PENDENT' }, select: { total: true } }),
    prisma.actiu.findMany({
      where: { deletedAt: null },
      select: { dataCompra: true, garantiaFins: true, estat: true },
    }),
    prisma.habitacio.count({ where: { deletedAt: null } }),
    prisma.estancia.count({ where: { deletedAt: null, estat: 'EN_CURS' } }),
  ]);

  const num = (d: { _sum: { import: unknown } }) => Number(d._sum.import ?? 0);
  const ingMes = num(ingressosMes);
  const despMes = num(despesesMes);

  const facturesPendentsTotal = facturesPendents.reduce((a, f) => a + Number(f.total), 0);
  const actiusAlerta = actius.filter((a) => computeActiuInfo(a, now).alerta).length;
  const ocupacio = habitacionsCount > 0 ? Math.round((enCursCount / habitacionsCount) * 100) : 0;

  return {
    pendentsEnviament,
    pendentsFirmaCount,
    enviamentsError,
    properesEntrades,
    properesSortides,
    totals: { hostes: totalHostes, estancies: totalEstancies },
    finances: {
      ingressosMes: ingMes,
      ingressosAny: num(ingressosAny),
      despesesMes: despMes,
      despesesAny: num(despesesAny),
      beneficiMes: Math.round((ingMes - despMes) * 100) / 100,
      ocupacio,
    },
    alertes: {
      facturesPendents: facturesPendents.length,
      facturesPendentsTotal,
      actiusAlerta,
    },
  };
}

export type Resum = Awaited<ReturnType<typeof getResum>>;
