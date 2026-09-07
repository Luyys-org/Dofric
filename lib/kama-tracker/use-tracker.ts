"use client";

import { useBrowserStorage } from "@/lib/storage";

import {
  addArchimonsterSoul,
  addTrade,
  addShatteringRune,
  completeArchimonsterSoulSale,
  completeSale,
  completeRuneSale,
  deleteArchimonsterSoul,
  deleteTrade,
  deleteShatteringRune,
  reopenArchimonsterSoulSale,
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
    addArchimonsterSoul,
    addShatteringRune,
    completeArchimonsterSoulSale,
    completeSale,
    completeRuneSale,
    updateTrade,
    reopenArchimonsterSoulSale,
    reopenRuneSale,
    deleteArchimonsterSoul,
    deleteShatteringRune,
    deleteTrade,
  };
}