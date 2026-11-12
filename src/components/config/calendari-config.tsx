'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, RefreshCw } from 'lucide-react';
import { ApiError, delJSON, getJSON, postJSON } from '@/lib/api';
import { Button } from '@/components/ui/button';

interface Estat {
  connectat: boolean;
  error: string | null;
  pendents: number;
}

const MISSATGES: Record<string, { ok: boolean; text: string }> = {
  ok: { ok: true, text: 'Google Calendar connectat. Els recordatoris ja hi són.' },
  norefresh: { ok: false, text: 'Google no ha donat permís permanent. Torna a connectar i accepta tots els permisos.' },
  noconfig: { ok: false, text: 'Falta configurar el client de Google (GOOGLE_CLIENT_ID / SECRET).' },
  error: {
    ok: false,
    text: 'No s’ha pogut connectar. Si Google diu que l’API no està activada, activa «Google Calendar API» al projecte de Google Cloud i torna-ho a provar.',
  },
};

export function CalendariConfig({ retorn }: { retorn?: string }) {
  const [estat, setEstat] = useState<Estat | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(retorn ? (MISSATGES[retorn] ?? null) : null);

  useEffect(() => {
    getJSON<Estat>('/api/calendari/google').then(setEstat).catch(() => setMsg({ ok: false, text: 'No s’ha pogut carregar.' }));
  }, []);

  async function fes(nom: string, f: () => Promise<string>) {
    setBusy(nom);
    setMsg(null);
    try {
      setMsg({ ok: true, text: await f() });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof ApiError ? e.message : 'Error' });
    } finally {
      setBusy(null);
    }
  }

  if (!estat) return <p className="text-sm text-slate-500">Carregant…</p>;

  return (
    <div className="space-y-4 text-sm text-slate-700">
      <p>
        Cada recordatori es posa sol al teu Google Calendar, amb els avisos dels dies que hagis triat (a les 9:00). Si el
        canvies o el marques «Fet» a gestio, també canvia al calendari. Va a un calendari a part,{' '}
        <strong>«Hostal Coll · Recordatoris»</strong>, perquè no es barregi amb els teus; el pots compartir des de Google
        Calendar. Gestio només pot tocar aquest calendari.
      </p>

      {estat.connectat ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-3">
          <span className="flex-1 text-green-900">
            Connectat · {estat.pendents} {estat.pendents === 1 ? 'recordatori' : 'recordatoris'} al calendari
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={busy !== null}
            onClick={() =>
              fes('sync', async () => {
                const r = await postJSON<Estat & { sincronitzats: number }>('/api/calendari/google', {});
                setEstat(r);
                return r.error ? `Hi ha hagut un error: ${r.error}` : `Fet: ${r.sincronitzats} recordatoris revisats.`;
              })
            }
          >
            <RefreshCw className="h-3.5 w-3.5" /> {busy === 'sync' ? 'Posant-los…' : 'Torna’ls a posar'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={busy !== null}
            className="text-red-700 hover:bg-red-50"
            onClick={() =>
              fes('off', async () => {
                setEstat(await delJSON<Estat>('/api/calendari/google'));
                return 'Desconnectat. El calendari queda a Google; esborra’l des d’allà si no el vols.';
              })
            }
          >
            Desconnecta
          </Button>
        </div>
      ) : (
        <Button onClick={() => window.location.assign('/api/calendari/google/connect')}>
          <CalendarDays className="h-4 w-4" /> Connecta amb Google Calendar
        </Button>
      )}

      {estat.connectat && estat.error && !msg && <p className="text-red-600">Últim error: {estat.error}</p>}
      {msg && <p className={msg.ok ? 'text-green-700' : 'text-red-600'}>{msg.text}</p>}
      <p className="text-xs text-slate-500">
        Google només deixa posar avisos fins a 4 setmanes abans: un avís d’«1 mes abans» surt 28 dies abans.
      </p>
    </div>
  );
}
