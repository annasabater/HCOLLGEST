'use client';

import { useEffect, useState } from 'react';
import { MessageCircle, Copy, Sparkles, Users, Phone, Hand, Mail, CheckCircle, RotateCcw } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { Card, CardBody } from '@/components/ui/card';
import { CollapsibleCard } from '@/components/ui/collapsible-card';
import { getJSON, patchJSON, postJSON, ApiError } from '@/lib/api';
import { buildGraciesEmail } from '@/lib/email-templates';
import { useRestringit } from '@/components/layout/restringit-context';
import { addDays, toISODate } from '@/lib/dates';
import { formatDate } from '@/lib/utils';
import {
  fillTemplate,
  enviaWhatsApp,
  descriuTasques,
  tipusNetejaLabel,
  netejaLinies,
  zonesComunesTxt,
  PLANTILLA_HOSTE,
  PLANTILLA_NETEJA,
  PLANTILLA_BENVINGUDA,
  PLANTILLA_GRACIES,
  HORA_NETEJA_TXT,
  LANGS,
  type Lang,
} from '@/lib/plantilles';

interface Treballador {
  id: string;
  nom: string;
  telefon: string | null;
}
interface Tasca {
  id: string;
  habitacio: { nom: string } | null;
  tipus: 'CANVI_COMPLET' | 'REPAS';
  notes: string | null;
  assignadaA: string | null;
}
interface Estancia {
  id: string;
  dataEntrada: string;
  dataSortida: string;
  idioma: string | null;
  benvingudaEnviada?: boolean;
  habitacio: { nom: string } | null;
  viatgers: { esTitular: boolean; huesped: { nom: string; cognom1: string; telefon: string | null; email: string | null } }[];
}

function lsGet(key: string, def: string): string {
  if (typeof window === 'undefined') return def;
  return window.localStorage.getItem(key) ?? def;
}
function loadTpls(kind: 'hoste' | 'neteja' | 'benvinguda'): Record<Lang, string> {
  const base =
    kind === 'hoste'
      ? PLANTILLA_HOSTE
      : kind === 'benvinguda'
        ? PLANTILLA_BENVINGUDA
        : PLANTILLA_NETEJA;
  const out = { ...base };
  (Object.keys(base) as Lang[]).forEach((l) => {
    out[l] = lsGet(`plantilla_${kind}_${l}`, base[l]);
  });
  return out;
}
function copia(text: string) {
  navigator.clipboard?.writeText(text);
}

// ── Estat "enviat" dels avisos de neteja (persistent al navegador) ────────────
// Claus per dia: una per al missatge a la dona de neteja i una per hoste/habitació.
const AVIS_NETEJA_KEY = (data: string, treballadorId: string) => `avis_neteja_enviat:${data}:${treballadorId}`;
const AVIS_HOSTE_KEY = (data: string, habitacio: string) => `avis_hoste_neteja:${data}:${habitacio}`;
const AVIS_EVENT = 'avis-neteja-canvi';

function marcaAvis(key: string) {
  try {
    const d = new Date();
    window.localStorage.setItem(key, `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`);
    window.dispatchEvent(new Event(AVIS_EVENT));
  } catch { /* localStorage no disponible */ }
}
function llegeixAvis(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Badge verd "Enviat DD/MM". */
function EnviatBadge({ quan }: { quan: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-green-300 bg-green-50 px-2 py-1.5 text-xs font-medium text-green-700">
      <CheckCircle className="h-3.5 w-3.5 shrink-0" /> Enviat {quan}
    </span>
  );
}

function LangSelect({ value, onChange, className }: { value: Lang; onChange: (l: Lang) => void; className?: string }) {
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value as Lang)} className={className}>
      {LANGS.map((l) => (
        <option key={l.code} value={l.code}>
          {l.label}
        </option>
      ))}
    </Select>
  );
}

export default function PlantillesPage() {
  const restringit = useRestringit();
  return (
    <div>
      <PageHeader title="Plantilles" subtitle="Missatges de WhatsApp per a neteja i hostes (multiidioma)" />
      <div className="space-y-6">
        <MeuWhatsApp />
        <BenvingudaCard />
        {!restringit && <NetejaCard />}
        <HostesCard />
        <GraciesCard />
      </div>
    </div>
  );
}

// --- El meu WhatsApp --------------------------------------------------------
function MeuWhatsApp() {
  const [num, setNum] = useState('687 558 248');
  useEffect(() => setNum(lsGet('meu_whatsapp', '687 558 248')), []);
  return (
    <Card>
      <CardBody className="flex flex-wrap items-center gap-3">
        <Phone className="h-4 w-4 text-brand-600" />
        <span className="text-sm text-slate-600">El meu WhatsApp (des d’on envio):</span>
        <Input
          className="max-w-44"
          value={num}
          onChange={(e) => {
            setNum(e.target.value);
            window.localStorage.setItem('meu_whatsapp', e.target.value);
          }}
        />
        <span className="text-xs text-slate-400">
          Els missatges s’obren al WhatsApp d’aquest telèfon i els envies tu manualment.
        </span>
      </CardBody>
    </Card>
  );
}

// --- Plantilla per a la dona de neteja --------------------------------------
function NetejaCard() {
  const [data, setData] = useState(toISODate(addDays(new Date(), 1)));
  const [treballadors, setTreballadors] = useState<Treballador[]>([]);
  const [treballadorId, setTreballadorId] = useState('');
  const [tasques, setTasques] = useState<Tasca[]>([]);
  const [pasillo, setPasillo] = useState(true);
  const [pati, setPati] = useState(false);
  const [vorera, setVorera] = useState(false);
  const [mostrarHora, setMostrarHora] = useState(false);
  const [hora, setHora] = useState('15:00');
  const [lang, setLang] = useState<Lang>('es');
  const [tpls, setTpls] = useState<Record<Lang, string>>(PLANTILLA_NETEJA);
  const [editLang, setEditLang] = useState<Lang>('es');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    setTpls(loadTpls('neteja'));
    getJSON<{ treballadors: Treballador[] }>('/api/treballadors').then((r) => {
      setTreballadors(r.treballadors);
      const tania = r.treballadors.find((t) => /neteja|tania/i.test(t.nom)) ?? r.treballadors[0];
      if (tania) setTreballadorId(tania.id);
    });
  }, []);

  useEffect(() => {
    getJSON<{ tasques: Tasca[] }>(`/api/tasques-neteja?desde=${data}&fins=${data}`).then((r) =>
      setTasques(r.tasques),
    );
  }, [data]);

  const treballador = treballadors.find((t) => t.id === treballadorId);
  // Només les habitacions assignades a la persona triada (el full diari les hi assigna).
  const tasquesPersona = tasques.filter((t) => t.assignadaA === treballadorId);

  // Estat "enviat" (persistent): del missatge a la neteja i dels avisos als hostes
  // de les habitacions d'aquest dia. S'actualitza quan s'envia des de l'altra targeta.
  const [enviatNeteja, setEnviatNeteja] = useState<string | null>(null);
  const [hostesAvisats, setHostesAvisats] = useState<Record<string, string>>({});
  useEffect(() => {
    const carrega = () => {
      setEnviatNeteja(llegeixAvis(AVIS_NETEJA_KEY(data, treballadorId)));
      const m: Record<string, string> = {};
      for (const t of tasques) {
        const hab = t.habitacio?.nom;
        if (!hab) continue;
        const v = llegeixAvis(AVIS_HOSTE_KEY(data, hab));
        if (v) m[hab] = v;
      }
      setHostesAvisats(m);
    };
    carrega();
    window.addEventListener(AVIS_EVENT, carrega);
    return () => window.removeEventListener(AVIS_EVENT, carrega);
  }, [data, treballadorId, tasques]);

  // Habitacions del missatge amb l'hoste encara per avisar.
  const habsPendents = [...new Set(tasquesPersona.map((t) => t.habitacio?.nom).filter((h): h is string => !!h))]
    .filter((h) => !hostesAvisats[h]);
  useEffect(() => {
    const meves = tasques.filter((t) => t.assignadaA === treballador?.id);
    setMsg(
      netejaLinies(
        fillTemplate(tpls[lang], {
          nom: treballador?.nom ?? '',
          data: formatDate(data),
          habitacions: descriuTasques(
            meves.map((t) => ({ habitacio: t.habitacio?.nom ?? null, tipus: t.tipus, notes: t.notes })),
            lang,
          ),
          // Zones comunes combinades en una sola frase ("También el pasillo, el patio y la acera.").
          zones: zonesComunesTxt(lang, { pasillo, pati, vorera }),
          // Compatibilitat amb plantilles desades antigues ({pasillo}{pati}{vorera}):
          // la frase combinada va al primer forat i els altres queden buits, així
          // MAI surt "También el pasillo. También el patio. També la acera.".
          pasillo: ` ${zonesComunesTxt(lang, { pasillo, pati, vorera })}`,
          pati: '',
          vorera: '',
          hora: mostrarHora ? fillTemplate(HORA_NETEJA_TXT[lang], { hora }) : '',
        }),
      ),
    );
  }, [tpls, lang, treballador, data, tasques, pasillo, pati, vorera, mostrarHora, hora]);

  // Canvia el tipus d'una habitació (salida/repàs) i ho desa a la tasca.
  async function setTipus(id: string, tipus: 'CANVI_COMPLET' | 'REPAS') {
    setTasques((prev) => prev.map((t) => (t.id === id ? { ...t, tipus } : t)));
    try {
      await patchJSON(`/api/tasques-neteja/${id}`, { tipus });
    } catch {
      /* canvi visual igualment al missatge */
    }
  }

  function saveTpl(v: string) {
    setTpls((prev) => ({ ...prev, [editLang]: v }));
    window.localStorage.setItem(`plantilla_neteja_${editLang}`, v);
  }

  // Torna a la plantilla per defecte (esborra la versió guardada al navegador).
  function restaurar() {
    window.localStorage.removeItem(`plantilla_neteja_${editLang}`);
    setTpls((prev) => ({ ...prev, [editLang]: PLANTILLA_NETEJA[editLang] }));
  }

  return (
    <CollapsibleCard title="Avís a la dona de neteja" icon={<Sparkles className="h-4 w-4 text-brand-600" />}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Dia a netejar">
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </Field>
          <Field label="Enviar a">
            <Select value={treballadorId} onChange={(e) => setTreballadorId(e.target.value)}>
              {treballadors.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nom} {t.telefon ? `(${t.telefon})` : '(sense telèfon)'}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Idioma">
            <LangSelect value={lang} onChange={setLang} />
          </Field>
          <Field label="Zones comunes">
            <label className="flex h-10 items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={pasillo && pati && vorera}
                onChange={(e) => { setPasillo(e.target.checked); setPati(e.target.checked); setVorera(e.target.checked); }}
              />
              Passadís, vorera i pati
            </label>
          </Field>
          <Field label="Hora aproximada">
            <div className="flex h-10 items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={mostrarHora}
                onChange={(e) => setMostrarHora(e.target.checked)}
              />
              <Input
                type="time"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                disabled={!mostrarHora}
                className="max-w-32"
              />
            </div>
          </Field>
        </div>

        {/* Habitacions assignades a la persona aquest dia: salida (a fons) o repàs */}
        {tasquesPersona.length === 0 ? (
          <p className="text-xs text-slate-500">
            Cap habitació assignada a {treballador?.nom ?? 'aquesta persona'} aquest dia. Assigna-les
            al full diari de Neteja.
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-500">
              Tipus de neteja per habitació (determina la tarifa):
            </p>
            {tasquesPersona.map((t) => (
              <div key={t.id} className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2">
                <span className="w-28 text-sm text-slate-700">Habitació {t.habitacio?.nom ?? '?'}</span>
                <Select
                  className="max-w-52"
                  value={t.tipus}
                  onChange={(e) => setTipus(t.id, e.target.value as 'CANVI_COMPLET' | 'REPAS')}
                >
                  <option value="CANVI_COMPLET">{tipusNetejaLabel('CANVI_COMPLET', lang)}</option>
                  <option value="REPAS">{tipusNetejaLabel('REPAS', lang)}</option>
                </Select>
                {t.notes && <span className="text-xs text-slate-500">· {t.notes}</span>}
              </div>
            ))}
          </div>
        )}

        <Field label="Missatge" hint="Es genera amb les tasques del dia; edita’l si cal.">
          <Textarea rows={3} value={msg} onChange={(e) => setMsg(e.target.value)} />
        </Field>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            disabled={!msg}
            onClick={() => {
              if (enviaWhatsApp(treballador?.telefon, msg, treballador?.nom)) {
                marcaAvis(AVIS_NETEJA_KEY(data, treballadorId));
              }
            }}
          >
            <MessageCircle className="h-4 w-4" /> Enviar per WhatsApp
          </Button>
          {enviatNeteja && <EnviatBadge quan={enviatNeteja} />}
          <Button type="button" variant="outline" onClick={() => copia(msg)}>
            <Copy className="h-4 w-4" /> Copiar
          </Button>
        </div>

        {/* Recordatori: hostes de les habitacions del dia pendents d'avisar */}
        {habsPendents.length > 0 && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <Users className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Recorda avisar també {habsPendents.length === 1 ? "l'hoste de l'habitació" : 'els hostes de les habitacions'}{' '}
              <strong>{habsPendents.join(', ')}</strong> — ho pots fer a la targeta «Avís als hostes (neteja)» aquí sota.
            </p>
          </div>
        )}
        {habsPendents.length === 0 && Object.keys(hostesAvisats).length > 0 && (
          <p className="flex items-center gap-1.5 text-xs font-medium text-green-700">
            <CheckCircle className="h-3.5 w-3.5" /> Tots els hostes de les habitacions d&apos;aquest dia ja estan avisats.
          </p>
        )}

        <details className="text-sm">
          <summary className="cursor-pointer text-slate-500">Editar plantilla per defecte (per idioma)</summary>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-slate-500">Idioma:</span>
            <LangSelect value={editLang} onChange={setEditLang} className="max-w-40" />
          </div>
          <Textarea className="mt-2" rows={2} value={tpls[editLang]} onChange={(e) => saveTpl(e.target.value)} />
          <div className="mt-1 flex items-center justify-between gap-2">
            <p className="text-xs text-slate-400">
              Variables: {'{nom}'} {'{data}'} {'{habitacions}'} {'{pasillo}'} {'{pati}'} {'{vorera}'}{' '}
              {'{hora}'}. Es desa al navegador.
            </p>
            <Button type="button" variant="ghost" size="sm" onClick={restaurar}>
              <RotateCcw className="h-3.5 w-3.5" /> Restaurar per defecte
            </Button>
          </div>
        </details>
      </div>
    </CollapsibleCard>
  );
}

// --- Plantilla per a hostes --------------------------------------------------
function HostesCard() {
  const [data, setData] = useState(toISODate(addDays(new Date(), 1)));
  const [estancies, setEstancies] = useState<Estancia[]>([]);
  const [hora, setHora] = useState('15:00');
  const [tpls, setTpls] = useState<Record<Lang, string>>(PLANTILLA_HOSTE);
  const [editLang, setEditLang] = useState<Lang>('ca');
  const [noms, setNoms] = useState<Record<string, string>>({});
  const [langs, setLangs] = useState<Record<string, Lang>>({});
  // Viatger triat per estada (índex). Per defecte, el primer amb telèfon.
  const [selIdx, setSelIdx] = useState<Record<string, number>>({});

  useEffect(() => {
    setTpls(loadTpls('hoste'));
    getJSON<{ estancies: Estancia[] }>('/api/estancies').then((r) => {
      setEstancies(r.estancies);
      const defaults: Record<string, Lang> = {};
      r.estancies.forEach((e) => {
        if (e.idioma && ['ca', 'es', 'en', 'fr'].includes(e.idioma)) {
          defaults[e.id] = e.idioma as Lang;
        }
      });
      setLangs(defaults);
    });
  }, []);

  // Estades que cobreixen el dia de neteja triat (l'hoste hi és aquell dia).
  const delDia = estancies.filter(
    (e) =>
      toISODate(new Date(e.dataEntrada)) <= data && data <= toISODate(new Date(e.dataSortida)),
  );

  // Avisos ja enviats per habitació (persistent; sincronitzat amb el recordatori
  // de la targeta de neteja via l'event AVIS_EVENT).
  const [avisats, setAvisats] = useState<Record<string, string>>({});
  useEffect(() => {
    const carrega = () => {
      const m: Record<string, string> = {};
      estancies.forEach((e) => {
        const hab = e.habitacio?.nom;
        if (!hab) return;
        const v = llegeixAvis(AVIS_HOSTE_KEY(data, hab));
        if (v) m[hab] = v;
      });
      setAvisats(m);
    };
    carrega();
    window.addEventListener(AVIS_EVENT, carrega);
    return () => window.removeEventListener(AVIS_EVENT, carrega);
  }, [data, estancies]);

  function travelerIdx(e: Estancia): number {
    const s = selIdx[e.id];
    if (s != null) return s;
    const ambTel = e.viatgers.findIndex((v) => v.huesped.telefon);
    if (ambTel >= 0) return ambTel;
    const tit = e.viatgers.findIndex((v) => v.esTitular);
    return tit >= 0 ? tit : 0;
  }
  function selectedHuesped(e: Estancia) {
    return e.viatgers[travelerIdx(e)]?.huesped ?? e.viatgers[0]?.huesped ?? null;
  }
  function nomFor(e: Estancia): string {
    return noms[e.id] ?? selectedHuesped(e)?.nom ?? '';
  }

  function saveTpl(v: string) {
    setTpls((prev) => ({ ...prev, [editLang]: v }));
    window.localStorage.setItem(`plantilla_hoste_${editLang}`, v);
  }

  function msgFor(e: Estancia): string {
    const l = langs[e.id] ?? 'ca';
    return fillTemplate(tpls[l], {
      nom: nomFor(e),
      hora,
      habitacio: e.habitacio?.nom ?? '',
    });
  }

  return (
    <CollapsibleCard title="Avís als hostes (neteja)" icon={<Users className="h-4 w-4 text-brand-600" />}>
      <div className="space-y-4">
        <div className="grid max-w-md gap-3 sm:grid-cols-2">
          <Field label="Dia a netejar">
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </Field>
          <Field label="Hora aproximada">
            <Input value={hora} onChange={(e) => setHora(e.target.value)} />
          </Field>
        </div>

        {delDia.length === 0 ? (
          <p className="text-sm text-slate-400">Cap hoste allotjat el {formatDate(data)}.</p>
        ) : (
          <div className="space-y-2">
            {delDia.map((e) => {
              const h = selectedHuesped(e);
              const phone = h?.telefon ?? null;
              const multiple = e.viatgers.length > 1;
              return (
                <div key={e.id} className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 p-2">
                  {multiple && (
                    <Field label="Hoste" className="w-48">
                      <Select
                        value={String(travelerIdx(e))}
                        onChange={(ev) => {
                          const i = Number(ev.target.value);
                          setSelIdx({ ...selIdx, [e.id]: i });
                          setNoms({ ...noms, [e.id]: e.viatgers[i]?.huesped.nom ?? '' });
                        }}
                      >
                        {e.viatgers.map((v, i) => (
                          <option key={i} value={i}>
                            {v.huesped.nom} {v.huesped.cognom1}
                            {v.huesped.telefon ? '' : ' (sense tel.)'}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  )}
                  <Field label="Nom" className="w-36">
                    <Input
                      value={nomFor(e)}
                      onChange={(ev) => setNoms({ ...noms, [e.id]: ev.target.value })}
                    />
                  </Field>
                  <Field label="Idioma" className="w-32">
                    <LangSelect value={langs[e.id] ?? 'ca'} onChange={(l) => setLangs({ ...langs, [e.id]: l })} />
                  </Field>
                  <span className="pb-2 text-xs text-slate-400">
                    {e.habitacio ? `Hab. ${e.habitacio.nom} · ` : ''}
                    {phone ?? 'sense telèfon'}
                  </span>
                  <div className="ml-auto flex items-center gap-2 pb-0.5">
                    {e.habitacio?.nom && avisats[e.habitacio.nom] && (
                      <EnviatBadge quan={avisats[e.habitacio.nom]!} />
                    )}
                    <Button
                      type="button"
                      size="sm"
                      disabled={!phone}
                      title={phone ? undefined : 'Aquest hoste no té telèfon'}
                      onClick={() => {
                        if (enviaWhatsApp(phone, msgFor(e), nomFor(e)) && e.habitacio?.nom) {
                          marcaAvis(AVIS_HOSTE_KEY(data, e.habitacio.nom));
                        }
                      }}
                    >
                      <MessageCircle className="h-4 w-4" /> WhatsApp
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => copia(msgFor(e))}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <details className="text-sm">
          <summary className="cursor-pointer text-slate-500">Editar plantilla per defecte (per idioma)</summary>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-slate-500">Idioma:</span>
            <LangSelect value={editLang} onChange={setEditLang} className="max-w-40" />
          </div>
          <Textarea className="mt-2" rows={2} value={tpls[editLang]} onChange={(e) => saveTpl(e.target.value)} />
          <p className="mt-1 text-xs text-slate-400">
            Variables: {'{nom}'} {'{hora}'} {'{habitacio}'}. Es desa al navegador.
          </p>
        </details>
      </div>
    </CollapsibleCard>
  );
}

// --- Email de gràcies + ressenya Google (l'endemà de la sortida) -------------
function GraciesCard() {
  const [estancies, setEstancies] = useState<Estancia[]>([]);
  const [enlacRessenya, setEnlacRessenya] = useState('https://g.page/r/CRX-Sb9SNVzJEBM/review');
  const [editLang, setEditLang] = useState<Lang>('ca');
  const [scheduling, setScheduling] = useState<Record<string, boolean>>({});
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [errs, setErrs] = useState<Record<string, string>>({});

  useEffect(() => {
    setEnlacRessenya(lsGet('enlac_ressenya', 'https://g.page/r/CRX-Sb9SNVzJEBM/review'));
    getJSON<{ estancies: Estancia[] }>('/api/estancies').then((r) => setEstancies(r.estancies));
  }, []);

  function setLink(v: string) {
    setEnlacRessenya(v);
    window.localStorage.setItem('enlac_ressenya', v);
  }

  const avui = toISODate(new Date());
  const fa3dies = toISODate(addDays(new Date(), -3));
  const elegibles = estancies.filter((e) => {
    const sortida = toISODate(new Date(e.dataSortida));
    return sortida >= fa3dies && sortida <= avui;
  });

  async function programar(e: Estancia) {
    const titular = e.viatgers.find((v) => v.esTitular) ?? e.viatgers[0];
    const email = titular?.huesped.email;
    if (!email) { setErrs((p) => ({ ...p, [e.id]: 'Sense correu' })); return; }
    const lang: Lang = (e.idioma && (['ca', 'es', 'en', 'fr'] as string[]).includes(e.idioma))
      ? (e.idioma as Lang) : 'ca';
    const d = addDays(new Date(e.dataSortida), 1);
    d.setHours(12, 0, 0, 0);
    setScheduling((p) => ({ ...p, [e.id]: true }));
    setErrs((p) => ({ ...p, [e.id]: '' }));
    try {
      await postJSON('/api/emails-programats', {
        estanciaId: e.id, tipus: 'gracies', a: email,
        nomDestinatari: titular?.huesped.nom, lang,
        programatPer: d.toISOString(), enlacRessenya,
      });
      setDone((p) => ({ ...p, [e.id]: true }));
    } catch (ex) {
      setErrs((p) => ({ ...p, [e.id]: ex instanceof ApiError ? ex.message : 'Error' }));
    } finally {
      setScheduling((p) => ({ ...p, [e.id]: false }));
    }
  }

  return (
    <CollapsibleCard title="Email de gràcies + ressenya Google" icon={<Mail className="h-4 w-4 text-brand-600" />}>
      <div className="space-y-4">
        <Field label="Enllaç ressenya Google" hint="Es desa al navegador.">
          <Input value={enlacRessenya} onChange={(e) => setLink(e.target.value)} />
        </Field>

        {elegibles.length === 0 ? (
          <p className="text-sm text-slate-400">Cap hoste amb sortida recent (últims 3 dies).</p>
        ) : (
          <div className="space-y-2">
            {elegibles.map((e) => {
              const titular = e.viatgers.find((v) => v.esTitular) ?? e.viatgers[0];
              const email = titular?.huesped.email;
              const phone = titular?.huesped.telefon;
              const lang: Lang = (e.idioma && (['ca', 'es', 'en', 'fr'] as string[]).includes(e.idioma))
                ? (e.idioma as Lang) : 'ca';
              const waMsg = fillTemplate(PLANTILLA_GRACIES[lang], {
                nom: titular?.huesped.nom ?? '',
                enllac: enlacRessenya,
              });
              return (
                <div key={e.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 p-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700">
                      {titular?.huesped.nom} {titular?.huesped.cognom1}
                      {e.habitacio ? <span className="ml-1 text-xs font-normal text-slate-400">· Hab. {e.habitacio.nom}</span> : null}
                    </p>
                    <p className="text-xs text-slate-400">
                      Sortida {formatDate(e.dataSortida)} · {email ?? <span className="text-red-400">sense correu</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="whitespace-nowrap"
                      disabled={!phone}
                      title={phone ? undefined : 'Aquest hoste no té telèfon'}
                      onClick={() => enviaWhatsApp(phone, waMsg, titular?.huesped.nom)}
                    >
                      <MessageCircle className="h-4 w-4" /> WhatsApp
                    </Button>
                    {done[e.id] ? (
                      <span className="flex items-center gap-1 text-xs text-green-600">
                        <CheckCircle className="h-3.5 w-3.5" /> Programat per demà 12:00
                      </span>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        disabled={!email || scheduling[e.id]}
                        title={email ? undefined : 'Aquest hoste no té correu electrònic'}
                        onClick={() => programar(e)}
                      >
                        <Mail className="h-4 w-4" />
                        {scheduling[e.id] ? 'Desant…' : 'Programar email'}
                      </Button>
                    )}
                    {errs[e.id] && <span className="text-xs text-red-600">{errs[e.id]}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <details className="text-sm">
          <summary className="cursor-pointer text-slate-500">Previsualitzar plantilles (per idioma)</summary>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-slate-500">Idioma:</span>
            <LangSelect value={editLang} onChange={setEditLang} className="max-w-40" />
          </div>

          <p className="mt-2 text-xs text-slate-400">
            «{'{nom}'}» s’omple automàticament amb el nom de cada hoste. Aquí es mostra un exemple.
          </p>

          {/* Missatge de WhatsApp de gràcies (amb l'enllaç de ressenya) */}
          <div className="mt-3">
            <p className="mb-1 text-xs font-medium text-slate-500">WhatsApp de gràcies</p>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 whitespace-pre-wrap">
              {fillTemplate(PLANTILLA_GRACIES[editLang], { nom: '[nom de l’hoste]', enllac: enlacRessenya })}
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-2"
              onClick={() => copia(fillTemplate(PLANTILLA_GRACIES[editLang], { nom: '[nom de l’hoste]', enllac: enlacRessenya }))}
            >
              <Copy className="h-4 w-4" /> Copiar WhatsApp
            </Button>
          </div>

          {/* Previsualització del correu */}
          <p className="mb-1 mt-3 text-xs font-medium text-slate-500">Correu de gràcies</p>
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <iframe
              srcDoc={buildGraciesEmail(editLang, { nom: '[nom de l’hoste]', enlacRessenya }).html}
              className="h-72 w-full"
              title="Previsualització email de gràcies"
            />
          </div>
        </details>
      </div>
    </CollapsibleCard>
  );
}

// --- Plantilla de benvinguda + valoració (després de la primera nit) ---------
function BenvingudaCard() {
  const [estancies, setEstancies] = useState<Estancia[]>([]);
  const [enllac, setEnllac] = useState('https://hostalcoll.com/benvinguda.html');
  const [tpls, setTpls] = useState<Record<Lang, string>>(PLANTILLA_BENVINGUDA);
  const [editLang, setEditLang] = useState<Lang>('ca');
  const [noms, setNoms] = useState<Record<string, string>>({}); // clau: `${estadaId}:${i}`
  const [langs, setLangs] = useState<Record<string, Lang>>({}); // idioma per estada

  useEffect(() => {
    setTpls(loadTpls('benvinguda'));
    setEnllac(lsGet('enllac_benvinguda', 'https://hostalcoll.com/benvinguda.html'));
    getJSON<{ estancies: Estancia[] }>('/api/estancies').then((r) => {
      setEstancies(r.estancies);
      const defaults: Record<string, Lang> = {};
      r.estancies.forEach((e) => {
        if (e.idioma && ['ca', 'es', 'en', 'fr'].includes(e.idioma)) {
          defaults[e.id] = e.idioma as Lang;
        }
      });
      setLangs(defaults);
    });
  }, []);

  const avui = toISODate(new Date());
  // Hostes que ja han passat la PRIMERA NIT i encara hi són, que NO tenen la
  // benvinguda marcada com a enviada i que no fa més de 3 dies que van entrar.
  const elegibles = estancies.filter((e) => {
    const entrada = toISODate(new Date(e.dataEntrada));
    const sortida = toISODate(new Date(e.dataSortida));
    const limit3dies = toISODate(addDays(new Date(e.dataEntrada), 3));
    return (
      !e.benvingudaEnviada &&
      entrada < avui &&
      avui <= sortida &&
      avui <= limit3dies
    );
  });

  // Marca la benvinguda com a enviada perquè l'estada deixi de sortir a la llista.
  async function marcarEnviada(id: string) {
    setEstancies((prev) => prev.map((e) => (e.id === id ? { ...e, benvingudaEnviada: true } : e)));
    try {
      await patchJSON(`/api/estancies/${id}`, { benvingudaEnviada: true });
    } catch {
      /* el canvi visual ja s'ha aplicat */
    }
  }

  function saveTpl(v: string) {
    setTpls((prev) => ({ ...prev, [editLang]: v }));
    window.localStorage.setItem(`plantilla_benvinguda_${editLang}`, v);
  }
  function setLink(v: string) {
    setEnllac(v);
    window.localStorage.setItem('enllac_benvinguda', v);
  }
  function msgFor(e: Estancia, nom: string): string {
    const l = langs[e.id] ?? 'ca';
    let url = `${enllac}${enllac.includes('?') ? '&' : '?'}lang=${l}`;
    if (nom) url += `&g=${encodeURIComponent(nom)}`;
    if (e.habitacio?.nom) url += `&r=${encodeURIComponent(e.habitacio.nom)}`;
    url += `&e=${encodeURIComponent(e.id)}`; // estanciaId: lliga la valoració a l'estada
    return fillTemplate(tpls[l], { nom, enllac: url });
  }

  return (
    <CollapsibleCard title="Benvinguda i valoració" icon={<Hand className="h-4 w-4 text-brand-600" />}>
      <div className="space-y-4">
        <Field label="Enllaç de benvinguda" hint="La pàgina que reben els hostes. Es desa al navegador.">
          <Input value={enllac} onChange={(e) => setLink(e.target.value)} />
        </Field>

        {elegibles.length === 0 ? (
          <p className="text-sm text-slate-400">Cap hoste que hagi passat la primera nit ara mateix.</p>
        ) : (
          <div className="space-y-3">
            {elegibles.map((e) => (
              <div key={e.id} className="rounded-lg border border-slate-200 p-3">
                <div className="mb-2 flex flex-wrap items-center gap-2 text-sm font-medium text-slate-700">
                  <span>{e.habitacio ? `Habitació ${e.habitacio.nom}` : 'Sense habitació'}</span>
                  <span className="text-xs font-normal text-slate-400">
                    {formatDate(e.dataEntrada)} – {formatDate(e.dataSortida)}
                  </span>
                  <span className="ml-auto flex items-center gap-2">
                    <LangSelect value={langs[e.id] ?? 'ca'} onChange={(l) => setLangs({ ...langs, [e.id]: l })} />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="shrink-0 whitespace-nowrap"
                      title="Marcar la benvinguda com a enviada (deixarà de sortir)"
                      onClick={() => marcarEnviada(e.id)}
                    >
                      <CheckCircle className="h-4 w-4" /> Ja enviada
                    </Button>
                  </span>
                </div>
                <div className="space-y-1.5">
                  {e.viatgers.map((v, i) => {
                    const key = `${e.id}:${i}`;
                    const nom = noms[key] ?? v.huesped.nom;
                    const phone = v.huesped.telefon;
                    return (
                      <div key={key} className="flex flex-wrap items-center gap-2">
                        <Input
                          className="w-36"
                          value={nom}
                          onChange={(ev) => setNoms({ ...noms, [key]: ev.target.value })}
                        />
                        <span className="text-xs text-slate-400">
                          {v.esTitular ? 'Titular · ' : ''}
                          {phone ?? 'sense telèfon'}
                        </span>
                        <div className="ml-auto flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            disabled={!phone}
                            title={phone ? undefined : 'Aquest hoste no té telèfon'}
                            onClick={() => { if (enviaWhatsApp(phone, msgFor(e, nom), nom)) marcarEnviada(e.id); }}
                          >
                            <MessageCircle className="h-4 w-4" /> WhatsApp
                          </Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => copia(msgFor(e, nom))}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <details className="text-sm">
          <summary className="cursor-pointer text-slate-500">Editar plantilla per defecte (per idioma)</summary>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-slate-500">Idioma:</span>
            <LangSelect value={editLang} onChange={setEditLang} className="max-w-40" />
          </div>
          <Textarea className="mt-2" rows={3} value={tpls[editLang]} onChange={(e) => saveTpl(e.target.value)} />
          <p className="mt-1 text-xs text-slate-400">
            Variables: {'{nom}'} {'{enllac}'}. Es desa al navegador.
          </p>
        </details>
      </div>
    </CollapsibleCard>
  );
}
