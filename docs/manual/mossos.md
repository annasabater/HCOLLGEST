# Mossos, llibre de registre i justificants

Aquest capítol explica una de les feines més importants de l'hostal: **comunicar a la policia qui dorm a casa teva**. A Catalunya aquesta comunicació no es fa al sistema estatal (SES.HOSPEDAJES), sinó al **portal de registre de viatgers dels Mossos d'Esquadra** (`registreviatgers.mossos.gencat.cat`).

També explica dos papers que hi van lligats:

- el **Llibre de registre** (el registre de totes les persones allotjades), i
- els **Justificants** (la fitxa de cada estada, el llibre en paper i el comprovant de Mossos).

### Què diu la llei, en poques paraules

- **Has de comunicar cada persona allotjada als Mossos en un màxim de 24 hores** des que arriba. També s'han de comunicar les reserves i les cancel·lacions.
- **Has de guardar el registre 3 anys.** Per això a dalt de la pàgina del llibre hi posa «Export del registre de viatgers · conservar 3 anys».
- Les normes són l'**Ordre IRP/418/2010** i el **Reial decret 933/2021**.
- Si no ho fas, et poden **multar**. La documentació interna de l'app parla de multes «de centenars fins a desenes de milers d'euros». Per això l'app t'avisa al tauler quan tens estades pendents.
- Només cal comunicar **les persones noves**. Les que ja has comunicat abans no s'han de tornar a enviar (ho diu el manual oficial dels Mossos).

### Com ho fa l'app

La idea principal de l'app és **escriure cada dada una sola vegada**. Quan fas el registre d'una estada (el check-in), les dades de cada hoste es guarden un sol cop. Amb aquestes mateixes dades l'app:

1. crea el **fitxer per als Mossos** (un fitxer de text `.txt`, l'anomenat «fitxer massiu»),
2. omple el **Llibre de registre**,
3. prepara la **fitxa** perquè l'hoste la signi,
4. i guarda el **comprovant** de l'enviament.

Hi ha dues maneres d'enviar el fitxer als Mossos:

- **Manual**: l'app et descarrega el fitxer `.txt` i tu el puges al portal dels Mossos.
- **Automàtica**: l'app entra sola al portal i hi puja el fitxer. Només funciona si està configurada (mira «Com faig la pujada automàtica a Mossos»).

---

## Com faig la configuració inicial de Mossos (file identifier, codificació i contrasenya)

**Per a què serveix**
Sense aquesta configuració l'app no pot crear el fitxer. El fitxer porta un codi que identifica el teu hostal davant dels Mossos: el «File identifier». Aquí també pots desar l'usuari i la contrasenya del portal, si vols fer servir la pujada automàtica.

**On és**
Menú de dalt, icona de configuració → pàgina `/config` → bloc desplegable «Fitxer massiu de Mossos».
Només hi pot entrar una persona amb el rol d'administradora (ADMIN).

**Pas a pas**

1. Obre la pàgina de configuració (`/config`).
2. Clica el bloc «Fitxer massiu de Mossos» per obrir-lo.

[FOTO id=config-mossos-bloc ruta=/config descripcio="Pàgina de configuració amb el bloc «Fitxer massiu de Mossos» obert, amb els quatre camps visibles" marques="Fitxer massiu de Mossos|File identifier|Codificació|Usuari Mossos|Contrasenya Mossos"]

3. Al camp «File identifier» escriu el codi del teu hostal. Són **9 o 10 lletres i números**, sense espais ni punts (per exemple, `08043AAR02`). Aquest codi el trobaràs al portal dels Mossos, a l'apartat de dades de l'establiment.
4. Al camp «Codificació» deixa l'opció «ISO-8859-1 (latin1)», que és la que ve per defecte. L'altra opció és «UTF-8». No la canviïs si els Mossos no t'ho demanen.
5. Si vols fer servir la pujada automàtica, escriu l'«Usuari Mossos» i la «Contrasenya Mossos» (les mateixes que fas servir per entrar al portal).
6. Clica «Desar configuració».

[FOTO id=config-mossos-desar ruta=/config descripcio="Bloc «Fitxer massiu de Mossos» amb el File identifier omplert i el botó de desar" marques="File identifier|Desar configuració"]

**Què passa després / d'on surten les dades**
- El «File identifier» es fa servir per posar **nom al fitxer** (per exemple `08043AAR02.001.txt`) i per omplir el camp «Codi establiment» de la primera línia del fitxer.
- També surt a dalt de tot del Llibre de registre en paper, a la línia «Número de Registro de Alquiler (NRA o NRUA)».
- La contrasenya es guarda **xifrada**. Després de desar-la, el camp es queda buit i a sota hi posa «Ja configurada (es desa xifrada). Deixa-ho buit per mantenir-la.»

**Per què es fa així**
Els Mossos demanen que el nom de cada fitxer sigui el codi de l'hostal, un punt i un número de 3 xifres (de 001 a 999). Si el codi no és correcte, el portal no accepta el fitxer.

**Si t'has equivocat**
Torna a escriure el codi bo i clica «Desar configuració» un altre cop. Si vols canviar la contrasenya, escriu la nova i desa. Si deixes la contrasenya buida, l'app conserva la que ja hi havia.

**Compte!**
- El «File identifier» **no és** l'«Id policial» (`000000550`). L'Id policial surt al bloc «Dades de l'establiment» i no es pot canviar.
- Si escrius un codi que no té 9 o 10 caràcters, o que porta símbols, l'app no el desa i mostra: «Ha de tenir 9-10 caràcters alfanumèrics (§9.2)».
- Si intentes crear un fitxer sense haver posat el codi, sortirà aquest missatge: «Falta el file_identifier de l'establiment (9-10 car. de "Dades de l'establiment" del portal). Configura'l a Configuració abans de generar el fitxer.»
- El «CIF» del bloc «Dades de l'establiment» **no s'envia** als Mossos. Només surt al llibre de registre.

---

## Com faig un registre complet perquè es pugui enviar a Mossos

**Per a què serveix**
Els Mossos només accepten el fitxer si cada persona té totes les dades obligatòries. Si fas bé el registre al check-in, després el fitxer surt sense errors.

**On és**
Menú «Estades» → nova estada (o «Editar» dins d'una estada). És el formulari principal del check-in.

**Pas a pas**

1. Obre el formulari de la nova estada.
2. Tria el tipus de registre: «Contracte en curs» (l'hoste ja és aquí) o «Reserva».
3. Omple les dades de l'estada: dates d'entrada i sortida, habitació i número de contracte.
4. Per a **cada** viatger, omple les dades obligatòries. Ho veuràs a la taula de sota.
5. Si un viatger és menor, tria el «Parentesc».
6. Clica «Desar estada» (o «Desar canvis» si estàs editant).

[FOTO id=registre-formulari-viatger ruta=/estancies/nou descripcio="Formulari de registre amb la targeta d'un viatger: document, número de suport, cognoms, adreça, país, província i municipi" marques="Tipus de document|Número de suport|Adreça|Província|Municipi"]

**Quines dades són obligatòries**

Si és una **Reserva**, només cal:
- el nom,
- el primer cognom,
- i un correu electrònic **o** un telèfon.

Si és un **Contracte en curs**, cal:
- el tipus de document i el número (els menors de 14 anys no el necessiten),
- el **número de suport** (9 caràcters) si el document és DNI/NIF o NIE,
- el **segon cognom** si el document és DNI/NIF,
- el **parentesc** si és menor de 14 anys,
- l'adreça i el codi postal,
- si viu a Espanya: la **província** i el **municipi**,
- si viu fora d'Espanya: la **localitat**,
- la data de naixement i la d'expedició no poden ser del futur,
- la data de sortida ha de ser posterior a la d'entrada,
- la data de contracte (formalització) no pot ser del futur.

**Què passa després / d'on surten les dades**
Totes aquestes dades es guarden a la fitxa de l'hoste i a l'estada. D'aquí les agafa l'app per fer el fitxer de Mossos, el llibre i els justificants. Mira la taula «D'on surt cada camp del fitxer de Mossos», més avall.

**Per què es fa així**
Aquestes són les regles del manual oficial dels Mossos (versió 8, maig de 2025). Si en falta alguna, el portal rebutja el fitxer.

**Si t'has equivocat**
Entra a l'estada i clica «Editar» (dins el menú de més opcions) o «Editar dades» al costat del viatger. Corregeix i desa.

**Compte!**
- Quan desis, la província i el municipi **no són obligatoris** encara. Però **sí que ho són** per crear el fitxer de Mossos. Si no els poses, l'estada sortirà amb dades pendents.
- El país i la nacionalitat s'han d'escriure amb el **nom del país** (per exemple «França», «Regne Unit»). L'app el converteix sol al codi que demanen els Mossos.

---

## Com faig servir els esborranys (registre incomplet)

**Per a què serveix**
A vegades l'hoste arriba i no tens totes les dades (per exemple, no porta el document). Pots desar el registre a mitges i acabar-lo després.

**On és**
Al final del formulari de l'estada, botó «Desar com a esborrany».

**Pas a pas**

1. Omple el que puguis. Com a mínim, el **nom i el primer cognom** del titular.
2. Clica «Desar com a esborrany».
3. L'estada queda marcada amb l'etiqueta «Esborrany» al costat del número de contracte.

[FOTO id=estada-etiqueta-esborrany ruta=/estancies/:id descripcio="Capçalera d'una estada amb l'etiqueta groga «Esborrany» al costat del número de contracte" marques="Esborrany"]

4. Quan tinguis les dades que faltaven, entra a l'estada, clica «Editar», completa-les i desa.

**Què passa després**
- L'esborrany **no es pot pujar als Mossos** fins que estigui complet. Si passes el ratolí per sobre de l'etiqueta, hi posa: «Registre incomplet: completa les dades per poder pujar-lo a Mossos.»
- Quan l'app genera bé el fitxer de Mossos, treu l'etiqueta d'esborrany **sola**.
- També la pots treure tu a mà: menú de més opcions de l'estada → «Treure esborrany». L'app et pregunta: «Marcar aquesta estada com a completa (treure esborrany)? Assegura't que les dades estan completes; la validació final es fa igualment en generar el fitxer de Mossos.»

**Per què es fa així**
Així no perds el registre si et falten dades, però l'app no et deixa enviar res incomplet a la policia.

**Si t'has equivocat**
Si has tret l'esborrany i encara faltaven dades, no passa res: quan intentis crear el fitxer, l'app et dirà què falta.

**Compte!**
- Si no poses ni el nom ni el primer cognom, l'app no desa i et diu: «Per desar com a esborrany cal, com a mínim, nom i primer cognom del titular.»
- Si desas normal (no com a esborrany) i falten dades, et diu: «Falten dades obligatòries. Completa-les, o desa com a esborrany i acaba-ho més tard.»
- **Recorda el termini de 24 hores.** Un esborrany no atura el rellotge.

---

## Com faig el fitxer de Mossos i el descarrego (enviament manual)

**Per a què serveix**
Crea el fitxer `.txt` amb les dades de l'estada, en el format exacte que demanen els Mossos. Després el puges tu al portal.

**On és**
Menú «Estades» → obre l'estada → a la dreta, targeta «Comunicació a Mossos» → botó «Descarregar .txt (manual)».

**Pas a pas**

1. Obre l'estada que vols comunicar.
2. A la targeta «Comunicació a Mossos», clica «Descarregar .txt (manual)».

[FOTO id=estada-targeta-mossos ruta=/estancies/:id descripcio="Targeta «Comunicació a Mossos» de la fitxa d'una estada, amb els dos botons i el text explicatiu de sota" marques="Comunicació a Mossos|Pujar a Mossos|Descarregar .txt (manual)"]

3. S'obre una finestra que es diu «Revisa el que s'enviarà a Mossos». Aquí veus **tot el que es comunicarà a la policia**, en text normal.
4. Si a dalt surt un requadre groc que diu «Hi ha dades incompletes (caldrà corregir-les o el portal ho rebutjarà):», llegeix la llista. Cal arreglar-ho abans de seguir.
5. Revisa el camp «Tipus de pagament a comunicar a Mossos». Per defecte és «Pagament a destinació». Pots triar també «Bizum», «Efectiu», «Transferència» o «Targeta de crèdit».
6. Revisa cada viatger («Viatger 1», «Viatger 2»…). Pots corregir qualsevol camp: «Tipus de document», «Sexe», «Data de naixement», «Data d'expedició», «Nom», «Primer cognom», «Segon cognom», «Número document», «Número suport», «Nacionalitat», «Telèfon», «Email», «Adreça», «País», «Província», «Municipi», «Localitat», «Codi postal».
7. Si corregeixes alguna cosa i vols que el canvi també quedi guardat a la fitxa de l'hoste, marca la casella «Desar canvis també a la fitxa» d'aquell viatger.

[FOTO id=modal-revisio-mossos ruta=/estancies/:id descripcio="Finestra «Revisa el que s'enviarà a Mossos» amb el requadre groc de dades incompletes, el desplegable del tipus de pagament i la targeta d'un viatger" marques="Revisa el que s’enviarà a Mossos|Tipus de pagament a comunicar a Mossos|Desar canvis també a la fitxa|Continuar"]

8. Clica «Continuar».
9. Surt la «Confirmació final», amb un avís vermell: estàs a punt de generar la comunicació oficial de dades personals a la policia. Mira que el nombre de viatgers sigui correcte.
10. Clica «Sí, generar i descarregar».

[FOTO id=modal-confirmacio-mossos ruta=/estancies/:id descripcio="Pas de «Confirmació final» amb l'avís vermell i els botons Enrere i Sí, generar i descarregar" marques="Confirmació final|Enrere|Sí, generar i descarregar"]

11. El navegador descarrega el fitxer (per exemple `08043AAR02.014.txt`). A la targeta surt el missatge: «Fitxer … generat. Puja'l al portal de Mossos.»
12. Ara puja el fitxer al portal. Ho expliquem a «Com pujo el fitxer al portal dels Mossos a mà».

**Què passa després / d'on surten les dades**
- A sota dels botons apareix una fila nova amb el nom del fitxer i l'estat «Pendent».
- El número del final del nom (001, 002…) **puja sol cada vegada**. Quan arriba a 999 torna a començar per 001.
- Si l'estada era un esborrany, deixa de ser-ho.
- Les dades surten de l'estada i de la fitxa de cada hoste (mira la taula de més avall).

**Per què es fa així**
- La doble confirmació és perquè **una comunicació a la policia no es pot desfer**.
- La casella «Desar canvis també a la fitxa» et deixa triar: corregir només el fitxer, o corregir també la fitxa de l'hoste per a la propera vegada.
- El tipus de pagament que dius als Mossos és independent de com t'ha pagat de veritat l'hoste.

**Si t'has equivocat**
- Abans de confirmar: clica «Enrere» o «Cancel·lar».
- Si ja has descarregat el fitxer però **encara no l'has pujat**: no el pugis. Corregeix les dades i torna'l a generar. El fitxer dolent el pots esborrar de la llista (mira «Com esborro un comprovant o un fitxer fet per error»).
- Si ja l'has pujat al portal: l'app no ho pot desfer. Ho has de corregir directament al portal dels Mossos.

**Compte!**
Si falten dades, l'app **no crea el fitxer**. A la finestra surt «No s'ha pogut generar el fitxer:» i a sota:

> No s'ha pogut pujar a la web dels Mossos perquè el registre està incomplet. Edita'l, completa aquestes dades i torna-ho a provar:
> - …

Cada línia diu qui és el viatger i què falta. Aquests són els missatges que pots veure:

| Missatge | Què vol dir i com ho arreglo |
|---|---|
| «La data de contracte no pot ser futura» | La data de formalització és d'un dia que encara no ha arribat. Posa la data d'avui o d'abans. |
| «La sortida ha de ser posterior a l'entrada» | La data de sortida és igual o anterior a la d'entrada. Corregeix-la. |
| «falta el nom» / «falta el primer cognom» | Escriu el nom o el cognom del viatger. |
| «en reserva cal email o telèfon» | En una reserva, posa almenys un correu o un telèfon. |
| «falta el tipus de document» / «falta el número de document» | Un adult en contracte en curs ha de tenir document. |
| «el número de document supera 14 caràcters» | El número és massa llarg. Revisa'l. |
| «falta el número de suport (DNI/NIE)» | Amb DNI o NIE cal el número de suport (el número petit del carnet). |
| «el número de suport ha de tenir 9 caràcters» | El número de suport ha de tenir exactament 9 caràcters. |
| «el número de suport supera 9 caràcters» | Amb altres documents, no pot passar de 9 caràcters. |
| «falta el segon cognom (DNI/NIF)» | Amb DNI/NIF el segon cognom és obligatori. |
| «falta el parentesc (menor)» | Tria quin parentiu té el menor amb l'adult. |
| «la data de naixement no pot ser futura» / «la data d'expedició no pot ser futura» | Revisa la data. |
| «falta l'adreça» / «falta el codi postal» | Omple l'adreça i el codi postal. |
| «falta la província» / «falta el municipi» | Si viu a Espanya, tria província i municipi. |
| «província «…» no reconeguda» / «municipi «…» no trobat» | El nom no coincideix amb la llista oficial. Tria'l del desplegable. |
| «falta la localitat (estranger)» | Si viu fora d'Espanya, escriu la ciutat. |
| «nacionalitat/país «…» no reconegut (escriu-hi el nom del país)» | Escriu el nom del país en català (per exemple «Alemanya»). |

---

## Com pujo el fitxer al portal dels Mossos a mà

**Per a què serveix**
L'app crea el fitxer, però **no l'envia sola** en el mode manual. L'has de pujar tu al portal dels Mossos. Fins que no ho fas, la policia no té la comunicació.

**On és**
Fora de l'app: al web `registreviatgers.mossos.gencat.cat`. També s'hi arriba des de `mossos.gencat.cat` → «Serveis i tràmits» → «Registre de viatgers d'establiments d'hostalatge».

**Pas a pas**

1. Tingues a mà el fitxer `.txt` que has descarregat (normalment és a la carpeta «Baixades»).
2. Entra al portal dels Mossos amb el teu usuari i la teva contrasenya.
3. Al menú, obre «Enviament informació viatgers».
4. Tria «Fitxers massius de viatgers».
5. Clica «Tria un fitxer» i busca el fitxer `.txt` que has descarregat.
6. Clica «Acceptar».
7. Si tot va bé, el portal diu: «Operació realitzada amb èxit.»
8. Clica «Descarregar comprovant d'enviament» i desa el PDF a l'ordinador.
9. Si el portal mostra una llista d'errors, llegeix-la. Cada error diu el número de línia («Línia 2», «Línia 3»…). La línia 1 és l'hostal, la línia 2 és el primer viatger, la línia 3 el segon, i així.

**Què passa després**
- Els Mossos ja tenen la comunicació.
- Dins l'app, la fila del fitxer **continua posant «Pendent»**. Ara mateix l'app no té cap botó per marcar a mà que ja l'has pujat (mira «Com entenc els estats d'un enviament»).
- Guarda el comprovant PDF del portal. El manual dels Mossos diu que **aquest comprovant no es considera registre**: el registre és el llibre.

**Per què es fa així**
Els Mossos no tenen cap connexió directa per a programes (no hi ha API). L'única manera és pujar el fitxer al seu web.

**Si t'has equivocat**
- Si el portal rebutja el fitxer, ningú ha quedat comunicat. Corregeix les dades a l'app, genera un fitxer nou (tindrà un número nou) i torna'l a pujar.
- Si has pujat dades equivocades i el portal les ha acceptat, s'ha de corregir al portal. L'app no ho pot fer.

**Compte!**
- **No pugis dues vegades el mateix fitxer.** Comunicaries els hostes per duplicat.
- El portal dels Mossos **no guarda** l'historial dels clients enviats. Per això és important que tu guardis el llibre i els comprovants.
- La primera vegada que pugis un fitxer real, comprova-ho bé al portal. El format està revisat amb el manual oficial, però convé confirmar-ho amb el primer enviament.

---

## Com faig la pujada automàtica a Mossos (des de la web)

**Per a què serveix**
L'app entra sola al portal dels Mossos, hi puja el fitxer, llegeix la resposta i desa el comprovant. T'estalvia els passos manuals.

**On és**
Menú «Estades» → obre l'estada → targeta «Comunicació a Mossos» → botó «Pujar a Mossos».

**Pas a pas**

1. Obre l'estada.
2. A la targeta «Comunicació a Mossos», clica «Pujar a Mossos».
3. Surt una finestra «Pujar a Mossos automàticament» que pregunta: «Segur que vols enviar el contracte … a Mossos?»
4. Si l'estada **ja s'havia comunicat**, surt un avís groc: «Aquesta estada ja s'ha comunicat a Mossos el …». Llegeix-lo bé: si tornes a enviar, els hostes surten per duplicat.

[FOTO id=modal-pujar-auto ruta=/estancies/:id descripcio="Finestra «Pujar a Mossos automàticament» amb l'avís groc de duplicat i els botons Cancel·lar i Sí, pujar ara" marques="Pujar a Mossos automàticament|Cancel·lar|Sí, pujar ara"]

5. Clica «Sí, pujar ara». El botó canvia a «Pujant a Mossos…». Pot trigar una estona; no tanquis la pàgina.
6. Si va bé, surt: «Pujat a Mossos correctament» (de vegades amb un codi al costat).
7. Si va malament, surt un missatge vermell que explica el problema.

**Què passa després / d'on surten les dades**
- Si va bé, la fila de l'enviament posa «Acceptat» i la data d'enviament.
- L'app intenta baixar el **comprovant oficial** del portal i el desa. El botó «Comprovant mossos» obre aquest PDF.
- Quan arriba el comprovant, l'app envia **una sola vegada** un correu a l'adreça de l'hostal amb els 3 justificants: la fitxa, el llibre i el comprovant.
- Si va malament, la fila posa «Error» i a sota surt el motiu. Al tauler apareix a «Enviaments amb error».

**Per què es fa així**
El portal dels Mossos no té connexió per a programes. L'app fa servir un navegador al núvol (un servei que es diu Browserbase) que fa els mateixos clics que faries tu.

**Si t'has equivocat**
- Si l'enviament dona error, cap dada s'ha comunicat. Llegeix el motiu, corregeix l'estada i torna a clicar «Pujar a Mossos».
- Si s'ha acceptat amb dades errònies, cal corregir-ho al portal dels Mossos.

**Compte!**
Missatges que pots veure:
- «La pujada automàtica no està configurada (falta Browserbase). Afegeix BROWSERBASE_API_KEY i BROWSERBASE_PROJECT_ID a les variables d'entorn.» → La pujada automàtica no està activada. Fes servir «Descarregar .txt (manual)» o demana ajuda tècnica.
- «Falten les credencials de Mossos (usuari/contrasenya). Configura-les a Configuració abans de pujar automàticament.» → Ves a `/config` i posa l'usuari i la contrasenya.
- «Login a Mossos incorrecte (revisa usuari/contrasenya a Configuració).» → La contrasenya desada no és bona o ha caducat.
- «No s'ha trobat el menú "Fitxers massius de viatgers".» / «No s'ha trobat el camp per adjuntar el fitxer.» / «No s'ha trobat el camp d'usuari al portal de Mossos.» → El portal ha canviat o no respon. Fes l'enviament manual.
- «Mossos ha rebutjat el fitxer:» seguit d'una llista amb punts. L'app resumeix cada error, per exemple: «número de suport incorrecte (DNI/NIF: 3 lletres + 6 dígits; NIE: «E» + 8 dígits).», «falta el segon cognom (obligatori amb DNI/NIF).», «número de document incorrecte o buit.», «falta el parentesc (obligatori si és menor).», «data incorrecta (naixement/expedició) o posterior a avui.», «codi de municipi/província (INE) o localitat incorrecte.», «nacionalitat/país incorrecte (codi ISO).»
- «Error de connexió pujant a Mossos.» → Problema d'internet. Torna-ho a provar.
- Aquest botó **no obre** la finestra de revisió. Envia les dades tal com estan a l'estada, i com a tipus de pagament fa servir «Pagament a destinació». Si vols revisar o canviar res abans, fes servir «Descarregar .txt (manual)».
- La sessió i les contrasenyes **no queden escrites enlloc** de l'app (no es guarden als registres interns).

---

## Com entenc els estats d'un enviament

**Per a què serveix**
Cada vegada que l'app crea un fitxer per a una estada, en guarda un «enviament» amb un estat. Així saps què s'ha comunicat i què no.

**On és**
- A la fitxa de l'estada, targeta «Comunicació a Mossos», una fila per cada fitxer.
- Al «Llibre registre de viatgers» (`/llibre`), columna «Mossos».

[FOTO id=enviament-fila-estat ruta=/estancies/:id descripcio="Fila d'un enviament amb el nom del fitxer, l'etiqueta d'estat, el contracte enviat i els botons Comprovant mossos i Eliminar" marques="Pendent|Contracte enviat:|Comprovant mossos|Eliminar"]

**Què vol dir cada estat**

| Estat a la pantalla | Què vol dir |
|---|---|
| «Pendent» (groc) | S'ha creat el fitxer, però l'app no sap si s'ha pujat. És l'estat que queda després de «Descarregar .txt (manual)». |
| «Enviat» (blau) | Marcat com a enviat. |
| «Acceptat» (verd) | El portal l'ha acceptat (és el que posa la pujada automàtica quan va bé). |
| «Rebutjat» (vermell) | El portal l'ha rebutjat. |
| «Error» (vermell) | Hi ha hagut un problema en la pujada automàtica. A sota surt el motiu. |
| «No comunicat» (gris, només al llibre) | Aquesta estada no té cap fitxer creat. |

**Què passa després**
- Una estada compta com a **comunicada** només quan té un enviament «Enviat» o «Acceptat».
- Mentre no en tingui cap, surt al tauler a «Pendents d'enviar a Mossos».
- Si el mateix contracte té un error i després un enviament bo, l'error deixa de sortir al tauler.

**Per què es fa així**
Així el tauler només t'avisa del que de veritat falta.

**Si t'has equivocat**
Mira «Com esborro un comprovant o un fitxer fet per error».

**Compte!**
- Si fas l'enviament **manual**, la fila es queda a «Pendent» encara que l'hagis pujat bé al portal. L'app no té cap botó per canviar-ho a «Acceptat». Per tant, l'estada continuarà sortint a «Pendents d'enviar a Mossos» fins que l'amaguis tu (mira la secció següent).
- El llibre mostra l'estat del **darrer** fitxer creat per a aquella estada.

---

## Com faig servir els avisos de Mossos al tauler

**Per a què serveix**
El tauler t'avisa de les estades que encara no has comunicat i dels enviaments que han fallat. És la teva alarma per no passar-te de les 24 hores.

**On és**
Menú «Tauler» (pàgina d'inici). Hi ha diverses targetes, entre elles:
- «Pendents d'enviar a Mossos» (groga),
- «Enviaments amb error» (vermella),
- «Fitxes amb dades pendents» (groga),
- «Firmes pendents» (lila).

**Pas a pas**

1. Obre el «Tauler».
2. Mira el número gran de cada targeta. Si posa «✓ OK», no hi ha res pendent. Si posa «Atenció», hi ha feina.

[FOTO id=tauler-avisos-mossos ruta=/ descripcio="Tauler amb les targetes d'avís: Pendents d'enviar a Mossos, Firmes pendents, Enviaments amb error i Fitxes amb dades pendents" marques="Pendents d'enviar a Mossos|Enviaments amb error|Fitxes amb dades pendents|Atenció"]

3. Clica la targeta «Pendents d'enviar a Mossos». S'obre una llista amb el nom del titular i la data d'entrada («Entrada …»).
4. Clica un nom per anar directament a l'estada i fer l'enviament.
5. Si una estada **ja l'has comunicada a mà** (o no s'ha de comunicar), clica «Amaga» al costat. L'avís desapareix per sempre.

[FOTO id=tauler-avis-amaga ruta=/ descripcio="Targeta «Pendents d'enviar a Mossos» desplegada amb la llista d'estades i el botó Amaga a cada fila" marques="Pendents d'enviar a Mossos|Amaga"]

6. A «Enviaments amb error» hi surt «Contracte …/…» i «Enviament rebutjat / error». Clica-hi per anar a l'estada i veure el motiu.

**Què passa després / d'on surten les dades**
- «Pendents d'enviar a Mossos» mostra les estades que estan en reserva o en curs, que no han estat esborrades i que **no tenen cap enviament «Enviat» o «Acceptat»**. Surten ordenades per data d'entrada, i se'n mostren fins a 20.
- Les **ampliacions** d'una estada no hi surten. Els hostes ja es van comunicar a l'estada original.
- «Fitxes amb dades pendents» fa servir **la mateixa revisió** que el fitxer de Mossos. Et diu «Falta: …» amb un resum molt curt.
- Quan amagues un avís amb «Amaga», l'app ho recorda i ja no torna a sortir per a aquella estada.

**Per què es fa així**
La llei dona només 24 hores. El tauler és el primer que veus en obrir l'app, així no se t'escapa res.

**Si t'has equivocat**
Si has amagat un avís per error, avui no hi ha cap botó per tornar-lo a mostrar. Entra a l'estada i comprova la targeta «Comunicació a Mossos»: allà sempre veus l'estat real.

**Compte!**
- El tauler **no compta les hores**. No et diu «et queden 3 hores». Simplement et diu quines estades no estan comunicades. Fes l'enviament el mateix dia del check-in.
- Les reserves futures també surten a la llista.
- «Amaga» **no envia res** als Mossos. Només treu l'avís de la pantalla.

---

## Com esborro un comprovant o un fitxer fet per error

**Per a què serveix**
Si has creat un fitxer que no has pujat, o un enviament que ha fallat, el pots treure de la llista de l'estada.

**On és**
Fitxa de l'estada → targeta «Comunicació a Mossos» → a la fila del fitxer, botó «Eliminar».

**Pas a pas**

1. A la fila del fitxer, clica «Eliminar».
2. Surt un avís groc: «Eliminar aquest comprovant de l'app?» Hi posa que **només s'esborra del teu sistema** i que **no es treu de Mossos**.
3. Clica «Continuar».
4. Surt la «Confirmació final»: «Segur que vols eliminar … definitivament de l'app?»
5. Clica «Sí, eliminar».

[FOTO id=enviament-eliminar ruta=/estancies/:id descripcio="Fila d'enviament amb el requadre vermell de Confirmació final i el botó Sí, eliminar" marques="Confirmació final|Enrere|Sí, eliminar"]

**Què passa després**
- La fila desapareix.
- L'estada **no es toca**. Si no li queda cap enviament bo, torna a sortir com a pendent de comunicar.
- El número de seqüència del fitxer esborrat **no es reutilitza**. El proper fitxer tindrà el número següent al més alt que hi hagi hagut.

**Per què es fa així**
El portal dels Mossos no permet desfer una comunicació. Per això l'app t'avisa dues vegades.

**Si t'has equivocat**
Si has esborrat un comprovant d'un enviament que sí que estava fet, la comunicació als Mossos continua feta. Però a l'app l'estada tornarà a sortir com a pendent. Amaga l'avís del tauler si cal i guarda el comprovant del portal en un altre lloc.

**Compte!**
Si esborres una **estada sencera** que ja estava comunicada, l'app també t'avisa: «⚠ ATENCIÓ: ja s'ha comunicat a Mossos. Eliminar-la aquí NO la retira del portal.»

---

## Com faig una ampliació d'estada sense tornar a comunicar els hostes

**Per a què serveix**
Quan un hoste allarga l'estada, l'app crea un contracte nou enllaçat amb l'original. Els hostes ja estan comunicats, i no cal tornar-los a enviar.

**On és**
Fitxa de l'estada → targeta «Comunicació a Mossos».

**Pas a pas**

1. Obre l'ampliació.
2. A la targeta «Comunicació a Mossos» surt un requadre blau: «Ampliació: els hostes ja es van comunicar a Mossos a l'estada original; normalment no cal reenviar-los (§4).»
3. Normalment **no has de fer res**.

**Què passa després**
L'ampliació no surt a «Pendents d'enviar a Mossos» del tauler.

**Per què es fa així**
El manual dels Mossos diu que no cal tornar a comunicar els clients ja informats.

**Si t'has equivocat**
Si l'estada original no s'havia comunicat, comunica-la. Mira primer l'estada original.

---

## Com faig servir el Llibre de registre (consulta i Excel)

**Per a què serveix**
El Llibre de registre és la llista de **totes les persones que s'han allotjat** a l'hostal. És el registre que has de guardar 3 anys. A diferència del comprovant dels Mossos, **aquest sí que és el registre legal**.

**On és**
Menú «Recepció» → «Llibre registre de viatgers» (pàgina `/llibre`). Títol: «Llibre de registre».

**Pas a pas**

1. Obre «Llibre registre de viatgers». En entrar, l'app ja carrega **tot** el llibre.
2. Per mirar només un període, tria l'«Any» i, si vols, el «Mes». La llista es posa al dia sola.
3. També pots posar dates a mà a «Des de» i «Fins a» i clicar «Veure».
4. Per veure **totes les columnes** (sexe, naixement, nacionalitat, número de suport, adreça, telèfon, correu, parentesc…), marca la casella «Llibre registre».

[FOTO id=llibre-filtres ruta=/llibre descripcio="Pàgina Llibre de registre amb els filtres Any, Mes, Des de, Fins a, la casella Llibre registre i els botons Veure i Exportar Excel" marques="Any|Mes|Des de|Fins a|Llibre registre|Veure|Exportar Excel"]

5. Cada estada té les seves files juntes, amb el mateix color de fons. A la primera fila de cada estada veus l'estat a la columna «Mossos».
6. Per descarregar el llibre, clica «Exportar Excel». Es baixa el fitxer `llibre-registre.xlsx` amb el període que tens filtrat.
7. A sota de la taula pots triar quantes «Files per pàgina» vols veure (10, 25 o 50) i passar de pàgina.

[FOTO id=llibre-taula ruta=/llibre descripcio="Taula del llibre amb diverses estades, la columna Mossos amb etiquetes d'estat i la columna Accions amb el llapis i la paperera" marques="Mossos|Accions|No comunicat|Pendent"]

**Què passa després / d'on surten les dades**
- Cada fila és **un viatger** d'una estada.
- Les dades surten de la fitxa de cada hoste i de l'estada.
- El filtre de dates mira la **data d'entrada** de l'estada.
- Si una estada va acabar fa **més de 7 dies** i després canvies la fitxa d'aquell hoste (per exemple, una adreça nova), el llibre **no canvia** el passat. L'app congela les dades antigues. Així el llibre mostra el que era cert en aquella estada.
- Cada consulta o descàrrega del llibre queda apuntada al registre intern de l'app.

**Per què es fa així**
La llei demana guardar el registre 3 anys. L'Excel et permet tenir-ne una còpia fora de l'app.

**Si t'has equivocat**
- Per corregir dades, clica el llapis de la columna «Accions». Et porta a l'estada.
- La paperera esborra l'estada sencera (amb confirmació). Fes-ho només si l'estada era un error.

**Compte!**
- El botó «Avisos interns» de dalt porta a una altra pàgina (avisos interns de l'hostal). No té a veure amb els Mossos.
- Si fas servir un usuari amb vista restringida, algunes estades marcades a les observacions no surten al llibre.
- L'app **no esborra sola** les dades velles quan passen els 3 anys.

---

## Com imprimeixo el Llibre de registre en paper (i el faig signar)

**Per a què serveix**
És el full de registre en paper, amb les dades de l'hostal, de fins a 4 viatgers, del contracte, del pagament i les signatures. És el model de full que es fa servir com a llibre de registre.

**On és**
- Fitxa de l'estada → botó «Llibre registre» (a dalt).
- O bé pàgina «Justificants» → botó «Llibre registre» de la fila de l'estada.
- Per a un full **en blanc**: pàgina «Justificants» → «Plantilles en blanc:» → «Llibre registre».

**Pas a pas**

1. Obre l'estada i clica «Llibre registre». S'obre una pestanya nova (`/imprimir/registre/…`).

[FOTO id=estada-botons-documents ruta=/estancies/:id descripcio="Capçalera de l'estada amb els botons Registre persones allotjades, Reglament intern (LOPD) i Llibre registre" marques="Registre persones allotjades|Reglament intern (LOPD)|Llibre registre"]

2. Veuràs el full amb una barra granat a dalt: «Hostal Coll · Llibre de registre».
3. Revisa que les dades siguin correctes.
4. Clica «Imprimir PDF». L'app prepara un PDF (el botó posa «Generant…») i l'obre en una pestanya nova.
5. Imprimeix el PDF o desa'l.

[FOTO id=llibre-imprimir-full ruta=/imprimir/registre/:id descripcio="Full del llibre de registre amb la barra superior granat, el botó Imprimir PDF, la taula de viatgers i el requadre de firmes" marques="Imprimir PDF|Nº viajeros|Firmas"]

**Què passa després / d'on surten les dades**
El full surt en castellà, tal com és el model. D'on surt cada part:

| Part del full | D'on la treu l'app |
|---|---|
| «Número de Registro de Alquiler (NRA o NRUA)» | El «File identifier» de `/config`. |
| «Nombre/Razón social» | «Titular / raó social» de `/config` (si és buit, el nom de l'establiment). |
| «NIF o CIF» | El «CIF» de `/config`. |
| «Municipio» | «Població» de `/config`. |
| «Provincia» | Sempre «Barcelona». |
| Telèfon, correu i web de l'hostal | Fixos a l'app (+34 687 55 82 48, hostalcoll@gmail.com, hostalcoll.com). |
| Dades de cada viatger (nom, cognoms, sexe, document, suport, nacionalitat, naixement, domicili, localitat/país, mòbil, correu, parentiu) | La fitxa de l'hoste. |
| «Tipo documento» | DNI/NIF → «NIF», Passaport → «Pas», NIE → «TIE». |
| «Nº Referencia» | El número de contracte / any. |
| «Fecha» | La data de formalització. |
| Entrada i sortida (data i hora) | Les dates de l'estada. L'hora només surt si no és 00:00. |
| «Dirección del inmueble» | Adreça, codi postal i població de `/config`. |
| «Nº habitaciones» | El nombre d'habitacions de l'estada; si no n'hi ha, el **nom** de l'habitació. |
| «Conexión a Internet» | La casella d'internet de l'estada. |
| «Medio de pago» | Els **cobraments reals** registrats a l'estada (efectiu, targeta, transferència, Bizum, altres). |
| «Firmas» | La signatura que l'hoste ha fet a la tauleta. Si no ha signat, el requadre queda buit per signar a mà. |

- Hi caben **4 viatgers per full**. Si n'hi ha més, l'app fa més fulls i hi posa «Full 1 de 2», etc.
- Els viatgers amb una «Habitació al llibre / factura» diferent surten en un **full a part** (mira la secció següent).

**Per què es fa així**
És el mateix model que el llibre de paper de sempre, però omplert sol.

**Si t'has equivocat**
Corregeix les dades a l'estada o a la fitxa de l'hoste i torna a obrir «Llibre registre». El full es crea de nou cada vegada.

**Compte!**
- Si un hoste no ha signat a la tauleta, el requadre de «Firmas» surt buit. Al tauler, la targeta «Firmes pendents» t'avisa dels hostes en curs que encara no han signat.
- El «Medio de pago» del full surt dels cobraments, **no** del tipus de pagament que has comunicat als Mossos. Poden ser diferents.

---

## Com faig que un viatger consti en una altra habitació als papers (habitació al llibre)

**Per a què serveix**
A vegades, als papers oficials (llibre de registre i factura), un viatger ha de constar en una habitació **diferent** de la real. L'app ho permet sense canviar l'estada de veritat.

**On és**
Formulari de l'estada → targeta del viatger → camp «Habitació al llibre / factura».

**Pas a pas**

1. Obre l'estada i clica «Editar».
2. A la targeta del viatger, busca el camp «Habitació al llibre / factura».
3. Per defecte posa «La de l'estada». Tria l'habitació que ha de constar als papers.
4. Desa.

[FOTO id=registre-habitacio-llibre ruta=/estancies/:id/edita descripcio="Targeta d’un viatger amb el desplegable «Habitació al llibre / factura» (per defecte, «La de l’estada») i el text d’ajuda de sota" marques="Habitació al llibre / factura"]

**Què passa després / d'on surten les dades**
- A la capçalera de l'estada, al costat del contracte, surt per exemple «(Hab. 6 al llibre)».
- A «Dades de l'estada», el camp «Habitació» posa la real i, al costat, «al llibre: …».
- Els botons de documents («Registre persones allotjades», «Reglament (LOPD)», «Llibre registre») surten **un cop per cada full**: un per a l'habitació real (si hi queda algun viatger) i un per a cada habitació separada, amb el seu número de contracte al davant.
- El full del llibre de l'habitació separada mostra **aquella habitació** i el seu número de contracte.
- A la **factura**, l'habitació que surt és la «del llibre» del titular (si en té), si no la real.
- Al calendari, a la neteja i a l'ocupació, l'app fa servir **sempre l'habitació real**.

**Per què es fa així**
Així els papers diuen el que han de dir, i la gestió del dia a dia (neteja, calendari) continua sent correcta.

**Si t'has equivocat**
Torna a editar l'estada i posa «La de l'estada».

**Compte!**
- Si tries la mateixa habitació que la de l'estada, l'app ho ignora (no és una habitació separada).
- Aquesta opció **no canvia res del fitxer de Mossos**. El fitxer no porta el número d'habitació.

---

## Com faig servir la pàgina de Justificants

**Per a què serveix**
És el lloc on tens **tots els papers** de cada estada: la fitxa de registre, el reglament, el llibre i el comprovant de Mossos. També et diu quines estades tenen dades pendents.

**On és**
Menú «Gestió» → «Justificants» (pàgina `/justificants`). Subtítol: «Fitxes de registre i comprovants de Mossos».

**Pas a pas**

1. Obre «Justificants».
2. Si vols, filtra per «Any» i «Mes» (a dalt a la dreta).
3. A «Plantilles en blanc:» tens els papers buits per imprimir: «Registre persones allotjades», «Llibre registre», «Reglament intern (LOPD)», «Cartell normes», «Declaració IEET (menor)» i dues plantilles de factura en Word.

[FOTO id=justificants-plantilles ruta=/justificants descripcio="Capçalera de Justificants amb els filtres Any i Mes i la franja de Plantilles en blanc" marques="Plantilles en blanc:|Llibre registre|Any|Mes"]

4. A la llista «Registres», cada fila és una estada. Hi veus:
   - el titular i el número de contracte (amb la fletxa pots veure els altres viatgers),
   - les dates d'entrada i sortida,
   - l'«Estat»: «Completa» (verd) o «Pendents (n)» (groc), amb la llista del que falta per a cada viatger,
   - els botons de documents.
5. Clica el botó que necessitis:
   - «Registre persones allotjades»: la fitxa en PDF amb la signatura.
   - «Reglament (LOPD)»: el reglament intern signat.
   - «Llibre registre»: el full del llibre (mira la secció anterior).
   - «Declaració IEET (menor)»: només surt si hi ha un menor de 17 anys.
   - «Comprovant mossos»: només surt si l'estada té un enviament «Enviat» o «Acceptat».
6. La icona del sobre envia els justificants per correu a l'adreça de l'hostal. Quan s'ha enviat, surt «Enviat» amb la data.

[FOTO id=justificants-fila ruta=/justificants descripcio="Fila d'una estada a Justificants amb l'etiqueta Pendents, la llista de faltes, el botó Silenciar avís i els botons de documents" marques="Pendents|Silenciar avís|Registre persones allotjades|Llibre registre|Comprovant mossos"]

**Què passa després / d'on surten les dades**
- La revisió de dades pendents és **la mateixa** que fa l'app abans de crear el fitxer de Mossos. Si aquí posa «Completa», el fitxer sortirà sense errors.
- El correu porta: la fitxa «Registre persones allotjades», el «Llibre registre» i, si l'estada ja està comunicada («Enviat» o «Acceptat»), el comprovant de Mossos.
- El «Comprovant mossos» és el PDF **oficial** del portal si l'app l'ha pogut baixar (pujada automàtica). Si no, l'app crea un **resum** propi titulat «Comprovant de comunicació a Mossos», amb les dades de la comunicació, l'estada i els viatgers.

**Per què es fa així**
Tens tots els papers d'una estada en una sola fila, a punt per imprimir, enviar o arxivar.

**Si t'has equivocat**
Si un document té dades errònies, corregeix l'estada o la fitxa de l'hoste i torna a obrir el document. Es crea de nou cada vegada.

**Compte!**
- El resum que fa l'app **no és** el comprovant oficial del portal. Si has pujat el fitxer a mà, guarda el comprovant que et dona el portal.
- Si has fet l'enviament manual, el botó «Comprovant mossos» **no surt** en aquesta pàgina, perquè l'enviament es queda a «Pendent». El trobaràs a la fitxa de l'estada.

---

## Com silencio l'avís de dades pendents

**Per a què serveix**
Si una estada té dades que **no podràs aconseguir mai**, pots treure l'avís perquè no et molesti cada dia.

**On és**
Pàgina «Justificants» → fila de l'estada → botó «Silenciar avís».

**Pas a pas**

1. Si hi ha fitxes amb dades pendents, a dalt de la pàgina surt un requadre groc: «Hi ha … fitxes amb dades pendents (camps obligatoris *). Completa-les o silencia l'avís si no pots obtenir aquelles dades.»
2. Busca la fila de l'estada.
3. Clica «Silenciar avís».
4. L'etiqueta canvia a «Avís silenciat».

[FOTO id=justificants-silenciar ruta=/justificants descripcio="Fila amb l'etiqueta «Avís silenciat» i el botó Reactivar avís" marques="Avís silenciat|Reactivar avís"]

**Què passa després**
- L'estada deixa de comptar al requadre groc de dalt.
- També deixa de sortir a la targeta «Fitxes amb dades pendents» del tauler.
- La llista del que falta **continua visible** a la fila.

**Per què es fa així**
Perquè l'avís només et mostri el que encara pots arreglar.

**Si t'has equivocat**
Clica «Reactivar avís» a la mateixa fila.

**Compte!**
Silenciar l'avís **no arregla les dades**. Si l'estada s'ha d'enviar als Mossos, el fitxer continuarà sense poder-se crear fins que completis el que falta.

---

## D'on surt cada camp del fitxer de Mossos

El fitxer és un text amb **una línia per a l'hostal** (tipus 1) i **una línia per a cada viatger** (tipus 2). Els camps van separats amb el caràcter `|`. Si un camp és buit, el `|` hi és igualment.

Regles generals:
- Les dates s'escriuen com `aaaammdd` (per exemple, `20261018`). Les hores, com `hhmm`.
- Les lletres van en **majúscules**, i es **mantenen els accents** (é, ç, ñ).
- Els cognoms compostos queden separats per **un sol espai**.
- Cada línia acaba amb un salt de línia. La línia de cada viatger acaba amb un `|`.
- El nom del fitxer és `{File identifier}.{número de 001 a 999}.txt`.

### Línia de l'hostal (tipus 1)

| Núm. | Camp | D'on el treu l'app |
|---|---|---|
| 1 | Tipus de registre | Sempre `1`. |
| 2 | Codi establiment | «File identifier» de `/config`. |
| 3 | Nom de l'establiment | Nom de l'establiment (HOSTAL COLL), en majúscules. |
| 4 | Data de confecció | El dia en què crees el fitxer. |
| 5 | Hora de confecció | L'hora en què crees el fitxer. |
| 6 | Nombre de viatgers | Quants viatgers hi ha al fitxer. |
| 7 | Format del fitxer | Sempre `V24`. |

### Línia de cada viatger (tipus 2)

| Núm. | Camp | D'on el treu l'app |
|---|---|---|
| 1 | Tipus de registre | Sempre `2`. |
| 2 | Núm. document espanyol | Fitxa de l'hoste: el número, si és DNI/NIF, o passaport amb nacionalitat espanyola. |
| 3 | Núm. document estranger | Fitxa de l'hoste: el número, si és NIE, «Altres documents», o passaport no espanyol. |
| 4 | Tipus de document | Fitxa de l'hoste. Codis: DNI/NIF → `D`, NIE → `N`, Passaport → `P`, Altres documents → `O`. |
| 5 | Data d'expedició | Fitxa de l'hoste. |
| 6 | Primer cognom | Fitxa de l'hoste. |
| 7 | Segon cognom | Fitxa de l'hoste. |
| 8 | Nom | Fitxa de l'hoste. |
| 9 | Sexe | Fitxa de l'hoste. Home → `M`, Dona → `F`. |
| 10 | Data de naixement | Fitxa de l'hoste. |
| 11 | País de nacionalitat | «Nacionalitat» de la fitxa, convertida a codi ISO de 3 lletres (per exemple, França → `FRA`). |
| 12 | Data d'entrada | Data d'entrada de l'estada. |
| 13 | Hora d'entrada | Hora de la data d'entrada de l'estada. |
| 14 | Data de sortida | Data de sortida de l'estada. |
| 15 | Hora de sortida | Hora de la data de sortida de l'estada. |
| 16 | Data de contracte | Data de formalització de l'estada. |
| 17 | Tipus de contracte | Tipus de registre de l'estada: Contracte en curs → `C`, Reserva → `R`. |
| 18 | Núm. de contracte | Número de contracte de l'estada, en majúscules. |
| 19 | Núm. de viatgers | Nombre de viatgers de l'estada. |
| 20 | Núm. d'habitacions | Nombre d'habitacions de l'estada (pot quedar buit). |
| 21 | Internet | Casella d'internet de l'estada: `S` o `N`. |
| 22 | Tipus de pagament | El que tries a «Tipus de pagament a comunicar a Mossos» (per defecte «Pagament a destinació»). Codis: Pagament a destinació → `DESTI`, Efectiu → `EFECT`, Bizum i Pagament per mòbil → `MOVIL`, Plataforma de pagament → `PLATF`, Targeta de crèdit → `TARJT`, Transferència → `TRANS`, Targeta regal → `TREG`. |
| 23 | Telèfon | Fitxa de l'hoste. L'app treu els espais, el `+` i els guions (només deixa números). |
| 24 | Parentesc | Parentesc del viatger en aquesta estada. Codis: Avi/àvia `AB`, Besavi/besàvia `BA`, Besnét/besnéta `BN`, Cunyat/cunyada `CD`, Cònjuge `CY`, Fill/filla `HJ`, Germà/germana `HR`, Nét/néta `NI`, Pare o mare `PM`, Nebot/neboda `SB`, Sogre/sogra `SG`, Oncle/tia `TI`, Tutor/tutora `TU`, Gendre o nora `YN`, Altres `OT`. |
| 25 | Correu electrònic | Fitxa de l'hoste. |
| 26 | Núm. de suport | Fitxa de l'hoste, en majúscules. |
| 27 | Adreça | Fitxa de l'hoste, en majúscules. |
| 28 | Província | Si el país és Espanya: codi INE de 2 xifres (per exemple, Barcelona → `08`). Si no, buit. |
| 29 | Municipi | Si el país és Espanya: codi INE de 6 xifres, a partir de la llista oficial de municipis de l'INE. Si no, buit. |
| 30 | Localitat | Si el país **no** és Espanya: la localitat, en majúscules. Si és Espanya, buit. |
| 31 | País de l'adreça | «País» de la fitxa, convertit a codi ISO de 3 lletres. |
| 32 | Codi postal | Fitxa de l'hoste. |

**Notes sobre els camps**
- **Menors**: l'app decideix si un viatger és menor (menys de 14 anys el dia d'entrada) a partir de la **data de naixement**. Si no hi ha data, fa servir la marca «Menor» de l'estada.
- **Correccions a la finestra de revisió**: si canvies un camp a «Revisa el que s'enviarà a Mossos», el fitxer porta el valor nou. Si no marques «Desar canvis també a la fitxa», la fitxa de l'hoste es queda com estava.
- **Estades antigues**: si l'estada va acabar fa més de 7 dies i després s'ha editat la fitxa de l'hoste, el fitxer fa servir les dades congelades d'aquella estada.
- **Països**: l'app entén el nom en català (per exemple, «Països Baixos»), el codi de 3 lletres (`NLD`) i algunes nacionalitats en altres idiomes (per exemple, «NEDERLANDSE», «FRANCESA», «BRITISH»).
- **Ordre dels viatgers**: el titular va primer.
- **Codificació**: el fitxer es crea en ISO-8859-1 (latin1), si no ho has canviat a `/config`.

---

## Preguntes freqüents

**Quant temps tinc per comunicar un hoste als Mossos?**
Un màxim de **24 hores** des que arriba. El més segur és fer-ho el mateix dia del check-in, just després de fer el registre.

**He de comunicar també les reserves?**
Segons la normativa, sí: s'han de comunicar les reserves i les cancel·lacions. A l'app, en una «Reserva» només calen el nom, el primer cognom i un correu o telèfon.

**He pujat el fitxer a mà al portal, però al tauler encara surt com a pendent. Per què?**
Perquè l'app no sap que l'has pujat. L'enviament es queda a «Pendent». Quan estiguis segura que el portal l'ha acceptat, clica «Amaga» a la targeta «Pendents d'enviar a Mossos» del tauler. Guarda el comprovant que et dona el portal.

**L'app em diu que falten dades però l'hoste ja ha marxat. Què faig?**
Si pots, contacta l'hoste per completar-les. Si és impossible, a «Justificants» pots clicar «Silenciar avís». Recorda que el fitxer de Mossos no es podrà crear fins que les dades estiguin completes.

**Per què el fitxer es diu, per exemple, `08043AAR02.014.txt`?**
Així ho demanen els Mossos: el codi de l'hostal («File identifier»), un punt, un número de 3 xifres que va pujant (de 001 a 999) i `.txt`.

**Puc tornar a pujar una estada que ja vaig comunicar?**
Normalment no s'ha de fer: els hostes surten per duplicat. Si fas servir «Pujar a Mossos», l'app t'avisa amb el text «Aquesta estada ja s'ha comunicat a Mossos…». Fes-ho només si realment cal.

**Què passa si esborro un fitxer o un comprovant de l'app?**
Només s'esborra de l'app. **No es treu dels Mossos.** L'estada torna a sortir com a pendent de comunicar si no té cap altre enviament bo.

**El comprovant dels Mossos serveix com a registre?**
No. El manual dels Mossos diu que el comprovant **no es considera registre**. El registre legal és el **Llibre de registre**, que has de guardar 3 anys. Fes servir «Exportar Excel» per tenir-ne una còpia.

**Per què el llibre en paper surt en castellà?**
Perquè reprodueix el model de full de registre que es fa servir habitualment, que és en castellà.

**Un hoste ha canviat d'adreça. Si edito la seva fitxa, es canviarà el llibre de les estades d'abans?**
Si aquella estada va acabar fa més de 7 dies, no: l'app congela les dades de les estades antigues. Les estades recents sí que es posen al dia.

**L'hoste ha pagat amb Bizum. Què poso als Mossos?**
Al desplegable «Tipus de pagament a comunicar a Mossos» pots triar «Bizum». Els Mossos no tenen un codi per a Bizum, i l'app l'envia com a pagament per mòbil (`MOVIL`).

**Puc fer el fitxer des del mòbil o la tauleta?**
Sí, si pots obrir l'app amb el navegador. El fitxer es descarregarà al dispositiu. Després l'has de pujar al portal des d'aquest mateix dispositiu.

---

## DUBTES

*(Aquesta secció és interna i no es publicarà.)*

1. **No hi ha cap botó per marcar un enviament manual com a «Enviat» o «Acceptat».** L'API `PATCH /api/enviaments/:id` existeix (amb el comentari «Confirmación manual del envío»), però cap pantalla la fa servir. Conseqüències: després d'un enviament manual, l'estat es queda a «Pendent» per sempre; l'estada continua a «Pendents d'enviar a Mossos» (només es treu amb «Amaga»); a `/justificants` no surt el botó «Comprovant mossos»; el correu dels justificants no porta comprovant; i el llibre mostra «Pendent». S'ha de confirmar si falta aquest botó o si el flux manual ja no es fa servir.
2. **El component `descartar-avis-mossos` (`DescartarAvisMossos`, la creu «Descartar avís de Mossos») no es fa servir a cap pantalla.** El camp `avisMossosParat` es fa servir al filtre del tauler, però cap pantalla el posa a cert. Al tauler, l'avís s'amaga amb el botó genèric «Amaga» (taula `AvisDescartat`). He documentat «Amaga». Cal confirmar quin és el mecanisme bo.
3. Hi ha **una contradicció de textos**: la finestra de revisió diu «Aquesta app no envia res sol: genera el .txt per pujar-lo manualment al portal», però al costat hi ha el botó «Pujar a Mossos» (automàtic). Potser s'hauria d'actualitzar aquest text.
4. **La pujada automàtica (Browserbase) està activa en producció?** Depèn de les variables `BROWSERBASE_API_KEY` i `BROWSERBASE_PROJECT_ID`. El `CLAUDE.md` encara diu que el connector està «PENDIENTE de selectores», però el codi (`connector.ts`) té selectors capturats el juny de 2026. Cal saber si s'ha provat de veritat i si s'ha d'explicar com a opció principal.
5. El botó «Pujar a Mossos» **no obre la finestra de revisió** i envia sempre «Pagament a destinació». És intencionat?
6. **El tauler no calcula les 24 hores.** Llista totes les estades en reserva o en curs no comunicades (màxim 20), incloses les reserves futures. No hi ha cap avís de «termini a punt de vèncer». S'ha de confirmar si és així com es vol.
7. **Codificació**: és latin1 (ISO-8859-1) per defecte, però el manual dels Mossos no ho diu explícitament. Està pendent de verificar amb el primer fitxer real. Tampoc no sé si l'opció «UTF-8» la fa servir algú.
8. **Número de seqüència**: és global per a tot l'hostal i puja cada vegada que es genera un fitxer, encara que no es pugi al portal. Accepta el portal salts de números (per exemple, de 012 a 015)? I quan es torna a començar per 001, accepta un fitxer amb un nom ja fet servir abans?
9. **El sexe «Altre»** (codi `O` al manual) no existeix a l'app: només Home i Dona.
10. **Tipus de pagament**: el desplegable de la finestra només té 5 opcions (Pagament a destinació, Bizum, Efectiu, Transferència, Targeta de crèdit). No hi surten «Pagament per mòbil», «Plataforma de pagament» ni «Targeta regal», encara que l'app els sap codificar.
11. **El llibre imprès (`/imprimir/registre`) fa servir les dades vives de la fitxa de l'hoste**, no les dades congelades (`dadesCongelades`). En canvi, `/llibre` i el fitxer de Mossos sí que fan servir les congelades. Pot passar que el full imprès d'una estada antiga no coincideixi amb el llibre ni amb el que es va enviar.
12. El telèfon, el correu i la web de l'hostal estan **escrits directament al codi** del llibre imprès (no surten de `/config`). La «Provincia» també està fixa: «Barcelona».
13. **Conservació de 3 anys**: hi ha el camp «Retenció policial (anys)» a `/config`, però no he trobat cap procés que faci res amb aquest valor (ni esborrar ni avisar). Cal saber si s'ha d'explicar.
14. **Multes**: el codi i la documentació només diuen «de centenars fins a desenes de milers d'euros», sense citar cap article. No he posat xifres concretes. Cal confirmar si la propietària vol que hi surti la referència legal exacta.
15. Les correccions fetes a la finestra de revisió **sense** marcar «Desar canvis també a la fitxa» van al fitxer, però **no** al llibre. Llavors el llibre (registre legal) pot no coincidir amb el que s'ha enviat. Cal decidir si s'ha d'avisar més fort.
16. **Rols**: crear el fitxer i pujar-lo demana el rol ADMIN o RECEPCIO. La configuració (`/config`) només és per a ADMIN. Un usuari CONSULTA pot veure el llibre i els justificants, però no pot crear fitxers. No ho he comprovat a la pantalla (si els botons s'amaguen o donen error).
17. Les rutes de les marques FOTO de les estades fan servir `:id` (i `/estancies/nou` per a la nova estada). Cal substituir-les per una estada real de proves quan es facin les captures.
18. A la fila de l'enviament de la fitxa de l'estada, el botó «Comprovant mossos» surt també quan l'estat és «Pendent». Llavors genera un resum amb «Estat: Pendent». Pot confondre, perquè sembla un comprovant d'enviament fet.
