type KeyedDebouncer = {
  schedule: (key: string, fn: () => void | Promise<void>) => void;
  cancel: (key?: string) => void;
  flush: (key?: string) => void;
};

/** Independent debounce timers keyed by string (safe to hold in a ref). */
export function createKeyedDebouncer(waitMs: number): KeyedDebouncer {
  const pending = new Map<
    string,
    { timer: ReturnType<typeof setTimeout>; fn: () => void | Promise<void> }
  >();

  const invoke = (key: string) => {
    const entry = pending.get(key);
    if (!entry) return;
    clearTimeout(entry.timer);
    pending.delete(key);
    void entry.fn();
  };

  return {
    schedule(key, fn) {
      const existing = pending.get(key);
      if (existing) clearTimeout(existing.timer);

      const timer = setTimeout(() => {
        invoke(key);
      }, waitMs);

      pending.set(key, { timer, fn });
    },
    cancel(key) {
      if (key !== undefined) {
        const entry = pending.get(key);
        if (entry) clearTimeout(entry.timer);
        pending.delete(key);
        return;
      }
      for (const entry of pending.values()) clearTimeout(entry.timer);
      pending.clear();
    },
    flush(key) {
      if (key !== undefined) {
        invoke(key);
        return;
      }
      for (const pendingKey of Array.from(pending.keys())) {
        invoke(pendingKey);
      }
    },
  };
}
