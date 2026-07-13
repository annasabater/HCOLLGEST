import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { teVistaRestringida } from '@/lib/auth/restriccions';
import { PageHeader } from '@/components/ui/page-header';
import { FinancesNav } from '@/components/balanc/finances-nav';
import { Table, Thead, Th, Td, Tr, EmptyState } from '@/components/ui/table';
import { Eur, HideAmountsButton } from '@/components/finances/amounts-visibility';
import { EstatFacturaToggle, EliminarFacturaIcona } from '@/components/factura/factures-llista-accions';
import { FacturaFiltreTipus } from '@/components/factura/factura-filtre-tipus';
import { EnviarCorreuButton } from '@/components/justificants/enviar-correu-button';
import { FitxaExpandible } from '@/components/justificants/fitxa-expandible';
import { formatDate } from '@/lib/utils';
import { estatFacturaLabel } from '@/lib/factura-display';
import type { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

export default async function FacturesPage({
  searchParams,
}: {
  searchParams: Promise<{ tipus?: string }>;
}) {
  const user = await getSessionUser();
  const restringit = teVistaRestringida(user);

  // Filtre per tipus: simplificades (i rebuts) / fiscals / totes.
  const sp = await searchParams;
  const tipusParam = sp.tipus === 'simples' || sp.tipus === 'fiscals' ? sp.tipus : 'totes';
  const filtreTipus: Prisma.FacturaWhereInput =
    tipusParam === 'fiscals'
      ? { tipusDocument: 'FACTURA' }
      : tipusParam === 'simples'
      ? { tipusDocument: { not: 'FACTURA' } }
      : {};

  const totes = await prisma.factura.findMany({
    where: { deletedAt: null, ...filtreTipus },
    orderBy: { data: 'desc' },
    take: 100,
    include: {
      estancia: {
        include: {
          viatgers: { include: { huesped: true }, orderBy: { esTitular: 'desc' } },
          diposits: { where: { estat: 'EN_CUSTODIA' } },
        },
      },
    },
  });
  // Vista restringida de propietat: amaga les factures d'estades amb fiança en
  // custòdia (les que tenen un dipòsit EN_CUSTODIA).
  const factures = restringit ? totes.filter((f) => f.estancia.diposits.length === 0) : totes;

  const pendents = factures.filter((f) => f.estat === 'PENDENT');
  const totalPendent = pendents.reduce((a, f) => a + Number(f.total), 0);

  return (
    <div>
      <PageHeader
        title="Facturació"
        subtitle={
          <>
            {factures.length} factures · <Eur value={totalPendent} /> pendent de cobrament
          </>
        }
        actions={<HideAmountsButton />}
      />

      <FinancesNav />

      <FacturaFiltreTipus actual={tipusParam} />

      {factures.length === 0 ? (
        <EmptyState>
          {tipusParam === 'fiscals'
            ? 'Cap factura fiscal.'
            : tipusParam === 'simples'
            ? 'Cap factura simplificada.'
            : 'Encara no hi ha factures. Crea’n una des d’una estada.'}
        </EmptyState>
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th>Número</Th>
              <Th>Titular</Th>
              <Th>Data</Th>
              <Th>Base</Th>
              <Th>Total</Th>
              <Th>Estat</Th>
              <Th className="text-right">Accions</Th>
            </tr>
          </Thead>
          <tbody>
            {factures.map((f) => {
              const vTitular = f.estancia.viatgers.find((v) => v.esTitular) ?? f.estancia.viatgers[0];
              const t = vTitular?.huesped;
              // El número obre directament la factura impresa (fiscal o simple).
              const printUrl = f.tipusDocument === 'FACTURA'
                ? `/imprimir/factura/${f.id}`
                : `/imprimir/factura-simple/${f.id}`;
              return (
                <Tr key={f.id}>
                  <Td>
                    <a
                      href={printUrl}
                      target="_blank"
                      rel="noreferrer"
                      title="Obrir la factura"
                      className="font-medium text-brand-700 hover:underline"
                    >
                      {f.numero.replace(/^\d{4}-/, '')}
                    </a>
                    {f.fiancaInclosa === true && (
                      <span className="ml-1 inline-flex items-center rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-amber-200">
                        Fiança
                      </span>
                    )}
                    {f.fiancaInclosa === false && (
                      <span className="ml-1 inline-flex items-center rounded-full bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 ring-1 ring-slate-200">
                        Sense fiança
                      </span>
                    )}
                    {Number(f.total) < 0 && (
                      <span className="ml-1 inline-flex items-center rounded-full bg-rose-50 px-1.5 py-0.5 text-[10px] font-medium text-rose-700 ring-1 ring-rose-200">
                        Devolució
                      </span>
                    )}
                  </Td>
                  <Td>
                    {t ? (
                      <FitxaExpandible
                        estanciaId={f.estancia.id}
                        titular={`${t.nom} ${t.cognom1}`}
                        numContracte={f.estancia.numContracte}
                        anyContracte={f.estancia.anyContracte}
                        viatgers={f.estancia.viatgers.filter((v) => v.huesped).map((v) => ({
                          id: v.huesped!.id,
                          nom: v.huesped!.nom,
                          cognom1: v.huesped!.cognom1,
                          cognom2: v.huesped?.cognom2 ?? null,
                          esTitular: v.esTitular,
                        }))}
                      />
                    ) : (
                      '—'
                    )}
                  </Td>
                  <Td>{formatDate(f.data)}</Td>
                  <Td><Eur value={Number(f.base)} /></Td>
                  <Td className="font-medium"><Eur value={Number(f.total)} /></Td>
                  <Td>
                    {restringit ? (
                      <span>{estatFacturaLabel(f.estat, Number(f.total))}</span>
                    ) : (
                      <EstatFacturaToggle id={f.id} estat={f.estat} total={Number(f.total)} />
                    )}
                  </Td>
                  <Td className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <EnviarCorreuButton apiUrl={`/api/factures/${f.id}/email`} />
                      {!restringit && <EliminarFacturaIcona id={f.id} numero={f.numero} />}
                    </div>
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
