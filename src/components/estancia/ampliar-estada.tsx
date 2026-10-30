'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { postJSON, getJSON, ApiError } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { toISODate } from '@/lib/dates';

// Opcions de número de contracte per a la nova estada (vegeu GET /api/estancies/:id/ampliar).
interface InfoNumero {
  arrel: { numContracte: string; anyContracte: number; dataEntrada: string | null; dataSortida: string | null };
  continuacio: string | null;
  nou: string;
}
type OpcioNumero = 'continuacio' | 'nou' | 'manual' | 'cap';

interface RoomDisp {
  id: string;
  nom: string;
  occupat: boolean;
  lliureFins: string | null;
}

export function AmpliarEstada({
  estanciaId,
  defaultEntrada,
  habitacions,
  actualHabitacioId,
}: {
  estanciaId: string;
  defaultEntrada: string; // ISO YYYY-MM-DD (normalment la sortida actual)
  habitacions: { id: string; nom: string }[];
  actualHabitacioId: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [dataEntrada, setDataEntrada] = useState(defaultEntrada);
  const [dataSortida, setDataSortida] = useState('');
  const [habitacioId, setHabitacioId] = useState(actualHabitacioId ?? '');
  const [disp, setDisp] = useState<RoomDisp[]>([]);
  const [reaprofitar, setReaprofitar] = useState(true);
  const [llocSignatura, setLlocSignatura] = useState('Barcelona');
  const [dataSignatura, setDataSignatura] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Número de contracte de la nova estada.
  const [infoNum, setInfoNum] = useState<InfoNumero | null>(null);
  const [opNum, setOpNum] = useState<OpcioNumero>('continuacio');
  const [numManual, setNumManual] = useState('');
  const [manualEnUs, setManualEnUs] = useState(false);

  function obre() {
    setOpen(true);
    if (!dataSignatura) setDataSignatura(toISODate(new Date())); // dia de l'ampliació
    getJSON<InfoNumero>(`/api/estancies/${estanciaId}/ampliar`)
      .then((r) => {
        setInfoNum(r);
        // Per defecte, el de sempre: continuació si l'arrel té número; si no, un de nou.
        setOpNum(r.continuacio ? 'continuacio' : 'nou');
      })
      .catch(() => setInfoNum(null));
  }

  // Avisa si el número escrit a mà ja el fa servir una altra estada.
  useEffect(() => {
    const n = numManual.trim();
    if (opNum !== 'manual' || !n || !infoNum) { setManualEnUs(false); return; }
    let cancel = false;
    const t = setTimeout(() => {
      getJSON<{ exists: boolean }>(`/api/estancies/check-numero?any=${infoNum.arrel.anyContracte}&numero=${encodeURIComponent(n)}`)
        .then((r) => { if (!cancel) setManualEnUs(r.exists); })
        .catch(() => {});
    }, 300);
    return () => { cancel = true; clearTimeout(t); };
  }, [numManual, opNum, infoNum]);

  const numeroTriat: string | undefined =
    opNum === 'continuacio' ? undefined : opNum === 'nou' ? infoNum?.nou : opNum === 'manual' ? numManual.trim() : '';
  const numeroInvalid = opNum === 'manual' && (!numManual.trim() || manualEnUs);

  const carregaDisp = useCallback(
    async (desde: string) => {
      if (!desde) return;
      try {
        const r = await getJSON<{ rooms: RoomDisp[] }>(
          `/api/estancies/${estanciaId}/disponibilitat?desde=${desde}`,
        );
        setDisp(r.rooms);
      } catch {
        setDisp([]);
      }
    },
    [estanciaId],
  );

  useEffect(() => {
    if (open) carregaDisp(dataEntrada);
  }, [open, dataEntrada, carregaDisp]);

  const sel = disp.find((r) => r.id === habitacioId) ?? null;
  const limit = sel?.lliureFins ?? null;
  const sobrepassa = !!(limit && dataSortida && dataSortida > limit);

  function labelRoom(d: RoomDisp): string {
    if (d.occupat) return `${d.nom} · ocupada`;
    if (d.lliureFins) return `${d.nom} · lliure fins ${formatDate(d.lliureFins)}`;
    return `${d.nom} · lliure`;
  }

  async function ampliar(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await postJSON<{ estanciaId: string }>(`/api/estancies/${estanciaId}/ampliar`, {
        dataEntrada,
        dataSortida,
        habitacioId: habitacioId || undefined,
        reaprofitarFirmes: reaprofitar,
        ...(reaprofitar ? { dataSignatura, llocSignatura } : {}),
        ...(numeroTriat !== undefined ? { numContracte: numeroTriat } : {}),
      });
      router.push(`/estancies/${res.estanciaId}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error ampliant l’estada');
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={obre}>
        <CalendarPlus className="h-4 w-4" /> Ampliar estada
      </Button>
    );
  }

  return (
    <form onSubmit={ampliar} className="w-full space-y-2 rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-end gap-2">
        <Field label="Nova entrada">
          <Input type="date" value={dataEntrada} onChange={(e) => setDataEntrada(e.target.value)} />
        </Field>
        <Field label="Habitació">
          <Select value={habitacioId} onChange={(e) => setHabitacioId(e.target.value)}>
            <option value="">—</option>
            {habitacions.map((h) => {
              const d = disp.find((r) => r.id === h.id);
              return (
                <option key={h.id} value={h.id}>
                  {d ? labelRoom(d) : h.nom}
                </option>
              );
            })}
          </Select>
        </Field>
        <Field label="Nova sortida">
          <Input
            type="date"
            value={dataSortida}
            max={limit ?? undefined}
            onChange={(e) => setDataSortida(e.target.value)}
          />
        </Field>
        {/* Ocupada/sobrepassa són AVISOS, no bloquejos: l'hostal a vegades comparteix
            habitació. Només bloquegem si falta la data de sortida. */}
        <Button type="submit" size="sm" disabled={saving || !dataSortida || numeroInvalid}>
          {saving ? 'Ampliant…' : 'Crear ampliació'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel·lar
        </Button>
      </div>

      {infoNum && (
        <fieldset className="space-y-1.5 border-t border-slate-100 pt-2">
          <legend className="text-sm font-semibold text-slate-800">Número de contracte de la nova estada</legend>
          {!infoNum.continuacio && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-800">
              La primera estada
              {infoNum.arrel.dataEntrada && infoNum.arrel.dataSortida
                ? ` (${formatDate(infoNum.arrel.dataEntrada)} – ${formatDate(infoNum.arrel.dataSortida)})`
                : ''}{' '}
              no té número de contracte. La primera es queda tal com està.
            </p>
          )}
          {(
            [
              ['continuacio', infoNum.continuacio ? <>Continuació: <b>{infoNum.continuacio}</b> <span className="text-slate-500">· el mateix contracte, allargat</span></> : <>Continuació <span className="text-slate-500">· no es pot: la primera no té número</span></>],
              ['nou', <>Número nou: <b>{infoNum.nou}</b> <span className="text-slate-500">· el següent lliure</span></>],
              ['manual', <>Escriure&apos;l</>],
              ...(infoNum.continuacio ? [] : [['cap', <>Sense número <span className="text-slate-500">· com ara (es pot posar després editant l&apos;estada)</span></>] as const]),
            ] as const
          ).map(([k, label]) => {
            const desactivat = k === 'continuacio' && !infoNum.continuacio;
            return (
              <label
                key={k}
                className={`flex flex-wrap items-center gap-2 rounded-lg border px-3 py-1.5 text-sm ${opNum === k ? 'border-brand-600 bg-brand-50' : 'border-slate-200'} ${desactivat ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
              >
                <input type="radio" name={`num-${estanciaId}`} checked={opNum === k} disabled={desactivat} onChange={() => setOpNum(k)} />
                <span>{label}</span>
                {k === 'manual' && (
                  <Input
                    className="h-8 w-36"
                    placeholder="p. ex. 26015"
                    aria-label="Número de contracte a mà"
                    value={numManual}
                    onFocus={() => setOpNum('manual')}
                    onChange={(e) => { setNumManual(e.target.value); setOpNum('manual'); }}
                  />
                )}
                {k === 'manual' && opNum === 'manual' && manualEnUs && (
                  <span className="text-xs font-medium text-red-600">Aquest número ja el fa servir una altra estada.</span>
                )}
              </label>
            );
          })}
        </fieldset>
      )}

      <div className="flex flex-wrap items-end gap-3 border-t border-slate-100 pt-2">
        <label className="flex h-10 items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={reaprofitar} onChange={(e) => setReaprofitar(e.target.checked)} />
          Reaprofitar les signatures (no cal tornar a signar)
        </label>
        {reaprofitar && (
          <>
            <Field label="Localitat de la signatura">
              <Input value={llocSignatura} onChange={(e) => setLlocSignatura(e.target.value)} />
            </Field>
            <Field label="Data de la signatura">
              <Input type="date" value={dataSignatura} onChange={(e) => setDataSignatura(e.target.value)} />
            </Field>
          </>
        )}
      </div>

      {sel && (
        <p className="text-xs text-slate-500">
          {sel.occupat
            ? `⚠ L'habitació ${sel.nom} ja consta ocupada el ${formatDate(dataEntrada)} per una altra estada. Pots crear l'ampliació igualment (si comparteixen habitació) o triar-ne una altra.`
            : sel.lliureFins
              ? `L'habitació ${sel.nom} està lliure fins al ${formatDate(sel.lliureFins)}.`
              : `L'habitació ${sel.nom} està lliure (sense reserves posteriors).`}
        </p>
      )}
      {sobrepassa && limit && (
        <p className="text-xs text-red-600">
          La sortida supera la disponibilitat de l’habitació (lliure només fins al {formatDate(limit)}).
          Tria una altra habitació o una data anterior.
        </p>
      )}
      {error && <span className="w-full text-sm text-red-600">{error}</span>}
    </form>
  );
}
