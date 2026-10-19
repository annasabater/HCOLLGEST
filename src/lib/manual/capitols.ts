/**
 * Índex del manual d'usuari: capítols en l'ordre en què es llegeixen. El text de
 * cada capítol és a docs/manual/<slug>.md i `pnpm manual:contingut` el copia a
 * src/content/manual/generated.ts (sense les seccions internes de DUBTES).
 */
import { CAPITOLS_MD } from '@/content/manual/generated';
import { parseMarkdown, plainText, type Block } from './markdown';

export interface Capitol {
  slug: string;
  titol: string;
  resum: string;
}

export const CAPITOLS: Capitol[] = [
  { slug: 'benvinguda', titol: 'Benvinguda i primers passos', resum: 'Com està organitzada l’app, com es llegeix aquest manual i les paraules que cal conèixer.' },
  { slug: 'recorreguts', titol: 'Recorreguts de principi a fi', resum: 'Les situacions del dia a dia, pas a pas i de cap a peus: arriba un client, marxa abans, demana factura…' },
  { slug: 'estades', titol: 'Estades', resum: 'Reserves, contractes, ampliacions, canvis d’habitació, sortides anticipades i tot el que es fa amb una estada.' },
  { slug: 'hostes', titol: 'Clients i documents d’identitat', resum: 'Fitxes dels clients, escanejar DNI, NIE i passaports, signatures, mascotes i notes.' },
  { slug: 'mossos', titol: 'Mossos, llibre de registre i justificants', resum: 'La comunicació obligatòria a Mossos en 24 hores, el llibre de registre i els justificants.' },
  { slug: 'factures', titol: 'Pagaments, fiances i factures', resum: 'Cobrar, tornar diners, fiances i dipòsits, factures simples, fiscals i rectificatives, i pressupostos.' },
  { slug: 'comptabilitat', titol: 'Diners, despeses i impostos', resum: 'Balanç, despeses, llibre d’IVA columna per columna, taxa turística, impostos i Veri*Factu.' },
  { slug: 'dia-a-dia', titol: 'El dia a dia i l’equip', resum: 'Tauler, calendari, neteja, bugaderia, manteniment, tarifes, treballadors, plantilles i valoracions.' },
  { slug: 'configuracio', titol: 'Entrar, usuaris i configuració', resum: 'Iniciar sessió, qui pot fer què, configuració, còpies de seguretat i què fer si alguna cosa falla.' },
  { slug: 'inspeccio', titol: 'Obligacions i inspeccions', resum: 'Calendari d’obligacions de l’any i què et poden demanar en una inspecció (i d’on ho treus).' },
];

export function getCapitol(slug: string): Capitol | undefined {
  return CAPITOLS.find((c) => c.slug === slug);
}

export function blocsCapitol(slug: string): Block[] {
  const md = CAPITOLS_MD[slug];
  return md ? parseMarkdown(md) : [];
}

export interface SeccioIndex {
  capitol: string;
  id: string;
  titol: string;
  nivell: number;
  /** Text de la secció (per al cercador). */
  text: string;
}

/** Totes les seccions (##) de tots els capítols, amb el seu text per cercar-hi. */
export function indexSeccions(): SeccioIndex[] {
  const out: SeccioIndex[] = [];
  for (const c of CAPITOLS) {
    let cur: SeccioIndex | null = null;
    for (const b of blocsCapitol(c.slug)) {
      if (b.t === 'h' && b.level <= 3 && b.level >= 2) {
        cur = { capitol: c.slug, id: b.id, titol: b.text, nivell: b.level, text: '' };
        out.push(cur);
      } else if (cur) {
        if (b.t === 'p') cur.text += ' ' + plainText(b.c);
        else if (b.t === 'list') cur.text += ' ' + b.items.map((it) => plainText(it.c)).join(' ');
      }
    }
  }
  return out;
}

/** Ids de totes les fotos de tots els capítols (per al generador de captures). */
export function totesLesFotos() {
  return CAPITOLS.flatMap((c) =>
    blocsCapitol(c.slug).flatMap((b) => (b.t === 'foto' ? [{ capitol: c.slug, ...b.foto }] : [])),
  );
}
