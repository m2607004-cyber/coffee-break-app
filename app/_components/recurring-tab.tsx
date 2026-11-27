"use client";

import { useState } from "react";
import {
  addRecurringRule,
  categoriesFor,
  deleteRecurringRule,
  useRecurringRules,
  type EntryType,
} from "../lib/entries-store";
import { monthLabel, todayStr, yen } from "../lib/format";
import { Card, expenseText, incomeText, inputClass, TypeToggle } from "./ui";

export default function RecurringTab() {
  const rules = useRecurringRules();
  const [type, setType] = useState<EntryType>("expense");
  const [category, setCategory] = useState(categoriesFor("expense")[0]);
  const [amount, setAmount] = useState("");
  const [day, setDay] = useState("25");
  const [memo, setMemo] = useState("");
  const [startMonth, setStartMonth] = useState(() => todayStr().slice(0, 7));

  const changeType = (t: EntryType) => {
    setType(t);
    setCategory(categoriesFor(t)[0]);
  };

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    const value = Math.round(Number(amount));
    const d = Number(day);
    if (!Number.isFinite(value) || value <= 0 || !(d >= 1 && d <= 31) || !startMonth) return;
    addRecurringRule({ type, category, amount: value, memo: memo.trim(), day: d, startMonth });
    setAmount("");
    setMemo("");
  };

  const monthlyIncome = rules.filter((r) => r.type === "income").reduce((s, r) => s + r.amount, 0);
  const monthlyExpense = rules.filter((r) => r.type === "expense").reduce((s, r) => s + r.amount, 0);

  return (
    <div className="space-y-4">
      <Card title="固定収支を登録">
        <p className="mb-3 text-sm text-zinc-500">
          家賃・スマホ代・サブスク・仕送り・バイト代など、毎月決まった日に発生するお金を登録すると、その日になったら自動で明細に記録されます。
        </p>
        <form onSubmit={submit} className="space-y-3">
          <TypeToggle value={type} onChange={changeType} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm text-zinc-500">カテゴリ</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={inputClass}
              >
                {categoriesFor(type).map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-500">金額（円）</label>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`${inputClass} text-right tabular-nums`}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-500">毎月の日付</label>
              <select value={day} onChange={(e) => setDay(e.target.value)} className={inputClass}>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    {d === 31 ? "月末" : `${d}日`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-500">開始月</label>
              <input
                type="month"
                value={startMonth}
                onChange={(e) => setStartMonth(e.target.value)}
                className={inputClass}
                required
              />
            </div>
          </div>
          <input
            type="text"
            placeholder="メモ（例：家賃、Netflix）"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            className={inputClass}
          />
          <button
            type="submit"
            className="w-full rounded-xl bg-zinc-900 py-3 font-bold text-white active:opacity-80 dark:bg-zinc-100 dark:text-zinc-900"
          >
            登録する
          </button>
          <p className="text-xs text-zinc-500">
            ※ 開始月の指定日がすでに過ぎている場合は、登録した時点でその月の分も記録されます。
          </p>
        </form>
      </Card>

      <Card title={`登録中の固定収支（${rules.length}件）`}>
        {rules.length === 0 ? (
          <p className="text-sm text-zinc-500">まだ登録されていません。</p>
        ) : (
          <>
            <div className="mb-3 flex justify-between rounded-lg bg-zinc-100 px-3 py-2 text-sm dark:bg-zinc-800">
              <span>
                毎月の収入 <b className={`tabular-nums ${incomeText}`}>{yen.format(monthlyIncome)}</b>
              </span>
              <span>
                毎月の支出 <b className={`tabular-nums ${expenseText}`}>{yen.format(monthlyExpense)}</b>
              </span>
            </div>
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {rules.map((r) => (
                <li key={r.id} className="flex items-center gap-3 py-3 text-sm">
                  <span className="w-12 shrink-0 text-zinc-500">
                    {r.day === 31 ? "月末" : `${r.day}日`}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">
                      {r.category}
                      {r.memo && <span className="text-zinc-500"> ・{r.memo}</span>}
                    </span>
                    <span className="text-xs text-zinc-500">{monthLabel(r.startMonth)}から</span>
                  </span>
                  <span
                    className={`tabular-nums font-medium ${r.type === "income" ? incomeText : expenseText}`}
                  >
                    {r.type === "income" ? "+" : "−"}
                    {yen.format(r.amount)}
                  </span>
                  <button
                    onClick={() => {
                      if (
                        confirm("この固定収支を削除しますか？\n（すでに記録された明細は残ります）")
                      )
                        deleteRecurringRule(r.id);
                    }}
                    className="grid size-8 place-items-center text-zinc-400 active:text-rose-600"
                    aria-label="削除"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </div>
  );
}
