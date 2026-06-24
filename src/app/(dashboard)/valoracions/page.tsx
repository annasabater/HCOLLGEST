import Link from 'next/link';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { hasRole, ROLES_WRITE } from '@/lib/auth/rbac';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EliminarValoracio } from '@/components/valoracio/eliminar-valoracio';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const LANG_LABEL: Record<string, string> = {
  ca: 'Català',
  es: 'Castellà',
  en: 'Anglès',
  fr: 'Francès',
};

/** Estrelles plenes + buides (p. ex. 4 → ★★★★☆). */
function estrelles(n: number): string {
  const v = Math.max(0, Math.min(5, n));
  return '★★★★★☆☆☆☆☆'.slice(5 - v, 10 - v);
}

export default async function ValoracionsPage() {
  const valoracions = await prisma.valoracio.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  // Relaciona cada valoració amb el seu client (titular de l'estada via estanciaId).
  const estanciaIds = [...new Set(valoracions.map((v) => v.estanciaId).filter(Boolean))] as string[];
  const estancies = estanciaIds.length
    ? await prisma.estancia.findMany({
        where: { id: { in: estanciaIds } },
        select: {
          id: true,
          viatgers: {
            where: { esTitular: true },
            include: { huesped: { select: { id: true, nom: true, cognom1: true } } },
          },
        },
      })
    : [];
  const clientPerEstancia = new Map<string, { id: string; nom: string }>();
  for (const e of estancies) {
    const h = e.viatgers[0]?.huesped;
    if (h) clientPerEstancia.set(e.id, { id: h.id, nom: `${h.nom} ${h.cognom1}` });
  }

  const user = await getSessionUser();
  const canWrite = user ? hasRole(user.role, ROLES_WRITE) : false;

  const ara = Date.now();
  const esNova = (d: Date) => ara - new Date(d).getTime() < 3 * 24 * 60 * 60 * 1000;

  return (
    <>
      <PageHeader
        title="Valoracions"
        subtitle="El que ens diuen els hostes des de la pàgina de benvinguda, després de la primera nit."
      />

      {valoracions.length === 0 ? (
        <Card>
          <CardBody>
            <p className="text-sm text-slate-400">Encara no hi ha cap valoració.</p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          {valoracions.map((v) => {
            const client = v.estanciaId ? clientPerEstancia.get(v.estanciaId) : null;
            return (
              <Card key={v.id}>
                <CardBody className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-lg leading-none text-amber-500" title={`${v.puntuacio}/5`}>
                      {estrelles(v.puntuacio)}
                    </span>
                    {client ? (
                      <Link
                        href={`/huespedes/${client.id}`}
                        className="text-sm font-medium text-brand-700 hover:underline"
                        title="Veure la fitxa del client"
                      >
                        {client.nom}
                      </Link>
                    ) : (
                      <span className="text-sm font-medium text-slate-700">
                        {v.nom || 'Hoste sense identificar'}
                      </span>
                    )}
                    {v.habitacio && <Badge tone="neutral">Habitació {v.habitacio}</Badge>}
                    {v.idioma && LANG_LABEL[v.idioma] && <Badge tone="info">{LANG_LABEL[v.idioma]}</Badge>}
                    {esNova(v.createdAt) && <Badge tone="success">Nova</Badge>}
                    <span className="ml-auto text-xs text-slate-400">{formatDate(v.createdAt)}</span>
                    {canWrite && <EliminarValoracio id={v.id} />}
                  </div>
                  {v.comentari && <p className="text-sm text-slate-600">“{v.comentari}”</p>}
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
