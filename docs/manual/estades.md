# Estades

## Què és una estada

Una **estada** és cada vegada que una o més persones s’allotgen a l’hostal: qui ve, quins dies, a quina habitació i com paga. És el registre central de l’app. Tot surt d’aquí.

- **Hostes (viatgers).** Cada estada té un o més viatgers. Un d’ells és el **titular** (la persona principal). Les dades de cada persona (nom, document, adreça…) es desen a la seva **fitxa d’hoste** (menú «Hostes»). Si la mateixa persona torna un altre any, l’app reaprofita la seva fitxa: no cal tornar a escriure-ho tot.
- **Mossos d’Esquadra.** Amb les dades de l’estada i dels viatgers, l’app prepara el fitxer que s’ha de comunicar a la policia (Mossos) en un termini de **24 hores**.
- **Llibre de registre i fitxes.** Les dades de l’estada omplen el full del llibre de registre, la fitxa «Registre de persones allotjades» i el reglament intern (LOPD) que signen els hostes.
- **Diners.** Els pagaments, les fiances, les factures i els rebuts es pengen de l’estada. D’aquí surten el balanç, el llibre d’IVA i la resta de números.
- **Neteja i bugaderia.** L’habitació i les dates de l’estada serveixen per organitzar la neteja.

La idea de l’app és: **escriure cada dada una sola vegada** i fer-la servir a tot arreu.

Paraules que veuràs sovint:

- **Contracte.** Cada estada té un **número de contracte** i un **any** (per exemple, 26015/2026). És el número que surt al llibre de registre i que s’envia a Mossos.
- **Reserva.** Una estada que encara no ha començat (l’hoste encara no ha arribat).
- **Contracte en curs.** Una estada formalitzada: l’hoste ja és aquí (o arriba avui) i s’han de tenir totes les dades per a Mossos.
- **Ampliació.** Quan un hoste allarga l’estada, es crea un contracte nou enganxat al primer.
- **Esborrany.** Una estada desada amb dades incompletes, per acabar-la més tard.

---

## Com trobo una estada

**Per a què serveix**
Per veure totes les estades, filtrar-les (en curs, reserves, acabades) i buscar-ne una pel nom del client o pel número de contracte.

**On és**
Menú lateral → «Estades».

**Pas a pas**

1. Al menú lateral, fes clic a «Estades». Veuràs el títol «Estades» i, a sota, quantes n’hi ha (per exemple, «120 estades»).
2. A dalt tens unes pestanyes per filtrar. Cada una porta un número amb quantes estades hi ha:
   - «Totes»: totes les estades.
   - «En curs»: l’hoste hi és **ara** (ja ha entrat i encara no ha marxat).
   - «Reserva»: encara no han arribat (també hi surten les ampliacions que comencen més endavant).
   - «Finalitzada»: ja han marxat (la data de sortida ja ha passat).
3. Per buscar un client, escriu a la casella «Cerca client (nom, cognom, document, contracte)». No cal prémer cap botó: la llista es filtra sola mentre escrius. Pots posar diverses paraules (per exemple, nom i cognom).
4. Per esborrar la cerca, fes clic a la creueta (×) de dins de la casella.
5. Per canviar l’ordre, fes servir el desplegable «Ordenar:». Opcions:
   - «Entrada (més recent)» (és l’ordre normal)
   - «Entrada (més antiga)»
   - «Sortida (més recent)»
   - «Sortida (més antiga)»
   - «Núm. contracte (↓)»
   - «Data de creació (↓)»
6. A baix de tot hi ha els botons de pàgina per passar a la pàgina següent (la llista es mostra per pàgines).
7. Fes clic a qualsevol targeta per obrir la fitxa d’aquella estada.

[FOTO id=llista-estades ruta=/estancies descripcio="Llista d'estades amb la fila de pestanyes de filtre (Totes, En curs, Reserva, Finalitzada, cada una amb el seu número), el cercador, el desplegable d'ordre i algunes targetes de colors" marques="Nova estada|Totes|Cerca client (nom, cognom, document, contracte)|Ordenar:"]

**Com es llegeix cada targeta**

- **Rodona amb inicials** (a l’esquerra) i **vora esquerra de color**:
  - verd = «Hi és ara»
  - taronja = «Hi és amb fiança» (hi és i té una fiança guardada)
  - vermell = «No hi és»
  - Aquesta llegenda surt a sobre de la llista.
- **Nom del titular** i, al costat, el número de contracte i l’any (per exemple, «26015/2026»).
- **Etiqueta d’estat**: «Reserva», «En curs», «Finalitzada» o «Cancel·lada».
- **Targeta lila amb «€ Cobrament pendent»**: aquesta estada té algun cobrament previst que encara no està marcat com a pagat (vegeu «Com apunto un cobrament pendent»).
- **Dates** d’entrada → sortida, **habitació** («Hab. 3») i **nombre de viatgers**.
- **Acompanyants**: sota el titular surten els noms de la resta de viatgers.
- **A la dreta**: l’estat de la comunicació a Mossos: «Sense enviar», «Pendent», «Enviat», «Acceptat», «Rebutjat» o «Error».

[FOTO id=targeta-estada ruta=/estancies descripcio="Detall d'una targeta: inicials de color, nom del titular, contracte, etiqueta d'estat, dates, habitació, viatgers i estat de Mossos" marques="€ Cobrament pendent|Sense enviar|Hi és ara|Hi és amb fiança|No hi és"]

**Què passa després / d’on surten les dades**

- L’estat («En curs», «Reserva», «Finalitzada») el **calcula l’app segons les dates**, no cal canviar-lo a mà. Per exemple, una estada en curs passa sola a «Finalitzada» quan arriba la data de sortida.
- La cerca busca en el nom, el primer cognom, el segon cognom i el número de document de **qualsevol** viatger de l’estada, i també en el número de contracte.
- El color verd/taronja/vermell surt de les dates d’entrada i sortida i de si hi ha una fiança guardada.
- L’etiqueta de Mossos és la de l’últim fitxer generat per a aquella estada.

**Per què es fa així**
Així veus d’un cop d’ull qui és a l’hostal ara, qui ha de venir i a qui falta comunicar a Mossos (l’etiqueta «Sense enviar» t’avisa).

**Si t’has equivocat**
Si la cerca no troba res, surt «Cap estada coincideix amb «…»». Esborra la cerca amb la creueta o prova amb menys paraules.

**Compte!**
- Les estades eliminades no surten mai a la llista.
- Si encara no hi ha cap estada, surt «Encara no hi ha estades. Crea la primera.»

---

## Com creo una estada nova

**Per a què serveix**
Per registrar una reserva o una arribada. És el formulari principal de l’app: el que hi escrius va a Mossos, al llibre de registre i a la fitxa del client.

**On és**
Menú lateral → «Estades» → botó «Nova estada» (a dalt a la dreta). La pantalla es diu «Nova estada».

També s’hi pot arribar des de la fitxa d’un hoste: aleshores el formulari ja surt omplert amb les seves dades i a dalt hi diu «Reaprofitant la fitxa de … · posa dates i habitació».

**Pas a pas**

1. Fes clic a «Nova estada».
2. Al bloc «Tipus de registre», tria «Contracte en curs» (l’hoste ja és aquí) o «Reserva» (encara no ha arribat). Si tens dubtes, mira la secció «Com trio entre Reserva i Contracte en curs».

[FOTO id=nova-tipus-registre ruta=/estancies/nou descripcio="Part de dalt del formulari Nova estada amb el bloc Tipus de registre i els dos botons" marques="Tipus de registre|Contracte en curs|Reserva|Buidar tot el formulari"]

3. Al bloc «Dades de l’estada», omple:
   - «Número de contracte»: surt proposat sol (l’últim + 1). Fes clic al botó del ✓ verd del costat per confirmar-lo. Mira «Com poso el número de contracte».
   - «Any»: l’any del contracte (surt l’any actual).
   - «Tipus de pagament»: com pagarà. Opcions: «Pagament a destinació», «Bizum», «Efectiu», «Transferència», «Targeta de crèdit».
   - «Data formalització»: el dia que es formalitza el contracte (surt avui).
   - «Data d’entrada»: el dia que arriba (surt avui).
   - «Data de sortida»: el dia que marxa.
   - «Habitació»: tria l’habitació de la llista.
   - «Idioma de comunicació»: «Català», «Castellà», «Anglès» o «Francès». Es fa servir per als missatges a l’hoste (benvinguda i gràcies).
   - «Observacions»: notes lliures (s’escriuen en majúscules).
4. Quan tens habitació i dates, a sota de l’habitació surt un avís verd «Habitació lliure en aquestes dates» o un avís taronja si està ocupada. Mira «Què vol dir l’avís d’habitació ocupada (solapament)».

[FOTO id=nova-dades-estada ruta=/estancies/nou descripcio="Bloc Dades de l'estada omplert, amb el número de contracte confirmat (botó ✓ en verd), les dates, l'habitació i l'avís verd d'habitació lliure (captura feta des d'«Editar», on el bloc és el mateix)" marques="Número de contracte|Any|Tipus de pagament|Data formalització|Data d’entrada|Data de sortida|Habitació|Idioma de comunicació|Observacions|Habitació lliure en aquestes dates"]

5. (Opcional) Al bloc «Cobrament i fiança (opcional)», apunta si ja t’han pagat o t’han deixat una fiança. Mira «Com apunto un pagament o una fiança en crear l’estada».
6. Omple el bloc «Viatger 1» (és el titular). Pots:
   - Buscar una persona que ja ha vingut abans a la casella «Reaprofitar un hoste existent (nom, document, email…)». Mira «Com reaprofito un hoste que ja ha vingut».
   - Fer una foto del document amb «Fer foto» o «Pujar foto» per omplir les dades soles. Mira «Com faig servir la foto del document (DNI o passaport)».
   - O escriure les dades a mà.
7. Camps del viatger (en «Contracte en curs»):
   - «Nom», «Primer cognom», «Segon cognom» (obligatori si el document és DNI/NIF).
   - «Tipus de document»: «DNI/NIF», «NIE», «Passaport» o «Altres documents».
   - «Número de document» (amb un botó de lupa al costat per buscar si ja existeix).
   - «Número de suport» (obligatori amb DNI o NIE, màxim 9 caràcters; els passaports normalment no en tenen).
   - «Data d’expedició».
   - «Sexe»: «Home» o «Dona».
   - «Nacionalitat».
   - «Data de naixement».
   - «Email» i «Telèfon».
   - «Adreça», «Codi postal», «País».
   - Si el país és Espanya: «Província» i després «Municipi» (tria’l de la llista). Si el país és un altre: «Localitat».
   - «Menor de 14» → casella «És menor». Si la marques, surt «Parentesc».
   - «Habitació al llibre / factura» (normalment deixa-ho a «La de l’estada»). Mira «Com faig que un viatger consti en una altra habitació als papers».

[FOTO id=nova-viatger ruta=/estancies/nou descripcio="Bloc Viatger 1 amb l'etiqueta Titular, el cercador d'hostes, el bloc Documents d'identitat i els camps del viatger" marques="Viatger 1|Titular|Reaprofitar un hoste existent (nom, document, email…)|Fer foto|Pujar foto|Tipus de document|Número de document|Número de suport|Menor de 14|Habitació al llibre / factura"]

8. Si hi ha més persones, fes clic a «Afegir viatger» (a baix a l’esquerra) i omple un bloc per a cada una. Mira «Com afegeixo o trec viatgers».
9. (Opcional) Al bloc «Mascotes», marca «Porten mascota» si porten un animal. Mira «Com apunto que porten mascota».
10. Fes clic a «Desar estada» (a baix a la dreta).
    - Si falten dades i les vols acabar més tard, fes clic a «Desar com a esborrany».
11. Si l’app troba dades que potser estan malament (per exemple, la lletra del DNI), surt un requadre taronja «Hi ha dades que potser no són correctes:». Corregeix-les i torna a fer clic a «Desar estada», o fes clic a «Desar igualment» si saps que són bones.
12. Si no has posat número de contracte (i no és una reserva), surt la pregunta «Vols desar l’estada SENSE número de contracte?». Fes clic a «Continuar» per desar-la igualment, o tanca per tornar enrere.
13. En desar, l’app t’obre la fitxa de l’estada nova.

[FOTO id=nova-botons-desar ruta=/estancies/nou descripcio="Part de baix del formulari amb els botons per afegir viatger i per desar" marques="Afegir viatger|Desar com a esborrany|Desar estada"]

[FOTO id=nova-avisos-format ruta=/estancies/nou descripcio="Requadre taronja d'avisos de format (aquí, la lletra d'un DNI) amb el botó Desar igualment. Captura feta des d'«Editar»: en una estada nova, el botó del costat diu «Desar estada»" marques="Hi ha dades que potser no són correctes:|Desar igualment|Desar canvis"]

**Què passa després / d’on surten les dades**

- **Fitxes d’hoste.** Per a cada viatger, l’app mira si ja existeix una fitxa amb el mateix tipus i número de document. Si existeix, l’aprofita i hi actualitza les dades noves que hagis escrit (telèfon, adreça…). Si no, en crea una de nova. Les estades anteriors d’aquella persona es mantenen.
- **Estat.** Una «Reserva» es desa com a reserva. Un «Contracte en curs» es desa com a estada en curs.
- **Nombre de viatgers.** Es compta sol: és el nombre de blocs «Viatger» que has omplert.
- **Menor.** Si la data de naixement indica menys de 14 anys (comptant des de la data d’entrada), l’app marca la persona com a menor encara que no hagis marcat la casella.
- **Mossos.** Amb aquestes dades es prepara el fitxer per a Mossos (bloc «Comunicació a Mossos» de la fitxa).
- **Llibre de registre i fitxa PDF.** Les dates, el contracte, el tipus de pagament, l’habitació i les dades dels viatgers omplen el llibre de registre i la fitxa «Registre de persones allotjades».
- **Documents d’identitat.** Les fotos del document es desen **xifrades** a la fitxa de l’hoste un cop creada l’estada.
- **Pagaments i fiança.** Es desen a l’estada (vegeu la secció corresponent).
- **Mascotes.** Es desen a la fitxa del **titular**.
- **Neteja.** L’app **no** crea sola cap tasca de neteja en crear l’estada; les tasques es creen des de la pantalla de Neteja.
- Tot el que fas queda apuntat a l’historial intern (auditoria).

**Per què es fa així**
- La llei obliga a comunicar els hostes a Mossos en **24 hores**. Per això el formulari demana totes les dades que Mossos exigeix quan és un «Contracte en curs».
- Escrivint les dades una sola vegada, l’app les fa servir per al llibre, per a Mossos, per a la factura i per al client, sense haver-les de copiar.

**Si t’has equivocat**
- Abans de desar: fes clic a «Buidar tot el formulari» (a dalt a la dreta). Surt «Buidar el formulari?»; fes clic a «Buidar tot» per començar de zero. **No es pot desfer.**
- Després de desar: obre la fitxa de l’estada i fes servir «Editar» (vegeu «Com edito una estada»). Si l’has creat per error, la pots eliminar (vegeu «Com elimino una estada»).

**Compte!** Missatges d’error que et pots trobar:
- «Falten dades obligatòries. Completa-les, o desa com a esborrany i acaba-ho més tard.» Els camps que falten surten en vermell, per exemple:
  - «El nom és obligatori»
  - «El primer cognom és obligatori»
  - «Tipus de document obligatori»
  - «Número de document obligatori»
  - «Número de suport obligatori (DNI/NIE)»
  - «El segon cognom és obligatori amb DNI/NIF»
  - «Parentesc obligatori per a menors»
  - «Adreça obligatòria (contracte en curs)»
  - «Codi postal obligatori»
  - «Localitat obligatòria (país estranger)»
  - «En reserva cal email o telèfon»
  - «Correu no vàlid»
- Dates:
  - «La data de formalització no pot ser futura»
  - «La data de sortida ha de ser posterior a l'entrada»
  - «La data de naixement no pot ser futura»
  - «La data d'expedicio no pot ser futura»
- «Cal marcar un viatger com a titular».
- Si el número de contracte ja existeix: «Aquest número de contracte ja existeix» (al camp) i «Ja existeix una estada amb aquest número de contracte per a l’any indicat. Canvia el número de contracte i torna-ho a provar.»
- Si un document ja és d’una altra persona: «Document ja registrat» i «Ja hi ha un hoste registrat amb aquest tipus i número de document. Cerca’l amb la lupa per reutilitzar la seva fitxa, o revisa el número de document.»
- Si una foto del document no s’ha pogut pujar, l’estada **sí** es desa i surt un missatge: «L'estada s'ha desat, però … document(s) no s'han pogut pujar». Els pots afegir després des de la fitxa de l’hoste.
- La «Província» i el «Municipi» no bloquegen el desat, però **sí** que es demanen quan generes el fitxer de Mossos. Omple’ls ja per no tenir problemes després.
- Si deixes el formulari a mitges i surts de la pantalla, no comptis que les dades hi tornin a ser quan tornis. Desa-ho com a esborrany.

---

## Com trio entre Reserva i Contracte en curs

**Per a què serveix**
Per dir a l’app (i a Mossos) si la persona encara ha de venir o si ja és a l’hostal. Segons el que triïs, el formulari demana més o menys dades.

**On és**
Menú lateral → «Estades» → «Nova estada» → bloc «Tipus de registre». També a «Editar» d’una estada.

**Pas a pas**

1. Al bloc «Tipus de registre», fes clic a:
   - «Reserva» si la persona encara no ha arribat. Surt el text: «En reserva només calen nom, cognom i (email o telèfon) per cada viatger.» Els camps de document, adreça, etc. s’amaguen.
   - «Contracte en curs» si la persona ja ha arribat (o arriba avui). Surten tots els camps que demana Mossos.
2. Omple la resta del formulari i desa.

[FOTO id=tipus-registre-reserva ruta=/estancies/nou descripcio="Bloc Tipus de registre amb Reserva seleccionat i el text explicatiu de sota; el bloc del viatger només amb nom, cognoms, data de naixement, email i telèfon" marques="Reserva|En reserva només calen nom, cognom i (email o telèfon) per cada viatger.|Contracte en curs|Email|Telèfon"]

**Què passa després / d’on surten les dades**

- Una **Reserva** queda en estat «Reserva». A la fitxa hi surt el botó «Check-in» per convertir-la quan arribi l’hoste.
- Un **Contracte en curs** queda en estat «En curs». A la fitxa hi diu «Contracte en curs (estada formalitzada)».
- El tipus de registre s’envia a Mossos dins del fitxer (reserva o contracte) i surt a la fitxa PDF.

**Per què es fa així**
Mossos no demana les mateixes dades per a una reserva que per a un contracte. Per a una reserva només cal el nom, el cognom i un email o telèfon. Per a un contracte en curs cal el document, l’adreça, etc.

**Si t’has equivocat**
- Si era una reserva i l’hoste ja ha arribat: fes servir «Check-in» (vegeu «Com converteixo una reserva en contracte en curs (check-in)»).
- També pots obrir «Editar» i canviar el tipus de registre. Compte: editant **només** canvies el tipus de registre, **no** l’estat de l’estada.

**Compte!**
- En «Reserva» el número de contracte és opcional («Opcional per a reserves · es pot omplir al check-in»).
- En «Reserva» cada viatger ha de tenir email **o** telèfon. Si no, surt «En reserva cal email o telèfon».

---

## Com poso el número de contracte

**Per a què serveix**
El número de contracte identifica l’estada al llibre de registre i davant de Mossos. No es pot repetir dins del mateix any.

**On és**
Menú lateral → «Estades» → «Nova estada» (o «Editar») → bloc «Dades de l’estada» → camp «Número de contracte».

**Pas a pas**

1. En obrir «Nova estada», l’app ja hi posa un número proposat: el número més alt d’aquell any + 1. Si encara no n’hi ha cap aquell any, comença per les dues últimes xifres de l’any + 001 (per exemple, 2026 → 26001).
2. Al costat hi ha un botó quadrat amb un ✓:
   - Gris: el número encara no està confirmat. Passa-hi el ratolí i hi diu «Confirmar aquest número». Fes-hi clic i es posa **verd** («Número confirmat»).
   - Si el camp és buit, el botó diu «Generar el següent número». Fes-hi clic i l’app hi posa el següent número lliure.
   - **Vermell amb una creu**: «Aquest número ja està en ús». Sota el camp surt «Aquest número ja està en ús. Tria’n un altre.»
3. Si escrius un número a mà, es dona per confirmat (si no està ocupat).
4. Pots deixar-lo en blanc: sota el camp hi diu «Proposat automàticament (l’últim + 1). Pots deixar-lo en blanc i posar-l’hi més tard.»

[FOTO id=numero-contracte ruta=/estancies/nou descripcio="Camp Número de contracte amb el número que ha proposat l'app i, al costat, el botó quadrat ✓ en verd (número confirmat)" marques="Número de contracte|Número confirmat"]

**Què passa després / d’on surten les dades**

- El número i l’any surten a la capçalera de la fitxa («Contracte 26015/2026»), al llibre de registre, a la fitxa PDF i al fitxer de Mossos.
- L’app comprova sola, mentre escrius, si el número ja és d’una altra estada del mateix any o d’un viatger amb número separat.

**Per què es fa així**
El llibre de registre ha de portar una numeració seguida i sense repeticions. Proposar-te el següent número evita errors.

**Si t’has equivocat**
Obre la fitxa → «Més» → «Editar» i canvia el número. Si ja l’havies enviat a Mossos, recorda que a Mossos hi consta el número antic.

**Compte!**
- Si deses sense número (i no és una reserva), l’app et pregunta: «Vols desar l’estada SENSE número de contracte?» amb el text «El pots deixar en blanc ara i posar-l’hi més tard (per exemple, quan l’enviïs a Mossos).»
- Si el número xoca amb un altre en desar: «Ja existeix una estada amb aquest número de contracte per a l’any indicat. Canvia el número de contracte i torna-ho a provar.»

---

## Com reaprofito un hoste que ja ha vingut

**Per a què serveix**
Per no haver de tornar a escriure les dades d’una persona que ja ha estat a l’hostal.

**On és**
Menú lateral → «Estades» → «Nova estada» (o «Editar») → dins de cada bloc «Viatger» → casella «Reaprofitar un hoste existent (nom, document, email…)».

**Pas a pas**

1. Escriu almenys 2 lletres del nom, del document o de l’email a la casella «Reaprofitar un hoste existent (nom, document, email…)».
2. Surt una llista amb les coincidències (nom i número de document). Si no n’hi ha cap, hi diu «Cap coincidència».
3. Fes clic a la persona correcta. Els camps del viatger s’omplen sols i al títol del bloc surt l’etiqueta verda «Hoste reaprofitat».
4. Revisa les dades (sobretot telèfon i adreça) i canvia el que calgui.

**Una altra manera: per número de document**

1. Tria el «Tipus de document» i escriu el «Número de document».
2. Quan surts del camp (o fas clic a la lupa del costat), l’app busca si ja existeix.
3. Si el troba, omple les dades i surt l’etiqueta «Hoste recurrent · N estades prèvies».

[FOTO id=reaprofitar-hoste ruta=/estancies/nou descripcio="Bloc del viatger amb un hoste ja reaprofitat (etiqueta verda Hoste reaprofitat) i el cercador desplegat amb una nova cerca i la llista de coincidències (nom i document)" marques="Reaprofitar un hoste existent (nom, document, email…)|Hoste reaprofitat|Montserrat Ribas"]

**Què passa després / d’on surten les dades**

- Les dades venen de la fitxa d’hoste que ja existeix (menú «Hostes»).
- En desar, l’estada nova queda lligada a la **mateixa** fitxa d’hoste. Així, a la fitxa de l’hoste veuràs totes les seves estades.
- Si canvies alguna dada (per exemple, el telèfon nou), s’actualitza a la fitxa de l’hoste.

**Avisos que poden sortir**
- Requadre vermell «🚫 Avís intern: … Valora no acollir aquesta persona.» Surt si el nom o el telèfon coincideix amb la llista d’avisos interns.
- Requadre vermell «⚠ Aquest hoste està marcat com a no acollir a la llista interna. Revisa les notes objectives abans de decidir (§7).»
- Sota, poden sortir les notes que es van apuntar sobre aquesta persona (verdes si són positives, vermelles si són negatives).

**Per què es fa així**
És la mateixa persona per a Mossos, per al client i per a la factura. Una sola fitxa per persona evita duplicats i et deixa veure el seu historial.

**Si t’has equivocat**
Si has triat la persona equivocada, fes clic a «Treure l’hoste seleccionat i buidar els camps» (sota la casella de cerca). El bloc torna a quedar en blanc.

**Compte!**
- Si escrius a mà un document que ja és d’una altra fitxa, l’app també l’aprofita (busca per tipus i número de document).
- Els avisos no bloquegen res: decideixes tu.

---

## Com faig servir la foto del document (DNI o passaport)

**Per a què serveix**
Per omplir sols el nom, els cognoms, el document, la data de naixement, el sexe i la nacionalitat a partir d’una foto del document, i per guardar la foto (xifrada) a la fitxa de l’hoste.

**On és**
Menú lateral → «Estades» → «Nova estada» → dins de cada bloc «Viatger» → requadre «Documents d'identitat». Només surt si el tipus de registre és «Contracte en curs».

**Pas a pas**

1. Deixa marcada la casella «Autoreplenar el formulari amb la foto». (Si només vols guardar la foto sense tocar les dades, desmarca-la.)
2. Fes clic a «Fer foto» (obre la càmera) o «Pujar foto» (tria una foto que ja tens).
3. Fes la foto de la cara amb les línies «<<<»: al **DNI/NIE és el DARRERE** (la cara sense foto) i al **passaport la pàgina de la foto**.
4. Mentre llegeix, el botó diu «Llegint… N%».
5. Si ha anat bé, surt «Dades llegides correctament. Revisa-les als camps del formulari i corregeix el que calgui.» Si hi ha dubtes, surt «Dades llegides. Revisa els camps del formulari i aquests avisos:» amb una llista.
6. Revisa els camps omplerts.
7. Pots afegir més fotos (per exemple, les dues cares). A cada foto pots triar el tipus en un desplegable, veure-la en gran (icona de l’ull) o treure-la (icona de la paperera).

[FOTO id=document-ocr ruta=/estancies/nou descripcio="Requadre Documents d'identitat dins del bloc del viatger, encara sense fotos: botons Fer foto i Pujar foto, casella Autoreplenar el formulari amb la foto i l'explicació de quina cara cal fotografiar" marques="Documents d'identitat|Fer foto|Pujar foto|Autoreplenar el formulari amb la foto"]

**Què passa després / d’on surten les dades**

- L’app llegeix la zona de text especial del document (les línies amb «<<<») i n’extreu les dades.
- Les fotos **no** es desen fins que deses l’estada («Es desen en crear l'estada.»). Aleshores es guarden xifrades a la fitxa de l’hoste.

**Per què es fa així**
Copiar a mà un document és lent i és fàcil equivocar-se en una lletra. La foto ho fa més ràpid i més segur.

**Si t’has equivocat**
- Treu la foto amb la paperera i torna-la a fer.
- Si una dada s’ha llegit malament, corregeix-la directament al camp del formulari. La «MRZ llegida» que surt a «Veure la MRZ llegida (només per comparar)» és només per consultar; no s’edita aquí.

**Compte!**
- Si fas la foto de la cara de davant del DNI, surt «Aquesta cara no té MRZ…». La foto es desa igualment, però les dades s’han de llegir de l’altra cara.

---

## Com afegeixo o trec viatgers

**Per a què serveix**
Per posar totes les persones que dormen a l’habitació, o treure’n una que no ha vingut.

**On és**
- En crear: menú lateral → «Estades» → «Nova estada».
- En una estada que ja existeix: fitxa de l’estada → «Més» → «Editar».

**Pas a pas per afegir**

1. A baix del formulari, fes clic a «Afegir viatger».
2. Surt un bloc nou («Viatger 2», «Viatger 3»…). Omple’l igual que el primer (o reaprofita un hoste).
3. Desa amb «Desar estada» (nova) o «Desar canvis» (edició).

**Pas a pas per treure**

1. Al bloc del viatger que vols treure, fes clic a la icona de la **paperera** (a dalt a la dreta del bloc). Només surt si hi ha més d’un viatger.
2. Desa amb «Desar canvis».

[FOTO id=afegir-treure-viatger ruta=/estancies/nou descripcio="Dos blocs de viatger (aquí en mode Reserva, que són més curts); el segon té la paperera a dalt a la dreta; botó Afegir viatger a baix" marques="Titular|Viatger 2|Afegir viatger"]

**Què passa després / d’on surten les dades**

- El nombre de viatgers de l’estada es calcula sol (és el nombre de blocs).
- Cada viatger afegit surt a la fitxa de l’estada, al llibre de registre, a la fitxa PDF i al fitxer de Mossos.
- En treure un viatger d’una estada que ja existeix, aquella persona **deixa d’estar lligada a l’estada**, però la seva fitxa d’hoste **no s’esborra** (continua al menú «Hostes»). La seva signatura per a aquesta estada sí que desapareix.
- Si treus el titular, l’app marca com a titular el primer viatger que queda.

**Per què es fa així**
Mossos demana totes les persones allotjades, una per una.

**Si t’has equivocat**
Si has tret una persona per error, torna a «Editar», fes clic a «Afegir viatger» i busca-la a «Reaprofitar un hoste existent (nom, document, email…)». La seva signatura s’haurà de tornar a fer.

**Compte!**
- Com a mínim hi ha d’haver un viatger: «Cal almenys un viatger».
- Si l’estada ja s’ha enviat a Mossos, afegir o treure persones a l’app **no** canvia el que ja consta a Mossos.

---

## Com canvio el titular d’una estada

**Per a què serveix**
Per dir quina persona és la principal de l’estada (la que surt com a nom de l’estada, a qui es fan els missatges, etc.).

**On és**
- En crear: menú lateral → «Estades» → «Nova estada».
- Després: fitxa de l’estada → «Més» → «Editar».

**Pas a pas**

1. A cada bloc «Viatger» hi ha, a dalt a la dreta, un botó rodó amb la paraula «Titular».
2. Fes clic al botó «Titular» de la persona que ha de ser la principal. L’etiqueta blava «Titular» es mou al seu bloc. Només n’hi pot haver un.
3. Fes clic a «Desar canvis» (o «Desar estada»).

[FOTO id=canviar-titular ruta=/estancies/nou descripcio="Dos blocs de viatger (aquí en mode Reserva) amb el botó rodó Titular a dalt a la dreta de cada un; ara està marcat el primer" marques="Titular"]

**Què passa després / d’on surten les dades**

El titular es fa servir a molts llocs:
- El seu nom és el títol de la fitxa de l’estada i el de la targeta a la llista d’estades.
- Surt primer a la fitxa i als documents.
- El bloc «Missatges a l’hoste» fa servir el seu nom, email i telèfon (benvinguda, gràcies).
- El bloc «Mascotes de l’hoste» mostra les mascotes del titular.
- Si el titular té una «Habitació al llibre / factura» diferent, aquesta és l’habitació que surt a la factura i al balanç.
- La nota de la «Sortida anticipada» s’apunta a la fitxa del titular.

**Per què es fa així**
Cal una persona de referència per a cada contracte.

**Si t’has equivocat**
Torna a «Editar» i marca el titular correcte.

**Compte!**
- Les mascotes que es van apuntar en crear l’estada es van guardar a la fitxa del titular d’aquell moment. Si canvies el titular, les mascotes **no es mouen** soles: el bloc «Mascotes de l’hoste» passarà a mostrar les del nou titular.
- Si no hi ha cap titular marcat surt «Cal marcar un viatger com a titular».

---

## Com apunto un menor i el seu parentesc

**Per a què serveix**
Mossos tracta diferent els menors de 14 anys: no cal document, però sí dir quin parentesc tenen amb l’adult que els acompanya.

**On és**
Formulari de l’estada («Nova estada» o «Editar») → bloc del viatger → «Menor de 14» i «Parentesc». Només surt en «Contracte en curs».

**Pas a pas**

1. Escriu la «Data de naixement» del menor. Si té menys de 14 anys (comptant des de la data d’entrada), la casella «És menor» es marca sola.
2. Si no s’ha marcat sola, marca «És menor». Si la data diu que és menor i no està marcada, surt l’ajuda «Segons la data de naixement sembla menor de 14.»
3. Surt el desplegable «Parentesc». Tria la relació amb l’adult: «Avi/àvia», «Besavi/besàvia», «Besnét/besnéta», «Cunyat/cunyada», «Cònjuge», «Fill/filla», «Germà/germana», «Nét/néta», «Pare o mare», «Nebot/neboda», «Sogre/sogra», «Oncle/tia», «Tutor/tutora», «Gendre o nora» o «Altres».
4. Amb la casella marcada, el «Tipus de document» i el «Número de document» deixen de ser obligatoris.
5. Desa.

[FOTO id=menor-parentesc ruta=/estancies/nou descripcio="Bloc d'un viatger menor amb la casella És menor marcada i el desplegable Parentesc" marques="Data de naixement|Menor de 14|És menor|Parentesc"]

**Què passa després / d’on surten les dades**

- A la fitxa de l’estada, el viatger porta l’etiqueta «Menor» i es veu el «Parentesc».
- El parentesc s’envia a Mossos (amb el seu codi oficial).
- Si algun viatger té **menys de 17 anys**, a la fitxa surt el botó «Declaració IEET (menor)» per imprimir la declaració de l’impost turístic (vegeu «Com imprimeixo els documents de l’estada»).

**Per què es fa així**
És el que demana la normativa de Mossos: document no obligatori per a menors de 14, però parentesc obligatori.

**Si t’has equivocat**
Desmarca «És menor» a «Editar» i desa. Compte: si la data de naixement diu que té menys de 14 anys, l’app el tornarà a considerar menor en desar.

**Compte!**
- Si marques «És menor» i no poses parentesc: «Parentesc obligatori per a menors».
- Per a un menor de 14 anys **amb** DNI, el número de suport i el segon cognom continuen sent obligatoris si poses el DNI.

---

## Com apunto un pagament o una fiança en crear l’estada

**Per a què serveix**
Per apuntar, en el mateix moment de fer el registre, el que t’han pagat (una paga i senyal o el total) i la fiança (els diners de garantia que després tornaràs).

**On és**
Menú lateral → «Estades» → «Nova estada» → bloc «Cobrament i fiança (opcional)». Aquest bloc **només surt en crear** l’estada; després es fa des de la fitxa (bloc «Pagaments i fiances»).

**Pas a pas per a un pagament**

1. Fes clic a «Afegir pagament».
2. Omple:
   - «Import €».
   - El mètode: «Efectiu», «Targeta», «Transferència», «Bizum» o «Altres».
   - La data.
   - L’etapa: «A compte (reserva anticipada)», «Cobro (pagament a l'arribada)», «Total (pagament complet)» o «Altre…».
   - «Observacions internes (no apareix a la factura)».
3. Si l’han pagat en dues formes (part en efectiu, part per transferència), fes clic un altre cop a «Afegir pagament».
4. A sota surt el «Total:».
5. Per treure una línia, fes clic a «Cancel·lar» de dins de la línia.

**Pas a pas per a una fiança**

1. Fes clic a «Afegir fiança».
2. Omple l’«Import €», el mètode, la data i, si vols, «Observacions internes».
3. A sota surt el «Total fiança:».
4. Per treure-la, fes clic a «Cancel·lar» de dins de la línia.

[FOTO id=nova-cobrament-fianca ruta=/estancies/nou descripcio="Bloc Cobrament i fiança amb una línia de pagament i una de fiança omplertes i els totals" marques="Cobrament i fiança (opcional)|Afegir pagament|Afegir fiança|Total:|Total fiança:"]

**Què passa després / d’on surten les dades**

- Cada pagament es desa a l’estada **a compte** (encara sense factura). Després, des de la fitxa, a «Facturació», pots fer la factura o el rebut triant quins pagaments hi entren.
- La fiança es desa **en custòdia**: no compta com a ingrés. Mentre està guardada, a la llista d’estades la persona surt en taronja («Hi és amb fiança»).
- Els pagaments compten als ingressos del balanç; les fiances no (fins que no es retenen).
- Només es desen les línies amb un import més gran que zero.

**Per què es fa així**
La fiança no són diners teus: és una garantia que tornaràs. Per això va a part i no compta als ingressos.

**Si t’has equivocat**
Un cop desada l’estada, els pagaments i les fiances es corregeixen al bloc «Pagaments i fiances» de la fitxa (vegeu el capítol de Pagaments i Facturació).

**Compte!**
- Si un pagament o una fiança fallen en desar, l’estada es crea igualment; afegeix-los després des de la fitxa.
- Revisa a la fitxa la data i el text del pagament (vegeu DUBTES).

---

## Com apunto que porten mascota

**Per a què serveix**
Per saber que hi ha un animal a l’habitació (per a la neteja i per tenir-ho a la fitxa del client).

**On és**
Menú lateral → «Estades» → «Nova estada» → bloc «Mascotes». Només en crear; després es fa al bloc «Mascotes de l’hoste» de la fitxa.

**Pas a pas**

1. Marca la casella «Porten mascota».
2. Omple «Nom» (per exemple, el nom del gos), «Espècie» (surt «Gos» per defecte; pots posar «Gat»…) i, si vols, «Mida».
3. Si n’hi ha més d’una, fes clic a «Afegir mascota». Per treure’n una, fes clic a la paperera.
4. Desa l’estada.

[FOTO id=nova-mascotes ruta=/estancies/nou descripcio="Bloc Mascotes amb la casella marcada i una mascota omplerta" marques="Mascotes|Porten mascota|Afegir mascota"]

**Què passa després / d’on surten les dades**
Les mascotes es guarden a la fitxa del **titular** («Només cal el nom; la mida és opcional. S’associen al titular de l’estada.»). A la fitxa de l’estada surten al bloc «Mascotes de l’hoste».

**Si t’has equivocat**
Corregeix-ho al bloc «Mascotes de l’hoste» de la fitxa de l’estada (icones d’editar i d’eliminar).

**Compte!**
Només es desen les mascotes que tenen nom.

---

## Com faig que un viatger consti en una altra habitació als papers

**Per a què serveix**
De vegades, a la realitat diverses persones comparteixen una mateixa estada (mateix grup, mateix contracte), però **als papers** (llibre de registre, fitxes, factura) una d’elles ha de constar en **una altra habitació**. Per exemple: una família ocupa dues habitacions, però ho has registrat tot com una sola estada; o vols fer una factura separada per a la persona que dorm a l’habitació del costat.

Aquesta opció **no canvia l’estada real**: la persona continua dins de la mateixa estada, el calendari i l’ocupació continuen fent servir l’habitació real de l’estada. Només canvia el que surt **als documents**.

**On és**
Formulari de l’estada («Nova estada» o fitxa → «Més» → «Editar») → bloc de cada viatger → desplegable «Habitació al llibre / factura». Només surt en «Contracte en curs».

**Pas a pas**

1. Obre el formulari de l’estada (nova o «Editar»).
2. Comprova que a «Dades de l’estada» → «Habitació» hi ha l’habitació real del grup (per exemple, la 3).
3. Ves al bloc del viatger que als papers ha de constar en una altra habitació.
4. Al desplegable «Habitació al llibre / factura», tria l’habitació on ha de constar (per exemple, «Habitació 4»). L’opció normal és «La de l’estada».
5. Repeteix-ho per a cada viatger que hagi de constar a l’altra habitació (poden ser diversos a la mateixa habitació, o en habitacions diferents).
6. Desa amb «Desar estada» o «Desar canvis».

[FOTO id=habitacio-separada-camp ruta=/estancies/nou descripcio="Bloc d'un viatger amb el desplegable Habitació al llibre / factura (posa «La de l’estada»; en obrir-lo surt la llista d'habitacions) i el text d'ajuda de sota" marques="Habitació al llibre / factura"]

**Com es veu a la fitxa de l’estada**

7. A la capçalera, al costat del contracte, surt una nota. Per exemple: «Contracte 26015/2026 (Hab. 4 al llibre)».
8. Els botons de documents surten **agrupats per full**: un grup per a l’habitació real (si hi queda algun viatger) i un grup per a cada habitació separada. Cada grup porta el número de contracte i els botons «Registre persones allotjades», «Reglament (LOPD)» i «Llibre registre». Cada botó imprimeix **només** els viatgers d’aquell full.
9. Al bloc «Dades de l’estada», a «Habitació», si el titular consta en una altra habitació, hi surt per exemple «3 · al llibre: 4».
10. Al bloc «Facturació», en fer una factura, hi ha el desplegable «Habitació de la factura:» amb una opció per a cada habitació, i quantes persones hi consten (per exemple, «Habitació 4 · 1 persona»). Així pots fer una factura per a cada habitació.

[FOTO id=habitacio-separada-fitxa ruta=/estancies/ID descripcio="Capçalera de la fitxa d'una estada amb un viatger en habitació separada que té número de full propi: nota «+ 26009/2026 (Hab. 5)» al costat del contracte i dos grups de botons de documents, un per full (26008 i 26009)" marques="+ 26009/2026 (Hab. 5)|Registre persones allotjades|Reglament (LOPD)|Llibre registre"]

[FOTO id=habitacio-separada-factura ruta=/estancies/ID descripcio="Bloc Facturació amb el formulari de factura obert i el desplegable Habitació de la factura: (té una opció per a cada habitació amb el nombre de persones)" marques="Habitació de la factura:"]

**Què passa després / d’on surten les dades**

- **Llibre de registre** (botó «Llibre registre» i també des de «Justificants»): els viatgers amb habitació separada van en un **full a part** amb aquella habitació. La resta van al full de l’habitació de l’estada. Dins de cada habitació, els fulls són de 4 viatgers, com el llibre en paper.
- **Fitxa «Registre de persones allotjades»** i **«Reglament (LOPD)»**: es poden imprimir per separat per a cada full.
- **Número de contracte del full separat**: el full separat porta el **mateix número de contracte** de l’estada («amb el MATEIX número de contracte de l’estada», com diu l’ajuda del camp). La base de dades té previst un número de contracte propi per al full separat i, si en té un, és el que surt al full, a la fitxa PDF i a la capçalera («+ 26016/2026 (Hab. 4)»); però **al formulari no hi ha cap camp per escriure’l** (vegeu DUBTES).
- **Factura i balanç**: per a documents de tota l’estada (factura, balanç) l’habitació que surt és la del **titular**: si el titular té una habitació separada, surt aquesta; si no, la real.
- **Impost turístic (IEET)**: la declaració fa servir l’habitació separada de cada viatger.
- **Mossos**: el fitxer de Mossos **no porta habitació**. Tots els viatgers de l’estada s’hi comuniquen junts amb el número de contracte de l’estada.
- **Calendari, ocupació, neteja i tauler**: fan servir **sempre l’habitació real** de l’estada, no la «del llibre».

**Per què es fa així**
Perquè els papers (llibre i factura) s’han d’ajustar a com s’ha venut o s’ha de justificar l’allotjament, sense haver de partir l’estada en dues i duplicar dades.

**Si t’has equivocat**
Torna a «Editar» i posa «La de l’estada» al desplegable «Habitació al llibre / factura» d’aquell viatger. Desa. Els documents tornen a sortir en un sol full.

**Compte!**
- Si tries **la mateixa** habitació que la de l’estada, l’app ho ignora (no és separada).
- Si **tots** els viatgers estan en una habitació separada, no hi ha full «principal»: només surten els botons dels fulls separats.
- Si canvies l’«Habitació» de l’estada a la mateixa que la separada d’un viatger, aquell viatger deixa de ser separat en desar.
- Les ampliacions **no copien** l’habitació separada dels viatgers: si cal, posa-la a l’ampliació amb «Editar».
- Si el que vols és que dues persones tinguin **contractes realment diferents** (cada una amb el seu contracte a Mossos), no facis servir això: crea dues estades. L’avís de solapament t’ho permet (vegeu la secció següent).

---

## Què vol dir l’avís d’habitació ocupada (solapament)

**Per a què serveix**
T’avisa si l’habitació que tries ja està ocupada o reservada per una altra estada en aquelles dates, i et deixa tancar l’estada anterior si l’hoste ja ha marxat.

**On és**
Surt sol al formulari de l’estada («Nova estada» o «Editar»), sota el camp «Habitació», quan hi ha habitació, data d’entrada i data de sortida. També surt quan fas un «Canviar d’habitació».

**Pas a pas**

1. Tria l’habitació i les dates.
2. Espera un moment. Pot sortir:
   - Requadre verd: «Habitació lliure en aquestes dates». Tot bé.
   - Requadre taronja: «Aquesta habitació ja està ocupada en aquestes dates» o «Aquesta habitació ja està reservada en aquestes dates» (si totes les altres són reserves).
3. Al requadre taronja hi surt cada estada que xoca, amb l’etiqueta «Ocupada» o «Reservada», el nom del titular i el contracte i les dates.
4. Decideix:
   - Si l’altre hoste **ja ha marxat** i no ho havies apuntat: fes clic a «Finalitzar el [data]». L’altra estada queda finalitzada el dia d’entrada de la nova.
   - Si **comparteixen** habitació però paguen per separat (contractes a part): no facis res, pots desar igualment.
   - Si t’has equivocat d’habitació o de dates: canvia-les.

[FOTO id=avis-solapament ruta=/estancies/nou descripcio="Requadre taronja d'avís de solapament amb una estada en conflicte (Ocupada) i el botó per finalitzar-la (aquí, a «Editar» d'una reserva)" marques="Aquesta habitació ja està ocupada en aquestes dates|Ocupada|Finalitzar el"]

**Què passa després / d’on surten les dades**

- L’app mira totes les estades no cancel·lades d’aquella habitació que se superposen amb les dates. Si una surt el mateix dia que entra l’altra, **no** és conflicte (és un canvi normal d’hoste).
- Si l’altra estada ha canviat d’habitació a mitja estada, només compta el tram que realment hi dorm.
- El botó «Finalitzar el …» fa el mateix que una «Sortida anticipada» de l’altra estada, sense devolució de diners (vegeu «Com registro una sortida anticipada»).

**Per què es fa així**
Per evitar posar dues persones a la mateixa habitació per error, però deixant-ho fer quan és a propòsit.

**Si t’has equivocat**
Si has finalitzat l’altra estada per error, obre-la i fes «Més» → «Reactivar (tornar a allotjat)».

**Compte!**
«Això és només un avís: pots desar igualment.» No bloqueja mai el desat.

---

## Com deso un esborrany i com el completo

**Per a què serveix**
Quan no tens totes les dades (per exemple, l’hoste encara no t’ha donat el DNI), pots desar el que tens i acabar-ho més tard.

**On és**
Formulari de l’estada → botó «Desar com a esborrany» (a baix, al costat de «Desar estada»).

**Pas a pas per desar un esborrany**

1. Omple el que tinguis. Com a mínim, el **nom** i el **primer cognom** del titular, i marca un titular.
2. Fes clic a «Desar com a esborrany». (Passant-hi el ratolí, hi diu: «Desa amb dades incompletes per acabar-ho més tard. No es podrà pujar a Mossos fins completar-lo.»)
3. S’obre la fitxa. A la capçalera surt l’etiqueta taronja «Esborrany».

**Pas a pas per completar-lo**

1. Obre la fitxa de l’estada (a la llista d’estades).
2. Fes clic a «Més» → «Editar». A dalt hi diu «Contracte … · esborrany».
3. Omple les dades que falten.
4. Fes clic a «Desar canvis». Si tot és correcte, l’estada deixa de ser esborrany.

**Una altra manera de treure l’esborrany**

1. A la fitxa, fes clic a «Més» → «Treure esborrany».
2. Surt la pregunta «Marcar aquesta estada com a completa (treure esborrany)? Assegura’t que les dades estan completes; la validació final es fa igualment en generar el fitxer de Mossos.» Accepta.

[FOTO id=esborrany-fitxa ruta=/estancies/ID descripcio="Capçalera d'una estada en esborrany amb l'etiqueta taronja Esborrany i el menú Més obert amb Editar, Treure esborrany i Eliminar" marques="Esborrany|Més|Editar|Treure esborrany"]

**Què passa després / d’on surten les dades**

- En esborrany no es comprova la majoria de dades obligatòries. També pots deixar buides la data d’entrada i la de sortida.
- Quan generes correctament el fitxer de Mossos, l’esborrany es treu sol.
- Desar l’estada sencera amb «Desar canvis» també el treu.

**Per què es fa així**
Així no perds el que ja has escrit i no t’oblides d’acabar-ho: l’etiqueta «Esborrany» t’ho recorda. Passant el ratolí per sobre hi diu: «Registre incomplet: completa les dades per poder pujar-lo a Mossos.»

**Si t’has equivocat**
Si has tret l’esborrany abans d’hora, no passa res greu: el fitxer de Mossos no es generarà si falten dades. Completa-les amb «Editar».

**Compte!**
- Si falta el nom o el cognom: «Per desar com a esborrany cal, com a mínim, nom i primer cognom del titular.»
- Mentre és esborrany, al menú «Més» no surt «Sortida anticipada».
- El termini de 24 hores de Mossos continua corrent encara que l’estada sigui un esborrany.

---

## Com converteixo una reserva en contracte en curs (check-in)

**Per a què serveix**
Quan arriba un hoste que tenia reserva, cal passar l’estada a «Contracte en curs» i donar-li un número de contracte.

**On és**
Menú lateral → «Estades» → obre la reserva → botó «Check-in» (a la capçalera). Només surt si l’estada està en estat Reserva.

**Pas a pas**

1. Obre la fitxa de la reserva.
2. Fes clic a «Check-in». S’obre el requadre «Convertir a contracte en curs» amb el text «Assigna el número de contracte i completa les dades del viatger si cal.»
3. Escriu el número a «Número de contracte *» (si ja en tenia un, ja hi surt).
4. **Abans de fer el check-in**, si a la reserva només hi havia nom i telèfon, fes clic a «Editar totes les dades primer» per omplir el document, l’adreça, etc.
5. Fes clic a «Fer check-in».

[FOTO id=check-in ruta=/estancies/ID descripcio="Requadre Convertir a contracte en curs obert a la capçalera de la fitxa d'una reserva" marques="Convertir a contracte en curs|Número de contracte *|Fer check-in|Editar totes les dades primer"]

**Què passa després / d’on surten les dades**

- L’estada passa a estat «En curs» i a tipus de registre «Contracte en curs».
- Es desa el número de contracte que has posat.
- El botó «Check-in» desapareix.
- Ara ja pots comunicar l’estada a Mossos.

**Per què es fa així**
Per a Mossos, una reserva i un contracte són coses diferents. Quan l’hoste arriba, s’ha de comunicar com a contracte, amb totes les dades, en un màxim de 24 hores.

**Si t’has equivocat**
Pots canviar el número de contracte o el tipus de registre a «Editar». Però **no hi ha cap botó** per tornar l’estat a «Reserva» (vegeu DUBTES).

**Compte!**
- Sense número: «El número de contracte és obligatori per fer el check-in» (el botó «Fer check-in» queda desactivat).
- El check-in **no comprova** que les dades del viatger estiguin completes. Si falten, ho veuràs en generar el fitxer de Mossos. Per això és millor fer primer «Editar totes les dades primer».
- Si el número ja existeix aquell any, surt l’error de número repetit.

---

## Com edito una estada

**Per a què serveix**
Per corregir o completar qualsevol dada de l’estada o dels viatgers: dates, habitació, número de contracte, viatgers, titular, documents…

**On és**
- Menú lateral → «Estades» → obre l’estada → «Més» (a dalt a la dreta) → «Editar».
- Per anar directament a un viatger: bloc «Viatgers» de la fitxa → botó «Editar dades» al costat del seu nom.

La pantalla es diu «Editar estada» i a sota hi ha el contracte (per exemple, «Contracte 26015/2026»). A dalt a l’esquerra hi ha l’enllaç «Estada» per tornar a la fitxa.

**Pas a pas**

1. Obre la fitxa de l’estada.
2. Fes clic a «Més» → «Editar» (o «Editar dades» d’un viatger; la pàgina s’obre directament al seu bloc).
3. Canvia el que calgui. El formulari és el mateix que el de «Nova estada», amb aquestes diferències:
   - No hi ha el bloc «Cobrament i fiança (opcional)» ni el bloc «Mascotes» (es fan a la fitxa).
   - No hi ha l’enllaç «Buidar tot el formulari».
   - El número de contracte ja surt confirmat.
4. Fes clic a «Desar canvis».
5. Si has canviat la data d’entrada o la de sortida (i l’estada **no** es va crear avui), surt la pregunta «Vols canviar la data a la fitxa de registre?» amb el canvi (per exemple, «Sortida: 10/08/2026 → 12/08/2026») i el text «Si acceptes, s'actualitzarà la fitxa de registre amb les noves dates.» Fes clic a «Continuar».
6. Tornes a la fitxa amb els canvis fets.

[FOTO id=editar-estada ruta=/estancies/ID/edita descripcio="Part de dalt de la pantalla Editar estada amb l'enllaç per tornar a la fitxa, el títol i el subtítol del contracte" marques="Estada|Editar estada|Contracte 26014/2026"]

**Què passa després / d’on surten les dades**

- Les dades de cada viatger s’actualitzen a la seva **fitxa d’hoste** (menú «Hostes»). Això vol dir que el canvi es veu a totes les estades d’aquella persona que no estiguin «congelades» (vegeu «Compte!»).
- Si treus un viatger, deixa d’estar a l’estada (la seva fitxa d’hoste es manté). Si n’afegeixes un, s’hi lliga.
- Si l’estada té una tasca de neteja de sortida, se n’actualitzen la data i l’habitació soles.
- Desar amb «Desar canvis» treu la marca d’esborrany. Desar amb «Desar com a esborrany» la manté.
- Editar **no** canvia l’estat de l’estada (Reserva, En curs…) ni toca els pagaments, les fiances ni les mascotes.

**Per què es fa així**
Per mantenir les dades bones a tot arreu sense haver-les d’escriure en diversos llocs. La confirmació de dates és perquè canviar dates després modifica la fitxa de registre (i, si ja s’ha comunicat, no coincidirà amb Mossos).

**Si t’has equivocat**
Torna a «Editar» i posa el valor correcte. Si encara no has desat, pots sortir de la pantalla sense desar (enllaç «Estada»).

**Compte!**
- Si **allarga** l’estada (l’hoste es queda més dies), el millor és fer una **ampliació** («Ampliar estada»), no canviar la data de sortida (vegeu la secció següent).
- Si l’hoste **marxa abans**, fes «Sortida anticipada», no canviïs la data a mà.
- Si l’habitació **era una altra des del principi**, canvia-la aquí. Si l’hoste **s’ha canviat a mitja estada**, fes «Canviar d’habitació».
- Les estades que fa més de 7 dies que han acabat tenen les dades dels viatgers «congelades» quan s’edita la fitxa de l’hoste des del menú «Hostes», perquè el llibre del passat no canviï.
- Les mateixes validacions i missatges d’error que en crear l’estada.

---

## Com llegeixo la fitxa d’una estada

**Per a què serveix**
És la pantalla on hi ha tot el que té a veure amb una estada: dades, viatgers, documents, signatures, diners, Mossos, missatges…

**On és**
Menú lateral → «Estades» → fes clic a una targeta. A dalt a l’esquerra hi ha l’enllaç «Estades» per tornar a la llista.

**Què hi trobaràs (de dalt a baix)**

1. **Títol**: nom i primer cognom del titular.
2. **Subtítol**: «Contracte número/any» i una etiqueta amb l’estat real:
   - «Esborrany» (taronja): dades incompletes.
   - «Cancel·lada».
   - «Sortida anticipada» (taronja).
   - «Reserva» (blava): encara no ha arribat.
   - «Allotjat ara» (verda): ja ha entrat i encara no ha marxat.
   - «Estada acabada»: ja ha marxat.
3. **Botons de la capçalera** (a la dreta):
   - «Registre persones allotjades», «Reglament intern (LOPD)», «Llibre registre» (o, si hi ha habitacions separades, un grup per full amb «Registre persones allotjades», «Reglament (LOPD)» i «Llibre registre»).
   - «Declaració IEET (menor)» (només si hi ha algun viatger de menys de 17 anys).
   - «Check-in» (només en reserves).
   - «Canviar d’habitació» (només si l’estada no està finalitzada ni cancel·lada, té data d’entrada i de sortida i dura més d’una nit).
   - «Ampliar estada».
   - «Més»: menú amb «Editar», «Sortida anticipada» (o «Reactivar (tornar a allotjat)»), «Treure esborrany» (només en esborranys) i «Eliminar».
4. **«Contractes d’aquesta estada (N)»**: només si l’estada té ampliacions. Mira «Com amplio una estada».
5. **Bloc «Dades de l’estada»**: «Entrada», «Sortida» (o «Sortida (anticipada)» amb la prevista entre parèntesis), «Formalització», «Viatgers», «Pagament», «Habitació» (amb l’historial si s’ha canviat d’habitació, o «· al llibre: …» si consta en una altra), «Tipus de registre (Mossos)» («Reserva» o «Contracte en curs (estada formalitzada)») i «Observacions».
6. **Bloc «Viatgers (N)»**: una targeta per persona amb el nom (fes-hi clic per obrir la fitxa de l’hoste), les etiquetes «Titular» i «Menor», els botons «Editar dades» i «Firmar» (o la signatura feta), i les dades: «Document», «Suport», «Naixement», «Nacionalitat», «Email», «Telèfon», «Adreça», «Parentesc».
7. **«Pagaments i fiances»** (només per a l’administrador): cobraments i fiances de l’estada. Es plega i desplega fent clic al títol.
8. **«Facturació»** (només per a l’administrador): factures i rebuts de tota l’estada, incloses les ampliacions.
9. **«Cobraments pendents»**: pagaments que l’hoste ha de fer més endavant.
10. **«Pressupostos»** (només per a l’administrador): pressupostos enllaçats a l’estada. Si no n’hi ha: «Cap pressupost enllaçat a aquesta estada.»
11. **«Mascotes de l’hoste»**: mascotes del titular. Si no en té: «Sense mascotes.»
12. **«Bugaderia»**: roba a rentar per a aquesta estada.
13. **Columna de la dreta – «Comunicació a Mossos»**: enviar a Mossos i veure els comprovants.
14. **Columna de la dreta – «Missatges a l’hoste»**: benvinguda i gràcies per WhatsApp o email.

[FOTO id=fitxa-estada-general ruta=/estancies/ID descripcio="Fitxa completa d'una estada: capçalera amb títol, contracte, etiqueta d'estat i botons; blocs Dades de l'estada i Viatgers; columna dreta amb Comunicació a Mossos i Missatges a l'hoste" marques="Allotjat ara|Registre persones allotjades|Reglament intern (LOPD)|Llibre registre|Canviar d’habitació|Ampliar estada|Més|Dades de l’estada|Viatgers|Comunicació a Mossos|Missatges a l’hoste"]

[FOTO id=fitxa-blocs-plegables ruta=/estancies/ID descripcio="Part de baix de la fitxa amb els blocs plegables: Pagaments i fiances, Facturació, Cobraments pendents, Pressupostos, Mascotes de l'hoste i Bugaderia" marques="Pagaments i fiances|Facturació|Cobraments pendents|Pressupostos|Mascotes de l’hoste|Bugaderia"]

**Què passa després / d’on surten les dades**

- L’etiqueta d’estat es calcula amb les dates d’avui, d’entrada i de sortida.
- Les dades dels viatgers venen de les seves fitxes d’hoste.
- Els blocs plegables surten oberts si tenen alguna cosa dins i plegats si són buits. Al costat del títol hi ha un número amb quants elements tenen.
- El que es veu depèn del teu usuari: una persona amb permís només de consulta no veu els botons per canviar res; «Pagaments i fiances», «Facturació» i «Pressupostos» només els veu l’administrador.

**Per què es fa així**
Tenir-ho tot en una pàgina evita anar saltant de menú en menú.

**Si t’has equivocat**
Cada bloc té la seva manera de corregir-ho; mira la secció de cada tasca.

---

## Com imprimeixo els documents de l’estada

**Per a què serveix**
Per treure en PDF els papers oficials: la fitxa de registre, el reglament intern amb la protecció de dades (LOPD), el full del llibre de registre i, si cal, la declaració de l’impost turístic per a menors.

**On és**
Fitxa de l’estada → botons de la capçalera.

**Pas a pas**

1. Obre la fitxa de l’estada.
2. Fes clic al botó que necessitis. S’obre en una pestanya nova:
   - «Registre persones allotjades»: el model oficial amb les dades dels viatgers i la signatura de cada un (o una línia per signar a mà si encara no han signat).
   - «Reglament intern (LOPD)»: el reglament de l’hostal amb la clàusula de protecció de dades, amb la signatura i les caselles de comunicacions comercials marcades segons el que va triar l’hoste.
   - «Llibre registre»: el full del llibre de registre (fulls de 4 viatgers).
   - «Declaració IEET (menor)»: només surt si algun viatger té menys de 17 anys.
3. Des de la pestanya nova, imprimeix-lo o desa’l.

[FOTO id=documents-capcalera ruta=/estancies/ID descripcio="Botons de documents a la capçalera de la fitxa d'una estada" marques="Registre persones allotjades|Reglament intern (LOPD)|Llibre registre|Declaració IEET (menor)"]

**Què passa després / d’on surten les dades**

- Les dades de l’estada (contracte, dates, tipus de pagament, habitació) i dels viatgers (nom, document, adreça…) surten de l’estada i de les fitxes d’hoste. Per a estades antigues que tinguin les dades «congelades», surten les dades d’aquell moment.
- Les signatures surten del que s’ha signat al bloc «Viatgers» (vegeu «Com faig signar els viatgers»).
- En una **ampliació**, si un viatger no ha signat l’ampliació, la fitxa i el reglament fan servir la signatura que va fer a l’estada original.
- Si hi ha viatgers en una habitació separada, hi ha un grup de botons per a cada full (vegeu la secció de l’habitació separada).
- Aquests mateixos documents també es poden treure des del menú «Justificants».

**Per què es fa així**
La llei obliga a tenir el registre de persones allotjades i a conservar-lo **3 anys**. La signatura del reglament recull el consentiment de protecció de dades.

**Si t’has equivocat**
Si una dada surt malament, corregeix-la amb «Editar» i torna a treure el PDF.

---

## Com faig signar els viatgers

**Per a què serveix**
Per recollir la signatura de cada viatger. La signatura surt a la fitxa de registre i al reglament (LOPD).

**On és**
Fitxa de l’estada → bloc «Viatgers» → botó «Firmar» al costat de cada persona.

**Pas a pas**

1. Obre la fitxa de l’estada.
2. Al bloc «Viatgers», fes clic a «Firmar» al costat de la persona.
3. S’obre un requadre blanc: «Firma aquí, o puja una foto de la firma feta en paper.»
4. Fes que la persona signi amb el dit o el llapis (a la tauleta) o amb el ratolí.
   - Si ha signat en paper, fes clic a «Pujar foto» i tria la foto: l’app treu el fons i deixa només el traç.
5. A «Comunicacions comercials (opcional)», marca el que digui l’hoste:
   - «No vull rebre comunicacions comercials.»
   - «Autoritzo l’enviament de comunicacions comercials de productes o serveis diferents als contractats.»
6. Fes clic a «Desar firma».
7. Si no ha quedat bé, fes clic a «Esborrar» i torna a signar. Per sortir sense desar, «Cancel·lar».
8. Quan està signada, surt una miniatura de la signatura i l’etiqueta verda «Firmat [data] [hora]». Fes clic a la miniatura per veure-la en gran.

[FOTO id=signatura-pad ruta=/estancies/ID descripcio="Requadre de signatura obert dins del bloc Viatgers, amb les caselles de comunicacions comercials i els botons" marques="Comunicacions comercials (opcional)|Desar firma|Pujar foto|Esborrar|Cancel·lar"]

[FOTO id=signatura-feta ruta=/estancies/ID descripcio="Targeta d'un viatger amb la miniatura de la signatura, l'etiqueta verda Firmat i el botó Tornar a firmar" marques="Firmat|Tornar a firmar"]

**Què passa després / d’on surten les dades**

- La signatura es desa amb la data i l’hora del moment.
- Surt a «Registre persones allotjades», al «Reglament intern (LOPD)» (amb les caselles marcades) i al «Llibre registre».
- Queda apuntat a l’historial intern qui ha recollit la signatura.

**Per què es fa així**
L’hoste ha de signar el registre i acceptar el reglament i la protecció de dades.

**Si t’has equivocat**
Fes clic a «Tornar a firmar»: la nova signatura substitueix l’anterior. També pots canviar les caselles de comunicacions comercials.

**Compte!**
- Si fas clic a «Desar firma» sense haver signat: «Cal signar abans de desar.»
- Si la foto no es pot llegir: «No s'ha pogut llegir la imatge.»
- Si treus el viatger de l’estada, la seva signatura d’aquesta estada s’esborra.

---

## Com amplio una estada

**Per a què serveix**
Quan un hoste decideix quedar-se més dies, es fa una **ampliació**: un contracte nou, enganxat a l’original, per als dies de més.

**On és**
Fitxa de l’estada → botó «Ampliar estada» (a la capçalera).

**Pas a pas**

1. Obre la fitxa de l’estada.
2. Fes clic a «Ampliar estada». S’obre un petit formulari.
3. «Nova entrada»: surt la data de sortida actual (normalment, l’ampliació comença el dia que s’acabava l’estada).
4. «Habitació»: surt la mateixa habitació. Al desplegable, cada habitació porta un text: «· lliure», «· lliure fins [data]» o «· ocupada».
5. «Nova sortida»: el nou dia de marxa.
6. «Reaprofitar les signatures (no cal tornar a signar)»: deixa-ho marcat perquè l’hoste no hagi de tornar a signar. Si està marcat, pots ajustar:
   - «Localitat de la signatura» (surt «Barcelona»).
   - «Data de la signatura» (surt avui).
7. Llegeix els avisos de sota:
   - «L'habitació … està lliure (sense reserves posteriors).»
   - «L'habitació … està lliure fins al …»
   - «⚠ L'habitació … ja consta ocupada el … per una altra estada. Pots crear l'ampliació igualment (si comparteixen habitació) o triar-ne una altra.»
   - En vermell: «La sortida supera la disponibilitat de l’habitació (lliure només fins al …). Tria una altra habitació o una data anterior.»
8. Fes clic a «Crear ampliació». (Per tancar sense fer res, «Cancel·lar».)
9. L’app t’obre la fitxa de l’ampliació nova.

[FOTO id=ampliar-estada ruta=/estancies/ID descripcio="Formulari d'ampliació obert (substitueix el botó Ampliar estada) amb les dates, el desplegable d'habitacions (cada opció diu si és lliure o ocupada) i la casella de reaprofitar signatures" marques="Nova entrada|Habitació|Nova sortida|Reaprofitar les signatures (no cal tornar a signar)|Localitat de la signatura|Data de la signatura|Crear ampliació"]

**Què passa després / d’on surten les dades**

- Es crea una estada nova enganxada a l’original, amb:
  - **Número de contracte**: el de l’original amb un guió baix i un número: per exemple, 26015 → **26015_1**, després **26015_2**… Si l’original no té número, l’ampliació tampoc. Si se n’ha esborrat alguna, el seu número torna a quedar lliure.
  - Els **mateixos viatgers**, titular, parentesc i menors.
  - El mateix tipus de pagament, internet i any de contracte.
  - Tipus «Contracte en curs», estat en curs, i data de formalització d’avui.
  - Les signatures copiades (si has marcat la casella), amb la localitat i la data que has posat.
- A les dues fitxes surt el bloc «Contractes d’aquesta estada (N)» per saltar d’un contracte a l’altre (vegeu la secció següent).
- Al bloc «Comunicació a Mossos» de l’ampliació surt: «Ampliació: els hostes ja es van comunicar a Mossos a l’estada original; normalment no cal reenviar-los (§4).»
- Les factures de tota l’estada (original + ampliacions) es veuen juntes al bloc «Facturació», com una sola sèrie.
- L’ampliació **no** copia: les observacions, l’idioma de comunicació, l’habitació separada dels viatgers ni els pagaments.

**Per què es fa així**
L’estada original ja està comunicada a Mossos i signada. L’ampliació permet allargar-la sense tocar el contracte original i sense tornar a demanar dades ni signatures.

**Si t’has equivocat**
L’ampliació és una estada normal: la pots «Editar» o «Eliminar» des de la seva fitxa.

**Compte!**
- El botó «Crear ampliació» queda desactivat fins que poses la «Nova sortida».
- Que l’habitació estigui ocupada és només un avís; no bloqueja.
- Si la nova sortida no és posterior a la nova entrada: «La data de sortida ha de ser posterior a l'entrada».
- Si no marques «Reaprofitar les signatures», la fitxa PDF de l’ampliació igualment fa servir la signatura de l’estada original per a qui no hagi signat l’ampliació.

---

## Com passo d’un contracte a l’altre d’una mateixa estada

**Per a què serveix**
Quan una estada té ampliacions, per saltar ràpidament entre l’original i cada ampliació.

**On és**
Fitxa de l’estada (original o ampliació) → requadre «Contractes d’aquesta estada (N)», sota la capçalera.

**Pas a pas**

1. Obre qualsevol dels contractes.
2. Al requadre «Contractes d’aquesta estada (N)» hi ha un botó per contracte, amb el número i les dates.
3. El que estàs mirant porta l’etiqueta «Aquí».
4. Fes clic a un altre per obrir-lo.

[FOTO id=cadena-contractes ruta=/estancies/ID descripcio="Requadre Contractes d'aquesta estada d'una estada amb una ampliació: dos contractes, el que estàs mirant marcat Aquí" marques="Contractes d’aquesta estada|Aquí"]

**Què passa després / d’on surten les dades**
Un contracte surt en **lila** amb «€ pendent» si té cobraments previstos sense pagar i encara no ha acabat. Passant-hi el ratolí hi diu «Té cobraments pendents de pagar».

---

## Com canvio d’habitació a mitja estada

**Per a què serveix**
Quan l’hoste es canvia d’habitació durant l’estada (per exemple, a partir del dimecres dorm a la 5), sense fer un contracte nou.

**On és**
Fitxa de l’estada → botó «Canviar d’habitació» (a la capçalera).

**Pas a pas**

1. Obre la fitxa de l’estada.
2. Fes clic a «Canviar d’habitació».
3. «Dorm a la nova des del»: el primer dia que dorm a l’habitació nova. Només es pot triar entre el dia després de l’entrada i el dia abans de la sortida.
4. «Nova habitació»: tria-la (no surt l’actual).
5. Llegeix el text: «Mateix contracte: fins al … compta a l’habitació actual i, a partir d’aquell dia, a la nova (fins a la sortida, …).»
6. Si la nova està ocupada, surt l’avís de solapament (vegeu la secció de solapament).
7. Fes clic a «Canviar». (Per tancar, «Cancel·lar».)

[FOTO id=canvi-habitacio ruta=/estancies/ID descripcio="Formulari de canvi d'habitació obert (substitueix el botó Canviar d’habitació) amb la data, la nova habitació i el text explicatiu" marques="Dorm a la nova des del|Nova habitació|Canviar"]

**Què passa després / d’on surten les dades**

- L’habitació de l’estada passa a ser la nova.
- Al bloc «Dades de l’estada» → «Habitació» surt l’historial: cada habitació amb les seves dates (la de l’última en negreta).
- L’habitació antiga queda lliure a partir del dia del canvi i la nova només compta com a ocupada a partir d’aquell dia (calendari, disponibilitat, avisos de solapament).
- Si hi ha una tasca de neteja de sortida pendent, passa a l’habitació nova (on l’hoste farà la sortida).
- El contracte és el mateix: a Mossos no canvia res.

**Per què es fa així**
Així no cal fer una ampliació ni un contracte nou només per un canvi d’habitació, i l’ocupació de cada habitació és correcta.

**Si t’has equivocat**

1. Al bloc «Dades de l’estada» → «Habitació», fes clic a «Desfer l’últim canvi».
2. Accepta la pregunta «Desfer l’últim canvi d’habitació?».
3. L’estada torna a l’habitació d’abans. Només es pot desfer l’últim canvi; si n’hi ha diversos, es desfan d’un en un, començant pel més recent.

[FOTO id=historial-habitacio ruta=/estancies/ID descripcio="Camp Habitació del bloc Dades de l'estada amb l'historial de trams i l'enllaç per desfer" marques="Habitació|Desfer l’últim canvi"]

**Compte!** Missatges possibles:
- «Validación fallida: l'hoste ja és en aquesta habitació»
- «Validación fallida: el canvi ha de ser després del dia d'entrada. Si l'habitació era una altra des del principi, edita l'estada.»
- «Validación fallida: el canvi ha de ser abans del dia de sortida»
- «Validación fallida: ja hi ha un canvi d'habitació el …; el nou ha de ser posterior»
- «Validación fallida: l'estada ha de tenir data d'entrada i de sortida»
- «Validación fallida: només es pot desfer l'últim canvi d'habitació»
- El botó «Canviar d’habitació» no surt si l’estada és d’una sola nit, si no té dates o si està finalitzada o cancel·lada.

---

## Com registro una sortida anticipada

**Per a què serveix**
Quan l’hoste marxa abans del dia previst. L’app tanca l’estada, allibera l’habitació i, si cal, apunta els diners que li tornes.

**On és**
Fitxa de l’estada → «Més» → «Sortida anticipada». No surt si l’estada és un esborrany o està cancel·lada.

**Pas a pas**

1. Obre la fitxa de l’estada.
2. Fes clic a «Més» → «Sortida anticipada».
3. S’obre la finestra «Sortida anticipada» amb el text: «L’hoste marxa abans del previst. Es marcarà l’estada com a finalitzada abans d’hora, s’alliberarà l’habitació … i quedarà una nota interna. Ho podràs desfer si t’equivoques.»
4. «Data real de sortida»: surt avui. Només pots triar entre la data d’entrada i la sortida prevista.
5. «Hora (opcional)»: si vols apuntar l’hora.
6. A «Devolució de diners», tria:
   - «No torno cap import», o
   - «Torno diners»: escriu l’«Import €» i el «Mètode» («Efectiu», «Targeta», «Transferència», «Bizum» o «Altres»). Surt: «Es registrarà com a devolució (resta de l’ingrés de l’estada).»
7. Fes clic a «Confirmar sortida». (Per tancar sense fer res, «Cancel·lar» o la creu.)

[FOTO id=sortida-anticipada ruta=/estancies/ID descripcio="Finestra Sortida anticipada amb la Data real de sortida, l'Hora (opcional), el bloc Devolució de diners (No torno cap import / Torno diners, amb Import € i Mètode) i el botó Confirmar sortida"]

**Què passa després / d’on surten les dades**

- La data de sortida de l’estada passa a ser la real, i l’estada queda **finalitzada**. L’app guarda la sortida prevista original.
- A la capçalera surt l’etiqueta «Sortida anticipada» i al bloc «Dades de l’estada» surt «Sortida (anticipada)» amb «(prevista …)».
- L’habitació queda lliure a partir de la data real.
- Es deixa una **nota interna** a les «Observacions» de l’estada i a la fitxa del titular, per exemple: «Sortida anticipada: ha deixat l'habitació 3 el 12/08/2026 (sortida prevista: 15/08/2026). S'han retornat 50.00 €.»
- Si tornes diners, es crea un cobrament **negatiu** («Devolució per sortida anticipada»). Es data el mateix dia que l’últim pagament de l’estada, perquè al balanç es resti del mateix període i l’ingrés quedi net.

**Per què es fa així**
Per tenir l’ocupació real (l’habitació es pot tornar a llogar), els ingressos reals i una nota objectiva del que ha passat.

**Si t’has equivocat**

1. Fes clic a «Més» → «Reactivar (tornar a allotjat)».
2. L’estada torna a estar en curs, amb la data de sortida original. L’app esborra la nota de les observacions, la nota de la fitxa del titular i la devolució que s’hagués apuntat.

[FOTO id=reactivar ruta=/estancies/ID descripcio="Menú Més d'una estada amb sortida anticipada, mostrant Reactivar (tornar a allotjat)" marques="Més|Reactivar (tornar a allotjat)"]

**Compte!**
- Si tries «Torno diners», el botó «Confirmar sortida» queda desactivat fins que poses un import més gran que zero. (Missatge del servidor: «Indica l'import a retornar».)
- Si la data és anterior a l’entrada, no es desa.
- Si ja havies comunicat l’estada a Mossos, la sortida anticipada **no** s’envia sola a Mossos.

---

## Com apunto un cobrament pendent (pagament previst)

**Per a què serveix**
Per recordar-te que l’hoste ha de pagar una quantitat més endavant (per exemple, la resta de l’allotjament el dia de la sortida). L’app t’avisarà al tauler.

**On és**
Fitxa de l’estada → bloc plegable «Cobraments pendents».

**Pas a pas per afegir-ne un**

1. Obre la fitxa de l’estada i desplega «Cobraments pendents» (fes clic al títol).
2. A baix, omple:
   - «Import (€)» (pots escriure amb coma, per exemple 120,50).
   - «Data prevista»: el dia que ha de pagar.
   - «Concepte (opcional)»: per exemple, «Resta de l’allotjament…».
3. Fes clic a «Afegir».

**Pas a pas quan ja ha pagat**

1. Al cobrament de la llista, fes clic a «Marcar pagat». Surt l’etiqueta verda «Pagat».
2. Si t’has equivocat, fes clic a «Desfer».
3. Per esborrar-lo del tot, fes clic a la paperera («Eliminar»).

[FOTO id=cobraments-pendents ruta=/estancies/ID descripcio="Bloc Cobraments pendents amb un cobrament ja pagat (etiqueta verda Pagat i botó Desfer), un de pendent amb el botó Marcar pagat i el formulari d'afegir" marques="Cobraments pendents|Pagat|Marcar pagat|Import (€)|Data prevista|Concepte (opcional)|Afegir"]

**Què passa després / d’on surten les dades**

- «El tauler t’avisarà des del dia abans de la data prevista (i mentre estigui vençut) fins que ho marquis com a pagat.»
- Si la data prevista ja ha arribat i no està pagat, surt l’etiqueta «Vençut» en taronja.
- Mentre hi ha algun cobrament pendent sense pagar (i l’estada no ha acabat), la targeta de l’estada surt en **lila** a la llista amb «€ Cobrament pendent», i també al requadre «Contractes d’aquesta estada».
- **Important:** marcar-lo com a pagat **no** apunta cap ingrés. És només un recordatori. Els diners cobrats s’han d’apuntar a «Pagaments i fiances».

**Per què es fa així**
Per no oblidar-te de cobrar.

**Si t’has equivocat**
Fes servir «Desfer» o la paperera.

**Compte!**
- El botó «Afegir» està desactivat si falta l’import o la data.
- Si l’import és zero o negatiu: «L’import ha de ser més gran que 0».
- Si no hi ha cap cobrament: «Cap cobrament pendent registrat.»

---

## Com indico la bugaderia de l’estada

**Per a què serveix**
Per dir quanta roba (llençols, tovalloles…) s’ha de rentar en cada neteja d’aquesta estada. Aquests valors preomplen la bugaderia quan es marca la neteja.

**On és**
Fitxa de l’estada → bloc plegable «Bugaderia».

**Pas a pas**

1. Desplega «Bugaderia».
2. Surt una taula amb cada article («Article»), el seu «Preu» i dues columnes: «Manteniment» (neteja de repàs mentre l’hoste hi és) i «Sortida» (neteja quan marxa).
3. Fes clic a «+» o «−» per posar la quantitat de cada article.
4. A baix surt el «Total per neteja» de cada columna.
5. Fes clic a «Desar».
6. Si vols tornar als valors de l’habitació, fes clic a «Per defecte» (i després «Desar»).

[FOTO id=bugaderia-estada ruta=/estancies/ID descripcio="Bloc Bugaderia desplegat amb la taula d'articles, els botons + i −, els totals i els botons Per defecte i Desar" marques="Total per neteja|Bugaderia|Manteniment|Per defecte|Desar"]

**Què passa després / d’on surten les dades**

- La llista d’articles i els preus surten del catàleg de bugaderia de la configuració.
- Si l’estada encara no té res desat, surten els valors per defecte de l’habitació.
- «Valors per defecte d'aquesta estada. Preomplen la bugaderia quan marques la neteja a Neteja (allà és on compta i on es genera l'avís a la Mireia).» És a dir: el que poses aquí **no compta** com a despesa; compta el que es marca a la pantalla Neteja.

**Si t’has equivocat**
Canvia les quantitats i torna a «Desar», o «Per defecte».

**Compte!**
- El botó «Desar» només s’activa quan has canviat alguna cosa.
- Si no hi ha catàleg: «No hi ha catàleg de bugaderia. Configura'l a /config.»
- El botó «Per defecte» només surt si l’habitació té valors per defecte.

---

## Com envio la benvinguda i el missatge de gràcies

**Per a què serveix**
Per enviar a l’hoste el missatge de benvinguda (amb l’enllaç a la pàgina de benvinguda de l’hostal) i, quan marxa, un missatge de gràcies amb l’enllaç per deixar una ressenya a Google.

**On és**
Fitxa de l’estada → columna de la dreta → bloc «Missatges a l’hoste».

**Pas a pas – WhatsApp de benvinguda**

1. Tria l’idioma al desplegable (surt l’«Idioma de comunicació» de l’estada): «Català», «Castellà», «Anglès» o «Francès».
2. Fes clic a «Benvinguda WhatsApp».
3. Surt una finestra amb el text sencer i la pregunta «Enviar aquest WhatsApp a …?». Revisa’l i accepta.
4. S’obre WhatsApp amb el missatge ja escrit. Envia’l des de WhatsApp.

**Pas a pas – WhatsApp de gràcies**

1. Tria l’idioma i fes clic a «Gràcies WhatsApp».
2. Revisa el text, accepta i envia’l des de WhatsApp.

**Pas a pas – email de gràcies programat**

1. Fes clic a «Email de gràcies».
2. S’obre «Email de gràcies + ressenya» amb:
   - «Correu destinatari» (surt l’email del titular),
   - «Nom»,
   - «Idioma»,
   - «Enviar el» (surt l’endemà de la sortida a les 12:00),
   - «Enllaç ressenya Google».
3. Fes clic a «Programar». (Per tancar, «Cancel·lar».)
4. Surt a la llista amb un rellotge i «Programat per [data i hora]».

[FOTO id=missatges-hoste ruta=/estancies/ID descripcio="Bloc Missatges a l'hoste amb el selector d'idioma, els dos botons verds de WhatsApp i el botó d'email" marques="Missatges a l’hoste|Benvinguda WhatsApp|Gràcies WhatsApp|Email de gràcies"]

[FOTO id=email-gracies ruta=/estancies/ID descripcio="Formulari d'email de gràcies obert i, a sota, un email programat a la llista" marques="Correu destinatari|Nom|Idioma|Enviar el|Enllaç ressenya Google|Programar|Programat per"]

**Què passa després / d’on surten les dades**

- El nom, l’email i el telèfon són els del **titular**. L’idioma per defecte és l’«Idioma de comunicació» de l’estada.
- El missatge de benvinguda porta un enllaç a la pàgina de benvinguda de l’hostal amb l’idioma, el nom, l’habitació i la referència de l’estada.
- Quan confirmes la benvinguda per WhatsApp, l’app la marca com a enviada i desapareix l’avís de «benvinguda pendent» del tauler. (El tauler avisa de les estades que ja han passat la primera nit, com a màxim dues, que encara hi són, que no són ampliacions i a qui no s’ha enviat la benvinguda.)
- Els emails programats s’envien sols a l’hora indicada. A la llista surten en verd amb «Enviat» quan ja s’han enviat, o en vermell amb «Error: …» si han fallat.

**Per què es fa així**
Un bon tracte i les ressenyes a Google ajuden a omplir l’hostal.

**Si t’has equivocat**
- Un email programat que encara no s’ha enviat es pot treure amb la paperera («Cancel·lar»).
- Un WhatsApp ja enviat no es pot desfer des de l’app.

**Compte!**
- Si el titular no té telèfon, els botons de WhatsApp estan desactivats («El titular no té telèfon»). Afegeix el telèfon amb «Editar».
- Si falta el correu o l’hora: «Omple correu i hora».
- Si no hi ha cap email: «Cap email programat per a aquesta estada.»
- Si cancel·les la finestra de confirmació del WhatsApp de benvinguda, **no** es marca com a enviada.

---

## Com comunico l’estada a Mossos des de la fitxa

**Per a què serveix**
Per enviar les dades dels viatgers a Mossos d’Esquadra, tal com obliga la llei. (El detall complet és al capítol de Mossos; aquí només el que es fa des de l’estada.)

**On és**
Fitxa de l’estada → columna de la dreta → bloc «Comunicació a Mossos».

**Pas a pas**

1. Fes clic a «Pujar a Mossos» (automàtic) o «Descarregar .txt (manual)» (per pujar-lo tu al portal).
2. Amb «Pujar a Mossos» surt la finestra «Pujar a Mossos automàticament» amb «Segur que vols enviar el contracte … a Mossos?». Fes clic a «Sí, pujar ara».
3. Amb «Descarregar .txt (manual)» s’obre «Revisa el que s’enviarà a Mossos»: hi veus tot el que es comunicarà. Després, «Sí, generar i descarregar».
4. Cada fitxer generat surt a la llista amb el seu nom, l’estat («Pendent», «Enviat», «Acceptat», «Rebutjat», «Error»), el «Contracte enviat» i el botó «Comprovant mossos».

[FOTO id=mossos-estada ruta=/estancies/ID descripcio="Bloc Comunicació a Mossos amb els dos botons i un enviament a la llista" marques="Comunicació a Mossos|Pujar a Mossos|Descarregar .txt (manual)|Comprovant mossos"]

**Què passa després / d’on surten les dades**
El fitxer es fa amb les dades de l’estada (contracte, dates, tipus de registre, tipus de pagament) i de **tots** els viatgers. Si les dades són prou completes per generar el fitxer, l’esborrany es treu sol.

**Per què es fa així**
Termini legal: **24 hores**.

**Compte!**
- Si l’estada ja s’havia comunicat, surt l’avís «Aquesta estada ja s’ha comunicat a Mossos…» i que es comunicarà **per duplicat**.
- «Eliminar» un comprovant només l’esborra de l’app: «NO es treu de Mossos».
- En una ampliació: «Ampliació: els hostes ja es van comunicar a Mossos a l’estada original; normalment no cal reenviar-los (§4).»

---

## Com elimino una estada

**Per a què serveix**
Per treure una estada creada per error (duplicada, de prova…).

**On és**
Fitxa de l’estada → «Més» → «Eliminar». (El botó del menú porta una paperera vermella.)

**Pas a pas**

1. Obre la fitxa de l’estada.
2. Fes clic a «Més» → «Eliminar».
3. Surt la finestra «Eliminar l'estada [contracte]?» amb el text: «L'estada … desapareixerà del llibre de registre, de les llistes i de la comptabilitat.» Segons el cas, s’hi afegeix:
   - «S'eliminaran també N factures/rebuts i els seus cobraments.»
   - «⚠ ATENCIÓ: ja s'ha comunicat a Mossos. Eliminar-la aquí NO la retira del portal.»
   - «Les dades queden a l'històric d'auditoria.»
4. Mentre es comprova, surt «Comprovant els clients d'aquesta estada…». Després:
   - Si algun client es quedaria sense cap estada, surt una casella: «"Nom" es quedarà sense cap estada. Eliminar el client també del CRM.» Marca-la si també vols treure’l de la llista d’hostes.
   - Per a la resta surt una nota: «"Nom" té N estades més: la seva fitxa de client es manté.» o «"Nom" ja estava eliminat del CRM (data).»
5. Confirma per eliminar. Tornes a la llista d’estades.

[FOTO id=eliminar-estada ruta=/estancies/ID descripcio="Finestra «Eliminar l'estada …?» amb l'avís «ATENCIÓ: ja s'ha comunicat a Mossos», la casella «Eliminar el client també del CRM.» i els botons Cancel·lar i Eliminar"]

**Què passa després / d’on surten les dades**

- L’estada i les seves factures i rebuts desapareixen de les llistes, del llibre de registre i de la comptabilitat (balanç, llibre d’IVA…).
- No s’esborren de veritat: queden guardades i a l’historial d’auditoria (un administrador les podria recuperar).
- Si has marcat la casella, els clients sense altres estades també es treuen de la llista d’hostes.
- Si era una ampliació, el seu número (_1, _2…) torna a quedar lliure per a la propera ampliació.

**Per què es fa així**
Perquè una estada equivocada no s’ha de comptar enlloc, però s’ha de poder demostrar què s’ha fet.

**Si t’has equivocat**
Des de l’app no es pot desfer. Cal demanar-ho a l’administrador (vegeu DUBTES).

**Compte!**
- Si l’estada ja s’havia comunicat a Mossos, **continua a Mossos**. Eliminar-la de l’app no l’esborra del portal.
- Si l’hoste ha marxat abans, **no** eliminis l’estada: fes «Sortida anticipada».
- Si hi ha un error, surt «No s'ha pogut eliminar l'estada».

---

## Preguntes freqüents

**1. L’hoste ha arribat però tenia una reserva. Què faig?**
Obre la reserva i fes clic a «Check-in». Abans, fes clic a «Editar totes les dades primer» per posar el document i l’adreça. Després comunica-ho a Mossos (24 hores).

**2. L’hoste es queda dos dies més. Canvio la data de sortida?**
No. Fes clic a «Ampliar estada». Així el contracte original (ja comunicat i signat) no es toca i es crea el 26015_1 per als dies de més.

**3. L’hoste marxa abans. Esborro l’estada?**
No. Fes «Més» → «Sortida anticipada». Si l’has de tornar diners, tria «Torno diners». Eliminar l’estada la trauria del llibre de registre, i el llibre s’ha de conservar.

**4. Dues persones comparteixen habitació però cadascuna paga la seva part. Com ho faig?**
Si han de tenir contractes **diferents**, fes dues estades a la mateixa habitació. Sortirà l’avís taronja d’habitació ocupada, però «pots desar igualment». Si és un sol grup i només cal que als papers una consti en una altra habitació, fes servir «Habitació al llibre / factura».

**5. Una família ocupa les habitacions 3 i 4 però ho he registrat tot junt. Puc treure un llibre per a cada habitació?**
Sí. Posa l’habitació 3 a l’estada i, als viatgers que dormen a la 4, posa «Habitació 4» a «Habitació al llibre / factura». A la fitxa sortiran dos grups de botons de documents i a la factura podràs triar l’habitació.

**6. No tinc el DNI de l’hoste encara. Puc desar?**
Sí, amb «Desar com a esborrany» (cal com a mínim el nom i el primer cognom del titular). Recorda completar-ho abans de les 24 hores de Mossos.

**7. He posat malament el DNI d’un hoste que ja va venir l’any passat. Si el corregeixo, canvia el llibre de l’any passat?**
Les dades es desen a la fitxa de l’hoste. Les estades que fa més de 7 dies que han acabat tenen les dades «congelades» quan corregeixes la fitxa des del menú «Hostes», per no reescriure el passat. Si ho corregeixes des de l’«Editar» d’una estada, vegeu DUBTES.

**8. Per què la llista diu «Finalitzada» si jo no l’he tancat?**
Perquè l’estat es calcula per dates: quan arriba la data de sortida, l’estada passa sola a «Finalitzada».

**9. Per què una estada surt en lila a la llista?**
Perquè té un cobrament pendent sense marcar com a pagat («€ Cobrament pendent»). Obre-la i mira el bloc «Cobraments pendents».

**10. Un hoste de l’ampliació ha de tornar a signar?**
No, si en fer l’ampliació deixes marcada «Reaprofitar les signatures (no cal tornar a signar)». A més, la fitxa PDF de l’ampliació fa servir la signatura de l’estada original si no n’hi ha una de nova.

**11. M’he equivocat en canviar d’habitació. Com ho desfaig?**
Al bloc «Dades de l’estada» → «Habitació», fes clic a «Desfer l’últim canvi».

**12. No veig «Pagaments i fiances» ni «Facturació» a la fitxa.**
Aquests blocs només els veu l’usuari administrador.

**13. Per què no em surt el botó «Canviar d’habitació»?**
Perquè l’estada és d’una sola nit, no té dates d’entrada i sortida, o ja està finalitzada o cancel·lada.

**14. He eliminat una estada que ja havia enviat a Mossos. Ja no hi consta?**
Sí que hi consta. Eliminar a l’app no retira res del portal de Mossos.

---

## DUBTES

*(Secció interna: no es publica.)*

1. **Número de contracte separat (numContracteSeparat).** El camp existeix a la base de dades i, si té valor, s’imprimeix al full separat del llibre, a la fitxa PDF i a la capçalera («+ 26016/2026 (Hab. 4)»). També el tenen en compte les comprovacions de número ocupat i la proposta del següent número. Però **al formulari no hi ha cap camp per escriure’l**: només es conserva si ja hi era. L’ajuda del camp diu «amb el MATEIX número de contracte de l’estada». Cal confirmar si s’ha de poder escriure (i on), o si és una funció retirada.
2. **Cobrament inicial en crear l’estada.** El formulari demana data, etapa («A compte», «Cobro», «Total», «Altre…») i «Observacions internes», però el servidor només guarda el **mètode** i l’**import** (l’esquema de validació descarta la resta). La data del cobrament queda la del dia de creació i no es guarda ni l’etapa ni les observacions. Igual amb la data i les observacions de la fiança. Cal confirmar si és un error.
3. **Esborrany automàtic del navegador.** El formulari «Nova estada» es desa sol al navegador cada pocs instants, però no he trobat cap codi que el **recuperi** quan tornes a obrir la pantalla. Per això el manual no ho explica com a funció.
4. **Estat «Cancel·lada».** L’app té l’estat i l’etiqueta «Cancel·lada», però no he trobat cap botó per cancel·lar una estada ni cap pestanya «Cancel·lada» a la llista (el filtre existeix per URL, ?estat=CANCELLADA). Cal confirmar com es cancel·la una reserva (eliminar-la?).
5. **Tornar una estada a «Reserva».** Després del check-in no hi ha cap botó per tornar l’estat a Reserva. «Editar» només canvia el tipus de registre, no l’estat.
6. **Dades «congelades» i edició des de l’estada.** El congelat de les dades (>7 dies després de la sortida) només es fa quan s’edita l’hoste des de la fitxa d’hoste (API /api/huespedes/:id). En canvi, «Editar» una estada sobreescriu la fitxa de l’hoste **sense congelar** abans les altres estades antigues. Pot reescriure el llibre d’estades passades que encara no estiguin congelades. Cal confirmar si és volgut.
7. **Numeració de les ampliacions.** L’enunciat parla d’«1.1, 1.2», però el codi numera amb guió baix: 26015_1, 26015_2 (les factures sí que fan servir el punt). Comentaris antics del codi diuen «26004.1». El manual explica el guió baix.
8. **Errors amb text en castellà.** Els errors del canvi d’habitació surten amb el prefix «Validación fallida:» (en castellà) davant del text català. També, els errors de la sortida anticipada i de la reactivació (per exemple, «La data de sortida no pot ser anterior a l'entrada») es llancen com a errors genèrics i probablement l’usuari veu «Error intern del servidor». Cal comprovar-ho a la pantalla.
9. **Botó «Ampliar estada» per a usuaris de consulta.** El botó surt sempre (no comprova el rol), però el servidor el rebutja si l’usuari és de consulta. Cal confirmar el missatge que veu.
10. **Recuperar una estada eliminada.** L’esborrat és lògic i el codi diu «recuperable per un administrador si cal», però no hi ha cap pantalla per recuperar-la.
11. **Freqüència d’enviament dels emails programats.** Hi ha un procés automàtic (/api/cron/emails) però no he confirmat cada quan s’executa; pot ser que l’email no surti exactament a l’hora indicada.
12. **Plantilles i enllaços de WhatsApp.** El text de la benvinguda, l’enllaç de la pàgina de benvinguda i l’enllaç de ressenya es poden personalitzar i es desen al **navegador** (no a la base de dades): en una altra tauleta o ordinador poden ser diferents. Cal confirmar on es configuren (probablement a «Plantilles»).
13. **Nom «Barcelona» per defecte a la localitat de signatura de l’ampliació.** L’hostal és a Calella, però el formulari d’ampliació proposa «Barcelona». Cal confirmar si és correcte.
14. **Menor de 14 per a Mossos vs. menor de 17 per a l’IEET.** El botó «Declaració IEET (menor)» surt amb menors de 17 anys; la casella «És menor» és per a menors de 14. Cal confirmar que l’edat de 17 és la correcta per a l’exempció de l’impost turístic.
15. **Les mascotes no segueixen el canvi de titular.** Les mascotes queden a la fitxa del titular que hi havia en crear l’estada. Si es canvia el titular, el bloc «Mascotes de l’hoste» passa a mostrar les del nou titular. Cal confirmar si és el comportament desitjat.
