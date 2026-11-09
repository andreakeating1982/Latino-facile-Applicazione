# Latino Facile — produzione 9001 e anteprima successiva

> **Documento storico:** l'anteprima successiva qui descritta è stata pubblicata nella [produzione 9010](RILASCIO-9010.md). I paragrafi seguenti fotografano lo stato prima di quel deploy.

## Produzione verificata

- **Versione:** 9001, 7 novembre 2026.
- **Codice applicativo pubblicato:** `154c36269efbda726cbbf2667dbf265e9d4106fc`.
- **Indirizzo:** https://latino-facile-app-2.easy-peasy.site
- **Riscontro del 7 novembre:** pagina pubblica raggiungibile; gli asset pubblici coincidono per SHA-256 con quelli conservati per la 9001:
  - `/assets/index-D3XG87l8.js`: `df308e7193a9463b2766fa89c9684841c94870d69f0b1f26b4e6bd43e86119c0`;
  - `/assets/index-7jfEMYXn.css`: `5b1cde254fd25f212ce9466bbd30dd72f42a0df0a4f5f878333c1ecdc766529e`.

La 9001 ha pubblicato le migliorie di contrasto delle enclitiche, lo scorrimento locale delle parole troppo lunghe e l'adattamento dei comandi foto/ritaglio ai caratteri ingranditi. La palette della legenda e il comportamento delle enclitiche nel PDF sono rimasti invariati. Il ritaglio conserva la logica della baseline 8731.

Prima del rilascio sono stati registrati 131 test unitari superati, 33 controlli di ricostruzione e 38 scenari di ritaglio emulati. In seguito sono stati verificati sito e asset e una singola frase sintetica ha prodotto colorazione e traduzione IA. Si tratta di verifiche circoscritte: non dimostrano accuratezza linguistica o OCR generale, certificazione di accessibilità né comportamento su telefoni fisici.

## Stato della sorgente successiva

Questo repository contiene anche modifiche **in anteprima, non pubblicate** dopo la 9001: il messaggio «Traduzione aggiornata», la maggiore compattezza verticale della pagina di lavoro su cellulare e la sincronizzazione dell'altezza nella cornice quando il contenuto cambia. Le prove della versione corrente vanno eseguite nuovamente prima di un eventuale deploy. Uno ZIP della sorgente corrente non va presentato come copia identica della produzione 9001.

La cornice del post mantiene icone ed etichette per i due comandi nei browser che supportano lo schermo intero. Il codice preesistente **nasconde il comando Schermo intero** quando l'API del browser non è disponibile; nei test WebKit mobile emulati è stata rilevata questa limitazione. Nessuna prova emulata sostituisce un test su iPhone fisico.

Il limite attuale dell'app è **50 parole**. Il limite API di 2000 caratteri è un controllo distinto. Le produzioni [8990](RILASCIO-8990.md), [8985](RILASCIO-8985.md), [8980](RILASCIO-8980.md) e [8802](RILASCIO-8802.md) rimangono documentazione storica. Un'esportazione, un checkpoint o la sola condivisione di un'anteprima non pubblicano una modifica.

