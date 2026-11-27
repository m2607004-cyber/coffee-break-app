"use client";

import { useState } from "react";
import type { EntryType } from "../lib/entries-store";
import { Card } from "./ui";

type Op = "+" | "−" | "×" | "÷";
const OPS: Op[] = ["+", "−", "×", "÷"];

/** "1200+340×3" のような式を、掛け算・割り算を優先して計算する（eval は使わない） */
export function evaluate(expr: string): number | null {
  const tokens = expr.match(/\d+(?:\.\d*)?|\.\d+|[+−×÷]/g);
  if (!tokens) return null;
  // 末尾が演算子なら無視する
  if (OPS.includes(tokens[tokens.length - 1] as Op)) tokens.pop();
  if (tokens.length === 0) return null;

  // 1回目：× と ÷ を計算
  const terms: (number | Op)[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t === "×" || t === "÷") {
      const left = terms.pop() as number;
      const right = Number(tokens[++i]);
      if (t === "÷" && right === 0) return null;
      terms.push(t === "×" ? left * right : left / right);
    } else if (t === "+" || t === "−") {
      terms.push(t);
    } else {
      terms.push(Number(t));
    }
  }
  // 2回目：+ と − を計算
  let result = terms[0] as number;
  for (let i = 1; i < terms.length; i += 2) {
    const n = terms[i + 1] as number;
    result = terms[i] === "+" ? result + n : result - n;
  }
  return Number.isFinite(result) ? Math.round(result * 1e8) / 1e8 : null;
}

const fmt = new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 8 });

function prettyExpr(expr: string) {
  return expr.replace(/\d+(?:\.\d*)?/g, (n) => {
    const [i, d] = n.split(".");
    return fmt.format(Number(i)) + (d !== undefined ? "." + d : "");
  });
}

export default function CalcTab({ onUse }: { onUse: (amount: number, type: EntryType) => void }) {
  const [expr, setExpr] = useState("");
  const [done, setDone] = useState(false);

  const result = evaluate(expr);
  const lastChar = expr.slice(-1);
  const lastIsOp = OPS.includes(lastChar as Op);

  const press = (key: string) => {
    if (key === "C") {
      setExpr("");
      setDone(false);
      return;
    }
    if (key === "⌫") {
      setExpr(expr.slice(0, -1));
      setDone(false);
      return;
    }
    if (key === "=") {
      if (result !== null) {
        setExpr(String(result));
        setDone(true);
      }
      return;
    }
    if (OPS.includes(key as Op)) {
      if (expr === "") return;
      setExpr(lastIsOp ? expr.slice(0, -1) + key : expr + key);
      setDone(false);
      return;
    }
    // 数字・小数点・00
    const base = done ? "" : expr;
    const current = base.split(/[+−×÷]/).pop() ?? "";
    if (key === "." && current.includes(".")) return;
    if (key === "00" && current === "") return;
    setExpr(base + (key === "." && current === "" ? "0." : key));
    setDone(false);
  };

  const keys = ["C", "⌫", "÷", "×", "7", "8", "9", "−", "4", "5", "6", "+", "1", "2", "3", "=", "0", "00", "."];

  const rounded = result !== null ? Math.round(result) : null;

  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-3 min-h-24 rounded-xl bg-zinc-100 px-4 py-3 text-right dark:bg-zinc-800">
          <div className="min-h-6 break-all text-sm text-zinc-500 tabular-nums">
            {done ? "" : prettyExpr(expr)}
          </div>
          <div className="break-all text-4xl font-bold tabular-nums">
            {result !== null ? fmt.format(result) : "0"}
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {keys.map((k) => {
            const isOp = OPS.includes(k as Op);
            const isEq = k === "=";
            const isFn = k === "C" || k === "⌫";
            return (
              <button
                key={k}
                onClick={() => press(k)}
                className={`h-14 rounded-xl text-xl font-semibold active:opacity-70 ${
                  isEq
                    ? "row-span-2 h-auto bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : isOp
                      ? "bg-amber-500 text-white"
                      : isFn
                        ? "bg-zinc-300 dark:bg-zinc-700"
                        : "bg-zinc-100 dark:bg-zinc-800"
                }`}
                aria-label={k === "⌫" ? "一文字消す" : k === "C" ? "クリア" : k}
              >
                {k}
              </button>
            );
          })}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <button
          disabled={rounded === null || rounded <= 0}
          onClick={() => rounded && onUse(rounded, "expense")}
          className="rounded-xl bg-rose-600 py-3 font-bold text-white disabled:opacity-40"
        >
          支出として記録
        </button>
        <button
          disabled={rounded === null || rounded <= 0}
          onClick={() => rounded && onUse(rounded, "income")}
          className="rounded-xl bg-emerald-600 py-3 font-bold text-white disabled:opacity-40"
        >
          収入として記録
        </button>
      </div>
      <p className="text-center text-xs text-zinc-500">
        計算結果を入力画面に送ります（小数は四捨五入）。割り勘やまとめ買いの計算に便利です。
      </p>
    </div>
  );
}
