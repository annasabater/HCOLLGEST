/**
 * Crea (o restableix) el compte de propietat amb vista restringida:
 *   hcoll@gmail.com · rol ADMIN · contrasenya de la variable HCOLL_PASSWORD.
 *
 * Entra com l'ADMIN (ho veu tot) però amb tres limitacions definides a
 * src/lib/auth/restriccions.ts:
 *   0. NOMÉS LECTURA: no pot crear, editar ni esborrar res (bloquejat al middleware);
 *   1. ingressos sense el mètode de cobrament ALTRES;
 *   2. llibre de registre sense les estades marcades amb "ZP11" a observacions.
 *
 * Idempotent. Pensat per crear/refrescar el compte (també en producció) sense
 * re-executar tot el seed. Sí que restableix la contrasenya (a diferència del
 * seed). Executa:
 *   pnpm user:hcoll
 *   (o, amb una altra contrasenya:  HCOLL_PASSWORD='...' pnpm user:hcoll)
 */
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const EMAIL = 'hcoll@gmail.com';
const PASSWORD = process.env.HCOLL_PASSWORD ?? 'Hcoll26!';

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 12);
  await prisma.usuari.upsert({
    where: { email: EMAIL },
    update: { nom: 'Propietat', role: Role.ADMIN, actiu: true, passwordHash },
    create: { email: EMAIL, nom: 'Propietat', role: Role.ADMIN, actiu: true, passwordHash },
  });
  console.log(`✓ Compte ${EMAIL} (ADMIN · vista restringida) llest. Contrasenya: "${PASSWORD}".`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
