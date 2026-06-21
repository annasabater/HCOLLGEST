# Hostal Coll — Gestió (PMS + ERP)

Aplicació web per a la gestió integral d'un hostal a Catalunya: **registre de
viatgers (Mossos d'Esquadra)**, CRM, facturació, despeses, actius, personal i analítica.
Tot sobre **un únic model de dades** (l'hoste del registre policial és el client del CRM
i el de facturació). Vegeu el pla complet a [docs/PLAN.md](docs/PLAN.md) i la guia de
treball a [CLAUDE.md](CLAUDE.md).

## Stack

Next.js (App Router) · TypeScript · Prisma · PostgreSQL · JWT + RBAC · Zod · Vitest · Tailwind.

## Posada en marxa

Requisits: Node ≥ 20, pnpm, Docker (per a PostgreSQL).

```bash
# 1. Dependències
pnpm install

# 2. Variables d'entorn (ja generat un .env de dev; o copia la plantilla)
cp .env.example .env     # si cal — omple JWT_SECRET i DOCUMENT_ENCRYPTION_KEY

# 3. Base de dades local
docker compose up -d

# 4. Migracions + dades inicials (establiment, 3 usuaris, categories, habitacions)
pnpm db:migrate
pnpm db:seed

# 5. Desenvolupament
pnpm dev                 # http://localhost:3000
```

### Usuaris seed

| Rol      | Email                   | Contrasenya  |
| -------- | ----------------------- | ------------ |
| ADMIN    | admin@hostalcoll.cat    | `Hostal2026!` |
| RECEPCIO | recepcio@hostalcoll.cat | `Hostal2026!` |
| CONSULTA | consulta@hostalcoll.cat | `Hostal2026!` |

> Canvia les contrasenyes després del primer accés.

## Scripts

| Comanda            | Descripció                                  |
| ------------------ | ------------------------------------------- |
| `pnpm dev`         | Servidor de desenvolupament                 |
| `pnpm build`       | Build de producció                          |
| `pnpm test`        | Tests unitaris (Vitest)                     |
| `pnpm typecheck`   | Comprovació de tipus (`tsc --noEmit`)       |
| `pnpm db:migrate`  | Aplica migracions Prisma                    |
| `pnpm db:seed`     | Carrega dades inicials                      |
| `pnpm db:studio`   | Prisma Studio                               |

## Estat

- **Fase 0** (fonaments: auth, RBAC, audit, xifrat, seed) ✅
- **Fase 1** (nucli legal: formulari mestre §2.3, generador de fitxer, ficha+firma,
  llibre de registre, màquina d'estats d'enviament, tauler de pendents) ✅
- **Fase 1.5** (habitacions, calendari setmanal, neteja amb generació automàtica de la tasca
  de canvi complet en registrar una sortida) ✅
- **Fase 2** (CRM: dedup per document, fitxa editable, anotacions internes §7, avís "no acollir"
  en tornar) ✅
- **Fase 3** (facturació: factures + línies + tassa turística IEET configurable + cobraments) ✅
- **Fase 4** (despeses: categories, proveïdors, adjunts i filtres per període/categoria) ✅
- **Fase 5** (actius: alertes de garantia/antiguitat, historial; i animals amb despeses) ✅
- **Fase 6** (personal: treballadors, absències, nòmines — només ADMIN) ✅
- **Fase 7** (intel·ligència: tauler financer, alertes automàtiques i cercador global) ✅
- **Veri*Factu** (AEAT): elecció factura/recibo, registre d'alta amb **huella SHA-256 encadenada**,
  **QR de cotejo**, desglose d'IVA i pestanya pròpia `/verifactu` amb verificació d'integritat ✅

- **Enviament a l'AEAT** (SOAP `RegFactuSistemaFacturacion`): XML + client TLS + estats
  ENVIAT/ACCEPTAT/ERROR + CSV ✅ (inactiu fins configurar el certificat `.pfx`).

L'estil visual replica la web de l'hostal (granate #7A1F2B + crema, Cormorant Garamond + Manrope).

Pendents anotats: **certificat** AEAT (.pfx) per a l'enviament real; NIF del **productor del software**;
namespaces/endpoint exactes del **WSDL** vigent; fitxa **PDF signable**; export **Excel/PDF**;
i **Mossos §9** (FIELD_LAYOUT/codis/file_identifier + connector).

## Pendents de Mossos (§9) — **no inventar, preguntar**

Per generar el *fitxer massiu* calen, del *Manual d'instruccions* del portal:
l'**ordre exacte de columnes** (`FIELD_LAYOUT`), els **codis literals** dels enums (`CODES`),
la **codificació** i el **`file_identifier`** de l'establiment (es configura a `/config`).
Fins llavors, el registre i el llibre funcionen i la comunicació a Mossos es fa manualment.
Detall a [CLAUDE.md](CLAUDE.md) i [docs/PLAN.md](docs/PLAN.md) §9.
