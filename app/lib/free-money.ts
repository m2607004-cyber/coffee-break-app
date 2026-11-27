import type { Entry } from "./entries-store";

/**
 * 予算をもとにした「自由費」を計算する。
 *   今月の予算の残り ＝ 1か月の予算 − 今月使ったお金（マイナスなら 0）
 *   自由費           ＝ 今の残金 − 今月の予算の残り
 * 今月すでに使ったお金は残金から引かれているので、予算は「まだ使っていない分」だけを引く。
 */
export function computeFreeMoney(
  entries: Entry[],
  balance: number,
  monthlyBudget: number,
  today: string,
) {
  const month = today.slice(0, 7);
  // 残金と同じく、今日までの記録だけを数える
  const spent = entries
    .filter((e) => e.type === "expense" && e.date.startsWith(month) && e.date <= today)
    .reduce((s, e) => s + e.amount, 0);
  const budgetLeft = Math.max(0, monthlyBudget - spent);

  return {
    balance,
    budgetLeft,
    /** 予算をオーバーした額（オーバーしていなければ 0） */
    budgetOver: Math.max(0, spent - monthlyBudget),
    free: balance - budgetLeft,
  };
}
