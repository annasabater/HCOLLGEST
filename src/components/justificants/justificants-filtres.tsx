'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Select } from '@/components/ui/input';
import { Field } from '@/components/ui/field';

const MESOS = ['Gener', 'Febrer', 'Març', 'Abril', 'Maig', 'Juny', 'Juliol', 'Agost', 'Setembre', 'Octubre', 'Novembre', 'Desembre'];

export function JustificantsFiltres({ anyActual }: { anyActual: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const any = sp.get('any') ?? '';
  const mes = sp.get('mes') ?? '';
  const anys = [anyActual + 1, anyActual, anyActual - 1, anyActual - 2, anyActual - 3, anyActual - 4];

  function update(k: 'any' | 'mes', v: string) {
    const p = new URLSearchParams(sp.toString());
    if (v) p.set(k, v);
    else p.delete(k);
    // En canviar el filtre, torna a la primera pàgina de les dues llistes.
    p.delete('pagina');
    p.delete('paginaMossos');
    if (k === 'any' && !v) p.delete('mes');
    router.push(`${pathname}?${p.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <Field label="Any">
        <Select value={any} onChange={(e) => update('any', e.target.value)}>
          <option value="">Tots</option>
          {anys.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </Select>
      </Field>
      <Field label="Mes">
        <Select value={mes} onChange={(e) => update('mes', e.target.value)} disabled={!any}>
          <option value="">Tot l’any</option>
          {MESOS.map((nom, i) => (
            <option key={i} value={i + 1}>{nom}</option>
          ))}
        </Select>
      </Field>
    </div>
  );
}
