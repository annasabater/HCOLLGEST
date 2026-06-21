'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, UserCheck, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RegistreSchema, type RegistreInput } from '@/lib/validation/registre';
import {
  optionsFrom,
  tipusRegistreValues,
  TIPUS_REGISTRE_LABELS,
  tipusDocumentValues,
  TIPUS_DOCUMENT_LABELS,
  sexeValues,
  SEXE_LABELS,
  tipusPagamentValues,
  TIPUS_PAGAMENT_LABELS,
  parentescValues,
  PARENTESC_LABELS,
} from '@/lib/validation/enums';
import { isMenor } from '@/lib/dates';
import { postJSON, ApiError, getJSON } from '@/lib/api';

type ViatgerState = {
  huespedId?: string;
  nom: string;
  cognom1: string;
  cognom2: string;
  sexe: string;
  dataNaixement: string;
  nacionalitat: string;
  tipusDocument: string;
  numDocument: string;
  numSuport: string;
  dataExpedicio: string;
  email: string;
  telefon: string;
  adreca: string;
  pais: string;
  provincia: string;
  municipi: string;
  localitat: string;
  codiPostal: string;
  esTitular: boolean;
  parentesc: string;
  esMenor: boolean;
  _recurrent?: string; // aviso de huésped recurrente (Fase 2)
  _noAcollir?: boolean;
  _anotacions?: { sentit: string; descripcio: string; noAcollir: boolean }[];
};

function emptyViatger(titular = false): ViatgerState {
  return {
    nom: '',
    cognom1: '',
    cognom2: '',
    sexe: '',
    dataNaixement: '',
    nacionalitat: '',
    tipusDocument: '',
    numDocument: '',
    numSuport: '',
    dataExpedicio: '',
    email: '',
    telefon: '',
    adreca: '',
    pais: 'Espanya',
    provincia: '',
    municipi: '',
    localitat: '',
    codiPostal: '',
    esTitular: titular,
    parentesc: '',
    esMenor: false,
  };
}

const currentYear = new Date().getFullYear();

export function MasterForm({ habitacions }: { habitacions: { id: string; nom: string }[] }) {
  const router = useRouter();
  const [tipusRegistre, setTipusRegistre] = useState<'CONTRACTE_EN_CURS' | 'RESERVA'>(
    'CONTRACTE_EN_CURS',
  );
  const [estancia, setEstancia] = useState({
    numContracte: '',
    anyContracte: String(currentYear),
    dataFormalitzacio: new Date().toISOString().slice(0, 10),
    dataEntrada: '',
    dataSortida: '',
    tipusPagament: 'EFECTIU',
    habitacioId: '',
    teInternet: true,
    observacions: '',
  });
  const [viatgers, setViatgers] = useState<ViatgerState[]>([emptyViatger(true)]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const esReserva = tipusRegistre === 'RESERVA';

  const setV = (i: number, patch: Partial<ViatgerState>) =>
    setViatgers((prev) => prev.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));

  const setTitular = (i: number) =>
    setViatgers((prev) => prev.map((v, idx) => ({ ...v, esTitular: idx === i })));

  const addViatger = () => setViatgers((prev) => [...prev, emptyViatger(prev.length === 0)]);
  const removeViatger = (i: number) =>
    setViatgers((prev) => {
      const next = prev.filter((_, idx) => idx !== i);
      if (next.length && !next.some((v) => v.esTitular)) next[0]!.esTitular = true;
      return next;
    });

  function buildInput(): RegistreInput {
    return {
      estancia: {
        tipusRegistre,
        numContracte: estancia.numContracte,
        anyContracte: Number(estancia.anyContracte),
        dataFormalitzacio: estancia.dataFormalitzacio,
        dataEntrada: estancia.dataEntrada,
        dataSortida: estancia.dataSortida,
        numViatgers: viatgers.length,
        tipusPagament: estancia.tipusPagament as RegistreInput['estancia']['tipusPagament'],
        habitacioId: estancia.habitacioId || undefined,
        teInternet: estancia.teInternet,
        observacions: estancia.observacions || undefined,
      },
      viatgers: viatgers.map((v) => ({
        huespedId: v.huespedId,
        nom: v.nom,
        cognom1: v.cognom1,
        cognom2: v.cognom2 || undefined,
        sexe: (v.sexe || undefined) as RegistreInput['viatgers'][number]['sexe'],
        dataNaixement: v.dataNaixement || undefined,
        nacionalitat: v.nacionalitat || undefined,
        tipusDocument: (v.tipusDocument || undefined) as RegistreInput['viatgers'][number]['tipusDocument'],
        numDocument: v.numDocument || undefined,
        numSuport: v.numSuport || undefined,
        dataExpedicio: v.dataExpedicio || undefined,
        email: v.email || undefined,
        telefon: v.telefon || undefined,
        adreca: v.adreca || undefined,
        pais: v.pais || undefined,
        provincia: v.provincia || undefined,
        municipi: v.municipi || undefined,
        localitat: v.localitat || undefined,
        codiPostal: v.codiPostal || undefined,
        esTitular: v.esTitular,
        parentesc: (v.parentesc || undefined) as RegistreInput['viatgers'][number]['parentesc'],
        esMenor: v.esMenor,
      })),
    };
  }

  async function lookupHuesped(i: number) {
    const v = viatgers[i]!;
    if (!v.tipusDocument || !v.numDocument) return;
    try {
      const res = await getJSON<{
        huesped:
          | (Record<string, string | null> & {
              anotacions?: { sentit: string; descripcio: string; noAcollir: boolean }[];
            })
          | null;
        estadistiques?: { visites: number; noAcollir?: boolean };
      }>(`/api/huespedes/lookup?tipus=${v.tipusDocument}&doc=${encodeURIComponent(v.numDocument)}`);
      if (res.huesped) {
        const h = res.huesped;
        setV(i, {
          huespedId: (h.id as string) ?? undefined,
          nom: h.nom ?? '',
          cognom1: h.cognom1 ?? '',
          cognom2: h.cognom2 ?? '',
          sexe: h.sexe ?? '',
          nacionalitat: h.nacionalitat ?? '',
          numSuport: h.numSuport ?? '',
          email: h.email ?? '',
          telefon: h.telefon ?? '',
          adreca: h.adreca ?? '',
          pais: h.pais ?? 'Espanya',
          provincia: h.provincia ?? '',
          municipi: h.municipi ?? '',
          localitat: h.localitat ?? '',
          codiPostal: h.codiPostal ?? '',
          dataNaixement: h.dataNaixement ? String(h.dataNaixement).slice(0, 10) : '',
          _recurrent: `Hoste recurrent · ${res.estadistiques?.visites ?? 0} estades prèvies`,
          _noAcollir: res.estadistiques?.noAcollir ?? false,
          _anotacions: h.anotacions ?? [],
        });
      }
    } catch {
      /* lookup silencioso */
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    const input = buildInput();
    const parsed = RegistreSchema.safeParse(input);
    if (!parsed.success) {
      const map: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        map[issue.path.join('.')] = issue.message;
      }
      setErrors(map);
      setServerError('Revisa els camps marcats.');
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const res = await postJSON<{ estanciaId: string }>('/api/estancies', input);
      router.push(`/estancies/${res.estanciaId}`);
    } catch (err) {
      if (err instanceof ApiError) setServerError(err.message);
      else setServerError('Error desant l’estada');
    } finally {
      setSubmitting(false);
    }
  }

  const err = (path: string) => errors[path];

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* --- Tipus de registre --- */}
      <Card>
        <CardHeader>
          <CardTitle>Tipus de registre</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="flex flex-wrap gap-3">
            {optionsFrom(tipusRegistreValues, TIPUS_REGISTRE_LABELS).map((o) => (
              <button
                type="button"
                key={o.value}
                onClick={() => setTipusRegistre(o.value)}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                  tipusRegistre === o.value
                    ? 'border-brand-500 bg-brand-50 text-brand-800'
                    : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
          {esReserva && (
            <p className="mt-3 text-xs text-slate-500">
              En reserva només calen nom, cognom i (email o telèfon) per cada viatger.
            </p>
          )}
        </CardBody>
      </Card>

      {/* --- Dades de l'estada --- */}
      <Card>
        <CardHeader>
          <CardTitle>Dades de l’estada</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Número de contracte" required error={err('estancia.numContracte')}>
            <Input
              value={estancia.numContracte}
              onChange={(e) => setEstancia({ ...estancia, numContracte: e.target.value })}
            />
          </Field>
          <Field label="Any" required error={err('estancia.anyContracte')}>
            <Input
              type="number"
              value={estancia.anyContracte}
              onChange={(e) => setEstancia({ ...estancia, anyContracte: e.target.value })}
            />
          </Field>
          <Field label="Tipus de pagament" required error={err('estancia.tipusPagament')}>
            <Select
              value={estancia.tipusPagament}
              onChange={(e) => setEstancia({ ...estancia, tipusPagament: e.target.value })}
            >
              {optionsFrom(tipusPagamentValues, TIPUS_PAGAMENT_LABELS).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Data formalització" required error={err('estancia.dataFormalitzacio')}>
            <Input
              type="date"
              value={estancia.dataFormalitzacio}
              onChange={(e) => setEstancia({ ...estancia, dataFormalitzacio: e.target.value })}
            />
          </Field>
          <Field label="Data d’entrada" required error={err('estancia.dataEntrada')}>
            <Input
              type="date"
              value={estancia.dataEntrada}
              onChange={(e) => setEstancia({ ...estancia, dataEntrada: e.target.value })}
            />
          </Field>
          <Field label="Data de sortida" required error={err('estancia.dataSortida')}>
            <Input
              type="date"
              value={estancia.dataSortida}
              onChange={(e) => setEstancia({ ...estancia, dataSortida: e.target.value })}
            />
          </Field>
          <Field label="Habitació">
            <Select
              value={estancia.habitacioId}
              onChange={(e) => setEstancia({ ...estancia, habitacioId: e.target.value })}
            >
              <option value="">—</option>
              {habitacions.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.nom}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Internet">
            <label className="flex h-10 items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={estancia.teInternet}
                onChange={(e) => setEstancia({ ...estancia, teInternet: e.target.checked })}
              />
              L’establiment disposa d’internet
            </label>
          </Field>
          <Field label="Observacions" className="sm:col-span-2 lg:col-span-3">
            <Input
              value={estancia.observacions}
              onChange={(e) => setEstancia({ ...estancia, observacions: e.target.value })}
            />
          </Field>
        </CardBody>
      </Card>

      {/* --- Viatgers --- */}
      {viatgers.map((v, i) => {
        const menor = v.esMenor || isMenor(v.dataNaixement ? new Date(v.dataNaixement) : null, estancia.dataEntrada ? new Date(estancia.dataEntrada) : new Date());
        const isDni = v.tipusDocument === 'DNI_NIF';
        const isDniNie = v.tipusDocument === 'DNI_NIF' || v.tipusDocument === 'NIE';
        const ext = v.pais && v.pais !== 'Espanya';
        const P = (f: string) => `viatgers.${i}.${f}`;
        return (
          <Card key={i}>
            <CardHeader className="flex items-center justify-between">
              <CardTitle>
                Viatger {i + 1} {v.esTitular && <Badge tone="info" className="ml-2">Titular</Badge>}
                {v._recurrent && (
                  <Badge tone="success" className="ml-2">
                    <UserCheck className="mr-1 h-3 w-3" /> {v._recurrent}
                  </Badge>
                )}
              </CardTitle>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 text-xs text-slate-600">
                  <input
                    type="radio"
                    name="titular"
                    checked={v.esTitular}
                    onChange={() => setTitular(i)}
                  />
                  Titular
                </label>
                {viatgers.length > 1 && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeViatger(i)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardBody className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(v._noAcollir || (v._anotacions && v._anotacions.length > 0)) && (
                <div className="space-y-2 sm:col-span-2 lg:col-span-3">
                  {v._noAcollir && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      ⚠ Aquest hoste està marcat com a <strong>no acollir</strong> a la llista interna.
                      Revisa les notes objectives abans de decidir (§7).
                    </div>
                  )}
                  {v._anotacions?.map((a, k) => (
                    <div
                      key={k}
                      className={`rounded-lg px-3 py-2 text-xs ${
                        a.sentit === 'NEGATIVA'
                          ? 'bg-red-50 text-red-700'
                          : a.sentit === 'POSITIVA'
                            ? 'bg-green-50 text-green-700'
                            : 'bg-slate-50 text-slate-600'
                      }`}
                    >
                      {a.descripcio}
                    </div>
                  ))}
                </div>
              )}
              <Field label="Nom" required error={err(P('nom'))}>
                <Input value={v.nom} onChange={(e) => setV(i, { nom: e.target.value })} />
              </Field>
              <Field label="Primer cognom" required error={err(P('cognom1'))}>
                <Input value={v.cognom1} onChange={(e) => setV(i, { cognom1: e.target.value })} />
              </Field>
              <Field
                label="Segon cognom"
                required={isDni}
                error={err(P('cognom2'))}
                hint={isDni ? 'Obligatori amb DNI/NIF' : undefined}
              >
                <Input value={v.cognom2} onChange={(e) => setV(i, { cognom2: e.target.value })} />
              </Field>

              {!esReserva && (
                <>
                  <Field label="Tipus de document" required={!menor} error={err(P('tipusDocument'))}>
                    <Select
                      value={v.tipusDocument}
                      onChange={(e) => setV(i, { tipusDocument: e.target.value })}
                    >
                      <option value="">—</option>
                      {optionsFrom(tipusDocumentValues, TIPUS_DOCUMENT_LABELS).map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Número de document" required={!menor} error={err(P('numDocument'))}>
                    <div className="flex gap-2">
                      <Input
                        value={v.numDocument}
                        onChange={(e) => setV(i, { numDocument: e.target.value })}
                        onBlur={() => lookupHuesped(i)}
                      />
                      <Button type="button" variant="outline" size="md" onClick={() => lookupHuesped(i)}>
                        <Search className="h-4 w-4" />
                      </Button>
                    </div>
                  </Field>
                  <Field
                    label="Número de suport"
                    required={isDniNie}
                    error={err(P('numSuport'))}
                    hint={isDniNie ? 'Obligatori amb DNI/NIE' : undefined}
                  >
                    <Input value={v.numSuport} onChange={(e) => setV(i, { numSuport: e.target.value })} />
                  </Field>
                  <Field label="Data d’expedició" error={err(P('dataExpedicio'))}>
                    <Input
                      type="date"
                      value={v.dataExpedicio}
                      onChange={(e) => setV(i, { dataExpedicio: e.target.value })}
                    />
                  </Field>
                  <Field label="Sexe">
                    <Select value={v.sexe} onChange={(e) => setV(i, { sexe: e.target.value })}>
                      <option value="">—</option>
                      {optionsFrom(sexeValues, SEXE_LABELS).map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Nacionalitat" error={err(P('nacionalitat'))}>
                    <Input
                      value={v.nacionalitat}
                      onChange={(e) => setV(i, { nacionalitat: e.target.value })}
                    />
                  </Field>
                </>
              )}

              <Field label="Data de naixement" error={err(P('dataNaixement'))}>
                <Input
                  type="date"
                  value={v.dataNaixement}
                  onChange={(e) => setV(i, { dataNaixement: e.target.value })}
                />
              </Field>
              <Field label="Email" required={esReserva} error={err(P('email'))}>
                <Input
                  type="email"
                  value={v.email}
                  onChange={(e) => setV(i, { email: e.target.value })}
                />
              </Field>
              <Field label="Telèfon" error={err(P('telefon'))}>
                <Input value={v.telefon} onChange={(e) => setV(i, { telefon: e.target.value })} />
              </Field>

              {!esReserva && (
                <>
                  <Field label="Adreça" required error={err(P('adreca'))} className="lg:col-span-2">
                    <Input value={v.adreca} onChange={(e) => setV(i, { adreca: e.target.value })} />
                  </Field>
                  <Field label="Codi postal" required error={err(P('codiPostal'))}>
                    <Input value={v.codiPostal} onChange={(e) => setV(i, { codiPostal: e.target.value })} />
                  </Field>
                  <Field label="País" error={err(P('pais'))}>
                    <Input value={v.pais} onChange={(e) => setV(i, { pais: e.target.value })} />
                  </Field>
                  {!ext ? (
                    <>
                      <Field label="Província" required error={err(P('provincia'))}>
                        <Input value={v.provincia} onChange={(e) => setV(i, { provincia: e.target.value })} />
                      </Field>
                      <Field label="Municipi" required error={err(P('municipi'))}>
                        <Input value={v.municipi} onChange={(e) => setV(i, { municipi: e.target.value })} />
                      </Field>
                    </>
                  ) : (
                    <Field label="Localitat" required error={err(P('localitat'))}>
                      <Input value={v.localitat} onChange={(e) => setV(i, { localitat: e.target.value })} />
                    </Field>
                  )}
                  <Field label="Menor de 14">
                    <label className="flex h-10 items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={menor}
                        onChange={(e) => setV(i, { esMenor: e.target.checked })}
                      />
                      És menor
                    </label>
                  </Field>
                  {menor && (
                    <Field label="Parentesc" required error={err(P('parentesc'))}>
                      <Select value={v.parentesc} onChange={(e) => setV(i, { parentesc: e.target.value })}>
                        <option value="">—</option>
                        {optionsFrom(parentescValues, PARENTESC_LABELS).map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  )}
                </>
              )}
            </CardBody>
          </Card>
        );
      })}

      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" onClick={addViatger}>
          <Plus className="h-4 w-4" /> Afegir viatger
        </Button>
        <div className="flex items-center gap-3">
          {serverError && <span className="text-sm text-red-600">{serverError}</span>}
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Desant…' : 'Desar estada'}
          </Button>
        </div>
      </div>
    </form>
  );
}
