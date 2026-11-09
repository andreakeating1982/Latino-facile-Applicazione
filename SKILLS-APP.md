# Skill pertinenti a Latino Facile

Aggiornamento documentale: 7 novembre 2026 (pacchetto 8990). Le skill sono state riordinate in
famiglie; per questa applicazione i due ingressi pertinenti sono i seguenti.

| Skill | Quando usarla | Guide autosufficienti incluse nella repository |
|---|---|---|
| **didattica-app-lingue** | Manutenzione di Latino Facile: UI, analisi, traduzione, colori, enclitiche, PDF, foto/OCR, ritaglio mobile e accessibilità | [AGENTS.md](AGENTS.md), [REBUILD.md](REBUILD.md), [ADATTARE.md](ADATTARE.md), [COLORI-PAROLE-SERVIZIO.md](COLORI-PAROLE-SERVIZIO.md), [OCR-FOTO.md](OCR-FOTO.md), [SCROLLING-MOBILE.md](SCROLLING-MOBILE.md), [PHOTO-CROP-CLONABILE.md](PHOTO-CROP-CLONABILE.md), [ACCESSIBILITA.md](ACCESSIBILITA.md) |
| **didattica-pubblicazione-blog** | ZIP ricostruibile, GitHub/Render, checkpoint, preview/produzione, cornice Blogger e presentazione dell'app sul blog | [README.md](README.md), [RENDER.md](RENDER.md), [manifest.json](manifest.json), [cornice-dinamica/README.md](cornice-dinamica/README.md) |

## Uso e installazione

Le due skill installabili vengono consegnate separatamente dallo ZIP dell'app.
Per installarle usare Aggiungi/Add sulle relative schede in chat. Lo ZIP contiene
invece il progetto completo e queste guide, utilizzabili anche da un agente
senza le skill installate. Non è necessario aggiungere tutte le altre famiglie.
La vecchia skill latino-facile è assorbita da didattica-app-lingue: non attivare
entrambi gli ingressi per la stessa attività.

Il **quaderno statico storico** è distinto dal PDF delle frasi generato dall'app:
solo per lavorare su quel quaderno usare didattica-documenti-accessibili.
Non reintrodurre pulsanti o link al quaderno nell'app senza richiesta esplicita.

## Versioni comprese nel pacchetto

- Runtime dell'app: produzione **8990**, codice pubblicato
  `3264ad3aafabd8628f267e6fbc210c59d38aad9c`; avviso dell'editor rimosso,
  IA preferenziale e legenda PDF preservate. La guida corrente è
  [RILASCIO-8990.md](RILASCIO-8990.md); [8985](RILASCIO-8985.md) è storica.
- Palette: avverbi `#0057D9`, preposizioni `#BDBDBD`, congiunzioni `#4A4A4A`;
  motore, legenda, palette manuale e PDF allineati. Dettagli e limiti in
  [COLORI-PAROLE-SERVIZIO.md](COLORI-PAROLE-SERVIZIO.md).
- Cropper: baseline autonoma **8731**, invariata anche nel rilascio 8990. Il foglio
  clonabile contiene 18 sorgenti con hash: non sostituire il numero della
  baseline per farlo coincidere con il rilascio dell'app.
- Il pacchetto include configurazione Node/Render/CI/Docker e strumenti autonomi in `scripts/`: l'esportazione non carica nulla su GitHub né modifica dati. Istruzioni: [docs/ESPORTAZIONE.md](docs/ESPORTAZIONE.md) e [docs/portabilita/RIORDINO.md](docs/portabilita/RIORDINO.md).

Le note storiche nelle guide non prevalgono su codice e indicazioni correnti.
I risultati linguistici, OCR e BES non sono nuovamente certificati da un export.
Mai includere credenziali o database reali; prima di una nuova produzione
condividere la preview e ottenere una conferma esplicita in un nuovo messaggio.
