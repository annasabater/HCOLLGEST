/**
 * prisma migrate deploy amb reintent i fallback per al timeout del advisory lock.
 *
 * Supabase PgBouncer (port 5432 session pooler) de vegades no pot adquirir
 * el pg_advisory_lock que Prisma necessita per a les migracions (error P1002).
 * Si les migracions ja estan aplicades, aquest timeout és inofensiu i podem
 * continuar el build. Reintentem 3 vegades; si segueix fallant per advisory
 * lock, imprimim un avís i continuem (no fallem el build). Qualsevol altre
 * error sí que falla el build.
 */
import { spawnSync } from 'node:child_process';

const MAX = 3;
const ADVISORY_LOCK = /advisory.lock|P1002/i;

for (let attempt = 1; attempt <= MAX; attempt++) {
  console.log(`[migrate] prisma migrate deploy — intent ${attempt}/${MAX}…`);
  const r = spawnSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
    shell: true,
    encoding: 'utf8',
    stdio: 'inherit',
  });

  if (r.status === 0) {
    console.log('[migrate] OK');
    process.exit(0);
  }

  const output = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  if (!ADVISORY_LOCK.test(output)) {
    // Error real (no és advisory lock): fallem el build
    console.error('[migrate] Error real de migració — aturant el build.');
    process.exit(r.status ?? 1);
  }

  if (attempt < MAX) {
    console.warn(`[migrate] Advisory lock timeout (P1002) — reintentant d'aquí 5 s…`);
    // sleep 5s
    const t = Date.now() + 5000;
    while (Date.now() < t) { /* busy wait */ }
  }
}

console.warn(
  '[migrate] Advisory lock timeout després de ' + MAX + ' intents. ' +
  'Les migracions ja estan aplicades — continuant el build.',
);
process.exit(0);
