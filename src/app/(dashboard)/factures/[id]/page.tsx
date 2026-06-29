import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CheckCircle, Clock, ExternalLink } from 'lucide-react';
import { BackLink } from '@/components/ui/back-link';
import { prisma } from '@/lib/db';
import { Card, CardBody } from '@/components/ui/card';
import { ToggleEstatFactura } from '@/components/factura/toggle-estat-factura';
import { LiniesCard } from '@/components/factura/linies-card';
import { EliminarFactura } from '@/components/factura/eliminar-factura';
import { EditarNumeroFactura } from '@/components/factura/editar-numero-factura';
import { FiancaTogglePrint } from '@/components/factura/fianca-toggle-print';
import { formatEur } from '@/lib/utils';

export const dynamic = 'force-dynamic';

function fmtDate(d: Date) {
  return d.toLocaleDateString('ca-ES', { day: '2-digit', month: 'long', year: 'numeric' });
}

export default async function FacturaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const factura = await prisma.factura.findFirst({
    where: { id, deletedAt: null },
    include: {
      linies: true,
      estancia: {
        include: {
          viatgers: { where: { esTitular: true }, include: { huesped: true } },
          habitacio: { select: { nom: true } },
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

  const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
  const ivaPercent = base > 0 ? round2((iva / base) * 100) : 0;
  const tasaTotal = round2(total - base - iva);
  const editable = !factura.verifactu;
  const cobrada = factura.estat === 'COBRADA';

  return (
    <div className="space-y-6">
      <BackLink fallback="/factures">Facturació</BackLink>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Columna principal ─────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Capçalera */}
          <div className="space-y-1">
            <EditarNumeroFactura facturaId={factura.id} numero={factura.numero} />
            {titular && (
              <p className="text-base text-slate-500 font-medium">
                {titular.nom} {titular.cognom1} {titular.cognom2 ?? ''}
              </p>
            )}
            <div className="flex items-center gap-3 text-sm text-slate-400">
              {factura.estancia.habitacio && (
                <>
                  <span>Hab. {factura.estancia.habitacio.nom}</span>
                  <span>·</span>
                </>
              )}
              <span>{fmtDate(factura.data)}</span>
            </div>
          </div>

          {/* Línies */}
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

          {/* Eliminar */}
          <div className="pt-2">
            <EliminarFactura
              id={factura.id}
              numero={factura.numero}
              redirectTo={`/estancies/${factura.estanciaId}`}
              teVerifactu={!!factura.verifactu}
            />
          </div>
        </div>

        {/* ── Barra lateral ─────────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Estat + total */}
          <Card>
            <CardBody className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Estat</span>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${cobrada ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                  {cobrada
                    ? <><CheckCircle className="h-3.5 w-3.5" /> Cobrada</>
                    : <><Clock className="h-3.5 w-3.5" /> Pendent</>}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-sm text-slate-500">Total</span>
                <span className="text-xl font-semibold text-slate-900">{formatEur(total)}</span>
              </div>
              <ToggleEstatFactura facturaId={factura.id} estat={factura.estat} />
            </CardBody>
          </Card>

          {/* Imprimir amb toggle fiança */}
          <Card>
            <CardBody>
              <FiancaTogglePrint
                facturaId={factura.id}
                fiancaInclosa={factura.fiancaInclosa}
              />
            </CardBody>
          </Card>

          {/* Estada */}
          <Card>
            <CardBody>
              <Link
                href={`/estancies/${factura.estanciaId}`}
                className="flex items-center justify-between text-sm text-slate-600 hover:text-brand-700"
              >
                <span>Veure estada</span>
                <ExternalLink className="h-4 w-4" />
              </Link>
            </CardBody>
          </Card>

        </div>
      </div>
    </div>
  );
}
