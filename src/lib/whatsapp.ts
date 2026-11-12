/**
 * Enviar un WhatsApp a UN MATEIX amb CallMeBot (https://www.callmebot.com/blog/free-api-whatsapp-messages/).
 * Gratuït, però només serveix per enviar-se missatges al propi número: la persona
 * l'activa des del mòbil i CallMeBot li dona una clau (apikey). La clau es desa
 * xifrada a l'establiment i MAI es registra als logs.
 */
import 'server-only';

/** Número en format internacional sense «+» ni espais; els de 9 xifres es prenen com a espanyols. */
export function normalitzaTelefon(tel: string): string | null {
  let d = tel.replace(/[^\d+]/g, '');
  if (d.startsWith('+')) d = d.slice(1);
  else if (d.startsWith('00')) d = d.slice(2);
  else if (d.length === 9) d = `34${d}`;
  return /^\d{10,15}$/.test(d) ? d : null;
}

/** Envia el text. Llança un Error amb un missatge entenedor (sense la clau) si falla. */
export async function enviaWhatsapp(telefon: string, apikey: string, text: string): Promise<void> {
  const tel = normalitzaTelefon(telefon);
  if (!tel) throw new Error('El número de WhatsApp no és vàlid.');
  const url =
    `https://api.callmebot.com/whatsapp.php?phone=%2B${tel}` +
    `&text=${encodeURIComponent(text.slice(0, 3500))}&apikey=${encodeURIComponent(apikey)}`;

  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(20_000), cache: 'no-store' });
  } catch {
    throw new Error('No s’ha pogut contactar amb CallMeBot (WhatsApp).');
  }
  const body = (await res.text())
    .split(apikey).join('***') // mai la clau en un missatge d'error
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!res.ok || (/invalid|error/i.test(body) && !/queued|sent/i.test(body))) {
    throw new Error(
      /apikey/i.test(body)
        ? 'CallMeBot diu que la clau (apikey) no és vàlida per a aquest número.'
        : `CallMeBot no l’ha enviat (${res.status}). ${body.slice(0, 160)}`,
    );
  }
}
