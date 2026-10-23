const ENDPOINT = "https://suggestqueries.google.com/complete/search";
const MAX_BODY_CHARS = 100_000;
const MAX_SUGGESTIONS = 8;
const MAX_SUGGESTION_LENGTH = 200;

/**
 * Google's suggest response is `[query, [suggestion, ...], ...]`.
 * Anything else yields an empty list.
 */
export function parseSuggestions(payload: unknown): string[] {
  if (!Array.isArray(payload)) return [];
  const list: unknown = payload[1];
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of list) {
    if (typeof item !== "string") continue;
    const text = item.trim();
    if (text === "" || text.length > MAX_SUGGESTION_LENGTH || seen.has(text.toLowerCase())) continue;
    seen.add(text.toLowerCase());
    out.push(text);
    if (out.length >= MAX_SUGGESTIONS) break;
  }
  return out;
}

export function suggestUrl(query: string): string {
  return `${ENDPOINT}?client=firefox&q=${encodeURIComponent(query)}`;
}

type FetchFn = (url: string, init: { signal: AbortSignal }) => Promise<Pick<Response, "ok" | "text">>;

export async function fetchSuggestions(
  query: string,
  options: { signal: AbortSignal; timeoutMs?: number; fetchFn?: FetchFn },
): Promise<string[]> {
  const { signal, timeoutMs = 3000, fetchFn = fetch } = options;
  const combined = AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]);
  const response = await fetchFn(suggestUrl(query), { signal: combined });
  if (!response.ok) return [];
  const body = await response.text();
  if (body.length > MAX_BODY_CHARS) return [];
  try {
    return parseSuggestions(JSON.parse(body));
  } catch {
    return [];
  }
}
