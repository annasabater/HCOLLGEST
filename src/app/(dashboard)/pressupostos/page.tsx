import Link from 'next/link';
import { Search } from 'lucide-react';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { PageHeader } from '@/components/ui/page-header';
import { FinancesNav } from '@/components/balanc/finances-nav';
import { Table, Thead, Th, Td, Tr, EmptyState } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { NouPressupostButton } from '@/components/pressupost/nou-pressupost-button';
import { formatDate, formatEur } from '@/lib/utils';
import { WhatsappLlistaButton } from '@/components/pressupost/whatsapp-llista-button';
import { missatgePressupost, telefonWhatsApp } from '@/lib/pressupost-whatsapp';
import { idiomaPressupost } from '@/lib/pdf/pressupost';
import { nomPropi } from '@/lib/nom-propi';
import { toISODate } from '@/lib/dates';

export const dynamic = 'force-dynamic';

export default async function PressupostosPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const cerca = q?.trim() ?? '';
  const user = await getSessionUser();
  if (user?.role !== 'ADMIN') redirect('/');

  const pressupostos = await prisma.pressupost.findMany({
    where: {
      deletedAt: null,
      ...(cerca
        ? { OR: [{ numero: { contains: cerca, mode: 'insensitive' as const } }, { clientNom: { contains: cerca, mode: 'insensitive' as const } }] }
        : {}),
    },
    orderBy: { numero: 'desc' },
    take: 200,
    include: {
      linies: { orderBy: { createdAt: 'asc' }, select: { descripcio: true } },
      estancia: {
        select: {
          dataEntrada: true,
          dataSortida: true,
          viatgers: { where: { esTitular: true }, take: 1, select: { huesped: { select: { nom: true, cognom1: true, cognom2: true, telefon: true } } } },
        },
      },
    },
  });

  // Text per defecte del WhatsApp (el mateix que al detall del pressupost).
  const signatura = [user.nom.trim() ? nomPropi(user.nom.trim().split(/\s+/)[0]!) : '', 'Hostal Coll'].filter(Boolean).join(' · ');
  const whatsapp = (p: (typeof pressupostos)[number]) => {
    const t = p.estancia?.viatgers[0]?.huesped ?? null;
    const client = p.clientNom || (t ? [t.nom, t.cognom1, t.cognom2].filter(Boolean).join(' ') : '');
    const entrada = p.entrada ?? p.estancia?.dataEntrada ?? null;
    const sortida = p.sortida ?? p.estancia?.dataSortida ?? null;
    return {
      client,
      telefon: telefonWhatsApp(p.telefon || t?.telefon),
      text: missatgePressupost({
        idioma: idiomaPressupost(p.idioma),
        clientNom: client,
        entrada: entrada ? toISODate(entrada) : null,
        sortida: sortida ? toISODate(sortida) : null,
        linies: p.linies,
        total: Number(p.total),
        iva: Number(p.iva),
        signatura,
      }),
    };
  };

  return (
    <div>
      <PageHeader
        title="Pressupostos"
        subtitle={`${pressupostos.length} pressupostos`}
        actions={<NouPressupostButton />}
      />

      <FinancesNav />

      {/* Plantilla de Finances: sota les pestanyes, sempre la targeta blanca. */}
      <form method="get" className="ui-card mb-4 flex flex-wrap items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-3 sm:px-4">
        <label className="relative min-w-[14rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input name="q" defaultValue={cerca} placeholder="Cerca per número o client…" aria-label="Cerca pressupostos" className="pl-9" />
        </label>
        {cerca && (
          <Link href="/pressupostos" className="text-sm font-semibold text-brand-700 hover:underline">Treu la cerca</Link>
        )}
      </form>

      {pressupostos.length === 0 ? (
        <EmptyState>{cerca ? `Cap pressupost amb «${cerca}».` : 'Encara no hi ha pressupostos. Crea’n un amb «Nou pressupost».'}</EmptyState>
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th>Número</Th>
              <Th>Data</Th>
              <Th>Client</Th>
              <Th className="text-right">Total</Th>
              <Th className="text-center">WhatsApp</Th>
            </tr>
          </Thead>
          <tbody>
            {pressupostos.map((p) => {
              const wa = whatsapp(p);
              return (
              <Tr key={p.id}>
                <Td>
                  <Link href={`/pressupostos/${p.id}`} className="font-medium text-brand-700 hover:underline">
                    {p.numero}
                  </Link>
                </Td>
                <Td>{formatDate(p.data)}</Td>
                <Td>{p.clientNom || '—'}</Td>
                {/* Sempre visible: un pressupost no és un import de caixa (no s'amaga amb l'ull). */}
                <Td className="text-right font-medium">{formatEur(Number(p.total))}</Td>
                <Td className="text-center">
                  <WhatsappLlistaButton id={p.id} telefon={wa.telefon} text={wa.text} client={wa.client} enviat={!!p.whatsappEnviatEl} />
                </Td>
              </Tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </div>
  );
}
