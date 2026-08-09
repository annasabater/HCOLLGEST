'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { postJSON, ApiError } from '@/lib/api';

/** Crea un pressupost nou (amb el següent número) i hi entra per editar-lo. */
export function NouPressupostButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  return (
    <Button
      onClick={async () => {
        setLoading(true);
        try {
          const r = await postJSON<{ id: string }>('/api/pressupostos', {});
          router.push(`/pressupostos/${r.id}`);
        } catch (e) {
          alert(e instanceof ApiError ? e.message : 'No s’ha pogut crear el pressupost');
          setLoading(false);
        }
      }}
      disabled={loading}
    >
      <Plus className="h-4 w-4" /> {loading ? 'Creant…' : 'Nou pressupost'}
    </Button>
  );
}
