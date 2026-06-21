# CLAUDE.md — Hostal Coll (PMS + ERP)

Guía permanente para trabajar en este repo. El plan completo está en
[docs/PLAN.md](docs/PLAN.md). Construir **incrementalmente por fases**; no empezar
una fase sin que la anterior pase sus criterios de aceptación.

## Filosofía

App web para la gestión integral de un hostal en Cataluña: **PMS + ERP**.
Principio rector: **introducir cada dato una sola vez y reutilizarlo en todo**.
El huésped del registro policial **es** el cliente del CRM **y** el de facturación:
una sola entidad `Huesped`, una sola `Estancia`; el resto son vistas/derivados.
Prioridad: primero el **núcleo legal** (plazos de 24 h y sanciones), luego el valor económico.

## Stack y convenciones (§3)

- **Next.js (App Router) + React + TypeScript estricto** · **Prisma + PostgreSQL** ·
  **Auth JWT + RBAC** (ADMIN / RECEPCIO / CONSULTA) · **Zod** (validación compartida) ·
  **Vitest** (unit) + **Playwright** (e2e).
- TypeScript estricto; **nada de `any`**. Commits pequeños por tarea. Migraciones Prisma versionadas.
- **Toda** acción relevante escribe en `audit_log` (helper `src/lib/audit.ts`).
- Documentos de identidad y la contraseña de Mossos se guardan **cifrados** (`src/lib/crypto.ts`, AES-256-GCM).
- **Nunca** loguear credenciales de Mossos ni datos de documentos.
- UI en catalán (etiquetas oficiales en catalán); enums en MAYÚSCULAS.

## CONOCIMIENTO DE DOMINIO CRÍTICO — Mossos / legal (§2)

> No es deducible. Respétalo al pie de la letra.

- En Cataluña **NO** se usa SES.HOSPEDAJES; se usa el portal de **Mossos d'Esquadra**
  (`registreviatgers.mossos.gencat.cat`). **No hay API REST pública.**
- Integración en dos niveles:
  1. **Generador de fitxer massiu** (`.txt`): `src/lib/mossos/fitxer.ts` — motor completo.
  2. **Conector de subida** (Playwright, `src/lib/mossos/connector.ts`): PENDIENTE de selectores (§9.5).
     Mientras tanto, el flujo **"generar fichero + subida manual"** funciona solo.
- **Formato del `.txt`** (§2.2): separador `|`; los campos vacíos **conservan** su `|`;
  alfabeto occidental **con acentos** (é, ç, ñ); apellidos compuestos con **un solo espacio**;
  nombre de fichero `{file_identifier}.{seq 001-999}.txt`; codificación probable **ISO-8859-1 (latin1)**.
- **Obligatoriedad condicional** (§2.3) — implementada en `src/lib/validation/registre.ts` y
  duplicada como `validaParte` en `fitxer.ts`:
  - **RESERVA**: solo `nom`, `cognom1` y (`email` o `telefon`).
  - **CONTRACTE_EN_CURS**: identificación + personales + dirección, con:
    `cognom2` oblig. si DNI/NIF · `num_suport` oblig. si DNI/NIF o NIE ·
    documento NO oblig. si **menor de 14** · `parentesc` oblig. si menor ·
    si país=Espanya → província+municipi; si extranjero → localitat.
  - Fechas: `data_formalitzacio ≤ hoy`, `data_naixement ≤ hoy`, `data_expedicio ≤ hoy`, `data_sortida > data_entrada`.
- **Plazos (§2.4):** comunicar a Mossos en **≤ 24 h**; conservar el registro **3 años**.
- **Datos del establecimiento (seed):** `HOSTAL COLL` · Id policial `000000550` · CIF `40331905W` · Barcelona.

## PENDIENTES que NO se deben inventar — preguntar (§9)

1. **Orden/estructura exactos del fitxer massiu** → `FIELD_LAYOUT` en `src/lib/mossos/fitxer.ts`
   está **vacío** a propósito. Está en el *Manual d'instruccions* del portal.
2. **`file_identifier`** real (9-10 car., en "Dades de l'establiment"; **no** es el Id policial). Se configura en `/config`.
3. **Codificación** del `.txt` (ISO-8859-1 vs UTF-8).
4. **Códigos literales** de los enums dentro del fichero (`CODES` son provisionales).
5. **Selectores/flujo del portal** para el conector Playwright.
6. **Credenciales Mossos**: secret manager / cifradas; nunca en repo ni logs.
7. **Tarifa IEET** (Fase 3).

El generador funciona en cuanto se rellenen `FIELD_LAYOUT` + `CODES`. Hasta entonces,
`POST /api/estancies/:id/fitxer` devuelve **422** con un mensaje accionable (no inventa el orden).

## Estructura

- `prisma/schema.prisma` — modelo de datos **completo** (todas las fases) · `prisma/seed.ts`.
- `src/lib/` — `db`, `env`, `crypto`, `audit`, `http`, `dates`, `auth/*`, `validation/*`, `mossos/*`, `services/*`.
- `src/app/api/*` — Route Handlers REST (protegidos por `authorize()`).
- `src/app/(auth)/login`, `src/app/(dashboard)/*` — UI.
- `src/components/*` — `ui/` (primitivas), `forms/`, `estancia/`, `huesped/`, `layout/`, `config/`.

## Comandos

```bash
docker compose up -d      # PostgreSQL local
pnpm db:migrate           # aplicar migraciones
pnpm db:seed              # establiment + 3 usuarios + categorías + habitaciones
pnpm dev                  # desarrollo
pnpm test                 # Vitest (escribir tests primero para §2.2/§2.3)
pnpm typecheck            # tsc --noEmit
pnpm build                # build de producción
```

## Veri*Factu (AEAT) — facturación verificable

Preparado para el sistema **Veri*Factu** (RD 1007/2023; previsto obligatorio ~2027).
- **Elección factura/recibo** (`Factura.tipusDocument`: RECIBO / FACTURA F1 / FACTURA_SIMPLIFICADA F2).
  El **recibo no es factura fiscal** y no entra en Veri*Factu; solo las facturas generan registro.
- **Registro de alta encadenado**: `src/lib/verifactu/` — `hash.ts` (huella SHA-256 con el orden de
  campos AEAT, encadenada a la huella anterior, **testeado**), `qr.ts` (QR de cotejo), `record.ts`
  (RegistroAlta completo con desglose IVA). Modelo `RegistreVerifactu` (cadena global por `createdAt`).
- **Pestaña aparte** `/verifactu`: formulario de emisión + cadena con **verificación de integridad**
  (recalcula y compara huellas). El detalle de factura muestra QR + huella + leyenda.
- **Envío a la AEAT** (servicio SOAP `RegFactuSistemaFacturacion`): implementado —
  `src/lib/verifactu/xml.ts` (RegistroAlta + envelope + parser de respuesta, **testeado**),
  `aeat-client.ts` (POST con **TLS client cert** `.pfx` desde `AEAT_CERT_PFX_PATH`/`AEAT_CERT_PASS`),
  `services/verifactu.ts → enviarRegistre` (estados ENVIAT/ACCEPTAT/ERROR + CSV). Botón "Enviar AEAT"
  en `/verifactu`. **Inactivo hasta configurar el certificado** (los registros se generan/encadenan igual).
- **Pendientes Veri*Factu** (no inventables / a confirmar):
  - **Certificado digital** (.pfx) del obligado/representante para el envío real.
  - NIF y razón social del **productor del software** (`src/lib/verifactu/software.ts`, placeholders).
  - **Namespaces/endpoint exactos** del WSDL vigente de la AEAT (constantes en `software.ts` — confirmar).
  - Tratamiento fiscal del **IEET** en el desglose (ahora va como "no sujeto" `N1` — confirmar).
  - QR/endpoint en modo **test** por defecto (`establiment.verifactuTestMode`); pasar a producción al activar.

## Estilo visual

La UI replica la identidad de la web del hostal (`../hostalcoll/index.html`):
**granate `#7A1F2B`** (toda la escala `brand-*` de Tailwind es granate), fondo crema, tipografías
**Cormorant Garamond** (titulares, `font-serif`) + **Manrope** (texto, `font-sans`) vía `next/font`.
Definido en `src/app/globals.css` (`@theme`) y `src/app/layout.tsx`.

## Estado actual

**Todas las fases (0–7) implementadas:**
- **0** Fundaciones (auth JWT + RBAC, audit, crypto, seed) · **1** Núcleo legal (form maestro §2.3,
  generador fitxer, firma, llibre, máquina de estados de envío, tauler de pendientes) ·
  **1.5** Habitacions, calendari, neteja (auto-tarea al registrar salida) ·
  **2** CRM (dedup, ficha editable, anotaciones §7, aviso "no acollir") ·
  **3** Facturación (factura/línies, tasa IEET configurable, cobros) ·
  **4** Gastos (categorías, proveedores, adjuntos, filtros) ·
  **5** Activos (alertas garantía/antigüedad, historial) + animales ·
  **6** Personal (trabajadores, ausencias, nóminas) ·
  **7** Inteligencia (dashboard financiero, alertas automáticas, buscador global).
- **Pendientes** (anotados): ficha **PDF firmable** del modelo "Registre de persones allotjades"
  (la firma se captura; falta generar el PDF); export **Excel/PDF** (hay CSV de llibre); y **Mossos §9**
  (FIELD_LAYOUT/CODES/file_identifier del manual + conector Playwright §9.5).
