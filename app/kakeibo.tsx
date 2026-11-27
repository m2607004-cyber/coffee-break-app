"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import CalcTab from "./_components/calc-tab";
import InputTab from "./_components/input-tab";
import ListTab from "./_components/list-tab";
import RecurringTab from "./_components/recurring-tab";
import ReportTab from "./_components/report-tab";
import { applyRecurring, type EntryType } from "./lib/entries-store";

type Tab = "input" | "list" | "recurring" | "calc" | "report";

const TABS: { id: Tab; label: string; title: string; icon: ReactNode }[] = [
  {
    id: "input",
    label: "入力",
    title: "収支を入力",
    icon: <path d="M12 5v14M5 12h14" />,
  },
  {
    id: "list",
    label: "明細",
    title: "明細",
    icon: <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />,
  },
  {
    id: "recurring",
    label: "固定",
    title: "固定収支",
    icon: (
      <>
        <path d="M17 2l4 4-4 4" />
        <path d="M3 11V9a3 3 0 0 1 3-3h15" />
        <path d="M7 22l-4-4 4-4" />
        <path d="M21 13v2a3 3 0 0 1-3 3H3" />
      </>
    ),
  },
  {
    id: "calc",
    label: "電卓",
    title: "電卓",
    icon: (
      <>
        <rect x="5" y="2" width="14" height="20" rx="2" />
        <path d="M8 6h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 19h.01M12 19h4" />
      </>
    ),
  },
  {
    id: "report",
    label: "残金",
    title: "残金とグラフ",
    icon: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  },
];

const noopSubscribe = () => () => {};

export default function Kakeibo() {
  // 日付やlocalStorageはブラウザでのみ確定するため、ハイドレーション後に描画する
  const isClient = useSyncExternalStore(noopSubscribe, () => true, () => false);
  if (!isClient) {
    return (
      <main className="mx-auto w-full max-w-md px-4 py-8">
        <p className="text-sm text-zinc-500">読み込み中…</p>
      </main>
    );
  }
  return <KakeiboApp />;
}

function KakeiboApp() {
  const [tab, setTab] = useState<Tab>("input");
  const [draft, setDraft] = useState<{ key: number; amount: string; type: EntryType }>({
    key: 0,
    amount: "",
    type: "expense",
  });

  // 起動時・画面に戻ってきた時に、日付が来た固定収支を自動で記録する
  useEffect(() => {
    applyRecurring();
    const onVisible = () => {
      if (document.visibilityState === "visible") applyRecurring();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  const current = TABS.find((t) => t.id === tab)!;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-zinc-50/90 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
        <h1 className="text-lg font-bold">{current.title}</h1>
      </header>

      <main className="flex-1 px-4 pb-28 pt-4">
        {tab === "input" && (
          <InputTab
            key={draft.key}
            initialAmount={draft.amount}
            initialType={draft.type}
            onOpenCalc={() => setTab("calc")}
          />
        )}
        {tab === "list" && <ListTab />}
        {tab === "recurring" && <RecurringTab />}
        {tab === "calc" && (
          <CalcTab
            onUse={(amount, type) => {
              setDraft((d) => ({ key: d.key + 1, amount: String(amount), type }));
              setTab("input");
            }}
          />
        )}
        {tab === "report" && <ReportTab />}
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-10 border-t border-zinc-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95"
        aria-label="機能の切り替え"
      >
        <ul className="mx-auto flex max-w-md">
          {TABS.map((t) => {
            const active = t.id === tab;
            return (
              <li key={t.id} className="flex-1">
                <button
                  onClick={() => setTab(t.id)}
                  aria-current={active ? "page" : undefined}
                  className={`flex w-full flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
                    active ? "text-rose-600 dark:text-rose-400" : "text-zinc-500"
                  }`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="size-6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    {t.icon}
                  </svg>
                  {t.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
