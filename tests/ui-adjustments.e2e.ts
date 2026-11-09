import { chromium, type Page } from "playwright";
import fs from "node:fs/promises";
import superjson from "superjson";
import { optionColor } from "../server/analyzer/index";
import type { AnalysisOption, TokenData } from "../shared/types";

// Solo risposte simulate e immagini sintetiche. Non tocca dati reali.
const base = process.env.UI_ADJUST_QA_BASE_URL ?? "http://127.0.0.1:3000";
const output = process.env.UI_ADJUST_QA_OUTPUT ?? "/tmp/latino-ui-adjustments";
await fs.mkdir(output, { recursive: true });
const photo = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200"><rect width="900" height="1200" fill="white"/><text x="50" y="120" font-size="45">Puella rosam rubram videt.</text></svg>`);
const words: [string, Partial<AnalysisOption>][] = [
  ["Puella", { pos: "nome", case: "nominativo", number: "singolare" }],
  ["rosam", { pos: "nome", case: "accusativo", number: "singolare" }],
  ["rubram", { pos: "aggettivo", case: "accusativo", number: "singolare" }],
  ["videt", { pos: "verbo", mood: "indicativo" }],
];
const tokens: TokenData[] = words.map(([word, attrs]) => {
  const opt = { lemma: word.toLowerCase(), summary: "", translation: "", form: word.toLowerCase(), freq: 1, desc: attrs.mood ?? attrs.case ?? "", raw: "", ...attrs } as AnalysisOption;
  return { text: word, word: word.toLowerCase(), trailing: "", isPunct: false, analysis: { word: word.toLowerCase(), display: word, options: [opt], selected: 0, category: opt.pos, color: optionColor(opt), label: opt.desc, source: "manuale", number: opt.number } };
});
const sentences = [{ tokens }];
const results: { name: string; ok: boolean; detail?: unknown }[] = [];
function check(name: string, ok: boolean, detail?: unknown) {
  results.push({ name, ok, detail });
  if (!ok) throw new Error(`${name}: ${JSON.stringify(detail)}`);
}
async function mockApi(page: Page) {
  await page.route("**/api/trpc/**", (route) => {
    const url = new URL(route.request().url());
    const paths = url.pathname.split("/api/trpc/")[1].split(",");
    const data = paths.map((path) => {
      let value: unknown = null;
      if (path === "latino.analyze") value = { sentences, unknownWords: [], apiUsed: false, colorSource: "regole" };
      if (path === "latino.translate") value = { coloredSentences: sentences, lines: ["La ragazza vede la rosa rossa."], source: "ai", colorSource: "ai" };
      return { result: { data: superjson.serialize(value) } };
    });
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(url.searchParams.get("batch") === "1" ? data : data[0]) });
  });
}
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
try {
  for (const width of [320, 390, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 850 }, hasTouch: width <= 390, isMobile: width <= 390 });
    await mockApi(page);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${base}/app`, { waitUntil: "domcontentloaded" });
    await page.locator("textarea").waitFor();
    await page.evaluate(() => document.fonts.ready);
    const backgrounds = await page.evaluate(() => ({
      body: getComputedStyle(document.body).backgroundColor,
      paper: getComputedStyle(document.querySelector(".paper-bg")!).backgroundColor,
      bar: getComputedStyle(document.querySelector('[role="toolbar"]')!).backgroundColor,
      group: getComputedStyle(document.querySelector('[role="toolbar"] [role="group"]')!).backgroundColor,
      workspaceClass: document.documentElement.classList.contains("lf-workspace"),
    }));
    check(`${width}px: sfondo bianco uniforme intorno alla barra`, backgrounds.workspaceClass && backgrounds.body === "rgb(255, 255, 255)" && backgrounds.paper === backgrounds.body, backgrounds);
    check(`${width}px: colori interni della barra invariati`, backgrounds.bar === "rgb(253, 251, 248)" && backgrounds.group === "rgb(245, 240, 230)", backgrounds);
    await page.screenshot({ path: `${output}/pagina-${width}.png`, fullPage: true });

    await page.locator('input[type="file"]').first().setInputFiles({ name: "foto-sintetica.svg", mimeType: "image/svg+xml", buffer: photo });
    const dialog = page.getByRole("dialog");
    await dialog.waitFor({ state: "visible" });
    await page.waitForFunction(() => (document.querySelector('[role="dialog"] img') as HTMLImageElement | null)?.naturalWidth);
    await page.waitForTimeout(250);
    const centered = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]')!;
      const title = dialog.querySelector('[data-slot="dialog-title"]')!;
      const range = document.createRange(); range.selectNodeContents(title);
      const text = range.getBoundingClientRect(), box = dialog.getBoundingClientRect();
      return { align: getComputedStyle(title).textAlign, delta: Math.abs((text.left + text.right) / 2 - (box.left + box.right) / 2), text: title.textContent?.trim(), boxWidth: box.width };
    });
    check(`${width}px: titolo del ritaglio centrato rispetto alla finestra`, centered.align === "center" && centered.delta <= 2.5 && centered.text?.toLowerCase() === "ritaglia la foto", centered);
    await page.screenshot({ path: `${output}/ritaglio-${width}.png` });
    await page.getByRole("button", { name: "Chiudi", exact: true }).click();
    await dialog.waitFor({ state: "detached" });

    await page.locator("textarea").fill("Puella rosam rubram videt.");
    await page.getByRole("button", { name: /Colora la frase con l.intelligenza artificiale/i }).click();
    await page.getByText("Colorata con IA", { exact: true }).waitFor();
    const initialButtons = ["SCRIVI LA TRADUZIONE", "MOSTRA TRADUZIONE", "SCARICA IL PDF"];
    const initialDims = [];
    for (const name of initialButtons) initialDims.push(await page.getByRole("button", { name }).evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { name: el.textContent?.trim(), width: r.width, height: r.height, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight };
    }));
    check(`${width}px: dimensioni identiche anche prima di aprire le traduzioni`, initialDims.every((d) => Math.abs(d.width - initialDims[0].width) < 1 && Math.abs(d.height - initialDims[0].height) < 1 && d.scrollWidth <= d.clientWidth + 1 && d.scrollHeight <= d.clientHeight + 1), initialDims);
    await page.getByRole("button", { name: "MOSTRA TRADUZIONE" }).click();
    await page.getByText("Tradotta con IA", { exact: true }).waitFor();
    await page.getByRole("button", { name: "SCRIVI LA TRADUZIONE" }).click();
    const group = [
      page.getByRole("button", { name: "CHIUDI I CAMPI" }),
      page.getByRole("button", { name: "NASCONDI TRADUZIONE" }),
      page.getByRole("button", { name: "SCARICA IL PDF" }),
    ];
    const dims = [];
    for (const item of group) {
      dims.push(await item.evaluate((el) => {
        const s = getComputedStyle(el), r = el.getBoundingClientRect();
        return { text: el.textContent?.trim(), height: r.height, width: r.width, left: r.left, right: r.right, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth, fontSize: s.fontSize, borderColor: s.borderColor, color: s.color, background: s.backgroundColor, borderRadius: s.borderRadius, paddingTop: s.paddingTop, paddingBottom: s.paddingBottom };
      }));
    }
    check(`${width}px: i tre pulsanti hanno altezza, larghezza e stile identici`, dims.every((d) => Math.abs(d.height - dims[0].height) < 1 && Math.abs(d.width - dims[0].width) < 1 && d.fontSize === dims[0].fontSize && d.borderColor === dims[0].borderColor && d.color === dims[0].color && d.background === dims[0].background && d.borderRadius === dims[0].borderRadius && d.paddingTop === dims[0].paddingTop && d.paddingBottom === dims[0].paddingBottom), dims);
    const overflow = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, viewport: innerWidth }));
    check(`${width}px: pulsanti visibili senza testo tagliato né overflow`, dims.every((d) => d.left >= -1 && d.right <= width + 1 && d.scrollWidth <= d.clientWidth + 1) && overflow.page <= overflow.viewport + 1, { dims, overflow });
    const savePdf = page.getByRole("button", { name: "SALVA TRADUZIONE NEL PDF" });
    const saveDefault = await savePdf.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { left: r.left, right: r.right, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight };
    });
    check(`${width}px: pulsante per salvare la traduzione visibile senza tagli`, saveDefault.left >= -1 && saveDefault.right <= width + 1 && saveDefault.scrollWidth <= saveDefault.clientWidth + 1 && saveDefault.scrollHeight <= saveDefault.clientHeight + 1, saveDefault);
    check(`${width}px: nessun errore JavaScript`, errors.length === 0, errors);
    await page.screenshot({ path: `${output}/pulsanti-${width}.png`, fullPage: true });
    if (width <= 390) {
      const sizeBefore = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
      for (let i = 0; i < 6; i++) await page.getByRole("button", { name: "Aumenta la dimensione del testo" }).click();
      await page.waitForTimeout(350); // attendi la fine di transition-all
      const scaled = [];
      for (const item of group) scaled.push(await item.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const textNode = [...el.childNodes].find((n) => n.nodeType === Node.TEXT_NODE && n.textContent?.includes("TRADUZIONE"));
        let wordLines: number | null = null;
        if (textNode) {
          const index = textNode.textContent!.indexOf("TRADUZIONE");
          const range = document.createRange();
          range.setStart(textNode, index);
          range.setEnd(textNode, index + "TRADUZIONE".length);
          wordLines = range.getClientRects().length;
        }
        return { name: el.textContent?.trim(), width: r.width, height: r.height, left: r.left, right: r.right, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight, wordLines };
      }));
      const sizeAfter = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
      check(`${width}px: testo al massimo senza tagli e dimensioni uguali`, sizeAfter >= sizeBefore * 1.59 && scaled.every((d) => Math.abs(d.width - scaled[0].width) < 1 && Math.abs(d.height - scaled[0].height) < 1 && d.left >= -1 && d.right <= width + 1 && d.scrollWidth <= d.clientWidth + 1 && d.scrollHeight <= d.clientHeight + 1 && (d.wordLines === null || d.wordLines === 1)), { sizeBefore, sizeAfter, scaled });
      const editScaled = await page.getByRole('button', { name: 'MODIFICA TRADUZIONE' }).evaluate((el) => {
        const r = el.getBoundingClientRect(), range = document.createRange();
        range.selectNodeContents(el); const text = range.getBoundingClientRect();
        const node = [...el.childNodes].find((n) => n.nodeType === Node.TEXT_NODE && n.textContent?.includes('TRADUZIONE'));
        let wordLines = null, cornerSafe = false;
        const radius = Math.min(parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0, r.width / 2, r.height / 2);
        if (node) {
          const start = node.textContent!.indexOf('TRADUZIONE'); const word = document.createRange(); word.setStart(node, start); word.setEnd(node, start + 'TRADUZIONE'.length); wordLines = word.getClientRects().length;
          const lines = document.createRange(); lines.selectNodeContents(node); cornerSafe = true;
          for (const line of lines.getClientRects()) {
            const d1 = Math.max(0, radius - (line.top-r.top), radius-(r.bottom-line.top));
            const d2 = Math.max(0, radius - (line.bottom-r.top), radius-(r.bottom-line.bottom));
            const inset = Math.max(radius-Math.sqrt(Math.max(0,radius*radius-d1*d1)), radius-Math.sqrt(Math.max(0,radius*radius-d2*d2)));
            if (line.left < r.left+inset+1 || line.right > r.right-inset-1) cornerSafe = false;
          }
        }
        return { left:r.left, right:r.right, top:r.top, bottom:r.bottom, textLeft:text.left, textRight:text.right, textTop:text.top, textBottom:text.bottom, scrollWidth:el.scrollWidth, clientWidth:el.clientWidth, scrollHeight:el.scrollHeight, clientHeight:el.clientHeight, wordLines, radius, cornerSafe };
      });
      const fullPage = await page.evaluate(() => ({ viewport:document.documentElement.clientWidth, scrollWidth:document.documentElement.scrollWidth }));
      check(`${width}px: modifica traduzione leggibile e nessuno scorrimento orizzontale al 160%`, editScaled.left>=-1 && editScaled.right<=width+1 && editScaled.textLeft>=editScaled.left-1 && editScaled.textRight<=editScaled.right+1 && editScaled.textTop>=editScaled.top-1 && editScaled.textBottom<=editScaled.bottom+1 && editScaled.scrollWidth<=editScaled.clientWidth+1 && editScaled.scrollHeight<=editScaled.clientHeight+1 && editScaled.wordLines===1 && editScaled.cornerSafe && fullPage.scrollWidth<=fullPage.viewport+1, { editScaled, fullPage });
      const saveScaled = await savePdf.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(el);
        const t = range.getBoundingClientRect();
        const textNode = [...el.childNodes].find((n) => n.nodeType === Node.TEXT_NODE && n.textContent?.includes("TRADUZIONE"));
        let wordLines: number | null = null;
        if (textNode) {
          const wordStart = textNode.textContent!.indexOf("TRADUZIONE");
          const word = document.createRange();
          word.setStart(textNode, wordStart);
          word.setEnd(textNode, wordStart + "TRADUZIONE".length);
          wordLines = word.getClientRects().length;
        }
        return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, textTop: t.top, textBottom: t.bottom, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight, wordLines };
      });
      const firstActionTop = await group[0].evaluate((el) => el.getBoundingClientRect().top);
      check(`${width}px: salvataggio PDF ingrandito senza tagli o sovrapposizioni`, saveScaled.left >= -1 && saveScaled.right <= width + 1 && saveScaled.scrollWidth <= saveScaled.clientWidth + 1 && saveScaled.scrollHeight <= saveScaled.clientHeight + 1 && saveScaled.textTop >= saveScaled.top - 1 && saveScaled.textBottom <= saveScaled.bottom + 1 && (saveScaled.wordLines === null || saveScaled.wordLines === 1) && saveScaled.bottom <= firstActionTop + 1, { saveScaled, firstActionTop });
      await page.screenshot({ path: `${output}/pulsanti-ingranditi-${width}.png`, fullPage: true });
      await page.getByRole('button', { name: 'MODIFICA TRADUZIONE' }).screenshot({ path: `${output}/modifica-ingrandita-${width}.png` });
      await page.locator('input[type="file"]').first().setInputFiles({ name: 'foto-sintetica.svg', mimeType: 'image/svg+xml', buffer: photo });
      const enlargedCrop = page.getByRole('dialog'); await enlargedCrop.waitFor();
      await page.waitForFunction(() => (document.querySelector('[role="dialog"] img') as HTMLImageElement | null)?.naturalWidth);
      await page.waitForTimeout(250);
      const cropZoom = await enlargedCrop.evaluate((el) => {
        const title = el.querySelector('[data-slot="dialog-title"]')!, close = el.querySelector('[data-slot="dialog-close"]')!;
        const r = el.getBoundingClientRect(), x = close.getBoundingClientRect(), range = document.createRange(); range.selectNodeContents(title);
        const lines = [...range.getClientRects()].map(t => ({left:t.left,right:t.right,top:t.top,bottom:t.bottom}));
        return {left:r.left,right:r.right,center:(r.left+r.right)/2,align:getComputedStyle(title).textAlign,lines,close:{left:x.left,right:x.right,top:x.top,bottom:x.bottom}};
      });
      check(`${width}px: titolo ritaglio centrato e senza sovrapporsi alla chiusura anche al 160%`, cropZoom.align==='center' && cropZoom.lines.every(t => Math.abs((t.left+t.right)/2-cropZoom.center)<=3 && t.left>=cropZoom.left-1 && t.right<=cropZoom.right+1 && !(Math.min(t.right,cropZoom.close.right)>Math.max(t.left,cropZoom.close.left) && Math.min(t.bottom,cropZoom.close.bottom)>Math.max(t.top,cropZoom.close.top))), cropZoom);
      await page.screenshot({ path: `${output}/ritaglio-ingrandito-${width}.png` });
      await page.getByRole('button', { name:'Chiudi', exact:true }).click(); await enlargedCrop.waitFor({state:'detached'});
    }
    await page.close();
  }

  // Navigazione reale nella SPA: solo lo sfondo della seconda pagina cambia.
  const navigation = await browser.newPage({ viewport: { width: 1100, height: 850 } });
  await navigation.goto(`${base}/`);
  await navigation.getByRole("button", { name: "ENTRA" }).waitFor();
  const firstBefore = await navigation.locator(".lf-welcome").evaluate((el) => getComputedStyle(el).backgroundColor);
  await navigation.getByLabel("Nome", { exact: true }).fill("Test");
  await navigation.getByLabel("Cognome", { exact: true }).fill("QA");
  await navigation.getByRole("button", { name: "ENTRA" }).click();
  await navigation.locator("textarea").waitFor();
  check("navigazione: seconda pagina bianca", await navigation.evaluate(() => document.documentElement.classList.contains("lf-workspace") && getComputedStyle(document.body).backgroundColor === "rgb(255, 255, 255)"));
  await navigation.goBack();
  await navigation.getByRole("button", { name: "ENTRA" }).waitFor();
  const firstAfter = await navigation.locator(".lf-welcome").evaluate((el) => getComputedStyle(el).backgroundColor);
  check("navigazione: prima pagina invariata e classe ripulita", firstBefore === firstAfter && !(await navigation.evaluate(() => document.documentElement.classList.contains("lf-workspace"))), { firstBefore, firstAfter });
  await navigation.close();

  // Cornice locale a 320px: simulazione del protocollo del blog, senza dati reali.
  const embedded = await browser.newPage({ viewport: { width: 390, height: 850 }, hasTouch: true, isMobile: true });
  await mockApi(embedded);
  await embedded.route(`${base}/__qa-ui`, (route) => route.fulfill({ contentType: "text/html", body: `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><iframe title="Latino Facile" src="${base}/app?cornice=ui-test" style="width:320px;height:300px;border:0"></iframe><script>window.altezze=[];addEventListener('message',e=>{let f=document.querySelector('iframe');if(e.source===f.contentWindow&&e.data?.type==='labvisivo:height'){altezze.push(e.data.height);f.style.height=e.data.height+'px'}})</script>` }));
  await embedded.goto(`${base}/__qa-ui`);
  const frame = embedded.frameLocator("iframe");
  await frame.locator("textarea").waitFor();
  await embedded.waitForFunction("window.altezze.length > 0");
  const child = embedded.frames().find((f) => f.url().includes("/app?cornice=ui-test"))!;
  const embedStyle = await child.evaluate(() => ({ body: getComputedStyle(document.body).backgroundColor, page: getComputedStyle(document.querySelector(".paper-bg")!).backgroundColor, width: innerWidth, scrollWidth: document.documentElement.scrollWidth, embed: document.documentElement.classList.contains("lf-embedded") }));
  check("cornice 320px: sfondo uniforme e nessun overflow", embedStyle.embed && embedStyle.body === "rgb(255, 255, 255)" && embedStyle.page === embedStyle.body && embedStyle.scrollWidth <= embedStyle.width + 1, embedStyle);
  await frame.locator('input[type="file"]').first().setInputFiles({ name: "foto-sintetica.svg", mimeType: "image/svg+xml", buffer: photo });
  await frame.getByRole("dialog").waitFor();
  const cropStyle = await child.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]')!, title = dialog.querySelector('[data-slot="dialog-title"]')!;
    const range = document.createRange(); range.selectNodeContents(title);
    const a = range.getBoundingClientRect(), b = dialog.getBoundingClientRect();
    return { delta: Math.abs((a.left + a.right) / 2 - (b.left + b.right) / 2), locked: document.documentElement.hasAttribute("data-lf-crop-open") };
  });
  check("cornice 320px: titolo centrato e ritaglio modale", cropStyle.delta <= 2.5 && cropStyle.locked, cropStyle);
  await frame.getByRole("button", { name: "Chiudi", exact: true }).click();
  await embedded.close();
  await fs.writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}

