# Pagaments, fiances i factures

Aquest capítol t'explica com portar els **diners** de cada estada: què ha pagat l'hoste, què t'ha deixat en garantia (fiança o dipòsit), quins papers li dones (factures) i quins pressupostos envies abans que vingui.

Abans de començar, hi ha una idea molt important que t'estalviarà maldecaps:

> **Un pagament i una factura són dues coses diferents.**
>
> - El **pagament** són els **diners** que t'han donat (en efectiu, per Bizum, amb targeta…). És el que compta com a **ingrés** al teu balanç. Es registra el dia que cobres.
> - La **factura** és el **paper** (el document) que dones a l'hoste per justificar aquell pagament. No afegeix ni treu diners: només els documenta.
>
> Per això a l'app **primer registres el pagament** i **després fas la factura** a partir d'aquell pagament. Si fas una factura sense pagaments, no hi ha res a facturar.

I una segona idea, igual d'important:

> **Una fiança no és un ingrés.** Són diners de l'hoste que tu guardes mentre dura l'estada. Si al final els tornes, mai han estat teus. Si te'ls quedes (per un desperfecte, per exemple), aleshores sí que passen a ser un ingrés.

### Els tipus de document que pots fer

| Document | Com es diu a l'app | Numeració | Per a què |
|---|---|---|---|
| Factura simplificada | «Factura simple» | Número de contracte de l'estada: 26001, i les següents 26001.1, 26001.2… | El document normal per a un hoste particular, **fins a 400 €** IVA inclòs. |
| Factura fiscal (completa) | «Factura fiscal» | Sèrie pròpia per any: 01/26, 02/26… | Quan l'hoste és una empresa o et demana factura amb el seu NIF. |
| Factura fiscal a partir de simplificades | «Fiscal de simplificades» | Sèrie fiscal: 01/26, 02/26… | L'hoste ja tenia simplificades i després et demana la fiscal. |
| Factura rectificativa | «Factura rectificativa» | Sèrie pròpia: R26-001, R26-002… | Has retornat diners i cal un document que rebaixi una factura anterior. |
| Factura de dipòsit | «Factura de dipòsit» | Continua la numeració de l'estada: 26009.1, 26009.2… | Documentar un dipòsit. És simplificada, sense IVA i **no és ingrés**. |
| Pressupost | «Nou pressupost» / «Fer pressupost» | Pròpia: 00001, 00002… | Oferir un preu abans de l'estada. No és cap factura. |

### On és tot plegat

- **A la fitxa de cada estada** (`/estancies/[id]`) hi ha quatre caixes plegables que fan servir aquest capítol:
  - «Pagaments i fiances» (només la veu l'administradora).
  - «Facturació» (només la veu l'administradora).
  - «Cobraments pendents» (la veuen administradora i recepció).
  - «Pressupostos» (només la veu l'administradora).
- **Al menú de finances** hi ha les pestanyes «Balanç», «Facturació», «Pressupostos», «Tarifes», «Despeses», «Proveïdors i serveis» i «Veri*Factu».

[FOTO id=estada-caixes-diners ruta=/estancies/[id] descripcio="Fitxa d'una estada amb les caixes plegables Pagaments i fiances, Facturació, Cobraments pendents i Pressupostos, una sota l'altra" marques="Pagaments i fiances|Facturació|Cobraments pendents|Pressupostos"]

[FOTO id=menu-finances ruta=/factures descripcio="Barra de pestanyes de finances a dalt de la pàgina Facturació: Balanç, Facturació, Pressupostos, Tarifes, Despeses, Proveïdors i serveis i Veri*Factu" marques=""]

---

## Quin document he de fer?

| Situació | Què has de fer |
|---|---|
| L'hoste paga l'estada i és un particular. | Registra el pagament i fes una «Factura simple» (fins a **400 €** IVA inclòs). |
| L'estada passa de 400 €. | «Factura fiscal» (completa), amb el NIF/NIE i l'adreça del client, encara que sigui un particular. |
| L'hoste és una empresa o et demana factura amb NIF. | Registra el pagament i fes una «Factura fiscal». Després, a la impressió, posa-hi el nom i el NIF de l'empresa i prem «Desar canvis». |
| Ja vas fer simplificades i ara l'hoste et demana la factura fiscal. | «Fiscal de simplificades». No esborris les simplificades. |
| L'hoste paga una part ara i una part més endavant. | Registra el pagament d'ara. Apunta la resta a «Cobraments pendents». Quan pagui, registra el nou pagament. |
| L'hoste et deixa diners de garantia que li tornaràs en marxar. | «Afegir fiança». No facis factura d'aquests diners si no t'ho demanen. |
| L'hoste et deixa un dipòsit i vols donar-li un paper que ho demostri. | «Afegir dipòsit» i després, a «Facturació», «Factura de dipòsit». |
| Tornes la fiança o el dipòsit en marxar. | Botó «Tornar». No cal cap document. |
| Et quedes la fiança (o una part) per un desperfecte. | Botó «Retenir» i escriu el motiu. |
| L'hoste marxa abans i li tornes diners. | «Sortida anticipada» → «Torno diners». Després, a «Facturació», «Factura rectificativa». |
| Vols enviar un preu a algú que encara no ha vingut. | «Nou pressupost» (a `/pressupostos`) o «Fer pressupost» (a l'estada). |
| T'has equivocat en una factura que encara no és a Veri*Factu. | Llapis de la factura a l'estada, o «Desar canvis» a la impressió. |
| T'has equivocat en una factura que ja té registre Veri*Factu. | No es pot editar: cal una «Factura rectificativa». |

---

## Com faig per registrar un pagament

**Per a què serveix**
Per apuntar els diners que t'ha donat un hoste. Aquest apunt és el que fa que l'ingrés surti al balanç. Sense pagament no hi ha ingrés, i tampoc no podràs fer la factura.

**On és**
A la fitxa de l'estada (`/estancies/[id]`), caixa «Pagaments i fiances». Només la veu l'usuari administrador.

**Pas a pas**

1. Obre l'estada de l'hoste.
2. Desplega la caixa «Pagaments i fiances» si està plegada.
3. Prem el botó «Afegir pagament».

[FOTO id=pagament-botons ruta=/estancies/[id] descripcio="Caixa Pagaments i fiances amb els tres botons de baix" marques="Afegir pagament|Afegir fiança|Afegir dipòsit"]

4. Escriu l'import a la casella «Import €». Fes servir el punt o la coma per als cèntims, com et vagi millor.
5. Tria el mètode al desplegable: «Efectiu», «Targeta», «Transferència», «Bizum» o «Altres».
6. Comprova la data. Per defecte és avui. Si l'hoste et va pagar un altre dia, canvia-la: **la data és la que mana per saber de quin mes és l'ingrés**.
7. Tria quin tipus de pagament és:
   - «A compte (reserva anticipada)»: una paga i senyal abans d'arribar.
   - «Cobro (pagament a l'arribada)»: el pagament quan entra.
   - «Total (pagament complet)»: ho paga tot d'una vegada.
   - «Altre…»: t'apareix una casella «Descripció» per escriure el que vulguis.
8. Si vols, escriu una nota a «Observacions internes (no apareix a la factura)». Només la veus tu.
9. Si l'estada ja té factures, veuràs un altre desplegable. Deixa-hi «No afegir a cap factura» (és el normal). Mira el «Compte!» de sota abans de triar «Afegir a la factura …».
10. Prem «Desar pagament».

[FOTO id=pagament-formulari ruta=/estancies/[id] descripcio="Formulari obert per afegir un pagament, amb l'import, el mètode, la data, el tipus de pagament i les observacions" marques="Import €|Observacions internes (no apareix a la factura)|Desar pagament"]

**Què passa després / d'on surten les dades**
- El pagament surt a la caixa amb una etiqueta «Pagament», l'import, el tipus, el mètode i la data.
- A dalt veuràs la suma «A compte (sense factura): …». Vol dir que són diners cobrats però encara sense factura.
- **Al balanç** (`/balanc`) compta com a ingrés **des d'aquest moment**, al mes de la data que has posat (tant si hi ha factura com si no). També surt al desglossament per mètode de cobrament.
- **Al llibre d'IVA** encara no surt: el llibre es fa a partir de les factures. Sortirà quan facis la factura.
- **A Veri*Factu** no hi va: Veri*Factu només registra factures, mai pagaments.

**Per què es fa així**
Hisenda vol saber quan has cobrat i quant. L'app separa el cobrament (diners) del document (factura) perquè sovint cobres en dues o tres vegades i fas una sola factura, o al revés.

**Si t'has equivocat**
Mira la secció «Com faig per corregir o eliminar un pagament».

**Compte!**
- L'import ha de ser **positiu**. Aquí no pots apuntar una devolució (mira «Com faig per registrar una devolució»).
- «Afegir a la factura …» enganxa el pagament a una factura que ja existeix, però **no canvia l'import de la factura**. Fes-ho només si la factura ja tenia l'import correcte i només hi faltava el pagament.
- Si l'hoste paga amb targeta un import i et deixa la resta en efectiu, fes **dos pagaments**, un per a cada mètode. Així el desglossament per mètode quadra amb la caixa.
- El mètode «Altres» pot quedar amagat a algunes vistes restringides de finances.

---

## Com faig per repartir un pagament entre diversos mesos

**Per a què serveix**
Quan un hoste et paga d'un cop una estada llarga (per exemple, el 5 de juliol et paga juliol i agost), l'app normalment posaria tot l'ingrés al juliol. Si el reparteixes, el balanç posa a cada mes la part que li toca.

**On és**
Dins del mateix formulari d'«Afegir pagament» (i també del d'«Afegir fiança» i «Afegir dipòsit»).

**Pas a pas**

1. Obre el formulari amb «Afegir pagament».
2. Escriu l'import total a «Import €».
3. Tens dues maneres de repartir-lo:
   - **Automàtica:** prem «Proposar per mesos». L'app reparteix el teu import entre els mesos de l'estada segons la calculadora de preus. Llegeix el missatge blau: si diu que «quadra», perfecte; si avisa d'una diferència, l'app ha repartit **el teu** import igualment, però revisa'l.
   - **A mà:** marca la casella «Repartir per període d'estada (perquè a comptabilitat compti cada mes per separat)». Per a cada tros, posa la data d'inici, la data de fi i l'import. Fes servir «Afegir període» per afegir més línies i la paperera «Treure aquest període» per treure'n.
4. Mira el «Total períodes» de sota. Quan reparteixes, la casella «Import €» de dalt queda bloquejada i mostra la suma dels períodes.
5. Prem «Desar pagament» (o «Desar fiança» / «Desar dipòsit»).

[FOTO id=pagament-periodes ruta=/estancies/[id] descripcio="Formulari de pagament d'una estada llarga després de prémer Proposar per mesos: la casella de repartir queda marcada i surt una línia de període per a cada mes" marques="Proposar per mesos|Repartir per període d'estada (perquè a comptabilitat compti cada mes per separat)|Afegir període|Total períodes"]

**Què passa després / d'on surten les dades**
- Sota el pagament veuràs una línia petita amb el repartiment, per exemple «5 jul – 31 jul: 700,00 € · 1 ago – 20 ago: 470,00 €».
- **Al balanç**, cada mes compta només la part dels períodes que hi cauen, encara que el pagament s'hagi fet un altre dia.
- La factura no canvia: el repartiment només afecta la comptabilitat mensual.

**Per què es fa així**
Perquè el balanç de cada mes reflecteixi el que realment has guanyat aquell mes, no el dia que l'hoste va passar per caixa.

**Si t'has equivocat**
Un cop desat, el formulari d'edició del pagament (llapis) no permet tocar els períodes. Elimina el pagament i torna'l a fer amb el repartiment correcte (només es pot si encara no és dins d'una factura).

**Compte!**
- La suma dels períodes ha de coincidir **exactament** amb l'import. Si no, l'app no et deixarà desar i t'avisarà: «La suma dels períodes (…) no coincideix amb l'import total (…)».
- La data de fi de cada període ha de ser igual o posterior a la d'inici.
- «Proposar per mesos» necessita que primer hagis escrit l'import. Si no, et dirà «Posa primer l'import a repartir.».

---

## Com faig per corregir o eliminar un pagament

**Per a què serveix**
Per arreglar un import, un mètode o una data mal posats, o per esborrar un pagament que no tocava.

**On és**
Caixa «Pagaments i fiances» de l'estada. Cada pagament **a compte** (sense factura) té un llapis «Editar» i una paperera «Eliminar» a la dreta.

**Pas a pas per corregir**

1. Prem el llapis del pagament.
2. Canvia el que calgui: «Import», «Mètode», «Data» o «Observacions internes».
3. Prem «Desar». Si t'ho repenses, «Cancel·lar».

[FOTO id=pagament-editar ruta=/estancies/[id] descripcio="Un pagament obert en mode edició amb les caselles d'import, mètode, data i observacions" marques="Import|Mètode|Data|Observacions internes|Desar"]

**Pas a pas per eliminar**

1. Prem la paperera del pagament.
2. Sortirà el missatge «Eliminar aquest pagament?» amb el text «S'eliminarà aquest pagament a compte de l'estada.».
3. Confirma.

**Què passa després / d'on surten les dades**
- Si el corregeixes, el balanç es recalcula sol amb les dades noves.
- Si l'elimines, deixa de comptar com a ingrés.
- Queda un registre de qui ho ha fet a l'historial intern (auditoria).

**Per què es fa així**
Un pagament que ja és dins d'una factura forma part d'aquell document. Per això l'app no et deixa tocar-lo des d'aquí: primer has de resoldre la factura.

**Si t'has equivocat**
Si has eliminat un pagament per error, torna'l a crear amb «Afegir pagament» amb la mateixa data, import i mètode.

**Compte!**
- Els pagaments que ja són en una factura surten a la part «Ja en una factura», sense llapis ni paperera. Per canviar-los, o bé edites la factura des del detall (mira «Com faig per veure i editar el detall d'una factura»), que t'ofereix actualitzar els imports vinculats, o bé elimines la factura (els pagaments tornen a «a compte») i la tornes a fer.
- Quan corregeixes l'import d'una devolució, continua sent una devolució (l'app manté el signe negatiu).

---

## Com faig per apuntar un cobrament pendent

**Per a què serveix**
Per recordar-te que un hoste t'ha de pagar un import un dia concret (per exemple, la resta de l'estada a mig mes). **No és un pagament**: és només un recordatori. No compta com a ingrés.

**On és**
Fitxa de l'estada, caixa «Cobraments pendents». La poden fer servir l'administradora i recepció.

**Pas a pas**

1. Obre l'estada i desplega «Cobraments pendents».
2. A baix, omple:
   - «Import (€)».
   - «Data prevista»: el dia que ha de pagar.
   - «Concepte (opcional)»: per exemple «Resta de l'allotjament…».
3. Prem «Afegir».

[FOTO id=cobrament-pendent-afegir ruta=/estancies/[id] descripcio="Caixa Cobraments pendents amb el formulari d'import, data prevista i concepte, i un cobrament ja apuntat" marques="Import (€)|Data prevista|Concepte (opcional)|Afegir"]

4. Quan arribi el dia i l'hoste pagui:
   - Prem «Marcar pagat» al cobrament pendent.
   - **I a més** registra el pagament de veritat a «Pagaments i fiances» → «Afegir pagament».

**Què passa després / d'on surten les dades**
- A la llista surt l'import, «previst el …» i el concepte.
- Si la data ja ha arribat i no està pagat, surt en groc amb l'etiqueta «Vençut».
- Si està marcat, surt l'etiqueta «Pagat» i el botó «Desfer».
- Al **tauler** surt a la targeta «Cobraments pendents» des del **dia abans** de la data prevista, i hi continua mentre estigui vençut, fins que el marquis com a pagat.
- També pot sortir al **pop-up** «Cobraments a punt» (mira la secció següent).
- **Al balanç no compta res**: és un recordatori.

**Per què es fa així**
Perquè no se t'escapi cap cobrament quan un hoste paga a terminis.

**Si t'has equivocat**
- Si l'has marcat com a pagat per error, prem «Desfer».
- Si l'has apuntat malament, elimina'l amb la paperera i torna'l a fer.

**Compte!**
- **«Marcar pagat» no crea cap pagament.** Només treu l'avís. Si no fas també «Afegir pagament», aquests diners no sortiran al balanç ni podràs fer-ne la factura.

---

## Com faig servir l'avís «Cobraments a punt» del tauler

**Per a què serveix**
Quan entres a l'app, si algun hoste ha de pagar avui o en els propers dos dies, et surt una finestra al mig de la pantalla perquè no te n'oblidis.

**On és**
Surt sola en entrar, a qualsevol pàgina de l'app, un cop al dia. No surt als usuaris que només poden consultar.

**Pas a pas**

1. Llegeix la llista. Cada línia diu el nom del titular, l'import i «Ha de pagar el …».
2. Per a cada cobrament tens dos botons:
   - «Ja està pagat»: el treu de la llista i el marca com a pagat.
   - «Veure estada»: et porta a la fitxa de l'estada.
3. Quan acabis, prem «Tancar per avui».

[FOTO id=popup-cobraments ruta=/ descripcio="Finestra emergent Cobraments a punt amb un cobrament i els botons" marques="Cobraments a punt|Ja està pagat|Veure estada|Tancar per avui"]

**Què passa després / d'on surten les dades**
- Si prems «Tancar per avui», no tornarà a sortir fins demà (es recorda en aquest navegador).
- Les dades surten dels «Cobraments pendents» de cada estada.

**Per què es fa així**
És un recordatori actiu per als dies just abans del pagament.

**Si t'has equivocat**
Si has premut «Ja està pagat» sense voler, ves a l'estada → «Cobraments pendents» → «Desfer».

**Compte!**
- Igual que abans: «Ja està pagat» **no registra els diners**. Després ves a l'estada i fes «Afegir pagament».
- La finestra només mostra els que vencen avui, demà o demà passat. Els que ja han vençut surten al tauler, a la targeta «Cobraments pendents», no a la finestra.
- Com que es recorda «en aquest navegador», si canvies d'ordinador o de tauleta et pot tornar a sortir el mateix dia.

---

## Com faig per registrar una devolució (cobrament negatiu)

**Per a què serveix**
Per apuntar que has **tornat diners** a un hoste (per exemple, perquè ha marxat abans). Una devolució es desa com un pagament amb import **negatiu**, i així resta de l'ingrés.

**On és**
Fitxa de l'estada, botó «Sortida anticipada» (a la part de l'estat de l'estada).

**Pas a pas**

1. Obre l'estada i prem «Sortida anticipada».
2. Omple «Data real de sortida» i, si vols, «Hora (opcional)».
3. A «Devolució de diners», tria «Torno diners».
4. Escriu l'«Import €» que tornes (en positiu; l'app ja el posarà en negatiu) i el «Mètode».
5. Prem «Confirmar sortida».

[FOTO id=sortida-anticipada-devolucio ruta=/estancies/[id] descripcio="Finestra Sortida anticipada amb la data real de sortida, l'opció Torno diners marcada, l'import a retornar, el mètode i el botó Confirmar sortida" marques=""]

**Què passa després / d'on surten les dades**
- A «Pagaments i fiances» apareix un pagament negatiu amb el text «Devolució per sortida anticipada».
- La devolució es data **el dia de l'últim pagament** de l'hoste (no el dia que la fas). Així, al balanç, es resta del mateix mes on va entrar el diner i l'ingrés d'aquell mes queda net.
- L'estada passa a finalitzada, s'allibera l'habitació i queda una nota interna.
- A «Facturació» apareix el botó «Factura rectificativa» (si l'estada ja tenia alguna factura).

**Per què es fa així**
Si ja havies fet una factura per l'import complet i després tornes diners, la llei obliga a fer un document que rebaixi aquella factura: la factura rectificativa (mira la seva secció).

**Si t'has equivocat**
A l'estada surt el botó «Reactivar (tornar a allotjat)». Desfà la sortida anticipada: torna la data de sortida original, esborra la nota i **esborra la devolució**.

**Compte!**
- Fora de la sortida anticipada, a la caixa «Pagaments i fiances» no hi ha cap botó per apuntar una devolució (el formulari només accepta imports positius). Mira els DUBTES.
- Tornar una **fiança** no és una devolució. Per a les fiances fes servir el botó «Tornar» (mira «Com faig per tornar una fiança o un dipòsit»).

---

## Fiances i dipòsits: què són i en què es diferencien

Abans de les tasques, entén bé aquests dos conceptes.

**La fiança** és una garantia. L'hoste et deixa uns diners en arribar (per exemple 100 €) i tu els hi tornes en marxar si tot està bé. Si ha trencat alguna cosa, te'ls pots quedar tots o una part.

**El dipòsit** funciona igual (són diners en garantia), però és el que vols **documentar amb un paper propi**: una «Factura de dipòsit». És una factura simplificada **sense IVA** i que **no compta com a ingrés**.

A l'app tots dos es guarden igual i tenen els mateixos tres estats. Les diferències són aquestes:

| | Fiança | Dipòsit |
|---|---|---|
| Botó per crear-lo | «Afegir fiança» (taronja) | «Afegir dipòsit» (verd blavós) |
| Etiqueta a la llista | «Fiança» | «Dipòsit» |
| Document propi | No (opcionalment, pots incloure-la dins una factura normal) | Sí, «Factura de dipòsit», que crees a mà |
| Botons «Tornar» i «Retenir» | Dins del llapis | A la vista, sense obrir res |
| És ingrés mentre la guardes? | No | No |

### Els tres estats

| Estat (al codi) | Com surt a la pantalla | Què vol dir |
|---|---|---|
| EN_CUSTODIA | «En custòdia» | La guardes tu. No és teva. |
| TORNAT | «Tornada» (fiança) / «Tornat» (dipòsit) | L'has tornat a l'hoste. Mai ha estat teva. |
| RETINGUT | «Retinguda (ingrés)» / «Retingut» | Te l'has quedat. Ara sí que és un ingrés teu. |

### Esquema: la vida d'una fiança i què passa als comptes

```
                   «Afegir fiança» / «Afegir dipòsit»
                                  |
                                  v
                    +----------------------------+
                    |        EN CUSTÒDIA         |
                    |  (és de l'hoste, la guardes)|
                    +----------------------------+
                      |                        |
          botó «Tornar»                        botó «Retenir» (+ motiu)
                      |                        |
                      v                        v
        +------------------------+   +-----------------------------+
        |        TORNADA         |   |          RETINGUDA          |
        | (l'has tornat; mai ha  |   | (te la quedes; ara és       |
        |  estat teva)           |   |  un ingrés teu)             |
        +------------------------+   +-----------------------------+
                      \                        /
                       \___ icona de desfer ___/
                      «Tornar a custòdia» (torna a dalt)
```

Què passa als comptes en cada estat:

```
ESTAT          BALANÇ (/balanc)                              LLIBRE D'IVA                 BENEFICI
-------------  --------------------------------------------  ---------------------------  -------------------------
EN CUSTÒDIA    Surt A PART, a la caixa «Fiances» →           Si té factura de dipòsit o   NO hi compta.
               «Rebudes» (mes de la data de la fiança).      va «amb fiança» dins una     Es mostra a part:
               Al balanç de situació, com a «Fiances         factura: columna «Depósito», «benefici + fiança».
               rebudes a retornar» (passiu).                 que NO suma com a ingrés.
               NO és ingrés.

TORNADA        Desapareix de «Rebudes».                      El document (si n'hi ha)     NO hi compta.
               No surt enlloc com a ingrés.                  continua a la columna
                                                             «Depósito», sense sumar.

RETINGUDA      Passa a INGRESSOS, com a «Fiances retingudes  No hi surt sola com a        SÍ hi compta.
               (ingrés)», el MES EN QUÈ PREMS «Retenir»       ingrés (mira els DUBTES).
               (o repartida pels períodes, si en té).
```

---

## Com faig per registrar una fiança

**Per a què serveix**
Per apuntar els diners que l'hoste et deixa en garantia i que, en principi, li tornaràs.

**On és**
Fitxa de l'estada, caixa «Pagaments i fiances», botó taronja «Afegir fiança». Només per a l'administradora.

**Pas a pas**

1. Obre l'estada i desplega «Pagaments i fiances».
2. Prem «Afegir fiança».
3. Escriu l'import a «Import €».
4. Tria el mètode («Efectiu», «Targeta», «Transferència», «Bizum» o «Altres»).
5. Comprova la data (per defecte, avui).
6. Al desplegable de tipus, deixa «Cobro (pagament a l'arribada)» o tria el que vulguis. Aquest text és només una **etiqueta** que veuràs al costat de la fiança.
7. Si vols, escriu una nota a «Observacions internes (no apareix a la factura)».
8. Si la fiança s'ha de repartir per mesos (cas rar), fes-ho com expliquem a «Com faig per repartir una fiança o un dipòsit per períodes».
9. Prem «Desar fiança».

[FOTO id=fianca-formulari ruta=/estancies/[id] descripcio="Formulari obert després de prémer Afegir fiança, amb el botó de desar de la fiança" marques="Import €|Observacions internes (no apareix a la factura)|Desar fiança"]

**Què passa després / d'on surten les dades**
- La fiança surt a la llista amb fons groguenc i l'etiqueta «Fiança».
- Estat: «En custòdia».
- **Balanç:** no és ingrés. Surt a part, a la caixa «Fiances» → «Rebudes», al mes de la data de la fiança. Al balanç de situació, surt com a «Tresoreria — efectiu de fiances en dipòsit» (el que tens) i com a «Fiances rebudes a retornar» (el que deus).
- **Llibre d'IVA:** no hi surt (no hi ha cap factura).
- **Veri*Factu:** no hi va.

[FOTO id=fianca-en-custodia ruta=/estancies/[id] descripcio="Llista de Pagaments i fiances amb un pagament i una fiança en custòdia, amb les etiquetes Pagament i Fiança" marques="A compte (sense factura)|Pagament|Fiança"]

**Per què es fa així**
La fiança no és el preu de cap servei: és una garantia que hauràs de tornar. Per això no és un ingrés ni porta IVA mentre la guardes.

**Si t'has equivocat**
Prem el llapis de la fiança i corregeix-la, o elimina-la amb la paperera (mira «Com faig per editar o eliminar una fiança o un dipòsit»).

**Compte!**
- Quan facis una factura de l'estada, l'app **marca per defecte** les fiances en custòdia per incloure-les a la factura. Si no vols que la fiança vagi a la factura, **desmarca-la** abans de crear-la (mira «Com faig per decidir si la fiança va dins la factura»).
- Un cop una fiança és dins d'una factura normal, a la caixa passa a «Ja en una factura» i **ja no hi veuràs els botons «Tornar» i «Retenir»**. Mira els DUBTES.

---

## Com faig per registrar un dipòsit

**Per a què serveix**
Igual que la fiança, però per als casos en què vols donar a l'hoste un document propi del dipòsit (la «Factura de dipòsit»).

**On és**
Fitxa de l'estada, caixa «Pagaments i fiances», botó verd blavós «Afegir dipòsit».

**Pas a pas**

1. Obre l'estada i desplega «Pagaments i fiances».
2. Prem «Afegir dipòsit».
3. Omple «Import €», el mètode, la data i, si vols, l'etiqueta i les observacions, igual que una fiança.
4. Llegeix el missatge verd: «Quedarà registrat com a dipòsit. La seva factura (simplificada, sense IVA, no compta com a ingrés) la crees tu quan vulguis a Facturació → Factura de dipòsit, on tries el número.»
5. Prem «Desar dipòsit».
6. Quan vulguis el paper, segueix «Com faig per crear la factura de dipòsit».

[FOTO id=diposit-formulari ruta=/estancies/[id] descripcio="Formulari d'Afegir dipòsit amb el missatge verd que explica la factura de dipòsit" marques="Import €|Facturació → Factura de dipòsit|Desar dipòsit"]

**Què passa després / d'on surten les dades**
- Surt a la llista amb l'etiqueta «Dipòsit» i, a la dreta, els botons «Tornar» i «Retenir» a la vista.
- Als comptes es comporta exactament igual que una fiança: **no és ingrés** mentre està «En custòdia».

**Per què es fa així**
Hi ha hostes (sobretot d'estades llargues o empreses) que volen un justificant del dipòsit. La factura de dipòsit ho resol sense que el dipòsit passi a ser un ingrés teu.

**Si t'has equivocat**
- Si encara no té document, el pots editar (llapis) o eliminar (paperera).
- Si ja té document, a la llista no veuràs ni llapis ni paperera mentre està en custòdia. Elimina primer el document (mira «Com faig per eliminar una factura») i el dipòsit tornarà a ser editable.

**Compte!**
- Fer «Afegir dipòsit» **no crea** el document. El document el fas tu, a part, quan vulguis.

---

## Com faig per tornar una fiança o un dipòsit

**Per a què serveix**
Per apuntar que l'hoste ha marxat i li has tornat els diners de garantia.

**On és**
Caixa «Pagaments i fiances» de l'estada.
- **Fiança:** dins del llapis (prem el llapis i, a la dreta, surt «Tornar»).
- **Dipòsit:** botó «Tornar» directament a la seva línia.

**Pas a pas**

1. Busca la fiança o el dipòsit a la llista (fons groguenc).
2. Si és una fiança, prem el llapis «Editar». Si és un dipòsit, salta aquest pas.
3. Prem «Tornar».

[FOTO id=fianca-tornar-retenir ruta=/estancies/[id] descripcio="Una fiança oberta amb el llapis, on es veuen a la dreta els botons per tornar-la o retenir-la" marques="Tornar|Retenir"]

**Què passa després / d'on surten les dades**
- La fiança desapareix de la llista principal i passa a la secció plegable «Fiances i dipòsits resolts», amb l'etiqueta «Tornada» (o «Tornat»).
- **Balanç:** deixa de sortir a «Rebudes». No és ni ha estat mai ingrés.
- **Llibre d'IVA:** si tenia factura de dipòsit, aquell document continua al llibre, a la columna «Depósito», sense sumar com a ingrés.

**Per què es fa així**
Els diners tornen a ser de l'hoste. Ni guanyes res ni perds res.

**Si t'has equivocat**
Obre «Fiances i dipòsits resolts» i prem la icona de la fletxa que torna enrere («Tornar a custòdia (desfer la resolució; deixa de comptar com a ingrés)»). Tornarà a estar «En custòdia».

**Compte!**
- No cal fer cap factura per tornar una fiança.
- Si tornes **només una part** i et quedes la resta, mira la pregunta freqüent sobre retencions parcials.

---

## Com faig per retenir una fiança o un dipòsit (amb motiu)

**Per a què serveix**
Per apuntar que et quedes la fiança perquè l'hoste ha fet un desperfecte, ha calgut una neteja extra, etc.

**On és**
Igual que «Tornar»: fiança dins del llapis, dipòsit a la vista. El botó és «Retenir».

**Pas a pas**

1. Busca la fiança o el dipòsit.
2. Fiança: prem el llapis. Dipòsit: no cal.
3. Prem «Retenir».
4. Surt la finestra «Retenir la fiança?» (o «Retenir el dipòsit?») amb el text «L'import retingut passa a comptar com a ingrés.».
5. Escriu el motiu a «Motiu (opcional)», per exemple «Desperfecte, neteja extra…». És opcional, però **et recomanem escriure'l sempre**.
6. Prem «Retenir».

[FOTO id=fianca-retenir-motiu ruta=/estancies/[id] descripcio="Finestra Retenir la fiança? amb la casella Motiu (opcional) i el botó Retenir" marques=""]

**Què passa després / d'on surten les dades**
- Passa a «Fiances i dipòsits resolts» amb l'etiqueta verda «Retinguda (ingrés)» (o «Retingut»).
- **Balanç:** ara **sí que és ingrés**. Surt a «Ingressos», dins del desglossament com a «Fiances retingudes (ingrés)», i compta al benefici.
- **El mes on compta és el mes en què prems «Retenir»**, no el mes en què l'hoste te la va donar. Si la fiança tenia períodes, compta repartida segons aquests períodes.
- Al detall de moviments del balanç surt com «… · fiança retinguda».

**Per què es fa així**
Quan te la quedes, els diners deixen de ser una garantia i passen a ser una compensació per a tu: per tant, un ingrés.

**Si t'has equivocat**
A «Fiances i dipòsits resolts», prem la fletxa «Tornar a custòdia (desfer la resolució; deixa de comptar com a ingrés)». Deixa de ser ingrés, s'esborra el motiu i torna a «En custòdia».

**Compte!**
- No hi ha cap botó per retenir **només una part**. Mira la pregunta freqüent sobre retencions parcials.
- Si la retens tard (per exemple, al mes següent), l'ingrés va al mes en què la retens. Tenir-ho en compte si ja has tancat el mes amb la gestoria.

---

## Com faig per repartir una fiança o un dipòsit per períodes

**Per a què serveix**
Si una fiança que acabaràs retenint correspon a diversos mesos i vols que, quan sigui ingrés, compti repartida per mesos.

**On és**
Al formulari d'«Afegir fiança» o «Afegir dipòsit», amb la casella «Repartir per període d'estada (perquè a comptabilitat compti cada mes per separat)» o el botó «Proposar per mesos». Funciona igual que als pagaments.

**Pas a pas**

1. Prem «Afegir fiança» (o «Afegir dipòsit»).
2. Escriu l'import.
3. Prem «Proposar per mesos» o marca la casella i omple els períodes a mà.
4. Comprova que «Total períodes» quadra.
5. Prem «Desar fiança» (o «Desar dipòsit»).

[FOTO id=fianca-periodes ruta=/estancies/[id] descripcio="Formulari de fiança d'una estada llarga després de prémer Proposar per mesos, amb una línia de període per a cada mes i el total de períodes" marques="Repartir per període d'estada (perquè a comptabilitat compti cada mes per separat)|Total períodes|Desar fiança"]

**Què passa després / d'on surten les dades**
- Sota la fiança veuràs el resum de períodes (en color ataronjat).
- **Mentre està en custòdia, els períodes no fan res**: la fiança no és ingrés.
- **Si la retens**, l'ingrés es reparteix segons els períodes (cada mes la seva part), en lloc d'anar tot al mes de la retenció.
- Si la tornes, els períodes no tenen cap efecte.

**Per què es fa així**
Perquè, en estades molt llargues, una fiança retinguda es pugui atribuir als mesos de l'estada.

**Si t'has equivocat**
No es poden editar els períodes després. Elimina la fiança (si encara no està en cap factura) i torna-la a crear.

**Compte!**
- Fes-ho només si de veritat ho necessites. En la majoria de casos no cal repartir una fiança.

---

## Com faig per editar o eliminar una fiança o un dipòsit

**Per a què serveix**
Per corregir l'import, el mètode, la data o l'etiqueta, enganxar la fiança a una factura, o esborrar-la.

**On és**
Caixa «Pagaments i fiances». Llapis «Editar» i paperera «Eliminar» de la línia (només a les fiances i dipòsits en custòdia **sense** document propi).

**Pas a pas per editar**

1. Prem el llapis.
2. Canvia «Import», «Mètode», «Data» o «Etiqueta» (per exemple «Cobro, A compte…»).
3. Si l'estada té factures, veuràs «Vincular a factura»: deixa «— Sense factura —» o tria una factura.
4. Prem «Desar».

[FOTO id=fianca-editar ruta=/estancies/[id] descripcio="Fiança en mode edició amb l'import, el mètode, la data, l'etiqueta i el desplegable de vincular a factura (per defecte, «— Sense factura —»)" marques="Import|Etiqueta|Vincular a factura|Desar"]

**Pas a pas per eliminar**

1. Prem la paperera.
2. Surt «Eliminar aquesta fiança?» amb el text «S'eliminarà la fiança definitivament.».
3. Confirma.

Per eliminar una fiança ja **resolta** (tornada o retinguda): obre «Fiances i dipòsits resolts» i prem la paperera de la línia. Si és un dipòsit amb document, el missatge serà «Eliminar aquest dipòsit?» i «S'eliminarà el dipòsit i també el seu document (el número quedarà lliure).».

**Què passa després / d'on surten les dades**
- Si el dipòsit té document, en canviar l'import o l'etiqueta el document s'actualitza sol.
- Si elimines una fiança retinguda, deixa de comptar com a ingrés.

**Per què es fa així**
L'app manté el document de dipòsit sempre igual que el dipòsit, perquè no hi hagi diferències.

**Si t'has equivocat**
Torna-la a crear amb «Afegir fiança» o «Afegir dipòsit».

**Compte!**
- Eliminar un dipòsit amb document esborra **també el document**, i el seu número queda lliure.
- «Vincular a factura» enganxa la fiança a una factura però **no canvia el total de la factura**.

---

## Com faig per crear la factura de dipòsit

**Per a què serveix**
Per donar a l'hoste un paper que demostri que t'ha deixat un dipòsit. És una factura **simplificada**, amb **una sola línia** («Dipòsit en custòdia»), **sense IVA**, i amb base, IVA i total a zero a efectes comptables: **no és un ingrés**.

**On és**
Fitxa de l'estada, caixa «Facturació», botó «Factura de dipòsit». Només surt si l'estada té alguna fiança o dipòsit en custòdia que encara no tingui factura.

**Pas a pas**

1. Obre l'estada i desplega «Facturació».
2. Prem «Factura de dipòsit».
3. Surt el requadre «Factura de dipòsit» amb el text «Factura simplificada amb una sola línia de dipòsit, sense IVA. No compta com a ingrés.».
4. Tria quin dipòsit (o fiança) vols documentar. Primer surten els dipòsits.
5. Revisa «Núm. factura:». L'app et proposa el següent número de l'estada (per exemple 26009.1). Si el deixes buit, posarà el següent.
6. Revisa «Data:». Per defecte, la del dipòsit.
7. Prem «Crear factura de dipòsit».

[FOTO id=factura-diposit-crear ruta=/estancies/[id] descripcio="Requadre Factura de dipòsit amb la fiança en custòdia seleccionada, el número proposat i la data" marques="Factura de dipòsit|Núm. factura:|Data:|Crear factura de dipòsit"]

8. S'obre en una pestanya nova el document per imprimir. A dalt diu «Dipòsit». Prem «Imprimir PDF».

[FOTO id=factura-diposit-impresa ruta=/imprimir/factura-simple/[id] descripcio="Document de dipòsit imprès amb la línia de dipòsit, base imposable 0, IVA amb guió i Total dipòsit" marques="Simplificada · Dipòsit|Base imposable|Total dipòsit|Dipòsit, sense IVA.|Imprimir PDF"]

**Què passa després / d'on surten les dades**
- A «Facturació» de l'estada surt amb l'etiqueta «Dipòsit», l'import del dipòsit i l'estat del dipòsit («En custòdia», «Tornat» o «Retingut»).
- A «Pagaments i fiances», el dipòsit mostra una etiqueta «Contracte 26009.1» que obre el document.
- A la pàgina «Facturació» (`/factures`) surt amb l'etiqueta «Dipòsit», el total en color ataronjat i l'estat «En custòdia», «Dipòsit tornat» o «Dipòsit retingut».
- **Llibre d'IVA:** surt amb el seu número a la columna «Nº Factura S.», el client amb «(DEPÓSITO)», base i IVA a 0, i l'import a la columna **«Depósito»**, que **no suma** com a ingrés. Al resum del llibre surt a part: «Depósitos (no computan como ingreso)».
- **Balanç:** res canvia. El dipòsit continua «En custòdia» a part, fins que el tornis o el retinguis.
- Si fas la factura de dipòsit d'una **fiança**, a partir d'aquell moment l'app la tracta com a **dipòsit**.

**Per què es fa així**
El dipòsit no és el preu de cap servei, per això no porta IVA ni és ingrés. Però com que ocupa un número de la sèrie de l'estada, queda registrat en ordre amb la resta de factures.

**Si t'has equivocat**
- Per canviar l'import o l'etiqueta: corregeix el **dipòsit** (no el document). El detall de la factura ho diu: «L'import, l'etiqueta i l'estat es canvien des del dipòsit, a «Pagaments i fiances» de l'estada. El document s'actualitza sol.» Si el dipòsit té document, primer cal eliminar el document per poder editar el dipòsit (mira el «Compte!»).
- Per esborrar només el document: a «Facturació», paperera de la línia. Missatge: «Eliminar el document de dipòsit …?» i «El dipòsit es manté a Pagaments i fiances; només s'elimina el document i el seu número queda lliure.».

**Compte!**
- Només es pot fer d'un dipòsit **en custòdia**. Si ja l'has tornat o retingut, l'app et dirà que no.
- Si aquella fiança ja és dins d'una factura normal, l'app no et deixarà: «aquest dipòsit ja va inclòs a la factura …. Treu-lo d'aquella factura per fer-ne el document propi.».
- El número que triïs ha de ser únic. Si ja existeix, et dirà que en triïs un altre.
- Una factura de dipòsit compta com a factura simplificada per a l'avís del tauler «Estades a facturar». Si una estada només té la factura de dipòsit, **deixarà de sortir a l'avís** encara que no hagis fet la factura de l'allotjament.

---

## Com faig per fer una factura simple (simplificada)

**Per a què serveix**
És la factura normal per a un hoste particular. Agrupa els pagaments que ha fet i li dona el document.

**On és**
Fitxa de l'estada, caixa «Facturació», botó «Factura simple».

**Pas a pas**

1. Assegura't que ja has registrat els pagaments (mira «Com faig per registrar un pagament»).
2. Obre l'estada i desplega «Facturació».
3. Prem «Factura simple». S'obre el requadre «Nova factura simple».

[FOTO id=facturacio-botons ruta=/estancies/[id] descripcio="Caixa Facturació d'una estada amb els botons per fer factures" marques="Factura simple|Factura fiscal|Factura de dipòsit|Fiscal de simplificades|Factura rectificativa"]

4. Revisa «Núm. factura:». L'app proposa el número de contracte de l'estada (per exemple 26004). Si l'estada ja en té una, proposarà 26004.1, després 26004.2, etc. Les ampliacions de l'estada continuen la mateixa sèrie.
5. Revisa «Data factura:». Per defecte és la del pagament seleccionat més recent. Si la canvies a mà, l'app ja no la tocarà.
6. Si l'estada té viatgers en habitacions separades, tria a «Habitació de la factura:» quina habitació ha de sortir.
7. A «Pagaments (ingrés)» hi ha tots els pagaments sense factura, **ja marcats**. Desmarca els que no vulguis incloure.
8. Si hi ha fiances en custòdia, surt «Fiança inclosa a la factura:» amb els botons «Amb fiança» i «Sense fiança», i la llista de fiances, també **ja marcades** (mira la secció següent per decidir-ho bé).
9. Mira el resum: «Factura: …» amb el total.
10. Si el total passa de **400 €**, surt un requadre taronja: «**Passa de 400,00 €:** per a l’allotjament ha de ser una **factura completa** (fiscal), amb el NIF/NIE i l’adreça del client.» Prem **«Fes-la fiscal»**: el requadre es torna «Nova factura fiscal», amb el número de la sèrie fiscal i tots els pagaments pendents marcats de nou. Mira «Com faig per fer una factura fiscal».
11. Prem «Crear factura».

[FOTO id=factura-simple-400 ruta=/estancies/[id] descripcio="Requadre Nova factura simple d'una estada de 480 € amb l'avís taronja que passa de 400 € i el botó Fes-la fiscal" marques="Nova factura simple|Passa de 400,00 €:|Fes-la fiscal|Crear factura"]

[FOTO id=factura-simple-formulari ruta=/estancies/[id] descripcio="Requadre Nova factura simple amb el número, la data, els pagaments marcats, la fiança i el resum" marques="Nova factura simple|Núm. factura:|Data factura:|Pagaments (ingrés)|Fiança inclosa a la factura:|Crear factura"]

12. S'obre la factura en una pestanya nova, preparada per imprimir.

**Què passa després / d'on surten les dades**
- La factura té **una sola línia** d'allotjament amb el total. La descripció es fa sola: tipus d'habitació, persones i dates (per exemple «Habitació doble (2 persones) · Del 01/07/2026 al 05/07/2026»). Si algun pagament era «A compte», hi afegeix una segona línia «A compte».
- Queda en estat «Cobrada» (perquè els diners ja els tens).
- Els pagaments passen a «Ja en una factura» amb l'etiqueta «Contracte 26004».
- **Balanç:** no canvia res. L'ingrés ja hi era des del pagament.
- **Llibre d'IVA:** surt una fila amb el número a la columna «Nº Factura S.», el client, el període de l'estada, i la base i l'IVA calculats amb l'IVA del 10% inclòs (mira «Com s'entén l'IVA del 10%»).
- **Veri*Factu:** la factura simplificada no hi va.
- **Tauler:** l'estada desapareix de la targeta «Estades a facturar».

**Per què es fa així**
La factura simplificada és la que permet el Reglament de facturació (RD 1619/2012) per a clients particulars. No cal el NIF del client. La numeració per contracte et permet trobar la factura de cada estada d'un cop d'ull.
Per a l'**allotjament**, la simplificada només es pot fer fins a **400 €, IVA inclòs** (RD 1619/2012, art. 4.1). El límit de 3.000 € que diu la mateixa norma és per a restaurants, bars i similars, **no** per a l'hospedatge (consultes de la DGT V2030-18 i V1454/2026). Per sobre de 400 €, cal la factura completa.

**Si t'has equivocat**
- Per canviar l'import, el text o el número: mira «Com faig per editar una factura».
- Si has inclòs pagaments que no tocaven: elimina la factura (els pagaments tornen a «a compte») i torna-la a fer.

**Compte!**
- L'app **marca per defecte tots** els pagaments i les fiances pendents. Revisa-ho sempre abans de prémer «Crear factura».
- Si l'estada no té número de contracte, el número serà de l'estil 2026-0001.
- Si escrius a mà un número que ja existeix, et dirà que ja existeix: canvia'l o deixa'l buit.
- Una factura ha de tenir com a mínim un pagament o una fiança seleccionats.
- L'avís dels 400 € compta el total del requadre (amb la fiança, si tries «Amb fiança»). Només avisa: si prems «Crear factura» igualment, la simplificada es crea, i surtirà al tauler a la targeta **«Simplificades de més de 400 € (cal factura completa)»** fins que en facis la fiscal (mira la secció següent).

---

## Què faig amb una simplificada de més de 400 € (avís del tauler)

**Per a què serveix:** trobar les factures simplificades d'allotjament que passen de 400 € i que encara no tenen factura completa, per fer-la.

**On és:** **Tauler** → targeta groga **«Simplificades de més de 400 € (cal factura completa)»**. La veu tothom que veu el tauler.

**Pas a pas:**

1. Toca la targeta per desplegar-la. Cada línia diu «Nom del titular · import» i, a sota, «Simplificada 26005 del dd/mm/aaaa · fes-ne la factura completa».
2. Toca el nom: s'obre l'estada.
3. A la caixa «Facturació», prem **«Fiscal de simplificades»**, deixa marcada aquella simplificada i crea la fiscal. Mira «Com faig per fer una factura fiscal a partir de simplificades».
4. A la impressió de la fiscal, posa-hi el **NIF/NIE** i l'**adreça** del client i prem «Desar canvis».
5. Torna al tauler: la línia ja no hi surt.

[FOTO id=tauler-simplificades-400 ruta=/ descripcio="Targeta del tauler Simplificades de més de 400 € (cal factura completa) desplegada, amb les simplificades sense factura completa" marques="Simplificades de més de 400 € (cal factura completa)|fes-ne la factura completa|Amaga"]

**Què passa després / d'on surten les dades:** surten les factures **simplificades** (no les de dipòsit ni les esborrades) amb un total de **més de 400 €** que **no tenen cap factura fiscal** que les cobreixi. Quan fas la «Fiscal de simplificades», la simplificada queda lligada a la fiscal i desapareix de la llista.

**Per què es fa així:** per a l'allotjament, la factura simplificada només es pot fer fins a 400 € IVA inclòs (RD 1619/2012, art. 4.1). Per sobre, cal la factura completa amb les dades del client.

**Si t'has equivocat:** si has fet la fiscal d'una simplificada que no tocava, elimina la fiscal: la simplificada torna a quedar lliure (i tornarà a sortir a la targeta).

**Compte!**
- «Amaga» treu la línia **per sempre**, però no arregla res: l'obligació de la factura completa continua.
- Per a la factura completa et caldrà el **NIF/NIE** i l'**adreça** del client: demana'ls abans que marxi.

---

## Com faig per decidir si la fiança va dins la factura (amb o sense fiança)

**Per a què serveix**
Hi ha hostes que volen un sol paper on surti tot el que t'han donat, fiança inclosa. Altres no. Aquí ho tries.

**On és**
- **En crear** una «Factura simple»: «Fiança inclosa a la factura:» → «Amb fiança» / «Sense fiança». A la «Factura fiscal», la fiança seleccionada **sempre** va inclosa al total («Fiança (inclosa al total)»).
- **Després**, al detall de la factura (`/factures/[id]`), a la caixa «Imprimir»: «Fiança inclosa a la factura:» → «Amb fiança» / «Sense fiança».

**Pas a pas (en crear la factura simple)**

1. Al requadre «Nova factura simple», mira la part de la fiança.
2. Si **no** vols que la fiança vagi a la factura de cap manera, **desmarca-la** de la llista. Aquesta és l'opció més neta.
3. Si la vols dins la factura i que sumi al total, tria «Amb fiança». El resum dirà «(fiança inclosa)».
4. Si tries «Sense fiança» però la deixes marcada, la fiança queda enganxada a la factura però no suma al total. El resum t'ensenya també el total «amb fiança: …» com a informació.
5. Prem «Crear factura».

[FOTO id=factura-amb-sense-fianca ruta=/estancies/[id] descripcio="Part de la fiança del requadre de factura simple, amb els botons Amb fiança i Sense fiança i el resum" marques="Fiança inclosa a la factura:|Amb fiança|Sense fiança|(fiança inclosa)"]

**Què passa després / d'on surten les dades**
- A la pàgina «Facturació», la factura porta l'etiqueta «Fiança» (inclosa) o «Sense fiança».
- **Balanç:** la fiança **continua** sense ser ingrés, encara que surti dins la factura. El balanç es fa amb els pagaments i les fiances, no amb les factures.
- **Llibre d'IVA:** si la fiança va «Amb fiança», l'app la resta de la base i l'IVA i la posa a la columna «Depósito», que no suma com a ingrés.
- La fiança passa a «Ja en una factura» a la caixa de pagaments.

**Per què es fa així**
La fiança no porta IVA ni és ingrés. Encara que surti al paper perquè l'hoste vegi tot el que t'ha donat, als comptes l'app la separa.

**Si t'has equivocat**
Elimina la factura (la fiança torna a quedar lliure en custòdia) i torna-la a fer amb l'opció bona.

**Compte!**
- **Molt important:** quan una fiança queda enganxada a una factura normal, a la caixa «Pagaments i fiances» ja no surten els botons «Tornar» ni «Retenir» per a aquella fiança. Si saps que l'hauràs de tornar o retenir, **millor no l'incloguis** a la factura (desmarca-la). Mira els DUBTES.
- Al detall de la factura, canviar «Amb fiança» / «Sense fiança» **no canvia l'import** de la factura: només desa la preferència.

---

## Com faig per fer una factura fiscal

**Per a què serveix**
És la factura completa, amb les dades fiscals del client. La necessites quan l'hoste és una **empresa** o un professional, o quan et demana factura amb el seu **NIF** per desgravar-se-la.

**On és**
Fitxa de l'estada, caixa «Facturació», botó «Factura fiscal».

**Pas a pas**

1. Registra primer els pagaments.
2. A «Facturació», prem «Factura fiscal». S'obre «Nova factura fiscal».
3. «Núm. factura:» proposa el següent de la sèrie fiscal de l'any: 01/26, 02/26… Normalment deixa'l com està.
4. Revisa «Data factura:» i, si cal, «Habitació de la factura:».
5. Marca els pagaments a incloure a «Pagaments (ingrés)».
6. Si hi ha fiances, veuràs «Fiança (inclosa al total)»: les fiances marcades **sempre** sumen al total de la factura fiscal. Desmarca-les si no han d'anar-hi.
7. Prem «Crear factura».

[FOTO id=factura-fiscal-formulari ruta=/estancies/[id] descripcio="Requadre Nova factura fiscal amb el número de la sèrie fiscal i la fiança inclosa al total" marques="Nova factura fiscal|Núm. factura:|Fiança (inclosa al total)|Factura fiscal:|Crear factura"]

8. S'obre la impressió de la factura fiscal (a dalt diu «Factura fiscal»).
9. **Posa-hi les dades del client empresa:** a la part «Client», escriu el nom de l'empresa, el «NIF / DNI», el domicili i la localitat. Per defecte hi surten les dades de l'hoste titular.
10. Prem «Desar canvis». Quan surti «Desat ✓», ja està guardat.
11. Prem «Imprimir PDF».

[FOTO id=factura-fiscal-impresa ruta=/imprimir/factura/[id] descripcio="Factura fiscal oberta per imprimir, amb el bloc del client, les línies, la base imposable, l'IVA i el total" marques="Client|NIF / DNI (opcional)|Base imposable|IVA|Total|Desar canvis|Imprimir PDF"]

**Què passa després / d'on surten les dades**
- A «Facturació» surt amb el número 01/26 i el text «Factura fiscal».
- **Balanç:** igual que la simple, no canvia res (l'ingrés ja hi era).
- **Llibre d'IVA:** surt amb el número a la columna «Nº Factura F.» i el NIF del client a «NIF / NIE» (el que has escrit a la factura; si no n'has escrit cap, el document de l'hoste titular).
- **Veri*Factu:** la factura fiscal és la que, quan s'activi Veri*Factu, generarà el registre per a l'AEAT. **Ara mateix l'enviament està desactivat** (falta el certificat digital), i les factures que fas des de l'estada no generen cap registre.

**Per què es fa així**
Segons el Reglament de facturació (RD 1619/2012), quan el client és un empresari o professional i vol deduir-se l'IVA, necessita una factura completa amb el seu nom i NIF. La sèrie fiscal (NN/AA) és contínua per any i separada de les simplificades.

**Si t'has equivocat**
- Mentre no tingui registre Veri*Factu, pots editar-la a la impressió i prémer «Desar canvis».
- Si ja té registre Veri*Factu, a la impressió **no hi ha** el botó «Desar canvis»: cal una factura rectificativa.

**Compte!**
- Revisa l'IVA a la impressió: llegeix «Com s'entén l'IVA del 10%» abans de tocar la casella del percentatge.
- La sèrie fiscal no reaprofita números: si n'esborres una del mig, quedarà un forat a la numeració.
- Hi ha un mode per crear «simple + fiscal alhora», però a la pantalla no hi ha cap botó per obrir-lo. Mira els DUBTES.

---

## Com faig per fer una factura fiscal a partir de simplificades

**Per a què serveix**
L'hoste ja tenia una o més factures simplificades i, més tard, et demana la factura fiscal (per exemple, perquè la paga l'empresa). Amb això fas la fiscal **sense duplicar** l'IVA.

**On és**
Caixa «Facturació» de l'estada, botó «Fiscal de simplificades». Només surt si hi ha simplificades positives que encara no tenen fiscal.

**Pas a pas**

1. Prem «Fiscal de simplificades». S'obre «Factura fiscal a partir de simplificades».
2. Llegeix: «Tria les factures simplificades que vols agrupar en una factura fiscal. Es conserven com a rebut; al Llibre d'IVA hi comptaran un sol cop (la fiscal surt a la seva columna «F.»).»
3. Per defecte estan totes marcades. Desmarca les que no vulguis.
4. Si vols, posa una «Data:». Si no, agafa la de la simplificada més recent.
5. «Núm. fiscal:» buit vol dir automàtic (per exemple 01/26).
6. Comprova el «Total:».
7. Prem «Crear factura fiscal».
8. S'obre la impressió: posa-hi les dades de l'empresa i prem «Desar canvis», com a la secció anterior.

[FOTO id=fiscal-de-simplificades ruta=/estancies/[id] descripcio="Requadre per crear una factura fiscal a partir de simplificades, amb dues simplificades marcades i el total" marques="Factura fiscal a partir de simplificades|Núm. fiscal:|Total:|Crear factura fiscal"]

**Què passa després / d'on surten les dades**
- Les simplificades **es conserven**. A la caixa «Facturació» surten amb una etiqueta «→ fiscal 01/26».
- **Llibre d'IVA:** cada simplificada continua sortint en la seva fila, però ara amb el número de la fiscal a la columna «Nº Factura F.». La fiscal **no fa fila pròpia**. Així l'IVA no es compta dues vegades.
- **Balanç:** no canvia res.

**Per què es fa així**
No es poden anul·lar sense més les simplificades que ja has donat. La fiscal les «cobreix» i el llibre ho mostra en una sola línia.

**Si t'has equivocat**
Elimina la fiscal: les simplificades queden lliures de nou i pots tornar-ho a fer.

**Compte!**
- No pots incloure una simplificada que ja té fiscal. L'app t'avisarà.
- Les rectificatives (imports negatius) no surten a la llista: «No hi ha simplificades disponibles (ja tenen fiscal, o són abonos).».

---

## Com faig per fer una factura rectificativa

**Per a què serveix**
Quan has fet una factura per un import i després **has tornat diners** a l'hoste (per exemple, perquè ha marxat abans), la factura original queda massa alta. La factura rectificativa és el document, amb **import negatiu**, que la rebaixa.

**On és**
Caixa «Facturació» de l'estada, botó «Factura rectificativa».
**Només surt si** hi ha alguna devolució registrada (un pagament negatiu encara sense factura) **i** alguna factura positiva que no sigui de dipòsit.

**Pas a pas**

1. Registra primer la devolució (mira «Com faig per registrar una devolució»).
2. A «Facturació», prem «Factura rectificativa».
3. Llegeix el missatge: diu quant has retornat, que l'import serà negatiu i que la numeració és pròpia (R26-001, -002…). També diu que «No es torna a comptar cap ingrés (la devolució ja està registrada).».
4. A «Rectifica la factura:», tria la factura original. Per defecte, l'app proposa una simplificada.
5. A la llista de devolucions, deixa marcades les que cobreix aquesta rectificativa. L'import s'actualitza sol.
6. Revisa «Import de la reducció (€):». Escriu-lo en **positiu**: l'app el desarà en negatiu («es desarà com a −… €»).
7. Revisa el «Motiu:». Per defecte posa «reducción de estancia». Canvia'l si cal.
8. Prem «Crear rectificativa».

[FOTO id=rectificativa-formulari ruta=/estancies/[id] descripcio="Requadre Factura rectificativa amb la factura original triada, la devolució marcada, l'import i el motiu" marques="Factura rectificativa|Rectifica la factura:|Import de la reducció (€):|Motiu:|Crear rectificativa"]

9. S'obre la impressió. A dalt diu «Factura rectificativa» i, a la capçalera, la fila «Rectifica» amb el número i la data de l'original. La línia diu, per exemple: «Reducción de factura simplificada Nº26001. Motivo: reducción de estancia».

[FOTO id=rectificativa-impresa ruta=/imprimir/factura-simple/[id] descripcio="Factura rectificativa impresa amb la fila Rectifica, la línia de reducció i el total negatiu" marques="Rectificativa|Rectifica|Total"]

**Què passa després / d'on surten les dades**
- A «Facturació» surt amb el text «Factura rectificativa» i l'estat «Devolta». A la pàgina «Facturació» porta l'etiqueta «Devolució».
- Les devolucions marcades queden enganxades a la rectificativa i ja no surten com a «a compte».
- **Balanç:** **no canvia res**. La devolució ja havia restat l'ingrés quan la vas registrar. La rectificativa és només el paper.
- **Llibre d'IVA:** surt amb import negatiu, **just després** de la factura que rectifica (si és del mateix trimestre), i el client amb «(RECTIFICA 26001)». La base i l'IVA també surten en negatiu.
- **Veri*Factu:** ara mateix no genera cap registre (Veri*Factu està desactivat).

**Per què es fa així**
- El **RD 1619/2012, art. 15**, diu que quan cal corregir una factura ja emesa (per exemple, perquè l'import baixa), s'ha de fer una **factura rectificativa** que faci referència a l'original. No es pot simplement esborrar o canviar l'original.
- El **mateix RD, art. 6.1.a**, obliga a fer les rectificatives en una **sèrie específica**. Per això tenen números propis (R26-001…) i no continuen la numeració del contracte.

**Si t'has equivocat**
- Mentre no tingui registre Veri*Factu, pots corregir el text, la data o l'import a la impressió i prémer «Desar canvis».
- O bé elimina-la: les devolucions tornen a quedar lliures i pots tornar-la a fer.

**Compte!**
- Sense una devolució registrada, el botó no surt. No es pot fer una rectificativa «en blanc».
- No es pot rectificar una altra rectificativa ni un document de dipòsit.
- La **data** de la rectificativa és la del dia que la crees (la data d'expedició). Per això entra al llibre d'IVA del **trimestre en què la fas**, encara que l'estada sigui d'un trimestre anterior. Si l'has de canviar, fes-ho a la impressió (casella «Data») i prem «Desar canvis».
- La sèrie R no reaprofita números: si n'esborres una del mig, quedarà un forat.

---

## Com faig per editar una factura des de l'estada (llapis)

**Per a què serveix**
Per canviar ràpidament el número o les línies (text i import) d'una factura sense sortir de l'estada.

**On és**
Caixa «Facturació» de l'estada. Cada factura té un llapis «Editar la factura aquí».

**Pas a pas**

1. Prem el llapis de la factura. S'obre a sota.
2. Canvia el «Núm. factura:» si cal.
3. Canvia el concepte o l'import de cada línia. Per afegir-ne una, «+ Afegir línia». Per treure-la, la paperera «Treure línia».
4. Comprova el «Total:».
5. Prem «Desar». O «Cancel·lar» si t'ho repenses.

[FOTO id=factura-editar-llapis ruta=/estancies/[id] descripcio="Factura oberta amb el llapis a la caixa Facturació, amb el número, les línies, el total i el botó desar" marques="Núm. factura:|+ Afegir línia|Total:|Desar"]

**Què passa després / d'on surten les dades**
- La factura es recalcula amb les línies noves. L'estat («Cobrada» / «Pendent») es recalcula comparant el nou total amb els pagaments que té.
- **Llibre d'IVA:** surt amb el nou import.
- **Balanç:** **no canvia** (el balanç es fa amb els pagaments). Si l'import real que t'han pagat era diferent, corregeix també el pagament.

**Per què es fa així**
És la manera ràpida per corregir un error de text o d'import.

**Si t'has equivocat**
Torna a obrir el llapis i corregeix-ho.

**Compte!**
- Si la factura té registre Veri*Factu, l'app no et deixarà desar: «Una factura amb registre Veri*Factu no es pot editar; cal emetre una factura rectificativa.».
- Aquest editor **no** et pregunta si vols actualitzar els pagaments. Si canvies l'import, ves a la pàgina de detall (mira més avall) o corregeix el pagament a part.
- El número nou no pot coincidir amb el d'una altra factura.

---

## Com faig per editar una factura a la impressió («Desar canvis»)

**Per a què serveix**
Per deixar la factura exactament com vols que surti al paper: dades del client (per exemple, facturar a una empresa en lloc de l'hoste), dades de l'emissor, número, data, línies, quantitats i preus.

**On és**
A la pàgina d'impressió de la factura:
- Simplificades, dipòsits i rectificatives: `/imprimir/factura-simple/[id]`.
- Fiscals: `/imprimir/factura/[id]`.

S'hi arriba fent clic al número de la factura (a l'estada o a la pàgina «Facturació»), o en crear-la.

**Pas a pas**

1. Obre la factura.
2. Tot el que veus es pot escriure: fes clic a sobre i canvia-ho. Quan hi escrius, el camp es pinta d'un color suau.
3. Pots canviar:
   - **Emissor** (a dalt a la dreta): titular, NIF, adreça, codi postal i localitat, telèfon. També el nom i el subtítol de dalt a l'esquerra.
   - **Client**: nom, «NIF / DNI (opcional)», «Domicili (opcional)», «Localitat (opcional)».
   - **Número** i **Data** (format dd/mm/aaaa).
   - **Línies**: quantitat («Cant.»), concepte, detall (la segona línia més petita), «Preu (€)» i «Import (€)». Si canvies quantitat o preu, l'import es calcula sol; si escrius l'import, el preu el segueix.
   - A la fiscal, també el percentatge d'IVA.
4. Per afegir una línia, «+ Afegir línia». Per treure'n una, la «×» de la dreta.
5. Prem «Desar canvis». Espera que surti «Desat ✓».

[FOTO id=factura-simple-impresa-editable ruta=/imprimir/factura-simple/[id] descripcio="Factura simplificada a la pantalla d'impressió, amb la barra de dalt i els camps del client editables" marques="+ Afegir línia|Desar canvis|Imprimir PDF|Client|Número|Data"]

**Què passa després / d'on surten les dades**
- Les dades del **client** i de l'**emissor** que escrius es guarden **dins d'aquella factura** («sobreescriptures»). Les de l'hoste i de la configuració no es toquen. Si un camp el deixes buit, la factura tornarà a agafar el valor automàtic.
- Les línies, el número i la data es guarden a la factura i es recalcula el total.
- La resta de textos (nom de l'hostal, telèfon, habitació…) també queden guardats per a aquell document.
- **Llibre d'IVA:** fa servir el client escrit a la factura i el període que surt al text de les línies (per exemple «Del 01/07/2026 al 05/07/2026»).
- **Balanç:** no canvia res.

**Per què es fa així**
Moltes vegades qui paga la factura no és l'hoste que s'allotja (és l'empresa on treballa). Així pots facturar a l'empresa sense canviar la fitxa de l'hoste ni el registre de Mossos.

**Si t'has equivocat**
Torna a obrir la factura, corregeix-ho i torna a prémer «Desar canvis».

**Compte!**
- **Si no prems «Desar canvis», els canvis es perden** quan tanquis la pestanya.
- **Quan NO es pot editar:** si la factura fiscal té registre **Veri*Factu**, el botó «Desar canvis» **no surt**. Una factura registrada a Veri*Factu no es pot canviar: cal una rectificativa.
- A les simplificades amb fiança, les files de fiança que surten a la impressió **no** es desen com a línies de la factura («les línies de fiança no es desen aquí»).
- Cal com a mínim una línia amb concepte o import.
- Les dates s'han d'escriure com dd/mm/aaaa. Si no, l'app no les acceptarà.

---

## Com s'entén l'IVA del 10% (i com es desglossa)

**Per a què serveix**
Per entendre per què a la factura veus un total i al llibre d'IVA veus una base i un IVA.

**On és**
- A la factura simplificada: només surt el **Total**.
- A la factura fiscal: «Base imposable», «IVA (…%)» i «Total».
- Al llibre d'IVA (`/imprimir/trimestre-ingressos/[periode]`): «Base imponible», «% IVA», «IVA», «Total».

**Pas a pas (com llegir-ho)**

1. Els preus de l'allotjament es cobren **amb l'IVA inclòs**, al **10%** (és l'IVA de l'hostaleria).
2. Quan fas una factura des de l'estada, l'app guarda **el total** (el que t'ha pagat l'hoste) i no hi separa l'IVA.
3. El **llibre d'IVA** fa el desglossament sol: base = total ÷ 1,10; IVA = total − base.
   - Exemple: total 110,00 € → base 100,00 € i IVA 10,00 €.
   - Exemple: total 450,00 € → base 409,09 € i IVA 40,91 €.
4. Si en una factura ja hi ha un IVA guardat (perquè l'has posat a mà a la fiscal), el llibre respecta aquell IVA.

[FOTO id=llibre-iva-desglossament ruta=/imprimir/trimestre-ingressos/[periode] descripcio="Llibre d'IVA del trimestre amb la taula Facturas emitidas, les columnes de base, IVA, total i Depósito" marques="Facturas emitidas · Repercutidas|Base imponible|% IVA|IVA|Total|Depósito"]

**Què passa després / d'on surten les dades**
- El resum del llibre mostra «Base imponible», «IVA repercutido (10%)», «Total ingresos» i, si n'hi ha, «Depósitos (no computan como ingreso)».
- Les fiances i dipòsits inclosos en factures es treuen de la base i l'IVA i van a la columna «Depósito».

**Per què es fa així**
La Llei de l'IVA aplica el tipus reduït del 10% als serveis d'hostaleria. Com que a l'hoste li dones un preu final, l'IVA hi va a dins.

**Si t'has equivocat**
El llibre d'IVA es pot editar a mà i desar. Mira el capítol del llibre d'IVA / impostos.

**Compte!**
- A la impressió de la **factura fiscal**, una factura feta des de l'estada surt amb «Base imposable» igual al total i «IVA (0%)». Si escrius 10 a la casella del percentatge, l'app **suma** un 10% **a sobre** de les línies i el total puja. **No ho facis sense pensar-ho**: si vols que la fiscal mostri l'IVA inclòs, cal que l'import de les línies sigui la base (sense IVA). Consulta-ho amb la gestoria (mira els DUBTES).
- La factura simplificada no mostra el desglossament d'IVA; només el total.

---

## Com faig per afegir la taxa turística (IEET) a una factura

**Per a què serveix**
La taxa turística (Impost sobre les estades en establiments turístics, IEET) es pot cobrar dins la factura com una línia a part, **sense IVA**.

**On és**
- L'import per persona i nit que es fa servir a les factures es configura a `/config`, caixa «Facturació i RGPD», camp «IEET (€/persona·nit)».
- La taxa només s'afegeix automàticament quan emets un document des de la pantalla `/verifactu`, marcant «Aplicar tassa turística (IEET, no subjecta a IVA)».
- No confonguis aquest camp amb la caixa «Taxa turística (declaració)» de la configuració: aquella serveix per a la pàgina «Taxa turística» (la declaració per estades), no per a les factures.

**Pas a pas**

1. Ves a `/config` → «Facturació i RGPD» i omple «IEET (€/persona·nit)». Desa.
2. Ves a «Veri*Factu» (`/verifactu`).
3. Tria l'«Estada», el «Tipus de document» i l'«IVA %».
4. Omple les línies.
5. Marca «Aplicar tassa turística (IEET, no subjecta a IVA)».
6. Emet el document.

[FOTO id=verifactu-ieet ruta=/verifactu descripcio="Formulari d'emissió de la pàgina Veri*Factu amb la casella per aplicar la tassa turística" marques="Estada|Tipus de document|IVA %|Aplicar tassa turística (IEET, no subjecta a IVA)"]

**Què passa després / d'on surten les dades**
- La taxa es calcula: nits × persones × import per persona i nit.
- A la factura fiscal impresa surt una fila a part «Taxa turística (IEET)», entre l'IVA i el total. Al detall de la factura surt com «Tassa turística».
- La taxa **no porta IVA**: es suma al total després de l'IVA.

**Per què es fa així**
L'IEET és un impost de la Generalitat que l'establiment cobra per compte de l'Administració. No forma part del preu de l'allotjament i, per això, no porta IVA.

**Si t'has equivocat**
Si la factura no té registre Veri*Factu, edita-la (les línies). L'import de la taxa es conserva quan edites les línies.

**Compte!**
- Les factures que fas des de la caixa «Facturació» de l'estada («Factura simple», «Factura fiscal»…) **no afegeixen la taxa** automàticament.
- El tractament fiscal de la taxa a Veri*Factu està pendent de confirmar (mira els DUBTES).

---

## Com faig per canviar l'estat d'una factura (Cobrada / Pendent)

**Per a què serveix**
Per marcar si una factura està cobrada o pendent de cobrar.

**On és**
- A la caixa «Facturació» de l'estada: fes clic a l'etiqueta d'estat («Cobrada» / «Pendent») de la factura.
- A la pàgina «Facturació» (`/factures`): clic a l'etiqueta de la columna «Estat».
- Al detall de la factura: botó «Marcar com a cobrada» o «Marcar com a pendent».

**Pas a pas**

1. Fes clic a l'etiqueta d'estat (o al botó del detall).
2. Canvia sola a l'altre estat.

[FOTO id=factura-estat-toggle ruta=/factures descripcio="Llista de factures amb l'etiqueta d'estat clicable a la columna Estat" marques="Estat|Cobrada|Pendent"]

**Què passa després / d'on surten les dades**
- La capçalera de «Facturació» suma les pendents: «… pendent de cobrament».
- **Balanç:** **no canvia res**. L'estat de la factura és només informatiu. L'ingrés el marquen els pagaments.

**Per què es fa així**
Les factures que fas des de l'estada ja neixen cobrades, perquè es fan a partir de pagaments. Aquest botó és per a casos especials.

**Si t'has equivocat**
Torna a fer clic.

**Compte!**
- Les rectificatives cobrades surten com «Devolta».
- Les factures de dipòsit no tenen aquest botó: mostren l'estat del dipòsit.

---

## Com faig per eliminar una factura

**Per a què serveix**
Per esborrar una factura feta per error (per exemple, perquè has inclòs pagaments equivocats).

**On és**
- Caixa «Facturació» de l'estada: paperera «Eliminar» de la factura.
- Pàgina «Facturació» (`/factures`): paperera de la columna «Accions».
- Detall de la factura: botó «Eliminar factura».

**Pas a pas**

1. Prem la paperera.
2. Llegeix el missatge. Des de l'estada o la llista: «Eliminar la factura …?» i «Els pagaments tornen a «a compte» de l'estada.».
3. Confirma.

[FOTO id=factura-eliminar ruta=/estancies/[id] descripcio="Finestra de confirmació Eliminar la factura …? des de la caixa Facturació, amb el text «Els pagaments tornen a «a compte» de l'estada.»" marques=""]

**Què passa després / d'on surten les dades**
- **Si la factura no té registre Veri*Factu** (el cas normal ara): s'esborra del tot. **El número queda lliure.**
  - Si era una simplificada amb número de contracte, la propera factura de l'estada tornarà a fer servir aquest número.
  - Si era la **darrera** fiscal (per exemple 05/26), la propera fiscal tornarà a ser 05/26. Si era una del mig, quedarà un forat.
- **Si té registre Veri*Factu:** no s'esborra de la base de dades; s'amaga i el número es canvia per «… (eliminada …)». Avís: «Té registre Veri*Factu (fiscal). Eliminar-la aquí NO anul·la el registre davant l'AEAT.»
- Els **pagaments** i les **fiances** que tenia tornen a estar lliures («a compte» / en custòdia) a l'estada.
- **Balanç:** els pagaments continuen comptant com a ingrés (els diners els tens igualment).
- **Llibre d'IVA:** la factura desapareix del llibre (si el trimestre no s'havia desat a mà).
- Queda constància a l'historial intern (auditoria).

**Per què es fa així**
Esborrar el paper no fa desaparèixer els diners. Per això els pagaments es queden a l'estada, preparats per fer una factura nova.

**Si t'has equivocat**
Torna a fer la factura des de «Facturació» de l'estada. Els pagaments hi seran.

**Compte!**
- La numeració de les factures ha de ser correlativa. Esborra només factures que **no has entregat** a ningú. Si ja l'has entregada, és millor una **rectificativa**.
- El missatge del detall de la factura diu que els cobraments «deixaran de comptar com a ingrés». Segons el funcionament real, **continuen comptant** (tornen a «a compte»). Mira els DUBTES.

---

## Com faig servir la pàgina Facturació (/factures)

**Per a què serveix**
Per veure totes les factures juntes, buscar-ne una, filtrar-les i obrir-les.

**On és**
Menú de finances → «Facturació» (`/factures`).

**Pas a pas**

1. Obre «Facturació».
2. A dalt veuràs el títol, quantes factures hi ha i quant hi ha «pendent de cobrament».
3. Si vols amagar els imports (per exemple, si hi ha algú mirant), prem «Amagar imports». Per tornar-los a veure, «Mostrar imports».
4. Just a sota hi ha la caixa «Llibre d'IVA trimestral (ingressos)», amb el botó «Obrir / editar / imprimir» i, si n'hi ha, els «Llibres desats».
5. Fes servir el filtre:
   - «Totes».
   - «Simplificades» (inclou rebuts, dipòsits i rectificatives).
   - «Fiscals».
6. Per ordenar, fes clic a la capçalera «Número» o «Data». Torna a fer clic per canviar l'ordre (fletxa ↑ o ↓). Per defecte, les més noves a dalt.
7. Fes clic al **número** per obrir la factura impresa.
8. Fes clic al titular per veure els viatgers de l'estada.
9. A «Accions»: el sobre per enviar-la per correu (a hostalcoll@gmail.com) i la paperera per eliminar-la.

[FOTO id=factures-llista ruta=/factures descripcio="Pàgina Facturació amb la caixa del llibre d'IVA, el filtre de tipus i la taula de factures" marques="pendent de cobrament|Amagar imports|Llibre d'IVA trimestral (ingressos)|Totes|Simplificades|Fiscals|Número|Data"]

[FOTO id=factures-etiquetes ruta=/factures?tipus=simples descripcio="Taula de factures filtrada per simplificades, on es veuen les etiquetes petites al costat dels números" marques="Fiança|Dipòsit|Devolució"]

**Què passa després / d'on surten les dades**
- Columnes: «Número», «Titular», «Data», «Base», «Total», «Estat», «Accions».
- Etiquetes al costat del número: «Fiança» (fiança inclosa), «Sense fiança», «Dipòsit» (document de dipòsit) i «Devolució» (rectificativa).
- Als documents de dipòsit, el «Total» mostra l'import del dipòsit en color ataronjat (no és ingrés) i l'«Estat» diu «En custòdia», «Dipòsit tornat» o «Dipòsit retingut».

**Per què es fa així**
És el teu arxiu de factures, ordenat i filtrable.

**Si t'has equivocat**
Si has eliminat una factura per error, torna-la a fer des de l'estada.

**Compte!**
- La llista mostra com a màxim les **100** factures més recents segons l'ordre triat.
- En vista restringida (usuari de només consulta de la propietat), s'amaguen les factures d'estades que tenen alguna fiança en custòdia, i no hi ha paperera.

---

## Com faig per veure i editar el detall d'una factura (/factures/[id])

**Per a què serveix**
Per veure una factura amb totes les seves dades, canviar-ne les línies amb ajuda per actualitzar els pagaments, canviar l'estat i triar com imprimir-la.

**On és**
`/factures/[id]`. S'hi arriba des del cercador general (secció «Factures») o des de la pàgina «Veri*Factu».

**Pas a pas**

1. A dalt veus «Factura …» amb el número, el titular, l'habitació i la data.
2. Caixa «Línies»: «Concepte», «Descripció», «Import» i, sota, la base, l'IVA, la «Tassa turística» (si n'hi ha) i el «Total».
3. Per canviar les línies, prem «Editar», canvia el que calgui («Concepte», «Descripció», «Import €»), afegeix línies amb «Afegir línia» i prem «Desar canvis».
4. Si la factura tenia pagaments o fiances vinculats i el total ha canviat, surt la finestra «Actualitzar imports vinculats?». Pots:
   - escriure el nou import de cada pagament o fiança i prémer «Actualitzar imports»;
   - o prémer «No, deixar-ho així».
5. A la dreta: l'estat i el total, i el botó «Marcar com a cobrada» / «Marcar com a pendent».
6. Caixa «Imprimir»: botons «Simple» i «Fiscal» per obrir la impressió, i, si té fiança, «Fiança inclosa a la factura:» → «Amb fiança» / «Sense fiança».
7. «Veure estada» et porta a l'estada.
8. A baix, «Eliminar factura».

[FOTO id=factura-detall ruta=/factures/[id] descripcio="Pàgina de detall d'una factura amb la caixa Línies, l'estat, la caixa Imprimir i l'enllaç a l'estada" marques="Línies|Editar|Marcar com a pendent|Imprimir|Simple|Fiscal|Veure estada|Eliminar factura"]

**Què passa després / d'on surten les dades**
- Si actualitzes els imports vinculats, **sí que canvia el balanç**, perquè canvies els pagaments (els diners).
- Si tries «No, deixar-ho així», la factura i els pagaments poden no quadrar.
- Si és un document de dipòsit, en lloc de les línies veuràs «Document de dipòsit» i el text «Factura simplificada sense IVA · no és un ingrés».

**Per què es fa així**
Aquesta pantalla és la més completa per corregir una factura i mantenir quadrats els pagaments.

**Si t'has equivocat**
Torna a «Editar».

**Compte!**
- Si la factura té registre Veri*Factu, no hi ha botó «Editar».
- **No facis servir el llapis del número d'aquesta pàgina** («Editar número») amb factures de contracte (26001…) o fiscals (01/26): hi afegeix l'any davant (per exemple «2026-26001»). Per canviar el número, fes-ho des del llapis de l'estada o des de la impressió. Mira els DUBTES.
- El botó «Fiscal» obre qualsevol factura amb el disseny de factura fiscal, encara que sigui simplificada. Fes servir el que correspongui al tipus de la factura.

---

## Com faig per imprimir o enviar una factura en PDF

**Per a què serveix**
Per donar la factura a l'hoste en paper o per correu.

**On és**
A qualsevol pàgina d'impressió: botó «Imprimir PDF» (a dalt a la dreta).
A la pàgina «Facturació»: icona del sobre per enviar-la per correu.

**Pas a pas per imprimir**

1. Obre la factura (clic al número).
2. Revisa-la. Si canvies alguna cosa, prem **primer** «Desar canvis».
3. Prem «Imprimir PDF».
4. S'obre el PDF net (sense botons ni barres). Imprimeix-lo o desa'l.

[FOTO id=imprimir-pdf ruta=/imprimir/factura-simple/[id] descripcio="Barra de dalt de la pàgina d'impressió amb el botó Imprimir PDF ressaltat" marques="Imprimir PDF"]

**Pas a pas per enviar per correu**

1. A `/factures`, prem el sobre de la factura («Enviar per correu a hostalcoll@gmail.com»).
2. Si ja s'ha enviat, el botó canvia a «Tornar a enviar».

**Què passa després / d'on surten les dades**
- El PDF es fa amb **el que veus a la pantalla**, encara que no ho hagis desat.

**Per què es fa així**
Així pots ajustar un detall per a una sola impressió. Però si no desis, la propera vegada la factura tornarà a sortir com abans.

**Si t'has equivocat**
Corregeix, prem «Desar canvis» i torna a «Imprimir PDF».

**Compte!**
- El correu s'envia a l'adreça de l'hostal (hostalcoll@gmail.com), no directament a l'hoste. Després l'hi pots reenviar tu.

---

## Com faig un pressupost

**Per a què serveix**
Per enviar un preu a algú (un particular o una empresa) **abans** que vingui. El pressupost **no és una factura**: no compta com a ingrés, no surt al llibre d'IVA i no va a Veri*Factu.

**On és**
Menú de finances → «Pressupostos» (`/pressupostos`). Només per a l'administradora.

**Pas a pas**

1. Ves a «Pressupostos».
2. Prem «Nou pressupost». L'app el crea amb el número següent (00001, 00002…) i t'obre la pàgina per omplir-lo.
3. Caixa «Dades del pressupost»:
   - «Número»: el proposat. Es pot canviar.
   - «Data».
   - «Vàlid fins a» (opcional).
   - «Idioma del document»: en quin idioma sortirà imprès (català, castellà, francès o anglès).
4. Caixa «Estada (opcional)»: si el pressupost és per a una estada que ja tens a l'app, enllaça-la. Si no, deixa-ho buit.
5. Caixa «Client»: «Nom / Empresa», «NIF / CIF», «Adreça», «Localitat».
6. Caixa «Conceptes»: escriu cada concepte a «Descripció» i l'«Import (€)». Afegeix-ne amb «Afegir concepte».
7. Revisa la «Base», el percentatge d'«IVA» i el «Total».
8. Caixa «Pagament i notes»: «Número de compte (IBAN)» (per defecte, el de l'establiment) i «Notes / observacions» (condicions, terminis…).
9. Prem «Desar».
10. Prem «Imprimir / PDF». L'app desa i obre el pressupost imprès.

[FOTO id=pressupostos-llista ruta=/pressupostos descripcio="Pàgina Pressupostos amb la llista i el botó per crear-ne un de nou" marques="Pressupostos|Nou pressupost|Número|Client|Total"]

[FOTO id=pressupost-formulari ruta=/pressupostos/[id] descripcio="Pàgina d'edició d'un pressupost amb les caixes de dades, client, conceptes i pagament" marques="Desar|Imprimir / PDF|Dades del pressupost|Idioma del document|Conceptes|IVA|Número de compte (IBAN)"]

**Què passa després / d'on surten les dades**
- Surt a la llista de «Pressupostos» amb número, data, client i total.
- Si l'has enllaçat a una estada, també surt a la caixa «Pressupostos» d'aquella estada.

**Per què es fa així**
És una oferta, no un document fiscal. Per això té numeració pròpia i no afecta cap compte.

**Si t'has equivocat**
Torna a obrir-lo des de la llista (clic al número), corregeix i «Desar».

**Compte!**
- **L'IVA del pressupost és un 21% per defecte i se suma a sobre** de la base. Per a l'allotjament, l'IVA és el 10%: canvia la casella del percentatge si cal (mira els DUBTES).
- El pressupost no es converteix sol en factura. Quan l'hoste vingui i pagui, registra el pagament i fes la factura des de l'estada.

---

## Com faig un pressupost des d'una estada

**Per a què serveix**
Drecera per fer una oferta a un hoste que ja tens registrat, amb les seves dades ja posades.

**On és**
Fitxa de l'estada, caixa «Pressupostos», botó «Fer pressupost».

**Pas a pas**

1. Obre l'estada i desplega «Pressupostos».
2. Prem «Fer pressupost».
3. S'obre el pressupost per imprimir, amb les dades del titular com a client.
4. Omple les línies i prem «Desar canvis». Després, «Imprimir PDF».

[FOTO id=pressupost-estada ruta=/estancies/[id] descripcio="Caixa Pressupostos d'una estada amb un pressupost enllaçat i el botó per fer-ne un de nou" marques="Pressupostos|Fer pressupost"]

**Què passa després / d'on surten les dades**
- Surt a la caixa «Pressupostos» de l'estada («Pressupost 00003 · data · total») amb tres icones: imprimir, editar i eliminar.
- També surt a `/pressupostos`.
- L'estada no canvia gens.

**Per què es fa així**
Per no haver de tornar a escriure les dades de l'hoste.

**Si t'has equivocat**
Prem el llapis per anar a l'editor, o la paperera per esborrar-lo.

**Compte!**
- Recorda revisar el percentatge d'IVA.

---

## Com faig per editar i imprimir un pressupost (impressió)

**Per a què serveix**
Per deixar el pressupost tal com el vols enviar.

**On és**
`/imprimir/pressupost/[id]`. S'hi arriba amb «Imprimir / PDF» (des de l'editor) o amb la icona d'impressora (des de l'estada).

**Pas a pas**

1. Fes clic sobre qualsevol text per canviar-lo (client, número, data, «Vàlid fins a», línies, IVA, forma de pagament…).
2. «+ Afegir línia» per afegir conceptes.
3. Prem «Desar canvis».
4. Prem «Imprimir PDF».

[FOTO id=pressupost-imprimir ruta=/imprimir/pressupost/[id] descripcio="Pressupost a la pantalla d'impressió amb la barra superior i el bloc de totals" marques="Pressupost|+ Afegir línia|Desar canvis|Imprimir PDF|Base|IVA|Total"]

**Què passa després / d'on surten les dades**
- Els textos surten en l'idioma triat (per exemple, en castellà «Presupuesto», «Válido hasta»).
- Si «Vàlid fins a» és buit, la fila no surt.

**Per què es fa així**
És el mateix sistema d'edició que les factures, perquè no hagis d'aprendre res nou.

**Si t'has equivocat**
Corregeix i torna a «Desar canvis».

**Compte!**
- Com a les factures, el PDF surt amb el que veus, encara que no hagis desat.

---

## Com faig per eliminar un pressupost

**Per a què serveix**
Per esborrar un pressupost que no vols.

**On és**
- A l'editor del pressupost: botó «Eliminar».
- A la caixa «Pressupostos» de l'estada: paperera «Eliminar».

**Pas a pas**

1. Prem «Eliminar» (o la paperera).
2. Surt «Eliminar pressupost» i «Segur que vols eliminar el pressupost …? El número quedarà lliure.».
3. Confirma.

[FOTO id=pressupost-eliminar ruta=/pressupostos/[id] descripcio="Finestra de confirmació Eliminar pressupost, amb el text «El número quedarà lliure.»" marques=""]

**Què passa després / d'on surten les dades**
- Desapareix de les llistes. El número queda lliure.

**Per què es fa així**
Els pressupostos no són documents fiscals: es poden esborrar sense problema.

**Si t'has equivocat**
Fes-ne un de nou.

**Compte!**
- Res.

---

## Com faig per veure les fiances i els ingressos al balanç

**Per a què serveix**
Per veure, cada mes, quant has ingressat de veritat i quantes fiances guardes.

**On és**
Menú de finances → «Balanç» (`/balanc`).

**Pas a pas**

1. Obre «Balanç» i tria el període.
2. Caixa «Resultat de l'hostal» (amb el text «sense fiances · és el que compta per a Hisenda»): «Ingressos», «Despeses», «Benefici».
3. Caixa «Fiances» (amb el text «no són ingrés ni despesa»): «Rebudes» (les dels clients, en custòdia), «Pagades» (les que tu has pagat a proveïdors) i «Saldo».
4. Fes clic a qualsevol casella per veure'n el detall.
5. Més avall, «Del benefici a la caixa» explica com passes del benefici als diners que t'han entrat.

[FOTO id=balanc-fiances ruta=/balanc descripcio="Pàgina Balanç amb la caixa Resultat de l'hostal i, al costat, la caixa Fiances amb Rebudes, Pagades i Saldo" marques="Resultat de l'hostal|sense fiances · és el que compta per a Hisenda|no són ingrés ni despesa|Rebudes|Pagades|Saldo"]

**Què passa després / d'on surten les dades**
- **Ingressos** = pagaments (menys devolucions) + fiances **retingudes**. Al desglossament surt «Fiances retingudes (ingrés)».
- **Fiances «Rebudes»** = fiances i dipòsits **en custòdia** amb data dins el període. No sumen al benefici.
- El **benefici real** no inclou les fiances en custòdia. La fiança es mostra a part, com a «benefici + fiança», perquè es pot haver de tornar. A l'exportació surt com «Moviment de caixa (benefici + rebudes − pagades)».
- Al **balanç de situació**, les fiances en custòdia surten a l'actiu («Tresoreria — efectiu de fiances en dipòsit») i al passiu («Fiances rebudes a retornar»).

**Per què es fa així**
Perquè el benefici que veus sigui el que realment és teu i el que compta per a Hisenda.

**Si t'has equivocat**
Si una xifra no quadra, revisa els pagaments i l'estat de les fiances de l'estada.

**Compte!**
- Les factures **no** fan pujar ni baixar el balanç. Només els pagaments i les fiances.
- Una fiança tornada desapareix de «Rebudes».

---

## Preguntes freqüents

**1. He fet la factura però al balanç no em surt l'ingrés. Per què?**
Perquè l'ingrés el fa el **pagament**, no la factura. Comprova que has registrat el pagament a «Pagaments i fiances» i que la data és del mes que mires.

**2. He registrat el pagament però no he fet la factura. Compta com a ingrés?**
Sí. Des del moment que el registres, compta al balanç. El que no tindràs és la fila al llibre d'IVA fins que facis la factura.

**3. Quina diferència hi ha entre «Cobraments pendents» i un pagament?**
El cobrament pendent és només un **recordatori** de diners que encara no tens. El pagament són diners que ja tens. Quan l'hoste et pagui, marca el pendent com a pagat **i** registra el pagament.

**4. M'he quedat només una part de la fiança. Com ho faig?**
L'app no té un botó per retenir una part. Una manera de fer-ho: edita la fiança (llapis) i posa-hi només l'import que et quedes; després prem «Retenir». La part que tornes no cal apuntar-la. Si vols deixar constància, escriu-ho al motiu (per exemple «Retinguts 30 € de 100 € per una tovallola trencada; tornats 70 €»). Consulta-ho amb la gestoria si cal (mira els DUBTES).

**5. Si retinc la fiança el mes següent, en quin mes compta l'ingrés?**
Al mes en què prems «Retenir». Si la fiança tenia períodes, compta repartida segons els períodes.

**6. He de fer factura de la fiança?**
No és obligatori. Si l'hoste vol un paper, fes servir «Afegir dipòsit» i després «Factura de dipòsit». Si vols que la fiança surti a la mateixa factura de l'estada, tria «Amb fiança».

**7. La factura de dipòsit fa pujar els meus ingressos o l'IVA?**
No. Té base, IVA i total a zero als comptes. Al llibre d'IVA l'import va a la columna «Depósito», que no suma.

**8. L'hoste és una empresa. Quina factura faig?**
«Factura fiscal». Després, a la impressió, escriu el nom i el NIF de l'empresa a «Client» i prem «Desar canvis».

**9. Ja havia fet la simplificada i ara em demanen la fiscal. Esborro la simplificada?**
No. Fes «Fiscal de simplificades». Les simplificades es conserven i el llibre d'IVA no duplica l'IVA.

**10. Per què el botó «Factura rectificativa» no em surt?**
Perquè només surt quan hi ha una **devolució** registrada (un pagament negatiu sense factura) i una factura positiva per rectificar. Registra primer la devolució («Sortida anticipada» → «Torno diners»).

**11. Per què la rectificativa no segueix el número del contracte (26001.1)?**
Perquè la llei (RD 1619/2012, art. 6.1.a) obliga a fer les rectificatives en una sèrie pròpia. Per això són R26-001, R26-002…

**12. Puc canviar una factura que ja he donat a l'hoste?**
Tècnicament sí, si no té registre Veri*Factu. Però si ja l'has entregada i l'import canvia, el correcte és fer una **rectificativa**. Canvia directament només errors d'escriptura (una adreça, un nom mal escrit…).

**13. He esborrat una factura. Què passa amb el número?**
Si no tenia registre Veri*Factu, el número queda lliure i l'app el pot tornar a fer servir. Per a les fiscals, si no era la darrera, quedarà un forat a la numeració.

**14. He esborrat una factura. He perdut els diners?**
No. Els pagaments tornen a «a compte» a l'estada i continuen comptant com a ingrés. Pots tornar a fer la factura.

**15. Per què a la factura simplificada no surt l'IVA?**
Perquè els preus porten l'IVA inclòs i la simplificada només mostra el total. El desglossament (base i IVA del 10%) el fa el llibre d'IVA.

**16. He marcat «Ja està pagat» al pop-up. Ja surt l'ingrés?**
No. Només treu l'avís. Has de registrar el pagament a l'estada.

**17. Puc fer una factura sense haver registrat cap pagament?**
Des de l'estada, no: necessites com a mínim un pagament o una fiança seleccionats. Registra primer el pagament.

**18. Un pressupost compta per al balanç o per a l'IVA?**
No. Un pressupost només és una oferta.

**19. Un particular paga 600 € per una setmana. Puc fer-li una simplificada?**
No: per a l'allotjament, la simplificada només arriba a 400 € IVA inclòs. Fes-li una «Factura fiscal» amb el seu NIF/NIE i l'adreça. Si ja li has fet la simplificada, fes «Fiscal de simplificades».

---

## DUBTES

> Aquesta secció és interna: **no es publicarà**. Recull coses que no queden clares al codi o que semblen incoherències i que convé confirmar abans de publicar el manual.

1. **Fiança inclosa en una factura i botons «Tornar» / «Retenir».** Quan una fiança queda vinculada a una factura normal (per defecte s'hi marca en fer la factura), passa a «Ja en una factura» i a la caixa «Pagaments i fiances» no hi ha cap botó per tornar-la ni retenir-la (els botons només surten a les fiances en custòdia sense factura o amb factura de dipòsit). No he trobat cap altra pantalla per resoldre-la. És intencionat? Cal eliminar la factura per poder tornar-la? Confirmar abans de recomanar-ho.
2. **Total del llibre d'IVA amb fiança inclosa.** A les factures «Amb fiança», el llibre treu la fiança de la base i l'IVA i la posa a «Depósito», però la columna «Total» continua mostrant el total amb la fiança, i el «Total ingresos» del resum suma aquesta columna. Sembla que la fiança acabaria sumant al «Total ingresos». Confirmar si és correcte.
3. **IVA a la factura fiscal.** Les factures creades des de l'estada es guarden amb IVA 0 i base = total. A la impressió fiscal surt «IVA (0%)». Si s'hi escriu 10, l'app suma l'IVA a sobre (no el desglossa). Cal confirmar amb la gestoria com ha de sortir l'IVA inclòs a la factura fiscal (i si caldria que l'app ho desglossés sola).
4. **Fiança retinguda i IVA.** Una fiança retinguda compta com a ingrés al balanç, però no surt al llibre d'IVA (el llibre només es fa amb factures). Cal fer una factura de l'import retingut? Porta IVA? Confirmar amb la gestoria.
5. **Retenció parcial.** No hi ha opció per retenir només una part d'una fiança. La pregunta freqüent 4 proposa editar l'import i retenir; cal validar que és el procediment desitjat.
6. **Missatge contradictori en eliminar una factura.** Al detall de la factura (`/factures/[id]`) el missatge diu que els cobraments «deixaran de comptar com a ingrés», però el codi els desvincula i continuen comptant. El missatge de l'estada i de la llista («Els pagaments tornen a «a compte»») és el correcte. Corregir el text?
7. **Editar número al detall de la factura.** El component «Editar número» de `/factures/[id]` desa el número com «AAAA-seqüència» (per exemple, de 26001 a «2026-26001»). Sembla un error amb les numeracions de contracte i fiscals.
8. **Data de la rectificativa.** *(Resolt al codi actual: ara es data el dia que es crea.)* Les rectificatives creades abans del canvi poden portar la data d'entrada de l'estada; revisar-les si cal.
9. **Devolucions fora de la sortida anticipada.** L'única manera de registrar una devolució des de la pantalla és «Sortida anticipada» → «Torno diners». Existeix un formulari de cobrament/devolució per factura (`cobrament-form`, API `/api/factures/[id]/cobraments`) que no es fa servir enlloc. Com s'ha de registrar una devolució que no sigui per sortida anticipada?
10. **Mode «simple + fiscal alhora».** Hi ha codi per crear les dues factures alhora («Nova factura simple + fiscal», «Crear les dues»), però cap botó l'obre. Està retirat o falta el botó?
11. **Veri*Factu desactivat.** La creació de registres Veri*Factu està comentada al codi; la pantalla `/verifactu` diu «Factura fiscal creada i registre Veri*Factu generat» però no en genera. Confirmar l'estat real abans d'explicar-ho a l'usuària, i revisar aquest missatge.
12. **Taxa turística (IEET) a la factura.** Només s'aplica des de `/verifactu` amb «Aplicar tassa turística…». El tractament a Veri*Factu (no subjecte, N1) està pendent de confirmar segons CLAUDE.md. S'ha d'explicar a l'usuària aquest camí o no s'utilitza?
13. **IVA dels pressupostos.** Per defecte és el 21% i se suma a sobre. Per a l'allotjament seria el 10%. Canviar el valor per defecte?
14. **Límit de la factura simplificada.** *(Resolt al codi actual.)* L'app avisa a partir de 400 € (RD 1619/2012 art. 4.1; DGT V2030-18 i V1454/2026, citades al codi). Només avisa: no impedeix crear la simplificada. L'avís del formulari compta la fiança si es tria «Amb fiança», però la targeta del tauler mira el `total` desat de la factura. No he verificat si «Fes-la fiscal» manté la data o l'habitació triades (crida `obrir('fiscal')`, que torna a calcular-ho tot).
15. **Factura de dipòsit i «Estades a facturar».** Com que la factura de dipòsit és de tipus simplificada, una estada amb només aquest document desapareix de l'avís «Estades a facturar». És el comportament desitjat?
16. **Botó «Amb fiança» / «Sense fiança» del detall.** Només desa una preferència; no canvia l'import ni, en la pràctica, el contingut imprès (a la impressió simple les files de fiança només s'afegeixen si la factura no té la fiança inclosa, cosa que no passa quan es tria «Amb fiança»). Quina és la funció real d'aquest interruptor?
17. **Rebut de fiança (`/imprimir/fianca/[estanciaId]`).** Existeix una pàgina «Rebut de fiança» («Total en custòdia») però no he trobat cap botó que hi porti. S'ha de documentar o està en desús?
18. **Dades d'emissor per defecte.** Si la configuració no té titular/NIF de facturació, les impressions posen uns valors fixos (ara «Elisabeth Nualart Coll», abans «Elisabet»; també al rebut de fiança i al pressupost). Confirmar que a `/config` → «Titular de facturació» i «NIF de facturació» estan ben omplerts.
19. **Llibre d'IVA desat.** Si un trimestre s'ha desat a mà, les factures noves, editades o eliminades després poden no reflectir-se al llibre desat. Confirmar com s'ha d'explicar (capítol d'impostos).
20. **Base legal.** He citat RD 1619/2012 (art. 6.1.a i 15), el tipus del 10% de l'hostaleria (Llei de l'IVA, art. 91) i RD 1007/2023 (Veri*Factu) de manera general. Cal revisió d'un assessor abans de publicar.
