'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { ArrowDownUp } from 'lucide-react';
import { Select } from '@/components/ui/input';

export const ORDRE_OPCIONS = [
  { value: 'entrada-desc', label: 'Entrada (més recent)' },
  { value: 'entrada-asc', label: 'Entrada (més antiga)' },
  { value: 'sortida-desc', label: 'Sortida (més recent)' },
  { value: 'sortida-asc', label: 'Sortida (més antiga)' },
  { value: 'contracte-desc', label: 'Núm. contracte (↓)' },
  { value: 'creacio-desc', label: 'Data de creació (↓)' },
] as const;

export function EstanciesOrdre({ actual }: { actual: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function canvia(ordre: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (ordre === 'entrada-desc') params.delete('ordre');
    else params.set('ordre', ordre);
    params.delete('pagina'); // torna a la 1a pàgina en reordenar
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <label className="flex items-center gap-1.5 text-sm text-slate-500">
      <ArrowDownUp className="h-4 w-4 text-slate-400" />
      <span className="hidden sm:inline">Ordenar:</span>
      <Select className="h-9 min-w-44" value={actual} onChange={(e) => canvia(e.target.value)}>
        {ORDRE_OPCIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </Select>
    </label>
  );
}
