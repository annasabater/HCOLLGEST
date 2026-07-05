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

/**
 * Plantilla per a la neteja (variables {nom} {data} {habitacions} {zones} {hora};
 * per compatibilitat amb plantilles desades antigues també {pasillo} {pati} {vorera}).
 * Format multilínia: habitacions agrupades per tipus + zones comunes en una frase.
 */
export const PLANTILLA_NETEJA: Record<Lang, string> = {
  ca: 'Hola {nom}! 😊 Per a demà ({data}) tindríem:\n{habitacions}\n{zones}{hora}\nMoltíssimes gràcies!',
  es: '¡Hola {nom}! 😊 Para mañana ({data}) tendríamos:\n{habitacions}\n{zones}{hora}\n¡Muchísimas gracias!',
  fr: 'Bonjour {nom} ! 😊 Pour demain ({data}) il y aurait :\n{habitacions}\n{zones}{hora}\nMerci beaucoup !',
  en: 'Hi {nom}! 😊 For tomorrow ({data}) we’d have:\n{habitacions}\n{zones}{hora}\nThank you so much!',
};

/** Neteja un missatge multilínia: treu espais sobrants i línies buides. */
export function netejaLinies(text: string): string {
  return text
    .split('\n')
    .map((l) => l.trim().replace(/\s+/g, ' '))
    .filter(Boolean)
    .join('\n');
}

/**
 * Frase de les zones comunes combinades ("También el pasillo, el patio y la acera.").
 * Retorna '' si no n'hi ha cap de seleccionada.
 */
export function zonesComunesTxt(
  lang: Lang,
  opts: { pasillo?: boolean; pati?: boolean; vorera?: boolean },
): string {
  const NOMS: Record<Lang, { pasillo: string; pati: string; vorera: string; prefix: string; i: string }> = {
    ca: { pasillo: 'el passadís', pati: 'el pati', vorera: 'la vorera', prefix: 'També ', i: ' i ' },
    es: { pasillo: 'el pasillo', pati: 'el patio', vorera: 'la acera', prefix: 'También ', i: ' y ' },
    fr: { pasillo: 'le couloir', pati: 'la cour', vorera: 'le trottoir', prefix: 'Aussi ', i: ' et ' },
    en: { pasillo: 'the hallway', pati: 'the patio', vorera: 'the sidewalk', prefix: 'Also ', i: ' and ' },
  };
  const t = NOMS[lang];
  const parts = [opts.pasillo ? t.pasillo : null, opts.pati ? t.pati : null, opts.vorera ? t.vorera : null]
    .filter((x): x is string => x != null);
  if (parts.length === 0) return '';
  const llista = parts.length === 1 ? parts[0]! : `${parts.slice(0, -1).join(', ')}${t.i}${parts[parts.length - 1]}`;
  return `${t.prefix}${llista}.`;
}

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
// "mantenimiento" = repàs/manteniment lleuger. La distinció importa per la tarifa.
const NETEJA_TXT: Record<
  Lang,
  { sing: string; plur: string; art: string; i: string; salida: string; repas: string; none: string; sep: string; zones: string }
> = {
  ca: { sing: "l’habitació", plur: "les habitacions", art: "la ", i: " i ", salida: "sortida", repas: "manteniment", none: "cap habitació assignada", sep: ": ", zones: "les zones comunes (passadís, vorera i pati)" },
  es: { sing: "la habitación", plur: "las habitaciones", art: "la ", i: " y ", salida: "salida", repas: "mantenimiento", none: "no hay habitaciones asignadas", sep: ": ", zones: "las zonas comunes (pasillo, acera y patio)" },
  fr: { sing: "la chambre", plur: "les chambres", art: "la ", i: " et ", salida: "départ", repas: "entretien", none: "aucune chambre assignée", sep: " : ", zones: "les parties communes (couloir, trottoir et cour)" },
  en: { sing: "room", plur: "rooms", art: "", i: " and ", salida: "checkout", repas: "maintenance", none: "no rooms assigned", sep: ": ", zones: "common areas (hallway, sidewalk and patio)" },
};

/** Etiqueta curta del tipus de neteja (per a selectors). */
export function tipusNetejaLabel(tipus: 'CANVI_COMPLET' | 'REPAS', lang: Lang): string {
  const t = NETEJA_TXT[lang];
  return tipus === 'CANVI_COMPLET' ? t.salida : t.repas;
}

/**
 * Descriu les tasques de neteja AGRUPADES per tipus, una línia per grup. P. ex. (ES):
 *   "las habitaciones Nº1 y la Nº4: mantenimiento
 *    la habitación Nº5: salida"
 */
export function descriuTasques(
  tasques: { habitacio: string | null; tipus: 'CANVI_COMPLET' | 'REPAS'; notes?: string | null }[],
  lang: Lang = 'es',
): string {
  const t = NETEJA_TXT[lang];
  if (tasques.length === 0) return t.none;

  const linies: string[] = [];
  // Grups per tipus, en l'ordre en què apareixen (habitacions amb nom).
  const grups = new Map<'CANVI_COMPLET' | 'REPAS', string[]>();
  for (const x of tasques) {
    if (x.habitacio === null) continue;
    const nota = x.notes && x.notes.trim() ? ` (${x.notes.trim()})` : '';
    const cur = grups.get(x.tipus) ?? [];
    cur.push(`Nº${x.habitacio}${nota}`);
    grups.set(x.tipus, cur);
  }
  for (const [tipus, habs] of grups) {
    const tip = tipus === 'CANVI_COMPLET' ? t.salida : t.repas;
    if (habs.length === 1) {
      linies.push(`${t.sing} ${habs[0]}${t.sep}${tip}`);
    } else {
      // "las habitaciones Nº1, la Nº2 y la Nº4: mantenimiento"
      const llista =
        habs.length === 2
          ? `${habs[0]}${t.i}${t.art}${habs[1]}`
          : `${habs.slice(0, -1).map((h, i) => (i === 0 ? h : `${t.art}${h}`)).join(', ')}${t.i}${t.art}${habs[habs.length - 1]}`;
      linies.push(`${t.plur} ${llista}${t.sep}${tip}`);
    }
  }
  // Zones comunes (tasques sense habitació), cadascuna a la seva línia.
  for (const x of tasques) {
    if (x.habitacio !== null) continue;
    const nota = x.notes && x.notes.trim() ? ` (${x.notes.trim()})` : '';
    linies.push(`${t.zones}${nota}`);
  }
  return linies.join('\n');
}
