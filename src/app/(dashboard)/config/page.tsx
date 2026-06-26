import { Download, ShieldCheck, BookOpen, Mail, CloudUpload, Settings } from 'lucide-react';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { PageHeader } from '@/components/ui/page-header';
import { CollapsibleCard } from '@/components/ui/collapsible-card';
import { ConfigForm } from '@/components/config/config-form';
import { BackupEmailButton } from '@/components/config/backup-email-button';
import { DriveConnect } from '@/components/config/drive-connect';

export const dynamic = 'force-dynamic';

const DRIVE_MSG: Record<string, { tone: 'ok' | 'err'; text: string }> = {
  ok: { tone: 'ok', text: 'Google Drive connectat correctament.' },
  error: { tone: 'err', text: "No s'ha pogut connectar amb Google Drive. Torna-ho a provar." },
  noconfig: { tone: 'err', text: 'Falten les credencials de Google (GOOGLE_CLIENT_ID i GOOGLE_CLIENT_SECRET) a Vercel.' },
  norefresh: { tone: 'err', text: "Google no ha donat perms d'accs continu. Reconnecta i accepta tots els permisos." },
};

export default async function ConfigPage({
  searchParams,
}: {
  searchParams: Promise<{ drive?: string }>;
}) {
  const user = await getSessionUser();
  if (user?.role !== 'ADMIN') {
    return (
      <div>
        <PageHeader title="Configuració" />
        <p className="text-sm text-red-600">Només els administradors poden accedir a la configuració.</p>
      </div>
    );
  }

  const sp = await searchParams;
  const est = await prisma.establiment.findFirst({ select: { driveRefreshTokenEnc: true } });
  const driveConnectada = Boolean(est?.driveRefreshTokenEnc);
  const driveMsg = sp.drive ? DRIVE_MSG[sp.drive] : null;

  return (
    <div className="space-y-4">
      <PageHeader title="Configuració" subtitle="Establiment, Mossos, facturació i RGPD" />

      <CollapsibleCard
        title="Dades de l'establiment"
        icon={<Settings className="h-4 w-4 text-brand-600" />}
      >
        <ConfigForm />
      </CollapsibleCard>

      <CollapsibleCard
        title="Còpia automàtica a Google Drive"
        icon={<CloudUpload className="h-4 w-4 text-brand-600" />}
      >
        <div className="space-y-3">
          {driveMsg && (
            <p className={driveMsg.tone === 'ok' ? 'text-sm text-green-700' : 'text-sm text-red-600'}>
              {driveMsg.text}
            </p>
          )}
          <DriveConnect connectada={driveConnectada} />
        </div>
      </CollapsibleCard>

      <CollapsibleCard
        title="Còpia de seguretat de les dades"
        icon={<ShieldCheck className="h-4 w-4 text-brand-600" />}
      >
        <div className="space-y-3 text-sm text-slate-600">
          <p>
            Les dades viuen en una base de dades PostgreSQL gestionada (Supabase) amb còpies
            automàtiques. A més, pots descarregar una <strong>còpia completa en JSON</strong> i
            guardar-la on vulguis (disc, Google Drive&hellip;).
          </p>
          <a
            href="/api/backup"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
          >
            <Download className="h-4 w-4" /> Descarregar còpia (JSON)
          </a>

          <div className="mt-4 flex items-start gap-2 rounded-lg border border-brand-100 bg-brand-50 px-3 py-2">
            <Mail className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
            <div className="space-y-2">
              <p className="text-brand-900">
                <strong>Còpia automàtica mensual per correu.</strong> Cada dia 1 de mes s&apos;envia la
                còpia completa a <strong>hostalcoll@gmail.com</strong>. Prova-ho ara:
              </p>
              <BackupEmailButton />
              <p className="text-xs text-brand-700">
                Requereix configurar el servei de correu (variable <code>RESEND_API_KEY</code>). Si
                encara no està, el botó t&apos;ho indicarà i la descàrrega manual segueix funcionant.
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-400">
            La còpia inclou totes les taules (hostes, estades, factures, despeses, dipòsits, avisos,
            mascotes&hellip;) i no conté contrasenyes. Queda registrada a l&apos;auditoria.
          </p>
        </div>
      </CollapsibleCard>

      <CollapsibleCard
        title="Guia d'ús"
        icon={<BookOpen className="h-4 w-4 text-brand-600" />}
      >
        <div className="space-y-3 text-sm text-slate-600">
          <p>Manual en PDF que explica què hi ha a cada secció i què fa. Sempre actualitzat.</p>
          <a
            href="/api/guia"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <BookOpen className="h-4 w-4" /> Obrir la guia (PDF)
          </a>
        </div>
      </CollapsibleCard>
    </div>
  );
}
