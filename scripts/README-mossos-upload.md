# Auto-pujador del fitxer massiu a Mossos (local)

Aquest script puja el `.txt` al portal de Mossos **des del teu ordinador** (a Vercel no
es pot: cal un navegador real). El format del fitxer ja està **confirmat** amb el manual
oficial; l'únic que falta són els **selectors** reals del portal (a quins botons/camps
clicar), que capturem una sola vegada.

## Requisits

- Playwright i Chromium **ja estan instal·lats** al projecte (no cal fer res).
- Un `.env` a l'arrel amb `DATABASE_URL`, `DIRECT_URL` i `DOCUMENT_ENCRYPTION_KEY`
  (els mateixos que usa l'app; serveixen per llegir l'estada i desxifrar les credencials).
- Les credencials de Mossos i el `file_identifier` desats a **/config** (es llegeixen de la BD).

## Pas 1 — Capturar els selectors (una sola vegada)

Opció recomanada (grava tot el que fas):

```bash
npx playwright codegen https://registreviatgers.mossos.gencat.cat
```

Fes el **login + anar a "Fitxers massius"** (i, si vols, seleccionar un `.txt`) mentre
Playwright ho grava. **Passa'm el codi generat** i ajusto els selectors a `SEL` de
`scripts/mossos-upload.ts`.

Alternativa sense gravar (desa l'HTML de les pàgines a `./mossos-captures`):

```bash
pnpm mossos:upload --inspect    # obre el portal, desa el login i s'atura per entrar a mà
```

## Pas 2 — Ús normal (un cop fixats els selectors)

```bash
pnpm mossos:upload <estanciaId>      # una estada concreta
pnpm mossos:upload --all-pending     # totes les pendents d'enviar
pnpm mossos:upload <id> --dry-run    # només login (no puja res) per provar
```

El script:
1. Genera el `.txt` amb el **mateix motor** que el botó web (format oficial confirmat).
2. Obre el portal (mode visible), fa login i puja el fitxer.
3. Desa la confirmació (codi/núm. registre) a l'enviament → es veu a l'app i pots
   imprimir el **Justificant PDF**.

Si algun selector no es troba, el script desa una **captura + l'HTML** de la pàgina a
`./mossos-captures` i s'atura: passa-me'ls i l'ajusto en un minut.

## Important

- Les credencials **mai** són al codi: es llegeixen xifrades de la BD i es desxifren
  només en memòria en aquest script local.
- Aquest és el pas previ per, més endavant, fer la pujada **des de gestio.hostalcoll.com**
  amb un navegador remot (els selectors són els mateixos).
