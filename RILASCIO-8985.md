# Latino Facile — produzione 8985

> **Archivio storico:** alla verifica del 07/11/2026 la produzione corrente è la [8990](RILASCIO-8990.md). I risultati sotto si riferiscono alla 8985.

## Identità del rilascio

- **Deploy attivo:** 8985, 6 novembre 2026, dopo anteprima condivisa e autorizzazione esplicita successiva dell'utente.
- **Indirizzo stabile:** https://latino-facile-app-2.easy-peasy.site
- **Commit del codice pubblicato:** `abc1748a8650bf820ac62e2271e340ff0361ce7f`.
- Le guide e i metadati del pacchetto possono essere committati dopo il deploy; questo non cambia il codice applicativo pubblicato. Il rapporto di esportazione confronta i sorgenti applicativi del pacchetto con il commit indicato.
- I precedenti [8980](RILASCIO-8980.md) e [8802](RILASCIO-8802.md), con il vecchio ZIP 8802, sono storici; dopo la 8985 è stata pubblicata la [8990](RILASCIO-8990.md).

## Contenuto pubblicato

- Nel PDF la legenda a due colonne ha maggiore spazio tra singolare, plurale, spiegazioni e gruppi. Il calcolo della paginazione comprende le nuove altezze: legenda e note vengono spostate per intero quando non c'è spazio. Testi, colori, campioni e font rimangono invariati.
- Sono comprese anche le correzioni approvate dopo la 8980: titolo del ritaglio centrato, sfondo esterno della barra uniforme sulla seconda pagina, tre pulsanti di azione coordinati e legenda adattiva anche a font ingrandito. Le scritte molto lunghe possono ridursi sugli schermi stretti.
- Il client del servizio IA gestisce risposte `{id,text}` e `{id,name}` e conserva i ripieghi quando il servizio non risponde. La disponibilità e l'accuratezza dell'IA non sono garantite da un singolo test.
- Cropper: baseline autonoma **8731**. Le funzioni `confirm()` e la geometria del riquadro restano invariate; la centratura del titolo è una regola CSS aggiuntiva, documentata nel foglio di riuso. La cornice Blogger e il suo URL stabile non sono stati cambiati.

## Verifiche effettuate

- Prima del deploy: TypeScript, build e **103/103 test unitari** superati. Il codice approvato ha superato anche i 43 controlli di avvio isolato, senza database o chiavi reali.
- Sito pubblico: `/_health`, `/` e `/app` hanno risposto HTTP 200. JavaScript, CSS, font PDF e modello OCR effettivamente serviti sono identici ai file verificati localmente; il gzip OCR è integro.
- PDF pubblico: **18/18 controlli** con download dal pulsante su desktop e telefono emulati, incluse traduzioni e un PDF multipagina. Legenda e note sono presenti nell'ultima pagina; verifica visiva di PDF breve e multipagina. I dati analizzati in questa prova sono sintetici e le risposte API simulate.
- Ulteriori test pubblici con risposte simulate: **72** controlli di palette in due scenari, **28** sulla legenda e **44** sull'interfaccia. Quattro scenari di trascinamento: due touch, iframe touch e mouse desktop, tutti superati.
- Prova reale limitata, senza dati personali: per «Puella rosam rubram videt.» l'analisi iniziale ha restituito `colorSource: regole`; la risposta di traduzione ha restituito `source: ai` e `colorSource: ai`, e l'interfaccia ha mostrato i badge «Colorata con IA» e «Tradotta con IA». Una singola frase non misura la qualità o la disponibilità futura del servizio.
- Il deploy ha rimosso il Dockerfile locale: ripristinato dal commit pubblicato e confrontato byte per byte, senza modifiche al contenuto.

### Risorse principali pubblicate

| File | SHA-256 |
|---|---|
| `/assets/index-9siTAvk3.js` | `5478d953255b5c91aeb6d691f8a1a86a1744e2fd3097cbcef3f3b32d17fa080a` |
| `/assets/index-CPkaASke.css` | `ac41600b15a5ff6e5a13a6877ab3e1b8e50878d9cc814452da5ea96fb2100015` |
| `/fonts/OpenDyslexic-Regular.ttf` | `9e397e67a856cbe4caa5ff5ae8670a1ffe3d67d2591d69a1162556f01bb5ac6b` |
| `/fonts/OpenDyslexic-Bold.ttf` | `ffdbc5e2e454f6d9e1d0fc581995ef23f608cc5a2c92dc9ecae3d723547cedc7` |
| `/tessdata/lat.traineddata.gz` | `986f5e036db0b0fb3493c29b425b0fea1a6bb12138562f4e05600ddecac3652a` |

## Limiti e portabilità

Le prove mobile usano Chromium e touch emulato, non un telefono fisico. I PDF di prova incorporano OpenDyslexic ma non sono taggati: nessuna certificazione PDF/UA o WCAG. Le prove sintetiche non certificano accuratezza grammaticale generale, OCR su foto reali o efficacia BES. Rimangono i rilievi preesistenti su contrasto del pulsante ENTRA e dimensioni di alcuni controlli su mobile.

Lo ZIP sorgente non include credenziali, dati degli studenti, database, `.git`, dipendenze installate o build. Non aggiorna automaticamente GitHub né crea un servizio Render. Seguire [REBUILD.md](REBUILD.md), [ADATTARE.md](ADATTARE.md), [RENDER.md](RENDER.md) e [docs/ESPORTAZIONE.md](docs/ESPORTAZIONE.md).

