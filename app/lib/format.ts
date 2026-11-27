export const yen = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
});

export function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "YYYY-MM" を delta か月ずらす */
export function shiftMonth(ym: string, delta: number) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function daysInMonth(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

/** その月の day 日の日付。月末を超える場合は月末日にする（31日指定→2月は28/29日） */
export function dateInMonth(ym: string, day: number) {
  return `${ym}-${pad(Math.min(day, daysInMonth(ym)))}`;
}

export function monthLabel(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return `${y}年${m}月`;
}
