"use client";

import { useBrowserStorage } from "@/lib/storage";

import {
  addTrade,
  completeSale,
  deleteTrade,
  trackerStorage,
  updateTrade,
} from "./store";

export function useTracker() {
  const { value: state } = useBrowserStorage(trackerStorage);

  return {
    state,
    addTrade,
    completeSale,
    updateTrade,
    deleteTrade,
  };
}