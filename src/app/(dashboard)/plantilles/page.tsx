'use client';

import { useEffect, useState } from 'react';
import { MessageCircle, Copy, Sparkles, Users, Phone, Hand } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { getJSON, patchJSON } from '@/lib/api';
import { addDays, toISODate } from '@/lib/dates';
import { formatDate } from '@/lib/utils';
import {
  fillTemplate,
  enviaWhatsApp,
  descriuTasques,
  tipusNetejaLabel,
  PLANTILLA_HOSTE,
  PLANTILLA_NETEJA,
  PLANTILLA_BENVINGUDA,
  PASILLO_TXT,
  PATI_TXT,
  VORERA_TXT,
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
  habitacio: { nom: string } | null;
  viatgers: { esTitular: boolean; huesped: { nom: string; cognom1: string; telefon: string | null } }[];
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
  return (
    <div>
      <PageHeader title="Plantilles" subtitle="Missatges de WhatsApp per a neteja i hostes (multiidioma)" />
      <div className="space-y-6">
        <MeuWhatsApp />
        <BenvingudaCard />
        <NetejaCard />
        <HostesCard />
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
  const [hora, setHora] = useState('11:00');
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
  useEffect(() => {
    const meves = tasques.filter((t) => t.assignadaA === treballador?.id);
    setMsg(
      fillTemplate(tpls[lang], {
        nom: treballador?.nom ?? '',
        data: formatDate(data),
        habitacions: descriuTasques(
          meves.map((t) => ({ habitacio: t.habitacio?.nom ?? null, tipus: t.tipus, notes: t.notes })),
          lang,
        ),
        pasillo: pasillo ? PASILLO_TXT[lang] : '',
        pati: pati ? PATI_TXT[lang] : '',
        vorera: vorera ? VORERA_TXT[lang] : '',
        hora: mostrarHora ? fillTemplate(HORA_NETEJA_TXT[lang], { hora }) : '',
      }),
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

  return (
    <Card>
      <CardHeader className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-brand-600" />
        <CardTitle>Avís a la dona de neteja</CardTitle>
      </CardHeader>
      <CardBody className="space-y-4">
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
          <Field label="Passadís">
            <label className="flex h-10 items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={pasillo} onChange={(e) => setPasillo(e.target.checked)} />
              Incloure el passadís
            </label>
          </Field>
          <Field label="Pati">
            <label className="flex h-10 items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={pati} onChange={(e) => setPati(e.target.checked)} />
              Incloure el pati
            </label>
          </Field>
          <Field label="Vorera">
            <label className="flex h-10 items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={vorera} onChange={(e) => setVorera(e.target.checked)} />
              Incloure la vorera
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
            onClick={() => enviaWhatsApp(treballador?.telefon, msg, treballador?.nom)}
          >
            <MessageCircle className="h-4 w-4" /> Enviar per WhatsApp
          </Button>
          <Button type="button" variant="outline" onClick={() => copia(msg)}>
            <Copy className="h-4 w-4" /> Copiar
          </Button>
        </div>

        <details className="text-sm">
          <summary className="cursor-pointer text-slate-500">Editar plantilla per defecte (per idioma)</summary>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-slate-500">Idioma:</span>
            <LangSelect value={editLang} onChange={setEditLang} className="max-w-40" />
          </div>
          <Textarea className="mt-2" rows={2} value={tpls[editLang]} onChange={(e) => saveTpl(e.target.value)} />
          <p className="mt-1 text-xs text-slate-400">
            Variables: {'{nom}'} {'{data}'} {'{habitacions}'} {'{pasillo}'} {'{pati}'} {'{vorera}'}{' '}
            {'{hora}'}. Es desa al navegador.
          </p>
        </details>
      </CardBody>
    </Card>
  );
}

// --- Plantilla per a hostes --------------------------------------------------
function HostesCard() {
  const [data, setData] = useState(toISODate(addDays(new Date(), 1)));
  const [estancies, setEstancies] = useState<Estancia[]>([]);
  const [hora, setHora] = useState('11:00');
  const [tpls, setTpls] = useState<Record<Lang, string>>(PLANTILLA_HOSTE);
  const [editLang, setEditLang] = useState<Lang>('ca');
  const [noms, setNoms] = useState<Record<string, string>>({});
  const [langs, setLangs] = useState<Record<string, Lang>>({});
  // Viatger triat per estada (índex). Per defecte, el primer amb telèfon.
  const [selIdx, setSelIdx] = useState<Record<string, number>>({});

  useEffect(() => {
    setTpls(loadTpls('hoste'));
    getJSON<{ estancies: Estancia[] }>('/api/estancies').then((r) => setEstancies(r.estancies));
  }, []);

  // Estades que cobreixen el dia de neteja triat (l'hoste hi és aquell dia).
  const delDia = estancies.filter(
    (e) =>
      toISODate(new Date(e.dataEntrada)) <= data && data <= toISODate(new Date(e.dataSortida)),
  );

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
    <Card>
      <CardHeader className="flex items-center gap-2">
        <Users className="h-4 w-4 text-brand-600" />
        <CardTitle>Avís als hostes (neteja)</CardTitle>
      </CardHeader>
      <CardBody className="space-y-4">
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
                  <div className="ml-auto flex gap-2 pb-0.5">
                    <Button
                      type="button"
                      size="sm"
                      disabled={!phone}
                      title={phone ? undefined : 'Aquest hoste no té telèfon'}
                      onClick={() => enviaWhatsApp(phone, msgFor(e), nomFor(e))}
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
      </CardBody>
    </Card>
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
    getJSON<{ estancies: Estancia[] }>('/api/estancies').then((r) => setEstancies(r.estancies));
  }, []);

  const avui = toISODate(new Date());
  // Hostes que ja han passat la PRIMERA NIT i encara hi són (entrada < avui ≤ sortida).
  const elegibles = estancies.filter(
    (e) => toISODate(new Date(e.dataEntrada)) < avui && avui <= toISODate(new Date(e.dataSortida)),
  );

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
    return fillTemplate(tpls[l], { nom, enllac: url });
  }

  return (
    <Card>
      <CardHeader className="flex items-center gap-2">
        <Hand className="h-4 w-4 text-brand-600" />
        <CardTitle>Benvinguda i valoració</CardTitle>
      </CardHeader>
      <CardBody className="space-y-4">
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
                  <span className="ml-auto">
                    <LangSelect value={langs[e.id] ?? 'ca'} onChange={(l) => setLangs({ ...langs, [e.id]: l })} />
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
                            onClick={() => enviaWhatsApp(phone, msgFor(e, nom), nom)}
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
      </CardBody>
    </Card>
  );
}
