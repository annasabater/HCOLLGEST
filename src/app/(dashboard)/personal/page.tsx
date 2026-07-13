import Link from 'next/link';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { PageHeader } from '@/components/ui/page-header';
import { Table, Thead, Th, Td, Tr, EmptyState } from '@/components/ui/table';
import { TreballadorForm } from '@/components/personal/treballador-form';
import { EliminarTreballador } from '@/components/personal/eliminar-treballador';
import { formatEur } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function PersonalPage() {
  const user = await getSessionUser();
  if (user?.role !== 'ADMIN') {
    return (
      <div>
        <PageHeader title="Personal" />
        <p className="text-sm text-red-600">Només els administradors poden accedir a personal.</p>
      </div>
    );
  }

  const treballadors = await prisma.treballador.findMany({
    where: { deletedAt: null },
    orderBy: [{ esEmpresa: 'desc' }, { nom: 'asc' }],
    include: { _count: { select: { absencies: true, jornades: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Personal"
        subtitle={`${treballadors.length} treballadors`}
        actions={<TreballadorForm />}
      />

      {treballadors.length === 0 ? (
        <EmptyState>Encara no hi ha treballadors.</EmptyState>
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th>Nom</Th>
              <Th>Càrrec</Th>
              <Th>Pagament</Th>
              <Th>Jornades</Th>
              <Th>Absències</Th>
              <Th></Th>
            </tr>
          </Thead>
          <tbody>
            {treballadors.map((t) => (
              <Tr key={t.id}>
                <Td>
                  <span className="flex items-center gap-2">
                    <Link href={`/personal/${t.id}`} className="font-medium text-slate-900">
                      {t.nom}
                    </Link>
                    {t.esEmpresa && (
                      <span className="rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-brand-700">
                        Empresa
                      </span>
                    )}
                  </span>
                  {t.nomEmpresa && <div className="text-xs text-slate-500">{t.nomEmpresa}</div>}
                  {t.dni && <div className="text-xs text-slate-400">{t.dni}</div>}
                </Td>
                <Td>{t.carrec}</Td>
                <Td>
                  {t.preuHora
                    ? `${formatEur(Number(t.preuHora))}/h`
                    : t.preuSortida
                    ? `Tasques (S:${formatEur(Number(t.preuSortida))} M:${formatEur(Number(t.preuManteniment ?? 0))} Z:${formatEur(Number(t.preuZones ?? 0))})`
                    : '—'}
                </Td>
                <Td>{t._count.jornades}</Td>
                <Td>{t._count.absencies}</Td>
                <Td className="text-right">
                  <div className="flex items-center justify-end gap-3">
                    <TreballadorForm
                      treballador={{
                        id: t.id,
                        nom: t.nom,
                        carrec: t.carrec,
                        preuHora: t.preuHora != null ? String(Number(t.preuHora)) : '',
                        preuSortida: t.preuSortida != null ? String(Number(t.preuSortida)) : '',
                        preuManteniment: t.preuManteniment != null ? String(Number(t.preuManteniment)) : '',
                        preuZones: t.preuZones != null ? String(Number(t.preuZones)) : '',
                        telefon: t.telefon ?? '',
                        email: t.email ?? '',
                        dni: t.dni ?? '',
                        esEmpresa: t.esEmpresa,
                        nomEmpresa: t.nomEmpresa ?? '',
                        empresaId: t.empresaId ?? '',
                      }}
                    />
                    <EliminarTreballador id={t.id} nom={t.nom} />
                  </div>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
