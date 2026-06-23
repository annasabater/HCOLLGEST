import Link from 'next/link';
import {
  AlertTriangle,
  FileWarning,
  PenLine,
  Send,
  LogIn,
  LogOut,
  Receipt,
  Boxes,
  Clock,
  Wrench,
  CalendarClock,
  ShieldAlert,
} from 'lucide-react';
import { getResum } from '@/lib/services/dashboard';
import { isFormatConfirmat } from '@/lib/mossos/fitxer';
import { getSessionUser } from '@/lib/auth/session';
import { teVistaRestringida } from '@/lib/auth/restriccions';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { FinancesPanel, type FinanceKpi } from '@/components/dashboard/finances-panel';
import { DescartarAvisMossos } from '@/components/estancia/descartar-avis-mossos';
import { formatDate, formatEur } from '@/lib/utils';

export const dynamic = 'force-dynamic';

function titularNom(viatgers: { huesped: { nom: string; cognom1: string } }[]): string {
  const t = viatgers[0]?.huesped;
  return t ? `${t.nom} ${t.cognom1}` : '—';
}

export default async function DashboardPage() {
  const user = await getSessionUser();
  const resum = await getResum({ excloureMetodeAltres: teVistaRestringida(user) });
  const isAdmin = user?.role === 'ADMIN';

  // Termini legal: comunicar a Mossos en ≤ 24 h des de l'entrada (estades en curs).
  const araMs = Date.now();
  const DIA_MS = 86_400_000;
  const fmtDur = (ms: number) => {
    const abs = Math.abs(ms);
    const h = Math.floor(abs / 3_600_000);
    const m = Math.floor((abs % 3_600_000) / 60_000);
    return `${h}h ${m}m`;
  };
  const termini24 = resum.pendentsEnviament
    .filter((e) => e.estat === 'EN_CURS')
    .map((e) => {
      const restMs = new Date(e.dataEntrada).getTime() + DIA_MS - araMs;
      return { e, restMs, vencut: restMs < 0 };
    })
    .sort((a, b) => a.restMs - b.restMs);
  const vencuts24 = termini24.filter((t) => t.vencut);

  const alertes = [
    {
      label: 'Pendents d’enviar a Mossos',
      value: resum.pendentsEnviament.length,
      icon: Send,
      tone: resum.pendentsEnviament.length > 0 ? ('warning' as const) : ('success' as const),
      href: '/estancies?estat=pendent',
    },
    {
      label: 'Firmes pendents',
      value: resum.pendentsFirmaCount,
      icon: PenLine,
      tone: resum.pendentsFirmaCount > 0 ? ('warning' as const) : ('success' as const),
      href: '/estancies',
    },
    {
      label: 'Enviaments amb error/rebuig',
      value: resum.enviamentsError.length,
      icon: FileWarning,
      tone: resum.enviamentsError.length > 0 ? ('danger' as const) : ('success' as const),
      href: '/estancies',
    },
    ...(isAdmin
      ? [
          {
            label: 'Factures pendents de cobrament',
            value: resum.alertes.facturesPendents,
            icon: Receipt,
            tone: resum.alertes.facturesPendents > 0 ? ('warning' as const) : ('success' as const),
            href: '/factures',
          },
        ]
      : []),
    {
      label: 'Actius amb alerta',
      value: resum.alertes.actiusAlerta,
      icon: Boxes,
      tone: resum.alertes.actiusAlerta > 0 ? ('warning' as const) : ('success' as const),
      href: '/actius',
    },
    {
      label: 'Serveis/renovacions pròximes',
      value: resum.alertes.serveisProxims,
      icon: Wrench,
      tone: resum.alertes.serveisProxims > 0 ? ('warning' as const) : ('success' as const),
      href: '/serveis',
    },
  ];

  const finances: FinanceKpi[] = [
    {
      label: 'Ingressos (mes)',
      value: formatEur(resum.finances.ingressosMes),
      icon: 'TrendingUp',
      color: 'text-green-600',
    },
    {
      label: 'Despeses (mes)',
      value: formatEur(resum.finances.despesesMes),
      icon: 'TrendingDown',
      color: 'text-red-600',
    },
    {
      label: 'Benefici (mes)',
      value: formatEur(resum.finances.beneficiMes),
      icon: 'Wallet',
      color: resum.finances.beneficiMes >= 0 ? 'text-green-600' : 'text-red-600',
    },
    {
      label: 'Ocupació actual',
      value: `${resum.finances.ocupacio}%`,
      icon: 'BedDouble',
      color: 'text-brand-600',
    },
    {
      label: 'Personal a pagar (mes)',
      value: formatEur(resum.finances.personalMes),
      icon: 'UserCog',
      color: 'text-slate-600',
    },
    {
      label: 'Dipòsits en custòdia',
      value: formatEur(resum.finances.dipositsCustodia),
      icon: 'Coins',
      color: 'text-amber-600',
    },
  ];

  return (
    <div>
      <PageHeader title="Tauler" subtitle="Visió general de l’hostal" />

      {/* Aviso §9: el formato del fitxer es PROVISIONAL hasta confirmarlo con el manual */}
      {!isFormatConfirmat() && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">Fitxer de Mossos en format provisional</p>
            <p className="mt-0.5 text-amber-700">
              El generador del <em>fitxer massiu</em> ja funciona, però l’ordre de columnes i els
              codis són una versió <strong>provisional</strong>. Verifica’ls amb el{' '}
              <em>Manual d’instruccions</em> del portal i configura el <code>file_identifier</code> de
              l’establiment abans d’usar-lo en real. Mentrestant, pots comunicar-ho manualment.
            </p>
          </div>
        </div>
      )}

      {/* Termini legal Mossos: alerta vermella si alguna estada ha passat de 24 h */}
      {vencuts24.length > 0 && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">
              {vencuts24.length} {vencuts24.length === 1 ? 'estada' : 'estades'} amb el termini de 24 h
              VENÇUT — comunica-les a Mossos com abans millor.
            </p>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-red-700">
              {vencuts24.slice(0, 6).map((t) => (
                <Link key={t.e.id} href={`/estancies/${t.e.id}`} className="underline">
                  {titularNom(t.e.viatgers)} (vençut fa {fmtDur(t.restMs)})
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Compte enrere del termini de 24 h (estades en curs no comunicades) */}
      {termini24.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-brand-600" />
            <CardTitle>Termini Mossos (24 h)</CardTitle>
          </CardHeader>
          <CardBody className="space-y-1">
            {termini24.map((t) => (
              <div
                key={t.e.id}
                className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50"
              >
                <Link href={`/estancies/${t.e.id}`} className="font-medium text-slate-800 hover:underline">
                  {titularNom(t.e.viatgers)}
                </Link>
                <div className="flex items-center gap-2">
                  <Badge tone={t.vencut ? 'danger' : t.restMs < 6 * 3_600_000 ? 'warning' : 'info'}>
                    {t.vencut ? `Vençut fa ${fmtDur(t.restMs)}` : `Queden ${fmtDur(t.restMs)}`}
                  </Badge>
                  <DescartarAvisMossos estanciaId={t.e.id} />
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      {/* Vigències a punt de caducar (assegurances, contractes…) — avís especial */}
      {resum.vigenciesProximes.length > 0 && (
        <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <div className="mb-2 flex items-center gap-2 font-semibold">
            <ShieldAlert className="h-5 w-5 shrink-0" />
            Vigències a punt de caducar
          </div>
          <ul className="space-y-1.5">
            {resum.vigenciesProximes.map((v) => (
              <li key={v.id} className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <Link href="/serveis" className="font-medium underline">
                  {v.activitat}
                </Link>
                {v.proveidor && <span className="text-amber-700">· {v.proveidor}</span>}
                <Badge tone={v.caducada ? 'danger' : 'warning'}>
                  {v.caducada ? 'Caducada el ' : 'Caduca el '}
                  {formatDate(v.vigenciaFi)}
                </Badge>
                {v.observacions && <span className="text-amber-700">— {v.observacions}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* KPIs financers — només per a l'ADMIN */}
      {isAdmin && <FinancesPanel items={finances} />}

      {/* Tarjetas de alerta */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {alertes.map((a) => {
          const Icon = a.icon;
          return (
            <Link key={a.label} href={a.href}>
              <Card className="transition-shadow hover:shadow-md">
                <CardBody className="flex items-center gap-4">
                  <div className="rounded-lg bg-slate-100 p-3">
                    <Icon className="h-6 w-6 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{a.value}</p>
                    <p className="text-xs text-slate-500">{a.label}</p>
                  </div>
                  <Badge tone={a.tone} className="ml-auto">
                    {a.value === 0 ? 'OK' : 'Atenció'}
                  </Badge>
                </CardBody>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex items-center gap-2">
            <LogIn className="h-4 w-4 text-green-600" />
            <CardTitle>Properes entrades (7 dies)</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2">
            {resum.properesEntrades.length === 0 && (
              <p className="text-sm text-slate-400">Cap entrada propera.</p>
            )}
            {resum.properesEntrades.map((e) => (
              <Link
                key={e.id}
                href={`/estancies/${e.id}`}
                className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50"
              >
                <span className="font-medium text-slate-800">{titularNom(e.viatgers)}</span>
                <span className="text-slate-500">
                  {e.habitacio ? `Hab. ${e.habitacio.nom} · ` : ''}
                  {formatDate(e.dataEntrada)}
                </span>
              </Link>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex items-center gap-2">
            <LogOut className="h-4 w-4 text-brand-600" />
            <CardTitle>Properes sortides (7 dies)</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2">
            {resum.properesSortides.length === 0 && (
              <p className="text-sm text-slate-400">Cap sortida propera.</p>
            )}
            {resum.properesSortides.map((e) => (
              <Link
                key={e.id}
                href={`/estancies/${e.id}`}
                className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50"
              >
                <span className="font-medium text-slate-800">{titularNom(e.viatgers)}</span>
                <span className="text-slate-500">
                  {e.habitacio ? `Hab. ${e.habitacio.nom} · ` : ''}
                  {formatDate(e.dataSortida)}
                </span>
              </Link>
            ))}
          </CardBody>
        </Card>
      </div>

      {/* Serveis i manteniments amb propera visita/renovació (30 dies) */}
      {resum.serveisProxims.length > 0 && (
        <Card className="mt-6">
          <CardHeader className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-amber-600" />
            <CardTitle>Serveis i renovacions pròximes (30 dies)</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2">
            {resum.serveisProxims.map((s) => (
              <Link
                key={s.id}
                href="/serveis"
                className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50"
              >
                <span className="font-medium text-slate-800">
                  {s.activitat}
                  {s.proveidor ? <span className="text-slate-400"> · {s.proveidor}</span> : null}
                </span>
                <span className="flex items-center gap-2 text-slate-500">
                  {s.import != null && <span>{formatEur(s.import)}</span>}
                  <Badge tone={s.vencut ? 'danger' : 'warning'}>{formatDate(s.properaData)}</Badge>
                </span>
              </Link>
            ))}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
