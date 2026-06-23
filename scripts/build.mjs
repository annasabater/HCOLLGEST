/**
 * Build amb reintent automàtic.
 *
 * A Windows, l'antivirus/OneDrive bloqueja ocasionalment fitxers de `.next`
 * mentre Next els escriu, fent fallar la fase "Collecting page data" SEMPRE
 * després de "Compiled successfully" (i en una pàgina diferent cada cop).
 * Això NO és un error de codi: reintentem netejant `.next`.
 *
 * Només es reintenta davant marcadors TRANSITORIS coneguts; un error real de
 * tipus/lint/codi surt immediatament (no es reintenta). A Linux (Vercel) passa
 * a la primera, així que el wrapper és inofensiu en producció.
 */
import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';

const MAX = 3;
const TRANSIENT =
  /PageNotFoundError|Cannot find module for page|next-font-manifest|Failed to collect page data|EPERM|ENOENT|Cannot find module '\.\//;

function clean() {
  try {
    rmSync('.next', { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}

let code = 1;
for (let attempt = 1; attempt <= MAX; attempt++) {
  if (attempt > 1) {
    console.log(`\n[build] bloqueig de fitxers transitori — reintent ${attempt}/${MAX}…\n`);
  }
  clean();
  const r = spawnSync('next', ['build'], { shell: true, encoding: 'utf8' });
  const out = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  process.stdout.write(out);
  code = r.status ?? 1;

  if (code === 0) process.exit(0);
  if (!TRANSIENT.test(out)) process.exit(code); // error real → no reintentar
}

console.error(
  `\n[build] Ha fallat per bloqueig de fitxers després de ${MAX} intents. ` +
    `Excloeix la carpeta del projecte de l'antivirus de Windows (Defender) i torna-ho a provar.`,
);
process.exit(code);
