'use client';

import { Fragment, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Plus, Trash2, Paperclip, Filter, Camera, Upload, X, ShieldCheck, ShieldOff, Pencil, Check } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { FinancesNav } from '@/components/balanc/finances-nav';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input, Select } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { Card, CardBody } from '@/components/ui/card';
import { Table, Thead, Th, Td, Tr, EmptyState } from '@/components/ui/table';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Eur, HideAmountsButton } from '@/components/finances/amounts-visibility';
import { getJSON, postJSON, patchJSON, delJSON, ApiError } from '@/lib/api';
import { formatDate, formatEur, cn } from '@/lib/utils';
import { toISODate } from '@/lib/dates';
import { rangDeEstat, type EstatPeriode } from '@/lib/periode';
import { PeriodeCompacte } from '@/components/ui/navegador-periode';
import { redueixImatge, motiuPujada } from '@/lib/images/redueix-client';
import { optionsFrom, metodeCobramentValues, METODE_COBRAMENT_LABELS } from '@/lib/validation/enums';
import { LiniesIva, liniaBuida, liniesDeGasto, payloadIva, type LiniaIvaForm } from '@/components/gastos/linies-iva';
import { FiltreBarra, ResultatFiltre, type ConsultaDesada } from '@/components/gastos/filtre-barra';
import { GraficDespeses } from '@/components/gastos/grafic-despeses';
import {
  coincideix,
  etiquetaFiltre,
  rangComparacio,
  totalDespeses,
  variacio,
  type FiltreDespesa,
  type ModeComparacio,
} from '@/lib/filtre-despeses';

// ─── Tipus ────────────────────────────────────────────────────────────────────

interface Cat { id: string; nom: string }
interface Prov {
  id: string; nom: string;
  cif?: string | null; activitat?: string | null; telefon?: string | null;
  email?: string | null; web?: string | null; adreca?: string | null;
}

/** Dades de la fitxa del proveïdor que es poden tocar des d'una despesa. */
const CAMPS_PROV = [
  { clau: 'cif', etiqueta: 'NIF/CIF' },
  { clau: 'activitat', etiqueta: 'Activitat' },
  { clau: 'telefon', etiqueta: 'Telèfon' },
  { clau: 'email', etiqueta: 'E-mail' },
  { clau: 'web', etiqueta: 'Web' },
  { clau: 'adreca', etiqueta: 'Adreça' },
] as const;
type DadesProv = Record<(typeof CAMPS_PROV)[number]['clau'], string>;
const dadesDe = (p: Prov | undefined): DadesProv => ({
  cif: p?.cif ?? '', activitat: p?.activitat ?? '', telefon: p?.telefon ?? '',
  email: p?.email ?? '', web: p?.web ?? '', adreca: p?.adreca ?? '',
});
interface Hab { id: string; nom: string }
// Valors habituals d'un proveïdor (de la seva última despesa).
interface ProvDefaults {
  categoriaId: string;
  ivaPercent: number | null;
  irpfPercent: number | null;
  metodePagament: string;
}
// Resultat de l'escàner de tiquets/factures (/api/ocr/gasto).
interface GastoOcrClient {
  data?: string;
  proveidorNom?: string;
  proveidorNif?: string;
  proveidorActivitat?: string;
  proveidorTelefon?: string;
  proveidorEmail?: string;
  proveidorAdreca?: string;
  proveidorWeb?: string;
  numFactura?: string;
  baseImposable?: number;
  ivaPercent?: number;
  desglossamentIva?: { base: number; ivaPercent: number }[];
  irpfPercent?: number;
  import?: number;
  descripcio?: string;
  categoria?: string;
  warnings?: string[];
}
interface Gasto {
  id: string;
  data: string;
  import: string | number;
  descripcio: string;
  metodePagament: keyof typeof METODE_COBRAMENT_LABELS;
  adjuntPath: string | null;
  esFianca: boolean;
  numFactura: string | null;
  baseImposable: string | number | null;
  ivaPercent: string | number | null;
  irpfPercent: string | number | null;
  desglossamentIva: { base: number; ivaPercent: number }[] | null;
  categoriaId: string;
  proveidorId: string | null;
  habitacioId: string | null;
  categoria: { nom: string };
  proveidor: { nom: string } | null;
  habitacio: { nom: string } | null;
}

interface EditForm {
  data: string; import: string; categoriaId: string; proveidorId: string; habitacioId: string;
  metodePagament: string; descripcio: string; numFactura: string;
  liniesIva: LiniaIvaForm[]; irpfPercent: string;
  /** Fitxa del proveïdor triat (es desa al proveïdor, no a la despesa). */
  prov: DadesProv;
  adjuntPath: string | null;
}

// ─── Gastos variables ─────────────────────────────────────────────────────────

// Estat inicial del formulari de nova despesa (inclou camps fiscals i el
// proveïdor detectat per l'escàner, que es buiden en desar).
function novaBuida() {
  return {
    data: toISODate(new Date()),
    import: '',
    categoriaId: '',
    proveidorId: '',
    habitacioId: '',
    metodePagament: 'TARGETA',
    descripcio: '',
    numFactura: '',
    // Una línia per tipus d'IVA (la majoria de factures en tenen una sola).
    liniesIva: [liniaBuida()] as LiniaIvaForm[],
    irpfPercent: '',
    proveidorNom: '',
    proveidorNif: '',
    proveidorActivitat: '',
    proveidorTelefon: '',
    proveidorEmail: '',
    proveidorAdreca: '',
    proveidorWeb: '',
    esFianca: false,
  };
}

interface DuplicatInfo {
  id: string;
  data: string;
  import: number;
  numFactura: string | null;
  proveidor: string | null;
  descripcio: string;
  esFianca: boolean;
}

/** Si l'error és l'avís de «factura ja pujada» del servidor, les que coincideixen. */
function duplicatsDe(err: unknown): DuplicatInfo[] | null {
  if (!(err instanceof ApiError) || err.status !== 409) return null;
  const d = err.details as { code?: string; duplicats?: DuplicatInfo[] } | undefined;
  return d?.code === 'DUPLICAT' && d.duplicats?.length ? d.duplicats : null;
}

/** Què es mira i amb què es compara (ho porta la pàgina; la llista ho aplica). */
interface FiltreEstat {
  filtres: FiltreDespesa[];
  setFiltres: (f: FiltreDespesa[]) => void;
  comparacio: ModeComparacio;
  setComparacio: (m: ModeComparacio) => void;
  rangAMa: { desde: string; fins: string };
  setRangAMa: (r: { desde: string; fins: string }) => void;
  /** Rang amb què es compara ara, o null si no es compara. */
  rangB: { desde: string; fins: string } | null;
  consultes: ConsultaDesada[];
  consultaActiva: string | null;
  aplicaConsulta: (c: ConsultaDesada) => void;
  desaConsulta: (nom: string) => Promise<void>;
  esborraConsulta: (c: ConsultaDesada) => Promise<void>;
  treuTot: () => void;
}

function GastosVariablesTab({
  desde,
  fins,
  filtre,
  onSavedDate,
  periode,
  resumPeriode,
  showForm,
  setShowForm,
  fotoNova,
}: {
  desde: string;
  fins: string;
  filtre: FiltreEstat;
  onSavedDate: (data: string) => void;
  /** El selector de període (va a la primera fila de la targeta). */
  periode: ReactNode;
  /** La línia del total del període quan no hi ha cap filtre. */
  resumPeriode: ReactNode;
  showForm: boolean;
  setShowForm: (v: boolean | ((s: boolean) => boolean)) => void;
  /** Foto feta amb «Fer foto» de la capçalera: obre el formulari i s'escaneja. */
  fotoNova: { file: File; n: number } | null;
}) {
  const { filtres, rangB } = filtre;
  const actiu = filtres.length > 0 || rangB !== null;
  const [categories, setCategories] = useState<Cat[]>([]);
  const [proveidors, setProveidors] = useState<Prov[]>([]);
  const [habitacions, setHabitacions] = useState<Hab[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  // Despeses del període amb què es compara (ja sense filtrar).
  const [gastosB, setGastosB] = useState<Gasto[] | null>(null);
  const [graficObert, setGraficObert] = useState(true);

  const [nova, setNova] = useState(novaBuida);
  const [file, setFile] = useState<File | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  // «Fer foto» de la capçalera: la càmera s'obre allà mateix (si s'obrís des
  // d'aquí, el mòbil la bloquejaria), i la foto arriba aquí per escanejar-la.
  const fotoN = fotoNova?.n ?? 0;
  useEffect(() => {
    if (!fotoNova) return;
    setShowForm(true);
    triaFitxer(fotoNova.file);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- només quan arriba una foto nova
  }, [fotoN]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Avís quan la despesa s'ha vinculat sola a un servei recurrent (p. ex. Gestaigua).
  const [avisServei, setAvisServei] = useState<string | null>(null);

  // Escàner del tiquet/factura (OCR amb Claude): estat de la lectura.
  const [scanning, setScanning] = useState(false);
  const [scanWarnings, setScanWarnings] = useState<string[]>([]);
  const [scanNouProv, setScanNouProv] = useState<{ nom: string; nif: string } | null>(null);

  // Edició inline d'una despesa existent.
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ data: '', import: '', categoriaId: '', proveidorId: '', habitacioId: '', metodePagament: 'TARGETA', descripcio: '', numFactura: '', liniesIva: [liniaBuida()], irpfPercent: '', prov: dadesDe(undefined), adjuntPath: null });
  // Nova foto/fitxer per substituir l'adjunt de la despesa que s'edita.
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  // Avís de factura ja pujada: les que coincideixen i com desar igualment.
  const [duplicat, setDuplicat] = useState<{ duplicats: DuplicatInfo[]; desa: () => Promise<void> } | null>(null);
  const [desantDuplicat, setDesantDuplicat] = useState(false);
  // Despesa a destacar a la llista (després de «Veure-la»).
  const [destacaId, setDestacaId] = useState<string | null>(null);

  // Es demana el període sencer sense filtrar: així els suggeriments del cercador
  // mostren tot el que hi ha i filtrar és immediat, sense anar al servidor.
  const bDesde = rangB?.desde ?? null;
  const bFins = rangB?.fins ?? null;
  const load = useCallback(async () => {
    const p = new URLSearchParams({ desde, fins });
    const [res, resB] = await Promise.all([
      getJSON<{ gastos: Gasto[] }>(`/api/gastos?${p.toString()}`),
      bDesde && bFins
        ? getJSON<{ gastos: Gasto[] }>(`/api/gastos?${new URLSearchParams({ desde: bDesde, fins: bFins }).toString()}`)
        : Promise.resolve(null),
    ]);
    setGastos(res.gastos);
    setGastosB(resB ? resB.gastos : null);
  }, [desde, fins, bDesde, bFins]);

  const visibles = gastos.filter((g) => coincideix(g, filtres));
  const visiblesB = gastosB ? gastosB.filter((g) => coincideix(g, filtres)) : null;
  const { total: totalVisible, n: nVisible } = totalDespeses(visibles);
  const fiancaVisible = visibles
    .filter((g) => g.esFianca)
    .reduce((a, g) => a + Number(g.import), 0);
  const resumB = visiblesB ? totalDespeses(visiblesB) : null;
  const etiquetaFiltres = filtres.map(etiquetaFiltre).join(' + ');

  useEffect(() => {
    getJSON<{ categories: Cat[] }>('/api/categories-gasto').then((r) => setCategories(r.categories));
    getJSON<{ proveidors: Prov[] }>('/api/proveidors').then((r) => setProveidors(r.proveidors));
    getJSON<{ habitacions: Hab[] }>('/api/habitacions').then((r) => setHabitacions(r.habitacions));
  }, []);
  useEffect(() => { load(); }, [load]);
  // «Veure-la»: quan la despesa ja és a la llista, hi va i la destaca uns segons.
  useEffect(() => {
    if (!destacaId || !gastos.some((g) => g.id === destacaId)) return;
    document.getElementById(`gasto-${destacaId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const t = setTimeout(() => setDestacaId(null), 6000);
    return () => clearTimeout(t);
  }, [destacaId, gastos]);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    // Avisem clarament del que falta (abans sortia sense fer res, i semblava
    // que el botó no funcionava).
    if (!nova.import) { setError('Cal indicar l’import.'); return; }
    if (!nova.categoriaId) { setError('Cal triar una categoria abans de desar.'); return; }
    if (!nova.descripcio.trim()) { setError('Cal una descripció.'); return; }
    setSaving(true); setError(null);
    try {
      let adjuntPath: string | undefined;
      if (file) {
        const fd = new FormData(); fd.append('file', await redueixImatge(file), file.name);
        const up = await fetch('/api/uploads', { method: 'POST', body: fd });
        if (!up.ok) throw new ApiError(await motiuPujada(up, 'No s\'ha pogut pujar l\'adjunt'), up.status);
        adjuntPath = (await up.json()).path;
      }
      const payload = {
        data: nova.data,
        import: Number(nova.import),
        categoriaId: nova.categoriaId,
        proveidorId: nova.proveidorId || undefined,
        habitacioId: nova.habitacioId || undefined,
        metodePagament: nova.metodePagament,
        descripcio: nova.descripcio,
        numFactura: nova.numFactura || undefined,
        ...payloadIva(nova.liniesIva),
        irpfPercent: nova.irpfPercent || undefined,
        // Si no s'ha triat proveïdor, enviem el detectat per l'escàner (el servidor
        // el busca o el crea per tenir NIF i dades de contacte al trimestre).
        proveidorNom: nova.proveidorId ? undefined : nova.proveidorNom || undefined,
        proveidorNif: nova.proveidorId ? undefined : nova.proveidorNif || undefined,
        proveidorActivitat: nova.proveidorId ? undefined : nova.proveidorActivitat || undefined,
        proveidorTelefon: nova.proveidorId ? undefined : nova.proveidorTelefon || undefined,
        proveidorEmail: nova.proveidorId ? undefined : nova.proveidorEmail || undefined,
        proveidorAdreca: nova.proveidorId ? undefined : nova.proveidorAdreca || undefined,
        proveidorWeb: nova.proveidorId ? undefined : nova.proveidorWeb || undefined,
        adjuntPath,
        esFianca: nova.esFianca,
      };
      const desa = async (ignoraDuplicat: boolean) => {
        const res = await postJSON<{ servei: { activitat: string; properaData: string | null } | null }>(
          '/api/gastos', { ...payload, ...(ignoraDuplicat ? { ignoraDuplicat: true } : {}) },
        );
        setAvisServei(res?.servei
          ? `Despesa vinculada al servei «${res.servei.activitat}»` +
            (res.servei.properaData ? `. Propera factura: ${formatDate(res.servei.properaData)}.` : '.')
          : null);
        setNova(novaBuida());
        setFile(null); setScanWarnings([]); setScanNouProv(null); setShowForm(false);
        onSavedDate(nova.data);
        await load();
      };
      try {
        await desa(false);
      } catch (err) {
        // Sembla una factura ja pujada: avisem i deixem triar (l'adjunt ja pujat es reaprofita).
        const dups = duplicatsDe(err);
        if (!dups) throw err;
        setDuplicat({ duplicats: dups, desa: () => desa(true) });
      }
    } catch (err) { setError(err instanceof ApiError ? err.message : 'Error desant la despesa'); } finally { setSaving(false); }
  }

  // En triar un proveïdor ja usat, omple els camps buits amb els seus valors
  // habituals (categoria, %IVA, %IRPF, mètode) de l'última despesa. Així només
  // cal posar el producte i el preu; el NIF ja ve amb el proveïdor.
  async function aplicaDefaultsProveidor(id: string) {
    if (!id) return;
    try {
      const { defaults } = await getJSON<{ defaults: ProvDefaults | null }>(`/api/proveidors/${id}/defaults`);
      if (!defaults) return;
      setNova((n) => ({
        ...n,
        categoriaId: n.categoriaId || defaults.categoriaId || '',
        // El % habitual només s'aplica a una sola línia encara sense %.
        liniesIva: n.liniesIva.length === 1 && !n.liniesIva[0]!.ivaPercent && defaults.ivaPercent != null
          ? [{ ...n.liniesIva[0]!, ivaPercent: String(defaults.ivaPercent) }]
          : n.liniesIva,
        irpfPercent: n.irpfPercent || (defaults.irpfPercent != null ? String(defaults.irpfPercent) : ''),
        // El mètode només es reomple si encara és el per defecte (no tocat).
        metodePagament: n.metodePagament === 'TARGETA' && defaults.metodePagament ? defaults.metodePagament : n.metodePagament,
      }));
    } catch {
      /* si falla, es queda sense autoemplenar */
    }
  }

  // Tria un fitxer d'adjunt i, si és imatge o PDF, l'escaneja per autoemplenar.
  function triaFitxer(f: File | null) {
    setFile(f);
    setScanWarnings([]); setScanNouProv(null);
    if (f) void escaneja(f);
  }

  // Escàner OCR (Claude): llegeix data, proveïdor, NIF, nº factura, base, IVA,
  // IRPF i total del tiquet/factura i autoemplena el formulari (camps editables).
  async function escaneja(f: File) {
    setScanning(true); setError(null);
    try {
      const fd = new FormData(); fd.append('image', await redueixImatge(f), f.name);
      // Enviem la llista de categories perquè l'escàner en triï la més adient.
      fd.append('categories', JSON.stringify(categories.map((c) => c.nom)));
      const res = await fetch('/api/ocr/gasto', { method: 'POST', body: fd });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        const motiu = res.status === 413 ? 'el fitxer és massa gran' : body?.error ?? `error ${res.status}`;
        setScanWarnings([`No s’ha pogut escanejar el fitxer (${motiu}). Omple les dades a mà.`]);
        return;
      }
      const { result } = (await res.json()) as { result: GastoOcrClient };

      const matchProv = result.proveidorNom
        ? proveidors.find((p) => p.nom.trim().toLowerCase() === result.proveidorNom!.trim().toLowerCase())
        : undefined;

      // Categoria suggerida per l'escàner → id. Si no casa amb cap, caiem a "Altres".
      const catByName = (nom?: string) =>
        nom ? categories.find((c) => c.nom.trim().toLowerCase() === nom.trim().toLowerCase()) : undefined;
      const catSugg = catByName(result.categoria) ?? catByName('Altres');

      setNova((n) => {
        const next = { ...n };
        if (result.data) next.data = result.data;
        if (result.import != null) next.import = String(result.import);
        if (result.numFactura) next.numFactura = result.numFactura;
        // Diversos tipus d'IVA → una línia per tipus; si no, base i % simples.
        if (result.desglossamentIva && result.desglossamentIva.length >= 2) {
          next.liniesIva = result.desglossamentIva.map((l) => ({ base: String(l.base), ivaPercent: String(l.ivaPercent) }));
        } else if (result.baseImposable != null || result.ivaPercent != null) {
          next.liniesIva = [{
            base: result.baseImposable != null ? String(result.baseImposable) : '',
            ivaPercent: result.ivaPercent != null ? String(result.ivaPercent) : '',
          }];
        }
        if (result.irpfPercent != null) next.irpfPercent = String(result.irpfPercent);
        if (result.descripcio && !n.descripcio.trim()) next.descripcio = result.descripcio;
        // Categoria: només si no n'hi ha cap de triada, per no trepitjar la de l'usuari.
        if (!n.categoriaId && catSugg) next.categoriaId = catSugg.id;
        if (!n.proveidorId && result.proveidorNom) {
          if (matchProv) {
            next.proveidorId = matchProv.id;
            next.proveidorNom = ''; next.proveidorNif = '';
            next.proveidorActivitat = ''; next.proveidorTelefon = '';
            next.proveidorEmail = ''; next.proveidorAdreca = ''; next.proveidorWeb = '';
          } else {
            next.proveidorNom = result.proveidorNom;
            next.proveidorNif = result.proveidorNif ?? '';
            next.proveidorActivitat = result.proveidorActivitat ?? '';
            next.proveidorTelefon = result.proveidorTelefon ?? '';
            next.proveidorEmail = result.proveidorEmail ?? '';
            next.proveidorAdreca = result.proveidorAdreca ?? '';
            next.proveidorWeb = result.proveidorWeb ?? '';
          }
        }
        return next;
      });

      if (result.proveidorNom && !matchProv && !nova.proveidorId) {
        setScanNouProv({ nom: result.proveidorNom, nif: result.proveidorNif ?? '' });
      }
      // Si l'OCR ha casat amb un proveïdor existent, completem els camps que el
      // tiquet no dona (p.ex. la categoria) amb els seus valors habituals.
      if (matchProv && !nova.proveidorId) void aplicaDefaultsProveidor(matchProv.id);
      setScanWarnings(result.warnings ?? []);
    } catch {
      setScanWarnings(['No s’ha pogut escanejar el fitxer. Omple les dades a mà.']);
    } finally {
      setScanning(false);
    }
  }

  async function esborrar(id: string) {
    if (!confirm('Segur que vols eliminar aquesta despesa?')) return;
    await fetch(`/api/gastos/${id}`, { method: 'DELETE' }); load();
  }

  async function toggleFianca(g: Gasto) {
    const nouEsFianca = !g.esFianca;
    const msg = nouEsFianca
      ? 'Marcar com a fiança/dipòsit? No comptarà al balanç.'
      : 'Marcar com a despesa real? Comptarà al balanç.';
    if (!confirm(msg)) return;
    try {
      await patchJSON(`/api/gastos/${g.id}`, { esFianca: nouEsFianca });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error actualitzant');
    }
  }

  function startEdit(g: Gasto) {
    setError(null);
    setEditId(g.id);
    setEditForm({
      data: g.data.slice(0, 10),
      import: String(Number(g.import)),
      categoriaId: g.categoriaId,
      proveidorId: g.proveidorId ?? '',
      habitacioId: g.habitacioId ?? '',
      metodePagament: g.metodePagament,
      descripcio: g.descripcio,
      numFactura: g.numFactura ?? '',
      liniesIva: liniesDeGasto(g),
      irpfPercent: g.irpfPercent != null ? String(Number(g.irpfPercent)) : '',
      prov: dadesDe(proveidors.find((p) => p.id === g.proveidorId)),
      adjuntPath: g.adjuntPath,
    });
    setEditFile(null);
  }

  async function desarEdit(id: string) {
    if (!editForm.categoriaId || !editForm.import) { setError('Cal categoria i import.'); return; }
    setEditSaving(true); setError(null);
    try {
      // 1) Fitxa del proveïdor: només si s'hi ha canviat alguna cosa.
      if (editForm.proveidorId) {
        const abans = dadesDe(proveidors.find((p) => p.id === editForm.proveidorId));
        const canvis = Object.fromEntries(
          CAMPS_PROV.filter(({ clau }) => editForm.prov[clau].trim() !== abans[clau].trim())
            .map(({ clau }) => [clau, editForm.prov[clau].trim()]),
        );
        if (Object.keys(canvis).length > 0) await patchJSON(`/api/proveidors/${editForm.proveidorId}`, canvis);
      }
      // 2) Adjunt nou (substitueix l'anterior).
      let adjuntPath: string | undefined;
      if (editFile) {
        const fd = new FormData(); fd.append('file', await redueixImatge(editFile), editFile.name);
        const up = await fetch('/api/uploads', { method: 'POST', body: fd });
        if (!up.ok) throw new ApiError(await motiuPujada(up, 'No s\'ha pogut pujar l\'adjunt'), up.status);
        adjuntPath = (await up.json()).path;
      }
      const payload = {
        ...(adjuntPath ? { adjuntPath } : {}),
        data: editForm.data,
        import: Number(editForm.import),
        categoriaId: editForm.categoriaId,
        proveidorId: editForm.proveidorId,
        habitacioId: editForm.habitacioId,
        metodePagament: editForm.metodePagament,
        descripcio: editForm.descripcio,
        numFactura: editForm.numFactura,
        ...payloadIva(editForm.liniesIva, true),
        irpfPercent: editForm.irpfPercent === '' ? null : Number(editForm.irpfPercent),
      };
      const desa = async (ignoraDuplicat: boolean) => {
        await patchJSON(`/api/gastos/${id}`, { ...payload, ...(ignoraDuplicat ? { ignoraDuplicat: true } : {}) });
        setEditId(null);
        setEditFile(null);
        load();
        getJSON<{ proveidors: Prov[] }>('/api/proveidors').then((r) => setProveidors(r.proveidors)).catch(() => {});
      };
      try {
        await desa(false);
      } catch (err) {
        const dups = duplicatsDe(err);
        if (!dups) throw err;
        setDuplicat({ duplicats: dups, desa: () => desa(true) });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error desant la despesa');
    } finally {
      setEditSaving(false);
    }
  }

  return (
    <>
      <ConfirmDialog
        open={duplicat !== null}
        danger={false}
        title="Sembla que aquesta factura ja està pujada"
        message={duplicat && duplicat.duplicats.length > 1 ? 'Ja hi ha aquestes despeses amb les mateixes dades:' : 'Ja hi ha una despesa amb les mateixes dades:'}
        confirmLabel={desantDuplicat ? 'Desant…' : 'Desar igualment'}
        onCancel={() => setDuplicat(null)}
        onConfirm={async () => {
          if (!duplicat || desantDuplicat) return;
          setDesantDuplicat(true);
          try {
            await duplicat.desa();
            setDuplicat(null);
          } catch (err) {
            setDuplicat(null);
            setError(err instanceof ApiError ? err.message : 'Error desant la despesa');
          } finally {
            setDesantDuplicat(false);
          }
        }}
        extra={
          <ul className="mt-4 space-y-2">
            {duplicat?.duplicats.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm ring-1 ring-amber-200">
                <span className="min-w-0">
                  <span className="font-medium text-slate-800">
                    {formatDate(d.data)} · {d.proveidor ?? 'Sense proveïdor'}
                  </span>
                  <span className="block text-xs text-slate-500">
                    {d.numFactura ? `Nº ${d.numFactura} · ` : ''}
                    <span className="font-semibold text-slate-700">{formatEur(d.import)}</span>
                    {d.esFianca ? ' · Fiança' : ''}
                  </span>
                </span>
                <button
                  type="button"
                  className="text-xs font-semibold text-brand-700 hover:underline"
                  onClick={() => {
                    setDuplicat(null);
                    setDestacaId(d.id);
                    onSavedDate(d.data.slice(0, 10));
                  }}
                >
                  Veure-la
                </button>
              </li>
            ))}
          </ul>
        }
      />

      {avisServei && (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <span>{avisServei}</span>
          <button onClick={() => setAvisServei(null)} className="shrink-0 text-green-600 hover:text-green-800">✕</button>
        </div>
      )}

      {showForm && (
        <Card className="mb-6">
          <CardBody>
            <form onSubmit={crear} className="grid gap-3 sm:grid-cols-3">
              <Field label="Data" required><Input type="date" value={nova.data} onChange={(e) => setNova({ ...nova, data: e.target.value })} /></Field>
              <Field label="Import €" required><Input type="number" step="0.01" value={nova.import} onChange={(e) => setNova({ ...nova, import: e.target.value })} /></Field>
              <Field label="Categoria" required>
                <Select value={nova.categoriaId} onChange={(e) => setNova({ ...nova, categoriaId: e.target.value })}>
                  <option value="">—</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </Select>
              </Field>
              <Field label="Proveïdor">
                <Select
                  value={nova.proveidorId}
                  onChange={(e) => { const id = e.target.value; setNova({ ...nova, proveidorId: id, proveidorNom: '', proveidorNif: '' }); if (id) { setScanNouProv(null); void aplicaDefaultsProveidor(id); } }}
                >
                  <option value="">—</option>
                  {proveidors.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
                </Select>
              </Field>
              <Field label="Habitació" hint="Deixa-ho en «General» si no és d'una habitació concreta.">
                <Select value={nova.habitacioId} onChange={(e) => setNova({ ...nova, habitacioId: e.target.value })}>
                  <option value="">General</option>
                  {habitacions.map((h) => <option key={h.id} value={h.id}>{h.nom}</option>)}
                </Select>
              </Field>
              <Field label="Mètode de pagament">
                <Select value={nova.metodePagament} onChange={(e) => setNova({ ...nova, metodePagament: e.target.value })}>
                  {optionsFrom(metodeCobramentValues, METODE_COBRAMENT_LABELS).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
              </Field>
              <Field label="Nº factura" hint="Del proveïdor (per al llibre d'IVA).">
                <Input value={nova.numFactura} onChange={(e) => setNova({ ...nova, numFactura: e.target.value })} />
              </Field>
              <LiniesIva
                className="sm:col-span-2"
                linies={nova.liniesIva}
                onChange={(l) => setNova({ ...nova, liniesIva: l })}
                total={nova.import}
                irpfPercent={nova.irpfPercent}
              />
              <Field label="% IRPF" hint="Retenció (deixa buit si no n'hi ha).">
                <Input type="number" step="0.01" value={nova.irpfPercent} onChange={(e) => setNova({ ...nova, irpfPercent: e.target.value })} />
              </Field>
              <Field label="Adjunt (factura/ticket)" hint="Fes una foto o puja el fitxer: es llegiran les dades automàticament." className="sm:col-span-2">
                <div className="flex flex-wrap items-center gap-2">
                  <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => triaFitxer(e.target.files?.[0] ?? null)} />
                  <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => triaFitxer(e.target.files?.[0] ?? null)} />
                  <Button type="button" variant="outline" size="sm" onClick={() => cameraRef.current?.click()}><Camera className="h-4 w-4" /> Fer foto</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" /> Pujar fitxer</Button>
                  {scanning && <span className="text-xs font-medium text-brand-700">Llegint el tiquet…</span>}
                  {file && (
                    <span className="flex items-center gap-1 text-xs text-slate-600">
                      <Paperclip className="h-3.5 w-3.5 text-slate-400" />
                      <span className="max-w-40 truncate">{file.name}</span>
                      <button type="button" onClick={() => { setFile(null); setScanWarnings([]); setScanNouProv(null); if (cameraRef.current) cameraRef.current.value = ''; if (fileRef.current) fileRef.current.value = ''; }} className="p-2 touch-manipulation text-slate-400 hover:text-red-600" aria-label="Treure l'adjunt"><X className="h-3.5 w-3.5" /></button>
                    </span>
                  )}
                </div>
              </Field>
              {(scanNouProv || scanWarnings.length > 0) && (
                <div className="sm:col-span-3 space-y-2">
                  {scanNouProv && !nova.proveidorId && (
                    <div className="rounded-lg border border-brand-200 bg-brand-50/50 px-3 py-2.5 text-sm text-brand-800">
                      <p className="mb-2 font-medium">Proveïdor nou detectat — revisa’l i edita’l si cal (es crearà en desar):</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Field label="Nom del proveïdor">
                          <Input value={nova.proveidorNom} onChange={(e) => setNova({ ...nova, proveidorNom: e.target.value })} placeholder="Nom del proveïdor" />
                        </Field>
                        <Field label="NIF/CIF">
                          <Input value={nova.proveidorNif} onChange={(e) => setNova({ ...nova, proveidorNif: e.target.value })} placeholder="Ex. ESA82037292" />
                        </Field>
                        <Field label="Activitat">
                          <Input value={nova.proveidorActivitat} onChange={(e) => setNova({ ...nova, proveidorActivitat: e.target.value })} placeholder="Ex. Electrònica, Ferreteria…" />
                        </Field>
                        <Field label="Telèfon">
                          <Input value={nova.proveidorTelefon} onChange={(e) => setNova({ ...nova, proveidorTelefon: e.target.value })} placeholder="Ex. 937 66 08 93" />
                        </Field>
                        <Field label="E-mail">
                          <Input value={nova.proveidorEmail} onChange={(e) => setNova({ ...nova, proveidorEmail: e.target.value })} placeholder="Ex. info@proveidor.cat" />
                        </Field>
                        <Field label="Web">
                          <Input value={nova.proveidorWeb} onChange={(e) => setNova({ ...nova, proveidorWeb: e.target.value })} placeholder="Ex. www.proveidor.cat" />
                        </Field>
                        <Field label="Adreça" className="sm:col-span-2">
                          <Input value={nova.proveidorAdreca} onChange={(e) => setNova({ ...nova, proveidorAdreca: e.target.value })} placeholder="Carrer, població" />
                        </Field>
                      </div>
                      <p className="mt-1.5 text-xs text-brand-700/70">O tria’n un d’existent a la llista «Proveïdor» de dalt.</p>
                    </div>
                  )}
                  {scanWarnings.length > 0 && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 text-xs text-amber-800">
                      <span className="font-medium">Revisa les dades llegides:</span>
                      <ul className="mt-1 list-disc pl-4">
                        {scanWarnings.map((w, i) => <li key={i}>{w}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              <Field label="Descripció" required className="sm:col-span-3"><Input value={nova.descripcio} onChange={(e) => setNova({ ...nova, descripcio: e.target.value })} /></Field>
              <label className="sm:col-span-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5 accent-amber-600"
                  checked={nova.esFianca}
                  onChange={(e) => setNova({ ...nova, esFianca: e.target.checked })}
                />
                <span>
                  <span className="font-medium text-amber-800">És una fiança</span>
                  <span className="block text-xs text-amber-700/80">
                    No es comptarà com a despesa al balanç. Quan la vulguis declarar, desmarca-la (passa a despesa real).
                  </span>
                </span>
              </label>
              <div className="sm:col-span-3 flex items-center gap-3">
                <Button type="submit" disabled={saving}>{saving ? 'Desant…' : 'Desar despesa'}</Button>
                {error && <span className="text-sm text-red-600">{error}</span>}
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {/* Una sola targeta: a dalt, el període i el filtre; a sota, el total del
          període o, amb un filtre, el resultat (i el gràfic). */}
      <div className="mb-5 rounded-xl border border-slate-200 bg-white ui-card">
        <div className="flex flex-wrap items-center gap-2 px-3 py-3 sm:px-4">
          {periode}
          <FiltreBarra
            className="min-w-0 flex-[1_1_28rem]"
            filtres={filtres}
            onFiltres={filtre.setFiltres}
            comparacio={filtre.comparacio}
            onComparacio={filtre.setComparacio}
            rangComparat={rangB}
            rangAMa={filtre.rangAMa}
            onRangAMa={filtre.setRangAMa}
            gastosPeriode={gastos}
            proveidors={proveidors}
            categories={categories}
            consultes={filtre.consultes}
            consultaActiva={filtre.consultaActiva}
            onAplicaConsulta={filtre.aplicaConsulta}
            onDesaConsulta={filtre.desaConsulta}
            onEsborraConsulta={filtre.esborraConsulta}
            onTreuTot={filtre.treuTot}
            canWrite
          />
        </div>
        <div className="border-t border-slate-100 bg-slate-50/60">
          {actiu ? (
            <ResultatFiltre
              total={totalVisible}
              n={nVisible}
              fiances={fiancaVisible}
              comparat={resumB ? { total: resumB.total, ...variacio(totalVisible, resumB.total) } : null}
              etiquetaComparat={rangB ? `del ${formatDate(rangB.desde)} al ${formatDate(rangB.fins)}` : ''}
              graficObert={graficObert}
              onGrafic={() => setGraficObert((o) => !o)}
              grafic={
                <GraficDespeses
                  gastosAra={visibles}
                  rangAra={{ desde, fins }}
                  gastosAbans={visiblesB}
                  rangAbans={rangB}
                />
              }
            />
          ) : (
            resumPeriode
          )}
        </div>
      </div>

      {visibles.length === 0 && !(visiblesB && visiblesB.length > 0) ? (
        <EmptyState>
          <Filter className="mx-auto mb-2 h-5 w-5 text-slate-300" />
          {filtres.length > 0 ? `Cap despesa de ${etiquetaFiltres} en aquest període.` : 'Cap despesa en aquest període.'}
        </EmptyState>
      ) : (
        <Table>
          <Thead>
            <tr><Th>Data</Th><Th>Descripció</Th><Th>Categoria</Th><Th>Habitació</Th><Th>Proveïdor</Th><Th>Mètode</Th><Th className="text-right">Import</Th><Th></Th></tr>
          </Thead>
          <tbody>
            {visibles.map((g) => (
              <Fragment key={g.id}>
              <Tr
                id={`gasto-${g.id}`}
                className={cn(g.esFianca && 'bg-amber-50/40', destacaId === g.id && 'bg-amber-100 ring-2 ring-inset ring-amber-400')}
              >
                <Td>{formatDate(g.data)}</Td>
                <Td className="font-medium text-slate-800">
                  {g.descripcio}
                  {g.esFianca && (
                    <Badge tone="warning" className="ml-2 align-middle">Fiança</Badge>
                  )}
                  {g.adjuntPath && <a href={`/api/files?path=${encodeURIComponent(g.adjuntPath)}`} target="_blank" rel="noreferrer" className="ml-2 inline-flex text-brand-600" title="Veure adjunt"><Paperclip className="h-3.5 w-3.5" /></a>}
                </Td>
                <Td>{g.categoria.nom}</Td>
                <Td>{g.habitacio?.nom ? `Hab. ${g.habitacio.nom}` : 'General'}</Td>
                <Td>{g.proveidor?.nom ?? '—'}</Td>
                <Td>{METODE_COBRAMENT_LABELS[g.metodePagament]}</Td>
                <Td className={cn('text-right font-medium', g.esFianca && 'text-amber-700')}><Eur value={Number(g.import)} /></Td>
                <Td>
                  <div className="flex items-center justify-end gap-1">
                    <button
                      className="p-2 touch-manipulation text-slate-400 hover:text-brand-600"
                      onClick={() => (editId === g.id ? setEditId(null) : startEdit(g))}
                      title="Editar despesa"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      className={g.esFianca ? 'text-amber-600 hover:text-slate-600' : 'text-slate-400 hover:text-amber-600'}
                      onClick={() => toggleFianca(g)}
                      title={g.esFianca ? 'Marcar com a despesa real (comptarà al balanç)' : 'Marcar com a fiança/dipòsit (no comptarà al balanç)'}
                    >
                      {g.esFianca ? <ShieldOff className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                    </button>
                    <button className="p-2 touch-manipulation text-slate-400 hover:text-red-600" onClick={() => esborrar(g.id)}><Trash2 className="h-4 w-4" /></button>
                  </div>
                </Td>
              </Tr>
              {editId === g.id && (
                <tr className="bg-brand-50/40">
                  <td colSpan={8} className="px-4 py-3">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <Field label="Data"><Input type="date" value={editForm.data} onChange={(e) => setEditForm({ ...editForm, data: e.target.value })} /></Field>
                      <Field label="Import €"><Input type="number" step="0.01" value={editForm.import} onChange={(e) => setEditForm({ ...editForm, import: e.target.value })} /></Field>
                      <Field label="Categoria">
                        <Select value={editForm.categoriaId} onChange={(e) => setEditForm({ ...editForm, categoriaId: e.target.value })}>
                          <option value="">—</option>
                          {categories.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
                        </Select>
                      </Field>
                      <Field label="Proveïdor">
                        <Select value={editForm.proveidorId} onChange={(e) => setEditForm({ ...editForm, proveidorId: e.target.value, prov: dadesDe(proveidors.find((p) => p.id === e.target.value)) })}>
                          <option value="">—</option>
                          {proveidors.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
                        </Select>
                      </Field>
                      <Field label="Habitació">
                        <Select value={editForm.habitacioId} onChange={(e) => setEditForm({ ...editForm, habitacioId: e.target.value })}>
                          <option value="">General</option>
                          {habitacions.map((h) => <option key={h.id} value={h.id}>{h.nom}</option>)}
                        </Select>
                      </Field>
                      <Field label="Mètode de pagament">
                        <Select value={editForm.metodePagament} onChange={(e) => setEditForm({ ...editForm, metodePagament: e.target.value })}>
                          {optionsFrom(metodeCobramentValues, METODE_COBRAMENT_LABELS).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </Select>
                      </Field>
                      <Field label="Núm. factura (proveïdor)"><Input value={editForm.numFactura} onChange={(e) => setEditForm({ ...editForm, numFactura: e.target.value })} /></Field>
                      <Field label="Descripció" className="sm:col-span-2"><Input value={editForm.descripcio} onChange={(e) => setEditForm({ ...editForm, descripcio: e.target.value })} /></Field>
                      <LiniesIva
                        className="sm:col-span-2"
                        linies={editForm.liniesIva}
                        onChange={(l) => setEditForm({ ...editForm, liniesIva: l })}
                        total={editForm.import}
                        irpfPercent={editForm.irpfPercent}
                      />
                      <Field label="% IRPF"><Input type="number" step="0.01" value={editForm.irpfPercent} onChange={(e) => setEditForm({ ...editForm, irpfPercent: e.target.value })} /></Field>

                      {editForm.proveidorId && (
                        <div className="rounded-lg border border-slate-200 bg-white p-3 sm:col-span-3">
                          <p className="mb-2 text-xs font-semibold text-slate-600">
                            Dades del proveïdor <span className="font-normal text-slate-400">· es desen a la seva fitxa (valen per a totes les seves despeses)</span>
                          </p>
                          <div className="grid gap-3 sm:grid-cols-3">
                            {CAMPS_PROV.map(({ clau, etiqueta }) => (
                              <Field key={clau} label={etiqueta} className={clau === 'adreca' ? 'sm:col-span-2' : undefined}>
                                <Input
                                  value={editForm.prov[clau]}
                                  onChange={(e) => setEditForm({ ...editForm, prov: { ...editForm.prov, [clau]: e.target.value } })}
                                />
                              </Field>
                            ))}
                          </div>
                        </div>
                      )}

                      <Field label="Adjunt (factura/ticket)" className="sm:col-span-3">
                        <div className="flex flex-wrap items-center gap-3 text-sm">
                          {editForm.adjuntPath && !editFile && (
                            <a href={`/api/files?path=${encodeURIComponent(editForm.adjuntPath)}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-medium text-brand-700 hover:underline">
                              <Paperclip className="h-4 w-4" /> Veure la factura
                            </a>
                          )}
                          {!editForm.adjuntPath && !editFile && <span className="text-slate-400">Sense adjunt</span>}
                          {editFile && <span className="text-slate-700">Nou: {editFile.name}</span>}
                          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-600 hover:border-brand-600 hover:text-brand-700">
                            <Upload className="h-4 w-4" /> {editForm.adjuntPath || editFile ? 'Substituir' : 'Afegir'}
                            <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => setEditFile(e.target.files?.[0] ?? null)} />
                          </label>
                          {editFile && (
                            <button type="button" className="text-slate-500 hover:underline" onClick={() => setEditFile(null)}>Desfer</button>
                          )}
                        </div>
                      </Field>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <Button size="sm" onClick={() => desarEdit(g.id)} disabled={editSaving}><Check className="h-4 w-4" /> {editSaving ? 'Desant…' : 'Desar'}</Button>
                      <Button size="sm" variant="ghost" onClick={() => { setEditId(null); setEditFile(null); }} disabled={editSaving}>Cancel·lar</Button>
                    </div>
                  </td>
                </tr>
              )}
              </Fragment>
            ))}
            <Tr className="bg-brand-50">
              <Td colSpan={6} className="font-semibold text-slate-700">
                Total{etiquetaFiltres ? ` · ${etiquetaFiltres}` : ''}
                {fiancaVisible > 0 && (
                  <span className="ml-2 font-normal text-amber-700">
                    (fiances a part: <Eur value={fiancaVisible} />)
                  </span>
                )}
              </Td>
              <Td className="text-right font-semibold text-brand-800"><Eur value={totalVisible} /></Td>
              <Td></Td>
            </Tr>
            {rangB && visiblesB && (
              <>
                <tr>
                  <td colSpan={8} className="bg-amber-50/70 px-4 pb-2 pt-5 text-[11px] font-bold uppercase tracking-[0.12em] text-amber-800">
                    Per comparar · {formatDate(rangB.desde)} – {formatDate(rangB.fins)}
                  </td>
                </tr>
                {visiblesB.length === 0 && (
                  <tr className="bg-amber-50/70">
                    <td colSpan={8} className="px-4 py-3 text-sm text-slate-500">Cap despesa en aquest període.</td>
                  </tr>
                )}
                {visiblesB.map((g) => (
                  <Tr key={`b-${g.id}`} className="bg-amber-50/70 text-slate-600">
                    <Td>{formatDate(g.data)}</Td>
                    <Td>
                      {g.descripcio}
                      {g.esFianca && <Badge tone="warning" className="ml-2 align-middle">Fiança</Badge>}
                      {g.adjuntPath && <a href={`/api/files?path=${encodeURIComponent(g.adjuntPath)}`} target="_blank" rel="noreferrer" className="ml-2 inline-flex text-brand-600" title="Veure adjunt"><Paperclip className="h-3.5 w-3.5" /></a>}
                    </Td>
                    <Td>{g.categoria.nom}</Td>
                    <Td>{g.habitacio?.nom ? `Hab. ${g.habitacio.nom}` : 'General'}</Td>
                    <Td>{g.proveidor?.nom ?? '—'}</Td>
                    <Td>{METODE_COBRAMENT_LABELS[g.metodePagament]}</Td>
                    <Td className="text-right"><Eur value={Number(g.import)} /></Td>
                    <Td></Td>
                  </Tr>
                ))}
                <Tr className="bg-amber-50">
                  <Td colSpan={6} className="font-semibold text-slate-700">Total per comparar</Td>
                  <Td className="text-right font-semibold text-slate-800"><Eur value={resumB?.total ?? 0} /></Td>
                  <Td></Td>
                </Tr>
              </>
            )}
          </tbody>
        </Table>
      )}
    </>
  );
}

// ─── Pàgina principal ─────────────────────────────────────────────────────────
// Despeses = la llista de factures i tiquets (entrar-les i repassar-les). El
// resum (gràfic de l'any, «En què se'n va») i el personal es miren al Balanç i a
// Treballadors; aquí només en queda una línia amb l'enllaç.

interface ResumCurt {
  variables: number; nVariables: number;
  fiances: number;
  personal: number; personalPendent: number;
}

function GastosContent() {
  // El període mana sobre la llista i el resum de dalt.
  const avui = toISODate(new Date());
  const [estat, setEstat] = useState<EstatPeriode>({ tipus: 'mes', off: 0 });
  const { desde, fins } = rangDeEstat(estat, avui);
  const [resum, setResum] = useState<ResumCurt | null>(null);

  // Filtre: què es mira i amb què es compara. En entrar, res (com sempre).
  const [filtres, setFiltresRaw] = useState<FiltreDespesa[]>([]);
  const [comparacio, setComparacioRaw] = useState<ModeComparacio>('CAP');
  const [rangAMa, setRangAMa] = useState<{ desde: string; fins: string }>({ desde: '', fins: '' });
  const [consultes, setConsultes] = useState<ConsultaDesada[]>([]);
  const [consultaActiva, setConsultaActiva] = useState<string | null>(null);
  const rangB = rangComparacio(comparacio, estat, desde, fins, avui, rangAMa);
  // Tocar el filtre a mà vol dir que ja no és la consulta desada tal qual.
  const setFiltres = (f: FiltreDespesa[]) => { setFiltresRaw(f); setConsultaActiva(null); };
  const setComparacio = (m: ModeComparacio) => {
    setComparacioRaw(m);
    setConsultaActiva(null);
    // «Un altre rang…» comença amb el període anterior, per no sortir buit.
    if (m === 'RANG' && !rangAMa.desde) {
      const r = rangComparacio('ANTERIOR', estat, desde, fins, avui);
      if (r) setRangAMa(r);
    }
  };

  useEffect(() => {
    getJSON<{ consultes: ConsultaDesada[] }>('/api/gastos/consultes')
      .then((r) => setConsultes(r.consultes))
      .catch(() => { /* sense consultes desades, la llista funciona igual */ });
  }, []);

  const filtre: FiltreEstat = {
    filtres,
    setFiltres,
    comparacio,
    setComparacio,
    rangAMa,
    setRangAMa,
    rangB,
    consultes,
    consultaActiva,
    aplicaConsulta: (c) => {
      setFiltresRaw(c.filtres);
      setComparacioRaw((['CAP', 'ANTERIOR', 'ANY_PASSAT'] as const).find((m) => m === c.comparacio) ?? 'CAP');
      setConsultaActiva(c.id);
    },
    desaConsulta: async (nom) => {
      try {
        const { consulta } = await postJSON<{ consulta: ConsultaDesada }>('/api/gastos/consultes', {
          nom,
          filtres,
          comparacio: comparacio === 'RANG' ? 'CAP' : comparacio,
        });
        setConsultes((cs) => [...cs, consulta]);
        setConsultaActiva(consulta.id);
      } catch (e) {
        throw new Error(e instanceof ApiError ? e.message : 'No s’ha pogut desar la consulta');
      }
    },
    esborraConsulta: async (c) => {
      if (!confirm(`Esborrar la consulta «${c.nom}»? Les despeses no es toquen.`)) return;
      await delJSON(`/api/gastos/consultes/${c.id}`);
      setConsultes((cs) => cs.filter((x) => x.id !== c.id));
      if (consultaActiva === c.id) setConsultaActiva(null);
    },
    treuTot: () => {
      setFiltresRaw([]);
      setComparacioRaw('CAP');
      setConsultaActiva(null);
    },
  };
  const [errResum, setErrResum] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    getJSON<ResumCurt>(`/api/gastos/resum?desde=${desde}&fins=${fins}`)
      .then((r) => { if (!cancel) { setResum(r); setErrResum(null); } })
      .catch((e) => {
        if (!cancel) {
          setResum(null);
          setErrResum(e instanceof ApiError ? e.message : 'No s’ha pogut carregar el resum');
        }
      });
    return () => { cancel = true; };
  }, [desde, fins]);

  // Una despesa desada fora del període: s'eixampla el rang perquè es vegi.
  function mostraDespesa(data: string) {
    if (data >= desde && data <= fins) return;
    setEstat({ tipus: 'per', desde: data < desde ? data : desde, fins: data > fins ? data : fins });
  }

  const [showForm, setShowForm] = useState(false);
  const [fotoNova, setFotoNova] = useState<{ file: File; n: number } | null>(null);
  const fotoRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <PageHeader
        title="Despeses"
        subtitle="Les factures i tiquets del hostal"
        actions={
          <div className="flex items-center gap-2">
            <HideAmountsButton nomesIcona />
            <input
              ref={fotoRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setFotoNova((p) => ({ file, n: (p?.n ?? 0) + 1 }));
                e.target.value = '';
              }}
            />
            <Button variant="outline" onClick={() => fotoRef.current?.click()}>
              <Camera className="h-4 w-4" /> Fer foto
            </Button>
            <Button onClick={() => setShowForm((s) => !s)}>
              <Plus className="h-4 w-4" /> Nova despesa
            </Button>
          </div>
        }
      />
      <FinancesNav />

      {errResum && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{errResum}</div>}

      <GastosVariablesTab
        desde={desde}
        fins={fins}
        filtre={filtre}
        onSavedDate={mostraDespesa}
        showForm={showForm}
        setShowForm={setShowForm}
        fotoNova={fotoNova}
        periode={<PeriodeCompacte estat={estat} onChange={setEstat} avui={avui} primerDia="2000-01-01" />}
        resumPeriode={
          // El total de la llista, les fiances a part i, si n'hi ha, el personal
          // del període amb enllaç a Treballadors.
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 text-sm">
            <span>
              <span className="ui-page-title text-xl font-bold text-slate-900"><Eur value={resum?.variables ?? 0} /></span>
              <span className="text-slate-500">
                {resum ? ` en ${resum.nVariables} ${resum.nVariables === 1 ? 'despesa' : 'despeses'}` : ' …'}
              </span>
            </span>
            <span className="hidden h-6 w-px bg-slate-200 sm:block" aria-hidden="true" />
            <span className="text-slate-500">
              Fiances <span className="font-semibold text-slate-800"><Eur value={resum?.fiances ?? 0} /></span>
            </span>
            {resum && resum.personal > 0 && (
              <Link href="/personal" className="text-slate-500 hover:text-brand-700">
                Personal <span className="font-semibold text-slate-800"><Eur value={resum.personal} /></span>
                {resum.personalPendent > 0 && (
                  <span className="font-semibold text-amber-700"> · <Eur value={resum.personalPendent} /> per pagar</span>
                )}
              </Link>
            )}
            <Link href="/balanc" className="ml-auto text-sm font-semibold text-brand-700 hover:underline">
              Gràfics al Balanç →
            </Link>
          </div>
        }
      />
    </div>
  );
}

export default function GastosPage() {
  return (
    <Suspense>
      <GastosContent />
    </Suspense>
  );
}
