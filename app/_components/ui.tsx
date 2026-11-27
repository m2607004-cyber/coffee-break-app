"use client";

import type { ReactNode } from "react";
import { monthLabel, shiftMonth, yen } from "../lib/format";

export const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-3 text-base dark:border-zinc-700";

export const incomeText = "text-emerald-600 dark:text-emerald-400";
export const expenseText = "text-rose-600 dark:text-rose-400";

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
    <div className="min-w-0 rounded-xl bg-zinc-100 px-3 py-2 dark:bg-zinc-800">
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
                ? "bg-rose-600 text-white"
                : "bg-emerald-600 text-white"
              : "text-zinc-600 dark:text-zinc-300"
          }`}
        >
          {t === "expense" ? "支出" : "収入"}
        </button>
      ))}
    </div>
  );
}
