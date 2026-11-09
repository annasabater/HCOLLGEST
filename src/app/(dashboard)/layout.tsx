import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { esNomesLectura } from '@/lib/auth/restriccions';
import { AppShell } from '@/components/layout/app-shell';
import { CobramentPopup, type CobramentItem } from '@/components/dashboard/cobrament-popup';
import { RessenyaPopup, type OpinioNova } from '@/components/dashboard/ressenya-popup';

// Cobraments previstos dins la finestra d'avís del pop-up: des de 2 dies abans
// fins al mateix dia del pagament (no els vençuts). El pop-up es mostra un cop al
// dia i es recorda al navegador que ja s'ha tancat.
async function cobramentsPopup(): Promise<CobramentItem[]> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const limit = new Date(todayStart.getTime() + 3 * 86_400_000); // avui, +1 i +2 dies
  const rows = await prisma.pagamentPrevist.findMany({
    where: { pagat: false, dataPrevista: { gte: todayStart, lt: limit }, estancia: { deletedAt: null } },
    orderBy: { dataPrevista: 'asc' },
    take: 30,
    include: {
      estancia: {
        select: {
          id: true,
          numContracte: true,
          anyContracte: true,
          viatgers: { where: { esTitular: true }, take: 1, include: { huesped: { select: { nom: true, cognom1: true } } } },
        },
      },
    },
  });
  return rows.map((p) => {
    const t = p.estancia.viatgers[0]?.huesped;
    return {
      id: p.id,
      estanciaId: p.estancia.id,
      titular: t ? `${t.nom} ${t.cognom1}`.trim() : `Contracte ${p.estancia.numContracte}/${p.estancia.anyContracte}`,
      import: Number(p.import),
      dataPrevista: p.dataPrevista.toISOString(),
      concepte: p.concepte,
    };
  });
}

// Opinions noves dels últims 14 dies: ressenyes de Google pendents que han arribat
// soles (no les afegides a mà, que ja les ha vist qui les entra) i valoracions de
// la benvinguda no llegides. En tancar el pop-up, les valoracions es marquen
// `vista` a la BD (no tornen a sortir en cap dispositiu) i les ressenyes es
// recorden al navegador (continuen pendents fins que es decideix a /ressenyes).
async function opinionsPopup(): Promise<OpinioNova[]> {
  const des = new Date(Date.now() - 14 * 86_400_000);
  const [ressenyes, valoracions] = await Promise.all([
    prisma.ressenya.findMany({
      where: { estat: 'PENDENT', font: { not: 'MANUAL' }, createdAt: { gte: des } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.valoracio.findMany({
      where: { vista: false, createdAt: { gte: des } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);
  return [
    ...ressenyes.map((r) => ({
      id: `r:${r.id}`,
      tipus: 'GOOGLE' as const,
      autor: r.autor,
      puntuacio: r.puntuacio,
      text: r.text,
      data: r.createdAt.toISOString(),
    })),
    ...valoracions.map((v) => ({
      id: `v:${v.id}`,
      tipus: 'VALORACIO' as const,
      autor: v.nom || (v.habitacio ? `Hoste de l’habitació ${v.habitacio}` : 'Hoste'),
      puntuacio: v.puntuacio,
      text: v.comentari,
      data: v.createdAt.toISOString(),
    })),
  ];
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  // Els usuaris de només lectura (propietat) no gestionen cobraments ni opinions → sense pop-ups.
  const [cobraments, opinions] = esNomesLectura(user)
    ? [[], []]
    : await Promise.all([cobramentsPopup(), opinionsPopup()]);

  return (
    <AppShell user={{ nom: user.nom, role: user.role }} readOnly={esNomesLectura(user)}>
      {cobraments.length > 0 && <CobramentPopup items={cobraments} />}
      {opinions.length > 0 && <RessenyaPopup items={opinions} />}
      {children}
    </AppShell>
  );
}
