'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, UserCheck, Search, AlertTriangle, PawPrint } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RegistreSchema, RegistreEsborranySchema, type RegistreInput } from '@/lib/validation/registre';
import {
  optionsFrom,
  tipusRegistreValues,
  TIPUS_REGISTRE_LABELS,
  tipusDocumentValues,
  TIPUS_DOCUMENT_LABELS,
  sexeValues,
  SEXE_LABELS,
  tipusPagamentFormValues,
  TIPUS_PAGAMENT_LABELS,
  parentescValues,
  PARENTESC_LABELS,
  midaAnimalValues,
  MIDA_ANIMAL_LABELS,
  metodeCobramentValues,
  METODE_COBRAMENT_LABELS,
} from '@/lib/validation/enums';
import { isMenor } from '@/lib/dates';
import { postJSON, putJSON, ApiError, getJSON } from '@/lib/api';
import { formatWarnings } from '@/lib/validation/documents';
import { PROVINCIES, PAISOS } from '@/lib/data/geo';
import { DocumentScanner, type PendingDoc } from '@/components/ocr/document-scanner';
import { HosteSearch, type HosteLite } from '@/components/forms/hoste-search';
import type { ViatgerOcr } from '@/lib/ocr/mrz';

export type ViatgerState = {
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
  _avisAlerta?: string; // coincidència amb la llista d'avisos interns
  _docs?: PendingDoc[]; // documents d'identitat a desar després de crear l'estada
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

/** Camps d'un viatger a partir d'una fitxa d'hoste existent (reaprofitament). */
function hostePatch(h: HosteLite): Partial<ViatgerState> {
  const d = (s: string | null) => (s ? s.slice(0, 10) : '');
  return {
    huespedId: h.id,
    nom: h.nom ?? '',
    cognom1: h.cognom1 ?? '',
    cognom2: h.cognom2 ?? '',
    sexe: h.sexe ?? '',
    dataNaixement: d(h.dataNaixement),
    nacionalitat: h.nacionalitat ?? '',
    tipusDocument: h.tipusDocument ?? '',
    numDocument: h.numDocument ?? '',
    numSuport: h.numSuport ?? '',
    dataExpedicio: d(h.dataExpedicio),
    email: h.email ?? '',
    telefon: h.telefon ?? '',
    adreca: h.adreca ?? '',
    pais: h.pais ?? 'Espanya',
    provincia: h.provincia ?? '',
    municipi: h.municipi ?? '',
    localitat: h.localitat ?? '',
    codiPostal: h.codiPostal ?? '',
    _recurrent: 'Hoste reaprofitat',
  };
}

function viatgerFromHoste(h: HosteLite, titular: boolean): ViatgerState {
  return { ...emptyViatger(titular), ...hostePatch(h) };
}

export interface MasterFormInitial {
  tipusRegistre: 'CONTRACTE_EN_CURS' | 'RESERVA';
  estancia: {
    numContracte: string;
    anyContracte: string;
    dataFormalitzacio: string;
    dataEntrada: string;
    dataSortida: string;
    tipusPagament: string;
    habitacioId: string;
    teInternet: boolean;
    observacions: string;
  };
  viatgers: ViatgerState[];
  esBorrany: boolean;
}

export function MasterForm({
  habitacions,
  initialHoste,
  mode = 'create',
  estanciaId,
  initial,
}: {
  habitacions: { id: string; nom: string }[];
  initialHoste?: HosteLite | null;
  mode?: 'create' | 'edit';
  estanciaId?: string;
  initial?: MasterFormInitial;
}) {
  const router = useRouter();
  const isEdit = mode === 'edit';
  const [tipusRegistre, setTipusRegistre] = useState<'CONTRACTE_EN_CURS' | 'RESERVA'>(
    initial?.tipusRegistre ?? 'CONTRACTE_EN_CURS',
  );
  const [estancia, setEstancia] = useState(
    initial?.estancia ?? {
      numContracte: '',
      anyContracte: String(currentYear),
      dataFormalitzacio: new Date().toISOString().slice(0, 10),
      dataEntrada: '',
      dataSortida: '',
      tipusPagament: 'DESTINACIO',
      habitacioId: '',
      teInternet: true,
      observacions: '',
    },
  );
  const [viatgers, setViatgers] = useState<ViatgerState[]>(() =>
    initial?.viatgers ??
    (initialHoste ? [viatgerFromHoste(initialHoste, true)] : [emptyViatger(true)]),
  );
  const [portaMascota, setPortaMascota] = useState(false);
  const [mascotes, setMascotes] = useState<{ nom: string; especie: string; mida: string }[]>([]);
  // Municipis (INE) per província, carregats sota demanda per al selector.
  const [municipisCache, setMunicipisCache] = useState<Record<string, string[]>>({});
  const [pagaments, setPagaments] = useState<{ import: string; metode: string }[]>([]);
  const [fiances, setFiances] = useState<{ import: string; metode: string }[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const esReserva = tipusRegistre === 'RESERVA';

  const setV = (i: number, patch: Partial<ViatgerState>) =>
    setViatgers((prev) => prev.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));

  // Reaprofita una fitxa d'hoste existent (des del cercador) en el viatger i.
  const applyHuesped = (i: number, h: HosteLite) => setV(i, hostePatch(h));

  // Desfà el reaprofitament: torna el viatger i als camps en blanc (conservant
  // si és el titular). Útil si s'ha seleccionat un hoste per error.
  const clearHuesped = (i: number) =>
    setViatgers((prev) => prev.map((v, idx) => (idx === i ? emptyViatger(v.esTitular) : v)));

  // Carrega (un sol cop) els municipis INE d'una província per al selector.
  const provId = (prov: string) => 'mun-' + prov.replace(/[^a-zA-Z0-9]/g, '');
  async function loadMunicipis(prov: string) {
    if (!prov || municipisCache[prov]) return;
    try {
      const r = await getJSON<{ municipis: string[] }>(
        `/api/municipis?provincia=${encodeURIComponent(prov)}`,
      );
      setMunicipisCache((c) => ({ ...c, [prov]: r.municipis }));
    } catch {
      /* silenciós: la validació ja avisa si el municipi no es resol */
    }
  }

  // Autoreplenat des de l'OCR del document (només camps llegits).
  const applyOcr = (i: number, v: ViatgerOcr) => {
    const patch: Partial<ViatgerState> = {};
    if (v.nom) patch.nom = v.nom;
    if (v.cognom1) patch.cognom1 = v.cognom1;
    if (v.cognom2) patch.cognom2 = v.cognom2;
    if (v.tipusDocument) patch.tipusDocument = v.tipusDocument;
    if (v.numDocument) patch.numDocument = v.numDocument;
    if (v.sexe) patch.sexe = v.sexe;
    if (v.dataNaixement) patch.dataNaixement = v.dataNaixement;
    if (v.nacionalitat) patch.nacionalitat = v.nacionalitat;
    setV(i, patch);
  };

  const setTitular = (i: number) =>
    setViatgers((prev) => prev.map((v, idx) => ({ ...v, esTitular: idx === i })));

  // --- Mascotes (opcional) ---
  const emptyMascota = () => ({ nom: '', especie: 'Gos', mida: '' });
  const togglePortaMascota = (on: boolean) => {
    setPortaMascota(on);
    setMascotes(on ? (prev => (prev.length ? prev : [emptyMascota()]))(mascotes) : []);
  };
  const addMascota = () => setMascotes((prev) => [...prev, emptyMascota()]);
  const setM = (i: number, patch: Partial<{ nom: string; especie: string; mida: string }>) =>
    setMascotes((prev) => prev.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  const removeMascota = (i: number) => setMascotes((prev) => prev.filter((_, idx) => idx !== i));

  // --- Cobrament (opcional): import + mètode, repetible (X efectiu, Y transferència…) ---
  const addPagament = () => setPagaments((prev) => [...prev, { import: '', metode: 'EFECTIU' }]);
  const setPag = (i: number, patch: Partial<{ import: string; metode: string }>) =>
    setPagaments((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  const removePagament = (i: number) => setPagaments((prev) => prev.filter((_, idx) => idx !== i));
  const totalPagaments = pagaments.reduce((a, p) => a + (Number(p.import) || 0), 0);

  // --- Fiança (opcional): garantia retornable, va a custòdia (no és ingrés) ---
  const addFianca = () => setFiances((prev) => [...prev, { import: '', metode: 'EFECTIU' }]);
  const setFia = (i: number, patch: Partial<{ import: string; metode: string }>) =>
    setFiances((prev) => prev.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  const removeFianca = (i: number) => setFiances((prev) => prev.filter((_, idx) => idx !== i));
  const totalFiances = fiances.reduce((a, f) => a + (Number(f.import) || 0), 0);

  const addViatger = () => setViatgers((prev) => [...prev, emptyViatger(prev.length === 0)]);
  const removeViatger = (i: number) =>
    setViatgers((prev) => {
      const next = prev.filter((_, idx) => idx !== i);
      if (next.length && !next.some((v) => v.esTitular)) next[0]!.esTitular = true;
      return next;
    });

  // --- Documents d'identitat pendents (es desen després de crear l'estada) ---
  const addDoc = (i: number, file: File) =>
    setViatgers((prev) =>
      prev.map((v, idx) => {
        if (idx !== i) return v;
        const docs = v._docs ?? [];
        // Tipus per defecte segons l'ordre: anvers, revers, després "altres".
        const tipus = docs.length === 0 ? 'DNI_ANVERS' : docs.length === 1 ? 'DNI_REVERS' : 'ALTRES';
        return { ...v, _docs: [...docs, { id: crypto.randomUUID(), file, tipus }] };
      }),
    );
  const removeDoc = (i: number, docId: string) =>
    setViatgers((prev) =>
      prev.map((v, idx) => (idx === i ? { ...v, _docs: (v._docs ?? []).filter((d) => d.id !== docId) } : v)),
    );
  const setDocTipus = (i: number, docId: string, tipus: string) =>
    setViatgers((prev) =>
      prev.map((v, idx) =>
        idx === i ? { ...v, _docs: (v._docs ?? []).map((d) => (d.id === docId ? { ...d, tipus } : d)) } : v,
      ),
    );

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
      // Només mascotes amb nom; l'espècie té un valor per defecte.
      mascotes: portaMascota
        ? mascotes
            .filter((m) => m.nom.trim())
            .map((m) => ({
              nom: m.nom.trim(),
              especie: m.especie.trim() || 'Animal',
              mida: m.mida || undefined,
            }))
        : undefined,
      // Cobraments opcionals: només les línies amb import positiu.
      pagaments: pagaments
        .filter((p) => Number(p.import) > 0)
        .map((p) => ({
          metode: p.metode as (typeof metodeCobramentValues)[number],
          import: Number(p.import),
        })),
      // Fiances opcionals: garantia retornable (custòdia, no és ingrés).
      fiances: fiances
        .filter((f) => Number(f.import) > 0)
        .map((f) => ({
          metode: f.metode as (typeof metodeCobramentValues)[number],
          import: Number(f.import),
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
        if (h.provincia) loadMunicipis(h.provincia as string);
      }
    } catch {
      /* lookup silencioso */
    }
  }

  // Comprova si el viatger coincideix amb un avís intern (per telèfon o nom).
  async function checkAvis(i: number) {
    const v = viatgers[i]!;
    const nom = [v.nom, v.cognom1].filter(Boolean).join(' ').trim();
    if (!v.telefon && nom.length < 3) return;
    try {
      const res = await getJSON<{ avisos: { motiu: string; gravetat: string }[] }>(
        `/api/avisos/check?telefon=${encodeURIComponent(v.telefon)}&nom=${encodeURIComponent(nom)}`,
      );
      setV(i, {
        _avisAlerta: res.avisos.length > 0 ? res.avisos.map((a) => a.motiu).join(' · ') : undefined,
      });
    } catch {
      /* comprovació silenciosa */
    }
  }

  async function doSubmit(force: boolean, borrany = false) {
    setServerError(null);
    const input = buildInput();

    // 1) Validació. En esborrany és laxa (es pot desar incomplet); si no, dura (§2.3).
    const parsed = (borrany ? RegistreEsborranySchema : RegistreSchema).safeParse(input);
    if (!parsed.success) {
      const map: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        map[issue.path.join('.')] = issue.message;
      }
      setErrors(map);
      setWarnings([]);
      setServerError(
        borrany
          ? 'Per desar com a esborrany calen, com a mínim, nom i cognom del titular i les dates.'
          : 'Falten dades obligatòries. Completa-les, o desa com a esborrany i acaba-ho més tard.',
      );
      return;
    }
    setErrors({});

    // 2) Validació de FORMAT (DNI/NIE, codi postal): avisa però es pot forçar.
    //    En esborrany no molestem amb avisos de format (el registre ja és parcial).
    if (!borrany) {
      const fw = formatWarnings(
        viatgers.map((v) => ({
          tipusDocument: v.tipusDocument || undefined,
          numDocument: v.numDocument || undefined,
          codiPostal: v.codiPostal || undefined,
          pais: v.pais || undefined,
          dataNaixement: v.dataNaixement || undefined,
          dataExpedicio: v.dataExpedicio || undefined,
        })),
      );
      if (fw.length > 0 && !force) {
        setWarnings(fw);
        return; // espera confirmació "Desar igualment"
      }
    }
    setWarnings([]);

    setSubmitting(true);
    try {
      const res = isEdit
        ? await putJSON<{ estanciaId: string; viatgerHuespedIds?: string[] }>(
            `/api/estancies/${estanciaId}${borrany ? '?borrany=1' : ''}`,
            input,
          )
        : await postJSON<{ estanciaId: string; viatgerHuespedIds?: string[] }>(
            `/api/estancies${borrany ? '?borrany=1' : ''}`,
            input,
          );

      // Puja els documents d'identitat pendents de cada viatger (al servidor es
      // desen xifrats, en B/N i amb marca d'aigua). Best-effort: si algun falla,
      // l'estada ja s'ha creat i es poden afegir des de la fitxa de l'hoste.
      const huespedIds = res.viatgerHuespedIds ?? [];
      let docsFallits = 0;
      for (let i = 0; i < viatgers.length; i++) {
        const docs = viatgers[i]?._docs ?? [];
        const hid = huespedIds[i];
        if (!hid || docs.length === 0) continue;
        for (const d of docs) {
          try {
            const fd = new FormData();
            fd.append('file', d.file);
            fd.append('tipus', d.tipus);
            const r = await fetch(`/api/huespedes/${hid}/documents`, { method: 'POST', body: fd });
            if (!r.ok) docsFallits++;
          } catch {
            docsFallits++;
          }
        }
      }
      if (docsFallits > 0) {
        alert(
          `L'estada s'ha desat, però ${docsFallits} document(s) no s'han pogut pujar. ` +
            'Pots afegir-los des de la fitxa de l’hoste.',
        );
      }

      router.push(`/estancies/${res.estanciaId}`);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) setServerError(err.message);
      else setServerError('Error desant l’estada');
    } finally {
      setSubmitting(false);
    }
  }

  const err = (path: string) => errors[path];

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        doSubmit(false);
      }}
      className="space-y-6"
    >
      <datalist id="paisos">
        {PAISOS.map((pais) => (
          <option key={pais} value={pais} />
        ))}
      </datalist>
      {/* Datalists de municipis INE per província (carregats sota demanda). */}
      {Object.entries(municipisCache).map(([prov, llista]) => (
        <datalist key={prov} id={provId(prov)}>
          {llista.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
      ))}
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
              uppercase
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
              {optionsFrom(tipusPagamentFormValues, TIPUS_PAGAMENT_LABELS).map((o) => (
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
          <Field label="Observacions" className="sm:col-span-2 lg:col-span-3">
            <Input
              uppercase
              value={estancia.observacions}
              onChange={(e) => setEstancia({ ...estancia, observacions: e.target.value })}
            />
          </Field>
        </CardBody>
      </Card>

      {/* --- Cobrament i fiança (opcional) — només a l'alta; a l'edició es gestionen a la fitxa --- */}
      {!isEdit && (
      <Card>
        <CardHeader>
          <CardTitle>Cobrament i fiança (opcional)</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          <p className="text-xs text-slate-500">
            Si ja t’han pagat, indica quant i com. Pots partir-ho en més d’un mètode (p. ex. una part
            en efectiu i una altra per transferència). En desar es crearà un rebut amb aquests
            cobraments. Si no, ho pots fer després des de la fitxa de l’estada.
          </p>
          {pagaments.map((p, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="Import €"
                className="w-32"
                value={p.import}
                onChange={(e) => setPag(i, { import: e.target.value })}
              />
              <Select
                className="w-48"
                value={p.metode}
                onChange={(e) => setPag(i, { metode: e.target.value })}
              >
                {optionsFrom(metodeCobramentValues, METODE_COBRAMENT_LABELS).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
              <button
                type="button"
                className="text-slate-400 hover:text-red-600"
                onClick={() => removePagament(i)}
                aria-label="Treure cobrament"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" size="sm" variant="ghost" onClick={addPagament}>
              <Plus className="h-4 w-4" /> Afegir cobrament
            </Button>
            {pagaments.length > 0 && (
              <span className="text-sm text-slate-600">
                Total: <strong>{totalPagaments.toFixed(2)} €</strong>
              </span>
            )}
          </div>

          {/* --- Fiança (opcional): garantia retornable, va a custòdia --- */}
          <div className="border-t border-slate-100 pt-3">
            <p className="text-xs text-slate-500">
              Fiança (garantia que <strong>tornaràs</strong>): queda en custòdia i{' '}
              <strong>no</strong> compta com a ingrés fins que la retens.
            </p>
            <div className="mt-2 space-y-3">
              {fiances.map((f, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Import €"
                    className="w-32"
                    value={f.import}
                    onChange={(e) => setFia(i, { import: e.target.value })}
                  />
                  <Select
                    className="w-48"
                    value={f.metode}
                    onChange={(e) => setFia(i, { metode: e.target.value })}
                  >
                    {optionsFrom(metodeCobramentValues, METODE_COBRAMENT_LABELS).map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                  <button
                    type="button"
                    className="text-slate-400 hover:text-red-600"
                    onClick={() => removeFianca(i)}
                    aria-label="Treure fiança"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <div className="flex flex-wrap items-center gap-3">
                <Button type="button" size="sm" variant="ghost" onClick={addFianca}>
                  <Plus className="h-4 w-4" /> Afegir fiança
                </Button>
                {fiances.length > 0 && (
                  <span className="text-sm text-slate-600">
                    Total fiança: <strong>{totalFiances.toFixed(2)} €</strong>
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
      )}

      {/* --- Viatgers --- */}
      {viatgers.map((v, i) => {
        const refEntrada = estancia.dataEntrada ? new Date(estancia.dataEntrada) : new Date();
        const menor = v.esMenor; // controlat per l'usuari (es pot desmarcar)
        const suggMenor = isMenor(v.dataNaixement ? new Date(v.dataNaixement) : null, refEntrada);
        const isDni = v.tipusDocument === 'DNI_NIF';
        const isDniNie = v.tipusDocument === 'DNI_NIF' || v.tipusDocument === 'NIE';
        const ext = !!v.pais && v.pais.toLowerCase() !== 'espanya';
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
              <div className="sm:col-span-2 lg:col-span-3">
                <HosteSearch onSelect={(h) => applyHuesped(i, h)} />
                {(v.huespedId || v._recurrent) && (
                  <button
                    type="button"
                    onClick={() => clearHuesped(i)}
                    className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Treure l’hoste seleccionat i buidar els camps
                  </button>
                )}
              </div>
              {(v._noAcollir || v._avisAlerta || (v._anotacions && v._anotacions.length > 0)) && (
                <div className="space-y-2 sm:col-span-2 lg:col-span-3">
                  {v._avisAlerta && (
                    <div className="rounded-lg border border-red-300 bg-red-100 px-3 py-2 text-sm font-medium text-red-800">
                      🚫 Avís intern: {v._avisAlerta}. Valora <strong>no acollir</strong> aquesta persona.
                    </div>
                  )}
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
                <Input uppercase value={v.nom} onChange={(e) => setV(i, { nom: e.target.value })} onBlur={() => checkAvis(i)} />
              </Field>
              <Field label="Primer cognom" required error={err(P('cognom1'))}>
                <Input uppercase value={v.cognom1} onChange={(e) => setV(i, { cognom1: e.target.value })} onBlur={() => checkAvis(i)} />
              </Field>
              <Field
                label="Segon cognom"
                required={isDni}
                error={err(P('cognom2'))}
                hint={isDni ? 'Obligatori amb DNI/NIF' : undefined}
              >
                <Input uppercase value={v.cognom2} onChange={(e) => setV(i, { cognom2: e.target.value })} />
              </Field>

              {!esReserva && (
                <>
                  <div className="sm:col-span-2 lg:col-span-3">
                    <DocumentScanner
                      onExtract={(ocr) => applyOcr(i, ocr)}
                      onImage={(file) => addDoc(i, file)}
                      docs={v._docs ?? []}
                      onRemoveDoc={(docId) => removeDoc(i, docId)}
                      onTipusDoc={(docId, tipus) => setDocTipus(i, docId, tipus)}
                    />
                  </div>
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
                        uppercase
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
                    <Input uppercase value={v.numSuport} onChange={(e) => setV(i, { numSuport: e.target.value })} />
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
                      uppercase
                      list="paisos"
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
                  onChange={(e) => {
                    const val = e.target.value;
                    // Suggereix "menor" si la data indica <14, però es pot desmarcar després.
                    const auto = !!val && isMenor(new Date(val), refEntrada);
                    setV(i, auto ? { dataNaixement: val, esMenor: true } : { dataNaixement: val });
                  }}
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
                <Input value={v.telefon} onChange={(e) => setV(i, { telefon: e.target.value })} onBlur={() => checkAvis(i)} />
              </Field>

              {!esReserva && (
                <>
                  <Field label="Adreça" required error={err(P('adreca'))} className="lg:col-span-2">
                    <Input uppercase value={v.adreca} onChange={(e) => setV(i, { adreca: e.target.value })} />
                  </Field>
                  <Field label="Codi postal" required error={err(P('codiPostal'))}>
                    <Input value={v.codiPostal} onChange={(e) => setV(i, { codiPostal: e.target.value })} />
                  </Field>
                  <Field label="País" error={err(P('pais'))}>
                    <Input uppercase list="paisos" value={v.pais} onChange={(e) => setV(i, { pais: e.target.value })} />
                  </Field>
                  {!ext ? (
                    <>
                      <Field label="Província" required error={err(P('provincia'))}>
                        <Select
                          value={v.provincia}
                          onChange={(e) => {
                            setV(i, { provincia: e.target.value, municipi: '' });
                            loadMunicipis(e.target.value);
                          }}
                        >
                          <option value="">—</option>
                          {PROVINCIES.map((pr) => (
                            <option key={pr} value={pr}>
                              {pr}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <Field
                        label="Municipi"
                        required
                        error={err(P('municipi'))}
                        hint={v.provincia ? 'Tria’l de la llista (codi INE oficial).' : 'Tria primer la província.'}
                      >
                        <Input
                          uppercase
                          list={v.provincia ? provId(v.provincia) : undefined}
                          value={v.municipi}
                          disabled={!v.provincia}
                          onChange={(e) => setV(i, { municipi: e.target.value })}
                          onFocus={() => loadMunicipis(v.provincia)}
                          placeholder={v.provincia ? 'Comença a escriure…' : ''}
                        />
                      </Field>
                    </>
                  ) : (
                    <Field label="Localitat" required error={err(P('localitat'))}>
                      <Input uppercase value={v.localitat} onChange={(e) => setV(i, { localitat: e.target.value })} />
                    </Field>
                  )}
                  <Field
                    label="Menor de 14"
                    hint={suggMenor && !menor ? 'Segons la data de naixement sembla menor de 14.' : undefined}
                  >
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

      {/* --- Mascotes (opcional) — només a l'alta; a l'edició es gestionen a la fitxa --- */}
      {!isEdit && (
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <PawPrint className="h-5 w-5 text-brand-600" /> Mascotes
          </CardTitle>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={portaMascota}
              onChange={(e) => togglePortaMascota(e.target.checked)}
            />
            Porten mascota
          </label>
        </CardHeader>
        {portaMascota && (
          <CardBody className="space-y-3">
            {mascotes.map((m, i) => (
              <div key={i} className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
                <Field label="Nom">
                  <Input uppercase value={m.nom} onChange={(e) => setM(i, { nom: e.target.value })} placeholder="Nom de la mascota" />
                </Field>
                <Field label="Espècie">
                  <Input uppercase value={m.especie} onChange={(e) => setM(i, { especie: e.target.value })} placeholder="Gos, gat…" />
                </Field>
                <Field label="Mida">
                  <Select value={m.mida} onChange={(e) => setM(i, { mida: e.target.value })}>
                    <option value="">—</option>
                    {midaAnimalValues.map((v) => (
                      <option key={v} value={v}>
                        {MIDA_ANIMAL_LABELS[v]}
                      </option>
                    ))}
                  </Select>
                </Field>
                {mascotes.length > 1 && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeMascota(i)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <div className="flex items-center justify-between">
              <Button type="button" variant="outline" size="sm" onClick={addMascota}>
                <Plus className="h-4 w-4" /> Afegir mascota
              </Button>
              <p className="text-xs text-slate-400">
                Només cal el nom; la mida és opcional. S’associen al titular de l’estada.
              </p>
            </div>
          </CardBody>
        )}
      </Card>
      )}

      {warnings.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
          <p className="mb-1 flex items-center gap-2 text-sm font-medium text-amber-800">
            <AlertTriangle className="h-4 w-4" /> Hi ha dades que potser no són correctes:
          </p>
          <ul className="ml-6 list-disc text-sm text-amber-800">
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-amber-700">
            Corregeix-les i torna a desar, o desa igualment si saps que són correctes.
          </p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" onClick={addViatger}>
          <Plus className="h-4 w-4" /> Afegir viatger
        </Button>
        <div className="flex items-center gap-3">
          {serverError && <span className="text-sm text-red-600">{serverError}</span>}
          {warnings.length > 0 && (
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={() => doSubmit(true)}
            >
              Desar igualment
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            disabled={submitting}
            title="Desa amb dades incompletes per acabar-ho més tard. No es podrà pujar a Mossos fins completar-lo."
            onClick={() => doSubmit(false, true)}
          >
            Desar com a esborrany
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Desant…' : isEdit ? 'Desar canvis' : 'Desar estada'}
          </Button>
        </div>
      </div>
    </form>
  );
}
