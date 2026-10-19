/**
 * Copia els capítols del manual (docs/manual/*.md) a src/content/manual/generated.ts
 * perquè l'app els tingui dins del codi (sense llegir fitxers en temps d'execució).
 * Treu les seccions internes "## DUBTES". Ús: `pnpm manual:contingut`.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import { treuSeccionsInternes } from '../../src/lib/manual/markdown';

const SRC = join(process.cwd(), 'docs', 'manual');
const OUT_DIR = join(process.cwd(), 'src', 'content', 'manual');

const capitols: Record<string, string> = {};
for (const f of readdirSync(SRC).filter((x) => x.endsWith('.md')).sort()) {
  capitols[basename(f, '.md')] = treuSeccionsInternes(readFileSync(join(SRC, f), 'utf8'));
}

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(
  join(OUT_DIR, 'generated.ts'),
  `// FITXER GENERAT per scripts/manual/build-content.ts — no l'editis a mà: edita docs/manual/*.md.\n` +
    `export const CAPITOLS_MD: Record<string, string> = ${JSON.stringify(capitols, null, 2)};\n`,
);
console.log(`Manual: ${Object.keys(capitols).length} capítols → src/content/manual/generated.ts`);
