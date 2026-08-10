import React from 'react';
import Link from 'next/link';
import {
  AlertTriangle, LogIn, LogOut,
  Wrench, CalendarClock, ShieldAlert,
  Sparkles, TrendingUp, ChevronRight,
} from 'lucide-react';
import { getResum } from '@/lib/services/dashboard';
import { fitxesDadesPendents } from '@/lib/services/fitxes-pendents';
import { isFormatConfirmat } from '@/lib/mossos/fitxer';
import { getSessionUser } from '@/lib/auth/session';
import { teVistaRestringida } from '@/lib/auth/restriccions';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BenvingudesPendents } from '@/components/dashboard/benvingudes-pendents';
import { CalculadoraPreu } from '@/components/dashboard/calculadora-preu';
import { GlobalSearch } from '@/components/layout/global-search';
import { TargetaAvis, type AvisItem } from '@/components/dashboard/targeta-avis';
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
  const fitxesPendents = await fitxesDadesPendents();
  const isAdmin = user?.role === 'ADMIN';

  type ColorKey = keyof typeof colorMap;

  // Llistes accionables per als 3 avisos desplegables (persones pendents).
  const itemsMossos: AvisItem[] = resum.pendentsEnviament.map((e) => ({
    key: e.id,
    nom: titularNom(e.viatgers),
    sub: e.dataEntrada ? `Entrada ${formatDate(e.dataEntrada)}` : undefined,
    href: `/estancies/${e.id}`,
    tipus: 'MOSSOS',
    entitatId: e.id,
  }));
  const itemsFirma: AvisItem[] = resum.pendentsFirma.map((v) => ({
    key: v.id,
    nom: v.nom || '—',
    sub: `Contracte ${v.contracte}`,
    href: `/estancies/${v.estanciaId}`,
    tipus: 'FIRMA',
    entitatId: v.id,
  }));
  const itemsError: AvisItem[] = resum.enviamentsError.map((e) => ({
    key: e.id,
    nom: e.estancia ? `Contracte ${e.estancia.numContracte}/${e.estancia.anyContracte}` : 'Estada',
    sub: 'Enviament rebutjat / error',
    href: e.estanciaId ? `/estancies/${e.estanciaId}` : '/estancies',
    tipus: 'ENVIAMENT_ERROR',
    entitatId: e.estanciaId,
  }));
  // Estades amb contracte real (26XXX) i sense factura fiscal feta.
  const itemsFacturar: AvisItem[] = resum.estadesAFacturar.map((e) => ({
    key: e.id,
    nom: e.titular,
    sub: `Contracte ${e.contracte}${e.dataSortida ? ` · sortida ${formatDate(e.dataSortida)}` : ''}`,
    href: `/estancies/${e.id}`,
    tipus: 'FACTURAR',
    entitatId: e.id,
  }));
  // Fitxes amb dades obligatòries pendents (mateixa validació que /justificants).
  const itemsFitxes: AvisItem[] = fitxesPendents.map((f) => ({
    key: f.id,
    nom: `${f.nom} · ${f.contracte}`,
    sub: `Falta: ${f.resum}`,
    href: `/estancies/${f.id}`,
    tipus: 'DADES_PENDENTS',
    entitatId: f.id,
  }));
  // Serveis fixos vençuts en mode recordatori: falta pujar-ne la factura.
  const itemsFixes: AvisItem[] = resum.serveisPendentsFactura.map((s) => ({
    key: s.id,
    nom: s.activitat,
    sub: `Vençut ${formatDate(s.properaData)}${s.import != null ? ` · ${formatEur(s.import)}` : ''} · puja la factura`,
    href: '/serveis',
    tipus: 'SERVEI_FACTURA',
    entitatId: s.id,
  }));
  // Cobraments previstos que toca avisar (des del dia abans o vençuts).
  const itemsCobrar: AvisItem[] = resum.cobramentsPendents.map((c) => ({
    key: c.id,
    nom: `${c.titular} · ${formatEur(c.import)}`,
    sub: `Ha de pagar el ${formatDate(c.dataPrevista)}${c.concepte ? ` · ${c.concepte}` : ''}`,
    href: `/estancies/${c.estanciaId}`,
    tipus: 'COBRAMENT',
    entitatId: c.id,
  }));

  // Treu els avisos amagats "per sempre" també d'aquestes targetes (les de dalt
  // —Mossos/Firma/Error— ja venen filtrades del servei).
  const amagatSet = new Set(resum.avisosDescartats.map((d) => `${d.tipus}:${d.entitatId}`));
  const senseAmagats = (items: AvisItem[]) =>
    items.filter((i) => !(i.tipus && i.entitatId && amagatSet.has(`${i.tipus}:${i.entitatId}`)));
  const itemsFacturarVis = senseAmagats(itemsFacturar);
  const itemsFitxesVis = senseAmagats(itemsFitxes);
  const itemsFixesVis = senseAmagats(itemsFixes);
  const itemsCobrarVis = senseAmagats(itemsCobrar);

  const alertes: { label: string; value: number; icon: React.ElementType; ok: boolean; href: string; color: ColorKey }[] = [
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

      <CalculadoraPreu />

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

      {!isFormatConfirmat() && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Fitxer de Mossos en format provisional</p>
            <p className="mt-0.5 text-amber-700">Verifica&apos;l amb el Manual i configura el <code>file_identifier</code> abans d&apos;usar-lo en real.</p>
          </div>
        </div>
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
        <TargetaAvis label="Cobraments pendents" ok={itemsCobrarVis.length === 0} color="rose" iconKey="Coins" items={itemsCobrarVis} />
        <TargetaAvis label="Fitxes amb dades pendents" ok={itemsFitxesVis.length === 0} color="amber" iconKey="FileEdit" items={itemsFitxesVis} />
        <TargetaAvis label="Factures fixes pendents de pujar" ok={itemsFixesVis.length === 0} color="amber" iconKey="Receipt" items={itemsFixesVis} />
        <TargetaAvis label="Pendents d'enviar a Mossos" ok={itemsMossos.length === 0} color="amber" iconKey="Send" items={itemsMossos} />
        <TargetaAvis label="Firmes pendents" ok={itemsFirma.length === 0} color="violet" iconKey="PenLine" items={itemsFirma} />
        <TargetaAvis label="Enviaments amb error" ok={itemsError.length === 0} color="red" iconKey="FileWarning" items={itemsError} />
        {isAdmin && (
          <TargetaAvis label="Estades a facturar" ok={itemsFacturarVis.length === 0} color="emerald" iconKey="Receipt" items={itemsFacturarVis} />
        )}
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
