import { useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCenter } from "@/lib/center";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  PAYMENT_METHODS,
  amountInWordsUz,
  formatDate,
  formatMonth,
  formatPhone,
  formatUZS,
} from "@/lib/format";

/** Kvitansiya va o'quvchi kartasi uchun markaz ma'lumotlari. */
export function useCenterInfo() {
  const { centerId, centerName } = useCenter();
  const q = useQuery({
    queryKey: ["center-info", centerId],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("centers")
        .select("name, city, address, phone")
        .eq("id", centerId)
        .maybeSingle();
      return data;
    },
  });
  return {
    name: q.data?.name || centerName,
    city: q.data?.city ?? null,
    address: q.data?.address ?? null,
    phone: q.data?.phone ?? null,
  };
}
type CenterInfo = ReturnType<typeof useCenterInfo>;

const contactLine = (c: CenterInfo) => [c.city, c.address].filter(Boolean).join(", ");

/** Chop etishda faqat shu qism chiqadi (qolgan sahifa yashiriladi, styles.css ga qarang). */
function PrintPortal({ children }: { children: React.ReactNode }) {
  if (typeof document === "undefined") return null;
  return createPortal(<div className="print-root">{children}</div>, document.body);
}

/** Tartib raqami: to'lov yoki o'quvchi identifikatorining bosh 8 belgisi. */
export const shortCode = (id: string) => id.slice(0, 8).toUpperCase();

/** Ism-familiyadan bosh harflar: "Aziza Karimova" -> "AK". */
export const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");

function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-md border p-0.5">
      {options.map((o) => (
        <Button
          key={o.value}
          type="button"
          size="sm"
          variant={value === o.value ? "default" : "ghost"}
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </Button>
      ))}
    </div>
  );
}

/* ------------------------------ Kvitansiya ------------------------------ */

export interface ReceiptData {
  id: string;
  paid_on: string;
  period_month: string | null;
  method: string;
  amount: number;
  reference: string | null;
  voided_at: string | null;
  void_reason: string | null;
  student_name: string;
  student_phone: string | null;
  group_name: string | null;
  /** To'lovni qabul qilgan xodim ismi (ma'lum bo'lsa). */
  received_by?: string | null;
}

type ReceiptFormat = "standard" | "thermal";

function ReceiptRows({ rows, compact }: { rows: [string, string][]; compact?: boolean }) {
  return (
    <dl
      className={
        compact
          ? "mt-2 space-y-1 border-y border-dashed border-neutral-500 py-2"
          : "mt-3 divide-y divide-neutral-200 border-y border-neutral-300"
      }
    >
      {rows.map(([k, v]) => (
        <div key={k} className={`flex justify-between gap-4 ${compact ? "" : "py-2"}`}>
          <dt className="text-neutral-600">{k}</dt>
          <dd className="text-right font-medium">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function ReceiptBody({
  r,
  center,
  format,
  copyLabel,
}: {
  r: ReceiptData;
  center: CenterInfo;
  format: ReceiptFormat;
  copyLabel?: string;
}) {
  const rows: [string, string][] = [
    ["O'quvchi", r.student_name],
    ["Telefon", formatPhone(r.student_phone)],
    ["Guruh", r.group_name ?? "—"],
    ["To'lov davri", formatMonth(r.period_month)],
    ["To'lov usuli", PAYMENT_METHODS[r.method] ?? r.method],
    ...(r.reference ? ([["Chek raqami", r.reference]] as [string, string][]) : []),
  ];
  const contact = contactLine(center);
  const voided = r.voided_at && (
    <p className="mt-3 rounded-md border border-red-600 px-3 py-2 text-center font-semibold text-red-700">
      BEKOR QILINGAN{r.void_reason ? `: ${r.void_reason}` : ""}
    </p>
  );

  if (format === "thermal") {
    return (
      <div className="w-[72mm] bg-white p-2 text-[11px] leading-snug text-black">
        <div className="text-center">
          <p className="font-display text-sm font-semibold leading-tight">{center.name}</p>
          {contact && <p className="text-neutral-700">{contact}</p>}
          {center.phone && <p className="text-neutral-700">{formatPhone(center.phone)}</p>}
        </div>
        <p className="mt-2 text-center font-semibold uppercase tracking-wide">
          To'lov kvitansiyasi
        </p>
        <p className="tabular text-center text-neutral-700">
          № {shortCode(r.id)} · {formatDate(r.paid_on)}
        </p>
        <ReceiptRows rows={rows} compact />
        <div className="mt-2 flex items-baseline justify-between gap-2">
          <span className="font-semibold">Summa</span>
          <span className="tabular font-display text-base font-bold">{formatUZS(r.amount)}</span>
        </div>
        <p className="mt-0.5 text-[10px] italic text-neutral-700">{amountInWordsUz(r.amount)}</p>
        {voided}
        <p className="mt-3 border-t border-dashed border-neutral-500 pt-2">
          Qabul qildi: {r.received_by || "________________"}
        </p>
        <p className="mt-2 text-center text-neutral-600">Rahmat!</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[440px] bg-white p-6 text-sm text-black">
      <div className="flex items-center gap-3 border-b-2 border-black pb-4">
        <img src="/logo.png" alt="" className="h-10 w-10 rounded-lg" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-semibold leading-tight">{center.name}</p>
          {contact && <p className="text-xs text-neutral-600">{contact}</p>}
          {center.phone && <p className="text-xs text-neutral-600">{formatPhone(center.phone)}</p>}
        </div>
        {copyLabel && (
          <span className="shrink-0 rounded border border-neutral-400 px-2 py-0.5 text-[10px] uppercase tracking-wider text-neutral-600">
            {copyLabel}
          </span>
        )}
      </div>
      <div className="mt-4 flex items-baseline justify-between gap-4">
        <h2 className="font-display text-base font-semibold uppercase tracking-wide">
          To'lov kvitansiyasi
        </h2>
        <p className="tabular text-xs text-neutral-600">
          № {shortCode(r.id)} · {formatDate(r.paid_on)}
        </p>
      </div>
      <ReceiptRows rows={rows} />
      <div className="mt-4 flex items-center justify-between rounded-md border-2 border-black px-4 py-3">
        <span className="font-semibold">To'langan summa</span>
        <span className="tabular font-display text-xl font-bold">{formatUZS(r.amount)}</span>
      </div>
      <p className="mt-1.5 text-xs italic text-neutral-600">{amountInWordsUz(r.amount)}</p>
      {voided}
      <div className="mt-8 grid grid-cols-2 gap-8 text-xs text-neutral-600">
        <div className="border-t border-black pt-1.5">
          Qabul qildi{r.received_by ? `: ${r.received_by}` : " (imzo)"}
        </div>
        <div className="border-t border-black pt-1.5">To'lovchi (imzo)</div>
      </div>
      <p className="mt-5 text-[11px] leading-relaxed text-neutral-500">
        Ushbu kvitansiya markaz tomonidan qayd etilgan to'lovni tasdiqlaydi. To'lov tarixi markaz
        hisobida saqlanadi.
      </p>
    </div>
  );
}

/** Tanlangan format va nusxalar soniga ko'ra kvitansiya(lar). */
function ReceiptSheet({
  r,
  center,
  format,
  twoCopies,
}: {
  r: ReceiptData;
  center: CenterInfo;
  format: ReceiptFormat;
  twoCopies: boolean;
}) {
  if (format === "standard" && twoCopies) {
    return (
      <div className="space-y-4">
        <ReceiptBody r={r} center={center} format={format} copyLabel="Markaz nusxasi" />
        <div
          aria-hidden="true"
          className="mx-auto max-w-[440px] border-t border-dashed border-neutral-500 text-center text-[10px] uppercase tracking-widest text-neutral-500"
        >
          ✂ qirqing
        </div>
        <ReceiptBody r={r} center={center} format={format} copyLabel="O'quvchi nusxasi" />
      </div>
    );
  }
  return <ReceiptBody r={r} center={center} format={format} />;
}

export function ReceiptDialog({
  receipt,
  onOpenChange,
}: {
  receipt: ReceiptData | null;
  onOpenChange: (open: boolean) => void;
}) {
  const center = useCenterInfo();
  const [format, setFormat] = useState<ReceiptFormat>("standard");
  const [twoCopies, setTwoCopies] = useState(false);
  return (
    <Dialog open={!!receipt} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Kvitansiya</DialogTitle>
        </DialogHeader>
        {receipt && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Segmented
                label="Kvitansiya formati"
                value={format}
                onChange={setFormat}
                options={[
                  { value: "standard", label: "Standart" },
                  { value: "thermal", label: "Chek 80 mm" },
                ]}
              />
              {format === "standard" && (
                <Button
                  type="button"
                  size="sm"
                  variant={twoCopies ? "default" : "outline"}
                  aria-pressed={twoCopies}
                  onClick={() => setTwoCopies((v) => !v)}
                >
                  2 nusxa
                </Button>
              )}
            </div>
            <div className="max-h-[60vh] overflow-auto rounded-md border bg-white p-2">
              <div className={format === "thermal" ? "flex justify-center" : undefined}>
                <ReceiptSheet r={receipt} center={center} format={format} twoCopies={twoCopies} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => window.print()}>
                <Printer className="mr-1.5 h-4 w-4" />
                Chop etish
              </Button>
            </DialogFooter>
            <PrintPortal>
              <ReceiptSheet r={receipt} center={center} format={format} twoCopies={twoCopies} />
            </PrintPortal>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* --------------------------- O'quvchi kartasi --------------------------- */

export interface StudentCardData {
  id: string;
  full_name: string;
  phone: string | null;
  parent_phone: string | null;
  enrolled_on: string;
  groups: string[];
}

const CARD = "relative flex h-[54mm] w-[85.6mm] flex-col overflow-hidden rounded-xl border";

function CardFront({ s, center }: { s: StudentCardData; center: CenterInfo }) {
  return (
    <div className={`${CARD} border-neutral-300 bg-white text-black`}>
      <div className="flex items-center gap-2.5 bg-primary px-4 py-2.5 text-primary-foreground">
        <img src="/logo.png" alt="" className="h-7 w-7 rounded-md bg-white/90" />
        <div className="min-w-0">
          <p className="truncate font-display text-sm font-semibold leading-tight">{center.name}</p>
          <p className="text-[10px] uppercase tracking-wider opacity-80">O'quvchi kartasi</p>
        </div>
      </div>
      <div className="flex flex-1 gap-3 px-4 py-3">
        <div
          aria-hidden="true"
          className="grid h-14 w-14 shrink-0 place-items-center rounded-full border-2 border-primary bg-primary-soft font-display text-lg font-bold text-primary"
        >
          {initials(s.full_name)}
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-between">
          <div>
            <p className="font-display text-base font-semibold leading-tight">{s.full_name}</p>
            <p className="mt-0.5 text-[11px] leading-snug text-neutral-600">
              {s.groups.length ? s.groups.join(" · ") : "Guruhga yozilmagan"}
            </p>
          </div>
          <div className="flex items-end justify-between gap-2 text-[10px] text-neutral-700">
            <div className="space-y-0.5">
              <p className="tabular">Tel: {formatPhone(s.phone ?? s.parent_phone)}</p>
              <p className="tabular">Qabul: {formatDate(s.enrolled_on)}</p>
            </div>
            <div className="text-right">
              <p className="text-[8px] uppercase tracking-wider text-neutral-500">ID</p>
              <p className="tabular font-display text-sm font-bold tracking-wider">
                {shortCode(s.id)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CardBack({ s, center }: { s: StudentCardData; center: CenterInfo }) {
  const contact = contactLine(center);
  return (
    <div className={`${CARD} border-neutral-300 bg-neutral-50 text-black`}>
      <div className="h-2 bg-primary" />
      <div className="flex flex-1 items-center gap-4 px-4 py-3">
        <div className="shrink-0 rounded-md border border-neutral-300 bg-white p-1.5">
          <QRCodeSVG value={s.id} size={78} level="M" aria-label={`QR kod: ${shortCode(s.id)}`} />
        </div>
        <div className="min-w-0 flex-1 text-[10px] leading-snug text-neutral-700">
          <p className="font-display text-xs font-semibold text-black">{center.name}</p>
          {contact && <p className="mt-0.5">{contact}</p>}
          {center.phone && <p className="tabular">{formatPhone(center.phone)}</p>}
          <p className="mt-2 text-neutral-600">
            Karta shaxsiy. Yo'qolsa, markazga xabar bering. Kirishda ID yoki QR kodni ko'rsating.
          </p>
          <p className="tabular mt-1.5 font-display text-xs font-bold tracking-wider text-black">
            ID: {shortCode(s.id)}
          </p>
        </div>
      </div>
    </div>
  );
}

function CardSheet({ s, center }: { s: StudentCardData; center: CenterInfo }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <CardFront s={s} center={center} />
      <CardBack s={s} center={center} />
    </div>
  );
}

export function StudentCardDialog({
  student,
  open,
  onOpenChange,
}: {
  student: StudentCardData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const center = useCenterInfo();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>O'quvchi kartasi</DialogTitle>
        </DialogHeader>
        {open && (
          <>
            <div className="max-h-[60vh] overflow-auto rounded-md bg-muted/50 p-4">
              <CardSheet s={student} center={center} />
            </div>
            <p className="text-xs text-muted-foreground">
              Old va orqa tomon bank kartasi o'lchamida (85.6 × 54 mm) chop etiladi. Qirqib, plastik
              g'ilofga solib bering. Orqadagi QR kodda o'quvchi identifikatori bor.
            </p>
            <DialogFooter>
              <Button onClick={() => window.print()}>
                <Printer className="mr-1.5 h-4 w-4" />
                Chop etish
              </Button>
            </DialogFooter>
            <PrintPortal>
              <CardSheet s={student} center={center} />
            </PrintPortal>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
