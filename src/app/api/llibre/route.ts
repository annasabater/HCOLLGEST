import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { audit } from '@/lib/audit';
import { ok } from '@/lib/http';
import { formatDate } from '@/lib/utils';
import { PARENTESC_LABELS, TIPUS_DOCUMENT_LABELS, TIPUS_REGISTRE_LABELS, MIDA_ANIMAL_LABELS } from '@/lib/validation/enums';
import { teVistaRestringida, ocultaDelLlibre } from '@/lib/auth/restriccions';
import { viatgerEfectiu } from '@/lib/registre-snapshot';

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
    include: {
      viatgers: {
        include: { huesped: { include: { animals: { where: { deletedAt: null } } } } },
        orderBy: { esTitular: 'desc' },
      },
      enviaments: { orderBy: { createdAt: 'desc' }, take: 1, select: { estat: true } },
    },
  });

  // Vista restringida (propietat): oculta del llibre les estades marcades amb
  // "ZP11" al camp d'observacions (el camp "altres" de l'estada).
  const visibles = teVistaRestringida(auth)
    ? estancies.filter((e) => !ocultaDelLlibre(e.observacions))
    : estancies;

  const rows = visibles.flatMap((e) =>
    e.viatgers.map((ev) => {
      // Estades antigues: usa les dades congelades (no reescriure el passat).
      const h = viatgerEfectiu(ev.huesped, ev.dadesCongelades);
      const mascotes = h.animals
        .map((a) => `${a.nom}${a.mida ? ` (${MIDA_ANIMAL_LABELS[a.mida]})` : ''}`)
        .join(', ');
      return {
        // Metadades per a les accions del llibre (no formen part del registre legal → fora del CSV).
        estanciaId: e.id,
        enviamentEstat: e.enviaments[0]?.estat ?? '',
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
        mascotes,
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
    // El CSV és el registre legal: només els camps del registre, sense metadades d'UI.
    const csvExclude = new Set(['estanciaId', 'enviamentEstat']);
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
        mascotes: '',
      },
    ).filter((k) => !csvExclude.has(k));
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
