"use client";

import { useMemo, useState } from "react";
import { scheduledInMonth, useEntries, useRecurringRules } from "../lib/entries-store";
import { daysInMonth, pad, todayStr, yen } from "../lib/format";
import { Card, EntryRow, expenseText, incomeText, MonthSwitcher, Stat, weekdayClass } from "./ui";

const WEEK = ["日", "月", "火", "水", "木", "金", "土"];

/** カレンダーのマス用の短い金額表記（1万円以上は「1.2万」） */
function compact(n: number) {
  if (n >= 10000) return `${(Math.round(n / 1000) / 10).toLocaleString("ja-JP")}万`;
  return n.toLocaleString("ja-JP");
}

export default function CalendarTab({ onAddOnDate }: { onAddOnDate: (date: string) => void }) {
  const entries = useEntries();
  const rules = useRecurringRules();
  const today = todayStr();
  const [selected, setSelected] = useState(today);
  const month = selected.slice(0, 7);

  // 日付ごとの合計
  const daily = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>();
    for (const e of entries) {
      if (!e.date.startsWith(month)) continue;
      const d = map.get(e.date) ?? { income: 0, expense: 0 };
      d[e.type] += e.amount;
      map.set(e.date, d);
    }
    return map;
  }, [entries, month]);

  const scheduled = useMemo(() => scheduledInMonth(rules, month, today), [rules, month, today]);
  const scheduledDates = new Set(scheduled.map((s) => s.date));

  let income = 0;
  let expense = 0;
  for (const d of daily.values()) {
    income += d.income;
    expense += d.expense;
  }

  const [y, m] = month.split("-").map(Number);
  const firstDow = new Date(y, m - 1, 1).getDay();
  const days = daysInMonth(month);
  const cells: (string | null)[] = [
    ...Array<null>(firstDow).fill(null),
    ...Array.from({ length: days }, (_, i) => `${month}-${pad(i + 1)}`),
  ];

  const changeMonth = (ym: string) => {
    // 月を移ったら、今日を含む月なら今日、それ以外は1日を選ぶ
    setSelected(ym === today.slice(0, 7) ? today : `${ym}-01`);
  };

  const dayEntries = entries.filter((e) => e.date === selected);
  const daySchedule = scheduled.filter((s) => s.date === selected);
  const selDow = new Date(selected + "T00:00:00").getDay();

  return (
    <div className="space-y-4">
      <MonthSwitcher month={month} onChange={changeMonth} />
      <div className="grid grid-cols-3 gap-2">
        <Stat label="収入" value={income} className={incomeText} />
        <Stat label="支出" value={expense} className={expenseText} />
        <Stat label="残金" value={income - expense} className={income - expense < 0 ? expenseText : ""} />
      </div>

      <Card className="!p-2">
        <div className="grid grid-cols-7 text-center text-xs font-semibold">
          {WEEK.map((w, i) => (
            <div key={w} className={`py-1 ${weekdayClass(i) || "text-zinc-500"}`}>
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((date, i) => {
            if (!date) return <div key={`blank-${i}`} />;
            const d = daily.get(date);
            const isToday = date === today;
            const isSel = date === selected;
            const dow = i % 7;
            return (
              <button
                key={date}
                onClick={() => setSelected(date)}
                aria-pressed={isSel}
                aria-label={`${Number(date.slice(8))}日${
                  d ? `、収入${d.income}円、支出${d.expense}円` : ""
                }${scheduledDates.has(date) ? "、固定収支の予定あり" : ""}`}
                className={`flex min-h-16 flex-col items-stretch rounded-lg px-0.5 pb-1 pt-0.5 text-left ${
                  isSel
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "active:bg-zinc-100 dark:active:bg-zinc-800"
                }`}
              >
                <span className="flex items-center justify-between">
                  <span
                    className={`grid size-5 place-items-center rounded-full text-xs font-semibold ${
                      isToday && !isSel ? "bg-rose-600 text-white" : isSel ? "" : weekdayClass(dow)
                    }`}
                  >
                    {Number(date.slice(8))}
                  </span>
                  {scheduledDates.has(date) && (
                    <span
                      className={`mr-0.5 size-1.5 rounded-full ${isSel ? "bg-current" : "bg-sky-500"}`}
                      aria-hidden
                    />
                  )}
                </span>
                {d && d.income > 0 && (
                  <span
                    className={`truncate text-right text-[10px] leading-tight tabular-nums ${isSel ? "" : incomeText}`}
                  >
                    +{compact(d.income)}
                  </span>
                )}
                {d && d.expense > 0 && (
                  <span
                    className={`truncate text-right text-[10px] leading-tight tabular-nums ${isSel ? "" : expenseText}`}
                  >
                    −{compact(d.expense)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <p className="mt-2 flex items-center gap-1 px-1 text-xs text-zinc-500">
          <span className="size-1.5 rounded-full bg-sky-500" aria-hidden />
          固定収支の予定日
        </p>
      </Card>

      <Card className="!p-0">
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">
          <h3 className="font-semibold">
            {Number(selected.slice(5, 7))}月{Number(selected.slice(8))}日（
            <span className={weekdayClass(selDow)}>{WEEK[selDow]}</span>）
          </h3>
          <button
            onClick={() => onAddOnDate(selected)}
            className="rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-bold text-white active:opacity-80 dark:bg-zinc-100 dark:text-zinc-900"
          >
            ＋ この日に記録
          </button>
        </div>
        {dayEntries.length === 0 && daySchedule.length === 0 ? (
          <p className="px-4 py-3 text-sm text-zinc-500">この日の記録はありません。</p>
        ) : (
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {dayEntries.map((e) => (
              <EntryRow key={e.id} entry={e} />
            ))}
            {daySchedule.map(({ rule: r }) => (
              <li key={r.id} className="flex items-center gap-3 px-4 py-3 text-sm text-zinc-500">
                <span className="flex-1 truncate">
                  <span className="mr-1 rounded border border-dashed border-sky-400 px-1.5 py-0.5 text-xs text-sky-700 dark:text-sky-300">
                    予定
                  </span>
                  {r.category}
                  {r.memo && ` ・${r.memo}`}
                </span>
                <span className="tabular-nums">
                  {r.type === "income" ? "+" : "−"}
                  {yen.format(r.amount)}
                </span>
                <span className="size-8" aria-hidden />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
