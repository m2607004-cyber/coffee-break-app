"use client";

import { useEffect, type ReactNode } from "react";

/** 画面の下から出てくるパネル。背景をタップするか Esc で閉じる */
export function BottomSheet({
  label,
  onClose,
  children,
}: {
  label: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-end" role="dialog" aria-label={label}>
      <button
        type="button"
        className="absolute inset-0 bg-black/30"
        aria-label={`${label}を閉じる`}
        onClick={onClose}
      />
      <div className="relative mx-auto flex max-h-[80dvh] w-full max-w-md flex-col rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl dark:bg-zinc-900">
        {children}
      </div>
    </div>
  );
}
import { categoryIcon, deleteEntry, type Entry, type EntryType } from "../lib/entries-store";

/** カテゴリのイラストを丸い背景に入れて表示する */
export function CategoryIcon({
  category,
  type,
  size = "md",
}: {
  category: string;
  type: EntryType;
  size?: "sm" | "md";
}) {
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-full ${
        type === "income" ? "bg-inc-soft" : "bg-exp-soft"
      } ${size === "sm" ? "size-7 text-base" : "size-9 text-xl"}`}
    >
      {categoryIcon(category, type)}
    </span>
  );
}
import { monthLabel, shiftMonth, yen } from "../lib/format";

/** 明細の1行（カテゴリ・固定マーク・メモ・金額・削除ボタン） */
export function EntryRow({ entry: e }: { entry: Entry }) {
  return (
    <li className="flex items-center gap-3 px-4 py-2.5 text-sm">
      <CategoryIcon category={e.category} type={e.type} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1">
          <span className="truncate">{e.category}</span>
          {e.recurringId && (
            <span className="shrink-0 rounded bg-sched-soft px-1.5 py-0.5 text-xs text-sched">
              固定
            </span>
          )}
        </span>
        {e.memo && (
          <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">{e.memo}</span>
        )}
      </span>
      <span className={`tabular-nums font-medium ${e.type === "income" ? incomeText : expenseText}`}>
        {e.type === "income" ? "+" : "−"}
        {yen.format(e.amount)}
      </span>
      <button
        onClick={() => {
          if (confirm("この記録を削除しますか？")) deleteEntry(e.id);
        }}
        className="grid size-8 place-items-center text-zinc-400 active:text-exp"
        aria-label="削除"
      >
        ✕
      </button>
    </li>
  );
}

export const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-3 text-base dark:border-zinc-700";

/** 曜日の文字色（日曜=赤、土曜=青） */
export function weekdayClass(dow: number) {
  if (dow === 0) return "text-exp";
  if (dow === 6) return "text-inc";
  return "";
}

export const incomeText = "text-inc";
export const expenseText = "text-exp";

export function Card({
  title,
  children,
  className = "",
}: {
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 ${className}`}
    >
      {title && <h2 className="mb-3 font-semibold">{title}</h2>}
      {children}
    </section>
  );
}

export function MonthSwitcher({
  month,
  onChange,
}: {
  month: string;
  onChange: (ym: string) => void;
}) {
  const btn =
    "grid size-10 place-items-center rounded-full border border-zinc-300 text-lg active:bg-zinc-100 dark:border-zinc-700 dark:active:bg-zinc-800";
  return (
    <div className="flex items-center justify-between">
      <button className={btn} onClick={() => onChange(shiftMonth(month, -1))} aria-label="前の月">
        ‹
      </button>
      <span className="font-semibold tabular-nums">{monthLabel(month)}</span>
      <button className={btn} onClick={() => onChange(shiftMonth(month, 1))} aria-label="次の月">
        ›
      </button>
    </div>
  );
}

export function Stat({
  label,
  value,
  className = "",
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="text-xs text-zinc-500 dark:text-zinc-400">{label}</div>
      <div className={`truncate font-bold tabular-nums ${className}`}>{yen.format(value)}</div>
    </div>
  );
}

export function TypeToggle({
  value,
  onChange,
}: {
  value: "expense" | "income";
  onChange: (t: "expense" | "income") => void;
}) {
  return (
    <div className="flex gap-2 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
      {(["expense", "income"] as const).map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onChange(t)}
          className={`flex-1 rounded-lg py-2 text-sm font-semibold ${
            value === t
              ? t === "expense"
                ? "bg-exp text-white dark:text-zinc-950"
                : "bg-inc text-white dark:text-zinc-950"
              : "text-zinc-600 dark:text-zinc-300"
          }`}
        >
          {t === "expense" ? "支出" : "収入"}
        </button>
      ))}
    </div>
  );
}
