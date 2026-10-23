import { LocalStorage } from "@raycast/api";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { HistoryStore, type KeyValueStorage } from "./lib/store";
import { fetchSuggestions } from "./lib/suggestions";

const raycastStorage: KeyValueStorage = {
  getItem: (key) => LocalStorage.getItem<string>(key),
  setItem: (key, value) => LocalStorage.setItem(key, value),
  removeItem: (key) => LocalStorage.removeItem(key),
};

const DEBOUNCE_MS = 250;
const MIN_QUERY_LENGTH = 2;

export function useHistory(limit: number) {
  const limitRef = useRef(limit);
  limitRef.current = limit;
  const [store] = useState(() => new HistoryStore(raycastStorage, () => limitRef.current));
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot);

  useEffect(() => {
    void store.load();
  }, [store]);

  return {
    entries: snapshot.entries.slice(0, limit),
    isLoading: snapshot.isLoading,
    unreadable: snapshot.unreadable,
    record: (text: string) => store.record(text),
    remove: (text: string) => store.remove(text),
    clear: () => store.clear(),
  };
}

/**
 * Debounced, cancellable Google suggestions. Every keystroke cancels the pending timer and the in-flight
 * request, and a result is applied only if its effect run is still the current one.
 */
export function useSuggestions(query: string, enabled: boolean) {
  const [state, setState] = useState<{ query: string; items: string[] }>({ query: "", items: [] });
  const [isLoading, setIsLoading] = useState(false);
  const trimmed = query.trim();

  useEffect(() => {
    if (!enabled || trimmed.length < MIN_QUERY_LENGTH) {
      setState({ query: "", items: [] });
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    let current = true;
    setIsLoading(true);

    const timer = setTimeout(() => {
      fetchSuggestions(trimmed, { signal: controller.signal })
        .then((items) => {
          if (current) setState({ query: trimmed, items });
        })
        .catch(() => {
          if (current) setState({ query: trimmed, items: [] });
        })
        .finally(() => {
          if (current) setIsLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      current = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, enabled]);

  // Results for an older query stay hidden until the current query's response arrives.
  const items = enabled && state.query === trimmed ? state.items : [];
  return { items, isLoading };
}
