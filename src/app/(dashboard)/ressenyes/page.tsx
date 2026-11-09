import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { hasRole, ROLES_WRITE } from '@/lib/auth/rbac';
import { PageHeader } from '@/components/ui/page-header';
import { parseTraduccions } from '@/lib/ressenyes';
import { ModeracioRessenyes, type RessenyaVista } from '@/components/ressenya/moderacio';

export const dynamic = 'force-dynamic';

export default async function RessenyesPage() {
  const [ressenyes, est, user] = await Promise.all([
    prisma.ressenya.findMany({ orderBy: { dataRessenya: 'desc' }, take: 500 }),
    prisma.establiment.findFirst({ select: { googleNota: true, googleTotal: true, googleUrl: true } }),
    getSessionUser(),
  ]);
  const canWrite = user ? hasRole(user.role, ROLES_WRITE) : false;

  const vista: RessenyaVista[] = ressenyes.map((r) => ({
    id: r.id,
    font: r.font,
    autor: r.autor,
    puntuacio: r.puntuacio,
    text: r.text,
    idioma: r.idioma,
    dataRessenya: r.dataRessenya.toISOString(),
    resposta: r.resposta,
    estat: r.estat,
    destacada: r.destacada,
    ordre: r.ordre,
    traduccions: parseTraduccions(r.traduccions),
  }));

  return (
    <>
      <PageHeader
        title="Ressenyes"
        subtitle="Tria quines opinions de Google es mostren a hostalcoll.com. Les noves entren sempre com a pendents."
      />
      <ModeracioRessenyes
        ressenyes={vista}
        google={{
          nota: est?.googleNota != null ? Number(est.googleNota) : null,
          total: est?.googleTotal ?? null,
          url: est?.googleUrl ?? null,
        }}
        canWrite={canWrite}
      />
    </>
  );
}
