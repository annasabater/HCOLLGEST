import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import QRCode from 'qrcode';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth/session';
import { PrintButton } from '@/components/factura/print-button';
import { formatDate, formatEur } from '@/lib/utils';
import { CONCEPTE_LINIA_LABELS, METODE_COBRAMENT_LABELS } from '@/lib/validation/enums';
import { VERIFACTU_LLEGENDA } from '@/lib/verifactu/software';

export const dynamic = 'force-dynamic';

const DOC: Record<string, string> = {
  RECIBO: 'Rebut',
  FACTURA: 'Factura',
  FACTURA_SIMPLIFICADA: 'Factura simplificada',
};

export default async function ImprimirFacturaPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  const { id } = await params;

  const factura = await prisma.factura.findFirst({
    where: { id, deletedAt: null },
    include: {
      linies: true,
      cobraments: true,
      estancia: {
        include: {
          habitacio: true,
          viatgers: { where: { esTitular: true }, include: { huesped: true } },
        },
      },
      verifactu: true,
    },
  });
  if (!factura) notFound();

  const establiment = await prisma.establiment.findFirst();
  const titular = factura.estancia.viatgers[0]?.huesped ?? null;

  const base = Number(factura.base);
  const iva = Number(factura.iva);
  const total = Number(factura.total);
  const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
  const tassa = round2(total - base - iva);
  const ivaPercent = base > 0 ? round2((iva / base) * 100) : 0;

  const formaPagament = [
    ...new Set(factura.cobraments.filter((c) => Number(c.import) > 0).map((c) => c.metode)),
  ]
    .map((m) => METODE_COBRAMENT_LABELS[m])
    .join(', ');

  const qrDataUrl = factura.verifactu
    ? await QRCode.toDataURL(factura.verifactu.qrUrl, { width: 150, margin: 1 })
    : null;

  const emNom = establiment?.raoSocial || establiment?.nom || 'Hostal Coll';
  const emCpPob = [establiment?.codiPostal, establiment?.poblacio].filter(Boolean).join(' ');

  const clientNom = titular
    ? [titular.nom, titular.cognom1, titular.cognom2].filter(Boolean).join(' ')
    : '—';
  const clientCpPob = titular
    ? [titular.codiPostal, titular.municipi || titular.localitat].filter(Boolean).join(' ')
    : '';

  const periode = `Del ${formatDate(factura.estancia.dataEntrada)} al ${formatDate(
    factura.estancia.dataSortida,
  )}`;

  return (
    <div className="min-h-screen bg-stone-100 font-sans text-slate-800 print:bg-white">
      <style>{`@page { size: A4; margin: 14mm; } @media print { .no-print { display: none !important; } }`}</style>

      {/* Barra d'accions (no s'imprimeix) */}
      <div className="no-print sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-stone-200 bg-white/90 px-5 py-3 backdrop-blur">
        <Link
          href={`/factures/${factura.id}`}
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" /> Tornar a la factura
        </Link>
        <PrintButton />
      </div>

      <div className="px-4 py-8 print:p-0">
        <div className="mx-auto max-w-3xl rounded-sm border border-stone-200 bg-white p-12 shadow-lg print:max-w-none print:border-0 print:p-0 print:shadow-none">
          {/* Membret */}
          <header className="flex items-start justify-between gap-8">
            <div>
              <div className="font-serif text-4xl leading-none text-brand-800">{emNom}</div>
              {establiment?.descriptor && (
                <div className="mt-2 text-[11px] uppercase tracking-[0.2em] text-brand-600">
                  {establiment.descriptor}
                </div>
              )}
            </div>
            <div className="min-w-52 text-right text-xs leading-relaxed text-slate-500">
              {establiment?.cif && <div>NIF {establiment.cif}</div>}
              {establiment?.adreca && <div>{establiment.adreca}</div>}
              {emCpPob && <div>{emCpPob}</div>}
              {establiment?.telefon && <div>Tel. {establiment.telefon}</div>}
            </div>
          </header>

          <div className="relative my-7 border-t-2 border-brand-800">
            <span className="absolute left-0 top-1 block w-16 border-t-[3px] border-brand-500" />
          </div>

          {/* Client + meta */}
          <section className="mb-7 flex items-start justify-between gap-10">
            <div className="max-w-xs">
              <div className="mb-2 text-[10px] uppercase tracking-[0.16em] text-slate-400">
                Facturar a
              </div>
              <div className="font-semibold text-slate-800">{clientNom}</div>
              {titular?.numDocument && <div className="text-sm text-slate-500">NIF {titular.numDocument}</div>}
              {titular?.adreca && <div className="text-sm text-slate-500">{titular.adreca}</div>}
              {clientCpPob && <div className="text-sm text-slate-500">{clientCpPob}</div>}
            </div>
            <div className="min-w-52 text-right">
              <div className="mb-3 font-serif text-2xl tracking-wide text-brand-800">
                {DOC[factura.tipusDocument] ?? 'Factura'}
              </div>
              <div className="flex items-baseline justify-end gap-3 text-sm">
                <span className="text-[10px] uppercase tracking-wider text-slate-400">Número</span>
                <span className="min-w-24 font-semibold text-slate-700">{factura.numero}</span>
              </div>
              <div className="flex items-baseline justify-end gap-3 text-sm">
                <span className="text-[10px] uppercase tracking-wider text-slate-400">Data</span>
                <span className="min-w-24 font-semibold text-slate-700">{formatDate(factura.data)}</span>
              </div>
            </div>
          </section>

          {/* Conceptes */}
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border-b-2 border-brand-800 pb-2 text-left text-[10px] uppercase tracking-wider text-slate-400">
                  Concepte
                </th>
                <th className="border-b-2 border-brand-800 pb-2 text-right text-[10px] uppercase tracking-wider text-slate-400">
                  Import
                </th>
              </tr>
            </thead>
            <tbody>
              {factura.linies.map((l, i) => (
                <tr key={l.id} className="border-b border-stone-200 align-top">
                  <td className="py-3">
                    <div className="font-semibold text-slate-800">
                      {CONCEPTE_LINIA_LABELS[l.concepte]}
                    </div>
                    <div className="text-sm text-slate-500">{l.descripcio}</div>
                    {i === 0 && (
                      <div className="mt-0.5 text-sm text-slate-500">
                        {periode}
                        {factura.estancia.habitacio ? ` · Habitació ${factura.estancia.habitacio.nom}` : ''}
                      </div>
                    )}
                  </td>
                  <td className="w-40 py-3 text-right tabular-nums text-slate-800">
                    {formatEur(Number(l.import))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="ml-auto mt-6 w-72">
            <div className="flex items-center justify-between px-3 py-2 text-sm">
              <span className="text-slate-500">Base imposable</span>
              <span className="font-semibold tabular-nums">{formatEur(base)}</span>
            </div>
            <div className="flex items-center justify-between px-3 py-2 text-sm">
              <span className="text-slate-500">IVA ({ivaPercent}%)</span>
              <span className="font-semibold tabular-nums">{formatEur(iva)}</span>
            </div>
            {tassa > 0 && (
              <div className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="text-slate-500">Tassa turística</span>
                <span className="font-semibold tabular-nums">{formatEur(tassa)}</span>
              </div>
            )}
            <div className="mt-1.5 flex items-center justify-between rounded border-t-2 border-brand-500 bg-brand-50 px-3 py-3">
              <span className="font-serif text-base tracking-wide text-brand-800">Total</span>
              <span className="text-xl font-semibold tabular-nums text-brand-800">{formatEur(total)}</span>
            </div>
          </div>

          {/* Peu */}
          <footer className="mt-10 flex items-end justify-between gap-8 border-t border-stone-200 pt-4">
            <div className="grid max-w-sm grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1 text-sm">
              {formaPagament && (
                <>
                  <span className="text-[10px] uppercase tracking-wider text-slate-400">Forma de pagament</span>
                  <span className="text-slate-600">{formaPagament}</span>
                </>
              )}
              {establiment?.iban && (
                <>
                  <span className="text-[10px] uppercase tracking-wider text-slate-400">IBAN</span>
                  <span className="text-slate-600">{establiment.iban}</span>
                </>
              )}
            </div>
            <div className="whitespace-nowrap font-serif text-base text-brand-800">
              Gràcies per la confiança
            </div>
          </footer>

          {/* Veri*Factu (només factures fiscals) */}
          {factura.verifactu && qrDataUrl && (
            <div className="mt-8 flex items-start gap-4 border-t border-stone-200 pt-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="QR de cotejo AEAT" width={96} height={96} className="rounded border border-stone-200" />
              <div className="text-[10px] leading-relaxed text-slate-400">
                <p className="max-w-md">{VERIFACTU_LLEGENDA}</p>
                <p className="mt-1 break-all font-mono">Empremta: {factura.verifactu.huella}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
