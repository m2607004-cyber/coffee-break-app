"use client";

import { useMemo, useState } from "react";
import { useEntries } from "../lib/entries-store";
import { todayStr } from "../lib/format";
import { Card, EntryRow, expenseText, incomeText, MonthSwitcher, Stat } from "./ui";

export default function ListTab() {
  const entries = useEntries();
  const [month, setMonth] = useState(() => todayStr().slice(0, 7));

  const monthEntries = useMemo(
    () =>
      entries
        .filter((e) => e.date.startsWith(month))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [entries, month],
  );

  const income = monthEntries.filter((e) => e.type === "income").reduce((s, e) => s + e.amount, 0);
  const expense = monthEntries.filter((e) => e.type === "expense").reduce((s, e) => s + e.amount, 0);

  // 日付ごとにまとめる
  const groups = useMemo(() => {
    const map = new Map<string, typeof monthEntries>();
    for (const e of monthEntries) {
      const list = map.get(e.date) ?? [];
      list.push(e);
      map.set(e.date, list);
    }
    return [...map.entries()];
  }, [monthEntries]);

  return (
    <div className="space-y-4">
      <MonthSwitcher month={month} onChange={setMonth} />
      <div className="grid grid-cols-3 gap-2">
        <Stat label="収入" value={income} className={incomeText} />
        <Stat label="支出" value={expense} className={expenseText} />
        <Stat label="残金" value={income - expense} className={income - expense < 0 ? expenseText : ""} />
      </div>

      {groups.length === 0 ? (
        <Card>
          <p className="text-sm text-zinc-500">この月の記録はまだありません。</p>
        </Card>
      ) : (
        groups.map(([date, list]) => (
          <Card key={date} className="!p-0">
            <h3 className="border-b border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-500 dark:border-zinc-800">
              {Number(date.slice(5, 7))}月{Number(date.slice(8, 10))}日（
              {"日月火水木金土"[new Date(date + "T00:00:00").getDay()]}）
            </h3>
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {list.map((e) => (
                <EntryRow key={e.id} entry={e} />
              ))}
            </ul>
          </Card>
        ))
      )}
    </div>
  );
}
