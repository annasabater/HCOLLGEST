import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { Suspense } from 'react';
import { hasRole, ROLES_ADMIN, ROLES_WRITE } from '@/lib/auth/rbac';
import { GoogleConnexio } from '@/components/ressenya/google-connexio';
import { PageHeader } from '@/components/ui/page-header';
import { parseTraduccions } from '@/lib/ressenyes';
import { ModeracioRessenyes, type RessenyaVista } from '@/components/ressenya/moderacio';

export const dynamic = 'force-dynamic';

export default async function RessenyesPage() {
  const [ressenyes, est, user] = await Promise.all([
    prisma.ressenya.findMany({ orderBy: { dataRessenya: 'desc' }, take: 500 }),
    prisma.establiment.findFirst({
      select: {
        googleNota: true,
        googleTotal: true,
        googleUrl: true,
        googleBusinessTokenEnc: true,
        googleBusinessLocation: true,
        ressenyesSyncAt: true,
        ressenyesSyncError: true,
      },
    }),
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
    dataPrecisio: r.dataPrecisio,
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
      <div className="mb-6">
        <Suspense>
          <GoogleConnexio
            estat={{
              connectat: !!est?.googleBusinessTokenEnc,
              fitxa: !!est?.googleBusinessLocation,
              syncAt: est?.ressenyesSyncAt?.toISOString() ?? null,
              syncError: est?.ressenyesSyncError ?? null,
            }}
            isAdmin={user ? hasRole(user.role, ROLES_ADMIN) : false}
            canWrite={canWrite}
          />
        </Suspense>
      </div>
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
