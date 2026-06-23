# Desplegament (Vercel + Supabase)

Guia per posar en marxa `gestio.hostalcoll.com`. Si el login dóna **"Error intern
del servidor"**, gairebé sempre és **(A)** falten variables d'entorn a Vercel o
**(B)** la base de dades no té les taules / el seed. Comprova-ho a
`https://gestio.hostalcoll.com/api/health`.

## 1. Variables d'entorn a Vercel

Project → Settings → Environment Variables (Production):

| Variable | Valor |
|---|---|
| `DATABASE_URL` | Supabase → Connect → **Transaction pooler** (port **6543**), amb `?pgbouncer=true&connection_limit=5` (⚠ `connection_limit=1` fa timeout al Tauler, que llança ~14 consultes alhora) |
| `DIRECT_URL` | Supabase → Connect → **Session** (port **5432**) — per a migracions |
| `JWT_SECRET` | `node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"` |
| `DOCUMENT_ENCRYPTION_KEY` | `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` (32 bytes!) |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | (opcional) per desar adjunts/documents a Supabase Storage |
| `AEAT_CERT_PFX_PATH` / `AEAT_CERT_PASS` | (opcional) Veri*Factu real |

> ⚠ `DOCUMENT_ENCRYPTION_KEY` no es pot canviar després: xifra els documents. Guarda-la bé.

## 2. Migracions (crear les taules a Supabase)

El `package.json` té `vercel-build` = `prisma migrate deploy && next build`, així que
**cada desplegament aplica les migracions automàticament** (cal que `DIRECT_URL` estigui
configurada). Si vols fer-ho a mà des del teu PC (amb el `.env` ple):

```bash
pnpm db:deploy   # prisma migrate deploy → crea les 26 taules
```

## 3. Seed inicial (una sola vegada)

Crea l'establiment Hostal Coll, els 3 usuaris, categories, habitacions i la persona de neteja.
Des del teu PC amb el `.env` apuntant a Supabase:

```bash
pnpm db:seed
```

Usuaris creats (canvia les contrasenyes després):

| Rol | Email | Contrasenya |
|---|---|---|
| ADMIN | hostalcoll@gmail.com | `Hostal2026!` |
| RECEPCIO | recepcio@hostalcoll.com | `Hostal2026!` |
| CONSULTA | consulta@hostalcoll.com | `Hostal2026!` |

> Si al login surt "Credencials incorrectes" en lloc de l'error de servidor, vol dir que
> les taules ja hi són però la contrasenya no coincideix (o no s'ha fet el seed).

## 4. Regió (rendiment)

`vercel.json` fixa la regió de les funcions a **`dub1`** (Dublín), al costat de la Supabase
`eu-west-1` (Irlanda). Així cada consulta triga ~10 ms en lloc de ~100 ms i el Tauler carrega
en ~1 s. Si canvies de regió de Supabase, ajusta-ho.

## 5. Comprovació

`GET /api/health` ha de retornar `{ "ready": true }`. Si no, el camp `hint` diu què falta.
