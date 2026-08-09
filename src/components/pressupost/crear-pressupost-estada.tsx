'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { postJSON, ApiError } from '@/lib/api';

/**
 * Botó (opcional) per crear un pressupost a partir d'una estada: prefilla el
 * client amb les dades del titular i obre l'editor d'impressió del pressupost.
 * No modifica l'estada; només és una drecera per quan cal fer una oferta a un hoste.
 */
export function CrearPressupostEstada({ estanciaId }: { estanciaId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function crea() {
    setLoading(true);
    setError(null);
    try {
      const res = await postJSON<{ id: string }>('/api/pressupostos', { estanciaId });
      window.open(`/imprimir/pressupost/${res.id}`, '_blank', 'noopener');
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No s’ha pogut crear el pressupost');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button variant="ghost" size="sm" onClick={crea} disabled={loading}>
        <FileText className="h-4 w-4" /> {loading ? 'Creant…' : 'Fer pressupost'}
      </Button>
      {error && <span className="px-2 text-xs text-red-600">{error}</span>}
    </>
  );
}
