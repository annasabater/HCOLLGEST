'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PenLine, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SignaturePad } from './signature-pad';
import { formatDate } from '@/lib/utils';

export function ViatgerFirma({
  estanciaId,
  viatgerId,
  signatura,
}: {
  estanciaId: string;
  viatgerId: string;
  signatura: { data: string | Date; hora: string; refusaComercial?: boolean; autoritzaComercialAltres?: boolean } | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  if (open) {
    return (
      <SignaturePad
        estanciaId={estanciaId}
        viatgerId={viatgerId}
        refusaComercialInicial={signatura?.refusaComercial ?? false}
        autoritzaComercialAltresInicial={signatura?.autoritzaComercialAltres ?? false}
        onSaved={() => {
          setOpen(false);
          router.refresh();
        }}
        onCancel={() => setOpen(false)}
      />
    );
  }

  return (
    <div className="flex items-center gap-3">
      {signatura ? (
        <>
          <Badge tone="success">
            <CheckCircle2 className="mr-1 h-3 w-3" /> Firmat {formatDate(signatura.data)} {signatura.hora}
          </Badge>
          <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
            Tornar a firmar
          </Button>
        </>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <PenLine className="h-4 w-4" /> Firmar
        </Button>
      )}
    </div>
  );
}
