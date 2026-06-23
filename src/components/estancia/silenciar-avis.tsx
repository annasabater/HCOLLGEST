'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BellOff, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { patchJSON } from '@/lib/api';

export function SilenciarAvis({ estanciaId, parat }: { estanciaId: string; parat: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    try {
      await patchJSON(`/api/estancies/${estanciaId}`, { avisDadesParat: !parat });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button type="button" variant="ghost" size="sm" onClick={toggle} disabled={busy}>
      {parat ? (
        <>
          <Bell className="h-4 w-4" /> Reactivar avís
        </>
      ) : (
        <>
          <BellOff className="h-4 w-4" /> Silenciar avís
        </>
      )}
    </Button>
  );
}
