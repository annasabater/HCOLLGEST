/**
 * Construcció de la còpia de seguretat completa (totes les taules) en un objecte
 * serialitzable a JSON. No inclou contrasenyes. Reutilitzat per la descàrrega
 * manual (/api/backup) i la còpia automàtica per correu (/api/cron/backup).
 */
import 'server-only';
import { prisma } from '../db';

export async function buildBackupPayload() {
  const [
    establiment,
    usuari,
    huesped,
    documentoPujat,
    estancia,
    estanciaViatger,
    signatura,
    enviamentMossos,
    anotacioHuesped,
    habitacio,
    tascaNeteja,
    animal,
    factura,
    liniaFactura,
    tasaTuristica,
    cobrament,
    diposit,
    registreVerifactu,
    categoriaGasto,
    proveidor,
    gasto,
    actiu,
    actiuHistorial,
    treballador,
    jornada,
    absencia,
    nomina,
    avis,
    auditLog,
  ] = await Promise.all([
    prisma.establiment.findMany(),
    prisma.usuari.findMany({
      select: { id: true, email: true, nom: true, role: true, actiu: true, createdAt: true, updatedAt: true, deletedAt: true },
    }),
    prisma.huesped.findMany(),
    prisma.documentoPujat.findMany(),
    prisma.estancia.findMany(),
    prisma.estanciaViatger.findMany(),
    prisma.signatura.findMany(),
    prisma.enviamentMossos.findMany(),
    prisma.anotacioHuesped.findMany(),
    prisma.habitacio.findMany(),
    prisma.tascaNeteja.findMany(),
    prisma.animal.findMany(),
    prisma.factura.findMany(),
    prisma.liniaFactura.findMany(),
    prisma.tasaTuristica.findMany(),
    prisma.cobrament.findMany(),
    prisma.diposit.findMany(),
    prisma.registreVerifactu.findMany(),
    prisma.categoriaGasto.findMany(),
    prisma.proveidor.findMany(),
    prisma.gasto.findMany(),
    prisma.actiu.findMany(),
    prisma.actiuHistorial.findMany(),
    prisma.treballador.findMany(),
    prisma.jornada.findMany(),
    prisma.absencia.findMany(),
    prisma.nomina.findMany(),
    prisma.avis.findMany(),
    prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 20000 }),
  ]);

  const tables = {
    establiment,
    usuari,
    huesped,
    documentoPujat,
    estancia,
    estanciaViatger,
    signatura,
    enviamentMossos,
    anotacioHuesped,
    habitacio,
    tascaNeteja,
    animal,
    factura,
    liniaFactura,
    tasaTuristica,
    cobrament,
    diposit,
    registreVerifactu,
    categoriaGasto,
    proveidor,
    gasto,
    actiu,
    actiuHistorial,
    treballador,
    jornada,
    absencia,
    nomina,
    avis,
    auditLog,
  };

  return { app: 'hostalcoll-gestion', version: 1, exportedAt: new Date().toISOString(), tables };
}

export function backupFilename(date = new Date()): string {
  return `backup-hostalcoll-${date.toISOString().slice(0, 10)}.json`;
}
