# Latino Facile — produzione 9010

## Identità della versione

- **Deploy:** 9010, 7 novembre 2026; servizio esistente aggiornato.
- **Indirizzo pubblico invariato:** https://latino-facile-app-2.easy-peasy.site/
- **Checkpoint del codice pubblicato:** `de7b501e1de807fa1084be3957a2b17b40ea3394`.
- **Anteprima:** condivisa e verificata prima della conferma esplicita di pubblicazione. Il checkpoint successivo di sole guide non equivale a un nuovo deploy.

La versione rende più compatta su mobile la seconda pagina, senza ridurre i caratteri. La sincronizzazione dell'iframe risponde ai ping anche quando la misura non cambia, conferma i grandi salti e ritarda la prima misura per evitare falsi loop. Il messaggio al salvataggio è «Traduzione aggiornata.».

Restano invariati la palette e il PDF; non sono state cambiate `confirm()`, la geometria del ritaglio o `ColorDialog`. Durante il crop la sincronizzazione resta sospesa e riprende alla chiusura.

## Controlli

Prima del deploy: typecheck e build riusciti, **131/131 test unitari**, **8/8 scenari** altezza con Chromium/WebKit, **36/36 controlli** sulle transizioni e **58/58 controlli** sul ritaglio dopo il risultato, usando risposte sintetiche. Ricostruzione indipendente dello ZIP **33/33**, con installazione offline dalla cache preesistente: non dimostra una nuova installazione online. Nessun telefono fisico, dato studente o OCR reale coinvolto.

Dopo il deploy: URL pubblico e `/_health` raggiungibili (`OK`); pagina iniziale e pagina di lavoro aperte nel browser. Gli asset dichiarati nell'HTML hanno MIME corretti e coincidono byte per byte con la build approvata:

- `/assets/index-DCcjlIde.js` — SHA-256 `dc8c6e224f84c12f71b3cbf3cdee40945a426cecd1262161c72e11583208095b`
- `/assets/index-DPiUCkXV.css` — SHA-256 `23b28602dca00278b3ec5fb01a24e6fb2a6b071596b1b72736992d4ddea7d0ec`

Nel browser Chrome dell'utente, con la cornice di prova pubblica in contenitori larghi 320 e 390 px, la pagina di lavoro era visibile, senza overflow orizzontale; altezza iframe/contenuto rispettivamente **728/727 px** e **608/607 px**, con risposta ai ping e token coerente. Le larghezze interne effettive erano 286 e 357 px per via dei margini della pagina di prova. Si tratta di un controllo di layout senza colorazione e non di un test su smartphone fisico. I test completi sulle transizioni con risultati simulati sono stati svolti sull'anteprima avente gli stessi asset.

## Limiti e materiali

- Il limite resta **50 parole**, non 200. Il limite API di 2000 caratteri è separato.
- Nel WebKit mobile emulato la cornice preesistente nasconde Schermo intero se l'API non è supportata; non garantire il comando su ogni browser. Nessun cambiamento al post Blogger è stato eseguito con questo deploy.
- In anteprima sono stati osservati contrasto del pulsante ENTRA attivo di circa **3,21:1** e alcuni comandi della barra alti **24 px**; non sono stati modificati in questo intervento. Non si dichiara una certificazione di accessibilità.
- Lo ZIP già consegnato `Latino-Facile-ANTEPRIMA-MOBILE-GITHUB-RENDER-2026-11-07.zip` ha SHA-256 `74a7f487be72326804a10469a96499443643965f73001e744f08754947453808` e contiene il checkpoint di codice qui pubblicato. Nome e guide fotografano lo stato precedente al deploy; lo ZIP non è aggiornato automaticamente su GitHub o Render.
- Il tool di deploy ha rimosso il Dockerfile locale: ripristinato soltanto quel file da HEAD e verificato byte per byte; nessun reset, seed o migrazione.

Il rilascio 9001 precedente rimane documentazione storica.
