import { describe, expect, it } from "vitest";
import { classifyInput } from "../classify";
import {
  type HistoryEntry,
  fuzzyScore,
  historyTextFor,
  parseHistory,
  recordEntry,
  removeEntry,
  searchHistory,
  trimToLimit,
} from "../history";

const entry = (text: string, lastUsed = 1, count = 1): HistoryEntry => ({ text, lastUsed, count });

describe("recordEntry", () => {
  it("puts the newest first and enforces the limit", () => {
    let entries: HistoryEntry[] = [];
    for (const [i, t] of ["a1", "b2", "c3", "d4"].entries()) entries = recordEntry(entries, t, 3, i);
    expect(entries.map((e) => e.text)).toEqual(["d4", "c3", "b2"]);
  });

  it("dedupes case-insensitively, keeps the latest spelling and bumps count", () => {
    const entries = recordEntry([entry("Rust Book", 1, 2), entry("go")], "rust book", 10, 5);
    expect(entries).toEqual([{ text: "rust book", lastUsed: 5, count: 3 }, entry("go")]);
  });
});

describe("removeEntry / trimToLimit", () => {
  it("removes one entry only", () => {
    expect(removeEntry([entry("a"), entry("B")], "b").map((e) => e.text)).toEqual(["a"]);
  });

  it("keeps the most recent entries when the limit shrinks", () => {
    const kept = trimToLimit([entry("old", 1), entry("new", 9), entry("mid", 5)], 2);
    expect(kept.map((e) => e.text)).toEqual(["new", "mid"]);
  });
});

describe("fuzzy search", () => {
  it("matches subsequences and rejects non-matches", () => {
    expect(fuzzyScore("ghb", "github.com")).toBeDefined();
    expect(fuzzyScore("xyz", "github.com")).toBeUndefined();
  });

  it("ranks prefix above substring above scattered matches", () => {
    const prefix = fuzzyScore("git", "github")!;
    const substring = fuzzyScore("git", "digit")!;
    const scattered = fuzzyScore("git", "get it")!;
    expect(prefix).toBeGreaterThan(substring);
    expect(substring).toBeGreaterThan(scattered);
  });

  it("returns recent entries for an empty query, and ranked matches otherwise", () => {
    const entries = [entry("react hooks", 1), entry("rust book", 3), entry("golang", 2)];
    expect(searchHistory(entries, "", 2).map((e) => e.text)).toEqual(["rust book", "golang"]);
    expect(searchHistory(entries, "rb", 5).map((e) => e.text)).toEqual(["rust book"]);
    expect(searchHistory(entries, "zzz", 5)).toEqual([]);
  });

  it("breaks ties by frequency", () => {
    const entries = [entry("rust a", 1, 1), entry("rust b", 1, 9)];
    expect(searchHistory(entries, "rust", 5)[0]?.text).toBe("rust b");
  });
});

describe("historyTextFor (no secrets)", () => {
  const textFor = (raw: string) => historyTextFor(raw, classifyInput(raw));

  it("stores plain searches and bare domains", () => {
    expect(textFor("  rust book ")).toBe("rust book");
    expect(textFor("github.com")).toBe("github.com");
    expect(textFor("https://example.com/docs")).toBe("https://example.com/docs");
  });

  it("never stores blank input", () => {
    expect(textFor("   ")).toBeUndefined();
  });

  it.each([
    "https://example.com/cb?token=abc123",
    "https://example.com/#access_token=abc",
    "https://user:pass@example.com/",
    "https://user@example.com/",
    "example.com/path?key=secret",
  ])("skips URL with possible secret %s", (input) => {
    expect(textFor(input)).toBeUndefined();
  });

  it("skips pasted blobs", () => {
    expect(textFor("x".repeat(201))).toBeUndefined();
  });
});

describe("parseHistory", () => {
  it("round-trips valid data", () => {
    const entries = [entry("a1", 2, 3)];
    expect(parseHistory(JSON.stringify(entries))).toEqual(entries);
  });

  it.each([undefined, "", "{not json", "null", '{"a":1}', "42"])("returns empty for %j", (stored) => {
    expect(parseHistory(stored)).toEqual([]);
  });

  it("drops malformed entries but keeps good ones", () => {
    const stored = JSON.stringify([entry("ok"), { text: 5 }, null, { text: "", lastUsed: 1, count: 1 }]);
    expect(parseHistory(stored)).toEqual([entry("ok")]);
  });
});
