import { type HistoryEntry, parseHistory, recordEntry, removeEntry, trimToLimit } from "./history";

export const HISTORY_KEY = "history.v1";

export type KeyValueStorage = {
  getItem(key: string): Promise<string | undefined>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

export type HistorySnapshot = {
  entries: HistoryEntry[];
  /** True until the first read attempt settles. */
  isLoading: boolean;
  /** True when the stored history could not be read. Writes are refused until a read succeeds. */
  unreadable: boolean;
};

/**
 * History persistence with a single ordered queue. Every mutation waits for the initial read,
 * works from the last committed state, persists first and only then publishes the new state.
 * A failed write leaves state unchanged and rejects, so the UI never shows what is not stored.
 * If the read failed, record/remove retry the read and refuse to write over unread data;
 * clear is the explicit exception because the user asked to discard it.
 */
export class HistoryStore {
  private committed: HistoryEntry[] = [];
  private loaded = false;
  private isLoading = true;
  private queue: Promise<unknown> = Promise.resolve();
  private listeners = new Set<() => void>();
  private snapshot: HistorySnapshot;

  constructor(
    private readonly storage: KeyValueStorage,
    private readonly getLimit: () => number,
  ) {
    this.snapshot = this.build();
  }

  getSnapshot = (): HistorySnapshot => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** Initial read. Never rejects; failure is reported through `unreadable`. */
  load(): Promise<void> {
    return this.enqueue(async () => {
      await this.tryRead();
      this.isLoading = false;
      this.publish();
    }).catch(() => undefined);
  }

  record(text: string): Promise<void> {
    return this.mutate((entries) => recordEntry(entries, text, this.getLimit(), Date.now()));
  }

  remove(text: string): Promise<void> {
    return this.mutate((entries) => removeEntry(entries, text));
  }

  clear(): Promise<void> {
    return this.enqueue(async () => {
      await this.storage.removeItem(HISTORY_KEY);
      this.committed = [];
      this.loaded = true;
      this.isLoading = false;
      this.publish();
    });
  }

  private mutate(change: (entries: HistoryEntry[]) => HistoryEntry[]): Promise<void> {
    return this.enqueue(async () => {
      if (!this.loaded && !(await this.tryRead())) {
        this.isLoading = false;
        this.publish();
        throw new Error("History could not be read, so it was left untouched.");
      }
      const next = change(this.committed);
      await this.storage.setItem(HISTORY_KEY, JSON.stringify(next));
      this.committed = next;
      this.publish();
    });
  }

  private async tryRead(): Promise<boolean> {
    try {
      const stored = await this.storage.getItem(HISTORY_KEY);
      this.committed = trimToLimit(parseHistory(stored), this.getLimit());
      this.loaded = true;
      return true;
    } catch {
      return false;
    }
  }

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = this.queue.then(task, task);
    this.queue = run.catch(() => undefined);
    return run;
  }

  private build(): HistorySnapshot {
    return { entries: this.committed, isLoading: this.isLoading, unreadable: !this.loaded && !this.isLoading };
  }

  private publish(): void {
    this.snapshot = this.build();
    this.listeners.forEach((l) => l());
  }
}
