# PLAN DE IMPLEMENTACIÓN — PMS + ERP "Hostal Coll"
### Documento para Claude Code

> **Cómo usar este documento:** guárdalo en el repo como `docs/PLAN.md`. Opcionalmente, copia la sección §3 (convenciones) y §2 (dominio Mossos) a un `CLAUDE.md` en la raíz para que Claude Code las tenga siempre presentes. Arranca pidiéndole: *"Lee `docs/PLAN.md` y empieza por la Fase 0 + 1. Antes de inventar nada del fitxer massiu de Mossos, pregúntame (ver §9)."*

---

## 1. Resumen y filosofía

Aplicación web para la gestión integral de un hostal en Cataluña (España). Funciona como **PMS + ERP**: registro legal de huéspedes, CRM de clientes, facturación, gastos, activos, personal y analítica.

**Principio rector:** *introducir cada dato una sola vez y reutilizarlo en todo*. El huésped del registro policial **es** el cliente del CRM y **es** el de facturación. Una sola entidad `huesped`, una sola entidad `estancia`; el resto son vistas/derivados.

**Prioridad de construcción:** primero el **núcleo legal** (tiene plazos de 24 h y sanciones), luego el valor económico.

---

## 2. CONOCIMIENTO DE DOMINIO CRÍTICO (Mossos / legal)
> Esto no es deducible: respétalo al pie de la letra.

### 2.1 Comunicación con Mossos d'Esquadra
- En Cataluña **NO se usa SES.HOSPEDAJES**; se usa el portal de **Mossos d'Esquadra** (`registreviatgers.mossos.gencat.cat`).
- **No existe una API pública REST.** La comunicación se hace subiendo al portal un **fichero de texto** ("fitxer massiu") o mediante fichas individuales. Los servicios "automáticos" del mercado (CheKin, etc.) automatizan el portal usando las credenciales del establecimiento; no hay endpoint documentado.
- **Estrategia de integración del proyecto (en dos niveles):**
  1. **Generador de fitxer massiu** (núcleo, ya existe en `mossos-fitxer.ts`): produce el `.txt` con el formato exacto. **Imprescindible.**
  2. **Conector de subida** (automatización): inicia sesión y sube el fichero por el establecimiento, descarga el justificante. Implementar como **automatización con navegador headless (Playwright)** con credenciales cifradas. ⚠ Los selectores/flujo deben confirmarse contra el portal en vivo (ver §9). **Mientras tanto, el flujo "generar fichero + subida manual" debe funcionar de forma independiente.**

### 2.2 Formato del fitxer massiu (.txt)
- **Nombre del fichero:** `{identificador}.{secuencia}` + `.txt`. El `identificador` es de **9–10 caracteres alfanuméricos** facilitado por Mossos (p.ej. `08043AAR02`). La secuencia son **3 dígitos** `001`→`999`, y al llegar a `999` reinicia a `001`. ⚠ **El `identificador` NO es el "Id policial" numérico** (000000550); es un código distinto que está en "Dades de l'establiment" del portal.
- **Separador de campos:** carácter pipe `|`.
- **Campos vacíos:** se mantiene igualmente su `|` (no se omite ningún campo).
- **Caracteres:** alfabeto occidental, **conservando acentos** (é, ç, ñ son válidos). **Sin abreviaturas.**
- **Apellidos compuestos:** separados por **un solo espacio** (no comas ni guiones).
- **Codificación:** ⚠ confirmar (probablemente **ISO-8859-1/Latin-1**, app Java legacy). Dejarla configurable.
- El portal **autovalida** el fichero al subirlo y muestra los errores por línea. Tras enviar, ofrece **"Descarregar comprovant d'enviament"** (PDF justificante) — guardarlo siempre; el portal **no conserva histórico**.
- ⚠ **Orden y estructura exactos de los campos:** sólo están en el *Manual d'instruccions de l'usuari* del portal. **No inventarlos** (ver §9). El generador ya tiene un `FIELD_LAYOUT` como stub a rellenar.

### 2.3 Modelo de campos y obligatoriedad condicional
Campos por bloque (CAT = nombre oficial):

- **Contrato/estancia:** tipus_registre*, num_contracte* (+ any), data_formalitzacio*, data_entrada*, data_sortida*, num_viatgers*, tipus_pagament*, num_habitacions, te_internet.
- **Identificación viajero:** tipus_document, num_document, num_suport, data_expedicio.
- **Personales:** nom*, cognom1*, cognom2, sexe, data_naixement, nacionalitat, email, telefon, parentesc.
- **Dirección:** adreca, pais, provincia, municipi, localitat, codi_postal.

**Reglas de obligatoriedad (implementar como validación de negocio):**
- Si **RESERVA**: sólo obligatorios `nom`, `cognom1` y (`email` **o** `telefon`). No exigir el resto.
- Si **CONTRACTE EN CURS**: exigir identificación, personales y dirección, con:
  - `cognom2` obligatorio **si** tipus_document = DNI/NIF.
  - `num_suport` obligatorio **si** tipus_document ∈ {DNI/NIF, NIE}.
  - `tipus_document` y `num_document` **no** obligatorios si el viajero es **menor de 14**.
  - `parentesc` obligatorio **si** el viajero es menor.
  - Si `pais` = Espanya → exigir `provincia` + `municipi`. Si extranjero → exigir `localitat`.
- Validaciones de fecha: `data_formalitzacio ≤ hoy`, `data_naixement ≤ hoy`, `data_expedicio ≤ hoy`, `data_sortida > data_entrada`.

**Valores de enums** (etiqueta humana; el **código literal** del fichero lo da el manual — confirmar):
- `tipus_document`: DNI/NIF · NIE · Passaport · Altres documents (máx. 14 car.)
- `tipus_pagament`: Pagament a destinació · Efectiu · Pagament per mòbil · Plataforma de pagament · Targeta de crèdit · Transferència · Targeta regal
- `sexe`: Home · Dona
- `parentesc`: Avi/àvia, Besavi/besàvia, Besnét/besnéta, Cunyat/cunyada, Cònjuge, Fill/filla, Germà/germana, Nét/néta, Pare o mare, Nebot/neboda, Sogre/sogra, Oncle/tia, Tutor/tutora, Gendre o nora, Altres.

### 2.4 Plazos y retención legales (RD 933/2021 + Ordre IRP/418/2010)
- Comunicar a Mossos en **≤ 24 h** desde el inicio del alojamiento; también comunicar **reservas y cancelaciones**.
- **Conservar** el registro documental **3 años**.
- El incumplimiento conlleva sanciones económicas significativas (de cientos hasta decenas de miles de €). El sistema debe ayudar a no incumplir (alertas de pendientes).

### 2.5 Datos del establecimiento (seed)
`Hostal Coll` · Id policial `000000550` · CIF `40331905W` · Provincia `Barcelona` · file_identifier: **(pendiente, ver §9)**.

---

## 3. Stack y convenciones
- **Frontend:** React + **Next.js (App Router)** + **TypeScript**.
- **Backend:** API REST (Next.js Route Handlers o servicio Node separado; preferir Route Handlers para simplificar).
- **BD:** **PostgreSQL** con **Prisma** (ORM).
- **Auth:** **JWT** + control de roles (ADMIN / RECEPCIO / CONSULTA).
- **Validación:** **Zod** (compartida cliente/servidor).
- **Tests:** Vitest (unitario, sobre todo la lógica de validación y el generador de fichero) + Playwright (e2e críticos).
- **Convenciones:** TypeScript estricto; nada de `any`; commits pequeños por tarea; migraciones Prisma versionadas; **toda** acción relevante escribe en `audit_log`; los documentos de identidad se guardan **cifrados**; **nunca** loguear credenciales de Mossos ni datos de documentos.
- Idioma de la UI: catalán/castellano (preparar i18n; etiquetas oficiales en catalán).

---

## 4. Estructura del proyecto (orientativa)
```
/prisma/schema.prisma
/src/app/(auth)/...
/src/app/(dashboard)/...            # huéspedes, estancias, facturación, gastos, activos, personal
/src/app/api/...                    # route handlers REST
/src/lib/mossos/fitxer.ts           # = mossos-fitxer.ts (ya hecho)
/src/lib/mossos/connector.ts        # Playwright (Fase 1, pendiente selectores)
/src/lib/pdf/fitxa.ts               # ficha firmable "Registre de persones allotjades"
/src/lib/auth/...                   # JWT + RBAC
/src/lib/audit.ts                   # helper audit_log
/src/lib/crypto.ts                  # cifrado de documentos
/src/lib/validation/...             # esquemas Zod + reglas §2.3
/src/components/...
/docs/PLAN.md
```

---

## 5. Modelo de datos completo

> Define en Prisma. Enums en MAYÚSCULAS. Todas las tablas con `id`, `created_at`, `updated_at`. Borrado lógico (`deleted_at`) donde aplique.

### Enums
`Role`(ADMIN,RECEPCIO,CONSULTA) · `TipusRegistre`(CONTRACTE_EN_CURS,RESERVA) · `TipusDocument`(DNI_NIF,NIE,PASSAPORT,ALTRES) · `Sexe`(HOME,DONA) · `TipusPagament`(DESTINACIO,EFECTIU,MOBIL,PLATAFORMA,TARGETA_CREDIT,TRANSFERENCIA,TARGETA_REGAL) · `EstatEnviament`(PENDENT,ENVIAT,ACCEPTAT,REBUTJAT,ERROR) · `Parentesc`(…lista §2.3…) · `MetodeCobrament`(EFECTIU,TARGETA,TRANSFERENCIA,BIZUM,ALTRES) · `EstatActiu`(NOU,BO,REGULAR,SUBSTITUCIO_RECOMANADA,OBSOLET)

### A. Núcleo (Fase 1–2)
- **establiment**: id_policial, file_identifier, nom, cif, provincia, encoding, mossos_user, mossos_pass_enc (cifrado), te_internet_default.
- **usuari**: email, password_hash, nom, role(Role), actiu.
- **huesped** *(ficha única CRM)*: nom, cognom1, cognom2?, sexe?, data_naixement?, nacionalitat?, tipus_document?, num_document?, num_suport?, data_expedicio?, email?, telefon?, adreca?, pais?, provincia?, municipi?, localitat?, codi_postal?. **Índice único** `(tipus_document, num_document)` para dedup (ver lógica CRM §8 Fase 2). Historial de cambios vía `audit_log`.
- **documento_pujat**: huesped_id→, tipus(DNI_ANVERS,DNI_REVERS,PASSAPORT,NIE,RESIDENCIA,ALTRES), fitxer_path (cifrado), mime, data_subida, usuari_id→, historial.
- **estancia** *(= contrato/reserva)*: establiment_id→, tipus_registre(TipusRegistre), num_contracte, any_contracte, data_formalitzacio, data_entrada, data_sortida, num_viatgers, tipus_pagament(TipusPagament), num_habitacions?, habitacio?, te_internet?, observacions?, estat.
- **estancia_viatger** *(join huesped↔estancia)*: estancia_id→, huesped_id→, es_titular(bool), parentesc(Parentesc)?, es_menor(bool).
- **signatura**: estancia_viatger_id→, imatge (base64/path), data, hora, usuari_id→.
- **enviament_mossos**: estancia_id→, estat(EstatEnviament), fitxer_nom, seq, data_enviament?, justificant_path?, codi_validacio?, num_registre?, resposta_raw?, error_msg?.
- **anotacio_huesped** *(registro privado de notas sobre el huésped — buenas o malas)*: huesped_id→ (o estancia_id→), sentit(POSITIVA/NEGATIVA/NEUTRA), tipus?, descripcio (objetiva — ver §7), data, usuari_id→, privada(bool=true), no_acollir(bool=false). **Se muestra en la ficha del huésped cuando vuelve** (Fase 2). `no_acollir` alimenta una lista interna de no-admisión del propio establecimiento (ver §7).

### B. Facturación (Fase 3)
- **factura**: estancia_id→, numero, data, base, iva, total, estat(PENDENT/COBRADA).
- **linia_factura**: factura_id→, concepte(ALLOTJAMENT/EXTRA/DESCOMPTE/TASA), descripcio, import.
- **tasa_turistica**: estancia_id→, nits, import_persona_nit, total. *(IEET — tarifa configurable, ver §9.)*
- **cobrament**: factura_id→, metode(MetodeCobrament), import, data.

### C. Gastos (Fase 4)
- **categoria_gasto**: nom (configurable; seed: Neteja, Manteniment, Electricitat, Aigua, Internet, Assegurances, Màrqueting, Personal, Mobiliari, Electrodomèstics, Reformes, Animals, Altres).
- **proveidor**: nom, cif?, contacte?.
- **gasto**: data, import, categoria_id→, proveidor_id?→, habitacio_id?→ (despesa/reforma associada a una habitació), animal_id?→ (despesa d'un animal), descripcio, metode_pagament(MetodeCobrament), adjunt_path?.

### D. Activos (Fase 5)
- **actiu**: nom, categoria, data_compra, cost, proveidor_id?→, habitacio_id?→ (habitació on està o per a la qual s'ha comprat: p.ex. TV habitació 1/6), garantia_fins?, ubicacio?, num_serie?, factura_path?, estat(EstatActiu).
- **actiu_historial**: actiu_id→, tipus(REPARACIO/AVARIA/CANVI_UBICACIO/SUBSTITUCIO), descripcio, data, cost?.

### E. Personal (Fase 6)
- **treballador**: nom, dni, telefon?, email?, data_contractacio, carrec, salari?, cost_empresa?.
- **absencia**: treballador_id→, tipus(VACANCES/BAIXA/ALTRES), data_inici, data_fi.
- **nomina**: treballador_id→, periode, base, extres, bonificacions, total.

### G. Espacios, limpieza y animales (calendario+limpieza: Fase 1.5 · animales: Fase 5)
- **habitacio** *(habitación del hostal, entidad propia)*: num/nom, descripcio?, capacitat?, estat?. Relacionada con `estancia`, `actiu`, `gasto` y `tasca_neteja` → permite ver compras/reformas **por habitación**.
- **tasca_neteja** *(tarea de limpieza · enums TipusNeteja{CANVI_COMPLET,REPAS} y EstatTasca{PENDENT,FETA})*: data, habitacio_id→, tipus (CANVI_COMPLET = "esbancar"/cambio completo · REPAS = "polir"/repaso), estat, assignada_a(treballador_id?→ — dona de neteja), vinculada_sortida(estancia_id?→), notes?.
- **animal** *(animales del hostal)*: nom, especie, data_naixement?, notes?. Gastos vía `gasto` (categoría "Animals" o `gasto.animal_id`).
- **Calendari:** es una **vista** (no entidad nueva) que agrega `estancia` (entradas/salidas) + `tasca_neteja` (qué días viene la limpieza, qué habitaciones y qué tipo de limpieza).

### F. Sistema (Fase 0, transversal)
- **audit_log**: usuari_id?→, accio(CREACIO/MODIFICACIO/ENVIAMENT/FIRMA/IMPRESSIO/DESCARREGA/LOGIN), entitat, entitat_id, detall(json), ip?, created_at.

---

## 6. Diseño de API (REST)
CRUD estándar por recurso + acciones específicas. Todas protegidas por JWT y RBAC.

- `POST /api/auth/login` · `POST /api/auth/logout`
- `huesped`: `GET/POST /api/huespedes`, `GET/PATCH /api/huespedes/:id`, `GET /api/huespedes/:id/historial` (estancias + estadísticas), `GET /api/huespedes/lookup?doc=` (dedup CRM).
- `documento`: `POST /api/huespedes/:id/documents` (upload + cifrado), `GET /api/documents/:id` (autorizado).
- `estancia`: `GET/POST /api/estancies`, `GET/PATCH /api/estancies/:id`.
- **Mossos**: `POST /api/estancies/:id/fitxer` (genera .txt), `POST /api/estancies/:id/enviament` (sube vía conector → crea `enviament_mossos`), `GET /api/enviaments/:id/justificant` (PDF).
- **Firma**: `POST /api/estancies/:id/viatgers/:vid/firma`.
- **Ficha PDF**: `GET /api/estancies/:id/fitxa-pdf` (modelo "Registre de persones allotjades" firmable).
- **Llibre registre**: `GET /api/llibre?desde=&fins=` (export).
- `factura`, `cobrament`, `gasto`, `proveidor`, `actiu`, `treballador`: CRUD.
- **habitacions**: CRUD `/api/habitacions`; `GET /api/habitacions/:id` (estances, actius i despeses/reformes de la habitació).
- **calendari**: `GET /api/calendari?desde=&fins=` (agrega entrades, sortides i tasques de neteja).
- **neteja**: CRUD `/api/tasques-neteja`; `PATCH /api/tasques-neteja/:id` (marcar FETA).
- **animals**: CRUD `/api/animals`.
- **Dashboard/analítica**: `GET /api/dashboard/resum`, `GET /api/analitica/ingressos?...`, `GET /api/alertes`.
- **Buscador global**: `GET /api/cerca?q=` (huéspedes, estancias, facturas, gastos, activos, trabajadores).
- **Backups/export**: `GET /api/export/excel`, `GET /api/export/pdf`.

---

## 7. Seguridad y RGPD (requisitos)
- **Cifrado en reposo** de documentos de identidad (`crypto.ts`, AES-256-GCM; clave en variable de entorno/secret manager). Acceso a documentos siempre autorizado y auditado.
- **Registro de accesos** y de acciones en `audit_log` (incluye visualizaciones/descargas/impresiones).
- **Retención:** parametrizar plazos. La conservación policial es **3 años**; el CRM tiene su propia base jurídica y plazo (relación contractual + interés legítimo). Implementar **borrado/anonimización** programable y export de datos por interesado (derechos de acceso/portabilidad/supresión).
- **Consentimientos:** registrar el aviso a clientes y, donde aplique, el consentimiento (p.ej. marketing).
- **Anotaciones sobre huéspedes (incl. "no acoger"):** llevar notas privadas (buenas o malas) y una lista interna de no-admisión **dentro de tu único establecimiento** es legítimo — es la versión defendible de lo que, como lista compartida entre hoteles, sería problemático. Requisitos: `descripcio` **objetiva y verificable** (hechos: "trencament de X, foto del [data]"; "factura nº Y impagada"), **no etiquetas subjetivas**; el huésped tiene **derecho de acceso y rectificación** (puede pedir verlas); la decisión de no acoger **no** puede basarse en características protegidas (origen, etnia, religión, etc.) — eso sería discriminación; y **nunca** se comparten fuera del establecimiento ni aparecen en documentos entregados al cliente.
- **Backups** automáticos cifrados con restauración probada.

---

## 8. Plan de implementación por fases (tareas + criterios de aceptación)

### Fase 0 — Fundaciones
**Tareas:** repo + Next.js + TS + Prisma + Postgres; `establiment`, `usuari`, `audit_log`; auth JWT + RBAC; `crypto.ts`; `audit.ts`; seed Hostal Coll; CI con lint+tests.
**Aceptación:** login con los 3 roles funciona; un endpoint protegido rechaza rol no autorizado; toda escritura deja registro en `audit_log`; migraciones aplican en limpio.

### Fase 1 — Núcleo legal (MVP) ⭐
**Tareas:** modelos `huesped`/`estancia`/`estancia_viatger`/`documento_pujat`/`signatura`/`enviament_mossos`; **formulario maestro** con la lógica condicional §2.3 (Zod); upload + OCR opcional de documento con autorrelleno corregible; integrar **`mossos-fitxer.ts`** (`POST .../fitxer`); **conector Playwright** (`POST .../enviament`) **+** flujo "generar fichero para subida manual" como alternativa; **ficha PDF firmable**; **captura de firma posterior** (táctil/ratón/móvil); **llibre de registre** export; máquina de estados de `enviament_mossos` (PENDENT→ENVIAT→ACCEPTAT/REBUTJAT/ERROR); panel con pendientes de firma / pendientes de envío / errores.
**Aceptación:** dado un huésped+estancia, se genera un `.txt` válido (separadores y reglas §2.2) y descargable; la validación bloquea casos inválidos de §2.3 (tests); se genera la ficha PDF y se asocia la firma; el llibre exporta el rango de fechas; el dashboard lista correctamente los pendientes.

### Fase 1.5 — Habitacions, calendari i neteja
**Tareas:** promover `habitacio` a entidad y enlazarla a `estancia`/`actiu`/`gasto`; `tasca_neteja` (tipus CANVI_COMPLET/REPAS, asignación a la dona de neteja, vínculo con salidas); **vista calendario** que agrega entradas, salidas y tareas de limpieza (qué habitaciones y qué tipo de limpieza cada día); **generar automáticamente** una tarea de limpieza al registrarse una salida.
**Aceptación:** el calendario muestra, por día, entradas/salidas y las tareas de limpieza por habitación con su tipo; marcar una tarea como FETA se refleja al instante; las compras/reformas se ven filtradas por habitación.

### Fase 2 — CRM huésped recurrente
**Tareas:** **dedup** por documento (`lookup`): si el huésped existe, **no** crear ficha nueva → recuperar datos + historial y crear **sólo** una nueva `estancia`; permitir actualizar sólo lo cambiado (tel/dirección/email/documento) manteniendo el historial intacto; ficha con datos + historial de visitas + estadísticas (nº visitas, noches acumuladas, gasto total, primera/última visita); `anotacio_huesped` (notas buenas/malas que se muestran al volver, y marca "no acoger" — con §7).
**Aceptación:** registrar un documento ya existente reutiliza la ficha y suma una estancia; el historial previo no se altera; las estadísticas cuadran.

### Fase 3 — Facturación
`factura`/`linia_factura`/`tasa_turistica`/`cobrament`; cálculo de total y tasa turística (IEET configurable); pagos pendientes. **Aceptación:** factura con líneas + IEET cuadra; cobro marca estado COBRADA; aparecen pendientes.

### Fase 4 — Gastos
`gasto`/`categoria_gasto`/`proveidor` con adjuntos. **Aceptación:** alta de gasto con categoría/proveedor/adjunto y filtrado por periodo/categoría.

### Fase 5 — Activos y animales
`actiu`/`actiu_historial`; cálculo de antigüedad y estado; alertas (garantía próxima, mantenimiento, vida útil); `animal` (animales del hostal) con sus gastos asociados. **Aceptación:** un activo muestra antigüedad y dispara alerta de garantía a vencer; los activos/gastos se pueden ver por habitación; un animal acumula sus gastos.

### Fase 6 — Personal
`treballador`/`absencia`/`nomina`. **Aceptación:** alta de trabajador con coste y ausencias.

### Fase 7 — Inteligencia
Dashboard financiero (ingresos/gastos/beneficio/ocupación por periodo); analítica (gráficos por mes/año/habitación/cliente/categoría/proveedor); **alertas automáticas** (sin firma, envíos pendientes, facturas por cobrar, garantías, activos a sustituir, gastos anómalos); **buscador global**; **backups/export** (Excel+PDF). **Aceptación:** el dashboard agrega datos reales de las fases previas y el buscador localiza entidades de todos los módulos.

---

## 9. Pendientes que Claude Code DEBE preguntar (no inventar)
1. **Orden y estructura exactos del fitxer massiu** (qué columnas, en qué orden, y si es una línea por viajero o cabecera+detalle) — del *Manual d'instruccions* del portal. Hasta tenerlo: dejar `FIELD_LAYOUT`/`CODES` como stub con TODO y **no** asumir un orden.
2. **`file_identifier`** real del establecimiento (9–10 car., en "Dades de l'establiment").
3. **Codificación** del `.txt` (ISO-8859-1 vs UTF-8).
4. **Códigos literales** de los enums dentro del fichero (p.ej. si DNI = "D", etc.).
5. **Selectores/flujo del portal** para el conector Playwright (capturar de una sesión real). Mientras tanto, priorizar el flujo de subida manual.
6. **Credenciales Mossos**: dónde/cómo se almacenan (secret manager); nunca en el repo ni en logs.
7. **Tarifa IEET** vigente aplicable al establecimiento (Fase 3).

---

## 10. Activos ya construidos a integrar
- `mossos-fitxer.ts` → `src/lib/mossos/fitxer.ts`: motor de formato + validación condicional + nombre de fichero **completos**; sólo falta rellenar `FIELD_LAYOUT`/`CODES` (punto §9.1/§9.4).
- `modelo-datos-registro-viajeros.md`: diccionario de campos consolidado y mapeo a cada destino (referencia para §2.3 y §5).
- `arquitectura-pms-erp-hostal.md`: visión de módulos y fases (origen de §5 y §8).

---

## 11. Cómo trabajar (proceso con Claude Code)
- Construir **incrementalmente por fases**; no empezar una fase sin que la anterior pase sus criterios de aceptación.
- Tras cada fase: migraciones aplicadas, tests en verde, y una breve demo de los criterios de aceptación.
- **Escribir tests primero** para la lógica de §2.3 (validación) y el generador de fichero §2.2.
- Cross-cutting desde Fase 0: `audit_log` en cada acción, cifrado de documentos, RBAC.
- Ante cualquier ambigüedad de los puntos §9: **preguntar**, no asumir.
```
```
