# Ricostruire Latino Facile identica

Questa guida ricostruisce **il codice e le risorse comprese nel pacchetto**, non dati o segreti del sito originale. Per una nuova lingua usare [ADATTARE.md](ADATTARE.md); per trasferire senza modifiche a Render usare [RENDER.md](RENDER.md).

## 1. Cosa significa «identica»

La base pubblicata è la produzione **9010** del 07/11/2026, codice `de7b501e1de807fa1084be3957a2b17b40ea3394`; vedere [RILASCIO-9010.md](RILASCIO-9010.md). Le produzioni 9001 e 8990 sono storiche. Dalla 9001 sono pubblicati contrasto delle enclitiche e comandi foto/crop adattivi; l'editor non mostra più «Aggiungi o togli parole:…». Preservare IA preferenziale, badge, ripieghi, palette, legenda e PDF. Non ricreare a mano le schermate: usare i file forniti e la patch Wouter. Le guide possono essere successive senza alterare il runtime pubblicato.

La 9010 pubblica il messaggio di traduzione più breve, gli spazi verticali compatti nella pagina di lavoro mobile e la sincronizzazione altezza dell'iframe aggiornata. Le guide sono state aggiornate dopo il deploy; verificare sempre l'effettiva corrispondenza dei sorgenti applicativi. Le prove di layout e accessibilità devono essere ripetute nella destinazione.

La cornice LATINO effettivamente pubblicata è inclusa come [file HTML dedicato](cornice-dinamica/embed-latino-facile-blog-pubblicata-2026-11-07.html). Il [documento dei 15 codici e le evidenze dei post](docs/blog/README.md) sono un'appendice documentale: non sostituiscono il codice dell'app e non modificano il blog.

Le prestazioni e le risposte di servizi esterni non sono riproducibili con il solo ZIP. Per avere anche IA foto/colori/traduzione occorre una **propria chiave server valida**. Nessuna chiave, identità studente o database della produzione viene trasferito.

## 2. Ottenere e installare il progetto

Da ZIP: estrarre l'archivio ed entrare nella cartella che contiene direttamente `package.json`. Da GitHub: clonare la propria repository; non è richiesta la storia Git originale.

```bash
git clone URL_DELLA_PROPRIA_REPOSITORY latino-facile-app
cd latino-facile-app
# Per lo ZIP, iniziare da questo punto nella cartella estratta.
corepack enable
corepack pnpm install --frozen-lockfile --prod=false
cp .env.example .env
corepack pnpm dev
```

Node testato: **22.22.2**. pnpm: **10.4.1**, risolto da `packageManager`. Non sostituire `pnpm-lock.yaml` con un lockfile npm e non eliminare `patches/wouter@3.7.1.patch`.

Windows: usare `Copy-Item .env.example .env` al posto di `cp`. Gli script `dev/start` usano assegnazioni ambiente POSIX: per un ambiente equivalente usare WSL; per la produzione è possibile avviare direttamente `node dist/index.js` impostando prima `NODE_ENV=production` nel terminale o nella piattaforma. Lo script `smoke` gestisce l'ambiente senza sintassi shell dipendente dal sistema.

## 3. Configurare solo le funzionalità necessarie

| Funzione | Configurazione |
|---|---|
| Avvio, UI, Whitaker/regole, PDF | Nessuna credenziale o DB |
| Foto IA, colorazione e traduzione IA | `EASY_PEASY_API_KEY` sul server |
| Provider alternativo di traduzione | `DEEPL_API_KEY` se desiderato; percorso effettivo in `deepl.ts` |
| Login opzionale | `DATABASE_URL` PostgreSQL + `BETTER_AUTH_SECRET` + origini appropriate |

Dettagli e avvertenze di rete/privacy: [docs/CONFIGURAZIONE.md](docs/CONFIGURAZIONE.md). Il database **non serve all'IA**. Il fallback di traduzione può contattare MyMemory; Collatinus può integrare l'analisi. I dati lingua OCR sono inclusi, ma worker/core Tesseract usano le impostazioni predefinite del pacchetto: non dichiarare l'app completamente offline.

Dopo aver cambiato `.env`, fermare e riavviare **quel processo**. Non usare comandi che terminino altri server o app.

## 4. Verifiche senza credenziali reali

```bash
corepack pnpm package:check
python3 docs/blog/verifica-evidenze.py
corepack pnpm test:package
corepack pnpm check
corepack pnpm test:ci
corepack pnpm build
corepack pnpm smoke
```

Lo smoke test crea un proprio server di produzione con ambiente ristretto e `.env` disattivato; controlla health, rotte SPA, bundle JS, contenuto/hash degli asset pubblici, CORS font, dati OCR gzip, analisi latina reale di esempio e indisponibilità prevista delle API opzionali senza chiave/DB. Non modifica dati e non è una misura di accuratezza linguistica generale.

Avvio manuale equivalente a Render:

```bash
NODE_ENV=production PORT=3000 node dist/index.js
# In un secondo terminale:
curl --fail http://localhost:3000/_health
# Risposta esatta: OK
```

## 5. Collaudo browser aggiuntivo

Installare Chromium una volta; per ripetere anche i controlli multipiattaforma dell'anteprima installare WebKit:

```bash
corepack pnpm exec playwright install chromium webkit
# Su Linux privo delle librerie del browser può servire --with-deps.
```

Con un server raggiungibile su `http://127.0.0.1:3000`:

```bash
corepack pnpm exec tsx tests/service-colors.e2e.ts
corepack pnpm exec tsx tests/legend-colors.e2e.ts
corepack pnpm exec tsx tests/pdf-legend-spacing.e2e.ts
corepack pnpm exec tsx tests/legend-visibility.e2e.ts
node tests/crop-mobile.e2e.mjs
node tests/crop-drag.e2e.mjs
# Controlli dell'anteprima successiva alla 8990:
CROP_CONTROLS_ENGINES=chromium,webkit node tests/crop-controls.e2e.mjs
corepack pnpm exec tsx tests/enclitics-contrast.e2e.ts
ENCLITIC_QA_ENGINE=webkit corepack pnpm exec tsx tests/enclitics-contrast.e2e.ts
node tests/crop-after-result.e2e.mjs
```

È possibile usare un'altra porta per l'app impostando rispettivamente `COLOR_QA_BASE_URL`, `PDF_SPACING_QA_BASE_URL`, `CROP_QA_BASE_URL`, `CROP_DRAG_BASE_URL`, `CROP_CONTROLS_BASE_URL`, `ENCLITIC_QA_BASE_URL` e `CROP_AFTER_BASE_URL`. Il controllo di spaziatura PDF usa anche le utility Poppler `pdftotext` e `pdffonts`. Le pagine-blog di prova su `localhost:3000` vengono intercettate da Playwright: non sono il sito pubblico e non richiedono un secondo blog reale. Gli output sono in `.cache/` o nei percorsi indicati dai test.

Le API IA nei test UI sono **simulate**, il canvas è reale e il touch è emulato. Provare anche foto reali, voce del browser e strumenti assistivi per la destinazione effettiva prima di dichiarare nuove prestazioni o conformità.

## 6. Comportamenti che non devono regredire

- `/`: scheda studente; `/app`: card di input, senza nuovo header/footer o link al quaderno.
- Limite **50 parole**. Testo scritto e OCR usano lo stesso conteggio/troncamento; l'API ha separatamente un limite di 2000 caratteri.
- `shared/types.ts` è la fonte della palette di app, scelta manuale, legenda e PDF. Sconosciuti neri; enfasi del numero per declinabili; sottolineature manuali/passive preservate.
- Legenda app: nella produzione 8985 non compare all'apertura né durante l'analisi; appare quando un risultato contiene parole colorate, anche in iframe. In caso di errore di una nuova analisi torna visibile il risultato precedente. Il test `legend-visibility.e2e.ts` confronta i colori di 115 nodi col riferimento della 8802 in `tests/fixtures/legend-colors-8802.json`. **1 colonna mobile, 2 tablet, 3 desktop**, voci mai spezzate (`whitespace-nowrap`), container query per adattarsi alla larghezza reale anche nell'iframe. Il PDF resta a **2 colonne**, con testi misurati da `fitOneLine`; SINGOLARE/PLURALE restano accanto al caso alla stessa dimensione. I paragrafi sotto la griglia possono andare a capo.
- Enclitiche unite: contrasto nero/bianco nell'app; categoria propria nel PDF (`-cum` chiara, `-que/-ve/-ne` scura).
- Foto: SCATTA/CARICA, ritaglio obbligatorio, testo da IA o OCR nel campo; nessun riconoscimento che avvii l'analisi da solo.
- Cropper baseline **8731**: solo RITAGLIA LA FOTO, niente icona/istruzioni/AZZERA, quattro pulsanti centrati, scroll interno e pagina dietro ferma. Non modificare `confirm()` o la geometria.
- PDF dinamico OpenDyslexic, senza intestazione aggiunta, parole colorate senza box, traduzioni salvabili senza download automatico, numero centrato in grassetto solo se multipagina.
- Accessibilità e cornice: preservare [ACCESSIBILITA.md](ACCESSIBILITA.md), [SCROLLING-MOBILE.md](SCROLLING-MOBILE.md) e protocollo `labvisivo:height`.

La mappa completa dei file è in [AGENTS.md](AGENTS.md) e [docs/STRUTTURA.md](docs/STRUTTURA.md). Non creare un `AppFooter.tsx`, un `PDF_LINK` o limiti `MAX_CHARS` sulla base di vecchie note: non fanno parte del comportamento corrente.

## 7. Trasferire e riesportare

- GitHub → Render: [RENDER.md](RENDER.md), singolo Web Service Node, nessuna migrazione automatica.
- Export ZIP da una nuova repository con storia Git diversa: [docs/ESPORTAZIONE.md](docs/ESPORTAZIONE.md). Il validatore non richiede che il vecchio commit di produzione sia presente nella nuova storia Git.
- Copia adattata: [ADATTARE.md](ADATTARE.md). Non trascinare segreti o URL operativi della produzione originaria nella variante.

Lo ZIP non include `.git`, `.env`, `node_modules`, `dist/`, cache, log o database. Questi si ricreano/configurano solo nella destinazione. Asset storici e guide precedenti sono conservati senza essere presentati come istruzioni correnti.
