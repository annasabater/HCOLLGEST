/**
 * Importa UNA vegada les 13 ressenyes que hi havia escrites a hostalcoll.com
 * (prisma/data/ressenyes-web.json, extretes de ../hostalcoll/index.html amb les
 * seves traduccions) com a PUBLICADES, en el mateix ordre.
 *
 *   pnpm exec tsx --env-file=.env scripts/importa-ressenyes-web.ts          (prova: no escriu)
 *   pnpm exec tsx --env-file=.env scripts/importa-ressenyes-web.ts --desa   (escriu)
 *
 * Idempotent: fa upsert per `googleId` ("web-r1"…). Només toca la taula
 * `ressenya`; no esborra res. Si una ja hi és, no li canvia l'estat ni l'ordre
 * (per no desfer el que s'hagi decidit a /ressenyes).
 */
import { readFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';

interface Fila {
  googleId: string;
  ordre: number;
  autor: string;
  puntuacio: number;
  idioma: string;
  data: string;
  dataPrecisio: 'MES' | 'ANY';
  text: string;
  traduccions: Record<'es' | 'ca' | 'en' | 'fr', string>;
}

const desa = process.argv.includes('--desa');
const files = JSON.parse(readFileSync('prisma/data/ressenyes-web.json', 'utf8')) as Fila[];
const prisma = new PrismaClient();

async function main() {
  // La migració de la precisió de data ha d'estar aplicada (la fa Vercel en desplegar).
  const cols = await prisma.$queryRaw<{ column_name: string }[]>`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'ressenya' AND column_name IN ('traduccions', 'data_precisio')`;
  if (cols.length < 2) {
    throw new Error('La BD encara no té les columnes noves de `ressenya`: espera que Vercel acabi el desplegament.');
  }

  const existents = await prisma.ressenya.findMany({
    where: { googleId: { in: files.map((f) => f.googleId) } },
    select: { googleId: true },
  });
  const ja = new Set(existents.map((e) => e.googleId));
  console.log(`${files.length} ressenyes al fitxer · ${ja.size} ja importades · ${files.length - ja.size} noves`);

  if (!desa) {
    for (const f of files) console.log(`${ja.has(f.googleId) ? '=' : '+'} #${f.ordre + 1} ${f.autor}`);
    console.log('\nProva: no s’ha escrit res. Torna-ho a executar amb --desa.');
    return;
  }

  for (const f of files) {
    const dades = {
      font: 'WEB',
      autor: f.autor,
      puntuacio: f.puntuacio,
      text: f.text,
      idioma: f.idioma,
      dataRessenya: new Date(`${f.data}T00:00:00Z`),
      dataPrecisio: f.dataPrecisio,
      traduccions: f.traduccions,
    };
    await prisma.ressenya.upsert({
      where: { googleId: f.googleId },
      create: { ...dades, googleId: f.googleId, estat: 'PUBLICADA', ordre: f.ordre, publicadaAt: new Date() },
      update: dades,
    });
  }
  await prisma.auditLog.create({
    data: {
      accio: 'CREACIO',
      entitat: 'ressenya',
      detall: { importacio: 'ressenyes-web', total: files.length, noves: files.length - ja.size },
    },
  });
  const publicades = await prisma.ressenya.count({ where: { estat: 'PUBLICADA' } });
  console.log(`Fet. Ressenyes publicades ara: ${publicades}`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
