"use client";

import { useMemo, useState } from "react";
import {
  categoriesFor,
  monthlyBudget,
  setBudget,
  useBudget,
  useCustomCategories,
  useEntries,
  type Budget,
} from "../lib/entries-store";
import { daysInMonth, monthLabel, todayStr, yen } from "../lib/format";
import AmountField from "./amount-field";
import { Card, CategoryIcon, MonthSwitcher } from "./ui";

/** 使った割合から状態を決める（色だけでなく文字でも示す） */
function status(spent: number, budget: number) {
  const ratio = budget > 0 ? spent / budget : 0;
  if (spent > budget) return { level: "over" as const, ratio };
  if (ratio >= 0.8) return { level: "near" as const, ratio };
  return { level: "ok" as const, ratio };
}

const barColor = {
  ok: "bg-zinc-700 dark:bg-zinc-300",
  near: "bg-key-op",
  over: "bg-exp",
};

function ProgressBar({ spent, budget, thick = false }: { spent: number; budget: number; thick?: boolean }) {
  const s = status(spent, budget);
  return (
    <div
      className={`overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800 ${thick ? "h-3" : "h-2"}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={budget}
      aria-valuenow={Math.min(spent, budget)}
    >
      <div
        className={`h-full rounded-full ${barColor[s.level]}`}
        style={{ width: `${Math.min(100, s.ratio * 100)}%` }}
      />
    </div>
  );
}

/** 「あと ¥X」「もうすぐ上限」「⚠ ¥X オーバー」の文字表示 */
function StatusText({ spent, budget }: { spent: number; budget: number }) {
  const s = status(spent, budget);
  if (s.level === "over")
    return <span className="font-bold text-exp">⚠ {yen.format(spent - budget)} オーバー</span>;
  return (
    <span className={s.level === "near" ? "font-bold" : "text-zinc-600 dark:text-zinc-300"}>
      {s.level === "near" && "もうすぐ上限・"}あと {yen.format(budget - spent)}
    </span>
  );
}

export default function BudgetTab() {
  const entries = useEntries();
  const budget = useBudget();
  const total = monthlyBudget(budget);
  const custom = useCustomCategories();
  const today = todayStr();
  const thisMonth = today.slice(0, 7);
  const [month, setMonth] = useState(thisMonth);
  const [editing, setEditing] = useState(false);

  const spentBy = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of entries) {
      if (e.type !== "expense" || !e.date.startsWith(month)) continue;
      map.set(e.category, (map.get(e.category) ?? 0) + e.amount);
    }
    return map;
  }, [entries, month]);
  const totalSpent = [...spentBy.values()].reduce((s, v) => s + v, 0);

  const categories = categoriesFor("expense", custom);
  const budgeted = categories.filter((c) => budget.categories[c] > 0);
  // 予算はないけれど使ったカテゴリ（過去に削除したカテゴリも含む）
  const unbudgeted = [...spentBy.keys()].filter((c) => !(budget.categories[c] > 0));
  const hasAnyBudget = total !== null || budgeted.length > 0;

  if (editing) {
    return <BudgetEditor initial={budget} categories={categories} onDone={() => setEditing(false)} />;
  }

  const isThisMonth = month === thisMonth;
  const daysLeft = daysInMonth(thisMonth) - Number(today.slice(8, 10)) + 1;
  const perDay =
    total !== null && isThisMonth
      ? Math.max(0, Math.floor((total - totalSpent) / daysLeft))
      : null;

  return (
    <div className="space-y-4">
      <MonthSwitcher month={month} onChange={setMonth} />

      {!hasAnyBudget ? (
        <Card>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            まだ予算が決まっていません。1か月に使う金額の目標を決めると、あといくら使えるかがわかります。
          </p>
          <button
            onClick={() => setEditing(true)}
            className="mt-3 w-full rounded-xl bg-zinc-900 py-3 font-bold text-white active:opacity-80 dark:bg-zinc-100 dark:text-zinc-900"
          >
            予算を設定する
          </button>
        </Card>
      ) : (
        <>
          {total !== null && (
            <Card title={`${monthLabel(month)}の予算`}>
              <div className="mb-2 flex items-end justify-between gap-2">
                <div>
                  <div className="text-xs text-zinc-500">使った金額</div>
                  <div className="text-2xl font-bold tabular-nums">{yen.format(totalSpent)}</div>
                </div>
                <div className="text-right text-sm tabular-nums text-zinc-500">
                  予算 {yen.format(total)}
                  {budgeted.length > 0 && <div className="text-xs">（カテゴリの合計）</div>}
                </div>
              </div>
              <ProgressBar spent={totalSpent} budget={total} thick />
              <div className="mt-2 flex items-center justify-between text-sm tabular-nums">
                <StatusText spent={totalSpent} budget={total} />
                <span className="text-zinc-500">
                  {Math.round((totalSpent / Math.max(1, total)) * 100)}%
                </span>
              </div>
              {perDay !== null && (
                <div className="mt-3 rounded-xl bg-zinc-100 px-4 py-2 text-center dark:bg-zinc-800">
                  <div className="text-xs text-zinc-600 dark:text-zinc-300">
                    予算内に収めるための1日の目安（あと{daysLeft}日）
                  </div>
                  <div className="text-2xl font-bold tabular-nums">{yen.format(perDay)}</div>
                </div>
              )}
            </Card>
          )}

          {(budgeted.length > 0 || unbudgeted.length > 0) && (
            <Card title="カテゴリごとの予算">
              <ul className="space-y-4">
                {budgeted.map((c) => {
                  const spent = spentBy.get(c) ?? 0;
                  const b = budget.categories[c];
                  return (
                    <li key={c} className="text-sm">
                      <div className="mb-1 flex items-center gap-2">
                        <CategoryIcon category={c} type="expense" size="sm" />
                        <span className="flex-1 truncate">{c}</span>
                        <span className="tabular-nums">
                          {yen.format(spent)}
                          <span className="text-zinc-500"> / {yen.format(b)}</span>
                        </span>
                      </div>
                      <ProgressBar spent={spent} budget={b} />
                      <div className="mt-1 text-right text-xs tabular-nums">
                        <StatusText spent={spent} budget={b} />
                      </div>
                    </li>
                  );
                })}
              </ul>
              {unbudgeted.length > 0 && (
                <div className={budgeted.length > 0 ? "mt-4 border-t border-zinc-200 pt-3 dark:border-zinc-800" : ""}>
                  <h3 className="mb-2 text-xs font-semibold text-zinc-500">予算を決めていないカテゴリ</h3>
                  <ul className="space-y-2">
                    {unbudgeted.map((c) => (
                      <li key={c} className="flex items-center gap-2 text-sm">
                        <CategoryIcon category={c} type="expense" size="sm" />
                        <span className="flex-1 truncate">{c}</span>
                        <span className="tabular-nums">{yen.format(spentBy.get(c) ?? 0)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          )}

          <button
            onClick={() => setEditing(true)}
            className="w-full rounded-xl border border-zinc-300 bg-white py-3 text-sm font-semibold active:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:active:bg-zinc-800"
          >
            予算を変更する
          </button>
        </>
      )}
    </div>
  );
}

function BudgetEditor({
  initial,
  categories,
  onDone,
}: {
  initial: Budget;
  categories: string[];
  onDone: () => void;
}) {
  const [total, setTotal] = useState(() => {
    const m = monthlyBudget(initial);
    return m !== null ? String(m) : "";
  });
  const [cats, setCats] = useState<Record<string, string>>(() =>
    Object.fromEntries(categories.map((c) => [c, initial.categories[c] ? String(initial.categories[c]) : ""])),
  );

  const catSum = Object.values(cats).reduce((s, v) => s + (Number(v) || 0), 0);
  const totalNum = Number(total) || 0;

  // カテゴリの予算があれば、その合計が1か月の予算になる
  const autoTotal = catSum > 0;

  const save = () => {
    const categoriesBudget: Record<string, number> = {};
    for (const [c, v] of Object.entries(cats)) if (Number(v) > 0) categoriesBudget[c] = Number(v);
    const monthly = autoTotal ? catSum : totalNum;
    setBudget({ total: monthly > 0 ? monthly : null, categories: categoriesBudget });
    onDone();
  };

  return (
    <div className="space-y-4">
      <Card title="1か月の予算">
        {autoTotal ? (
          <>
            <p className="mb-2 text-xs text-zinc-500">
              下のカテゴリごとの予算の合計が、自動で1か月の予算になります。
            </p>
            <div
              className="flex items-baseline justify-end gap-1 rounded-lg border border-dashed border-zinc-300 px-3 py-3 dark:border-zinc-700"
              aria-live="polite"
            >
              <span className="mr-auto text-xs text-zinc-500">カテゴリの合計</span>
              <span className="text-2xl font-bold tabular-nums">{yen.format(catSum)}</span>
            </div>
          </>
        ) : (
          <>
            <p className="mb-2 text-xs text-zinc-500">
              支出全体で、1か月にいくらまで使うかの目標です。毎月同じ予算を使います。下でカテゴリごとの予算を入れると、その合計が自動で1か月の予算になります。
            </p>
            <AmountField large value={total} onChange={setTotal} label="1か月の予算" />
          </>
        )}
      </Card>

      <Card title="カテゴリごとの予算（任意）">
        <p className="mb-3 text-xs text-zinc-500">
          決めたいカテゴリだけ入れてください。空のカテゴリは予算なしです。入れた予算の合計が1か月の予算になります。
        </p>
        <ul className="space-y-2">
          {categories.map((c) => (
            <li key={c} className="flex items-center gap-2">
              <CategoryIcon category={c} type="expense" size="sm" />
              <span className="w-24 shrink-0 truncate text-sm">{c}</span>
              <div className="min-w-0 flex-1">
                <AmountField
                  value={cats[c] ?? ""}
                  onChange={(v) => setCats((prev) => ({ ...prev, [c]: v }))}
                  label={`${c}の予算`}
                />
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex justify-between border-t border-zinc-200 pt-2 text-sm font-bold dark:border-zinc-800">
          <span>合計（＝1か月の予算）</span>
          <span className="tabular-nums">{yen.format(catSum)}</span>
        </div>
      </Card>

      {/* キャンセル・保存ボタンは画面下（タブバーのすぐ上）の中央に固定。スクロールしても動かない */}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--nav-h)+env(safe-area-inset-bottom))] z-20">
        <div className="pointer-events-auto mx-auto flex w-full max-w-md gap-2 bg-gradient-to-t from-app from-70% to-transparent px-4 pb-2 pt-5">
          <button
            onClick={onDone}
            className="flex-1 rounded-xl border border-zinc-300 bg-white py-3.5 text-sm font-semibold shadow-lg active:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:active:bg-zinc-800"
          >
            キャンセル
          </button>
          <button
            onClick={save}
            className="flex-[2] rounded-xl bg-zinc-900 py-3.5 font-bold text-white shadow-lg active:opacity-80 dark:bg-zinc-100 dark:text-zinc-900"
          >
            保存する
          </button>
        </div>
      </div>

      {/* 固定ボタンに隠れないよう、下に余白を取る */}
      <div className="h-20" aria-hidden />
    </div>
  );
}
