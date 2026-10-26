type KeyedDebouncer = {
  schedule: (key: string, fn: () => void | Promise<void>) => void;
  cancel: (key?: string) => void;
};

/** Independent debounce timers keyed by string (safe to hold in a ref). */
export function createKeyedDebouncer(waitMs: number): KeyedDebouncer {
  const timers = new Map<string, ReturnType<typeof setTimeout>>();

  return {
    schedule(key, fn) {
      const existing = timers.get(key);
      if (existing) clearTimeout(existing);

      const timer = setTimeout(() => {
        timers.delete(key);
        void fn();
      }, waitMs);

      timers.set(key, timer);
    },
    cancel(key) {
      if (key !== undefined) {
        const timer = timers.get(key);
        if (timer) clearTimeout(timer);
        timers.delete(key);
        return;
      }
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
    },
  };
}
