'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FileText, Printer, ExternalLink, ShieldCheck, ShieldOff } from 'lucide-react';
import { patchJSON } from '@/lib/api';
import { cn } from '@/lib/utils';

export function FiancaTogglePrint({
  facturaId,
  fiancaInclosa: initial,
}: {
  facturaId: string;
  fiancaInclosa: boolean | null;
}) {
  const [fianca, setFianca] = useState<boolean | null>(initial);
  const [saving, setSaving] = useState(false);

  async function toggle(val: boolean) {
    const nou = fianca === val ? null : val;
    setSaving(true);
    try {
      await patchJSON(`/api/factures/${facturaId}`, { fiancaInclosa: nou });
      setFianca(nou);
    } finally {
      setSaving(false);
    }
  }

  const ambFianca = fianca === true;
  const senseFianca = fianca === false;

  const simpleHref = ambFianca
    ? `/imprimir/factura-simple/${facturaId}?custodia=true`
    : `/imprimir/factura-simple/${facturaId}`;
  const fiscalHref = ambFianca
    ? `/imprimir/factura/${facturaId}?fianca=true`
    : `/imprimir/factura/${facturaId}`;

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Imprimir</p>

      {/* Toggle fiança */}
      <div className="space-y-1.5">
        <p className="text-xs text-slate-500">Fiança inclosa a la factura:</p>
        <div className="flex gap-1.5">
          <button
            type="button"
            disabled={saving}
            onClick={() => toggle(true)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40',
              ambFianca
                ? 'border-amber-400 bg-amber-50 text-amber-800'
                : 'border-slate-200 bg-white text-slate-500 hover:border-amber-300 hover:text-amber-700',
            )}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Amb fiança
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => toggle(false)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40',
              senseFianca
                ? 'border-slate-400 bg-slate-100 text-slate-800'
                : 'border-slate-200 bg-white text-slate-500 hover:border-slate-400 hover:text-slate-700',
            )}
          >
            <ShieldOff className="h-3.5 w-3.5" />
            Sense fiança
          </button>
        </div>
        {fianca === null && (
          <p className="text-xs text-slate-400 italic">Selecciona si inclou fiança per desar la preferència.</p>
        )}
      </div>

      {/* Botons d'impressió */}
      <div className="flex gap-2 border-t border-slate-100 pt-3">
        <Link
          href={simpleHref}
          target="_blank"
          rel="noreferrer"
          className={cn(
            'flex flex-1 items-center justify-center gap-1 rounded-lg border px-2 py-2 text-xs font-medium transition-colors',
            ambFianca
              ? 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
          )}
        >
          <FileText className="h-3.5 w-3.5" /> Simple
          <ExternalLink className="h-3 w-3 opacity-50" />
        </Link>
        <Link
          href={fiscalHref}
          target="_blank"
          rel="noreferrer"
          className={cn(
            'flex flex-1 items-center justify-center gap-1 rounded-lg border px-2 py-2 text-xs font-medium transition-colors',
            ambFianca
              ? 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
          )}
        >
          <Printer className="h-3.5 w-3.5" /> Fiscal
          <ExternalLink className="h-3 w-3 opacity-50" />
        </Link>
      </div>

      {/* Nota si hi ha preferència guardada */}
      {fianca !== null && (
        <p className="text-xs text-slate-400">
          {ambFianca ? 'Imprimint amb fiança inclosa.' : 'Imprimint sense fiança.'}
          {' '}
          <button
            type="button"
            onClick={() => toggle(fianca)}
            className="underline hover:text-slate-600"
          >
            Canviar
          </button>
        </p>
      )}
    </div>
  );
}
