'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Save, Check, Undo2, CheckCheck } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getJSON, putJSON, patchJSON } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { toISODate, addDays } from '@/lib/dates';
import { tipusNetejaValues, TIPUS_NETEJA_LABELS } from '@/lib/validation/enums';

interface Habitacio {
  id: string;
  nom: string;
}
interface Treballador {
  id: string;
  nom: string;
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
            rows.map((r) => (
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
              </div>
            ))
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

          <p className="pt-1 text-xs text-slate-400">
            Les zones comunes (passadís, vorera, pati) es trien en enviar l’avís a{' '}
            <Link href="/plantilles" className="text-brand-700 underline">
              Plantilles
            </Link>
            .
          </p>
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
                          {tasks.map((t) => (
                            <span
                              key={t.id}
                              title={t.notes ?? undefined}
                              className={`rounded px-1.5 py-0.5 text-xs ${
                                t.estat === 'FETA'
                                  ? 'bg-green-50 text-green-700 line-through'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {t.habitacio?.nom ?? '?'}
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
    </div>
  );
}
