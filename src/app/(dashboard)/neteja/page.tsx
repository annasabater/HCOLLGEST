'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Save, Check, Undo2, CheckCheck, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
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
interface Tasca {
  id: string;
  data: string;
  habitacioId: string | null;
  tipus: 'CANVI_COMPLET' | 'REPAS';
  estat: 'PENDENT' | 'FETA';
  assignadaA: string | null;
  notes: string | null;
  vinculadaSortidaId: string | null;
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
  tascaLliureId?: string;   // tasca PENDENT no assignada a ningú
  tascaLliureTipus?: 'CANVI_COMPLET' | 'REPAS';
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
  const [pagant, setPagant] = useState(false);
  const [pagMsg, setPagMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  const [jornades, setJornades] = useState<{ id: string; notes: string | null; import: number }[]>([]);
  const [confirmElimJornada, setConfirmElimJornada] = useState<string | null>(null);

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
          tascaLliureId: !meva && lliure?.estat === 'PENDENT' ? lliure.id : undefined,
          tascaLliureTipus: !meva && lliure?.estat === 'PENDENT' ? lliure.tipus : undefined,
        };
      }),
    );
  }, [habitacions, dayTasks, personId]);

  function setRow(habitacioId: string, patch: Partial<Row>) {
    setSaved(false);
    setRows((rs) => rs.map((r) => (r.habitacioId === habitacioId ? { ...r, ...patch } : r)));
  }

  async function desar() {
    if (!personId) return;
    setSaving(true);
    try {
      const items = rows
        .filter((r) => r.checked)
        .map((r) => ({
          habitacioId: r.habitacioId,
          tipus: r.tipus,
          notes: r.notes.trim() || undefined,
        }));
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

      <Card className="mb-4">
        <CardBody>
          <div className="grid items-end gap-3 sm:grid-cols-3">
            <Field label="Dia">
              <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </Field>
            <Field label="Persona encarregada">
              <Select value={personId} onChange={(e) => setPersonId(e.target.value)}>
                {treballadors.length === 0 && <option value="">—</option>}
                {treballadors.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nom}
                  </option>
                ))}
              </Select>
            </Field>
            <p className="text-sm text-slate-500">
              Marca les habitacions que <strong>{persona?.nom ?? 'aquesta persona'}</strong> ha de
              netejar el {formatDate(data)}. Les que no toquen, deixa-les sense marcar.
            </p>
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
                  {r.tascaLliureId && !r.checked && (
                    <button
                      type="button"
                      onClick={() => setRow(r.habitacioId, { checked: true, tipus: r.tascaLliureTipus ?? r.tipus })}
                      className="flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs text-amber-700 hover:bg-amber-100"
                      title="Hi ha una tasca pendent no assignada al calendari — clica per agafar-la"
                    >
                      ⚠ Pendent al calendari · {r.tascaLliureTipus === 'CANVI_COMPLET' ? 'Sortida' : 'Manteniment'}
                    </button>
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
                      onChange={(e) => setZonesComunes(e.target.checked)}
                    />
                    Zones comunes
                  </label>
                  <span className="text-xs text-slate-500">passadís, vorera, pati · {tarifes.z.toFixed(2)} €</span>
                </div>
              </div>
            )}
            </>
          )}

          <div className="flex items-center gap-3 border-t border-slate-100 pt-3">
            <Button onClick={desar} disabled={saving || !personId}>
              <Save className="h-4 w-4" /> {saving ? 'Desant…' : 'Desar full'}
            </Button>
            {saved && (
              <span className="flex items-center gap-1 text-sm text-green-600">
                <CheckCheck className="h-4 w-4" /> Desat
              </span>
            )}
          </div>

          {/* Pagament a la dona de neteja segons les tarifes configurades */}
          <div className="space-y-2 rounded-lg bg-slate-50 px-3 py-3">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="text-slate-600">
                A pagar: <strong className="text-slate-900">{aPagar.toFixed(2)} €</strong>
                <span className="text-slate-400">
                  {' '}
                  ({nSortides} sortida{nSortides !== 1 ? 'es' : ''} · {nManteniments} manteniment
                  {nManteniments !== 1 ? 's' : ''}
                  {zonesComunes ? ' · zones' : ''})
                </span>
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={registrarPagament}
                disabled={pagant || !personId || aPagar <= 0}
              >
                {pagant ? 'Registrant…' : 'Registrar pagament'}
              </Button>
              {pagMsg && (
                <span className={pagMsg.tone === 'ok' ? 'text-green-600' : 'text-red-600'}>
                  {pagMsg.text}
                </span>
              )}
            </div>
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
                        className="text-slate-400 hover:text-red-600"
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

      {resumDies.length > 0 && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Pròxims dies</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3">
            {resumDies.map(({ iso, grups }) => (
              <div key={iso} className="rounded-lg border border-slate-200 p-3">
                <div className="mb-2 text-sm font-medium text-slate-700">{formatDate(iso)}</div>
                <div className="space-y-1.5">
                  {grups.map(([key, tasks]) => {
                    const fetes = tasks.filter((t) => t.estat === 'FETA').length;
                    return (
                      <div key={key || 'sense'} className="flex flex-wrap items-center gap-2 text-sm">
                        <span
                          className={`min-w-32 font-medium ${key ? 'text-slate-700' : 'text-amber-700'}`}
                        >
                          {nomPersona(key || null)}
                        </span>
                        <span className="flex flex-wrap gap-1">
                          {[...tasks].sort((a, b) => (a.habitacio?.nom ?? '').localeCompare(b.habitacio?.nom ?? '', 'ca', { numeric: true })).map((t) => (
                            <span
                              key={t.id}
                              title={t.notes ?? undefined}
                              className={`rounded px-1.5 py-0.5 text-xs ${
                                t.estat === 'FETA'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {t.estat === 'FETA' ? '✓ ' : ''}{t.habitacio?.nom ?? '?'}
                              {t.tipus === 'CANVI_COMPLET' ? ' ★' : ''}
                            </span>
                          ))}
                        </span>
                        <span className="text-xs text-slate-400">
                          {fetes}/{tasks.length} fetes
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="ml-auto"
                          onClick={() => {
                            setData(iso);
                            if (key) setPersonId(key);
                          }}
                        >
                          Obrir
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            <p className="text-xs text-slate-400">
              ★ = sortida (a fons). Passa el ratolí per veure les notes.
            </p>
          </CardBody>
        </Card>
      )}
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
