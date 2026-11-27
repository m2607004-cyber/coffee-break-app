"use client";

import { useMemo, useState } from "react";
import {
  monthlyBudget,
  setInitialBalance,
  upcomingThisMonth,
  useBudget,
  useEntries,
  useRecurringRules,
  useSettings,
  type Entry,
} from "../lib/entries-store";
import { daysInMonth, monthLabel, todayStr, yen } from "../lib/format";
import { computeFreeMoney } from "../lib/free-money";
import CategoryPie from "./pie-chart";
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
  const [chartType, setChartType] = useState<Entry["type"]>("expense");

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

  // 予算があれば、予算をもとにした自由費を出す
  const budget = useBudget();
  const free = useMemo(
    () => {
      const monthly = monthlyBudget(budget);
      return monthly !== null ? computeFreeMoney(entries, balance, monthly, today) : null;
    },
    [entries, balance, budget, today],
  );

  // カテゴリごとの合計（多い順）。支出と収入で別々に出す
  const byCategory = useMemo(() => {
    const sum = (type: Entry["type"]) => {
      const map = new Map<string, number>();
      for (const e of monthEntries) {
        if (e.type === type) map.set(e.category, (map.get(e.category) ?? 0) + e.amount);
      }
      return [...map.entries()].sort((a, b) => b[1] - a[1]);
    };
    return { expense: sum("expense"), income: sum("income") };
  }, [monthEntries]);


  return (
    <div className="space-y-4">
      <BalanceCard balance={balance} initialBalance={initialBalance} />

      {free ? (
        <FreeMoneyCard free={free} />
      ) : (
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
          <p className="mt-2 text-xs text-zinc-500">
            💡 予算タブで「1か月の予算」を決めると、ここに予算をもとにした自由費（あと自由に使えるお金）が出ます。
          </p>
        </Card>
      )}

      <MonthSwitcher month={month} onChange={setMonth} />
      {/* 収入・支出の欄を押すと、その円グラフに切り替わる（最初は支出） */}
      <div className="grid grid-cols-3 gap-2" role="group" aria-label="グラフの切り替え">
        <ChartTile
          label="収入"
          value={income}
          className={incomeText}
          active={chartType === "income"}
          onClick={() => setChartType("income")}
        />
        <ChartTile
          label="支出"
          value={expense}
          className={expenseText}
          active={chartType === "expense"}
          onClick={() => setChartType("expense")}
        />
        <Stat label="収支" value={income - expense} className={income - expense < 0 ? expenseText : ""} />
      </div>

      <Card title={`${monthLabel(month)}の${chartType === "expense" ? "支出" : "収入"}の内訳`}>
        {byCategory[chartType].length === 0 ? (
          <p className="text-sm text-zinc-500">
            この月の{chartType === "expense" ? "支出" : "収入"}はまだありません。
          </p>
        ) : (
          <CategoryPie
            key={`${month}-${chartType}`}
            type={chartType}
            data={byCategory[chartType]}
            total={chartType === "expense" ? expense : income}
          />
        )}
      </Card>
    </div>
  );
}

/** 押すとグラフが切り替わる金額の欄。選択中は太い枠と「グラフ表示中」で示す（色だけに頼らない） */
function ChartTile({
  label,
  value,
  className,
  active,
  onClick,
}: {
  label: string;
  value: number;
  className: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-w-0 rounded-xl bg-white px-3 py-2 text-left active:bg-zinc-100 dark:bg-zinc-900 dark:active:bg-zinc-800 ${
        active
          ? "border-2 border-zinc-900 dark:border-zinc-100"
          : "border border-zinc-200 dark:border-zinc-800"
      }`}
    >
      <div className="text-xs text-zinc-500 dark:text-zinc-400">{label}</div>
      <div className={`truncate font-bold tabular-nums ${className}`}>{yen.format(value)}</div>
      <div className={`mt-0.5 text-[10px] ${active ? "font-bold" : "text-zinc-400"}`}>
        {active ? "▼ グラフ表示中" : "タップでグラフ"}
      </div>
    </button>
  );
}

/** 自由費（残金 − 今月の予算の残り）の欄 */
function FreeMoneyCard({ free }: { free: ReturnType<typeof computeFreeMoney> }) {
  const short = free.free < 0;
  return (
    <Card title="自由費">
      <div className="text-xs text-zinc-500">予算とは別に、自由に使えるお金</div>
      <div className={`text-4xl font-bold tabular-nums ${short ? expenseText : ""}`}>
        {yen.format(Math.max(0, free.free))}
      </div>
      {short && (
        <div className="mt-1 text-sm font-bold text-exp">
          ⚠ 今月の予算の残りに対して、残金が {yen.format(-free.free)} 足りません
        </div>
      )}

      {/* 計算の内訳 */}
      <div className="mt-3 space-y-1 border-t border-zinc-200 pt-3 text-sm dark:border-zinc-800">
        <Row label="今の残金" value={free.balance} />
        {/* 0 の時に「-￥0」と出ないよう、-0 を 0 にする */}
        <Row label="− 今月の予算の残り" value={-free.budgetLeft || 0} className={expenseText} />
        <div className="border-t border-zinc-200 pt-1 dark:border-zinc-800">
          <Row label="＝ 自由費" value={free.free} bold />
        </div>
      </div>

      {free.budgetOver > 0 && (
        <p className="mt-2 text-xs font-bold text-exp">
          ⚠ 今月の予算を {yen.format(free.budgetOver)} オーバーしています
        </p>
      )}
    </Card>
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
