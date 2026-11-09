# Latino Facile — produzione 8990

## Identità del rilascio

- **Deploy attivo:** 8990, 7 novembre 2026, dopo anteprima condivisa e autorizzazione esplicita dell'utente.
- **Indirizzo stabile:** https://latino-facile-app-2.easy-peasy.site
- **Codice pubblicato:** `3264ad3aafabd8628f267e6fbc210c59d38aad9c`.
- Il checkpoint di export può essere successivo: guide, test e cornice esterna non rendono automaticamente identica ogni parte dello ZIP al commit del deploy. Il rapporto di export confronta separatamente `client/`, `server/` e `shared/` con il codice pubblicato.
- Il rilascio [8985](RILASCIO-8985.md) e le versioni precedenti restano storici.

## Contenuto pubblicato e cornice

- Rimossa dall'editor di traduzione la frase «Aggiungi o togli parole:…». L'app continua a preferire l'IA per traduzione e colorazione/ricolorazione; se non disponibile, i ripieghi restano distinti e non equivalgono per qualità.
- Palette, PDF, geometria e `confirm()` del cropper restano invariati. La precedente 8985 includeva legenda adattiva, maggiore spaziatura nel PDF, pulsanti coordinati e titolo del ritaglio centrato. Baseline indipendente del cropper: **8731**.
- La cornice del post pubblico LATINO è stata verificata con due icone SVG complete e `allow="microphone"`. All'apertura del browser riconnesso risultava già aggiornata: nessuna ulteriore pubblicazione Blogger è stata eseguita durante quella verifica.
- Nel pacchetto, [codice Word v4](cornice-dinamica/embed-latino-facile-blog-docx-8990.html) è la cornice corrente; contiene isolamento per istanza, `e.source`, token, `labvisivo:height`, anti-loop e anti-tremolio. Non usare la variante precedente priva di permesso microfono al posto di questa.

## Verifiche e limiti

- Prima della pubblicazione: TypeScript e build superati, **103/103 test unitari**. Dopo l'aggiornamento delle guide: 989 controlli di struttura, 9/9 test degli strumenti e **44/44 smoke** senza credenziali o database.
- Versione online: pagine, health e asset raggiungibili; JavaScript e CSS scaricati coincidono con la build locale per SHA-256. Eseguiti **45 controlli UI/cornice** a diverse larghezze con risposte API simulate; il touch è emulato.
- Codice estratto dal Word: **27 verifiche** a 320/390/1440 px, anche con sanitizzazione HTML Blogger simulata, ricarica e schermo intero. Post reale: icone visibili e contenute, iframe caricato, permesso microfono e tracciati corretti. Stile e script della cornice non sono cambiati rispetto alla precedente copia pubblica.
- Una frase sintetica con servizi reali ha restituito traduzione e colorazione IA; dopo la modifica manuale, ricolorazione `ai` HTTP 200. Questo non misura accuratezza generale, OCR su foto reali o disponibilità futura.
- Il controllo mobile è emulato, non su telefono fisico. Non è una certificazione WCAG, PDF/UA o di efficacia BES. I controlli PDF/palette/legenda del rilascio 8985 sono storici, non una nuova prova completa di 8990.
- **Rilievo non corretto:** in UI alcuni suffissi enclitici chiari contrastano poco con il colore della base; per il genitivo singolare il rapporto calcolato è 1,46:1. Vedere [ACCESSIBILITA.md](ACCESSIBILITA.md). Questo rilievo documentale non modifica il sito: la correzione richiede un intervento separato.

### Risorse principali online

| File | SHA-256 |
|---|---|
| `/assets/index-CKpDeFuo.js` | `1a2c556053df9c5a7d0eb67af3a32a67dce0cb87abee2e5d07ca5bbbaac44fd4` |
| `/assets/index-CLNJGuXa.css` | `99f173820cbffbd20398ae6dac5429adeee91886ab767410bd4766e56dea4530` |

## Portabilità

L'archivio è sorgente: non include credenziali, dati studenti, database, `.git`, dipendenze installate o build e non pubblica automaticamente su GitHub o Render. Per ricostruzione e adattamento leggere [REBUILD.md](REBUILD.md), [ADATTARE.md](ADATTARE.md), [RENDER.md](RENDER.md) e [docs/ESPORTAZIONE.md](docs/ESPORTAZIONE.md). Il DOCX dell'utente non è incluso nello ZIP: è consegnato separatamente.

