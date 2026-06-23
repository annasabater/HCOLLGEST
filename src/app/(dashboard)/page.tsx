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
} from 'lucide-react';
import { getResum } from '@/lib/services/dashboard';
import { isFormatConfirmat } from '@/lib/mossos/fitxer';
import { getSessionUser } from '@/lib/auth/session';
import { teVistaRestringida } from '@/lib/auth/restriccions';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { FinancesPanel, type FinanceKpi } from '@/components/dashboard/finances-panel';
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
      <PageHeader
        title={`Hola, ${user?.nom ?? ''}`}
        subtitle="Resum del dia"
      />

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
    </div>
  );
}
