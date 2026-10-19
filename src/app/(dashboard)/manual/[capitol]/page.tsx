import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { ManualBlocks } from '@/components/manual/manual-content';
import { CAPITOLS, blocsCapitol, getCapitol } from '@/lib/manual/capitols';

export function generateStaticParams() {
  return CAPITOLS.map((c) => ({ capitol: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ capitol: string }> }) {
  const { capitol } = await params;
  const c = getCapitol(capitol);
  return { title: c ? `${c.titol} · Manual · Hostal Coll` : 'Manual · Hostal Coll' };
}

export default async function CapitolPage({ params }: { params: Promise<{ capitol: string }> }) {
  const { capitol } = await params;
  const c = getCapitol(capitol);
  if (!c) notFound();
  const blocks = blocsCapitol(c.slug);
  const temes = blocks.filter((b): b is Extract<typeof b, { t: 'h' }> => b.t === 'h' && b.level === 2);
  const idx = CAPITOLS.findIndex((x) => x.slug === c.slug);
  const prev = CAPITOLS[idx - 1];
  const next = CAPITOLS[idx + 1];

  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/manual" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> Manual d’usuari
      </Link>
      <header className="mb-6 mt-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-500">Capítol {idx + 1}</p>
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-slate-900">{c.titol}</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">{c.resum}</p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_260px]">
        <article className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 sm:p-8">
          {blocks.length === 0 ? (
            <p className="text-slate-500">Aquest capítol encara s’està preparant.</p>
          ) : (
            <ManualBlocks blocks={blocks} />
          )}
        </article>

        {temes.length > 0 && (
          <aside className="hidden lg:block">
            <nav className="sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 text-sm">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">En aquest capítol</p>
              <ul className="space-y-1.5">
                {temes.map((t) => (
                  <li key={t.id}>
                    <a href={`#${t.id}`} className="block leading-snug text-slate-600 hover:text-brand-700">
                      {t.text}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>
        )}
      </div>

      <div className="mt-8 flex flex-wrap justify-between gap-4">
        {prev ? (
          <Link href={`/manual/${prev.slug}`} className="flex items-center gap-2 text-sm font-medium text-brand-700 hover:underline">
            <ArrowLeft className="h-4 w-4" /> {prev.titol}
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link href={`/manual/${next.slug}`} className="flex items-center gap-2 text-sm font-medium text-brand-700 hover:underline">
            {next.titol} <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </div>
  );
}
