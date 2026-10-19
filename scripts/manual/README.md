# Manual d'usuari — com es manté

El manual és a l'app a **/manual** (menú «Manual d'usuari») i en PDF a
`public/manual/manual-hostal-coll.pdf`.

## On és cada cosa

| Què | On |
|---|---|
| Text dels capítols | `docs/manual/<capitol>.md` (la secció `## DUBTES` és interna i no es publica) |
| Ordre i títols dels capítols | `src/lib/manual/capitols.ts` |
| Text copiat dins l'app (generat) | `src/content/manual/generated.ts` — no l'editis a mà |
| Fotos | `public/manual/fotos/<id>.webp` |
| Receptes de les fotos | `scripts/manual/receptes/<capitol>.ts` |
| Dades inventades de l'app de proves | `scripts/manual/demo-data.ts` + `scripts/manual/demo-extra/*.ts` |

Cada foto és una línia al text:
`[FOTO id=... ruta=/pantalla descripcio="..." marques="Botó 1|Botó 2"]`

## Tornar a generar-ho tot

Cal l'app de **proves** (mai producció):

1. Base de dades de proves: `docker run -d --name hostalcoll-manual-db -e POSTGRES_USER=manual -e POSTGRES_PASSWORD=manual -e POSTGRES_DB=hostalcoll_manual -p 5433:5432 postgres:16-alpine`
   (o `docker start hostalcoll-manual-db` si ja existeix), i `npx prisma db push` + `npx prisma db seed`
   amb un `.env` que apunti a `localhost:5433`.
2. App de proves: `npx next dev -p 3100`.
3. `pnpm manual:demo` — dades inventades (algunes depenen de la data d'avui).
4. `pnpm manual:contingut` — copia el text dels capítols a l'app.
5. `pnpm manual:fotos` — totes les fotos (`… captures.ts <capitol o id>` per fer-ne només unes quantes).
6. `pnpm manual:optimitza` — fotos en WebP; `npx tsx scripts/manual/optimitza.ts pdf` — versió petita per al PDF.
7. `pnpm manual:pdf` — el PDF.

Després de canviar només text: passos 4 i 7.
