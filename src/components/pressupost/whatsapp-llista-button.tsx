'use client';

import Link from 'next/link';
import { useState } from 'react';
import { MessageCircle, Check } from 'lucide-react';
import { postJSON } from '@/lib/api';
import { enviaWhatsApp } from '@/lib/plantilles';

/**
 * Botó de la llista de pressupostos: amb telèfon, obre el WhatsApp amb el text per
 * defecte (abans en mostra el text per confirmar-lo). Sense telèfon, porta al
 * pressupost per posar-l'hi.
 */
export function WhatsappLlistaButton({
  id,
  telefon,
  text,
  client,
  enviat,
}: {
  id: string;
  telefon: string; // ja normalitzat per a wa.me ('' = no n'hi ha)
  text: string;
  client: string;
  enviat: boolean;
}) {
  const [fet, setFet] = useState(enviat);
  if (!telefon) {
    return (
      <Link href={`/pressupostos/${id}#whatsapp`} className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-brand-700 hover:underline">
        <MessageCircle className="h-4 w-4" /> Posa-hi telèfon
      </Link>
    );
  }
  return (
    <button
      type="button"
      title={fet ? 'Ja s’ha enviat per WhatsApp. Torna a enviar-lo' : `Enviar per WhatsApp a +${telefon}`}
      onClick={() => {
        if (!enviaWhatsApp(telefon, text, client || `+${telefon}`)) return;
        setFet(true);
        postJSON(`/api/pressupostos/${id}/whatsapp`, {}).catch(() => {});
      }}
      className="inline-flex items-center gap-1.5 rounded-md border border-brand-200 px-2.5 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50"
    >
      {fet ? <Check className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
      {fet ? 'Enviat' : 'Enviar'}
    </button>
  );
}
