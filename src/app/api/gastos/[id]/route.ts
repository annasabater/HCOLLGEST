import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { authorize, clientIp } from '@/lib/auth/guard';
import { ROLES_WRITE } from '@/lib/auth/rbac';
import { audit } from '@/lib/audit';
import { handleApiError, noContent, ok } from '@/lib/http';
import { GastoUpdateSchema } from '@/lib/validation/gasto';
import { campsIva } from '@/lib/gasto-iva';
import { buscaDuplicats, respostaDuplicat } from '@/lib/services/gasto-duplicats';

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/gastos/:id — edita una despesa (p. ex. marcar/desmarcar com a fiança).
export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;
    const body = await req.json().catch(() => null);
    const input = GastoUpdateSchema.parse(body);

    const data: Prisma.GastoUpdateInput = {};
    if (input.data !== undefined) data.data = input.data;
    if (input.import !== undefined) data.import = input.import;
    if (input.descripcio !== undefined) data.descripcio = input.descripcio;
    if (input.numFactura !== undefined) data.numFactura = input.numFactura ?? null;
    if (input.metodePagament !== undefined) data.metodePagament = input.metodePagament;
    if (input.esFianca !== undefined) data.esFianca = input.esFianca;
    if (input.categoriaId !== undefined) data.categoria = { connect: { id: input.categoriaId } };
    // Adjunt substituït des del formulari d'editar.
    if (input.adjuntPath !== undefined) data.adjuntPath = input.adjuntPath;

    // IVA: si arriba desglossament (2+ línies) mana; si arriben base/% simples
    // (o un desglossament buit), es torna a una sola base i s'esborra el desglossament.
    const ivaRaw = (body ?? {}) as Record<string, unknown>;
    if ('irpfPercent' in ivaRaw) data.irpfPercent = input.irpfPercent ?? null;
    if (input.desglossamentIva !== undefined || 'baseImposable' in ivaRaw || 'ivaPercent' in ivaRaw) {
      const c = input.desglossamentIva ? campsIva(input.desglossamentIva) : null;
      if (c?.desglossamentIva) {
        data.baseImposable = c.baseImposable;
        data.ivaPercent = null;
        data.desglossamentIva = c.desglossamentIva;
      } else {
        data.baseImposable = input.baseImposable ?? c?.baseImposable ?? null;
        data.ivaPercent = input.ivaPercent ?? c?.ivaPercent ?? null;
        data.desglossamentIva = Prisma.DbNull;
      }
    }

    // Proveïdor i habitació: es llegeixen del body cru per poder-los CANVIAR o
    // BUIDAR ('' → sense proveïdor/general). L'esquema optStr no distingeix buit.
    const raw = (body ?? {}) as Record<string, unknown>;
    if ('proveidorId' in raw) data.proveidor = raw.proveidorId ? { connect: { id: String(raw.proveidorId) } } : { disconnect: true };
    if ('habitacioId' in raw) data.habitacio = raw.habitacioId ? { connect: { id: String(raw.habitacioId) } } : { disconnect: true };

    // Avís de factura repetida si canvia la data, l'import, el número o el proveïdor
    // i queda igual que una altra despesa.
    if (!input.ignoraDuplicat) {
      const actual = await prisma.gasto.findUnique({
        where: { id },
        select: { data: true, import: true, numFactura: true, proveidorId: true },
      });
      if (actual) {
        const nou = {
          data: input.data ?? actual.data,
          import: input.import ?? Number(actual.import),
          numFactura: input.numFactura !== undefined ? input.numFactura ?? null : actual.numFactura,
          proveidorId: 'proveidorId' in raw ? (raw.proveidorId ? String(raw.proveidorId) : null) : actual.proveidorId,
        };
        const canvia =
          nou.data.toISOString().slice(0, 10) !== actual.data.toISOString().slice(0, 10) ||
          Math.abs(nou.import - Number(actual.import)) >= 0.005 ||
          (nou.numFactura ?? '') !== (actual.numFactura ?? '') ||
          nou.proveidorId !== actual.proveidorId;
        if (canvia) {
          const duplicats = await buscaDuplicats(nou, id);
          if (duplicats.length > 0) return respostaDuplicat(duplicats);
        }
      }
    }

    const gasto = await prisma.gasto.update({ where: { id }, data });
    await audit({
      usuariId: auth.id,
      accio: 'MODIFICACIO',
      entitat: 'gasto',
      entitatId: id,
      detall: { esFianca: input.esFianca, iva: input.desglossamentIva ?? input.ivaPercent },
      ip: clientIp(req),
    });
    return ok({ gasto });
  } catch (err) {
    return handleApiError(err);
  }
}

// DELETE /api/gastos/:id — borrado lógico
export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const auth = await authorize(ROLES_WRITE);
    if (auth instanceof Response) return auth;
    const { id } = await ctx.params;
    await prisma.gasto.update({ where: { id }, data: { deletedAt: new Date() } });
    await audit({
      usuariId: auth.id,
      accio: 'ELIMINACIO',
      entitat: 'gasto',
      entitatId: id,
      ip: clientIp(req),
    });
    return noContent();
  } catch (err) {
    return handleApiError(err);
  }
}

export const dynamic = 'force-dynamic';
