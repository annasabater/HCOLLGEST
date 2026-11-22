'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';

/**
 * El número de WhatsApp des d'on s'envien els missatges de Plantilles (abans era
 * a Plantilles). Es desa en aquest navegador (`localStorage`, clau `meu_whatsapp`).
 */
export function MeuWhatsappConfig() {
  const [num, setNum] = useState('687 558 248');
  useEffect(() => {
    try {
      setNum(window.localStorage.getItem('meu_whatsapp') ?? '687 558 248');
    } catch { /* localStorage no disponible */ }
  }, []);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Input
        aria-label="El meu WhatsApp"
        className="max-w-44"
        value={num}
        onChange={(e) => {
          setNum(e.target.value);
          try { window.localStorage.setItem('meu_whatsapp', e.target.value); } catch { /* ignora */ }
        }}
      />
      <span className="text-xs text-slate-500">
        Els missatges de Plantilles s’obren al WhatsApp d’aquest telèfon i els envies tu manualment. Es desa en aquest navegador.
      </span>
    </div>
  );
}
