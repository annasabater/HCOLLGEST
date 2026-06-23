import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import QRCode from 'qrcode';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, Thead, Th, Td, Tr } from '@/components/ui/table';
import { CobramentActions } from '@/components/factura/cobrament-actions';
import { EliminarFactura } from '@/components/factura/eliminar-factura';
import { formatDate, formatEur } from '@/lib/utils';
import { CONCEPTE_LINIA_LABELS, METODE_COBRAMENT_LABELS } from '@/lib/validation/enums';
import { VERIFACTU_LLEGENDA } from '@/lib/verifactu/software';

export const dynamic = 'force-dynamic';

const DOC_LABEL: Record<string, string> = {
  RECIBO: 'Recibo',
  FACTURA: 'Factura (F1)',
  FACTURA_SIMPLIFICADA: 'Factura simplificada (F2)',
};

export default async function FacturaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const factura = await prisma.factura.findFirst({
    where: { id, deletedAt: null },
    include: {
      linies: true,
      cobraments: { orderBy: { data: 'asc' } },
      estancia: { include: { viatgers: { where: { esTitular: true }, include: { huesped: true } } } },
      verifactu: true,
    },
  });
  if (!factura) notFound();

  const titular = factura.estancia.viatgers[0]?.huesped;
  const cobrat = factura.cobraments.reduce((a, c) => a + Number(c.import), 0);
  const total = Number(factura.total);
  const pendent = Math.max(0, total - cobrat);

  const qrDataUrl = factura.verifactu
    ? await QRCode.toDataURL(factura.verifactu.qrUrl, { width: 160, margin: 1 })
    : null;

  return (
    <div>
      <Link
        href="/factures"
        className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" /> Facturació
      </Link>
      <PageHeader
        title={`Factura ${factura.numero}`}
        subtitle={titular ? `${titular.nom} ${titular.cognom1}` : undefined}
        actions={
          <div className="flex items-center gap-2">
            <Badge tone="neutral">{DOC_LABEL[factura.tipusDocument] ?? factura.tipusDocument}</Badge>
            <Badge tone={factura.estat === 'COBRADA' ? 'success' : 'warning'}>
              {factura.estat === 'COBRADA' ? 'Cobrada' : 'Pendent'}
            </Badge>
            <EliminarFactura
              id={factura.id}
              numero={factura.numero}
              redirectTo={`/estancies/${factura.estanciaId}`}
              teVerifactu={!!factura.verifactu}
            />
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Línies</CardTitle>
            </CardHeader>
            <CardBody>
              <Table>
                <Thead>
                  <tr>
                    <Th>Concepte</Th>
                    <Th>Descripció</Th>
                    <Th className="text-right">Import</Th>
                  </tr>
                </Thead>
                <tbody>
                  {factura.linies.map((l) => (
                    <Tr key={l.id}>
                      <Td>{CONCEPTE_LINIA_LABELS[l.concepte]}</Td>
                      <Td>{l.descripcio}</Td>
                      <Td className="text-right">{formatEur(Number(l.import))}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
              <dl className="mt-4 space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Base imposable</dt>
                  <dd>{formatEur(Number(factura.base))}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">IVA</dt>
                  <dd>{formatEur(Number(factura.iva))}</dd>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1 text-base font-semibold">
                  <dt>Total</dt>
                  <dd>{formatEur(total)}</dd>
                </div>
              </dl>
            </CardBody>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Cobraments</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Cobrat</span>
                <span>{formatEur(cobrat)}</span>
              </div>
              <div className="flex justify-between text-sm font-medium">
                <span className="text-slate-500">Pendent</span>
                <span className={pendent > 0 ? 'text-amber-600' : 'text-green-600'}>
                  {formatEur(pendent)}
                </span>
              </div>

              {factura.cobraments.length > 0 && (
                <ul className="space-y-1 border-t border-slate-100 pt-2 text-sm">
                  {factura.cobraments.map((c) => {
                    const imp = Number(c.import);
                    const esDevolucio = imp < 0;
                    return (
                      <li key={c.id} className="flex justify-between">
                        <span className="text-slate-600">
                          {esDevolucio && <span className="text-red-600">Devolució · </span>}
                          {METODE_COBRAMENT_LABELS[c.metode]} · {formatDate(c.data)}
                        </span>
                        <span className={esDevolucio ? 'text-red-600' : ''}>{formatEur(imp)}</span>
                      </li>
                    );
                  })}
                </ul>
              )}

              <CobramentActions
                facturaId={factura.id}
                pendent={pendent}
                cobrat={cobrat}
                estat={factura.estat}
              />
            </CardBody>
          </Card>
        </div>
      </div>

      {factura.verifactu && qrDataUrl && (
        <Card className="mt-6 border-brand-200">
          <CardHeader className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-brand-600" />
            <CardTitle>Registre Veri*Factu (AEAT)</CardTitle>
          </CardHeader>
          <CardBody className="flex flex-col gap-6 sm:flex-row">
            <div className="shrink-0 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="QR de cotejo AEAT" width={160} height={160} className="rounded-lg border border-slate-200" />
              <p className="mt-2 max-w-40 text-[11px] text-slate-500">{VERIFACTU_LLEGENDA}</p>
            </div>
            <dl className="grid flex-1 grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs uppercase text-slate-400">Núm. sèrie factura</dt>
                <dd>{factura.verifactu.numSerieFactura}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-slate-400">Tipus (AEAT)</dt>
                <dd>{factura.verifactu.tipusFactura}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-slate-400">Data/hora generació</dt>
                <dd className="text-xs">{factura.verifactu.fechaHoraHuso}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-slate-400">Estat</dt>
                <dd>{factura.verifactu.estat}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs uppercase text-slate-400">Huella (SHA-256)</dt>
                <dd className="break-all font-mono text-xs">{factura.verifactu.huella}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs uppercase text-slate-400">Huella anterior (encadenament)</dt>
                <dd className="break-all font-mono text-xs text-slate-500">
                  {factura.verifactu.huellaAnterior || '— (primer registre)'}
                </dd>
              </div>
            </dl>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
