/**
 * Dades de demo extra: identificadors de l'establiment inventats (el seed porta
 * els reals). S'executa després de demo-data.ts. NOMÉS contra la BD de proves.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const URL_LOCAL = 'postgresql://manual:manual@localhost:5433/hostalcoll_manual';
const prisma = new PrismaClient({ datasources: { db: { url: URL_LOCAL } } });

async function main() {
  await prisma.establiment.updateMany({
    data: { cif: '00000000T', idPolicial: '000000000', fileIdentifier: 'DEMO000001' },
  });
  console.log('✓ Establiment amb identificadors de demostració');
  // Tots els usuaris de la BD de proves amb la mateixa contrasenya de proves.
  const hash = await bcrypt.hash('Manual2026!', 10);
  await prisma.usuari.updateMany({ data: { passwordHash: hash, failedLogins: 0, lockedUntil: null } });
  console.log('✓ Usuaris de proves amb la contrasenya de proves');
}

main().finally(() => prisma.$disconnect());
