/**
 * Renderitza els blocs d'un capítol del manual (vegeu src/lib/manual/markdown.ts).
 * Les fotos són a /public/manual/fotos/<id>.webp (captures.ts + optimitza.ts; el PDF fa servir fotos-pdf/)
 * i porten uns números ①②③ que corresponen a la llegenda de sota.
 */
import Link from 'next/link';
import type { Block, Inline, ListItem } from '@/lib/manual/markdown';

const NUMS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];

/** Etiquetes de les parts fixes de cada tasca: es mostren com a subtítols. */
const ETIQUETES = new Set([
  'Per a què serveix',
  'On és',
  'Pas a pas',
  'Què passa després',
  'Què passa després / d’on surten les dades',
  "Què passa després / d'on surten les dades",
  "D'on surten les dades",
  'D’on surten les dades',
  'Per què es fa així',
  "Si t'has equivocat",
  'Si t’has equivocat',
  'Compte!',
]);

function InlineView({ c }: { c: Inline[] }) {
  return (
    <>
      {c.map((x, i) => {
        switch (x.t) {
          case 'text':
            return <span key={i}>{x.v}</span>;
          case 'b':
            return (
              <strong key={i} className="font-semibold text-slate-900">
                <InlineView c={x.c} />
              </strong>
            );
          case 'i':
            return (
              <em key={i}>
                <InlineView c={x.c} />
              </em>
            );
          case 'code':
            return (
              <code key={i} className="rounded bg-slate-100 px-1 py-0.5 text-[0.9em] text-slate-800">
                {x.v}
              </code>
            );
          case 'link': {
            const intern = x.href.startsWith('/') || x.href.startsWith('#');
            return intern ? (
              <Link key={i} href={x.href} className="font-medium text-brand-700 underline underline-offset-2">
                <InlineView c={x.c} />
              </Link>
            ) : (
              <a key={i} href={x.href} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-700 underline underline-offset-2">
                <InlineView c={x.c} />
              </a>
            );
          }
        }
      })}
    </>
  );
}

function Items({ items, ordered, start }: { items: ListItem[]; ordered: boolean; start?: number }) {
  const cls = ordered ? 'list-decimal' : 'list-disc';
  const content = items.map((it, i) => (
    <li key={i} className="pl-1 leading-relaxed">
      <InlineView c={it.c} />
      {it.sub && (
        <div className="mt-1">
          <Items items={it.sub.items} ordered={it.sub.ordered} />
        </div>
      )}
    </li>
  ));
  return ordered ? (
    <ol start={start} className={`${cls} space-y-1.5 pl-6 marker:font-semibold marker:text-brand-700`}>
      {content}
    </ol>
  ) : (
    <ul className={`${cls} space-y-1 pl-6 marker:text-brand-400`}>{content}</ul>
  );
}

/** Paràgraf que només conté una etiqueta en negreta (p. ex. **Pas a pas**). */
function etiquetaSola(c: Inline[]): string | null {
  const only = c[0];
  if (c.length !== 1 || !only || only.t !== 'b') return null;
  const inner = only.c.map((x) => (x.t === 'text' ? x.v : '')).join('').replace(/:$/, '').trim();
  return ETIQUETES.has(inner) || inner.length < 40 ? inner : null;
}

export function ManualBlocks({ blocks, imprimir = false }: { blocks: Block[]; imprimir?: boolean }) {
  return (
    <div className="manual-text space-y-4 text-[15px] text-slate-700">
      {blocks.map((b, i) => {
        switch (b.t) {
          case 'h': {
            if (b.level === 1) return null; // el títol del capítol ja surt a la capçalera
            const Tag = (`h${b.level}` as 'h2' | 'h3' | 'h4');
            const cls =
              b.level === 2
                ? 'manual-h2 mt-10 scroll-mt-24 border-b border-slate-200 pb-2 font-serif text-2xl text-slate-900'
                : b.level === 3
                  ? 'mt-6 scroll-mt-24 text-lg font-semibold text-slate-900'
                  : 'mt-4 scroll-mt-24 font-semibold text-slate-900';
            return (
              <Tag key={i} id={b.id} className={cls}>
                <InlineView c={b.c} />
              </Tag>
            );
          }
          case 'p': {
            const et = etiquetaSola(b.c);
            if (et)
              return (
                <p key={i} className="!mt-6 text-xs font-bold uppercase tracking-wider text-brand-700">
                  {et}
                </p>
              );
            return (
              <p key={i} className="leading-relaxed">
                <InlineView c={b.c} />
              </p>
            );
          }
          case 'list':
            return <Items key={i} items={b.items} ordered={b.ordered} start={b.start} />;
          case 'table':
            return (
              <div key={i} className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      {b.head.map((h, j) => (
                        <th key={j} className="px-3 py-2 font-semibold">
                          <InlineView c={h} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {b.rows.map((r, j) => (
                      <tr key={j} className="align-top">
                        {r.map((cell, k) => (
                          <td key={k} className="px-3 py-2">
                            <InlineView c={cell} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case 'quote':
            return (
              <div key={i} className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
                <ManualBlocks blocks={b.c} imprimir={imprimir} />
              </div>
            );
          case 'code':
            return (
              <pre key={i} className="overflow-x-auto rounded-lg bg-slate-900 p-4 text-sm text-slate-100">
                {b.v}
              </pre>
            );
          case 'hr':
            return <hr key={i} className="border-slate-200" />;
          case 'foto':
            return (
              <figure key={i} className="manual-foto overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imprimir ? `/manual/fotos-pdf/${b.foto.id}.jpg` : `/manual/fotos/${b.foto.id}.webp`}
                  alt={b.foto.descripcio}
                  loading={imprimir ? 'eager' : 'lazy'}
                  className="block w-full"
                />
                {(b.foto.descripcio || b.foto.marques.length > 0) && (
                  <figcaption className="border-t border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600">
                    {b.foto.descripcio}
                    {b.foto.marques.length > 0 && (
                      <span className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                        {b.foto.marques.map((m, j) => (
                          <span key={j} className="whitespace-nowrap">
                            <span className="font-bold text-red-600">{NUMS[j] ?? j + 1}</span> «{m}»
                          </span>
                        ))}
                      </span>
                    )}
                  </figcaption>
                )}
              </figure>
            );
        }
      })}
    </div>
  );
}
