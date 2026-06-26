'use client';

import { useEffect, useState } from 'react';
import { Trash2, Send, Clock, CheckCircle, XCircle, Plus, MessageCircle, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { getJSON, postJSON, delJSON, ApiError } from '@/lib/api';
import { buildBenvingudaWhatsApp, type LangEmail } from '@/lib/email-templates';

type Lang = LangEmail;
const LANGS = [
  { code: 'ca' as Lang, label: 'Català' },
  { code: 'es' as Lang, label: 'Castellà' },
  { code: 'en' as Lang, label: 'Anglès' },
  { code: 'fr' as Lang, label: 'Francès' },
];

interface EmailP {
  id: string;
  tipus: string;
  a: string;
  nomDestinatari: string | null;
  asumpte: string;
  programatPer: string;
  enviatAt: string | null;
  errorMsg: string | null;
}

function fmt(iso: string) {
  return new Intl.DateTimeFormat('ca-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));
}

function localDatetimeValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function waUrl(phone: string, text: string): string {
  const clean = phone.replace(/\s+/g, '').replace(/^00/, '+');
  const num = clean.startsWith('+') ? clean : `+34${clean}`;
  return `https://wa.me/${num.replace('+', '')}?text=${encodeURIComponent(text)}`;
}

export function EmailsPanel({
  estanciaId,
  titularNom,
  titularEmail,
  titularTelefon,
  habitacioNom,
  dataEntrada,
  dataSortida,
  idioma,
}: {
  estanciaId: string;
  titularNom: string;
  titularEmail: string | null;
  titularTelefon: string | null;
  habitacioNom: string | null;
  dataEntrada: string;
  dataSortida: string;
  idioma: string;
}) {
  const [emails, setEmails] = useState<EmailP[]>([]);
  const [form, setForm] = useState<'gracies' | 'benvinguda' | null>(null);
  const [canal, setCanal] = useState<'email' | 'whatsapp'>('email');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const defaultLang = (['ca', 'es', 'en', 'fr'].includes(idioma) ? idioma : 'ca') as Lang;
  const [a, setA] = useState(titularEmail ?? '');
  const [telefon, setTelefon] = useState(titularTelefon ?? '');
  const [nom, setNom] = useState(titularNom);
  const [lang, setLang] = useState<Lang>(defaultLang);
  const [programatPer, setProgramatPer] = useState('');
  const [enlacRessenya, setEnlacRessenya] = useState('https://g.page/r/hostalcoll/review');

  function load() {
    getJSON<{ emails: EmailP[] }>(`/api/emails-programats?estanciaId=${estanciaId}`)
      .then((r) => setEmails(r.emails))
      .catch(() => {});
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [estanciaId]);

  function openForm(tipus: 'gracies' | 'benvinguda') {
    setErr(null);
    setA(titularEmail ?? '');
    setTelefon(titularTelefon ?? '');
    setNom(titularNom);
    setLang(defaultLang);
    setCanal('email');
    if (tipus === 'gracies') {
      const d = new Date(dataSortida);
      d.setDate(d.getDate() + 1);
      d.setHours(12, 0, 0, 0);
      setProgramatPer(localDatetimeValue(d));
    } else {
      const d = new Date(dataEntrada);
      d.setHours(9, 0, 0, 0);
      setProgramatPer(localDatetimeValue(d));
    }
    setForm(tipus);
  }

  function openWhatsApp() {
    const text = buildBenvingudaWhatsApp(lang, {
      nom: nom || titularNom,
      habitacio: habitacioNom ?? '',
    });
    window.open(waUrl(telefon, text), '_blank');
  }

  async function submit() {
    if (!a || !programatPer) { setErr('Omple correu i hora'); return; }
    setSaving(true);
    setErr(null);
    try {
      await postJSON('/api/emails-programats', {
        estanciaId,
        tipus: form,
        a,
        nomDestinatari: nom,
        lang,
        programatPer: new Date(programatPer).toISOString(),
        enlacRessenya: form === 'gracies' ? enlacRessenya : undefined,
        habitacio: form === 'benvinguda' ? (habitacioNom ?? '') : undefined,
      });
      setForm(null);
      load();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Error');
    } finally {
      setSaving(false);
    }
  }

  async function cancel(id: string) {
    try {
      await delJSON(`/api/emails-programats/${id}`);
      load();
    } catch { /* ignore */ }
  }

  const tipusLabel = (t: string) => t === 'gracies' ? 'Gràcies + ressenya' : 'Benvinguda';

  return (
    <div className="space-y-4">
      {/* Botons per programar */}
      {form === null && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => openForm('benvinguda')}>
            <Plus className="h-4 w-4" /> Benvinguda
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => openForm('gracies')}>
            <Plus className="h-4 w-4" /> Email de gràcies
          </Button>
        </div>
      )}

      {/* Formulari */}
      {form !== null && (
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-4">
          <p className="mb-3 text-sm font-semibold text-brand-800">
            {tipusLabel(form)}
          </p>

          {/* Selector de canal (només per a benvinguda) */}
          {form === 'benvinguda' && (
            <div className="mb-3 flex gap-2">
              <button
                type="button"
                onClick={() => setCanal('email')}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  canal === 'email'
                    ? 'border-brand-600 bg-brand-600 text-white'
                    : 'border-slate-300 bg-white text-slate-600 hover:border-brand-400'
                }`}
              >
                <Mail className="h-3.5 w-3.5" /> Email
              </button>
              <button
                type="button"
                onClick={() => setCanal('whatsapp')}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  canal === 'whatsapp'
                    ? 'border-green-600 bg-green-600 text-white'
                    : 'border-slate-300 bg-white text-slate-600 hover:border-green-400'
                }`}
              >
                <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
              </button>
            </div>
          )}

          {canal === 'whatsapp' && form === 'benvinguda' ? (
            /* Formulari WhatsApp */
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Telèfon">
                <Input
                  type="tel"
                  value={telefon}
                  onChange={(e) => setTelefon(e.target.value)}
                  placeholder="+34 666 123 456"
                />
              </Field>
              <Field label="Nom">
                <Input value={nom} onChange={(e) => setNom(e.target.value)} />
              </Field>
              <Field label="Idioma">
                <Select value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
                  {LANGS.map((l) => (
                    <option key={l.code} value={l.code}>{l.label}</option>
                  ))}
                </Select>
              </Field>
            </div>
          ) : (
            /* Formulari Email */
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Correu destinatari">
                <Input type="email" value={a} onChange={(e) => setA(e.target.value)} />
              </Field>
              <Field label="Nom">
                <Input value={nom} onChange={(e) => setNom(e.target.value)} />
              </Field>
              <Field label="Idioma">
                <Select value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
                  {LANGS.map((l) => (
                    <option key={l.code} value={l.code}>{l.label}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Enviar el">
                <Input
                  type="datetime-local"
                  value={programatPer}
                  onChange={(e) => setProgramatPer(e.target.value)}
                />
              </Field>
              {form === 'gracies' && (
                <Field label="Enllaç ressenya Google" className="sm:col-span-2">
                  <Input value={enlacRessenya} onChange={(e) => setEnlacRessenya(e.target.value)} />
                </Field>
              )}
            </div>
          )}

          {err && <p className="mt-2 text-xs text-red-600">{err}</p>}
          <div className="mt-3 flex gap-2">
            {canal === 'whatsapp' && form === 'benvinguda' ? (
              <Button
                type="button"
                size="sm"
                onClick={openWhatsApp}
                disabled={!telefon}
                className="bg-green-600 hover:bg-green-700 text-white border-green-600"
              >
                <MessageCircle className="h-4 w-4" /> Obrir WhatsApp
              </Button>
            ) : (
              <Button type="button" size="sm" onClick={submit} disabled={saving}>
                <Send className="h-4 w-4" /> {saving ? 'Desant…' : 'Programar'}
              </Button>
            )}
            <Button type="button" size="sm" variant="outline" onClick={() => setForm(null)}>
              Cancel·lar
            </Button>
          </div>
        </div>
      )}

      {/* Llista d'emails programats */}
      {emails.length === 0 && form === null && (
        <p className="text-sm text-slate-400">Cap email programat per a aquesta estada.</p>
      )}
      {emails.map((e) => (
        <div
          key={e.id}
          className={`flex items-start gap-3 rounded-lg border px-3 py-2 ${
            e.enviatAt
              ? 'border-green-200 bg-green-50'
              : e.errorMsg
                ? 'border-red-200 bg-red-50'
                : 'border-slate-200 bg-white'
          }`}
        >
          <div className="mt-0.5">
            {e.enviatAt ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : e.errorMsg ? (
              <XCircle className="h-4 w-4 text-red-500" />
            ) : (
              <Clock className="h-4 w-4 text-amber-500" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              {tipusLabel(e.tipus)}
              {e.enviatAt && (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                  Enviat
                </span>
              )}
              <span className="font-normal text-slate-500">{e.a}</span>
            </p>
            <p className="text-xs text-slate-500">
              {e.enviatAt
                ? `${fmt(e.enviatAt)}`
                : e.errorMsg
                  ? `Error: ${e.errorMsg}`
                  : `Programat per ${fmt(e.programatPer)}`}
            </p>
          </div>
          {!e.enviatAt && (
            <button
              onClick={() => cancel(e.id)}
              title="Cancel·lar"
              className="shrink-0 text-slate-400 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
