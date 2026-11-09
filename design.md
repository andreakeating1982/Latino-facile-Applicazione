# Latino Facile — armonizzazione con le app del blog

## Direzione
Confronto con Lingue Facili e la cornice didattica sul blog di Andrea Centinaro: fondi chiari e puliti, schede avorio con contorni discreti e accenti terracotta/marrone; accessibilità e OpenDyslexic rimangono invariati. Non introdurre immagini decorative o cambiare struttura e testi non richiesti.

L'intervento riguarda le superfici e i controlli operativi della seconda pagina: sfondo esterno bianco, schede di lavoro #FAF8F5 con bordo #E5E0D8, testo scuro, accento terracotta scuro #8B3A1A per azioni principali e accenti secondari leggibili. La prima pagina e la barra accessibilità già condividono lo stile delle altre app e restano invariate.

## Vincoli
- La legenda compare soltanto quando è disponibile un risultato colorato e non è in corso una nuova analisi; nessuna legenda all'apertura o durante il caricamento.
- **Nessun cambiamento ai colori della legenda**: non alterare `LEGEND_ITEMS`, sfumature, colori delle parole, campioni, scritte, icona, sfondo o bordo del pannello; preservare l'assenza di a-capo, anche su mobile e iframe.
- Colori grammaticali, colori manuali ed enclitiche inalterati; font OpenDyslexic, alto contrasto, barra, ritaglio foto, heightSync e layout responsive conservati. Una richiesta successiva interessa soltanto la spaziatura della legenda nel PDF.
- Il risultato e la legenda possono riapparire in caso di errore del successivo tentativo, per non perdere il risultato precedente; la traduzione prefetch non deve bloccare la visualizzazione delle frasi già fornite.
- Desktop e telefono senza overflow orizzontale; controllare pulsanti e contrasto, prima/durante/dopo, errore e nuova analisi. Test UI con risposte API simulate, senza dati reali.



## Correzioni richieste dopo la 8980
- Solo sulla seconda pagina, lo sfondo attorno alla barra accessibilità è bianco (#FFFFFF), esattamente come il canvas della pagina: non cambiare il colore proprio delle capsule e non intervenire sulla prima pagina.
- Titolo RITAGLIA LA FOTO visivamente centrato anche da 640 px in poi, senza alterare modale, conferma, geometria, scroll o barra comandi.
- MOSTRA/NASCONDI TRADUZIONE con la stessa altezza e larghezza degli altri due comandi di azione, oltre a padding, raggio, font e palette coordinati. Larghezza fluida massima 17,5 rem e altezza minima 60 px; in spazi molto stretti o con testo ingrandito le etichette e le icone possono andare a capo senza spezzare le parole e i pulsanti crescono insieme. SALVA TRADUZIONE NEL PDF mantiene `h-auto`, senza tagli al massimo ingrandimento.
- Legenda e pulsante MODIFICA TRADUZIONE rimangono nella larghezza dello schermo anche con font al 160%: righe intere e campioni allineati. Su telefoni molto stretti le righe più lunghe della legenda devono adattare la dimensione al contenitore e possono restare piccole; i colori della legenda non cambiano.
- Le etichette IA devono riflettere le effettive risposte del servizio; non cambiare palette grammaticale, colori della legenda o TTS.

## Maggiore respiro nella legenda PDF
- Aumentare di pochi punti l'interlinea tra singolare, plurale e descrizioni e lo spazio tra le voci, come richiesto nell'immagine. Lasciare invariati contenuti, font, colori, larghezze e struttura a due colonne; non intervenire sulla legenda dell'app.
- Calcolare l'altezza totale prima dell'impaginazione: legenda e note devono restare intere entro i margini, anche quando il PDF ha più pagine.

## Anteprima mirata: enclitiche e comandi del ritaglio
- Il solo suffisso nell'app deve rimanere attaccato alla base e distinguibile con lettere bianche o nere su un piccolo fondo a contrasto; contorno della tinta della base e colore grammaticale del chip invariati. Usare una combinazione testo/fondo che raggiunga almeno 4,5:1, anche sui colori manuali e sul chip nero. Non cambiare la legenda o la resa del PDF. In una cornice molto stretta con font ingrandito, ampliare solo l'area della frase; se un'intera parola è ancora più larga, mantenerla intera in una regione scorrevole con indicazione visibile e accessibile, senza ridurre il font.
- I quattro comandi del ritaglio restano centrati nello stesso riquadro, con nomi e colori invariati, aree touch di almeno 44 px e testo completo. Anche SCATTA/CARICA, che aprono lo stesso flusso foto, si adattano alle cornici strette. Sotto 285 px riservare spazio tra la X di chiusura e il titolo centrato, conservando il font e un target di 44 px. Controllare larghezze mobili, schermi orizzontali, iframe e font ingrandito; intervenire solo in caso di fuoriuscite. Preservare modal, blocco pagina, scroll interno, `confirm()` e geometria.
- Dopo la colorazione, solo nell'iframe, stabilizzare la corsia della scrollbar per evitare che WebKit alterni due altezze al cambiare della larghezza. Non toccare la prima pagina, `heightSync`, ColorDialog o la logica e il lock del ritaglio.
- La produzione 8990 resta invariata finché l'utente non approva separatamente la pubblicazione dell'anteprima.

## Correzione mirata: traduzione e cornice Blogger
- Rimuovere il solo paragrafo «Aggiungi o togli parole…» sotto l'editor della traduzione; lasciare intatti pulsanti, salvataggio e ricalcolo IA/regole.
- Conservare stile e dimensioni dei due pulsanti e ridisegnare le icone schermo intero e ricarica con un unico percorso SVG ciascuna, evitando percorsi annidati quando Blogger rielabora l'HTML.
- La cornice effettivamente presente nel post è v4 con anti-tremolio: conservarne CSS, script, token, altezza e protezioni; una modifica all'app non modifica automaticamente il codice già inserito nel blog.

## Anteprima: seconda pagina compatta su mobile
- Conservare colori, font OpenDyslexic, dimensioni dei testi, pulsanti e tutta l'accessibilità. Ridurre soltanto gli spazi verticali superflui della pagina di lavoro sugli schermi stretti; lasciare desktop invariato.
- Eliminare eventuale altezza minima che somma un intero viewport alla barra accessibilità. Nell'iframe l'altezza deve continuare a seguire il contenuto, senza limiti fissi che possano nascondere frasi, legenda o traduzione e senza cambiare il protocollo di sincronizzazione.
- Provare dimensioni 320 e 390 px, font normale e ingrandito, cambio tra prima e seconda pagina e risultato con dati sintetici, oltre al desktop; il contenuto lungo deve restare interamente raggiungibile.

