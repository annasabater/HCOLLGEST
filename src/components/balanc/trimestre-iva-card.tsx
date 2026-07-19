'use client';

import { useState } from 'react';
import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/input';

/**
 * Selector d'any + trimestre que obre el llibre d'IVA (ingressos) imprimible.
 * De moment només ingressos (facturas emitidas / libro de ingresos); la part
 * de despeses s'afegirà quan els gastos guardin el desglossament d'IVA.
 */
export function TrimestreIvaCard() {
  const anyActual = new Date().getFullYear();
  const anys = [anyActual, anyActual - 1, anyActual - 2];
  const [any, setAny] = useState(anyActual);
  const [trim, setTrim] = useState(Math.floor(new Date().getMonth() / 3) + 1);

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
      <span className="flex items-center gap-1.5 font-medium text-slate-700">
        <FileText className="h-4 w-4 text-brand-600" /> Llibre d&apos;IVA trimestral (ingressos)
      </span>
      <Select className="h-9 w-24" value={String(any)} onChange={(e) => setAny(Number(e.target.value))} aria-label="Any">
        {anys.map((a) => (
          <option key={a} value={a}>{a}</option>
        ))}
      </Select>
      <Select className="h-9 w-40" value={String(trim)} onChange={(e) => setTrim(Number(e.target.value))} aria-label="Trimestre">
        <option value={1}>1r trimestre (gen–mar)</option>
        <option value={2}>2n trimestre (abr–jun)</option>
        <option value={3}>3r trimestre (jul–set)</option>
        <option value={4}>4t trimestre (oct–des)</option>
      </Select>
      <a href={`/imprimir/trimestre-ingressos/${any}-${trim}`} target="_blank" rel="noreferrer">
        <Button size="sm" variant="outline">
          <FileText className="h-4 w-4" /> Obrir / imprimir
        </Button>
      </a>
    </div>
  );
}
