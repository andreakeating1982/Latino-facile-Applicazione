# Latino Facile — verifica dell'anteprima mobile

**Data:** 7 novembre 2026  
**Anteprima:** https://3000-i4nq7yqdswtyddr7hb8sj.sandbox.easy-peasy.ai/  
**Produzione verificata:** 9001, https://latino-facile-app-2.easy-peasy.site/  
**Checkpoint dell'anteprima:** `de7b501e1de807fa1084be3957a2b17b40ea3394`

## Intervento

La seconda pagina ha meno spazi verticali superflui sugli schermi stretti, senza ridurre il testo. La cornice continua ad adattarsi al contenuto: l'app risponde ai ping, conferma i grandi cambiamenti di altezza ed evita misure iniziali premature. Quando il ritaglio è aperto la misurazione resta sospesa; alla chiusura riprende. Non sono state cambiate la geometria del ritaglio, `confirm()`, la palette o la generazione del PDF.

In una prova Chromium emulata a **320 px**, l'iframe della schermata di lavoro iniziale è passato da **752 a 696 px**. È una misura di uno scenario, non un limite di altezza: con risultati, traduzioni o testo ingrandito la pagina deve poter crescere per mostrare tutto il contenuto.

La versione allegata è **un'anteprima successiva alla produzione 9001**, non una pubblicazione. Gli asset pubblici della 9001 sono stati verificati rispetto alle impronte conservate del rilascio.

## Verifiche eseguite

| Controllo | Esito e ambito |
|---|---|
| Tipi, compilazione e test unitari | Completati; **131/131** test unitari superati. |
| Altezza della cornice | **8/8 scenari** Chromium e WebKit emulati: 320 px, 390 px, testo al 160% e desktop. |
| Apertura e chiusura della traduzione | **36/36 controlli** in 4 scenari: espansione, riduzione, stabilità, legenda e font anche con caricamento lento. |
| Ritaglio dopo una frase colorata | **58/58 controlli** in 6 scenari Chromium/WebKit; lock, rotazioni, chiusura e conferma. OCR e risposte IA simulati. |
| Cornice estratta dal DOCX | **16/16 scenari, 70/70 controlli**, distinguendo l'API schermo intero realmente presente da una simulazione usata solo per il layout. |
| Strumenti del pacchetto | **9/9** test; **1.017** controlli di struttura e collegamenti; **18** sorgenti incorporati nel foglio cropper con impronte valide. |
| Avvio isolato della build | **44/44** controlli, senza credenziali o database e con chiamate esterne bloccate. |
| Ricostruzione dello ZIP | **33/33 controlli** superati in una cartella indipendente: installazione, tipi, 131 test, build, avvio isolato, riesportazione e clonazione dell'identità. I 26 asset ricostruiti coincidono con la build dell'anteprima. Installazioni eseguite **offline usando la cache locale**; non è stata verificata una nuova installazione online. Il clone conserva il motore latino e non è una variante linguistica completa. |

Le prove di browser e touch sono **emulazioni**, non test su telefoni fisici. Le risposte simulate non misurano l'accuratezza generale dell'analisi grammaticale, dell'OCR o della traduzione. Nessuna certificazione WCAG/PDF-UA è implicita.

## Documento delle cornici

Il DOCX consegnato è stato ricavato dall'allegato `Cornici-dinamiche-Codice-5-Mappa-aggiornato.docx`. È stato modificato **solo il Codice 1 — LATINO FACILE**: due righe CSS mobile e il markup delle icone Schermo intero/Ricarica. L'indice, gli altri codici, il permesso microfono e la formattazione sono stati conservati. Il confronto ha individuato modifiche soltanto in `word/document.xml`.

Il post pubblico LATINO, verificato in lettura, mostrava già le icone aggiornate; in questa fase non è stata eseguita un'ulteriore pubblicazione. **Limite rilevato:** il codice preesistente nasconde il pulsante Schermo intero quando il browser non offre la relativa API; questo accade nel WebKit mobile emulato. Il primo controllo che si aspettava sempre entrambi i pulsanti si è quindi fermato. Il test è stato corretto per distinguere il supporto nativo dell'API dalla simulazione del solo layout e ha poi superato 16/16 scenari. Non è possibile affermare che entrambi i pulsanti siano sempre visibili su ogni browser mobile. La riscrittura del comportamento o la pubblicazione di un'alternativa nel post non sono state eseguite.

## Osservazioni da valutare separatamente

- Il pulsante **ENTRA** attivo usa testo bianco 14 px su `#B8846A`: rapporto calcolato **3,21:1**, inferiore al riferimento 4,5:1 per testo normale. La schermata iniziale non è stata modificata in questo intervento.
- I pulsanti della barra di accessibilità misurati nel test mobile sono alti **24 px**; un'area più ampia può facilitare il tocco. Non si deduce da questa singola misura una certificazione o una violazione complessiva.
- Il limite effettivo dell'app è **50 parole**, non le 200 comparse nelle preferenze precedenti. Non è stato cambiato in questa modifica.

## Integrità dei file

- DOCX aggiornato SHA-256: `f3723d29591d797de07dc29d30c3fae119ffc268ade4f07a9c2e87da5cc2ee4b`
- ZIP anteprima SHA-256: `74a7f487be72326804a10469a96499443643965f73001e744f08754947453808`
- Lo ZIP contiene il sorgente del checkpoint sopra indicato, non credenziali, database, dipendenze installate o build. Il rapporto tecnico allegato confronta i file con il checkpoint; la scansione di firme note non è un audit di sicurezza completo.

