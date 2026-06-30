/**
 * Plantilles de missatges (WhatsApp) i generació d'enllaços wa.me.
 * Multiidioma (català, castellà, francès, anglès). Pur i reutilitzable al client.
 * No envia res automàticament: genera el text i l'enllaç wa.me perquè la persona
 * confirmi l'enviament a WhatsApp des del seu telèfon.
 */

export type Lang = 'ca' | 'es' | 'fr' | 'en';

export const LANGS: { code: Lang; label: string }[] = [
  { code: 'ca', label: 'Català' },
  { code: 'es', label: 'Castellà' },
  { code: 'fr', label: 'Francès' },
  { code: 'en', label: 'Anglès' },
];

/** Plantilla per a l'hoste (variables {nom} {hora} {habitacio}). */
export const PLANTILLA_HOSTE: Record<Lang, string> = {
  ca: 'Bon dia {nom}, demà cap a les {hora} vindrem a netejar l’habitació {habitacio}. Gràcies!',
  es: 'Buenos días {nom}, mañana sobre las {hora} vendremos a limpiar la habitación {habitacio}. ¡Gracias!',
  fr: 'Bonjour {nom}, demain vers {hora} nous viendrons nettoyer la chambre {habitacio}. Merci !',
  en: 'Hello {nom}, tomorrow around {hora} we will come to clean room {habitacio}. Thank you!',
};

/**
 * Plantilla de benvinguda + valoració (variables {nom} {enllac}).
 * S'envia després de la primera nit; conté l'enllaç a la pàgina de benvinguda
 * (guia de Calella + valoració per WhatsApp).
 */
export const PLANTILLA_BENVINGUDA: Record<Lang, string> = {
  ca: 'Hola {nom}! 😊 Esperem que la primera nit a l’Hostal Coll hagi anat molt bé. Aquí tens una petita guia de benvinguda (què fer a Calella, info útil…) i, si vols, ens pots deixar la teva valoració: {enllac}',
  es: '¡Hola {nom}! 😊 Esperamos que la primera noche en Hostal Coll haya ido muy bien. Aquí tienes una pequeña guía de bienvenida (qué hacer en Calella, info útil…) y, si quieres, puedes dejarnos tu valoración: {enllac}',
  fr: 'Bonjour {nom} ! 😊 Nous espérons que votre première nuit à l’Hostal Coll s’est bien passée. Voici un petit guide de bienvenue (que faire à Calella, infos utiles…) et, si vous le souhaitez, laissez-nous votre avis : {enllac}',
  en: 'Hi {nom}! 😊 We hope your first night at Hostal Coll went well. Here’s a little welcome guide (what to do in Calella, useful info…) and, if you like, you can leave us your review: {enllac}',
};

/**
 * Plantilla de gràcies + valoració per WhatsApp (variables {nom} {enllac}).
 * S'envia després de la sortida; agraeix l'estada i conté l'enllaç a la ressenya.
 */
export const PLANTILLA_GRACIES: Record<Lang, string> = {
  ca: 'Hola {nom}! 😊 Moltes gràcies per allotjar-te a l’Hostal Coll, ha estat un plaer tenir-te. Si vols, ens ajudaria molt que ens deixessis la teva valoració a Google: {enllac}',
  es: '¡Hola {nom}! 😊 Muchas gracias por alojarte en el Hostal Coll, ha sido un placer tenerte. Si quieres, nos ayudaría mucho que nos dejaras tu valoración en Google: {enllac}',
  fr: 'Bonjour {nom} ! 😊 Merci beaucoup d’avoir séjourné à l’Hostal Coll, ce fut un plaisir de vous accueillir. Si vous le souhaitez, votre avis sur Google nous aiderait beaucoup : {enllac}',
  en: 'Hi {nom}! 😊 Thank you so much for staying at Hostal Coll, it was a pleasure having you. If you’d like, leaving us a Google review would help us a lot: {enllac}',
};

/** Plantilla per a la neteja (variables {nom} {data} {habitacions} {pasillo} {pati} {vorera} {hora}). */
export const PLANTILLA_NETEJA: Record<Lang, string> = {
  ca: 'Hola {nom}! 😊 Per a demà ({data}) tindríem: {habitacions}.{pasillo}{pati}{vorera}{hora} Moltíssimes gràcies per la teva feina! 🙏',
  es: '¡Hola {nom}! 😊 Para mañana ({data}) tendríamos: {habitacions}.{pasillo}{pati}{vorera}{hora} ¡Muchísimas gracias por tu trabajo! 🙏',
  fr: 'Bonjour {nom} ! 😊 Pour demain ({data}) il y aurait : {habitacions}.{pasillo}{pati}{vorera}{hora} Merci beaucoup pour ton travail ! 🙏',
  en: 'Hi {nom}! 😊 For tomorrow ({data}) we’d have: {habitacions}.{pasillo}{pati}{vorera}{hora} Thank you so much for your work! 🙏',
};

/** Text del passadís segons idioma (valor de la variable {pasillo}). */
export const PASILLO_TXT: Record<Lang, string> = {
  ca: ' També el passadís.',
  es: ' También el pasillo.',
  fr: ' Aussi le couloir.',
  en: ' Also the hallway.',
};

/** Text del pati segons idioma (valor de la variable {pati}). */
export const PATI_TXT: Record<Lang, string> = {
  ca: ' També el pati.',
  es: ' También el patio.',
  fr: ' Aussi la cour.',
  en: ' Also the patio.',
};

/** Text de la vorera (acera) segons idioma (valor de la variable {vorera}). */
export const VORERA_TXT: Record<Lang, string> = {
  ca: ' També la vorera.',
  es: ' También la acera.',
  fr: ' Aussi le trottoir.',
  en: ' Also the sidewalk.',
};

/**
 * Frase de l'hora aproximada a la qual ha d'anar (valor de la variable {hora}).
 * Conté el seu propi {hora} que es resol amb l'hora triada abans d'inserir-la.
 */
export const HORA_NETEJA_TXT: Record<Lang, string> = {
  ca: ' Pots venir cap a les {hora}.',
  es: ' Puedes venir sobre las {hora}.',
  fr: ' Tu peux venir vers {hora}.',
  en: ' You can come around {hora}.',
};

/** Substitueix {clau} pel valor corresponent (les claus absents queden buides). */
export function fillTemplate(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? '');
}

/** Enllaç wa.me: obre WhatsApp amb el text preescrit (i el número si n'hi ha). */
export function waLink(phone: string | null | undefined, text: string): string {
  const digits = (phone ?? '').replace(/\D/g, '');
  const base = digits ? `https://wa.me/${digits}` : 'https://wa.me/';
  return `${base}?text=${encodeURIComponent(text)}`;
}

/**
 * Obre WhatsApp DEMANANT confirmació abans (evita enviaments per error).
 * Retorna true si s'ha confirmat. S'executa dins del clic (no el bloqueja el
 * navegador). `qui` és el nom del destinatari per al missatge de confirmació.
 */
export function enviaWhatsApp(phone: string | null | undefined, text: string, qui?: string): boolean {
  if (typeof window === 'undefined') return false;
  const capcalera = qui
    ? `Enviar aquest WhatsApp a ${qui}?`
    : 'Enviar aquest WhatsApp?';
  // Mostra el missatge sencer a la confirmació perquè el puguis revisar abans
  // d'obrir WhatsApp. Si confirmes, s'obre WhatsApp amb el text ja escrit.
  if (!window.confirm(`${capcalera}\n\n${text}`)) return false;
  window.open(waLink(phone, text), '_blank', 'noopener,noreferrer');
  return true;
}

// Vocabulari de neteja per idioma. "salida" = neteja a fons (microones, nevera…),
// "repas" = repàs lleuger. La distinció importa perquè la tarifa pot variar.
const NETEJA_TXT: Record<
  Lang,
  { first: string; rest: string; salida: string; repas: string; none: string; sep: string; zones: string }
> = {
  ca: { first: "l’habitació", rest: "la", salida: "sortida (a fons)", repas: "repàs", none: "cap habitació assignada", sep: ": ", zones: "les zones comunes (passadís, vorera i pati)" },
  es: { first: "la habitación", rest: "la", salida: "salida (a fondo)", repas: "repaso", none: "no hay habitaciones asignadas", sep: ": ", zones: "las zonas comunes (pasillo, acera y patio)" },
  fr: { first: "la chambre", rest: "la", salida: "départ (à fond)", repas: "rafraîchissement", none: "aucune chambre assignée", sep: " : ", zones: "les parties communes (couloir, trottoir et cour)" },
  en: { first: "room", rest: "room", salida: "checkout (deep clean)", repas: "touch-up", none: "no rooms assigned", sep: ": ", zones: "common areas (hallway, sidewalk and patio)" },
};

/** Etiqueta curta del tipus de neteja (per a selectors). */
export function tipusNetejaLabel(tipus: 'CANVI_COMPLET' | 'REPAS', lang: Lang): string {
  const t = NETEJA_TXT[lang];
  return tipus === 'CANVI_COMPLET' ? t.salida : t.repas;
}

/**
 * Descriu les tasques de neteja d'un dia en l'idioma indicat, p. ex. (ES):
 * "la habitación 1: salida (a fondo), la 2: repaso".
 */
export function descriuTasques(
  tasques: { habitacio: string | null; tipus: 'CANVI_COMPLET' | 'REPAS'; notes?: string | null }[],
  lang: Lang = 'es',
): string {
  const t = NETEJA_TXT[lang];
  if (tasques.length === 0) return t.none;
  return tasques
    .map((x, i) => {
      const tip = x.tipus === 'CANVI_COMPLET' ? t.salida : t.repas;
      const nota = x.notes && x.notes.trim() ? ` (${x.notes.trim()})` : '';
      if (x.habitacio === null) {
        // Zones comunes: només "les zones comunes" (sense tipus)
        return `${t.zones}${nota}`;
      }
      const prefix = i === 0 ? t.first : t.rest;
      return `${prefix} ${x.habitacio}${t.sep}${tip}${nota}`;
    })
    .join(', ');
}
