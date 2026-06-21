# Desplegar Hostal Coll en Vercel (con dominio propio)

Guía para poner la app en producción en **Vercel**, reutilizando el dominio que ya
tienes (`hostalcoll.com` / `.es` / `.cat`) mediante un **subdominio** privado, sin
comprar nada nuevo.

> Resumen del enfoque:
> - **App de gestión** → `https://gestio.hostalcoll.com` (privada, solo tú).
> - **Base de datos** → Supabase (ya configurada).
> - **Ficheros/adjuntos** → Supabase Storage (el disco de Vercel es efímero).
> - **Acceso restringido** → login propio de la app (+ opcional muro de Vercel).

---

## 0. Antes de empezar — qué ya está hecho en el código

Estos cambios ya están aplicados en el repo (no tienes que tocar nada):

- `src/lib/storage.ts` usa **Supabase Storage** si hay credenciales, y disco local si no.
- `prisma/schema.prisma` tiene `directUrl` → runtime por *pooler* (6543), migraciones por
  conexión directa (5432). Apto para serverless.
- `package.json` tiene `postinstall: prisma generate` → Vercel genera el cliente Prisma.
- La base de datos de Supabase **ya está migrada y con el seed** cargado.

---

## 1. Supabase Storage — crear bucket y obtener claves

1. Entra en tu proyecto de Supabase → **Storage** (menú lateral) → **New bucket**.
   - Nombre: `adjunts`
   - **Public bucket: OFF** (privado — los ficheros son sensibles).
   - *(Si prefieres no crearlo a mano, la app lo crea sola en la primera subida.)*
2. Ve a **Project Settings → API** y copia:
   - **Project URL** → será `SUPABASE_URL`
     (algo como `https://szgajdizsulezndxwnmu.supabase.co`).
   - **service_role** (en *Project API keys*) → será `SUPABASE_SERVICE_ROLE_KEY`.
     ⚠️ **Es SECRETA** (acceso total, salta RLS). Nunca la subas a git ni la loguees;
     solo va en variables de entorno.

---

## 2. Subir el código a GitHub

Vercel despliega desde un repositorio. Si aún no está en GitHub:

```powershell
git add -A
git commit -m "Preparar despliegue en Vercel (Supabase Storage + pooler serverless)"
# crea el repo y haz push (con GitHub CLI):
gh repo create hostalcoll-gestion --private --source . --push
```

> El `.env` **no** se sube (está en `.gitignore`). Los secretos se ponen en Vercel.

---

## 3. Importar el proyecto en Vercel

1. Entra en https://vercel.com → **Add New… → Project** → importa el repo de GitHub.
2. Framework: **Next.js** (lo detecta solo). No cambies el *build command*.
3. **Antes de pulsar Deploy**, añade las variables de entorno (siguiente paso).

---

## 4. Variables de entorno en Vercel

En *Project → Settings → Environment Variables* añade (entorno **Production**, y
**Preview** si quieres probar ramas). Cópialas de tu `.env` local:

| Variable | Valor | Notas |
|----------|-------|-------|
| `DATABASE_URL` | `postgresql://postgres.REF:PASS@aws-0-REGION.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1` | pooler 6543 (runtime) |
| `DIRECT_URL` | `postgresql://postgres.REF:PASS@aws-0-REGION.pooler.supabase.com:5432/postgres?sslmode=require` | sesión 5432 (migraciones) |
| `JWT_SECRET` | *(el mismo de tu `.env`)* | secreto largo |
| `JWT_TTL_SECONDS` | `28800` | 8 h |
| `DOCUMENT_ENCRYPTION_KEY` | *(el mismo de tu `.env`)* | ⚠️ si la pierdes, los documentos cifrados son irrecuperables |
| `SUPABASE_URL` | `https://REF.supabase.co` | de Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | *(service_role)* | ⚠️ SECRETA |
| `SUPABASE_STORAGE_BUCKET` | `adjunts` | |
| `NEXT_PUBLIC_APP_NAME` | `Hostal Coll` | |
| `MOSSOS_ENCODING` | `latin1` | |

> No pongas `NODE_ENV` (Vercel lo gestiona). No pongas `STORAGE_DIR` (en Vercel se usa
> Supabase Storage). Deja `MOSSOS_*` y `AEAT_CERT_*` vacíos hasta tener esos datos.

Pulsa **Deploy**. Al terminar tendrás una URL tipo `hostalcoll-gestion.vercel.app`.

---

## 5. Conectar el subdominio `gestio.hostalcoll.com`

1. En Vercel: *Project → Settings → Domains* → escribe `gestio.hostalcoll.com` → **Add**.
2. Vercel te dirá qué registro DNS crear. Normalmente un **CNAME**:

   | Tipo | Nombre / Host | Valor |
   |------|---------------|-------|
   | CNAME | `gestio` | `cname.vercel-dns.com` |

3. Ve al panel **donde compraste el dominio** (el registrador / proveedor DNS de
   `hostalcoll.com`) → zona DNS → añade ese registro CNAME.
4. Espera la propagación (de minutos a un par de horas). Vercel emite el certificado
   HTTPS automáticamente. Cuando salga el ✅ en *Domains*, abre
   **https://gestio.hostalcoll.com**.

> El dominio principal `hostalcoll.com` queda libre para tu web pública. Puedes crear
> tantos subdominios como quieras (`gestio.`, `admin.`, `app.`…), todos gratis.

---

## 6. Que solo entres tú

- **Login de la app**: ya exige usuario/contraseña (JWT + roles). Si solo tú tienes
  las credenciales, solo tú entras. **Cambia la contraseña inicial** del seed
  (`Hostal2026!`) cuanto antes.
- **Capa extra (opcional, plan Pro)**: *Settings → Deployment Protection →
  Vercel Authentication* o *Password Protection* pone un muro **antes** de llegar a la
  app. Doble candado.

---

## 7. Notas y límites conocidos

- **Plan de Vercel**: el plan **Hobby es gratis** pero es para uso *no comercial*; para
  un negocio real lo correcto es **Pro (~20 $/mes)**. La base de Supabase free sobra
  para un hostal.
- **Mossos (conector Playwright, §9.5)**: no funciona en Vercel serverless. El flujo
  **"generar fichero + subida manual"** sí funciona. No es bloqueante.
- **AEAT Veri\*Factu**: requiere certificado `.pfx`. En Vercel necesitarías cargarlo como
  variable/secret y adaptar la lectura; mientras `AEAT_CERT_PFX_PATH` esté vacío, el
  envío queda inactivo (los registros se generan igual).
- **Migraciones futuras**: cuando cambies `prisma/schema.prisma`, aplica los cambios a
  Supabase con `pnpm db:migrate` en local (usa `DIRECT_URL`). Como la base es la misma
  que usa Vercel, el despliegue la verá actualizada. Para producción pura puedes usar
  `pnpm db:deploy` (`prisma migrate deploy`).

---

## Checklist rápido

- [ ] Bucket `adjunts` (privado) en Supabase Storage.
- [ ] `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` copiadas.
- [ ] Repo en GitHub (sin `.env`).
- [ ] Proyecto importado en Vercel.
- [ ] Variables de entorno puestas en Vercel.
- [ ] Deploy correcto (`*.vercel.app` abre).
- [ ] `gestio.hostalcoll.com` añadido + CNAME en el DNS.
- [ ] HTTPS ✅ y login funciona.
- [ ] Contraseña inicial del seed cambiada.
