'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { ApiError, getJSON } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';

export interface EstatConnexio {
  connectat: boolean;
  fitxa: boolean;
  syncAt: string | null;
  syncError: string | null;
}

const MISSATGES: Record<string, { tone: 'ok' | 'warn' | 'err'; text: string }> = {
  ok: { tone: 'ok', text: 'Connectat amb Google. Cada nit es portaran les ressenyes noves.' },
  pendent: {
    tone: 'warn',
    text: 'Connectat, però Google encara no deixa llegir la fitxa (accés a l’API pendent d’aprovació). Quan l’aprovin, funcionarà sol.',
  },
  norefresh: { tone: 'err', text: 'Google no ha donat permís permanent. Torna a connectar i accepta tots els permisos.' },
  noconfig: { tone: 'err', text: 'Falta configurar el client de Google (GOOGLE_CLIENT_ID / SECRET).' },
  error: { tone: 'err', text: 'No s’ha pogut connectar amb Google.' },
};

/**
 * Tradueix els errors de Google que són d'esperar mentre l'accés a l'API no està
 * aprovat (quota 0 o API encara no habilitada) a un missatge clar; la resta, tal qual.
 */
function errorAmigable(err: string): { pendent: boolean; text: string } {
  if (/RESOURCE_EXHAUSTED|Quota exceeded|has not been used in project|SERVICE_DISABLED|PERMISSION_DENIED/i.test(err)) {
    return {
      pendent: true,
      text: 'Esperant que Google aprovi l’accés a les ressenyes (sol·licitud enviada, 7–10 dies laborables). No cal fer res: quan l’aprovin, funcionarà sol.',
    };
  }
  return { pendent: false, text: `Últim error: ${err}` };
}

export function GoogleConnexio({ estat, isAdmin, canWrite }: { estat: EstatConnexio; isAdmin: boolean; canWrite: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const avis = MISSATGES[params.get('google') ?? ''];
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function sincronitza() {
    setBusy(true);
    setMsg(null);
    try {
      const r = await getJSON<{ noves: number; enllacades: number; traduides: number }>('/api/cron/ressenyes-google');
      setMsg(
        r.noves === 0
          ? 'Fet. No hi ha ressenyes noves.'
          : `Fet. ${r.noves} ${r.noves === 1 ? 'ressenya nova' : 'ressenyes noves'} com a pendents.`,
      );
      router.refresh();
    } catch (e) {
      setMsg(e instanceof ApiError ? e.message : 'No s’ha pogut sincronitzar.');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const ultima = estat.syncAt
    ? new Intl.DateTimeFormat('ca-ES', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(estat.syncAt))
    : null;

  return (
    <Card>
      <CardBody className="flex flex-wrap items-center gap-3">
        <span
          aria-hidden="true"
          className={`h-2.5 w-2.5 rounded-full ${
            estat.connectat && estat.fitxa && !estat.syncError
              ? 'bg-green-500'
              : estat.connectat
                ? 'bg-amber-500'
                : 'bg-slate-300'
          }`}
        />
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-semibold text-slate-800">
            {estat.connectat ? 'Sincronització automàtica amb Google' : 'Google no connectat'}
          </p>
          <p className="text-xs text-slate-500">
            {estat.connectat
              ? `Cada nit es porten les ressenyes noves com a pendents, ja traduïdes.${ultima ? ` Última revisió: ${ultima}.` : ''}`
              : 'Connecta el compte de Google de la fitxa de l’hostal perquè les ressenyes noves arribin soles cada nit.'}
          </p>
          {estat.syncError && (
            <p className="mt-1 text-xs font-medium text-amber-700" title={estat.syncError}>
              {errorAmigable(estat.syncError).text}
            </p>
          )}
          {avis && !estat.syncError && (
            <p
              className={`mt-1 text-xs font-medium ${
                avis.tone === 'ok' ? 'text-green-700' : avis.tone === 'warn' ? 'text-amber-700' : 'text-red-700'
              }`}
            >
              {avis.text}
            </p>
          )}
          {msg && msg !== estat.syncError && !errorAmigable(msg).pendent && (
            <p className="mt-1 text-xs font-medium text-slate-700">{msg}</p>
          )}
        </div>
        {estat.connectat && canWrite && (
          <Button variant="outline" size="sm" onClick={sincronitza} disabled={busy}>
            <RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />
            {busy ? 'Revisant…' : 'Revisa ara'}
          </Button>
        )}
        {isAdmin && (
          <Button
            variant={estat.connectat ? 'ghost' : 'primary'}
            size="sm"
            // Navegació completa: el servidor redirigeix al consentiment de Google.
            onClick={() => window.location.assign('/api/ressenyes/google/connect')}
          >
            {estat.connectat ? 'Torna a connectar' : 'Connecta amb Google'}
          </Button>
        )}
      </CardBody>
    </Card>
  );
}
