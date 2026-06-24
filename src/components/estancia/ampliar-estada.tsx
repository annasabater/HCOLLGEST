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

  function obre() {
    setOpen(true);
    if (!dataSignatura) setDataSignatura(toISODate(new Date())); // dia de l'ampliació
  }

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
  const ocupada = sel?.occupat ?? false;

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
        <Button type="submit" size="sm" disabled={saving || !dataSortida || sobrepassa || ocupada}>
          {saving ? 'Ampliant…' : 'Crear ampliació'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel·lar
        </Button>
      </div>

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
            ? `⚠ L'habitació ${sel.nom} ja està ocupada el ${formatDate(dataEntrada)}. Tria'n una altra.`
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
