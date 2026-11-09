import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { chatCompletion } = vi.hoisted(() => ({ chatCompletion: vi.fn() }));
vi.mock("./chat", () => ({ chatCompletion }));

const params = {
  preset: "custom-generator",
  keywords: "Rispondi in JSON.",
  language: "Italian",
  length: "Medium" as const,
};

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("EASY_PEASY_API_KEY", "test-key-non-reale");
  chatCompletion.mockReset();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

async function run() {
  const { generateText } = await import("./llm");
  return generateText(params);
}

function response(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("generateText — compatibilità gateway IA", () => {
  it("riconosce il formato reale corrente {id,text}", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([{ id: 17, text: '{"traduzioni":["La ragazza ama la rosa."]}' }])));
    const result = await run();
    expect(result).toEqual([{ id: 17, name: '{"traduzioni":["La ragazza ama la rosa."]}' }]);
    expect(chatCompletion).not.toHaveBeenCalled();
  });

  it("conserva il formato precedente {id,name}", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([{ id: 8, name: "risposta precedente" }])));
    expect(await run()).toEqual([{ id: 8, name: "risposta precedente" }]);
    expect(chatCompletion).not.toHaveBeenCalled();
  });

  it("preferisce text a name se il gateway restituisce entrambi", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([{ id: 9, name: "etichetta", text: "risposta effettiva" }])));
    expect(await run()).toEqual([{ id: 9, name: "risposta effettiva" }]);
  });

  it.each([
    ["array vuoto", response([])],
    ["testo vuoto", response([{ id: 1, text: "   " }])],
    ["schema inatteso", response({ ok: true })],
    ["risposta non JSON", new Response("not json", { status: 200 })],
    ["errore 403", response({ error: "non disponibile" }, 403)],
    ["errore 429", response({ error: "limite" }, 429)],
    ["errore 503", response({ error: "non disponibile" }, 503)],
  ])("prova il secondo servizio IA dopo %s", async (_label, badResponse) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(badResponse));
    chatCompletion.mockResolvedValue("  risposta IA alternativa  ");
    expect(await run()).toEqual([{ id: 0, name: "risposta IA alternativa" }]);
    expect(chatCompletion).toHaveBeenCalledOnce();
  });

  it("prova il secondo servizio IA anche in caso di errore di rete", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    chatCompletion.mockResolvedValue("risposta IA alternativa");
    expect(await run()).toEqual([{ id: 0, name: "risposta IA alternativa" }]);
  });

  it("non spaccia per IA una risposta vuota o fallita da entrambi i servizi", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([])));
    chatCompletion.mockResolvedValue("   ");
    await expect(run()).rejects.toThrow("empty");
  });

  it("riprova il primo servizio dopo un intervallo, senza bloccarlo per sempre", async () => {
    let now = 10_000;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    const fetchMock = vi.fn().mockResolvedValueOnce(response({}, 429)).mockResolvedValueOnce(response([{ id: 2, text: "ristabilito" }]));
    vi.stubGlobal("fetch", fetchMock);
    chatCompletion.mockResolvedValue("riserva IA");
    const { generateText } = await import("./llm");
    expect((await generateText(params))[0].name).toBe("riserva IA");
    expect((await generateText(params))[0].name).toBe("riserva IA");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    now += 61_000;
    expect((await generateText(params))[0].name).toBe("ristabilito");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

