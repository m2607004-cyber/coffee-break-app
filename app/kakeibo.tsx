"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import {
  addEntry,
  deleteEntry,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  useEntries,
  type EntryType,
} from "./lib/entries-store";

const yen = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
});

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function shiftMonth(ym: string, delta: number) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

const noopSubscribe = () => () => {};

export default function Kakeibo() {
  // 日付やlocalStorageはブラウザでのみ確定するため、ハイドレーション後に描画する
  const isClient = useSyncExternalStore(noopSubscribe, () => true, () => false);
  if (!isClient) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-bold">家計簿</h1>
        <p className="mt-4 text-sm text-zinc-500">読み込み中…</p>
      </main>
    );
  }
  return <KakeiboApp />;
}

function KakeiboApp() {
  const entries = useEntries();
  const [month, setMonth] = useState(() => todayStr().slice(0, 7));

  const monthEntries = useMemo(
    () =>
      entries
        .filter((e) => e.date.startsWith(month))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [entries, month],
  );

  const income = monthEntries
    .filter((e) => e.type === "income")
    .reduce((s, e) => s + e.amount, 0);
  const expense = monthEntries
    .filter((e) => e.type === "expense")
    .reduce((s, e) => s + e.amount, 0);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of monthEntries) {
      if (e.type !== "expense") continue;
      map.set(e.category, (map.get(e.category) ?? 0) + e.amount);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [monthEntries]);

  const [y, m] = month.split("-").map(Number);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">家計簿</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMonth(shiftMonth(month, -1))}
            className="rounded-md border border-zinc-300 px-3 py-1 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            aria-label="前の月"
          >
            ←
          </button>
          <span className="w-28 text-center font-medium tabular-nums">
            {y}年{m}月
          </span>
          <button
            onClick={() => setMonth(shiftMonth(month, 1))}
            className="rounded-md border border-zinc-300 px-3 py-1 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            aria-label="次の月"
          >
            →
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label="収入" value={income} className="text-emerald-600 dark:text-emerald-400" />
        <Stat label="支出" value={expense} className="text-rose-600 dark:text-rose-400" />
        <Stat
          label="収支"
          value={income - expense}
          className={income - expense >= 0 ? "" : "text-rose-600 dark:text-rose-400"}
        />
      </section>

      <EntryForm key={month} defaultDate={month === todayStr().slice(0, 7) ? todayStr() : `${month}-01`} />

      {byCategory.length > 0 && (
        <section className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
          <h2 className="mb-3 font-semibold">カテゴリ別支出</h2>
          <ul className="space-y-2">
            {byCategory.map(([cat, amt]) => (
              <li key={cat} className="text-sm">
                <div className="mb-1 flex justify-between">
                  <span>{cat}</span>
                  <span className="tabular-nums">
                    {yen.format(amt)}（{Math.round((amt / expense) * 100)}%）
                  </span>
                </div>
                <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className="h-2 rounded-full bg-rose-500"
                    style={{ width: `${(amt / expense) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-xl border border-zinc-200 dark:border-zinc-800">
        <h2 className="border-b border-zinc-200 p-4 font-semibold dark:border-zinc-800">
          明細（{monthEntries.length}件）
        </h2>
        {monthEntries.length === 0 ? (
          <p className="p-4 text-sm text-zinc-500">この月の記録はまだありません。</p>
        ) : (
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {monthEntries.map((e) => (
              <li key={e.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                <span className="w-12 shrink-0 tabular-nums text-zinc-500">
                  {Number(e.date.slice(5, 7))}/{Number(e.date.slice(8, 10))}
                </span>
                <span className="w-20 shrink-0 rounded bg-zinc-100 px-2 py-0.5 text-center text-xs dark:bg-zinc-800">
                  {e.category}
                </span>
                <span className="flex-1 truncate text-zinc-600 dark:text-zinc-400">
                  {e.memo}
                </span>
                <span
                  className={`tabular-nums font-medium ${
                    e.type === "income"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {e.type === "income" ? "+" : "−"}
                  {yen.format(e.amount)}
                </span>
                <button
                  onClick={() => {
                    if (confirm("この記録を削除しますか？")) deleteEntry(e.id);
                  }}
                  className="text-zinc-400 hover:text-rose-600"
                  aria-label="削除"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function Stat({
  label,
  value,
  className = "",
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="text-sm text-zinc-500">{label}</div>
      <div className={`text-xl font-bold tabular-nums ${className}`}>
        {yen.format(value)}
      </div>
    </div>
  );
}

function EntryForm({ defaultDate }: { defaultDate: string }) {
  const [type, setType] = useState<EntryType>("expense");
  const [date, setDate] = useState(defaultDate);
  const categories = type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const [category, setCategory] = useState(categories[0]);
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");

  const changeType = (t: EntryType) => {
    setType(t);
    setCategory((t === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES)[0]);
  };

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    const value = Math.round(Number(amount));
    if (!date || !Number.isFinite(value) || value <= 0) return;
    addEntry({ type, date, category, amount: value, memo: memo.trim() });
    setAmount("");
    setMemo("");
  };

  const input =
    "rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700";

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <div className="flex gap-2">
        {(["expense", "income"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => changeType(t)}
            className={`flex-1 rounded-md py-2 text-sm font-medium ${
              type === t
                ? t === "expense"
                  ? "bg-rose-600 text-white"
                  : "bg-emerald-600 text-white"
                : "bg-zinc-100 dark:bg-zinc-800"
            }`}
          >
            {t === "expense" ? "支出" : "収入"}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={input}
          required
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={input}
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          placeholder="金額（円）"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className={input}
          required
        />
        <input
          type="text"
          placeholder="メモ"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          className={input}
        />
      </div>
      <button
        type="submit"
        className="w-full rounded-md bg-foreground py-2 text-sm font-medium text-background hover:opacity-90"
      >
        追加
      </button>
    </form>
  );
}
