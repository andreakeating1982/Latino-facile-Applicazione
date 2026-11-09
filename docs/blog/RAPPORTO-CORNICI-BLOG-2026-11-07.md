# Cornici del blog — standardizzazione

## Stato

Dopo la conferma, **9 post sono stati aggiornati e riaperti nell'editor Blogger**: le impronte dei contenuti salvati corrispondono alla ricostruzione ottenuta sostituendo soltanto le 13 cornici previste. Il documento Word è stato aggiornato e verificato.

La **verifica pubblica è conclusa per tutti e 9 i post**: nei feed, HTML, CSS e JavaScript delle 13 cornici corrispondono ai candidati verificati. In Chrome, le pagine reali sono state caricate anche in un contenitore largo 320 px: tutte le cornici hanno ricevuto una risposta di altezza dall'app collegata e i pulsanti erano visibili. I limiti della prova sono indicati sotto.

## Modifiche effettuate

- Pulsanti **Schermo intero** e **Ricarica** con icone SVG corrette e testo visibile anche sugli schermi stretti; area di contatto ampliata e impaginazione adattiva.
- Altezza dinamica con conferma dei salti e richiesta di una nuova misura nelle cornici che già usano questo controllo. La cornice della **Mappa concettuale in 3 passi** tiene conto del suo limite di tre secondi fra risposte di altezza identica.
- Nelle app con dashboard docente è stata mantenuta la loro gestione dell'altezza, senza introdurre un filtro che potrebbe tagliare le pagine lunghe.
- Indirizzi delle app, titoli, colori, permessi presenti, contenuti esterni alle cornici e cornici di PDF/video conservati. La cornice di Latino Facile era già aggiornata e non è stata modificata.

## Documento

La copia aggiornata conserva i **14 codici e la loro numerazione**, usa Consolas 7 punti e aggiunge il **Codice 15 — Mappe concettuali di matematica e fisica**, già presente nel blog ma assente dal documento precedente. L'indice è stato integrato. Il documento contiene anche codici di app non individuate nei post pubblici attuali: non sono stati eliminati.

## Blog: post interessati

Sono state aggiornate **13 cornici in 9 post** già pubblicati e il contenuto salvato è stato riaperto e confrontato mediante SHA-256:

| Post | Cornici | Feed pubblico | Prova iniziale a 320 px |
|---|---:|---|---|
| [Matematica — widget per espressioni](https://blogdelprofessoreandreacentinaro.blogspot.com/2026/09/matematica_01504356514.html) | 1 | Corrispondente | App online, pulsanti visibili |
| [Lingue straniere — Lingue Facili](https://blogdelprofessoreandreacentinaro.blogspot.com/2026/09/lingue-straniere.html) | 1 | Corrispondente | App online, pulsanti visibili |
| [Matematica e fisica — mappe concettuali](https://blogdelprofessoreandreacentinaro.blogspot.com/2026/09/matematica-e-fisica.html) | 1 | Corrispondente | App online, pulsanti visibili |
| [Strategie di studio — mappa in 3 passi](https://blogdelprofessoreandreacentinaro.blogspot.com/2026/07/strategie-di-studio.html) | 1 | Corrispondente | App online, pulsanti visibili |
| [Letteratura inglese — quiz](https://blogdelprofessoreandreacentinaro.blogspot.com/2026/05/letteratura-inglese.html) | 1 | Corrispondente | App online, pulsanti visibili |
| [Letteratura spagnola — Rosalía de Castro](https://blogdelprofessoreandreacentinaro.blogspot.com/2026/05/letteratura-spagnola_0257251835.html) | 2 | Corrispondenti | App online, pulsanti visibili |
| [Letteratura spagnola — Bécquer](https://blogdelprofessoreandreacentinaro.blogspot.com/2026/05/letteratura-spagnola.html) | 3 | Corrispondenti | App online, pulsanti visibili |
| [Letteratura spagnola — Romanticismo](https://blogdelprofessoreandreacentinaro.blogspot.com/2026/04/letteratura-spagnola_6.html) | 2 | Corrispondenti | App online, pulsanti visibili |
| [Letteratura spagnola — marco histórico](https://blogdelprofessoreandreacentinaro.blogspot.com/2026/08/letteratura-spagnola.html) | 1 | Corrispondente | App online, pulsanti visibili |

Il post Latino e le cornici di PDF e video sono rimasti fuori dall'intervento. Per ciascun post è stato verificato che, ripristinando nella copia aggiornata il codice delle cornici precedenti, si ricostruisce esattamente il contenuto precedente: i contenuti esterni alle cornici non sono stati modificati dalle sostituzioni.

La copia di sicurezza allegata contiene il corpo HTML dei nove post. Per sei usa la fotografia esatta dell'editor immediatamente precedente alla modifica; per gli altri tre usa la copia del censimento iniziale, dalla quale la sola sostituzione delle cornici ricostruisce esattamente l'impronta del contenuto salvato. Per **Strategie di studio** lo snapshot dell'editor era diverso dal censimento iniziale: è stato quindi inserito lo snapshot più recente. Il backup non comprende impostazioni Blogger separate, etichette, date, commenti o file esterni. Un eventuale ripristino deve essere valutato manualmente per non sovrascrivere modifiche successive.

## Verifiche e limiti

- Documento riaperto: testo dei 15 codici confrontato con i candidati, indice originale conservato e carattere Consolas 7 punti verificato.
- **54/54 scenari, 4.806 controlli superati** su Chromium e WebKit emulati: visualizzazione a 280, 320, 390 e 1440 px; font ingrandito; pulsanti, SVG, ricarica, resize, token e isolamento. Le app negli iframe sono simulate per le prove funzionali.
- **6/6 prove** di cornici multiple nello stesso post superate. Il limite di tre secondi della Mappa a 3 passi è stato riprodotto: prima il grande salto non veniva applicato; dopo l'adattamento la conferma funziona in entrambi i browser emulati.
- **Feed pubblici, 9/9 post e 13/13 cornici:** il 7 novembre 2026, alle 13:37 CET, sono stati confrontati nel browser HTML della cornice e contenuto dei rispettivi tag CSS e JavaScript con i candidati, dopo la normale interpretazione HTML. Tutti corrispondono; non si tratta della sola ricerca di un marcatore.
- **App reali, 13/13 cornici:** i 9 post pubblici sono stati caricati in Chrome desktop entro contenitori larghi 320 px, senza creare classi o compilare esercizi. Ogni cornice ha ricevuto almeno un messaggio di altezza dall'app collegata, ha raggiunto lo stato online e mostrava entrambe le etichette con le rispettive icone; non è stato misurato trabocco orizzontale. La prova riguarda le schermate iniziali, non tutte le funzioni interne.
- **Schema Bécquer:** controllo aggiuntivo della cornice dopo l'avvio; sette campioni tra 5 e 17 secondi hanno rilevato 860 px applicati e 860 px comunicati, senza stato di errore.
- Per questa ripresa sono stati eseguiti soltanto controlli sulle pagine pubbliche; non sono stati aggiornati altri post.
- Le prove non sostituiscono un collaudo su telefoni fisici né una certificazione generale di accessibilità. Nelle prove automatiche la chiamata a Schermo intero è simulata; se il browser non supporta l'API, viene mantenuto il comportamento esistente che nasconde quel pulsante.

## Impronte SHA-256

- Documento Word: `5643a49d40827b5ceff0aaf94713f0f88c22b875afdb51cd8095eac7b59e7bf1`.
- Risultati tecnici dei controlli pubblici in JSON: `38fb7f50da5a6c2a2ac366fc974c5025eee186afdf0e2ded9d4dc3d2d30c5508`.
- Il file `SHA256-CORNICI-BLOG-2026-11-07.txt` accompagna gli allegati e riporta anche l'impronta di questo rapporto.
- Copia di sicurezza dei post allegata, con snapshot più recente di Strategie di studio: `3ecd56b0e85966abd5d02f4c47edde28ad3ebadbb82286e008d43a484c3fcefb`.
- Archivio precedente, basato sul solo censimento iniziale: `1d7f778788821dc84d2751ca202d6658dd26f1b71adddd85929bd6fd64482095`. Per un eventuale ripristino preferire l'archivio allegato, dopo aver verificato le modifiche successive.

