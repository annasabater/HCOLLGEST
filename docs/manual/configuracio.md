# Entrar, usuaris i configuració

Aquest capítol t'explica tot el que passa **abans** i **al voltant** de la feina del dia a dia:

- com **entrar** a l'aplicació i com **sortir-ne**;
- què passa si t'equivoques massa vegades amb la contrasenya;
- quins **usuaris** hi ha i què pot fer cadascun (els **rols**);
- com és la pantalla **«Configuració»** i què vol dir cada apartat;
- com es fan les **còpies de seguretat** (per correu i a Google Drive);
- com saber si l'aplicació **està bé** (comprovació d'estat);
- què queda **apuntat** (registre d'auditoria);
- com es protegeixen les **dades dels hostes** (privacitat);
- com fer-la servir des de la **tauleta o el mòbil**;
- i **què fer si alguna cosa no funciona**.

No cal que ho llegeixis tot d'una tirada. Busca la tasca que vols fer al títol («Com faig…») i segueix els passos.

Una idea important abans de començar: **gairebé tota la configuració només la pot tocar l'administradora** (el rol ADMIN). Si entres amb un altre usuari, moltes coses d'aquest capítol no les veuràs. És normal.

> Sobre les fotos: on veus una línia que comença per [FOTO …] hi anirà una captura de pantalla. La línia diu què s'ha de veure i quins botons s'han de marcar.

---

## Com faig per entrar a l'aplicació

**Per a què serveix**
Per identificar-te. L'aplicació guarda dades personals dels hostes i dades de diners. Per això ningú hi pot entrar sense correu i contrasenya.

**On és**
A la pàgina d'entrada: `https://gestio.hostalcoll.com/login`. Si obres qualsevol altra adreça de l'aplicació sense haver entrat, et porta aquí automàticament.

**Pas a pas**

1. Obre el navegador (Chrome, Edge, Safari, Firefox…).
2. Escriu l'adreça de l'aplicació. Si no has entrat, veuràs un fons granat amb el títol «Hostal Coll» i, a sota, «Gestió integral · PMS + ERP».
3. Al requadre blanc hi ha el títol «Iniciar sessió».
4. Al camp «Correu electrònic» escriu el teu correu.
5. Al camp «Contrasenya» escriu la teva contrasenya.
6. Si vols comprovar que l'has escrit bé, toca la icona de l'ull que hi ha a la dreta del camp. Serveix per «Mostrar la contrasenya». Si la tornes a tocar, s'amaga («Amagar la contrasenya»).
7. Prem el botó «Entrar». Mentre comprova les dades, el botó diu «Entrant…».

[FOTO id=login-pantalla ruta=/login descripcio="Pantalla d'entrada amb fons granat, títol Hostal Coll i el requadre blanc d'Iniciar sessió amb els dos camps buits" marques="Correu electrònic|Contrasenya|Entrar"]

[FOTO id=login-ull ruta=/login descripcio="Camp de contrasenya amb la icona de l'ull a la dreta del camp" marques="Mostrar la contrasenya"]

**Què passa després**

- Si les dades són correctes, entres al **«Tauler»** (la pantalla principal).
- Si havies intentat obrir una pàgina concreta abans d'entrar (per exemple, una estada), et porta directament a aquella pàgina.
- La sessió dura **8 hores**, però es **renova sola** cada vegada que fas alguna cosa. Mentre facis servir l'aplicació, no et traurà fora. Si la deixes 8 hores sense tocar-la, et demanarà tornar a entrar.
- Si ja havies entrat i tornes a obrir `/login`, l'aplicació et porta directament al Tauler.

[FOTO id=login-tauler ruta=/ descripcio="Tauler principal just després d'entrar, amb el menú granat a l'esquerra" marques="Tauler"]

**Per què es fa així**
L'aplicació guarda dades que la llei obliga a protegir (documents d'identitat, registre de viatgers de Mossos, factures). Per això cada persona entra amb el seu correu, i queda apuntat qui ha entrat i quan.

**Si t'has equivocat**

- Si surt el missatge en vermell «Credencials incorrectes», vol dir que el correu o la contrasenya no són bons. Revisa'ls (fes servir l'ull per veure la contrasenya) i torna-ho a provar.
- Fixa't en les majúscules: la contrasenya distingeix majúscules de minúscules. El correu, en canvi, no (l'aplicació el passa a minúscules).
- Si surt «Error de connexió», el teu aparell no té internet o la connexió ha fallat. Comprova el wifi i torna-ho a provar.

**Compte!**

- El missatge «Credencials incorrectes» és el mateix tant si el correu no existeix com si la contrasenya és dolenta. Es fa així a propòsit, perquè un intrús no pugui saber quins correus són vàlids.
- Si l'usuari està desactivat, també surt «Credencials incorrectes».
- No deixis la contrasenya apuntada al costat de la tauleta.
- En un ordinador compartit, **surt sempre** quan acabis (mira «Com faig per sortir»).

---

## Com faig per saber què passa si m'equivoco moltes vegades (bloqueig)

**Per a què serveix**
És una protecció contra algú que intenti endevinar la contrasenya provant-ne moltes.

**On és**
No és cap botó. Passa automàticament a la pantalla d'entrada (`/login`).

**Pas a pas**
No has de fer res. Funciona així:

1. Cada vegada que poses una contrasenya equivocada per a un correu que existeix, l'aplicació ho compta.
2. Quan arribes a **20 intents fallats** seguits, el compte queda **bloquejat 15 minuts**. Surt el missatge «Massa intents fallits. Compte bloquejat 15 minuts.»
3. Si durant aquests 15 minuts tornes a provar d'entrar (encara que sigui amb la contrasenya bona), surt «Massa intents fallits. Torna-ho a provar d'aquí uns minuts.»
4. Passats els 15 minuts, ja pots tornar a entrar normalment.

[FOTO id=login-bloquejat ruta=/login descripcio="Requadre d'Iniciar sessió amb el missatge vermell de compte bloquejat a sota de la contrasenya" marques="Massa intents fallits. Compte bloquejat 15 minuts."]

**Què passa després**

- Quan entres bé, el comptador d'errors torna a **zero**.
- Quan el bloqueig s'acaba, el comptador també comença de nou.

**Per què es fa així**
Si algú volgués provar milers de contrasenyes, el bloqueig el fa anar molt lent. Així és pràcticament impossible endevinar-la.

**Si t'has equivocat**
Espera 15 minuts. No hi ha cap botó per desbloquejar-ho abans des de l'aplicació. Mentre esperes, comprova amb calma quina és la contrasenya correcta.

**Compte!**

- El bloqueig és **per usuari**, no per aparell. Si algú altre s'equivoca 20 vegades amb el teu correu, el teu compte també queda bloquejat 15 minuts.
- Si veus que el teu compte es bloqueja sense que tu t'hagis equivocat, pot ser que algú estigui provant d'entrar. Avisa de seguida la persona que manté l'aplicació.

---

## Com faig per sortir (tancar la sessió)

**Per a què serveix**
Per tancar la teva sessió i que ningú més pugui fer servir l'aplicació en nom teu des d'aquell aparell.

**On és**
Al menú granat de l'esquerra, **a baix de tot**, hi ha el botó «Sortir» (amb una icona de porta i fletxa).
Al mòbil o la tauleta, primer has d'obrir el menú amb el botó de tres ratlles de dalt a l'esquerra («Obrir menú»).

**Pas a pas**

1. Si estàs al mòbil o a la tauleta, toca el botó de les tres ratlles de dalt a l'esquerra per obrir el menú.
2. Baixa fins a sota de tot del menú.
3. Toca «Sortir».

[FOTO id=sortir-boto ruta=/ descripcio="Part de baix del menú granat de l'esquerra, amb l'enllaç Configuració i el botó Sortir" marques="Sortir|Configuració"]

**Què passa després**
Tornes a la pantalla «Iniciar sessió». Queda apuntat al registre d'auditoria que has sortit.

**Per què es fa així**
Si et deixes la sessió oberta en un aparell compartit, qualsevol persona podria veure dades d'hostes o fer canvis amb el teu nom.

**Si t'has equivocat**
Si has sortit sense voler, torna a entrar amb el correu i la contrasenya.

**Compte!**
Tancar la pestanya del navegador **no** tanca la sessió. Si tornes a obrir l'adreça abans de 8 hores, encara hi seràs dins. Per tancar-la de veritat, prem «Sortir».

---

## Com faig per canviar la contrasenya

**Per a què serveix**
Per posar una contrasenya nova (perquè l'has oblidat, perquè algú la coneix o perquè és la primera vegada que entres).

**On és**
Ara mateix **l'aplicació no té cap pantalla ni cap botó per canviar la contrasenya**, ni per a l'administradora ni per als altres usuaris. Tampoc hi ha cap opció «He oblidat la contrasenya» a la pantalla d'entrada.

**Pas a pas**

1. Si necessites canviar o recuperar una contrasenya, **demana-ho a la persona tècnica que manté l'aplicació**.
2. Aquesta persona ho fa directament des de l'ordinador de manteniment (no des de les pantalles de l'aplicació).
3. Quan te la canviï, entra amb la contrasenya nova a «Iniciar sessió».

**Què passa després**
La contrasenya antiga deixa de funcionar. La nova funciona des del primer moment.

**Per què es fa així**
L'aplicació es va fer amb pocs usuaris fixos (administració, recepció, consulta i propietat). Per ara, la gestió d'usuaris i contrasenyes es fa des de fora de les pantalles.

**Si t'has equivocat**
Si la contrasenya nova no t'entra, comprova majúscules i minúscules amb la icona de l'ull. Si tot i així no funciona, torna a parlar amb la persona tècnica.

**Compte!**

- **Mai** enviïs la contrasenya per WhatsApp ni per correu sense protecció. Millor dir-la de paraula.
- Les contrasenyes es guarden **xifrades** (de manera que ni tan sols qui mira la base de dades no les pot llegir). Per això ningú et pot «dir quina era»: només te'n poden posar una de nova.

---

## Com faig per saber quin usuari soc i quin rol tinc

**Per a què serveix**
Per saber què pots fer i què no a l'aplicació.

**On és**
A la part de baix del menú granat de l'esquerra, just a sobre de «Sortir».

**Pas a pas**

1. Mira la part de baix del menú (al mòbil, obre'l abans amb «Obrir menú»).
2. Si hi veus l'enllaç «Configuració» (amb una roda dentada), ets **administradora** (ADMIN).
3. Si en lloc d'això hi veus el teu nom i, a sota, una paraula petita, aquesta paraula és el teu rol:
   - «Recepció» → rol RECEPCIO;
   - «Consulta» → rol CONSULTA;
   - El compte de propietat (només lectura) és administrador: també hi veu «Configuració» (mira la secció «Qui pot fer què»).

[FOTO id=rol-recepcio ruta=/ descripcio="Part de baix del menú d'un usuari de recepció: el nom de l'usuari i a sota la paraula Recepció, i el botó Sortir" marques="Recepció|Sortir"]

**Què passa després**
Res. Només és informació.

**Per què es fa així**
Cada rol veu un menú diferent. Si no trobes una opció, segurament és perquè el teu rol no la té.

**Si t'has equivocat**
Si creus que tens un rol que no et toca, parla amb l'administradora.

**Compte!**
El menú amaga algunes opcions segons el rol, però **no totes**. Per exemple, un usuari de recepció veu «Facturació» i «Despeses» al menú, però si hi clica torna al Tauler perquè no hi té permís. No és un error.

---

## Qui pot fer què (rols)

A l'aplicació hi ha **tres rols**:

| Rol | Nom que surt a la pantalla | Pensat per a… | En poques paraules |
|---|---|---|---|
| **ADMIN** | (veu l'enllaç «Configuració») | La propietària o gestora | Ho pot fer **tot**: diners, personal, configuració. |
| **RECEPCIO** | «Recepció» | Qui fa el dia a dia de recepció | Pot **crear i modificar** hostes, estades, neteja, avisos… però **no** veu diners ni configuració. |
| **CONSULTA** | «Consulta» | Algú que només ha de mirar | Pot **mirar**, però **no pot canviar res**. |

A més, hi ha un compte especial anomenat **«Propietat»**. Tècnicament és ADMIN (ho veu gairebé tot), però:

- és de **només lectura**: no pot crear, modificar ni esborrar res. Si ho intenta, surt «Aquest compte és de només lectura.»;
- al menú hi surt «Configuració», com a qualsevol administradora (hi pot entrar, però no pot desar res);
- al menú no veu «Neteja», «Treballadors» ni «Taxa turística». «Tarifes» sí que hi surt, però en clicar-hi torna al Tauler (igual que si escriu l'adreça de «Neteja» o «Treballadors»);
- als ingressos no hi compten els cobraments amb mètode «ALTRES»;
- al llibre de registre no hi surten les estades que porten la marca «ZP11» a les observacions;
- al «Balanç» no veu les fiances, i a «Facturació» no veu les factures d'estades amb dipòsit.

### Taula detallada: pantalla per pantalla

Llegenda:
- **Sí** = hi pot entrar i fer-ho tot.
- **Mirar** = hi pot entrar però no pot canviar res.
- **No** = no ho veu, o si hi entra l'aplicació el torna al Tauler.

| Pantalla / acció | ADMIN | RECEPCIO | CONSULTA | Propietat (només lectura) |
|---|---|---|---|---|
| «Tauler» (pantalla principal) | Sí | Sí | Mirar | Mirar |
| Targeta del Tauler «Estades a facturar» | Sí | No | No | Mirar |
| Avís de cobraments previstos (finestra emergent en entrar) | Sí | Sí | Sí | No |
| «Clients» (llista i fitxa) | Sí | Sí | Mirar | Mirar |
| Botons «Editar» i «Eliminar» d'un client | Sí | Sí | No | No |
| Pujar o eliminar documents d'identitat | Sí | Sí | No | No |
| Veure documents d'identitat | Sí | Sí | Sí | Sí |
| «Estades» (llista i detall) | Sí | Sí | Mirar | Mirar |
| Crear, modificar o eliminar estades | Sí | Sí | No | No |
| Dins d'una estada: «Pagaments i fiances» | Sí | No | No | Mirar |
| Dins d'una estada: «Facturació» | Sí | No | No | Mirar |
| Dins d'una estada: «Pressupostos» | Sí | No | No | Mirar |
| Enviaments a Mossos (marcar com enviat, etc.) | Sí | Sí | No | No |
| «Llibre registre de viatgers» | Sí | Sí | Mirar | Mirar (sense les estades «ZP11») |
| «Calendari» | Sí | Sí | Mirar | Mirar |
| «Neteja» (veure i marcar tasques) | Sí | Sí | Mirar | No |
| Neteja: registrar el pagament a la persona de neteja | Sí | No | No | No |
| «Plantilles» | Sí | Sí | Sí | Mirar |
| «Treballadors» | Sí | No | No | No |
| «Balanç» | Sí | No | No | Mirar (sense fiances) |
| «Impostos» | Sí | No | No | Mirar |
| «Facturació» (llista de factures) | Sí | No (surt al menú però el torna al Tauler) | No (ídem) | Mirar |
| «Pressupostos» | Sí | No | No | Mirar |
| «Tarifes» | Sí | No | No | No |
| «Despeses» | Sí | No (surt al menú però el torna al Tauler) | No (ídem) | Mirar |
| «Taxa turística» | Sí | Sí | Mirar | No |
| «Proveïdors i serveis» | Sí | Sí | Mirar | Mirar |
| «Justificants» | Sí | Sí | Mirar | Mirar |
| Avisos d'hostes i incidències de manteniment | Sí | Sí | Mirar | Mirar |
| Valoracions dels hostes (veure / esborrar) | Sí | Sí | Mirar | Mirar |
| Veri*Factu | Sí | No | No | Mirar |
| «Configuració» | Sí | No | No | No |
| Descarregar còpia de seguretat | Sí | No | No | Sí (és una lectura) |
| Connectar Google Drive | Sí | No | No | No |
| Cercador general | Sí (veu més resultats) | Sí | Sí | Sí |

[FOTO id=menu-admin ruta=/ descripcio="Menú granat complet tal com el veu l'administradora, amb els grups Recepció i Gestió" marques="Clients|Estades|Treballadors|Balanç|Configuració"]

[FOTO id=menu-recepcio ruta=/ descripcio="Menú granat tal com el veu un usuari de Recepció: sense Treballadors, Balanç, Impostos, Pressupostos ni Tarifes" marques="Facturació|Despeses|Recepció"]

**Per què es fa així**
Cada persona ha de veure només el que necessita per a la seva feina. Els diners, les nòmines i la configuració són informació delicada. I les dades dels hostes s'han de protegir per llei.

**Compte!**
Si un usuari de recepció o de consulta prova d'entrar a una pàgina reservada (per exemple escrivint l'adreça `/config`), l'aplicació el torna al Tauler o li mostra «Només els administradors poden accedir a la configuració.»

---

## Com faig per crear, modificar o desactivar usuaris

**Per a què serveix**
Per donar accés a una persona nova (per exemple, algú que comença a fer recepció) o per treure'l a algú que ja no hi treballa.

**On és**
**L'aplicació no té cap pantalla per gestionar usuaris.** Els usuaris es van crear quan es va posar en marxa l'aplicació: «Administrador» (ADMIN), «Propietat» (ADMIN de només lectura), «Recepció» (RECEPCIO) i «Consulta» (CONSULTA).

**Pas a pas**

1. Si necessites un usuari nou, canviar-li el rol o deixar-lo sense accés, **demana-ho a la persona tècnica que manté l'aplicació**.
2. Explica-li: el nom de la persona, el correu que farà servir i quin rol ha de tenir (mira la taula «Qui pot fer què»).
3. La persona tècnica ho farà des de fora de les pantalles.

**Què passa després**
L'usuari nou ja podrà entrar per «Iniciar sessió». Un usuari desactivat veurà «Credencials incorrectes» i no podrà entrar.

**Per què es fa així**
Per ara, en un hostal petit, els usuaris canvien molt poc. Es va decidir no fer-ne pantalla.

**Si t'has equivocat**
Si has donat un rol equivocat a algú, demana a la persona tècnica que el corregeixi.

**Compte!**

- **No comparteixis** el compte d'administradora amb el personal. Fes que facin servir el compte de «Recepció».
- Si una persona deixa de treballar a l'hostal i coneixia una contrasenya, **canvia-la** (demana-ho a la persona tècnica).

---

## Com faig per obrir la pantalla de Configuració

**Per a què serveix**
És on es posen les dades fixes de l'hostal: dades per a Mossos, per a les factures, la taxa turística, les còpies de seguretat, etc.

**On és**
Al menú granat de l'esquerra, **a baix de tot**, l'enllaç «Configuració» (amb una roda dentada), just a sobre de «Sortir». Adreça: `/config`.
**Només el veu l'administradora.**

**Pas a pas**

1. Al menú de l'esquerra, prem «Configuració».
2. S'obre la pàgina amb el títol «Configuració» i el subtítol «Establiment, Mossos, facturació i RGPD».
3. Veuràs una llista de **targetes tancades**. Cadascuna té un títol. Per obrir-ne una, prem el títol. Per tancar-la, torna-hi a prémer.

Les targetes, en ordre, són:

1. «Dades de l'establiment»
2. «Fitxer massiu de Mossos»
3. «Dades per a la factura»
4. «Taxa turística (declaració)»
5. «Facturació i RGPD»
6. «Benvinguda als hostes»
7. «Balanç de situació»
8. «Còpia automàtica a Google Drive»
9. «Còpia de seguretat de les dades»
10. «Bugaderia (catàleg i valors per habitació)»
11. «Manual d'usuari»

[FOTO id=config-general ruta=/config descripcio="Pàgina Configuració amb totes les targetes tancades, una sota l'altra" marques="Dades de l'establiment|Fitxer massiu de Mossos|Dades per a la factura|Còpia de seguretat de les dades|Manual d'usuari"]

**Què passa després**
Pots obrir les targetes que necessitis. Si mentre carrega veus «Carregant…», espera un moment.

**Per què es fa així**
Les targetes tancades fan que la pàgina sigui curta i fàcil de llegir. Només obres el que vols tocar.

**Si t'has equivocat**
Si has obert una targeta que no volies, torna a prémer el títol i es tanca. Obrir-la no canvia res.

**Compte!**
Les **set primeres targetes** (de «Dades de l'establiment» a «Balanç de situació») són **un sol formulari**. Molt important:

- cada targeta té el seu botó «Desar configuració», però **qualsevol d'aquests botons desa TOTES les set targetes alhora**;
- la targeta «Dades de l'establiment» no té botó propi: el que hi canviïs es desa amb qualsevol «Desar configuració» de les altres;
- si canvies coses en dues targetes i prems un sol botó, es desen les dues;
- si canvies coses i **surts de la pàgina sense prémer cap botó**, els canvis **es perden**.

Quan es desa bé, al costat del botó surt en verd «Configuració desada.» Mentre desa, el botó diu «Desant…».

---

## Com faig per revisar les dades de l'establiment

**Per a què serveix**
Són les dades d'identificació de l'hostal: el nom, el número que l'identifica davant la policia i el CIF.

**On és**
«Configuració» → targeta «Dades de l'establiment».

**Pas a pas**

1. Obre la targeta «Dades de l'establiment».
2. Veuràs tres camps:
   - «Nom»: el nom de l'establiment. Està en gris: **no es pot canviar** des d'aquí.
   - «Id policial»: el número que identifica l'hostal davant de Mossos. També en gris, **no es pot canviar**.
   - «CIF»: l'identificador de l'establiment. **Aquest sí que es pot canviar.** Sota el camp hi diu: «Identificador de l'establiment (llibre de registre, exportació mensual). No s'envia a Mossos.»
3. Si has de corregir el CIF, escriu-lo.
4. Per desar-lo, obre qualsevol altra targeta del formulari (per exemple «Fitxer massiu de Mossos») i prem «Desar configuració».

[FOTO id=config-establiment ruta=/config descripcio="Targeta Dades de l'establiment oberta, amb Nom i Id policial en gris i el CIF editable" marques="Nom|Id policial|CIF"]

**Què passa després**
El CIF nou s'utilitza al llibre de registre i a l'exportació mensual.

**Per què es fa així**
El nom i l'Id policial venen del registre oficial i no s'han de tocar. Si estiguessin malament, els fitxers per a Mossos sortirien malament.

**Si t'has equivocat**
Torna a escriure el CIF correcte i desa.

**Compte!**

- El CIF no pot quedar buit. Si l'esborres i deses, surt un error («Cal el CIF»).
- Aquest **CIF no és el NIF que surt a les factures**. El de les factures es posa a «Dades per a la factura» → «NIF de facturació».
- Si el «Nom» o l'«Id policial» són incorrectes, demana-ho a la persona tècnica.

---

## Com faig per configurar el fitxer de Mossos (file identifier i usuari)

**Per a què serveix**
Per poder generar el **fitxer massiu** (`.txt`) que es puja al portal de Mossos d'Esquadra amb les dades dels viatgers. Sense el «File identifier», l'aplicació **no pot generar** aquest fitxer.

**On és**
«Configuració» → targeta «Fitxer massiu de Mossos».

**Pas a pas**

1. Obre la targeta «Fitxer massiu de Mossos».
2. Al camp «File identifier» escriu el codi que trobaràs al **portal de Mossos**, a l'apartat «Dades de l'establiment». Sota el camp hi diu: «9-10 car. alfanumèrics de «Dades de l'establiment» del portal. NO és l'Id policial.»
3. Al desplegable «Codificació» deixa-hi «ISO-8859-1 (latin1)», que és el que hi ha per defecte. L'altra opció és «UTF-8». **No ho canviïs** si no t'ho diu la persona tècnica.
4. Al camp «Usuari Mossos» escriu l'usuari amb què entres al portal de Mossos.
5. Al camp «Contrasenya Mossos» escriu la contrasenya del portal de Mossos.
   - Si ja n'hi havia una de desada, sota el camp surt «Ja configurada (es desa xifrada). Deixa-ho buit per mantenir-la.» En aquest cas, **deixa'l buit** si no la vols canviar.
   - Si no n'hi havia cap, surt «Es desa xifrada (AES-256-GCM).»
6. Prem «Desar configuració».

[FOTO id=config-mossos ruta=/config descripcio="Targeta Fitxer massiu de Mossos oberta amb els quatre camps i el botó de desar a sota" marques="File identifier|Codificació|Usuari Mossos|Contrasenya Mossos|Desar configuració"]

**Què passa després**

- Surt «Configuració desada.» en verd.
- El camp de la contrasenya es buida (és normal: per seguretat no es torna a ensenyar mai).
- A partir d'ara, quan generis el fitxer per a Mossos d'una estada, el nom del fitxer començarà pel teu «File identifier».

**Per què es fa així**

- El portal de Mossos exigeix que el nom del fitxer porti aquest codi.
- La contrasenya de Mossos es guarda **xifrada**. Ni l'aplicació la mostra mai a ningú, ni surt a les còpies llegibles.

**Si t'has equivocat**

- Si el «File identifier» no té entre 9 i 10 lletres o números (sense espais ni guions), surt l'error «Ha de tenir 9-10 caràcters alfanumèrics (§9.2)». Corregeix-lo i torna a desar.
- Si l'has posat malament però amb el format correcte, el portal de Mossos rebutjarà el fitxer. Torna a mirar el codi al portal, corregeix-lo i desa.
- Si deixes el camp buit i deses, el codi s'esborra. Llavors, en intentar generar un fitxer, sortirà un missatge que diu que falta el file_identifier i que l'has de configurar a Configuració.

**Compte!**

- **El «File identifier» NO és l'«Id policial».** Són dos números diferents.
- El primer fitxer que generis, **comprova'l bé al portal** abans de confiar-hi per a tots.
- Si canvies la contrasenya del portal de Mossos, recorda canviar-la també aquí.
- No escriguis mai la contrasenya de Mossos en cap altre lloc de l'aplicació (observacions, notes…).

---

## Com faig per posar les dades que surten a les factures

**Per a què serveix**
Per decidir què surt a la capçalera de les factures i rebuts impresos: qui factura, el NIF, l'adreça, el telèfon i el compte bancari.

**On és**
«Configuració» → targeta «Dades per a la factura».

**Pas a pas**

1. Obre la targeta «Dades per a la factura».
2. Omple els camps:
   - «Titular / raó social»: el nom que surt a dalt. Si el deixes buit, surt el nom de l'establiment.
   - «Descriptor»: el subtítol de la capçalera (per exemple «Pensió · Calella»).
   - «Telèfon».
   - «Adreça».
   - «Codi postal».
   - «Població».
   - «IBAN»: el número de compte on et poden pagar per transferència. És també el compte on l'AEAT **domicilia** els impostos quan fas servir el fitxer o la presentació des de la pàgina «Impostos»: ha de ser un IBAN espanyol vàlid.
   - «Titular de facturació»: la **persona** que surt com a emissora de la factura (per exemple «Elisabeth Nualart Coll»). Pot ser diferent del titular que consta a Mossos. Si el deixes buit, les factures posen «Elisabeth Nualart Coll».
   - «NIF de facturació»: el NIF que surt a les factures. Pot ser diferent del CIF de «Dades de l'establiment». La pàgina «Impostos» també fa servir aquest NIF per als models (el nom, en canvi, hi surt sempre com consta a Hisenda: «NUALART COLL ELISABETH»).
3. Prem «Desar configuració».

[FOTO id=config-factura ruta=/config descripcio="Targeta Dades per a la factura oberta amb tots els camps (titular, descriptor, telèfon, adreça, CP, població, IBAN, titular i NIF de facturació)" marques="Titular / raó social|IBAN|Titular de facturació|NIF de facturació|Desar configuració"]

**Què passa després**
Les factures i rebuts que imprimeixis **a partir d'ara** surten amb aquestes dades.

**Per què es fa així**
Les dades que la policia té de l'establiment i les dades fiscals de qui factura poden ser diferents (per exemple, una persona física titular de l'activitat). Per això hi ha camps separats.

**Si t'has equivocat**
Corregeix el camp i torna a desar. Si deixes un camp buit i deses, aquell camp queda esborrat.

**Compte!**

- Revisa molt bé el **NIF de facturació** i l'**IBAN**: si estan malament, les factures seran incorrectes.
- Les factures que ja estan registrades per a Veri*Factu queden bloquejades i no es poden tornar a editar. Canviar aquí les dades no les modifica.

---

## Com faig per configurar la taxa turística (IEET)

**Per a què serveix**
Hi ha **dos llocs** on es configura l'Impost sobre estades en establiments turístics (IEET, la «taxa turística»):

1. «Taxa turística (declaració)»: per a la pàgina «Taxa turística», que calcula el que has de declarar **a partir de les estades**.
2. «Facturació i RGPD» → «IEET (€/persona·nit)»: l'import que s'afegeix **a les factures**.

**On és**
«Configuració» → targetes «Taxa turística (declaració)» i «Facturació i RGPD».

**Pas a pas**

*A) Per a la declaració (pàgina «Taxa turística»)*

1. Obre la targeta «Taxa turística (declaració)». A dalt hi diu: «Per a la pàgina «Taxa turística»: es calcula per estades (només la primera), no per factures.»
2. «Import per persona i nit (€)»: el que paga cada persona per nit. Per defecte hi ha 0,90.
3. «Màxim de nits que paguen»: a partir d'aquest nombre de nits, ja no es paga més. Per defecte, 7.
4. «Paguen a partir de (anys)»: l'edat mínima per pagar. Per defecte, 17. Els més petits surten a 0 €.
5. Prem «Desar configuració».

*B) Per a les factures*

1. Obre la targeta «Facturació i RGPD».
2. Al camp «IEET (€/persona·nit)» escriu l'import que vols que surti a les factures.
3. Prem «Desar configuració».

[FOTO id=config-taxa ruta=/config descripcio="Targeta Taxa turística (declaració) oberta amb els tres camps numèrics" marques="Import per persona i nit (€)|Màxim de nits que paguen|Paguen a partir de (anys)"]

[FOTO id=config-rgpd ruta=/config descripcio="Targeta Facturació i RGPD oberta amb l'IEET i els dos camps de retenció" marques="IEET (€/persona·nit)|Retenció policial (anys)|Retenció CRM (anys)"]

**Què passa després**

- La pàgina «Taxa turística» recalcula amb els valors nous.
- Les factures noves porten l'IEET amb l'import nou.

**Per què es fa així**
La taxa canvia de tant en tant (per llei o per municipi). Així no cal tocar res tècnic: només actualitzes el número.

**Si t'has equivocat**
Torna a posar el valor bo i desa. Límits que accepta l'aplicació:
- import de la declaració: de 0 a 20 €;
- màxim de nits: d'1 a 60;
- edat mínima: de 0 a 30 anys.
Si poses un valor fora d'aquests límits, surt «Dades no vàlides».

**Compte!**

- Són **dos imports diferents**. Si canvia la taxa oficial, **actualitza'ls tots dos**.
- Les factures que ja s'han fet **no** es recalculen.

---

## Com faig per configurar els terminis de conservació de dades (RGPD)

**Per a què serveix**
Per deixar escrit quants anys s'han de conservar les dades del registre de viatgers i les dades de clients.

**On és**
«Configuració» → targeta «Facturació i RGPD».

**Pas a pas**

1. Obre «Facturació i RGPD».
2. «Retenció policial (anys)»: per defecte 3. La llei obliga a conservar el registre de viatgers **3 anys**.
3. «Retenció CRM (anys)»: quants anys vols guardar les dades dels clients per a la teva gestió.
4. Prem «Desar configuració».

**Què passa després**
Els valors queden desats.

**Per què es fa així**
La llei de protecció de dades diu que no es poden guardar dades personals per sempre: cal fixar un termini.

**Si t'has equivocat**
Posa el número bo (mínim 1) i desa.

**Compte!**

- Ara mateix, aquests dos números **només queden apuntats**: l'aplicació **no esborra res automàticament** a partir d'ells.
- L'únic esborrat automàtic que existeix és el de les **imatges** dels documents d'identitat (mira «Com faig per entendre la privacitat i la protecció de dades»), i aquest es configura per una altra via.
- **Mai** posis menys de 3 a «Retenció policial (anys)».

---

## Com faig per configurar l'avís de benvinguda als hostes

**Per a què serveix**
Després de la primera nit d'una estada, el Tauler t'avisa que toca enviar la benvinguda per WhatsApp. Aquí decideixes **a qui** et proposa enviar-la.

**On és**
«Configuració» → targeta «Benvinguda als hostes».

**Pas a pas**

1. Obre «Benvinguda als hostes».
2. Primera casella, «Mostrar només el titular»:
   - **marcada**: el Tauler mostra directament el botó del titular de l'estada;
   - **desmarcada**: el Tauler mostra tots els adults de l'estada perquè triïs a qui enviar.
3. Segona casella, «Mostrar tots els hostes adults»: només es pot marcar si la primera està marcada. Serveix per tornar a veure tots els adults.
4. Prem «Desar configuració».

[FOTO id=config-benvinguda ruta=/config descripcio="Targeta Benvinguda als hostes amb les dues caselles" marques="Mostrar només el titular|Mostrar tots els hostes adults"]

**Què passa després**
L'avís de benvinguda del Tauler es comporta segons el que hagis triat.

**Per què es fa així**
Hi ha hostals que només escriuen al titular i d'altres que escriuen a tothom.

**Si t'has equivocat**
Canvia les caselles i desa.

**Compte!**
Els **menors no apareixen mai** a la llista, triïs el que triïs.

---

## Com faig per posar el saldo inicial de tresoreria

**Per a què serveix**
Per dir quants diners tenies (al compte i a la caixa) el dia que vas començar a fer servir l'aplicació. Serveix perquè el «Balanç de situació» calculi bé quants diners tens ara.

**On és**
«Configuració» → targeta «Balanç de situació».

**Pas a pas**

1. Obre «Balanç de situació».
2. Al camp «Saldo inicial de tresoreria (€)» escriu l'import (per exemple 1500.00).
3. Prem «Desar configuració».

[FOTO id=config-saldo ruta=/config descripcio="Targeta Balanç de situació oberta amb el camp del saldo inicial" marques="Saldo inicial de tresoreria (€)"]

**Què passa després**
El «Balanç» recalcula la tresoreria actual a partir d'aquest import.

**Per què es fa així**
L'aplicació només sap els diners que entren i surten des que la fas servir. El punt de partida l'has de posar tu.

**Si t'has equivocat**
Corregeix l'import i desa. No pot ser negatiu.

**Compte!**
Fes servir el **punt** com a separador de decimals si el teu teclat t'ho demana (el camp és numèric).

---

## Com faig per canviar les normes del hostal (reglament i cartell)

**Per a què serveix**
Per canviar les normes de la casa que surten al **reglament que signa cada hoste** i al **cartell** que es penja a la paret: modificar-ne el text, afegir-ne de noves, treure'n o canviar-ne l'ordre.

**On és**
«Configuració» → targeta «Normes del hostal (reglament i cartell)».

**Pas a pas**

1. Obre la targeta. Surten totes les normes numerades, cadascuna en un requadre.
2. Per **canviar** una norma: escriu directament dins del seu requadre.
3. Per **afegir-ne** una: prem «Afegeix una norma». Surt un requadre buit al final; escriu-hi el text.
4. Per **treure'n** una: prem la paperera de la dreta d'aquella norma.
5. Per **canviar l'ordre**: fes servir les fletxes amunt i avall de la dreta.
6. Quan acabis, prem «Desa les normes». Surt «Normes desades».
7. Per comprovar com queda, prem «Veure el cartell» o «Veure el reglament».

**Què passa després**
El cartell i els reglaments que es generin a partir d'ara porten les normes noves.

**Per què es fa així**
Cada vegada que deses, l'aplicació guarda una **versió nova** amb la data. Així, el reglament que un hoste ja va signar es continua veient amb les normes que hi havia **el dia que va signar**, encara que després les canviïs.

**Si t'has equivocat**

- Si encara no has desat, torna a carregar la pàgina i es perden els canvis.
- Si ja has desat, corregeix el text i torna a prémer «Desa les normes».
- Per tornar a les normes de l'inici, prem «Normes originals».

**Compte!**

- Si hi ha moltes normes o són molt llargues, el reglament que signa l'hoste pot passar a ocupar dues pàgines. Mira'l amb «Veure el reglament» abans de donar-lo per bo.
- Només ho pot fer l'administradora.

---

## Com faig per configurar la bugaderia (articles i valors per habitació)

**Per a què serveix**
Per tenir la llista de peces de roba (llençols, tovalloles…) amb el seu preu, i per dir quantes peces de cada tipus es fan servir normalment a cada habitació. Això s'utilitza per preomplir la bugaderia al full de neteja.

**On és**
«Configuració» → targeta «Bugaderia (catàleg i valors per habitació)».

**Pas a pas**

*A) Catàleg d'articles i preus*

1. Obre la targeta. A dalt hi ha «Catàleg d'articles i preus».
2. Per **canviar el nom o el preu** d'un article: escriu al camp i després **toca fora del camp**. Es desa sol («Els canvis de nom i preu es desen en sortir del camp.»).
3. Per **afegir** un article: a sota de la llista, escriu el nom a «Nou article (p. ex. Nòrdic)», el preu a «Preu» i prem «Afegir».
4. Per **eliminar** un article: prem la paperera de la dreta. Sortirà «Eliminar aquest article del catàleg?». Prem «D'acord» per confirmar.

*B) Valors per defecte per habitació*

1. Més avall, a «Valors per defecte per habitació», tria l'habitació al desplegable «Tria una habitació…».
2. Surt una taula amb els articles i dues columnes: «Manteniment» i «Sortida».
3. Amb els botons «−» i «+» posa quantes peces de cada article es canvien normalment en un manteniment i en una sortida.
4. Prem «Desar valors per defecte». Quan s'ha desat, surt «Desat ✓».

[FOTO id=config-bugaderia ruta=/config descripcio="Targeta Bugaderia oberta: catàleg d'articles a dalt i taula de valors per habitació a baix amb els botons menys i més" marques="Afegir|Valors per defecte per habitació|Manteniment|Sortida|Desar valors per defecte"]

**Què passa després**
Al full de neteja, la bugaderia d'aquella habitació surt preomplerta amb aquests valors (els pots canviar allà mateix).

**Per què es fa així**
Així no has de comptar cada dia les mateixes peces: només corregeixes quan hi ha alguna diferència.

**Si t'has equivocat**

- Si has canviat un preu malament, torna a escriure el preu bo i toca fora del camp.
- Si has eliminat un article sense voler, torna'l a afegir amb «Afegir».

**Compte!**

- Aquesta targeta **no** fa servir el botó «Desar configuració». Cada part es desa per separat (en sortir del camp, amb «Afegir» o amb «Desar valors per defecte»).
- Els canvis de catàleg i de valors per habitació només els pot fer l'administradora.

---

## Com faig per obrir el manual d'usuari

**Per a què serveix**
Per consultar aquest manual, que explica com es fa cada cosa pas a pas i amb fotos, o per descarregar-lo en PDF i imprimir-lo.

**On és**
«Configuració» → targeta «Manual d'usuari». També és al menú de l'esquerra, a «Manual d'usuari».

**Pas a pas**

1. Obre la targeta «Manual d'usuari». Hi diu: «El manual explica com es fa cada cosa, pas a pas i amb fotos. També és al menú, a «Manual d'usuari», i es pot descarregar en PDF per imprimir-lo.»
2. Prem «Obrir el manual» per llegir-lo a la pantalla, o «Descarregar PDF» per desar-ne una còpia en PDF.

[FOTO id=config-guia ruta=/config descripcio="Targeta Manual d'usuari oberta amb els botons Obrir el manual i Descarregar PDF" marques="Manual d'usuari|Obrir el manual|Descarregar PDF"]

**Què passa després**
- «Obrir el manual» obre el manual dins de la mateixa aplicació, a la mateixa pestanya.
- «Descarregar PDF» baixa el fitxer del manual a la carpeta de baixades de l'ordinador o del mòbil. L'obres i, si el vols en paper, l'imprimeixes.

**Per què es fa així**
Així tens el manual sempre a mà dins de l'aplicació, i una còpia en PDF per quan no tinguis connexió o el vulguis imprimir.

**Si t'has equivocat**
Si has obert el manual sense voler, torna enrere amb el navegador o tria una altra secció al menú.

**Compte!**

- Si no s'obre res, potser el navegador bloqueja les pestanyes noves. Mira «El PDF no s'obre» a la secció «Si alguna cosa no funciona».
- Si surt «Manual no trobat», avisa la persona tècnica.

---

## Com faig per descarregar una còpia de seguretat

**Per a què serveix**
Per tenir, en un fitxer teu, una còpia de **totes** les dades principals de l'aplicació. Si algun dia passés alguna cosa greu, aquesta còpia serviria per recuperar-les.

**On és**
«Configuració» → targeta «Còpia de seguretat de les dades».

**Pas a pas**

1. Obre la targeta «Còpia de seguretat de les dades».
2. Prem «Descarregar còpia (JSON)».
3. El navegador descarrega un fitxer amb un nom com `backup-hostalcoll-2026-10-18.json` (la data és la del dia).
4. Guarda aquest fitxer en un lloc segur (un disc extern, el teu Google Drive…).

[FOTO id=config-backup ruta=/config descripcio="Targeta Còpia de seguretat de les dades oberta amb el botó de descàrrega i el requadre de la còpia mensual per correu" marques="Descarregar còpia (JSON)|Enviar còpia per correu ara"]

**Què passa després**

- Tens el fitxer a la carpeta de descàrregues.
- Queda apuntat al registre d'auditoria que has descarregat una còpia.

**Per què es fa així**
Les dades ja es guarden en un servei professional (Supabase) que fa les seves pròpies còpies. Aquesta descàrrega és una **segona protecció** que queda a les teves mans.

**Si t'has equivocat**
Si l'has descarregat dues vegades, no passa res: esborra'n una.

**Compte!**

- El fitxer JSON és per a la **recuperació tècnica**: és text pensat per a ordinadors, no per llegir-lo tu. Per llegir les dades, fes servir la còpia en Excel que arriba per correu.
- **Aquest fitxer conté dades personals de tots els hostes.** Tracta'l com un document confidencial: no l'enviïs per correu a ningú, no el deixis en un ordinador compartit.
- La còpia **no conté les contrasenyes** dels usuaris.
- La còpia **no conté les fotos** dels documents d'identitat (només la informació que hi ha una foto).

---

## Com faig per rebre la còpia de seguretat per correu

**Per a què serveix**
Per rebre **cada mes, automàticament**, una còpia de les dades en Excel al correu de l'hostal, sense haver de recordar-te'n.

**On és**
«Configuració» → targeta «Còpia de seguretat de les dades» → requadre «Còpia automàtica mensual per correu.»

**Pas a pas**

No has de fer res: funciona sol. **Cada dia 1 de mes** (al matí) l'aplicació envia la còpia completa a **hostalcoll@gmail.com**.

Si vols **provar-ho ara mateix**:

1. Obre la targeta «Còpia de seguretat de les dades».
2. Al requadre «Còpia automàtica mensual per correu.», prem «Enviar còpia per correu ara». Mentre envia, diu «Enviant…».
3. Si va bé, al costat surt en verd «Enviat a …» amb el correu.
4. Mira la safata d'entrada (i la carpeta de correu brossa, per si de cas).

**Què passa després**
Reps un correu amb l'assumpte «Còpia de seguretat · Hostal Coll · » seguit de la data. Dins hi ha un fitxer **Excel** (`backup-hostalcoll-AAAA-MM-DD.xlsx`) amb **un full per a cada tipus de dada** (hostes, estades, factures, despeses…). El correu diu: «Guarda aquest fitxer en un lloc segur.»

**Per què es fa així**
Així, encara que no te'n recordis, cada mes tens una còpia nova fora de l'aplicació.

**Si t'has equivocat**
Si l'has enviat diverses vegades, simplement tindràs diversos correus. Pots esborrar els que sobrin.

**Compte!**

- Perquè funcioni, cal que la persona tècnica hagi configurat el **servei de correu**. Si no està configurat, en prémer el botó surt un missatge en vermell que ho diu («No s'ha pogut enviar (cal configurar RESEND_API_KEY).» o semblant). La descàrrega manual continua funcionant igualment.
- El correu porta **dades personals de tots els hostes**. Protegeix bé el compte de correu (contrasenya forta i verificació en dos passos).
- No reenviïs aquest correu a ningú.

---

## Com faig per connectar Google Drive (arxiu automàtic)

**Per a què serveix**
Perquè l'aplicació desi **sola** a Google Drive els documents de l'hostal: llibre de registre, fitxes, comprovants de Mossos, factures, Excel d'hostes, d'ingressos i despeses, de personal i de la taxa turística. Així tens un arxiu ordenat per anys i mesos.

**On és**
«Configuració» → targeta «Còpia automàtica a Google Drive».

**Pas a pas**

1. Obre la targeta «Còpia automàtica a Google Drive».
2. Prem el botó «Connectar Google Drive».
3. S'obre la pàgina de Google. Tria el compte de Google de l'hostal.
4. Google et preguntarà si deixes que l'aplicació accedeixi al teu Drive. **Accepta tots els permisos.**
5. Tornaràs a la pàgina de Configuració. Si ha anat bé, surt en verd «Google Drive connectat correctament.» i, al costat dels botons, «Connectat».

[FOTO id=drive-desconnectat ruta=/config descripcio="Targeta Còpia automàtica a Google Drive abans de connectar, amb l'explicació i el botó granat" marques="Connectar Google Drive"]


**Què passa després**

A partir d'ara, cada dia i cada mes, l'aplicació desa fitxers al teu Drive. Mira la secció següent per saber **què** desa i **on**.

**Per què es fa així**
Tenir els documents legals (registre de viatgers, comprovants de Mossos, factures) també a Drive és una còpia extra i et permet consultar-los sense entrar a l'aplicació.

**Si t'has equivocat**

- Si has connectat un compte de Google que no era, prem «Reconnectar Google Drive» i tria el compte bo.
- Si surt «No s'ha pogut connectar amb Google Drive. Torna-ho a provar.», torna a prémer el botó i completa tots els passos de Google.
- Si surt «Google no ha donat permisos d'accés continu. Reconnecta i accepta tots els permisos.», prem «Reconnectar Google Drive» i, a la pàgina de Google, accepta **tots** els permisos.
- Si surt «Falten les credencials de Google (GOOGLE_CLIENT_ID i GOOGLE_CLIENT_SECRET) a Vercel.», és una configuració tècnica que falta. Avisa la persona tècnica.

**Compte!**

- A Drive hi aniran **dades personals dels hostes** (registre de viatgers, fitxes). Fes servir un compte de Google de l'hostal, ben protegit, i **no comparteixis** la carpeta amb qui no toca.
- Si un dia canvies la contrasenya del compte de Google o li treus el permís a l'aplicació, l'arxiu automàtic deixarà de funcionar. Prem «Reconnectar Google Drive».

---

## Com faig per saber què es desa a Google Drive i on

**Per a què serveix**
Per trobar els fitxers a Drive.

**On és**
Al teu Google Drive, dins una carpeta que l'aplicació crea sola el primer cop: **«Hostal Coll — Gestió»**.

**Pas a pas**

L'estructura és aquesta:

```
Hostal Coll — Gestió/
├── Hostes.xlsx                        ← tots els clients (s'actualitza cada mes)
└── 2026/                              ← una carpeta per any
    ├── Llibre de registre/            ← (cada dia) PDF del registre de cada estada
    ├── Fitxes de registre/            ← (cada dia) PDF de les fitxes
    ├── Comprovants de Mossos/         ← (cada dia) PDF dels comprovants
    ├── (Excel de la taxa turística)   ← (cada dia) es reescriu el del període actual i l'anterior
    └── octubre/                       ← una carpeta per mes (es crea el dia 1 del mes següent)
        ├── Llibre de registre.xlsx
        ├── Ingressos i despeses.xlsx
        ├── Personal.xlsx
        ├── Fitxes de registre/
        ├── Comprovants de Mossos/
        ├── factures/
        └── factures + custodia/
```

Hi ha **dos arxius automàtics**:

1. **Diari** (cada dia, a primera hora del matí):
   - dins la carpeta de l'**any**, desa el llibre de registre, les fitxes i els comprovants de Mossos de les estades i comunicacions **dels últims 2 dies**;
   - reescriu l'Excel de la **taxa turística** del període actual i de l'anterior.
2. **Mensual** (cada dia 1 de mes, a primera hora del matí):
   - crea la carpeta del **mes anterior** (per exemple, el dia 1 de novembre crea `2026/octubre`);
   - hi desa els Excel del mes («Llibre de registre.xlsx», «Ingressos i despeses.xlsx», «Personal.xlsx»);
   - hi desa els PDF del mes a les subcarpetes «Fitxes de registre», «Comprovants de Mossos», «factures» i «factures + custodia»;
   - actualitza «Hostes.xlsx» a la carpeta principal.

Per **provar-ho ara** (sense esperar):

1. A «Configuració» → «Còpia automàtica a Google Drive», prem «Provar mensual». Desa el **mes en curs** (no l'anterior).
2. O prem «Provar diari (any)». Desa els documents dels **últims 30 dies** a la carpeta de l'any.
3. Mentre treballa, el botó diu «Provant…». Pot trigar una estona si hi ha molts PDF.
4. Quan acaba, surt «Fet! S'han pujat … fitxers a la carpeta … del teu Drive (…)» amb la llista.



**Què passa després**
Si tornes a executar una prova o l'arxiu automàtic torna a passar, els fitxers que ja hi eren **s'actualitzen** (no es dupliquen).

**Per què es fa així**
L'arxiu diari et deixa els documents legals a Drive gairebé el mateix dia. El mensual fa el «tancament» del mes amb els Excel i les factures.

**Si t'has equivocat**
Pots prémer les proves tantes vegades com vulguis: no fan mal. Si prems «Provar mensual» a meitat de mes, el dia 1 del mes següent l'arxiu automàtic del mes ja actualitzarà els fitxers.

**Compte!**

- Si surt en vermell «… Amb errors: …», alguns fitxers no s'han pogut pujar. Els altres sí. Torna-ho a provar més tard; si continua, avisa la persona tècnica.
- Si surt «Google Drive no està connectat. Connecta'l a Configuració.», primer has de connectar Drive.
- **No canviïs el nom** de la carpeta «Hostal Coll — Gestió» ni la moguis sense dir-ho: l'aplicació la recorda i hi continua desant.

---

## Com faig per saber si l'aplicació està bé (comprovació d'estat)

**Per a què serveix**
Per saber, d'un cop d'ull, si l'aplicació té tot el que necessita per funcionar: base de dades, configuració i lloc per desar fitxers. És molt útil quan alguna cosa falla.

**On és**
A l'adreça `https://gestio.hostalcoll.com/api/health`. **No cal haver entrat** per obrir-la. No hi ha cap botó: has d'escriure l'adreça al navegador.

**Pas a pas**

1. Obre una pestanya nova al navegador.
2. Escriu `https://gestio.hostalcoll.com/api/health` i prem Intro.
3. Veuràs un text entre claus `{ … }`. No t'espantis: és una fitxa tècnica. Busca aquestes paraules:

| Camp | Què vol dir | Què ha de dir si tot va bé |
|---|---|---|
| `ready` | **Resum general.** Si tot està a punt. | `true` |
| `db` | Si l'aplicació es pot connectar a la base de dades. | `"ok"` |
| `tablesReady` | Si la base de dades té totes les taules creades. | `true` |
| `seed` → `establiment` | Si les dades de l'hostal ja estan carregades. | `true` |
| `seed` → `usuaris` | Quants usuaris hi ha. | Un número més gran que 0 |
| `env` → `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `DOCUMENT_ENCRYPTION_KEY` | Si estan posades les configuracions secretes del servidor. **Només diu sí o no; mai mostra el valor.** | `true` a totes |
| `storage` → `writable` | Si l'aplicació pot desar fitxers (com les fotos dels DNI). | `true` |
| `storage` → `backend` | On es desen els fitxers: `supabase` (al núvol) o `disc-local`. | `supabase` |
| `storage` → `supabase` | Si el servei de fitxers al núvol està configurat. | `true` |
| `detail` | Només surt si hi ha un error amb la base de dades: diu el tipus d'error. | (no surt) |
| `hint` | **Una frase en català que diu què falta.** | «Tot a punt.» |

[FOTO id=health-ok ruta=/api/health descripcio="Pàgina de comprovació d'estat al navegador amb el text en format JSON (tot en un sol bloc), amb ready a true i, al final, hint «Tot a punt.»" marques="Tot a punt."]

**Què passa després**
Res: només és una consulta. No canvia cap dada.

Si `ready` és `false`, llegeix el `hint`. Els missatges possibles són:

- «Falten variables d'entorn a Vercel (JWT_SECRET / DOCUMENT_ENCRYPTION_KEY).» → falta configuració del servidor;
- «No es connecta a la BD o falten taules: …» → la base de dades no respon o no està preparada;
- «Falta el seed: …» → falten les dades inicials de l'hostal;
- «L'emmagatzematge de fitxers no és escrivible: … Per això no es desen les fotos del DNI.» → no es poden desar documents;
- «Revisa la configuració.» → alguna altra cosa.

En tots aquests casos, **copia el text i envia'l a la persona tècnica**.

**Per què es fa així**
Així qualsevol persona pot comprovar l'estat sense haver d'entrar i sense saber informàtica, i la persona tècnica rep la informació exacta.

**Si t'has equivocat**
Si has escrit malament l'adreça, surt una pàgina d'error. Revisa l'adreça.

**Compte!**

- Aquesta pàgina **mai** mostra contrasenyes ni claus: només diu «true» o «false».
- Cada vegada que l'obres, fa una prova real de desar i esborrar un petit fitxer de prova. És normal.

---

## Com faig per saber si l'aplicació ha caigut sense mirar-ho jo (avís automàtic)

**Per a què serveix**
Perquè l'aplicació t'avisi **per correu** si un dia no funciona bé.

**On és**
No té botó. Funciona sola.

**Pas a pas**
No has de fer res:

1. **Cada dia**, a primera hora del matí, l'aplicació fa ella mateixa la comprovació d'estat (la de `/api/health`).
2. Si tot va bé, no passa res i no reps res.
3. Si alguna cosa falla, envia un correu a **hostalcoll@gmail.com** amb l'assumpte «⚠ Hostal Coll — l'aplicació no respon correctament». El correu diu «La comprovació automàtica de salut ha fallat.», el detall i un enllaç a la comprovació d'estat.


**Què passa després**
Si reps aquest correu, obre l'enllaç que hi ha dins, mira el `hint` i avisa la persona tècnica.

**Per què es fa així**
Així t'assabentes d'un problema encara que aquell dia no hagis obert l'aplicació.

**Si t'has equivocat**
No hi ha res a fer malament.

**Compte!**

- Només es comprova **un cop al dia**. Si l'aplicació cau a mig matí, no rebràs l'avís fins l'endemà.
- Perquè arribi l'avís, cal que el servei de correu estigui configurat (el mateix que la còpia per correu).

---

## Com faig per saber quines tasques automàtiques fa l'aplicació

**Per a què serveix**
Per saber què passa «sol» cada dia i cada mes, sense que tu facis res.

**On és**
No té pantalla. Ho fa el servidor de manera programada.

**Pas a pas**
Aquestes són les tasques automàtiques. Les hores són aproximades (hora de Catalunya, al matí d'hora):

| Quan | Què fa |
|---|---|
| Cada dia, molt d'hora | **Purga de documents**: esborra les imatges de documents d'identitat que han passat el termini (només si està activat). |
| Cada dia | **Serveis recurrents**: crea les despeses dels serveis fixos que han vençut (assegurances, manteniments…). |
| Cada dia | **Arxiu diari a Google Drive** (si està connectat). |
| Cada dia | **Comprovació d'estat** i avís per correu si falla. |
| Cada dia | **Correus programats**: envia els correus que estaven programats per a aquell moment. |
| Dia 1 de cada mes | **Còpia de seguretat per correu** (Excel). |
| Dia 1 de cada mes | **Arxiu mensual a Google Drive** del mes anterior (si està connectat). |

**Què passa després**
Quan aquestes tasques fan alguna cosa, queda apuntat al registre d'auditoria.

**Per què es fa així**
Així no depens de recordar-te'n.

**Si t'has equivocat**
No hi ha res a fer malament.

**Compte!**
Si un mes no reps el correu de la còpia, avisa la persona tècnica: pot ser que el servei de correu hagi deixat de funcionar.

---

## Com faig per saber què queda apuntat (registre d'auditoria)

**Per a què serveix**
L'aplicació apunta **qui** ha fet **què** i **quan**. Serveix per saber què ha passat si hi ha un problema, i perquè la llei de protecció de dades demana poder-ho demostrar.

**On és**
És intern. **No hi ha cap pantalla** a l'aplicació per consultar-lo. El pot consultar la persona tècnica. També va inclòs a les còpies de seguretat (els últims 20.000 moviments).

**Pas a pas**
No has de fer res: s'apunta sol. Cada apunt guarda:

- **qui** ho ha fet (l'usuari; o ningú si ho ha fet una tasca automàtica);
- **què** ha fet (el tipus d'acció);
- **sobre què** (un hoste, una estada, una factura…);
- alguns **detalls** (per exemple, quins camps de la configuració s'han canviat);
- l'**adreça IP** (des de quina connexió);
- el **dia i l'hora**.

Els tipus d'acció que s'apunten són:

| Acció | Exemples |
|---|---|
| Entrada (LOGIN) | Algú ha entrat correctament. |
| Sortida (LOGOUT) | Algú ha premut «Sortir». |
| Accés (ACCES) | Intent d'entrar amb el compte bloquejat; avís de l'aplicació caiguda. |
| Creació | Crear un hoste, una estada, una factura, una despesa… |
| Modificació | Canviar dades; desar la Configuració; connectar Google Drive. |
| Eliminació | Eliminar un hoste, un document, una estada…; la purga automàtica d'imatges. |
| Enviament | Comunicacions a Mossos; enviaments de Veri*Factu. |
| Signatura (FIRMA) | Quan un viatger signa. |
| Impressió | Generar la fitxa PDF, el registre, el reglament, els justificants… |
| Descàrrega | Veure un document d'identitat; descarregar la còpia de seguretat; enviar la còpia per correu; arxivar a Drive. |

**Què passa després**
Els apunts **no es poden esborrar** des de l'aplicació.

**Per què es fa així**
És una obligació de la protecció de dades: poder demostrar qui ha accedit a dades personals.

**Si t'has equivocat**
Si has fet una acció per error (per exemple, has eliminat un hoste), l'apunt queda. No passa res: també queda apuntat quan ho arreglis.

**Compte!**

- L'auditoria **mai** guarda contrasenyes de Mossos ni el contingut dels documents d'identitat.
- Quan canvies la Configuració, s'apunta **quins camps** has tocat, però no la contrasenya de Mossos.
- Els intents d'entrar amb contrasenya equivocada **no** s'apunten un per un; sí que s'apunta quan algú prova d'entrar amb el compte ja bloquejat.

---

## Com faig per entendre la privacitat i la protecció de dades

**Per a què serveix**
Per saber com protegeix l'aplicació les dades personals dels hostes i què has de fer tu.

**On és**
Afecta tota l'aplicació, sobretot la fitxa del client («Clients» → un client → «Documents d'identitat») i la Configuració.

**Pas a pas**
Això és el que fa l'aplicació per protegir les dades:

1. **Documents d'identitat xifrats.** Les fotos i PDF de DNI, NIE, passaport… es desen **xifrats** (codificats amb una clau secreta). Si algú robés els fitxers, no els podria obrir. A la fitxa del client ho diu: «Els documents es desen xifrats (AES-256-GCM) i cada accés queda auditat.»
2. **Cada vegada que algú mira un document**, queda apuntat a l'auditoria.
3. **Marca d'aigua.** Quan mires la foto d'un document, s'hi veu a sobre el text «HOSTAL COLL» repetit, perquè una captura de pantalla no es pugui fer servir per a una altra cosa.
4. **Contrasenyes xifrades.** Les contrasenyes dels usuaris i la de Mossos no es poden llegir.
5. **Accés per rols.** Cada persona només veu el que li toca.
6. **Purga automàtica de les imatges** dels documents (si està activada; mira més avall).

[FOTO id=privacitat-documents ruta=/huespedes descripcio="Fitxa d'un client amb la targeta Documents d'identitat oberta, el text del candau sobre el xifrat i un document amb la miniatura" marques="Documents d'identitat|Els documents es desen xifrats (AES-256-GCM) i cada accés queda auditat."]

**La purga automàtica de les imatges dels documents**

- Cada dia, molt d'hora, l'aplicació pot esborrar **de veritat** (el fitxer xifrat) les imatges de documents d'identitat **més antigues** que un nombre d'anys.
- Aquest nombre d'anys **no** es posa a la pantalla de Configuració. El configura la persona tècnica al servidor.
- Si la persona tècnica no l'ha configurat, la purga està **desactivada** i les imatges es guarden fins que algú les esborra a mà.
- La purga **només** esborra la **imatge** del document. Les **dades** del registre de viatgers (nom, número de document, dates…) es conserven, perquè la llei obliga a guardar-les.

**Què passa després**
Les imatges purgades ja no es poden veure. Queda apuntat a l'auditoria quantes se n'han esborrat.

**Per què es fa així**
La llei de protecció de dades (RGPD) diu que no es poden guardar dades personals més temps del necessari. Guardar fotos de DNI per sempre és difícil de justificar.

**Si t'has equivocat**
Una imatge purgada **no es pot recuperar** (ni des de les còpies de seguretat, que no contenen les imatges).

**Compte!**

- Quan fas servir el botó «Fer foto» o «Pujar foto» per llegir un document i omplir el formulari automàticament, la imatge s'envia a un **servei extern d'intel·ligència artificial** perquè llegeixi les línies «<<<» del document. Tingues-ho en compte a l'hora d'informar els hostes.
- No guardis còpies de documents d'identitat fora de l'aplicació (al mòbil, al WhatsApp, a l'ordinador). Si fas una foto amb el mòbil per pujar-la, **esborra-la del mòbil** després.
- La còpia de seguretat i Google Drive contenen dades personals. Protegeix-los.

---

## Com faig si un hoste em demana que esborri les seves dades

**Per a què serveix**
Per atendre el **dret de supressió** (el «dret a l'oblit») que dona la llei de protecció de dades.

**On és**
«Clients» → obre la fitxa del client.

**Pas a pas**

1. **Abans de res:** recorda que la llei obliga l'hostal a **conservar el registre de viatgers 3 anys** (per a Mossos). Aquestes dades **no** es poden esborrar abans, encara que l'hoste ho demani. Explica-li amablement.
2. Al menú, prem «Clients» i busca l'hoste.
3. Obre la seva fitxa.
4. **Per esborrar les fotos dels documents d'identitat:** obre la targeta «Documents d'identitat», prem la paperera («Eliminar document») de cada document i confirma a «Segur que vols eliminar aquest document?».
5. **Per treure'l de la llista de clients:** prem el botó «Eliminar» (amb la paperera vermella), a dalt de la fitxa.
6. Sortirà una finestra «Eliminar l'hoste «…»?». Llegeix el missatge: si té estades, diu que «es conserven al llibre de registre (requisit legal)». Prem «Eliminar» per confirmar o «Cancel·lar» per tornar enrere.

[FOTO id=eliminar-hoste ruta=/huespedes descripcio="Fitxa d'un client amb els botons Editar i Eliminar a dalt a la dreta" marques="Editar|Eliminar"]

[FOTO id=eliminar-hoste-confirmar ruta=/huespedes descripcio="Finestra de confirmació per eliminar un hoste, amb el text sobre el llibre de registre i els dos botons" marques="Eliminar l'hoste|Cancel·lar|Eliminar"]

**Què passa després**

- L'hoste **desapareix de la llista** de «Clients».
- Les seves **estades i el registre de viatgers es conserven** (obligació legal).
- Queda apuntat a l'auditoria que l'has eliminat.
- Els documents eliminats ja no es poden veure des de l'aplicació.

**Per què es fa així**
Hi ha dues lleis que s'han de complir alhora: la de protecció de dades (esborrar el que no cal) i la de registre de viatgers (guardar-ho 3 anys). L'aplicació amaga el client però no toca el que la llei obliga a guardar.

**Si t'has equivocat**
Si has eliminat un hoste per error, **no hi ha cap botó per recuperar-lo** a l'aplicació. Avisa la persona tècnica: les dades encara hi són i es poden recuperar.

**Compte!**

- «Eliminar» un hoste **no** l'esborra del tot: només l'amaga. Les dades queden guardades.
- Eliminar un document l'amaga de l'aplicació, però **el fitxer xifrat pot continuar guardat** al servidor. Si l'hoste vol una supressió total, consulta-ho amb la persona tècnica.
- Respon per escrit a l'hoste explicant què s'ha esborrat i què no (i per què). Tens **un mes** per respondre.
- Només ADMIN i RECEPCIO poden eliminar hostes i documents.

---

## Com faig per fer servir l'aplicació des de la tauleta o el mòbil

**Per a què serveix**
Per treballar des de recepció amb una tauleta, o des del mòbil quan no ets davant de l'ordinador (per exemple, per fer la foto del DNI o perquè l'hoste signi).

**On és**
És la mateixa adreça que a l'ordinador. No cal instal·lar res.

**Pas a pas**

1. Obre el navegador de la tauleta o del mòbil (Chrome o Safari).
2. Escriu l'adreça de l'aplicació i entra amb el teu correu i contrasenya.
3. A les pantalles petites, el **menú granat està amagat**. Per obrir-lo, toca el botó de les **tres ratlles** de dalt a l'esquerra («Obrir menú»).
4. Tria la pantalla que vulguis. El menú es tanca sol.
5. Per tancar el menú sense triar res, toca la «X» («Tancar menú») o toca la zona fosca de fora del menú.
6. Per fer la foto d'un document, al formulari de l'estada, prem «Fer foto»: s'obre directament la **càmera del darrere**. Si ja tens la foto feta, prem «Pujar foto».

[FOTO id=mobil-menu-tancat ruta=/ descripcio="Tauler vist en un mòbil amb el menú amagat i el botó de tres ratlles a dalt a l'esquerra" marques="Obrir menú"]

[FOTO id=mobil-menu-obert ruta=/ descripcio="Mòbil amb el menú granat obert per sobre, la X per tancar-lo i el fons enfosquit" marques="Tancar menú|Sortir"]

[FOTO id=mobil-fer-foto ruta=/estancies/nou descripcio="Formulari d'estada al mòbil amb la secció Documents d'identitat i els botons de foto" marques="Fer foto|Pujar foto"]

**Què passa després**
Funciona igual que a l'ordinador. Les taules amples es poden lliscar de costat amb el dit.

**Per què es fa així**
Una sola aplicació serveix per a tots els aparells. No cal mantenir dues versions.

**Si t'has equivocat**
Si has obert una pantalla que no volies, torna a obrir el menú i tria'n una altra, o fes servir la fletxa enrere del navegador.

**Compte!**

- La primera vegada que prems «Fer foto», el navegador et demanarà **permís per fer servir la càmera**. Prem «Permetre».
- Els documents poden pesar com a màxim **10 MB**. Les fotos del mòbil normalment hi caben.
- Si la tauleta és compartida, **surt sempre** quan acabis.
- Posa a la tauleta un **bloqueig de pantalla** (PIN o empremta). Si es perd, ningú podrà entrar-hi.

---

## Si alguna cosa no funciona

Aquí tens els problemes més habituals i què fer. Si després de provar-ho continua fallant, **avisa la persona tècnica** i explica-li: què estaves fent, quin missatge ha sortit (fes-ne una captura) i a quina hora.

### No puc entrar: surt «Credencials incorrectes»

- Revisa el correu: que no hi hagi espais ni lletres canviades.
- Revisa la contrasenya amb la icona de l'ull («Mostrar la contrasenya»). Compte amb les majúscules.
- Si estàs segura que és correcta, pot ser que el teu usuari estigui desactivat. Demana-ho a la persona tècnica.

### No puc entrar: surt «Massa intents fallits…»

- El compte està bloquejat **15 minuts**. Espera i torna-ho a provar.
- Si no t'havies equivocat tu, avisa: algú podria estar provant d'entrar al teu compte.

### No puc entrar: surt «Error de connexió»

- El teu aparell no té internet. Comprova el wifi o les dades mòbils.
- Prova d'obrir una altra web (per exemple, un diari). Si tampoc funciona, el problema és la connexió, no l'aplicació.

### Surt «Error intern del servidor»

És un error genèric: alguna cosa ha fallat al servidor.

1. Torna-ho a provar al cap d'un minut.
2. Obre `https://gestio.hostalcoll.com/api/health` i mira el `hint` (mira «Com faig per saber si l'aplicació està bé»).
3. Si el `hint` diu una cosa diferent de «Tot a punt.», copia'l i envia'l a la persona tècnica.
4. Si a la pantalla d'entrada surt «Error intern del servidor», gairebé sempre és perquè falta configuració al servidor o la base de dades no està preparada. Això ho ha d'arreglar la persona tècnica.

### Surt «No es pot connectar amb la base de dades. Revisa la configuració.»

La base de dades no respon. No és culpa teva. Espera uns minuts i torna-ho a provar. Si continua, avisa la persona tècnica.

### Surt «Base de dades no preparada (falten taules). Cal executar les migracions.»

Normalment passa just després d'una actualització de l'aplicació. Avisa la persona tècnica.

### Surt «Configuració del servidor incompleta.»

Falta alguna configuració secreta al servidor. Avisa la persona tècnica.

### Surt «S'ha produït un error» a tota la pantalla

Surt el missatge «Ho sentim. Torna-ho a provar o recarrega la pàgina.» Recarrega la pàgina (botó de la fletxa circular del navegador, o F5). Si torna a sortir, avisa la persona tècnica: l'error ja li ha arribat automàticament, però li anirà bé saber què feies.

### Surt «Permisos insuficients» o l'aplicació em torna al Tauler

El teu rol no pot fer aquella acció o entrar a aquella pàgina. Mira la taula «Qui pot fer què». Si creus que l'hauries de poder fer, parla amb l'administradora.

### Surt «Aquest compte és de només lectura.»

Has entrat amb el compte de propietat, que només pot mirar. Per fer canvis, surt i entra amb un altre usuari.

### Surt «No autenticat» o em demana tornar a entrar

La sessió ha caducat (has estat 8 hores sense fer res) o has sortit. Torna a entrar.

### El PDF no s'obre (o la factura, el pressupost…)

Molts documents (fitxa PDF, factures, pressupostos, llibre) s'obren en una **pestanya o finestra nova**. Si no passa res en prémer el botó:

1. Mira a la **barra d'adreces** del navegador (a dalt). Si hi ha una icona d'una finestra amb una creu vermella o un missatge com «S'ha bloquejat una finestra emergent», el navegador l'ha bloquejada.
2. Prem aquesta icona i tria «Permet sempre les finestres emergents de gestio.hostalcoll.com» (o similar). Prem «Fet».
3. Torna a prémer el botó del document.
4. Al mòbil: si el document s'ha descarregat però no s'obre, mira la carpeta de **Descàrregues** o la notificació de descàrrega.


### L'escàner no llegeix el document

Quan fas «Fer foto» o «Pujar foto», l'aplicació intenta llegir les **línies amb «<<<»** del document.

- Fes la foto de la **cara correcta**: al **DNI/NIE és el DARRERE** (la cara sense foto); al **passaport, la pàgina de la foto**.
- Si surt «Aquesta cara no té MRZ (p.ex. el davant): s'ha desat com a foto…», és normal per a la cara del davant: la foto s'ha desat igualment.
- Si surt «Document desat, però no s'han pogut llegir les dades. Fes una foto nítida i ben enquadrada. Pots omplir-ho a mà.»:
  - fes la foto amb **bona llum**, sense reflexos ni ombres;
  - que el document **ocupi tota la foto** i estigui **enfocat**;
  - posa el document sobre una superfície **fosca i llisa**;
  - torna-ho a provar.
- Si surt «(foto massa gran)», fes la foto amb menys resolució o retalla-la.
- Si surt «(ha trigat massa)», torna-ho a provar; potser la connexió és lenta.
- Si surt una llista d'avisos després de «Dades llegides. Revisa els camps del formulari i aquests avisos:», les dades s'han omplert però cal que les **revisis** una per una.
- Si no aconsegueixes que el llegeixi, **omple les dades a mà**. La foto s'ha desat igualment.
- Si no vols que t'ompli el formulari (només vols desar la foto), desmarca «Autoreplenar el formulari amb la foto».

**Compte!** Encara que l'escàner digui que ha llegit bé, **revisa sempre** les dades abans de desar. L'escàner només omple les dades si els números de control del document quadren; si no, prefereix deixar-ho buit que inventar-s'ho.

### No puc pujar un document: «El fitxer supera els 10 MB»

La foto o el PDF és massa gran. Fes la foto amb menys qualitat o redueix-la abans de pujar-la. Formats acceptats: PDF, PNG, JPG i WEBP.

### No es desen les fotos dels DNI

Obre `/api/health`. Si `storage` → `writable` és `false`, el lloc on es desen els fitxers no funciona. Avisa la persona tècnica.

### No arriba la còpia per correu el dia 1

Ves a «Configuració» → «Còpia de seguretat de les dades» i prem «Enviar còpia per correu ara». Llegeix el missatge que surt al costat i envia'l a la persona tècnica. Mentrestant, fes servir «Descarregar còpia (JSON)».

### Google Drive no s'actualitza

1. Ves a «Configuració» → «Còpia automàtica a Google Drive».
2. Si no surt «Connectat», prem «Connectar Google Drive».
3. Si surt «Connectat», prem «Provar diari (any)» i llegeix el resultat.
4. Si dona error, prem «Reconnectar Google Drive» i accepta tots els permisos.

### En generar el fitxer de Mossos diu que falta el file_identifier

Ves a «Configuració» → «Fitxer massiu de Mossos» i omple el «File identifier» (mira «Com faig per configurar el fitxer de Mossos»).

### La pàgina va molt lenta o es queda «Carregant…»

- Espera uns segons; la primera càrrega del dia pot trigar una mica més.
- Recarrega la pàgina.
- Comprova la connexió a internet.
- Si passa sovint, avisa la persona tècnica.

### He desat la configuració i no s'ha guardat

- Comprova que has premut «Desar configuració» i que ha sortit «Configuració desada.» en verd.
- Si ha sortit un missatge vermell, llegeix-lo: normalment diu quin camp està malament (per exemple, el «File identifier»).
- Recorda: si surts de la pàgina sense desar, els canvis es perden.

---

## Preguntes freqüents

**1. Puc entrar des de casa?**
Sí. L'aplicació funciona des de qualsevol lloc amb internet. Només cal el correu i la contrasenya.

**2. Quant de temps puc estar dins sense que em tregui?**
Mentre la facis servir, no et traurà. Si la deixes 8 hores sense tocar, et demanarà tornar a entrar.

**3. He oblidat la contrasenya. Què faig?**
L'aplicació no té l'opció «He oblidat la contrasenya». Demana a la persona tècnica que te'n posi una de nova.

**4. Puc canviar jo mateixa la contrasenya?**
Ara mateix, no des de l'aplicació. Ho ha de fer la persona tècnica.

**5. Per què la persona de recepció no veu les factures ni el balanç?**
Perquè són dades de diners i només les veu l'administradora. Recepció pot fer tota la feina del dia a dia (hostes, estades, Mossos, neteja) sense veure els imports.

**6. Per què un usuari de recepció veu «Facturació» al menú però no hi pot entrar?**
El menú el mostra, però l'aplicació no el deixa entrar i el torna al Tauler. És una protecció: no és cap error.

**7. Si prem «Desar configuració» a la targeta de factures, es desa també el que he canviat a Mossos?**
Sí. Tots els botons «Desar configuració» desen les set primeres targetes alhora.

**8. Puc veure la contrasenya de Mossos que hi ha desada?**
No. Es desa xifrada i l'aplicació no la mostra mai. Si no la recordes, mira-la al portal de Mossos o canvia-la allà i torna-la a posar aquí.

**9. On són les còpies de seguretat?**
En tres llocs: (1) la base de dades al núvol (Supabase) fa les seves pròpies còpies; (2) cada dia 1 de mes reps un Excel a hostalcoll@gmail.com; (3) pots descarregar el JSON quan vulguis des de «Configuració». A més, si tens Google Drive connectat, els documents legals i els Excel mensuals també hi són.

**10. La còpia de seguretat inclou les fotos dels DNI?**
No. Inclou les dades, però no les imatges dels documents.

**11. Què passa si un hoste em demana que esborri les seves dades?**
Pots eliminar les fotos dels seus documents i treure'l de la llista de clients. Però el registre de viatgers s'ha de guardar 3 anys per llei. Mira «Com faig si un hoste em demana que esborri les seves dades».

**12. Qui pot veure els documents d'identitat dels hostes?**
Tots els usuaris que entren a l'aplicació els poden veure, però **cada vegada que algú els obre queda apuntat**. Només ADMIN i RECEPCIO en poden pujar o eliminar.

**13. Puc fer servir l'aplicació al mòbil?**
Sí. El menú s'obre amb el botó de tres ratlles de dalt a l'esquerra.

**14. Com sé si l'aplicació funciona bé?**
Obre `https://gestio.hostalcoll.com/api/health`. Si hi diu `"ready": true` i «Tot a punt.», tot va bé. A més, si falla, rebràs un correu d'avís cada matí.

**15. El «File identifier» i l'«Id policial» són el mateix?**
No. L'«Id policial» identifica l'hostal davant la policia. El «File identifier» és un codi de 9 o 10 caràcters que trobaràs a l'apartat «Dades de l'establiment» del portal de Mossos i que serveix per posar nom al fitxer.

**16. Si canvio les dades de la factura, canvien les factures antigues?**
No. Només les que imprimeixis a partir d'ara.

---

## DUBTES

> Aquesta secció és interna. **No es publicarà.** Recull el que no s'ha pogut confirmar al codi o les incoherències trobades.

1. **No hi ha pantalla per canviar la contrasenya ni per gestionar usuaris.** DEPLOY.md diu «canvia-la des de l'app després del primer accés», però al codi no hi ha cap ruta ni component per fer-ho (només login, logout i `me`). Tampoc hi ha «He oblidat la contrasenya» ni cap manera de desactivar un usuari des de la UI (el camp `actiu` existeix al model). Cal confirmar el procediment real (script? Prisma Studio?) i qui el fa.
2. **Bloqueig per intents fallits:** el comentari del codi diu «després de 5 intents», però el valor real és `MAX_INTENTS = 20` (bloqueig de 15 minuts). He documentat 20. Confirmar quin és el desitjat.
3. **Facturació i Despeses al menú per a RECEPCIO/CONSULTA:** el sidebar els mostra a tothom, però el middleware els redirigeix al Tauler si no són ADMIN. Igualment, «Impostos» no és a la llista del middleware (la pàgina s'obre però l'API respon 403). Confirmar si és intencionat.
4. ~~«Obrir la guia (PDF)»~~ Resolt: la targeta ara es diu «Manual d'usuari» i té «Obrir el manual» (/manual) i «Descarregar PDF».
5. **Còpia de seguretat incompleta:** `buildBackupPayload` exporta 29 taules, però el model en té moltes més que no hi surten (p. ex. `Pressupost`, `PagamentPrevist`, `Tarifa`, `TarifaTipus`, `ServeiRecurrent`, `Incidencia`, `Valoracio`, `EmailProgramat`, `CanviHabitacio`, `ArticleBugaderia`, `CobramentPeriode`, `DipositPeriode`, `LlibreIvaTrimestre`, `DeclaracioFiscal`, `EdicioDocument`, `AvisDescartat`, `LiniaPressupost`). El text de la UI diu «totes les taules». Cal revisar-ho.
6. **La còpia inclou la taula `establiment` sencera**, amb la contrasenya de Mossos i el token de Drive **xifrats**. No són llegibles sense la clau, però convé confirmar si s'han d'excloure.
7. **Eliminar un document manualment és només un esborrat lògic** (`deletedAt`): el fitxer xifrat continua a l'emmagatzematge. I la purga automàtica només mira documents amb `deletedAt: null`, així que **els documents eliminats a mà mai s'esborren físicament**. Rellevant per al dret de supressió.
8. **Purga automàtica:** depèn de la variable `DOCUMENT_RETENTION_YEARS`; no sé si està configurada a producció (si no, està desactivada). Quin termini s'ha decidit?
9. **«Retenció policial (anys)» i «Retenció CRM (anys)»** es desen però **no s'utilitzen enlloc** del codi. Confirmar si és només informatiu.
10. **Eliminar un hoste** és lògic (s'amaga); no hi ha botó per recuperar-lo ni procediment de supressió real de dades CRM passats els 3 anys.
11. **OCR amb servei extern:** CLAUDE.md diu que l'escàner és client (tesseract.js, sense credencials), però `src/app/api/ocr/document/route.ts` envia la imatge a l'API d'Anthropic (Claude). Cal confirmar-ho i, si és així, revisar la informació RGPD als hostes (encarregat del tractament, transferència internacional).
12. **Hores dels crons:** `vercel.json` està en UTC (backup 06:00 dia 1; drive-mensual 06:15 dia 1; drive-diari 06:45; uptime 07:00; serveis-recurrents 06:30; emails 08:00; purga 05:00). He posat «al matí d'hora» sense hores exactes. El comentari de `/api/cron/emails` diu «cada hora», però el cron és diari.
13. **Correu de destinació** de la còpia i dels avisos: per defecte `hostalcoll@gmail.com`, però es pot canviar amb `BACKUP_EMAIL_TO`. Confirmar quin està configurat. També cal confirmar si `RESEND_API_KEY` està configurada (si no, ni la còpia ni l'avís d'uptime s'envien).
14. **Uptime:** només un cop al dia. El codi recomana un servei extern (UptimeRobot) cada 5 minuts. Està configurat?
15. **Component `TarifesNeteja`** (`src/components/config/tarifes-neteja.tsx`, «Tarifes de neteja») existeix però **no es fa servir a cap pàgina**. On es configuren ara els preus de neteja (sortida, manteniment, zones comunes)?
16. **Compte de propietat:** veu «Configuració»? Comprovat amb l'app de proves: el menú li mostra l'enllaç «Configuració» (el text «Només lectura» només surt per a comptes no ADMIN, cosa que avui no passa mai), i el middleware el deixa entrar a `/config` (és ADMIN) i qualsevol desament queda bloquejat. També pot descarregar la còpia JSON (GET). Confirmar si ha de poder descarregar dades completes.
17. **Taula de rols:** «Plantilles» i «Justificants» no tenen restricció de rol al menú; no he verificat cada acció interna de totes les pàgines (p. ex. Plantilles per a CONSULTA). Les marques «Mirar» de la taula es basen en `ROLES_WRITE` a les API.
18. **Placeholders amb dades reals:** al formulari de factura hi ha placeholders amb un nom i un NIF que semblen reals («p. ex. …»). No els he reproduït al manual. Convé valorar si s'han de treure del codi.
19. **Sessió de 8 h:** és el valor per defecte (`JWT_TTL_SECONDS`); confirmar que a producció no s'ha canviat.
20. **Text exacte del missatge de Google per a finestres emergents:** depèn del navegador; el pas a pas és genèric.
21. **Missatge `norefresh` de Drive amb caràcters trencats** al codi (`config/page.tsx`: «perms d'accs»). Al manual l'he escrit corregit («permisos d'accés continu»); cal arreglar-lo al codi perquè coincideixi.
