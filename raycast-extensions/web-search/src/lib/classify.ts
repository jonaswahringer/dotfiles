export type Intent = { kind: "blank" } | { kind: "url"; url: string } | { kind: "search"; query: string; url: string };

const HTTP_URL = /^https?:\/\/\S+$/i;
const BARE_DOMAIN = /^(?:[a-z0-9-]+\.)+[a-z]{2,}(?::\d+)?(?:[/?#]\S*)?$/i;

const SEARCH_BASE = "https://www.google.com/search?q=";

export function searchUrl(query: string): string {
  return SEARCH_BASE + encodeURIComponent(query);
}

function isParsableUrl(candidate: string): boolean {
  try {
    new URL(candidate);
    return true;
  } catch {
    return false;
  }
}

/** Same rules as the old new-browser-window.sh script. */
export function classifyInput(raw: string): Intent {
  const input = raw.trim();
  if (input === "") return { kind: "blank" };

  if (HTTP_URL.test(input) && isParsableUrl(input)) return { kind: "url", url: input };

  if (BARE_DOMAIN.test(input)) {
    const url = `https://${input}`;
    if (isParsableUrl(url)) return { kind: "url", url };
  }

  return { kind: "search", query: input, url: searchUrl(input) };
}
