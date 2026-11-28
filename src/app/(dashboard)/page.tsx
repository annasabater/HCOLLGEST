import { Pretitol } from '@/components/ui/pretitol';
import Link from 'next/link';
import {
  AlertTriangle, LogIn, LogOut, SprayCan, Bell,
} from 'lucide-react';
import { hasRole, ROLES_WRITE } from '@/lib/auth/rbac';
import { esNomesLectura } from '@/lib/auth/restriccions';
import { estatAvisos, recordatorisAra } from '@/lib/services/recordatoris';
import { diaMadrid } from '@/lib/recordatoris';
import { RecordatoriTarja } from '@/components/recordatori/tarja';
import { getResum } from '@/lib/services/dashboard';
import { fitxesDadesPendents } from '@/lib/services/fitxes-pendents';
import { isFormatConfirmat } from '@/lib/mossos/fitxer';
import { getSessionUser } from '@/lib/auth/session';
import { teVistaRestringida } from '@/lib/auth/restriccions';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { BenvingudesPendents } from '@/components/dashboard/benvingudes-pendents';
import { EstadesEnCurs } from '@/components/dashboard/estades-en-curs';
import { ProrrogaPopup, type ProrrogaPopupItem } from '@/components/dashboard/prorroga-popup';
import { nomPropi } from '@/lib/nom-propi';
import { getEstadesEnCurs } from '@/lib/services/prorrogues';
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

export default async function DashboardPage() {
  const user = await getSessionUser();
  const resum = await getResum({ excloureMetodeAltres: teVistaRestringida(user) });
  const fitxesPendents = await fitxesDadesPendents();
  const estadesEnCurs = await getEstadesEnCurs();
  const isAdmin = user?.role === 'ADMIN';
  const canWrite = user ? hasRole(user.role, ROLES_WRITE) : false;
  const recordatoris = esNomesLectura(user) ? [] : await recordatorisAra();
  // Per editar i crear recordatoris des del tauler (targetes i Estades en curs).
  const avisosRec = canWrite && !esNomesLectura(user) ? await estatAvisos() : undefined;
  // Pop-up «Toca preguntar si vol allargar»: les estades que ja han arribat al dia
  // proposat (o triat) i encara no s'han preguntat ni decidit. Només qui gestiona.
  const tocaPreguntar: ProrrogaPopupItem[] =
    canWrite && !esNomesLectura(user)
      ? estadesEnCurs.estades
          .filter((e) => e.situacio === 'TOCA')
          .map((e) => ({
            id: e.id,
            titular: e.viatgers[0] ? nomPropi(`${e.viatgers[0].nom} ${e.viatgers[0].cognom1}`) : `Contracte ${e.numContracte}`,
            habitacio: e.habitacio,
            sortida: e.sortida,
            diesFalten: e.diesFalten,
          }))
      : [];

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
  const itemsCobrarVis = senseAmagats(itemsCobrar);

  return (
    <div className="space-y-6">
      {/* Capçalera */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Pretitol text={new Date().toLocaleDateString('ca-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Madrid' })} />
          <h1 className="ui-page-title font-serif text-3xl font-semibold text-slate-900">Tauler</h1>
          <p className="mt-0.5 text-sm text-slate-500">Visió general de l&apos;Hostal Coll</p>
        </div>
        <GlobalSearch />
      </div>

      {/* Recordatoris propis que toquen ara (assegurança, revisions…) */}
      {recordatoris.length > 0 && (
        <section aria-label="Recordatoris" className="space-y-2 rounded-xl border border-amber-200 bg-amber-50/70 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-amber-900">
              <Bell className="h-4 w-4" /> Recordatoris que toquen ara
            </h2>
            <Link href="/recordatoris" className="text-xs font-semibold text-amber-900 underline underline-offset-2">
              Tots els recordatoris
            </Link>
          </div>
          {recordatoris.map((r) => (
            <RecordatoriTarja key={r.id} r={r} avui={diaMadrid()} canWrite={canWrite} compacte avisos={avisosRec} />
          ))}
        </section>
      )}

      <CalculadoraPreu potFerPressupost={isAdmin} />

      <BenvingudesPendents
        pendents={resum.benvingudes.pendents}
        automatica={resum.benvingudes.automatica}
        tothom={resum.benvingudes.tothom}
      />

      <EstadesEnCurs avui={estadesEnCurs.avui} estades={estadesEnCurs.estades} avisos={avisosRec} />
      {tocaPreguntar.length > 0 && <ProrrogaPopup items={tocaPreguntar} />}

      {/* Sortides avui */}
      {resum.sortidesToday.length > 0 && (
        <div className="flex items-start gap-4 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 px-5 py-4">
          <div className="rounded-xl bg-blue-100 p-2.5"><SprayCan className="h-5 w-5 text-blue-600" /></div>
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

      {/* Cards d'alerta */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <TargetaAvis label="Cobraments pendents" ok={itemsCobrarVis.length === 0} color="rose" iconKey="Coins" items={itemsCobrarVis} />
        <TargetaAvis label="Fitxes amb dades pendents" ok={itemsFitxesVis.length === 0} color="amber" iconKey="FileEdit" items={itemsFitxesVis} />
        <TargetaAvis label="Pendents d'enviar a Mossos" ok={itemsMossos.length === 0} color="amber" iconKey="Send" items={itemsMossos} />
        <TargetaAvis label="Firmes pendents" ok={itemsFirma.length === 0} color="violet" iconKey="PenLine" items={itemsFirma} />
        <TargetaAvis label="Enviaments amb error" ok={itemsError.length === 0} color="red" iconKey="FileWarning" items={itemsError} />
        {isAdmin && (
          <TargetaAvis label="Estades a facturar" ok={itemsFacturarVis.length === 0} color="emerald" iconKey="Receipt" items={itemsFacturarVis} />
        )}
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

    </div>
  );
}
