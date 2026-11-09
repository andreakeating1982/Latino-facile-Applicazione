import "dotenv/config";
import { verifyWithAI } from "../server/analyzer/verifyAI";
import type { SentenceGroup } from "../shared/types";

// Test esplicitamente richiesto (--real), con una frase sintetica, senza dati
// studente. Esegue il vero prompt dell'app e non modifica il database.
if (!process.argv.includes("--real")) {
  console.log("Per un controllo reale e deliberato, passare --real.");
  process.exit(0);
}
const texts = process.argv.includes("--multi")
  ? ["Marcus in horto laborat.", "Amicae rosas pueris dant.", "Servi a domino laudantur."]
  : ["Puella rosam rubram videt."];
const groups: SentenceGroup[] = texts.map((text) => ({
  tokens: (text.match(/[A-Za-zÀ-ÿ]+/g) ?? []).map((word) => ({
    text: word,
    word: word.toLowerCase(),
    trailing: "",
    isPunct: false,
    analysis: null,
  })),
}));
const start = Date.now();
const result = await verifyWithAI(texts, texts.map(() => "(mancante)"), groups);
const outcome = {
  test: "frasi sintetiche, traduzioni e ruoli dal servizio IA reale; nessun database",
  durationMs: Date.now() - start,
  translationsPresent: result?.lines.filter(Boolean).length ?? 0,
  expectedTranslations: texts.length,
  translations: result?.lines ?? [],
  roles: result?.roles ?? {},
  success: result?.lines.length === texts.length && result.lines.every(Boolean) && Object.keys(result.roles).length > 0,
};
console.log(JSON.stringify(outcome, null, 2));
if (!outcome.success) process.exitCode = 1;

