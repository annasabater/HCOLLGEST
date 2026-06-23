'use client';

import { useState } from 'react';
import { FileText, AlertTriangle, ShieldAlert } from 'lucide-react';
import { Button, type ButtonProps } from '@/components/ui/button';

export interface FitxerNotice {
  tone: 'info' | 'error';
  msg: string;
}

/**
 * Botó per generar el fitxer massiu de Mossos amb DOBLE confirmació: comunicar
 * dades personals a la policia és una acció oficial i definitiva, així que cal
 * verificar-la dues vegades (avís + confirmació final) abans de generar-la.
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
  const [step, setStep] = useState<0 | 1 | 2>(0); // 0 tancat · 1 avís · 2 confirmació final
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
      setStep(0);
    }
  }

  return (
    <>
      <Button onClick={() => setStep(1)} disabled={busy} size={size} variant={variant}>
        <FileText className="h-4 w-4" /> {busy ? 'Generant…' : label}
      </Button>

      {step !== 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            {step === 1 ? (
              <>
                <div className="mb-3 flex items-center gap-2 text-brand-800">
                  <ShieldAlert className="h-5 w-5 shrink-0" />
                  <h2 className="text-lg font-semibold">Comunicar a Mossos d’Esquadra</h2>
                </div>
                <p className="text-sm text-slate-600">
                  Generaràs el fitxer oficial amb les dades dels viatgers
                  {contracteLabel ? ` del contracte ${contracteLabel}` : ''} per comunicar-les a
                  Mossos d’Esquadra. Comprova que les dades són correctes abans de continuar.
                </p>
                <div className="mt-5 flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setStep(0)}>
                    Cancel·lar
                  </Button>
                  <Button size="sm" onClick={() => setStep(2)}>
                    Continuar
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="mb-3 flex items-center gap-2 text-red-700">
                  <AlertTriangle className="h-5 w-5 shrink-0" />
                  <h2 className="text-lg font-semibold">Confirmació final</h2>
                </div>
                <p className="text-sm text-slate-600">
                  Aquesta acció és <strong>definitiva</strong>: prepara la comunicació de dades
                  personals a la policia. Segur que vols generar i enviar el fitxer a Mossos
                  d’Esquadra?
                </p>
                <div className="mt-5 flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setStep(1)} disabled={busy}>
                    Enrere
                  </Button>
                  <Button variant="danger" size="sm" onClick={generar} disabled={busy}>
                    {busy ? 'Generant…' : 'Sí, enviar a Mossos'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
