import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Printer, FileText, ShieldAlert, ShieldCheck } from 'lucide-react';
import { BackLink } from '@/components/ui/back-link';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { ToggleEstatFactura } from '@/components/factura/toggle-estat-factura';
import { LiniesCard } from '@/components/factura/linies-card';
import { EliminarFactura } from '@/components/factura/eliminar-factura';

export const dynamic = 'force-dynamic';

const DOC_LABEL: Record<string, string> = {
  RECIBO: 'Recibo',
  FACTURA: 'Factura fiscal',
  FACTURA_SIMPLIFICADA: 'Factura simplificada (F2)',
};

export default async function FacturaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const factura = await prisma.factura.findFirst({
    where: { id, deletedAt: null },
    include: {
      linies: true,
      estancia: {
        include: {
          viatgers: { where: { esTitular: true }, include: { huesped: true } },
        },
      },
      verifactu: true,
    },
  });
  if (!factura) notFound();

  const titular = factura.estancia.viatgers[0]?.huesped;
  const base = Number(factura.base);
  const iva = Number(factura.iva);
  const total = Number(factura.total);

  // Derivats per a l'edició: el % d'IVA i la tassa es conserven en editar línies.
  const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
  const ivaPercent = base > 0 ? round2((iva / base) * 100) : 0;
  const tasaTotal = round2(total - base - iva);
  // Editables totes les factures excepte les que ja han generat registre Veri*Factu.
  const editable = !factura.verifactu;

  return (
    <div>
      <BackLink fallback="/factures">Facturació</BackLink>
      <PageHeader
        title={`Factura ${factura.numero}`}
        subtitle={titular ? `${titular.nom} ${titular.cognom1}` : undefined}
        actions={
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Badge tone="neutral">{DOC_LABEL[factura.tipusDocument] ?? factura.tipusDocument}</Badge>
              <Badge tone={factura.estat === 'COBRADA' ? 'success' : 'warning'}>
                {factura.estat === 'COBRADA' ? 'Cobrada' : 'Pendent'}
              </Badge>
            </div>
            {/* Fila 1: amb fiança (amber) */}
            <div className="flex items-center gap-2">
              <Link
                href={`/imprimir/factura/${factura.id}?fianca=true`}
                target="_blank"
                className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-100"
              >
                <ShieldCheck className="h-4 w-4" /> Factura fiscal amb fiança
              </Link>
              <Link
                href={`/imprimir/factura-simple/${factura.id}?custodia=true`}
                target="_blank"
                className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-100"
              >
                <ShieldAlert className="h-4 w-4" /> Factura simple amb fiança
              </Link>
              <EliminarFactura
                id={factura.id}
                numero={factura.numero}
                redirectTo={`/estancies/${factura.estanciaId}`}
                teVerifactu={!!factura.verifactu}
              />
            </div>
            {/* Fila 2: sense fiança (muted) */}
            <div className="flex items-center gap-2">
              <Link
                href={`/imprimir/factura/${factura.id}`}
                target="_blank"
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                <Printer className="h-4 w-4" /> Factura fiscal
              </Link>
              <Link
                href={`/imprimir/factura-simple/${factura.id}`}
                target="_blank"
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                <FileText className="h-4 w-4" /> Factura simple
              </Link>
            </div>
          </div>
        }
      />

      <div className="max-w-2xl space-y-4">
        <LiniesCard
          facturaId={factura.id}
          linies={factura.linies.map((l) => ({
            id: l.id,
            concepte: l.concepte,
            descripcio: l.descripcio,
            import: Number(l.import),
          }))}
          base={base}
          iva={iva}
          total={total}
          ivaPercent={ivaPercent}
          tasaTotal={tasaTotal}
          editable={editable}
        />
        <ToggleEstatFactura facturaId={factura.id} estat={factura.estat} />
      </div>

    </div>
  );
}
