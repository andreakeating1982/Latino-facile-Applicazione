# Latino Facile — produzione 8980

> **Archivio storico:** alla verifica del 07/11/2026 la produzione corrente è la [8990](RILASCIO-8990.md). I risultati sotto si riferiscono alla 8980.

## Identità

- **Deploy attivo verificato:** 8980, 6 novembre 2026, dopo anteprima condivisa e autorizzazione esplicita dell'utente.
- **Indirizzo stabile:** https://latino-facile-app-2.easy-peasy.site
- **Commit del codice pubblicato:** `23d36ab42d28d825180283c77f1640204dca33a2`.
- Le successive modifiche alle sole guide/metadati sono registrate in un checkpoint separato e **non** costituiscono un nuovo deploy. Il precedente [rilascio 8802](RILASCIO-8802.md) e il relativo ZIP già consegnato rimangono storici; lo ZIP 8802 non contiene le modifiche di questo rilascio.

## Modifiche pubblicate

- All'apertura della seconda pagina la legenda non è mostrata; compare quando sono disponibili parole analizzate/colorate e rimane nascosta durante una nuova analisi. Se una successiva analisi fallisce, il risultato precedente con la relativa legenda torna disponibile.
- I controlli e le schede della pagina di lavoro usano toni chiari e marrone/terracotta coordinati alle altre app del blog. I colori grammaticali, il pannello della legenda e il PDF sono invariati rispetto alla 8802.
- Rimangono invariati il cropper, la sua baseline indipendente **8731**, il codice di `confirm()` e la geometria dei box. La cornice Blogger mantiene il proprio URL e protocollo di sincronizzazione.

## Verifiche

- Prima del deploy: TypeScript, build, **85/85 test unitari** e **43/43 smoke** riusciti.
- Dopo il deploy, servizio pubblico `/_health`, `/` e `/app` rispondono HTTP 200. JavaScript e CSS serviti pubblicamente sono identici byte per byte alla build locale approvata.
- **19/19 controlli UI pubblici** con risposte IA simulate: legenda assente all'apertura e durante l'analisi, presente dopo il risultato, recupero dopo errore e ripetizione; 115 nodi della legenda hanno gli stessi colori calcolati del riferimento 8802. Nessun overflow/sovrapposizione rilevato alle larghezze 320, 390, 768 e 1100 px. Cornice mobile locale a 320 px: visibilità e aggiornamento altezza verificati.
- **12/12 controlli UI/PDF pubblici** con frasi sintetiche e risposte simulate: colori grammaticali e scelta manuale preservati, legenda su una riga a 320/393/768/1100 px; PDF scaricato con il pulsante dell'app, verificato come PDF A4 e con testo della legenda estratto.
- Dopo il deploy, lo strumento ha rimosso localmente `Dockerfile`: ripristinato dal commit approvato, byte identici e nessuna modifica funzionale.

### Hash delle risorse pubblicate

| File | SHA-256 |
|---|---|
| `/assets/index-CghoGLD-.js` | `d3768e2e7fc160967d946757dace8805ddcae04b11104069781a4bf4b0740335` |
| `/assets/index-CnQhszuY.css` | `4b0872d01acebcbea7072aea62edd58b28f60b264dafe241662ad4a3f79f0064` |

## Limiti

I test UI usano **risposte IA simulate** e touch/schermi emulati, non un telefono fisico; non misurano accuratezza linguistica o OCR reale. Il PDF campione non è taggato; nessuna certificazione PDF/UA o WCAG. Rimangono i rilievi preesistenti sul contrasto del pulsante ENTRA e sulle dimensioni di alcuni controlli di accessibilità su mobile, non modificati in questa richiesta. Nessuna nuova esportazione ZIP, pubblicazione GitHub o servizio Render è stata effettuata per il deploy 8980.

