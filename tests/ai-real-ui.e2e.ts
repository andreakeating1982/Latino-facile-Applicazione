import { chromium } from "playwright";
import fs from "node:fs/promises";

// Test reale, attivabile solo esplicitamente. Frase sintetica; nessun dato
// studente, nessun mock di rete e nessuna operazione su database.
if (!process.argv.includes("--real")) {
  console.log("Per il collaudo reale specificare --real.");
  process.exit(0);
}
const base = process.env.AI_REAL_QA_BASE_URL ?? "http://127.0.0.1:3000";
const output = process.env.AI_REAL_QA_OUTPUT ?? "/tmp/latino-ai-real-ui";
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1100, height: 850 } });
const api: { path: string; status: number; sources?: unknown }[] = [];
page.on("response", async (res) => {
  if (!res.url().includes("/api/trpc/latino.")) return;
  const entry: { path: string; status: number; sources?: unknown } = {
    path: new URL(res.url()).pathname,
    status: res.status(),
  };
  try {
    const data = await res.json();
    const entries = Array.isArray(data) ? data : [data];
    entry.sources = entries.map((x) => ({
      source: x?.result?.data?.json?.source ?? null,
      colorSource: x?.result?.data?.json?.colorSource ?? null,
    }));
  } catch { /* l'esito HTTP resta registrato */ }
  api.push(entry);
});
try {
  await page.goto(`${base}/app`, { waitUntil: "domcontentloaded" });
  await page.locator("textarea").fill("Puella rosam rubram videt.");
  const start = Date.now();
  await page.getByRole("button", { name: /Colora la frase con l.intelligenza artificiale/i }).click();
  await page.getByText("Colorata con IA", { exact: true }).waitFor({ timeout: 95_000 });
  const translationButton = page.getByRole("button", { name: "MOSTRA TRADUZIONE" });
  await translationButton.waitFor({ state: "visible" });
  await translationButton.click({ timeout: 45_000 });
  await page.getByText("Tradotta con IA", { exact: true }).waitFor({ timeout: 30_000 });
  const result = {
    success: true,
    durationMs: Date.now() - start,
    colorBadge: await page.getByText("Colorata con IA", { exact: true }).textContent(),
    translationBadge: await page.getByText("Tradotta con IA", { exact: true }).textContent(),
    translation: (await page.locator("div.my-8.space-y-2.text-left p").allTextContents()).join(" ").trim(),
    api,
  };
  await page.screenshot({ path: `${output}/desktop-risultato-reale.png`, fullPage: true });
  await fs.writeFile(`${output}/results.json`, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  await page.screenshot({ path: `${output}/errore.png`, fullPage: true }).catch(() => {});
  console.error(JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error), api }, null, 2));
  process.exitCode = 1;
} finally {
  await browser.close();
}

