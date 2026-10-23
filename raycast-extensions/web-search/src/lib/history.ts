import type { Intent } from "./classify";

export type HistoryEntry = {
  text: string;
  lastUsed: number;
  count: number;
};

const MAX_ENTRY_LENGTH = 200;

/**
 * Decides what text may be persisted. Skips anything likely to carry a secret:
 * URLs with credentials, a query string or a fragment (tokens often live there),
 * and very long input (pasted blobs).
 */
export function historyTextFor(raw: string, intent: Intent): string | undefined {
  const text = raw.trim();
  if (intent.kind === "blank" || text === "" || text.length > MAX_ENTRY_LENGTH) return undefined;
  if (intent.kind === "url") {
    const parsed = new URL(intent.url);
    if (parsed.username || parsed.password || parsed.search || parsed.hash) return undefined;
    if (text.includes("?") || text.includes("#") || text.includes("@")) return undefined;
  }
  return text;
}

function key(text: string): string {
  return text.toLowerCase();
}

export function recordEntry(
  entries: readonly HistoryEntry[],
  text: string,
  limit: number,
  now: number,
): HistoryEntry[] {
  const existing = entries.find((e) => key(e.text) === key(text));
  const updated: HistoryEntry = { text, lastUsed: now, count: (existing?.count ?? 0) + 1 };
  const rest = entries.filter((e) => key(e.text) !== key(text));
  return [updated, ...rest].slice(0, Math.max(0, limit));
}

export function removeEntry(entries: readonly HistoryEntry[], text: string): HistoryEntry[] {
  return entries.filter((e) => key(e.text) !== key(text));
}

export function trimToLimit(entries: readonly HistoryEntry[], limit: number): HistoryEntry[] {
  return [...entries].sort((a, b) => b.lastUsed - a.lastUsed).slice(0, Math.max(0, limit));
}

/**
 * Fuzzy subsequence score. Returns undefined when `needle` is not a subsequence of `hay`.
 * Prefers prefix matches, then contiguous runs and word-start hits.
 */
export function fuzzyScore(needle: string, hay: string): number | undefined {
  const n = needle.toLowerCase();
  const h = hay.toLowerCase();
  if (n === "") return 0;
  if (h.startsWith(n)) return 1000 - h.length;
  const at = h.indexOf(n);
  if (at >= 0) return 500 - at - h.length / 10;

  let score = 0;
  let pos = 0;
  let prevMatch = -2;
  for (const ch of n) {
    const found = h.indexOf(ch, pos);
    if (found < 0) return undefined;
    if (found === prevMatch + 1) score += 5;
    if (found === 0 || /[\s./-]/.test(h[found - 1] ?? "")) score += 3;
    score -= found - pos;
    prevMatch = found;
    pos = found + 1;
  }
  return score - h.length / 10;
}

export function searchHistory(entries: readonly HistoryEntry[], query: string, max: number): HistoryEntry[] {
  const q = query.trim();
  if (q === "") return [...entries].sort((a, b) => b.lastUsed - a.lastUsed).slice(0, max);

  return entries
    .flatMap((entry) => {
      const score = fuzzyScore(q, entry.text);
      return score === undefined ? [] : [{ entry, score: score + Math.min(entry.count, 10) }];
    })
    .sort((a, b) => b.score - a.score || b.entry.lastUsed - a.entry.lastUsed)
    .slice(0, max)
    .map((s) => s.entry);
}

function isHistoryEntry(value: unknown): value is HistoryEntry {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.text === "string" &&
    v.text.length > 0 &&
    v.text.length <= MAX_ENTRY_LENGTH &&
    typeof v.lastUsed === "number" &&
    Number.isFinite(v.lastUsed) &&
    typeof v.count === "number" &&
    Number.isFinite(v.count)
  );
}

/** Tolerates corrupt storage: bad JSON or bad entries yield what is salvageable, never a throw. */
export function parseHistory(stored: string | undefined): HistoryEntry[] {
  if (!stored) return [];
  let data: unknown;
  try {
    data = JSON.parse(stored);
  } catch {
    return [];
  }
  return Array.isArray(data) ? data.filter(isHistoryEntry) : [];
}
