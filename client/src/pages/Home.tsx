import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CropDialog } from "@/components/CropDialog";
import { AiUnavailableError, aiTranscribeImage, fileToScaledDataUrl } from "@/lib/aiTranscribe";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  DECLINABILI,
  LEGEND_ITEMS,
  LEGEND_VOICE_NOTE,
  legendExplanationColor,
  numeroPerSfumatura,
  shadeForNumber,
  UNKNOWN_TEXT_COLOR,
  type AnalyzeResponse,
  type TokenAnalysis,
  type TokenData,
} from "../../../shared/types";
import {
  BadgeCheck,
  Bot,
  Camera,
  Check,
  Download,
  EyeOff,
  FileDown,
  Languages,
  Loader2,
  Palette,
  Pencil,
  Plus,
  RotateCcw,
  ScrollText,
  Sparkles,
  Upload,
  Wand2,
  Wrench,
  X,
} from "lucide-react";
import { buildPdfBlob, downloadBlob, type ExportToken } from "@/lib/export";
import { cleanOcrText, ocrImage } from "@/lib/ocr";
import { contaParole, troncaParole } from "@/lib/parole";
import { normalizePhoto } from "@/lib/imagePrep";
import { encliticStyle } from "@/lib/encliticStyle";
import { useSearch } from "wouter";



function chipTextColor(hex: string): string {
  // ambra, gialli e le sfumature CHIARE dei sostantivi (singolare): testo
  // scuro; tutto il resto (colori pieni e sfumature scure): testo chiaro
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  return lum > 145 ? "#2e2018" : "#fff7ec";
}

/* Palette per la personalizzazione MANUALE del colore di una parola:
   è la STESSA legenda «I COLORI DELLE FRASI» — stessa fonte (LEGEND_ITEMS),
   con le due sfumature SINGOLARE/PLURALE per ogni caso. Nessuna voce extra:
   il dialogo offre ESATTAMENTE i colori della legenda. */
const titoloVoce = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();
const COLOR_PALETTE: { color: string; label: string }[] = [
  ...LEGEND_ITEMS.flatMap((item) =>
    item.numero
      ? [
          {
            color: shadeForNumber(item.color, "singolare"),
            label: `${titoloVoce(item.label)} singolare`,
          },
          {
            color: shadeForNumber(item.color, "plurale"),
            label: `${titoloVoce(item.label)} plurale`,
          },
        ]
      : [{ color: item.color, label: titoloVoce(item.label) }]
  ),
];

/* Voce della legenda corrispondente all'analisi grammaticale di una parola.
   Serve a evidenziare il pulsante GIUSTO della palette anche quando due voci
   condividessero lo stesso colore — si evidenzia per VOCE, non per colore.
   Avverbi/preposizioni/congiunzioni ora hanno tre tinte distinte. */
function vocePerAnalisi(a: TokenAnalysis): string | null {
  const sel = a.options[a.selected];
  if (!sel) return null;
  switch (sel.pos) {
    case "avverbio":
      return "Avverbi";
    case "preposizione":
      return "Preposizioni";
    case "congiunzione":
      return "Congiunzioni";
    case "verbo":
      if (sel.mood === "indicativo") return "Indicativo";
      if (sel.mood === "congiuntivo") return "Congiuntivo";
      return sel.mood ? "Altri modi verbali" : null;
    default:
      if (DECLINABILI.includes(sel.pos) && sel.case) {
        const item = LEGEND_ITEMS.find((i) => i.key === sel.case);
        if (item) {
          return `${titoloVoce(item.label)} ${sel.number === "plurale" ? "plurale" : "singolare"}`;
        }
      }
      return null;
  }
}

/* Se una parola è più larga della cornice anche dopo l'ingrandimento,
   conservarla intera e offrire uno scorrimento esplicito, senza ridurre
   il font scelto o separare visivamente il suffisso dalla base. */
function SentenceViewport({ children, sentenceIndex }: { children: ReactNode; sentenceIndex: number }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [overflow, setOverflow] = useState(false);
  const hintId = `lf-sentence-scroll-help-${sentenceIndex}`;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let active = true;
    const measure = () => {
      if (active) setOverflow(el.scrollWidth > el.clientWidth + 1);
    };
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    observer?.observe(el);
    window.addEventListener("resize", measure);
    const frame = window.requestAnimationFrame(measure);
    const timer = window.setTimeout(measure, 700); // attende font e animazione dei chip
    void document.fonts?.ready.then(measure);
    return () => {
      active = false;
      observer?.disconnect();
      window.removeEventListener("resize", measure);
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [children]);

  return (
    <>
      <p
        ref={ref}
        className="lf-sentence leading-[1.9] break-words"
        role={overflow ? "region" : undefined}
        tabIndex={overflow ? 0 : undefined}
        aria-label={overflow ? "Frase colorata scorrevole" : undefined}
        aria-describedby={overflow ? hintId : undefined}
      >
        {children}
      </p>
      {overflow && (
        <p id={hintId} className="text-[0.72rem] leading-snug text-[#5a4a38]">
          Scorri a destra per vedere le parole più lunghe.
        </p>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Singola parola colorata                                             */
/* ------------------------------------------------------------------ */
function TokenChip({
  token,
  index,
  overrideColor,
  underlineOverride,
  onClick,
}: {
  token: TokenData;
  index: number;
  overrideColor?: string | null;
  /** true = sottolineata, false = NON sottolineata; assente = voce dell'analisi */
  underlineOverride?: boolean;
  onClick: () => void;
}) {
  if (token.isPunct || !token.analysis) {
    return <span className="text-[1.35rem] font-semibold text-[#3a2a1e]">{token.text}</span>;
  }
  const a = token.analysis;
  // sfumatura del numero sulle parole declinabili (nome, aggettivo, pronome,
  // numerale — DECLINABILI), come nel PDF e in legenda: singolare = più
  // CHIARA, plurale = più SCURA dello stesso colore del caso
  const numeroSfumatura = numeroPerSfumatura(a.category, a.number);
  // il colore scelto a mano dall'utente vince su quello della traduzione ed
  // è FINALE: la palette propone già le sfumature della legenda, quindi su
  // un colore manuale NON si applica nessuna sfumatura aggiuntiva
  const chipColor = overrideColor ??
    (numeroSfumatura ? shadeForNumber(a.color, numeroSfumatura) : a.color);
  /* Parola NON riconosciuta (sconosciuta a Whitaker e all'IA): chip NERO
     con SCRIITTA BIANCA (richiesta dell'utente, 26/10g, prima bianco). */
  const textColor =
    a.category === "sconosciuto" && chipColor.toUpperCase() === "#000000"
      ? "#FFFFFF"
      : chipTextColor(chipColor); // anche uno sconosciuto ricolorato chiaro usa testo scuro
  // Il suffisso mantiene il testo opposto alla base e un contorno del suo
  // colore; il fondo proprio garantisce contrasto anche su chip chiari/neri.
  // La voce passiva continua a sottolineare tutta la parola, suffisso incluso.
  const enclitica = encliticStyle(chipColor, textColor);
  const sottolineata = underlineOverride ?? a.voice === "passivo";
  return (
    <span className="lf-token-wrap inline-flex flex-col items-center align-middle mx-[3px] my-[2px]">
      <span
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick();
          }
        }}
        aria-label={`Cambia colore o sottolineatura di ${token.word}${numeroSfumatura ? `, ${numeroSfumatura}` : ""}`}
        className="chip-word chip-in"
        style={{
          backgroundColor: chipColor,
          color: textColor,
          animationDelay: `${Math.min(index * 45, 600)}ms`,
          // voce passiva: la parola è SOTTOLINEATA (come nel PDF); la scelta
          // manuale dell'utente (attiva/disattiva dal dialogo) ha la priorità
          ...(sottolineata
            ? {
                textDecorationLine: "underline",
                textDecorationColor: textColor,
                textDecorationThickness: "0.11em",
                textUnderlineOffset: "0.2em",
              }
            : {}),
        }}
        title="Clicca per cambiare il colore o la sottolineatura"
      >
        {a.suffisso &&
        token.word.toLowerCase().endsWith(a.suffisso.testo.toLowerCase()) ? (
          /* Enclitica (es. TUTAMQUE): attaccata alla base, con piccolo
             fondo leggibile e bordo della stessa tinta grammaticale. */
          <>
            {token.word.slice(0, token.word.length - a.suffisso.testo.length)}
            <span
              className="chip-enclitic"
              style={{
                ...enclitica,
                ...(sottolineata
                  ? { textDecorationLine: "underline", textDecorationColor: enclitica.color, textDecorationThickness: "0.11em", textUnderlineOffset: "0.2em" }
                  : {}),
              }}
            >
              {token.word.slice(-a.suffisso.testo.length)}
            </span>
          </>
        ) : (
          token.word
        )}
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Legenda dei colori                                                  */
/* ------------------------------------------------------------------ */
function LegendPanel() {
  return (
    <div className="card-paper p-[16px] sm:p-5">
      <div className="font-display text-lg font-bold tracking-tight mt-2 mb-6 flex items-center justify-center gap-2 uppercase">
        <Sparkles className="h-4 w-4 text-[#b71c1c]" />
        I colori delle frasi
      </div>
      {/* Colonne più ampie (1 su mobile, 2 su tablet, 3 su desktop): ogni voce
          ha abbastanza spazio perché NESSUNA scritta vada mai a capo.
          Ogni voce è un contenitore (@container): le dimensioni dei testi in
          cqw si adattano alla larghezza REALE della colonna, senza un minimo
          in rem che provocherebbe fuoriuscite al 160%. Le scritte restano su
          una riga anche in iframe Blogger stretti; i colori non cambiano. */}
      <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3" role="list">
        {LEGEND_ITEMS.map((item) => {
          // i casi mostrano DUE voci: «CASO SINGOLARE» con la sfumatura
          // chiara e «CASO PLURALE» con quella scura (come i chip dell'app)
          const righe = item.numero
            ? [
                { testo: `${item.label} SINGOLARE`, colore: shadeForNumber(item.color, "singolare") },
                { testo: `${item.label} PLURALE`, colore: shadeForNumber(item.color, "plurale") },
              ]
            : [{ testo: item.label, colore: item.color }];
          return (
            <div
              key={item.key}
              className={`@container flex ${item.numero ? "items-start" : "items-center"} gap-[8px] min-w-0`}
              role="listitem"
            >
              <div aria-hidden="true" className={`flex shrink-0 flex-col gap-[3px] ${item.numero ? "pt-[1px]" : ""}`}>
                {righe.map((r, i) => (
                  <span key={i} className="legend-dot" style={{ backgroundColor: r.colore }} />
                ))}
              </div>
              <div className="min-w-0 leading-tight">
                {/* whitespace-nowrap: SINGOLARE/PLURALE restano SEMPRE sulla
                    stessa riga del nome che accompagnano, in ogni schermo. */}
                {righe.map((r, i) => (
                  <div
                    key={i}
                    className={`whitespace-nowrap text-[min(5.9cqw,0.85rem)] font-bold uppercase tracking-wide text-[#2e2018] ${i > 0 ? "mt-[3px]" : ""}`}
                  >
                    {r.testo}
                  </div>
                ))}
                {item.compl && (
                  <div
                    className="whitespace-nowrap text-[min(3.65cqw,0.72rem)] font-bold uppercase tracking-wide"
                    style={{ color: legendExplanationColor(item.color) }}
                  >
                    {item.compl}
                  </div>
                )}
                {item.sub && (
                  <div className="whitespace-nowrap text-[min(3.65cqw,0.8rem)] text-[#5a4a38] italic">
                    {item.sub}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p
        role="note"
        aria-label="Voce verbale: verbo sottolineato = voce passiva; senza sottolineatura = voce attiva"
        className="mt-10 text-center text-[0.72rem] font-bold uppercase tracking-wide text-[#2e2018]"
      >
        {LEGEND_VOICE_NOTE.map((p, i) => (
          <span
            key={i}
            style={{
              color: p.color ?? "#2e2018",
              ...(p.underline
                ? {
                    textDecorationLine: "underline",
                    textDecorationColor: p.color ?? "#2e2018",
                    textDecorationThickness: "0.11em",
                    textUnderlineOffset: "0.2em",
                  }
                : undefined),
            }}
          >
            {p.text}
          </span>
        ))}
      </p>
      {/* Nota sulle parole non riconosciute (richiesta utente 26/10g):
          chip NERO con scritta bianca — niente più banner di avviso */}
      <p
        role="note"
        aria-label="Le parole non riconosciute dall'IA sono contrassegnate dal colore nero"
        className="mt-3 flex items-center justify-center gap-1.5 text-center text-[0.72rem] font-bold uppercase tracking-wide text-[#2e2018]"
      >
        <span
          aria-hidden="true"
          className="inline-block h-3 w-3 shrink-0 rounded-sm border-2 border-[#2e2018] bg-[#000000]"
        />
        Le parole non riconosciute dall&apos;IA sono contrassegnate dal colore
        nero
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Scelta del colore di una parola (NON più analisi morfologica)       */
/* ------------------------------------------------------------------ */
function ColorDialog({
  token,
  currentVoce,
  underlined,
  onToggleUnderline,
  onPick,
  onOpenChange,
}: {
  token: TokenData | null;
  currentVoce: string | null;
  /** stato ATTUALE della sottolineatura della parola (analisi o scelta manuale) */
  underlined: boolean;
  onToggleUnderline: () => void;
  onPick: (voce: string, color: string) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const a = token?.analysis ?? null;
  return (
    /* modal={false} (26/10i, riapplicato in 26/10j: era andato perso):
       su mobile la pagina dietro resta SCORRIBILE col dito mentre la
       finestra è aperta (il lock del modale Radix bloccava tutto lo
       scrolling); il contenuto interno resta scorrevole quando supera lo
       schermo. Chiusura invariata: X o tocco fuori. */
    <Dialog open={!!token} onOpenChange={onOpenChange} modal={false}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-md overflow-x-hidden overflow-y-auto overscroll-contain card-paper">
        {a && (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-3xl font-black tracking-tight text-[#2e2018]">
                {a.display}
              </DialogTitle>
              <DialogDescription className="sr-only">
                Scegli il colore della parola {a.display}
              </DialogDescription>
            </DialogHeader>
            <p className="-mt-1 mb-3 text-center text-sm text-[#5a4a38]">
              Di norma il colore segue la traduzione italiana. Qui puoi sceglierne uno diverso
              qualora necessario.
            </p>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {COLOR_PALETTE.map((p) => (
                <button
                  key={p.label}
                  onClick={() => onPick(p.label, p.color)}
                  className={`flex items-center gap-1.5 rounded-lg border-2 p-1.5 text-left transition-colors ${
                    currentVoce === p.label
                      ? "border-[#2e2018] bg-[#f8f1e4]"
                      : "border-[#d8c9ae] bg-white hover:border-[#2e2018]"
                  }`}
                  aria-pressed={currentVoce === p.label}
                  aria-label={`Colore ${p.label}`}
                >
                  <span
                    className="h-5 w-5 shrink-0 rounded-md border border-[#3a2a1e]"
                    style={{ backgroundColor: p.color }}
                  />
                  <span className="text-xs font-bold leading-tight text-[#2e2018]">{p.label}</span>
                </button>
              ))}
            </div>
            {/* Sottolineatura (voce verbale): in FONDO allo specchietto,
                attivabile/disattivabile a mano per correggere eventuali
                errori dell'analisi (richiesta dell'utente 26/10) */}
            <button
              onClick={onToggleUnderline}
              aria-pressed={underlined}
              className={`mt-3 w-full rounded-lg border-2 p-2 text-center text-sm font-bold uppercase tracking-wide transition-colors ${
                underlined
                  ? "border-[#2e2018] bg-[#f8f1e4] text-[#2e2018] underline decoration-[1.5px] underline-offset-4"
                  : "border-[#d8c9ae] bg-white text-[#5a4a38] hover:border-[#2e2018]"
              }`}
              aria-label={
                underlined
                  ? `Togli la sottolineatura a ${a.display}`
                  : `Sottolinea ${a.display}`
              }
            >
              {underlined ? "TOGLI LA SOTTOLINEATURA" : "SOTTOLINEA LA PAROLA"}
            </button>

          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Badge della fonte della traduzione (IA / automatica / glossario)    */
/* ------------------------------------------------------------------ */
function SourceBadge({ source }: { source: "ai" | "auto" | "glossario" }) {
  if (source === "ai") {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#00695c]/60 bg-[#e2f3ef] px-2.5 py-1 text-[0.72rem] font-bold uppercase tracking-wide text-[#00695c]"
        title="Traduzione realizzata o verificata dall'intelligenza artificiale"
      >
        <BadgeCheck className="h-3.5 w-3.5" />
        Tradotta con IA
      </span>
    );
  }
  if (source === "glossario") {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#b71c1c]/50 bg-[#fdf0ee] px-2.5 py-1 text-[0.72rem] font-bold uppercase tracking-wide text-[#b71c1c]"
        title="Traduzione parola per parola dal glossario: approssimativa"
      >
        <ScrollText className="h-3.5 w-3.5" />
        Glossario · approssimativa
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#5a4a38]/50 bg-[#f8f1e4] px-2.5 py-1 text-[0.72rem] font-bold uppercase tracking-wide text-[#5a4a38]"
      title="Traduzione automatica (MyMemory), senza controllo dell'intelligenza artificiale"
    >
      <Languages className="h-3.5 w-3.5" />
      Traduzione automatica
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Badge della fonte della COLORAZIONE (IA / regole grammaticali)      */
/* ------------------------------------------------------------------ */
function ColorBadge({ source }: { source: "ai" | "regole" }) {
  if (source === "ai") {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#00695c]/60 bg-[#e2f3ef] px-2.5 py-1 text-[0.72rem] font-bold uppercase tracking-wide text-[#00695c]"
        title="Colori assegnati dall'intelligenza artificiale"
      >
        <Palette className="h-3.5 w-3.5" />
        Colorata con IA
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#5a4a38]/50 bg-[#f8f1e4] px-2.5 py-1 text-[0.72rem] font-bold uppercase tracking-wide text-[#5a4a38]"
      title="IA non disponibile: colori assegnati dalle regole grammaticali"
    >
      <Wrench className="h-3.5 w-3.5" />
      Colorazione con regole
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Pagina                                                              */
/* ------------------------------------------------------------------ */
/** Numero massimo di PAROLE che l'utente può caricare (per prestazioni ottimali) */
export const MAX_PAROLE = 50;

/* 26/10r: niente più autosalvataggio del testo — LAST_TEXT_KEY rimosso.
   Il testo vive solo in memoria: il riquadro desktop resta sempre vuoto
   finché l'utente non scrive o fotografa. */
export default function Home() {
  // La barra è condivisa con la prima pagina: il bianco riguarda solo lo
  // sfondo della pagina di lavoro, anche quando è aperta nel blog.
  useEffect(() => {
    document.documentElement.classList.add("lf-workspace");
    return () => document.documentElement.classList.remove("lf-workspace");
  }, []);

  const [text, setText] = useState("");
  const persistText = (next: string) => {
    setText(next);
  };
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const hasResult = Boolean(result);
  // Nell'iframe la presenza intermittente della scrollbar può cambiare la
  // larghezza del testo e far oscillare l'altezza: una corsia stabile solo
  // dopo il risultato evita il ciclo, senza alterare la prima pagina.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("lf-has-colored-result", hasResult);
    return () => root.classList.remove("lf-has-colored-result");
  }, [hasResult]);
  /* Parola selezionata per il cambio colore manuale (niente più analisi) */
  const [colorTarget, setColorTarget] = useState<{ s: number; t: number } | null>(null);
  /* Colori scelti a mano dall'utente: chiave "s:t" → colore (vincono sulla traduzione) */
  const [colorOverrides, setColorOverrides] = useState<Record<string, string>>({});
  /* Voce della palette scelta a mano (stessa chiave): evidenzia il pulsante
     giusto anche quando due voci hanno lo stesso colore (Avverbi/Preposizioni) */
  const [overrideVoci, setOverrideVoci] = useState<Record<string, string>>({});
  /* Sottolineatura decisa a mano (26/10): chiave "s:t" -> true = sottolineata,
     false = NON sottolineata (per correggere eventuali errori di voce verbale
     dell'analisi). Senza chiave vale la voce dell'analisi grammaticale. */
  const [underlineOverrides, setUnderlineOverrides] = useState<Record<string, boolean>>({});
  /* Traduzione modificata dall'utente (aggiunte o tolte parole) */
  const [editedLines, setEditedLines] = useState<string[] | null>(null);
  const [editingLines, setEditingLines] = useState(false);
  const [draftLines, setDraftLines] = useState<string[]>([]);
  const [analyzedText, setAnalyzedText] = useState("");
  const [showTranslation, setShowTranslation] = useState(false);
  /* Traduzione scritta dallo studente (una per frase): finisce nel PDF sotto la frase */
  const [writingTranslation, setWritingTranslation] = useState(false);
  const [userTranslations, setUserTranslations] = useState<string[]>([]);
  const [savedPdfTranslation, setSavedPdfTranslation] = useState<string[] | null>(null);
  /* Quando la sezione SCRIVI LA TRADUZIONE viene chiusa e riaperta, le
     traduzioni scritte dallo studente restano salvate: si svuota solo
     il campo della frase che non esiste più o che è cambiata. */
  const syncUserTranslations = (count: number) => {
    setUserTranslations((prev) =>
      Array.from({ length: count }, (_, i) => prev[i] ?? "")
    );
  };
  const [colorSource, setColorSource] = useState<"ai" | "regole">("regole");
  const analyze = trpc.latino.analyze.useMutation();
  /* 26/10o: retry=1 sulla traduzione — su mobile la richiesta più lunga
     (IA) può cadere per rete instabile; senza retry i colori sarebbero
     rimasti «REGOLE» per sempre. */
  const translate = trpc.latino.translate.useMutation({ retry: 1 });
  const recolor = trpc.latino.recolor.useMutation();

  /* Dati dello studente: dalla query string (prima pagina) o dal salvataggio locale,
     così il PDF può riportarli SEMPRE, anche aprendo /app direttamente */
  const studentSearch = useSearch();
  const studentParams = new URLSearchParams(studentSearch || "");
  const [student] = useState(() => {
    const fromUrl = {
      cognome: studentParams.get("cognome")?.trim() ?? "",
      nome: studentParams.get("nome")?.trim() ?? "",
      data: studentParams.get("data")?.trim() ?? "",
      classe: studentParams.get("classe")?.trim() ?? "",
    };
    if (fromUrl.cognome || fromUrl.nome) {
      try {
        localStorage.setItem("latino-facile-studente", JSON.stringify(fromUrl));
      } catch {
        /* storage non disponibile */
      }
      return fromUrl;
    }
    try {
      const salvato = localStorage.getItem("latino-facile-studente");
      if (salvato) {
        const parsed = JSON.parse(salvato) as Partial<typeof fromUrl>;
        return {
          cognome: parsed.cognome ?? "",
          nome: parsed.nome ?? "",
          data: parsed.data ?? "",
          classe: parsed.classe ?? "",
        };
      }
    } catch {
      /* salvataggio non disponibile */
    }
    return fromUrl;
  });

  /* ---- Colorazione GUIDATA dalla traduzione italiana ----
     Quando arriva la traduzione (prefetch invisibile), il colore di ogni
     parola latina viene ricalcolato dal ruolo che ha nella frase italiana:
     «di Roma» → genitivo, «dagli abitanti» → ablativo, «le truppe» →
     soggetto/nominativo, ecc. L'utente può comunque cambiare a mano il
     colore di una parola (colorOverrides) oppure modificare la traduzione
     (editedLines → ricalcolo dei colori via recolor). */
  /* 26/10o FIX RACE «REGOLE» (visibile specie su mobile): l'effetto prima
     dipendeva SOLO da translate.data — se la traduzione IA arrivava un
     istante PRIMA che result fosse pronto (batch analyze+translate,
     rendering più lento su telefono), l'effetto usciva presto (!result)
     e non veniva MAI rieseguito: le frasi restavano colorate dalle REGOLE
     con badge «REGOLE» invece che dall'IA. Ora dipende anche da result
     (riapplica appena il risultato è pronto) con un ref che impedisce di
     riapplicare la STESSA risposta di translate (così non sovrascrive i
     colori del recolor/modifiche successive dell'utente). */
  const appliedTranslateRef = useRef<unknown>(null);
  /* 26/10q RETRY «REGOLE» → IA: se dopo l'arrivo della traduzione il
     colore finale resta «regole» (IA fallita per quota/timeout/rete),
     si riprova UNA volta in silenzio: se il secondo tentativo porta i
     ruoli IA, i colori e il badge passano a IA senza che l'utente debba
     rifare nulla (vede prima le regole, poi l'IA che le sostituisce). */
  const retryTranslateRef = useRef<{ key: string; done: boolean }>({
    key: "",
    done: false,
  });
  useEffect(() => {
    const colored = translate.data?.coloredSentences;
    if (!colored || !result) return;
    if (colored.length !== result.sentences.length) return;
    if (appliedTranslateRef.current === translate.data) return; // già applicata
    appliedTranslateRef.current = translate.data;
    setResult((prev) => {
      if (!prev) return prev;
      return { ...prev, sentences: colored };
    });
    if (translate.data?.colorSource) setColorSource(translate.data.colorSource);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [translate.data, result]);

  useEffect(() => {
    if (!result || !analyzedText) return;
    /* 26/10s: il retry scatta se la COLORAZIONE è restata «regole» oppure
       se la TRADUZIONE non è IA (source «auto»/«glossario»): in quel caso il
       secondo tentativo di translate dà all'IA un'altra possibilità di
       correggere le righe e di assegnare i ruoli. */
    const colorFailed = colorSource === "regole";
    const translationNotAI =
      translate.data != null && translate.data.source !== "ai";
    if (!colorFailed && !translationNotAI) return; // l'IA ha già vinto
    const key = analyzedText;
    if (retryTranslateRef.current.key === key && retryTranslateRef.current.done) return;
    retryTranslateRef.current = { key, done: true };
    const id = setTimeout(() => {
      if (translate.isPending) {
        // la prima traduzione è ancora in volo: niente doppia chiamata,
        // si rimanda (l'effetto ripartirà quando sarà risolta)
        retryTranslateRef.current = { key, done: false };
        return;
      }
      translate.mutate({ text: key });
    }, 2500);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colorSource, result, analyzedText]);

  const run = (t: string) => {
    const trimmed = t.trim();
    if (!trimmed) return;
    const parole = contaParole(trimmed);
    if (parole > MAX_PAROLE) {
      toast.error(`Il testo supera il limite di ${MAX_PAROLE} parole (ora sono ${parole}).`);
      return;
    }
    // la traduzione non deve mai apparire da sola: resta nascosta finché
    // l'utente non preme il pulsante MOSTRA TRADUZIONE (e si nasconde con NASCONDI)
    setShowTranslation(false);
    analyze.mutate(
      { text: trimmed },
      {
        onSuccess: (data) => {
          setResult(data);
          setColorSource("regole");
          setColorTarget(null);
          setColorOverrides({});
          setEditedLines(null);
          setEditingLines(false);
          setDraftLines([]);
          setAnalyzedText(trimmed);
          setUserTranslations(data.sentences.map(() => ""));
          setWritingTranslation(false);
          setSavedPdfTranslation(null); // Resetta la traduzione salvata quando viene analizzato un nuovo testo.
          retryTranslateRef.current = { key: "", done: false }; // 26/10q: nuovo testo → nuovo diritto al retry
        },
      }
    );
    // prefetch invisibile della traduzione: quando l'utente preme MOSTRA
    // TRADUZIONE è già pronta (retry=1 configurato sulla mutazione).
    translate.reset();
    translate.mutate({ text: trimmed });
  };

  /* ---- Traduzione in italiano (mostra / nascondi) ---- */
  const toggleTranslation = () => {
    if (!result) return;
    if (showTranslation) {
      setShowTranslation(false);
      return;
    }
    setShowTranslation(true);
    if (!translate.data && !translate.isPending) {
      translate.mutate({ text: analyzedText || "" });
    }
  };

  /* ---- Personalizzazione del colore di una parola ---- */
  const pickColor = (voce: string, c: string) => {
    if (!colorTarget) return;
    const key = `${colorTarget.s}:${colorTarget.t}`;
    setColorOverrides((prev) => ({ ...prev, [key]: c }));
    setOverrideVoci((prev) => ({ ...prev, [key]: voce }));
    setColorTarget(null);
  };


  /* ---- Modifica manuale della traduzione (aggiungi / togli parole) ---- */
  const startEditTranslation = () => {
    if (!translate.data) return;
    setDraftLines(editedLines ?? translate.data.lines);
    setEditingLines(true);
  };

  const saveEditedTranslation = () => {
    const lines = draftLines.map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      toast.error("La traduzione non può essere vuota.");
      return;
    }
    setEditingLines(false);
    const original = translate.data?.lines ?? [];
    const changed =
      lines.length !== original.length || lines.some((l, i) => l !== original[i]);
    setEditedLines(lines);
    if (!changed) {
      toast.success("Traduzione aggiornata.");
      return;
    }
    recolor.mutate(
      { text: analyzedText, lines },
      {
        onSuccess: (data) => {
          setResult((prev) => (prev ? { ...prev, sentences: data.coloredSentences } : prev));
          setColorSource(data.colorSource);
          toast.success("Traduzione aggiornata.");
        },
        onError: () =>
          toast.warning(
            "Traduzione salvata, ma non ho potuto ricalcolare i colori: clicca su una parola per sistemarla a mano."
          ),
      }
    );
  };

  const restoreOriginalTranslation = () => {
    setEditedLines(null);
    setEditingLines(false);
    const original = translate.data?.lines;
    if (!original || original.length === 0) return;
    recolor.mutate(
      { text: analyzedText, lines: original },
      {
        onSuccess: (data) => {
          setResult((prev) => (prev ? { ...prev, sentences: data.coloredSentences } : prev));
          setColorSource(data.colorSource);
        },
        onError: () => toast.warning("Traduzione ripristinata."),
      }
    );
  };

  /* ---- Esporta la frase colorata in PDF ---- */
  const [exporting, setExporting] = useState(false);

  const exportSentences = (): ExportToken[][] => {
    if (!result) return [];
    return result.sentences.map((g, si) =>
      g.tokens.map((t, ti) => {
        if (t.isPunct) return { word: "", trailing: t.trailing ?? "", color: "#5a4a38" };
        const override = colorOverrides[`${si}:${ti}`];
        return {
          word: t.word,
          trailing: t.trailing ?? "",
          color: override ?? t.analysis?.color ?? "#9e9e9e",
          // il colore scelto a mano è FINALE: nel PDF non riceve la sfumatura
          coloreFinale: override != null,
          voice:
            (underlineOverrides[`${si}:${ti}`] ?? t.analysis?.voice === "passivo")
              ? "passivo"
              : undefined,
          number: t.analysis?.number,
          pos: t.analysis?.category,
          suffisso: t.analysis?.suffisso,
        };
      })
    );
  };

  const handleExport = async () => {
    if (!result || exporting) return;
    setExporting(true);
    try {
      const blob = await buildPdfBlob(
        exportSentences(),
        LEGEND_ITEMS.map((i) => ({ label: i.label, sub: i.sub, compl: i.compl, color: i.color, numero: i.numero })),
        student,
        savedPdfTranslation ?? userTranslations,
        true // numeri di pagina: solo se il documento ha più di una pagina
      );
      downloadBlob(blob, "Frase_colorata_Latino_Facile.pdf");
      toast.success("Documento PDF scaricato");
    } catch {
      toast.error("Non è stato possibile creare il file. Riprova.");
    } finally {
      setExporting(false);
    }
  };

  /* ---- ESPORTA LA TRADUZIONE SUL PDF: trascrive le traduzioni scritte
     dallo studente nel documento (sotto ogni frase) e chiude da sola la
     sezione di scrittura, così nulla va perso. Richiede almeno una
     traduzione non vuota. */
  const handleExportUserTranslations = async () => {
    if (!result || exporting) return;
    const filled = userTranslations.map((t) => (t ?? "").trim());
    if (!filled.some(Boolean)) {
      toast.error("Scrivi almeno una traduzione prima di esportarla sul PDF.");
      return;
    }
    setUserTranslations(filled);
    setExporting(true);
    try {
      const blob = await buildPdfBlob(
        exportSentences(),
        LEGEND_ITEMS.map((i) => ({ label: i.label, sub: i.sub, compl: i.compl, color: i.color, numero: i.numero })),
        student,
        filled,
        true // numeri di pagina: solo se il documento ha più di una pagina
      );
      // downloadBlob(blob, "Frase_colorata_Latino_Facile.pdf"); // Rimosso il download automatico
      // setWritingTranslation(false); // Non chiudiamo automaticamente la sezione di scrittura
      toast.success("Traduzione salvata per il PDF.");
      setSavedPdfTranslation(filled); // Salvo la traduzione per l'esportazione successiva
    } catch {
      toast.error("Non è stato possibile creare il file. Riprova.");
    } finally {
      setExporting(false);
    }
  };

  /* ---- FOTO DEL TESTO (tool del Widget metacognitivo, trapianto 26/10) ----
     SCATTA UNA FOTO DEL TESTO (fotocamera) oppure CARICA UNA FOTO (file):
     la foto passa dal RITAGLIO (CropDialog: box libero, maniglie dentro la
     foto, rotazione, Azzera/Annulla/Conferma) e poi l'IA VISION la
     trascrive in latino (POST /api/ai/transcribe, kind "photo"); se
     l'IA non risponde, soccorso OCR locale (Tesseract) sulla stessa foto.
     La trascrizione finisce nel CAMPO DI TESTO e lascia SEMPRE il controllo
     finale allo studente (come nel Widget diventa UN PEZZO: qui il testo). */
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [cropImage, setCropImage] = useState<{ url: string } | null>(null);
  const [fotoBusy, setFotoBusy] = useState(false);
  const [fotoProgress, setFotoProgress] = useState(0);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const MAX_FOTO_BYTES = 18 * 1024 * 1024;
  /* onCropConfirm usa insertRecognized: il corpo vive dopo la sua
     dichiarazione (sotto), qui solo la firma (pattern onCropConfirmRef
     del Widget, per l'ordine delle dichiarazioni). */
  const onCropConfirmRef = useRef<(f: File) => Promise<void>>(() => Promise.resolve());

  /** La foto (fotocamera o file) passa prima dal ritaglio dei margini */
  const handleFotoFile = async (file: File) => {
    if (fotoBusy) return;
    if (file.size > MAX_FOTO_BYTES) {
      setOcrError("Il file è troppo grande (massimo 18 MB). Scatta o carica una foto più piccola e riprova.");
      return;
    }
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const isImage =
      file.type.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "bmp"].includes(ext);
    if (!isImage) {
      setOcrError("Formato non supportato: usa una foto (JPG, PNG, WEBP).");
      return;
    }
    try {
      const straight = await normalizePhoto(file);
      const url = URL.createObjectURL(straight);
      setCropImage((prev) => {
        if (prev) URL.revokeObjectURL(prev.url);
        return { url };
      });
    } catch {
      const url = URL.createObjectURL(file);
      setCropImage((prev) => {
        if (prev) URL.revokeObjectURL(prev.url);
        return { url };
      });
    }
  };

  /** Inserisce il testo riconosciuto nel campo (tronca oltre il limite) */
  const insertRecognized = (cleaned: string, viaAi: boolean) => {
    if (!cleaned) throw new Error("nessun testo riconosciuto");
    if (contaParole(cleaned) > MAX_PAROLE) {
      persistText(troncaParole(cleaned, MAX_PAROLE));
      toast.warning(
        `Il testo riconosciuto supera il limite di ${MAX_PAROLE} parole: ho inserito solo l'inizio (puoi modificarlo).`
      );
    } else {
      persistText(cleaned);
      toast.success(
        viaAi
          ? "L'intelligenza artificiale ha letto la foto e inserito il testo qui sopra — controllalo e premi COLORA FRASE CON IA"
          : "Testo riconosciuto e inserito qui sopra — controllalo e premi COLORA FRASE CON IA"
      );
    }
    document.querySelector("textarea")?.focus();
  };

  /** Riconoscimento OCR classico (Tesseract) — soccorso quando l'IA
   *  della foto non risponde: il flusso foto non si interrompe mai. */
  const runClassicOcr = async (file: File) => {
    const raw = await ocrImage(file, setFotoProgress);
    insertRecognized(cleanOcrText(raw), false);
  };

  /** Trascrizione vera e propria sul ritaglio confermato (stile Widget):
   *  `fileToScaledDataUrl` → `aiTranscribeImage(..., "photo")` → catch
   *  `AiUnavailableError` → `ocrImage` → `cleanOcrText` → testo nel campo.
   *  Errore → «foto più nitida, testo scuro su sfondo chiaro». */
  const runFotoTranscribe = async (file: File) => {
    setFotoBusy(true);
    setOcrError(null);
    setFotoProgress(0);
    try {
      try {
        const dataUrl = await fileToScaledDataUrl(file);
        const text = await aiTranscribeImage(dataUrl, "photo");
        insertRecognized(text, true);
      } catch (e) {
        if (e instanceof AiUnavailableError) {
          await runClassicOcr(file);
        } else {
          throw e;
        }
      }
    } catch {
      setOcrError(
        "Non sono riuscito a leggere il testo. Prova con una foto più nitida e con testo scuro su sfondo chiaro."
      );
    } finally {
      setFotoBusy(false);
      setFotoProgress(0);
    }
  };
  /* corpo di onCropConfirm (dichiarato DOPO: la ref sopra lo rende
     chiamabile da <CropDialog> senza errori d'ordine) */
  onCropConfirmRef.current = async (croppedFile: File) => {
    setCropImage((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return null;
    });
    await runFotoTranscribe(croppedFile);
  };

  /** Chiude il modale di taglio senza riconoscere nulla */
  const closeCrop = () => {
    setCropImage((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return null;
    });
  };

  /** Ritaglio confermato: avvia la trascrizione sul file ritagliato */
  const onCropConfirm = (croppedFile: File) => {
    void onCropConfirmRef.current(croppedFile);
  };

  /* Parola su cui è aperto il dialog colore e colore corrente */
  const targetToken =
    colorTarget && result ? (result.sentences[colorTarget.s]?.tokens[colorTarget.t] ?? null) : null;
  const targetKey = colorTarget ? `${colorTarget.s}:${colorTarget.t}` : null;
  // voce della palette corrente per la parola nel dialogo: l'ultima scelta
  // a mano (overrideVoci) oppure quella dell'analisi grammaticale — per VOCE
  // e non per colore: l'identità grammaticale non dipende dalla palette
  const targetAnalysis = targetToken?.analysis ?? null;
  const targetVoce =
    targetKey && targetAnalysis
      ? (overrideVoci[targetKey] ?? vocePerAnalisi(targetAnalysis))
      : null;

  return (
    <div className="lf-workspace-page flex min-h-dvh flex-col paper-bg">

      <main className="mx-auto w-full max-w-5xl flex-1 px-[16px] py-4 sm:px-4 sm:py-10 space-y-4 sm:space-y-6">
        {/* Input */}
        <section className="card-workspace p-4 sm:p-7">
          <div className="flex items-center justify-center gap-2 mb-1.5">
            <Wand2 className="h-5 w-5 text-[#8b3a1a]" />
            <h1 className="font-display text-sm font-bold tracking-tight text-center uppercase">
              Scrivi una o più frasi in latino
            </h1>
          </div>
          <Textarea
            value={text}
            onChange={(e) => {
              const v = e.target.value;
              persistText(contaParole(v) > MAX_PAROLE ? troncaParole(v, MAX_PAROLE) : v);
            }}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === "Enter") run(text);
            }}
            placeholder="Es. Puella fortiter pugnat.  (Ctrl+Invio per colorare)"
            rows={4}
            /* 26/10n: testo SEMPRE allineato a sinistra (non giustificato),
               sia scritto a mano che trascritto dall'OCR della foto.
               26/10r: niente più autosalvataggio: il draft vive solo in
               memoria finché l'utente non preme COLORA (il testo fotografato
               da mobile finiva nel riquadro desktop con regole vecchie). */
            className="min-h-[110px] bg-white border-2 border-[#b9a99c] rounded-2xl text-lg md:text-lg leading-relaxed text-left focus-visible:ring-[#8b3a1a]"
          />
          <div className="mt-1 flex items-center justify-end gap-1">
            <span
              className={`text-sm font-semibold ${
                contaParole(text) >= MAX_PAROLE ? "text-[#b71c1c]" : "text-[#5a4a38]"
              }`}
            >
              {contaParole(text)}/{MAX_PAROLE} parole
            </span>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <Button
              onClick={() => run(text)}
              disabled={analyze.isPending || !text.trim()}
              aria-label="Colora la frase con l'intelligenza artificiale"
              /* 26/10t: su mobile il pulsante occupa tutta la larghezza della card
                 (w-full, max 340px) e il testo può andare a capo centrato — prima
                 la scritta larga con tracking-widest sforava i margini; su desktop
                 resta a misura naturale (sm:w-auto). */
              className="h-auto w-full max-w-[340px] whitespace-normal rounded-xl border-2 border-[#8b3a1a] bg-[#8b3a1a] text-white hover:bg-[#713017] font-bold text-center leading-snug text-base tracking-wide px-5 py-4 transition-all duration-200 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed sm:w-auto sm:max-w-none sm:tracking-widest sm:px-6"
            >
              {analyze.isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  L'IA STA COLORANDO…
                </>
              ) : (
                <>
                  <Bot className="mr-2 h-5 w-5" aria-hidden="true" />
                  COLORA FRASE CON IA
                </>
              )}
            </Button>
          </div>
          {analyze.isError && (
            <p className="mt-3 text-sm font-semibold text-[#b71c1c]">
              Ops, qualcosa è andato storto. Riprova tra un momento.
            </p>
          )}

          {/* Foto del testo (tool del Widget metacognitivo): SCATTA (fotocamera)
              oppure CARICA (file) — la foto passa dal ritaglio e l'IA la
              trascrive nel campo qui sopra (mai analisi automatica). */}
          <div className="mt-4 pt-2 sm:mt-6 sm:pt-5">
            <div className="lf-photo-actions mx-auto grid w-full max-w-md gap-3">
              <button
                type="button"
                disabled={fotoBusy}
                aria-label="Scatta una foto del testo latino con la fotocamera posteriore"
                onClick={() => cameraInputRef.current?.click()}
                className="inline-flex min-h-[44px] min-w-0 w-full max-w-full cursor-pointer select-none flex-wrap items-center justify-center gap-1 rounded-full border-2 border-[#d4b2a0] bg-[#f0e5df] px-2 py-2.5 text-center text-base font-bold leading-snug text-[#713017] shadow-sm transition-all hover:bg-[#e9d7cd] disabled:cursor-not-allowed disabled:opacity-50 sm:gap-2 sm:px-5"
              >
                <Camera className="h-4 w-4" aria-hidden="true" />
                {fotoBusy ? "LETTURA DELLA FOTO…" : "SCATTA UNA FOTO DEL TESTO"}
              </button>
              <button
                type="button"
                disabled={fotoBusy}
                aria-label="Carica una foto del testo latino dal dispositivo"
                onClick={() => uploadInputRef.current?.click()}
                className="inline-flex min-h-[44px] min-w-0 w-full max-w-full cursor-pointer select-none flex-wrap items-center justify-center gap-1 rounded-full border-2 border-[#d4b2a0] bg-[#f0e5df] px-2 py-2.5 text-center text-base font-bold leading-snug text-[#713017] shadow-sm transition-all hover:bg-[#e9d7cd] disabled:cursor-not-allowed disabled:opacity-50 sm:gap-2 sm:px-5"
              >
                <Upload className="h-4 w-4" aria-hidden="true" />
                CARICA UNA FOTO
              </button>
            </div>
            {fotoBusy && fotoProgress > 0 && (
              <p className="mt-2 text-center text-xs font-bold text-[#5a4a38]" role="status" aria-live="polite">
                RICONOSCIMENTO IN CORSO… {Math.round(fotoProgress * 100)}%
              </p>
            )}
            {ocrError && (
              <p className="mt-2 text-center text-sm font-semibold text-[#b71c1c]">
                {ocrError}
              </p>
            )}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFotoFile(f);
                e.target.value = "";
              }}
            />
            <input
              ref={uploadInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFotoFile(f);
                e.target.value = "";
              }}
            />
          </div>
        </section>

        {/* Risultato */}
        {result && (
          <section className="card-workspace p-4 sm:p-7">
            <div className="mb-1 flex flex-wrap items-center justify-center gap-2">
              <div className="font-display text-lg font-bold tracking-tight flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#8b3a1a]" />
                FRASE COLORATA
              </div>
              <ColorBadge source={colorSource} />
            </div>
            <p className="text-[0.8rem] text-[#5a4a38] mt-4 mb-6 text-center sm:mb-14">
              Clicca su una parola per cambiarne il colore. Quando l'IA non è
              disponibile, l'app usa le regole grammaticali.
            </p>

            {/* Banner «Parole non riconosciute» RIMOSSO (richiesta utente 26/10):
                non deve MAI più comparire, in nessun caso. Le parole non
                riconosciute restano semplicemente col chip BIANCO e scritta
                nera, come spiegato nella nota sotto la legenda. */}

            <div className="space-y-4">
              {result.sentences.map((group, si) => (
                <div key={si} className="space-y-2">
                  <SentenceViewport sentenceIndex={si}>
                    {group.tokens.map((tok, ti) => (
                      <TokenChip
                        key={ti}
                        token={tok}
                        index={ti}
                        overrideColor={colorOverrides[`${si}:${ti}`] ?? null}
                        underlineOverride={underlineOverrides[`${si}:${ti}`]}
                        onClick={() => setColorTarget({ s: si, t: ti })}
                      />
                    ))}
                  </SentenceViewport>
                  {writingTranslation && (
                    <div className="rounded-xl border-2 border-[#c9b6a7] bg-[#f4ebe4] px-3 py-2.5">
                      <label
                        htmlFor={`user-translation-${si}`}
                        className="mb-1 flex items-center gap-1.5 text-[0.72rem] font-bold uppercase tracking-widest text-[#713017]"
                      >
                        <Pencil className="h-3 w-3" />
                        Traduzione della frase {si + 1}
                      </label>
                      <Textarea
                        id={`user-translation-${si}`}
                        value={userTranslations[si] ?? ""}
                        onChange={(e) =>
                          setUserTranslations((prev) => {
                            const next = [...prev];
                            next[si] = e.target.value;
                            return next;
                          })
                        }
                        rows={2}
                        className="min-h-[56px] w-full bg-white border-2 border-[#c9b6a7] rounded-xl text-[0.95rem] leading-relaxed focus-visible:ring-[#8b3a1a]"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {showTranslation && (
              <div className="mt-12 rounded-2xl border-2 border-[#c9b6a7] bg-[#f4ebe4] px-5 py-4">
                {/* 26/10t: su mobile scritta e pillola SEMPRE centrate e impilate
                    (colonna centrata, gap 2) — prima justify-between lasciava la
                    scritta a sinistra e la pillola a destra, disallineate; su
                    desktop resta la riga affiancata (sm:flex-row). */}
                <div className="mb-2 flex flex-col items-center gap-2 sm:flex-row sm:flex-wrap sm:justify-between">
                  <span className="font-display text-center text-sm font-bold uppercase tracking-widest text-[#713017]">
                    Traduzione in italiano
                  </span>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {translate.data && <SourceBadge source={translate.data.source} />}
                    {editedLines && !editingLines && (
                      <span className="inline-flex items-center gap-1 rounded-full border-2 border-[#00695c]/60 bg-[#e2f3ef] px-2.5 py-1 text-[0.72rem] font-bold uppercase tracking-wide text-[#00695c]">
                        <Pencil className="h-3 w-3" />
                        modificata
                      </span>
                    )}
                  </div>
                </div>

                {editingLines ? (
                  <div className="space-y-3">
                    {draftLines.map((line, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <Textarea
                          value={line}
                          onChange={(e) =>
                            setDraftLines((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))
                          }
                          rows={Math.max(2, Math.min(4, Math.ceil(line.length / 60)))}
                          className="min-h-[56px] flex-1 bg-white border-2 border-[#c9b6a7] rounded-xl text-[0.95rem] leading-relaxed focus-visible:ring-[#8b3a1a]"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setDraftLines((prev) => prev.filter((_, j) => j !== i))}
                          title="Rimuovi questa frase"
                          aria-label="Rimuovi questa frase"
                          className="shrink-0 border-2 border-[#b71c1c]/50 text-[#b71c1c]"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDraftLines((prev) => [...prev, ""])}
                        className="rounded-full border-2 border-[#8b3a1a] px-4 py-2 text-sm font-bold text-[#713017]"
                      >
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        AGGIUNGI FRASE
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingLines(false)}
                        className="rounded-full border-2 border-[#3a2a1e] px-4 py-2 text-sm font-bold text-[#3a2a1e]"
                      >
                        <X className="mr-1.5 h-3.5 w-3.5" />
                        ANNULLA
                      </Button>
                      <Button
                        size="sm"
                        onClick={saveEditedTranslation}
                        disabled={recolor.isPending}
                        className="rounded-full border-2 border-[#8b3a1a] bg-[#8b3a1a] px-4 py-2 text-sm font-bold text-white hover:bg-[#713017]"
                      >
                        {recolor.isPending ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        SALVA
                      </Button>
                    </div>
                  </div>
                ) : translate.isPending || (!translate.data && !translate.isError) ? (
                  <p className="flex items-center gap-2 text-sm font-semibold text-[#2e2018]">
                    <Loader2 className="h-4 w-4 animate-spin text-[#8b3a1a]" />
                    Traduzione in corso...
                  </p>
                ) : translate.isError ? (
                  <p className="text-sm font-semibold text-[#b71c1c]">
                    Non è stato possibile tradurre. Riprova tra un momento.
                  </p>
                ) : translate.data ? (
                  <>
                    {/* 26/10u: traduzione SEMPRE allineata a sinistra (non giustificata),
                        come la textarea principale */}
                    <div className="my-8 space-y-2 text-left text-[0.95rem] leading-loose text-[#2e2018]">
                      {(editedLines ?? translate.data.lines).map((line, i) => (
                        <p key={i} className="text-left">{line}</p>
                      ))}
                    </div>
                    <div className="-mx-3 mt-6 flex flex-wrap justify-center gap-2 sm:mx-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={startEditTranslation}
                        className="h-auto max-w-full flex-wrap gap-1 whitespace-normal! rounded-3xl border-2 border-[#8b3a1a] px-2 py-2 text-center text-sm font-bold text-[#713017] has-[>svg]:px-2 sm:gap-1.5 sm:px-4 sm:has-[>svg]:px-3"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        MODIFICA TRADUZIONE
                      </Button>
                      {editedLines && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={restoreOriginalTranslation}
                          disabled={recolor.isPending}
                          className="h-auto max-w-full flex-wrap gap-1 whitespace-normal! rounded-3xl border-2 border-[#3a2a1e] px-2 py-2 text-center text-sm font-bold text-[#3a2a1e] has-[>svg]:px-2 sm:gap-1.5 sm:px-4 sm:has-[>svg]:px-3"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          RIPRISTINA ORIGINALE
                        </Button>
                      )}
                    </div>
                  </>
                ) : null}
              </div>
            )}

            {writingTranslation && (
              <div className="-mx-3 mt-8 flex flex-wrap items-center justify-center gap-3 sm:mx-0">
                <Button
                  variant="outline"
                  onClick={() => void handleExportUserTranslations()}
                  disabled={exporting}
                  /* h-auto conserva spazio su più righe. Il contenitore
                     adattivo e flex-wrap tengono testo e icona leggibili
                     anche con il font al massimo su telefono; le parole
                     non vengono spezzate e non parte alcun download. */
                  className="h-auto max-w-full flex-wrap gap-1 whitespace-normal! rounded-full px-2 py-3 text-center text-base font-bold leading-snug border-2 border-[#8b3a1a] text-white bg-[#8b3a1a] hover:bg-[#713017] disabled:opacity-60 has-[>svg]:px-2 sm:gap-2 sm:px-5 sm:py-3.5 sm:has-[>svg]:px-3"
                >
                  {exporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  SALVA TRADUZIONE NEL PDF
                </Button>
              </div>
            )}

            <div className="-mx-3 mt-10 grid auto-rows-fr grid-cols-[repeat(auto-fit,minmax(min(100%,17.5rem),17.5rem))] justify-center gap-3 sm:mx-0">
              <Button
                variant="outline"
                onClick={() => {
                  if (result) syncUserTranslations(result.sentences.length);
                  setWritingTranslation((v) => !v);
                }}
                className="h-auto min-h-[60px] w-full max-w-[17.5rem] flex-wrap gap-1 whitespace-normal rounded-full px-2 py-1 text-center text-base font-bold border-2 border-[#8b3a1a] text-[#713017] bg-white hover:bg-[#f0e5df] has-[>svg]:px-2 sm:gap-2 sm:px-4 sm:has-[>svg]:px-3"
              >
                <Pencil className="h-4 w-4" />
                {writingTranslation ? "CHIUDI I CAMPI" : "SCRIVI LA TRADUZIONE"}
              </Button>
              <Button
                variant="outline"
                onClick={toggleTranslation}
                disabled={translate.isPending}
                className="h-auto min-h-[60px] w-full max-w-[17.5rem] flex-wrap gap-1 whitespace-normal rounded-full px-2 py-1 text-center text-base font-bold border-2 border-[#8b3a1a] text-[#713017] bg-white hover:bg-[#f0e5df] has-[>svg]:px-2 sm:gap-2 sm:px-4 sm:has-[>svg]:px-3"
              >
                {translate.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : showTranslation ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Languages className="h-4 w-4" />
                )}
                {showTranslation ? "NASCONDI TRADUZIONE" : "MOSTRA TRADUZIONE"}
              </Button>
              <Button
                variant="outline"
                onClick={() => void handleExport()}
                disabled={exporting}
                className="h-auto min-h-[60px] w-full max-w-[17.5rem] flex-wrap gap-1 whitespace-normal rounded-full px-2 py-1 text-center text-base font-bold border-2 border-[#8b3a1a] text-[#713017] bg-white hover:bg-[#f0e5df] has-[>svg]:px-2 sm:gap-2 sm:px-4 sm:has-[>svg]:px-3"
              >
                {exporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileDown className="h-4 w-4" />
                )}
                SCARICA IL PDF
              </Button>
            </div>

          </section>
        )}

        {/* La legenda compare solo quando una frase colorata è già disponibile;
            durante una nuova analisi resta nascosta fino al risultato. */}
        {!analyze.isPending && result?.sentences.some((sentence) =>
          sentence.tokens.some((token) => !token.isPunct && Boolean(token.analysis))
        ) && <LegendPanel />}

      </main>

      <ColorDialog
        token={targetToken}
        currentVoce={targetVoce}
        underlined={
          targetKey
            ? (underlineOverrides[targetKey] ?? targetAnalysis?.voice === "passivo")
            : false
        }
        onToggleUnderline={() => {
          if (!targetKey) return;
          const current =
            underlineOverrides[targetKey] ?? targetAnalysis?.voice === "passivo";
          setUnderlineOverrides((prev) => ({ ...prev, [targetKey]: !current }));
        }}
        onPick={pickColor}
        onOpenChange={(open) => !open && setColorTarget(null)}
      />

      <CropDialog
        open={!!cropImage}
        imageUrl={cropImage?.url ?? null}
        onConfirm={onCropConfirm}
        onClose={closeCrop}
      />
    </div>
  );
}
