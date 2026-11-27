"use client";

import { useSyncExternalStore } from "react";
import { dateInMonth, shiftMonth, todayStr } from "./format";

export type EntryType = "expense" | "income";

export type Entry = {
  id: string;
  type: EntryType;
  date: string; // YYYY-MM-DD
  category: string;
  amount: number;
  memo: string;
  /** 固定収支から自動で作られた記録なら、そのルールのID */
  recurringId?: string;
};

export type RecurringRule = {
  id: string;
  type: EntryType;
  category: string;
  amount: number;
  memo: string;
  /** 毎月何日に記録するか（1〜31。月末を超える場合は月末） */
  day: number;
  /** 記録を始める月 YYYY-MM */
  startMonth: string;
  /** 最後に記録を作った月 YYYY-MM（まだなら null） */
  lastMonth: string | null;
};

export type Settings = {
  /** 記録を始めたときの所持金 */
  initialBalance: number;
};

export const EXPENSE_CATEGORIES = [
  "食費",
  "外食",
  "交通",
  "日用品",
  "趣味・娯楽",
  "交際費",
  "衣服・美容",
  "学業",
  "通信",
  "サブスク",
  "住居",
  "水道光熱",
  "医療",
  "その他",
];

export const INCOME_CATEGORIES = ["バイト", "仕送り", "奨学金", "お小遣い", "その他"];

/** カテゴリのイラスト（絵文字）。以前のバージョンのカテゴリ名にも対応 */
const CATEGORY_ICONS: Record<string, string> = {
  食費: "🍙",
  外食: "🍜",
  交通: "🚃",
  日用品: "🧻",
  "趣味・娯楽": "🎮",
  娯楽: "🎮",
  交際費: "🎉",
  "衣服・美容": "👕",
  衣服: "👕",
  学業: "📚",
  通信: "📱",
  サブスク: "📺",
  住居: "🏠",
  水道光熱: "💡",
  医療: "🏥",
  バイト: "💼",
  仕送り: "💌",
  奨学金: "🎓",
  お小遣い: "👛",
  給与: "💴",
  賞与: "🎁",
  副業: "💻",
};

/** 自分で追加したカテゴリ */
export type CustomCategory = { name: string; icon: string };
export type CustomCategories = Record<EntryType, CustomCategory[]>;

/** カテゴリを追加する時に選べるイラスト */
export const ICON_CHOICES = [
  "☕", "🍔", "🍰", "🍺", "🛒", "🧴", "💊", "💄",
  "💇", "🎤", "🎬", "🎧", "📷", "🎨", "⚽", "🏋️",
  "✈️", "🚲", "🚕", "⛽", "🐶", "🌱", "🎁", "💻",
  "📝", "🧸", "🎓", "🏆", "💴", "🪙", "💳", "📈",
];

export function categoryIcon(category: string, type: EntryType) {
  return (
    CATEGORY_ICONS[category] ??
    customStore.get()[type].find((c) => c.name === category)?.icon ??
    (type === "income" ? "💰" : "📦")
  );
}

/** 選べるカテゴリの一覧。追加したカテゴリは「その他」の前に入る */
export function categoriesFor(type: EntryType, custom: CustomCategories = customStore.get()) {
  const base = type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const others = base[base.length - 1];
  return [...base.slice(0, -1), ...custom[type].map((c) => c.name), others];
}

/** localStorage に保存する小さなストア（useSyncExternalStore 用） */
function createStore<T>(key: string, fallback: T, isValid: (v: unknown) => v is T) {
  let cache: T | null = null;
  const listeners = new Set<() => void>();

  const get = (): T => {
    if (cache !== null) return cache;
    try {
      const raw = window.localStorage.getItem(key);
      const parsed: unknown = raw ? JSON.parse(raw) : null;
      cache = isValid(parsed) ? parsed : fallback;
    } catch {
      cache = fallback;
    }
    return cache;
  };

  const set = (next: T) => {
    cache = next;
    try {
      window.localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // ストレージが使えない場合はメモリ上のみで保持
    }
    listeners.forEach((l) => l());
  };

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) {
        cache = null;
        listener();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  };

  return { get, set, subscribe };
}

const isArray = <T,>(v: unknown): v is T[] => Array.isArray(v);

const EMPTY_ENTRIES: Entry[] = [];
const EMPTY_RULES: RecurringRule[] = [];
const DEFAULT_SETTINGS: Settings = { initialBalance: 0 };

const entriesStore = createStore<Entry[]>("kakeibo:entries:v1", EMPTY_ENTRIES, isArray);
const rulesStore = createStore<RecurringRule[]>("kakeibo:recurring:v1", EMPTY_RULES, isArray);
const settingsStore = createStore<Settings>(
  "kakeibo:settings:v1",
  DEFAULT_SETTINGS,
  (v): v is Settings =>
    typeof v === "object" && v !== null && typeof (v as Settings).initialBalance === "number",
);
const EMPTY_CUSTOM: CustomCategories = { expense: [], income: [] };
const customStore = createStore<CustomCategories>(
  "kakeibo:categories:v1",
  EMPTY_CUSTOM,
  (v): v is CustomCategories =>
    typeof v === "object" &&
    v !== null &&
    Array.isArray((v as CustomCategories).expense) &&
    Array.isArray((v as CustomCategories).income),
);

export function useEntries() {
  return useSyncExternalStore(entriesStore.subscribe, entriesStore.get, () => EMPTY_ENTRIES);
}

export function useRecurringRules() {
  return useSyncExternalStore(rulesStore.subscribe, rulesStore.get, () => EMPTY_RULES);
}

export function useSettings() {
  return useSyncExternalStore(settingsStore.subscribe, settingsStore.get, () => DEFAULT_SETTINGS);
}

export function useCustomCategories() {
  return useSyncExternalStore(customStore.subscribe, customStore.get, () => EMPTY_CUSTOM);
}

/** カテゴリを追加する。うまくいかない時はその理由を返す */
export function addCustomCategory(type: EntryType, rawName: string, icon: string): string | null {
  const name = rawName.trim();
  if (!name) return "カテゴリ名を入力してください";
  if (name.length > 10) return "カテゴリ名は10文字までです";
  if (categoriesFor(type).includes(name)) return "同じ名前のカテゴリがすでにあります";
  const current = customStore.get();
  customStore.set({ ...current, [type]: [...current[type], { name, icon }] });
  return null;
}

/** 追加したカテゴリを消す。そのカテゴリで付けた過去の記録は残る */
export function deleteCustomCategory(type: EntryType, name: string) {
  const current = customStore.get();
  customStore.set({ ...current, [type]: current[type].filter((c) => c.name !== name) });
}

export function addEntry(entry: Omit<Entry, "id">) {
  entriesStore.set([...entriesStore.get(), { ...entry, id: crypto.randomUUID() }]);
}

export function deleteEntry(id: string) {
  entriesStore.set(entriesStore.get().filter((e) => e.id !== id));
}

export function setInitialBalance(initialBalance: number) {
  settingsStore.set({ ...settingsStore.get(), initialBalance });
}

export function addRecurringRule(rule: Omit<RecurringRule, "id" | "lastMonth">) {
  rulesStore.set([...rulesStore.get(), { ...rule, id: crypto.randomUUID(), lastMonth: null }]);
  applyRecurring();
}

/** ルールを削除する。すでに記録された過去分の明細は残す */
export function deleteRecurringRule(id: string) {
  rulesStore.set(rulesStore.get().filter((r) => r.id !== id));
}

/**
 * 固定収支のルールから、今日までに来た分の記録を自動で作る。
 * 各ルールは lastMonth を覚えているので、同じ月が二重に記録されることはない。
 */
export function applyRecurring(today = todayStr()) {
  const thisMonth = today.slice(0, 7);
  const created: Entry[] = [];
  let changed = false;

  const nextRules = rulesStore.get().map((r) => {
    let last = r.lastMonth;
    let m = last ? shiftMonth(last, 1) : r.startMonth;
    while (m <= thisMonth) {
      const date = dateInMonth(m, r.day);
      if (date > today) break;
      created.push({
        id: crypto.randomUUID(),
        type: r.type,
        date,
        category: r.category,
        amount: r.amount,
        memo: r.memo,
        recurringId: r.id,
      });
      last = m;
      m = shiftMonth(m, 1);
    }
    if (last === r.lastMonth) return r;
    changed = true;
    return { ...r, lastMonth: last };
  });

  if (created.length > 0) entriesStore.set([...entriesStore.get(), ...created]);
  if (changed) rulesStore.set(nextRules);
}

/** 指定した月に、これから自動記録される予定の固定収支（今日より後の日付のもの） */
export function scheduledInMonth(rules: RecurringRule[], ym: string, today = todayStr()) {
  return rules
    .filter((r) => r.startMonth <= ym && (r.lastMonth === null || r.lastMonth < ym))
    .map((rule) => ({ rule, date: dateInMonth(ym, rule.day) }))
    .filter((s) => s.date > today);
}

/** 今月これから自動記録される予定の固定収支 */
export function upcomingThisMonth(rules: RecurringRule[], today = todayStr()) {
  return scheduledInMonth(rules, today.slice(0, 7), today).map((s) => s.rule);
}
