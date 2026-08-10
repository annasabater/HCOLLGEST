import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { esNomesLectura } from '@/lib/auth/restriccions';
import { AppShell } from '@/components/layout/app-shell';
import { CobramentPopup, type CobramentItem } from '@/components/dashboard/cobrament-popup';

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

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  // Els usuaris de només lectura (propietat) no gestionen cobraments → sense pop-up.
  const cobraments = esNomesLectura(user) ? [] : await cobramentsPopup();

  return (
    <AppShell user={{ nom: user.nom, role: user.role }} readOnly={esNomesLectura(user)}>
      {cobraments.length > 0 && <CobramentPopup items={cobraments} />}
      {children}
    </AppShell>
  );
}
