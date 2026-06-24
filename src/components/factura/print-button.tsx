'use client';

import { Printer } from 'lucide-react';

/** Botó que obre el diàleg d'impressió del navegador (Imprimir / Guardar PDF). */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-800"
    >
      <Printer className="h-4 w-4" /> Imprimir / Guardar PDF
    </button>
  );
}
