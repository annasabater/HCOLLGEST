/**
 * Regenera TOTES les dades inventades de l'app de proves del manual: primer
 * demo-data.ts i després cada script de demo-extra/ en ordre alfabètic.
 * Ús: pnpm manual:demo   (cal l'app de proves en marxa a localhost:3100)
 */
import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const dir = join(process.cwd(), 'scripts', 'manual');
const scripts = [join(dir, 'demo-data.ts'), ...readdirSync(join(dir, 'demo-extra')).filter((f) => f.endsWith('.ts')).sort().map((f) => join(dir, 'demo-extra', f))];
for (const s of scripts) {
  console.log(`\n▶ ${s.replace(process.cwd(), '.')}`);
  execFileSync('npx', ['tsx', s], { stdio: 'inherit', shell: true });
}
console.log('\n✓ Dades de demo regenerades');
