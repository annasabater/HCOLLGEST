'use client';

import { useEffect, useState } from 'react';
import { MessageCircle, Send } from 'lucide-react';
import { ApiError, getJSON, postJSON, putJSON } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Estat {
  actiu: boolean;
  telefon: string | null;
  teClau: boolean;
  ultimResum: string | null;
  error: string | null;
}

/**
 * WhatsApp amb CallMeBot (gratuït, només per enviar-se missatges a un mateix).
 * La clau es desa xifrada i no torna mai al navegador.
 */
export function WhatsappConfig() {
  const [estat, setEstat] = useState<Estat | null>(null);
  const [telefon, setTelefon] = useState('');
  const [apikey, setApikey] = useState('');
  const [actiu, setActiu] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const carrega = (e: Estat) => {
    setEstat(e);
    setTelefon(e.telefon ? `+${e.telefon}` : '');
    setActiu(e.actiu);
    setApikey('');
  };
  useEffect(() => {
    getJSON<Estat>('/api/establiment/whatsapp').then(carrega).catch(() => setMsg({ ok: false, text: 'No s’ha pogut carregar.' }));
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

  const desa = () =>
    fes('desa', async () => {
      carrega(await putJSON<Estat>('/api/establiment/whatsapp', { telefon: telefon || null, apikey: apikey || null, actiu }));
      return 'Desat.';
    });
  const prova = () =>
    fes('prova', async () => {
      await postJSON('/api/establiment/whatsapp', {});
      return 'Missatge de prova enviat. Mira el WhatsApp.';
    });
  const resum = () =>
    fes('resum', async () => {
      const r = await getJSON<{ enviat: boolean; motiu?: string; elements?: number }>('/api/cron/whatsapp-diari');
      return r.enviat ? `Resum enviat (${r.elements} coses).` : (r.motiu ?? 'No s’ha enviat.');
    });

  if (!estat) return <p className="text-sm text-slate-500">Carregant…</p>;

  return (
    <div className="space-y-4 text-sm text-slate-700">
      <p>
        Cada matí (cap a les 9) t’envia un WhatsApp amb els <strong>recordatoris</strong> que toquen, les{' '}
        <strong>sortides</strong> d’avui i demà, els <strong>cobraments a punt</strong> i les <strong>opinions noves</strong>.
        Si un dia no hi ha res, no t’envia res.
      </p>

      <ol className="list-decimal space-y-1 rounded-xl bg-emerald-50 p-4 pl-8 text-emerald-950">
        <li>
          Desa al mòbil el contacte de CallMeBot. El número és a{' '}
          <a href="https://www.callmebot.com/blog/free-api-whatsapp-messages/" target="_blank" rel="noreferrer" className="font-semibold underline">
            callmebot.com (WhatsApp API)
          </a>
          .
        </li>
        <li>
          Envia-li per WhatsApp el missatge: <code className="rounded bg-white px-1">I allow callmebot to send me messages</code>
        </li>
        <li>Et respondrà amb una clau (<em>apikey</em>). Posa-la aquí sota amb el teu número.</li>
      </ol>
      <p className="text-xs text-slate-500">
        Si la pàgina diu que el bot està ple, cal esperar que hi torni a haver places. Mentrestant, els recordatoris
        surten igualment al tauler.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="font-semibold">El teu número de WhatsApp</span>
          <Input value={telefon} onChange={(e) => setTelefon(e.target.value)} placeholder="+34 612 345 678" inputMode="tel" />
        </label>
        <label className="space-y-1">
          <span className="font-semibold">Clau de CallMeBot</span>
          <Input
            value={apikey}
            onChange={(e) => setApikey(e.target.value)}
            placeholder={estat.teClau ? '•••••• (desada; escriu-ne una per canviar-la)' : 'p. ex. 123456'}
            autoComplete="off"
          />
        </label>
      </div>

      <label className="flex items-center gap-2 font-semibold">
        <input type="checkbox" checked={actiu} onChange={(e) => setActiu(e.target.checked)} className="h-5 w-5 accent-emerald-700" />
        Envia’m el resum cada matí
      </label>

      <div className="flex flex-wrap gap-2">
        <Button onClick={desa} disabled={busy !== null}>{busy === 'desa' ? 'Desant…' : 'Desa'}</Button>
        <Button variant="outline" onClick={prova} disabled={busy !== null || !estat.teClau || !estat.telefon}>
          <MessageCircle className="h-4 w-4" /> {busy === 'prova' ? 'Enviant…' : 'Envia una prova'}
        </Button>
        <Button variant="outline" onClick={resum} disabled={busy !== null || !estat.actiu}>
          <Send className="h-4 w-4" /> {busy === 'resum' ? 'Enviant…' : 'Envia el resum d’avui ara'}
        </Button>
      </div>

      {msg && <p className={msg.ok ? 'text-green-700' : 'text-red-600'}>{msg.text}</p>}
      {estat.error && !msg && <p className="text-red-600">Últim error: {estat.error}</p>}
      {estat.ultimResum && <p className="text-xs text-slate-500">Últim resum revisat: {estat.ultimResum.split('-').reverse().join('/')}</p>}
    </div>
  );
}
