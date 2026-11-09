import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  analyzeText: vi.fn(),
  verifyWithAI: vi.fn(),
  assignRolesWithAI: vi.fn(),
  aiQuotaExhausted: vi.fn(),
  myMemoryTranslate: vi.fn(),
  applyRoleOverrides: vi.fn(),
  applyVocativoGuard: vi.fn(),
}));
vi.mock("./analyzer", () => ({ analyzeText: mocks.analyzeText }));
vi.mock("./analyzer/verifyAI", () => ({
  verifyWithAI: mocks.verifyWithAI,
  assignRolesWithAI: mocks.assignRolesWithAI,
  aiQuotaExhausted: mocks.aiQuotaExhausted,
}));
vi.mock("./analyzer/deepl", () => ({ deeplConfigured: () => false, deeplTranslate: vi.fn() }));
vi.mock("./analyzer/mt", () => ({ myMemoryTranslate: mocks.myMemoryTranslate }));
vi.mock("./analyzer/itTranslate", () => ({ fixMtVerb: (text: string) => text, glossToItalian: () => "Glossario di prova" }));
vi.mock("./analyzer/translationColors", () => ({
  applyTranslationAnalysis: (sentences: unknown) => sentences,
  applyRoleOverrides: mocks.applyRoleOverrides,
  applyVocativoGuard: mocks.applyVocativoGuard,
}));

import { appRouter } from "./routers";

const makeCaller = () => appRouter.createCaller({ req: {} as never, res: {} as never, user: null });
const sample = "Puella rosam rubram videt.";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.analyzeText.mockResolvedValue({
    sentences: [{ tokens: ["Puella", "rosam", "rubram", "videt"].map((text) => ({ text, word: text.toLowerCase(), isPunct: false, trailing: "", analysis: null })) }],
    unknownWords: [],
    apiUsed: false,
  });
  mocks.aiQuotaExhausted.mockReturnValue(true);
  mocks.myMemoryTranslate.mockResolvedValue("La ragazza vede la rosa rossa.");
});

describe("fonte effettiva di traduzione e colorazione", () => {
  it("usa traduzione e ruoli quando la verifica IA riesce", async () => {
    mocks.verifyWithAI.mockResolvedValue({
      lines: ["La ragazza vede la rosa rossa."],
      roles: { puella: "nominativo", rosam: "accusativo", rubram: "accusativo", videt: "verbo" },
      numbers: {},
      enclitics: {},
    });
    const result = await makeCaller().latino.translate({ text: sample });
    expect(result.lines).toEqual(["La ragazza vede la rosa rossa."]);
    expect(result.source).toBe("ai");
    expect(result.colorSource).toBe("ai");
    expect(mocks.applyRoleOverrides).toHaveBeenCalled();
    expect(mocks.myMemoryTranslate).not.toHaveBeenCalled();
  });

  it("non attribuisce all'IA il ripiego automatico quando l'IA fallisce", async () => {
    mocks.verifyWithAI.mockResolvedValue(null);
    mocks.assignRolesWithAI.mockResolvedValue(null);
    const result = await makeCaller().latino.translate({ text: sample });
    expect(result.lines).toEqual(["La ragazza vede la rosa rossa."]);
    expect(result.source).toBe("auto");
    expect(result.colorSource).toBe("regole");
  });
});

