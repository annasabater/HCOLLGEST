'use client';

import { useEffect, useState } from 'react';
import { CalendarClock, MessageCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface ProrrogaPopupItem {
  id: string; // estada (la que surt)
  titular: string;
  habitacio: string | null;
  sortida: string; // YYYY-MM-DD
  diesFalten: number;
}

/** Esdeveniment que obre l'estada a «Estades en curs» amb el missatge de preguntar. */
export const EVENT_PREGUNTAR_PRORROGA = 'hcoll:preguntar-prorroga';

const KEY = 'prorroga_popup_tancat';
const dc = (s: string) => `${s.slice(8, 10)}/${s.slice(5, 7)}`;
function avuiKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
/** Estades ja vistes avui en aquest navegador (el pop-up no les torna a ensenyar fins demà). */
function vistesAvui(): string[] {
  try {
    const v = JSON.parse(window.localStorage.getItem(KEY) ?? 'null') as { dia?: string; ids?: string[] } | null;
    return v?.dia === avuiKey() && Array.isArray(v.ids) ? v.ids : [];
  } catch {
    return [];
  }
}
function marcaVistes(ids: string[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ dia: avuiKey(), ids: [...new Set([...vistesAvui(), ...ids])] }));
  } catch {
    /* sense localStorage: simplement es tanca */
  }
}

/**
 * Pop-up del tauler: «Avui toca preguntar si vol allargar». Surt el dia proposat
 * (18 dies abans de la sortida si l'estada és llarga, 3 si és curta, o el dia triat
 * a mà) i els dies següents mentre no s'hagi preguntat ni decidit. Un cop al dia per
 * estada (es recorda al navegador). «Preguntar» obre l'estada a «Estades en curs»
 * amb el missatge de WhatsApp a punt.
 */
export function ProrrogaPopup({ items }: { items: ProrrogaPopupItem[] }) {
  const [llista, setLlista] = useState<ProrrogaPopupItem[]>([]);
  useEffect(() => {
    const vistes = vistesAvui();
    setLlista(items.filter((i) => !vistes.includes(i.id)));
  }, [items]);

  if (llista.length === 0) return null;

  function tanca() {
    marcaVistes(llista.map((i) => i.id));
    setLlista([]);
  }
  function pregunta(id: string) {
    tanca();
    window.dispatchEvent(new CustomEvent(EVENT_PREGUNTAR_PRORROGA, { detail: { id } }));
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="prorroga-popup-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
          <div className="rounded-xl bg-emerald-100 p-2.5 text-emerald-700">
            <CalendarClock className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h2 id="prorroga-popup-title" className="font-serif text-lg font-semibold text-slate-900">
              Toca preguntar si vol allargar
            </h2>
            <p className="text-xs text-slate-500">
              {llista.length === 1 ? '1 estada' : `${llista.length} estades`} a punt de preguntar
            </p>
          </div>
        </div>

        <div className="max-h-[60vh] space-y-2 overflow-y-auto px-5 py-4">
          {llista.map((e) => (
            <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 p-3">
              <div className="min-w-0">
                <p className="font-medium text-slate-800">
                  {e.habitacio ? `Hab. ${e.habitacio} · ` : ''}
                  {e.titular}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Surt el {dc(e.sortida)} ({e.diesFalten === 0 ? 'avui' : e.diesFalten === 1 ? 'demà' : `d’aquí ${e.diesFalten} dies`})
                </p>
              </div>
              <Button size="sm" className="bg-emerald-700 hover:bg-emerald-800" onClick={() => pregunta(e.id)}>
                <MessageCircle className="h-4 w-4" /> Preguntar
              </Button>
            </div>
          ))}
        </div>

        <div className="flex justify-end border-t border-slate-100 px-5 py-3">
          <Button variant="outline" onClick={tanca}>
            <X className="h-4 w-4" /> Tancar per avui
          </Button>
        </div>
      </div>
    </div>
  );
}
