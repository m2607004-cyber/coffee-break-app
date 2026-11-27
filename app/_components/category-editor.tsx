"use client";

import { useState } from "react";
import {
  addCustomCategory,
  deleteCustomCategory,
  ICON_CHOICES,
  useCustomCategories,
  type EntryType,
} from "../lib/entries-store";
import { BottomSheet, inputClass } from "./ui";

/** カテゴリを自分で追加・削除する画面（画面の下から出てくる） */
export default function CategoryEditor({
  type,
  onClose,
  onAdded,
}: {
  type: EntryType;
  onClose: () => void;
  onAdded: (name: string) => void;
}) {
  const custom = useCustomCategories()[type];
  const [name, setName] = useState("");
  const [icon, setIcon] = useState(ICON_CHOICES[0]);
  const [error, setError] = useState<string | null>(null);
  const kind = type === "expense" ? "支出" : "収入";

  const add = (ev: React.FormEvent) => {
    ev.preventDefault();
    const err = addCustomCategory(type, name, icon);
    if (err) {
      setError(err);
      return;
    }
    onAdded(name.trim());
  };

  return (
    <BottomSheet label="カテゴリの追加" onClose={onClose}>
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <h3 className="font-bold">{kind}のカテゴリを追加</h3>
        <button
          type="button"
          onClick={onClose}
          className="grid size-9 place-items-center rounded-full text-zinc-500 active:bg-zinc-100 dark:active:bg-zinc-800"
          aria-label="閉じる"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <form onSubmit={add} className="space-y-4">
          <div className="flex items-end gap-3">
            {/* できあがりの見本 */}
            <div
              className={`flex w-20 shrink-0 flex-col items-center gap-1 rounded-xl border px-1 py-2 ${
                type === "expense" ? "border-exp bg-exp-soft" : "border-inc bg-inc-soft"
              }`}
              aria-hidden
            >
              <span className="text-2xl leading-none">{icon}</span>
              <span className="w-full truncate text-center text-[11px] font-bold leading-tight">
                {name.trim() || "名前"}
              </span>
            </div>
            <div className="flex-1">
              <label htmlFor="cat-name" className="mb-1 block text-sm text-zinc-500">
                カテゴリ名（10文字まで）
              </label>
              <input
                id="cat-name"
                type="text"
                maxLength={10}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError(null);
                }}
                placeholder={type === "expense" ? "例：カフェ" : "例：フリマ"}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <span className="mb-1 block text-sm text-zinc-500">イラストを選ぶ</span>
            <div className="grid grid-cols-8 gap-1" role="radiogroup" aria-label="イラスト">
              {ICON_CHOICES.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  role="radio"
                  aria-checked={icon === ic}
                  aria-label={ic}
                  onClick={() => setIcon(ic)}
                  className={`grid aspect-square place-items-center rounded-lg text-xl ${
                    icon === ic
                      ? "bg-zinc-900 ring-2 ring-zinc-900 dark:bg-zinc-100 dark:ring-zinc-100"
                      : "active:bg-zinc-100 dark:active:bg-zinc-800"
                  }`}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-exp-soft px-3 py-2 text-sm font-semibold text-exp">
              ⚠ {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full rounded-xl bg-zinc-900 py-3 font-bold text-white active:opacity-80 dark:bg-zinc-100 dark:text-zinc-900"
          >
            追加する
          </button>
        </form>

        {custom.length > 0 && (
          <section>
            <h4 className="mb-1 text-sm font-semibold text-zinc-500">追加した{kind}のカテゴリ</h4>
            <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
              {custom.map((c) => (
                <li key={c.name} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <span className="text-xl" aria-hidden>
                    {c.icon}
                  </span>
                  <span className="flex-1 truncate">{c.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        confirm(`「${c.name}」を削除しますか？\n（このカテゴリで付けた記録は残ります）`)
                      )
                        deleteCustomCategory(type, c.name);
                    }}
                    className="grid size-8 place-items-center text-zinc-400 active:text-exp"
                    aria-label={`${c.name}を削除`}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </BottomSheet>
  );
}
