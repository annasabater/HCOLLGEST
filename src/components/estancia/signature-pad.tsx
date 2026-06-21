'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { postJSON, ApiError } from '@/lib/api';

/**
 * Captura de firma posterior (§ Bloque E) sobre un canvas (ratón + táctil).
 * Guarda la firma como data URL (PNG) en la estancia_viatger.
 */
export function SignaturePad({
  estanciaId,
  viatgerId,
  onSaved,
  onCancel,
}: {
  estanciaId: string;
  viatgerId: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const hasInk = useRef(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1c3052';

    const pos = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const down = (e: PointerEvent) => {
      drawing.current = true;
      hasInk.current = true;
      const { x, y } = pos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
      canvas.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!drawing.current) return;
      const { x, y } = pos(e);
      ctx.lineTo(x, y);
      ctx.stroke();
    };
    const up = () => {
      drawing.current = false;
    };
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointerleave', up);
    return () => {
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointerleave', up);
    };
  }, []);

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasInk.current = false;
  }

  async function save() {
    if (!hasInk.current) {
      setError('Cal signar abans de desar.');
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSaving(true);
    setError(null);
    try {
      const imatge = canvas.toDataURL('image/png');
      await postJSON(`/api/estancies/${estanciaId}/viatgers/${viatgerId}/firma`, { imatge });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error desant la firma');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        width={360}
        height={140}
        className="touch-none rounded-lg border border-slate-300 bg-white"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={save} disabled={saving}>
          {saving ? 'Desant…' : 'Desar firma'}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={clear}>
          Esborrar
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancel·lar
        </Button>
      </div>
    </div>
  );
}
