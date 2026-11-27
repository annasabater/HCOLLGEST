/**
 * Text per defecte per enviar un pressupost per WhatsApp (pur: client i servidor).
 *
 *   Bones, Gema!
 *
 *   T'envio el pressupost per a l'estada a l'Hostal Coll del dilluns 7 de desembre
 *   al dilluns 14 de desembre (7 nits):
 *   Habitació Doble — 306,43 €
 *   *Total: 306,43 €* (IVA inclòs)
 *
 *   Qualsevol cosa, em dius. Gràcies!
 *   Anna · Hostal Coll
 *
 * Els asteriscs són la negreta de WhatsApp.
 */
import type { Lang } from '@/lib/plantilles';
import { nomPropi } from '@/lib/nom-propi';

const MESOS: Record<Lang, string[]> = {
  ca: ['gener', 'febrer', 'març', 'abril', 'maig', 'juny', 'juliol', 'agost', 'setembre', 'octubre', 'novembre', 'desembre'],
  es: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
  fr: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};
const DIES: Record<Lang, string[]> = {
  ca: ['diumenge', 'dilluns', 'dimarts', 'dimecres', 'dijous', 'divendres', 'dissabte'],
  es: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
  fr: ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
};

const TXT: Record<
  Lang,
  {
    hola: (nom: string) => string;
    env: string;
    del: (a: string, b: string, nits: number) => string;
    total: string;
    iva: string;
    fi: string;
  }
> = {
  ca: {
    hola: (n) => (n ? `Bones, ${n}!` : 'Bones!'),
    env: 'T’envio el pressupost per a l’estada a l’Hostal Coll',
    del: (a, b, n) => ` del ${a} al ${b} (${n} ${n === 1 ? 'nit' : 'nits'})`,
    total: 'Total',
    iva: 'IVA inclòs',
    fi: 'Qualsevol cosa, em dius. Gràcies!',
  },
  es: {
    hola: (n) => (n ? `¡Hola, ${n}!` : '¡Hola!'),
    env: 'Te envío el presupuesto para la estancia en el Hostal Coll',
    del: (a, b, n) => ` del ${a} al ${b} (${n} ${n === 1 ? 'noche' : 'noches'})`,
    total: 'Total',
    iva: 'IVA incluido',
    fi: 'Cualquier cosa, me dices. ¡Gracias!',
  },
  fr: {
    hola: (n) => (n ? `Bonjour ${n} !` : 'Bonjour !'),
    env: 'Voici le devis pour votre séjour à l’Hostal Coll',
    del: (a, b, n) => ` du ${a} au ${b} (${n} ${n === 1 ? 'nuit' : 'nuits'})`,
    total: 'Total',
    iva: 'TVA incluse',
    fi: 'N’hésitez pas si vous avez des questions. Merci !',
  },
  en: {
    hola: (n) => (n ? `Hi ${n}!` : 'Hi!'),
    env: 'Here is the quote for your stay at Hostal Coll',
    del: (a, b, n) => ` from ${a} to ${b} (${n} ${n === 1 ? 'night' : 'nights'})`,
    total: 'Total',
    iva: 'VAT included',
    fi: 'Any questions, just ask. Thank you!',
  },
};

const isoOk = (s: string | null | undefined): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
const utc = (iso: string) => new Date(`${iso}T12:00:00Z`);

/** «dilluns 7 de desembre», «lunes 7 de diciembre», «lundi 7 décembre», «Monday 7 December». */
export function dataAmbDia(iso: string, lang: Lang): string {
  const d = utc(iso);
  const dia = DIES[lang][d.getUTCDay()]!;
  const mes = MESOS[lang][d.getUTCMonth()]!;
  const n = d.getUTCDate();
  if (lang === 'ca') return `${dia} ${n} ${/^[aeiou]/.test(mes) ? 'd’' : 'de '}${mes}`;
  if (lang === 'es') return `${dia} ${n} de ${mes}`;
  return `${dia} ${n} ${mes}`;
}

const euro = (n: number) =>
  n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true }) + ' €';

/** Primer nom per saludar: «GEMA CORTES GARCIA» → «Gema». */
export function nomSalutacio(clientNom: string | null | undefined): string {
  const primer = (clientNom ?? '').trim().split(/\s+/)[0] ?? '';
  return primer ? nomPropi(primer) : '';
}

export interface DadesMissatgePressupost {
  idioma: Lang;
  clientNom: string | null | undefined;
  entrada: string | null | undefined; // ISO yyyy-mm-dd
  sortida: string | null | undefined;
  linies: { descripcio: string }[];
  total: number; // amb IVA
  iva: number; // import de l'IVA (0 = no es diu «IVA inclòs»)
  signatura: string; // «Anna · Hostal Coll»
}

export function missatgePressupost(d: DadesMissatgePressupost): string {
  const t = TXT[d.idioma];
  const nits = isoOk(d.entrada) && isoOk(d.sortida) ? Math.round((utc(d.sortida).getTime() - utc(d.entrada).getTime()) / 86_400_000) : 0;
  const quan = nits > 0 ? t.del(dataAmbDia(d.entrada!, d.idioma), dataAmbDia(d.sortida!, d.idioma), nits) : '';

  const conceptes = d.linies.map((l) => l.descripcio.trim()).filter(Boolean);
  const ivaTxt = d.iva > 0 ? ` (${t.iva})` : '';
  const totalTxt = `*${t.total}: ${euro(d.total)}*${ivaTxt}`;
  const cos: string[] = [];
  if (conceptes.length === 1) {
    // Una sola línia: només el tipus d'habitació (les dates ja són a la frase).
    const curt = nits > 0 ? conceptes[0]!.split(' · ')[0]! : conceptes[0]!;
    cos.push(`${curt} — *${euro(d.total)}*${ivaTxt}`);
  } else if (conceptes.length === 0) {
    cos.push(totalTxt);
  } else {
    for (const c of conceptes) cos.push(`- ${c}`);
    cos.push(totalTxt);
  }

  return [t.hola(nomSalutacio(d.clientNom)), '', `${t.env}${quan}:`, ...cos, '', t.fi, d.signatura].join('\n');
}

/**
 * Número per a wa.me (només xifres, amb prefix de país). Accepta «+34 612 345 678»,
 * «0034612345678» o «612 345 678» (sense prefix i de 9 xifres → Espanya, +34).
 * Retorna '' si no hi ha prou xifres.
 */
export function telefonWhatsApp(tel: string | null | undefined): string {
  const t = (tel ?? '').trim();
  let digits = t.replace(/\D/g, '');
  if (!t.startsWith('+') && digits.startsWith('00')) digits = digits.slice(2);
  else if (!t.startsWith('+') && digits.length === 9) digits = `34${digits}`;
  return digits.length >= 8 ? digits : '';
}
