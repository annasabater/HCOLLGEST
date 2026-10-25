'use client';

import { useEffect, useState } from 'react';
import { Repeat } from 'lucide-react';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { getJSON } from '@/lib/api';
import { liniesPressupost, dataCurta, type TramPla, type PressupostDeCalcul } from '@/lib/pressupost-calcul';
import { GRUP_TARIFA_LABELS } from '@/lib/validation/tarifa-tipus';
import type { CalculOrigen } from '@/components/pressupost/pressupost-form';

interface Calcul {
  ok: boolean;
  nits: number;
  total: number;
  segments: { etiqueta: string; desde: string; fins: string; nits: number; subtotal: number }[];
  disponibilitat: { pla: TramPla[] | null } | null;
}

/**
 * Pressupost fet des de la calculadora amb canvi d'habitació: una casella per
 * mostrar el canvi (una línia per habitació + nota) o amagar-lo (una sola línia).
 * Tornar a marcar/desmarcar reescriu les línies dels conceptes.
 */
export function CanviHabitacioCard({
  calcul,
  onCanvi,
}: {
  calcul: CalculOrigen;
  onCanvi: (dades: PressupostDeCalcul, notaAnterior: string) => void;
}) {
  const [res, setRes] = useState<Calcul | null>(null);
  const [mostrar, setMostrar] = useState(calcul.mostrarCanvi);
  const tipus = GRUP_TARIFA_LABELS[calcul.grup];

  useEffect(() => {
    const p = new URLSearchParams({ grup: calcul.grup, entrada: calcul.entrada, sortida: calcul.sortida });
    getJSON<Calcul>(`/api/tarifes-tipus/calcular?${p.toString()}`).then((r) => r.ok && setRes(r)).catch(() => {});
  }, [calcul.grup, calcul.entrada, calcul.sortida]);

  if (!res) return null;
  const pla = res.disponibilitat?.pla ?? null;
  const dades = (m: boolean) =>
    liniesPressupost({ tipus, entrada: calcul.entrada, sortida: calcul.sortida, nits: res.nits, total: res.total, segments: res.segments, pla, mostrarCanvi: m });

  function canvia(m: boolean) {
    onCanvi(dades(m), dades(mostrar).notes);
    setMostrar(m);
    // Que en recarregar la pàgina la casella quedi com l'has deixada.
    const url = new URL(window.location.href);
    url.searchParams.set('canvi', m ? '1' : '0');
    window.history.replaceState(null, '', url.toString());
  }

  return (
    <Card>
      <CardHeader><CardTitle>Estada calculada</CardTitle></CardHeader>
      <CardBody className="space-y-3">
        <div className="text-sm text-slate-700">
          {tipus} · del {dataCurta(calcul.entrada)} al {dataCurta(calcul.sortida)}
          <span className="block text-xs text-slate-500">
            {res.nits} {res.nits === 1 ? 'nit' : 'nits'} · {res.segments.map((s) => s.etiqueta).join(' + ')}
          </span>
        </div>
        {pla ? (
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3">
            <input
              type="checkbox"
              checked={mostrar}
              onChange={(e) => canvia(e.target.checked)}
              className="mt-0.5 h-5 w-5 accent-brand-700"
            />
            <span>
              <span className="flex items-center gap-1.5 text-sm font-semibold text-amber-900">
                <Repeat className="h-4 w-4" /> Mostrar el canvi d&apos;habitació al pressupost
              </span>
              <span className="block text-xs text-amber-800">
                {pla.map((t) => `Hab. ${t.habitacio} (${dataCurta(t.desde).slice(0, 5)}–${dataCurta(t.fins).slice(0, 5)})`).join(' → ')}.
                {' '}Si ho desmarques, surt com una sola línia. Reescriu els conceptes.
              </span>
            </span>
          </label>
        ) : (
          <p className="text-xs text-slate-500">Amb la disponibilitat d&apos;ara ja no surt cap canvi d&apos;habitació per a aquestes dates.</p>
        )}
      </CardBody>
    </Card>
  );
}
