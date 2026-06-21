import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { audit } from '@/lib/audit';
import { ok } from '@/lib/http';
import { formatDate } from '@/lib/utils';
import { PARENTESC_LABELS, TIPUS_DOCUMENT_LABELS, TIPUS_REGISTRE_LABELS } from '@/lib/validation/enums';

// GET /api/llibre?desde=&fins=&format=csv — libro de registro (conservar 3 años §2.4)
export async function GET(req: Request) {
  const auth = await authorize();
  if (auth instanceof Response) return auth;

  const url = new URL(req.url);
  const desde = url.searchParams.get('desde');
  const fins = url.searchParams.get('fins');
  const format = url.searchParams.get('format');

  const where: { deletedAt: null; dataEntrada?: { gte?: Date; lte?: Date } } = { deletedAt: null };
  if (desde || fins) {
    where.dataEntrada = {};
    if (desde) where.dataEntrada.gte = new Date(desde);
    if (fins) where.dataEntrada.lte = new Date(fins);
  }

  const estancies = await prisma.estancia.findMany({
    where,
    orderBy: { dataEntrada: 'asc' },
    include: { viatgers: { include: { huesped: true }, orderBy: { esTitular: 'desc' } } },
  });

  const rows = estancies.flatMap((e) =>
    e.viatgers.map((ev) => {
      const h = ev.huesped;
      return {
        tipusRegistre: TIPUS_REGISTRE_LABELS[e.tipusRegistre],
        numContracte: `${e.numContracte}/${e.anyContracte}`,
        dataEntrada: formatDate(e.dataEntrada),
        dataSortida: formatDate(e.dataSortida),
        nom: h.nom,
        cognom1: h.cognom1,
        cognom2: h.cognom2 ?? '',
        tipusDocument: h.tipusDocument ? TIPUS_DOCUMENT_LABELS[h.tipusDocument] : '',
        numDocument: h.numDocument ?? '',
        numSuport: h.numSuport ?? '',
        dataNaixement: formatDate(h.dataNaixement),
        nacionalitat: h.nacionalitat ?? '',
        adreca: h.adreca ?? '',
        municipi: h.municipi ?? h.localitat ?? '',
        codiPostal: h.codiPostal ?? '',
        esTitular: ev.esTitular ? 'Sí' : '',
        parentesc: ev.parentesc ? PARENTESC_LABELS[ev.parentesc] : '',
      };
    }),
  );

  await audit({
    usuariId: auth.id,
    accio: 'DESCARREGA',
    entitat: 'llibre',
    detall: { desde, fins, files: rows.length },
    ip: clientIp(req),
  });

  if (format === 'csv') {
    const headers = Object.keys(
      rows[0] ?? {
        tipusRegistre: '',
        numContracte: '',
        dataEntrada: '',
        dataSortida: '',
        nom: '',
        cognom1: '',
        cognom2: '',
        tipusDocument: '',
        numDocument: '',
        numSuport: '',
        dataNaixement: '',
        nacionalitat: '',
        adreca: '',
        municipi: '',
        codiPostal: '',
        esTitular: '',
        parentesc: '',
      },
    );
    const escape = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
    const csv = [
      headers.join(';'),
      ...rows.map((r) => headers.map((k) => escape((r as Record<string, string>)[k] ?? '')).join(';')),
    ].join('\r\n');
    return new NextResponse('﻿' + csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="llibre-registre.csv"`,
      },
    });
  }

  return ok({ rows });
}

export const dynamic = 'force-dynamic';
