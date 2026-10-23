import { describe, expect, it } from "vitest";
import { fetchSuggestions, parseSuggestions, suggestUrl } from "../suggestions";

const respond =
  (body: string, ok = true) =>
  async () => ({ ok, text: async () => body });

describe("parseSuggestions", () => {
  it("reads the Google suggest shape", () => {
    expect(parseSuggestions(["rus", ["rust", "rust book", "rustup"]])).toEqual(["rust", "rust book", "rustup"]);
  });

  it("drops non-strings, blanks, duplicates and oversized items; caps the count", () => {
    const many = Array.from({ length: 20 }, (_, i) => `item ${i}`);
    expect(parseSuggestions(["q", [1, null, "  ", "Dup", "dup", "x".repeat(300), ...many]])).toEqual([
      "Dup",
      ...many.slice(0, 7),
    ]);
  });

  it.each([null, undefined, "str", 5, {}, [], ["q"], ["q", "nope"], ["q", {}]])("returns empty for %j", (payload) => {
    expect(parseSuggestions(payload)).toEqual([]);
  });
});

describe("suggestUrl", () => {
  it("encodes the query", () => {
    expect(suggestUrl("a&b c")).toBe("https://suggestqueries.google.com/complete/search?client=firefox&q=a%26b%20c");
  });
});

describe("fetchSuggestions", () => {
  const signal = new AbortController().signal;

  it("parses a good response", async () => {
    const result = await fetchSuggestions("ru", { signal, fetchFn: respond('["ru",["rust"]]') });
    expect(result).toEqual(["rust"]);
  });

  it("returns empty for malformed JSON, HTTP errors and huge bodies", async () => {
    expect(await fetchSuggestions("ru", { signal, fetchFn: respond("<html>") })).toEqual([]);
    expect(await fetchSuggestions("ru", { signal, fetchFn: respond("[]", false) })).toEqual([]);
    expect(await fetchSuggestions("ru", { signal, fetchFn: respond(" ".repeat(100_001)) })).toEqual([]);
  });

  it("rejects when the caller aborts", async () => {
    const controller = new AbortController();
    const fetchFn = (_url: string, init: { signal: AbortSignal }) =>
      new Promise<never>((_, reject) => init.signal.addEventListener("abort", () => reject(init.signal.reason)));
    const pending = fetchSuggestions("ru", { signal: controller.signal, fetchFn });
    controller.abort();
    await expect(pending).rejects.toBeDefined();
  });

  it("aborts on timeout", async () => {
    const fetchFn = (_url: string, init: { signal: AbortSignal }) =>
      new Promise<never>((_, reject) => init.signal.addEventListener("abort", () => reject(init.signal.reason)));
    await expect(fetchSuggestions("ru", { signal, timeoutMs: 20, fetchFn })).rejects.toBeDefined();
  });
});
