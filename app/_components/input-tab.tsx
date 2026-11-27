"use client";

import { useState } from "react";
import {
  addEntry,
  addRecurringRule,
  categoriesFor,
  categoryIcon,
  useEntries,
  type EntryType,
} from "../lib/entries-store";
import { shiftDay, todayStr, yen } from "../lib/format";
import AmountField from "./amount-field";
import RecurringList from "./recurring-list";
import {
  Card,
  CategoryIcon,
  expenseText,
  incomeText,
  inputClass,
  TypeToggle,
  weekdayClass,
} from "./ui";

const arrowBtn =
  "grid size-12 shrink-0 place-items-center rounded-lg border border-zinc-300 text-2xl active:bg-zinc-100 dark:border-zinc-700 dark:active:bg-zinc-800";

export default function InputTab({ initialDate }: { initialDate?: string }) {
  const entries = useEntries();
  const [type, setType] = useState<EntryType>("expense");
  const [date, setDate] = useState(() => initialDate ?? todayStr());
  const [category, setCategory] = useState(categoriesFor("expense")[0]);
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [recurring, setRecurring] = useState(false);

  const categories = categoriesFor(type);
  const today = todayStr();
  const dow = new Date((date || today) + "T00:00:00").getDay();
  const day = Number(date.slice(8, 10)) || 1;
  const dayLabel = day === 31 ? "月末" : `${day}日`;

  const changeType = (t: EntryType) => {
    setType(t);
    setCategory(categoriesFor(t)[0]);
  };

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    const value = Math.round(Number(amount));
    if (!date || !Number.isFinite(value) || value <= 0) {
      setError(true);
      return;
    }
    setError(false);
    if (recurring) {
      // 入力した日付の月から、毎月同じ日に自動で記録する（今日までの分はすぐ記録される）
      addRecurringRule({
        type,
        category,
        amount: value,
        memo: memo.trim(),
        day,
        startMonth: date.slice(0, 7),
      });
      setSaved(`${category} ${yen.format(value)} を毎月${dayLabel}の固定収支に登録しました`);
    } else {
      addEntry({ type, date, category, amount: value, memo: memo.trim() });
      setSaved(`${category} ${yen.format(value)} を記録しました`);
    }
    setAmount("");
    setMemo("");
    setRecurring(false);
  };

  const recent = [...entries]
    .sort((a, b) => b.date.localeCompare(a.date) || 0)
    .slice(0, 5);

  return (
    <div className="space-y-4">
      <Card>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="date" className="mb-1 block text-sm text-zinc-500">
              日付
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDate(shiftDay(date, -1))}
                className={arrowBtn}
                aria-label="前の日"
              >
                ‹
              </button>
              <input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={`${inputClass} min-w-0 text-center`}
                required
              />
              <button
                type="button"
                onClick={() => setDate(shiftDay(date, 1))}
                className={arrowBtn}
                aria-label="次の日"
              >
                ›
              </button>
            </div>
            <div className="mt-1 flex items-center justify-center gap-2 text-sm">
              <span className={weekdayClass(dow)}>（{"日月火水木金土"[dow]}）</span>
              {date === today ? (
                <span className="text-zinc-500">今日</span>
              ) : (
                <button
                  type="button"
                  onClick={() => setDate(today)}
                  className="rounded-full border border-zinc-300 px-2 py-0.5 text-xs dark:border-zinc-700"
                >
                  今日に戻す
                </button>
              )}
            </div>
          </div>

          <TypeToggle value={type} onChange={changeType} />

          <div>
            <span className="mb-1 block text-sm text-zinc-500">金額</span>
            <AmountField
              large
              value={amount}
              onChange={(v) => {
                setAmount(v);
                setSaved(null);
                setError(false);
              }}
            />
            {error && (
              <p role="alert" className={`mt-1 text-sm ${expenseText}`}>
                金額を入力してください
              </p>
            )}
          </div>

          <div>
            <span className="mb-1 block text-sm text-zinc-500">カテゴリ</span>
            <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="カテゴリ">
              {categories.map((c) => {
                const active = category === c;
                return (
                  <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setCategory(c)}
                    className={`flex flex-col items-center gap-1 rounded-xl border px-1 py-2 ${
                      active
                        ? type === "expense"
                          ? "border-exp bg-exp-soft ring-1 ring-exp"
                          : "border-inc bg-inc-soft ring-1 ring-inc"
                        : "border-zinc-200 active:bg-zinc-100 dark:border-zinc-800 dark:active:bg-zinc-800"
                    }`}
                  >
                    <span className="text-2xl leading-none" aria-hidden>
                      {categoryIcon(c, type)}
                    </span>
                    <span
                      className={`w-full truncate text-center text-[11px] leading-tight ${
                        active ? "font-bold" : "text-zinc-600 dark:text-zinc-300"
                      }`}
                    >
                      {c}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label htmlFor="memo" className="mb-1 block text-sm text-zinc-500">
              メモ
            </label>
            <input
              id="memo"
              type="text"
              placeholder="任意"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800" role="radiogroup" aria-label="記録のしかた">
            <div className="flex gap-1">
              {[
                { v: false, label: "今回だけ" },
                { v: true, label: "毎月くり返す（固定）" },
              ].map((o) => (
                <button
                  key={o.label}
                  type="button"
                  role="radio"
                  aria-checked={recurring === o.v}
                  onClick={() => setRecurring(o.v)}
                  className={`flex-1 rounded-lg py-2 text-sm font-semibold ${
                    recurring === o.v
                      ? "bg-white shadow-sm dark:bg-zinc-950"
                      : "text-zinc-500 dark:text-zinc-400"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
            {recurring && (
              <p className="px-2 pb-1 pt-2 text-xs text-zinc-600 dark:text-zinc-300">
                毎月<b>{dayLabel}</b>
                に自動で記録されます（{Number(date.slice(5, 7))}月分から）。家賃・スマホ代・サブスク・仕送り・バイト代などに。
              </p>
            )}
          </div>

          <button
            type="submit"
            className={`w-full rounded-xl py-3.5 font-bold text-white active:opacity-80 dark:text-zinc-950 ${
              type === "expense" ? "bg-exp" : "bg-inc"
            }`}
          >
            {recurring
              ? `毎月の${type === "expense" ? "支出" : "収入"}として登録`
              : type === "expense"
                ? "支出を記録"
                : "収入を記録"}
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
                <CategoryIcon category={e.category} type={e.type} size="sm" />
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

      <RecurringList />
    </div>
  );
}
