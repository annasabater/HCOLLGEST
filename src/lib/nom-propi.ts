/**
 * Nom per mostrar: si arriba tot en majúscules (com surt del DNI o del registre),
 * es passa a «Adnan Besic». Si ja té minúscules, es deixa tal qual (respecta «McKay»,
 * «de la Fuente»…). Només per mostrar: les dades desades no es toquen.
 */
export function nomPropi(nom: string): string {
  if (!/\p{L}/u.test(nom) || nom !== nom.toLocaleUpperCase('ca')) return nom;
  return nom
    .toLocaleLowerCase('ca')
    .replace(/(^|[\s\-'’])(\p{L})/gu, (_, sep: string, l: string) => sep + l.toLocaleUpperCase('ca'));
}
