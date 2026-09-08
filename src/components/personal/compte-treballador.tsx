'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Download, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Eur } from '@/components/finances/amounts-visibility';
import { postJSON, patchJSON, delJSON, ApiError } from '@/lib/api';
import { toISODate } from '@/lib/dates';
import { cn } from '@/lib/utils';

export type TipusMoviment = 'NETEJA' | 'BUGADERIA';

export interface Moviment {
  id: string;
  tipus: TipusMoviment;
  /** `YYYY-MM-DD`. */
  dia: string;
  concepte: string;
  import: number;
  pagat: boolean;
  pagatEl: string | null;
  hores: number;
  preuHora: number;
}

type Preset = 'mes' | 'passat' | '3m' | 'any' | 'tot';

const PRESETS: { clau: Preset; etiqueta: string }[] = [
  { clau: 'mes', etiqueta: 'Aquest mes' },
  { clau: 'passat', etiqueta: 'Mes passat' },
  { clau: '3m', etiqueta: 'Últims 3 mesos' },
  { clau: 'any', etiqueta: 'Aquest any' },
  { clau: 'tot', etiqueta: 'Tot' },
];

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const suma = (ms: Moviment[]) => round2(ms.reduce((s, m) => s + m.import, 0));

/** `YYYY-MM-DD` → `dd/mm/aaaa`, sense passar per Date. */
const fmtDia = (dia: string) => {
  const [y, m, d] = dia.split('-');
  return `${d}/${m}/${y}`;
};
const fmtDiaMes = (dia: string) => {
  const [, m, d] = dia.split('-');
  return `${d}/${m}`;
};
const fmtMes = (ym: string) =>
  new Date(`${ym}-01T12:00:00`).toLocaleDateString('ca-ES', { month: 'long', year: 'numeric' });

/** Rang de dies d'un període predefinit, comptat des d'avui. */
function rangDe(preset: Preset, primerDia: string): { desde: string; fins: string } {
  const avui = new Date();
  const fins = toISODate(avui);
  const ym = (y: number, m: number) => `${y}-${String(m).padStart(2, '0')}`;
  const y = avui.getFullYear();
  const m = avui.getMonth() + 1;

  if (preset === 'mes') return { desde: `${ym(y, m)}-01`, fins };
  if (preset === 'passat') {
    const py = m === 1 ? y - 1 : y;
    const pm = m === 1 ? 12 : m - 1;
    const ultim = new Date(Date.UTC(py, pm, 0)).getUTCDate();
    return { desde: `${ym(py, pm)}-01`, fins: `${ym(py, pm)}-${String(ultim).padStart(2, '0')}` };
  }
  if (preset === '3m') {
    let ty = y;
    let tm = m - 2;
    while (tm < 1) {
      tm += 12;
      ty -= 1;
    }
    return { desde: `${ym(ty, tm)}-01`, fins };
  }
  if (preset === 'any') return { desde: `${y}-01-01`, fins };
  return { desde: primerDia, fins };
}

/**
 * Compte del treballador: neteja i bugaderia en una sola llista, filtrades pel
 * mateix període i cobrades igual (tot el període, un concepte o una línia).
 */
export function CompteTreballador({
  treballadorId,
  preuHora,
  moviments,
}: {
  treballadorId: string;
  preuHora: number | null;
  moviments: Moviment[];
}) {
  const router = useRouter();

  // Sense preu/hora → es cobra PER TASQUES: el pagament s'introdueix com un import.
  const perTasques = !preuHora || preuHora <= 0;

  const primerDia = moviments.length
    ? moviments[moviments.length - 1]!.dia
    : toISODate(new Date());
  const inicial = rangDe('3m', primerDia);
  const [desde, setDesde] = useState(inicial.desde);
  const [fins, setFins] = useState(inicial.fins);
  const [preset, setPreset] = useState<Preset | null>('3m');

  const [error, setError] = useState<string | null>(null);
  const [treballant, setTreballant] = useState(false);

  function aplicarPreset(p: Preset) {
    const r = rangDe(p, primerDia);
    setDesde(r.desde);
    setFins(r.fins);
    setPreset(p);
  }

  const visibles = useMemo(
    () => moviments.filter((m) => m.dia >= desde && m.dia <= fins),
    [moviments, desde, fins],
  );

  const total = suma(visibles);
  const pagades = visibles.filter((m) => m.pagat);
  const pendents = visibles.filter((m) => !m.pagat);
  const totalPagat = suma(pagades);
  const totalPendent = suma(pendents);

  const perConcepte = (tipus: TipusMoviment) => {
    const g = visibles.filter((m) => m.tipus === tipus);
    const pagat = suma(g.filter((m) => m.pagat));
    const pendent = suma(g.filter((m) => !m.pagat));
    return { total: round2(pagat + pendent), pagat, pendent, linies: g.length };
  };
  const neteja = perConcepte('NETEJA');
  const bugaderia = perConcepte('BUGADERIA');

  // Mesos presents al període, del més recent al més antic.
  const mesos = useMemo(() => {
    const vist: string[] = [];
    for (const m of visibles) {
      const ym = m.dia.slice(0, 7);
      if (!vist.includes(ym)) vist.push(ym);
    }
    return vist;
  }, [visibles]);

  async function marcar(cos: Record<string, unknown>) {
    setTreballant(true);
    setError(null);
    try {
      await patchJSON(`/api/treballadors/${treballadorId}/compte`, cos);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No s’ha pogut desar el pagament');
    } finally {
      setTreballant(false);
    }
  }

  const marcarLinia = (m: Moviment) =>
    marcar({ abast: 'LINIA', tipus: m.tipus, id: m.id, pagat: !m.pagat });

  // Confirmació per a les accions que toquen moltes línies de cop.
  const [confirmar, setConfirmar] = useState<{ missatge: string; cos: Record<string, unknown> } | null>(null);

  function demanarMarcarPeriode(tipus?: TipusMoviment) {
    const grup = tipus ? visibles.filter((m) => m.tipus === tipus) : visibles;
    const perPagar = grup.filter((m) => !m.pagat);
    if (perPagar.length === 0) return;
    const nom = tipus === 'NETEJA' ? 'de neteja' : tipus === 'BUGADERIA' ? 'de bugaderia' : '';
    setConfirmar({
      missatge:
        `Es marcaran com a pagades ${perPagar.length} línies ${nom} del ${fmtDia(desde)} al ${fmtDia(fins)}, ` +
        `per un total de ${suma(perPagar).toFixed(2)} €. Ho pots desfer clicant l’estat de cada línia.`,
      cos: { abast: 'PERIODE', desde, fins, pagat: true, ...(tipus ? { tipus } : {}) },
    });
  }

  function demanarMarcarMes(ym: string) {
    const delMes = visibles.filter((m) => m.dia.slice(0, 7) === ym && !m.pagat);
    if (delMes.length === 0) return;
    // El mes es talla pel rang visible: no es marca res que no es vegi.
    const dies = delMes.map((m) => m.dia).sort();
    setConfirmar({
      missatge:
        `Es marcaran com a pagades ${delMes.length} línies de ${fmtMes(ym)}, ` +
        `per un total de ${suma(delMes).toFixed(2)} €.`,
      cos: { abast: 'PERIODE', desde: dies[0]!, fins: dies[dies.length - 1]!, pagat: true },
    });
  }

  // --- alta d'un pagament manual (jornada) ---
  const [dia, setDia] = useState(toISODate(new Date()));
  const [hores, setHores] = useState('');
  const [preu, setPreu] = useState('');
  const [importe, setImporte] = useState('');
  const [desant, setDesant] = useState(false);

  async function afegir(e: React.FormEvent) {
    e.preventDefault();
    // Per hores: hores × €/h. Per tasques: un import directe.
    if (perTasques ? !importe : !hores) return;
    setDesant(true);
    setError(null);
    try {
      const cos = perTasques
        ? { data: dia, hores: 1, preuHora: Number(importe) }
        : { data: dia, hores: Number(hores), preuHora: preu || undefined };
      await postJSON(`/api/treballadors/${treballadorId}/jornades`, cos);
      setHores('');
      setPreu('');
      setImporte('');
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error');
    } finally {
      setDesant(false);
    }
  }

  const [esborrar, setEsborrar] = useState<Moviment | null>(null);
  async function esborrarJornada(id: string) {
    setError(null);
    try {
      await delJSON(`/api/jornades/${id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No s’ha pogut eliminar');
    }
  }

  const exportUrl = `/api/treballadors/${treballadorId}/compte/export?desde=${desde}&fins=${fins}`;

  return (
    <div className="space-y-5">
      {/* Període: mana sobre tot el que hi ha a sota */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl bg-brand-50 px-4 py-3">
        <Field label="Des de">
          <Input
            type="date"
            value={desde}
            max={fins}
            onChange={(e) => {
              setDesde(e.target.value);
              setPreset(null);
            }}
          />
        </Field>
        <Field label="Fins a">
          <Input
            type="date"
            value={fins}
            min={desde}
            onChange={(e) => {
              setFins(e.target.value);
              setPreset(null);
            }}
          />
        </Field>
        <div className="flex flex-wrap gap-1.5 sm:ml-auto">
          {PRESETS.map((p) => (
            <button
              key={p.clau}
              type="button"
              aria-pressed={preset === p.clau}
              onClick={() => aplicarPreset(p.clau)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                preset === p.clau
                  ? 'border-brand-700 bg-brand-700 text-white'
                  : 'border-slate-300 bg-white text-slate-600 hover:border-brand-600 hover:text-brand-700',
              )}
            >
              {p.etiqueta}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {/* Resum del període */}
      <div className="grid gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total del període</p>
          <p className="text-2xl font-bold text-brand-800">
            <Eur value={total} />
          </p>
          <p className="text-xs text-slate-400">
            {visibles.length} línies · {fmtDia(desde)} – {fmtDia(fins)}
          </p>
        </div>
        <div className="bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Ja pagat</p>
          <p className="text-2xl font-bold text-green-700">
            <Eur value={totalPagat} />
          </p>
          <p className="text-xs text-slate-400">{pagades.length} línies liquidades</p>
        </div>
        <div className="bg-amber-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-700/70">Falta per pagar</p>
          <p className="text-2xl font-bold text-amber-700">
            <Eur value={totalPendent} />
          </p>
          <p className="text-xs text-amber-700/70">
            {pendents.length ? `${pendents.length} línies per liquidar` : 'tot al dia'}
          </p>
        </div>
        <div className="flex flex-col justify-center gap-2 bg-white p-4">
          <Button
            type="button"
            size="sm"
            disabled={treballant || pendents.length === 0}
            onClick={() => demanarMarcarPeriode()}
          >
            <Check className="h-4 w-4" /> Marcar el pendent com a pagat
          </Button>
          <a
            href={exportUrl}
            download
            className="inline-flex h-8 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
          >
            <Download className="h-4 w-4" /> Exportar el període
          </a>
        </div>
      </div>

      {/* Desglossament per concepte */}
      <div className="grid gap-3 sm:grid-cols-2">
        {(
          [
            { tipus: 'NETEJA' as const, nom: 'Neteja (jornades)', dades: neteja, color: 'bg-brand-700' },
            { tipus: 'BUGADERIA' as const, nom: 'Bugaderia', dades: bugaderia, color: 'bg-sky-700' },
          ]
        ).map(({ tipus, nom, dades, color }) => (
          <div key={tipus} className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <span className={cn('h-4 w-1 rounded-full', color)} />
                {nom}
              </h3>
              <span className="text-lg font-bold text-slate-900">
                <Eur value={dades.total} />
              </span>
            </div>
            <div className="mt-2.5 flex h-2 overflow-hidden rounded-full bg-slate-200">
              <span
                className="bg-green-600"
                style={{ width: dades.total ? `${(dades.pagat / dades.total) * 100}%` : '0%' }}
              />
              <span
                className="bg-amber-500"
                style={{ width: dades.total ? `${(dades.pendent / dades.total) * 100}%` : '0%' }}
              />
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
              <span>
                <span className="mr-1.5 inline-block h-2 w-2 rounded-sm bg-green-600 align-middle" />
                Pagat <strong className="text-slate-700"><Eur value={dades.pagat} /></strong>
              </span>
              <span>
                <span className="mr-1.5 inline-block h-2 w-2 rounded-sm bg-amber-500 align-middle" />
                Pendent <strong className="text-slate-700"><Eur value={dades.pendent} /></strong>
              </span>
              {dades.pendent > 0 && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="ml-auto"
                  disabled={treballant}
                  onClick={() => demanarMarcarPeriode(tipus)}
                >
                  Marcar
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Moviments: neteja i bugaderia barrejades, per dia */}
      <div>
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-base font-semibold text-slate-800">Moviments</h3>
          <span className="text-xs text-slate-400">Clica l’estat de qualsevol línia per canviar-lo</span>
        </div>

        {visibles.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 px-6 py-10 text-center text-sm text-slate-500">
            {moviments.length === 0
              ? 'Encara no hi ha res registrat per a aquesta persona.'
              : 'Cap moviment en aquest període.'}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2.5 font-semibold">Dia</th>
                  <th className="px-3 py-2.5 font-semibold">Concepte</th>
                  <th className="px-3 py-2.5 font-semibold">Detall</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Import</th>
                  <th className="px-3 py-2.5 font-semibold">Estat</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {mesos.map((ym) => {
                  const delMes = visibles.filter((m) => m.dia.slice(0, 7) === ym);
                  const pendentMes = suma(delMes.filter((m) => !m.pagat));
                  return (
                    <FragmentMes
                      key={ym}
                      ym={ym}
                      delMes={delMes}
                      pendentMes={pendentMes}
                      treballant={treballant}
                      onMarcarMes={() => demanarMarcarMes(ym)}
                      onMarcarLinia={marcarLinia}
                      onEsborrar={setEsborrar}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Alta manual d'un pagament de neteja */}
      {perTasques ? (
        <form onSubmit={afegir} className="grid items-end gap-2 border-t border-slate-100 pt-4 sm:grid-cols-3">
          <Field label="Dia">
            <Input type="date" value={dia} onChange={(e) => setDia(e.target.value)} />
          </Field>
          <Field label="Import (€)">
            <Input
              type="number"
              step="0.01"
              placeholder="0,00"
              value={importe}
              onChange={(e) => setImporte(e.target.value)}
            />
          </Field>
          <Button type="submit" disabled={desant || !importe}>
            <Plus className="h-4 w-4" /> Afegir pagament
          </Button>
        </form>
      ) : (
        <form onSubmit={afegir} className="grid items-end gap-2 border-t border-slate-100 pt-4 sm:grid-cols-4">
          <Field label="Dia">
            <Input type="date" value={dia} onChange={(e) => setDia(e.target.value)} />
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
          <Button type="submit" disabled={desant || !hores}>
            <Plus className="h-4 w-4" /> Afegir jornada
          </Button>
        </form>
      )}

      <p className="text-xs text-slate-400">
        La bugaderia surt de la roba marcada a <strong>Neteja</strong> els dies que ha netejat aquesta
        persona; els imports, del preu per article del catàleg. Les jornades de neteja es creen soles en
        marcar les tasques com a fetes.
      </p>

      <ConfirmDialog
        open={confirmar !== null}
        title="Marcar com a pagat"
        message={confirmar?.missatge ?? ''}
        confirmLabel="Marcar com a pagat"
        onConfirm={() => {
          if (confirmar) void marcar(confirmar.cos);
          setConfirmar(null);
        }}
        onCancel={() => setConfirmar(null)}
      />
      <ConfirmDialog
        open={esborrar !== null}
        title="Eliminar el pagament"
        message={
          esborrar
            ? `S’eliminarà el pagament del ${fmtDia(esborrar.dia)} (${esborrar.import.toFixed(2)} €). Si venia de tasques de neteja, aquelles tasques tornaran a estar pendents.`
            : ''
        }
        confirmLabel="Eliminar"
        onConfirm={() => {
          if (esborrar) void esborrarJornada(esborrar.id);
          setEsborrar(null);
        }}
        onCancel={() => setEsborrar(null)}
      />
    </div>
  );
}

/** Capçalera de mes amb subtotal + les seves línies. */
function FragmentMes({
  ym,
  delMes,
  pendentMes,
  treballant,
  onMarcarMes,
  onMarcarLinia,
  onEsborrar,
}: {
  ym: string;
  delMes: Moviment[];
  pendentMes: number;
  treballant: boolean;
  onMarcarMes: () => void;
  onMarcarLinia: (m: Moviment) => void;
  onEsborrar: (m: Moviment) => void;
}) {
  return (
    <>
      <tr className="border-b border-slate-200 bg-brand-50/70">
        <td colSpan={6} className="px-3 py-2">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold capitalize text-slate-700">{fmtMes(ym)}</span>
            <span className="ml-auto flex items-center gap-3 text-sm font-semibold">
              {pendentMes > 0 ? (
                <>
                  <span className="text-amber-700">
                    Pendent <Eur value={pendentMes} />
                  </span>
                  <Button type="button" size="sm" variant="outline" disabled={treballant} onClick={onMarcarMes}>
                    Marcar el mes
                  </Button>
                </>
              ) : (
                <span className="text-green-700">Mes liquidat</span>
              )}
              <span className="text-slate-900">
                <Eur value={suma(delMes)} />
              </span>
            </span>
          </div>
        </td>
      </tr>
      {delMes.map((m) => (
        <tr key={`${m.tipus}-${m.id}`} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
          <td className={cn('whitespace-nowrap px-3 py-2 text-slate-500', m.pagat && 'opacity-60')}>
            {fmtDiaMes(m.dia)}
          </td>
          <td className={cn('whitespace-nowrap px-3 py-2', m.pagat && 'opacity-60')}>
            <span className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <span
                className={cn('h-4 w-1 rounded-full', m.tipus === 'NETEJA' ? 'bg-brand-700' : 'bg-sky-700')}
              />
              {m.tipus === 'NETEJA' ? 'Neteja' : 'Bugaderia'}
            </span>
          </td>
          <td className={cn('px-3 py-2 text-xs text-slate-500', m.pagat && 'opacity-60')}>{m.concepte}</td>
          <td className={cn('whitespace-nowrap px-3 py-2 text-right font-medium', m.pagat && 'opacity-60')}>
            <Eur value={m.import} />
          </td>
          <td className="px-3 py-2">
            <button
              type="button"
              disabled={treballant}
              onClick={() => onMarcarLinia(m)}
              title={
                m.pagat
                  ? `Pagat${m.pagatEl ? ` el ${fmtDia(m.pagatEl)}` : ''} — clica per tornar-ho a pendent`
                  : 'Marcar com a pagat'
              }
            >
              {m.pagat ? (
                <Badge tone="success">
                  <Check className="mr-0.5 h-3 w-3" /> Pagat
                </Badge>
              ) : (
                <Badge tone="warning">Pendent</Badge>
              )}
            </button>
          </td>
          <td className="px-1 py-2 text-right">
            {m.tipus === 'NETEJA' && (
              <button
                type="button"
                aria-label="Eliminar el pagament"
                className="touch-manipulation p-2 text-slate-400 hover:text-red-600"
                onClick={() => onEsborrar(m)}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </td>
        </tr>
      ))}
    </>
  );
}
