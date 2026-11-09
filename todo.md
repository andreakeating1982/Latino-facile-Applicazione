# Latino Facile — riordino ZIP esportabile (29/10/2026)

Il registro precedente è conservato in `docs/storico/pre-riordino-2026-10-29/todo.md.txt`.

## Audit e riordino
- [x] Inventariare sorgenti/asset e individuare incongruenze di documentazione, Docker, CI e ambiente.
- [x] Conservare le guide precedenti senza usarle come istruzioni operative.
- [x] Consolidare README, AGENTS, REBUILD, ADATTARE, RENDER e OCR sul codice reale.
- [x] Aggiungere mappa del repository, configurazione, strumenti di clone/export e verifiche portabili.
- [x] Allineare Node/pnpm, Blueprint, CI, Dockerfile e protezioni sui segreti senza cambiare UI/motore/cropper.
- [x] Verifiche preliminari: 9 test di sicurezza del packaging/clone, 43 check smoke e schema JSON ufficiale Render superati.

## Collaudo
- [x] Estrarre un candidato in una cartella isolata, senza .env o database reali.
- [x] Eseguire installazione frozen con store indipendente, typecheck, 84/84 test, build e 43 check smoke produzione.
- [x] Verificare il runtime con le sole dipendenze di produzione, senza Vite/tsx.
- [x] Provare clone, rifiuto di overwrite, GitHub-ready e nuova esportazione da storia Git indipendente.
- [x] Eseguire 4 suite browser: 424 controlli, 9 scenari crop e 4 drag; verificare 7 PDF con font incorporati e contorno isolato.
- [x] Controllare Blueprint con schema ufficiale, collegamenti, CRC, hash e assenza di file privati; rifiutare 6 archivi alterati.

## Consegna
- [x] Preparare la consegna definitiva da checkpoint pulito con ZIP, rapporto e checksum; identificativi finali nel rapporto esterno.
- [x] Dichiarare limiti nel rapporto: nessun nuovo deploy, nessuna nuova certificazione grammaticale/OCR/BES; nessun Docker build/run eseguito.

Esiti e metodo: [docs/portabilita/VERIFICHE-2026-10-29.md](docs/portabilita/VERIFICHE-2026-10-29.md).

## Legenda e rilascio — 31/10/2026
- [x] Legenda app approvata: etichette su una riga, griglia responsive 1/2/3 colonne.
- [x] Legenda PDF con larghezze misurate sul font; 85/85 test superati.
- [x] Tentativo produzione 8801: fallito in avvio del container; la versione pubblica precedente risponde ancora HTTP 200.
- [x] Ripristinare il solo Dockerfile rimosso dallo strumento e non escludere dist/ dal contesto Cloud Run (build locale presente ma esclusa dalla vecchia .dockerignore).
- [x] Verificare build e avvio su PORT=8080 (health e /app HTTP 200), 43/43 smoke test e sorgenti della legenda identici al checkpoint approvato.
- [x] Condividere nuova anteprima della configurazione corretta.
- [x] Ricevuta nuova conferma esplicita; produzione 8802 pubblicata e attiva su https://latino-facile-app-2.easy-peasy.site (checkpoint codice c9b23f5).
- [x] Health pubblico HTTP 200; JS e CSS pubblici identici byte per byte alla build approvata, incluso il generatore PDF. Pagina /app aperta in Chrome dell’utente: legenda aggiornata visibile.
- [x] Dockerfile locale ripristinato dal checkpoint dopo la rimozione automatica dello strumento di deploy; nessuna modifica al suo contenuto.
- [x] Il controllo DOM aggiuntivo in Chrome non ha restituito risultati affidabili (timeout dell’estensione): non dichiarare una nuova misurazione mobile post-deploy. Restano validi i test precedenti sulle stesse risorse, ora verificate per hash online.


## Aggiornamento pacchetto alla produzione 8802 — 31/10/2026
- [x] Verificare checkout pulito e uguaglianza dei sorgenti/configurazione con il commit pubblicato c9b23f5.
- [x] Riconfermare SHA-256 di JavaScript e CSS della produzione 8802.
- [x] Aggiornare README, AGENTS, REBUILD, ADATTARE, RENDER, ACCESSIBILITA, manifest e guida RILASCIO-8802; preservare baseline crop 8731 e tutti i sorgenti applicativi.
- [x] Eseguire struttura (245 file, 120 link, 885 controlli), 9/9 test strumenti, typecheck, 85/85 test unitari, build e 43/43 smoke.
- [x] Candidato esportato da HEAD pulito (9f2399f): CRC/hash/assenza di file privati verificati; finale con soli aggiornamenti documentali e nuova verifica integrale di archivio.
- [x] Ricostruzione dalla copia estratta senza .env o credenziali reali: 85/85 test, build JS/CSS identica alla 8802 pubblicata, 43/43 smoke anche con sole dipendenze runtime; clone installato/compilato/avviato e riesportazione da storia Git indipendente riusciti.
- [x] Predisporre il pacchetto di consegna ZIP 8802, riepilogo verifiche, rapporto tecnico e checksum; risultati in docs/portabilita/VERIFICHE-8802-2026-10-31.md. Nessun nuovo deploy o upload a GitHub autorizzato o necessario.


## Anteprima: legenda dopo il risultato e colori coordinati al blog — 06/11/2026
- [x] Esaminare il blog, Lingue Facili, la cornice e lo stato attuale di Latino Facile.
- [x] Nascondere la legenda all'apertura e durante le analisi; mostrarla soltanto con frasi colorate disponibili.
- [x] Armonizzare i soli colori dell'interfaccia con le altre app, senza cambiare la legenda o i colori grammaticali e PDF.
- [x] Verificare prima/durante/dopo/errore e secondo tentativo: 115 nodi della legenda confrontati con la 8802, 320/390/768/1100 px senza overflow né sovrapposizioni; iframe mobile con altezza dinamica; test colori/PDF desktop e mobile con API simulate, TypeScript, 85/85 test, build e 43/43 smoke.
- [x] Screenshot check: nessun problema visivo nella seconda pagina desktop; controlli già esistenti della barra accessibilità piccoli su mobile e contrasto del pulsante ENTRA nella prima pagina non modificati.
- [x] Preparare checkpoint e anteprima. Non pubblicare in produzione senza consenso successivo.


## Pubblicazione — 06/11/2026
- [x] Ricevuta conferma esplicita successiva all'anteprima; deploy **8980** attivo su https://latino-facile-app-2.easy-peasy.site, codice `23d36ab42d28d825180283c77f1640204dca33a2`.
- [x] Health, home e /app HTTP 200; JS/CSS pubblici identici alla build locale. 19/19 controlli visibilità e 12/12 controlli colori/PDF sul pubblico con API simulate; PDF A4 generato e testo della legenda estratto. Mobile e iframe emulati, nessun telefono fisico.
- [x] Dockerfile eliminato dallo strumento ripristinato esclusivamente dal checkpoint approvato, senza modifiche. Nessun nuovo ZIP, upload GitHub o deploy Render.
- [x] Registrare stato corrente e limiti in [RILASCIO-8980.md](RILASCIO-8980.md), mantenendo storico il rilascio e lo ZIP 8802.


## Anteprima successiva alla 8980 — ritaglio, barra, pulsanti e IA
- [x] Esaminare le due foto e verificare la causa del ripiego IA: il servizio dei template restituisce `{id,text}`, mentre il client leggeva `{id,name}` nonostante HTTP 200.
- [x] Centrare il solo titolo del ritaglio su desktop e mobile con CSS locale; `CropDialog.tsx`, `confirm()`, cropBox, scroll e foglio clonabile della baseline 8731 rimangono identici.
- [x] Rendere bianco il fondo attorno alla barra di accessibilità soltanto nella seconda pagina; conservare il colore della barra e della prima pagina.
- [x] Uniformare il pulsante MOSTRA/NASCONDI TRADUZIONE ad altezza, larghezza, imbottitura e stile degli altri pulsanti di azione; mantenere leggibile anche il comando SALVA PDF al massimo ingrandimento su mobile.
- [x] Supportare la risposta IA corrente e quella precedente; in caso di risposta anomala/servizio non disponibile tentare la chat IA, poi conservare ripiego e badge veritieri.
- [x] Evitare fuoriuscite della legenda e di MODIFICA TRADUZIONE al 160% su telefoni stretti: colori invariati, testi su una riga e campioni allineati; su schermi piccoli le diciture più lunghe si ridimensionano per rimanere visibili.
- [x] Verifiche finali: 100/100 test applicazione, 9/9 strumenti esportazione, build e 43 controlli di avvio isolato; 44 controlli UI, 28 legenda, 12 colori/PDF, 9 scenari crop e 4 trascinamenti. Interfaccia/PDF con API simulate, mouse/touch e iframe emulati; IA reale provata su una frase nella UI e tre nel servizio, senza dedurre accuratezza generale.
- [x] Salvare il checkpoint `dd11ecc` e predisporre l'anteprima verificata: https://3000-i4nq7yqdswtyddr7hb8sj.sandbox.easy-peasy.ai/ (HTTP 200, prima pagina e /app visualizzate). Nessun nuovo deploy in produzione.

**Limiti del collaudo:** la legenda su telefoni stretti mantiene le righe intere adattandone la dimensione; alcune descrizioni restano piccole. Il controllo automatico segnala inoltre il contrasto di ENTRA (3,2:1) e comandi della barra inferiori a 40 px: sono elementi preesistenti, non modificati in questo intervento. Il PDF di prova ha OpenDyslexic incorporato ma non è taggato; nessuna certificazione PDF/UA. Nessuna prova su dispositivo fisico.

## Anteprima — spaziatura della legenda PDF
- [x] Esaminare lo screenshot dell'utente e il PDF campione precedente.
- [x] Aumentare solo la distanza verticale tra scritte e gruppi della legenda PDF, preservando font, colori, due colonne e paginazione sicura.
- [x] Test: 103/103 unitari, TypeScript, build e 43 smoke; 18 controlli PDF con download reale da browser desktop/mobile emulati e traduzioni multipagina, 72 controlli palette su due scenari. API simulate, nessun dispositivo fisico o dati reali.
- [x] Confronto indipendente con Poppler: testi identici, 12 spaziature maggiori; operatori PDF confrontati: 78 colori, 55 dimensioni font, 55 segmenti testo e 21 spessori invariati. Riquadri correttamente allineati, OpenDyslexic incorporato; PDF di prova non taggato.
- [x] Checkpoint della modifica `960fb94`; anteprima https://3000-i4nq7yqdswtyddr7hb8sj.sandbox.easy-peasy.ai/ aperta e verificata: 18 controlli PDF superati anche sull'URL condiviso. Nessuna pubblicazione in produzione; richiedere una nuova conferma.


## Produzione 8985 e pacchetto ZIP — 06/11/2026
- [x] Conferma esplicita ricevuta dopo anteprima; checkpoint applicativo `abc1748`; pubblicazione 8985 su https://latino-facile-app-2.easy-peasy.site.
- [x] 103/103 test e build prima del deploy; health/home/app HTTP 200, JS/CSS/font/OCR online identici ai file locali. Dockerfile ripristinato identico dal checkpoint dopo la rimozione automatica del deploy.
- [x] Pubblico: 18 verifiche PDF con download desktop/mobile, PDF breve e multipagina; 72 controlli palette, 28 legenda, 44 UI e 4 scenari drag; risposte simulate e dispositivi emulati.
- [x] Una frase sintetica con servizi reali: analisi iniziale `regole`, traduzione `ai` e ricolorazione finale `ai`; badge finali IA visibili. Non è una misura di accuratezza generale o disponibilità futura.
- [x] Aggiornare le guide alla 8985 senza modificare il codice applicativo, l'embed o la baseline crop 8731.
- [x] Esportare il candidato da checkpoint pulito e verificarne CRC, hash, documentazione, sorgenti e assenza di dati privati; 259 file, confronto col commit applicativo pubblicato 8985 superato.
- [x] Ricostruire dalla copia estratta: 103/103 test applicativi, 9/9 strumenti, typecheck e build; 43/43 smoke completi e 43/43 con sole dipendenze di produzione. JS/CSS identici al sito pubblico.
- [x] Riesportazione con storia Git indipendente: 259 file identici. Copia clonata: typecheck, build e 43/43 smoke; il motore rimane latino. Installazione offline con cache preesistente; nessuna credenziale o database reali.
- [x] Documentare la ricostruzione in `docs/portabilita/VERIFICHE-8985-2026-11-06.md`; consegnare il pacchetto finale dopo confronto byte per byte, verifica CRC e calcolo SHA-256 esterno.

## Anteprima — testo della traduzione e icone della cornice
- [x] Esaminare le due foto e individuare il messaggio nell'editor della traduzione.
- [x] Verificare il codice pubblico del post Latino: la cornice v4 anti-tremolio contiene percorsi SVG annidati dal parser di Blogger; non sostituirla con la precedente v3.
- [x] Eliminare soltanto il paragrafo richiesto, conservando la modifica della traduzione, la ricolorazione IA preferenziale e i ripieghi.
- [x] Preparare la cornice v4 del blog con i due soli tracciati corretti e un'anteprima che punti all'app locale; correggere anche la copia v3 e la sua fixture senza alterarne il protocollo.
- [x] Verificare desktop/mobile/iframe, editor, salvataggio e pulsanti: 45 controlli a 320/390/768/1440 px con API simulate; screenshot, sanitizzazione SVG, due cornici indipendenti e touch emulato.
- [x] Typecheck, build, 103/103 unitari, package check; nessuna modifica a IA, PDF, colori, cropper o protocollo altezza. Su una frase sintetica reale: traduzione e colorazione `ai`, e dopo modifica della traduzione ricolorazione `ai` HTTP 200. Una frase non dimostra accuratezza generale o disponibilità futura.
- [x] Salvato checkpoint e resa disponibile l'anteprima con cornice dedicata; l'app in produzione e il post Blogger non sono stati modificati. Pubblicare e aggiornare il blog solo dopo autorizzazione esplicita successiva.

## Produzione 8990 e documento cornici — 07/11/2026
- [x] Pubblicata dopo conferma l'app Latino Facile, produzione **8990**, su https://latino-facile-app-2.easy-peasy.site, checkpoint applicativo `3264ad3`; ripristinato il Dockerfile identico al checkpoint dopo il deploy.
- [x] Verificati endpoint e asset online, 45 controlli UI/cornice con dati sintetici e risposte simulate; una prova reale con traduzione, colorazione e ricolorazione IA HTTP 200. Nessuna conclusione su accuratezza generale o disponibilità futura del servizio.
- [x] Aggiornato il solo Codice 1 del documento DOCX fornito: quattro paragrafi modificati per le due icone; preservati altri codici, formattazione Consolas 7, iframe `allow="microphone"` e parti non interessate. Il codice estratto è stato verificato a 320/390/1440 px, anche con simulazione della riscrittura HTML Blogger.
- [x] Post LATINO pubblico verificato dopo riconnessione: già presenti le icone corrette e il permesso microfono; stile e script invariati rispetto alla copia precedente. Nessuna ulteriore pubblicazione da parte dell'agente.
- [x] Skill personali Latino, app lingue e pubblicazione aggiornate e validate sulla produzione 8990.
- [x] Guide e manifest allineati alla 8990; superati 989 controlli di struttura, 9/9 test degli strumenti, typecheck, 103/103 unitari, build e 44 smoke isolati. I sorgenti applicativi sono identici al commit pubblicato.
- [x] Guida accessibilità aggiornata alla cornice v4 con microfono; chiariti i limiti di `postMessage` e marcate le note storiche dei rilasci precedenti.
- [x] Documentato il contrasto insufficiente di alcune enclitiche nella 8990 (esempio calcolato 1,46:1); la correzione del codice è separata e non è stata eseguita.
- Per una specifica consegna ZIP, consultare il rapporto esterno di integrità e ricostruzione; non considerare automaticamente ricostruito un archivio solo perché questa nota è presente.

## Anteprima — contrasto enclitiche e comandi crop mobile
- [x] Individuare il difetto di contrasto e verificare le invarianti del ritaglio, della legenda e del PDF.
- [x] Rendere leggibili e distinguibili i suffissi su tutti i colori, senza cambiare la palette né la resa PDF.
- [x] Misurare i quattro comandi del ritaglio su mobile e iframe, inclusi testo al 160% e orientamento orizzontale: corrette le fuoriuscite riprodotte con caratteri ingranditi, senza modificare il componente o la geometria del cropper.
- [x] Parole con enclitica lunghe: conservare parola intera e font ingrandito, con scorrimento locale; 807 controlli Chromium e 807 WebKit su 7 scenari ciascuno, risposte simulate.
- [x] SCATTA/CARICA e i quattro comandi crop: 38 scenari, 912 controlli Chromium/WebKit, compresa la simulazione del fallback e titoli separati dalla X in cornici strette.
- [x] Verificare iframe stabile dopo la colorazione e mantenere il lock crop: 6 scenari e 58 controlli con risposte simulate; heightSync e geometria invariati.
- [x] Ripetere test dei PDF, colori e gesti con dati sintetici; touch e browser emulati non equivalgono a dispositivi fisici o a OCR reale.
- [x] Aggiornare il foglio clonabile e verificare le impronte dei 18 sorgenti, preservando confirm() e cropBox.
- [x] Mini-kit in fixture indipendente: sorgenti corrispondenti al foglio, typecheck/build, 6 scenari portabili; 14 scenari e 112 controlli aggiuntivi con font alternativo e ripiego CSS simulato.
- [x] Salvare il checkpoint e ricostruire il pacchetto ZIP da checkout pulito: 33/33 controlli della ricostruzione, senza chiavi o database reali.
- [x] Condividere e controllare l’anteprima, senza pubblicare in produzione.

## Anteprima — seconda pagina più compatta su cellulare
- [x] Misurare la seconda pagina nella cornice dinamica, prima e dopo la colorazione, su mobile e desktop.
- [x] Ridurre gli spazi verticali superflui su mobile senza ridurre il testo; eliminare l'altezza minima del viewport sommata alla barra.
- [x] Aggiornare heightSync mantenendo token, ping e blocco durante il crop; confermare i grandi salti e attendere la prima misura stabile.
- [x] Typecheck, build e 131/131 test unitari; 8/8 scenari altezza Chromium/WebKit, 36/36 controlli transizioni e 58/58 controlli crop dopo risultato, con IA/OCR simulati. Strumenti pacchetto 9/9 e avvio isolato 44/44.
- [x] Verificare legenda e font ingranditi in iframe; distinguere test emulati da prove su telefoni fisici.
- [x] Confrontare il DOCX corretto con l'allegato: solo Codice 1, due righe CSS e markup delle due icone, formato invariato. La cornice nasconde Schermo intero dove il browser non supporta l'API (WebKit mobile emulato).
- [x] Aggiornare manifest, guide e foglio crop clonabile distinguendo la produzione 9001 dall'anteprima successiva; validare i 18 sorgenti incorporati e le skill personali.
- [x] Salvare checkpoint e creare l'anteprima, condivisa senza pubblicare in produzione.
- Rilievi separati e preesistenti: ENTRA attivo ha contrasto calcolato circa 3,21:1 (testo 14px); i pulsanti della barra accessibilità sono alti 24px. Non sono stati cambiati per un intervento circoscritto sugli spazi della seconda pagina.

## Pubblicazione 9010 — 7 novembre 2026
- [x] Ricevere esplicita conferma dopo l'anteprima condivisa e confermare il checkpoint `de7b501`.
- [x] Pubblicare la stessa versione sul servizio esistente senza modificare il post Blogger.
- [x] Controllare sito, health, asset pubblici SHA-256 identici alla build approvata e layout iniziale della cornice in larghezze 320/390 nel browser.
- [x] Ripristinare il solo Dockerfile rimosso dal deploy, identico al checkpoint.
- [x] Registrare limiti, commit e verifiche in `RILASCIO-9010.md`.

