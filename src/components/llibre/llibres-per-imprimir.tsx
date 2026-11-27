'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookText, Check, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getJSON, patchJSON } from '@/lib/api';
import { useRestringit } from '@/components/layout/restringit-context';
import { formatDate } from '@/lib/utils';
import { nomPropi } from '@/lib/nom-propi';

interface Item {
  id: string;
  contracte: string | null;
  titular: string | null;
  dataEntrada: string | null;
  dataSortida: string | null;
  esAmpliacio: boolean;
}

/**
 * Llista taronja de /llibre amb els contractes que tenen el llibre registre per
 * imprimir (estades noves i ampliacions). «Imprimir» l'obre i «Fet» el marca.
 * No surt res si no n'hi ha cap.
 */
export function LlibresPerImprimir() {
  const router = useRouter();
  const nomesLectura = useRestringit();
  const [items, setItems] = useState<Item[] | null>(null);
  const [desant, setDesant] = useState<string | null>(null);

  const carrega = useCallback(() => {
    getJSON<{ items: Item[] }>('/api/llibre/per-imprimir')
      .then((r) => setItems(r.items))
      .catch(() => setItems([]));
  }, []);

  useEffect(() => {
    if (!nomesLectura) carrega();
  }, [carrega, nomesLectura]);

  async function fet(id: string) {
    setDesant(id);
    try {
      await patchJSON(`/api/estancies/${id}`, { llibreImpres: true });
      setItems((prev) => (prev ?? []).filter((x) => x.id !== id));
      router.refresh(); // actualitza el número del menú
    } finally {
      setDesant(null);
    }
  }

  if (nomesLectura || !items || items.length === 0) return null;

  return (
    <section className="mb-6 border border-amber-300 bg-amber-50/60">
      <h2 className="flex items-center gap-2 border-b border-amber-200 px-4 py-3 text-sm font-semibold text-amber-900">
        <BookText className="h-4 w-4 text-amber-700" /> Per imprimir
        <span className="rounded-full bg-amber-700 px-2 py-0.5 text-xs font-bold text-white">{items.length}</span>
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-t border-amber-200/70 first:border-t-0">
                <td className="px-4 py-2.5 font-semibold text-slate-800">
                  <Link href={`/estancies/${it.id}`} className="hover:underline">
                    {it.contracte ?? 'Sense número'}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-slate-700">
                  {it.titular ? it.titular.split(' ').map(nomPropi).join(' ') : '—'}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">
                  {formatDate(it.dataEntrada)} – {formatDate(it.dataSortida)}
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className={
                      it.esAmpliacio
                        ? 'bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-800'
                        : 'bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700'
                    }
                  >
                    {it.esAmpliacio ? 'Ampliació' : 'Estada nova'}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <div className="flex justify-end gap-2">
                    <a href={`/imprimir/registre/${it.id}`} target="_blank" rel="noreferrer">
                      <Button size="sm" variant="outline" className="border-2 border-amber-600 bg-white font-semibold text-amber-900 hover:bg-amber-100">
                        <Printer className="h-4 w-4 text-amber-700" /> Imprimir
                      </Button>
                    </a>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => fet(it.id)}
                      disabled={desant === it.id}
                      title="Marca’l com a imprès (es pot desfer des de l’estada)"
                      className="font-semibold text-green-700"
                    >
                      <Check className="h-4 w-4" /> Fet
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
