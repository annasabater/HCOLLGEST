'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Save, Check, Undo2, CheckCheck, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { BugaderiaMensualCard } from '@/components/estancia/bugaderia-mensual-card';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getJSON, postJSON, putJSON, patchJSON, delJSON, ApiError } from '@/lib/api';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { formatDate, formatEur } from '@/lib/utils';
import { toISODate, addDays } from '@/lib/dates';
import { tipusNetejaValues, TIPUS_NETEJA_LABELS } from '@/lib/validation/enums';

interface Habitacio {
  id: string;
  nom: string;
}
interface Treballador {
  id: string;
  nom: string;
  preuSortida: number | null;
  preuManteniment: number | null;
  preuZones: number | null;
}
interface BugItem { article: string; qty: number }
interface Tasca {
  id: string;
  data: string;
  habitacioId: string | null;
  tipus: 'CANVI_COMPLET' | 'REPAS';
  estat: 'PENDENT' | 'FETA';
  assignadaA: string | null;
  notes: string | null;
  vinculadaSortidaId: string | null;
  bugaderia: BugItem[] | null;
  habitacio: { nom: string } | null;
  treballador: { nom: string } | null;
}
interface Row {
  habitacioId: string;
  nom: string;
  checked: boolean;
  tipus: 'CANVI_COMPLET' | 'REPAS';
  notes: string;
  taskId?: string;
  estat?: 'PENDENT' | 'FETA';
  sortida: boolean;
  altraPersona?: string;
  // Bugaderia opt-in: undefined = no en fa; Record article→qty = la fa la Mireia.
  bugaderia?: Record<string, number>;
}

export default function NetejaPage() {
  const [habitacions, setHabitacions] = useState<Habitacio[]>([]);
  const [treballadors, setTreballadors] = useState<Treballador[]>([]);
  const [dayTasks, setDayTasks] = useState<Tasca[]>([]);
  const [week, setWeek] = useState<Tasca[]>([]);
  const [data, setData] = useState(toISODate(new Date()));
  const [personId, setPersonId] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [tarifes, setTarifes] = useState({ s: 0, m: 0, z: 0 });
  const [zonesComunes, setZonesComunes] = useState(false);
  const [zonesTaskId, setZonesTaskId] = useState<string | null>(null);
  const [zonesEstat, setZonesEstat] = useState<'PENDENT' | 'FETA' | null>(null);
  const [pagant, setPagant] = useState(false);
  const [pagMsg, setPagMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  const [jornades, setJornades] = useState<{ id: string; notes: string | null; import: number }[]>([]);
  const [confirmElimJornada, setConfirmElimJornada] = useState<string | null>(null);
  // Bugaderia: catàleg d'articles i valors per defecte per habitació (segons l'estada).
  const [bugArticles, setBugArticles] = useState<{ id: string; nom: string; preu: number }[]>([]);
  const [bugDefaults, setBugDefaults] = useState<Record<string, { manteniment: BugItem[]; sortida: BugItem[] }>>({});

  // Carrega catàleg + defaults de bugaderia per al dia triat.
  useEffect(() => {
    getJSON<{ articles: { id: string; nom: string; preu: number }[]; habitacions: { id: string; manteniment: BugItem[]; sortida: BugItem[] }[] }>(
      `/api/neteja/bugaderia?data=${data}`,
    )
      .then((r) => {
        setBugArticles(r.articles);
        setBugDefaults(Object.fromEntries(r.habitacions.map((h) => [h.id, { manteniment: h.manteniment, sortida: h.sortida }])));
      })
      .catch(() => {});
  }, [data]);

  const loadJornades = useCallback(async () => {
    if (!personId || !data) return;
    const desde = data;
    const fins = data;
    const r = await getJSON<{ jornades: { id: string; notes: string | null; import: number }[] }>(
      `/api/treballadors/${personId}/jornades?desde=${desde}&fins=${fins}`,
    ).catch(() => ({ jornades: [] }));
    setJornades(r.jornades);
  }, [personId, data]);

  useEffect(() => { void loadJornades(); }, [loadJornades]);

  async function eliminarJornada(id: string) {
    await delJSON(`/api/jornades/${id}`);
    void loadJornades();
    void loadDay();
    void loadWeek();
  }

  // Si s'arriba des del calendari amb ?data=YYYY-MM-DD, obre aquell dia.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get('data');
    if (p) setData(p);
  }, []);

  // Càrrega inicial: habitacions + treballadors.
  useEffect(() => {
    getJSON<{ habitacions: Habitacio[] }>('/api/habitacions').then((r) =>
      setHabitacions(r.habitacions),
    );
    getJSON<{ treballadors: Treballador[] }>('/api/treballadors').then((r) => {
      setTreballadors(r.treballadors);
      const first = r.treballadors[0];
      if (first) setPersonId((p) => p || first.id);
    });
  }, []);

  // Actualitza les tarifes quan canvia la persona seleccionada.
  useEffect(() => {
    const t = treballadors.find((t) => t.id === personId);
    if (t) {
      setTarifes({
        s: Number(t.preuSortida ?? 0),
        m: Number(t.preuManteniment ?? 0),
        z: Number(t.preuZones ?? 0),
      });
    }
  }, [personId, treballadors]);

  // Tasques del dia triat.
  const loadDay = useCallback(async () => {
    const r = await getJSON<{ tasques: Tasca[] }>(`/api/tasques-neteja?desde=${data}&fins=${data}`);
    setDayTasks(r.tasques);
  }, [data]);

  useEffect(() => {
    loadDay();
  }, [loadDay]);

  // Resum dels pròxims 7 dies (per veure d'un cop què queda per assignar/fer).
  const loadWeek = useCallback(async () => {
    const desde = toISODate(new Date());
    const fins = toISODate(addDays(new Date(), 7));
    const r = await getJSON<{ tasques: Tasca[] }>(`/api/tasques-neteja?desde=${desde}&fins=${fins}`);
    setWeek(r.tasques);
  }, []);

  useEffect(() => {
    loadWeek();
  }, [loadWeek]);

  // Construeix les files editables per a la persona triada a partir de les
  // tasques del dia. Es refà en canviar dia / persona / habitacions / tasques
  // (descarta edicions no desades, que és el comportament esperat en canviar
  // de context).
  // Carrega zones comunes des de les tasques existents del dia/persona
  useEffect(() => {
    const z = dayTasks.find((t) => t.habitacioId === null && t.assignadaA === personId);
    setZonesComunes(!!z);
    setZonesTaskId(z?.id ?? null);
    setZonesEstat(z?.estat ?? null);
  }, [dayTasks, personId]);

  useEffect(() => {
    setSaved(false);
    setRows(
      habitacions.map((h) => {
        const meva = dayTasks.find((t) => t.habitacioId === h.id && t.assignadaA === personId);
        const lliure = dayTasks.find((t) => t.habitacioId === h.id && t.assignadaA === null);
        const altra = dayTasks.find(
          (t) => t.habitacioId === h.id && t.assignadaA && t.assignadaA !== personId,
        );
        const sortida = dayTasks.some((t) => t.habitacioId === h.id && t.vinculadaSortidaId);
        return {
          habitacioId: h.id,
          nom: h.nom,
          checked: !!meva,
          tipus: meva?.tipus ?? lliure?.tipus ?? (sortida ? 'CANVI_COMPLET' : 'REPAS'),
          notes: meva?.notes ?? '',
          taskId: meva?.id,
          estat: meva?.estat,
          sortida,
          altraPersona: altra?.treballador?.nom ?? undefined,
          bugaderia: meva?.bugaderia && meva.bugaderia.length
            ? Object.fromEntries(meva.bugaderia.map((i) => [i.article, i.qty]))
            : undefined,
        };
      }),
    );
  }, [habitacions, dayTasks, personId]);

  function setRow(habitacioId: string, patch: Partial<Row>) {
    setSaved(false);
    setRows((rs) => rs.map((r) => (r.habitacioId === habitacioId ? { ...r, ...patch } : r)));
  }

  // Activa/desactiva la bugaderia opt-in d'una habitació. En activar-la,
  // preomple amb els valors per defecte (segons manteniment/sortida).
  function toggleBugaderia(r: Row) {
    if (r.bugaderia) {
      setRow(r.habitacioId, { bugaderia: undefined });
      return;
    }
    const def = bugDefaults[r.habitacioId];
    const base = r.tipus === 'CANVI_COMPLET' ? def?.sortida : def?.manteniment;
    setRow(r.habitacioId, { bugaderia: Object.fromEntries((base ?? []).map((i) => [i.article, i.qty])) });
  }
  function setBugQty(r: Row, article: string, qty: number) {
    const next = { ...(r.bugaderia ?? {}), [article]: Math.max(0, qty) };
    setRow(r.habitacioId, { bugaderia: next });
  }
  const bugCost = (map?: Record<string, number>) =>
    Math.round(bugArticles.reduce((s, a) => s + (map?.[a.nom] ?? 0) * a.preu, 0) * 100) / 100;

  async function desar() {
    if (!personId) return;
    setSaving(true);
    try {
      const items: { habitacioId: string | null; tipus: 'CANVI_COMPLET' | 'REPAS'; notes?: string; bugaderia?: BugItem[] }[] = [
        ...rows
          .filter((r) => r.checked)
          .map((r) => ({
            habitacioId: r.habitacioId,
            tipus: r.tipus,
            notes: r.notes.trim() || undefined,
            bugaderia: r.bugaderia
              ? Object.entries(r.bugaderia).map(([article, qty]) => ({ article, qty })).filter((i) => i.qty > 0)
              : undefined,
          })),
        ...(zonesComunes ? [{ habitacioId: null, tipus: 'REPAS' as const }] : []),
      ];
      const res = await putJSON<{ tasques: Tasca[] }>('/api/tasques-neteja/dia', {
        data,
        assignadaA: personId,
        items,
      });
      setDayTasks(res.tasques);
      setSaved(true);
      loadWeek();
    } finally {
      setSaving(false);
    }
  }

  // Marca/desmarca com a feta una tasca ja desada.
  async function toggleFeta(taskId: string, estat: 'PENDENT' | 'FETA') {
    await patchJSON(`/api/tasques-neteja/${taskId}`, { estat });
    loadDay();
    loadWeek();
  }

  const seleccionades = rows.filter((r) => r.checked).length;
  const persona = treballadors.find((t) => t.id === personId);

  // Càlcul del pagament a la dona de neteja segons les tarifes.
  const nSortides = rows.filter((r) => r.checked && r.tipus === 'CANVI_COMPLET').length;
  const nManteniments = rows.filter((r) => r.checked && r.tipus === 'REPAS').length;
  const aPagar =
    Math.round(
      (nSortides * tarifes.s + nManteniments * tarifes.m + (zonesComunes ? tarifes.z : 0)) * 100,
    ) / 100;
  const senseTarifes = tarifes.s === 0 && tarifes.m === 0 && tarifes.z === 0;

  async function registrarPagament() {
    if (!personId || aPagar <= 0) return;
    setPagant(true);
    setPagMsg(null);
    try {
      await postJSON('/api/neteja/pagament', {
        treballadorId: personId,
        data,
        sortides: nSortides,
        manteniments: nManteniments,
        zones: zonesComunes,
      });
      setPagMsg({ tone: 'ok', text: `Pagament de ${aPagar.toFixed(2)} € registrat.` });
      void loadJornades();
      loadWeek();
    } catch (e) {
      setPagMsg({ tone: 'err', text: e instanceof ApiError ? e.message : 'Error registrant el pagament' });
    } finally {
      setPagant(false);
    }
  }

  const nomPersona = (id: string | null) =>
    id ? (treballadors.find((t) => t.id === id)?.nom ?? 'Algú') : 'Sense assignar';

  // Resum dels pròxims dies: agrupat per dia i, dins de cada dia, per persona.
  const resumDies = (() => {
    const dies = new Map<string, Tasca[]>();
    for (const t of week) {
      const iso = toISODate(new Date(t.data));
      const a = dies.get(iso) ?? [];
      a.push(t);
      dies.set(iso, a);
    }
    return [...dies.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([iso, tasks]) => {
        const persones = new Map<string, Tasca[]>();
        for (const t of tasks) {
          const k = t.assignadaA ?? '';
          const a = persones.get(k) ?? [];
          a.push(t);
          persones.set(k, a);
        }
        return { iso, grups: [...persones.entries()] };
      });
  })();

  return (
    <div>
      <PageHeader title="Neteja" subtitle="Full de neteja diari per persona" />

      {/* Una sola barra: dia (amb fletxes i «Avui»), persona i, a la dreta, la
          bugaderia del mes en petit (en clicar-la s'obre el detall i els preus). */}
      <Card className="mb-4">
        <CardBody className="flex flex-wrap items-center gap-3 py-3">
          <div className="flex items-center gap-1">
            <Button type="button" variant="outline" className="px-3" aria-label="Dia anterior" onClick={() => setData(toISODate(addDays(new Date(`${data}T12:00:00`), -1)))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Input type="date" aria-label="Dia" className="w-auto" value={data} onChange={(e) => setData(e.target.value)} />
            <Button type="button" variant="outline" className="px-3" aria-label="Dia següent" onClick={() => setData(toISODate(addDays(new Date(`${data}T12:00:00`), 1)))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            {data !== toISODate(new Date()) && (
              <Button type="button" variant="outline" onClick={() => setData(toISODate(new Date()))}>
                Avui
              </Button>
            )}
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-500">
            Neteja
            <Select aria-label="Persona encarregada" className="w-auto font-semibold text-slate-900" value={personId} onChange={(e) => setPersonId(e.target.value)}>
              {treballadors.length === 0 && <option value="">—</option>}
              {treballadors.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nom}
                </option>
              ))}
            </Select>
          </label>
          <div className="ml-auto">
            <BugaderiaMensualCard compacte />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>
            {persona?.nom ?? 'Full'} · {formatDate(data)}
          </CardTitle>
          <span className="text-sm text-slate-500">{seleccionades} habitacions</span>
        </CardHeader>
        <CardBody className="space-y-2">
          {rows.length === 0 ? (
            <p className="text-sm text-slate-500">No hi ha habitacions configurades.</p>
          ) : (
            <>
            {rows.map((r) => (
              <div
                key={r.habitacioId}
                className={`rounded-lg border px-3 py-2 ${
                  r.checked ? 'border-brand-200 bg-brand-50/40' : 'border-slate-200'
                }`}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex min-w-40 cursor-pointer items-center gap-2 text-sm font-medium text-slate-800">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-brand-700"
                      checked={r.checked}
                      onChange={(e) => setRow(r.habitacioId, { checked: e.target.checked })}
                    />
                    Habitació {r.nom}
                  </label>

                  {r.sortida && (
                    <Badge tone="warning" className="text-xs">
                      Sortida avui
                    </Badge>
                  )}

                  {r.altraPersona && !r.checked && (
                    <span className="text-xs text-slate-400">la fa {r.altraPersona}</span>
                  )}

                  {r.checked && (
                    <>
                      <Select
                        className="h-8 max-w-44"
                        value={r.tipus}
                        onChange={(e) =>
                          setRow(r.habitacioId, {
                            tipus: e.target.value as 'CANVI_COMPLET' | 'REPAS',
                          })
                        }
                      >
                        {tipusNetejaValues.map((v) => (
                          <option key={v} value={v}>
                            {TIPUS_NETEJA_LABELS[v]}
                          </option>
                        ))}
                      </Select>
                      <Input
                        className="h-8 min-w-48 flex-1"
                        placeholder="Nota (opcional): què cal fer-hi…"
                        value={r.notes}
                        onChange={(e) => setRow(r.habitacioId, { notes: e.target.value })}
                      />
                      {r.taskId && r.estat && (
                        <div className="ml-auto flex items-center gap-2">
                          <Badge tone={r.estat === 'FETA' ? 'success' : 'warning'}>
                            {r.estat === 'FETA' ? 'Feta' : 'Pendent'}
                          </Badge>
                          {r.estat === 'PENDENT' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => toggleFeta(r.taskId!, 'FETA')}
                            >
                              <Check className="h-4 w-4" /> Feta
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => toggleFeta(r.taskId!, 'PENDENT')}
                            >
                              <Undo2 className="h-4 w-4" /> Desfer
                            </Button>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Bugaderia opt-in: què neteja la Mireia (llençols, tovalloles…) */}
                {r.checked && (
                  <div className="mt-2 border-t border-slate-100 pt-2">
                    {!r.bugaderia ? (
                      <button
                        type="button"
                        onClick={() => toggleBugaderia(r)}
                        className="text-xs font-medium text-brand-700 hover:underline"
                      >
                        🧺 Afegir bugaderia (la Mireia neteja llençols/tovalloles…)
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold text-slate-500">🧺 Bugaderia:</span>
                          {bugArticles
                            .filter((a) => (r.bugaderia?.[a.nom] ?? 0) > 0)
                            .map((a) => (
                              <span key={a.id} className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-1 py-0.5 text-xs">
                                <button type="button" className="px-2.5 py-1 touch-manipulation text-slate-500 hover:bg-slate-100" onClick={() => setBugQty(r, a.nom, (r.bugaderia?.[a.nom] ?? 0) - 1)}>−</button>
                                <span className="font-medium text-slate-700">{r.bugaderia?.[a.nom]}× {a.nom}</span>
                                <button type="button" className="px-2.5 py-1 touch-manipulation text-slate-500 hover:bg-slate-100" onClick={() => setBugQty(r, a.nom, (r.bugaderia?.[a.nom] ?? 0) + 1)}>+</button>
                              </span>
                            ))}
                          {bugArticles.every((a) => (r.bugaderia?.[a.nom] ?? 0) === 0) && (
                            <span className="text-xs text-slate-400">cap article — afegeix-ne o treu la bugaderia</span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <Select
                            className="h-7 max-w-48 text-xs"
                            value=""
                            onChange={(e) => { if (e.target.value) setBugQty(r, e.target.value, (r.bugaderia?.[e.target.value] ?? 0) + 1); }}
                          >
                            <option value="">＋ afegir article…</option>
                            {bugArticles
                              .filter((a) => (r.bugaderia?.[a.nom] ?? 0) === 0)
                              .map((a) => (
                                <option key={a.id} value={a.nom}>{a.nom} ({a.preu.toFixed(2)} €)</option>
                              ))}
                          </Select>
                          <span className="text-xs text-slate-500">Total: <strong className="text-slate-700">{bugCost(r.bugaderia).toFixed(2)} €</strong></span>
                          <button type="button" onClick={() => toggleBugaderia(r)} className="text-xs text-slate-400 hover:text-red-600">Treure bugaderia</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Zones comunes com a fila igual que les habitacions */}
            {tarifes.z > 0 && (
              <div className={`rounded-lg border px-3 py-2 ${zonesComunes ? 'border-brand-200 bg-brand-50/40' : 'border-slate-200'}`}>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex min-w-40 cursor-pointer items-center gap-2 text-sm font-medium text-slate-800">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-brand-700"
                      checked={zonesComunes}
                      onChange={(e) => { setZonesComunes(e.target.checked); setSaved(false); }}
                    />
                    Zones comunes
                  </label>
                  <span className="text-xs text-slate-500">passadís, vorera, pati · {tarifes.z.toFixed(2)} €</span>
                  {zonesTaskId && zonesEstat && (
                    <div className="ml-auto flex items-center gap-2">
                      <Badge tone={zonesEstat === 'FETA' ? 'success' : 'warning'}>
                        {zonesEstat === 'FETA' ? 'Feta' : 'Pendent'}
                      </Badge>
                      {zonesEstat === 'PENDENT' ? (
                        <Button size="sm" variant="outline" onClick={async () => { await toggleFeta(zonesTaskId, 'FETA'); }}>
                          <Check className="h-4 w-4" /> Feta
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={async () => { await toggleFeta(zonesTaskId, 'PENDENT'); }}>
                          <Undo2 className="h-4 w-4" /> Desfer
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
            </>
          )}

          {/* Una sola línia (proposta A): el que cal pagar a la dona de neteja (segons
              les tarifes configurades) a l'esquerra; «Registrar pagament» i «Desar full» a la dreta. */}
          <div className="ui-card flex flex-wrap items-center gap-x-3.5 gap-y-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">A pagar</span>
            <strong className="ui-page-title text-xl text-slate-900">{formatEur(aPagar)}</strong>
            <span className="text-slate-500">
              {nSortides} {nSortides === 1 ? 'sortida' : 'sortides'} · {nManteniments}{' '}
              {nManteniments === 1 ? 'manteniment' : 'manteniments'}
              {zonesComunes ? ' · zones comunes' : ''}
            </span>
            {pagMsg && (
              <span className={pagMsg.tone === 'ok' ? 'text-green-600' : 'text-red-600'}>{pagMsg.text}</span>
            )}
            {saved && (
              <span className="flex items-center gap-1 text-green-600">
                <CheckCheck className="h-4 w-4" /> Desat
              </span>
            )}
            <span className="ml-auto flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={registrarPagament}
                disabled={pagant || !personId || aPagar <= 0}
              >
                {pagant ? 'Registrant…' : 'Registrar pagament'}
              </Button>
              <Button onClick={desar} disabled={saving || !personId}>
                <Save className="h-4 w-4" /> {saving ? 'Desant…' : 'Desar full'}
              </Button>
            </span>
          </div>

          <div className="space-y-2">
            {senseTarifes && (
              <p className="text-xs text-amber-600">
                Configura les tarifes al perfil del treballador a{' '}
                <Link href="/personal" className="underline">
                  Treballadors
                </Link>
                .
              </p>
            )}
            {jornades.length > 0 && (
              <div className="mt-2 space-y-1">
                <p className="text-xs font-medium text-slate-500">Pagaments registrats avui:</p>
                {jornades.map((j) => (
                  <div key={j.id} className="flex items-center justify-between gap-2 rounded-md bg-white px-2 py-1 text-sm">
                    <span className="text-slate-700">{j.notes ?? 'Neteja'}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-800">{formatEur(j.import)}</span>
                      <button
                        type="button"
                        className="p-2 touch-manipulation text-slate-400 hover:text-red-600"
                        onClick={() => setConfirmElimJornada(j.id)}
                        title="Eliminar pagament"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </CardBody>
      </Card>

      {/* Pròxims dies: la setmana en columnes (de demà a d'aquí a 7 dies), també
          els dies sense res. Clicar un dia l'obre a dalt. */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Pròxims dies</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <div className="grid min-w-[700px] grid-cols-7">
            {Array.from({ length: 7 }, (_, i) => toISODate(addDays(new Date(), i + 1))).map((iso, i) => {
              const grups = resumDies.find((d) => d.iso === iso)?.grups ?? [];
              const buit = grups.length === 0;
              const dia = new Date(`${iso}T12:00:00`);
              const setmana = dia.toLocaleDateString('ca-ES', { weekday: 'short' }).replace('.', '');
              return (
                <button
                  key={iso}
                  type="button"
                  disabled={buit}
                  onClick={() => {
                    setData(iso);
                    const primer = grups.find(([k]) => k)?.[0];
                    if (primer) setPersonId(primer);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  title={buit ? undefined : `Obrir el ${formatDate(iso)}`}
                  className={`flex min-h-28 flex-col gap-2 border-slate-100 px-3 py-3 text-left transition-colors [&:not(:last-child)]:border-r ${
                    i === 0 ? 'bg-brand-50/60' : ''
                  } ${buit ? 'cursor-default' : 'hover:bg-slate-50'}`}
                >
                  <span className="leading-tight">
                    <span className={`block text-[11px] font-bold uppercase tracking-wider ${i === 0 ? 'text-brand-700' : 'text-transparent'}`}>
                      {i === 0 ? 'Demà' : '·'}
                    </span>
                    <span className={`block font-serif text-lg font-semibold ${buit ? 'text-slate-300' : 'text-slate-900'}`}>
                      {setmana} {Number(iso.slice(8, 10))}
                    </span>
                  </span>
                  {buit ? (
                    <span className="text-sm text-slate-300">—</span>
                  ) : (
                    grups.map(([key, tasks]) => (
                      <span key={key || 'sense'} className="block text-xs">
                        <span className={`block font-semibold ${key ? 'text-slate-700' : 'text-amber-700'}`}>
                          {nomPersona(key || null)}
                        </span>
                        <span className="mt-1 flex flex-wrap gap-1">
                          {[...tasks]
                            .sort((a, b) => (a.habitacio?.nom ?? '').localeCompare(b.habitacio?.nom ?? '', 'ca', { numeric: true }))
                            .map((t) => (
                              <span
                                key={t.id}
                                title={[t.tipus === 'CANVI_COMPLET' ? 'Sortida (a fons)' : 'Repàs', t.estat === 'FETA' ? 'feta' : null, t.notes].filter(Boolean).join(' · ')}
                                className={`inline-flex h-6 min-w-6 items-center justify-center px-1.5 font-bold ${
                                  t.estat === 'FETA'
                                    ? 'bg-green-100 text-green-700'
                                    : t.tipus === 'CANVI_COMPLET'
                                      ? 'bg-brand-700 text-white'
                                      : 'border border-slate-300 text-slate-700'
                                }`}
                              >
                                {t.estat === 'FETA' ? '✓' : ''}{t.habitacio?.nom ?? '?'}
                              </span>
                            ))}
                        </span>
                      </span>
                    ))
                  )}
                </button>
              );
            })}
          </div>
        </div>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-100 px-5 py-2 text-xs text-slate-500">
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 bg-brand-700" /> sortida (a fons)</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 border border-slate-300" /> repàs</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 bg-green-100" /> feta</span>
          <span>Passa el ratolí per sobre d&apos;una habitació per veure&apos;n la nota.</span>
        </p>
      </Card>
      <ConfirmDialog
        open={!!confirmElimJornada}
        title="Eliminar pagament de neteja"
        message="Segur que vols eliminar aquest pagament? Les tasques de neteja associades també s'eliminaran."
        onConfirm={() => { eliminarJornada(confirmElimJornada!); setConfirmElimJornada(null); }}
        onCancel={() => setConfirmElimJornada(null)}
      />
    </div>
  );
}
