/**
 * Seed inicial — Hostal Coll.
 *   - Establiment con los datos fijos (§2.5 del plan).
 *   - 3 usuarios, uno por rol (ADMIN / RECEPCIO / CONSULTA).
 *   - Categorías de gasto seed (§5C).
 *   - Habitaciones de ejemplo.
 *
 * Idempotente (usa upsert). Ejecutar con:  pnpm db:seed
 */
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Contrasenya inicial del seed. En producció es defineix amb la variable d'entorn
// SEED_PASSWORD; el valor per defecte és només un marcador per a proves locals i
// s'ha de canviar des de l'app al primer accés (l'upsert no toca contrasenyes ja creades).
const SEED_PASSWORD = process.env.SEED_PASSWORD ?? 'CanviaAquestaClau!';

const CATEGORIES_GASTO = [
  'Neteja',
  'Manteniment',
  'Electricitat',
  'Aigua',
  'Internet',
  'Assegurances',
  'Màrqueting',
  'Personal',
  'Mobiliari',
  'Electrodomèstics',
  'Reformes',
  'Animals',
  'Altres',
];

const USUARIS: { email: string; nom: string; role: Role; password?: string }[] = [
  { email: 'hostalcoll@gmail.com', nom: 'Administrador', role: Role.ADMIN },
  // Compte de propietat: entra com ADMIN (ho veu tot) però és NOMÉS LECTURA i,
  // a més, als ingressos s'exclou el mètode ALTRES i el llibre amaga les estades
  // amb "ZP11". Tot es defineix a src/lib/auth/restriccions.ts. Contrasenya pròpia.
  { email: 'hcoll@gmail.com', nom: 'Propietat', role: Role.ADMIN, password: process.env.PROPIETAT_PASSWORD ?? 'CanviaAquestaClau!' },
  { email: 'recepcio@hostalcoll.com', nom: 'Recepció', role: Role.RECEPCIO },
  { email: 'consulta@hostalcoll.com', nom: 'Consulta', role: Role.CONSULTA },
];

async function main() {
  console.log('🌱 Seeding Hostal Coll…');

  // --- Establiment (§2.5) ---------------------------------------------------
  const establiment = await prisma.establiment.upsert({
    where: { id: 'hostal-coll' },
    update: {},
    create: {
      id: 'hostal-coll',
      idPolicial: '000000550',
      fileIdentifier: process.env.MOSSOS_FILE_IDENTIFIER || null, // §9.2 pendiente
      nom: 'HOSTAL COLL',
      cif: '40331905W',
      provincia: 'Barcelona',
      encoding: process.env.MOSSOS_ENCODING || 'latin1',
      teInternetDefault: true,
      retencioPolicialAnys: 3,
    },
  });
  console.log(`  ✓ Establiment: ${establiment.nom} (id policial ${establiment.idPolicial})`);

  // --- Usuarios (uno por rol) ----------------------------------------------
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 12);
  for (const u of USUARIS) {
    // Cada usuari pot tenir contrasenya pròpia; si no, fa servir SEED_PASSWORD.
    const hash = u.password ? await bcrypt.hash(u.password, 12) : passwordHash;
    await prisma.usuari.upsert({
      where: { email: u.email },
      update: { nom: u.nom, role: u.role, actiu: true },
      create: { email: u.email, nom: u.nom, role: u.role, passwordHash: hash, actiu: true },
    });
    console.log(`  ✓ Usuari ${u.email} (${u.role})`);
  }
  console.log(`  ⚠ Contrasenya inicial (usuaris sense contrasenya pròpia): "${SEED_PASSWORD}" — canvia-la.`);

  // --- Categorías de gasto (§5C) -------------------------------------------
  for (const nom of CATEGORIES_GASTO) {
    await prisma.categoriaGasto.upsert({ where: { nom }, update: {}, create: { nom } });
  }
  console.log(`  ✓ ${CATEGORIES_GASTO.length} categorías de gasto`);

  // --- Habitaciones de ejemplo ---------------------------------------------
  for (let i = 1; i <= 6; i++) {
    const nom = String(i);
    const existing = await prisma.habitacio.findFirst({ where: { nom } });
    if (!existing) {
      await prisma.habitacio.create({ data: { nom, capacitat: 2, estat: 'DISPONIBLE' } });
    }
  }
  console.log('  ✓ Habitaciones 1–6');

  // --- Treballador (dona de neteja) ----------------------------------------
  const dniNeteja = '00000000T';
  const existingTreb = await prisma.treballador.findFirst({ where: { dni: dniNeteja } });
  if (!existingTreb) {
    await prisma.treballador.create({
      data: {
        nom: 'Dona de neteja',
        dni: dniNeteja,
        carrec: 'Neteja',
        dataContractacio: new Date('2024-01-01'),
      },
    });
  }
  console.log('  ✓ Treballador de neteja');

  console.log('✅ Seed completado.');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
