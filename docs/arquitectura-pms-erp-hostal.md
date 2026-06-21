# PMS + ERP Hostal Coll — Arquitectura y hoja de ruta

> El proyecto ha crecido de "registro de viajeros" a un **PMS + ERP integral**. Todo se apoya en **un único modelo de datos**: el huésped del registro policial es el mismo cliente del CRM y el mismo de facturación. Se introduce una vez y se reutiliza en todo.

---

## 1. Modelo de datos unificado (entidades)

### A. Núcleo — identidad y estancias *(Fase 1–2)*

| Entidad | Propósito | Campos clave | Relaciones |
|---|---|---|---|
| `establiment` | Config del hostal | id_policial (000000550), file_identifier, nom, cif, encoding, credenciales Mossos (cifradas) | — |
| `huesped` | **Ficha única** de persona (CRM). Dedup por documento | nom, cognoms, sexe, data_naixement, nacionalitat, tipus_doc, num_doc, num_suport, email, telèfon, adreça… | 1—N `estancia_viatger` |
| `documento_pujat` | Archivo de DNI/pasaporte | tipo, fichero (cifrado), fecha_subida, usuario, historial | N—1 `huesped` |
| `estancia` | Una visita = contrato/reserva | tipus_registre, num_contracte, dates, habitació, num_viatgers, tipus_pagament, importes, estat | 1—N `estancia_viatger`, 1—N `factura` |
| `estancia_viatger` | Une huésped ↔ estancia | es_titular, parentesc | N—1 `huesped`, N—1 `estancia` |
| `signatura` | Firma del huésped (posterior) | imagen, data, hora, usuari_captura | N—1 `estancia_viatger` |
| `enviament_mossos` | Estado del envío policial | estat (pendent/enviat/acceptat/rebutjat/error), fitxer_nom, seq, data, justificant_pdf, resposta | N—1 `estancia` |
| `incidencia_interna` | Nota privada del hostal | tipus, descripció (objetiva), data, usuari | N—1 `huesped` / `estancia` |

### B. Facturación e ingresos *(Fase 3)*
| Entidad | Campos clave | Relaciones |
|---|---|---|
| `factura` | número, data, base, IVA, total, estat (pendent/cobrada) | N—1 `estancia` |
| `linia_factura` | concepte (allotjament/extra/descompte), import | N—1 `factura` |
| `tasa_turistica` (IEET) | nits, import/persona, total | N—1 `estancia` |
| `cobrament` | mètode (efectiu/targeta/transferència/Bizum/altres), import, data | N—1 `factura` |

### C. Gastos *(Fase 4)*
`gasto` (data, import, categoria, proveïdor, descripció, mètode_pagament, factura_adjunta) · `categoria_gasto` (configurable) · `proveidor`

### D. Activos / inventario *(Fase 5)*
`actiu` (nom, categoria, data_compra, cost, proveïdor, garantia_fins, ubicació, num_serie, factura, estat) · `actiu_historial` (reparacions, avaries, canvis ubicació, substitucions)

### E. Personal *(Fase 6)*
`treballador` (nom, DNI, contacte, data_contractació, càrrec, salari, cost_empresa) · `absencia` (vacances/baixes) · `nomina` (pagues, extres, bonificacions)

### F. Sistema *(Fase 0, transversal)*
`usuari` (rol: admin / recepció / consulta) · `audit_log` (tot: creació, modificació, enviament, firma, impressió, descàrrega → usuari + data + acció + entitat) · `backup` / export

---

## 2. Hoja de ruta por fases

El orden prioriza **lo legalmente obligatorio y con plazos** primero (multas de hasta decenas de miles de €), luego lo que aporta valor de forma acumulativa.

| Fase | Qué incluye | Por qué este orden |
|---|---|---|
| **0 — Fundaciones** | DB, autenticación + roles, `audit_log`, config del establecimiento, base RGPD (cifrado de documentos, registro de accesos, retención) | Todo lo demás se apoya aquí |
| **1 — Núcleo legal (MVP)** | Formulario maestro · huésped/estancia/viajeros · **generador fitxer massiu** · **conector Mossos** · ficha firmable PDF · llibre de registre · archivo documental · firma | Es lo urgente: plazo de 24 h y sanciones |
| **2 — CRM recurrente** | Dedup por documento, recuperar datos, historial de visitas, estadísticas, incidencias internas | Reduce trabajo en cada check-in |
| **3 — Facturación** | Facturas, líneas, cobros, tasa turística (IEET), pagos pendientes | Empieza el lado económico |
| **4 — Gastos** | Gastos, categorías, proveedores, adjuntos | Completa ingresos − gastos |
| **5 — Activos** | Inventario, ciclo de vida, alertas de garantía/sustitución | Operativa a medio plazo |
| **6 — Personal** | Trabajadores, costes, ausencias | — |
| **7 — Inteligencia** | Dashboard financiero, analítica, alertas automáticas, buscador global, backups/export | Se nutre de todo lo anterior |

---

## 3. Nota RGPD sobre el CRM y las "incidencias internas"

Guardar los datos de **tus propios** huéspedes entre estancias y llevar un CRM es legítimo, pero conviene tenerlo bien montado (esto es la versión defensible, dentro de **una sola entidad**, de lo que en formato "lista compartida entre hoteles" sería problemático):

- **Base jurídica y retención propias.** La conservación de 3 años es la obligación *policial*; el CRM/marketing necesita su propia base (relación contractual + interés legítimo) y su propio plazo. Defínelos por separado.
- **Incidencias objetivas, no etiquetas.** Registra hechos verificables ("rotura de X, foto del [fecha]", "factura nº Y impagada") en lugar de juicios ("cliente conflictivo"). El huésped tiene **derecho de acceso y rectificación**: puede pedir ver lo que has anotado sobre él.
- **Minimización y nunca compartir fuera.** Solo lo necesario, y esas notas no salen de tu establecimiento ni aparecen en documentos entregados al cliente.

No es un bloqueo: es construir ese campo como "hechos documentados y accesibles".

---

## 4. Stack (confirmado) y qué ya está hecho

- **Frontend:** React + Next.js + TypeScript · **Backend:** Node.js + REST · **BD:** PostgreSQL (sugiero **Prisma** como ORM, encaja con TS) · **Auth:** JWT + roles.
- **Ya construido y reutilizable en Fase 1:** el modelo de campos consolidado (`modelo-datos-registro-viajeros.md`) y el **generador del fitxer massiu** (`mossos-fitxer.ts`). El conector de subida a Mossos queda pendiente del layout del manual.

---

## 5. Próximo paso recomendado

Empezar por **Fase 0 + 1**: escribir el esquema PostgreSQL del núcleo (establiment, huesped, estancia, estancia_viatger, enviament_mossos, documento_pujat, signatura, usuari, audit_log) — construido para que la Fase 2 (CRM) encaje sin retoques. Sobre eso montamos el formulario maestro y enganchamos el generador de fichero.
