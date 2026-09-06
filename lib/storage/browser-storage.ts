export type StorageArea = "local" | "session";

export interface StorageCodec<T> {
  parse: (raw: string) => T;
  stringify: (value: T) => string;
}

export interface BrowserStorageOptions<T> {
  area?: StorageArea;
  codec?: StorageCodec<T>;
}

export interface BrowserStorage<T> {
  readonly key: string;
  readonly area: StorageArea;
  /** Stable snapshot for `useSyncExternalStore` — same reference until the value changes. */
  get: () => T;
  /** Snapshot used during SSR and hydration, where no storage exists. */
  getServerSnapshot: () => T;
  set: (value: T | ((previous: T) => T)) => void;
  remove: () => void;
  subscribe: (onStoreChange: () => void) => () => void;
}

const jsonCodec: StorageCodec<unknown> = {
  parse: (raw) => JSON.parse(raw) as unknown,
  stringify: (value) => JSON.stringify(value),
};

type CacheEntry = { raw: string | null; value: unknown };

const caches = new Map<string, CacheEntry>();
const listeners = new Map<string, Set<() => void>>();

let storageEventBound = false;

function cacheId(area: StorageArea, key: string) {
  return `${area}:${key}`;
}

function getArea(area: StorageArea): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return area === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    // Storage can throw when blocked by browser privacy settings.
    return null;
  }
}

function notify(id: string) {
  listeners.get(id)?.forEach((listener) => listener());
}

function bindStorageEvent() {
  if (storageEventBound || typeof window === "undefined") return;
  storageEventBound = true;
  window.addEventListener("storage", (event) => {
    const area: StorageArea | null =
      event.storageArea === window.localStorage
        ? "local"
        : event.storageArea === window.sessionStorage
          ? "session"
          : null;
    if (!area) return;

    if (event.key === null) {
      // `storage.clear()` in another tab.
      for (const id of listeners.keys()) {
        if (id.startsWith(`${area}:`)) {
          caches.delete(id);
          notify(id);
        }
      }
      return;
    }

    const id = cacheId(area, event.key);
    caches.delete(id);
    notify(id);
  });
}

/**
 * Creates a typed, SSR-safe binding to a single `localStorage`/`sessionStorage` key.
 * Writes are broadcast to every subscriber in the current tab, and `storage` events
 * keep other tabs in sync.
 */
export function createBrowserStorage<T>(
  key: string,
  defaultValue: T,
  options: BrowserStorageOptions<T> = {},
): BrowserStorage<T> {
  const { area = "local", codec = jsonCodec as StorageCodec<T> } = options;
  const id = cacheId(area, key);

  const get = (): T => {
    const storage = getArea(area);
    if (!storage) return defaultValue;

    let raw: string | null;
    try {
      raw = storage.getItem(key);
    } catch {
      return defaultValue;
    }

    const cached = caches.get(id);
    if (cached && cached.raw === raw) return cached.value as T;

    let value = defaultValue;
    if (raw !== null) {
      try {
        value = codec.parse(raw);
      } catch {
        value = defaultValue;
      }
    }

    caches.set(id, { raw, value });
    return value;
  };

  return {
    key,
    area,
    get,
    getServerSnapshot: () => defaultValue,
    set: (value) => {
      const storage = getArea(area);
      if (!storage) return;

      const next =
        typeof value === "function"
          ? (value as (previous: T) => T)(get())
          : value;

      try {
        const raw = codec.stringify(next);
        storage.setItem(key, raw);
        caches.set(id, { raw, value: next });
      } catch {
        // Quota exceeded or serialization failure: keep the previous value.
        return;
      }

      notify(id);
    },
    remove: () => {
      const storage = getArea(area);
      if (!storage) return;
      try {
        storage.removeItem(key);
      } catch {
        return;
      }
      caches.delete(id);
      notify(id);
    },
    subscribe: (onStoreChange) => {
      bindStorageEvent();
      let set = listeners.get(id);
      if (!set) {
        set = new Set();
        listeners.set(id, set);
      }
      set.add(onStoreChange);

      return () => {
        set.delete(onStoreChange);
        if (set.size === 0) listeners.delete(id);
      };
    },
  };
}
