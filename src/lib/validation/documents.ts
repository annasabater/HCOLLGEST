/**
 * Validació de FORMAT de documents (DNI/NIE) i altres camps. Són avisos
 * "tous": el formulari avisa però deixa enviar igualment si l'usuari ho confirma.
 */

const LLETRES = 'TRWAGMYFPDXBNJZSQVHLCKE';

/** Lletra de control d'un DNI a partir del número (mòdul 23). */
export function lletraDni(num: number): string {
  return LLETRES[num % 23]!;
}

export function validaDni(s: string): boolean {
  const m = /^(\d{8})([A-Za-z])$/.exec(s.trim());
  if (!m) return false;
  return lletraDni(Number(m[1])) === m[2]!.toUpperCase();
}

export function validaNie(s: string): boolean {
  const m = /^([XYZxyz])(\d{7})([A-Za-z])$/.exec(s.trim());
  if (!m) return false;
  const pref: Record<string, string> = { X: '0', Y: '1', Z: '2' };
  return lletraDni(Number((pref[m[1]!.toUpperCase()] ?? '0') + m[2]!)) === m[3]!.toUpperCase();
}

export function validaCodiPostal(s: string): boolean {
  return /^\d{5}$/.test(s.trim());
}

export interface FormatCheckViatger {
  tipusDocument?: string;
  numDocument?: string;
  numSuport?: string;
  codiPostal?: string;
  pais?: string;
  dataNaixement?: string;
  dataExpedicio?: string;
  nom?: string;
  cognom1?: string;
}

function parseDate(s?: string): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Retorna avisos de format (no bloquejants) per als viatgers. */
export function formatWarnings(viatgers: FormatCheckViatger[]): string[] {
  const w: string[] = [];
  const avui = new Date();
  avui.setHours(0, 0, 0, 0);

  viatgers.forEach((v, i) => {
    const nomComplet = [v.nom?.trim(), v.cognom1?.trim()].filter(Boolean).join(' ');
    const p = nomComplet ? `${nomComplet} (viatger ${i + 1})` : `Viatger ${i + 1}`;
    const doc = v.numDocument?.trim();
    if (doc) {
      if (v.tipusDocument === 'DNI_NIF' && !validaDni(doc)) {
        const m = /^(\d{8})[A-Za-z]?$/.exec(doc);
        const sug = m ? ` La lletra correcta seria «${lletraDni(Number(m[1]))}».` : '';
        w.push(`${p}: el DNI «${doc}» no sembla vàlid (8 xifres + lletra de control).${sug}`);
      } else if (v.tipusDocument === 'NIE' && !validaNie(doc)) {
        w.push(`${p}: el NIE «${doc}» no sembla vàlid (X/Y/Z + 7 xifres + lletra).`);
      }
    }

    // Número de suport: Mossos el limita a 9 caràcters; els passaports no en solen portar.
    const sup = v.numSuport?.trim();
    if (sup && sup.length > 9) {
      w.push(`${p}: el número de suport «${sup}» supera els 9 caràcters (màxim de Mossos). Escurça'l o deixa'l buit.`);
    }
    if (sup && v.tipusDocument === 'PASSAPORT') {
      w.push(`${p}: has posat un número de suport en un passaport; els passaports normalment no en tenen. Deixa'l buit si el document no en porta.`);
    }

    // Codi postal espanyol: 5 xifres i província 01–52 (només si país Espanya o buit).
    const cp = v.codiPostal?.trim();
    const esEspanya = !v.pais || v.pais.toLowerCase().startsWith('espan');
    if (cp && esEspanya) {
      if (!validaCodiPostal(cp)) {
        w.push(`${p}: el codi postal «${cp}» hauria de tenir 5 xifres.`);
      } else {
        const prov = Number(cp.slice(0, 2));
        if (prov < 1 || prov > 52) {
          w.push(`${p}: el codi postal «${cp}» no sembla real (la província ha de ser 01–52).`);
        }
      }
    }

    // Dates impossibles o improbables.
    const naix = parseDate(v.dataNaixement);
    if (naix) {
      if (naix > avui) {
        w.push(`${p}: la data de naixement és en el futur.`);
      } else {
        const anys = (avui.getTime() - naix.getTime()) / (365.25 * 86_400_000);
        if (anys < 1) w.push(`${p}: la data de naixement sembla incorrecta (edat inferior a 1 any).`);
        else if (anys > 120) w.push(`${p}: la data de naixement sembla incorrecta (més de 120 anys).`);
      }
    }
    const exp = parseDate(v.dataExpedicio);
    if (exp && exp > avui) w.push(`${p}: la data d'expedició és en el futur.`);
  });
  return w;
}
