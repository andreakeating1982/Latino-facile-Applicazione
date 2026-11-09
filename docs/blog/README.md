# Cornici del blog — documenti ed evidenze

Questa cartella conserva le risorse di documentazione richieste insieme allo ZIP di **Latino Facile**. I codici per altre app e le fotografie dei controlli sono riferimenti del blog dell'utente, **non** sorgenti o certificazioni della presente app.

## Quale file usare per Latino Facile

- **Cornice del post LATINO:** [embed-latino-facile-blog-pubblicata-2026-11-07.html](../../cornice-dinamica/embed-latino-facile-blog-pubblicata-2026-11-07.html). Il blocco è identico byte per byte a quello rilevato nel feed pubblico il **7 novembre 2026, 13:54 CET**. È anche il Codice 1 del Word allegato.
- [Post LATINO](https://blogdelprofessoreandreacentinaro.blogspot.com/2026/08/latino.html) · [Blog](https://blogdelprofessoreandreacentinaro.blogspot.com/) · app all'indirizzo `https://latino-facile-app-2.easy-peasy.site/`.
- La precedente copia [embed-latino-facile-blog-docx-8990.html](../../cornice-dinamica/embed-latino-facile-blog-docx-8990.html) ha lo stesso contenuto e un solo a-capo finale in più. Le altre versioni nella cartella della cornice sono varianti, non il blocco esatto del post.
- Il blocco include il permesso `microphone`, il titolo e i due pulsanti con icone SVG, il token per istanza, il filtro del proprio iframe e le protezioni di altezza. Per il comportamento e i suoi limiti consultare [la guida della cornice](../../cornice-dinamica/README.md).

**Non sostituire automaticamente contenuti del blog.** Una copia locale o un deploy dell'app non aggiornano Blogger. Se l'app viene spostata, aggiornare `APP_URL` **e gli URL dei font** nella cornice della destinazione; mantenere protocollo e permessi, verificare prima la nuova origine e pubblicare soltanto con autorizzazione.

## Cosa è incluso

| Risorsa | Contenuto |
|---|---|
| [Documento Word aggiornato](CODICI-CORNICI-BLOG-AGGIORNATI-2026-11-07.docx) | 15 codici, indice aggiornato; codice 1 dedicato a Latino Facile. |
| `codici-docx/` | I 15 blocchi HTML estratti esattamente dal Word, numerati come nel documento. Gli altri 14 possono puntare ad **altre app**. |
| `cornici-post/` | I 13 blocchi preparati per i 9 post autorizzati. Sono campioni di riferimento delle rispettive app, non cornici di Latino Facile. |
| [Rapporto conclusivo](RAPPORTO-CORNICI-BLOG-2026-11-07.md) | Modifiche, esclusioni e limiti dei controlli sul blog. |
| [Verifica pubblica dei 9 post](VERIFICA-PUBBLICA-CORNICI-2026-11-07.json) | Riscontri tecnici dei feed e della prova iniziale in contenitori larghi 320 px. |
| [Verifica della cornice Latino](VERIFICA-CORNICE-LATINO-PUBBLICA-2026-11-07.json) | Confronto esatto con il feed pubblico, URL, icone e permesso microfono. |
| [Prove simulate](VERIFICA-SIMULATA-CORNICI-2026-11-07.json), [cornici affiancate](VERIFICA-CORNICI-AFFIANCATE-2026-11-07.json) e [ping lento](VERIFICA-PING-LENTO-2026-11-07.json) | Risultati tecnici precedenti alla verifica pubblica, in Chromium/WebKit emulati. |
| [Rapporto storico anteprima mobile](../portabilita/RAPPORTO-ANTEPRIMA-MOBILE-2026-11-07.md) | 58 controlli crop e altri test dell'anteprima: descrive il momento **prima del deploy 9010**, non lo stato attuale. |
| [Indice con hash](indice.json) | Elenco relativo di file, post, applicazioni e SHA-256 delle risorse. |

Il 7 novembre 2026 sono state verificate le **13 cornici dei 9 post autorizzati**, confrontando HTML, CSS e JavaScript interpretati dei feed pubblici con i rispettivi candidati. Le schermate iniziali delle app sono state caricate in Chrome desktop dentro contenitori da 320 px: è una prova emulata, non su telefoni fisici e non di tutte le funzioni interne. Nel precedente intervento il post LATINO, le cornici PDF e i video sono stati esclusi dalle modifiche.

Il backup precedente alla modifica dei 9 post è **consegnato separatamente**: contiene i corpi dei post ed è opportuno conservarlo privatamente, invece di caricarlo automaticamente su GitHub. Il rapporto storico lo chiama «backup allegato» perché era stato consegnato insieme al rapporto; non è annidato nello ZIP sorgente.

## Controllo offline delle risorse

Dalla cartella che contiene `package.json`, con Python 3.10 o successivo:

```bash
python3 docs/blog/verifica-evidenze.py
```

Il controllo legge solo i file locali: verifica gli hash nell'indice, i 15 blocchi HTML confrontandoli con il contenuto del Word, i 13 blocchi dei post e le evidenze pubbliche e simulate registrate. Nella app originale controlla anche la cornice LATINO principale; in un clone la cornice attiva può essere stata adattata e viene esclusa dal confronto con l'hash storico. Il test non contatta il blog e non certifica che un sito non sia cambiato dopo la data indicata.

## Varianti e privacy

In una variante creata con il cloner, `cornice-dinamica/` può essere adattata a un nuovo dominio, mentre i documenti e i codici qui restano fotografie della **sorgente originale**. Non inserirli automaticamente nel nuovo blog, non trattarli come verifica del clone e non modificare i vecchi post per effetto dell'export. Queste risorse non contengono chiavi o database; la scansione automatica non sostituisce una revisione di sicurezza.

