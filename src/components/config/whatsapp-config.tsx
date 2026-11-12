'use client';

import { useEffect, useState } from 'react';
import { MessageCircle, Plus, Send, Trash2 } from 'lucide-react';
import { ApiError, getJSON, postJSON, putJSON } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface DestinatariVista {
  telefon: string;
  teClau: boolean;
  actiu: boolean;
}
interface Estat {
  destinataris: DestinatariVista[];
  ultimResum: string | null;
  error: string | null;
}
interface Fila {
  telefon: string;
  apikey: string;
  teClau: boolean;
  actiu: boolean;
  desat: boolean; // ja és a la BD (es pot provar)
}

/** "34687558248" → "687 558 248" (els espanyols); la resta, amb +. */
const mostraTel = (t: string) =>
  t.startsWith('34') && t.length === 11 ? `${t.slice(2, 5)} ${t.slice(5, 8)} ${t.slice(8)}` : `+${t}`;

/**
 * Números que reben el resum del matí per WhatsApp (CallMeBot). Cada número
 * l'ha d'activar el seu mòbil i té la seva pròpia clau; les claus es desen
 * xifrades i no tornen mai al navegador.
 */
export function WhatsappConfig() {
  const [estat, setEstat] = useState<Estat | null>(null);
  const [files, setFiles] = useState<Fila[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const carrega = (e: Estat) => {
    setEstat(e);
    setFiles(
      e.destinataris.length
        ? e.destinataris.map((d) => ({ telefon: mostraTel(d.telefon), apikey: '', teClau: d.teClau, actiu: d.actiu, desat: true }))
        : [{ telefon: '', apikey: '', teClau: false, actiu: true, desat: false }],
    );
  };
  useEffect(() => {
    getJSON<Estat>('/api/establiment/whatsapp').then(carrega).catch(() => setMsg({ ok: false, text: 'No s’ha pogut carregar.' }));
  }, []);

  const canvia = (i: number, p: Partial<Fila>) => setFiles((fs) => fs.map((f, j) => (j === i ? { ...f, ...p, desat: p.telefon !== undefined ? false : f.desat } : f)));

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
      const body = {
        destinataris: files
          .filter((f) => f.telefon.trim())
          .map((f) => ({ telefon: f.telefon, apikey: f.apikey || null, actiu: f.actiu })),
      };
      carrega(await putJSON<Estat>('/api/establiment/whatsapp', body));
      return 'Desat.';
    });
  const prova = (f: Fila) =>
    fes(`prova:${f.telefon}`, async () => {
      await postJSON('/api/establiment/whatsapp', { telefon: f.telefon });
      return `Prova enviada al ${f.telefon}. Mira el WhatsApp.`;
    });
  const resum = () =>
    fes('resum', async () => {
      const r = await getJSON<{ enviat: boolean; motiu?: string; elements?: number }>('/api/cron/whatsapp-diari');
      return r.enviat ? `Resum enviat (${r.elements} coses).${r.motiu ? ` ${r.motiu}` : ''}` : (r.motiu ?? 'No s’ha enviat.');
    });

  if (!estat) return <p className="text-sm text-slate-500">Carregant…</p>;
  const algunActiu = estat.destinataris.some((d) => d.actiu);

  return (
    <div className="space-y-5 text-sm text-slate-700">
      <p>
        Cada matí (cap a les 9) t’arriba un WhatsApp amb els <strong>recordatoris</strong> que toquen, les{' '}
        <strong>sortides</strong> d’avui i demà, els <strong>cobraments a punt</strong> i les <strong>opinions noves</strong>.
        Si un dia no hi ha res, no arriba res.
      </p>

      <div className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
        <p className="font-semibold">Com funciona (un cop per cada mòbil)</p>
        <p>
          Els missatges els envia <strong>CallMeBot</strong>, un servei gratuït. WhatsApp no deixa que una web t’escrigui
          sense permís, així que primer <strong>cada mòbil li ha de donar permís</strong>:
        </p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>
            Obre{' '}
            <a href="https://www.callmebot.com/blog/free-api-whatsapp-messages/" target="_blank" rel="noreferrer" className="font-semibold underline">
              aquesta pàgina de CallMeBot
            </a>{' '}
            i desa al mòbil el número que hi surt.
          </li>
          <li>
            Des d’aquest mòbil, envia-li per WhatsApp exactament: <code className="rounded bg-white px-1">I allow callmebot to send me messages</code>
          </li>
          <li>Et contestarà amb un número curt (la <strong>clau</strong>). Posa-la aquí sota, al costat del teu número.</li>
        </ol>
        <p className="text-xs text-emerald-900">
          Si la pàgina diu que està ple (el número surt amb asteriscs), cal esperar uns dies. Mentrestant, els
          recordatoris surten igualment al tauler.
        </p>
      </div>

      <div className="space-y-3">
        <p className="font-semibold text-slate-900">Números que reben el resum</p>
        {files.map((f, i) => (
          <div key={i} className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 p-3">
            <label className="min-w-[10rem] flex-1 space-y-1">
              <span className="text-xs font-semibold text-slate-600">Número de WhatsApp</span>
              <Input value={f.telefon} onChange={(e) => canvia(i, { telefon: e.target.value })} placeholder="612 345 678" inputMode="tel" />
            </label>
            <label className="min-w-[10rem] flex-1 space-y-1">
              <span className="text-xs font-semibold text-slate-600">Clau de CallMeBot</span>
              <Input
                value={f.apikey}
                onChange={(e) => canvia(i, { apikey: e.target.value })}
                placeholder={f.teClau ? 'desada ✓ (escriu per canviar-la)' : 'la que t’envia CallMeBot'}
                autoComplete="off"
              />
            </label>
            <label className="flex h-10 items-center gap-2 font-semibold">
              <input type="checkbox" checked={f.actiu} onChange={(e) => canvia(i, { actiu: e.target.checked })} className="h-5 w-5 accent-emerald-700" />
              Rep el resum
            </label>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="md"
                onClick={() => prova(f)}
                disabled={busy !== null || !f.desat || !f.teClau}
                title={!f.desat || !f.teClau ? 'Desa primer el número amb la clau' : 'Envia un missatge de prova'}
              >
                <MessageCircle className="h-4 w-4" /> {busy === `prova:${f.telefon}` ? 'Enviant…' : 'Prova'}
              </Button>
              <button
                type="button"
                onClick={() => setFiles((fs) => fs.filter((_, j) => j !== i))}
                aria-label={`Treure el número ${f.telefon || i + 1}`}
                className="rounded-lg p-2.5 text-slate-400 hover:bg-red-50 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        {files.length < 5 && (
          <button
            type="button"
            onClick={() => setFiles((fs) => [...fs, { telefon: '', apikey: '', teClau: false, actiu: true, desat: false }])}
            className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline"
          >
            <Plus className="h-4 w-4" /> Afegir un altre número
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={desa} disabled={busy !== null}>{busy === 'desa' ? 'Desant…' : 'Desa'}</Button>
        <Button variant="outline" onClick={resum} disabled={busy !== null || !algunActiu}>
          <Send className="h-4 w-4" /> {busy === 'resum' ? 'Enviant…' : 'Envia el resum d’avui ara'}
        </Button>
      </div>

      {msg && <p className={msg.ok ? 'text-green-700' : 'text-red-600'}>{msg.text}</p>}
      {estat.error && !msg && <p className="text-red-600">Últim error: {estat.error}</p>}
      {estat.ultimResum && (
        <p className="text-xs text-slate-500">Últim resum revisat: {estat.ultimResum.split('-').reverse().join('/')}</p>
      )}
    </div>
  );
}
