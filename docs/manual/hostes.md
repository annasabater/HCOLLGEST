# Clients i documents d'identitat

En aquesta app, **cada persona que s'allotja a l'hostal té una sola fitxa**. Aquesta fitxa és, alhora:

- el **viatger del registre policial** (el que s'envia als Mossos d'Esquadra i surt al llibre registre de viatgers),
- el **client del CRM** (les seves visites, notes, mascotes i valoracions),
- i el **client de facturació** (el nom i les dades que surten a la factura quan és el titular de l'estada).

La idea és molt senzilla: **escrius les dades d'una persona una sola vegada** i l'app les reaprofita a tot arreu. Si la persona torna l'any que ve, no cal tornar-ho a escriure tot: l'app la reconeix pel seu document i en recupera la fitxa.

A la pantalla, aquestes persones s'anomenen **Clients** (al menú) i també **hostes** o **viatgers** (en alguns botons i missatges). Tot és el mateix.

En aquest capítol aprendràs a trobar un client, a donar-ne d'alta un de nou, a escanejar-li el DNI, el NIE o el passaport perquè les dades s'omplin soles, a desar els documents de manera segura, a corregir-ne les dades, a escriure-hi notes i avisos, i a eliminar-lo si cal.

> **Qui pot fer què.** Si entres a l'app amb un usuari de tipus **Consulta**, pots mirar les fitxes però no veuràs els botons per crear, editar o eliminar. Els usuaris **Administrador** i **Recepció** ho poden fer tot el que s'explica aquí.

---

## Com trobo un client a la llista

**Per a què serveix**
Per veure totes les persones que han estat (o estan) a l'hostal i obrir la fitxa de la que t'interessa.

**On és**
Menú lateral → apartat **Recepció** → **«Clients»**.

**Pas a pas**

1. Al menú lateral, fes clic a **«Clients»**.
2. A dalt veuràs el títol **Clients** i, a sota, quantes persones hi ha (per exemple, «312 persones registrades»).
3. Per buscar algú, escriu a la casella **«Cerca per nom, document, email…»** un tros del nom, del primer o segon cognom, del número de document, del correu o del telèfon. No cal escriure-ho sencer ni respectar majúscules.
4. Prem la tecla Retorn o el botó de la lupa que hi ha al costat.

   [FOTO id=clients-llista-cerca ruta=/huespedes descripcio="Pantalla Clients amb la casella de cerca plena amb un cognom i la llista de targetes filtrada" marques="Cerca per nom, document, email…|Amb mascota|Tots|Hi són ara|No hi són"]

5. Si només vols veure els clients que porten animal, marca la casella **«Amb mascota»**. La llista s'actualitza sola.
6. Per veure només qui és a l'hostal avui, fes clic a **«Hi són ara»**. Per veure qui no hi és, fes clic a **«No hi són»**. Per tornar-los a veure tots, fes clic a **«Tots»**.
7. Fes clic a la targeta d'una persona per obrir-ne la fitxa.
8. A baix de tot pots canviar quantes targetes veus per pàgina (**«Files per pàgina:»**: 10, 25 o 50) i passar de pàgina.

**Què passa després / d'on surten les dades**

Cada targeta mostra:

- **Cognoms, Nom** de la persona.
- El **tipus i número de document** (o «—» si no en té).
- El **correu** o, si no en té, el **telèfon**.
- Quantes **estades** té (per exemple «3 estades»).
- L'etiqueta vermella **«No acollir»** si algú hi ha posat una nota amb aquesta marca (vegeu «Com marco un client com a «no acollir»»).
- L'etiqueta **«Mascota»** si té algun animal apuntat.

El **cercle amb les inicials** canvia de color segons la situació d'avui. La llegenda és a sobre la llista:

- **«Hi és ara»** (verd): ara mateix té una estada en curs.
- **«Hi és amb fiança»** (taronja): és aquí i la seva estada té una fiança.
- **«Part oficial, part fiança»** (mig verd, mig groc): és aquí i la seva estada té cobraments i també fiança.
- **«No hi és»** (vermell): avui no té cap estada.

Les persones més noves surten primer.

Si dalt de la llista hi ha avisos interns actius, també veuràs un requadre groc **«Avisos interns (N)»** (vegeu «Com faig servir els avisos interns»).

**Per què es fa així**
Tenir tothom en una sola llista evita fitxes repetides i permet veure d'un cop d'ull qui és a casa i qui no.

**Si t'has equivocat**
Si la cerca no troba ningú, sortirà **«No s'ha trobat cap client.»**. Esborra el text de la casella, prova amb menys lletres (per exemple, només el primer cognom) i comprova que no tinguis marcat **«Amb mascota»** o **«Hi són ara»** sense voler.

**Compte!**
- A la llista **no hi ha cap botó per crear un client nou**. Els clients es creen quan fas una estada (vegeu «Com dono d'alta un client nou»).
- Els clients eliminats ja no surten en aquesta llista.

---

## Com llegeixo la fitxa d'un client

**Per a què serveix**
Per veure tota la informació d'una persona en un sol lloc: contacte, estades, valoracions, documents, mascotes i notes.

**On és**
Menú lateral → **«Clients»** → clic a la targeta de la persona.

**Pas a pas**

1. Obre la llista de **«Clients»** i fes clic a la persona.
2. A dalt veuràs el **nom complet** i, a sota, el **tipus i número de document**.
3. A la dreta del nom hi ha els botons **«Nova estada»**, **«Editar»** i **«Eliminar»** (només si tens permís per escriure).
4. Si la persona està marcada com a «no acollir», veuràs l'etiqueta vermella **«No acollir»** i un requadre vermell que diu que està a la llista interna.
5. A sota hi ha quatre quadres amb números: **«Estades»**, **«Nits acumulades»**, **«Primera visita»** i **«Última visita»**.
6. A l'esquerra trobaràs:
   - **«Dades de contacte»**: Email, Telèfon, Nacionalitat i Adreça.
   - **«Historial d’estades»**: una taula amb **Contracte**, **Entrada**, **Sortida**, **Nits** i **Accions**. Fes clic al número de contracte per obrir l'estada.
   - **«Valoracions (N)»**: només surt si la persona ha deixat alguna valoració amb estrelles des de la pàgina de benvinguda.
7. A la dreta trobaràs tres blocs que s'obren i es tanquen fent-hi clic:
   - **«Documents d’identitat (N)»**
   - **«Mascotes»**
   - **«Notes internes»**

   Si un bloc no té res, surt tancat. Si té alguna cosa, surt obert.

   [FOTO id=fitxa-client-general ruta=/huespedes/<id> descripcio="Fitxa completa d'un client amb estades, quadres de números i els tres blocs de la dreta" marques="Nova estada|Editar|Eliminar|Historial d’estades|Documents d’identitat|Mascotes|Notes internes"]

8. Per tornar a la llista, fes clic a l'enllaç **«Hostes»** de dalt de tot.

**Què passa després / d'on surten les dades**

- Les dades de contacte i del document són les de la fitxa (les que es van escriure o escanejar en fer l'estada, o les que has corregit amb **«Editar»**).
- Les estades i les nits es calculen soles a partir de les estades on surt aquesta persona com a viatger. Les estades eliminades no compten.
- **«Primera visita»** i **«Última visita»** són la data d'entrada de la seva primera i última estada.
- Cada cop que algú obre un document d'aquesta fitxa, queda apuntat al registre d'auditoria (qui, quan i des d'on).

**Per què es fa així**
Així, quan una persona truca o torna, tens tota la seva història a la vista sense haver de buscar papers.

**Si t'has equivocat**
Si hi ha alguna dada malament, fes servir **«Editar»** (vegeu «Com canvio les dades d'un client»).

**Compte!**
La fitxa no mostra totes les dades (per exemple, no hi surt la data de naixement ni el número de suport). Per veure-les totes, obre **«Editar»** i mira-les sense desar res, i després prem **«Cancel·lar»**.

---

## Com dono d'alta un client nou

**Per a què serveix**
Per crear la fitxa d'una persona que no ha estat mai a l'hostal.

**On és**
Els clients **no es creen sols**: es creen quan registres una estada.
Menú lateral → **«Estades»** → botó **«Nova estada»**.

**Pas a pas**

1. Al menú lateral, fes clic a **«Estades»**.
2. Fes clic al botó **«Nova estada»**. S'obre el formulari **Nova estada** («Formulari mestre · una sola entrada de dades per a Mossos, llibre i CRM»).
3. Al bloc **«Tipus de registre»**, tria:
   - **«Contracte en curs»** si la persona ja és aquí (fa el check-in).
   - **«Reserva»** si només és una reserva. En aquest cas només calen nom, cognom i (email o telèfon).
4. Omple el bloc **«Dades de l’estada»** (dates, habitació, etc.; això s'explica al capítol d'Estades).
5. Baixa fins a **«Viatger 1»**. Aquest primer viatger surt marcat com a **«Titular»**.
6. Abans d'escriure res, mira si la persona ja existeix: escriu el seu nom o document a la casella **«Reaprofitar un hoste existent (nom, document, email…)»**. Si surt a la llista, tria-la (vegeu «Com reaprofito un client que ja ha vingut abans»). Si surt **«Cap coincidència»**, és una persona nova: continua.
7. Escaneja-li el document amb el bloc **«Documents d'identitat»** (vegeu els apartats de l'escàner més avall). Les dades bàsiques s'ompliran soles.
8. Revisa i completa a mà els camps que faltin: **«Nom»**, **«Primer cognom»**, **«Segon cognom»**, **«Tipus de document»**, **«Número de document»**, **«Número de suport»**, **«Data d’expedició»**, **«Sexe»**, **«Nacionalitat»**, **«Data de naixement»**, **«Email»**, **«Telèfon»**, **«Adreça»**, **«Codi postal»**, **«País»**, **«Província»** i **«Municipi»** (o **«Localitat»** si és de fora d'Espanya).
9. Si hi ha més persones a l'habitació, fes clic a **«Afegir viatger»** a baix de tot i repeteix els passos 6 a 8 per a cadascuna.
10. Fes clic a **«Desar estada»**.

    [FOTO id=nova-estada-viatger ruta=/estancies/nou descripcio="Formulari Nova estada a l’altura del bloc Viatger 1: marca Titular, cercador d’hostes i bloc Documents d’identitat amb els botons de l’escàner" marques="Titular|Reaprofitar un hoste existent (nom, document, email…)|Fer foto|Pujar foto"]

**Què passa després / d'on surten les dades**

- En desar, l'app mira si ja hi ha un client amb el **mateix tipus i número de document**. Si n'hi ha, **no en crea un de nou**: aprofita el que ja existeix i li actualitza les dades que hagis escrit (telèfon, adreça, correu…). Si no n'hi ha, crea una fitxa nova.
- Les fotos dels documents que hagis afegit es pugen **després** de desar l'estada, xifrades, i queden guardades a la fitxa del client.
- L'app et porta a la pantalla de l'estada que acabes de crear. Des d'allà pots clicar el nom de cada viatger per anar a la seva fitxa de client.
- El formulari es desa sol al teu navegador mentre l'omples. Si tanques la pestanya sense voler, quan hi tornis les dades encara hi seran.

**Per què es fa així**
La llei obliga a comunicar els viatgers als Mossos en un termini de 24 hores. Si el client es crea en el mateix moment que l'estada, les dades s'escriuen una sola vegada i serveixen per a Mossos, per al llibre registre, per a la factura i per al CRM.

**Si t'has equivocat**
- Si t'has equivocat de persona al cercador, fes clic a **«Treure l’hoste seleccionat i buidar els camps»**.
- Si vols començar de zero, fes clic a **«Buidar tot el formulari»** (a dalt a la dreta) i confirma amb **«Buidar tot»**. Això no es pot desfer.
- Si ja has desat, pots corregir les dades des de l'estada (**«Editar dades»** al costat del viatger) o des de la fitxa del client (**«Editar»**).

**Compte!**
- Si falten dades obligatòries, l'app no desa i et mostra a baix: **«Falten dades obligatòries. Completa-les, o desa com a esborrany i acaba-ho més tard.»** Els camps que falten queden marcats en vermell.
- Si tens pressa, pots fer clic a **«Desar com a esborrany»**. Només cal el nom i el primer cognom del titular. Si ni això hi és, surt: **«Per desar com a esborrany cal, com a mínim, nom i primer cognom del titular.»** Un esborrany **no es podrà enviar als Mossos** fins que el completis.
- Si l'app troba dades que «semblen» malament (per exemple, la lletra del DNI no quadra), surt un requadre groc **«Hi ha dades que potser no són correctes:»**. Corregeix-les o, si estàs segura que són bones, fes clic a **«Desar igualment»**.
- Si el document ja el té un altre client, pot sortir: **«Ja hi ha un hoste registrat amb aquest tipus i número de document. Cerca’l amb la lupa per reutilitzar la seva fitxa, o revisa el número de document.»** i el camp **«Número de document»** marcat amb **«Document ja registrat»**.

---

## Com reaprofito un client que ja ha vingut abans

**Per a què serveix**
Per no tornar a escriure les dades d'una persona que ja té fitxa, i per veure de seguida si té notes o avisos.

**On és**
Hi ha tres camins:
- Fitxa del client → botó **«Nova estada»**.
- **«Estades»** → **«Nova estada»** → casella **«Reaprofitar un hoste existent (nom, document, email…)»**.
- **«Estades»** → **«Nova estada»** → camp **«Número de document»** → botó de la lupa.

**Pas a pas**

*Camí A: des de la fitxa del client*

1. Obre la fitxa del client.
2. Fes clic a **«Nova estada»**.
3. S'obre el formulari amb el subtítol «Reaprofitant la fitxa de … · posa dates i habitació». El **Viatger 1** ja surt omplert amb les seves dades i l'etiqueta verda **«Hoste reaprofitat»**.
4. Posa les dates i l'habitació, revisa que les dades encara siguin bones i fes clic a **«Desar estada»**.

*Camí B: amb el cercador*

1. Al formulari **Nova estada**, dins del bloc del viatger, escriu almenys **2 lletres** a **«Reaprofitar un hoste existent (nom, document, email…)»**.
2. Espera un moment: sortirà una llista (fins a 8 persones) amb el nom i el número de document. Si està buscant, surt **«Cercant…»**.
3. Fes clic a la persona correcta. Els camps s'omplen i surt l'etiqueta **«Hoste reaprofitat»**.

   [FOTO id=reaprofitar-hoste-cercador ruta=/estancies/nou descripcio="Cercador d'hostes obert amb la llista desplegable de coincidències i, a sota, l'etiqueta verda d'hoste reaprofitat" marques="Reaprofitar un hoste existent (nom, document, email…)|Hoste reaprofitat|Treure l’hoste seleccionat i buidar els camps"]

*Camí C: pel número de document*

1. Tria el **«Tipus de document»** i escriu el **«Número de document»** (o escaneja'l).
2. Fes clic al botó de la **lupa** que hi ha al costat del número, o simplement surt del camp (fes clic a un altre lloc).
3. Si la persona ja existeix, els camps s'omplen sols i surt l'etiqueta verda **«Hoste recurrent · N estades prèvies»**.
4. Si aquesta persona té notes internes, surten a sobre dels camps (verdes si són positives, vermelles si són negatives, grises si són neutres). Si està marcada com a «no acollir», surt un requadre vermell: **«⚠ Aquest hoste està marcat com a no acollir a la llista interna. Revisa les notes objectives abans de decidir (§7).»**

**Què passa després / d'on surten les dades**

- Les dades vénen de la fitxa del client que ja existeix.
- En desar l'estada, l'app actualitza la fitxa amb el que hagis canviat (telèfon nou, adreça nova, correu…).
- L'estada nova apareix a l'**«Historial d’estades»** de la seva fitxa, i el número d'**«Estades»** puja.

**Per què es fa així**
Així no es creen fitxes repetides de la mateixa persona i tota la seva història queda junta.

**Si t'has equivocat**
Si has triat la persona equivocada, fes clic a **«Treure l’hoste seleccionat i buidar els camps»** i torna-ho a provar.

**Compte!**
- Quan reaprofites un client amb el **cercador** (camí B) o des de la fitxa (camí A), **no surten les notes ni l'avís de «no acollir»**. Aquests avisos només surten quan l'app el troba pel número de document (camí C, la lupa). Si tens dubtes, prem també la lupa.
- Quan reaprofites un client en una estada nova, el **nom**, el **primer cognom** i el **document** de la fitxa no es canvien encara que els modifiquis al formulari. Si cal corregir-los, fes-ho des de la fitxa amb **«Editar»**.

---

## Com escanejo un DNI

**Per a què serveix**
Per fer una foto del DNI espanyol i que l'app ompli sola el nom, els cognoms, el número de DNI, el número de suport, el sexe, la data de naixement, la nacionalitat i, si es pot llegir, l'adreça.

**On és**
**«Estades»** → **«Nova estada»** (o **«Editar dades»** d'una estada) → dins de cada viatger → bloc **«Documents d'identitat»** → botons **«Fer foto»** i **«Pujar foto»**.

El bloc només surt si el tipus de registre és **«Contracte en curs»**. En una **«Reserva»** no surt.

**Pas a pas**

1. Al bloc del viatger, localitza el requadre amb el títol **«Documents d'identitat»**.
2. Comprova que la casella **«Autoreplenar el formulari amb la foto»** estigui **marcada**.
3. **Gira el DNI i posa'l per la cara del DARRERE** (la cara **sense foto**). És la cara que a baix té **tres línies de lletres i números amb molts símbols «<<<»**. Aquestes línies es diuen **zona MRZ** i són les que l'app llegeix.
4. Fes clic a **«Fer foto»** si estàs amb el mòbil o la tauleta (s'obre la càmera del darrere), o a **«Pujar foto»** si ja tens la foto guardada (també accepta PDF).
5. Fes la foto. El botó canviarà a **«Llegint… 10%»**, **«30%»**, **«90%»**… Pot trigar entre uns segons i mig minut. No toquis res mentre llegeix.
6. Quan acabi, sortirà un missatge:
   - En verd: **«Dades llegides correctament. Revisa-les als camps del formulari i corregeix el que calgui.»**
   - En groc: **«Dades llegides. Revisa els camps del formulari i aquests avisos:»** i una llista d'avisos.
7. **Ara fes la foto de la cara del DAVANT** (la de la foto de la persona) amb **«Fer foto»** o **«Pujar foto»**. Aquesta cara no té zona MRZ, així que l'app no en llegeix res, però la deixa guardada. Sortirà en verd: **«Aquesta cara no té MRZ (p.ex. el davant): s'ha desat com a foto. Les dades ja s'han llegit de l'altra cara.»**
8. A sota apareix la llista de fotos amb una miniatura en blanc i negre, el nom del fitxer i un desplegable de tipus. Comprova el tipus de cada foto:
   - La primera foto que hagis afegit surt com **«DNI (anvers)»** i la segona com **«DNI (revers)»**. Com que has fet primer el darrere, **canvia-les**: la del darrere ha de ser **«DNI (revers)»** i la del davant **«DNI (anvers)»**.
9. Revisa **un per un** tots els camps que s'han omplert (vegeu més avall quins).
10. Omple a mà la **«Data d’expedició»**, que l'escàner no llegeix.
11. Continua amb l'estada i fes clic a **«Desar estada»**. A sota de les fotos hi diu **«Es desen en crear l'estada.»**: fins que no desis, les fotos no es guarden.

    [FOTO id=escaner-dni-revers-llegit ruta=/estancies/nou descripcio="Bloc Documents d'identitat d'un viatger amb DNI: botons Fer foto i Pujar foto, casella Autoreplenar i, a sota, els camps del document omplerts (dades inventades)" marques="Fer foto|Pujar foto|Autoreplenar el formulari amb la foto|Número de document|Número de suport"]

**Què passa després / d'on surten les dades**

De la **cara del darrere (zona MRZ)** l'app treu, de manera fiable:

| Camp del formulari | D'on surt |
|---|---|
| **«Nom»** | Línia 3 de la MRZ |
| **«Primer cognom»** i **«Segon cognom»** | Línia 3 de la MRZ |
| **«Tipus de document»** | Posa **«DNI/NIF»** si el número té 8 xifres + lletra i la nacionalitat és espanyola |
| **«Número de document»** | El DNI (8 xifres + lletra), de la línia 1 |
| **«Número de suport»** | El codi de 3 lletres + 6 xifres (per exemple BNA147552), de la línia 1 |
| **«Sexe»** | Línia 2 (M → Home, F → Dona) |
| **«Data de naixement»** | Línia 2 |
| **«Nacionalitat»** | Línia 2 (ESP → «Espanya») |

També de la **cara del darrere**, però **sense garantia** (és text lliure, no MRZ), l'app intenta llegir el domicili:

| Camp del formulari | Com s'omple |
|---|---|
| **«Adreça»** | Carrer, número i pis, si es veuen |
| **«Codi postal»** | 5 xifres, si es veuen |
| **«Província»** | Es dedueix de les dues primeres xifres del codi postal (o del nom de província llegit) |
| **«País»** | Es posa «Espanya» si s'ha trobat la província |
| **«Municipi»** | Es proposa el poble llegit; has de comprovar que coincideixi amb un de la llista |

De la **cara del davant** no es llegeix res: només es desa com a foto.

**Qui ho llegeix?** La foto s'envia a un servei d'intel·ligència artificial (Claude Vision, d'Anthropic) amb una única ordre: **copiar lletra per lletra les línies MRZ**, sense interpretar-les. Després, **l'app mateixa** (al servidor de l'hostal, no la intel·ligència artificial) comprova aquestes línies amb els seus **dígits de control**: uns números de comprovació que porta el document. **Si els dígits de control no quadren, l'app no omple res**, perquè val més un camp buit que un camp inventat. També corregeix sola confusions típiques (O i 0, I i 1, S i 5, B i 8…) només quan els dígits de control confirmen la correcció.

Si vols comparar, fes clic a **«Veure la MRZ llegida (només per comparar)»**. Allà veuràs les línies que s'han llegit. Això només és per mirar: **no s'edita aquí**. Si veus un error, corregeix-lo directament al camp del formulari.

**Per què es fa així**
- Llegir només la zona MRZ i comprovar-la amb els dígits de control és la manera més segura d'evitar errors en dades que van als Mossos.
- El **segon cognom** i el **número de suport** són obligatoris amb DNI per als Mossos, i l'escàner els omple sols.
- La foto del document es guarda perquè quedi constància de qui s'ha allotjat, sempre xifrada.

**Si t'has equivocat**
- Si una foto no és bona, fes clic a la **paperera** del costat de la miniatura (**«Treure document»**) i torna-la a fer.
- Si l'escàner ha omplert alguna cosa malament, escriu el valor correcte al camp. El que hi ha al camp és el que es desa.
- Si no vols que una foto torni a omplir els camps (per exemple, perquè ja els has corregit a mà), **desmarca** **«Autoreplenar el formulari amb la foto»** abans de fer-la. Així la foto només es desa.

**Compte!**
- **La MRZ no porta accents.** Els noms surten sense accents (per exemple «Garcia» en lloc de «García», «Nunez» en lloc de «Núñez»). Corregeix-los a mà.
- **Cognoms compostos** (per exemple «de la Fuente»): la MRZ els separa amb «<» igual que separa el primer i el segon cognom, i l'app els pot repartir malament. Revisa sempre **«Primer cognom»** i **«Segon cognom»**.
- La **«Data d’expedició»** no la llegeix: escriu-la tu.
- L'adreça és orientativa. Revisa-la sempre, i tria el **«Municipi»** de la llista que surt en escriure (codi INE oficial). Si no el tries de la llista, quan enviïs a Mossos pot sortir **«municipi «…» no trobat»**.
- Si fas les dues cares alhora (seleccionant dues fotos amb **«Pujar foto»**), l'app les desa totes dues i prova de llegir-les per ordre fins que una li doni dades.

---

## Com escanejo un NIE (targeta d'estranger)

**Per a què serveix**
Per llegir la targeta d'identitat d'estranger (la targeta de plàstic amb el NIE) i omplir les dades soles.

**On és**
Igual que el DNI: **«Estades»** → **«Nova estada»** → bloc del viatger → **«Documents d'identitat»** → **«Fer foto»** / **«Pujar foto»**.

**Pas a pas**

1. Comprova que **«Autoreplenar el formulari amb la foto»** estigui marcat.
2. Fes la foto de la **cara del DARRERE** de la targeta: la que té **tres línies amb símbols «<<<»** a baix.
3. Espera que acabi de llegir (**«Llegint… N%»**).
4. Mira el missatge (verd o groc) i revisa els camps.
5. Fes la foto de la **cara del davant** perquè també quedi desada.
6. Al desplegable de tipus de cada foto, tria **«NIE»** (o **«Permís de residència»** si és aquest document). Recorda que la primera i la segona foto surten per defecte com **«DNI (anvers)»** i **«DNI (revers)»**: canvia-les.
7. Omple a mà la **«Data d’expedició»** i tot el que falti, i desa l'estada.

**Què passa després / d'on surten les dades**

- La targeta d'estranger té la mateixa zona MRZ de 3 línies que el DNI. L'app en treu el **nom**, els **cognoms**, el **sexe**, la **data de naixement** i la **nacionalitat**.
- El **número de NIE** (una lletra X, Y o Z + 7 xifres + una lletra) l'app el reconeix encara que a la MRZ estigui guardat amb la primera lletra convertida en número (X=0, Y=1, Z=2). En aquest cas, el **«Tipus de document»** queda com **«NIE»**.
- L'altre codi de la línia 1 queda com a **«Número de suport»**.
- La **nacionalitat** surt en català per als països més habituals (França, Marroc, Romania, Ucraïna, Itàlia, Colòmbia…). Per a països menys habituals, pot sortir el codi de tres lletres del país (per exemple «THA»). En aquest cas, escriu el nom del país.

**Per què es fa així**
Amb NIE, els Mossos també demanen el **número de suport**, i l'escàner l'omple sol.

**Si t'has equivocat**
Igual que amb el DNI: paperera per treure la foto, i corregir els camps a mà.

**Compte!**
- El **«Número de suport»** amb NIE és **obligatori** i ha de tenir **9 caràcters**. Si n'hi ha més o menys, en enviar a Mossos sortirà **«el número de suport ha de tenir 9 caràcters»**.
- Si el **«País»** de l'adreça no és Espanya, recorda canviar-lo (vegeu «Quins camps són obligatoris i quan»).

---

## Com escanejo un passaport

**Per a què serveix**
Per llegir la pàgina principal del passaport i omplir les dades soles, tant si és un passaport espanyol com estranger.

**On és**
**«Estades»** → **«Nova estada»** → bloc del viatger → **«Documents d'identitat»** → **«Fer foto»** / **«Pujar foto»**.

**Pas a pas**

1. Comprova que **«Autoreplenar el formulari amb la foto»** estigui marcat.
2. Obre el passaport per la **pàgina de la foto**. A baix d'aquesta pàgina hi ha **dues línies llargues** plenes de símbols **«<<<»**: és la **zona MRZ**.
3. Fes la foto de **tota la pàgina de la foto**, assegurant-te que **les dues línies de baix surten senceres** (de la primera lletra a l'últim «<»).
4. No passa res si el passaport surt **de costat** (girat 90°) o **de cap per avall**: l'app prova sola de girar la foto (90°, 270° i 180°).
5. Espera que acabi de llegir. Amb un passaport pot trigar més que amb un DNI, perquè si no el troba a la primera, l'app torna a provar girant la foto i ampliant-ne trossos.
6. Revisa el missatge i els camps.
7. Al desplegable de tipus de la foto, tria **«Passaport»** (per defecte sortirà **«DNI (anvers)»**).
8. Deixa el **«Número de suport»** **buit**. El camp ja t'ho diu: **«Els passaports no solen tenir número de suport: deixa’l buit si no en porta.»**
9. Omple a mà la **«Data d’expedició»**, l'**«Adreça»**, el **«Codi postal»**, el **«País»** i la **«Localitat»** (o **«Província»** i **«Municipi»** si viu a Espanya). El passaport no porta adreça.
10. Desa l'estada.

    [FOTO id=escaner-passaport-girat ruta=/estancies/nou descripcio="Bloc Documents d'identitat d'un viatger amb passaport (dades inventades): botó Fer foto, Número de suport buit i els camps País i Localitat d'un estranger" marques="Fer foto|Número de suport|País|Localitat"]

**Què passa després / d'on surten les dades**

De les dues línies MRZ del passaport l'app treu:

| Camp | D'on surt |
|---|---|
| **«Tipus de document»** | Sempre **«Passaport»** |
| **«Número de document»** | Número del passaport (línia 2) |
| **«Primer cognom»**, **«Segon cognom»**, **«Nom»** | Línia 1 |
| **«Sexe»** | Línia 2 |
| **«Data de naixement»** | Línia 2 |
| **«Nacionalitat»** | Línia 2, traduïda al català si és un país habitual |

Com amb el DNI, la intel·ligència artificial només **copia** les línies, i l'app comprova els **dígits de control** del número, de la data de naixement i de la data de caducitat. Si no quadren, no omple res.

**Com ajuda l'app amb les fotos difícils (girades o de tauleta):**

- Primer llegeix la foto tal com arriba (respectant si el mòbil o la tauleta l'han marcat com a girada).
- Si no troba cap línia MRZ, prova **alhora** la foto girada **90°, 270° i 180°**.
- Si encara no se'n surt, talla la foto en **tres franges horitzontals** que se solapen i les **amplia**, perquè la zona MRZ es vegi més gran. Ho prova a l'orientació on ha trobat la MRZ o, si no l'ha trobat, a 90° i 270° (passaport fotografiat de costat).
- Abans d'enviar la foto, el teu aparell la redueix si és molt gran (fotos de tauleta de molts megapíxels), perquè no la rebutgin per mida. La foto que es desa a la fitxa, en canvi, és l'original.

**Per què es fa així**
El passaport és el document més habitual dels clients estrangers, i sovint es fotografia de costat perquè és allargat. Per això l'app prova sola diverses orientacions.

**Si t'has equivocat**
Paperera per treure la foto i tornar-la a fer; o corregir els camps a mà.

**Compte!**
- **El camp «País» comença posat a «Espanya».** Si el client viu a l'estranger, **canvia'l** pel seu país. Si no ho fas, l'app et demanarà **«Província»** i **«Municipi»** en lloc de **«Localitat»**.
- Si poses un número de suport en un passaport, en desar sortirà l'avís: **«…: has posat un número de suport en un passaport; els passaports normalment no en tenen. Deixa'l buit si el document no en porta.»**
- Els noms surten sense accents. Revisa'ls.

---

## Com escanejo un carnet de conduir (o un document sense línies «<<<»)

**Per a què serveix**
Per guardar la foto d'un document que **no té zona MRZ**, com el carnet de conduir, i omplir les dades a mà.

**On és**
**«Estades»** → **«Nova estada»** → bloc del viatger → **«Documents d'identitat»**.

**Pas a pas**

1. **Desmarca** la casella **«Autoreplenar el formulari amb la foto»** (així no esperes una lectura que no funcionarà).
2. Fes clic a **«Fer foto»** o **«Pujar foto»** i fes la foto del carnet.
3. Al desplegable de tipus de la foto, tria **«Carnet de conduir»**.
4. Omple a mà tots els camps del viatger mirant el carnet.
5. Al camp **«Tipus de document»**, tria el que correspongui (**«DNI/NIF»**, **«NIE»**, **«Passaport»** o **«Altres documents»**).
6. Desa l'estada.

**Què passa després / d'on surten les dades**

- La foto es desa xifrada a la fitxa del client amb el tipus **«Carnet de conduir»**.
- Totes les dades del formulari són les que tu has escrit.
- Si deixes marcat **«Autoreplenar el formulari amb la foto»**, l'app intentarà llegir-lo igualment i et dirà: **«No s'ha detectat la zona MRZ (les línies amb «<<<»). Al DNI/NIE és al REVERS i al passaport a la pàgina de la foto. La foto s'ha desat igualment; escaneja el revers/passaport per autoreplenar, o omple-ho a mà.»** No passa res: la foto queda desada.

**Per què es fa així**
L'escàner només llegeix documents amb zona MRZ, perquè és l'única part que es pot comprovar amb dígits de control. La resta de documents es desen com a foto i les dades s'escriuen a mà.

**Si t'has equivocat**
Paperera per treure la foto.

**Compte!**
- **Documents d'identitat d'altres països europeus** (targetes de plàstic amb 3 línies «<<<» al darrere) sí que es llegeixen com un DNI. Però com que no són espanyols, l'app posa el **«Tipus de document»** a **«Altres documents»**. Comprova que és el que vols.

---

## Què faig si l'escàner no llegeix bé el document

**Per a què serveix**
Per saber què vol dir cada missatge de l'escàner i com resoldre-ho.

**On és**
Al bloc **«Documents d'identitat»** de cada viatger, just a sota dels botons **«Fer foto»** i **«Pujar foto»**.

**Pas a pas**

1. Llegeix el missatge que surt (verd o groc) i busca'l a la taula de sota.
2. Fes el que s'hi indica.
3. Si després de 2 o 3 intents no se'n surt, **omple les dades a mà**. La foto ja està desada igualment.

| Missatge | Què vol dir | Què has de fer |
|---|---|---|
| **«Dades llegides correctament. Revisa-les als camps del formulari i corregeix el que calgui.»** | Tot bé. | Revisa accents, cognoms compostos i omple la data d'expedició. |
| **«Dades llegides. Revisa els camps del formulari i aquests avisos:»** | Ha llegit dades però hi ha alguna cosa a vigilar. | Llegeix cada avís de la llista i revisa els camps. |
| **«S'ha detectat la zona MRZ però no supera els dígits de control (lectura poc nítida). No s'han autoreplenat les dades per no posar-hi valors incorrectes; fes una foto més nítida del revers del DNI o de la pàgina del passaport, o omple-ho a mà.»** | Ha trobat les línies «<<<» però alguna lletra o número no s'ha llegit bé. | Torna a fer la foto més de prop, amb més llum i sense reflexos. |
| **«No s'ha detectat la zona MRZ (les línies amb «<<<»). Al DNI/NIE és al REVERS i al passaport a la pàgina de la foto. La foto s'ha desat igualment; escaneja el revers/passaport per autoreplenar, o omple-ho a mà.»** | No ha trobat les línies. Potser has fotografiat la cara del davant. | Gira el document i fotografia la cara correcta. |
| **«Foto desada. No s'han pogut autoreplenar les dades:»** + llista | No ha tret res útil. La llista diu el motiu. | Llegeix la llista (vegeu la fila següent) i torna-ho a provar. |
| Avís que comença per **«Diagnòstic: imatge rebuda …»** | Et diu la mida de la foto que ha arribat. Si l'aparell envia la foto massa petita, la MRZ no es veu. | Puja la foto original sencera (des del mòbil). A l'iPad, desactiva **«Optimitza l'emmagatzematge»** a Configuració → Fotos. |
| Avís que comença per **«Intents: …»** | Una llista de totes les orientacions provades (0°, 90°, 270°, 180°, franges…) i el resultat de cadascuna. | És informació per a qui t'ajudi. No has de fer res amb això. |
| **«Document desat, però no s'han pogut llegir les dades. Fes una foto nítida i ben enquadrada. Pots omplir-ho a mà.»** | No hi havia dades aprofitables. | Fes una foto més nítida i ben enquadrada. |
| **«Document desat, però no s'ha pogut llegir el text (foto massa gran). Torna-ho a provar o omple-ho a mà.»** | La foto pesava massa per enviar-la. | Torna-ho a provar; si continua, fes la foto amb menys resolució o retalla-la. |
| **«Document desat, però no s'ha pogut llegir el text (ha trigat massa). Torna-ho a provar o omple-ho a mà.»** | El lector ha superat el temps màxim. | Torna-ho a provar amb una foto més clara (menys intents necessaris). |
| **«Document desat, però no s'ha pogut llegir el text (Resposta invàlida del model). Torna-ho a provar o omple-ho a mà.»** | El servei de lectura ha respost una cosa que l'app no entén. | Torna-ho a provar. |
| **«Document desat, però no s'ha pogut llegir el text per autoreplenar.»** | Error de connexió o similar. | Comprova la connexió a internet i torna-ho a provar. |
| **«Aquesta cara no té MRZ (p.ex. el davant): s'ha desat com a foto. Les dades ja s'han llegit de l'altra cara.»** | Ja havies llegit bé l'altra cara. | Res. Està bé. |

**Què passa després / d'on surten les dades**
En tots els casos, **la foto queda desada** a la llista per guardar-la amb l'estada. L'únic que pot fallar és l'autoreplenat.

Si sota el missatge hi ha **«Veure la MRZ llegida (només per comparar)»**, pots obrir-ho per veure què ha llegit. Si no ha reconegut cap línia, hi surt **«Resposta del lector:»** amb el text que ha tornat el servei de lectura (només el veus tu, no es guarda enlloc).

**Per què es fa així**
L'app prefereix deixar un camp buit que posar-hi una dada inventada. Una dada falsa als Mossos és pitjor que una dada que has d'escriure a mà.

**Si t'has equivocat**
Si has fet moltes fotos dolentes, treu-les amb la paperera abans de desar, perquè no es guardin totes.

**Compte!**
- Si el client té pressa, no t'encallis: **omple els camps a mà** i desa. L'important és que les dades siguin correctes.
- Comprova sempre el **«Número de document»**: quan desis, si la lletra del DNI no quadra, sortirà **«…: el DNI «…» no sembla vàlid (8 xifres + lletra de control). La lletra correcta seria «X».»**

---

## Consells per fer bones fotos dels documents

**Per a què serveix**
Perquè l'escàner llegeixi el document a la primera i no hagis de repetir fotos davant del client.

**On és**
S'aplica sempre que facis servir **«Fer foto»** o **«Pujar foto»**, tant a **Nova estada** com al bloc **«Documents d’identitat»** de la fitxa del client.

**Pas a pas**

1. **Tria la cara correcta.**
   - DNI i NIE: la cara del **DARRERE** (la que **no** té foto), amb **3 línies** «<<<» a baix.
   - Passaport: la **pàgina de la foto**, amb **2 línies** «<<<» a baix.
   - Recorda: el text d'ajuda del bloc ho diu: **«Per autoreplenar, fes la foto de la cara amb les línies «<<<»: al DNI/NIE és el DARRERE (la cara sense foto) i al passaport la pàgina de la foto. No passa res si surt una mica girada.»**
2. **Posa el document sobre una superfície plana i fosca** (una taula de fusta fosca o un full negre). El contrast ajuda.
3. **Bona llum, sense flaix.** El flaix fa reflexos sobre el plàstic del DNI i esborra lletres. Millor llum natural o un llum de sostre.
4. **Evita els reflexos.** Si veus una taca blanca sobre les línies «<<<», inclina una mica el mòbil o la tauleta fins que desaparegui.
5. **Que les línies «<<<» surtin senceres.** No tallis cap lletra pels costats. És millor deixar una mica de marge al voltant del document.
6. **Apropa't però no massa.** El document ha d'ocupar gairebé tota la foto. Si queda petit al mig, la zona MRZ és massa petita per llegir-la.
7. **Enfoca.** Toca la pantalla sobre les línies «<<<» perquè la càmera enfoqui allà. Espera un segon abans de disparar.
8. **No moguis l'aparell** quan dispares. Recolza els colzes a la taula si cal.
9. **No cal que estigui perfectament recte.** L'app prova sola de girar la foto 90°, 180° i 270°. Però com més recta, més ràpid.
10. **Treu el document de la funda** de plàstic si en té.
11. **Passaports:** aguanta'l obert amb la mà a l'altra pàgina perquè la pàgina de la foto quedi plana. Si la pàgina fa corba, les línies de baix es deformen.
12. **Amb tauleta (iPad):** fes servir **«Fer foto»** directament. Si prefereixes **«Pujar foto»** des de la galeria i no llegeix, pot ser que la galeria t'entregui una còpia reduïda. Desactiva **«Optimitza l'emmagatzematge»** a Configuració → Fotos, o fes la foto des del mòbil.
13. **Fitxers molt grans:** la foto que es desa a la fitxa no pot passar de **10 MB**. Les fotos normals de mòbil hi caben de sobres. Si fas servir una càmera professional, redueix-ne la mida.
14. **Formats:** **«Pujar foto»** accepta **JPG, PNG, WEBP i PDF**. Els PDF es desen però **no es llegeixen** (l'escàner només llegeix imatges).

    [FOTO id=consell-foto-dni-be ruta=/estancies/nou descripcio="Exemple d'una bona foto del revers d'un DNI (document inventat, ESPÉCIMEN): sobre fons fosc, sense reflexos, amb les tres línies de símbols senceres i nítides" marques=""]

**Què passa després / d'on surten les dades**
Una foto bona es llegeix en pocs segons. Una foto dolenta obliga l'app a fer molts intents (girs i franges ampliades), i pot trigar fins a mig minut o acabar sense llegir-se.

**Per què es fa així**
L'escàner necessita veure clarament **cada símbol** de la zona MRZ: una sola lletra mal llegida fa que els dígits de control no quadrin i que l'app, per seguretat, no ompli res.

**Si t'has equivocat**
Treu la foto dolenta amb la paperera i fes-ne una altra.

**Compte!**
- **No facis fotos del document amb el teu mòbil personal** si després s'han de quedar a la galeria. Fes-les des de l'app (**«Fer foto»**), que les envia directament.
- La miniatura que veus a la llista surt en **blanc i negre** i, si l'amplies (icona de l'ull, **«Veure imatge gran»**), amb la marca d'aigua **«HOSTAL COLL»**. És normal.

---

## Com pujo un document des de la fitxa del client

**Per a què serveix**
Per afegir la foto d'un document a un client que ja existeix, sense haver de fer una estada (per exemple, si el client t'envia el passaport per correu, o si en fer l'estada no vas poder fer la foto).

**On és**
Menú lateral → **«Clients»** → clic al client → bloc **«Documents d’identitat»** (a la dreta).

**Pas a pas**

1. Obre la fitxa del client.
2. Fes clic sobre **«Documents d’identitat»** per obrir el bloc (si està tancat).
3. A baix del bloc, al camp **«Fitxer (PDF o imatge)»**, fes clic i tria la foto o el PDF.
4. Si és una foto, l'app la llegeix sola (surt **«Llegint el document…»**). Si troba la zona MRZ:
   - posa sol el **«Tipus de document»** (**«DNI (revers)»**, **«NIE»** o **«Passaport»**),
   - i et mostra en verd què ha llegit, per exemple: **«Llegit: Passaport · Joan Garcia · AB1234567. Revisa el tipus abans de pujar.»**
5. Si no troba la zona MRZ (per exemple, és la cara del davant del DNI), surt en groc un avís, per exemple **«No s'ha detectat la MRZ (potser és l'anvers del DNI). Tria el tipus a mà.»**
6. Comprova o tria el **«Tipus de document»**: **«DNI (anvers)»**, **«DNI (revers)»**, **«Passaport»**, **«NIE»**, **«Permís de residència»**, **«Carnet de conduir»** o **«Altres»**.
7. Fes clic a **«Pujar document»**. El botó posa **«Pujant…»** mentre treballa.
8. El document apareix a la llista del bloc, amb una miniatura, el tipus, el nom del fitxer i la data.

   [FOTO id=fitxa-pujar-document ruta=/huespedes/<id> descripcio="Bloc Documents d’identitat obert a la fitxa del client amb un passaport (espècimen) a la llista i, a sota, el formulari de pujada" marques="Documents d’identitat|Tipus de document|Fitxer (PDF o imatge)|Pujar document"]

**Què passa després / d'on surten les dades**

- Aquí la lectura **només serveix per triar el tipus de document**. **No canvia cap dada de la fitxa del client.** Si les dades del client estan malament, corregeix-les amb **«Editar»**.
- La foto es converteix a **blanc i negre**, s'hi posa una **marca d'aigua** amb el nom de l'establiment i la data («… · còpia dd/mm/aaaa»), i es desa **xifrada**. Els PDF es desen tal qual, també xifrats.
- Queda apuntat al registre d'auditoria qui l'ha pujat i quan (sense el contingut del document).

**Per què es fa així**
Pot ser que el document arribi més tard que el client, o que vulguis afegir-ne un altre (per exemple, el carnet de conduir).

**Si t'has equivocat**
Si has pujat el document equivocat o amb el tipus equivocat, elimina'l (vegeu «Com veig o elimino un document pujat») i torna'l a pujar.

**Compte!**
Missatges d'error que pots veure:
- **«Selecciona un fitxer»**: has premut **«Pujar document»** sense triar fitxer.
- **«El fitxer supera els 10 MB»**: la foto és massa gran.
- **«Tipus de fitxer no permès (PDF o imatge)»**: només s'accepten PDF, JPG, PNG i WEBP.
- **«Hoste no trobat»**: el client ha estat eliminat.
- **«Error de connexió»**: no hi ha internet.

---

## Com veig o elimino un document pujat

**Per a què serveix**
Per mirar un document guardat (per exemple, per comprovar una dada) o per esborrar-lo quan ja no cal.

**On és**
Menú lateral → **«Clients»** → clic al client → bloc **«Documents d’identitat»**.

**Pas a pas**

*Per veure'l:*

1. Obre el bloc **«Documents d’identitat»**.
2. Si és una imatge, fes clic a la **miniatura** (**«Veure el document»**). S'obre en gran sobre fons fosc, amb la marca d'aigua **«HOSTAL COLL»** repetida.
3. Si és un PDF, fes clic a la icona del document (**«Obrir el document»**). S'obre en una pestanya nova.
4. Per tancar la imatge gran, fes clic a la **✕** de dalt a la dreta o a qualsevol lloc fora de la imatge.

*Per eliminar-lo:*

1. Fes clic a la **paperera** del costat del document (**«Eliminar document»**).
2. Confirma a la finestra **«Segur que vols eliminar aquest document?»**.
3. El document desapareix de la llista.

   [FOTO id=fitxa-document-gran ruta=/huespedes/<id> descripcio="Document d'identitat (espècimen inventat) obert en gran, en blanc i negre, amb la marca d'aigua HOSTAL COLL repetida i la creu per tancar" marques="✕"]

**Què passa després / d'on surten les dades**

- Cada vegada que algú obre un document, l'app el desxifra en aquell moment, hi torna a posar la marca d'aigua i el mostra. **Queda apuntat** al registre d'auditoria (qui l'ha vist, quan i des de quina adreça).
- El navegador no guarda còpia del document.
- Quan elimines un document, desapareix de la fitxa i ja no es pot obrir. Queda apuntat qui l'ha eliminat.

**Per què es fa així**
Els documents d'identitat són dades personals molt sensibles. La llei de protecció de dades demana que només els vegi qui ho necessita i que quedi constància de cada accés.

**Si t'has equivocat**
Si has eliminat un document sense voler, des de l'app **no es pot recuperar**. Torna'l a pujar si el tens.

**Compte!**
- Els usuaris de tipus **Consulta** poden veure els documents però no pujar-ne ni eliminar-ne.
- No facis captures de pantalla dels documents.

---

## Com es protegeixen els documents (xifratge i marca d'aigua)

**Per a què serveix**
Per entendre què fa l'app amb les fotos dels documents i per poder-ho explicar a un client que t'ho pregunti.

**On és**
No hi ha res a fer: és automàtic. Ho recorda el text del bloc **«Documents d’identitat»** de la fitxa: **«Els documents es desen xifrats (AES-256-GCM) i cada accés queda auditat.»**, i el del bloc de l'estada: **«Pots afegir-ne més; totes es desen xifrades.»**

**Pas a pas**
No cal fer res. Això és el que passa sol cada vegada que es desa un document:

1. Si és una **foto**, es passa a **blanc i negre** i s'hi posa una **marca d'aigua** suau repetida amb el nom de l'establiment i la data de la còpia. Així, si algú se l'enduia, no la podria fer servir com si fos un document net.
2. Es **xifra** amb un sistema de xifratge fort (AES-256-GCM). Xifrar vol dir que el fitxer queda convertit en un codi que no es pot llegir sense una clau secreta.
3. Es guarda en un emmagatzematge separat de la base de dades.
4. Quan algú l'obre, es desxifra només per mostrar-lo, s'hi posa una altra marca d'aigua «HOSTAL COLL» ben visible i **s'apunta l'accés**.

**Què passa després / d'on surten les dades**
Les dades del client (nom, document, adreça…) són a la base de dades. La **imatge** del document és a part, xifrada.

**Per què es fa així**
La llei de protecció de dades (RGPD i LOPD) obliga a protegir especialment els documents d'identitat. Si algú entrés on es guarden els fitxers, només veuria codi il·legible.

**Si t'has equivocat**
No s'aplica.

**Compte!**
La clau secreta la gestiona qui manté l'app. **Si es perd, els documents xifrats no es poden recuperar.**

---

## Quan s'esborren sols els documents (purga automàtica)

**Per a què serveix**
Per entendre per què, passat un temps, un document pot desaparèixer de la fitxa d'un client sense que ningú l'hagi esborrat.

**On és**
No té pantalla. És una tasca automàtica de l'app que s'executa **cada dia de matinada** (cap a les 6 o les 7 del matí, hora de Catalunya).

**Pas a pas**
No cal fer res. Cada dia, l'app:

1. Mira quin és el **termini de conservació** de les imatges de documents que ha configurat qui manté l'app (un nombre d'anys).
2. Si **no hi ha cap termini configurat** (o està desactivat), **no esborra res**: les imatges es guarden fins que algú les elimini a mà.
3. Si hi ha un termini (per exemple, 3 anys), busca els documents que es van pujar **fa més temps que aquest termini** (compta des del dia en què es va pujar el document).
4. D'aquests, **esborra de veritat el fitxer xifrat** i el treu de la fitxa.
5. Si n'ha esborrat algun, ho apunta al registre d'auditoria.

**Què passa després / d'on surten les dades**

- **Només s'esborra la imatge del document.** Les **dades** del client (nom, cognoms, número de document, adreça…) i el **registre de viatgers** **es conserven** a part, perquè la llei obliga a guardar-los.
- A la fitxa del client, el document ja no apareixerà a **«Documents d’identitat»**.

**Per què es fa així**
- El **RGPD** diu que les dades personals no es poden guardar més temps del necessari (principi de limitació del termini). Guardar fotos de DNI per sempre és difícil de justificar.
- En canvi, el **registre de viatgers** s'ha de conservar **3 anys** per llei, i això no depèn d'aquesta purga.

**Si t'has equivocat**
Un document purgat **no es pot recuperar** des de l'app.

**Compte!**
- No hi ha cap botó a l'app per veure quin termini està configurat ni per llançar la purga a mà. Si ho necessites saber, pregunta a qui manté l'app.

---

## Quins camps són obligatoris i quan

**Per a què serveix**
Per saber quines dades has de demanar a cada client segons el cas, i entendre per què l'app no et deixa desar.

**On és**
Al formulari **«Nova estada»** (i **«Editar dades»** d'una estada). Els camps obligatoris porten un **asterisc vermell (\*)** al costat del nom. L'asterisc **canvia** segons el que vas triant.

**Pas a pas**

1. Tria el **«Tipus de registre»**. Les regles canvien molt entre **«Reserva»** i **«Contracte en curs»**.
2. Tria el **«Tipus de document»** i el **«País»** de cada viatger. Els asteriscos dels altres camps es posaran sols.
3. Si algun viatger té menys de 14 anys, posa la **«Data de naixement»**: la casella **«És menor»** es marcarà sola.
4. Fes clic a **«Desar estada»**. Si no has posat número de contracte, primer et pregunta **«Vols desar l’estada SENSE número de contracte?»**: prem **«Continuar»** (o **«Cancel·lar»** per posar-lo). Si falta alguna cosa, el camp es marcarà en vermell amb el missatge exacte (per exemple **«El nom és obligatori»**).

   [FOTO id=camps-obligatoris-errors ruta=/estancies/nou descripcio="Bloc d'un viatger després de prémer «Desar estada» amb el formulari buit: missatges vermells «El nom és obligatori» i «El primer cognom és obligatori» i els asteriscos vermells dels altres camps obligatoris" marques="El nom és obligatori|El primer cognom és obligatori|Tipus de document|Adreça|Codi postal|Municipi"]

**Què passa després / d'on surten les dades**

**Si és «Reserva»:**

| Camp | Obligatori? | Missatge si falta |
|---|---|---|
| **«Nom»** | Sí | **«El nom és obligatori»** |
| **«Primer cognom»** | Sí | **«El primer cognom és obligatori»** |
| **«Email»** o **«Telèfon»** | Almenys un dels dos | **«En reserva cal email o telèfon»** |

En reserva no surten els camps del document ni de l'adreça, ni el bloc d'escanejar. El text de la pantalla ho recorda: **«En reserva només calen nom, cognom i (email o telèfon) per cada viatger.»** (El camp **«Email»** porta asterisc, però n'hi ha prou amb el telèfon.)

**Si és «Contracte en curs»:**

| Camp | Quan és obligatori | Missatge si falta |
|---|---|---|
| **«Nom»**, **«Primer cognom»** | Sempre | **«El nom és obligatori»** / **«El primer cognom és obligatori»** |
| **«Tipus de document»** | Sempre, **excepte menors de 14 anys** | **«Tipus de document obligatori»** |
| **«Número de document»** | Sempre, **excepte menors de 14 anys** | **«Número de document obligatori»** |
| **«Segon cognom»** | Si el document és **DNI/NIF** (el camp diu **«Obligatori amb DNI/NIF»**) | **«El segon cognom és obligatori amb DNI/NIF»** |
| **«Número de suport»** | Si el document és **DNI/NIF o NIE** (el camp diu **«Obligatori amb DNI/NIE (9 caràcters)»**) | **«Número de suport obligatori (DNI/NIE)»** |
| **«Parentesc»** | Si el viatger és **menor** (surt quan marques **«És menor»**) | **«Parentesc obligatori per a menors»** |
| **«Adreça»** | Sempre | **«Adreça obligatòria (contracte en curs)»** |
| **«Codi postal»** | Sempre | **«Codi postal obligatori»** |
| **«Localitat»** | Si el **«País»** **no és Espanya** | **«Localitat obligatòria (país estranger)»** |
| **«Província»** i **«Municipi»** | Si el **«País»** **és Espanya**. Porten asterisc, però **es poden desar buits**: s'exigeixen quan generes el fitxer per als Mossos | (en enviar a Mossos) **«falta la província»** / **«falta el municipi»** |

**Per a tota l'estada, sempre:**

| Regla | Missatge |
|---|---|
| Hi ha d'haver un viatger marcat com a titular | **«Cal marcar un viatger com a titular»** |
| La data de formalització no pot ser futura | **«La data de formalització no pot ser futura»** |
| La sortida ha de ser després de l'entrada | **«La data de sortida ha de ser posterior a l'entrada»** |
| La data de naixement no pot ser futura | **«La data de naixement no pot ser futura»** |
| La data d'expedició no pot ser futura | **«La data d'expedicio no pot ser futura»** |
| El correu ha de tenir un format correcte | **«Correu no vàlid»** |

**Avisos «tous»** (no bloquegen; surten al requadre groc **«Hi ha dades que potser no són correctes:»** i pots fer **«Desar igualment»**):

- **«…: el DNI «…» no sembla vàlid (8 xifres + lletra de control). La lletra correcta seria «…».»**
- **«…: el NIE «…» no sembla vàlid (X/Y/Z + 7 xifres + lletra).»**
- **«…: el número de suport «…» supera els 9 caràcters (màxim de Mossos). Escurça'l o deixa'l buit.»**
- **«…: has posat un número de suport en un passaport; els passaports normalment no en tenen. Deixa'l buit si el document no en porta.»**
- **«…: el codi postal «…» hauria de tenir 5 xifres.»**
- **«…: el codi postal «…» no sembla real (la província ha de ser 01–52).»**
- **«…: la data de naixement és en el futur.»**
- **«…: la data de naixement sembla incorrecta (edat inferior a 1 any).»**
- **«…: la data de naixement sembla incorrecta (més de 120 anys).»**
- **«…: la data d'expedició és en el futur.»**

**En enviar als Mossos**, l'app torna a comprovar-ho tot (i una mica més). Si falta alguna cosa, surt: **«No s’ha pogut pujar a la web dels Mossos perquè el registre està incomplet. Edita’l, completa aquestes dades i torna-ho a provar:»** amb una llista per viatger, per exemple:
- **«falta el número de suport (DNI/NIE)»**, **«el número de suport ha de tenir 9 caràcters»**, **«el número de document supera 14 caràcters»**,
- **«falta la província»**, **«província «…» no reconeguda»**, **«falta el municipi»**, **«municipi «…» no trobat»**,
- **«falta la localitat (estranger)»**,
- **«nacionalitat/país «…» no reconegut (escriu-hi el nom del país)»**.

**Menors de 14 anys:**
- Quan escrius la **«Data de naixement»** i, a la data d'entrada, el viatger té menys de 14 anys, la casella **«És menor»** es marca sola.
- Si la desmarques, però la data indica que és menor, surt l'ajuda **«Segons la data de naixement sembla menor de 14.»** En desar, l'app el tractarà com a menor igualment si la data ho diu.
- Quan **«És menor»** està marcat, el document deixa de ser obligatori i apareix el camp **«Parentesc»** (Avi/àvia, Pare o mare, Fill/filla, Tutor/tutora…), que sí és obligatori.

**Espanya o estranger:**
- El **«País»** comença sempre posat a **«Espanya»**.
- Si és Espanya, surten **«Província»** (desplegable) i **«Municipi»**. El municipi s'ha de triar de la llista que surt quan escrius (**«Tria’l de la llista (codi INE oficial).»**). Si encara no has triat la província, el municipi està bloquejat i diu **«Tria primer la província.»**
- Si escrius un altre país, desapareixen **«Província»** i **«Municipi»** i surt **«Localitat»**.

**Per què es fa així**
Són les normes oficials del registre de viatgers dels Mossos d'Esquadra (obligatorietat condicional). Una reserva encara no és un allotjament real, i per això demana molt poc. Quan la persona entra, cal la identificació completa. Els codis de província i municipi han de ser els oficials (INE), i els països, els codis internacionals, perquè el fitxer que s'envia als Mossos ho exigeix.

**Si t'has equivocat**
Corregeix el camp marcat en vermell i torna a fer clic a **«Desar estada»**. Si no tens totes les dades ara, fes clic a **«Desar com a esborrany»** i completa-ho més tard (però recorda: un esborrany no es pot enviar als Mossos).

**Compte!**
- El termini legal per comunicar els viatgers als Mossos és de **24 hores**. No deixis un esborrany oblidat.
- Si la nacionalitat o el país surten com a codi de 3 lletres o amb una ortografia rara, en enviar a Mossos et pot sortir **«nacionalitat/país «…» no reconegut (escriu-hi el nom del país)»**. Tria el país de la llista que surt en escriure.

---

## Com canvio les dades d'un client

**Per a què serveix**
Per corregir una dada mal escrita o actualitzar-la (telèfon nou, adreça nova, document renovat…).

**On és**
Hi ha dos camins:
- **Des de la fitxa del client:** Menú lateral → **«Clients»** → clic al client → botó **«Editar»**.
- **Des d'una estada:** Menú lateral → **«Estades»** → clic a l'estada → bloc **«Viatgers»** → botó **«Editar dades»** al costat del viatger.

**Pas a pas**

*Des de la fitxa del client:*

1. Obre la fitxa i fes clic a **«Editar»**.
2. S'obre la pantalla **«Editar Nom Cognom»** amb el subtítol **«Es manté el historial intacte»**.
3. Canvia el que calgui als tres blocs:
   - **«Dades personals»**: **«Nom»**, **«Primer cognom»**, **«Segon cognom»**, **«Sexe»**, **«Data de naixement»**, **«Nacionalitat»**.
   - **«Document i contacte»**: **«Tipus de document»**, **«Número de document»**, **«Número de suport»**, **«Data d’expedició»**, **«Email»**, **«Telèfon»**.
   - **«Adreça»**: **«Adreça»**, **«Codi postal»**, **«País»**, **«Província»**, **«Municipi»**, **«Localitat»**.
4. Fes clic a **«Desar canvis»** (mentre desa posa **«Desant…»**).
5. Tornes a la fitxa amb les dades noves.

   [FOTO id=editar-client ruta=/huespedes/<id>/edita descripcio="Pantalla d'edició d'un client amb els blocs Dades personals, Document i contacte i Adreça" marques="Dades personals|Document i contacte|Adreça|Desar canvis|Cancel·lar"]

*Des d'una estada:*

1. Obre l'estada i, al bloc **«Viatgers»**, fes clic a **«Editar dades»** al costat de la persona.
2. S'obre el formulari complet de l'estada, situat al viatger.
3. Canvia les dades i fes clic a **«Desar canvis»**.

**Què passa després / d'on surten les dades**

- Les dades noves es guarden a la **fitxa del client**, que és única. Per tant, es veuen a tot arreu on surt aquesta persona (vegeu la secció següent per als detalls i l'excepció de les estades antigues).
- Queda apuntat al registre d'auditoria qui ha fet el canvi i quins camps s'han tocat.

**Per què es fa així**
Com que la persona és una sola fitxa, n'hi ha prou de corregir-la en un lloc.

**Si t'has equivocat**
- Si encara no has desat, fes clic a **«Cancel·lar»**.
- Si ja has desat, torna a **«Editar»** i posa-hi el valor bo.

**Compte!**
- A la pantalla **«Editar»** de la fitxa, **«País»**, **«Província»** i **«Municipi»** són caselles de text lliure, **sense llista**. Escriu-los exactament com surten a la llista oficial (per exemple «Barcelona» i «Calella»); si no, en enviar a Mossos pot sortir **«província «…» no reconeguda»** o **«municipi «…» no trobat»**. Si tens dubtes, corregeix-los des de l'estada (**«Editar dades»**), que sí té la llista.
- A la pantalla **«Editar»** de la fitxa, **buidar un camp no l'esborra**: si esborres el telèfon i deses, el telèfon antic es manté. Per canviar-lo, escriu-hi el valor nou.
- Si **«Sexe»** o **«Tipus de document»** estan en blanc («—»), és possible que en desar surti **«Dades no vàlides»**. Tria'n un valor i torna-ho a provar.
- Si canvies el document per un que ja té un altre client, surt: **«Ja hi ha un hoste registrat amb aquest tipus i número de document. Cerca’l amb la lupa per reutilitzar la seva fitxa, o revisa el número de document.»**
- Si surt **«Error desant la fitxa»**, comprova la connexió i torna-ho a provar.
- La pantalla **«Editar»** de la fitxa no té el camp de data de caducitat ni l'escàner. Per escanejar un document nou, fes-ho des d'una estada o puja'l al bloc **«Documents d’identitat»** de la fitxa (això només el desa, no canvia dades).

---

## On es reflecteixen els canvis (dades congelades)

**Per a què serveix**
Per saber què canvia i què no quan corregeixes les dades d'un client, sobretot en estades antigues que ja s'han comunicat als Mossos.

**On és**
És automàtic. Passa quan deses amb **«Desar canvis»** a la pantalla **«Editar»** de la fitxa del client.

**Pas a pas**
No cal fer res. Quan deses canvis des de la fitxa del client, l'app fa això:

1. **Abans** de guardar els canvis, busca totes les estades d'aquest client que van acabar **fa més de 7 dies** (data de sortida).
2. A cadascuna d'aquestes estades antigues, **fa una còpia de les dades tal com eren abans del canvi** i la deixa «congelada» a l'estada. Si l'estada ja tenia una còpia congelada d'un canvi anterior, no la toca.
3. **Després**, guarda les dades noves a la fitxa.

**Què passa després / d'on surten les dades**

| On | Estades antigues (sortida fa més de 7 dies) | Estades recents, en curs o futures |
|---|---|---|
| **Fitxa del client** (**«Clients»**) | Dades noves | Dades noves |
| **Llibre registre de viatgers** | Dades **congelades** (les d'abans) | Dades noves |
| **Fitxer per als Mossos** (si el tornes a generar) | Dades **congelades** | Dades noves |
| **PDF «Registre persones allotjades»** i **«Reglament intern (LOPD)»** | Dades **congelades** | Dades noves |
| **Taxa turística (IEET)** | Dades **congelades** | Dades noves |
| **Pantalla de l'estada** (bloc **«Viatgers»**) | Dades noves | Dades noves |
| **Factures** (en imprimir-les) | El nom del titular que hi ha a la fitxa, si la factura no té un nom de client escrit a mà | Igual |

- Els fitxers que **ja s'han enviat** als Mossos no es tornen a enviar sols. Si cal corregir una comunicació ja feta, s'ha de fer des de l'estada (vegeu el capítol de Mossos).

**Per què es fa així**
El llibre registre i les comunicacions als Mossos són documents legals que s'han de conservar **3 anys** tal com es van fer. Si un client canvia d'adreça l'any vinent, no és correcte que el llibre de l'any passat «canviï» sol. Per això les estades antigues queden congelades. Les estades recents (menys de 7 dies) encara es poden corregir, perquè sovint t'adones d'un error just després del check-in.

**Si t'has equivocat**
Si has corregit una dada que també estava malament en una estada antiga, la còpia congelada d'aquella estada continua tenint la dada antiga. Des de la fitxa del client no es pot canviar.

**Compte!**
- La congelació **només** passa quan edites des de la fitxa del client (**«Editar»**). Si canvies les dades des de **«Editar dades»** d'una estada, les estades antigues que encara no estiguin congelades **sí que es veuran afectades**.

---

## Com faig signar el viatger i com recullo el consentiment comercial

**Per a què serveix**
Per recollir la firma del viatger al registre i al reglament intern (LOPD), i apuntar si accepta o no rebre comunicacions comercials.

**On és**
La firma va lligada a **cada estada**, no a la fitxa del client.
Menú lateral → **«Estades»** → clic a l'estada → bloc **«Viatgers (N)»** → botó **«Firmar»** al costat del viatger.

**Pas a pas**

1. Obre l'estada.
2. Al bloc **«Viatgers»**, busca la persona i fes clic a **«Firmar»**.
3. S'obre un requadre blanc. Dona el mòbil o la tauleta al client perquè hi firmi amb el dit o amb un llapis tàctil. A sota hi diu **«Firma aquí, o puja una foto de la firma feta en paper.»**
4. Si el client ha firmat en paper, fes clic a **«Pujar foto»** i fes-ne una foto: l'app treu el fons i deixa només el traç.
5. Si la firma ha quedat malament, fes clic a **«Esborrar»** i torna a començar.
6. Al requadre **«Comunicacions comercials (opcional)»**, marca el que el client et digui:
   - **«No vull rebre comunicacions comercials.»**
   - **«Autoritzo l’enviament de comunicacions comercials de productes o serveis diferents als contractats.»**
7. Fes clic a **«Desar firma»**.
8. Surt l'etiqueta verda **«Firmat dd/mm/aaaa hh:mm»** i una miniatura de la firma. Fes clic a la miniatura per veure-la en gran.

   [FOTO id=firma-viatger ruta=/estancies/<id> descripcio="Requadre de firma obert al bloc Viatgers d'una estada, amb l'espai blanc per firmar, les dues caselles de comunicacions comercials i els botons" marques="Comunicacions comercials (opcional)|No vull rebre comunicacions comercials.|Desar firma|Pujar foto|Esborrar"]

**Què passa després / d'on surten les dades**

- La firma s'incrusta als PDF de l'estada: **«Registre persones allotjades»** i **«Reglament intern (LOPD)»** (botons de dalt de l'estada).
- Les dues caselles de comunicacions comercials surten marcades amb **[X]** al PDF del reglament.
- Queda apuntat al registre d'auditoria qui ha recollit la firma.

**Per què es fa així**
El viatger ha de firmar el seu registre. A més, la llei de protecció de dades demana el **consentiment explícit** per enviar publicitat; per això es pregunta i es guarda amb la firma.

**Si t'has equivocat**
Fes clic a **«Tornar a firmar»**. La firma i les caselles noves substitueixen les anteriors. Les caselles surten amb el valor que ja tenien, per si només vols canviar-ne una.

**Compte!**
- Si fas clic a **«Desar firma»** sense haver firmat, surt **«Cal signar abans de desar.»**
- La firma i el consentiment són **de cada estada**. Si el client torna un altre any, cal tornar-lo a fer firmar a la nova estada.
- La fitxa del client no mostra si ha acceptat o no les comunicacions comercials: s'ha de mirar a l'estada.

---

## Com afegeixo una mascota

**Per a què serveix**
Per apuntar que un client ve amb animal (gos, gat…), i poder-lo trobar fàcilment la propera vegada.

**On és**
Dos llocs:
- **En fer l'estada:** **«Estades»** → **«Nova estada»** → bloc **«Mascotes»** (a baix de tot).
- **A la fitxa del client:** **«Clients»** → clic al client → bloc **«Mascotes»** (a la dreta).

**Pas a pas**

*En fer l'estada:*

1. Al bloc **«Mascotes»**, marca **«Porten mascota»**.
2. Omple **«Nom»** (per exemple, «Lluna»), **«Espècie»** (ve posat «Gos»; pots escriure «Gat», etc.) i, si vols, **«Mida»** (**«Petit»**, **«Mitjà»**, **«Gran»**).
3. Si n'hi ha més d'una, fes clic a **«Afegir mascota»**.
4. Desa l'estada. Com diu la pantalla: **«Només cal el nom; la mida és opcional. S’associen al titular de l’estada.»**

*A la fitxa del client:*

1. Obre el bloc **«Mascotes»**.
2. Escriu el **«Nom»** (opcional), tria l'**«Espècie»** (**«Gos»**, **«Gat»**, **«Altres»**) i la **«Mida»**.
3. Fes clic a **«Afegir»**.
4. Per canviar-la, fes clic al **llapis** (**«Editar»**), canvia el que calgui i fes clic a **«Desar»** (o **«Cancel·lar»**).
5. Per treure-la, fes clic a la **paperera** (**«Eliminar»**) i confirma **«Eliminar aquesta mascota?»**.

   [FOTO id=fitxa-mascotes ruta=/huespedes/<id> descripcio="Bloc Mascotes obert a la fitxa d'un client amb un gos a la llista i el formulari per afegir-ne un altre" marques="Mascotes|Nom|Espècie|Mida|Afegir"]

**Què passa després / d'on surten les dades**

- La mascota queda lligada al **client** (al titular, si l'has posat en fer l'estada).
- A la llista de **«Clients»**, la targeta mostra l'etiqueta **«Mascota»** i el pots trobar amb el filtre **«Amb mascota»**.

**Per què es fa així**
Així saps quines habitacions han tingut animals (per a la neteja) i quins clients en porten.

**Si t'has equivocat**
Edita-la o elimina-la des de la fitxa del client.

**Compte!**
- Al formulari de l'estada, només es desen les mascotes que tenen **nom**. Si deixes el nom buit, aquella línia no es guarda.
- Quan edites una estada ja feta, el bloc de mascotes no surt: es gestionen des de la fitxa del client.

---

## Com escric una nota interna sobre un client

**Per a què serveix**
Per apuntar fets objectius sobre un client (bons o dolents) que et seran útils la propera vegada. Per exemple: «factura nº 12 impagada», «va deixar l'habitació impecable», «demana coixí alt».

**On és**
Menú lateral → **«Clients»** → clic al client → bloc **«Notes internes»** (a la dreta).

**Pas a pas**

1. Obre el bloc **«Notes internes»**.
2. Fes clic a **«Afegir nota»**.
3. Tria el **«Sentit»**: **«Positiva»**, **«Negativa»** o **«Neutra»**.
4. Escriu la **«Descripció (objectiva i verificable)»**. L'ajuda diu: **«Registra FETS, no etiquetes. P.ex. «factura nº 12 impagada» o «trencament del llum, foto del 03/06». L’hoste pot demanar veure-ho.»**
5. Si cal, marca **«Marcar com a «no acollir» (llista interna del propi establiment)»** (vegeu la secció següent).
6. Fes clic a **«Desar nota»**.

   [FOTO id=fitxa-notes-afegir ruta=/huespedes/<id> descripcio="Bloc Notes internes obert amb una nota existent i el formulari Afegir nota desplegat (Sentit i Descripció)" marques="Notes internes|Afegir nota|Sentit|Descripció (objectiva i verificable)"]

*Per editar o eliminar una nota:*

1. Fes clic al **llapis** (**«Editar nota»**), canvia el que calgui i fes clic a **«Desar»** (o **«Cancel·lar»**).
2. O fes clic a la **paperera** (**«Eliminar nota»**) i confirma **«Eliminar aquesta nota interna?»**.

**Què passa després / d'on surten les dades**

- La nota surt a la fitxa amb una etiqueta de color (verda per a positiva, vermella per a negativa, grisa per a neutra) i la data.
- Quan el client torni i el busquis pel número de document a **«Nova estada»** (amb la lupa), les seves notes sortiran a sobre dels camps.
- Les notes són **privades**: només les veu el personal de l'app.

**Per què es fa així**
La llei de protecció de dades permet guardar informació sobre clients si és **objectiva, verificable i necessària**. El client té dret a demanar-la, per això cal escriure fets, no opinions.

**Si t'has equivocat**
Edita la nota o elimina-la.

**Compte!**
- El botó **«Desar nota»** no s'activa fins que la descripció té almenys **5 caràcters**. Si arriba al servidor més curta, surt **«Descriu el fet de manera objectiva i verificable»**.
- **No escriguis mai** opinions ni dades sobre origen, religió, salut, orientació, etc.

---

## Com marco un client com a «no acollir»

**Per a què serveix**
Per avisar-te (a tu i a qui treballi a recepció) que no vols tornar a allotjar aquesta persona, per un motiu objectiu.

**On és**
Menú lateral → **«Clients»** → clic al client → bloc **«Notes internes»** → **«Afegir nota»**.

**Pas a pas**

1. Obre **«Notes internes»** i fes clic a **«Afegir nota»**.
2. Tria **«Negativa»** al **«Sentit»**.
3. Escriu el fet concret a la **«Descripció (objectiva i verificable)»**.
4. Marca **«Marcar com a «no acollir» (llista interna del propi establiment)»**.
5. Fes clic a **«Desar nota»**.

**Què passa després / d'on surten les dades**

- La fitxa mostra l'etiqueta vermella **«No acollir»** i el requadre: **«Aquest hoste està marcat com a no acollir a la llista interna. Revisa les notes objectives abans de decidir. La decisió no pot basar-se en característiques protegides.»**
- A la llista de **«Clients»**, la targeta porta l'etiqueta **«No acollir»**.
- A **«Nova estada»**, si el busques pel document (lupa), surt **«⚠ Aquest hoste està marcat com a no acollir a la llista interna. Revisa les notes objectives abans de decidir (§7).»**

  [FOTO id=fitxa-no-acollir ruta=/huespedes/<id> descripcio="Fitxa d'un client marcat com a no acollir, amb l'etiqueta vermella i el requadre d'avís" marques="No acollir"]

**Per què es fa així**
Cada establiment pot tenir la seva pròpia llista interna d'admissió, però la decisió ha de basar-se en fets (impagaments, danys…), mai en característiques protegides per la llei.

**Si t'has equivocat**
Edita la nota (llapis) i desmarca **«Marcar com a «no acollir»»**, o elimina la nota. Si no queda cap nota amb la marca, l'etiqueta desapareix.

**Compte!**
L'avís de «no acollir» **no surt** si reaprofites el client amb el cercador **«Reaprofitar un hoste existent…»** o des del botó **«Nova estada»** de la fitxa. Només surt quan el busques pel número de document (lupa).

---

## Com faig servir els avisos interns

**Per a què serveix**
Per apuntar persones a vigilar o no acollir **encara que no siguin clients** (per exemple, algú que t'han advertit altres hostals). Es busquen pel **nom** o pel **telèfon**.

**On és**
Menú lateral → **«Clients»** → botó **«Avisos interns»** (a dalt a la dreta).
També, si n'hi ha d'actius, al requadre groc **«Avisos interns (N)»** de la llista de clients → **«Gestionar»**.

**Pas a pas**

*Per crear un avís:*

1. A **«Clients»**, fes clic a **«Avisos interns»**.
2. Al bloc **«Nou avís»**, omple:
   - **«Nom»** (obligatori): **«Nom i cognoms o àlies»**.
   - **«Telèfon»** (opcional).
   - **«Email»** (opcional).
   - **«Gravetat»**: **«Baixa»**, **«Mitjana»** o **«Alta»**.
   - **«Motiu»** (obligatori), per exemple **«va deixar l’habitació en mal estat»**.
   - **«Notes internes»** (opcional): **«Detalls addicionals (només per a tu)»**.
3. Fes clic a **«Afegir avís»**.

   [FOTO id=avisos-interns-nou ruta=/avisos descripcio="Pantalla Avisos interns amb el formulari Nou avís i la llista d'avisos a sota" marques="Nou avís|Nom|Gravetat|P. ex. va deixar|Afegir avís|Desactivar"]

*Per gestionar-los:*

1. Busca a **«Cerca per nom, telèfon o motiu…»**.
2. Fes clic a **«Desactivar»** per deixar-lo sense efecte (queda gris amb l'etiqueta **«Inactiu»**), o **«Activar»** per tornar-lo a activar.
3. Fes clic a la **paperera** per eliminar-lo (confirma **«Eliminar l’avís de …?»**).
4. Des de la llista de **«Clients»**, també pots fer clic a **«Desactivar»** directament al requadre groc (confirma **«Desactivar aquest avís intern?»**).

**Què passa després / d'on surten les dades**

- Els avisos **actius** surten al requadre groc de dalt de la llista de **«Clients»**.
- A **«Nova estada»**, quan escrius el **«Nom»** i el **«Primer cognom»**, o el **«Telèfon»**, d'un viatger i passes al camp següent, l'app comprova si coincideix amb algun avís actiu. Si coincideix, surt en vermell: **«🚫 Avís intern: (motiu). Valora no acollir aquesta persona.»**
- Coincideix si el telèfon és el mateix (comparant només les xifres, mínim 6) o si el nom de l'avís conté el nom i cognom escrits (mínim 3 lletres).

**Per què es fa així**
Les notes «no acollir» només serveixen per a persones que ja han estat clients. Els avisos interns serveixen per a qualsevol persona.

**Si t'has equivocat**
Desactiva l'avís o elimina'l.

**Compte!**
- Pot haver-hi falses alarmes si dues persones tenen noms semblants. Llegeix el motiu i decideix tu.
- Com amb les notes, escriu només **fets objectius**.

---

## Com elimino un client

**Per a què serveix**
Per treure de la llista un client que no hi hauria de ser (per exemple, una fitxa creada per error).

**On és**
Menú lateral → **«Clients»** → clic al client → botó **«Eliminar»** (a dalt a la dreta, amb una paperera vermella).

**Pas a pas**

1. Obre la fitxa del client.
2. Fes clic a **«Eliminar»**.
3. Surt una finestra amb el títol **«Eliminar l'hoste «Nom Cognom»?»** i el missatge **«Desapareixerà de la llista d'hostes. … Les dades queden a l'històric d'auditoria.»**. Si té estades, també diu: **«Té N estades registrades que es conserven al llibre de registre (requisit legal), però l'hoste deixarà d'aparèixer a la llista.»**
4. Fes clic a **«Eliminar»** per confirmar, o a **«Cancel·lar»** per no fer res.
5. Tornes a la llista de **«Clients»**, on ja no surt.

   [FOTO id=eliminar-client-dialeg ruta=/huespedes/<id> descripcio="Finestra de confirmació «Eliminar l'hoste…?» d'un client que té estades registrades, amb els botons Cancel·lar i Eliminar" marques=""]

**Què passa després / d'on surten les dades**

- El client **no s'esborra del tot**: només s'amaga de la llista de **«Clients»**.
- Les seves **estades** es conserven, i continua sortint al **llibre registre** i a les estades on hi era.
- Els seus **documents** pujats no s'eliminen en aquest moment.
- Queda apuntat al registre d'auditoria qui l'ha eliminat.

**Per què es fa així**
La llei obliga a conservar el registre de viatgers **3 anys**. Per això no es pot esborrar del tot una persona que s'ha allotjat a l'hostal.

**Si t'has equivocat**
Des de l'app **no hi ha cap botó per recuperar** un client eliminat. Parla amb qui manté l'app.

**Compte!**
- Si el que vols és **esborrar una estada**, no eliminis el client: fes-ho des de l'estada o des de l'**«Historial d’estades»** de la fitxa (columna **«Accions»**).
- Si vols treure **un document** però no el client, fes-ho des del bloc **«Documents d’identitat»**.
- Si la mateixa persona torna, l'app la pot reconèixer pel document i reaprofitar la fitxa eliminada sense que surti a la llista (vegeu DUBTES). Si pots, **no elimines clients que poden tornar**.

---

## Què passa amb els clients duplicats

**Per a què serveix**
Per entendre per què, de vegades, una mateixa persona surt dues vegades a la llista, i com evitar-ho.

**On és**
Afecta la llista de **«Clients»** i el formulari **«Nova estada»**.

**Pas a pas**
Per evitar duplicats:

1. A **«Nova estada»**, abans d'escriure, busca sempre la persona a **«Reaprofitar un hoste existent (nom, document, email…)»**.
2. Escriu bé el **«Tipus de document»** i el **«Número de document»**, i prem la **lupa**.
3. Si l'app et diu **«Hoste recurrent · N estades prèvies»**, és que ja existia: perfecte.

**Què passa després / d'on surten les dades**

L'app **no permet dues fitxes amb el mateix tipus de document i el mateix número de document**. Per això:

- En desar una estada, si el document ja existeix, **aprofita la fitxa existent** en lloc de crear-ne una de nova.
- Si en editar un client poses un document que ja té un altre client, surt: **«Ja hi ha un hoste registrat amb aquest tipus i número de document. Cerca’l amb la lupa per reutilitzar la seva fitxa, o revisa el número de document.»**

Però **sí que pot haver-hi duplicats** en aquests casos:

- **Reserves sense document**: si fas dues reserves de la mateixa persona sense document i sense reaprofitar-la amb el cercador, es creen dues fitxes.
- **Tipus de document diferent**: si la primera vegada va venir amb **DNI** i la segona amb **Passaport**, per a l'app són dos documents diferents, i per tant dues fitxes.
- **Número escrit diferent**: si una vegada s'ha escrit amb un error (una lletra canviada), són dos números diferents.

**Per què es fa així**
El document és l'única dada que identifica una persona sense dubte. Dues persones poden tenir el mateix nom, però no el mateix DNI.

**Si t'has equivocat**
L'app **no té cap opció per fusionar** dues fitxes. Si tens un duplicat:
1. Tria quina fitxa vols conservar (normalment la que té més estades).
2. A les properes estades, reaprofita sempre aquesta.
3. Si la fitxa sobrant no té estades, pots eliminar-la amb **«Eliminar»**. Si en té, deixa-la (les estades no es poden passar d'una fitxa a l'altra des de la fitxa del client).

**Compte!**
- En reserva, fes servir sempre el cercador, perquè sense document l'app no pot reconèixer la persona sola.

---

## Preguntes freqüents

**1. He fet la foto del DNI i no omple res. Què faig?**
Comprova que has fotografiat la cara del **darrere** (la que no té foto i té 3 línies «<<<»). Si era aquesta, torna a fer la foto amb més llum, sense reflexos i més a prop (vegeu «Consells per fer bones fotos dels documents»). Si no se'n surt, omple les dades a mà: la foto queda desada igualment.

**2. Per què el nom surt sense accents?**
Perquè la zona MRZ dels documents no porta accents. Corregeix-los a mà al camp **«Nom»** o als cognoms.

**3. L'escàner m'omple la data d'expedició?**
No. Has d'escriure la **«Data d’expedició»** a mà mirant el document.

**4. He d'omplir el número de suport amb un passaport?**
No. Els passaports normalment no en tenen. Deixa **«Número de suport»** buit. Només és obligatori amb **DNI/NIF** i **NIE**.

**5. Un nen de 8 anys ha de portar document?**
Si té menys de 14 anys i marques **«És menor»** (es marca sol si poses la data de naixement), el document no és obligatori. En canvi, sí que has d'omplir el **«Parentesc»** amb la persona adulta.

**6. El client és francès i l'app em demana província i municipi.**
Has deixat el **«País»** a «Espanya». Canvia'l per «França» i sortirà el camp **«Localitat»** en lloc de **«Província»** i **«Municipi»**.

**7. Si canvio l'adreça d'un client, es canvia al llibre registre de l'any passat?**
No. Si edites des de la fitxa del client, les estades que van acabar fa més de 7 dies queden congelades amb les dades antigues. Les estades recents sí que agafen la dada nova.

**8. On es guarden les fotos dels documents? Són segures?**
Es guarden xifrades (AES-256-GCM), en blanc i negre i amb marca d'aigua, en un lloc separat de les dades. Cada vegada que algú les obre queda apuntat qui, quan i des d'on.

**9. Les fotos dels documents s'esborren mai?**
Depèn de com estigui configurada l'app. Si hi ha un termini de conservació, cada dia de matinada s'esborren sols els documents pujats fa més temps que aquest termini. Si no n'hi ha, es guarden fins que algú els esborri a mà. Les dades del registre (nom, document…) no s'esborren amb això.

**10. El client ha firmat malament. Puc repetir la firma?**
Sí. A l'estada, al costat del viatger, fes clic a **«Tornar a firmar»**.

**11. Com sé si un client ja havia vingut?**
A **«Nova estada»**, escriu el seu document i prem la lupa. Si ja existeix, surt **«Hoste recurrent · N estades prèvies»**. També el pots buscar a **«Clients»**.

**12. He eliminat un client per error. El puc recuperar?**
Des de l'app no. Les seves estades es conserven al llibre registre. Parla amb qui manté l'app.

**13. Puc escanejar un document des de la fitxa del client per actualitzar-ne les dades?**
No. Des de la fitxa, l'escàner només serveix per **endevinar el tipus** del document que pujes. Per canviar dades, fes servir **«Editar»**, o escaneja el document des d'una estada.

**14. Per què la miniatura del document surt en blanc i negre?**
Per protecció de dades: la còpia que es guarda es converteix a blanc i negre i porta marca d'aigua perquè no es pugui fer servir com a document original.

**15. Què vol dir el color del cercle de les inicials a la llista de clients?**
Verd: **«Hi és ara»**. Taronja: **«Hi és amb fiança»**. Mig verd i mig groc: **«Part oficial, part fiança»**. Vermell: **«No hi és»**.

**16. Puc fer una reserva sense escanejar el document?**
Sí. En **«Reserva»** ni tan sols surt l'escàner. Només calen nom, cognom i (email o telèfon). Quan el client arribi, converteix la reserva i completa les dades.

---

## DUBTES

> Aquesta secció és interna i **no es publicarà**. Recull coses que no s'han pogut confirmar al codi o que semblen incoherents.

1. **CLAUDE.md contradiu el codi sobre l'OCR.** CLAUDE.md diu que l'escàner és «tesseract.js, sin credenciales» i que funciona al client. El codi real (`src/app/api/ocr/document/route.ts`) envia la foto al servidor i d'allà a l'API d'Anthropic (model `claude-sonnet-4-6`). Cal actualitzar CLAUDE.md. A més, **implicació legal**: la imatge del DNI/passaport surt cap a un tercer (Anthropic). Caldria confirmar si està recollit al registre d'activitats de tractament / contracte d'encarregat del tractament (RGPD art. 28) i si s'ha d'informar al reglament intern (LOPD). El manual ho menciona de manera neutra («Claude Vision, d'Anthropic»).
2. **Funcions no usades.** `parseDniFront` i `parseDniReverso` (`src/lib/ocr/mrz.ts`) existeixen i tenen tests, però cap pantalla les fa servir. La cara del davant del DNI no es llegeix. No s'ha documentat cap lectura de la cara del davant.
3. **Data de caducitat.** La MRZ en treu la data de caducitat i el model `Huesped` té `dataCaducitat`, però el formulari no l'omple ni la mostra enlloc. Cal decidir si s'ha de mostrar.
4. **Edició de la fitxa (`huesped-edit-form.tsx` + `HuespedUpdateSchema`):**
   - Si **«Sexe»** o **«Tipus de document»** són buits («—»), el formulari envia `''` i l'esquema Zod (`SexeEnum.optional()` / `TipusDocumentEnum.optional()`) el rebutja → probablement surt **«Dades no vàlides»** i no es pot desar. Sembla un error de programació. Cal provar-ho.
   - Els camps buidats (`''`) es converteixen a `undefined` i **no s'esborren** a la BD. No es pot esborrar un telèfon o un correu des d'aquesta pantalla.
   - **«País»**, **«Província»** i **«Municipi»** són text lliure sense llista INE; poden generar errors en enviar a Mossos.
5. **Congelació de dades incompleta.** El snapshot (`dadesCongelades`) només es fa a `PATCH /api/huespedes/:id`. **No** es fa a `updateRegistre` (editar l'estada, que sobreescriu totes les dades de l'hoste) ni a `generateFitxer` quan es marca «persistir» l'edició a la fitxa. Per tant, editar des d'una estada pot reescriure el llibre d'estades antigues. Cal confirmar si és intencionat.
6. **Factures i dades congelades.** La impressió de factures (`/imprimir/factura/[id]`, `/imprimir/factura-simple/[id]`) fa servir el titular **viu** (no `viatgerEfectiu`) si no hi ha `clientNom` escrit. Reimprimir una factura antiga pot mostrar el nom/adreça nous. Cal confirmar si és correcte legalment (una factura emesa no s'hauria de modificar).
7. **Hostes eliminats i reaprofitament.** `GET /api/huespedes/lookup` i `createRegistre` busquen per `tipusDocument+numDocument` **sense filtrar `deletedAt`**. Si una persona eliminada torna, l'app la reaprofita però la fitxa continua eliminada (no surt a **«Clients»**), i la pujada de documents falla amb **«Hoste no trobat»** (el POST de documents sí que filtra `deletedAt`). No hi ha botó per restaurar un hoste eliminat.
8. **Eliminar un hoste no esborra els seus documents** pujats. Es purgaran (si hi ha termini configurat) pel cron, però mentrestant segueixen al bucket.
9. **Documents eliminats manualment.** `DELETE /api/documents/:id` només fa esborrat lògic (`deletedAt`); el fitxer xifrat **es queda** a l'emmagatzematge. La purga (`purgarDocumentsVencuts`) només mira documents amb `deletedAt: null`, així que **els fitxers eliminats a mà no s'esborren mai físicament**. Possible problema RGPD.
10. **Termini de purga desconegut.** Depèn de la variable d'entorn `DOCUMENT_RETENTION_YEARS`, que no està documentada a `DEPLOY.md` ni a cap `.env.example`. No sé si a producció està configurada ni amb quin valor. El cron s'executa cada dia a les 05:00 UTC (`vercel.json`). No hi ha UI per consultar-ho ni per llançar-lo (només `GET /api/cron/purga-documents` amb sessió d'ADMIN).
11. **Termini legal de conservació.** CLAUDE.md diu 3 anys per al registre de viatgers; el comentari de `documents-retencio.ts` cita el RD 933/2021. Convé que la propietària confirmi el termini per a les imatges dels documents amb el seu assessor de protecció de dades.
12. **Avís «no acollir» quan es reaprofita.** `hostePatch` (cercador i botó **«Nova estada»** de la fitxa) no carrega `_noAcollir` ni `_anotacions`. Només la lupa (lookup per document) mostra l'avís. Sembla una mancança.
13. **Nom i document no s'actualitzen en reaprofitar.** `huespedUpdateFromViatger` (alta d'estada amb hoste reaprofitat) no actualitza `nom`, `cognom1`, `tipusDocument` ni `numDocument`. En canvi, `updateRegistre` (editar estada) sí que ho actualitza tot. Comportament diferent segons el camí.
14. **Tipus per defecte de les fotos** al formulari d'estada: 1a = «DNI (anvers)», 2a = «DNI (revers)», resta = «Altres», independentment de què s'hagi escanejat. Com que les instruccions diuen de fotografiar primer el darrere, la propietària sempre haurà de canviar els tipus. Al bloc de la fitxa, en canvi, el tipus es posa sol segons la lectura. Potser caldria fer-ho igual a l'estada.
15. **Mida màxima de les fotos.** L'escàner redueix la còpia per llegir, però el document que es desa és l'original; si passa de 10 MB, la pujada falla **després** de crear l'estada (alerta «L'estada s'ha desat, però N document(s) no s'han pogut pujar…»). Amb fotos de tauleta d'alta resolució podria passar.
16. **Format HEIC.** El servidor d'OCR converteix HEIC a JPEG, però el POST de documents només accepta `application/pdf`, `image/png`, `image/jpeg`, `image/webp`. Si un iPad envia HEIC tal qual, la foto es llegiria però no es desaria. No sé si Safari/iPadOS converteix automàticament en triar el fitxer.
17. **Nacionalitat com a codi.** Per a països fora de la taula `NACIONALITAT_LABELS` (~55 països), la nacionalitat queda com el codi ISO de 3 lletres (p. ex. «THA»). No he comprovat si `paisToISO3` accepta codis directament; si no, en enviar a Mossos sortiria «nacionalitat/país «THA» no reconegut».
18. **Cognoms compostos a la MRZ.** `parseName` agafa el primer bloc com a primer cognom i la resta com a segon. «DE<LA<FUENTE<GARCIA» donaria primer cognom «De» i segon «La Fuente Garcia». No hi ha cap correcció. El manual avisa de revisar-ho.
19. **Hora del cron.** He traduït «0 5 * * *» (UTC a Vercel) com «cap a les 6 o les 7 del matí, hora de Catalunya». Confirmar que els crons de Vercel van en UTC en aquest projecte.
20. **Valors de les rutes per a les FOTO.** He fet servir `/huespedes/<id>`, `/huespedes/<id>/edita` i `/estancies/<id>` com a plantilla: qui faci les captures ha de triar un client i una estada de proves (sense dades reals de clients!).
21. **No he trobat cap pantalla per crear un client sense estada** (`POST /api/huespedes` existeix però cap component el crida). El manual diu que els clients es creen només fent una estada.
22. **Dret d'accés dels clients a les notes.** L'ajuda diu «L’hoste pot demanar veure-ho», però no hi ha cap funció d'exportar les dades d'un client (dret d'accés/portabilitat RGPD). No s'ha documentat cap procediment.
