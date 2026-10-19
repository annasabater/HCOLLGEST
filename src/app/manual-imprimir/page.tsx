/**
 * Manual sencer en una sola pàgina, preparat per imprimir: portada, índex i un
 * capítol per full. scripts/manual/pdf.ts el converteix en
 * public/manual/manual-hostal-coll.pdf.
 */
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { ManualBlocks } from '@/components/manual/manual-content';
import { CAPITOLS, blocsCapitol } from '@/lib/manual/capitols';

export const metadata = { title: 'Manual d’usuari · Hostal Coll' };

export default async function ManualImprimirPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  const data = new Date().toLocaleDateString('ca-ES', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="manual-imprimir bg-white text-slate-800">
      <style>{`
        @page { size: A4; margin: 16mm 14mm 18mm; }
        .manual-imprimir .capitol { break-before: page; }
        .manual-imprimir .manual-foto { break-inside: avoid; }
        .manual-imprimir .manual-h2 { break-after: avoid; }
        .manual-imprimir h2, .manual-imprimir h3 { break-after: avoid; }
        .manual-imprimir table, .manual-imprimir tr { break-inside: avoid; }
        .manual-imprimir .manual-foto img { max-height: 150mm; width: auto; max-width: 100%; margin: 0 auto; }
        @media screen { .manual-imprimir { max-width: 820px; margin: 0 auto; padding: 32px; } }
      `}</style>

      <section className="flex min-h-[250mm] flex-col justify-between">
        <div className="pt-24">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-600">Casa de Hostes · Calella</p>
          <h1 className="mt-4 font-serif text-6xl text-slate-900">Hostal Coll</h1>
          <p className="mt-6 font-serif text-3xl text-slate-700">Manual d’usuari de l’app de gestió</p>
          <p className="mt-6 max-w-xl text-base text-slate-600">
            Com es fa cada cosa, pas a pas i amb fotos: estades, clients, Mossos, pagaments, fiances, factures,
            despeses, llibre d’IVA, impostos i el dia a dia.
          </p>
        </div>
        <p className="text-sm text-slate-500">Versió del {data}. Les fotos són de dades inventades.</p>
      </section>

      <section className="capitol">
        <h2 className="font-serif text-3xl text-slate-900">Índex</h2>
        <ol className="mt-6 space-y-4">
          {CAPITOLS.map((c, n) => (
            <li key={c.slug}>
              <p className="font-semibold text-slate-900">
                {n + 1}. {c.titol}
              </p>
              <p className="text-sm text-slate-500">{c.resum}</p>
              <ul className="mt-1 columns-2 gap-6 text-xs text-slate-600">
                {blocsCapitol(c.slug)
                  .filter((b) => b.t === 'h' && b.level === 2)
                  .map((b) => (b.t === 'h' ? <li key={b.id}>{b.text}</li> : null))}
              </ul>
            </li>
          ))}
        </ol>
      </section>

      {CAPITOLS.map((c, n) => (
        <section key={c.slug} className="capitol">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-500">Capítol {n + 1}</p>
          <h1 className="mb-2 font-serif text-4xl text-slate-900">{c.titol}</h1>
          <p className="mb-6 text-sm text-slate-500">{c.resum}</p>
          <ManualBlocks blocks={blocsCapitol(c.slug)} imprimir />
        </section>
      ))}
    </div>
  );
}
