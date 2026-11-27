"use client";

import { useEffect, useState } from "react";

type Op = "+" | "−" | "×" | "÷";
const OPS: Op[] = ["+", "−", "×", "÷"];
const isOp = (s: string) => OPS.includes(s as Op);

/** "1200+340×3" のような式を、掛け算・割り算を優先して計算する（eval は使わない） */
export function evaluate(expr: string): number | null {
  const tokens = expr.match(/\d+(?:\.\d*)?|\.\d+|[+−×÷]/g);
  if (!tokens) return null;
  // 末尾が演算子なら無視する
  if (isOp(tokens[tokens.length - 1])) tokens.pop();
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

/** "3000÷4+150" → "3,000 ÷ 4 + 150"（桁区切りと、記号の前後にすき間） */
function prettyExpr(expr: string) {
  return expr
    .replace(/\d+(?:\.\d*)?/g, (n) => {
      const [i, d] = n.split(".");
      return fmt.format(Number(i)) + (d !== undefined ? "." + d : "");
    })
    .replace(/[+−×÷]/g, " $& ")
    .trim();
}

const hasOperator = (expr: string) => /[+−×÷]/.test(expr);

/** 計算結果を金額（円・整数）として返す。0以下や計算できない式は空文字 */
function toAmount(expr: string) {
  const r = evaluate(expr);
  return r !== null && Math.round(r) > 0 ? String(Math.round(r)) : "";
}

/**
 * 金額の入力欄。タップすると画面下に電卓が出てきて、計算結果がそのまま金額になる。
 */
export default function AmountField({
  value,
  onChange,
  large = false,
  label = "金額",
}: {
  value: string;
  onChange: (v: string) => void;
  large?: boolean;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [expr, setExpr] = useState("");

  // 前回の式がいまの金額と一致していれば、その式の続きから入力できる
  // （記録後に金額が空になった時などは、式もリセットする）
  const exprMatches = value !== "" && toAmount(expr) === value;
  const shownExpr = exprMatches && hasOperator(expr) ? prettyExpr(expr) : null;

  const openPad = () => {
    if (!exprMatches) setExpr(value);
    setOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={openPad}
        aria-haspopup="dialog"
        aria-label={`${label}（タップで電卓）`}
        className={`flex w-full items-center justify-end gap-2 rounded-lg border px-3 text-right tabular-nums ${
          open
            ? "border-zinc-900 ring-2 ring-zinc-900/10 dark:border-zinc-100"
            : "border-zinc-300 dark:border-zinc-700"
        } ${large ? "py-3 text-2xl font-bold" : "py-3 text-base"}`}
      >
        <svg
          viewBox="0 0 24 24"
          className="mr-auto size-5 shrink-0 text-zinc-400"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          aria-hidden
        >
          <rect x="5" y="2" width="14" height="20" rx="2" />
          <path d="M8 6h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 19h.01M12 19h4" />
        </svg>
        <span className="flex min-w-0 flex-col items-end">
          <span>
            <span className={value ? "" : "text-zinc-400"}>
              {value ? fmt.format(Number(value)) : "0"}
            </span>
            <span className="ml-1 text-sm font-normal text-zinc-500">円</span>
          </span>
          {shownExpr && (
            <span className="max-w-full truncate text-xs font-normal text-zinc-500">
              {shownExpr}
            </span>
          )}
        </span>
      </button>
      {open && (
        <CalcSheet
          expr={expr}
          onExpr={(next) => {
            setExpr(next);
            onChange(toAmount(next));
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function CalcSheet({
  expr,
  onExpr,
  onClose,
}: {
  expr: string;
  onExpr: (e: string) => void;
  onClose: () => void;
}) {
  const result = evaluate(expr);
  const rounded = result !== null ? Math.round(result) : null;
  const hasOp = hasOperator(expr);

  const press = (key: string) => {
    if (key === "完了") return onClose();
    if (key === "C") return onExpr("");
    if (key === "⌫") return onExpr(expr.slice(0, -1));
    if (isOp(key)) {
      if (expr === "") return;
      return onExpr(isOp(expr.slice(-1)) ? expr.slice(0, -1) + key : expr + key);
    }
    // 数字・小数点・00
    const current = expr.split(/[+−×÷]/).pop() ?? "";
    if (key === "." && current.includes(".")) return;
    if (key === "00" && current === "") return;
    if (current === "0" && key !== ".") return onExpr(expr.slice(0, -1) + key);
    onExpr(expr + (key === "." && current === "" ? "0." : key));
  };

  // パソコンのキーボードでも入力できるように
  useEffect(() => {
    const map: Record<string, string> = {
      "+": "+",
      "-": "−",
      "*": "×",
      "/": "÷",
      Backspace: "⌫",
      Delete: "C",
      Enter: "完了",
      Escape: "完了",
      "=": "完了",
    };
    const onKey = (e: KeyboardEvent) => {
      const k = /^[0-9.]$/.test(e.key) ? e.key : map[e.key];
      if (!k) return;
      e.preventDefault();
      press(k);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const keys = ["C", "⌫", "÷", "×", "7", "8", "9", "−", "4", "5", "6", "+", "1", "2", "3", "完了", "0", "00", "."];

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-end" role="dialog" aria-label="電卓">
      <button
        type="button"
        className="absolute inset-0 bg-black/30"
        aria-label="電卓を閉じる"
        onClick={onClose}
      />
      <div className="relative mx-auto w-full max-w-md rounded-t-2xl bg-white px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-2xl dark:bg-zinc-900">
        <div
          className="mb-3 rounded-xl bg-zinc-100 px-4 py-3 text-right tabular-nums dark:bg-zinc-800"
          aria-live="polite"
        >
          {/* 入力中の式（途中式） */}
          <div className="break-all text-3xl font-bold leading-tight">
            {expr ? prettyExpr(expr) : <span className="text-zinc-400">0</span>}
            {!hasOp && expr && <span className="ml-1 text-base font-normal text-zinc-500">円</span>}
          </div>
          {/* 計算結果 */}
          {hasOp && (
            <div className="mt-1 text-xl font-semibold text-zinc-600 dark:text-zinc-300">
              {rounded === null ? (
                <span className="text-base text-exp">⚠ 計算できません</span>
              ) : (
                <>
                  = {fmt.format(rounded)}
                  <span className="ml-1 text-sm font-normal">円</span>
                  {result !== rounded && (
                    <span className="ml-2 text-xs font-normal text-zinc-500">
                      （{fmt.format(Math.round(result! * 100) / 100)} を四捨五入）
                    </span>
                  )}
                </>
              )}
            </div>
          )}
        </div>
        <div className="grid grid-cols-4 gap-2">
          {keys.map((k) => {
            const done = k === "完了";
            const fn = k === "C" || k === "⌫";
            return (
              <button
                key={k}
                type="button"
                onClick={() => press(k)}
                className={`h-13 rounded-xl text-xl font-semibold active:opacity-70 ${
                  done
                    ? "row-span-2 h-auto bg-zinc-900 text-lg text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : isOp(k)
                      ? "bg-key-op text-zinc-950"
                      : fn
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
      </div>
    </div>
  );
}
