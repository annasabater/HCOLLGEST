import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { esDuplicat, type DadesGasto } from '@/lib/gasto-duplicat';

export interface GastoDuplicat {
  id: string;
  data: string; // ISO
  import: number;
  numFactura: string | null;
  proveidor: string | null;
  descripcio: string;
  esFianca: boolean;
}

const dia = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Despeses ja pujades que semblen la mateixa factura que `nou` (vegeu
 * `esDuplicat`). `excloureId`: la mateixa despesa quan s'edita.
 */
export async function buscaDuplicats(
  nou: { data: Date; import: number; numFactura?: string | null; proveidorId?: string | null },
  excloureId?: string,
): Promise<GastoDuplicat[]> {
  const candidats = await prisma.gasto.findMany({
    where: {
      deletedAt: null,
      ...(excloureId ? { id: { not: excloureId } } : {}),
      OR: [...(nou.proveidorId ? [{ proveidorId: nou.proveidorId }] : []), { import: nou.import }],
    },
    orderBy: { data: 'desc' },
    take: 500,
    select: {
      id: true,
      data: true,
      import: true,
      numFactura: true,
      proveidorId: true,
      descripcio: true,
      esFianca: true,
      proveidor: { select: { nom: true } },
    },
  });
  const dadesNou: DadesGasto = { dia: dia(nou.data), import: nou.import, numFactura: nou.numFactura, proveidorId: nou.proveidorId };
  return candidats
    .filter((g) =>
      esDuplicat(dadesNou, { dia: dia(g.data), import: Number(g.import), numFactura: g.numFactura, proveidorId: g.proveidorId }),
    )
    .slice(0, 5)
    .map((g) => ({
      id: g.id,
      data: g.data.toISOString(),
      import: Number(g.import),
      numFactura: g.numFactura,
      proveidor: g.proveidor?.nom ?? null,
      descripcio: g.descripcio,
      esFianca: g.esFianca,
    }));
}

/** 409 amb les despeses que semblen la mateixa factura (el client mostra l'avís). */
export function respostaDuplicat(duplicats: GastoDuplicat[]) {
  return NextResponse.json(
    { error: 'Sembla que aquesta factura ja està pujada', details: { code: 'DUPLICAT', duplicats } },
    { status: 409 },
  );
}
