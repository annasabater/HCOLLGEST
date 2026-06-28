/**
 * Enviament d'emails via l'API REST de Resend (sense dependències).
 * Inactiu fins que es configura RESEND_API_KEY (com el client d'AEAT).
 */
import 'server-only';

interface Attachment {
  filename: string;
  content: string; // base64
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  attachments?: Attachment[];
}): Promise<{ ok: boolean; error?: string }> {
  // Eliminem el BOM (U+FEFF) que alguns editors/gestors afegeixen a les variables
  const stripBom = (s: string) => s.replace(/^﻿/, '').trim();
  const key = stripBom(process.env.RESEND_API_KEY ?? '');
  if (!key) return { ok: false, error: 'RESEND_API_KEY no configurat' };
  const from = stripBom(process.env.BACKUP_EMAIL_FROM || 'Hostal Coll <onboarding@resend.dev>');

  try {
    // Passem el body com a Buffer (bytes UTF-8) per evitar l'error
    // "Cannot convert to ByteString" que llança el fetch de Node.js
    // quan el JSON conté caràcters > U+00FF (em-dash, caràcters accentuats, etc.)
    const bodyBytes = Buffer.from(
      JSON.stringify({
        from,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
        attachments: opts.attachments,
      }),
      'utf-8',
    );
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: bodyBytes,
    });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      return { ok: false, error: `Resend ${res.status}: ${t.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error enviant el correu' };
  }
}
