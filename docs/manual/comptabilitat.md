# Diners, despeses i impostos

Aquest capítol t'explica tota la part de **diners** de l'app de l'Hostal Coll:

- com saber **com t'ha anat** un mes o un any (pàgina **Balanç**);
- com **apuntar les despeses** (factures, tiquets, lloguer, fiances, abonaments);
- com tenir controlats els **proveïdors** i els **serveis que es repeteixen** (assegurança, extintors, llum…);
- com preparar el **llibre d'IVA de cada trimestre** per a la gestoria;
- com veure **què toca pagar a Hisenda** i quan (pàgina **Impostos**), treure els **formularis oficials**, fer-los **validar per l'AEAT** i, si vols, **presentar-los des de l'app**;
- com preparar la **taxa turística** (model 950);
- i què és **Veri\*Factu** i en quin punt és dins l'app.

No cal que sàpigues comptabilitat. Cada vegada que surti una paraula "de gestoria", te l'expliquem el primer cop que apareix.

### Petit diccionari abans de començar

| Paraula | Què vol dir, en planer |
|---|---|
| **IVA** | Impost que es paga quan es compra o es ven alguna cosa. Tu el **cobres** als clients (dins el preu de l'habitació) i el **pagues** als proveïdors (dins de les seves factures). Cada trimestre fas la resta i pagues (o et queda a favor) la diferència. |
| **Base imposable** | El preu **sense IVA**. Exemple: si una habitació costa 110 € amb IVA del 10 %, la base és 100 € i l'IVA 10 €. |
| **% IVA** o **tipus d'IVA** | El percentatge d'IVA: l'allotjament va al **10 %**, la majoria de coses al **21 %**, alguns aliments al **4 %** o al **5 %**, i hi ha coses que **no porten IVA** (0 %). |
| **IVA repercutit** | L'IVA que **tu cobres** als clients (surt de les teves factures). En castellà, *repercutido*. |
| **IVA suportat** | L'IVA que **tu pagues** als proveïdors (surt de les seves factures). En castellà, *soportado*. Es pot restar del repercutit. |
| **IRPF** | Impost sobre la renda de les persones. En aquest capítol surt en dos llocs: la **retenció del lloguer** del local i els **pagaments a compte** de la teva renda (model 130). |
| **Retenció** | Un tros de la factura que **no pagues al proveïdor** sinó que guardes per pagar-lo tu a Hisenda en nom seu. Passa amb el lloguer del local (normalment el 19 %). |
| **Fiança** | Diners que es donen **en garantia** i que es tornaran. Pot ser que te la donin a tu (un client) o que la donis tu (a un proveïdor). **No és ni un ingrés ni una despesa**. |
| **Trimestre (T)** | Tres mesos: 1T = gener–març, 2T = abril–juny, 3T = juliol–setembre, 4T = octubre–desembre. |
| **Model 303, 130, 115, 390, 180, 347, 100** | Els formularis d'Hisenda (l'**AEAT**, Agència Tributària). Els expliquem a la secció d'impostos. |
| **Taxa turística (IEET) · model 950** | Impost català per persona i nit d'hostatge. Es declara i es paga a l'**ATC** (Agència Tributària de Catalunya) amb el **model 950**, no a l'AEAT. |
| **Certificat digital** | Un fitxer (.p12 o .pfx, normalment de la FNMT) que fa de «DNI a internet». Amb ell es poden presentar els models a l'AEAT. |
| **Gestoria** | La persona o empresa que et presenta els impostos. |

> **Qui ho pot veure?** Les pàgines **Balanç**, **Impostos**, **Despeses**, **Tarifes** i **Veri\*Factu** són per als usuaris amb rol **administrador** (ADMIN). **Proveïdors i serveis** i **Taxa turística** surten al menú per a tothom, però per crear o canviar coses cal ser administrador o recepció. Si entres amb una **vista restringida de propietat**, l'app t'amaga les fiances i alguns apartats (personal, neteja, taxa turística).

---

## Com arribo a la part de diners

**Per a què serveix:** saber on és cada cosa abans de començar.

**On és:** al menú de l'esquerra, dins el grup **Gestió**.

**Pas a pas:**

1. Al menú de l'esquerra, mira el grup **Gestió**. Hi trobaràs **Plantilles**, **Treballadors**, **Balanç**, **Impostos**, **Facturació**, **Pressupostos**, **Tarifes**, **Despeses**, **Taxa turística**, **Proveïdors i serveis** i **Justificants**.
2. Quan entres a **Balanç**, **Despeses**, **Proveïdors i serveis** o **Veri\*Factu**, a dalt de tot hi ha una fila de pestanyes que et deixa saltar d'una a l'altra: **Balanç**, **Facturació**, **Pressupostos**, **Tarifes**, **Despeses**, **Proveïdors i serveis**, **Veri\*Factu**.

[FOTO id=menu-gestio-finances ruta=/balanc descripcio="Menú lateral amb el grup Gestió obert i, a la dreta, la fila de pestanyes de la secció de diners" marques="Gestió|Balanç|Impostos|Despeses|Taxa turística|Proveïdors i serveis"]

**Què passa després / d'on surten les dades:** totes aquestes pàgines treballen amb les **mateixes dades**: les factures i cobraments de les estades, les despeses que entres, les nòmines i jornades del personal, i els dipòsits (fiances) dels clients. Introdueixes cada dada **una sola vegada** i l'app la fa servir a tot arreu.

**Per què es fa així:** perquè no hagis de copiar res a mà d'un lloc a un altre i perquè les xifres del Balanç, del llibre d'IVA i dels impostos quadrin entre elles.

**Si t'has equivocat:** pots tornar al menú quan vulguis; mirar no canvia res.

**Compte!** La pàgina **Impostos** i la **Taxa turística** **no** surten a la fila de pestanyes de dalt; només al menú de l'esquerra.

---

## Com miro com m'ha anat un mes o un any (Balanç)

**Per a què serveix:** veure d'un cop d'ull quant ha entrat, quant ha sortit i quant t'ha quedat (benefici), i separar-ho de les fiances, que no són teves.

**On és:** menú **Gestió → Balanç** (adreça `/balanc`).

**Pas a pas:**

1. Entra a **Balanç**. Veuràs el títol «Balanç» i, a sota, «Comptabilitat del hostal: ingressos, despeses, benefici i fiances».
2. **Els imports surten amagats** (punts «••••») cada cop que entres. És a propòsit, per si hi ha algú al costat. Per veure'ls, prem el botó **«Mostrar imports»** (l'ull). Per tornar-los a amagar, **«Amagar imports»**.
3. Tria el període amb el selector de colors de dalt:
   - **«Mes»**, **«Trimestre»**, **«Any»** o **«Personalitzat»**.
   - Amb les fletxes **‹** i **›** vas al període anterior o al següent. No pots anar més enllà del període actual.
   - Si cliques el nom del període del mig, tornes al període actual.
   - Amb **«Personalitzat»** apareixen dos calendaris, **«Des de»** i **«Fins a»**, per triar dies exactes (p. ex. del 15/06 al 10/07).
4. Mira el bloc blanc **«Resultat de l'hostal»** (té la nota «sense fiances · és el que compta per a Hisenda»). Hi ha tres caselles: **«Ingressos»**, **«Despeses»** i **«Benefici»**.
5. Al costat (en pantalla gran) o a sota, hi ha el bloc de color crema **«Fiances»** (nota «no són ingrés ni despesa») amb **«Rebudes»**, **«Pagades»** i **«Saldo»**.
6. **Clica qualsevol casella** per obrir-ne el **desglossament**: una finestra amb d'on surt la xifra i, a sota, la llista de **moviments** (cada cobrament, cada despesa…). Tanca-la amb la creu o clicant fora.
7. Baixa i trobaràs, per ordre: el gràfic **«Del benefici a la caixa»**, el gràfic **«Mes a mes»**, (si has triat **«Any»**) la **taula mes per mes**, les targetes **«En què se'n va»** i **«Com t'han pagat»**, la targeta **«Indicadors de l'hostal»** i la llista **«Moviments»**.
8. Per endur-te les xifres: botó **«CSV»** (full de càlcul per a la gestoria) o **«PDF»** (només surt si el període és **«Mes»** o **«Any»**).

[FOTO id=balanc-capcalera ruta=/balanc descripcio="Part de dalt del Balanç amb el selector de període, el botó de mostrar imports i els dos blocs Resultat de l'hostal i Fiances" marques="Mes|Trimestre|Any|Personalitzat|Mostrar imports|Resultat de l'hostal|Fiances|CSV|PDF"]

[FOTO id=balanc-desglossament ruta=/balanc descripcio="Finestra que s'obre en clicar la casella Ingressos, amb les files per mètode de cobrament, el total i la llista de moviments" marques="Ingressos · per mètode de cobrament|Total|Moviments"]

**Què passa després / d'on surten les dades:** el Balanç **no guarda res**, només calcula. Cada vegada que l'obres, torna a sumar les dades del període. Ho expliquem xifra per xifra a la secció següent.

**Per què es fa així:** les fiances es posen **a part** perquè no són teves (les dels clients s'han de tornar) o perquè les recuperaràs (les que pagues tu). Si les barregéssim amb els ingressos i les despeses, el benefici sortiria inflat o desinflat i no coincidiria amb el que veu Hisenda.

**Si t'has equivocat:** el Balanç no es pot "espatllar": si una xifra no et quadra, la correcció es fa on és l'origen (la factura, el cobrament, la despesa). En tornar al Balanç, ja sortirà bé.

**Compte!**
- La fletxa i el percentatge de color al peu d'**«Ingressos»** i **«Despeses»** (p. ex. «▲ 12% vs …») comparen amb el període anterior del mateix tipus. A les despeses, pujar es pinta de vermell (és dolent) i baixar de verd.
- A sota de **«Benefici»** surt el **marge**: «marge X% dels ingressos» (quin tant per cent dels ingressos et queda).
- Els imports només s'amaguen sols quan entres al Balanç des del menú o les pestanyes. Si **recarregues** la pàgina (o hi entres escrivint l'adreça), poden sortir **visibles** i el botó dirà **«Amagar imports»**.
- Si entres amb **vista restringida**, el bloc **«Fiances»**, la cascada i les parts ratllades no surten, i el mètode de cobrament **«Altres»** no compta.

---

## D'on surt cada xifra del Balanç

**Per a què serveix:** entendre cada número per poder-lo explicar a la gestoria o detectar un error.

**On és:** menú **Gestió → Balanç**.

**Pas a pas:**

1. Tria el període.
2. Clica la casella que vulguis entendre: la finestra et mostra el càlcul i els moviments.
3. Compara-ho amb aquesta taula:

| Casella o gràfic (etiqueta exacta) | D'on surt la xifra |
|---|---|
| **«Ingressos»** | **Cobraments** dels clients del període **+ fiances retingudes** (dipòsits que t'has quedat, p. ex. per desperfectes, i que per tant passen a ser ingrés). Si un cobrament s'ha repartit per períodes (p. ex. un pagament del 5/7 que cobreix juliol i agost), només compta la part del període que mires. Les estades i factures esborrades no compten. A la finestra surt repartit per mètode (Efectiu, Targeta, Transferència, Bizum, Altres) i, si cal, una fila **«Fiances retingudes (ingrés)»** perquè el total quadri. |
| **«Despeses»** | Totes les **despeses** de la pàgina Despeses amb data dins el període, **excepte les marcades com a fiança**, **+ el cost de personal** (les **jornades** del personal del període). A la finestra surt per categoria, amb «Personal» com una categoria més. |
| **«Benefici»** | **Ingressos − Despeses**. És el **benefici real**. Verd si és positiu, vermell si és negatiu. |
| **«Rebudes»** (Fiances) | Fiances que t'han donat **clients**, amb data dins el període, que **encara tens en custòdia** (no les has tornat ni retingut). |
| **«Pagades»** (Fiances) | Despeses que tu has marcat **«És una fiança»** (diners que has donat i recuperaràs), amb data dins el període. |
| **«Saldo»** (Fiances) | **Rebudes − Pagades**. |
| **«Del benefici a la caixa»** | Un gràfic en escala: «Ingressos» → «Despeses» → **«Benefici real»** → «+ Fiances rebudes» → **«Benefici total»** (= benefici real + fiances rebudes) → «− Fiances pagades» → **«Moviment de caixa»** (el que realment t'ha entrat o sortit del banc i la caixa). |
| **«Mes a mes»** | Una barra per mes amb ingressos, despeses (personal inclòs) i la línia del benefici real. Amb **«Any»** mostra els 12 mesos de l'any; amb **«Personalitzat»** (fins a 24 mesos), els mesos triats; amb **«Mes»** o **«Trimestre»**, els 12 mesos fins al final del període. Tres vistes: **«Sense fiances»**, **«Amb fiances»** (la fiança ratllada sobre cada barra; la línia del benefici no canvia) i **«Només fiances»**. |
| **Taula anual** (només amb **«Any»**) | Columnes **«Mes»**, **«Ingressos»**, **«Despeses»**, **«Benefici»**, **«Fiances rebudes»**, **«Fiances pagades»** i fila **«TOTAL»**. Cada mes es calcula com el Balanç d'aquell mes. |
| **«En què se'n va»** | Despeses per categoria (personal inclòs). Part plena = despesa real; part **ratllada** = fiança pagada. Botons **«Tot»**, **«Sense fiances»**, **«Només fiances»**. A sota: «Despeses sense fiances», «Fiances pagades» i **«Total amb fiances»**. |
| **«Com t'han pagat»** | Ingressos per mètode de cobrament. Part ratllada = fiança rebuda (s'ha de tornar). A sota: «Ingressos sense fiances», «Fiances rebudes» i **«Total amb fiances»**. |
| **«Ocupació»** | Nits ocupades ÷ nits possibles (habitacions × dies). Només compta des del primer dia que l'hostal va tenir estades. Una habitació compta com a molt una vegada per nit; el dia de sortida no és nit. |
| **«Preu mitjà per nit»** | Cobraments d'**allotjament** del període (sense taxa turística ni extres) ÷ nits ocupades. |
| **«Cost per nit ocupada»** | Despeses del període (personal inclòs) ÷ nits ocupades. |
| **«Benefici per nit ocupada»** | Preu mitjà per nit − cost per nit. |
| **«Durada mitjana de l'estada»** | Nits de mitjana de les estades que toquen el període. |
| **«Moviments»** | Llista de tot el que ha passat: cobraments, fiances retingudes, fiances en custòdia, despeses, jornades de personal (amb «(pendent de pagar)» si no s'ha pagat) i fiances pagades. Filtres **«Ingressos»**, **«Despeses»**, **«Fiances»**, **«Tot»**. Columnes **«Data»**, **«Concepte»**, **«Mètode»**, **«Import»** i, a baix, **«Total (n)»**. Si cliques el concepte, vas a l'estada o a la pàgina de despeses. |

[FOTO id=balanc-cascada ruta=/balanc descripcio="Gràfic en escala Del benefici a la caixa amb les set barres" marques="Benefici real|+ Fiances rebudes|Benefici total|− Fiances pagades|Moviment de caixa"]

[FOTO id=balanc-mes-a-mes ruta=/balanc descripcio="Gràfic Mes a mes amb els tres botons de vista i, a sota, la taula anual quan el període és Any" marques="Sense fiances|Amb fiances|Només fiances|TOTAL"]

[FOTO id=balanc-categories-metodes ruta=/balanc descripcio="Targetes En què se'n va i Com t'han pagat, amb barres plenes i ratllades i els totals a sota" marques="En què se'n va|Com t'han pagat|Tot|Total amb fiances"]

[FOTO id=balanc-indicadors-moviments ruta=/balanc descripcio="Targeta Indicadors de l'hostal amb els cinc indicadors i, a sota, la llista Moviments amb els filtres" marques="Ocupació|Preu mitjà per nit|Cost per nit ocupada|Benefici per nit ocupada|Durada mitjana de l'estada|Moviments"]

**Què passa després / d'on surten les dades:** el **«Benefici real»** és el que compta per a Hisenda (sense fiances). El **«Benefici total»** és el benefici real **+ fiança rebuda**: et diu quants diners tens a la mà, però una part no és teva. El **«Moviment de caixa»** et diu quant ha canviat el que tens al banc i a la caixa durant el període.

**Per què es fa així:** separar "el que he guanyat" de "els diners que tinc" evita sorpreses: un mes amb moltes fiances rebudes pot semblar molt bo, però aquells diners s'hauran de tornar.

**Si t'has equivocat:** si un cobrament surt al mes que no toca, revisa la data del cobrament o el repartiment per períodes a l'estada. Si una despesa surt com a despesa i era una fiança, marca-la com a fiança a **Despeses** (vegeu més avall).

**Compte!**
- El **CSV** inclou els totals, les fiances (si no tens vista restringida), els ingressos per mètode, les despeses per categoria i la sèrie mes a mes. Les columnes es separen amb punt i coma.
- El **PDF** només es pot fer per a un **mes** o un **any** sencer.
- El Balanç fa servir les **dates dels cobraments**, no les de les factures. Per això el Balanç i el llibre d'IVA (que va per factures) poden donar xifres diferents per al mateix trimestre.
- El personal del Balanç compta les **jornades**. Mira els DUBTES sobre les nòmines.

---

## Com afegeixo una despesa

**Per a què serveix:** apuntar qualsevol cosa que pagues (compra, factura de llum, reparació, tiquet del súper…) perquè compti al Balanç, al llibre d'IVA i als impostos.

**On és:** menú **Gestió → Despeses** (adreça `/gastos`), pestanya **«Variables»**.

**Pas a pas:**

1. Entra a **Despeses** i prem el botó **«Nova despesa»** (a la dreta). S'obre el formulari.
2. **«Data»**: el dia de la factura o del tiquet (per defecte, avui).
3. **«Import €»**: el **total que has pagat**, IVA inclòs (i, si hi ha retenció, el que has pagat de veritat). És obligatori i no pot ser 0.
4. **«Categoria»**: tria de quin tipus és (Neteja, Manteniment, Electricitat, Aigua, Internet, Assegurances, Màrqueting, Personal, Mobiliari, Electrodomèstics, Reformes, Animals, Altres…). És obligatòria. La categoria decideix a quina **columna del Libro de gastos** anirà (vegeu la taula del llibre d'IVA).
5. **«Proveïdor»**: tria'l de la llista si ja existeix. Si l'has fet servir abans, l'app t'omple sola la categoria, el % d'IVA, el % d'IRPF i el mètode de pagament de l'última vegada (només els camps que encara estan buits).
6. **«Habitació»**: deixa **«General»** si no és d'una habitació concreta.
7. **«Mètode de pagament»**: Efectiu, Targeta, Transferència, Bizum o Altres.
8. **«Nº factura»**: el **número de factura del proveïdor** (el que surt a la seva factura). Serveix per al llibre d'IVA i per detectar factures repetides.
9. **«Base imposable €»** i **«% IVA»**: el preu sense IVA i el tipus. Si la factura només té un tipus d'IVA, n'hi ha prou amb una línia. Si en té més d'un, mira «Com desglosso l'IVA…». A sota surt la comprovació «Bases + IVA = …» i, si no quadra amb l'import, l'avís en taronja «no quadra amb el total».
10. **«% IRPF»**: deixa-ho **buit** si no hi ha retenció. Només per al lloguer del local o serveis professionals amb retenció.
11. **«Adjunt (factura/ticket)»**: **«Fer foto»** (càmera del mòbil o tauleta) o **«Pujar fitxer»** (imatge o PDF). En triar-lo, l'app el llegeix sola i t'omple els camps (vegeu la secció de l'escàner).
12. **«Descripció»**: què has comprat (obligatòria).
13. Deixa **desmarcada** la casella **«És una fiança»**, llevat que sigui una fiança (vegeu la secció de fiances).
14. Prem **«Desar despesa»**.

[FOTO id=despesa-formulari ruta=/gastos?tab=variables descripcio="Formulari de Nova despesa obert amb tots els camps" marques="Nova despesa|Data|Import €|Categoria|Proveïdor|Habitació|Mètode de pagament|Nº factura|Base imposable €|% IVA|% IRPF|Adjunt (factura/ticket)|Descripció|És una fiança|Desar despesa"]

**Què passa després / d'on surten les dades:**
- La despesa surt a la llista de **«Variables»**, amb data, descripció, categoria, habitació, proveïdor, mètode i import.
- Si la data cau fora del període que estaves mirant, l'app **amplia sola el període** perquè la vegis.
- Compta a la **«Despesa real del període»**, al **Balanç** (casella «Despeses»), al **llibre d'IVA** del seu trimestre (fulls «Facturas recibidas» i «Libro de gastos») i als models **303** i **130** de la pàgina **Impostos**.

**Per què es fa així:** apuntant-la una sola vegada, amb la base i l'IVA ben posats, ja serveix per a tot: el teu control, la gestoria i Hisenda.

**Si t'has equivocat:**
- Si falta l'import, surt «Cal indicar l’import.»; si falta la categoria, «Cal triar una categoria abans de desar.»; si falta la descripció, «Cal una descripció.»
- Si ja l'havies desat, corregeix-la amb el llapis (vegeu «Com corregeixo o esborro una despesa»).

**Compte!**
- Si **no poses la base imposable**, el llibre d'IVA suposarà que l'import porta un **IVA del 21 % inclòs** (base = import ÷ 1,21). Si era al 10 % o sense IVA, posa-ho bé.
- Les categories **Assegurances**, **Impostos**, **Autònoms** i **Seguretat Social** es tracten com a **sense IVA**: si no hi poses base, tot l'import compta com a base al 0 %.
- **Factura repetida:** si l'app creu que ja l'havies pujat (mateix número de factura i proveïdor, o mateix import i mateix dia), surt l'avís **«Sembla que aquesta factura ja està pujada»** amb la llista de les que coincideixen. Pots prémer **«Veure-la»** per anar-hi, o **«Desar igualment»** si de veritat són dues (p. ex. dos tiquets iguals el mateix dia).

---

## Com faig que l'app llegeixi la factura sola (escàner)

**Per a què serveix:** estalviar-te d'escriure. Fas una foto del tiquet o puges el PDF i l'app proposa les dades.

**On és:** **Despeses → «Nova despesa»**, camp **«Adjunt (factura/ticket)»**.

**Pas a pas:**

1. Prem **«Nova despesa»**.
2. Al camp **«Adjunt (factura/ticket)»**, prem **«Fer foto»** (amb el mòbil o la tauleta) o **«Pujar fitxer»**.
3. Mentre llegeix, surt **«Llegint el tiquet…»**.
4. L'app omple, si les troba: data, import, número de factura, base i % d'IVA (o diverses línies si n'hi ha de diversos tipus), % d'IRPF, descripció i categoria (només si encara no n'havies triat cap; si no la reconeix, posa «Altres»).
5. Si el proveïdor ja existeix, el tria sol. Si és nou, surt un requadre **«Proveïdor nou detectat — revisa’l i edita’l si cal (es crearà en desar)»** amb **«Nom del proveïdor»**, **«NIF/CIF»**, **«Activitat»**, **«Telèfon»**, **«E-mail»**, **«Web»** i **«Adreça»**. Revisa-ho; o tria'n un d'existent a la llista **«Proveïdor»**.
6. Si hi ha coses dubtoses, surt **«Revisa les dades llegides:»** amb la llista d'avisos.
7. **Revisa-ho tot** i prem **«Desar despesa»**.

[FOTO id=despesa-escaner ruta=/gastos?tab=variables descripcio="Camp Adjunt del formulari Nova despesa amb els dos botons per fer la foto o pujar el fitxer que l'app llegirà" marques="Adjunt (factura/ticket)|Fer foto|Pujar fitxer"]

**Què passa després / d'on surten les dades:** en desar, si hi havia un proveïdor nou, l'app el **busca** (pel NIF o pel nom) i, si no existeix, el **crea** amb les dades del requadre. Així la despesa surt al llibre d'IVA amb el **NIF** del proveïdor. El fitxer queda **adjuntat** a la despesa (icona del clip a la llista).

**Per què es fa així:** el llibre d'IVA de la gestoria demana NIF, nom del proveïdor, número de factura, base i IVA. Si els treu l'app de la foto, t'equivoques menys.

**Si t'has equivocat:** pots canviar qualsevol camp abans de desar. Per treure el fitxer, prem la **×** al costat del nom. Si l'escàner falla, surt «No s’ha pogut escanejar el fitxer… Omple les dades a mà.»

**Compte!** L'escàner és una ajuda, **no** és infal·lible. Mira sempre l'import, el % d'IVA i el NIF abans de desar.

---

## Com desglosso l'IVA d'una factura amb diversos tipus

**Per a què serveix:** algunes factures porten més d'un IVA alhora (l'aigua: una part al 10 %, una altra al 21 % i el cànon sense IVA; el súper: 4 %, 10 % i 21 %). Cal apuntar cada part amb el seu tipus perquè el llibre d'IVA i el model 303 surtin bé.

**On és:** formulari de despesa (nova o editant-la), bloc **«Base imposable €»** / **«% IVA»**.

**Pas a pas:**

1. Al formulari, omple la primera línia amb la **base** i el **%** del primer tipus d'IVA.
2. Prem **«Afegir un altre tipus d’IVA»**. Apareix una línia nova.
3. Omple-la amb la base i el % del segon tipus. Repeteix-ho per a cada tipus.
4. Per a la part **sense IVA** (p. ex. el cànon de l'aigua), posa el seu import com a base i **0** com a %.
5. Mira la comprovació de sota: «Bases + IVA = …». Ha de coincidir amb **«Import €»** (es tolera una diferència de 2 cèntims). Si no, surt «no quadra amb el total».
6. Per treure una línia, prem la **×** de la dreta.
7. Desa.

[FOTO id=despesa-linies-iva ruta=/gastos?tab=variables descripcio="Factura de l'aigua oberta amb el llapis: bloc de línies d'IVA amb una línia al 10 % i una altra al 21 %, el botó per afegir-ne més i la comprovació a sota" marques="Base imposable €|% IVA|Afegir un altre tipus d’IVA|Bases + IVA"]

**Què passa després / d'on surten les dades:**
- Amb **una sola línia**, l'app guarda la base i el %.
- Amb **dues o més línies**, guarda el **desglossament** (i la suma de bases).
- Al full **«Facturas recibidas»**, la factura surt en **una fila per cada tipus d'IVA**, amb el mateix número de factura.
- Al **«Libro de gastos»**, les bases amb IVA van a la columna de la categoria, la part al 0 % va a **«Otros gastos sin IVA»** i l'IVA es reparteix a **«IVA 5%»**, **«IVA 10%»** i **«IVA 21%»**.

**Per què es fa així:** Hisenda vol saber quanta base hi ha de cada tipus; si ho poses tot al 21 %, l'IVA que et desgraves sortiria malament.

**Si t'has equivocat:** edita la despesa i corregeix les línies. Si deixes una sola línia, el desglossament antic s'esborra.

**Compte!** Les línies sense base no compten. Una línia amb base i sense % compta com a 0 %.

---

## Com apunto el lloguer del local (amb retenció d'IRPF)

**Per a què serveix:** el lloguer d'un local de negoci sovint porta **IVA** (21 %) i una **retenció d'IRPF** (normalment 19 %) que tu has de pagar a Hisenda en nom de la propietària (model 115).

**On és:** **Despeses → «Nova despesa»**.

**Pas a pas:**

1. **«Import €»**: el que pagues de veritat a la propietària = base + IVA − retenció. Exemple: base 1.000 €, IVA 21 % = 210 €, retenció 19 % = 190 € → import **1.020 €**.
2. **«Base imposable €»**: 1.000. **«% IVA»**: 21.
3. **«% IRPF»**: 19.
4. Comprova que a sota surt «Bases + IVA − IRPF = 1.020,00 €».
5. **«Proveïdor»**: la propietària, **amb el seu NIF** a la fitxa (és obligatori al model 180).
6. Desa.

**Què passa després / d'on surten les dades:**
- Al full **«Facturas recibidas»** surt amb **«% IRPF»** i **«IRPF»** omplerts.
- A la pàgina **Impostos**, la retenció va al **model 115** del trimestre i al **model 180** de l'any (amb el nom i NIF de la propietària).

**Per què es fa així:** la retenció no és un cost més: és un diner que et quedes per pagar-lo a Hisenda.

**Si t'has equivocat:** edita la despesa i corregeix el % o la base.

**Compte!**
- Si el lloguer és cada mes igual, el pots donar d'alta com a **servei recurrent** (vegeu més avall).
- A la pàgina **Impostos** (model 180) cal la **referència cadastral** del local.

---

## Com adjunto o canvio el justificant d'una despesa

**Per a què serveix:** guardar la foto o el PDF de la factura amb la despesa, per si la gestoria o Hisenda la demanen.

**On és:** **Despeses → «Variables»**, en crear la despesa (camp **«Adjunt (factura/ticket)»**) o editant-la.

**Pas a pas:**

1. Per a una despesa nova: **«Fer foto»** o **«Pujar fitxer»** abans de desar.
2. Per a una despesa que ja existeix: prem el **llapis** (**«Editar despesa»**). Al camp **«Adjunt (factura/ticket)»**:
   - si ja en té, surt **«Veure la factura»** i el botó **«Substituir»**;
   - si no en té, surt «Sense adjunt» i el botó **«Afegir»**.
3. Tria el fitxer. Surt «Nou: nom-del-fitxer». Si t'has equivocat de fitxer, **«Desfer»**.
4. Prem **«Desar»**.
5. A la llista, la icona del **clip** al costat de la descripció obre el justificant.

[FOTO id=despesa-adjunt-editar ruta=/gastos?tab=variables descripcio="Fila d'una despesa en mode edició amb el bloc d'adjunt; aquesta encara no en té, i per això surt «Sense adjunt» i el botó Afegir (si en tingués, sortiria «Veure la factura» i «Substituir»)" marques="Adjunt (factura/ticket)|Sense adjunt|Afegir|Desar"]

**Què passa després / d'on surten les dades:** les imatges es redueixen abans de pujar-les. El fitxer queda lligat a la despesa.

**Per què es fa així:** tenir el justificant al costat de la xifra evita buscar papers quan la gestoria pregunta.

**Si t'has equivocat:** torna a editar i prem **«Substituir»** amb el fitxer bo.

**Compte!** En editar, l'app **no** torna a llegir el fitxer: si canvies la factura, revisa tu els imports.

---

## Com apunto una fiança que pago jo (despesa com a fiança)

**Per a què serveix:** de vegades pagues diners que **et tornaran** (la fiança del lloguer, un dipòsit a un proveïdor, el dipòsit d'un comptador…). Surten del banc, però **no són una despesa**: no et fan més pobra, només els tens "deixats".

**On és:** **Despeses → «Nova despesa»** (casella **«És una fiança»**), o a la llista amb la icona de l'escut. També en registrar la factura d'un servei.

**Pas a pas (despesa nova):**

1. Omple la despesa com sempre (data, import, categoria, proveïdor, descripció).
2. Marca la casella **«És una fiança»** (requadre taronja: «No es comptarà com a despesa al balanç. Quan la vulguis declarar, desmarca-la (passa a despesa real).»).
3. Prem **«Desar despesa»**.

**Pas a pas (una despesa que ja existeix):**

1. A la llista de **«Variables»**, prem la icona de l'**escut** de la fila (títol «Marcar com a fiança/dipòsit (no comptarà al balanç)»).
2. Confirma el missatge «Marcar com a fiança/dipòsit? No comptarà al balanç.»
3. Per desfer-ho (quan deixa de ser fiança, p. ex. perquè no te la tornaran), prem l'escut ratllat («Marcar com a despesa real (comptarà al balanç)») i confirma «Marcar com a despesa real? Comptarà al balanç.»

[FOTO id=despesa-fianca ruta=/gastos?tab=variables descripcio="Llista de despeses de l'any amb una fila marcada com a fiança (fons crema, etiqueta Fiança, import en taronja), la icona de l'escut ratllat per desfer-ho i el total amb les fiances a part" marques="Fiança|Marcar com a despesa real (comptarà al balanç)|fiances a part"]

**Què passa després / d'on surten les dades:** una despesa marcada com a fiança:
- **no compta** a la «Despesa real del període» ni al total de la llista (surt «(fiances a part: …)» al costat de **«Total variables»**);
- surt a la casella **«Fiances pagades»** de Despeses («fora del total · recuperables») i al bloc **«Fiances (a part)»** de la pestanya **«Resum»**;
- al **Balanç**, **no** compta a «Despeses» ni al «Benefici»: surt a la casella **«Pagades»** del bloc «Fiances», ratllada a «En què se'n va», i als moviments com «… · fiança pagada»;
- **no surt mai al llibre d'IVA** (ni a «Facturas recibidas», ni al «Libro de gastos»), **ni tan sols** si el llibre ja s'havia desat abans de marcar-la: l'app la treu en obrir-lo;
- **no compta** als models 303, 130 ni a la renda.

**Per què es fa així:** una fiança no és un cost de l'activitat; si la declaressis com a despesa, pagaries menys impostos dels que toca, i quan te la tornessin no quadraria.

**Si t'has equivocat:** fes servir l'escut per canviar-la d'un estat a l'altre tantes vegades com calgui.

**Compte!**
- Si **no te la tornen** (o només una part), desmarca-la (o corregeix l'import) perquè passi a ser **despesa real**.
- La fiança que **et dona un client** no es fa aquí: va a l'estada, com a dipòsit.

---

## Com apunto un abonament del proveïdor (despesa negativa)

**Per a què serveix:** quan un proveïdor et torna diners o et fa una **factura rectificativa** (un "abonament"), cal restar-ho de les despeses.

**On és:** **Despeses → «Nova despesa»**.

**Pas a pas:**

1. **«Import €»**: posa l'import **en negatiu**, amb el signe menys (p. ex. **-24,20**).
2. **«Base imposable €»**: també **en negatiu** (p. ex. **-20**). **«% IVA»**: el mateix que la factura original (p. ex. 21).
3. **«Proveïdor»**: el mateix de la factura original.
4. **«Nº factura»**: el número de l'abonament.
5. **«Descripció»**: p. ex. «Abonament factura 123».
6. Desa.

**Què passa després / d'on surten les dades:** la despesa negativa **resta** del total de despeses, del Balanç, del llibre d'IVA (base i IVA negatius) i de l'IVA suportat del model 303.

**Per què es fa així:** és la manera de reflectir que, al final, has gastat menys.

**Si t'has equivocat:** edita-la i corregeix el signe o l'import.

**Compte!** L'import **no pot ser 0**. El % d'IVA i el % d'IRPF sempre són positius; només van en negatiu l'import i la base.

---

## Com corregeixo o esborro una despesa

**Per a què serveix:** arreglar una despesa mal apuntada o treure'n una de repetida.

**On és:** **Despeses → «Variables»**, a la fila de la despesa.

**Pas a pas (corregir):**

1. Busca la despesa (canvia el període si cal, o clica una pastilla de categoria per filtrar; **«Treure el filtre»** per veure-ho tot).
2. Prem el **llapis** («Editar despesa»). S'obre a sota amb tots els camps: **«Data»**, **«Import €»**, **«Categoria»**, **«Proveïdor»**, **«Habitació»**, **«Mètode de pagament»**, **«Núm. factura (proveïdor)»**, **«Descripció»**, les línies d'IVA, **«% IRPF»** i l'adjunt.
3. Si la despesa té proveïdor, surt també el requadre **«Dades del proveïdor»** («es desen a la seva fitxa (valen per a totes les seves despeses)»): **«NIF/CIF»**, **«Activitat»**, **«Telèfon»**, **«E-mail»**, **«Web»**, **«Adreça»**.
4. Prem **«Desar»** (o **«Cancel·lar»**).

**Pas a pas (esborrar):**

1. Prem la **paperera** de la fila.
2. Confirma «Segur que vols eliminar aquesta despesa?».

[FOTO id=despesa-llista-accions ruta=/gastos?tab=variables descripcio="Llista de despeses variables amb les pastilles de categoria a dalt, les icones de llapis, escut i paperera a cada fila i la fila de total" marques="Treure el filtre|Editar despesa|Total variables"]

**Què passa després / d'on surten les dades:** el canvi es veu de seguida al Balanç, al llibre d'IVA **generat** i a Impostos. Si canvies dades del proveïdor, canvien per a **totes** les seves despeses. Esborrar no destrueix la dada: queda marcada com a esborrada i ja no compta enlloc.

**Per què es fa així:** la fitxa del proveïdor és una de sola; el NIF que hi posis és el que sortirà a tots els llibres.

**Si t'has equivocat:** si has esborrat una despesa per error, des de la pantalla no es pot recuperar: torna-la a crear (o demana-ho a qui mantingui l'app).

**Compte!**
- Si el llibre d'IVA d'aquell trimestre **ja estava desat**, els canvis **no** hi entren sols (vegeu «Versió desada i versió generada»).
- En editar també salta l'avís de factura repetida.

---

## Com miro el resum de despeses (Resum, Variables, Personal)

**Per a què serveix:** saber quant has gastat en un període, en què, i com evoluciona l'any.

**On és:** menú **Gestió → Despeses**.

**Pas a pas:**

1. A dalt, tria el període (**«Mes»**, **«Trimestre»**, **«Any»**, **«Personalitzat»**). Aquí, a **«Personalitzat»**, també hi ha el botó **«Tot»** (des de sempre fins avui). El període **mana sobre les tres pestanyes**.
2. Mira la franja de caselles:
   - **«Despesa real del període»**: el total, amb la comparació amb el període anterior (vermell si puja, verd si baixa);
   - **«Variables»**: les despeses apuntades (nombre de despeses a sota);
   - **«Personal»**: nòmines, neteja i bugaderia (a sota, «pendent de pagar …» o «tot pagat»);
   - **«Fiances pagades»**: a part, «fora del total · recuperables».
3. Pestanya **«Resum»**:
   - gràfic **«Com ha anat l'any»**: una barra per mes (granat = variables, taronja = personal). Botons **«Sense fiances»**, **«Amb fiances»**, **«Només fiances»**. Si cliques una barra, el període passa a ser aquell mes;
   - **«En què se'n va»**: per categoria, amb el % de cada una. Si en cliques una, vas a la pestanya d'on ve la major part (Variables filtrada per aquella categoria, o Personal);
   - **«Fiances (a part)»**: les fiances pagades per proveïdor.
4. Pestanya **«Variables»**: la llista de despeses (vegeu les seccions anteriors).
5. Pestanya **«Personal»**: una fila per persona amb **«Nòmines»**, **«Neteja»**, **«Bugaderia»**, **«Total»** i **«Pagat / pendent»**, botó **«Obrir fitxa»** i el **«Total personal al període»**.

[FOTO id=despeses-resum ruta=/gastos descripcio="Pàgina Despeses amb el període Any: la franja de totals, les pestanyes, el gràfic Com ha anat l'any i, més avall, En què se'n va i Fiances (a part)" marques="Despesa real del període|Variables|Personal|Fiances pagades|Resum|Com ha anat l'any|En què se'n va|Fiances (a part)"]

[FOTO id=despeses-personal ruta=/gastos?tab=personal descripcio="Pestanya Personal amb la taula de persones i el total" marques="Nòmines|Bugaderia|Pagat / pendent|Obrir fitxa|Total personal al període"]

**Què passa després / d'on surten les dades:**
- **Variables** = totes les despeses (també les que ha creat un servei recurrent), sense fiances.
- **Personal** = **nòmines** + **jornades de neteja** + **bugaderia** del període. Una nòmina compta **l'últim dia del seu mes**, així que només entra si el període cobreix el mes sencer.
- **Despesa real del període** = Variables + Personal. Les fiances, fora.

**Per què es fa així:** veure el total partit en les peces que el formen ajuda a saber on retallar.

**Si t'has equivocat:** les xifres es corregeixen a l'origen (la despesa, la nòmina, la jornada).

**Compte!** El **«Personal»** d'aquí inclou nòmines i bugaderia; el del **Balanç** només jornades. Per això les dues pàgines poden donar despeses diferents (vegeu DUBTES).

---

## Com gestiono els proveïdors

**Per a què serveix:** tenir una fitxa de cada proveïdor amb el **NIF** (imprescindible per al llibre d'IVA) i les dades de contacte.

**On és:** menú **Gestió → Proveïdors i serveis** (adreça `/serveis`), a la part de baix, **«Proveïdors · N»**.

**Pas a pas:**

1. Baixa fins a **«Proveïdors»** i prem **«Nou proveïdor»**.
2. Omple **«Nom»** (obligatori), **«Activitat»**, **«Telèfon»**, **«E-mail»**, **«Adreça»**, **«Web»**, **«CIF/NIF»** i **«Notes»**.
3. Prem **«Desar proveïdor»**.
4. Per canviar-lo: llapis (**«Editar»**) a la seva targeta → **«Desar canvis»**.
5. Per esborrar-lo: paperera (**«Eliminar»**) i confirma «Eliminar el proveïdor "…"?».

[FOTO id=proveidors-llista ruta=/serveis descripcio="Part de baix de Proveïdors i serveis amb les targetes de proveïdors i el formulari Nou proveïdor obert" marques="Nou proveïdor|Nom|CIF/NIF|Desar proveïdor"]

**Què passa després / d'on surten les dades:** el proveïdor surt a la llista **«Proveïdor»** de les despeses i dels serveis. El seu **CIF/NIF** és el que surt a la columna **«NIF»** de «Facturas recibidas» i del «Libro de gastos». El telèfon i l'email es poden clicar per trucar o escriure.

**Per què es fa així:** la gestoria no pot deduir l'IVA d'una factura sense el NIF del proveïdor.

**Si t'has equivocat:** edita'l. Els canvis valen per a totes les seves despeses.

**Compte!** També pots crear proveïdors **des de l'escàner** de despeses i canviar-ne les dades **des d'una despesa** (requadre «Dades del proveïdor»).

---

## Com dono d'alta un servei que es repeteix (i què fa l'app sola)

**Per a què serveix:** apuntar una sola vegada les coses que es paguen o es revisen cada cert temps (assegurança, extintors, sistema contra incendis, LOPD, lloguer, llum…). L'app te'n recorda i, si vols, crea la despesa sola.

**On és:** menú **Gestió → Proveïdors i serveis**, part de dalt.

**Pas a pas:**

1. Prem **«Nou servei»** (a dalt a la dreta). S'obre **«Nou servei recurrent»**.
2. **«Activitat / servei»** (obligatori): p. ex. «Sistema de protecció contra incendi».
3. **«Proveïdor»**: tria'l de la llista.
4. **«Freqüència»** (obligatori): «Mensual», «Bimestral (cada 2 mesos)», «Trimestral (cada 3 mesos)», «Semestral (cada 6 mesos)», «Anual (1 cop a l’any)», «Cada 2 anys» o «Puntual (un sol cop)».
5. **«Propera data (visita/renovació/pagament)»** (obligatori).
6. **«Import previst €»**: el que costa cada vegada (total).
7. **«Mètode de pagament»**.
8. **«Categoria de despesa»**: si no en tries cap, va a «Serveis i manteniments».
9. **«Vigència — des de»** i **«Vigència — fins a»**: per a contractes o assegurances amb data de caducitat.
10. **«Observacions»**.
11. Casella **«Generar la despesa automàticament cada cop que venci (es comptabilitza l’import previst)»**: marca-la si l'import és sempre igual i vols que l'app creï la despesa sola. Si la deixes desmarcada (opció per defecte), el servei és **només un recordatori** i la despesa l'entres tu en arribar la factura.
12. Casella **«És una despesa fixa (apareix també a «Despeses fixes»)»**.
13. Prem **«Desar servei»**.

[FOTO id=servei-formulari ruta=/serveis descripcio="Formulari Nou servei recurrent amb tots els camps i les dues caselles" marques="Nou servei|Activitat / servei|Freqüència|Propera data (visita/renovació/pagament)|Import previst €|Categoria de despesa|Generar la despesa automàticament cada cop que venci (es comptabilitza l’import previst)|És una despesa fixa (apareix també a «Despeses fixes»)|Desar servei"]

[FOTO id=servei-llista ruta=/serveis descripcio="Taula Serveis i manteniments amb la propera data de cada servei (en vermell si ja ha vençut) i les icones de cada fila" marques="Serveis i manteniments|Registrar la factura (crea la despesa)|Pausar|Editar|Eliminar"]

**Què passa després / d'on surten les dades:**
- El servei surt a la taula **«Serveis i manteniments · N actius»** amb **«Activitat»**, **«Proveïdor»**, **«Freqüència»**, **«Propera»** (vermell si ja ha vençut) i **«Import»**.
- Al **Tauler** surten els serveis amb data dins els propers 30 dies i les **vigències** que caduquen en els propers 90 dies. Els serveis "només recordatori" avisen **3 dies abans** perquè pugis la factura.
- **Si has marcat «Generar la despesa automàticament…»:** cada dia, a primera hora (sobre les 6:30 h UTC), un procés automàtic (el **cron**) mira quins serveis han vençut i, per a cadascun, **crea la despesa** («Servei: …», amb la data que tocava, l'import previst, el proveïdor, la categoria i el mètode) i **avança la propera data** un període. Si feia mesos que no s'executava, crea totes les que falten, una per període. Els **puntuals** creen una sola despesa i el servei es desactiva. El mateix es fa també quan algú obre el **Tauler**. Està fet perquè **mai dupliqui** una despesa encara que s'executi dues vegades alhora.
- Si l'import previst és 0 o està buit, la data avança però **no** es crea cap despesa.

**Per què es fa així:** així no se t'escapa cap renovació ni cap pagament fix, i les despeses repetitives no s'han d'escriure cada mes.

**Si t'has equivocat:**
- Llapis (**«Editar»**) → **«Desar canvis»**.
- Per aturar-lo una temporada: **«Pausar»** (la fila es veu més clara amb «(pausat)»); per tornar-lo a engegar, **«Activar»**.
- Per treure'l: **«Eliminar»** i confirma «Eliminar el servei "…"?». Les despeses ja creades no s'esborren.
- Si el cron ha creat una despesa amb un import que no era, corregeix-la a **Despeses**.

**Compte!**
- La despesa automàtica fa servir l'**import previst**, no el de la factura real. Si la factura varia (llum, aigua), és millor **no** marcar la generació automàtica i registrar cada factura.
- Al formulari **no** hi ha camps per a la base, l'IVA o l'IRPF del servei: les despeses automàtiques porten els que tingui guardats el servei (si no en té, el llibre d'IVA suposarà un 21 % inclòs).
- En editar un servei, la **categoria** surt buida al formulari; revisa-la abans de desar (vegeu DUBTES).

---

## Com registro la factura d'un servei

**Per a què serveix:** quan arriba la factura real d'un servei (sobretot els que són "només recordatori"), crear-ne la despesa en un moment i fer avançar la data del servei.

**On és:** **Proveïdors i serveis**, icona del **rebut** a la fila del servei.

**Pas a pas:**

1. A la fila del servei, prem la icona **«Registrar la factura (crea la despesa)»** (surt en verd si el servei ja ha vençut).
2. S'obre la finestra **«Registrar factura · …»**.
3. **«Foto de la factura (opcional)»** → **«Pujar factura»**. Si és una imatge, l'app llegeix l'import i la data («Llegint…»).
4. Revisa **«Data»** i **«Import €»** (obligatori; per defecte, l'import previst).
5. **«Mètode de pagament»**.
6. Si és una fiança, marca **«És una fiança»** («Recuperable: no compta com a despesa al balanç.»).
7. Prem **«Registrar factura»**.

[FOTO id=servei-registrar-factura ruta=/serveis descripcio="Finestra Registrar factura d'un servei amb el botó per pujar la foto, la data, l'import, el mètode i la casella de fiança" marques="Registrar factura|Pujar factura|Import €|És una fiança"]

**Què passa després / d'on surten les dades:** es crea una despesa «Servei: …» amb la data i l'import que has posat, el proveïdor i la categoria del servei, i el justificant adjuntat. La **propera data** del servei avança un període (o el servei es desactiva si era puntual).

**Per què es fa així:** és la via més ràpida per tenir la factura real al llibre d'IVA sense omplir el formulari sencer de despeses.

**Si t'has equivocat:** corregeix la despesa a **Despeses** (llapis) i, si cal, la data del servei editant-lo.

**Compte!** Aquesta finestra **no** demana número de factura, base ni % d'IVA. Si la factura no és al 21 % o la vols amb número, completa-la després a **Despeses**.

---

## Despeses fixes (`/gastos-fixos`)

**Per a què serveix:** una pantalla pensada per a les despeses periòdiques "fixes" (lloguer, llum, assegurances) amb una previsió dels propers 6 mesos.

**On és:** adreça `/gastos-fixos`. **No** surt al menú ni a les pestanyes: s'hi ha d'entrar escrivint l'adreça.

**Pas a pas:**

1. Entra a `/gastos-fixos`. Títol «Gastos fixos».
2. Veuràs una targeta per cada servei marcat com a **«És una despesa fixa»** a Proveïdors i serveis, amb l'import previst, l'estat («Al dia», «Vença aviat» si falten 7 dies o menys, «Vençut»), **«Propera data»**, **«Pagament»** i **«Darrers pagaments»**.
3. A baix, **«Proxims 6 mesos»**: què toca pagar cada mes.
4. Botó **«+ Nou gasto fix»**: crea un servei fix (camps «Activitat», «Frequencia», «Import previst (EUR)», «Metode de pagament», «Propera data», «Observacions»), que queda en mode recordatori.

[FOTO id=gastos-fixos ruta=/gastos-fixos descripcio="Pantalla Gastos fixos amb les targetes i la previsió Proxims 6 mesos" marques="Gastos fixos|+ Nou gasto fix|Registrar pagament|Editar|Proxims 6 mesos"]

**Què passa després / d'on surten les dades:** les targetes surten dels **serveis recurrents** amb la marca «despesa fixa». Els "darrers pagaments" són les despeses lligades a aquell servei.

**Per què es fa així:** veure de cop els compromisos fixos ajuda a preveure la tresoreria.

**Si t'has equivocat:** fes els canvis des de **Proveïdors i serveis**, que és la pantalla principal.

**Compte!** En aquesta versió, els botons **«Registrar pagament»** i **«Editar»** d'aquesta pantalla criden adreces del servidor que **no existeixen**: probablement donaran «Error registrant el pagament» o «Error actualitzant el gasto fix». Fes servir **Proveïdors i serveis → «Registrar la factura»** i **«Editar»** (vegeu DUBTES).

---

## Com obro el llibre d'IVA d'un trimestre

**Per a què serveix:** el **llibre d'IVA** és el quadern que demana la gestoria cada trimestre: totes les factures que has fet (ingressos) i totes les que t'han fet (despeses), amb la base, l'IVA i el resultat. L'app el prepara sol.

**On és:** hi ha dues entrades:
- **Facturació** (pestanya o menú), targeta **«Llibre d'IVA trimestral (ingressos)»** a dalt;
- **Impostos**, botó **«Obre el llibre d’IVA»** de cada trimestre.

L'adreça és `/imprimir/trimestre-ingressos/AAAA-T` (p. ex. `2026-3` per al 3r trimestre de 2026).

**Pas a pas:**

1. Entra a **Facturació**.
2. A la targeta **«Llibre d'IVA trimestral (ingressos)»**, tria el trimestre amb **‹** i **›**.
3. Prem **«Obrir / editar / imprimir»**. S'obre en una pestanya nova del navegador.
4. Si ja n'havies desat algun, a sota surt **«Llibres desats»**, amb un botó per trimestre (nom del trimestre i total). Clicant-lo s'obre aquell llibre.

[FOTO id=llibre-iva-entrada ruta=/factures descripcio="Targeta Llibre d'IVA trimestral a dalt de Facturació amb el navegador de trimestres i els llibres desats" marques="Llibre d'IVA trimestral (ingressos)|Obrir / editar / imprimir|Llibres desats"]

**Què passa després / d'on surten les dades:** s'obre un document de diversos **fulls**, un sota l'altre, amb una barra d'eines a dalt: **«+ Afegir fila»**, **«Desar»**, **«Imprimir tarifes»**, **«Imprimir PDF»** i, si està desat, l'etiqueta verda **«Desat dd/mm/aaaa»**. Els fulls són:

1. **«Tarifas y precios aplicados»** (full intern, vora groga discontínua, «Hoja interna · no se entrega»);
2. **«Facturas emitidas · Repercutidas»**;
3. **«Libro de ingresos»**;
4. **«Facturas recibidas · Soportadas»**;
5. **«Libro de gastos»**;
6. **«Liquidación de IVA · Repercutido / Soportado»**.

Cada full porta a dalt «HOSTAL COLL», «Casa de Hostes · Calella» i el trimestre (p. ex. «3º TRIMESTRE 2026»). El document està en castellà perquè és el que fa servir la gestoria.

**Per què es fa així:** és el mateix format que ja feia servir la gestoria, però omplert sol.

**Si t'has equivocat de trimestre:** tanca la pestanya i tria'n un altre.

**Compte!** No hi ha cap full amb les caselles del **model 303**: aquestes surten a la pàgina **Impostos** (vegeu més avall).

---

## Com edito, afegeixo files i deso el llibre d'IVA

**Per a què serveix:** abans de donar-lo a la gestoria, pots corregir qualsevol cel·la, afegir o treure files i guardar-ne la versió definitiva.

**On és:** dins del llibre d'IVA obert.

**Pas a pas:**

1. **Editar una cel·la:** clica-hi i escriu. Totes les cel·les dels fulls són editables. Els totals del peu es tornen a calcular sols.
2. **Afegir una factura emesa:** **«+ Afegir fila»** (a la barra de dalt o sota el full «Facturas emitidas»). La fila nova surt a «Facturas emitidas» **i també** al «Libro de ingresos».
3. **Treure una factura emesa:** **×** a la dreta de la fila (també desapareix del «Libro de ingresos»).
4. **Afegir una despesa** a «Facturas recibidas»: **«+ Afegir despesa»**. Truc per anar ràpid:
   - si escrius el **Total** i el **% IVA** (sense IRPF), l'app calcula la base (total ÷ (1 + %/100)) i l'IVA;
   - si escrius la **Base**, el **% IVA** i el **% IRPF**, calcula l'IVA, l'IRPF i el Total (base + IVA − IRPF) — és el cas del lloguer.
5. **Libro de gastos:** **«+ Afegir fila»** (sota el full) per afegir; **×** de la fila per treure-la; la **×** petita de la capçalera d'una columna l'amaga; **«Restaurar columnes»** les torna; **«Mostrar columnes buides»** / **«Amagar columnes buides»** mostra o amaga les columnes d'import que no tenen cap valor.
6. **Amplada de columnes:** arrossega la vora dreta de la capçalera.
7. **Liquidación de IVA:** les quatre caselles s'omplen soles; si n'escrius una a mà, aquella queda fixa i ja no es recalcula.
8. **Full de tarifes:** escriu les línies; **«+ Afegir línia de tarifa»**, **«+ Afegir línia»** (preus especials) i **«+ Afegir nota»**.
9. Quan estigui bé, prem **«Desar»**. El botó diu «Desant…» i després «Desat ✓», i apareix **«Desat dd/mm/aaaa»**.

[FOTO id=llibre-iva-barra-eines ruta=/imprimir/trimestre-ingressos/2026-2 descripcio="Barra d'eines d'un llibre d'IVA ja desat, amb l'etiqueta verda Desat i els quatre botons" marques="Desat|+ Afegir fila|Desar|Imprimir tarifes|Imprimir PDF"]

[FOTO id=llibre-iva-libro-gastos ruta=/imprimir/trimestre-ingressos/2026-3 descripcio="Full Libro de gastos amb moltes columnes, la × de capçalera i els botons de sota" marques="Libro de gastos|Restaurar columnes|Mostrar columnes buides"]

**Què passa després / d'on surten les dades — versió desada i versió generada:**
- **Mentre no deses**, el llibre és la **versió generada**: cada vegada que l'obres es torna a fer amb les factures i despeses que hi ha en aquell moment.
- **Quan prems «Desar»**, l'app guarda una **foto fixa** (versió desada) de: les files de factures emeses (i, per tant, del Libro de ingresos), les files de despeses, el Libro de gastos (files, columnes amagades i amplades), el full de tarifes i les caselles de la liquidació escrites a mà. A partir d'aquí, en obrir el llibre, **es carrega la versió desada**, no la generada.
- La pàgina **Impostos** també fa servir la versió desada d'aquell trimestre (hi surt l'etiqueta «versió desada (editada)»).
- Excepció: si una despesa de la versió desada s'ha marcat després com a **fiança**, l'app la treu sola.

**Per què es fa així:** un cop has donat el llibre a la gestoria, ha de quedar tal com l'has entregat, encara que després toquis alguna factura.

**Si t'has equivocat:**
- Abans de desar: tanca la pestanya sense desar i torna-la a obrir; tornarà la versió generada.
- Després de desar: corregeix la cel·la i torna a **«Desar»** (sobreescriu la versió desada).
- **No hi ha cap botó per tornar a la versió generada** un cop desat (vegeu DUBTES).

**Compte!**
- Si **després de desar** fas factures o apuntes despeses noves d'aquell trimestre, **no entraran soles** al llibre desat. Les hauràs d'afegir a mà amb «+ Afegir fila» / «+ Afegir despesa».
- El que canviïs al **Libro de gastos** **no** canvia els models d'Impostos: aquests llegeixen «Facturas emitidas» i «Facturas recibidas».
- «Facturas emitidas» i «Libro de ingresos» estan **lligats fila a fila**: canviar una cel·la d'un canvia l'altre.
- Si el trimestre encara no té tarifes desades, el full de tarifes copia les de l'últim trimestre que en tingui (fins a 2 anys enrere); si no n'hi ha cap, posa dos exemples de juny.

---

## Com imprimeixo el llibre d'IVA per a la gestoria

**Per a què serveix:** treure un PDF net per enviar o imprimir.

**On és:** dins del llibre d'IVA, botons **«Imprimir PDF»** i **«Imprimir tarifes»**.

**Pas a pas:**

1. Revisa i, si vols conservar els canvis, prem **«Desar»**.
2. Prem **«Imprimir PDF»** (botó granat). Surt «Generant…» i s'obre una pestanya amb el PDF.
3. Desa'l o imprimeix-lo des del navegador.
4. Per imprimir **només** el full intern de tarifes (per a tu), prem **«Imprimir tarifes»**: s'obre la finestra d'impressió del navegador només amb aquell full.

[FOTO id=llibre-iva-pdf ruta=/imprimir/trimestre-ingressos/2026-3 descripcio="Botó Imprimir PDF de la barra d'eines i el full Facturas emitidas, que és el primer que surt al PDF (el full de tarifes no hi surt)" marques="Facturas emitidas · Repercutidas|Imprimir PDF"]

[FOTO id=llibre-iva-full-tarifes ruta=/imprimir/trimestre-ingressos/2026-3 descripcio="Full intern Tarifas y precios aplicados amb la vora groga discontínua" marques="Hoja interna · no se entrega|Tarifas y precios aplicados|Precios especiales|Notas del trimestre|Imprimir tarifes"]

**Què passa després / d'on surten les dades:** el PDF es fa amb **el que veus a la pantalla** en aquell moment (també les cel·les editades encara no desades), en **A4 horitzontal**, un full per pàgina, sense botons ni creus. **El full de tarifes no hi surt mai** (és intern). Les columnes amagades i les columnes buides tampoc hi surten. El nom del document és «Llibre d'IVA <trimestre>».

**Per què es fa així:** la gestoria només necessita els fulls oficials; les tarifes són per a la teva referència.

**Si t'has equivocat:** corregeix i torna a prémer **«Imprimir PDF»**.

**Compte!** Si el navegador bloqueja finestres emergents, permet-les per a l'app; si no, el PDF no s'obrirà.

---

## El llibre d'IVA, columna per columna

Aquí tens, per a cada full, d'on surt cada columna. "Generat" vol dir quan el llibre encara no s'ha desat.

### Quines factures hi entren

- Només les **factures de veritat**: **factura completa** (F1) i **factura simplificada** (F2) del trimestre (per **data de la factura**), no esborrades.
- **No** hi entren els **rebuts** (*recibos*): no són factura.
- **No** hi entren els cobraments sense factura.
- Una **factura completa que agrupa simplificades** no fa fila pròpia: el seu número surt a la columna «Nº Factura F.» de cada simplificada (així l'IVA no es compta dues vegades).
- Les **rectificatives** (sèrie R…, o import negatiu) surten **just després de la factura que rectifiquen**, si és al mateix trimestre; si no, al seu lloc.
- Ordre: per número de factura.

### Full «Tarifas y precios aplicados» (intern, no s'entrega)

| Part | D'on surt |
|---|---|
| Línies de tarifa | Text lliure. Si el trimestre no en té, es copien les de l'últim trimestre desat (fins a 8 trimestres enrere); si no n'hi ha, dos exemples. |
| «Precios especiales» | Text lliure (exemple: «A … le hago precio especial de … € por …»). |
| «Notas del trimestre» | Text lliure. Si la **primera estada** de l'hostal cau dins el trimestre, hi surt sola «La actividad se inició el …». |

### Full «Facturas emitidas · Repercutidas»

| Columna | D'on surt |
|---|---|
| **Fecha** | Data de la factura (dd/mm/aaaa). |
| **Nº Factura S.** | Número de la factura **simplificada**, sense el prefix d'any intern (2026-0001 → 0001). Buit si és completa. |
| **Nº Factura F.** | Número de la factura **completa**; o, en una simplificada, el de la factura completa que la cobreix. |
| **Cliente** | El **nom escrit a la factura**; si no n'hi ha, el **titular** de l'estada; si tampoc, «—». En majúscules. Afegits: «(DEPÓSITO)» si és un document de dipòsit; «(RECTIFICA 0001)» o «(ABONO)» si és rectificativa. |
| **NIF / NIE** | **Només a les factures completes** (o simplificades cobertes per una completa): el NIF escrit a la factura; si no n'hi ha, el document del titular. La columna sencera s'amaga si no hi ha cap factura completa ni cap NIF escrit. |
| **Período de estancia** | Les dates que diu el **text de les línies** de la factura («Del dd/mm/aaaa al dd/mm/aaaa»); si no n'hi ha, entrada – sortida de l'estada. |
| **Base imponible** | Si la factura té **IVA guardat**, la base guardada. Si l'IVA guardat és **0** (cas habitual de l'allotjament), **base = total ÷ 1,10**. Sense la fiança, si la factura la porta inclosa. **0** als documents de dipòsit. |
| **% IVA** | IVA ÷ base × 100 si hi ha IVA guardat; si no, **10**. |
| **IVA** | IVA guardat; o **total − base**. |
| **Total** | Total de la factura (negatiu a les rectificatives). |
| **Depósito** | Import de la **fiança**: en un document de dipòsit, la suma dels dipòsits (o de les línies); en una factura amb la fiança sumada al total, la part de fiança. **No compta com a ingrés.** |
| Peu «Total…» | Suma de base, IVA, total i dipòsit. |

### Full «Libro de ingresos»

| Columna | D'on surt |
|---|---|
| **Fecha**, **Nº Factura S.**, **Nº Factura F.**, **Cliente** | Les mateixes de «Facturas emitidas» (lligades fila a fila). |
| **Importe** | El **Total** de «Facturas emitidas». |
| **Base imponible** | La base de «Facturas emitidas». |
| **IVA 10%** | L'IVA de «Facturas emitidas» (l'etiqueta diu 10 % sempre). |
| «Total suma…» | Sumes. |
| Resum de la dreta | «Base imponible», «IVA repercutido (10%)», **«Total ingresos»** i, si n'hi ha, «Depósitos (no computan como ingreso)». |

### Full «Facturas recibidas · Soportadas»

Entren totes les **despeses** del trimestre (per data), **excepte les marcades com a fiança** i les esborrades. Les **nòmines no hi surten**.

| Columna | D'on surt |
|---|---|
| **Fecha** | Data de la despesa. |
| **NIF** | **CIF/NIF** de la fitxa del proveïdor (buit si no en té). |
| **Proveedor** | Nom del proveïdor; si no n'hi ha, la **descripció** de la despesa. |
| **Nº factura** | El **«Nº factura»** de la despesa. |
| **Base imponible** | Per ordre: (1) si la despesa té **diverses línies d'IVA**, **una fila per línia** amb la seva base; (2) si té **base**, aquesta; (3) si la categoria és **sense IVA** (Assegurances, Impostos, Autònoms, Seguretat Social) i no hi ha base, **tot l'import** a 0 %; (4) si no, **IVA del 21 % per defecte**: base = import ÷ 1,21. |
| **% IVA** | El de la línia; 21 per defecte; 0 a les categories sense IVA. |
| **IVA** | Base × %. Per defecte, import − base. |
| **% IRPF** | El **«% IRPF»** de la despesa (0 si no en té). |
| **IRPF** | Base × % IRPF (en cada línia, sobre la seva base). |
| **Total** | Amb una sola línia, l'**import pagat**; amb diverses, base + IVA − IRPF de cada línia. |
| «Total…» | Sumes de base, IVA, IRPF i total. |
| «Total Modelo 303» | Només surt si hi ha despeses al 0 %: la base **només** de les files que porten IVA. |

### Full «Libro de gastos» (format de la gestoria)

Una fila per **despesa** (no esborrada, no fiança) + una fila per **nòmina** dels tres mesos del trimestre.

| Columna | D'on surt |
|---|---|
| **Fecha** | Data de la despesa; per a les nòmines, el mes (AAAA-MM). |
| **NIF** | CIF/NIF del proveïdor (buit a les nòmines). |
| **Nombre proveedor** | Proveïdor o descripció; per a les nòmines, el nom del treballador. |
| **Nº factura** | Número de factura del proveïdor. |
| **Compras 5%**, **Compras 10%**, **Compras 21%** | Cap categoria hi va per defecte: només si les omples a mà. |
| **Impuesto local** | Categories **«Impostos»** o **«Impostos i taxes»** (sense IVA, tot l'import). |
| **Gestoría** | Cap categoria hi va per defecte: només a mà. |
| **Electricidad/Agua** | Categories **«Electricitat»** i **«Aigua»** (la base amb IVA). |
| **Reparaciones** | Categories **«Manteniment»** i **«Reformes»** (la base amb IVA). |
| **Gastos varios** | **Qualsevol altra categoria** (Neteja, Internet, Màrqueting, Mobiliari, Electrodomèstics, Animals, Altres, Serveis i manteniments…) (la base amb IVA). |
| **Autónomos** | Categoria **«Autònoms»** (sense IVA, tot l'import). |
| **Salarios** | Les **nòmines** del trimestre (total de la nòmina) i les despeses de categoria **«Personal»**. |
| **Seguridad Social** | Categoria **«Seguretat Social»** (sense IVA, tot l'import). |
| **Otros gastos sin IVA** | Categoria **«Assegurances»** (tot l'import) i la part **al 0 %** de qualsevol factura desglossada (p. ex. el cànon de l'aigua). |
| **IVA 5%**, **IVA 10%**, **IVA 21%** | L'IVA de cada línia, a la columna del seu tipus (els tipus de 21 % o més van a «IVA 21%»). |
| **Total** | Import pagat de la despesa / total de la nòmina. |
| «Total…» | Suma per columna. |

### Full «Liquidación de IVA · Repercutido / Soportado»

| Fila / casella | D'on surt |
|---|---|
| **IVA repercutido (facturas emitidas)** — Base imponible / IVA | Totals de base i d'IVA de «Facturas emitidas». |
| **IVA soportado (facturas recibidas)** — Base imponible / IVA | Totals de base i d'IVA de «Facturas recibidas». |
| «IVA repercutido» / «IVA soportado» | Les dues caselles d'IVA. |
| **«Resultado a ingresar»** o **«Resultado a compensar/devolver»** | IVA repercutit − IVA suportat (positiu: a pagar; negatiu: a compensar o tornar). |

Si escrius a mà una d'aquestes caselles, queda fixa i es desa amb el llibre.

[FOTO id=llibre-iva-emeses ruta=/imprimir/trimestre-ingressos/2026-3 descripcio="Full Facturas emitidas del 3r trimestre amb la rectificativa R26-001 just sota la seva factura (26011) i la columna Depósito. La columna NIF / NIE no hi surt perquè aquest trimestre no té cap factura completa." marques="Nº Factura S.|Nº Factura F.|Cliente|Período de estancia|Base imponible|Depósito"]

[FOTO id=llibre-iva-recibidas ruta=/imprimir/trimestre-ingressos/2026-3 descripcio="Full Facturas recibidas amb una factura partida en dues files per tipus d'IVA i el lloguer amb IRPF" marques="Proveedor|Nº factura|% IRPF|Total Modelo 303|+ Afegir despesa"]

[FOTO id=llibre-iva-liquidacio ruta=/imprimir/trimestre-ingressos/2026-3 descripcio="Full Liquidación de IVA amb les dues files i el resultat (aquest trimestre surt a compensar perquè l'IVA suportat és més alt)" marques="IVA repercutido (facturas emitidas)|IVA soportado (facturas recibidas)|Resultado a compensar/devolver"]

---

## Com preparo els impostos del trimestre (pàgina Impostos)

**Per a què serveix:** veure, amb les caselles numerades com als formularis d'Hisenda, què toca presentar cada trimestre: **303** (IVA), **130** (pagament a compte de la renda) i **115** (retencions del lloguer); quant surt i fins quan tens.

**On és:** menú **Gestió → Impostos** (adreça `/impostos`). Només administradors.

**Pas a pas:**

1. Entra a **Impostos**. A dalt surt el titular **tal com consta a Hisenda** (cognoms i nom en majúscules, «NUALART COLL ELISABETH»), el NIF i «calculat del Llibre d’IVA de cada trimestre». A la dreta, **‹ any ›** per canviar d'any.
2. Si ha sortit una ordre nova al BOE sobre els models, surt primer una **franja vermella** («Nova ordre al BOE…»). Mira [Què vol dir l'avís vermell del BOE](#que-vol-dir-l-avis-vermell-del-boe).
3. Si hi ha alguna cosa pendent, surt una franja taronja **«Proper termini: dd/mm/aaaa»** amb els dies que queden i quins models són (també la taxa turística, el **950**).
4. Tria la pestanya **«1T»**, **«2T»**, **«3T»** o **«4T»**. El puntet de color diu l'estat: taronja = pendent, verd = tot presentat, gris = res a fer o encara no. Per defecte s'obre el primer trimestre amb coses pendents.
5. Llegeix la targeta **«D’on surten les xifres del …T»**: ingressos (base i IVA), gastos amb IVA (base i IVA), gastos sense IVA (només 130), nòmines (només 130) i IVA suportat per tipus. Si el llibre està desat, etiqueta **«versió desada (editada)»**. Botó **«Obre el llibre d’IVA»**.
6. Mira les tres targetes: **«Model 303 · IVA»**, **«Model 130 · IRPF a compte»** i **«Model 115 · Retencions del lloguer»**. Cada una té:
   - l'estat: «Presentada», «No cal», «Encara no», «Trimestre en curs», «Pendent · queden N dies», «Avui és l’últim dia» o «Fora de termini»;
   - «Termini: dd/mm/aaaa»;
   - el resultat en gran («A ingressar», «A compensar (no pagues res)», «A retornar (o a compensar)», «Resultat zero…», «Sense retencions»);
   - la taula de **caselles** amb el número oficial, el text i l'import; al costat de cada import, un botó per **copiar-lo** («Copia per enganxar a la Seu»), ja amb coma decimal;
   - a sota, una fila de **botons** per treure el formulari, el fitxer per a la Seu i la validació de l'AEAT. Els expliquem a [Com trec el formulari oficial, el fitxer per a la Seu i la validació de l'AEAT](#com-trec-el-formulari-oficial-el-fitxer-per-a-la-seu-i-la-validacio-de-l-aeat).
7. Als trimestres **1T** i **3T**, a sota hi ha també la targeta **«Model 950 · Taxa turística (ATC)»**. Mira [Com presento la taxa turística (targeta del model 950)](#com-presento-la-taxa-turistica-targeta-del-model-950).
8. Presenta el model d'una d'aquestes maneres:
   - **a la Seu de l'AEAT, important el fitxer** (botó **«Fitxer per importar a la Seu»**): la manera recomanada si ho fas tu;
   - **a la Seu, a mà**: **«Seu electrònica»** obre el tràmit i hi enganxes les xifres amb els botons de copiar;
   - **des de l'app**, amb el certificat digital (botó **«Presentar a l’AEAT»**). Només surt si has pujat el certificat. Mira [Com presento un model directament a l'AEAT des de l'app](#com-presento-un-model-directament-a-l-aeat-des-de-l-app);
   - o ho fa la **gestoria**.
9. Si l'has presentat **fora de l'app**, torna i prem **«Marca com a presentada»**. Les caselles es tornen editables: posa-hi **exactament** el que has presentat, el **«Núm. de justificant (opcional)»** i prem **«Desa com a presentada»** (o **«Cancel·la»**). Si l'has presentat des de l'app (de veritat, no de prova), ja queda marcada sola.
10. Si t'has equivocat de marcar-la, **«Desmarca»** i confirma.

[FOTO id=impostos-trimestre ruta=/impostos descripcio="Pàgina Impostos al 3T: franja vermella del BOE, franja de proper termini, pestanyes de trimestres, targeta d'origen de dades, les tres targetes de models amb els botons de l'AEAT i, a baix, la targeta del 950 i el bloc Presentació directa a l'AEAT" marques="Nova ordre al BOE|Proper termini|3T|Anual · 390 i 180|Obre el llibre d’IVA|Model 303 · IVA|Model 130 · IRPF a compte|Model 115 · Retencions del lloguer|Model 950 · Taxa turística (ATC)|Presentació directa a l’AEAT"]

[FOTO id=impostos-marcar-presentada ruta=/impostos descripcio="Targeta del 303 en mode edició després de prémer Marca com a presentada: les caselles es poden escriure i surten el justificant i els botons per desar o cancel·lar" marques="Núm. de justificant (opcional)|Desa com a presentada|Cancel·la"]

**Què passa després / d'on surten les dades:**
- **Model 303 (IVA del trimestre):** bases i quotes per tipus (caselles 01–09: el 10 % de l'allotjament va a 04–06) de **«Facturas emitidas»**; IVA suportat (28–29) de les files de **«Facturas recibidas»** que porten IVA; resultat 27 − 45. Si un trimestre surt negatiu, la quantitat passa a «A compensar» (casella 72) i es resta sola del trimestre següent (110 → 78). Al **4T**, el negatiu surt «A retornar» (73).
- **Model 130 (renda, a compte):** sumes **acumulades** de l'1 de gener al final del trimestre: ingressos (base sense IVA) i despeses = base dels gastos amb IVA + gastos sense IVA + **nòmines**. Paga el **20 %** del rendiment net, menys el que ja vas pagar als 130 anteriors. Quotes d'autònoms i Seguretat Social resten si les entres com a despesa amb categoria «Autònoms» o «Seguretat Social».
- **Model 115 (retencions del lloguer):** perceptors (propietaris), base i retenció de les despeses amb **IRPF** del trimestre.
- Un cop **presentat**, l'app fa servir **les xifres presentades** (no les calculades) per encadenar el trimestre següent. Si després canvies factures o despeses d'aquell trimestre, surt un avís taronja: «Amb les dades d’avui sortiria … Si has canviat factures o gastos d’aquest període després de presentar-la, pot caldre una complementària.»
- Si no hi ha moviments, el model surt «No cal» («Sense activitat en aquest període: no cal presentar-lo.»).

**Per què es fa així:** els tres models surten del mateix llibre d'IVA que entregues a la gestoria, així tot quadra. Guardar el que has presentat de veritat fa que els trimestres següents es calculin sobre la xifra oficial.

**Si t'has equivocat:** **«Desmarca»** i torna a marcar-la amb les xifres bones. Si la xifra calculada és errònia, corregeix l'origen (factura, despesa) o el llibre d'IVA.

**Compte!**
- Les **fiances no compten mai**, ni les pagades ni la fiança inclosa en una factura.
- Els **cobraments sense factura** no compten: fes-los factura perquè entrin al llibre.
- La casella 06 del 130 (retencions que t'han fet) sempre surt a 0.
- El nom del titular que surt a dalt i als formularis és **fix** («ELISABETH · NUALART COLL», com consta al cens d'Hisenda). No surt del «Titular de facturació» de Configuració. El **NIF** sí: si a Configuració hi ha el «NIF de facturació», mana aquest.
- Aquests càlculs són una **ajuda**: confirma'ls amb la gestoria abans de presentar.

---

## Com trec el formulari oficial, el fitxer per a la Seu i la validació de l'AEAT

**Per a què serveix:** no haver de copiar les caselles una a una. Des de cada targeta pots treure el **formulari oficial omplert**, un **fitxer** que la Seu de l'AEAT llegeix sola, i demanar a l'AEAT que **revisi** les dades abans de presentar-les.

**On és:** **Impostos** → pestanya del trimestre → fila de botons a sota de les caselles de cada model. Els mateixos documents també surten a **Plantilles** (mira [Com trec els formularis oficials des de Plantilles](#com-trec-els-formularis-oficials-des-de-plantilles)).

**Pas a pas:**

1. Entra a **Impostos** i tria el trimestre.
2. A sota de les caselles del model trobaràs aquests botons (segons el model):
   - **«Formulari oficial (PDF)»** (303, 130 i, a la pestanya anual, 390): obre en una pestanya nova el formulari **del BOE** amb les caselles ja escrites. Si el model ja està marcat com a presentat, hi posa les xifres presentades; si no, les calculades.
   - **«Fitxer per importar a la Seu»** (303, 130 i 115): baixa un fitxer de text (per exemple `303_2026_3T.txt`) en el format oficial de l'AEAT.
   - **«Validar a l’AEAT»** (303, 130 i 115): envia aquest mateix fitxer al servei de **validació** de l'AEAT. No demana certificat i **no presenta res**.
   - **«Seu electrònica»**: obre la fitxa del tràmit a la web de l'AEAT.
3. **Per presentar-lo important el fitxer:** a la Seu, entra al model amb Cl@ve o certificat, clica **«Importar»**, tria el fitxer que has baixat i totes les caselles s'omplen soles. Revisa-les i acaba amb «Firmar y enviar».
4. **Per validar-lo:** prem **«Validar a l’AEAT»** i espera. A sota dels botons surt la resposta:
   - en verd, **«L’AEAT l’ha validat sense errors. Encara no s’ha presentat.»**;
   - en vermell, **«L’AEAT hi ha trobat errors:»** i la llista d'errors;
   - els avisos surten en taronja, amb **«Avís:»** al davant;
   - si l'AEAT ha fet l'esborrany, l'enllaç **«Obre l’esborrany oficial (PDF)»**: és el formulari omplert per la mateixa AEAT, amb la marca d'esborrany.

[FOTO id=impostos-botons-aeat ruta=/impostos descripcio="Targeta del Model 303 del 3T amb el resultat, les últimes caselles i la fila de botons: formulari oficial, fitxer per a la Seu, validar a l'AEAT, presentar (proves), Seu electrònica i marcar com a presentada" marques="Formulari oficial (PDF)|Fitxer per importar a la Seu|Validar a l’AEAT|Presentar a l’AEAT (proves)|Seu electrònica|Marca com a presentada"]

**Què passa després / d'on surten les dades:**
- Totes les xifres són les **calculades** a la mateixa targeta (les del llibre d'IVA del trimestre). El titular és el de dalt de la pàgina; l'IBAN, el de **Configuració → «Dades per a la factura» → «IBAN»**.
- **Pagament:** si encara falten **més de 5 dies** per a l'últim dia del termini, el fitxer diu que el pagament es **domicilia** (l'AEAT el carrega al compte l'últim dia). Si en falten menys, diu que pagues **amb ingrés** (NRC del banc), perquè ja no s'hi és a temps.
- Els botons de fitxer i de validació només surten a partir del **2026** i quan el trimestre ja ha començat.
- Cada descàrrega, validació o presentació queda apuntada a l'auditoria.

**Per què es fa així:** el fitxer és el **disseny de registre oficial** de l'AEAT: la Seu l'entén sense que hagis d'escriure res, i així no t'equivoques copiant. La validació és el mateix control que fa la Seu abans de deixar-te presentar: si hi ha un error, el veus abans.

**Si t'has equivocat:** baixar, obrir o validar **no canvia res**: ho pots fer tantes vegades com vulguis. Si l'AEAT troba errors, corregeix l'origen (factures, despeses, llibre d'IVA, dades de Configuració) i torna a validar.

**Compte!**
- Si falta el NIF, surt «Falta el NIF del titular (Configuració → dades de facturació)». Si es domicilia i l'IBAN no és un IBAN espanyol vàlid: «Per domiciliar cal un IBAN espanyol vàlid (Configuració → dades de facturació)».
- El **«Formulari oficial (PDF)»** és una còpia fixa del formulari del BOE (303 i 390: Orden HAC/27/2026; 130: Orden HAP/258/2015). Si el BOE en publica un de nou, l'app t'avisa amb la franja vermella.
- El 115 no té «Formulari oficial (PDF)»: per veure'l en PDF, fes servir l'esborrany de l'AEAT (validació o Plantilles).
- **«Validar a l’AEAT»** necessita connexió amb l'AEAT; si el servei no respon, surt «No s’ha pogut validar amb l’AEAT».

---

## Com presento un model directament a l'AEAT des de l'app

**Per a què serveix:** presentar el **303**, el **130** o el **115** sense sortir de l'app, amb el **certificat digital** de la titular.

**On és:** **Impostos** → targeta del model → botó **«Presentar a l’AEAT (proves)»** o **«Presentar a l’AEAT»**. Només surt si has pujat el certificat (mira la secció següent) i si el model encara no està presentat. A la foto de la secció anterior és el botó ④.

**Pas a pas:**

1. Revisa les caselles i fes **«Validar a l’AEAT»** (secció anterior).
2. Prem **«Presentar a l’AEAT (proves)»** (entorn de proves) o **«Presentar a l’AEAT»** (entorn de producció). S'obre un requadre dins la targeta.
3. Llegeix el títol:
   - **«Presentació de PROVA (entorn de proves de l’AEAT)»**, o
   - **«Presentació REAL a Hisenda (no es pot anul·lar)»**.
4. Revisa el resum: «Model … · …T … · resultat: import», com es paga i la «Presentadora» (nom i NIF del certificat):
   - «domiciliació (l’AEAT el carrega l’últim dia del termini al compte de la configuració)», o
   - «ingrés amb NRC (ja l’has pagat al banc)».
5. Si surt a ingressar i ja no es pot domiciliar, escriu el **«NRC del pagament (22 caràcters, el dona el banc en pagar)»**. Abans, paga-ho: mira [Com pago un model a ingressar quan ja no es pot domiciliar (NRC)](#com-pago-un-model-a-ingressar-quan-ja-no-es-pot-domiciliar-nrc).
6. Marca la casella **«He revisat les caselles i l’esborrany («Validar a l’AEAT») i dono la meva conformitat a aquestes dades per presentar la declaració.»**
7. Si la contrasenya del certificat **no** està desada, escriu-la a **«Contrasenya del certificat»** (si està desada, aquest camp no surt).
8. Prem **«Envia la prova»** (proves) o **«Presenta-la ara»** (producció). Mentre treballa posa «Presentant…». **«Cancel·la»** tanca el requadre sense enviar res.
9. Llegeix el resultat:
   - a proves: **«Prova correcta: l’AEAT l’ha acceptada al seu entorn de proves (no compta).»**;
   - a producció: **«Presentada a l’AEAT ✓»**, amb el **CSV**, el número de justificant, la data i l'enllaç **«Obre el justificant (PDF)»**;
   - si no ha anat bé: «L’AEAT hi ha trobat errors (no s’ha presentat):» o «L’AEAT no l’ha acceptada:», amb la llista.

**Què passa després / d'on surten les dades:**
- Abans d'enviar, l'app comprova: que hi ha certificat i no ha caducat; que el **NIF del certificat** és el de la titular; que (a producció) el model no consta ja presentat; i que, si cal, hi ha un NRC de 22 caràcters. Després el fa **validar per l'AEAT**: si hi ha errors, **no l'envia**.
- **A producció**, si l'AEAT l'accepta, el model queda marcat com a **presentat** amb les caselles enviades, el CSV i el PDF del justificant, i els trimestres següents ja s'hi encadenen.
- **A proves**, no es desa res: el model continua pendent.
- Si la contrasenya no està desada, només es fa servir per a aquesta presentació i s'esborra en acabar.

**Per què es fa així:** l'AEAT obliga a mostrar les dades i recollir la **conformitat** abans de presentar. La presentació és **irreversible**: per això cal marcar la casella cada vegada.

**Si t'has equivocat:**
- A **proves** no passa res: no compta.
- A **producció**, una declaració presentada **no es pot anul·lar** des de l'app. Si les xifres eren errònies, cal una declaració **complementària o rectificativa a la Seu**: parla amb la gestoria.

**Compte!**
- Fes primer una **prova** a l'entorn de proves (l'AEAT només l'obre els dies laborables de 8 a 15 h).
- Si la contrasenya és incorrecta o l'AEAT no respon, surt el missatge d'error i no es presenta res.
- Si ja l'has presentat a la Seu o ho ha fet la gestoria, **no** la tornis a presentar des d'aquí: prem «Marca com a presentada».

---

## Com pago un model a ingressar quan ja no es pot domiciliar (NRC)

**Per a què serveix:** el **303**, el **130** o el **115** surten a pagar i ja ha passat el **dia 15** del mes de presentació, així que no es poden domiciliar. L'AEAT demana **pagar abans** i escriure el codi del pagament (l'**NRC**, 22 lletres i números) en presentar. Aquí tens com fer-ho des de la Seu, amb el certificat.

**Abans del dia 15 no cal res d'això:** prem «Presentar a l’AEAT» i l'import es domicilia sol (l'AEAT el carrega al compte el dia 20).

**Enllaços directes (Seu de l'AEAT):**
- Model **130**: [Seu de l'AEAT · Modelo 130](https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G601.shtml)
- Model **115**: [Seu de l'AEAT · Modelo 115](https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GH02.shtml)
- Model **303**: [Seu de l'AEAT · Modelo 303](https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G414.shtml)
- Ajuda de l'AEAT sobre el pagament i l'NRC: [Pago de autoliquidaciones mediante cargo en cuenta. Obtención de un NRC](https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/pago-impuestos-deudas-tasas-ayuda-tecnica/pago-autoliquidaciones.html)

**Pas a pas (exemple: el 130):**

1. A l'app, a la targeta del model, prem **«Fitxer per importar a la Seu»** (es baixa, per exemple, `130_2026_3T.txt`) i després **«Seu electrònica»**.
2. A la Seu, a **«Gestiones destacadas»**, clica el primer enllaç: **«Modelo 130. Ejercicio 2026. Presentación y servicio de ayuda Pre 130»**. No triïs el de «predeclaración» (és per imprimir en paper). Identifica't amb el **certificat**.

[FOTO id=aeat-130-pagina-seu descripcio="Pàgina del model 130 a la Seu de l'AEAT: cal clicar el primer enllaç de Gestiones destacadas" marques="Modelo 130. Ejercicio 2026. Presentación y servicio de ayuda Pre 130"]

3. A **«Datos Identificativos»** no omplis res: prem **«Importar»** i tria el fitxer de **Descàrregues**. (Al 115, abans surt «Si continúa se borrarán los datos de la declaración»: prem **«Sí»**.)

[FOTO id=aeat-130-dades-identificatives descripcio="Finestra Datos Identificativos del 130: es prem Importar sense omplir res" marques="Importar"]

[FOTO id=aeat-115-importar-avis descripcio="Al 115, avís en importar: es prem Sí" marques="Sí"]

4. Comprova que les caselles són les de l'app i que a **«Errores y avisos»** posa **«No existen errores»**. Prem **«Formalizar Ingreso / Devolución»**.

[FOTO id=aeat-130-importat descripcio="130 importat: caselles plenes, casella 19 amb l'import i «No existen errores»" marques="No existen errores|Formalizar Ingreso / Devolución"]

[FOTO id=aeat-115-importat descripcio="115 importat: perceptors, base, retencions i «No existen errores»" marques="No existen errores|Formalizar Ingreso / Devolución"]

5. Comprova **«A ingresar»** i l'**import**. Prem **«Realizar pago (NRC)»**. **No** premis encara «Firmar y Enviar».

[FOTO id=aeat-formalitzar-ingres descripcio="Finestra Formalizar Ingreso/Devolución: A ingresar, l'import i el botó Realizar pago (NRC)" marques="A ingresar|Realizar pago (NRC)"]

6. Tria com pagues:
   - **«Pago con cargo en cuenta»**: escrius l'**IBAN** (el compte ha de ser **a nom teu**, no compartit) i surt dels diners del compte. **Recomanat:** no té límit de targeta;
   - **«Pago con tarjeta o con Bizum»**: dades de la targeta i confirmació del banc al mòbil. Algunes targetes tenen un **límit diari** («Excede el límite de la transacción»): llavors paga amb càrrec al compte.

[FOTO id=aeat-pagament-opcions descripcio="Pantalla Pago de impuesto y obtención de NRC: càrrec en compte o targeta/Bizum" marques="Pago con cargo en cuenta|Pago con tarjeta o con Bizum"]

7. Revisa el resum (model, exercici, període, import), marca **«Conforme»** i prem **«Firmar y Enviar»**.

[FOTO id=aeat-pagament-tpv-confirmar descripcio="Resum del pagament abans de confirmar: model, període, import i Conforme" marques="Conforme|Firmar y Enviar"]

8. Surt **«El pago ha sido realizado con éxito»** i **«El NRC generado es: …»**. **Copia l'NRC** i prem **«Justificante de Pago»** per desar el rebut. **No** premis «Presentar declaración» si la presentaràs des de l'app.

[FOTO id=aeat-pagament-nrc-targeta descripcio="Pagament fet amb targeta: l'NRC (tapat a la foto) i els botons" marques="El NRC generado es|Justificante de Pago"]

[FOTO id=aeat-pagament-nrc-compte descripcio="Pagament fet amb càrrec al compte: el mateix resultat, amb l'NRC" marques="El NRC generado es|Justificante de Pago"]

9. Torna a l'app → targeta del model → **«Presentar a l’AEAT»** → enganxa l'NRC a **«NRC del pagament»** → marca la conformitat → **«Presenta-la ara»**. Surt «Presentada a l’AEAT ✓» amb el justificant en PDF.

[FOTO id=aeat-panell-nrc descripcio="Requadre de presentació real a l'app, amb el camp de l'NRC" marques="NRC del pagament|Presenta-la ara"]

**Què passa després / d'on surten les dades:** el pagament i la presentació són **dues coses**: l'NRC demostra que has pagat, i en presentar l'AEAT el lliga a la declaració. A l'app queden el CSV, el justificant i el PDF.

**Per què es fa així:** l'AEAT **no accepta transferències** per a aquests models. Fora del termini de domiciliació, només deixa pagar amb càrrec al compte, targeta, Bizum o al banc, i sempre abans de presentar.

**Si t'has equivocat:**
- Si **has pagat però no tens l'NRC** (s'ha tancat la finestra), a «Formalizar Ingreso» prem **«Recuperar un pago previo (NRC)»**: et torna l'NRC **sense tornar a cobrar**.
- Si en presentar surt «Si la forma de pago es cualquier tipo con ingreso, el campo Número de Referencia NRC es obligatorio», encara no has posat l'NRC.

**Compte!**
- L'NRC va lligat a l'**import exacte** (amb cèntims): si no coincideix, l'AEAT rebutja la presentació.
- Presenta la declaració **una sola vegada**: o des de l'app o amb «Presentar declaración» a la Seu, no totes dues.

---

## Com pujo el certificat digital (Presentació directa a l'AEAT)

**Per a què serveix:** deixar el certificat de la titular a l'app perquè surti el botó «Presentar a l’AEAT», i triar si les presentacions són **de prova** o **reals**.

**On és:** **Impostos** → a baix de tot, el bloc plegable **«Presentació directa a l’AEAT»** (amb «· PROVES» o «· PRODUCCIÓ» al títol si ja hi ha certificat).

**Pas a pas:**

1. Obre el bloc **«Presentació directa a l’AEAT»**.
2. A **«Certificat (.p12 o .pfx)»** (o **«Substituir el certificat»**, si ja n'hi ha un), tria el fitxer del certificat.
3. Escriu la **«Contrasenya del certificat»**.
4. Deixa marcada **«Recorda la contrasenya»** si no la vols escriure a cada presentació (es desa xifrada). Prem **«Puja»**. Surt «Certificat i contrasenya desats (xifrats).» (o, sense la casella, «… La contrasenya no s’ha desat: te la demanarem a cada presentació.»).
5. Si no l'havies desat, a **«Contrasenya:»** pots escriure-la més tard i prémer **«Recorda-la»**; **«Oblida-la»** l'esborra.
6. Comprova el requadre: nom · NIF del certificat i «Caduca el …».
7. A **«Entorn:»**, tria **«Proves»** o **«Producció (real)»**. Per passar a producció, l'app pregunta: «A PRODUCCIÓ les declaracions es presenten DE VERITAT a Hisenda i no es poden anul·lar. Hi passem?».
8. Per treure'l del servidor: **«Esborra el certificat»** i confirma.

[FOTO id=impostos-certificat ruta=/impostos descripcio="Bloc Presentació directa a l'AEAT obert, amb un certificat de prova (fictici) carregat, l'entorn Proves triat i els camps per substituir-lo" marques="Presentació directa a l’AEAT|Caduca el|Proves|Producció (real)|Esborra el certificat|Substituir el certificat|Contrasenya del certificat|Puja"]

**Què passa després / d'on surten les dades:** el certificat es desa **xifrat** al servidor. L'app en llegeix el nom, el NIF i la data de caducitat. La contrasenya només es desa (xifrada) si ho tries. Cada canvi (pujar, canviar l'entorn, esborrar) queda a l'auditoria.

**Per què es fa així:** per presentar en nom de la titular cal el seu certificat. Començar a **proves** permet comprovar que tot funciona sense presentar res de veritat.

**Si t'has equivocat:** torna a pujar el certificat bo (el substitueix), torna l'entorn a «Proves» o esborra'l.

**Compte!**
- Errors possibles en pujar-lo: «La contrasenya del certificat no és correcta», «El fitxer no és un certificat .p12/.pfx vàlid», «No s’ha trobat el NIF al certificat (ha de ser de persona física)», que ja ha caducat o que «El certificat no es pot fer servir per connectar amb l’AEAT».
- Quan falten menys de **60 dies** perquè caduqui, la data surt en taronja amb «renova’l a la FNMT».
- Només els administradors veuen aquest bloc.

---

## Què vol dir l'avís vermell del BOE

**Per a què serveix:** els formularis oficials de l'app són còpies dels que publica el **BOE**. Si surt una ordre nova que els canvia, l'app t'avisa perquè no presentis amb un formulari antic.

**On és:** a dalt de la pàgina **Impostos**, una franja vermella. També arriba un **correu** a l'adreça de les còpies de seguretat (per defecte hostalcoll@gmail.com).

**Pas a pas:**

1. Llegeix la franja: **«Nova ordre al BOE (dd/mm/aaaa) sobre els models …»** i «Pot canviar caselles dels formularis: cal revisar-los abans de presentar.» A sota hi ha el títol de l'ordre.
2. Clica el codi de l'ordre (per exemple «BOE-A-2026-…») per obrir-la al BOE.
3. Avisa qui manté l'app i la gestoria: cal comprovar si canvien les caselles i actualitzar els formularis.
4. Quan estigui revisat, prem **«Revisat»**. La franja desapareix.

[FOTO id=impostos-avis-boe ruta=/impostos descripcio="Franja vermella d'una ordre nova del BOE (aquí, una ordre inventada de les dades de prova) amb l'enllaç i el botó Revisat" marques="Nova ordre al BOE|Revisat"]

**Què passa després / d'on surten les dades:** cada **dilluns** al matí, l'app mira els sumaris del BOE dels últims 8 dies i busca ordres que parlin de «modelo(s)» **303, 130, 115, 390, 180 o 100**. Les ordres que ja fa servir l'app (Orden HAC/27/2026 i Orden HAP/258/2015) no avisen.

**Per què es fa així:** si el BOE canvia el formulari, les caselles poden canviar de número o de lloc, i un fitxer o un PDF antic pot ser incorrecte.

**Si t'has equivocat:** si has premut «Revisat» massa d'hora, des de l'app no es pot tornar a mostrar. Torna a mirar l'ordre al BOE.

**Compte!** «Revisat» només treu l'avís: **no actualitza** cap formulari. Mentre no s'actualitzi, revisa a la Seu les caselles abans de presentar.

---

## Com trec els formularis oficials des de Plantilles

**Per a què serveix:** tenir en un sol lloc, d'un clic, els formularis de tots els models d'un trimestre i de l'any, sense passar per cada targeta d'Impostos.

**On és:** menú **Gestió → Plantilles** → bloc plegable **«Impostos · formularis oficials de l’AEAT»**. Només el veuen els administradors.

**Pas a pas:**

1. Obre **Plantilles** i desplega **«Impostos · formularis oficials de l’AEAT»**.
2. Tria l'**any** (l'actual o l'anterior) i el **trimestre** («1r trimestre»…). Per defecte surt el trimestre que toca presentar ara (l'anterior a l'actual).
3. Cada fila diu el model, el resultat («… a ingressar», «… a compensar», «Resultat zero», «No cal presentar-lo», «Informatiu · …»), el termini i, si ja està fet, «presentat».
4. Botons de cada fila:
   - **303, 130 i 115:** **«PDF oficial (AEAT)»** (el formulari omplert per la mateixa AEAT, amb la marca d'esborrany) i **«Fitxer per presentar»** (el fitxer per importar a la Seu);
   - **390:** **«Formulari oficial (PDF)»** (el formulari del BOE omplert per l'app);
   - **180** i **347**, o qualsevol model que no calgui presentar: **«Obre Impostos»**.
5. Per presentar amb el fitxer: a la Seu, entra al model, clica **«Importar»**, tria el fitxer, revisa les caselles i clica «Firmar y enviar».

[FOTO id=plantilles-impostos ruta=/plantilles descripcio="Bloc Impostos · formularis oficials de l'AEAT de Plantilles, amb el selector d'any i trimestre i una fila per model amb els seus botons (no s'ha premut cap botó)" marques="Impostos · formularis oficials de l’AEAT|PDF oficial (AEAT)|Fitxer per presentar|Formulari oficial (PDF)|Obre Impostos"]

**Què passa després / d'on surten les dades:** les xifres són les de la pàgina **Impostos** (les presentades, si el model ja està marcat; si no, les calculades). Per fer el **«PDF oficial (AEAT)»**, l'app envia les dades al servei de validació de l'AEAT i en mostra el PDF; si l'AEAT hi troba errors, en lloc del PDF surt un text amb els errors.

**Per què es fa així:** el PDF de l'AEAT és el formulari que veuràs a la Seu, i el pots revisar o passar a la gestoria abans de presentar. El fitxer evita copiar les caselles a mà.

**Si t'has equivocat:** obrir o baixar no canvia res.

**Compte!**
- **Des de Plantilles el fitxer sempre diu «ingrés»** (no domiciliació). Si vols domiciliar el pagament, baixa'l des de la targeta d'**Impostos** (que ho tria segons la data) o canvia-ho a la Seu.
- El **180**, el **347** i la **renda (100)** es fan directament a la Seu amb les dades d'Impostos; la **taxa turística (950)**, a la Seu de l'ATC amb les dades de la targeta del 950.

---

## Com preparo els resums anuals (390, 180) i la renda (model 100)

**Per a què serveix:** al gener toca presentar els resums de l'any (390 d'IVA i 180 del lloguer), i a la primavera, la declaració de la renda, on l'hostal és una part.

**On és:** **Impostos**, pestanya **«Anual · 390 i 180»**.

**Pas a pas:**

1. Entra a **Impostos**, tria l'any i la pestanya **«Anual · 390 i 180»**.
2. Targeta **«Model 390 · Resum anual d’IVA»** («Informatiu: suma dels quatre 303»). A sota hi ha les «Dades estadístiques (apartat 3)»: clau **A03**, epígraf IAE **682** (comprova'l a la teva alta censal). El botó **«Formulari oficial (PDF)»** obre el 390 del BOE omplert, amb l'activitat, la clau i l'epígraf, i amb la «X» de la casella **D** si toca presentar el 347.
3. Targeta **«Model 180 · Resum anual del lloguer»**: taula de perceptors (**«Perceptor»**, **«NIF»** —«falta» en taronja si no en té—, **«Base»**, **«%»**, **«Retenció»**). A sota, **«Referència cadastral del local (obligatòria al 180)»**: escriu-la (20 caràcters, del rebut de l'IBI) i prem **«Desa»**.
4. Targeta **«Model 347 · Operacions amb terceres persones»**: mira [Com sé si he de presentar el 347](#com-se-si-he-de-presentar-el-347).
5. Targeta **«Model 100 · Renda AAAA (part de l’hostal)»**: «Ingressos íntegres (sense IVA)», les despeses per concepte, «Total despeses», «Diferència», «Provisions i despeses de difícil justificació (5 %, màx. 2.000 €)», **«Rendiment net»**, si escau «Reducció per inici d’activitat (20 %)», **«Rendiment net reduït»** i «Pagaments fraccionats (130) de l’any». Cada import té el botó de copiar.
6. Marca el 390, el 180 i (si cal) el 347 com a presentats igual que els trimestrals.
7. Al final hi ha el recordatori de la **taxa turística** amb el botó **«Obre la taxa turística»**.

[FOTO id=impostos-anual ruta=/impostos descripcio="Pestanya Anual amb el 390 i el seu formulari oficial, el 180 amb la taula de perceptors i la referència cadastral, el 347 i la targeta de la renda" marques="Anual · 390 i 180|Model 390 · Resum anual d’IVA|Formulari oficial (PDF)|Model 180 · Resum anual del lloguer|Referència cadastral del local (obligatòria al 180)|Model 347 · Operacions amb terceres persones|Model 100 · Renda|Obre la taxa turística"]

**Què passa després / d'on surten les dades:**
- **390:** suma dels quatre trimestres (bases i quotes per tipus, IVA deduïble per tipus, resultat, total ingressat als 303, el que queda a compensar o retornar a l'últim 303, volum d'operacions). Els imports del 4T entren quan s'acaba l'any.
- **180:** suma dels quatre 115, agrupat per perceptor (NIF o nom).
- **Renda (100):** ingressos = el mateix acumulat del 130 al 4T; despeses de l'any **sense fiances**, agrupades per concepte segons la categoria (Lloguer → arrendaments; Manteniment i Reformes → reparacions; Electricitat, Aigua, Internet → subministraments; Assegurances → primes; Impostos → tributs; Autònoms i Seguretat Social → Seguretat Social del titular; Personal i **nòmines** → sous; Neteja i Màrqueting → serveis exteriors; la resta → altres). Les despeses compten **sense IVA** (base). El 5 % de difícil justificació té un màxim de 2.000 €. La **reducció del 20 % per inici d'activitat** s'aplica si l'any anterior no hi havia cap factura ni despesa (màxim sobre 100.000 €). Els pagaments del 130 de l'any es resten al final.
- Si hi ha despeses de **Mobiliari** o **Electrodomèstics**, surt un avís: si un element costa més de 300 €, potser s'ha d'amortitzar en diversos anys.

**Per què es fa així:** la renda la fa el gestor o es completa a Renta WEB; l'app et dona **només la part de l'hostal** («Rendiments d’activitats econòmiques en estimació directa»), ja calculada.

**Si t'has equivocat:** corregeix les despeses o factures d'origen; la renda es recalcula sola.

**Compte!**
- La regla del 5 % és la de la renda 2025: comprova que no canviï.
- La reducció d'inici d'activitat: confirma-la amb el gestor.
- El 390 diu que no hi ha quotes de l'any anterior a compensar (casella 85 = 0, pensat per a 2026 com a primer any).

---

## Com sé si he de presentar el 347

**Per a què serveix:** el **model 347** és una declaració **informativa** (no es paga res) on es diuen els clients i proveïdors amb qui has fet operacions de **més de 3.005,06 €** en un any (IVA inclòs). L'app calcula sola si t'hi obliga.

**On és:** **Impostos** → pestanya **«Anual · 390 i 180»** → targeta **«Model 347 · Operacions amb terceres persones»** («Informatiu: clients i proveïdors de més de 3.005,06 € l’any»).

**Pas a pas:**

1. Tria l'any i obre la pestanya **«Anual · 390 i 180»**.
2. Mira l'estat de la targeta:
   - **«No cal»** i «Sense activitat en aquest període: no cal presentar-lo.»: ningú no passa del límit;
   - si algú hi passa, la targeta mostra les caselles **01** («Persones i entitats a declarar») i **02** («Import total de les seves operacions (IVA inclòs)») i una franja taronja: «Cal presentar-lo (febrer de …). El formulari del 390 ja porta la «X» a la casella D.»
3. Revisa la taula: **«Tercer»**, **«NIF»** («falta» en taronja si no en té), **«Clau»** (A = proveïdor, B = client), l'import de cada trimestre (**«1T»**…**«4T»**) i el **«Total»**.
4. Llegeix les llistes de sota, si surten:
   - **«Passen de 3.005,06 € però NO es declaren:»**, amb el motiu;
   - **«S’hi acosten (vigila’ls a final d’any):»** (més del 70 % del límit);
   - l'avís de **cobraments en efectiu de més de 6.000 €** d'un mateix client, que al 347 s'han d'indicar a part.
5. Si un tercer no té NIF, posa'l a la fitxa del proveïdor o a la factura completa.
6. Presenta'l a la **Seu de l'AEAT** (només per internet, de l'**1 al 28 de febrer** de l'any següent) i, després, **«Marca com a presentada»**.

[FOTO id=impostos-347 ruta=/impostos descripcio="Targeta del Model 347 a la pestanya anual (amb les dades de prova ningú no passa del límit i surt No cal)" marques="Model 347 · Operacions amb terceres persones|No cal"]

**Què passa després / d'on surten les dades:**
- **Proveïdors (clau A):** totes les despeses de l'any (sense fiances), agrupades pel NIF del proveïdor (o el nom). L'import és el total amb IVA; al lloguer amb retenció s'hi torna a sumar l'IRPF retingut.
- **Clients (clau B):** només les **factures completes** (fiscals), agrupades pel NIF del client (o el document del titular), sense la fiança inclosa.
- **No es declaren:** el lloguer amb retenció («Lloguer amb retenció (ja es declara al 180)»), les despeses de categoria «Impostos» o «Impostos i taxes» («Tributs…»), les d'«Autònoms» o «Seguretat Social» («Cotitzacions socials») i les **factures simplificades** («no era obligatori identificar el client»).
- Si cal presentar-lo, el formulari oficial del **390** surt amb la «X» a la casella **D**.
- Es torna a calcular sol cada vegada que obres la pàgina, fins al 31 de desembre.

**Per què es fa així:** ho demana el Reglament general de gestió tributària (art. 33 RGAT): quan amb una mateixa persona o empresa passes de 3.005,06 € en un any, Hisenda vol creuar les dades amb les seves.

**Si t'has equivocat:** corregeix la despesa, el proveïdor o la factura d'origen; la targeta es recalcula. Si ja l'has marcat com a presentat, «Desmarca».

**Compte!**
- Els imports van **amb IVA**.
- El termini que surt a l'app és l'**últim dia de febrer** (si cau en cap de setmana, el dilluns).
- Els casos dubtosos, confirma'ls amb la gestoria.

---

## Com preparo la taxa turística (IEET)

**Per a què serveix:** calcular quant has de pagar de **taxa turística** cada semestre i tenir la llista de persones que demana l'ATC.

**On és:** menú **Gestió → Taxa turística** (adreça `/taxa-turistica`). La configuració, a **Configuració → «Taxa turística (declaració)»**.

**Pas a pas:**

1. Entra a **Taxa turística**. Títol «Taxa turística (IEET)».
2. A dalt a la dreta, tria el període amb **‹ ›**: **«Abril – setembre AAAA»** o **«Octubre AAAA – març AAAA+1»**. Per defecte surt el període que encara estàs a temps de pagar (fins al dia 20) o, si no, el que està en curs.
3. Llegeix la franja: les dates d'entrada que inclou i l'estat del pagament («Període en curs. Es pagarà de l’01/10 al 20/10…», «Toca pagar ara… queden N dies», etc.).
4. Mira les quatre xifres: **«Persones»**, **«Nits que paguen»**, **«Import a pagar»** i **«Fitxes amb dades que falten»** (en taronja si n'hi ha).
5. Revisa la taula. Columna **«Estat»**: «Completa», «Menor de 17» o «Falta …» (habitació, document, nacionalitat, data de naixement, domicili, municipi, país, telèfon, correu). Les cel·les que falten surten en taronja amb la paraula «falta».
6. **Clica una fila** per obrir la fitxa del viatger i completar el que falta.
7. Descàrregues: **«Descarregar Excel»**, **«Descarregar PDF»** i **«PDF per imprimir»** (el mateix PDF girat en full vertical, perquè l'iPad l'imprimeixi a mida sencera).
8. **«Actualitzar Drive ara»** per pujar l'Excel a Google Drive en aquell moment (també es fa sol cada matí).

[FOTO id=taxa-turistica ruta=/taxa-turistica descripcio="Pàgina Taxa turística amb el selector de període, la franja de termini, les quatre xifres, la franja de Drive i la taula de persones" marques="Taxa turística (IEET)|Persones|Nits que paguen|Import a pagar|Fitxes amb dades que falten|Descarregar Excel|Descarregar PDF|PDF per imprimir|Actualitzar Drive ara"]

[FOTO id=config-taxa-turistica ruta=/config descripcio="Targeta de configuració Taxa turística (declaració) amb els tres camps" marques="Taxa turística (declaració)|Import per persona i nit (€)|Màxim de nits que paguen|Paguen a partir de (anys)"]

**Què passa després / d'on surten les dades:**
- Es calcula **per estades**, no per factures.
- Hi surten les estades **ja acabades** i **amb número de contracte**, segons la **data d'entrada** dins el semestre.
- Només paga la **primera estada**: una ampliació, o una estada que comença el mateix dia (o l'endemà) que n'acaba una altra d'algun dels mateixos hostes, és **continuació** i no surt.
- **Nits que paguen** = nits de l'estada, amb un **màxim** (per defecte 7).
- **Import** = nits que paguen × **tarifa** (per defecte 0,90 € per persona i nit).
- Els menors de l'**edat mínima** (per defecte 17 anys a la data d'entrada) surten a 0 €.
- Dades de la persona: les **congelades** al registre (si n'hi ha) o les de la fitxa.
- Drive: «Hostal Coll — Gestió / AAAA / Taxa turística <període>.xlsx».

**Per què es fa així:** la taxa es declara per semestres a l'ATC, i la normativa només fa pagar fins a un màxim de nits i exclou els menors.

**Si t'has equivocat:** completa la fitxa del viatger o corregeix l'estada; la llista es recalcula. La tarifa, el màxim de nits i l'edat es canvien a **Configuració → «Taxa turística (declaració)»** («Import per persona i nit (€)», «Màxim de nits que paguen», «Paguen a partir de (anys)») i **«Desar»**.

**Compte!**
- Terminis: **abril–setembre** es paga de l'**1 al 20 d'octubre**; **octubre–març**, de l'**1 al 20 d'abril**.
- A Configuració hi ha un altre camp, «IEET (€/persona·nit)» dins «Facturació i RGPD», que és per a les factures, **no** per a aquesta pàgina (vegeu DUBTES).
- El model que es presenta a l'ATC (**model 950**) l'app no el presenta: et dona les dades, a la pàgina **Impostos** (mira la secció següent).

---

## Com presento la taxa turística (targeta del model 950)

**Per a què serveix:** tenir les **dues xifres** que demana l'ATC (estades subjectes i exemptes), l'import a pagar i els passos, al costat dels altres impostos del trimestre.

**On és:** **Impostos** → pestanya **«3T»** (semestre abril–setembre, es paga de l'1 al 20 d'octubre) o **«1T»** (semestre octubre–març, es paga de l'1 al 20 d'abril) → targeta **«Model 950 · Taxa turística (ATC)»**.

**Pas a pas:**

1. Entra a **Impostos** i obre la pestanya **«3T»** o **«1T»**.
2. Baixa fins a la targeta **«Model 950 · Taxa turística (ATC)»**. A dalt a la dreta, l'estat i «Termini: dd/mm/aaaa».
3. Mira l'import gran (**«A ingressar»** o «Sense estades que paguin») i la taula:
   - «Persones allotjades» i «Persones que paguen»;
   - **«Estades subjectes (nits que paguen, màx. 7 per persona)»**;
   - **«Estades exemptes (menors de 17 anys)»**;
   - «Tarifa per persona i nit» i **«Quota (nits × tarifa)»**.
   Les tres xifres clau tenen el botó de copiar.
4. Si surt l'avís taronja «… dades del viatger incompletes. Omple-les a Taxa turística abans de presentar.», prem **«Obre la taxa turística»** i completa les fitxes.
5. Segueix els passos de la targeta, a la **Seu de l'ATC** (amb el teu certificat o idCAT; botó **«ATC»**):
   1. pestanya **Establiments**: l'hostal amb el seu número del **Registre de Turisme de Catalunya** (es recupera de l'autoliquidació anterior);
   2. pestanya **Estades**: tria l'any i el període i escriu les estades **subjectes** i les **exemptes**;
   3. el formulari calcula la quota: comprova que doni el mateix import i paga (càrrec a compte o targeta).

   Ho tens explicat amb fotos i enllaços a [Com presento el 950 a la Seu de l'ATC, pas a pas](#com-presento-el-950-a-la-seu-de-l-atc-pas-a-pas).
6. Torna a l'app i prem **«Marca com a presentat»**. Surt «Presentat el dd/mm/aaaa». Si t'has equivocat, **«Desmarca»**.

[FOTO id=impostos-950 ruta=/impostos descripcio="Targeta del Model 950 al 3T amb l'import, les estades subjectes i exemptes, els passos per presentar-lo a l'ATC i els botons" marques="Model 950 · Taxa turística (ATC)|Estades subjectes|Estades exemptes|Obre la taxa turística|ATC|Marca com a presentat"]

**Què passa després / d'on surten les dades:**
- Les xifres són les mateixes de la pàgina **Taxa turística** per a aquell semestre: estades acabades amb número de contracte, màxim de nits i tarifa de Configuració.
- **Estades exemptes** = les nits dels **menors** de l'edat mínima.
- En marcar-lo, l'app desa les nits i l'import. El 950 també surt a la franja de **«Proper termini»**.

**Per què es fa així:** a l'ATC no es puja cap fitxer ni cap llista d'hostes: només aquestes dues xifres. L'Excel i el PDF de **Taxa turística** són el teu **justificant** de les estades: guarda'ls, amb les declaracions dels menors.

**Si t'has equivocat:** **«Desmarca»** i torna-ho a marcar. Si les xifres no són bones, corregeix les estades o les fitxes.

**Compte!**
- Mentre el semestre no s'ha acabat, l'estat és «Trimestre en curs»; si encara no ha començat: «El període encara no ha començat.»
- La targeta no surt al 2T ni al 4T.

---

## Com presento el 950 a la Seu de l'ATC, pas a pas

**Per a què serveix:** declarar i pagar la **taxa turística** a l'Agència Tributària de Catalunya amb les dues xifres de la targeta del 950. Terminis: de l'**1 al 20 d'octubre** (estades d'abril a setembre) i de l'**1 al 20 d'abril** (d'octubre a març).

**Enllaç directe:** [ATC · Declarar estades en establiments turístics](https://atc.gencat.cat/ca/tributs/ieet/tramit-ieet/) (també el botó **«ATC»** de la targeta).

**Dades de l'hostal per a l'ATC** (Registre de Turisme de Catalunya):

| Camp | Valor |
|---|---|
| Número RTC | **HB - 003022 - 26** |
| Nom comercial | COLL |
| Adreça | Carrer de Sant Isidre, 54 · 08370 Calella (Barcelona) |
| Tipus / Categoria | Establiment hoteler / Resta d'establiments i equipaments |
| Tarifa | ET3 - 0,90 € per persona i nit |

**Pas a pas:**

1. A l'app, a la targeta **«Model 950»**, apunta les **estades subjectes** i les **exemptes** (botó de copiar).
2. Obre l'enllaç i prem **«Inicia el tràmit»**. Identifica't amb el **certificat** de la titular.

[FOTO id=atc-950-tramit descripcio="Pàgina del tràmit a l'ATC amb el botó Inicia el tràmit" marques="Inicia el tràmit"]

3. **Només la primera vegada:** a la pestanya **«Establiments / Creuers»**, si posa «Actualment no consta cap establiment ni creuer», prem **«Afegir establiments»**:
   1. **Subjecte passiu:** tria la titular (nom i NIF);
   2. marca **«Tinc número RTC»** i escriu **HB**, **003022** i **26** a les tres caselles; l'ATC omple sola el nom i l'adreça;
   3. **Tipus:** «Establiment hoteler»; **Categoria:** «Resta d'establiments i equipaments»; deixa **«Establiment actiu»** encès;
   4. prem **«Confirmar»**. Surt «Establiment creat correctament i afegit a la llista».

[FOTO id=atc-950-establiments-buit descripcio="Pestanya Establiments sense cap establiment: es prem Afegir establiments" marques="Afegir establiments"]

[FOTO id=atc-950-alta-establiment descripcio="Formulari d'alta de l'establiment amb el número RTC HB-003022-26 i les dades de l'hostal" marques="Tinc número RTC|Número RTC|Establiment hoteler|Confirmar"]

[FOTO id=atc-950-establiments-llista descripcio="L'hostal ja donat d'alta a la llista d'establiments" marques="Establiment creat correctament|Estades"]

4. Pestanya **«Estades»**: tria l'**exercici** i el **període** (per exemple «Abril 2026 a Setembre 2026»). A la fila de l'hostal, prem el **llapis**.

[FOTO id=atc-950-estades-llista descripcio="Pestanya Estades amb l'exercici i el període triats i l'hostal a la llista" marques="Període|Editar"]

5. A **«Introduir estades»**:
   - **«Nombre d'unitats d'estada subjectes»**: les **estades subjectes** de l'app;
   - **«Menors»**: les **estades exemptes** de l'app;
   - **Socials**, **Força major** i **Salut**: 0;
   - **no** marquis «No ha tingut activitat» ni «Complementària».
   Prem **«Desar i tancar»**.

[FOTO id=atc-950-introduir-estades descripcio="Finestra Introduir estades: subjectes i exempcions" marques="Nombre d'unitats d'estada subjectes|Menors|Desar i tancar"]

[FOTO id=atc-950-estades-desades descripcio="Estades desades a la llista (encara «No presentat»)" marques="No presentat"]

6. Pestanya **«Autoliquidacions»**: amb el mateix exercici i període, comprova que l'**import** és el de l'app. Marca la **casella** de la fila i prem **«Presentar»**.

[FOTO id=atc-950-autoliquidacions descripcio="Pestanya Autoliquidacions amb l'import a ingressar i el botó Presentar" marques="Presentar"]

7. Deixa **«Presentació i pagament telemàtics»** i tria **«Càrrec a compte»** (escriu l'**IBAN**; el compte ha de ser de la titular del certificat). Confirma i signa.

[FOTO id=atc-950-pagament descripcio="Pagament i presentació: modalitat telemàtica, total a ingressar i formes de pagament" marques="Presentació i pagament telemàtics|Càrrec a compte"]

8. Surt **«Tràmit realitzat correctament»**: descarrega el **justificant** (PDF) i, si vols, prem **«Enviar»** per rebre'l per correu.

[FOTO id=atc-950-fet descripcio="Tràmit realitzat correctament amb el justificant de presentació i el CSV" marques="Justificant de presentació|Enviar"]

9. Torna a l'app i, a la targeta del 950, prem **«Marca com a presentat»** (si demana el número, posa el del justificant).

**Què passa després / d'on surten les dades:** l'ATC cobra l'import del compte i et dona el justificant amb el CSV per comprovar-lo. A l'app, el 950 passa a «Presentat».

**Per què es fa així:** l'ATC no té cap manera d'enviar-ho des d'un programa: només aquest formulari web. A partir de la segona vegada, l'establiment ja hi és i comences directament al pas 4.

**Si t'has equivocat:** si has desat malament les estades i encara no has presentat, torna al llapis i corregeix-les. Si ja està presentat, cal una **complementària** (casella «Complementària» al pas 5): parla amb la gestoria.

**Compte!**
- Si el període no té cap estada que pagui, **no cal presentar-lo**.
- Al Registre de Turisme l'hostal pot constar encara a nom de la titular anterior: no impedeix presentar, però convé demanar el **canvi de titularitat** a l'Ajuntament.

---

## Com imprimeixo la declaració de la taxa turística d'un menor

**Per a què serveix:** perquè un menor no pagui la taxa, el pare, la mare o el tutor ha de signar una **declaració responsable** que diu que és menor de 17 anys.

**On és:**
- a la fitxa de l'**estada**, botó **«Declaració IEET (menor)»** (només surt si hi ha algun menor);
- a **Justificants**, el mateix botó per a cada estada amb menors, i un botó **«Declaració IEET (menor)»** a dalt per treure el **full en blanc**.

Adreça: `/imprimir/ieet-declaracio/<estada>` (o `/imprimir/ieet-declaracio/blank`).

**Pas a pas:**

1. Obre l'estada i prem **«Declaració IEET (menor)»**. S'obre en una pestanya nova.
2. Revisa les dades ja omplertes: **«Nombre y apellidos»** i **«NIF»** del titular, «En calidad de» (per defecte «padre/madre/tutor legal»), **«Dirección»**, **«Población»**, els noms dels **menors** (fins a 4 línies «- Que … es menor de 17 años.») i **«Lugar y fecha»** (població de l'hostal + data d'entrada).
3. Corregeix el que calgui escrivint al damunt.
4. Prem **«Desar canvis»** per guardar el que has escrit.
5. Prem **«Imprimir / Guardar PDF»**.

[FOTO id=ieet-declaracio ruta=/imprimir/ieet-declaracio/blank descripcio="Full en blanc de la declaració responsable IEET amb les dades del declarant, les línies dels menors i les firmes (el full en blanc no té el botó Desar canvis)" marques="Declaración IEET · menores|Imprimir / Guardar PDF|Datos de la persona declarante|Firma de la persona declarante"]

**Què passa després / d'on surten les dades:** el declarant és el **titular** de l'estada. Els menors són els viatgers amb **menys de 17 anys** a la data d'entrada. Si el titular ja ha **signat** a l'app, la seva firma surt a «Firma de la persona declarante»; si no, una línia per signar a mà. Al costat, espai per a «Firma/sello del establecimiento turístico».

**Per què es fa així:** és el model de l'ATC; la declaració justifica l'exempció si hi ha una inspecció.

**Si t'has equivocat:** torna a obrir-la, corregeix i **«Desar canvis»**.

**Compte!**
- El full en blanc no es pot desar.
- Aquest document fa servir **17 anys** sempre, encara que a Configuració canviïs l'edat mínima.

---

## Què és Veri\*Factu i en quin punt és

**Per a què serveix:** **Veri\*Factu** és el sistema de l'AEAT perquè les factures no es puguin manipular: cada factura genera un **registre** amb una **empremta digital** (*huella*) encadenada a l'anterior i un **codi QR** que qualsevol pot comprovar. Està previst que sigui obligatori cap al **2027**.

**On és:** pestanya **«Veri\*Factu»** (adreça `/verifactu`).

**Pas a pas:**

1. Entra a **Veri\*Factu**. Llegeix el requadre: només la **factura fiscal (F1)** genera registre; les **simplificades** i els **rebuts** no hi entren; l'import no inclou la fiança.
2. Formulari **«Emetre document»**:
   - **«Estada»** (obligatori): en triar-la, s'omplen el nom i el document del titular;
   - **«Tipus de document»**: «Recibo (sense Veri\*Factu)», «Factura fiscal (Veri\*Factu)» o «Factura simplificada (sense Veri\*Factu)»;
   - **«IVA %»** (per defecte 10);
   - **«Descripció de l’operació»**, **«NIF destinatari»** (obligatori a la factura fiscal) i **«Nom destinatari»**;
   - les línies (concepte, descripció, import), **«Línia»** per afegir-ne;
   - casella **«Aplicar tassa turística (IEET, no subjecta a IVA)»**.
3. Prem **«Emetre factura (Veri\*Factu)»** (o «Emetre factura simplificada» / «Emetre recibo»).
4. A **«Cadena de registres»** veuràs **«Cadena íntegra»** (verd) o **«Integritat compromesa»** (vermell) i una taula: **«Núm. sèrie»** (enllaç a la factura), **«Tipus»**, **«Data»**, **«Total»**, **«Huella»**, **«Integritat»** (OK / Error), **«AEAT»** (estat i botó **«Enviar AEAT»**), **«QR»** (enllaç de comprovació).

[FOTO id=verifactu ruta=/verifactu descripcio="Pàgina Veri*Factu amb el requadre explicatiu, el formulari Emetre document i la cadena de registres (aquí encara buida: «Encara no s'ha emès cap factura Veri*Factu»; quan n'hi ha, surten «Cadena íntegra» i el botó «Enviar AEAT»)" marques="Emetre document|Tipus de document|NIF destinatari|Aplicar tassa turística (IEET, no subjecta a IVA)|Cadena de registres"]

**Què passa després / d'on surten les dades:** la factura fiscal es crea igual que des de Facturació i, a més, genera un registre amb la huella (SHA-256) calculada amb les dades de la factura i la huella de l'anterior, i l'adreça del QR. A cada visita, l'app **recalcula** totes les huelles i comprova la cadena.

**Estat actual a l'app:**
- Els registres **es generen i s'encadenen**, i el QR apunta, per defecte, a l'entorn de **proves** de l'AEAT.
- L'**enviament real a l'AEAT** està programat però **inactiu** fins que s'instal·li el **certificat digital** al servidor. Mentrestant, **«Enviar AEAT»** donarà error.
- Falten dades obligatòries del **productor del software** (NIF i raó social) i confirmar l'adreça exacta del servei de l'AEAT.
- El tractament de la taxa turística dins el registre (com a «no subjecte») està per confirmar.

**Per què es fa així:** així, quan sigui obligatori, només caldrà posar el certificat i les dades pendents.

**Si t'has equivocat:** pots esborrar un registre amb la paperera («Eliminar registre»), però l'app avisa que «Això trenca la cadena d'integritat».

**Compte!**
- **No esborris registres** si no és estrictament necessari: la cadena quedaria marcada com a compromesa.
- El requadre diu que la sèrie i el mode de proves es configuren a **Configuració**, però en aquesta versió no hi ha aquests camps (vegeu DUBTES).

---

## Calendari d'obligacions

Aquest calendari surt del que l'app calcula (pàgina **Impostos**, que ja inclou la taxa turística, i **Taxa turística**). Si l'últim dia cau en **dissabte o diumenge**, l'app el passa al **dilluns**. Confirma sempre les dates amb la gestoria, perquè l'app no té en compte festius.

| Quan (últim dia) | Què | Període | On ho prepares a l'app |
|---|---|---|---|
| **20 d'abril** | 303 (IVA), 130 (renda a compte), 115 (retencions lloguer) | 1T (gener–març) | Impostos → 1T |
| **20 d'abril** (de l'1 al 20) | Taxa turística (model 950, ATC) | octubre–març | Taxa turística i Impostos → 1T → Model 950 |
| **30 de juny** (campanya des d'abril) | Renda (model 100), part de l'hostal | any anterior | Impostos → Anual → Model 100 |
| **20 de juliol** | 303, 130, 115 | 2T (abril–juny) | Impostos → 2T |
| **20 d'octubre** | 303, 130, 115 | 3T (juliol–setembre) | Impostos → 3T |
| **20 d'octubre** (de l'1 al 20) | Taxa turística (model 950, ATC) | abril–setembre | Taxa turística i Impostos → 3T → Model 950 |
| **20 de gener** | 115 | 4T (octubre–desembre) | Impostos → 4T |
| **30 de gener** | 303 i 130 | 4T | Impostos → 4T |
| **30 de gener** | 390 (resum anual IVA) | any anterior | Impostos → Anual |
| **31 de gener** | 180 (resum anual lloguer) | any anterior | Impostos → Anual |
| **Últim dia de febrer** (de l'1 al 28/29) | 347 (operacions amb terceres persones), **només si cal** | any anterior | Impostos → Anual → Model 347 |
| Cada **dilluns** | L'app mira si el BOE ha canviat els models (avís vermell i correu) | — | Impostos (a dalt) |
| Cada trimestre, abans del 303 | Llibre d'IVA per a la gestoria | trimestre | Facturació → Llibre d'IVA trimestral |
| Cada **24 h** | Comunicació de viatgers a Mossos | — | (fora d'aquest capítol) |

[FOTO id=impostos-proper-termini ruta=/impostos descripcio="Franja taronja de proper termini a dalt de la pàgina Impostos" marques="Proper termini"]

---

## Preguntes freqüents

**1. Per què el Balanç i el llibre d'IVA no donen el mateix ingrés del trimestre?**
El Balanç compta els **cobraments** (quan t'han pagat, i les fiances retingudes); el llibre d'IVA compta les **factures** (per la data de la factura, i sense IVA). A més, el llibre no inclou els rebuts ni els cobraments sense factura.

**2. He pagat la fiança del local. On l'apunto?**
A **Despeses → «Nova despesa»**, marcant **«És una fiança»**. No comptarà com a despesa ni sortirà al llibre d'IVA. Si no te la tornen, desmarca-la.

**3. Una despesa no surt al llibre d'IVA. Per què?**
Pot ser: (a) és marcada com a **fiança**; (b) la data és d'un altre trimestre; (c) el llibre d'aquell trimestre ja estava **desat** abans d'apuntar-la (afegeix-la a mà amb «+ Afegir despesa» i torna a desar); (d) l'has esborrat.

**4. L'IVA d'una despesa surt al 21 % i era al 10 %.**
No hi havies posat la base: l'app suposa un 21 % inclòs. Edita la despesa i posa **«Base imposable €»** i **«% IVA»** = 10. Si el llibre ja estava desat, corregeix també la fila al llibre.

**5. Per què els imports del Balanç surten amb punts «••••»?**
S'amaguen sols en entrar, per privacitat. Prem **«Mostrar imports»**.

**6. Què vol dir «Benefici total» al gràfic de la caixa?**
És el benefici real **més** les fiances rebudes dels clients. Et diu quants diners tens, però les fiances s'hauran de tornar; el que compta per a Hisenda és el **«Benefici real»**.

**7. Puc tornar a la versió generada del llibre d'IVA després de desar-lo?**
No hi ha botó per fer-ho. Pots corregir a mà i tornar a desar. Vegeu DUBTES.

**8. Com apunto un abonament d'un proveïdor?**
Com una despesa amb l'**import** i la **base** en **negatiu** (p. ex. -24,20 i -20, IVA 21).

**9. L'app m'avisa que la factura ja està pujada, però són dues compres iguals.**
Prem **«Desar igualment»**. És només un avís.

**10. Per què el model 130 resta les nòmines però el 303 no?**
Les nòmines no porten IVA: no tenen res a veure amb el 303, però sí que són despesa per a la renda (130 i 100).

**11. He presentat el 303 amb un cèntim diferent del que calculava l'app.**
En prémer **«Marca com a presentada»**, escriu les xifres **exactament** com a la Seu. L'app farà servir aquestes per als trimestres següents.

**12. Un client s'ha quedat 10 nits. Quantes paga de taxa turística?**
Les del màxim configurat (per defecte **7**). Si després amplia l'estada, l'ampliació no paga.

**13. Un servei recurrent no ha creat la despesa.**
Comprova que estigui **actiu** (no pausat), que tingui marcada **«Generar la despesa automàticament…»** i que tingui **«Import previst €»**. La despesa es crea l'endemà del venciment a primera hora, o en obrir el Tauler.

**14. Què faig si a la taxa turística surt «Falta document»?**
Clica la fila, completa la fitxa del viatger i torna a la pàgina. Els menors de 14 anys no necessiten document; els menors no necessiten telèfon ni correu.

**15. Per què la columna «NIF / NIE» no surt al llibre d'IVA?**
Només surt si hi ha alguna **factura completa** al trimestre (a les simplificades no és obligatori). Si escrius un NIF a qualsevol fila, la columna apareix.

**16. Puc enviar ja les factures a l'AEAT amb Veri\*Factu?**
Encara no: falta el certificat digital i algunes dades del software. Els registres es van generant igualment. (El certificat de **«Presentació directa a l’AEAT»** d'Impostos només serveix per presentar el 303, el 130 i el 115.)

**17. «Validar a l’AEAT» vol dir que ja està presentat?**
No. Només és una revisió: l'AEAT diu si hi ha errors i en fa l'esborrany. El model continua pendent fins que el presentes.

**18. Quina diferència hi ha entre «Formulari oficial (PDF)» i «PDF oficial (AEAT)»?**
El primer és el formulari del BOE omplert per l'**app**. El segon, que surt a Plantilles (i a «Obre l’esborrany oficial (PDF)» després de validar), l'omple la **mateixa AEAT** amb el fitxer de l'app.

**19. He presentat des de l'app en mode «Proves». Ja està?**
No. A proves no compta per a Hisenda i el model continua pendent. Quan tot funcioni, passa a «Producció (real)» o presenta'l a la Seu.

**20. El fitxer que he baixat diu «domiciliació», però ja és l'últim dia.**
L'app només domicilia si falten més de 5 dies per acabar el termini. Si l'has baixat abans, torna'l a baixar: ara dirà «ingrés».

---

## DUBTES

> Aquesta secció és interna i **no es publicarà**. Recull coses que el codi no deixa clares o que semblen errors.

1. **Abast demanat vs. codi actual del Balanç.** L'encàrrec parla de pestanyes «mensual, anual, impostos, renda model 100, tresoreria, saldo inicial, fiances obertes». A `/balanc` només hi ha un navegador de període (Mes / Trimestre / Any / Personalitzat). Els impostos i la renda són a la pàgina separada `/impostos`. La pestanya **«Situació»** (tresoreria, saldo inicial, actiu/passiu) existeix al codi però està **amagada** (`MOSTRA_SITUACIO = false`). El **«Saldo inicial de tresoreria (€)»** es configura a Configuració → «Balanç de situació», però només el fa servir aquesta vista amagada (i ni tan sols el suma a la tresoreria). **Fiances obertes**: hi ha `getFiancesObertes` i `GET /api/balanc/fiances`, però **cap pantalla** la mostra. Cal confirmar si s'han de documentar com a funcions futures.
2. **Personal al Balanç:** `getBalanc` només suma **jornades** com a personal; **no** suma nòmines ni bugaderia. A `/gastos` el Personal sí que inclou nòmines + jornades + bugaderia, i a Impostos/llibre d'IVA les nòmines compten. Possible incoherència del Balanç (el benefici seria massa alt si hi ha nòmines).
3. **«Benefici real» vs «+ fiança»:** el comentari del codi diu que la versió "+ fiança" és benefici + retencions; a la UI es diu «Benefici total». He documentat «Benefici total». Confirmar el nom desitjat.
4. **`/gastos-fixos`:** no surt al menú; els botons «Registrar pagament» (`POST /api/gastos-fixos/:id/pagar`) i «Editar» (`PATCH /api/gastos-fixos/:id`) criden rutes que **no existeixen** (només hi ha `src/app/api/gastos-fixos/route.ts`). A més, el CLAUDE.md parla de quatre pestanyes a `/gastos` (Resum, Variables, Fixes, Personal), però el codi només en té tres i el servei diu «Ja no hi ha apartat Fixes». Cal decidir si la pantalla es manté.
5. **Categories que no existeixen per defecte:** el seed crea Neteja, Manteniment, Electricitat, Aigua, Internet, Assegurances, Màrqueting, Personal, Mobiliari, Electrodomèstics, Reformes, Animals, Altres. El codi d'impostos espera també **«Impostos»/«Impostos i taxes»**, **«Autònoms»**, **«Seguretat Social»**, **«Lloguer»** (i la pàgina Impostos ho recomana), però **no hi ha cap pantalla per crear categories** (`/api/categories-gasto` només té GET). Com les crea l'usuària?
6. **Columnes «Compras 5/10/21%» i «Gestoría»** del Libro de gastos: cap categoria hi va; només a mà. Confirmar si és volgut.
7. **Llibre d'IVA desat:** no hi ha manera (UI ni API DELETE) de tornar a la versió generada. Les factures/despeses noves d'un trimestre ja desat no hi entren. Les edicions del «Libro de gastos» no afecten `/impostos`. Confirmar el flux recomanat.
8. **Llibre d'IVA — model 303 com a full:** l'encàrrec esmenta «qualsevol full nou, p.ex. model 303». Al codi actual no hi ha cap full 303 dins del llibre; el 303 és a `/impostos`.
9. **Comentari desfasat** a `llibre-iva.ts`: diu «NOMÉS ingressos de moment», però ja hi ha despeses. I la targeta de Facturació es diu «Llibre d'IVA trimestral (ingressos)» tot i que inclou despeses.
10. **Serveis recurrents:** el formulari no permet entrar base/IVA/IRPF del servei (el model sí que en té); el registre de factura tampoc demana número de factura ni IVA. En editar un servei, `categoriaId` es posa a `''` (la categoria ja assignada no es mostra i podria perdre's en desar?). Verificar.
11. **Taxa turística — dos camps de tarifa:** «Import per persona i nit (€)» (`ieetTarifa`, per a la pàgina) i «IEET (€/persona·nit)» (`ieetImportPersonaNit`, a Facturació i RGPD). Confirmar que no s'han d'unificar. La declaració de menors té **17 anys fix** (no llegeix `ieetEdatMinima`).
12. **Veri\*Factu:** el banner diu que la sèrie i el mode de proves es configuren a Configuració, però `config-form.tsx` no té aquests camps (`verifactuSerie`, `verifactuTestMode`). NIF/raó social del productor són «TODO». Endpoint/namespaces per confirmar. Certificat `.pfx` pendent.
13. **Rol per a `/gastos`:** el middleware posa `/gastos` com a ADMIN_ONLY, però el menú lateral no hi posa restricció de rol (`roles` buit). Confirmar qui hi pot entrar realment (recepció?).
14. **Llista de despeses:** la pàgina envia `variables=1` a `/api/gastos`, però l'API l'ignora i retorna màxim **300** despeses. En períodes llargs («Tot») podrien faltar files a la llista.
15. **Cron:** l'hora (06:30 UTC) surt de `vercel.json`; si l'app no està a Vercel o falta `CRON_SECRET`, la generació depèn d'obrir el Tauler.
16. **Termini del 130 al 4T i del 390/180:** l'app calcula 30/01 (303 i 130), 20/01 (115), 30/01 (390) i 31/01 (180), sense festius. Confirmar amb la gestoria.
17. **Desglossament d'IVA per a ingressos:** si alguna factura emesa tingués IVA guardat a un tipus diferent del 10 %, el «Libro de ingresos» continua posant la capçalera «IVA 10%».
18. **347 sense detall quan «No cal».** Quan ningú no passa del límit, l'estat és `no_cal` i la targeta només mostra «Sense activitat en aquest període: no cal presentar-lo.». El text del component `Detall347` («Ara mateix no cal… Es torna a calcular sol fins al 31 de desembre») i la llista «S’hi acosten» **no surten mai** en aquest cas, perquè `ModelCard` no pinta l'`extra` quan l'estat és `no_cal`. Sembla un error: el «S’hi acosten» seria útil precisament llavors.
19. **347 a Plantilles.** El missatge del commit diu «fitxer per a la Seu a Plantilles», però al codi el 347 de Plantilles només té «Obre Impostos» (sense fitxer). He documentat el codi.
20. **Fitxer de Plantilles sempre amb «ingrés».** A Plantilles, «PDF oficial (AEAT)» i «Fitxer per presentar» porten sempre `pagament=I`; a Impostos es tria U/I segons la data. Confirmar que és volgut (si la usuària domicilia, ha de baixar el fitxer des d'Impostos).
21. **Formulari oficial (PDF) del BOE:** no he pogut confirmar si aquest PDF omplert serveix per presentar-lo en paper o només per revisar-lo. El manual diu que és per revisar/tenir-lo i que es presenta a la Seu.
22. **Avís del BOE:** només vigila els models 303, 130, 115, 390, 180 i 100. **No** vigila el 347 ni el 950 (ATC, que no surt al BOE). El correu va a `BACKUP_EMAIL_TO` o hostalcoll@gmail.com. El cron (`30 7 * * 1`, dilluns 07:30 UTC) depèn de Vercel i de `CRON_SECRET`. Un avís marcat «Revisat» no es pot tornar a mostrar des de l'app.
23. **Titular fix a Impostos.** El nom «ELISABETH · NUALART COLL» i el NIF per defecte (38835174L) estan escrits al codi (`TITULAR_AEAT`); només el NIF es pot canviar des de Configuració. Si mai canvia la titular, cal tocar el codi.
24. **Presentació directa:** no he provat (prohibit) ni la validació ni la presentació. El text del manual surt del codi. La casella `importResultat` del 303 quan surt «a compensar» es mostra en valor absolut; no he verificat com es veu un 303 negatiu al resum del requadre.
25. **950 al 1T de l'any següent:** el 950 d'octubre–març es mostra al 1T de l'any **següent** (p. ex. octubre 2026 – març 2027 a l'any 2027 → 1T). Al 1T del 2026 surt el semestre octubre 2025 – març 2026.
