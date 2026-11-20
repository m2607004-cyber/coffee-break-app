"use client";

import { useSyncExternalStore } from "react";

export type EntryType = "expense" | "income";

export type Entry = {
  id: string;
  type: EntryType;
  date: string; // YYYY-MM-DD
  category: string;
  amount: number;
  memo: string;
};

export const EXPENSE_CATEGORIES = [
  "食費",
  "日用品",
  "住居",
  "水道光熱",
  "通信",
  "交通",
  "娯楽",
  "衣服",
  "医療",
  "その他",
];

export const INCOME_CATEGORIES = ["給与", "賞与", "副業", "その他"];

const STORAGE_KEY = "kakeibo:entries:v1";
const EMPTY: Entry[] = [];

let cache: Entry[] | null = null;
const listeners = new Set<() => void>();

function read(): Entry[] {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    cache = Array.isArray(parsed) ? parsed : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(next: Entry[]) {
  cache = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ストレージが使えない場合はメモリ上のみで保持
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      cache = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useEntries() {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function addEntry(entry: Omit<Entry, "id">) {
  write([...read(), { ...entry, id: crypto.randomUUID() }]);
}

export function deleteEntry(id: string) {
  write(read().filter((e) => e.id !== id));
}
