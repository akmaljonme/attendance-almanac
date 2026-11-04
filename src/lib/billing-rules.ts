/**
 * Markaz obunasi qoidalari. Server (yaratuvchi paneli), brauzer va bazadagi
 * `center_access_state()` funksiyasi bir xil mantiqda ishlashi shart.
 *
 * `paid_until` — obuna amal qiladigan OXIRGI kun (shu kunni ham o'z ichiga oladi).
 */
export const GRACE_DAYS = 3;
export const WARN_DAYS = 7;

export type AccessState = "active" | "grace" | "readonly";

const DAY_MS = 86_400_000;
const toUTC = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};

/** iso2 - iso1 kunlarda. */
export function daysBetween(iso1: string, iso2: string): number {
  return Math.round((toUTC(iso2) - toUTC(iso1)) / DAY_MS);
}

/** Oy qo'shish; kun oyning oxirgi kunidan oshsa, oy oxiriga tushadi (31-yanvar + 1 oy = 28/29-fevral). */
export function addMonthsClamped(iso: string, months: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(
    Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0),
  ).getUTCDate();
  first.setUTCDate(Math.min(d, lastDay));
  return first.toISOString().slice(0, 10);
}

/** Obuna holati. paid_until bo'sh bo'lsa, cheklov yo'q. */
export function accessState(paidUntil: string | null | undefined, today: string): AccessState {
  if (!paidUntil) return "active";
  const over = daysBetween(paidUntil, today);
  if (over <= 0) return "active";
  if (over <= GRACE_DAYS) return "grace";
  return "readonly";
}

/** Muddat tugashigacha qolgan kunlar (manfiy = o'tib ketgan). */
export function daysLeft(paidUntil: string, today: string): number {
  return daysBetween(today, paidUntil);
}

/**
 * Yangi to'lov davri: muddat hali tugamagan bo'lsa, oxiridan davom etadi
 * (to'langan kunlar yo'qolmaydi); tugagan bo'lsa, bugundan boshlanadi.
 */
export function nextPeriod(
  paidUntil: string | null | undefined,
  months: number,
  today: string,
): { start: string; end: string } {
  const start = paidUntil && paidUntil >= today ? paidUntil : today;
  return { start, end: addMonthsClamped(start, months) };
}
