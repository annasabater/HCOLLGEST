'use client';

import { useCallback, useEffect, useState } from 'react';
import { BellRing, Send, Trash2 } from 'lucide-react';
import { ApiError, delJSON, getJSON, patchJSON, postJSON } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDate } from '@/lib/utils';

interface Dispositiu {
  id: string;
  endpoint: string;
  nom: string;
  resumMati: boolean;
  alMoment: boolean;
  darrerError: string | null;
  createdAt: string;
}
interface Estat {
  configurat: boolean;
  clauPublica: string | null;
  dispositius: Dispositiu[];
}

/** Clau VAPID (base64url) → bytes, com demana pushManager.subscribe. */
function clauABytes(b64: string): Uint8Array<ArrayBuffer> {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

type Suport = 'ok' | 'no' | 'ios-instal·la';
function suport(): Suport {
  if (typeof window === 'undefined') return 'no';
  const ios = /iPhone|iPad/i.test(navigator.userAgent);
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
  if (ios && !standalone) return 'ios-instal·la';
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window ? 'ok' : 'no';
}

/** Notificacions al mòbil (Web Push): activar aquest dispositiu i gestionar els altres. */
export function NotificacionsConfig() {
  const [estat, setEstat] = useState<Estat | null>(null);
  const [aquest, setAquest] = useState<string | null>(null); // endpoint d'aquest navegador
  const [sup, setSup] = useState<Suport>('ok');
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [telefon, setTelefon] = useState('');
  const [noms, setNoms] = useState<Record<string, string>>({}); // noms que s'estan editant

  const carrega = useCallback(async () => {
    setEstat(await getJSON<Estat>('/api/push'));
  }, []);

  useEffect(() => {
    setSup(suport());
    carrega().catch(() => setMsg({ ok: false, text: 'No s’ha pogut carregar.' }));
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .getRegistration('/')
        .then((reg) => reg?.pushManager.getSubscription())
        .then((s) => setAquest(s?.endpoint ?? null))
        .catch(() => undefined);
    }
  }, [carrega]);

  async function fes(nom: string, f: () => Promise<string | null>) {
    setBusy(nom);
    setMsg(null);
    try {
      const t = await f();
      if (t) setMsg({ ok: true, text: t });
      await carrega();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Error' });
    } finally {
      setBusy(null);
    }
  }

  const activa = () =>
    fes('activa', async () => {
      if (!estat?.clauPublica) throw new Error('Les notificacions encara no estan configurades al servidor.');
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        throw new Error('El mòbil no ha donat permís. Activa les notificacions de gestio a la configuració del navegador i torna-ho a provar.');
      }
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: clauABytes(estat.clauPublica) }));
      await postJSON('/api/push', { ...sub.toJSON(), telefon: telefon.trim() || null });
      setAquest(sub.endpoint);
      return 'Fet! Aquest dispositiu ja rep les notificacions. Prova-ho amb «Envia una prova».';
    });

  const reanomena = (d: Dispositiu) =>
    fes(`nom:${d.id}`, async () => {
      const nom = (noms[d.id] ?? d.nom).trim();
      await patchJSON(`/api/push/${d.id}`, { nom });
      setNoms((n) => {
        const { [d.id]: _, ...resta } = n;
        return resta;
      });
      return `Desat: «${nom}».`;
    });

  const canvia = (d: Dispositiu, p: Partial<Pick<Dispositiu, 'resumMati' | 'alMoment'>>) =>
    fes(`canvia:${d.id}`, async () => {
      await patchJSON(`/api/push/${d.id}`, p);
      return null;
    });
  const prova = (d: Dispositiu) =>
    fes(`prova:${d.id}`, async () => {
      await postJSON(`/api/push/${d.id}`, {});
      return `Prova enviada a «${d.nom}». Hauria de sonar en uns segons.`;
    });
  const treu = (d: Dispositiu) =>
    fes(`treu:${d.id}`, async () => {
      await delJSON(`/api/push/${d.id}`);
      if (d.endpoint === aquest) {
        const reg = await navigator.serviceWorker.getRegistration('/');
        await (await reg?.pushManager.getSubscription())?.unsubscribe();
        setAquest(null);
      }
      return 'Tret.';
    });

  if (!estat) return <p className="text-sm text-slate-500">Carregant…</p>;
  const aquestActiu = !!aquest && estat.dispositius.some((d) => d.endpoint === aquest);

  return (
    <div className="space-y-4 text-sm text-slate-700">
      <p>
        Et sona al mòbil com qualsevol aplicació, també amb la pantalla bloquejada. Cada mòbil s’activa un cop,{' '}
        <strong>des d’aquell mateix mòbil</strong> (entra a gestio.hostalcoll.com amb el mòbil i prem el botó).
      </p>

      {!estat.configurat ? (
        <p className="rounded-lg bg-red-50 p-3 text-red-700">Falten les claus de notificacions al servidor (VAPID).</p>
      ) : aquestActiu ? (
        <p className="rounded-lg border border-green-200 bg-green-50 p-3 text-green-800">Aquest dispositiu ja rep les notificacions.</p>
      ) : sup === 'ios-instal·la' ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">
          <p className="font-semibold">A l’iPhone, primer afegeix gestio a la pantalla d’inici:</p>
          <ol className="mt-1 list-decimal space-y-0.5 pl-5">
            <li>A Safari, prem el botó de Compartir (el quadrat amb la fletxa).</li>
            <li>Tria «Afegir a la pantalla d’inici».</li>
            <li>Obre gestio des de la icona nova (HC), ves a Configuració i prem «Activa-les».</li>
          </ol>
        </div>
      ) : sup === 'no' ? (
        <p className="rounded-lg bg-amber-50 p-3 text-amber-900">Aquest navegador no admet notificacions. Prova amb Chrome (Android) o Safari (iPhone).</p>
      ) : (
        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-orange-200 bg-orange-50 p-3">
          <span className="w-full">Aquest dispositiu encara no té les notificacions activades.</span>
          <label className="flex-[1_1_12rem] space-y-1">
            <span className="text-xs font-semibold text-slate-600">Número d’aquest mòbil (per distingir-lo)</span>
            <Input value={telefon} onChange={(e) => setTelefon(e.target.value)} placeholder="612 345 678" inputMode="tel" />
          </label>
          <Button onClick={activa} disabled={busy !== null}>
            <BellRing className="h-4 w-4" /> {busy === 'activa' ? 'Activant…' : 'Activa-les en aquest mòbil'}
          </Button>
        </div>
      )}

      {estat.dispositius.length > 0 && (
        <div>
          <p className="pb-1 font-semibold text-slate-900">Dispositius que reben avisos</p>
          {estat.dispositius.map((d) => (
            <div key={d.id} className="space-y-2 border-t border-slate-100 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex flex-[1_1_16rem] flex-wrap items-center gap-2">
                  <Input
                    aria-label="Nom o número d’aquest mòbil"
                    value={noms[d.id] ?? d.nom}
                    onChange={(e) => setNoms((n) => ({ ...n, [d.id]: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter' && noms[d.id] !== undefined) reanomena(d); }}
                    placeholder="iPhone · 612 345 678"
                    className="h-9 w-56 font-semibold"
                  />
                  {noms[d.id] !== undefined && noms[d.id] !== d.nom && (
                    <Button size="sm" onClick={() => reanomena(d)} disabled={busy !== null || !noms[d.id]?.trim()}>
                      {busy === `nom:${d.id}` ? 'Desant…' : 'Desa'}
                    </Button>
                  )}
                  <span className="text-xs text-slate-500">
                    {d.endpoint === aquest ? 'aquest · ' : ''}des del {formatDate(d.createdAt)}
                  </span>
                </span>
                <Button variant="outline" size="sm" onClick={() => prova(d)} disabled={busy !== null}>
                  <Send className="h-3.5 w-3.5" /> {busy === `prova:${d.id}` ? 'Enviant…' : 'Envia una prova'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => treu(d)} disabled={busy !== null} className="text-red-700 hover:bg-red-50">
                  <Trash2 className="h-3.5 w-3.5" /> Treure
                </Button>
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-1">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={d.resumMati} onChange={(e) => canvia(d, { resumMati: e.target.checked })} className="h-4 w-4 accent-brand-700" />
                  Resum del matí (sortides, cobraments, recordatoris i opinions)
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={d.alMoment} onChange={(e) => canvia(d, { alMoment: e.target.checked })} className="h-4 w-4 accent-brand-700" />
                  Al moment: ressenya o valoració nova
                </label>
              </div>
              {d.darrerError && <p className="text-xs text-red-600">Últim error: {d.darrerError}</p>}
            </div>
          ))}
        </div>
      )}

      {msg && <p className={msg.ok ? 'text-green-700' : 'text-red-600'}>{msg.text}</p>}
    </div>
  );
}
