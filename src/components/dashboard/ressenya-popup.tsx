'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { MessageSquareHeart, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { estrelles, textCurt } from '@/lib/ressenyes';
import { postJSON } from '@/lib/api';

export interface OpinioNova {
  id: string;
  tipus: 'GOOGLE' | 'VALORACIO'; // ressenya de Google pendent | valoració privada de la benvinguda
  autor: string;
  puntuacio: number;
  text: string | null;
  data: string; // ISO
}

const KEY = 'opinions_popup_vistes';

function llegeixVistes(): Set<string> {
  try {
    const raw = window.localStorage.getItem(KEY);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
}

/**
 * Pop-up en entrar al panell quan arriba una opinió nova: una ressenya de Google
 * pendent de decidir o una valoració d'un hoste. Cada opinió avisa UNA vegada:
 * les valoracions es marquen llegides a la BD; les ressenyes, al navegador.
 */
export function RessenyaPopup({ items }: { items: OpinioNova[] }) {
  const [noves, setNoves] = useState<OpinioNova[]>([]);

  useEffect(() => {
    const vistes = llegeixVistes();
    setNoves(items.filter((i) => !vistes.has(i.id)));
  }, [items]);

  const google = useMemo(() => noves.filter((n) => n.tipus === 'GOOGLE'), [noves]);
  const valoracions = useMemo(() => noves.filter((n) => n.tipus === 'VALORACIO'), [noves]);

  function tanca() {
    // Valoracions: llegides a la BD (no tornen a sortir en cap dispositiu).
    const valIds = noves.filter((n) => n.tipus === 'VALORACIO').map((n) => n.id.replace(/^v:/, ''));
    if (valIds.length) void postJSON('/api/valoracions/vistes', { ids: valIds }).catch(() => undefined);
    try {
      const vistes = llegeixVistes();
      for (const n of noves) vistes.add(n.id);
      // Només cal recordar les que encara poden sortir (les del servidor ara).
      const vigents = [...vistes].filter((id) => items.some((i) => i.id === id));
      window.localStorage.setItem(KEY, JSON.stringify(vigents));
    } catch {
      /* si no es pot desar, simplement es tanca */
    }
    setNoves([]);
  }

  if (noves.length === 0) return null;

  const titol =
    noves.length === 1
      ? google.length
        ? 'Tens una ressenya nova de Google'
        : 'Un hoste t’ha deixat una valoració'
      : `Tens ${noves.length} opinions noves`;

  return (
    <div
      className="fixed inset-0 z-[99] flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ressenya-popup-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
          <div className="rounded-xl bg-amber-100 p-2.5 text-amber-700">
            <MessageSquareHeart className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h2 id="ressenya-popup-title" className="font-serif text-lg font-semibold text-slate-900">
              {titol}
            </h2>
            <p className="text-xs text-slate-500">
              {[
                google.length && `${google.length} de Google per decidir si surten a la web`,
                valoracions.length && `${valoracions.length} de la pàgina de benvinguda`,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
          <button
            type="button"
            onClick={tanca}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Tancar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[55vh] space-y-2 overflow-y-auto px-5 py-4">
          {noves.map((n) => (
            <div
              key={n.id}
              className={`rounded-xl border p-3 ${n.puntuacio <= 2 ? 'border-red-200 bg-red-50' : 'border-slate-200'}`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate font-medium text-slate-800">{n.autor}</p>
                <span
                  role="img"
                  aria-label={`${n.puntuacio} de 5 estrelles`}
                  className="shrink-0 text-sm tracking-wider text-amber-600"
                >
                  {estrelles(n.puntuacio)}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {n.tipus === 'GOOGLE' ? 'Google' : 'Valoració privada'}
              </p>
              {n.text && <p className="mt-1 text-sm text-slate-600">“{textCurt(n.text, 160)}”</p>}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-5 py-3">
          <Button variant="outline" onClick={tanca}>
            D’acord
          </Button>
          {valoracions.length > 0 && (
            <Link href="/valoracions" onClick={tanca}>
              <Button variant={google.length ? 'outline' : 'primary'}>Veure valoracions</Button>
            </Link>
          )}
          {google.length > 0 && (
            <Link href="/ressenyes" onClick={tanca}>
              <Button>Revisar ressenyes</Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
