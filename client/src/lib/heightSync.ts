/**
 * Sincronizzazione altezza per embed iframe (protocollo `labvisivo:height`).
 *
 * Quando l'app è caricata dentro un iframe (es. cornice dinamica su Blogger
 * o su un sito), invia al parent l'altezza reale del documento così la
 * cornice può adattarsi automaticamente al contenuto (resize automatico).
 *
 * Il parent ascolta messaggi del tipo:
 *   { type: "labvisivo:height", height: <numero> }
 */

function currentHeight(): number {
  const docEl = document.documentElement;
  const body = document.body;
  /* IMPORTANTE: NON usare documentElement.scrollHeight come riferimento
     assoluto. Quando il contenuto è più corto dell'iframe, lo scrollHeight
     del documento resta “gonfiato” all'altezza del viewport dell'iframe
     (mai meno), quindi la cornice dinamica non potrebbe MAI restringersi
     e la prima pagina mostrerebbe un grande vuoto (prima sotto la card,
     poi sopra). Usiamo invece l'altezza reale del contenuto (body +
     offsetHeight del documento) e aggiungiamo documentElement.scrollHeight
     SOLO quando il contenuto supera davvero il viewport. */
  const viewportH = window.innerHeight || (docEl ? docEl.clientHeight : 0);
  let h = Math.max(
    body ? body.scrollHeight : 0,
    body ? body.offsetHeight : 0,
    docEl ? docEl.offsetHeight : 0
  );
  if (docEl && docEl.scrollHeight > viewportH) {
    h = Math.max(h, docEl.scrollHeight);
  }
  return h;
}

// Token univoco della cornice (parametro ?cornice=... nell'URL dell'iframe).
// La cornice dinamica genera un token per OGNI istanza e lo ripassa qui;
// l'app lo rispecchia nei messaggi di altezza, così la cornice accetta solo
// i messaggi del PROPRIO iframe (impermeabilità tra più cornici nella stessa
// pagina, es. blog con più app didattiche embeddate).
function corniceToken(): string {
  try {
    const p = new URLSearchParams(window.location.search);
    return p.get("cornice") || "";
  } catch {
    return "";
  }
}

/* 26/10t ANTI-TREMOLIO: la cornice dinamica tremava perché ad ogni piccola
   variazione (1-2 px da font/arrotondamenti/scrollbar) l'app inviava una
   nuova altezza e la cornice ridimensionava l'iframe, innescando un nuovo
   cambio di altezza (loop ping-pong). Ora:
   - l'altezza viene ARROTONDATA al multiplo di 8 px (le micro-variazioni
     spariscono);
   - sotto una TOLLERANZA di 12 px rispetto all'ultima altezza inviata non
     si invia nulla (isteresi: la cornice resta ferma). */
let lastSentHeight = 0;
const HEIGHT_ROUND = 8;
const HEIGHT_TOLERANCE = 12;
let confirmationTimer: ReturnType<typeof setTimeout> | null = null;
// La prima misura aspetta il rendering e le preferenze di accessibilità:
// altrimenti font predefinito → font ingrandito → font caricato sembrano
// tre crescite consecutive e attivano l'anti-loop della cornice.
let initialMeasureReady = false;

function sendHeight(token: string = corniceToken(), force = false): void {
  // Attivo solo quando siamo dentro un iframe (non come pagina principale)
  if (window.self === window.top || !initialMeasureReady) return;
  // Il body fixed del ritaglio non è la nuova altezza dell'app: non
  // restringere la cornice mentre il modale è aperto (né ad ogni ping).
  if (document.documentElement.hasAttribute("data-lf-crop-open")) return;
  const raw = currentHeight();
  if (raw <= 100) return;
  // Arrotondare per eccesso evita di tagliare gli ultimi pixel del contenuto.
  const measuredHeight = Math.ceil(raw / HEIGHT_ROUND) * HEIGHT_ROUND;
  const changed = Math.abs(measuredHeight - lastSentHeight) >= HEIGHT_TOLERANCE;
  if (!changed && !force) return;
  // Una conferma di un'altezza entro l'isteresi deve ripetere davvero lo
  // stesso valore: piccole differenze nei font non sono nuove crescite.
  const height = !changed && lastSentHeight ? lastSentHeight : measuredHeight;
  lastSentHeight = height;
  const msg: { type: string; height: number; cornice?: string } = {
    type: "labvisivo:height",
    height,
  };
  if (token) msg.cornice = token;
  window.parent.postMessage(msg, "*");
  // La cornice richiede due misure uguali per accettare un grande salto.
  // Confermiamo SOLO dopo una variazione, misurando di nuovo il contenuto:
  // niente ripetizioni continue e nessun limite che tagli i testi lunghi.
  if (changed) {
    if (confirmationTimer) clearTimeout(confirmationTimer);
    confirmationTimer = setTimeout(() => {
      confirmationTimer = null;
      sendHeight(token, true);
    }, 600);
  }
}

export function initHeightSync(): void {
  // IMPORTANTE: quando l'app è dentro un iframe a altezza automatica
  // (cornice dinamica), la pagina deve seguire l'altezza del CONTENUTO.
  // Il classico `min-h-screen` (100vh) creerebbe un loop infinito:
  //   iframe = misurato → viewport = iframe → misurato = viewport + barra → …
  // Con la classe `lf-embedded` il CSS disattiva i 100vh (vedi index.css).
  if (window.self !== window.top) {
    document.documentElement.classList.add("lf-embedded");
    // La classe viene impostata subito, prima del render; solo l'invio della
    // prima altezza è rinviato brevemente per evitare misure intermedie.
    setTimeout(() => {
      initialMeasureReady = true;
      sendHeight();
    }, 350);
  }

  // Risponde al "ping" della cornice dinamica (embed Blogger): la cornice
  // può richiedere l'altezza in ogni momento con { type: "labvisivo:ping" }.
  // Se il ping porta il token della cornice, lo rispecchiamo nella risposta.
  window.addEventListener("message", (e) => {
    if (e.data && e.data.type === "labvisivo:ping") {
      // Il ping è la rete di recupero della cornice: rispondere anche se
      // l'altezza non è cambiata, senza rilanciare l'anti-tremolio.
      sendHeight(typeof e.data.cornice === "string" ? e.data.cornice : corniceToken(), true);
    }
  });

  // Rimisura a caricamento avvenuto; la prima misura è avviata sopra.
  window.addEventListener("load", () => sendHeight());
  window.addEventListener("resize", () => sendHeight());
  window.addEventListener("lf:crop-closed", () => requestAnimationFrame(() => sendHeight()));

  // Osserva i cambi di layout: analisi frasi, OCR, dialoghi, traduzione…
  // (26/10t: il ResizeObserver scatta ANCHE quando è la cornice stessa a
  // ridimensionare l'iframe — senza debounce alimentava il loop del
  // tremolio: ora le chiamate ravvicinate vengono accorpate in una sola.)
  if (typeof ResizeObserver !== "undefined") {
    let roTimer: ReturnType<typeof setTimeout> | null = null;
    const ro = new ResizeObserver(() => {
      if (roTimer) clearTimeout(roTimer);
      roTimer = setTimeout(() => {
        roTimer = null;
        sendHeight();
      }, 150);
    });
    if (document.documentElement) ro.observe(document.documentElement);
    if (document.body) ro.observe(document.body);
    // Invia anche quando un dialogo si apre/chiude (il body cambia dimensione)
    setTimeout(() => sendHeight(), 250);
  }

  // Retry: font, OCR e contenuti asincroni possono cambiare l'altezza dopo
  // l'evento "load" (es. tesseract.js carica i dati in background)
  setTimeout(sendHeight, 500);
  setTimeout(sendHeight, 1500);
}
