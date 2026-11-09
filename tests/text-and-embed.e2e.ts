import { chromium, type BrowserContext, type Page } from "playwright";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import superjson from "superjson";
import { optionColor } from "../server/analyzer/index";
import type { AnalysisOption, TokenData } from "../shared/types";

// Prove di UI e cornice con testi sintetici e API simulate. Nessun dato reale.
const base = (process.env.TEXT_EMBED_QA_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const output = process.env.TEXT_EMBED_QA_OUTPUT ?? "/tmp/latino-testo-cornice-qa";
await fs.mkdir(output, { recursive: true });
const results: { name: string; ok: boolean; detail?: unknown }[] = [];
function check(name: string, ok: boolean, detail?: unknown) {
  results.push({ name, ok, detail });
  if (!ok) throw new Error(`${name}: ${JSON.stringify(detail)}`);
}

const words: [string, Partial<AnalysisOption>][] = [
  ["Puella", { pos: "nome", case: "nominativo", number: "singolare" }],
  ["rosam", { pos: "nome", case: "accusativo", number: "singolare" }],
  ["rubram", { pos: "aggettivo", case: "accusativo", number: "singolare" }],
  ["videt", { pos: "verbo", mood: "indicativo" }],
];
const tokens: TokenData[] = words.map(([word, attrs]) => {
  const opt = {
    lemma: word.toLowerCase(), summary: "", translation: "", form: word.toLowerCase(),
    freq: 1, desc: attrs.mood ?? attrs.case ?? "", raw: "", ...attrs,
  } as AnalysisOption;
  return {
    text: word, word: word.toLowerCase(), trailing: "", isPunct: false,
    analysis: { word: word.toLowerCase(), display: word, options: [opt], selected: 0,
      category: opt.pos, color: optionColor(opt), label: opt.desc, source: "manuale", number: opt.number },
  };
});
const sentences = [{ tokens }];
const seen: string[] = [];
async function mockApi(context: BrowserContext) {
  await context.route("**/api/trpc/**", async (route) => {
    const url = new URL(route.request().url());
    const paths = url.pathname.split("/api/trpc/")[1].split(",");
    seen.push(...paths);
    const data = paths.map((path) => {
      let value: unknown = null;
      if (path === "latino.analyze") value = { sentences, unknownWords: [], apiUsed: false, colorSource: "regole" };
      if (path === "latino.translate") value = { coloredSentences: sentences, lines: ["La ragazza vede la rosa rossa."], source: "ai", colorSource: "ai" };
      if (path === "latino.recolor") value = { coloredSentences: sentences, colorSource: "ai" };
      return { result: { data: superjson.serialize(value) } };
    });
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(url.searchParams.get("batch") === "1" ? data : data[0]) });
  });
}

function sha256(value: string) { return createHash("sha256").update(value).digest("hex"); }
const blogFragment = await fs.readFile("cornice-dinamica/embed-latino-facile-blog-v4.html", "utf8");
const previousV3 = await fs.readFile("cornice-dinamica/embed-latino-facile-dedicata.html", "utf8");
const v3Fixture = await fs.readFile("client/public/cornice-test/embed-latino-facile-dedicata.html", "utf8");
const scriptBlock = blogFragment.match(/<script>\n[\s\S]*?<\/script>\n/)?.[0] ?? "";
const styleBlock = blogFragment.match(/<style>\n[\s\S]*?<\/style>\n/)?.[0] ?? "";
check("La cornice v4 conserva byte per byte lo script pubblico anti-tremolio", sha256(scriptBlock) === "32ab3d7709db50379b9b9d38077c77acefa1ef7093051bdc41f4b1372c9c4e39");
check("La cornice v4 conserva byte per byte lo stile pubblico", sha256(styleBlock) === "cefcb861e4412480b2ddd486e233d3f742763e91a0929b2608d934851bde3d11");
check("Il codice v4 mantiene l'URL pubblico e le difese di isolamento", blogFragment.includes("https://latino-facile-app-2.easy-peasy.site/") && blogFragment.includes("ultimaApplicazione") && blogFragment.includes("e.source !== iframe.contentWindow") && blogFragment.includes("e.data.cornice !== token"));
check("La fixture v3 e il suo sorgente coincidono", previousV3 === v3Fixture);

const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
let completed = false;
try {
  for (const width of [320, 390, 768, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 850 }, hasTouch: width <= 390, isMobile: width <= 390 });
    await mockApi(context);
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${base}/app`, { waitUntil: "domcontentloaded" });
    await page.locator("textarea").first().fill("Puella rosam rubram videt.");
    await page.getByRole("button", { name: /Colora la frase con l.intelligenza artificiale/i }).click();
    await page.getByText("Colorata con IA", { exact: true }).waitFor();
    await page.getByRole("button", { name: "MOSTRA TRADUZIONE" }).click();
    await page.getByText("Tradotta con IA", { exact: true }).waitFor();
    await page.getByRole("button", { name: "MODIFICA TRADUZIONE" }).click();
    const editing = page.locator("textarea").last();
    await editing.waitFor({ state: "visible" });
    const actionNames = ["AGGIUNGI FRASE", "ANNULLA", "SALVA"];
    check(`${width}px: nota rimossa e comandi di modifica presenti`, await page.getByText(/Aggiungi o togli parole/i).count() === 0 && (await Promise.all(actionNames.map((name) => page.getByRole("button", { name, exact: true }).isVisible()))).every(Boolean));
    const beforeRecolor = seen.filter((name) => name === "latino.recolor").length;
    await editing.fill("La fanciulla osserva una rosa rossa.");
    // In produzione la risposta simulata può arrivare dopo l'aggiornamento del
    // testo: attendere la vera richiesta evita falsi negativi intermittenti.
    const recolorDone = page.waitForResponse((r) => r.url().includes("latino.recolor"), { timeout: 25000 });
    await page.getByRole("button", { name: "SALVA", exact: true }).click();
    await recolorDone;
    await page.getByText("La fanciulla osserva una rosa rossa.", { exact: true }).waitFor();
    await page.getByText("Colorata con IA", { exact: true }).waitFor();
    check(`${width}px: la traduzione modificata è salvata e la ricolorazione è invocata`, seen.filter((name) => name === "latino.recolor").length === beforeRecolor + 1 && await page.getByRole("button", { name: "RIPRISTINA ORIGINALE" }).isVisible());
    const dims = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
    check(`${width}px: editor e pagina senza overflow orizzontale`, dims.scrollWidth <= dims.width + 1, dims);
    check(`${width}px: nessun errore JavaScript`, errors.length === 0, errors);
    await page.getByRole("button", { name: "MODIFICA TRADUZIONE" }).click();
    const panel = page.getByText("Traduzione in italiano", { exact: true }).locator("..").locator("..");
    const bounds = await Promise.all([editing, ...actionNames.map((name) => page.getByRole("button", { name, exact: true }))].map((el) => el.boundingBox()));
    const panelBox = await panel.boundingBox();
    const contained = Boolean(panelBox && bounds.every((r) => r && r.x >= panelBox.x - 1 && r.x + r.width <= panelBox.x + panelBox.width + 1 && r.y >= panelBox.y - 1 && r.y + r.height <= panelBox.y + panelBox.height + 1));
    const distinct = bounds.every((a, i) => bounds.every((b, j) => i === j || !a || !b || Math.min(a.x + a.width, b.x + b.width) <= Math.max(a.x, b.x) || Math.min(a.y + a.height, b.y + b.height) <= Math.max(a.y, b.y)));
    check(`${width}px: campo e comandi di modifica restano nel pannello senza sovrapporsi`, contained && distinct, { bounds, panelBox });
    if (width === 320) {
      // Aspetta la scomparsa del toast temporaneo, per valutare il pannello reale.
      await page.waitForTimeout(4500);
      await panel.screenshot({ path: `${output}/editor-panel-${width}.png` });
    }
    await page.getByRole("button", { name: "SALVA", exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${output}/editor-${width}.png` });
    await context.close();
  }

  // La cornice di prova usa esattamente il v4 del post, con sola origine di anteprima.
  for (const width of [320, 390, 768, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 850 }, hasTouch: width <= 390, isMobile: width <= 390 });
    await mockApi(context);
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${base}/cornice-test/anteprima-latino-facile-v4.html`, { waitUntil: "domcontentloaded" });
    await page.locator(".lf-cornice").waitFor();
    const frame = page.frameLocator("iframe.lf-iframe");
    await frame.getByLabel("Nome", { exact: true }).waitFor({ timeout: 20000 });
    await page.waitForFunction(() => {
      const f = document.querySelector("iframe.lf-iframe") as HTMLIFrameElement | null;
      return Boolean(f && parseFloat(f.style.height) >= 100);
    }, undefined, { timeout: 15000 });
    const info = await page.evaluate(() => {
      const controls = [...document.querySelectorAll<HTMLButtonElement>(".lf-full, .lf-reload")];
      return controls.map((button) => {
        const svg = button.querySelector("svg")!;
        const path = svg.querySelector("path")!;
        const bbox = path.getBBox();
        const r = svg.getBoundingClientRect(), br = button.getBoundingClientRect();
        return { label: button.getAttribute("aria-label"), paths: svg.querySelectorAll("path").length,
          direct: path.parentElement === svg, nested: path.querySelectorAll("path").length,
          moves: (path.getAttribute("d")?.match(/M/g) ?? []).length,
          box: { x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height },
          icon: { left: r.left, right: r.right, top: r.top, bottom: r.bottom },
          button: { left: br.left, right: br.right, top: br.top, bottom: br.bottom } };
      });
    });
    check(`${width}px: entrambi i simboli sono completi, non annidati e interni ai pulsanti`, info.length === 2 && info.every((i, n) => i.paths === 1 && i.direct && i.nested === 0 && i.moves === (n === 0 ? 4 : 2) && i.box.width >= 16 && i.box.height >= 16 && i.icon.left >= i.button.left && i.icon.right <= i.button.right && i.icon.top >= i.button.top && i.icon.bottom <= i.button.bottom), info);
    await page.locator(".lf-testata").screenshot({ path: `${output}/cornice-${width}.png` });
    await page.evaluate(() => {
      (window as unknown as { __qaReloads: number }).__qaReloads = 0;
      document.querySelector("iframe.lf-iframe")!.addEventListener("load", () => {
        (window as unknown as { __qaReloads: number }).__qaReloads++;
      });
    });
    const srcBefore = await page.locator("iframe.lf-iframe").getAttribute("src");
    await page.locator(".lf-reload").click();
    await page.waitForFunction(() => (window as unknown as { __qaReloads: number }).__qaReloads >= 1, undefined, { timeout: 15000 });
    await frame.getByLabel("Nome", { exact: true }).waitFor({ timeout: 20000 });
    const srcAfter = await page.locator("iframe.lf-iframe").getAttribute("src");
    check(`${width}px: Ricarica ricarica solo l'app conservando il token`, srcBefore === srcAfter && Boolean(srcAfter && new URL(srcAfter).searchParams.get("cornice")));
    await page.locator(".lf-full").click();
    await page.waitForFunction(() => Boolean(document.fullscreenElement), undefined, { timeout: 8000 });
    const entered = await page.evaluate(() => document.fullscreenElement?.classList.contains("lf-cornice") ?? false);
    await page.locator(".lf-full").click();
    await page.waitForFunction(() => !document.fullscreenElement, undefined, { timeout: 8000 });
    check(`${width}px: Schermo intero apre e chiude la cornice`, entered);
    const overflow = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, total: document.documentElement.scrollWidth }));
    check(`${width}px: nessun overflow orizzontale né errore JavaScript della cornice`, overflow.total <= overflow.viewport + 1 && errors.length === 0, { overflow, errors });
    await context.close();
  }

  // Riproduce la perdita della chiusura dei <path> da parte dell'editor di Blogger.
  // Ogni SVG ora contiene un solo path: il parser non può annidarne un secondo.
  const context = await browser.newContext({ viewport: { width: 390, height: 900 }, hasTouch: true, isMobile: true });
  await mockApi(context);
  const page = await context.newPage();
  const localFragment = blogFragment.replace("var APP_URL = 'https://latino-facile-app-2.easy-peasy.site/';", `var APP_URL = '${base}/';`).replaceAll("https://latino-facile-app-2.easy-peasy.site/fonts/", `${base}/fonts/`);
  const sanitized = localFragment.replaceAll("</path>", "");
  const hostCss = "<style>body{margin:0;padding:12px;font:16px Georgia,serif}.entry-content svg{max-width:100%}</style>";
  await page.route(`${base}/__qa-sanitizer`, (route) => route.fulfill({ contentType: "text/html", body: `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">${hostCss}<div class="entry-content">${sanitized}</div>` }));
  await page.goto(`${base}/__qa-sanitizer`);
  await page.frameLocator("iframe.lf-iframe").getByLabel("Nome", { exact: true }).waitFor({ timeout: 20000 });
  const sanitizedPaths = await page.evaluate(() => [...document.querySelectorAll(".lf-btn svg")].map((svg) => ({ count: svg.querySelectorAll("path").length, parent: svg.querySelector("path")?.parentElement === svg, moves: (svg.querySelector("path")?.getAttribute("d")?.match(/M/g) ?? []).length })));
  check("La rielaborazione Blogger senza </path> non nasconde parti delle icone", sanitizedPaths.length === 2 && sanitizedPaths.every((p, i) => p.count === 1 && p.parent && p.moves === (i === 0 ? 4 : 2)), sanitizedPaths);
  await page.locator(".lf-testata").screenshot({ path: `${output}/cornice-sanitizer-390.png` });
  await context.close();

  const isolated = await browser.newContext({ viewport: { width: 900, height: 1600 } });
  await mockApi(isolated);
  const pair = await isolated.newPage();
  await pair.route(`${base}/__qa-due-cornici`, (route) => route.fulfill({ contentType: "text/html", body: `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">${hostCss}${localFragment}<p>Separatore</p>${localFragment}` }));
  await pair.goto(`${base}/__qa-due-cornici`);
  const iframes = pair.locator("iframe.lf-iframe");
  check("Due cornici v4 sono presenti nella stessa pagina", await iframes.count() === 2);
  await pair.frameLocator("iframe.lf-iframe").nth(0).getByLabel("Nome", { exact: true }).waitFor({ timeout: 20000 });
  await pair.frameLocator("iframe.lf-iframe").nth(1).getByLabel("Nome", { exact: true }).waitFor({ timeout: 20000 });
  await pair.waitForFunction(() => [...document.querySelectorAll<HTMLIFrameElement>("iframe.lf-iframe")].every((f) => parseFloat(f.style.height) >= 100), undefined, { timeout: 15000 });
  await pair.waitForTimeout(1400);
  const urls = await iframes.evaluateAll((nodes) => nodes.map((node) => (node as HTMLIFrameElement).src));
  const token0 = new URL(urls[0]).searchParams.get("cornice"), token1 = new URL(urls[1]).searchParams.get("cornice");
  check("Le due cornici hanno token diversi e iframe indipendenti", Boolean(token0 && token1 && token0 !== token1), { token0, token1 });
  const heightsBefore = await iframes.evaluateAll((nodes) => nodes.map((node) => (node as HTMLIFrameElement).style.height));
  const frame1 = pair.frames().find((f) => f.url().includes(`cornice=${token1}`));
  if (!frame1) throw new Error("Secondo iframe non trovato");
  await frame1.evaluate((wrongToken) => window.parent.postMessage({ type: "labvisivo:height", height: 9000, cornice: wrongToken }, "*"), token0);
  await pair.waitForTimeout(500);
  const heightsAfter = await iframes.evaluateAll((nodes) => nodes.map((node) => (node as HTMLIFrameElement).style.height));
  check("I messaggi di un'altra cornice o con token errato non modificano le altezze", heightsBefore.join(",") === heightsAfter.join(","), { heightsBefore, heightsAfter });
  const firstApp = pair.frameLocator("iframe.lf-iframe").nth(0);
  await firstApp.getByLabel("Nome", { exact: true }).fill("Prova");
  await firstApp.getByLabel("Cognome", { exact: true }).fill("Test");
  await firstApp.getByRole("button", { name: "ENTRA" }).click();
  await firstApp.locator("textarea").first().waitFor();
  await pair.waitForTimeout(900);
  const secondStillWelcome = await pair.frameLocator("iframe.lf-iframe").nth(1).getByLabel("Nome", { exact: true }).isVisible();
  check("Entrare in un'istanza non cambia l'altra", secondStillWelcome);
  await isolated.close();
  completed = true;
} catch (error) {
  results.push({ name: "Esecuzione completa del test", ok: false, detail: error instanceof Error ? error.message : String(error) });
  throw error;
} finally {
  await browser.close();
  await fs.writeFile(`${output}/risultati.json`, JSON.stringify({ ok: completed && results.every((r) => r.ok), completed, checks: results, limitations: ["API simulate", "mobile e touch emulati", "nessuna modifica al blog pubblico"] }, null, 2));
}
console.log(JSON.stringify({ ok: true, checks: results.length, output }, null, 2));

