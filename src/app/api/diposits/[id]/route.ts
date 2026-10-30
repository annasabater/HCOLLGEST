import { prisma } from '@/lib/db';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { handleApiError, notFound, ok } from '@/lib/http';
import { DipositResolSchema, DipositEditSchema } from '@/lib/validation/factura';
import { sincronitzaDevolucioDiposit, sincronitzaDocumentDiposit } from '@/lib/services/factura';

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/diposits/:id
//   - amb `estat` (TORNAT|RETINGUT) → resol el dipòsit
//   - sense `estat` → edita import/mètode/notes (només si està EN_CUSTODIA)
export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;

    const exists = await prisma.diposit.findUnique({ where: { id }, select: { id: true, estat: true, import: true, data: true } });
    if (!exists) return notFound();

    const body = await req.json().catch(() => null);

    // Canvi d'estat (tornar / retenir / tornar a custòdia).
    if (body && typeof body === 'object' && 'estat' in body && body.estat) {
      const data = DipositResolSchema.parse(body);
      const enCustodia = data.estat === 'EN_CUSTODIA';
      const dataResolucio = enCustodia ? null : (data.dataResolucio ?? new Date());
      if (dataResolucio && dataResolucio < new Date(exists.data.toISOString().slice(0, 10))) {
        throw new Error('Validación fallida: la data de devolució o retenció no pot ser anterior a la del dipòsit.');
      }
      // Retenció parcial: només si és menys que el dipòsit (igual = tot, null).
      const retingut = data.estat === 'RETINGUT' && data.importRetingut != null ? data.importRetingut : null;
      if (retingut != null && retingut > Number(exists.import)) {
        throw new Error("Validación fallida: no es pot retenir més del que és el dipòsit.");
      }
      const parcial = retingut != null && retingut < Number(exists.import);
      const diposit = await prisma.$transaction(async (tx) => {
        const d = await tx.diposit.update({
          where: { id },
          data: {
            estat: data.estat,
            motiu: data.estat === 'RETINGUT' ? (data.motiu ?? null) : null,
            // En custòdia no és una resolució: es buida tot el que és de la resolució.
            dataResolucio,
            metodeResolucio: data.estat === 'TORNAT' || parcial ? (data.metodeResolucio ?? null) : null,
            importRetingut: parcial ? retingut : null,
          },
        });
        // Dipòsit amb document: tornar-lo (o la part tornada) crea la «Devolució del dipòsit».
        await sincronitzaDevolucioDiposit(tx, id, auth, clientIp(req));
        return d;
      });
      await audit({
        usuariId: auth.id, accio: 'MODIFICACIO', entitat: 'diposit', entitatId: id,
        detall: { estat: data.estat, dataResolucio, metodeResolucio: diposit.metodeResolucio, importRetingut: parcial ? retingut : null },
        ip: clientIp(req),
      });
      return ok({ diposit });
    }

    // Edició de camps (import/mètode/notes/facturaId) — permesa en qualsevol estat.
    const data = DipositEditSchema.parse(body);
    const diposit = await prisma.$transaction(async (tx) => {
      const d = await tx.diposit.update({
        where: { id },
        data: {
          ...(data.import !== undefined ? { import: data.import } : {}),
          ...(data.metode ? { metode: data.metode } : {}),
          ...(data.notes !== undefined ? { notes: data.notes ?? null } : {}),
          ...(data.data ? { data: data.data } : {}),
          ...('facturaId' in data ? { facturaId: data.facturaId ?? null } : {}),
        },
      });
      // El document de dipòsit (si en té) reflecteix sempre l'import i l'etiqueta.
      await sincronitzaDocumentDiposit(tx, id);
      // I la devolució, si ja s'ha tornat (p. ex. si es corregeix l'import).
      await sincronitzaDevolucioDiposit(tx, id, auth, clientIp(req));
      return d;
    });
    await audit({ usuariId: auth.id, accio: 'MODIFICACIO', entitat: 'diposit', entitatId: id, detall: { camps: Object.keys(data) }, ip: clientIp(req) });
    return ok({ diposit });
  } catch (err) {
    return handleApiError(err);
  }
}

// DELETE /api/diposits/:id — elimina un dipòsit i, si en té, el seu document de
// dipòsit (no quedaria cap document orfe amb un número que ja no correspon a res).
export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;

    const exists = await prisma.diposit.findUnique({
      where: { id },
      select: {
        id: true,
        factura: { select: { id: true, esDiposit: true, verifactu: { select: { id: true } } } },
        devolucio: { select: { id: true, verifactu: { select: { id: true } } } },
      },
    });
    if (!exists) return notFound();
    const doc = exists.factura?.esDiposit && !exists.factura.verifactu ? exists.factura.id : null;
    // La devolució també: sense el dipòsit no té sentit.
    const devolucio = exists.devolucio && !exists.devolucio.verifactu ? exists.devolucio.id : null;
    await prisma.$transaction([
      prisma.diposit.delete({ where: { id } }),
      ...(doc ? [prisma.factura.delete({ where: { id: doc } })] : []),
      ...(devolucio ? [prisma.factura.delete({ where: { id: devolucio } })] : []),
    ]);
    await audit({ usuariId: auth.id, accio: 'ELIMINACIO', entitat: 'diposit', entitatId: id, ip: clientIp(req) });
    return ok({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
