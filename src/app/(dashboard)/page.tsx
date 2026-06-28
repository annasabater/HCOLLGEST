import React from 'react';
import Link from 'next/link';
import {
  AlertTriangle, FileWarning, PenLine, Send, LogIn, LogOut,
  Receipt, Boxes, Clock, Wrench, CalendarClock, ShieldAlert,
  Sparkles, TrendingUp, ChevronRight,
} from 'lucide-react';
import { getResum } from '@/lib/services/dashboard';
import { isFormatConfirmat } from '@/lib/mossos/fitxer';
import { getSessionUser } from '@/lib/auth/session';
import { teVistaRestringida } from '@/lib/auth/restriccions';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BenvingudesPendents } from '@/components/dashboard/benvingudes-pendents';
import { GlobalSearch } from '@/components/layout/global-search';
import { DescartarAvisMossos } from '@/components/estancia/descartar-avis-mossos';
import { formatDate, formatEur } from '@/lib/utils';

export const dynamic = 'force-dynamic';

function titularNom(viatgers: { huesped: { nom: string; cognom1: string } }[]): string {
  const t = viatgers[0]?.huesped;
  return t ? `${t.nom} ${t.cognom1}` : '—';
}

function Initials({ nom }: { nom: string }) {
  const parts = nom.trim().split(' ');
  const ini = (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '');
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700 uppercase">
      {ini}
    </span>
  );
}

const colorMap = {
  amber:   { bg: 'bg-amber-50',   icon: 'bg-amber-100 text-amber-700',   border: 'border-amber-200',   num: 'text-amber-800'   },
  violet:  { bg: 'bg-violet-50',  icon: 'bg-violet-100 text-violet-700',  border: 'border-violet-200',  num: 'text-violet-800'  },
  red:     { bg: 'bg-red-50',     icon: 'bg-red-100 text-red-700',        border: 'border-red-200',     num: 'text-red-800'     },
  emerald: { bg: 'bg-emerald-50', icon: 'bg-emerald-100 text-emerald-700',border: 'border-emerald-200', num: 'text-emerald-800' },
  orange:  { bg: 'bg-orange-50',  icon: 'bg-orange-100 text-orange-700',  border: 'border-orange-200',  num: 'text-orange-800'  },
  sky:     { bg: 'bg-sky-50',     icon: 'bg-sky-100 text-sky-700',        border: 'border-sky-200',     num: 'text-sky-800'     },
} as const;

export default async function DashboardPage() {
  const user = await getSessionUser();
  const resum = await getResum({ excloureMetodeAltres: teVistaRestringida(user) });
  const isAdmin = user?.role === 'ADMIN';

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
      const restMs = (e.dataEntrada ? new Date(e.dataEntrada).getTime() : araMs) + DIA_MS - araMs;
      return { e, restMs, vencut: restMs < 0 };
    })
    .sort((a, b) => a.restMs - b.restMs);
  const vencuts24 = termini24.filter((t) => t.vencut);

  type ColorKey = keyof typeof colorMap;
  const alertes: { label: string; value: number; icon: React.ElementType; ok: boolean; href: string; color: ColorKey }[] = [
    { label: 'Pendents d\'enviar a Mossos', value: resum.pendentsEnviament.length,   icon: Send,        ok: resum.pendentsEnviament.length === 0,      href: '/estancies?estat=pendent', color: 'amber'   },
    { label: 'Firmes pendents',             value: resum.pendentsFirmaCount,          icon: PenLine,     ok: resum.pendentsFirmaCount === 0,            href: '/estancies',               color: 'violet'  },
    { label: 'Enviaments amb error',        value: resum.enviamentsError.length,      icon: FileWarning, ok: resum.enviamentsError.length === 0,        href: '/estancies',               color: 'red'     },
    ...(isAdmin ? [
      { label: 'Factures pendents',         value: resum.alertes.facturesPendents,    icon: Receipt,     ok: resum.alertes.facturesPendents === 0,      href: '/factures',                color: 'emerald' as ColorKey },
    ] : []),
    { label: 'Actius amb alerta',           value: resum.alertes.actiusAlerta,        icon: Boxes,       ok: resum.alertes.actiusAlerta === 0,          href: '/actius',                  color: 'orange'  },
    { label: 'Serveis/renovacions pròximes',value: resum.alertes.serveisProxims,      icon: Wrench,      ok: resum.alertes.serveisProxims === 0,        href: '/serveis',                 color: 'sky'     },
  ];

  return (
    <div className="space-y-6">
      {/* Capçalera */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-slate-900">Tauler</h1>
          <p className="mt-0.5 text-sm text-slate-500">Visió general de l&apos;Hostal Coll</p>
        </div>
        <GlobalSearch />
      </div>

      <BenvingudesPendents
        pendents={resum.benvingudes.pendents}
        automatica={resum.benvingudes.automatica}
        tothom={resum.benvingudes.tothom}
      />

      {/* Sortides avui */}
      {resum.sortidesToday.length > 0 && (
        <div className="flex items-start gap-4 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 px-5 py-4">
          <div className="rounded-xl bg-blue-100 p-2.5"><Sparkles className="h-5 w-5 text-blue-600" /></div>
          <div className="flex-1">
            <p className="font-semibold text-blue-900">
              {resum.sortidesToday.length === 1 ? '1 sortida avui' : `${resum.sortidesToday.length} sortides avui`}
              {' · '}
              <Link href="/neteja" className="underline underline-offset-2 hover:text-blue-700">marca la neteja</Link>
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {resum.sortidesToday.map((s) => (
                <Link key={s.id} href={`/estancies/${s.id}`}
                  className="rounded-lg bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-800 hover:bg-blue-200">
                  {s.titular}{s.habitacio ? ` · Hab. ${s.habitacio}` : ''}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Termini vençut */}
      {vencuts24.length > 0 && (
        <div className="flex items-start gap-4 rounded-2xl border border-red-300 bg-gradient-to-br from-red-50 to-rose-50 px-5 py-4">
          <div className="rounded-xl bg-red-100 p-2.5"><AlertTriangle className="h-5 w-5 text-red-600" /></div>
          <div>
            <p className="font-semibold text-red-900">
              {vencuts24.length} {vencuts24.length === 1 ? 'estada' : 'estades'} amb termini de 24 h VENÇUT
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {vencuts24.slice(0, 6).map((t) => (
                <Link key={t.e.id} href={`/estancies/${t.e.id}`}
                  className="rounded-lg bg-red-100 px-2.5 py-1 text-xs font-medium text-red-800 hover:bg-red-200">
                  {titularNom(t.e.viatgers)} · fa {fmtDur(t.restMs)}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {!isFormatConfirmat() && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Fitxer de Mossos en format provisional</p>
            <p className="mt-0.5 text-amber-700">Verifica&apos;l amb el Manual i configura el <code>file_identifier</code> abans d&apos;usar-lo en real.</p>
          </div>
        </div>
      )}

      {/* Termini 24h */}
      {termini24.length > 0 && (
        <Card>
          <CardHeader className="flex items-center gap-2">
            <div className="rounded-lg bg-brand-100 p-1.5"><Clock className="h-4 w-4 text-brand-700" /></div>
            <CardTitle>Termini Mossos (24 h)</CardTitle>
          </CardHeader>
          <CardBody className="space-y-1 p-3">
            {termini24.map((t) => (
              <div key={t.e.id} className="flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm hover:bg-slate-50">
                <Link href={`/estancies/${t.e.id}`} className="font-medium text-slate-800 hover:text-brand-700 hover:underline">
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

      {/* Vigències */}
      {resum.vigenciesProximes.length > 0 && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          <div className="mb-2 flex items-center gap-2 font-semibold">
            <ShieldAlert className="h-5 w-5 shrink-0" /> Vigències a punt de caducar
          </div>
          <ul className="space-y-1.5">
            {resum.vigenciesProximes.map((v) => (
              <li key={v.id} className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <Link href="/serveis" className="font-medium underline">{v.activitat}</Link>
                {v.proveidor && <span className="text-amber-700">· {v.proveidor}</span>}
                <Badge tone={v.caducada ? 'danger' : 'warning'}>
                  {v.caducada ? 'Caducada el ' : 'Caduca el '}{formatDate(v.vigenciaFi)}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Cards d'alerta */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {alertes.map((a) => {
          const Icon = a.icon;
          const c = colorMap[a.color];
          return (
            <Link key={a.label} href={a.href} className="group">
              <div className={`flex items-center gap-4 rounded-2xl border p-4 transition-all hover:shadow-md ${a.ok ? 'border-slate-200 bg-white' : `${c.border} ${c.bg}`}`}>
                <div className={`rounded-xl p-2.5 ${a.ok ? 'bg-slate-100 text-slate-400' : c.icon}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-2xl font-bold leading-none ${a.ok ? 'text-slate-700' : c.num}`}>{a.value}</p>
                  <p className="mt-1 text-xs text-slate-500 leading-tight">{a.label}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {a.ok
                    ? <span className="text-xs font-semibold text-green-600">✓ OK</span>
                    : <span className="flex items-center gap-0.5 text-xs font-semibold text-amber-600"><TrendingUp className="h-3 w-3" /> Atenció</span>}
                  <ChevronRight className="h-4 w-4 text-slate-300 transition-colors group-hover:text-brand-500" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Entrades / Sortides */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex items-center gap-2">
            <div className="rounded-lg bg-green-100 p-1.5"><LogIn className="h-4 w-4 text-green-700" /></div>
            <CardTitle>Properes entrades <span className="text-sm font-normal text-slate-400">(7 dies)</span></CardTitle>
          </CardHeader>
          <CardBody className="space-y-0.5 p-3">
            {resum.properesEntrades.length === 0
              ? <p className="py-4 text-center text-sm text-slate-400">Cap entrada propera.</p>
              : resum.properesEntrades.map((e) => (
                  <Link key={e.id} href={`/estancies/${e.id}`}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-slate-50">
                    <Initials nom={titularNom(e.viatgers)} />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">{titularNom(e.viatgers)}</p>
                      {e.habitacio && <p className="text-xs text-slate-400">Hab. {e.habitacio.nom}</p>}
                    </div>
                    <span className="shrink-0 rounded-lg bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 tabular-nums">
                      {formatDate(e.dataEntrada)}
                    </span>
                  </Link>
                ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex items-center gap-2">
            <div className="rounded-lg bg-brand-100 p-1.5"><LogOut className="h-4 w-4 text-brand-700" /></div>
            <CardTitle>Properes sortides <span className="text-sm font-normal text-slate-400">(7 dies)</span></CardTitle>
          </CardHeader>
          <CardBody className="space-y-0.5 p-3">
            {resum.properesSortides.length === 0
              ? <p className="py-4 text-center text-sm text-slate-400">Cap sortida propera.</p>
              : resum.properesSortides.map((e) => (
                  <Link key={e.id} href={`/estancies/${e.id}`}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-slate-50">
                    <Initials nom={titularNom(e.viatgers)} />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">{titularNom(e.viatgers)}</p>
                      {e.habitacio && <p className="text-xs text-slate-400">Hab. {e.habitacio.nom}</p>}
                    </div>
                    <span className="shrink-0 rounded-lg bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 tabular-nums">
                      {formatDate(e.dataSortida)}
                    </span>
                  </Link>
                ))}
          </CardBody>
        </Card>
      </div>

      {/* Serveis pròxims */}
      {resum.serveisProxims.length > 0 && (
        <Card>
          <CardHeader className="flex items-center gap-2">
            <div className="rounded-lg bg-amber-100 p-1.5"><CalendarClock className="h-4 w-4 text-amber-700" /></div>
            <CardTitle>Serveis i renovacions pròximes <span className="text-sm font-normal text-slate-400">(30 dies)</span></CardTitle>
          </CardHeader>
          <CardBody className="space-y-0.5 p-3">
            {resum.serveisProxims.map((s) => (
              <Link key={s.id} href="/serveis"
                className="flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm hover:bg-slate-50">
                <span className="font-medium text-slate-800">
                  {s.activitat}
                  {s.proveidor ? <span className="text-slate-400"> · {s.proveidor}</span> : null}
                </span>
                <span className="flex items-center gap-2">
                  {s.import != null && <span className="font-medium text-slate-600">{formatEur(s.import)}</span>}
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
