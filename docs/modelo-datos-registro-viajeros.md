# Registro de viajeros — Modelo de datos único (Hostal Coll, Cataluña)

> Documento de referencia para construir la app. Consolida **todos** los campos del PDF oficial *"Registre de persones allotjades"*, de la web de Mossos (`registreviatgers.mossos.gencat.cat`) y de tus esquemas, **sin duplicados**, con obligatoriedad, validaciones y mapeo a cada destino.

---

## 0. Hallazgos clave (leer antes de programar)

1. **No existe API en tiempo real con Mossos.** La comunicación es telemática pero se hace **subiendo manualmente un fichero a la web**. Hay dos modos:
   - *Fitxes individuals*: alta manual en la web (uno a uno).
   - *Fitxer massiu*: un **`.txt` de texto plano con campos separados por `|` (pipe)** que se sube por la web. La herramienta "acepta los listados que generan las aplicaciones que ya usáis" (PMS).
   - ➡️ Tu app debe **generar el `.txt` con el formato exacto**; la subida la hace una persona. No hay envío programático automático.
2. **Mossos = Generalitat.** Es **un solo** registro obligatorio, no dos. No dupliques módulos.
3. **Plazo legal:** comunicar en ≤ **24 h** desde el inicio del alojamiento (y también al hacerse la reserva). Conservar los datos **3 años** a disposición de Mossos.
4. **Normativa:** Ordre IRP/418/2010 + **RD 933/2021** (Anexo I, ampliación de datos vigente desde finales de 2024). De ahí salen los campos de pago, contacto y parentesco.

### Datos fijos del establecimiento (configuración, no se piden por huésped)
| Campo | Valor |
|---|---|
| ID policial establiment | `000000550` |
| Nom de l'establiment | `HOSTAL COLL` |
| CIF / NIF | `40331905W` |
| Província | `Barcelona` |

---

## 1. Modelo de datos consolidado

Leyenda obligatoriedad: **`O`** = obligatorio siempre · **`O*`** = obligatorio condicional (ver regla) · **`–`** = opcional · **`INT`** = solo uso interno (Mossos no lo pide).

### BLOQUE A — Contrato / Estancia *(una vez por reserva o contrato)*

| Campo (oficial CAT) | Clave interna | Tipo | Oblig. | Validación / Notas |
|---|---|---|---|---|
| Tipus de registre / contracte | `tipus_contracte` | enum | **O** | `CONTRACTE_EN_CURS` \| `RESERVA` (cambia toda la obligatoriedad) |
| ID policial establiment | `id_policial` | fijo | **O** | Constante (000000550) |
| Nom de l'establiment | `nom_establiment` | fijo | **O** | Constante (HOSTAL COLL) |
| Número de contracte | `num_contracte` | texto | **O** | Se acompaña del año (p. ej. `.../2026`) |
| Any del contracte | `any_contracte` | int | **O** | Año en curso |
| Data formalització contracte | `data_formalitzacio` | fecha | **O** | **≤ hoy** |
| Data entrada | `data_entrada` | fecha | **O** | — |
| Data sortida | `data_sortida` | fecha | **O** | **> data_entrada** |
| Número de viatgers | `num_viatgers` | int | **O** | ≥ 1 |
| Tipus de pagament | `tipus_pagament` | enum | **O** | Ver §3 opciones |
| Nombre d'habitacions | `num_habitacions` | int | – | — |
| L'establiment disposa d'internet? | `te_internet` | bool | – | SI/NO |

### BLOQUE B — Identificación del viajero

| Campo (oficial CAT) | Clave interna | Tipo | Oblig. | Validación / Notas |
|---|---|---|---|---|
| Tipus de document | `tipus_document` | enum | **O\*** | `DNI/NIF` \| `NIE` \| `PASSAPORT` \| `ALTRES`. No si **menor** o **reserva** |
| Núm. de document d'identitat | `num_document` | texto | **O\*** | Se valida el formato según tipo; `ALTRES` máx. 14 car. No si menor/reserva |
| Número de suport document | `num_suport` | texto | **O\*** | **Obligatorio si DNI/NIF o NIE**. No si reserva |
| Data d'expedició | `data_expedicio` | fecha | – | **≤ hoy** |
| Data de caducitat | `data_caducitat` | fecha | INT | Útil para tu archivo; Mossos no lo pide |
| País emissor | `pais_emissor` | enum | INT | OCR; Mossos no lo pide |

### BLOQUE C — Datos personales del viajero

| Campo (oficial CAT) | Clave interna | Tipo | Oblig. | Validación / Notas |
|---|---|---|---|---|
| Nom | `nom` | texto | **O** | Siempre (incl. reserva) |
| Primer cognom (1r cognom) | `cognom1` | texto | **O** | Siempre (incl. reserva) |
| Segon cognom (2n cognom) | `cognom2` | texto | **O\*** | **Obligatorio si tipus_document = DNI/NIF** |
| Sexe | `sexe` | enum | – | `Home` \| `Dona` (desplegable) |
| Data de naixement | `data_naixement` | fecha | **O\*** | **≤ hoy**. No exigido en reserva |
| País / Nacionalitat | `nacionalitat` | enum | **O\*** | No exigido en reserva |
| Lloc de naixement | `lloc_naixement` | texto | INT | Tu spec lo pedía; Mossos no lo pide |
| Correu electrònic | `email` | email | **O\*** | En reserva: email **o** teléfono (al menos uno) |
| Telèfon | `telefon` | tel | **O\*** | En reserva: email **o** teléfono. RD 933 contempla fijo + móvil |
| Relació de parentesc | `parentesc` | enum | **O\*** | **Obligatorio si viajero menor + contracte en curs**. Ver §3 |

### BLOQUE D — Dirección postal del viajero

| Campo (oficial CAT) | Clave interna | Tipo | Oblig. | Validación / Notas |
|---|---|---|---|---|
| Adreça postal | `adreca` | texto | **O\*** | **Obligatorio si contracte en curs**. No en reserva |
| País | `pais` | enum | **O\*** | Si **Espanya** → província+municipi; si **estranger** → localitat |
| Província | `provincia` | enum | **O\*** | Obligatorio si país = Espanya |
| Municipi | `municipi` | enum | **O\*** | Obligatorio si país = Espanya |
| Localitat | `localitat` | texto | **O\*** | Obligatorio si país = estranger |
| Codi postal | `codi_postal` | texto | **O** | — |

### BLOQUE E — Firma *(se captura DESPUÉS, no en el alta)*

| Campo | Clave interna | Tipo | Oblig. | Notas |
|---|---|---|---|---|
| Signatura de la persona allotjada | `signatura_img` | imagen | INT | Tu flujo: ficha → firma → asociar |
| Localitat i data de signatura | `signatura_lloc_data` | texto+fecha | INT | — |
| Usuari + data/hora captura | `signatura_meta` | meta | INT | Auditoría |

### BLOQUE F — Datos de pago ampliados (RD 933/2021) — archivo interno

> La web de Mossos hoy captura solo **`tipus_pagament`**, pero el RD 933/2021 obliga a **conservar en tu archivo** el detalle del medio de pago. Recógelo en tu BD (cifrado), aunque no se transmita.

| Campo | Clave interna | Tipo | Notas |
|---|---|---|---|
| Tipus de targeta | `pag_tipus_targeta` | enum | Si aplica |
| Núm. / últimos dígitos | `pag_num_targeta` | texto | **Cifrar**; guardar solo lo imprescindible |
| IBAN | `pag_iban` | texto | Si transferencia; cifrar |
| Titular del mitjà de pagament | `pag_titular` | texto | — |
| Data de caducitat del mitjà | `pag_caducitat` | fecha | — |
| Data de pagament | `pag_data` | fecha | — |

---

## 2. Mapeo: ¿a dónde va cada campo?

- **MOSSOS** = se incluye en el fitxer massiu / ficha que se sube a Mossos (= Generalitat).
- **LLIBRE** = libro/archivo interno de viajeros (conservar 3 años).
- **INT** = solo gestión interna (no obligatorio legalmente).

| Campo | MOSSOS | LLIBRE | INT |
|---|:--:|:--:|:--:|
| tipus_contracte | ✅ | ✅ | |
| num_contracte / any | ✅ | ✅ | |
| data_formalitzacio | ✅ | ✅ | |
| data_entrada / data_sortida | ✅ | ✅ | |
| num_viatgers | ✅ | ✅ | |
| tipus_pagament | ✅ | ✅ | |
| num_habitacions / te_internet | ✅ | ✅ | |
| tipus_document / num_document / num_suport | ✅ | ✅ | |
| data_expedicio | ✅ | ✅ | |
| data_caducitat / pais_emissor / lloc_naixement | | | ✅ |
| nom / cognom1 / cognom2 | ✅ | ✅ | |
| sexe / data_naixement / nacionalitat | ✅ | ✅ | |
| email / telefon | ✅ | ✅ | |
| parentesc | ✅ | ✅ | |
| adreca / pais / provincia / municipi / localitat / codi_postal | ✅ | ✅ | |
| signatura_* | | ✅ | |
| pag_* (detalle medio de pago) | | ✅ | |
| documento subido (foto DNI/pasaporte) | | ✅ | |

➡️ **Filosofía "una vez y reutilizar":** un único `Huesped` + un único `Estancia/Contrato`. El fitxer massiu, el libro y la ficha firmable son **vistas** de esos mismos datos. Nada se reintroduce.

---

## 3. Valores de los desplegables (enum)

**tipus_contracte:** `Contracte en curs` · `Reserva`

**tipus_document:** `DNI/NIF` · `NIE` · `Passaport` · `Altres documents` (máx. 14 car.)

**tipus_pagament:** `Pagament a destinació` · `Efectiu` · `Pagament per mòbil` · `Plataforma de pagament` · `Targeta de crèdit` · `Transferència` · `Targeta regal`

**sexe:** `Home` · `Dona`

**relació de parentesc:** `Avi/àvia` · `Besavi/besàvia` · `Besnét/besnéta` · `Cunyat/cunyada` · `Cònjuge` · `Fill/filla` · `Germà/germana` · `Nét/néta` · `Pare o mare` · `Nebot/neboda` · `Sogre/sogra` · `Oncle/tia` · `Tutor/tutora` · `Gendre o nora` · `Altres`

**te_internet:** `SI` · `NO`

---

## 4. Reglas condicionales (lógica del formulario)

```
SI tipus_contracte == RESERVA:
    Obligatorio SOLO: nom, cognom1, y (email O telefon)
    No exigir: documento, dirección, fecha nacimiento, etc.

SI tipus_contracte == CONTRACTE_EN_CURS:
    Exigir bloques B, C y D completos según reglas:

    - cognom2  obligatorio  SI tipus_document == DNI/NIF
    - num_suport obligatorio SI tipus_document ∈ {DNI/NIF, NIE}
    - documento/num_document NO obligatorio SI viajero es MENOR de 14
    - parentesc obligatorio  SI viajero es MENOR
    - SI pais == Espanya: exigir provincia + municipi
      SI pais == estranger: exigir localitat

Validaciones de fecha:
    data_formalitzacio <= hoy
    data_naixement     <= hoy
    data_expedicio     <= hoy
    data_sortida       >  data_entrada
```

---

## 5. Análisis de tu formulario original (gaps)

**Te faltaban (obligatorios):**
- `tipus_pagament` ⚠️ (obligatorio, no estaba)
- `num_suport` (nº de soporte del DNI/NIE)
- `num_contracte` + `data_formalitzacio`
- `parentesc` (obligatorio para menores)
- `num_habitacions`, `te_internet` (nivel establecimiento)
- Detalle de pago RD 933 (bloque F) para archivo interno
- `localitat i data` de la firma

**Tenías de más (no los pide Mossos; déjalos como INT opcionales):**
- `data_caducitat`, `lloc_naixement`, `pais_emissor`

---

## 6. Formato del fitxer massiu (.txt) — la "integración"

- **Nombre del fichero:** `{ID_establiment}.{secuencia}` → p. ej. `000000550.001`, `.002`… (3 dígitos, de `.001` a `.999`, luego reinicia). Extensión `.txt`.
- **Codificación:** texto plano, alfabeto occidental, **sin abreviaturas**.
- **Separador de campos:** `|` (pipe). **Los campos vacíos también llevan su `|`** (no se omiten).
- **Apellidos compuestos:** separados por **un solo espacio**, no por otros signos.
- La web **valida** el fichero al subirlo y muestra los errores por línea si los hay.
- Tras subir: opción **"Descarregar comprovant d'enviament"** (PDF justificante). ⚠️ Mossos **no** guarda histórico ni devuelve los datos: el justificante y el archivo de 3 años son **tu** responsabilidad.
- ➡️ **Acción:** confirma el **orden exacto de columnas** del fitxer massiu en el *Manual d'instruccions de l'usuari* (apartado "Documentació i enllaços" dentro de la propia web de Mossos, ya logueada). El orden de columnas no es público; necesitas ese manual para mapear `clave_interna → posición en el pipe`.

---

## 7. Próximos pasos sugeridos (por orden)

1. **Modelo de BD** (PostgreSQL) a partir de estas tablas: `establiment`, `huesped`, `estancia`, `document_pujat`, `signatura`, `enviament_mossos`, `audit_log`.
2. **Formulario maestro** con la lógica condicional de §4.
3. **Generador de fitxer massiu** `.txt` (en cuanto tengas el orden de columnas del manual).
4. **Generación de la ficha PDF firmable** (= el modelo oficial *Registre de persones allotjades*) para el flujo de firma posterior.
5. **OCR** del DNI/pasaporte → autorrellenado (corregible).
6. **Auditoría + RGPD**: cifrado de documentos, registro de accesos, política de borrado, encargado de tratamiento.

> Nota RGPD: estás tratando documentos de identidad y datos sensibles de **tu propio** establecimiento (entidad única) por **obligación legal** — base jurídica sólida. Cíñete a recoger lo exigido, cifra los documentos y define la retención (3 años para lo policial; revisa plazos para el resto).
