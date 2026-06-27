'use client';

import { useEffect, useRef } from 'react';
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
}

export function ConfirmDialog({
  open,
  title = 'Confirmar acció',
  message,
  confirmLabel = 'Eliminar',
  onConfirm,
  onCancel,
  danger = true,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

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

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      className="m-auto w-full max-w-sm rounded-2xl border-0 p-0 shadow-2xl backdrop:bg-slate-900/50"
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
          <button onClick={onCancel} className="shrink-0 text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Cancel·lar
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onConfirm}
            className={danger ? 'bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700' : ''}
          >
            {danger && <Trash2 className="h-4 w-4" />}
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
