'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { Button } from './button';

interface Props {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
  /** Contingut opcional sota el missatge (avisos, caselles de confirmació…). */
  extra?: ReactNode;
}

export function ConfirmDialog({
  open,
  title = 'Confirmar acció',
  message,
  confirmLabel = 'Eliminar',
  onConfirm,
  onCancel,
  danger = true,
  extra,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  // El diàleg es porta al <body> amb un portal: així no l'afecten els estils
  // del contenidor que l'obre (p. ex. el menú "⋯ Més", que uniformitza tots
  // els seus botons a w-full i els deixaria fora de la vista).
  const [muntat, setMuntat] = useState(false);
  useEffect(() => setMuntat(true), []);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open) {
      if (!el.open) el.showModal();
    } else {
      if (el.open) el.close();
    }
  }, [open]);

  // Tancar amb Escape
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const handleClose = () => onCancel();
    el.addEventListener('cancel', handleClose);
    return () => el.removeEventListener('cancel', handleClose);
  }, [onCancel]);

  if (!open || !muntat) return null;

  return createPortal(
    <dialog
      ref={dialogRef}
      className="m-auto box-border w-[calc(100vw-2rem)] max-w-sm rounded-2xl border-0 p-0 shadow-2xl backdrop:bg-slate-900/50"
      onClick={(e) => { if (e.target === dialogRef.current) onCancel(); }}
    >
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${danger ? 'bg-red-100' : 'bg-amber-100'}`}>
            <AlertTriangle className={`h-5 w-5 ${danger ? 'text-red-600' : 'text-amber-600'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-slate-900">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">{message}</p>
          </div>
          <button onClick={onCancel} aria-label="Tancar" className="h-6 w-6 shrink-0 text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        {extra}

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" size="sm" className="w-auto" onClick={onCancel}>
            Cancel·lar
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onConfirm}
            className={`w-auto ${danger ? 'bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700' : ''}`}
          >
            {danger && <Trash2 className="h-4 w-4" />}
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>,
    document.body,
  );
}
