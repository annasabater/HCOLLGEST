'use client';

import { FileText } from 'lucide-react';
import { classePdf } from '@/components/ui/boto-pdf';

/** Botó que obre el diàleg d'impressió del navegador (Imprimir / Guardar PDF). */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={classePdf('md')}
    >
      <FileText className="h-4 w-4" /> Imprimir / Guardar PDF
    </button>
  );
}
