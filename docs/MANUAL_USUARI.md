# Manual d'usuari — Gestió Hostal Coll

> **A qui va dirigit:** Qualsevol persona que entra per primer cop a la web de gestió i vol aprendre a usar-la de zero, sense coneixements previs.
>
> **URL de la web:** `https://gestio.hostalcoll.com`

---

## Taula de continguts

1. [Primer accés i inici de sessió](#1-primer-accés-i-inici-de-sessió)
2. [Tauler principal (Dashboard)](#2-tauler-principal-dashboard)
3. [Clients](#3-clients)
4. [Estades i reserves](#4-estades-i-reserves)
5. [Registre de viatgers (Mossos)](#5-registre-de-viatgers-mossos)
6. [Calendari](#6-calendari)
7. [Neteja](#7-neteja)
8. [Facturació](#8-facturació)
9. [Despeses](#9-despeses)
10. [Personal](#10-personal)
11. [Manteniment](#11-manteniment)
12. [Proveïdors i serveis](#12-proveïdors-i-serveis)
13. [Comptabilitat i balanç](#13-comptabilitat-i-balanç)
14. [Tarifes](#14-tarifes)
15. [Avisos interns](#15-avisos-interns)
16. [Llibre de viatgers](#16-llibre-de-viatgers)
17. [Veri·Factu (facturació fiscal)](#17-verifactu-facturació-fiscal)
18. [Flux ideal dia a dia](#18-flux-ideal-dia-a-dia)
19. [Errors i situacions habituals](#19-errors-i-situacions-habituals)

---

## 1. Primer accés i inici de sessió

### Com entrar

1. Obre el navegador (Chrome, Firefox, Edge o Safari) i ves a `https://gestio.hostalcoll.com`.
2. Apareixerà la pantalla d'inici de sessió.
3. Introdueix el teu **correu electrònic** i **contrasenya**.
4. Clica **"Inicia sessió"**.

### Rols d'usuari

Hi ha tres nivells d'accés:

| Rol | Qui és | Què pot fer |
|-----|--------|-------------|
| **ADMIN** | La propietària o gestora | Tot: crear, editar, eliminar, veure finances, pagar personal |
| **RECEPCIO** | Recepcionista | Crear i editar estades, registrar viatgers, gestionar neteja i calendari |
| **CONSULTA** | Personal de confiança | Només consultar, sense poder modificar res |

> Si no pots entrar, demana a l'administradora que comprovi les teves credencials a la configuració.

### Tancar sessió

A la part superior dreta, clica la teva inicial o nom i selecciona "Tancar sessió".

---

## 2. Tauler principal (Dashboard)

**Accés:** Clicar "Tauler" al menú esquerre o anar a `https://gestio.hostalcoll.com/`

El tauler és la **pantalla d'inici** i mostra d'un cop d'ull tot el que necessites saber per gestionar el dia.

### Targetes d'alerta (part superior)

Cada targeta de color representa una situació que requereix atenció:

- 🟡 **Comunicacions Mossos pendents** — Estades que s'han de comunicar als Mossos d'Esquadra (termini: 24 h des del check-in).
- 🔴 **Terminis Mossos vençuts** — Estades que ja han superat les 24 h sense comunicar. Cal actuar immediatament.
- 🟠 **Documents sense signar** — Fitxes d'hoste sense firma.
- 🔴 **Errors d'enviament** — Fitxers enviats als Mossos que han fallat.
- 🟣 **Factures pendents de cobrar** — Factures emeses però no cobrades.
- 🟢 **Actius amb alerta** — Equipaments amb garantia a punt de vèncer o molt antics.
- 🔵 **Serveis que vencen aviat** — Contractes o serveis recurrents que cal renovar.

> Clicant qualsevol targeta vas directament a la secció corresponent per resoldre-ho.

### Entrades i sortides properes (7 dies)

A la meitat inferior hi ha dues columnes:

- **Entrades properes** — Qui arriba en els propers 7 dies, amb nom, habitació i data.
- **Sortides properes** — Qui marxa en els propers 7 dies.

Cada línia mostra les inicials de l'hoste, el nom complet, l'habitació i si ha de rebre algun servei especial.

### Per on començar cada dia

1. Revisa les alertes de la part superior. Si n'hi ha de vermelles, resol-les primer.
2. Comprova les **sortides del dia** → avisa la persona de neteja.
3. Comprova les **entrades del dia** → assegura't que les habitacions estan a punt.

---

## 3. Clients

**Accés:** Menú esquerre → "Clients"

### Què és

El directori de **tots els hostes que han passat per l'hostal** o que estan en reserva. Cada persona és un client únic al sistema: si el mateix hoste torna, la seva fitxa ja hi és i no cal tornar a introduir les seves dades.

### Com buscar un client

A la part superior hi ha un **camp de cerca** lliure. Pots buscar per:
- Nom o cognom
- Número de document (DNI, NIE, Passaport)
- Correu electrònic
- Telèfon

### Informació visible a la llista

Cada targeta de client mostra:
- **Inicials** amb un color únic (per identificar-lo visualment)
- Nom complet
- Tipus i número de document
- Correu i/o telèfon
- Nombre d'estades registrades
- Badges especials:
  - 🔴 **"No acollir"** — L'hoste té una alerta activa (veure secció [15. Avisos](#15-avisos-interns))
  - 🐾 **Mascota** — L'hoste té animal registrat

### Fitxa individual del client

Clicant sobre qualsevol client s'obre la seva fitxa completa amb:
- Dades personals i de contacte
- Historial complet d'estades
- Documents d'identitat pujats (xifrats)
- Mascotes registrades
- Anotacions internes
- Avisos actius

### Editar un client

A la fitxa del client, hi ha el botó **"Editar"**. Pots modificar:
- Nom, cognoms
- Document d'identitat
- Correu, telèfon, adreça

> **Nota important:** Si canvies les dades d'un client, el canvi es reflecteix a totes les estades passades i futures perquè és el mateix registre.

---

## 4. Estades i reserves

**Accés:** Menú esquerre → "Estades"

### Concepte clau: els estats d'una estada

Cada estada passa pels següents estats:

```
ESBORRANY → RESERVA → EN CURS (allotjat) → FINALITZADA
                                          ↘ CAL·LADA
```

| Estat | Significat |
|-------|------------|
| **Esborrany** | S'ha començat a omplir però no s'ha desat completament |
| **Reserva** | L'hoste ha reservat però no ha arribat encara |
| **En curs** | L'hoste és a l'hostal ara mateix |
| **Finalitzada** | L'hoste ha marxat i tot està tancat |
| **Cancel·lada** | La reserva o estada s'ha cancel·lat |

### Llista d'estades

La llista mostra totes les estades amb:
- Nom de l'hoste titular
- Número de contracte i any
- Dates d'entrada i sortida
- Habitació
- Nombre de viatgers
- Estat (color al lateral esquerre)
- Icona de l'estat de comunicació amb Mossos

**Filtres ràpids** (pestanyes a la part superior):
- **Totes** — Veure-les totes
- **En curs** — Qui hi és ara
- **Reserva** — Reserves pendents d'entrada
- **Finalitzada** — Estades tancades
- **Cancel·lada** — Cancel·lacions

---

### Crear una nova estada

**Accés:** Botó "+ Nova estada" a la llista, o menú → "Estades" → "Nova"

El formulari és el **punt central de tot el sistema**: les mateixes dades serveixen per al registre de Mossos, per a la factura, per al CRM i per al llibre de viatgers. **Cada dada s'introdueix una sola vegada.**

#### Pas 1: Informació bàsica de l'estada

- **Habitació** — Selecciona l'habitació on s'allotjarà
- **Data d'entrada** — Quan arriba
- **Data de sortida** — Quan marxa
- **Tipus de registre:**
  - *Reserva* — No ha arribat encara (el número de contracte és opcional)
  - *Contracte en curs* — Ja és aquí (el número de contracte és **obligatori**)
- **Número de contracte** — El número que apareix a la reserva o confirmació (exemple: "2026/045")
- **Mètode de pagament** — Efectiu, targeta, transferència, etc.

#### Pas 2: Dades del viatger titular

- **Nom i cognoms** — Tal com surten al document d'identitat
- **Tipus de document** — DNI, NIE, Passaport, o altre
- **Número de document**
- **Número de suport** (obligatori per a DNI i NIE) — El número imprès al revers del document
- **Data de naixement**
- **Sexe**
- **Nacionalitat** — País en format ISO (el sistema té un selector)
- **Adreça** — Si és espanyol: província i municipi (amb selector oficial INE); si és estranger: localitat i país

> **Per a menors de 14 anys:** El document d'identitat no és obligatori, però sí cal indicar el parentesc amb el titular (fill/a, etc.)

#### Pas 3: Més viatgers (si n'hi ha)

Si l'habitació és per a més d'una persona, pots afegir la resta de viatgers clicant **"+ Afegir viatger"**. Cada viatger addicional necessita les mateixes dades que el titular.

#### Autoscàner de document (OCR)

Al costat del camp de document hi ha el botó **"Escanejar document"**. Funciona amb la càmera del dispositiu:
1. Clica el botó
2. Apunta la càmera al document (DNI o passaport)
3. El sistema llegeix la zona MRZ (les dues línies de caràcters al final del document)
4. Les dades s'omplen automàticament: nom, cognoms, document, data de naixement, sexe i nacionalitat

> **Consell:** Funciona millor amb bona il·luminació i el document ben pla.

#### Desar el formulari

- **Si és una Reserva:** Pots desar sense número de contracte. Les dades es guarden i pots completar-les quan l'hoste arribi.
- **Si és Contracte en curs:** Cal omplir tots els camps obligatoris (marcats amb \*).

Si tanques el navegador o navegues a una altra pàgina accidentalment, el sistema guarda un **esborrany local** perquè no perdis la feina.

El botó **"Buidar tot el formulari"** (icona de fletxa circular) esborra tots els camps i l'esborrany guardant, amb confirmació prèvia.

---

### Detall d'una estada

Clicant sobre qualsevol estada de la llista s'obre el detall complet.

#### Seccions de la fitxa d'estada

**Informació general**
- Dates, habitació, número de contracte, mètode de pagament
- Estat actual amb botó per canviar-lo

**Viatgers**
- Llista de tots els viatgers registrats amb les seves dades
- Botó "Editar" per modificar les dades de cadascun
- Camp de firma: es pot capturar la firma digital des de la pantalla tàctil o indicar que s'ha signat en paper

**Fitxa PDF**
- Botó **"Fitxa PDF"** — Genera un PDF oficial del "Registre de persones allotjades" amb totes les dades i la firma incrustada (si s'ha capturat digitalment). Aquest document es pot imprimir o guardar.

**Mossos d'Esquadra**
- Estat de la comunicació (pendent, enviat, acceptat, error)
- Botó per generar i descarregar el fitxer `.txt` per pujar manualment al portal de Mossos
- Historial d'enviaments

**Factures**
- Llista de factures emeses per aquesta estada
- Botó per crear una nova factura

**Pagaments i dipòsits** *(només ADMIN)*
- Registre de pagaments rebuts
- Dipòsits en custòdia

#### Passar de Reserva a Contracte en curs (Check-in)

Quan l'hoste reservat arriba:
1. Obre la fitxa de l'estada
2. Apareix el bloc **"Check-in"** amb un camp per introduir el número de contracte
3. Introdueix el número i clica **"Fer check-in"**
4. L'estada passa automàticament a estat "En curs" i el tipus de registre es canvia a "Contracte en curs"

Si necessites modificar les dades de l'hoste (per exemple, perquè va fer la reserva sense document i ara el tens), clica **"Editar totes les dades primer"** per anar al formulari complet.

#### Eliminar una estada

Només es pot eliminar si:
- No s'ha comunicat als Mossos, **o**
- No té factures emeses

El sistema demanarà confirmació doble abans d'eliminar.

---

## 5. Registre de viatgers (Mossos)

### Marc legal (Catalunya)

En Catalunya **no s'usa el sistema SES.HOSPEDAJES** com a la resta d'Espanya. Cal comunicar els hostes al portal dels **Mossos d'Esquadra**: `registreviatgers.mossos.gencat.cat`

**Termini legal: màxim 24 hores** des que l'hoste fa el check-in.  
**Conservació de dades: mínim 3 anys.**

### Com comunicar una estada als Mossos

Des del detall de l'estada (secció "Mossos d'Esquadra"):

1. Clica **"Generar fitxer"** — El sistema crea automàticament el fitxer `.txt` amb el format oficial (Manual v8, maig 2025)
2. Descarrega el fitxer
3. Entra al portal de Mossos manualment
4. Puja el fitxer descarregat
5. Anota el número de validació que et dona el portal
6. Torna a la fitxa i marca l'enviament com a fet (opcional però recomanat per al seguiment)

### El fitxer `.txt`

El fitxer té el format oficial confirmat amb el Manual d'instruccions v8:
- **Línia tipus 1:** Dades de l'establiment (Hostal Coll, Id policial 000000550)
- **Línies tipus 2:** Una per cada viatger, amb tots els camps separats per `|`
- Codificació: ISO-8859-1 (latin1), accepta accents (é, ç, ñ)
- Dates en format `yyyyMMdd`, hores en `HHmm`
- Municipis en codi INE de 6 dígits, països en codi ISO 3166-1 Alfa-3

### Alertes al tauler

- 🟡 **Groc:** Comunicació pendent (dins les 24 h)
- 🔴 **Vermell:** Termini vençut (han passat les 24 h sense comunicar)

### Llibre de viatgers

**Accés:** Menú → "Registre de viatgers" o "Llibre"

Mostra totes les estades comunicades i pendents, amb opció d'exportar a CSV per als controls d'inspecció. Veure [secció 16](#16-llibre-de-viatgers) per a més detalls.

---

## 6. Calendari

**Accés:** Menú esquerre → "Calendari"

### Vistes disponibles

- **Mes** — Vista mensual completa (per defecte)
- **Setmana** — Vista de 7 dies amb més detall

Navegació: botons `<` i `>` per avançar/retrocedir, botó **"Avui"** per tornar al dia actual.

### Tipus d'esdeveniments (codificats per colors)

| Color | Tipus | Significat |
|-------|-------|------------|
| 🟢 Verd | Entrades | Check-in d'hostes |
| 🔴 Granate | Sortides | Check-out d'hostes |
| 🟡 Ambre | Neteja | Tasques de neteja assignades |
| 🔵 Blau cel | Serveis | Serveis recurrents (manteniment extern, etc.) |

### Filtres

A la part superior del calendari hi ha filtres en forma de píndoles:

- **Entrades** — Mostra/amaga check-ins
- **Sortides** — Mostra/amaga check-outs
- **Neteja** — Mostra/amaga tasques de neteja
- **Serveis** — Mostra/amaga serveis recurrents

Quan el filtre de **Neteja** està actiu, apareix un desplegable addicional **"Tots el personal"** per filtrar les tasques per treballadora concreta.

> **Important:** Si selecciones una treballadora i marques una tasca com a feta al calendari, la tasca s'assigna automàticament a ella i es crea la jornada de pagament corresponent.

### Treballar amb el calendari

**Clicar un dia** obre un panell lateral amb:
- Llista detallada de tots els esdeveniments d'aquell dia
- Per a les tasques de neteja: botó per marcar-les com a fetes o pendents
- Per a les estades: enllaç directe a la fitxa

**Marcar una tasca de neteja com a feta:**
1. Activa el filtre "Neteja"
2. Selecciona la treballadora al desplegable
3. Clica el dia
4. Marca la tasca com a feta ✓

Si no selecciones treballadora, surt un avís groc recordant que cal seleccionar-la perquè el pagament es registri correctament.

### Avís de "Sense assignar"

Si apareix en taronja "Sense assignar" a `/neteja → Pròxims dies`, vol dir que hi ha una tasca sense treballadora assignada. Cal anar a la neteja d'aquell dia, seleccionar la treballadora i desar el full.

---

## 7. Neteja

**Accés:** Menú esquerre → "Neteja"

### Concepte

La pàgina de neteja és el **full diari de feines** per a cada persona de neteja. Aquí es registra qui fa quin quarto, quins dies, i quant se li paga.

### Com usar la pàgina de neteja

#### Pas 1: Selecciona el dia i la persona

A la part superior:
- **Dia** — Pots canviar la data (per defecte, avui)
- **Persona encarregada** — Selecciona la treballadora del desplegable

Quan selecciones persona i dia, el sistema mostra la llista de totes les habitacions.

#### Pas 2: Marca les habitacions

Cada habitació apareix com una fila amb una **casella de verificació**. Marca les que la treballadora ha de netejar (o que ja ha netejat).

Per a cada habitació marcada, pots triar:
- **Tipus de neteja:**
  - *Sortida (canvi complet)* — L'hoste ha marxat, cal canviar tot (llençols, tovalloles, neteja a fons). Tarifa: preu de sortida.
  - *Manteniment (repàs)* — L'hoste continua, neteja superficial sense canviar la roba. Tarifa: preu de manteniment.
- **Nota** — Per indicar alguna particularitat ("porta clau a consergeria", "no molesteu fins les 11", etc.)

**Zones comunes** — A la llista d'habitacions hi ha una fila especial per a les zones comunes (passadís, vorera, pati, etc.). Es marca igual que les habitacions individuals, amb la seva tarifa pròpia.

#### Pas 3: Desar el full

Clica **"Desar full"**. El sistema guarda les tasques i calcula automàticament el **total a pagar** basant-se en les tarifes configurades per a cada treballadora:

```
Total = (nº sortides × preu sortida) + (nº manteniments × preu manteniment) + (zones comunes × preu zones)
```

#### Pas 4: Registrar el pagament

A la part inferior apareix **"A pagar: X,XX €"** amb un botó **"Registrar pagament"**. Clicant-lo:
- Es crea una jornada de pagament per a aquella treballadora
- Es registra a la fitxa del personal
- Apareix a la secció de "Despeses → Personal" i al balanç mensual

> **Nota:** El registre del pagament no vol dir que s'hagi pagat físicament, sinó que queda registrat per al control de despeses de personal.

### Marcar tasques com a fetes

Pots marcar cada tasca individualment com a **Feta** o **Pendent** clicant la icona ✓ que apareix al costat de cada habitació un cop el full està desat.

### Eliminar un pagament registrat

Si has comès un error, a la part inferior apareixerà la jornada registrada amb un botó de paperera 🗑. Clicant-lo (amb confirmació doble) s'elimina el pagament **i totes les tasques associades** a aquell dia per a aquella treballadora.

### Pròxims dies

A la part inferior de la pàgina hi ha un resum dels **propers 7 dies** que mostra, per a cada dia i treballadora, quantes tasques hi ha i quantes s'han fet. Clicar **"Obrir"** porta directament al full de neteja d'aquell dia.

---

## 8. Facturació

**Accés:** Menú esquerre → "Factures" (o des del detall d'una estada)

### Tipus de documents

| Tipus | Quan usar-lo | Entra a Veri·Factu? |
|-------|-------------|---------------------|
| **Rebut** | Pagament simple sense dades fiscals | No |
| **Factura simplificada (F2)** | Client sense NIF (particular) | Sí |
| **Factura completa (F1)** | Client empresa o amb NIF | Sí |

> El **rebut** és el document més habitual per a hostes particulars que no necessiten factura fiscal.

### Crear una factura

La manera habitual és des del **detall d'una estada**:
1. Obre l'estada
2. Secció "Factures" → botó "+ Nova factura"
3. Selecciona el tipus de document
4. Les dades de l'hoste s'omplen automàticament
5. Afegeix les línies (nits, serveis extra, taxa turística IEET si aplica)
6. Desa

Des de Veri·Factu, pots crear factures de forma independent (veure [secció 17](#17-verifactu-facturació-fiscal)).

### Llista de factures

La llista mostra:
- Número de factura (format: any/correlativ)
- Client
- Data d'emissió
- Import total (base + IVA)
- Estat: **Cobrada** (verd) o **Pendent** (taronja)

### Cobrar una factura

Desde la llista o el detall de la factura:
1. Clica la factura
2. Secció "Cobraments" → indica la data i el mètode de pagament
3. Desa

La factura passa a "Cobrada" i s'actualitza al balanç.

### Imprimir / descarregar

Cada factura té botó de **descàrrega en PDF**. Si la factura és fiscal (F1/F2), el PDF inclou el codi QR de Veri·Factu per a verificació de l'AEAT.

---

## 9. Despeses

**Accés:** Menú esquerre → "Despeses"

La secció de despeses té **tres pestanyes**:

---

### Pestanya: Variables

Despeses puntuals que no es repeteixen amb una freqüència fixa: reposició de productes de neteja, reparació urgent, compra de mobiliari, etc.

**Camps d'una despesa variable:**
- **Data**
- **Categoria** — Selecciona de la llista predefinida (Subministraments, Manteniment, Neteja, Alimentació, etc.)
- **Proveïdor** — Selecciona de la teva llista de proveïdors o escriu-ne un de nou
- **Import**
- **Mètode de pagament**
- **Nota o descripció**
- **Adjunt** — Pots pujar la foto del rebut o la factura del proveïdor (PDF o imatge)

**Filtres disponibles:**
- Per rang de dates
- Per categoria

---

### Pestanya: Fixes

Despeses recurrents amb una freqüència predefinida: llum, gas, internet, assegurança, neteja de façana, etc.

**Camps d'una despesa fixa:**
- **Nom** (ex: "Factura llum Endesa")
- **Categoria**
- **Import habitual**
- **Freqüència** — Mensual, trimestral, semestral, anual
- **Pròxima data de venciment**
- **Proveïdor**

**Estat de cada despesa fixa:**
- 🟢 **Al dia** — El pagament és futur i no urgent
- 🟡 **Vença aviat** — Vença en els propers 15 dies
- 🔴 **Vençut** — Ha passat la data de venciment sense registrar el pagament

**Registrar el pagament** d'una despesa fixa: clica el botó "Pagar". Es registra el pagament i la pròxima data s'actualitza automàticament segons la freqüència.

**Vista de 6 mesos** — A la part inferior mostra un calendari dels propers 6 mesos amb les despeses fixes previstes, per planificar la tresoreria.

---

### Pestanya: Personal

Mostra les jornades de pagament al personal de neteja agrupades per mes. Veure [secció 10](#10-personal) per a la gestió completa del personal.

---

## 10. Personal

**Accés:** Menú esquerre → "Personal"

### Llista de treballadores

Mostra totes les treballadores actives amb:
- Nom i càrrec
- Model de compensació: **Per hores** (tarifa/hora) o **Per tasques** (tarifa per sortida, manteniment i zones comunes)
- Nombre de tasques realitzades i absències

### Crear una treballadora nova

Clica **"+ Nou treballador/a"** i omple:
- **Nom**
- **Càrrec** (ex: "Neteja", "Recepció")
- **DNI** (opcional)
- **Model de pagament:**
  - *Per hores:* indica el preu per hora
  - *Per tasques:* indica el preu per sortida (canvi complet), preu per manteniment (repàs) i preu per zones comunes

---

### Fitxa individual del treballador/a

Clica el nom d'una treballadora per veure la seva fitxa completa, amb tres seccions:

#### Tasques de neteja (per a qui cobra per tasques)

Mostra totes les tasques realitzades, agrupades per dia en format d'arbre desplegable:

```
▼ 26/06/2026  · 5 tasques · Tot fet · 75,00 €
  ├── Sortida  · Hab. 2  · ✓ Feta  · 15,00 €
  ├── Sortida  · Hab. 3  · ✓ Feta  · 15,00 €
  ├── Manteniment · Hab. 1  · ✓ Feta  · 10,00 €
  ├── Manteniment · Hab. 4  · ✓ Feta  · 10,00 €
  └── Zones comunes          · ✓ Feta  · 25,00 €
```

- Clica la capçalera del dia per plegar/desplegar el detall
- **Cada tasca té un botó per canviar l'estat (Feta/Pendent)** — El canvi es sincronitza immediatament amb /neteja i /calendari

Selector de mes a la part superior per navegar per l'historial.

#### Jornades i pagaments

Mostra tots els pagaments registrats (per a qui cobra per tasques: generats automàticament al desar el full de neteja; per a qui cobra per hores: s'introdueixen manualment).

Cada jornada mostra:
- Data
- Hores treballades (si aplica)
- Import
- Si està pagada o pendent
- Botó per eliminar (amb confirmació: s'elimina el pagament i les tasques del dia associades)

**Afegir jornada manual** (per a treballadores per hores):
- Clica "+ Afegir jornada"
- Indica data, hores i preu/hora (o import directe)

#### Absències

Registre de baixes, vacances, permisos:
- Clica "+ Afegir absència"
- Indica el tipus (malaltia, vacances, permís, etc.) i les dates

---

## 11. Manteniment

**Accés:** Menú esquerre → "Manteniment"

### Incidents i avaries

Quan hi ha un problema físic a l'hostal (bombeta fosa, gotera, electrodomèstic espatllat, etc.), es registra aquí.

**Crear un incident:**
1. Clica "+ Nou incident"
2. Omple:
   - **Títol** — Descripció breu (ex: "Gotera al bany hab. 3")
   - **Habitació** — On és el problema
   - **Prioritat:** Alta (urgència, afecta l'hoste), Mitja (cal resoldre aviat), Baixa (quan es pugui)
   - **Descripció detallada**
   - **Cost estimat** (opcional)

**Estats d'un incident:**
- **Oberta** — Detectat però sense actuar
- **En curs** — S'està resolent
- **Resolta** — Solucionada (si hi ha cost, es genera automàticament una despesa variable)

**Filtrar per estat:** Usa les pestanyes per veure només els incidents oberts, en curs, resolts o tots.

> Quan un incident es marca com a "Resolt" amb cost, el sistema pregunta si vols generar una despesa automàticament a la secció de Despeses Variables.

---

## 12. Proveïdors i serveis

**Accés:** Menú esquerre → "Proveïdors i serveis"

La secció té dues pestanyes:

### Pestanya: Serveis

Contractes i serveis recurrents de l'hostal (neteja de façana anual, revisió calderes, contracte de TV, etc.).

**Camps d'un servei:**
- **Nom** (ex: "Revisió anual calderes")
- **Proveïdor** — Qui ho fa
- **Freqüència** — Mensual, anual, puntual, etc.
- **Pròxima data**
- **Import**
- **Actiu/Pausat**

Els serveis que vencen aviat apareixen com a alerta al tauler principal.

### Pestanya: Proveïdors

Directori de tots els proveïdors (empresa de neteja, electricista, plomber, etc.).

**Camps d'un proveïdor:**
- Nom de l'empresa o autònom
- Activitat (electricista, fontaner, neteja, etc.)
- Telèfon, correu, adreça
- Web
- CIF/NIF
- Notes internes

---

## 13. Comptabilitat i balanç

**Accés:** Menú esquerre → "Comptabilitat"

El balanç integra automàticament totes les dades del sistema (factures, despeses, personal) i les presenta en tres vistes:

### Vista: Mensual

Per a un mes concret, mostra:
- **Ingressos** — Total facturat i cobrat, amb desglossament per mètode de pagament
- **Despeses** — Total de despeses variables + fixes + personal
- **Benefici net** — Ingressos − Despeses
- **Marge** — Percentatge de benefici sobre ingressos
- **Dipòsits en custòdia** — Quantitat retinguda en concepte de dipòsits d'hostes (no és ingrés, és passiu)

Navega pels mesos amb les fletxes `<` i `>`.

### Vista: Anual

Taula resum de tots els mesos de l'any en curs (o l'any seleccionat), amb:
- Ingressos, despeses i benefici per cada mes
- Comparació any anterior (columna YoY %)
- KPIs principals: ocupació mitjana, ingrés per habitació, ADR (preu mig nit)
- Botó per exportar a CSV

### Vista: Situació (Balanç de situació)

Aproximació al balanç comptable:
- **Actiu fix** — Valor dels actius registrats (equipament, mobiliari)
- **Actiu corrent** — Factures pendents de cobrar
- **Passiu** — Dipòsits en custòdia, factures pendents de pagar
- **Patrimoni net** — Estimació

> **Nota:** Aquesta vista és una aproximació basada en les dades introduïdes al sistema (PMS/ERP), no un balanç comptable complet certificat per un comptable. Per a la comptabilitat oficial, cal el suport d'un assessor fiscal.

---

## 14. Tarifes

**Accés:** Menú esquerre → "Tarifes"

### Per a què serveix

Configura el **preu per nit** de cada habitació. Les tarifes s'usen:
- Per calcular el preu suggerit quan es crea una factura d'una estada
- Per als informes de rendiment al balanç

### Crear una tarifa

Cada habitació té la seva llista de tarifes. Per afegir una nova:
1. A la targeta de l'habitació, clica "+ Afegir tarifa"
2. Indica:
   - **Preu per nit** (en euros)
   - **Preu mensual** (si aplica per a estades de llarga durada)
   - **Temporada** — Alta, Mitja, Baixa (o sense temporada)
   - **Data inici** i **Data fi** de vigència
3. Desa

Pots tenir diverses tarifes actives alhora per a la mateixa habitació (per exemple: temporada alta i temporada baixa). El sistema usarà la més específica que encaixi amb les dates de l'estada.

### Desactivar una tarifa

Clica "Desactivar" per mantenir l'historial però que no s'apliqui a noves estades.

---

## 15. Avisos interns

**Accés:** Menú esquerre → "Avisos"

### Per a què serveix

Registre de persones problemàtiques o que **no es volen acollir** a l'hostal: clients conflictius, impagaments anteriors, comportaments inadequats, etc.

### Com funciona

Quan crees un avís amb nom, telèfon o correu que coincideix amb un client existent, el sistema marca aquell client amb el badge 🔴 **"No acollir"** a tot arreu (llista de clients, cerca, formulari d'estada).

**Camps d'un avís:**
- **Nom** de la persona
- **Telèfon** i/o **Correu**
- **Motiu** — Descripció del problema
- **Gravetat** — Alta, Mitja, Baixa
- **Notes internes** (no visibles per l'hoste)
- **Actiu/Inactiu** — Es pot desactivar temporalment sense eliminar

> **Privacitat:** Aquesta informació és estrictament interna i no es comparteix amb l'hoste en cap moment.

---

## 16. Llibre de viatgers

**Accés:** Menú esquerre → "Registre de viatgers" o "Llibre"

### Funció legal

El llibre de viatgers és el registre oficial que l'hostal ha de mantenir **mínim 3 anys** per llei, i que les autoritats (Mossos, inspecció) poden requerir en qualsevol moment.

### Contingut

Taula amb totes les estades registrades, una fila per contracte:
- Número de contracte
- Nom del titular
- Dates d'entrada i sortida
- Document d'identitat
- Municipio de residència
- Estat de la comunicació als Mossos
- Si hi havia mascota

### Filtres disponibles

- **Rang de dates** — Del / Al
- **Mascotes** — Filtra les estades amb animals

### Accions per cada estada

- **Editar** — Obre la fitxa completa
- **Enviar a Mossos** — Genera i descarrega el fitxer `.txt` (si no s'ha comunicat)
- **Eliminar** — Només si no s'ha comunicat i no té factures

### Exportar a CSV

Botó **"Exportar CSV"** — Descarrega totes les estades del filtre actiu en format Excel/CSV. Útil per als controls d'inspecció o per fer còpies de seguretat.

---

## 17. Veri·Factu (facturació fiscal)

**Accés:** Menú esquerre → "Veri·Factu" o "Justificants"

### Qué és Veri·Factu

Sistema obligatori de l'AEAT (Agència Tributaria espanyola) per a la facturació verificable, previst com a obligatori al voltant de 2027. El nostre sistema ja està preparat.

**Com funciona:** Cada factura fiscal (F1 o F2) genera un registre encadenat amb:
- Un hash SHA-256 únic (empremta digital)
- Un QR de verificació
- L'encadenament amb la factura anterior (garantia d'integritat)

### Quan crear un document aquí

- **Rebut** — Per a hostes particulars sense necessitat de factura fiscal. No genera registre Veri·Factu.
- **Factura simplificada (F2)** — Per a hostes sense NIF. Genera registre Veri·Factu.
- **Factura completa (F1)** — Per a empreses o particulars que necessiten factura amb NIF. Genera registre Veri·Factu.

### Crear una factura des de Veri·Factu

1. Al formulari d'emissió, selecciona **l'estada** de la qual ve la factura (les dades del client s'omplen soles)
2. Tria el **tipus de document**
3. Afegeix les **línies de concepte** (allotjament, serveis extra, etc.) amb import i IVA
4. Si aplica, activa la **taxa IEET** (taxa turística de Catalunya)
5. Clica **"Emetre"**

### Cadena de factures

La secció mostra totes les factures emeses en ordre, amb:
- Número correlatiu
- Data
- Client
- Import
- Estat (Emesa / Enviada a l'AEAT / Acceptada / Error)
- Hash i QR

La **verificació d'integritat** comprova que la cadena no s'ha trencat. Si la cadena és correcta, apareix una marca verda ✓.

> **Nota sobre enviament a l'AEAT:** Està implementat però inactiu fins que es configuri el certificat digital del titular. Mentrestant, els registres es generen i s'encadenen correctament.

---

## 18. Flux ideal dia a dia

Aquesta secció descriu el **workflow perfecte** per gestionar l'hostal de forma eficient usant totes les funcionalitats del sistema.

---

### El dia anterior (preparació)

1. **Obre el Tauler** — Revisa les alertes. Resol les vermelles immediatament.
2. **Comprova les entrades de demà** al tauler → Assegura't que les habitacions esperades estan lliures.
3. **Comprova les sortides de demà** → Prepara la informació per a la persona de neteja.
4. **Revisa el Calendari** → Vista setmanal per tenir visió global de la setmana.

---

### Quan un hoste arriba (Check-in)

**Cas A: Té reserva prèvia**

1. Cerca l'hoste a la llista d'"Estades" o directament a la seva estada en estat "Reserva"
2. A la fitxa, clica **"Check-in"**
3. Introdueix el **número de contracte** (el document de reserva o confirmació)
4. Si l'hoste no havia donat totes les dades, clica "Editar totes les dades primer" i completa:
   - Document d'identitat (DNI, NIE, Passaport)
   - Número de suport (revers del DNI/NIE)
   - Adreça
   - Resta de viatgers si n'hi ha
5. Captura la **firma** si es fa en pantalla, o indica que s'ha signat en paper
6. Clica **"Desar"**
7. L'estada passa a "En curs"

**Cas B: Arriba sense reserva (walk-in)**

1. Menú → "Estades" → "+ Nova estada"
2. Omple el formulari complet:
   - Selecciona habitació i dates
   - Posa el tipus com a "Contracte en curs"
   - Introdueix el número de contracte
   - Dades de l'hoste (usa l'escàner de document per anar més ràpid)
3. Desa
4. Captura la firma

**Sempre, just després del check-in:**

8. Ves al **Mossos** des de la fitxa de l'estada
9. Clica **"Generar fitxer"** → Descarrega el `.txt`
10. Puja'l manualment al portal de Mossos d'Esquadra
11. Guarda el número de validació

> ⚠️ **Termini: 24 hores des del check-in.** Si no ho fas, apareixerà una alerta al tauler i pots rebre una sanció.

---

### Durant l'estada

- Si l'hoste demana alguna cosa especial, anota-ho a les **notes internes** de la fitxa
- Si hi ha incidència a l'habitació (avaria), crea un **incident a Manteniment**
- Si l'hoste estén l'estada, edita la data de sortida a la fitxa

---

### Quan un hoste marxa (Check-out)

1. Obre la fitxa de l'estada
2. Comprova que totes les dades i viatgers estan correctes
3. Si no hi ha factura, crea-la: secció "Factures" → "+ Nova factura"
4. Registra el cobrament de la factura
5. Canvia l'estat de l'estada a **"Finalitzada"**
6. Avisa la persona de neteja

---

### Gestió de la neteja (cada dia amb sortides)

1. Ves a **Neteja**
2. Selecciona la data d'avui i la treballadora corresponent
3. Marca les habitacions amb sortida com a **"Sortida (canvi complet)"**
4. Marca les habitacions que continuen amb hostes que cal repassar com a **"Manteniment"**
5. Marca les **Zones comunes** si s'han netejat
6. Clica **"Desar full"**
7. Un cop la treballadora ha acabat, marca cada tasca com a ✓ **Feta** (des de Neteja, Calendari o la fitxa de la treballadora)
8. Clica **"Registrar pagament"**

---

### Gestió econòmica (mensual)

A final de mes o principi del mes següent:

1. **Ves a Despeses → Variables** — Comprova que totes les despeses del mes estan registrades
2. **Ves a Despeses → Fixes** — Registra els pagaments vençuts del mes
3. **Ves a Balanç → Mensual** — Revisa ingressos, despeses i benefici
4. **Exporta a CSV** si necessites passar les dades al gestor

---

### Gestió del personal (mensual o quinzenal)

1. **Ves a Personal** → Selecciona cada treballadora
2. Comprova les **tasques del mes** (secció "Tasques de neteja")
3. Si algun dia no s'ha registrat bé, corregeix des d'aquí canviant l'estat de les tasques
4. A **Despeses → Personal**, verifica que tots els pagaments estan registrats
5. Marca els pagaments com a **pagats** un cop s'hagin abonat

---

## 19. Errors i situacions habituals

### "No puc crear una estada, el formulari no em deixa desar"

Comprova que:
- Si és "Contracte en curs": el camp **Número de contracte** no pot estar buit
- Els camps obligatoris (marcats amb \*) estan tots omplerts
- Les dates de sortida són **posteriors** a les d'entrada
- La data de formalització no és futura

### "L'hoste surt al calendari però no a neteja"

La neteja mostra **les tasques assignades a una treballadora concreta**. Si no hi ha cap tasca creada per aquell dia, les habitacions apareixeran en blanc (desmarcat). Cal entrar a Neteja, seleccionar la treballadora i marcar les habitacions.

### "Al calendari surten tasques de neteja sense treballadora (Sense assignar)"

Ha passat que algú ha desmarcat una tasca (FETA → PENDENT) des del calendari sense tenir cap treballadora seleccionada al filtre. Per resoldre-ho:
1. Ves a Neteja → selecciona el dia i la treballadora correcta
2. El sistema mostrarà les habitacions sense assignar; marca-les i desa el full de nou

### "He eliminat una jornada però les tasques de neteja segueixen al calendari"

Efectivament: quan s'elimina una jornada que prové de tasques de neteja, el sistema **també elimina les tasques** d'aquell dia per a aquella treballadora. Si les tasques segueixen visibles, és probable que estiguin assignades a una altra persona o que siguin de dates diferents.

### "He enviat el fitxer als Mossos però ha donat error"

1. Comprova que **tots els viatgers** tienen tots els camps obligatoris omplerts:
   - Els espanyols: DNI + número de suport + província + municipi (codi INE)
   - Els estrangers: document + localitat + país (codi ISO)
   - Els menors de 14 anys: han de tenir indicat el parentesc
2. Torna a generar el fitxer des de la fitxa de l'estada
3. Si l'error persisteix, comprova que el municipi seleccionat correspon a la província correcta

### "El balanç no quadra amb el que cobro realment"

El balanç reflecteix:
- **Ingressos:** Factures **cobrades** (no emeses). Si una factura és emesa però no cobrada, no apareix als ingressos.
- **Despeses:** Les registrades manualment a la secció Despeses. Si has pagat alguna cosa i no ho has registrat, no apareix.

Revisa que totes les factures cobrades estan marcades com a "Cobrada" i que totes les despeses del mes estan introduïdes.

---

## Resum visual del flux complet

```
Nova reserva → Formulari d'estada (RESERVA)
                        ↓
             Hoste arriba → Check-in → Formulari complert (EN CURS)
                        ↓
             Enviar als Mossos (≤24h) ← ⚠️ OBLIGATORI
                        ↓
             Durant l'estada: Incidències a Manteniment si cal
                        ↓
             Check-out → Factura → Cobrar → Estat: FINALITZADA
                        ↓
             Neteja → Assignar treballadora → Desar full → Registrar pagament
                        ↓
             Final de mes: Balanç → Despeses → Export CSV
```

---

*Manual generat el juny de 2026. Per a qualsevol dubte sobre el sistema, contacta amb l'administradora.*
