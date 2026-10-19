import Link from 'next/link';
import { BookOpen, Download } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { ManualCerca } from '@/components/manual/manual-cerca';
import { CAPITOLS, blocsCapitol, indexSeccions } from '@/lib/manual/capitols';

export const metadata = { title: 'Manual d’usuari · Hostal Coll' };

export default function ManualPage() {
  const seccions = indexSeccions();
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Manual d’usuari"
        subtitle="Com es fa cada cosa a l’app, pas a pas i amb fotos. Cerca una paraula o tria un capítol."
        actions={
          <a
            href="/manual/manual-hostal-coll.pdf"
            download
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            <Download className="h-4 w-4" /> Descarregar PDF
          </a>
        }
      />

      <ManualCerca seccions={seccions} capitols={CAPITOLS.map((c) => ({ slug: c.slug, titol: c.titol }))} />

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {CAPITOLS.map((c, n) => {
          const temes = blocsCapitol(c.slug).filter((b) => b.t === 'h' && b.level === 2);
          return (
            <Link
              key={c.slug}
              href={`/manual/${c.slug}`}
              className="group flex flex-col rounded-xl border border-slate-200 bg-white p-5 transition-colors hover:border-brand-300 hover:bg-brand-50/40"
            >
              <span className="text-xs font-semibold uppercase tracking-wider text-brand-500">Capítol {n + 1}</span>
              <span className="mt-1 flex items-center gap-2 font-serif text-xl text-slate-900">
                <BookOpen className="h-5 w-5 shrink-0 text-brand-600" /> {c.titol}
              </span>
              <span className="mt-2 text-sm text-slate-600">{c.resum}</span>
              <span className="mt-3 text-xs text-slate-400">
                {temes.length > 0 ? `${temes.length} apartats` : 'En preparació'}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
