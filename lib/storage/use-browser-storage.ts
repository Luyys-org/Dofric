"use client";

import { useSyncExternalStore } from "react";

import type { BrowserStorage } from "./browser-storage";

export interface UseBrowserStorageResult<T> {
  value: T;
  setValue: (value: T | ((previous: T) => T)) => void;
  remove: () => void;
}

/**
 * Subscribes a component to a `BrowserStorage` binding.
 * During SSR and the first client render it returns the default value, so
 * hydration stays consistent; the stored value arrives on the next commit.
 */
export function useBrowserStorage<T>(
  storage: BrowserStorage<T>,
): UseBrowserStorageResult<T> {
  const value = useSyncExternalStore(
    storage.subscribe,
    storage.get,
    storage.getServerSnapshot,
  );

  return { value, setValue: storage.set, remove: storage.remove };
}
