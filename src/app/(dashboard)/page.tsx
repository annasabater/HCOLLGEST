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
  TrendingUp,
  TrendingDown,
  Wallet,
  BedDouble,
} from 'lucide-react';
import { getResum } from '@/lib/services/dashboard';
import { getSessionUser } from '@/lib/auth/session';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { formatDate, formatEur } from '@/lib/utils';

export const dynamic = 'force-dynamic';

function titularNom(viatgers: { huesped: { nom: string; cognom1: string } }[]): string {
  const t = viatgers[0]?.huesped;
  return t ? `${t.nom} ${t.cognom1}` : '—';
}

export default async function DashboardPage() {
  const [resum, user] = await Promise.all([getResum(), getSessionUser()]);

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
    {
      label: 'Factures pendents de cobrament',
      value: resum.alertes.facturesPendents,
      icon: Receipt,
      tone: resum.alertes.facturesPendents > 0 ? ('warning' as const) : ('success' as const),
      href: '/factures',
    },
    {
      label: 'Actius amb alerta',
      value: resum.alertes.actiusAlerta,
      icon: Boxes,
      tone: resum.alertes.actiusAlerta > 0 ? ('warning' as const) : ('success' as const),
      href: '/actius',
    },
  ];

  const finances = [
    {
      label: 'Ingressos (mes)',
      value: formatEur(resum.finances.ingressosMes),
      icon: TrendingUp,
      color: 'text-green-600',
    },
    {
      label: 'Despeses (mes)',
      value: formatEur(resum.finances.despesesMes),
      icon: TrendingDown,
      color: 'text-red-600',
    },
    {
      label: 'Benefici (mes)',
      value: formatEur(resum.finances.beneficiMes),
      icon: Wallet,
      color: resum.finances.beneficiMes >= 0 ? 'text-green-600' : 'text-red-600',
    },
    {
      label: 'Ocupació actual',
      value: `${resum.finances.ocupacio}%`,
      icon: BedDouble,
      color: 'text-brand-600',
    },
  ];

  return (
    <div>
      <PageHeader
        title={`Hola, ${user?.nom ?? ''}`}
        subtitle="Resum del dia · prioritat al que té termini legal (24 h, §2.4)"
      />

      {/* Aviso §9: configuración pendiente de Mossos */}
      <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="font-medium">Configuració de Mossos pendent (§9)</p>
          <p className="mt-0.5 text-amber-700">
            Per generar el <em>fitxer massiu</em> calen l’ordre exacte de columnes del manual
            (FIELD_LAYOUT) i el <code>file_identifier</code> de l’establiment. Mentrestant pots
            registrar estades i portar el llibre; la comunicació a Mossos es fa manualment.
          </p>
        </div>
      </div>

      {/* KPIs financieros (Fase 7) */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {finances.map((f) => {
          const Icon = f.icon;
          return (
            <Card key={f.label}>
              <CardBody className="flex items-center gap-4">
                <div className="rounded-lg bg-slate-100 p-3">
                  <Icon className={`h-6 w-6 ${f.color}`} />
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-900">{f.value}</p>
                  <p className="text-xs text-slate-500">{f.label}</p>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

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
