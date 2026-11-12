import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { hasRole, ROLES_WRITE } from '@/lib/auth/rbac';
import { llistaRecordatoris } from '@/lib/services/recordatoris';
import { RecordatorisLlista } from '@/components/recordatori/llista';

export const dynamic = 'force-dynamic';

export default async function RecordatorisPage() {
  const [user, dades, est, mobils] = await Promise.all([
    getSessionUser(),
    llistaRecordatoris(),
    prisma.establiment.findFirst({ select: { whatsappActiu: true, googleCalendarTokenEnc: true, googleCalendarId: true } }),
    prisma.pushSubscripcio.count({ where: { resumMati: true } }),
  ]);
  return (
    <RecordatorisLlista
      avui={dades.avui}
      pendents={dades.pendents}
      fets={dades.fets}
      canWrite={user ? hasRole(user.role, ROLES_WRITE) : false}
      mobilActiu={mobils > 0 || !!est?.whatsappActiu}
      calendariConnectat={!!(est?.googleCalendarTokenEnc && est.googleCalendarId)}
    />
  );
}
