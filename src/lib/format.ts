export const TZ = "Asia/Tashkent";

/** Format integer UZS amount: 1 250 000 so'm */
export function formatUZS(amount: number | null | undefined, withSuffix = true): string {
  const n = Math.round(Number(amount ?? 0));
  const s = Math.abs(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${n < 0 ? "−" : ""}${s}${withSuffix ? " so'm" : ""}`;
}

/** Parse user-typed money ("1 200 000") into a safe integer, or NaN. */
export function parseUZS(input: string): number {
  const digits = input.replace(/[^\d]/g, "");
  if (!digits) return NaN;
  return parseInt(digits, 10);
}

/** Today's date in Tashkent as YYYY-MM-DD */
export function todayISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}

export function monthStartISO(iso = todayISO()): string {
  return iso.slice(0, 7) + "-01";
}

/** YYYY-MM-DD -> DD.MM.YYYY */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = iso.slice(0, 10).split("-");
  if (d.length !== 3) return iso;
  return `${d[2]}.${d[1]}.${d[0]}`;
}

export const MONTHS_UZ = [
  "Yanvar",
  "Fevral",
  "Mart",
  "Aprel",
  "May",
  "Iyun",
  "Iyul",
  "Avgust",
  "Sentabr",
  "Oktabr",
  "Noyabr",
  "Dekabr",
];
export const MONTHS_SHORT = [
  "Yan",
  "Fev",
  "Mar",
  "Apr",
  "May",
  "Iyn",
  "Iyl",
  "Avg",
  "Sen",
  "Okt",
  "Noy",
  "Dek",
];
export const WEEKDAYS_UZ = [
  "Dushanba",
  "Seshanba",
  "Chorshanba",
  "Payshanba",
  "Juma",
  "Shanba",
  "Yakshanba",
];
export const WEEKDAYS_SHORT = ["Du", "Se", "Cho", "Pa", "Ju", "Sha", "Ya"];

export function formatMonth(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m] = iso.split("-");
  return `${MONTHS_UZ[parseInt(m, 10) - 1]} ${y}`;
}

export function formatLongDate(iso = todayISO()): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dow = isoWeekday(iso);
  return `${WEEKDAYS_UZ[dow - 1]}, ${d}-${MONTHS_UZ[m - 1].toLowerCase()} ${y}`;
}

/** ISO weekday 1=Mon..7=Sun for a YYYY-MM-DD date */
export function isoWeekday(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return wd === 0 ? 7 : wd;
}

export function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

export function addMonths(iso: string, n: number): string {
  const [y, m] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + n, 1));
  return dt.toISOString().slice(0, 10);
}

/** Normalize Uzbek phone to +998XXXXXXXXX or return null if invalid */
export function normalizePhone(input: string): string | null {
  let d = input.replace(/\D/g, "");
  if (d.length === 9) d = "998" + d;
  if (d.length !== 12 || !d.startsWith("998")) return null;
  return "+" + d;
}

export function formatPhone(p: string | null | undefined): string {
  if (!p) return "—";
  const d = p.replace(/\D/g, "");
  if (d.length !== 12) return p;
  return `+998 ${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8, 10)} ${d.slice(10, 12)}`;
}

export function time5(t: string | null | undefined): string {
  return t ? t.slice(0, 5) : "—";
}

const ONES_UZ = ["", "bir", "ikki", "uch", "to'rt", "besh", "olti", "yetti", "sakkiz", "to'qqiz"];
const TENS_UZ = [
  "",
  "o'n",
  "yigirma",
  "o'ttiz",
  "qirq",
  "ellik",
  "oltmish",
  "yetmish",
  "sakson",
  "to'qson",
];
const SCALES_UZ = ["", "ming", "million", "milliard"];

function groupToWordsUz(n: number): string {
  const parts: string[] = [];
  const h = Math.floor(n / 100);
  const t = Math.floor((n % 100) / 10);
  const o = n % 10;
  if (h) parts.push(ONES_UZ[h], "yuz");
  if (t) parts.push(TENS_UZ[t]);
  if (o) parts.push(ONES_UZ[o]);
  return parts.join(" ");
}

/** 1250000 -> "Bir million ikki yuz ellik ming so'm" (kvitansiyadagi summa so'z bilan). */
export function amountInWordsUz(amount: number | null | undefined, withSuffix = true): string {
  const n = Math.abs(Math.round(Number(amount ?? 0)));
  const suffix = withSuffix ? " so'm" : "";
  if (n === 0) return `Nol${suffix}`;
  const groups: string[] = [];
  let rest = n;
  for (let i = 0; rest > 0 && i < SCALES_UZ.length; i++) {
    const chunk = rest % 1000;
    rest = Math.floor(rest / 1000);
    if (chunk) groups.unshift([groupToWordsUz(chunk), SCALES_UZ[i]].filter(Boolean).join(" "));
  }
  const words = groups.join(" ");
  return words.charAt(0).toUpperCase() + words.slice(1) + suffix;
}

export const PAYMENT_METHODS: Record<string, string> = {
  cash: "Naqd",
  card: "Bank kartasi",
  transfer: "Bank o'tkazmasi",
  other: "Boshqa",
};

export const EXPENSE_CATEGORIES = [
  "Ijara",
  "O'qituvchi maoshi",
  "Kommunal xizmatlar",
  "Reklama",
  "Jihozlar",
  "Boshqa",
];

export const ROLE_LABELS: Record<string, string> = {
  owner: "Egasi",
  admin: "Administrator",
  teacher: "O'qituvchi",
  receptionist: "Qabulxona",
};

export const ATTENDANCE_LABELS: Record<string, string> = {
  present: "Keldi",
  absent: "Kelmadi",
  late: "Kechikdi",
  excused: "Sababli",
};

export const STUDENT_STATUS: Record<string, string> = {
  active: "Faol",
  paused: "To'xtatilgan",
  archived: "Arxivlangan",
};
