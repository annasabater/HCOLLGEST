/**
 * Lector del format dels capítols del manual d'usuari (un Markdown senzill):
 * títols (#, ##, ###), paràgrafs, llistes (- i 1.) amb un nivell de subllista,
 * taules, cites (>), blocs de codi, línies --- i les marques de foto:
 *
 *   [FOTO id=nova-estada ruta=/estancies/nou descripcio="…" marques="Desar|Cancel·lar"]
 *
 * Funció PURA (sense React ni fitxers): la renderització és a components/manual.
 */

export type Inline =
  | { t: 'text'; v: string }
  | { t: 'b'; c: Inline[] }
  | { t: 'i'; c: Inline[] }
  | { t: 'code'; v: string }
  | { t: 'link'; href: string; c: Inline[] };

export interface Foto {
  id: string;
  ruta: string;
  descripcio: string;
  marques: string[];
}

export interface ListItem {
  c: Inline[];
  sub?: { ordered: boolean; items: ListItem[] };
}

export type ListBlock = { t: 'list'; ordered: boolean; start: number; items: ListItem[] };

export type Block =
  | { t: 'h'; level: 1 | 2 | 3 | 4; id: string; text: string; c: Inline[] }
  | { t: 'p'; c: Inline[] }
  | ListBlock
  | { t: 'table'; head: Inline[][]; rows: Inline[][][] }
  | { t: 'quote'; c: Block[] }
  | { t: 'code'; v: string }
  | { t: 'hr' }
  | { t: 'foto'; foto: Foto };

/** "Com faig una factura?" → "com-faig-una-factura" (sense accents). */
export function slugify(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/·/g, '-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/** Text pla d'una llista d'inlines (per a cercar i per als ids). */
export function plainText(c: Inline[]): string {
  return c.map((x) => (x.t === 'text' || x.t === 'code' ? x.v : plainText(x.c))).join('');
}

const FOTO_RE = /^\s*(?:[-*]\s+|\d+\.\s+)?\[FOTO\s+(.+)\]\s*$/;
const LIST_RE = /^(\s*)([-*]|\d+\.)\s+(.*)$/;

export function parseFotoAttrs(s: string): Foto | null {
  const attrs: Record<string, string> = {};
  const re = /(\w+)=(?:"([^"]*)"|(\S+))/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    const k = m[1];
    if (k) attrs[k] = m[2] ?? m[3] ?? '';
  }
  if (!attrs.id) return null;
  return {
    id: attrs.id,
    ruta: attrs.ruta ?? '',
    descripcio: attrs.descripcio ?? '',
    marques: (attrs.marques ?? '')
      .split('|')
      .map((x) => x.trim())
      .filter(Boolean),
  };
}

/** Inline: **negreta**, *cursiva*, `codi` i [enllaç](url). */
export function parseInline(s: string): Inline[] {
  const out: Inline[] = [];
  let buf = '';
  const flush = () => {
    if (buf) out.push({ t: 'text', v: buf });
    buf = '';
  };
  let i = 0;
  while (i < s.length) {
    const rest = s.slice(i);
    const ch = rest.charAt(0);
    if (rest.startsWith('**')) {
      const end = s.indexOf('**', i + 2);
      if (end > i + 2) {
        flush();
        out.push({ t: 'b', c: parseInline(s.slice(i + 2, end)) });
        i = end + 2;
        continue;
      }
    }
    if (ch === '`') {
      const end = s.indexOf('`', i + 1);
      if (end > i) {
        flush();
        out.push({ t: 'code', v: s.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    if (ch === '[') {
      const m = rest.match(/^\[([^\]]+)\]\(([^)\s]+)\)/);
      if (m) {
        flush();
        out.push({ t: 'link', href: m[2] ?? '', c: parseInline(m[1] ?? '') });
        i += m[0].length;
        continue;
      }
    }
    // *cursiva* (no confondre amb "* " de llista ni amb "2 * 3")
    const ch2 = rest.charAt(1);
    if (ch === '*' && ch2 && ch2 !== ' ' && ch2 !== '*') {
      const end = s.indexOf('*', i + 1);
      if (end > i + 1 && s.charAt(end - 1) !== ' ') {
        flush();
        out.push({ t: 'i', c: parseInline(s.slice(i + 1, end)) });
        i = end + 1;
        continue;
      }
    }
    buf += ch;
    i++;
  }
  flush();
  return out;
}

function splitRow(line: string): string[] {
  const t = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return t.split('|').map((c) => c.trim());
}

interface ListMatch {
  indent: number;
  ordered: boolean;
  num: number;
  text: string;
}
function matchList(line: string): ListMatch | null {
  const m = line.match(LIST_RE);
  if (!m) return null;
  const marker = m[2] ?? '-';
  const ordered = /\d/.test(marker);
  return { indent: (m[1] ?? '').length, ordered, num: ordered ? parseInt(marker, 10) : 1, text: m[3] ?? '' };
}

export function parseMarkdown(src: string): Block[] {
  const lines = src.replace(/\r\n?/g, '\n').split('\n');
  const L = (k: number): string => lines[k] ?? '';
  const blocks: Block[] = [];
  const usedIds = new Set<string>();
  const uniqueId = (base: string) => {
    let id = base || 'seccio';
    for (let n = 2; usedIds.has(id); n++) id = `${base}-${n}`;
    usedIds.add(id);
    return id;
  };
  // Numeració contínua d'una llista ordenada tallada per una foto.
  let lastOrdered: { next: number } | null = null;

  let i = 0;
  while (i < lines.length) {
    const line = L(i);
    const trimmed = line.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    const foto = trimmed.match(FOTO_RE);
    if (foto) {
      const f = parseFotoAttrs(foto[1] ?? '');
      if (f) blocks.push({ t: 'foto', foto: f });
      i++;
      continue;
    }

    if (trimmed.startsWith('```')) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !L(i).trim().startsWith('```')) buf.push(L(i++));
      i++;
      blocks.push({ t: 'code', v: buf.join('\n') });
      lastOrdered = null;
      continue;
    }

    const h = trimmed.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      const text = (h[2] ?? '').replace(/\s+#+$/, '');
      const c = parseInline(text);
      const level = Math.min(4, (h[1] ?? '#').length) as 1 | 2 | 3 | 4;
      blocks.push({ t: 'h', level, id: uniqueId(slugify(plainText(c))), text: plainText(c), c });
      lastOrdered = null;
      i++;
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push({ t: 'hr' });
      i++;
      continue;
    }

    if (trimmed.startsWith('|')) {
      const rows: string[] = [];
      while (i < lines.length && L(i).trim().startsWith('|')) rows.push(L(i++));
      const cells = rows.map(splitRow);
      const isSep = (r: string[]) => r.every((c) => /^:?-{2,}:?$/.test(c));
      const head = cells[0] ?? [];
      const body = cells.slice(1).filter((r) => !isSep(r));
      blocks.push({ t: 'table', head: head.map(parseInline), rows: body.map((r) => r.map(parseInline)) });
      lastOrdered = null;
      continue;
    }

    if (trimmed.startsWith('>')) {
      const buf: string[] = [];
      while (i < lines.length && L(i).trim().startsWith('>')) buf.push(L(i++).trim().replace(/^>\s?/, ''));
      blocks.push({ t: 'quote', c: parseMarkdown(buf.join('\n')) });
      lastOrdered = null;
      continue;
    }

    const first = matchList(line);
    if (first) {
      const ordered = first.ordered;
      const baseIndent = first.indent;
      const items: ListItem[] = [];
      while (i < lines.length) {
        const l = L(i);
        if (!l.trim()) {
          // Una línia buida dins d'una llista: continua si la següent segueix la llista.
          const nxt = L(i + 1);
          if (matchList(nxt) && !FOTO_RE.test(nxt)) {
            i++;
            continue;
          }
          break;
        }
        if (FOTO_RE.test(l.trim())) break;
        const m = matchList(l);
        const last = items[items.length - 1];
        if (m) {
          if (m.indent > baseIndent && last) {
            last.sub ??= { ordered: m.ordered, items: [] };
            last.sub.items.push({ c: parseInline(m.text) });
            i++;
            continue;
          }
          if (m.ordered !== ordered) break;
          items.push({ c: parseInline(m.text) });
          i++;
          continue;
        }
        // Continuació del darrer element (línia sagnada sense marcador).
        if (/^\s{2,}\S/.test(l) && last) {
          const subs = last.sub?.items;
          const target = subs && subs.length ? (subs[subs.length - 1] ?? last) : last;
          target.c.push({ t: 'text', v: ' ' }, ...parseInline(l.trim()));
          i++;
          continue;
        }
        break;
      }
      // Si la llista numerada continua després d'una foto (torna a començar per
      // 1), en conservem el número perquè els passos no tornin a començar.
      const prev = blocks[blocks.length - 1];
      const realStart: number = ordered && lastOrdered && first.num === 1 && prev?.t === 'foto' ? lastOrdered.next : first.num;
      blocks.push({ t: 'list', ordered, start: realStart, items });
      lastOrdered = ordered ? { next: realStart + items.length } : null;
      continue;
    }

    // Paràgraf: fins a una línia buida o un altre tipus de bloc.
    const buf: string[] = [trimmed];
    i++;
    while (i < lines.length) {
      const l = L(i).trim();
      if (!l || /^(#{1,4}\s|[-*]\s|\d+\.\s|\||>|```)/.test(l) || FOTO_RE.test(l)) break;
      buf.push(l);
      i++;
    }
    blocks.push({ t: 'p', c: parseInline(buf.join(' ')) });
  }
  return blocks;
}

/** Treu les seccions internes que no s'han de publicar ("## DUBTES"). */
export function treuSeccionsInternes(src: string): string {
  const out: string[] = [];
  let skip = false;
  for (const l of src.replace(/\r\n?/g, '\n').split('\n')) {
    const h = l.match(/^(#{1,2})\s+(.*)$/);
    if (h) skip = /^dubtes\b/i.test((h[2] ?? '').trim());
    if (!skip) out.push(l);
  }
  return out.join('\n').trimEnd() + '\n';
}
