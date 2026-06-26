'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Check, Undo2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { Badge } from '@/components/ui/badge';
import { Table, Thead, Th, Td, Tr, EmptyState } from '@/components/ui/table';
import { postJSON, patchJSON, delJSON, getJSON, ApiError } from '@/lib/api';
import { formatDate, formatEur } from '@/lib/utils';
import { toISODate } from '@/lib/dates';

interface Jornada {
  id: string;
  data: string;
  hores: number;
  preuHora: number;
  import: number;
  notes: string | null;
  pagada: boolean;
  dataPagament: string | null;
}

export function JornadesSection({
  treballadorId,
  preuHora,
  jornades,
  tarifes,
}: {
  treballadorId: string;
  preuHora: number | null;
  jornades: Jornada[];
  tarifes: { s: number; m: number; z: number };
}) {
  const router = useRouter();
  const [data, setData] = useState(toISODate(new Date()));
  const [hores, setHores] = useState('');
  const [preu, setPreu] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Sense preu/hora → es cobra PER TASQUES de neteja (sortides, manteniments, zones).
  const perTasques = !preuHora || preuHora <= 0;

  // ── Picker de tasques ──────────────────────────────────────────────────────
  interface TascaOpc {
    id: string;
    data: string;
    tipus: string;
    hab: string;
    import: number;
    sel: boolean;
  }

  const [rangeFrom, setRangeFrom] = useState(toISODate(new Date()));
  const [rangeTo, setRangeTo] = useState(toISODate(new Date()));
  const [opcions, setOpcions] = useState<TascaOpc[]>([]);
  const [loadingOpc, setLoadingOpc] = useState(false);
  const [zonesAdia, setZonesAdia] = useState<Record<string, boolean>>({});

  const carregarTasques = useCallback(async () => {
    setLoadingOpc(true);
    try {
      const r = await getJSON<{ tasques: { id: string; data: string; tipus: string; habitacio: { nom: string } | null }[] }>(
        `/api/treballadors/${treballadorId}/tasques?from=${rangeFrom}&to=${rangeTo}`,
      );
      // Dies que ja tenen jornada registrada → tasques d'aquell dia surten desseleccionades
    const diesAmbJornada = new Set(
      jornades
        .filter((j) => j.notes && (j.notes.startsWith('[auto]') || j.notes.startsWith('Neteja:')))
        .map((j) => j.data.slice(0, 10)),
    );
    setOpcions(
      r.tasques.map((t) => ({
        id: t.id,
        data: t.data,
        tipus: t.tipus,
        hab: t.habitacio?.nom ?? '?',
        import: t.tipus === 'CANVI_COMPLET' ? tarifes.s : tarifes.m,
        sel: !diesAmbJornada.has(t.data.slice(0, 10)),
      })),
    );
    } finally {
      setLoadingOpc(false);
    }
  }, [treballadorId, rangeFrom, rangeTo, tarifes.s, tarifes.m]);

  useEffect(() => { carregarTasques(); }, [carregarTasques]);

  function toggleTasca(id: string) {
    setOpcions((prev) => prev.map((o) => (o.id === id ? { ...o, sel: !o.sel } : o)));
  }
  function toggleZonaDate(d: string) {
    setZonesAdia((prev) => ({ ...prev, [d]: !prev[d] }));
  }

  const diesUnics = Array.from(new Set(opcions.map((o) => o.data.slice(0, 10)))).sort();
  const totalTasques = opcions.filter((o) => o.sel).reduce((a, o) => a + o.import, 0);
  const totalZones = diesUnics.filter((d) => zonesAdia[d]).length * tarifes.z;
  const aPagar = Math.round((totalTasques + totalZones) * 100) / 100;

  async function registrarTasques(e: React.FormEvent) {
    e.preventDefault();
    if (aPagar <= 0) return;
    setSaving(true);
    setError(null);
    try {
      // Registra un pagament per dia amb les tasques seleccionades
      const perDia: Record<string, { sortides: number; manteniments: number; zones: boolean }> = {};
      for (const o of opcions.filter((x) => x.sel)) {
        const d = o.data.slice(0, 10);
        if (!perDia[d]) perDia[d] = { sortides: 0, manteniments: 0, zones: false };
        if (o.tipus === 'CANVI_COMPLET') perDia[d].sortides++;
        else perDia[d].manteniments++;
      }
      for (const d of diesUnics) {
        if (zonesAdia[d] && !perDia[d]) perDia[d] = { sortides: 0, manteniments: 0, zones: true };
        else if (perDia[d] && zonesAdia[d]) perDia[d].zones = true;
      }
      for (const [dia, vals] of Object.entries(perDia)) {
        await postJSON('/api/neteja/pagament', { treballadorId, data: dia, ...vals });
      }
      setOpcions((prev) => prev.map((o) => ({ ...o, sel: false })));
      setZonesAdia({});
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  }

  const senseTarifes = tarifes.s === 0 && tarifes.m === 0 && tarifes.z === 0;

  // Filtre per mes (YYYY-MM). Per defecte, el mes en curs.
  const mesActual = toISODate(new Date()).slice(0, 7);
  const [mesSel, setMesSel] = useState(mesActual);
  const months = Array.from(new Set([mesActual, ...jornades.map((j) => j.data.slice(0, 7))]))
    .sort()
    .reverse();
  const filtered = mesSel === 'all' ? jornades : jornades.filter((j) => j.data.slice(0, 7) === mesSel);
  const totalSel = filtered.reduce((a, j) => a + j.import, 0);
  const horesSel = filtered.reduce((a, j) => a + j.hores, 0);
  const totalGeneral = jornades.reduce((a, j) => a + j.import, 0);
  // Pagaments: el que falta per pagar i si el mes està tot pagat.
  const pendentSel = filtered.filter((j) => !j.pagada).reduce((a, j) => a + j.import, 0);
  const totPagat = filtered.length > 0 && filtered.every((j) => j.pagada);
  const dataPagat = filtered.find((j) => j.pagada && j.dataPagament)?.dataPagament ?? null;
  const mesLabel = (ym: string) =>
    new Intl.DateTimeFormat('ca-ES', { month: 'long', year: 'numeric' }).format(
      new Date(`${ym}-01T00:00:00`),
    );

  const [paying, setPaying] = useState(false);
  async function marcarMes(pagada: boolean) {
    if (mesSel === 'all') return;
    setPaying(true);
    try {
      await patchJSON(`/api/treballadors/${treballadorId}/jornades`, { mes: mesSel, pagada });
      router.refresh();
    } catch {
      /* l'usuari pot tornar-ho a provar */
    } finally {
      setPaying(false);
    }
  }

  async function afegir(e: React.FormEvent) {
    e.preventDefault();
    if (!hores) return;
    setSaving(true);
    setError(null);
    try {
      await postJSON(`/api/treballadors/${treballadorId}/jornades`, {
        data,
        hores: Number(hores),
        preuHora: preu || undefined,
      });
      setHores('');
      setPreu('');
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  }

  const [toggling, setToggling] = useState<string | null>(null);
  async function togglePagada(id: string, pagada: boolean) {
    setToggling(id);
    try {
      await patchJSON(`/api/jornades/${id}`, { pagada });
      router.refresh();
    } finally {
      setToggling(null);
    }
  }

  async function esborrar(id: string) {
    if (!confirm('Segur que vols eliminar aquesta jornada?')) return;
    await delJSON(`/api/jornades/${id}`);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-lg bg-brand-50 px-4 py-3 text-sm">
        <label className="flex items-center gap-2">
          <span className="text-slate-600">Mes:</span>
          <select
            value={mesSel}
            onChange={(e) => setMesSel(e.target.value)}
            className="h-8 rounded-lg border border-slate-300 bg-white px-2 text-sm capitalize"
          >
            {months.map((m) => (
              <option key={m} value={m}>
                {mesLabel(m)}
              </option>
            ))}
            <option value="all">Tots</option>
          </select>
        </label>
        <span>
          Total mes: <strong>{formatEur(totalSel)}</strong>{' '}
          <span className="text-slate-500">({horesSel} h)</span>
        </span>
        {filtered.length > 0 &&
          mesSel !== 'all' &&
          (totPagat ? (
            <span className="flex items-center gap-2">
              <Badge tone="success">Pagat{dataPagat ? ` · ${formatDate(dataPagat)}` : ''}</Badge>
              <Button type="button" variant="ghost" size="sm" disabled={paying} onClick={() => marcarMes(false)}>
                <Undo2 className="h-4 w-4" /> Desfer
              </Button>
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Badge tone="warning">Pendent: {formatEur(pendentSel)}</Badge>
              <Button type="button" size="sm" disabled={paying} onClick={() => marcarMes(true)}>
                <Check className="h-4 w-4" /> {paying ? 'Desant…' : 'Marcar com a pagat'}
              </Button>
            </span>
          ))}
        <span className="text-slate-400">·</span>
        <span className="text-slate-600">Total acumulat: {formatEur(totalGeneral)}</span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState>
          {jornades.length === 0 ? 'Encara no hi ha jornades registrades.' : 'Cap jornada en aquest mes.'}
        </EmptyState>
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th>Dia</Th>
              <Th>Concepte</Th>
              {!perTasques && <Th>Hores</Th>}
              {!perTasques && <Th>€/h</Th>}
              <Th className="text-right">Import</Th>
              <Th>Estat</Th>
              <Th></Th>
            </tr>
          </Thead>
          <tbody>
            {filtered.map((j) => (
              <Tr key={j.id} className={j.pagada ? 'opacity-60' : ''}>
                <Td>{formatDate(j.data)}</Td>
                <Td className="text-xs text-slate-500">{j.notes ? j.notes.replace('[auto] ', '') : '—'}</Td>
                {!perTasques && <Td>{j.hores > 0 ? `${j.hores} h` : '—'}</Td>}
                {!perTasques && <Td>{j.preuHora > 0 ? formatEur(j.preuHora) : '—'}</Td>}
                <Td className="text-right font-medium">{formatEur(j.import)}</Td>
                <Td>
                  <button
                    type="button"
                    disabled={toggling === j.id}
                    onClick={() => togglePagada(j.id, !j.pagada)}
                    title={j.pagada ? 'Marcar com a pendent' : 'Marcar com a pagat'}
                    className="flex items-center gap-1"
                  >
                    {j.pagada
                      ? <Badge tone="success"><Check className="h-3 w-3 mr-0.5" />Pagat</Badge>
                      : <Badge tone="warning">Pendent</Badge>}
                  </button>
                </Td>
                <Td>
                  <button className="text-slate-400 hover:text-red-600" onClick={() => esborrar(j.id)}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}

      {perTasques ? (
        <form onSubmit={registrarTasques} className="space-y-3 border-t border-slate-100 pt-4">
          {/* Selector de periode */}
          <div className="flex flex-wrap items-end gap-2">
            <Field label="Des de">
              <Input type="date" value={rangeFrom} onChange={(e) => setRangeFrom(e.target.value)} />
            </Field>
            <Field label="Fins a">
              <Input type="date" value={rangeTo} onChange={(e) => setRangeTo(e.target.value)} />
            </Field>
            <Button type="button" variant="outline" size="sm" onClick={carregarTasques} disabled={loadingOpc}>
              <RefreshCw className={`h-4 w-4 ${loadingOpc ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Llista de tasques clicables */}
          {senseTarifes ? (
            <p className="text-xs text-amber-600">Configura les tarifes a Configuració → Tarifes de neteja.</p>
          ) : loadingOpc ? (
            <p className="text-xs text-slate-400">Carregant tasques…</p>
          ) : opcions.length === 0 ? (
            <p className="text-xs text-slate-400">Cap tasca feta en aquest periode.</p>
          ) : (
            <div className="space-y-3">
              {diesUnics.map((dia) => {
                const tasquesDia = opcions.filter((o) => o.data.slice(0, 10) === dia);
                return (
                  <div key={dia} className={`rounded-lg border p-3 ${tasquesDia.every(o => !o.sel) && !zonesAdia[dia] ? 'border-green-200 bg-green-50' : 'border-slate-200'}`}>
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-500">
                      {formatDate(dia)}
                      {tasquesDia.every(o => !o.sel) && !zonesAdia[dia] && (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-700">Ja registrat</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {tasquesDia.map((o) => (
                        <button
                          key={o.id}
                          type="button"
                          onClick={() => toggleTasca(o.id)}
                          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                            o.sel
                              ? 'border-brand-400 bg-brand-50 text-brand-800'
                              : 'border-slate-200 bg-white text-slate-400 line-through'
                          }`}
                        >
                          {o.sel && <Check className="h-3.5 w-3.5" />}
                          Hab. {o.hab} · {o.tipus === 'CANVI_COMPLET' ? 'Sortida' : 'Mantenim.'}
                          <span className="text-xs opacity-70">{formatEur(o.import)}</span>
                        </button>
                      ))}
                      {tarifes.z > 0 && (
                        <button
                          type="button"
                          onClick={() => toggleZonaDate(dia)}
                          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                            zonesAdia[dia]
                              ? 'border-brand-400 bg-brand-50 text-brand-800'
                              : 'border-slate-200 bg-white text-slate-400'
                          }`}
                        >
                          {zonesAdia[dia] && <Check className="h-3.5 w-3.5" />}
                          Zones comunes
                          <span className="text-xs opacity-70">{formatEur(tarifes.z)}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3">
            <span className="text-sm text-slate-600">
              A pagar: <strong className="text-slate-900 text-base">{formatEur(aPagar)}</strong>
            </span>
            <Button type="submit" disabled={saving || aPagar <= 0}>
              <Plus className="h-4 w-4" /> Registrar pagament
            </Button>
            {error && <span className="text-sm text-red-600">{error}</span>}
          </div>
        </form>
      ) : (
        <form onSubmit={afegir} className="grid items-end gap-2 border-t border-slate-100 pt-4 sm:grid-cols-4">
          <Field label="Dia">
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </Field>
          <Field label="Hores">
            <Input type="number" step="0.25" value={hores} onChange={(e) => setHores(e.target.value)} />
          </Field>
          <Field label={`€/hora${preuHora ? ` (per defecte ${preuHora})` : ''}`}>
            <Input
              type="number"
              step="0.01"
              placeholder={preuHora ? String(preuHora) : 'Indica el preu'}
              value={preu}
              onChange={(e) => setPreu(e.target.value)}
            />
          </Field>
          <Button type="submit" disabled={saving || !hores}>
            <Plus className="h-4 w-4" /> Afegir jornada
          </Button>
        </form>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
