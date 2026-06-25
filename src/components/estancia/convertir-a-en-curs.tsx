'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { patchJSON, ApiError } from '@/lib/api';

export function ConvertirAEnCurs({ estanciaId }: { estanciaId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function checkin() {
    setLoading(true);
    setErr(null);
    try {
      await patchJSON(`/api/estancies/${estanciaId}`, {
        estat: 'EN_CURS',
        tipusRegistre: 'CONTRACTE_EN_CURS',
      });
      router.refresh();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Error en fer el check-in');
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button onClick={checkin} disabled={loading} size="sm">
        <LogIn className="h-4 w-4" />
        {loading ? 'Processant…' : 'Check-in (convertir a en curs)'}
      </Button>
      {err && <p className="text-xs text-red-600">{err}</p>}
    </div>
  );
}
