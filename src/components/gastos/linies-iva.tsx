'use client';

import { Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { formatEur, cn } from '@/lib/utils';
import { totalDeLinies, type LiniaIva } from '@/lib/gasto-iva';

/** Línia d'IVA tal com s'escriu al formulari (texts, poden ser buits). */
export interface LiniaIvaForm { base: string; ivaPercent: string }

export const liniaBuida = (): LiniaIvaForm => ({ base: '', ivaPercent: '' });

/** Línies del formulari → línies numèriques (les que tenen base). */
export function liniesNumeriques(linies: LiniaIvaForm[]): LiniaIva[] {
  return linies
    .filter((l) => l.base.trim() !== '')
    .map((l) => ({ base: Number(l.base), ivaPercent: l.ivaPercent.trim() === '' ? 0 : Number(l.ivaPercent) }))
    .filter((l) => Number.isFinite(l.base) && Number.isFinite(l.ivaPercent));
}

/**
 * Camps fiscals per enviar a l'API: una línia → baseImposable/ivaPercent;
 * diverses → desglossamentIva. `buidar` (en editar) esborra el desglossament
 * quan ja no n'hi ha.
 */
export function payloadIva(linies: LiniaIvaForm[], buidar = false) {
  const n = liniesNumeriques(linies);
  if (n.length >= 2) return { desglossamentIva: n };
  if (n.length === 1) return { baseImposable: n[0]!.base, ivaPercent: n[0]!.ivaPercent, ...(buidar ? { desglossamentIva: null } : {}) };
  // Sense base: es conserva el % si se n'ha posat (p. ex. tiquet «IVA 21%»).
  const pct = linies[0]?.ivaPercent.trim();
  return buidar
    ? { baseImposable: undefined, ivaPercent: pct ? Number(pct) : undefined, desglossamentIva: null }
    : { ivaPercent: pct ? Number(pct) : undefined };
}

/** Línies d'una despesa existent (desglossament, o base + % simples). */
export function liniesDeGasto(g: {
  baseImposable?: string | number | null;
  ivaPercent?: string | number | null;
  desglossamentIva?: { base: number; ivaPercent: number }[] | null;
}): LiniaIvaForm[] {
  if (Array.isArray(g.desglossamentIva) && g.desglossamentIva.length >= 2) {
    return g.desglossamentIva.map((l) => ({ base: String(l.base), ivaPercent: String(l.ivaPercent) }));
  }
  return [{
    base: g.baseImposable != null ? String(Number(g.baseImposable)) : '',
    ivaPercent: g.ivaPercent != null ? String(Number(g.ivaPercent)) : '',
  }];
}

/**
 * Base imposable + % IVA, amb tantes línies com tipus d'IVA tingui la factura
 * (10% + 21%, part no subjecta a 0%…). Sota, la comprovació amb el total.
 */
export function LiniesIva({
  linies,
  onChange,
  total,
  irpfPercent,
  className,
}: {
  linies: LiniaIvaForm[];
  onChange: (l: LiniaIvaForm[]) => void;
  total: string;
  irpfPercent?: string;
  className?: string;
}) {
  const set = (i: number, camp: keyof LiniaIvaForm, v: string) =>
    onChange(linies.map((l, j) => (j === i ? { ...l, [camp]: v } : l)));
  const n = liniesNumeriques(linies);
  const calc = n.length > 0 ? totalDeLinies(n, Number(irpfPercent) || 0) : null;
  const totalNum = Number(total);
  const quadra = calc == null || !total || Math.abs(calc - totalNum) <= 0.02;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="grid grid-cols-[1fr_6rem_2.25rem] gap-2 text-xs font-medium text-slate-600">
        <span>Base imposable €</span>
        <span>% IVA</span>
        <span />
      </div>
      {linies.map((l, i) => (
        <div key={i} className="grid grid-cols-[1fr_6rem_2.25rem] items-center gap-2">
          <Input
            type="number"
            step="0.01"
            aria-label={`Base imposable, línia ${i + 1}`}
            value={l.base}
            onChange={(e) => set(i, 'base', e.target.value)}
          />
          <Input
            type="number"
            step="0.01"
            aria-label={`% IVA, línia ${i + 1}`}
            placeholder="21"
            value={l.ivaPercent}
            onChange={(e) => set(i, 'ivaPercent', e.target.value)}
          />
          {linies.length > 1 ? (
            <button
              type="button"
              onClick={() => onChange(linies.filter((_, j) => j !== i))}
              className="p-2 touch-manipulation text-slate-400 hover:text-red-600"
              aria-label={`Treure la línia ${i + 1}`}
            >
              <X className="h-4 w-4" />
            </button>
          ) : <span />}
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <button
          type="button"
          onClick={() => onChange([...linies, liniaBuida()])}
          className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:text-brand-900"
        >
          <Plus className="h-3.5 w-3.5" /> Afegir un altre tipus d’IVA
        </button>
        <span className="text-xs text-slate-500">Per a la part sense IVA (p. ex. el cànon de l’aigua) posa 0 %.</span>
      </div>
      {calc != null && (
        <p className={cn('text-xs', quadra ? 'text-slate-500' : 'font-medium text-amber-700')}>
          Bases + IVA{Number(irpfPercent) ? ' − IRPF' : ''} = {formatEur(calc)}
          {total && !quadra && <> · no quadra amb el total ({formatEur(totalNum)})</>}
        </p>
      )}
    </div>
  );
}
