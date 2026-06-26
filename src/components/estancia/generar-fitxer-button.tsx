'use client';

import { useCallback, useState } from 'react';
import { FileText, ShieldAlert, AlertTriangle } from 'lucide-react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import {
  optionsFrom,
  tipusPagamentFormValues,
  TIPUS_PAGAMENT_LABELS,
  tipusDocumentValues,
  TIPUS_DOCUMENT_LABELS,
  sexeValues,
  SEXE_LABELS,
} from '@/lib/validation/enums';

export interface FitxerNotice {
  tone: 'info' | 'error';
  msg: string;
}

interface PreviewViatger {
  huespedId: string;
  esTitular: boolean;
  esMenor: boolean;
  parentesc: string | null;
  nom: string;
  cognom1: string;
  cognom2: string;
  tipusDocument: string;
  numDocument: string;
  numSuport: string;
  dataExpedicio: string;
  sexe: string;
  dataNaixement: string;
  nacionalitat: string;
  telefon: string;
  email: string;
  adreca: string;
  pais: string;
  provincia: string;
  municipi: string;
  localitat: string;
  codiPostal: string;
}
interface Preview {
  establiment: { nom: string; fileIdentifier: string | null };
  contracte: {
    tipusRegistre: string;
    numContracte: string;
    anyContracte: number;
    dataFormalitzacio: string;
    dataEntrada: string;
    dataSortida: string;
  };
  viatgers: PreviewViatger[];
  esAmpliacio: boolean;
  errors: string[];
}

// Camps editables (clau → etiqueta). Els enums i les dates es tracten a part.
const TEXT_FIELDS: { key: keyof PreviewViatger; label: string; full?: boolean }[] = [
  { key: 'nom', label: 'Nom' },
  { key: 'cognom1', label: 'Primer cognom' },
  { key: 'cognom2', label: 'Segon cognom' },
  { key: 'numDocument', label: 'Número document' },
  { key: 'numSuport', label: 'Número suport' },
  { key: 'nacionalitat', label: 'Nacionalitat' },
  { key: 'telefon', label: 'Telèfon' },
  { key: 'email', label: 'Email' },
  { key: 'adreca', label: 'Adreça', full: true },
  { key: 'pais', label: 'País' },
  { key: 'provincia', label: 'Província' },
  { key: 'municipi', label: 'Municipi' },
  { key: 'localitat', label: 'Localitat' },
  { key: 'codiPostal', label: 'Codi postal' },
];
const EDITABLE_KEYS: (keyof PreviewViatger)[] = [
  ...TEXT_FIELDS.map((f) => f.key),
  'tipusDocument',
  'sexe',
  'dataExpedicio',
  'dataNaixement',
];

/**
 * Botó per generar el fitxer massiu de Mossos amb REVISIÓ + doble confirmació.
 * Mostra en TEXT CLAR tot el que s'enviaria (res xifrat), permet editar-ho i
 * triar si el canvi és només per a Mossos o també a la fitxa. NO envia res sol:
 * genera el .txt per pujar-lo manualment al portal.
 */
export function GenerarFitxerButton({
  estanciaId,
  label = 'Generar fitxer massiu',
  size = 'md',
  variant = 'primary',
  contracteLabel,
  onResult,
  onDone,
}: {
  estanciaId: string;
  label?: string;
  size?: ButtonProps['size'];
  variant?: ButtonProps['variant'];
  contracteLabel?: string;
  onResult?: (n: FitxerNotice) => void;
  onDone?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'review' | 'confirm'>('review');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [rows, setRows] = useState<PreviewViatger[]>([]);
  const [persist, setPersist] = useState<Record<string, boolean>>({});
  const [tipusPagament, setTipusPagament] = useState<string>('DESTINACIO');

  const obrir = useCallback(async () => {
    setOpen(true);
    setStep('review');
    setLoading(true);
    setPreview(null);
    try {
      const res = await fetch(`/api/estancies/${estanciaId}/fitxer/preview`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        onResult?.({ tone: 'error', msg: data.error ?? 'No s’ha pogut carregar la previsualització' });
        setOpen(false);
        return;
      }
      const data: Preview = await res.json();
      setPreview(data);
      setRows(data.viatgers.map((v) => ({ ...v })));
      setPersist({});
    } catch {
      onResult?.({ tone: 'error', msg: 'Error carregant la previsualització' });
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }, [estanciaId, onResult]);

  const setField = (huespedId: string, key: keyof PreviewViatger, value: string) =>
    setRows((prev) => prev.map((r) => (r.huespedId === huespedId ? { ...r, [key]: value } : r)));

  async function generar() {
    if (!preview) return;
    setBusy(true);
    try {
      // Només enviem els camps realment canviats com a override.
      const viatgers = rows.map((r) => {
        const orig = preview.viatgers.find((o) => o.huespedId === r.huespedId)!;
        const overrides: Record<string, string> = {};
        for (const k of EDITABLE_KEYS) {
          if (r[k] !== orig[k]) overrides[k] = String(r[k] ?? '');
        }
        return { huespedId: r.huespedId, overrides, persist: !!persist[r.huespedId] };
      });

      const res = await fetch(`/api/estancies/${estanciaId}/fitxer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipusPagament, viatgers }),
      });
      const ct = res.headers.get('Content-Type') ?? '';
      if (!res.ok || ct.includes('application/json')) {
        const data = await res.json().catch(() => ({}));
        onResult?.({ tone: 'error', msg: data.error ?? 'No s’ha pogut generar el fitxer' });
        return;
      }
      const blob = await res.blob();
      const disp = res.headers.get('Content-Disposition') ?? '';
      const name = /filename="([^"]+)"/.exec(disp)?.[1] ?? 'fitxer.txt';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
      onResult?.({ tone: 'info', msg: `Fitxer ${name} generat. Puja’l al portal de Mossos.` });
      onDone?.();
      setOpen(false);
    } catch {
      onResult?.({ tone: 'error', msg: 'Error generant el fitxer' });
    } finally {
      setBusy(false);
    }
  }

  const nViatgers = rows.length;

  return (
    <>
      <Button onClick={obrir} disabled={busy || loading} size={size} variant={variant}>
        <FileText className="h-4 w-4" /> {loading ? 'Carregant…' : label}
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-xl bg-white shadow-xl">
            {/* Capçalera */}
            <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4 text-brand-800">
              <ShieldAlert className="h-5 w-5 shrink-0" />
              <h2 className="text-lg font-semibold">
                {step === 'review' ? 'Revisa el que s’enviarà a Mossos' : 'Confirmació final'}
              </h2>
            </div>

            {loading || !preview ? (
              <div className="px-5 py-10 text-center text-sm text-slate-400">Carregant…</div>
            ) : step === 'review' ? (
              <>
                <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
                  <p className="text-sm text-slate-600">
                    Això és <strong>tot el que es comunicaria a la policia</strong>, en text clar.
                    Revisa-ho i edita el que calgui abans de generar el fitxer. Per cada viatger pots
                    triar si el canvi és <strong>només per a Mossos</strong> o <strong>també a la
                    fitxa</strong>. Aquesta app <strong>no envia res sol</strong>: genera el .txt per
                    pujar-lo manualment al portal.
                  </p>

                  {preview.errors.length > 0 && (
                    <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                      <p className="mb-1 flex items-center gap-2 font-medium">
                        <AlertTriangle className="h-4 w-4" /> Hi ha dades incompletes (caldrà corregir-les o el portal ho rebutjarà):
                      </p>
                      <ul className="ml-6 list-disc">
                        {preview.errors.map((e, i) => (
                          <li key={i}>{e}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Dades de l'operació (no editables aquí) */}
                  <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                    <span className="font-medium">{preview.establiment.nom}</span> · Contracte{' '}
                    {preview.contracte.numContracte}/{preview.contracte.anyContracte} ·{' '}
                    {preview.contracte.tipusRegistre === 'RESERVA' ? 'Reserva' : 'Contracte en curs'} ·
                    Entrada {preview.contracte.dataEntrada} · Sortida {preview.contracte.dataSortida}
                  </div>

                  <Field
                    label="Tipus de pagament a comunicar a Mossos"
                    hint="Per defecte «Pagament a destinació»."
                  >
                    <Select value={tipusPagament} onChange={(e) => setTipusPagament(e.target.value)}>
                      {optionsFrom(tipusPagamentFormValues, TIPUS_PAGAMENT_LABELS).map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  {/* Viatgers editables */}
                  {rows.map((v, idx) => (
                    <div key={v.huespedId} className="rounded-xl border border-slate-200 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-800">
                          Viatger {idx + 1}
                          {v.esTitular && <span className="ml-2 text-xs text-brand-700">· Titular</span>}
                          {v.esMenor && <span className="ml-2 text-xs text-amber-700">· Menor</span>}
                        </span>
                        <label className="flex items-center gap-1.5 text-xs text-slate-600">
                          <input
                            type="checkbox"
                            checked={!!persist[v.huespedId]}
                            onChange={(e) => setPersist((p) => ({ ...p, [v.huespedId]: e.target.checked }))}
                          />
                          Desar canvis també a la fitxa
                        </label>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <Field label="Tipus de document">
                          <Select value={v.tipusDocument} onChange={(e) => setField(v.huespedId, 'tipusDocument', e.target.value)}>
                            <option value="">—</option>
                            {optionsFrom(tipusDocumentValues, TIPUS_DOCUMENT_LABELS).map((o) => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </Select>
                        </Field>
                        <Field label="Sexe">
                          <Select value={v.sexe} onChange={(e) => setField(v.huespedId, 'sexe', e.target.value)}>
                            <option value="">—</option>
                            {optionsFrom(sexeValues, SEXE_LABELS).map((o) => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </Select>
                        </Field>
                        <Field label="Data de naixement">
                          <Input type="date" value={v.dataNaixement} onChange={(e) => setField(v.huespedId, 'dataNaixement', e.target.value)} />
                        </Field>
                        <Field label="Data d’expedició">
                          <Input type="date" value={v.dataExpedicio} onChange={(e) => setField(v.huespedId, 'dataExpedicio', e.target.value)} />
                        </Field>
                        {TEXT_FIELDS.map((f) => (
                          <Field key={f.key} label={f.label} className={f.full ? 'sm:col-span-2 lg:col-span-3' : undefined}>
                            <Input
                              value={String(v[f.key] ?? '')}
                              onChange={(e) => setField(v.huespedId, f.key, e.target.value)}
                            />
                          </Field>
                        ))}
                        {v.esMenor && v.parentesc && (
                          <Field label="Parentesc">
                            <Input value={v.parentesc} disabled />
                          </Field>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
                  <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                    Cancel·lar
                  </Button>
                  <Button size="sm" onClick={() => setStep('confirm')}>
                    Continuar
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="flex-1 space-y-3 px-5 py-5">
                  <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-800">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                    <span>
                      Estàs a punt de generar la <strong>comunicació oficial de dades personals a la
                      policia</strong> de <strong>{nViatgers}</strong>{' '}
                      {nViatgers === 1 ? 'viatger' : 'viatgers'}
                      {contracteLabel ? ` (contracte ${contracteLabel})` : ''}. Has revisat que tot
                      és correcte?
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Es descarregarà el fitxer .txt; després l’has de pujar manualment al portal de
                    Mossos. Les edicions marcades amb «Desar també a la fitxa» actualitzaran la fitxa
                    de l’hoste; la resta només afecten aquest fitxer.
                  </p>
                </div>
                <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
                  <Button variant="ghost" size="sm" onClick={() => setStep('review')} disabled={busy}>
                    Enrere
                  </Button>
                  <Button variant="danger" size="sm" onClick={generar} disabled={busy}>
                    {busy ? 'Generant…' : 'Sí, generar i descarregar'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
