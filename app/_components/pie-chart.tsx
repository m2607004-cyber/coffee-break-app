"use client";

import { useState } from "react";
import { categoryIcon, type EntryType } from "../lib/entries-store";
import { yen } from "../lib/format";

const SLOTS = 8;
const COLORS = Array.from({ length: SLOTS }, (_, i) => `var(--pie-${i + 1})`);

type Slice = { name: string; amount: number; color: string; icon: string; merged?: string[] };

/**
 * 1か月の支出（または収入）をカテゴリ別に表すドーナツ型の円グラフ。
 * 色は8色まで。9番目以降の小さいカテゴリは「ほか N件」にまとめる。
 * 色だけで区別しなくていいよう、凡例に絵・名前・金額・割合を必ず並べる。
 */
export default function CategoryPie({
  data,
  total,
  type,
}: {
  data: [string, number][];
  total: number;
  type: EntryType;
}) {
  const kind = type === "expense" ? "支出" : "収入";
  const [selected, setSelected] = useState<string | null>(null);

  const slices: Slice[] =
    data.length <= SLOTS
      ? data.map(([name, amount], i) => ({ name, amount, color: COLORS[i], icon: categoryIcon(name, type) }))
      : [
          ...data.slice(0, SLOTS - 1).map(([name, amount], i) => ({
            name,
            amount,
            color: COLORS[i],
            icon: categoryIcon(name, type),
          })),
          {
            name: `ほか${data.length - (SLOTS - 1)}件`,
            amount: data.slice(SLOTS - 1).reduce((s, [, a]) => s + a, 0),
            color: "var(--pie-other)",
            icon: "📂",
            merged: data.slice(SLOTS - 1).map(([n]) => n),
          },
        ];

  const R = 70;
  const STROKE = 28;
  const C = 2 * Math.PI * R;
  const GAP = slices.length > 1 ? 2 : 0; // 区切りのすき間
  // 各カテゴリの弧の長さと、開始位置（それより前の弧の長さの合計）
  const lens = slices.map((s) => (s.amount / total) * C);
  const arcs = slices.map((s, i) => ({
    ...s,
    len: lens[i],
    offset: lens.slice(0, i).reduce((a, b) => a + b, 0),
  }));

  const sel = slices.find((s) => s.name === selected) ?? null;
  const pct = (n: number) => Math.round((n / total) * 100);
  const toggle = (name: string) => setSelected((cur) => (cur === name ? null : name));

  return (
    <div>
      <div className="relative mx-auto aspect-square w-full max-w-60">
        <svg
          viewBox="0 0 200 200"
          className="h-full w-full -rotate-90"
          role="img"
          aria-label={`${kind}の内訳：${slices.map((s) => `${s.name} ${pct(s.amount)}%`).join("、")}`}
        >
          {arcs.map((a) => (
            <circle
              key={a.name}
              cx={100}
              cy={100}
              r={R}
              fill="none"
              stroke={a.color}
              strokeWidth={a.name === selected ? STROKE + 8 : STROKE}
              strokeDasharray={`${Math.max(0, a.len - GAP)} ${C}`}
              strokeDashoffset={-a.offset}
              className="cursor-pointer transition-[stroke-width] duration-150"
              onClick={() => toggle(a.name)}
            >
              <title>{`${a.name} ${yen.format(a.amount)}（${pct(a.amount)}%）`}</title>
            </circle>
          ))}
        </svg>
        {/* 真ん中の表示：ふだんは合計、タップしたカテゴリがあればその金額 */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center" aria-live="polite">
          {sel ? (
            <>
              <span className="text-2xl leading-none" aria-hidden>
                {sel.icon}
              </span>
              <span className="mt-1 max-w-28 truncate text-xs text-zinc-600 dark:text-zinc-300">{sel.name}</span>
              <span className="text-lg font-bold tabular-nums">{yen.format(sel.amount)}</span>
              <span className="text-xs tabular-nums text-zinc-500">{pct(sel.amount)}%</span>
            </>
          ) : (
            <>
              <span className="text-xs text-zinc-500">{kind}の合計</span>
              <span className="text-xl font-bold tabular-nums">{yen.format(total)}</span>
            </>
          )}
        </div>
      </div>

      {/* 凡例（タップで円グラフの真ん中に表示） */}
      <ul className="mt-4 space-y-1">
        {slices.map((s) => (
          <li key={s.name}>
            <button
              type="button"
              onClick={() => toggle(s.name)}
              aria-pressed={s.name === selected}
              className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm ${
                s.name === selected ? "bg-zinc-100 font-bold dark:bg-zinc-800" : "active:bg-zinc-100 dark:active:bg-zinc-800"
              }`}
            >
              <span className="size-3 shrink-0 rounded-sm" style={{ background: s.color }} aria-hidden />
              <span aria-hidden>{s.icon}</span>
              <span className="min-w-0 flex-1 truncate">
                {s.name}
                {s.merged && <span className="ml-1 text-xs font-normal text-zinc-500">（{s.merged.join("・")}）</span>}
              </span>
              <span className="tabular-nums">{yen.format(s.amount)}</span>
              <span className="w-10 text-right tabular-nums text-zinc-500">{pct(s.amount)}%</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
