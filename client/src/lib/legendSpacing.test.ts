import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PDFDocument, PDFPage, rgb } from "pdf-lib";
import { buildPdfBlob, type ExportToken } from "./export";
import {
  LEGEND_ITEMS,
  LEGEND_VOICE_NOTE,
  legendExplanationColor,
  shadeForNumber,
} from "../../../shared/types";

// Font reali incorporati nel PDF; nessun dato studente o servizio esterno.
const fonts = join(__dirname, "..", "..", "public", "fonts");
const legend = LEGEND_ITEMS.map(({ label, compl, sub, color, numero }) => ({
  label, compl, sub, color, numero,
}));
const word = (s = "rosa"): ExportToken => ({ word: s, trailing: "", color: "#E53935" });
const asRgb = (hex: string) => rgb(...([1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number]));
const unknownNote = "Le parole non riconosciute dall'IA sono contrassegnate dal colore nero.";

function mockFonts() {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    const name = String(url).includes("Bold") ? "OpenDyslexic-Bold.ttf" : "OpenDyslexic-Regular.ttf";
    return new Response(readFileSync(join(fonts, name)));
  }));
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("PDF — legenda più ariosa", () => {
  it("separa le righe e i gruppi, conservando testi, campioni e colori", async () => {
    mockFonts();
    const drawText = vi.spyOn(PDFPage.prototype, "drawText");
    const drawRectangle = vi.spyOn(PDFPage.prototype, "drawRectangle");
    const blob = await buildPdfBlob([[word("Puella"), word("rosam"), word("videt")]], legend);
    const doc = await PDFDocument.load(await blob.arrayBuffer());
    expect(doc.getPageCount()).toBe(1);

    const calls = drawText.mock.calls.map(([text, opts], i) => ({
      text, opts: opts!, page: drawText.mock.instances[i],
    }));
    const title = calls.find((call) => call.text === "I COLORI DELLE FRASI")!;
    expect(title).toBeDefined();
    const groupEnds: { x: number; y: number; firstY: number; page: PDFPage }[] = [];

    for (const item of legend) {
      const firstText = item.numero ? `${item.label} SINGOLARE` : item.label;
      const first = calls.find((call) => call.text === firstText)!;
      expect(first, firstText).toBeDefined();
      expect(first.page).toBe(title.page);
      expect(first.opts.color).toEqual(asRgb("#2e2018"));
      const x = first.opts.x!;
      const findAt = (text: string, y: number) => calls.find((call) =>
        call.text === text && call.page === first.page && call.opts.x === x && call.opts.y === y
      );
      let previous = first;
      if (item.numero) {
        const second = findAt(`${item.label} PLURALE`, first.opts.y! - 20);
        expect(second, `${item.label}: 20pt fra singolare e plurale`).toBeDefined();
        expect(second!.opts.size).toBe(first.opts.size);
        for (const [text, number] of [[first, "singolare"], [second!, "plurale"]] as const) {
          const swatch = drawRectangle.mock.calls.find(([opts], i) =>
            drawRectangle.mock.instances[i] === first.page && opts.x === x - 16 && opts.y === text.opts.y! - 2
          );
          expect(swatch, `${item.label} ${number}: campione allineato`).toBeDefined();
          expect(swatch![0].color).toEqual(asRgb(shadeForNumber(item.color, number)));
        }
        previous = second!;
      } else {
        const swatch = drawRectangle.mock.calls.find(([opts], i) =>
          drawRectangle.mock.instances[i] === first.page && opts.x === x - 16 && opts.y === first.opts.y! - 8
        );
        expect(swatch, `${item.label}: campione presente`).toBeDefined();
        expect(swatch![0].color).toEqual(asRgb(item.color));
      }
      if (item.compl) {
        const description = findAt(item.compl, previous.opts.y! - 15);
        expect(description, `${item.label}: 15pt prima del complemento`).toBeDefined();
        expect(description!.opts.color).toEqual(asRgb(legendExplanationColor(item.color)));
        previous = description!;
      }
      if (item.sub) {
        const detail = findAt(item.sub, previous.opts.y! - (item.compl ? 13 : 15));
        expect(detail, `${item.label}: 13pt tra descrizioni`).toBeDefined();
        expect(detail!.opts.color).toEqual(asRgb("#7a6650"));
        previous = detail!;
      }
      groupEnds.push({ x, y: previous.opts.y!, firstY: first.opts.y!, page: first.page });
    }

    for (let i = 0; i + 2 < groupEnds.length; i++) {
      const current = groupEnds[i];
      const next = groupEnds[i + 2];
      expect(next.x).toBe(current.x);
      expect(next.page).toBe(current.page);
      expect(current.y - next.firstY, `spazio dopo ${legend[i].label}`).toBeGreaterThanOrEqual(16);
    }
    const notes = LEGEND_VOICE_NOTE.map((part, i) => calls.filter((call) => call.text === part.text)[part.text === "SOTTOLINEATO" && i > 1 ? 1 : 0]);
    for (const [i, part] of LEGEND_VOICE_NOTE.entries()) {
      expect(notes[i]).toBeDefined();
      expect(notes[i].page).toBe(title.page);
      expect(notes[i].opts.color).toEqual(asRgb(part.color ?? "#2e2018"));
    }
    const unknown = calls.find((call) => call.text === unknownNote)!;
    expect(unknown).toBeDefined();
    expect(unknown.page).toBe(title.page);
    expect(unknown.opts.y!).toBeGreaterThanOrEqual(64);
  });

  it("sposta la legenda intera quando non c'è più spazio, anche con 50 frasi", async () => {
    mockFonts();
    const drawText = vi.spyOn(PDFPage.prototype, "drawText");
    for (const count of [8, 9, 50]) {
      drawText.mockClear();
      const sentences = Array.from({ length: count }, () => [word()]);
      const blob = await buildPdfBlob(sentences, legend, undefined, undefined, true);
      const doc = await PDFDocument.load(await blob.arrayBuffer());
      if (count === 8) expect(doc.getPageCount()).toBe(1);
      if (count === 9) expect(doc.getPageCount()).toBe(2);
      if (count === 50) expect(doc.getPageCount()).toBeGreaterThan(1);
      const calls = drawText.mock.calls.map(([text, opts], i) => ({ text, opts: opts!, page: drawText.mock.instances[i] }));
      const title = calls.find((call) => call.text === "I COLORI DELLE FRASI")!;
      const note = calls.find((call) => call.text === unknownNote)!;
      expect(title).toBeDefined();
      expect(note).toBeDefined();
      expect(note.page).toBe(title.page);
      expect(note.opts.y!).toBeGreaterThanOrEqual(64);
      for (const item of legend) {
        const text = item.numero ? `${item.label} SINGOLARE` : item.label;
        expect(calls.some((call) => call.text === text && call.page === title.page), `${count} frasi: ${text}`).toBe(true);
        if (item.numero) expect(calls.some((call) => call.text === `${item.label} PLURALE` && call.page === title.page)).toBe(true);
      }
      const pageNumberCalls = calls.filter((call) => /^\d+$/.test(call.text) && call.opts.y === 30);
      expect(pageNumberCalls).toHaveLength(doc.getPageCount() > 1 ? doc.getPageCount() : 0);
    }
  });

  it("mantiene la legenda completa e le note nella stessa pagina dopo traduzioni lunghe", async () => {
    mockFonts();
    const drawText = vi.spyOn(PDFPage.prototype, "drawText");
    const sentences = Array.from({ length: 4 }, () => [word("Puella"), word("rosam"), word("videt")]);
    const translations = sentences.map((_, i) => `Traduzione di prova ${i + 1}: ` + "La fanciulla osserva una rosa nel giardino con attenzione. ".repeat(4));
    const blob = await buildPdfBlob(sentences, legend, { nome: "Prova" }, translations, true);
    const doc = await PDFDocument.load(await blob.arrayBuffer());
    expect(doc.getPageCount()).toBeGreaterThan(1);
    const calls = drawText.mock.calls.map(([text, opts], i) => ({ text, opts: opts!, page: drawText.mock.instances[i] }));
    const title = calls.find((call) => call.text === "I COLORI DELLE FRASI")!;
    const note = calls.find((call) => call.text === unknownNote)!;
    expect(title).toBeDefined();
    expect(note).toBeDefined();
    expect(note.page).toBe(title.page);
    expect(note.opts.y!).toBeGreaterThanOrEqual(64);
    for (const item of legend) {
      const text = item.numero ? `${item.label} SINGOLARE` : item.label;
      expect(calls.some((call) => call.text === text && call.page === title.page), text).toBe(true);
    }
    expect(calls.filter((call) => call.text === "Traduzione: ")).toHaveLength(4);
  });
});

