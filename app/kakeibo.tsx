"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import InputTab from "./_components/input-tab";
import CalendarTab from "./_components/calendar-tab";
import ReportTab from "./_components/report-tab";
import { applyRecurring } from "./lib/entries-store";

type Tab = "input" | "calendar" | "report";

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
    id: "report",
    label: "残金",
    title: "残金とグラフ",
    icon: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  },
];

const noopSubscribe = () => () => {};

// 背景色のテーマ（globals.css の :root[data-bg] と対応）
const BG_THEMES = ["cream", "mint", "sky", "lavender", "peach", "stone"];
const BG_KEY = "kakeibo:bg:v1";

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

  // 起動するたびに背景色を切り替える（前回と同じ色にはしない）
  useEffect(() => {
    let last: string | null = null;
    try {
      last = localStorage.getItem(BG_KEY);
    } catch {}
    const choices = BG_THEMES.filter((b) => b !== last);
    const next = choices[Math.floor(Math.random() * choices.length)];
    document.documentElement.dataset.bg = next;
    try {
      localStorage.setItem(BG_KEY, next);
    } catch {}
  }, []);

  const current = TABS.find((t) => t.id === tab)!;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-app">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-app/90 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur dark:border-zinc-800">
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
                  className={`relative flex h-[var(--nav-h)] w-full flex-col items-center justify-center gap-0.5 text-[11px] ${
                    active
                      ? "font-bold text-zinc-900 dark:text-zinc-50"
                      : "font-medium text-zinc-500 dark:text-zinc-400"
                  }`}
                >
                  {/* 選択中のタブは色だけでなく、上のバーと太字でも示す */}
                  {active && (
                    <span
                      className="absolute inset-x-6 top-0 h-1 rounded-b-full bg-zinc-900 dark:bg-zinc-50"
                      aria-hidden
                    />
                  )}
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
