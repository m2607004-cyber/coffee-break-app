"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import InputTab from "./_components/input-tab";
import CalendarTab from "./_components/calendar-tab";
import ListTab from "./_components/list-tab";
import ReportTab from "./_components/report-tab";
import { applyRecurring } from "./lib/entries-store";

type Tab = "input" | "calendar" | "list" | "report";

const TABS: { id: Tab; label: string; title: string; icon: ReactNode }[] = [
  {
    id: "input",
    label: "入力",
    title: "収支を入力",
    icon: <path d="M12 5v14M5 12h14" />,
  },
  {
    id: "calendar",
    label: "カレンダー",
    title: "カレンダー",
    icon: (
      <>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </>
    ),
  },
  {
    id: "list",
    label: "明細",
    title: "明細",
    icon: <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />,
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
  // カレンダーから「この日に記録」した時に、入力画面へ渡す日付
  const [inputDate, setInputDate] = useState<string | undefined>(undefined);

  const changeTab = (t: Tab) => {
    if (t === "input") setInputDate(undefined);
    setTab(t);
  };

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
        {tab === "input" && <InputTab key={inputDate ?? "today"} initialDate={inputDate} />}
        {tab === "calendar" && (
          <CalendarTab
            onAddOnDate={(date) => {
              setInputDate(date);
              setTab("input");
            }}
          />
        )}
        {tab === "list" && <ListTab />}
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
                  onClick={() => changeTab(t.id)}
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
