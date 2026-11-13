'use client';

import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Select, Textarea } from '@/components/ui/input';
import {
  fillTemplate,
  enviaWhatsApp,
  salutacio,
  ajustaSalutacio,
  dataLlarga,
  LANGS,
  MISSATGES_PRORROGA,
  MISSATGE_PRORROGA_LABELS,
  PLANTILLA_PRORROGA,
  type Lang,
  type MissatgeProrroga,
} from '@/lib/plantilles';

function lsGet(key: string, def: string): string {
  if (typeof window === 'undefined') return def;
  try { return window.localStorage.getItem(key) ?? def; } catch { return def; }
}

export interface EstadaMissatge {
  id: string;
  sortida: string; // YYYY-MM-DD
  idioma: string | null;
  numViatgers: number;
  viatgers: { nom: string; cognom1: string; telefon: string | null; esMenor: boolean }[];
}

export const langDe = (e: EstadaMissatge): Lang =>
  (['ca', 'es', 'fr', 'en'].includes(e.idioma ?? '') ? e.idioma : 'es') as Lang;
export const sortidaRecomanada = (e: EstadaMissatge): MissatgeProrroga => (e.numViatgers > 1 ? 'sortidaGrup' : 'sortidaUna');

/** Què s'ha enviat, per apuntar-ho a la línia del temps. */
export interface InfoEnviat {
  missatge: MissatgeProrroga;
  detall: string;
}

/**
 * Missatge de pròrroga o de sortida (plantilles de /plantilles) en l'idioma de
 * l'hoste; s'obre al WhatsApp i, si s'envia, avisa amb què s'ha enviat.
 */
export function MissatgeProrrogaComposer({
  estada,
  inicial,
  onEnviat,
  onTanca,
}: {
  estada: EstadaMissatge;
  inicial: MissatgeProrroga;
  onEnviat: (info: InfoEnviat) => void;
  onTanca: () => void;
}) {
  const [missatge, setMissatge] = useState<MissatgeProrroga>(inicial);
  const [lang, setLang] = useState<Lang>(langDe(estada));
  const [importe, setImporte] = useState(() => lsGet('prorroga_import', '300 €'));
  const adults = estada.viatgers.filter((v) => !v.esMenor && v.telefon);
  const [dest, setDest] = useState(0);
  const v = adults[dest] ?? null;

  const genera = (m: MissatgeProrroga, l: Lang) =>
    ajustaSalutacio(
      fillTemplate(lsGet(`plantilla_prorroga_${m}_${l}`, PLANTILLA_PRORROGA[m][l]), {
        salutacio: salutacio(l),
        nom: v?.nom ?? '',
        hora: lsGet('prorroga_hora', '15:00'),
        import: importe,
        sortida: dataLlarga(new Date(`${estada.sortida}T12:00:00Z`), l),
      }),
      l,
    );
  const [text, setText] = useState(() => genera(inicial, langDe(estada)));
  const regenera = (m: MissatgeProrroga, l: Lang) => {
    setMissatge(m);
    setLang(l);
    setText(genera(m, l));
  };
  const recomanada = sortidaRecomanada(estada);

  function envia() {
    if (!v || !enviaWhatsApp(v.telefon, text, `${v.nom} ${v.cognom1}`)) return;
    const idioma = LANGS.find((l) => l.code === lang)?.label.toLowerCase() ?? lang;
    const parts = [`Per WhatsApp a ${v.nom}`, `en ${idioma}`, missatge === 'pregunta' ? `reserva ${importe}` : null];
    onEnviat({ missatge, detall: parts.filter(Boolean).join(' · ') });
  }

  return (
    <div className="space-y-2 rounded-lg bg-white p-3 ring-1 ring-slate-200">
      <div className="grid gap-1.5 sm:grid-cols-2">
        {MISSATGES_PRORROGA.map((m) => (
          <label key={m} className={`flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-2 text-sm ${missatge === m ? 'border-brand-600 bg-white' : 'border-slate-200 bg-white/60'}`}>
            <input type="radio" name={`msg-${estada.id}`} checked={missatge === m} onChange={() => regenera(m, lang)} className="accent-brand-700" />
            <span>
              {MISSATGE_PRORROGA_LABELS[m]}
              {m === recomanada && <span className="ml-1 text-xs text-brand-700">· recomanat ({estada.numViatgers} {estada.numViatgers === 1 ? 'persona' : 'persones'})</span>}
            </span>
          </label>
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs text-slate-500">
          Idioma
          <Select value={lang} onChange={(ev) => regenera(missatge, ev.target.value as Lang)} className="mt-0.5 h-9 w-32">
            {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
          </Select>
        </label>
        {missatge === 'pregunta' && (
          <label className="text-xs text-slate-500">
            Import reserva
            <Input
              value={importe}
              onChange={(ev) => setImporte(ev.target.value)}
              onBlur={() => setText(genera(missatge, lang))}
              className="mt-0.5 h-9 w-28"
            />
          </label>
        )}
        {adults.length > 1 && (
          <label className="text-xs text-slate-500">
            A qui
            <Select value={String(dest)} onChange={(ev) => setDest(Number(ev.target.value))} className="mt-0.5 h-9 w-48">
              {adults.map((a, i) => <option key={i} value={i}>{a.nom} {a.cognom1}</option>)}
            </Select>
          </label>
        )}
      </div>
      <Textarea rows={6} value={text} onChange={(ev) => setText(ev.target.value)} />
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" disabled={!v} title={v ? undefined : 'Cap hoste adult amb telèfon'} onClick={envia}>
          <MessageCircle className="h-4 w-4" /> Enviar per WhatsApp
        </Button>
        <Button size="sm" variant="ghost" onClick={onTanca}>Tancar</Button>
        {!v && <span className="text-xs text-slate-400">Cap hoste adult amb telèfon.</span>}
      </div>
    </div>
  );
}
