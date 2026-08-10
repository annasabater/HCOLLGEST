'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Coins, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { patchJSON, ApiError } from '@/lib/api';
import { formatDate, formatEur } from '@/lib/utils';

export interface CobramentItem {
  id: string;
  estanciaId: string;
  titular: string;
  import: number;
  dataPrevista: string; // ISO
  concepte: string | null;
}

const KEY = 'cobrament_popup_dismissed';
// Clau del dia (local): perquè el pop-up surti un cop al dia i, en tancar-lo,
// no torni fins demà.
function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/**
 * Pop-up diari de cobraments previstos: surt en entrar quan hi ha pagaments dins
 * la finestra (des de 2 dies abans fins al dia). S'ha de tancar manualment i no
 * torna a sortir fins l'endemà (es recorda al navegador). Marcar "Ja està pagat"
 * el treu per sempre.
 */
export function CobramentPopup({ items }: { items: CobramentItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [llista, setLlista] = useState<CobramentItem[]>(items);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (items.length === 0) return;
    let dismissed: string | null = null;
    try {
      dismissed = window.localStorage.getItem(KEY);
    } catch {
      dismissed = null;
    }
    if (dismissed !== todayKey()) setOpen(true);
    // Nomes al muntar / si canvia la llista d'items del servidor.
  }, [items]);

  function tancarPerAvui() {
    try {
      window.localStorage.setItem(KEY, todayKey());
    } catch {
      /* si no es pot desar, simplement es tanca */
    }
    setOpen(false);
  }

  async function marcarPagat(id: string) {
    setBusy(id);
    setErr(null);
    try {
      await patchJSON(`/api/pagaments-previstos/${id}`, { pagat: true });
      const resta = llista.filter((c) => c.id !== id);
      setLlista(resta);
      router.refresh();
      if (resta.length === 0) setOpen(false);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'No s’ha pogut marcar com a pagat');
    } finally {
      setBusy(null);
    }
  }

  if (!open || llista.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cobrament-popup-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
          <div className="rounded-xl bg-rose-100 p-2.5 text-rose-700">
            <Coins className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h2 id="cobrament-popup-title" className="font-serif text-lg font-semibold text-slate-900">
              Cobraments a punt
            </h2>
            <p className="text-xs text-slate-500">
              {llista.length === 1 ? '1 cobrament pendent' : `${llista.length} cobraments pendents`} en els pròxims dies
            </p>
          </div>
        </div>

        <div className="max-h-[60vh] space-y-2 overflow-y-auto px-5 py-4">
          {err && <p className="text-sm text-red-600">{err}</p>}
          {llista.map((c) => (
            <div key={c.id} className="rounded-xl border border-slate-200 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-slate-800">
                    {c.titular} · {formatEur(c.import)}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Ha de pagar el {formatDate(c.dataPrevista)}
                    {c.concepte ? ` · ${c.concepte}` : ''}
                  </p>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Button size="sm" onClick={() => marcarPagat(c.id)} disabled={busy === c.id}>
                  <Check className="h-4 w-4" /> {busy === c.id ? 'Desant…' : 'Ja està pagat'}
                </Button>
                <Link href={`/estancies/${c.estanciaId}`} onClick={() => setOpen(false)}>
                  <Button size="sm" variant="ghost">Veure estada</Button>
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end border-t border-slate-100 px-5 py-3">
          <Button variant="outline" onClick={tancarPerAvui}>
            <X className="h-4 w-4" /> Tancar per avui
          </Button>
        </div>
      </div>
    </div>
  );
}
