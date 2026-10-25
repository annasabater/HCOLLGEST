'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarPlus, LogOut, MessageCircle } from 'lucide-react';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { postJSON, ApiError } from '@/lib/api';
import { formatDate } from '@/lib/utils';
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
import type { EstadaAvisProrroga } from '@/lib/services/prorrogues';

function lsGet(key: string, def: string): string {
  if (typeof window === 'undefined') return def;
  try { return window.localStorage.getItem(key) ?? def; } catch { return def; }
}

const ACCIO_EN_ENVIAR: Record<MissatgeProrroga, 'PREGUNTAT' | 'NO' | 'RECORDATORI'> = {
  pregunta: 'PREGUNTAT',
  noContesta: 'NO',
  sortidaGrup: 'RECORDATORI',
  sortidaUna: 'RECORDATORI',
};

const langDe = (e: EstadaAvisProrroga): Lang =>
  (['ca', 'es', 'fr', 'en'].includes(e.idioma ?? '') ? e.idioma : 'es') as Lang;
const sortidaRecomanada = (e: EstadaAvisProrroga): MissatgeProrroga => (e.numViatgers > 1 ? 'sortidaGrup' : 'sortidaUna');
const titular = (e: EstadaAvisProrroga) => {
  const v = e.viatgers[0];
  return v ? `${v.nom} ${v.cognom1}` : '—';
};

/**
 * Tauler: estades llargues que s'acaben aviat (preguntar si volen allargar,
 * aplaçar, sí/no) i estades que surten demà (recordatori de sortida). Els
 * missatges surten de /plantilles (pròrroga i sortida) i s'envien per WhatsApp.
 */
export function ProrroguesPanel({
  avisos,
  aplacades,
  surtenDema,
}: {
  avisos: EstadaAvisProrroga[];
  aplacades: EstadaAvisProrroga[];
  surtenDema: EstadaAvisProrroga[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aplacant, setAplacant] = useState<string | null>(null);
  // Missatge obert: estada + quin missatge de primer.
  const [obert, setObert] = useState<{ id: string; missatge: MissatgeProrroga } | null>(null);

  if (avisos.length === 0 && aplacades.length === 0 && surtenDema.length === 0) return null;

  async function accio(id: string, body: Record<string, unknown>) {
    setBusy(id);
    setError(null);
    try {
      await postJSON(`/api/estancies/${id}/prorroga`, body);
      setObert(null);
      setAplacant(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No s’ha pogut desar');
    } finally {
      setBusy(null);
    }
  }

  const composer = (e: EstadaAvisProrroga) =>
    obert?.id === e.id && (
      <MissatgeComposer
        key={`${e.id}-${obert.missatge}`}
        estada={e}
        inicial={obert.missatge}
        onEnviat={(m) => accio(e.id, { accio: ACCIO_EN_ENVIAR[m] })}
        onTanca={() => setObert(null)}
      />
    );

  return (
    <Card className="border-brand-200">
      <CardHeader className="flex items-center gap-2">
        <CalendarPlus className="h-4 w-4 text-brand-600" />
        <CardTitle>Pròrrogues i sortides</CardTitle>
      </CardHeader>
      <CardBody className="space-y-3">
        {error && <p className="text-sm text-red-600">{error}</p>}

        {avisos.map((e) => (
          <div key={e.id} className="space-y-2 rounded-lg border border-slate-200 p-3 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-slate-800">
                  {e.habitacio ? `Hab. ${e.habitacio} · ` : ''}{titular(e)}
                </p>
                <p className="text-slate-500">
                  Surt el {formatDate(e.dataSortida)} · {e.diesFalten === 0 ? 'avui' : e.diesFalten === 1 ? 'demà' : `d’aquí ${e.diesFalten} dies`}
                </p>
                {e.estat === 'PREGUNTAT' && e.preguntatAt && (
                  <p className="text-xs text-slate-400">Preguntat el {formatDate(e.preguntatAt)}</p>
                )}
              </div>
              {e.estat === 'PREGUNTAT'
                ? <Badge tone="warning">Esperant resposta</Badge>
                : <Badge tone="info">Per preguntar</Badge>}
            </div>

            {e.estat === 'PREGUNTAT' ? (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => accio(e.id, { accio: 'SI' })} disabled={busy === e.id}>Sí, allarga</Button>
                <Button size="sm" variant="outline" onClick={() => accio(e.id, { accio: 'NO' })} disabled={busy === e.id}>No, marxa</Button>
                <Button size="sm" variant="ghost" onClick={() => accio(e.id, { accio: 'APLACA', dies: 5 })} disabled={busy === e.id}>+5 dies per decidir</Button>
                <Button size="sm" variant="ghost" onClick={() => setObert({ id: e.id, missatge: 'noContesta' })}>No contesta…</Button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" onClick={() => setObert({ id: e.id, missatge: 'pregunta' })}>
                  <MessageCircle className="h-4 w-4" /> Preguntar
                </Button>
                <Button size="sm" variant="outline" onClick={() => setAplacant(aplacant === e.id ? null : e.id)}>Aplaçar…</Button>
                <Button size="sm" variant="ghost" onClick={() => accio(e.id, { accio: 'SI' })} disabled={busy === e.id}>Ja m’ha dit que sí</Button>
                <Button size="sm" variant="ghost" onClick={() => accio(e.id, { accio: 'NO' })} disabled={busy === e.id}>Ja m’ha dit que no</Button>
              </div>
            )}

            {aplacant === e.id && (
              <div className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 p-2">
                <span className="text-xs text-slate-500">Torna a sortir d’aquí a…</span>
                {[1, 3, 5, 7].map((d) => (
                  <Button key={d} size="sm" variant="outline" onClick={() => accio(e.id, { accio: 'APLACA', dies: d })} disabled={busy === e.id}>
                    {d === 1 ? '1 dia' : `${d} dies`}
                  </Button>
                ))}
              </div>
            )}
            {composer(e)}
          </div>
        ))}

        {aplacades.map((e) => (
          <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm">
            <span className="text-slate-600">
              <span className="font-medium">{e.habitacio ? `Hab. ${e.habitacio} · ` : ''}{titular(e)}</span>
              {e.aplacatFins && <span className="text-slate-400"> · aplaçat fins al {formatDate(e.aplacatFins)}</span>}
            </span>
            <Button size="sm" variant="ghost" onClick={() => accio(e.id, { accio: 'MOSTRA' })} disabled={busy === e.id}>Mostra ara</Button>
          </div>
        ))}

        {surtenDema.length > 0 && (
          <div className="space-y-2 pt-1">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <LogOut className="h-3.5 w-3.5" /> Surten demà
            </p>
            {surtenDema.map((e) => (
              <div key={e.id} className="space-y-2 rounded-lg border border-slate-200 p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-slate-800">
                    {e.habitacio ? `Hab. ${e.habitacio} · ` : ''}{titular(e)}
                  </span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setObert({ id: e.id, missatge: sortidaRecomanada(e) })}>
                      Recordatori de sortida
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => accio(e.id, { accio: 'RECORDATORI' })} disabled={busy === e.id}>Fet</Button>
                  </div>
                </div>
                {composer(e)}
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function MissatgeComposer({
  estada,
  inicial,
  onEnviat,
  onTanca,
}: {
  estada: EstadaAvisProrroga;
  inicial: MissatgeProrroga;
  onEnviat: (m: MissatgeProrroga) => void;
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
        sortida: dataLlarga(new Date(estada.dataSortida), l),
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

  return (
    <div className="space-y-2 rounded-lg bg-slate-50 p-3">
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
        <Button
          size="sm"
          disabled={!v}
          title={v ? undefined : 'Cap hoste adult amb telèfon'}
          onClick={() => { if (v && enviaWhatsApp(v.telefon, text, `${v.nom} ${v.cognom1}`)) onEnviat(missatge); }}
        >
          <MessageCircle className="h-4 w-4" /> Enviar per WhatsApp
        </Button>
        <Button size="sm" variant="ghost" onClick={onTanca}>Tancar</Button>
        {!v && <span className="text-xs text-slate-400">Cap hoste adult amb telèfon.</span>}
      </div>
    </div>
  );
}
