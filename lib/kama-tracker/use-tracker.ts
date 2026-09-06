"use client";

import { useBrowserStorage } from "@/lib/storage";

import {
  addTrade,
  addShatteringRune,
  completeSale,
  completeRuneSale,
  deleteTrade,
  deleteShatteringRune,
  reopenRuneSale,
  trackerStorage,
  updateTrade,
} from "./store";

/** Subscribes a client component to the tracker state and its mutation operations. */
export function useTracker() {
  const { value: state } = useBrowserStorage(trackerStorage);

  return {
    state,
    addTrade,
    addShatteringRune,
    completeSale,
    completeRuneSale,
    updateTrade,
    reopenRuneSale,
    deleteShatteringRune,
    deleteTrade,
  };
}