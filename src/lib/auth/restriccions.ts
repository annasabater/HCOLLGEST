/**
 * Comptes amb "vista restringida de propietat".
 *
 * Aquests comptes entren com un ADMIN (veuen tots els mòduls, sense perdre cap
 * accés), però amb dues limitacions de DADES, no de navegació:
 *   1. Ingressos: s'exclou el mètode de cobrament ALTRES de totes les xifres
 *      d'ingressos (tauler i balanç mes/any/PDF).
 *   2. Llibre de registre: s'oculten les estades marcades amb "ZP11" al camp de
 *      text lliure d'observacions (el camp "altres" de l'estada).
 *
 * Es modela per email (no com un rol nou) precisament perquè ha de conservar
 * TOT l'accés d'ADMIN: així no cal replicar el rol a cada guard/middleware/menú
 * (i no hi ha risc de deixar-lo sense accés per oblidar-ne un). Per afegir-ne
 * més comptes, amplia el conjunt.
 */

/** Emails (en minúscules) amb vista restringida de propietat. */
export const COMPTES_VISTA_RESTRINGIDA = new Set<string>(['hcoll@gmail.com']);

/**
 * Marca que, dins del camp d'observacions d'una estada, l'oculta del llibre de
 * registre per als comptes amb vista restringida. Comparació no sensible a
 * majúscules/minúscules.
 */
export const MARCA_OCULTA_LLIBRE = 'ZP11';

/** Cert si l'usuari té vista restringida de propietat. */
export function teVistaRestringida(user: { email?: string | null } | null | undefined): boolean {
  const email = user?.email?.toLowerCase();
  return !!email && COMPTES_VISTA_RESTRINGIDA.has(email);
}

/**
 * Cert si l'usuari és un compte de NOMÉS LECTURA: ho veu tot (entra com a ADMIN)
 * però no pot crear, editar ni esborrar res. L'enforcement dur és al middleware,
 * que bloqueja qualsevol mètode HTTP mutador (POST/PUT/PATCH/DELETE). Avui
 * coincideix amb els comptes de vista restringida de propietat.
 */
export function esNomesLectura(user: { email?: string | null } | null | undefined): boolean {
  return teVistaRestringida(user);
}

/** Cert si una estada s'ha d'ocultar del llibre per contenir la marca a observacions. */
export function ocultaDelLlibre(observacions: string | null | undefined): boolean {
  return !!observacions && observacions.toUpperCase().includes(MARCA_OCULTA_LLIBRE);
}
