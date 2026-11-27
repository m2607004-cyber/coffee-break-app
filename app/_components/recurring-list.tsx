"use client";

import { deleteRecurringRule, useRecurringRules } from "../lib/entries-store";
import { monthLabel, yen } from "../lib/format";
import { Card, expenseText, incomeText } from "./ui";

/** 登録中の固定収支（毎月くり返し）の一覧。削除するとそれ以降は自動記録されない */
export default function RecurringList() {
  const rules = useRecurringRules();
  if (rules.length === 0) return null;

  const monthlyIncome = rules.filter((r) => r.type === "income").reduce((s, r) => s + r.amount, 0);
  const monthlyExpense = rules.filter((r) => r.type === "expense").reduce((s, r) => s + r.amount, 0);

  return (
    <Card title={`毎月の固定収支（${rules.length}件）`}>
      <div className="mb-3 flex justify-between rounded-lg bg-zinc-100 px-3 py-2 text-sm dark:bg-zinc-800">
        <span>
          収入 <b className={`tabular-nums ${incomeText}`}>{yen.format(monthlyIncome)}</b>
        </span>
        <span>
          支出 <b className={`tabular-nums ${expenseText}`}>{yen.format(monthlyExpense)}</b>
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
              <span className="text-xs text-zinc-500">{monthLabel(r.startMonth)}から毎月</span>
            </span>
            <span className={`tabular-nums font-medium ${r.type === "income" ? incomeText : expenseText}`}>
              {r.type === "income" ? "+" : "−"}
              {yen.format(r.amount)}
            </span>
            <button
              onClick={() => {
                if (confirm("この固定収支をやめますか？\n（すでに記録された明細は残ります）"))
                  deleteRecurringRule(r.id);
              }}
              className="grid size-8 place-items-center text-zinc-400 active:text-rose-600"
              aria-label="固定収支をやめる"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
