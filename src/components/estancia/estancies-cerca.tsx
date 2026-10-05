'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

/** Cercador de client a la llista d'estades: filtra mentre s'escriu (amb una petita espera). */
export function EstanciesCerca({ actual }: { actual: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [valor, setValor] = useState(actual);
  const darrer = useRef(actual);

  useEffect(() => {
    const q = valor.trim();
    if (q === darrer.current) return;
    const t = setTimeout(() => {
      darrer.current = q;
      const params = new URLSearchParams(searchParams.toString());
      if (q) params.set('q', q);
      else params.delete('q');
      params.delete('pagina'); // torna a la 1a pàgina en cercar
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    }, 350);
    return () => clearTimeout(t);
  }, [valor, pathname, router, searchParams]);

  return (
    <div className="relative w-full sm:w-72">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <Input
        type="search"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        placeholder="Cerca client (nom, cognom, document, contracte)"
        aria-label="Cerca client"
        className="h-9 pl-9 pr-8"
      />
      {valor && (
        <button
          type="button"
          onClick={() => setValor('')}
          aria-label="Esborra la cerca"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
