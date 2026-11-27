'use client';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/** Text d'ajuda del camp (sempre en una sola línia). */
export const AJUDA_IMPORT_ORIENTATIU = 'Només de referència: no crea factura, cobrament ni compta al Balanç.';

/**
 * Camp «Import total» d'una estada: un número NOMÉS de referència (€), que no
 * crea factura ni cobrament. El valor és text tal com s'escriu («900,50»); el
 * converteix l'esquema (`optImport` de validation/registre).
 */
export function ImportOrientatiuInput({
  id,
  value,
  onChange,
  className,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <div className={cn('relative', className)}>
      <Input
        id={id}
        inputMode="decimal"
        placeholder="0,00"
        value={value}
        // Només xifres i un separador decimal (coma o punt).
        onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ''))}
        className="pr-8 text-right"
      />
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-500">€</span>
    </div>
  );
}
