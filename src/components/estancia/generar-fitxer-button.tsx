'use client';

import { useState } from 'react';
import { FileText, ShieldAlert } from 'lucide-react';
import { Button, type ButtonProps } from '@/components/ui/button';

export interface FitxerNotice {
  tone: 'info' | 'error';
  msg: string;
}

/**
 * Botó per generar el fitxer massiu de Mossos amb una confirmació prèvia.
 * IMPORTANT: NO envia res a Mossos — només GENERA i DESCARREGA el .txt oficial,
 * que després s'ha de pujar MANUALMENT al portal (registreviatgers.mossos.gencat.cat).
 * Reutilitzat al detall de l'estada i al llibre de registre.
 */
export function GenerarFitxerButton({
  estanciaId,
  label = 'Generar fitxer massiu',
  size = 'md',
  variant = 'primary',
  contracteLabel,
  onResult,
  onDone,
}: {
  estanciaId: string;
  label?: string;
  size?: ButtonProps['size'];
  variant?: ButtonProps['variant'];
  /** Etiqueta del contracte per mostrar a l'avís (p. ex. "12/2026"). */
  contracteLabel?: string;
  onResult?: (n: FitxerNotice) => void;
  onDone?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function generar() {
    setBusy(true);
    try {
      const res = await fetch(`/api/estancies/${estanciaId}/fitxer`, { method: 'POST' });
      const ct = res.headers.get('Content-Type') ?? '';
      if (!res.ok || ct.includes('application/json')) {
        const data = await res.json().catch(() => ({}));
        onResult?.({ tone: 'error', msg: data.error ?? 'No s’ha pogut generar el fitxer' });
        return;
      }
      const blob = await res.blob();
      const disp = res.headers.get('Content-Disposition') ?? '';
      const name = /filename="([^"]+)"/.exec(disp)?.[1] ?? 'fitxer.txt';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
      onResult?.({ tone: 'info', msg: `Fitxer ${name} generat. Puja’l al portal de Mossos.` });
      onDone?.();
    } catch {
      onResult?.({ tone: 'error', msg: 'Error generant el fitxer' });
    } finally {
      setBusy(false);
      setOpen(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} disabled={busy} size={size} variant={variant}>
        <FileText className="h-4 w-4" /> {busy ? 'Generant…' : label}
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-center gap-2 text-brand-800">
              <ShieldAlert className="h-5 w-5 shrink-0" />
              <h2 className="text-lg font-semibold">Generar el fitxer per a Mossos</h2>
            </div>
            <p className="text-sm text-slate-600">
              Es generarà i descarregarà el fitxer oficial (.txt) amb les dades dels viatgers
              {contracteLabel ? ` del contracte ${contracteLabel}` : ''}. Després l’hauràs de{' '}
              <strong>pujar manualment</strong> al portal de Mossos d’Esquadra
              (registreviatgers.mossos.gencat.cat); aquesta app <strong>no l’envia sola</strong>.
              Comprova que les dades són correctes abans de generar-lo.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={busy}>
                Cancel·lar
              </Button>
              <Button size="sm" onClick={generar} disabled={busy}>
                {busy ? 'Generant…' : 'Generar i descarregar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
