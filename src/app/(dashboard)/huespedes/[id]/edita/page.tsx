import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { hasRole, ROLES_WRITE } from '@/lib/auth/rbac';
import { PageHeader } from '@/components/ui/page-header';
import { HuespedEditForm, type HuespedFormValues } from '@/components/huesped/huesped-edit-form';
import { toISODate } from '@/lib/dates';

export const dynamic = 'force-dynamic';

const d = (date: Date | null) => (date ? toISODate(date) : '');

export default async function HuespedEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user || !hasRole(user.role, ROLES_WRITE)) redirect(`/huespedes/${id}`);

  const h = await prisma.huesped.findFirst({ where: { id, deletedAt: null } });
  if (!h) notFound();

  const initial: HuespedFormValues = {
    nom: h.nom,
    cognom1: h.cognom1,
    cognom2: h.cognom2 ?? '',
    sexe: h.sexe ?? '',
    dataNaixement: d(h.dataNaixement),
    nacionalitat: h.nacionalitat ?? '',
    tipusDocument: h.tipusDocument ?? '',
    numDocument: h.numDocument ?? '',
    numSuport: h.numSuport ?? '',
    dataExpedicio: d(h.dataExpedicio),
    email: h.email ?? '',
    telefon: h.telefon ?? '',
    adreca: h.adreca ?? '',
    pais: h.pais ?? '',
    provincia: h.provincia ?? '',
    municipi: h.municipi ?? '',
    localitat: h.localitat ?? '',
    codiPostal: h.codiPostal ?? '',
  };

  return (
    <div>
      <Link
        href={`/huespedes/${id}`}
        className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" /> Fitxa
      </Link>
      <PageHeader title={`Editar ${h.nom} ${h.cognom1}`} subtitle="Es manté el historial intacte" />
      <HuespedEditForm huespedId={id} initial={initial} />
    </div>
  );
}
