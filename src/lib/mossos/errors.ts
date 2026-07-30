/**
 * Formatació dels errors de rebuig de Mossos — funcions PURES (sense navegador
 * ni credencials), reutilitzables tant al connector com al mostrar-los a la UI.
 *
 * Objectiu: en comptes de la instrucció llarga del portal, dir QUIN camp falla
 * i quin format s'espera. També neteja missatges antics ja desats a la BD.
 */

// Tradueix la instrucció llarga de Mossos al CAMP concret que falla + què s'espera.
export function resumErrorMossos(text: string): string {
  const s = text.toLowerCase();
  if (/n[úu]mero de suport|num[_ ]?suport/.test(s))
    return 'número de suport incorrecte (DNI/NIF: 3 lletres + 6 dígits; NIE: «E» + 8 dígits).';
  if (/segon cognom|cognom2|segundo apellido/.test(s))
    return 'falta el segon cognom (obligatori amb DNI/NIF).';
  if (/n[úu]mero de document|num[_ ]?document|documento/.test(s))
    return 'número de document incorrecte o buit.';
  if (/parentesc|parentesco/.test(s)) return 'falta el parentesc (obligatori si és menor).';
  if (/data.*naixement|fecha.*nacimiento|data d.expedici[óo]|expedici[óo]n/.test(s))
    return 'data incorrecta (naixement/expedició) o posterior a avui.';
  if (/municipi|municipio|prov[íi]ncia|provincia|\bine\b|localitat|localidad/.test(s))
    return 'codi de municipi/província (INE) o localitat incorrecte.';
  if (/nacionalitat|nacionalidad|pa[íi]s\b/.test(s)) return 'nacionalitat/país incorrecte (codi ISO).';
  // Si no el reconeixem, deixem la primera frase (curta).
  const first = (text.split(/\.\s/)[0] ?? text).trim();
  return first.length > 140 ? `${first.slice(0, 140)}…` : first || 'dades incorrectes.';
}

export function extreuErrorsMossos(raw: string): string | null {
  const t = (raw ?? '').replace(/\s+/g, ' ');

  // 1) Talla a partir del resum de validació ("...errors següents:").
  const m = t.match(/errors?\s+seg[üu]ents:?/i);
  let seg = m ? t.slice(m.index! + m[0].length) : null;

  // 2) Si no hi ha aquest text, busca directament la primera "Línia N:".
  if (!seg) {
    const l = t.search(/L[íi]nia\s*\d+\s*:/i);
    if (l >= 0) seg = t.slice(l);
  }
  if (!seg) return null;

  // 3) Treu l'eco del registre (la línia amb molts "|", p. ex. "2|PAR726094|…").
  const echo = seg.search(/\d+\s*\|/);
  if (echo > 0) seg = seg.slice(0, echo);

  // 4) Cada error ("Línia N:") a la seva pròpia línia, amb pic.
  seg = seg
    .replace(/L[íi]nia\s*(\d+)\s*:/gi, '\n• Línia $1: ')
    .replace(/\s+/g, ' ')
    .replace(/ \n/g, '\n')
    .replace(/\n /g, '\n')
    .trim();

  // Resumeix cada error al camp + format esperat (no la instrucció completa).
  const linies = seg
    .split('\n')
    .filter(Boolean)
    .map((l) => {
      const m2 = l.match(/^•\s*L[íi]nia\s*\d+\s*:\s*(.*)$/i);
      return m2 ? `• ${resumErrorMossos(m2[1] ?? '')}` : l;
    });
  return linies.join('\n') || null;
}

/**
 * Deixa un missatge de rebuig llest per mostrar. Serveix tant per als nous com
 * per als ja desats a la BD (versions antigues i verboses): treu la línia de
 * "Gravació de la sessió" i, si encara conté "Línia N:", el torna a resumir.
 * Idempotent: si ja està resumit, el deixa igual.
 */
export function formataRebuigMossos(msg: string | null | undefined): string {
  if (!msg) return '';
  // Treu la línia de gravació (depuració) i preàmbuls redundants.
  let t = msg
    .replace(/\(?\s*Gravaci[óo] de la sessi[óo][^)]*\)?/gi, '')
    .replace(/Corregeix\s+aix[òo][^\n:]*:?/gi, '')
    .trim();
  // Si encara té la instrucció llarga ("Línia N:"), torna-la a resumir.
  if (/L[íi]nia\s*\d+\s*:/i.test(t)) {
    const errs = extreuErrorsMossos(t);
    t = errs ? `Mossos ha rebutjat el fitxer:\n${errs}` : t;
  }
  return t.trim();
}
