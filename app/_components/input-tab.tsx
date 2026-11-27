"use client";

import { useState } from "react";
import { addEntry, categoriesFor, useEntries, type EntryType } from "../lib/entries-store";
import { todayStr, yen } from "../lib/format";
import { Card, expenseText, incomeText, inputClass, TypeToggle } from "./ui";

export default function InputTab({
  initialType = "expense",
  initialAmount = "",
  onOpenCalc,
}: {
  initialType?: EntryType;
  initialAmount?: string;
  onOpenCalc: () => void;
}) {
  const entries = useEntries();
  const [type, setType] = useState<EntryType>(initialType);
  const [date, setDate] = useState(todayStr);
  const [category, setCategory] = useState(categoriesFor(initialType)[0]);
  const [amount, setAmount] = useState(initialAmount);
  const [memo, setMemo] = useState("");
  const [saved, setSaved] = useState<string | null>(null);

  const categories = categoriesFor(type);

  const changeType = (t: EntryType) => {
    setType(t);
    setCategory(categoriesFor(t)[0]);
  };

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    const value = Math.round(Number(amount));
    if (!date || !Number.isFinite(value) || value <= 0) return;
    addEntry({ type, date, category, amount: value, memo: memo.trim() });
    setSaved(`${category} ${yen.format(value)} を記録しました`);
    setAmount("");
    setMemo("");
  };

  const recent = [...entries]
    .sort((a, b) => b.date.localeCompare(a.date) || 0)
    .slice(0, 5);

  return (
    <div className="space-y-4">
      <Card>
        <form onSubmit={submit} className="space-y-4">
          <TypeToggle value={type} onChange={changeType} />

          <div>
            <label className="mb-1 block text-sm text-zinc-500">金額</label>
            <div className="flex gap-2">
              <input
                type="number"
                inputMode="numeric"
                min={1}
                placeholder="0"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setSaved(null);
                }}
                className={`${inputClass} text-right text-2xl font-bold tabular-nums`}
                required
              />
              <button
                type="button"
                onClick={onOpenCalc}
                className="shrink-0 rounded-lg border border-zinc-300 px-3 text-sm dark:border-zinc-700"
              >
                電卓
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm text-zinc-500">カテゴリ</label>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`rounded-full border px-3 py-1.5 text-sm ${
                    category === c
                      ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                      : "border-zinc-300 dark:border-zinc-700"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm text-zinc-500">日付</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-500">メモ</label>
              <input
                type="text"
                placeholder="任意"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <button
            type="submit"
            className={`w-full rounded-xl py-3.5 font-bold text-white active:opacity-80 ${
              type === "expense" ? "bg-rose-600" : "bg-emerald-600"
            }`}
          >
            {type === "expense" ? "支出を記録" : "収入を記録"}
          </button>
          {saved && (
            <p role="status" className="text-center text-sm text-zinc-600 dark:text-zinc-300">
              ✓ {saved}
            </p>
          )}
        </form>
      </Card>

      {recent.length > 0 && (
        <Card title="最近の記録">
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {recent.map((e) => (
              <li key={e.id} className="flex items-center gap-3 py-2 text-sm">
                <span className="w-11 shrink-0 tabular-nums text-zinc-500">
                  {Number(e.date.slice(5, 7))}/{Number(e.date.slice(8, 10))}
                </span>
                <span className="flex-1 truncate">
                  {e.category}
                  {e.memo && <span className="text-zinc-500"> ・{e.memo}</span>}
                </span>
                <span
                  className={`tabular-nums font-medium ${e.type === "income" ? incomeText : expenseText}`}
                >
                  {e.type === "income" ? "+" : "−"}
                  {yen.format(e.amount)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
