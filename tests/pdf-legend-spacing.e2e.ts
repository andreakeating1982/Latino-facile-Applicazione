import { chromium, type Page } from "playwright";
import fs from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { PDFDocument } from "pdf-lib";
import superjson from "superjson";
import { optionColor } from "../server/analyzer/index";
import { LEGEND_ITEMS, type AnalysisOption, type TokenData } from "../shared/types";

// Percorso PDF reale dal browser; le risposte IA sono simulate, nessun DB o dato personale.
const base = process.env.PDF_SPACING_QA_BASE_URL ?? "http://127.0.0.1:3000";
const output = process.env.PDF_SPACING_QA_OUTPUT ?? "/tmp/latino-pdf-spacing";
await fs.mkdir(output, { recursive: true });
const words: [string, Partial<AnalysisOption>][] = [
  ["Puella", { pos: "nome", case: "nominativo", number: "singolare" }],
  ["rosam", { pos: "nome", case: "accusativo", number: "singolare" }],
  ["videt", { pos: "verbo", mood: "indicativo" }],
];
const tokens: TokenData[] = words.map(([word, attrs], i) => {
  const option = { lemma: word.toLowerCase(), summary: "", translation: "", form: word.toLowerCase(), freq: 1, desc: attrs.mood ?? attrs.case ?? "", raw: "", ...attrs } as AnalysisOption;
  return { text: word, word: word.toLowerCase(), trailing: i === words.length - 1 ? "." : "", isPunct: false,
    analysis: { word: word.toLowerCase(), display: word, options: [option], selected: 0, category: option.pos, color: optionColor(option), label: option.desc, source: "manuale", number: option.number } };
});
const checks: { name: string; ok: boolean; detail?: unknown }[] = [];
function check(name: string, ok: boolean, detail?: unknown) {
  checks.push({ name, ok, detail });
  if (!ok) throw new Error(`${name}: ${JSON.stringify(detail)}`);
}
async function mockApi(page: Page, count: number) {
  const sentences = Array.from({ length: count }, () => ({ tokens }));
  await page.route("**/api/trpc/**", (route) => {
    const url = new URL(route.request().url());
    const paths = url.pathname.split("/api/trpc/")[1].split(",");
    const data = paths.map((path) => {
      let value: unknown = null;
      if (path === "latino.analyze") value = { sentences, unknownWords: [], apiUsed: false, colorSource: "regole" };
      if (path === "latino.translate") value = { coloredSentences: sentences, lines: sentences.map(() => "La ragazza vede la rosa."), source: "ai", colorSource: "ai" };
      return { result: { data: superjson.serialize(value) } };
    });
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(url.searchParams.get("batch") === "1" ? data : data[0]) });
  });
}
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
let shortText = "";
try {
  for (const scenario of [
    { name: "esempio-desktop", width: 1280, count: 1, translations: false },
    { name: "esempio-mobile", width: 390, count: 1, translations: false },
    { name: "traduzioni-multipagina", width: 1280, count: 9, translations: true },
  ]) {
    const context = await browser.newContext({ viewport: { width: scenario.width, height: 900 }, hasTouch: scenario.width < 500, isMobile: scenario.width < 500, acceptDownloads: true });
    const page = await context.newPage();
    const errors: string[] = [];
    let downloadCount = 0;
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("download", () => { downloadCount++; });
    await mockApi(page, scenario.count);
    await page.goto(`${base}/app`, { waitUntil: "domcontentloaded" });
    await page.locator("textarea").first().fill(Array.from({ length: scenario.count }, () => "Puella rosam videt.").join(" "));
    await page.getByRole("button", { name: /Colora la frase con l.intelligenza artificiale/i }).click();
    await page.getByRole("button", { name: /Cambia colore o sottolineatura di puella/i }).first().waitFor();
    await page.locator(".card-paper").filter({ hasText: "I colori delle frasi" }).waitFor();
    if (scenario.translations) {
      await page.getByRole("button", { name: "SCRIVI LA TRADUZIONE" }).click();
      for (let i = 0; i < scenario.count; i++) {
        await page.getByLabel(`Traduzione della frase ${i + 1}`).fill(`Esempio ${i + 1}: La ragazza vede la rosa nel giardino. Una frase di prova sufficientemente lunga da occupare più righe nel documento.`);
      }
      await page.getByRole("button", { name: "SALVA TRADUZIONE NEL PDF" }).click();
      await page.getByText("Traduzione salvata per il PDF.").waitFor();
      await page.waitForTimeout(250);
      check(`${scenario.name}: salvare le traduzioni non scarica automaticamente`, downloadCount === 0, { downloadCount });
    }
    const pending = page.waitForEvent("download");
    await page.getByRole("button", { name: "SCARICA IL PDF" }).click();
    const download = await pending;
    const path = `${output}/${scenario.name}.pdf`;
    await download.saveAs(path);
    const bytes = await fs.readFile(path);
    const doc = await PDFDocument.load(bytes);
    const text = execFileSync("pdftotext", ["-raw", path, "-"], { encoding: "utf8" });
    const lastPage = execFileSync("pdftotext", ["-raw", "-f", String(doc.getPageCount()), "-l", String(doc.getPageCount()), path, "-"], { encoding: "utf8" });
    const embeddedFonts = execFileSync("pdffonts", [path], { encoding: "utf8" });
    check(`${scenario.name}: scarica un PDF A4 leggibile`, bytes.length > 5000 && Math.abs(doc.getPage(0).getWidth() - 595.28) < 0.1 && Math.abs(doc.getPage(0).getHeight() - 841.89) < 0.1, { pages: doc.getPageCount(), bytes: bytes.length });
    check(`${scenario.name}: entrambi i font OpenDyslexic sono incorporati`, /OpenDyslexic-Bold.*\byes\b/.test(embeddedFonts) && /OpenDyslexic-Regular.*\byes\b/.test(embeddedFonts), embeddedFonts);
    const labels = LEGEND_ITEMS.flatMap((item) => item.numero ? [`${item.label} SINGOLARE`, `${item.label} PLURALE`] : [item.label]);
    check(`${scenario.name}: legenda e note complete nell'ultima pagina`, lastPage.includes("I COLORI DELLE FRASI") && labels.every((label) => lastPage.includes(label)) && lastPage.includes("Le parole non riconosciute dall'IA") && lastPage.includes("SOTTOLINEATO"), { missingLabels: labels.filter((label) => !lastPage.includes(label)) });
    check(`${scenario.name}: nessun errore JavaScript`, errors.length === 0, errors);
    if (!scenario.translations) {
      check(`${scenario.name}: frase breve e legenda in una pagina`, doc.getPageCount() === 1 && text.includes("puella"), { pages: doc.getPageCount() });
      if (!shortText) shortText = text;
      else check("desktop e telefono: contenuti del PDF identici", text === shortText);
    } else {
      check(`${scenario.name}: documento multipagina`, doc.getPageCount() > 1, { pages: doc.getPageCount() });
      check(`${scenario.name}: ogni traduzione salvata è inclusa`, (text.match(/Traduzione:/g) ?? []).length === scenario.count && text.includes("Esempio 1:") && text.includes(`Esempio ${scenario.count}:`));
    }
    await context.close();
  }
} finally {
  await fs.writeFile(`${output}/results.json`, JSON.stringify(checks, null, 2));
  await browser.close();
}
console.log(JSON.stringify(checks, null, 2));

