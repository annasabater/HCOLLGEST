'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { CrearPressupostEstada } from '@/components/pressupost/crear-pressupost-estada';
import { delJSON, ApiError } from '@/lib/api';
import { formatEur, formatDate } from '@/lib/utils';

interface Item {
  id: string;
  numero: string;
  data: string; // ISO
  total: number;
}

/**
 * Llista de pressupostos enllaçats a una estada amb accions per obrir/imprimir,
 * editar (llapis → formulari) i eliminar (paperera + confirmació), com "Pagaments
 * i fiances". Inclou el botó per crear-ne un de nou prefillat amb el titular.
 */
export function PressupostosEstadaList({ estanciaId, items }: { estanciaId: string; items: Item[] }) {
  const router = useRouter();
  const [del, setDel] = useState<{ id: string; numero: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function elimina() {
    if (!del) return;
    try {
      await delJSON(`/api/pressupostos/${del.id}`);
      setDel(null);
      router.refresh();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'No s’ha pogut eliminar');
      setDel(null);
    }
  }

  return (
    <div className="space-y-2">
      {err && <p className="text-sm text-red-600">{err}</p>}
      {items.length === 0 ? (
        <p className="text-sm text-slate-400">Cap pressupost enllaçat a aquesta estada.</p>
      ) : (
        items.map((p) => (
          <div key={p.id} className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <div className="min-w-0 flex-1">
              <span className="font-medium text-slate-800">Pressupost {p.numero}</span>
              <span className="ml-2 text-slate-500">
                {formatDate(p.data)} · {formatEur(p.total)}
              </span>
            </div>
            <a href={`/imprimir/pressupost/${p.id}`} target="_blank" rel="noreferrer" title="Imprimir / PDF">
              <Button variant="ghost" size="sm">
                <Printer className="h-4 w-4" />
              </Button>
            </a>
            <Link href={`/pressupostos/${p.id}`} title="Editar">
              <Button variant="ghost" size="sm">
                <Pencil className="h-4 w-4" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-600"
              title="Eliminar"
              onClick={() => setDel({ id: p.id, numero: p.numero })}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))
      )}

      <div className="pt-1">
        <CrearPressupostEstada estanciaId={estanciaId} />
      </div>

      <ConfirmDialog
        open={!!del}
        title="Eliminar pressupost"
        message={`Segur que vols eliminar el pressupost ${del?.numero ?? ''}? El número quedarà lliure.`}
        onConfirm={elimina}
        onCancel={() => setDel(null)}
      />
    </div>
  );
}
