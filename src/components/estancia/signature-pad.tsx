'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { postJSON, ApiError } from '@/lib/api';

/**
 * Captura de firma posterior (§ Bloque E) sobre un canvas (ratón + táctil), o bé
 * PUJANT UNA FOTO de la firma feta en paper (càmera o galeria): la foto es
 * processa per treure el fons (deixa només el traç) i es desa igual que la
 * dibuixada. Guarda la firma com a data URL (PNG) a la estancia_viatger.
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
  const fileRef = useRef<HTMLInputElement>(null);
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

  // Carrega una FOTO de la firma (paper) i n'extreu el traç: dibuixa la foto
  // ajustada al llenç, treu el fons clar (el deixa transparent) i pinta el traç
  // fosc amb el color de tinta. Així queda com una firma neta a la fitxa.
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // permet tornar a triar la mateixa foto
    if (!file) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Ajusta la foto dins del llenç (contain), centrada.
      const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
      // Fons clar → transparent; traç fosc → tinta. Rampa suau entre lo i hi.
      const lo = 0.35;
      const hi = 0.72;
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const px = data.data;
      for (let i = 0; i < px.length; i += 4) {
        const lum = (0.299 * px[i]! + 0.587 * px[i + 1]! + 0.114 * px[i + 2]!) / 255;
        let alpha: number;
        if (lum <= lo) alpha = 255;
        else if (lum >= hi) alpha = 0;
        else alpha = Math.round((1 - (lum - lo) / (hi - lo)) * 255);
        px[i] = 28;
        px[i + 1] = 48;
        px[i + 2] = 82; // #1c3052 (mateixa tinta que el traç dibuixat)
        px[i + 3] = alpha;
      }
      ctx.putImageData(data, 0, 0);
      hasInk.current = true;
      setError(null);
    };
    img.onerror = () => setError("No s'ha pogut llegir la imatge.");
    img.src = URL.createObjectURL(file);
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
      <p className="text-xs text-slate-400">Firma aquí, o puja una foto de la firma feta en paper.</p>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={save} disabled={saving}>
          {saving ? 'Desant…' : 'Desar firma'}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
          <Camera className="h-4 w-4" /> Pujar foto
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
