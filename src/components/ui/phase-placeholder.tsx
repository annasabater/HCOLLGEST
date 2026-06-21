import { Construction } from 'lucide-react';
import { PageHeader } from './page-header';

export function PhasePlaceholder({
  title,
  phase,
  description,
}: {
  title: string;
  phase: string;
  description: string;
}) {
  return (
    <div>
      <PageHeader title={title} subtitle={phase} />
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
        <Construction className="mb-3 h-10 w-10 text-slate-300" />
        <p className="max-w-md text-sm text-slate-500">{description}</p>
      </div>
    </div>
  );
}
