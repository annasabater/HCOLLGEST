# Auto-pujador del fitxer massiu a Mossos (local)

Aquest script puja el `.txt` al portal de Mossos **des del teu ordinador** (a Vercel no
es pot: cal un navegador real). És un **scaffold**: funciona del tot quan hi posis els
selectors del portal (5 minuts, una sola vegada).

## Requisits (una vegada)

```bash
pnpm add -D playwright
npx playwright install chromium
```

Cal un fitxer `.env` a l'arrel amb `DATABASE_URL`, `DIRECT_URL` i `DOCUMENT_ENCRYPTION_KEY`
(els mateixos que usa l'app; serveixen per llegir l'estada i desxifrar les credencials).
Les credencials de Mossos s'agafen de la base de dades (les que has desat a `/config`).

## Posar els selectors (una vegada)

```bash
npx playwright codegen https://registreviatgers.mossos.gencat.cat
```

Fes el login + pujada a mà mentre Playwright et grava els selectors. Copia'ls als blocs
`// TODO` de `pujaAlPortal()` a `scripts/mossos-upload.ts` (login, anar a "fitxers
massius", `setInputFiles`, i llegir el codi de validació / núm. de registre).

## Ús

```bash
pnpm mossos:upload <estanciaId>      # una estada concreta
pnpm mossos:upload --all-pending     # totes les pendents d'enviar
```

El script:
1. Genera el `.txt` amb el mateix motor que el botó web.
2. Obre el portal (mode visible), fa login i puja el fitxer.
3. Desa la confirmació (codi/núm. registre) a l'enviament → es veu a l'app i pots
   imprimir el **Justificant PDF**.

## Important

- Mentre `FORMAT_CONFIRMAT = false` a `src/lib/mossos/fitxer.ts`, el fitxer és
  **provisional**: verifica'l amb el *Manual de fitxers massius* abans d'usar-ho en real.
- Les credencials **mai** són al codi: es llegeixen xifrades de la BD i es desxifren
  només en memòria en aquest script local.
