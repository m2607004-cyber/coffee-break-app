"use client";

import { useMemo, useState } from "react";
import {
  categoryIcon,
  setInitialBalance,
  upcomingThisMonth,
  useEntries,
  useRecurringRules,
  useSettings,
  type Entry,
} from "../lib/entries-store";
import { daysInMonth, monthLabel, shiftMonth, todayStr, yen } from "../lib/format";
import { Card, expenseText, incomeText, MonthSwitcher, Stat } from "./ui";

function sumBy(entries: Entry[], type: Entry["type"]) {
  return entries.filter((e) => e.type === type).reduce((s, e) => s + e.amount, 0);
}

export default function ReportTab() {
  const entries = useEntries();
  const rules = useRecurringRules();
  const { initialBalance } = useSettings();
  const today = todayStr();
  const thisMonth = today.slice(0, 7);
  const [month, setMonth] = useState(thisMonth);

  // 今日までの記録から出した、今の所持金
  const balance = useMemo(() => {
    const past = entries.filter((e) => e.date <= today);
    return initialBalance + sumBy(past, "income") - sumBy(past, "expense");
  }, [entries, initialBalance, today]);

  const monthEntries = useMemo(() => entries.filter((e) => e.date.startsWith(month)), [entries, month]);
  const income = sumBy(monthEntries, "income");
  const expense = sumBy(monthEntries, "expense");

  // 今月これから来る固定収支を考えた「1日あたり使える目安」
  const upcoming = upcomingThisMonth(rules, today);
  const upcomingExpense = upcoming.filter((r) => r.type === "expense").reduce((s, r) => s + r.amount, 0);
  const upcomingIncome = upcoming.filter((r) => r.type === "income").reduce((s, r) => s + r.amount, 0);
  const daysLeft = daysInMonth(thisMonth) - Number(today.slice(8, 10)) + 1;
  const spendable = balance + upcomingIncome - upcomingExpense;
  // 足りない時（マイナス）は 0円と表示し、不足額は警告で知らせる
  const short = spendable < 0;
  const perDay = Math.max(0, Math.floor(spendable / daysLeft));

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of monthEntries) {
      if (e.type === "expense") map.set(e.category, (map.get(e.category) ?? 0) + e.amount);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [monthEntries]);

  const trend = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const ym = shiftMonth(month, i - 5);
      const list = entries.filter((e) => e.date.startsWith(ym));
      return { ym, income: sumBy(list, "income"), expense: sumBy(list, "expense") };
    });
  }, [entries, month]);

  return (
    <div className="space-y-4">
      <BalanceCard balance={balance} initialBalance={initialBalance} />

      <Card title={`今月の使えるお金（あと${daysLeft}日）`}>
        <div className="space-y-1 text-sm">
          <Row label="今の残金" value={balance} />
          {upcomingIncome > 0 && (
            <Row label="＋ これから入る固定収入" value={upcomingIncome} className={incomeText} />
          )}
          {upcomingExpense > 0 && (
            <Row label="− これから出る固定支出" value={-upcomingExpense} className={expenseText} />
          )}
          <div className="border-t border-zinc-200 pt-1 dark:border-zinc-800">
            <Row label="月末までに使えるお金" value={spendable} bold />
          </div>
        </div>
        <div
          className={`mt-3 rounded-xl px-4 py-3 text-center ${
            short ? "bg-exp-soft" : "bg-zinc-100 dark:bg-zinc-800"
          }`}
        >
          <div className="text-xs text-zinc-600 dark:text-zinc-300">1日に使える目安</div>
          <div className={`text-3xl font-bold tabular-nums ${short ? expenseText : ""}`}>
            {yen.format(perDay)}
          </div>
          {short && (
            <div className="mt-1 text-xs font-semibold text-exp">
              ⚠ 月末までに {yen.format(-spendable)} 足りません
            </div>
          )}
        </div>
      </Card>

      <MonthSwitcher month={month} onChange={setMonth} />
      <div className="grid grid-cols-3 gap-2">
        <Stat label="収入" value={income} className={incomeText} />
        <Stat label="支出" value={expense} className={expenseText} />
        <Stat label="収支" value={income - expense} className={income - expense < 0 ? expenseText : ""} />
      </div>

      <Card title="収入と支出の推移（6か月）">
        <TrendChart data={trend} selected={month} onSelect={setMonth} />
      </Card>

      <Card title={`何にお金を使った？（${monthLabel(month)}）`}>
        {byCategory.length === 0 ? (
          <p className="text-sm text-zinc-500">この月の支出はまだありません。</p>
        ) : (
          <ul className="space-y-3">
            {byCategory.map(([cat, amt]) => (
              <li key={cat} className="text-sm">
                <div className="mb-1 flex justify-between">
                  <span className="flex items-center gap-1.5">
                    <span aria-hidden>{categoryIcon(cat, "expense")}</span>
                    {cat}
                  </span>
                  <span className="tabular-nums">
                    {yen.format(amt)}
                    <span className="ml-1 text-zinc-500">{Math.round((amt / expense) * 100)}%</span>
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className="h-2.5 rounded-full"
                    style={{
                      width: `${(amt / byCategory[0][1]) * 100}%`,
                      background: "var(--chart-expense)",
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Row({
  label,
  value,
  className = "",
  bold = false,
}: {
  label: string;
  value: number;
  className?: string;
  bold?: boolean;
}) {
  return (
    <div className={`flex justify-between ${bold ? "font-bold" : ""}`}>
      <span>{label}</span>
      <span className={`tabular-nums ${value < 0 && !className ? expenseText : className}`}>
        {yen.format(value)}
      </span>
    </div>
  );
}

function BalanceCard({ balance, initialBalance }: { balance: number; initialBalance: number }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  return (
    <section className="rounded-2xl bg-zinc-900 p-5 text-white dark:bg-zinc-100 dark:text-zinc-900">
      <div className="text-sm opacity-70">今の残金</div>
      <div className={`text-4xl font-bold tabular-nums ${balance < 0 ? "text-[#ff8a57] dark:text-[#c43700]" : ""}`}>
        {yen.format(balance)}
      </div>
      {editing ? (
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const v = Math.round(Number(draft));
            if (Number.isFinite(v)) setInitialBalance(v);
            setEditing(false);
          }}
        >
          <input
            type="number"
            inputMode="numeric"
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="記録を始めた時の所持金"
            className="min-w-0 flex-1 rounded-lg bg-white/15 px-3 py-2 text-base text-inherit placeholder:text-current placeholder:opacity-50 dark:bg-black/10"
          />
          <button className="rounded-lg bg-white px-4 text-sm font-bold text-zinc-900 dark:bg-zinc-900 dark:text-white">
            保存
          </button>
        </form>
      ) : (
        <button
          onClick={() => {
            setDraft(String(initialBalance));
            setEditing(true);
          }}
          className="mt-2 text-xs underline opacity-70"
        >
          スタート時の所持金：{yen.format(initialBalance)}（変更）
        </button>
      )}
    </section>
  );
}

function niceMax(v: number) {
  if (v <= 0) return 10000;
  const pow = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * pow >= v) return m * pow;
  return 10 * pow;
}

function shortYen(v: number) {
  if (v >= 10000) return `${v / 10000}万`;
  if (v >= 1000) return `${v / 1000}千`;
  return String(v);
}

function TrendChart({
  data,
  selected,
  onSelect,
}: {
  data: { ym: string; income: number; expense: number }[];
  selected: string;
  onSelect: (ym: string) => void;
}) {
  const W = 320;
  const H = 180;
  const left = 34;
  const bottom = 22;
  const top = 8;
  const plotH = H - top - bottom;
  const plotW = W - left;
  const max = niceMax(Math.max(...data.flatMap((d) => [d.income, d.expense])));
  const ticks = [0, max / 2, max];
  const groupW = plotW / data.length;
  const barW = Math.min(14, groupW / 3);
  const y = (v: number) => top + plotH - (v / max) * plotH;
  const sel = data.find((d) => d.ym === selected);

  return (
    <div>
      <div className="mb-2 flex items-center gap-4 text-xs text-zinc-600 dark:text-zinc-300">
        <span className="flex items-center gap-1">
          <span className="size-2.5 rounded-sm" style={{ background: "var(--chart-income)" }} />
          収入
        </span>
        <span className="flex items-center gap-1">
          <span className="size-2.5 rounded-sm" style={{ background: "var(--chart-expense)" }} />
          支出
        </span>
        <span className="ml-auto text-zinc-500">棒をタップで月を選択</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="月別の収入と支出">
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={left}
              x2={W}
              y1={y(t)}
              y2={y(t)}
              className="stroke-zinc-200 dark:stroke-zinc-800"
              strokeWidth={1}
            />
            <text
              x={left - 4}
              y={y(t) + 3}
              textAnchor="end"
              className="fill-zinc-500 text-[9px]"
            >
              {shortYen(t)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = left + groupW * i + groupW / 2;
          const isSel = d.ym === selected;
          return (
            <g key={d.ym} onClick={() => onSelect(d.ym)} className="cursor-pointer">
              {isSel && (
                <rect
                  x={cx - groupW / 2 + 2}
                  y={top}
                  width={groupW - 4}
                  height={plotH}
                  rx={6}
                  className="fill-zinc-100 dark:fill-zinc-800"
                />
              )}
              <Bar x={cx - barW - 1} w={barW} y={y(d.income)} base={y(0)} color="var(--chart-income)">
                {`${monthLabel(d.ym)} 収入 ${yen.format(d.income)}`}
              </Bar>
              <Bar x={cx + 1} w={barW} y={y(d.expense)} base={y(0)} color="var(--chart-expense)">
                {`${monthLabel(d.ym)} 支出 ${yen.format(d.expense)}`}
              </Bar>
              <text
                x={cx}
                y={H - 6}
                textAnchor="middle"
                className={`text-[10px] ${isSel ? "fill-current font-bold" : "fill-zinc-500"}`}
              >
                {Number(d.ym.slice(5))}月
              </text>
              {/* タップしやすいよう、グループ全体を当たり判定にする */}
              <rect x={cx - groupW / 2} y={0} width={groupW} height={H} fill="transparent" />
            </g>
          );
        })}
      </svg>
      {sel && (
        <p className="mt-1 text-center text-sm tabular-nums">
          {monthLabel(sel.ym)}：収入 <b>{yen.format(sel.income)}</b> ／ 支出 <b>{yen.format(sel.expense)}</b>
        </p>
      )}
    </div>
  );
}

function Bar({
  x,
  w,
  y,
  base,
  color,
  children,
}: {
  x: number;
  w: number;
  y: number;
  base: number;
  color: string;
  children: string;
}) {
  const h = base - y;
  if (h <= 0) return null;
  const r = Math.min(4, h, w / 2);
  // 上側だけ角を丸めた棒（下はベースラインに接地）
  const d = `M${x},${base} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${base} Z`;
  return (
    <path d={d} fill={color}>
      <title>{children}</title>
    </path>
  );
}
