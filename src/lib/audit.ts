/**
 * Registro de auditoría (§7) — toda acción relevante escribe en `audit_log`.
 * ⚠ NUNCA incluir en `detall` credenciales de Mossos ni datos de documentos.
 */
import 'server-only';
import type { AccioAudit, Prisma, PrismaClient } from '@prisma/client';
import { prisma } from './db';

export interface AuditInput {
  usuariId?: string | null;
  accio: AccioAudit;
  entitat: string;
  entitatId?: string | null;
  detall?: Prisma.InputJsonValue;
  ip?: string | null;
}

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Escribe una entrada de auditoría. Acepta un client de transacción para
 * que la auditoría sea atómica con la operación que la genera.
 */
export async function audit(input: AuditInput, db: Db = prisma): Promise<void> {
  await db.auditLog.create({
    data: {
      usuariId: input.usuariId ?? null,
      accio: input.accio,
      entitat: input.entitat,
      entitatId: input.entitatId ?? null,
      detall: input.detall,
      ip: input.ip ?? null,
    },
  });
}
