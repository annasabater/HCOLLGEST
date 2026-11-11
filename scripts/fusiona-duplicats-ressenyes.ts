/**
 * Fusiona les ressenyes de Google que han entrat DUPLICADES d'alguna de les 13
 * importades de la web perquè Google n'escriu el nom diferent (p. ex.
 * "GuitarOnTop / Cristo Fontecilla" ↔ "Cristo Fontecilla"). La de la web es queda
 * (amb el seu estat, ordre i traduccions) i agafa l'id, la data exacta i la
 * resposta de Google; la duplicada (només si és PENDENT) s'esborra.
 *
 *   pnpm exec tsx --env-file=.env scripts/fusiona-duplicats-ressenyes.ts          (prova)
 *   pnpm exec tsx --env-file=.env scripts/fusiona-duplicats-ressenyes.ts --desa   (escriu)
 */
import { PrismaClient } from '@prisma/client';
import { aparellaAmbWeb } from '../src/lib/google-ressenyes';

const desa = process.argv.includes('--desa');
const prisma = new PrismaClient();

async function main() {
  const web = await prisma.ressenya.findMany({ where: { font: 'WEB', googleId: { startsWith: 'web-' } } });
  const google = await prisma.ressenya.findMany({ where: { font: 'GOOGLE', estat: 'PENDENT' } });
  const parelles: { webId: string; dupId: string; webAutor: string; dupAutor: string }[] = [];
  const lliures = web.map((w) => ({ id: w.id, autor: w.autor, puntuacio: w.puntuacio }));
  for (const g of google) {
    const m = aparellaAmbWeb(g.autor, g.puntuacio, lliures);
    if (!m) continue;
    parelles.push({ webId: m.id, dupId: g.id, webAutor: m.autor, dupAutor: g.autor });
    lliures.splice(lliures.indexOf(m), 1);
  }
  for (const p of parelles) console.log(`«${p.dupAutor}» (Google, pendent)  →  «${p.webAutor}» (web)`);
  if (!desa) {
    console.log(`\nProva: ${parelles.length} duplicades. No s’ha escrit res; torna-ho a executar amb --desa.`);
    return;
  }
  for (const p of parelles) {
    await prisma.$transaction(async (tx) => {
      const dup = await tx.ressenya.findUniqueOrThrow({ where: { id: p.dupId } });
      await tx.ressenya.delete({ where: { id: dup.id } }); // allibera el googleId (únic)
      await tx.ressenya.update({
        where: { id: p.webId },
        data: { googleId: dup.googleId, dataRessenya: dup.dataRessenya, dataPrecisio: 'DIA', resposta: dup.resposta },
      });
      await tx.auditLog.create({
        data: {
          accio: 'MODIFICACIO',
          entitat: 'ressenya',
          entitatId: p.webId,
          detall: { fusioDuplicat: { esborrada: p.dupId, autorGoogle: p.dupAutor } },
        },
      });
    });
  }
  console.log(`Fet: ${parelles.length} fusionades.`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
