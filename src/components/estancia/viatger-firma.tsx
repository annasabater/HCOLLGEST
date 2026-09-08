'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { PenLine, CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SignaturePad } from './signature-pad';
import { formatDate } from '@/lib/utils';

interface Firma {
  data: string | Date;
  hora: string;
  /** Data URL (PNG en base64) tal com la desa el canvas de firma. */
  imatge?: string | null;
  llocSignatura?: string | null;
  refusaComercial?: boolean;
  autoritzaComercialAltres?: boolean;
}

export function ViatgerFirma({
  estanciaId,
  viatgerId,
  signatura,
}: {
  estanciaId: string;
  viatgerId: string;
  signatura: Firma | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [muntat, setMuntat] = useState(false);
  useEffect(() => setMuntat(true), []);

  // Tancar l'ampliació amb Escape.
  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setZoom(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [zoom]);

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

  const quan = signatura ? `${formatDate(signatura.data)} ${signatura.hora}` : '';

  return (
    <div className="flex flex-wrap items-center gap-3">
      {signatura ? (
        <>
          {signatura.imatge && (
            <button
              type="button"
              onClick={() => setZoom(true)}
              title="Veure la firma en gran"
              className="rounded-md border border-slate-200 bg-white p-1 hover:border-brand-300"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={signatura.imatge} alt={`Firma del ${quan}`} className="h-10 w-auto" />
            </button>
          )}
          <Badge tone="success">
            <CheckCircle2 className="mr-1 h-3 w-3" /> Firmat {quan}
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

      {/* Ampliació de la firma. Va al <body> amb un portal per no dependre del
          contenidor (targetes amb overflow, menús que uniformitzen els botons…). */}
      {zoom && muntat && signatura?.imatge && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Firma"
          onClick={() => setZoom(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-slate-900">Firma</h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  Firmat {quan}
                  {signatura.llocSignatura ? ` · ${signatura.llocSignatura}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setZoom(false)}
                aria-label="Tancar"
                className="h-6 w-6 shrink-0 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={signatura.imatge}
              alt={`Firma del ${quan}`}
              className="w-full rounded-lg border border-slate-200 bg-white"
            />
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
