import { describe, expect, it } from "vitest";
import { HISTORY_KEY, HistoryStore, type KeyValueStorage } from "../store";

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => ((resolve = res), (reject = rej)));
  return { promise, resolve, reject };
}

const seed = JSON.stringify([{ text: "stored", lastUsed: 1, count: 1 }]);

function memoryStorage(initial?: string) {
  const data = new Map<string, string>(initial ? [[HISTORY_KEY, initial]] : []);
  const hooks: { read?: () => Promise<void>; write?: () => Promise<void>; remove?: () => Promise<void> } = {};
  const storage: KeyValueStorage = {
    getItem: async (k) => {
      await hooks.read?.();
      return data.get(k);
    },
    setItem: async (k, v) => {
      await hooks.write?.();
      data.set(k, v);
    },
    removeItem: async (k) => {
      await hooks.remove?.();
      data.delete(k);
    },
  };
  return { storage, data, hooks };
}

const texts = (s: HistoryStore) => s.getSnapshot().entries.map((e) => e.text);
const stored = (data: Map<string, string>) =>
  (JSON.parse(data.get(HISTORY_KEY) ?? "[]") as { text: string }[]).map((e) => e.text);

describe("HistoryStore ordering", () => {
  it("record before the initial read finishes keeps stored entries", async () => {
    const m = memoryStorage(seed);
    const gate = deferred<void>();
    m.hooks.read = () => gate.promise;
    const store = new HistoryStore(m.storage, () => 10);
    const loading = store.load();
    const recording = store.record("fresh");
    gate.resolve();
    await Promise.all([loading, recording]);
    expect(texts(store)).toEqual(["fresh", "stored"]);
    expect(stored(m.data)).toEqual(["fresh", "stored"]);
  });

  it("a pending write followed by clear ends empty, not restored", async () => {
    const m = memoryStorage(seed);
    const store = new HistoryStore(m.storage, () => 10);
    await store.load();
    const gate = deferred<void>();
    m.hooks.write = () => gate.promise;
    const recording = store.record("fresh");
    const clearing = store.clear();
    gate.resolve();
    await Promise.all([recording, clearing]);
    expect(texts(store)).toEqual([]);
    expect(m.data.has(HISTORY_KEY)).toBe(false);
  });

  it("clear issued during the initial read is not undone by the late read", async () => {
    const m = memoryStorage(seed);
    const gate = deferred<void>();
    m.hooks.read = () => gate.promise;
    const store = new HistoryStore(m.storage, () => 10);
    const loading = store.load();
    const clearing = store.clear();
    gate.resolve();
    await Promise.all([loading, clearing]);
    expect(texts(store)).toEqual([]);
    expect(m.data.has(HISTORY_KEY)).toBe(false);
  });
});

describe("HistoryStore failures", () => {
  it("failed read stops loading, is flagged, and never overwrites stored data", async () => {
    const m = memoryStorage(seed);
    m.hooks.read = () => Promise.reject(new Error("boom"));
    const store = new HistoryStore(m.storage, () => 10);
    await store.load();
    expect(store.getSnapshot()).toMatchObject({ isLoading: false, unreadable: true, entries: [] });
    await expect(store.record("fresh")).rejects.toThrow();
    await expect(store.remove("stored")).rejects.toThrow();
    expect(m.data.get(HISTORY_KEY)).toBe(seed);
  });

  it("recovers when a later read succeeds", async () => {
    const m = memoryStorage(seed);
    m.hooks.read = () => Promise.reject(new Error("boom"));
    const store = new HistoryStore(m.storage, () => 10);
    await store.load();
    m.hooks.read = undefined;
    await store.record("fresh");
    expect(texts(store)).toEqual(["fresh", "stored"]);
    expect(store.getSnapshot().unreadable).toBe(false);
  });

  it("clear still works after a failed read", async () => {
    const m = memoryStorage(seed);
    m.hooks.read = () => Promise.reject(new Error("boom"));
    const store = new HistoryStore(m.storage, () => 10);
    await store.load();
    await store.clear();
    expect(m.data.has(HISTORY_KEY)).toBe(false);
    expect(store.getSnapshot().unreadable).toBe(false);
  });

  it("failed write rejects and leaves UI state and storage unchanged", async () => {
    const m = memoryStorage(seed);
    const store = new HistoryStore(m.storage, () => 10);
    await store.load();
    m.hooks.write = () => Promise.reject(new Error("disk"));
    await expect(store.record("fresh")).rejects.toThrow();
    await expect(store.remove("stored")).rejects.toThrow();
    expect(texts(store)).toEqual(["stored"]);
    expect(m.data.get(HISTORY_KEY)).toBe(seed);
    m.hooks.write = undefined;
    await store.record("later");
    expect(texts(store)).toEqual(["later", "stored"]);
  });

  it("failed delete keeps entries visible", async () => {
    const m = memoryStorage(seed);
    const store = new HistoryStore(m.storage, () => 10);
    await store.load();
    m.hooks.remove = () => Promise.reject(new Error("disk"));
    await expect(store.clear()).rejects.toThrow();
    expect(texts(store)).toEqual(["stored"]);
    expect(m.data.get(HISTORY_KEY)).toBe(seed);
  });

  it("notifies subscribers only with committed state", async () => {
    const m = memoryStorage(seed);
    const store = new HistoryStore(m.storage, () => 10);
    await store.load();
    const seen: string[][] = [];
    store.subscribe(() => seen.push(texts(store)));
    m.hooks.write = () => Promise.reject(new Error("disk"));
    await store.record("fresh").catch(() => undefined);
    expect(seen).toEqual([]);
  });
});
