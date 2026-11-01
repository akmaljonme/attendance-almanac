import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
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
import { PAYMENT_METHODS, formatDate, formatMonth, formatPhone, formatUZS } from "@/lib/format";

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

/** Chop etishda faqat shu qism chiqadi (qolgan sahifa yashiriladi, styles.css ga qarang). */
function PrintPortal({ children }: { children: React.ReactNode }) {
  if (typeof document === "undefined") return null;
  return createPortal(<div className="print-root">{children}</div>, document.body);
}

/** Tartib raqami: to'lov yoki o'quvchi identifikatorining bosh 8 belgisi. */
export const shortCode = (id: string) => id.slice(0, 8).toUpperCase();

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
}

function ReceiptBody({ r, center }: { r: ReceiptData; center: CenterInfo }) {
  const rows: [string, string][] = [
    ["O'quvchi", r.student_name],
    ["Telefon", formatPhone(r.student_phone)],
    ["Guruh", r.group_name ?? "—"],
    ["To'lov davri", formatMonth(r.period_month)],
    ["To'lov usuli", PAYMENT_METHODS[r.method] ?? r.method],
    ...(r.reference ? ([["Chek raqami", r.reference]] as [string, string][]) : []),
  ];
  const contact = [center.city, center.address].filter(Boolean).join(", ");
  return (
    <div className="mx-auto w-full max-w-[440px] bg-white p-6 text-sm text-black">
      <div className="flex items-center gap-3 border-b-2 border-black pb-4">
        <img src="/logo.png" alt="" className="h-10 w-10 rounded-lg" />
        <div className="min-w-0">
          <p className="font-display text-lg font-semibold leading-tight">{center.name}</p>
          {contact && <p className="text-xs text-neutral-600">{contact}</p>}
          {center.phone && <p className="text-xs text-neutral-600">{formatPhone(center.phone)}</p>}
        </div>
      </div>
      <div className="mt-4 flex items-baseline justify-between gap-4">
        <h2 className="font-display text-base font-semibold uppercase tracking-wide">
          To'lov kvitansiyasi
        </h2>
        <p className="tabular text-xs text-neutral-600">
          № {shortCode(r.id)} · {formatDate(r.paid_on)}
        </p>
      </div>
      <dl className="mt-3 divide-y divide-neutral-200 border-y border-neutral-300">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 py-2">
            <dt className="text-neutral-600">{k}</dt>
            <dd className="text-right font-medium">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 flex items-center justify-between rounded-md border-2 border-black px-4 py-3">
        <span className="font-semibold">To'langan summa</span>
        <span className="tabular font-display text-xl font-bold">{formatUZS(r.amount)}</span>
      </div>
      {r.voided_at && (
        <p className="mt-3 rounded-md border border-red-600 px-3 py-2 text-center font-semibold text-red-700">
          BEKOR QILINGAN{r.void_reason ? `: ${r.void_reason}` : ""}
        </p>
      )}
      <div className="mt-8 grid grid-cols-2 gap-8 text-xs text-neutral-600">
        <div className="border-t border-black pt-1.5">Qabul qildi (imzo)</div>
        <div className="border-t border-black pt-1.5">To'lovchi (imzo)</div>
      </div>
      <p className="mt-5 text-[11px] leading-relaxed text-neutral-500">
        Ushbu kvitansiya markaz tomonidan qayd etilgan to'lovni tasdiqlaydi. To'lov tarixi markaz
        hisobida saqlanadi.
      </p>
    </div>
  );
}

export function ReceiptDialog({
  receipt,
  onOpenChange,
}: {
  receipt: ReceiptData | null;
  onOpenChange: (open: boolean) => void;
}) {
  const center = useCenterInfo();
  return (
    <Dialog open={!!receipt} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Kvitansiya</DialogTitle>
        </DialogHeader>
        {receipt && (
          <>
            <div className="max-h-[70vh] overflow-y-auto rounded-md border bg-white">
              <ReceiptBody r={receipt} center={center} />
            </div>
            <DialogFooter>
              <Button onClick={() => window.print()}>
                <Printer className="mr-1.5 h-4 w-4" />
                Chop etish
              </Button>
            </DialogFooter>
            <PrintPortal>
              <ReceiptBody r={receipt} center={center} />
            </PrintPortal>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export interface StudentCardData {
  id: string;
  full_name: string;
  phone: string | null;
  parent_phone: string | null;
  enrolled_on: string;
  groups: string[];
}

function CardFace({ s, center }: { s: StudentCardData; center: CenterInfo }) {
  return (
    <div className="relative flex h-[54mm] w-[85.6mm] flex-col overflow-hidden rounded-xl border border-neutral-300 bg-white text-black">
      <div className="flex items-center gap-2.5 bg-primary px-4 py-2.5 text-primary-foreground">
        <img src="/logo.png" alt="" className="h-7 w-7 rounded-md bg-white/90" />
        <div className="min-w-0">
          <p className="truncate font-display text-sm font-semibold leading-tight">{center.name}</p>
          <p className="text-[10px] uppercase tracking-wider opacity-80">O'quvchi kartasi</p>
        </div>
      </div>
      <div className="flex flex-1 flex-col justify-between px-4 py-3">
        <div>
          <p className="font-display text-lg font-semibold leading-tight">{s.full_name}</p>
          <p className="mt-1 text-[11px] leading-snug text-neutral-600">
            {s.groups.length ? s.groups.join(" · ") : "Guruhga yozilmagan"}
          </p>
        </div>
        <div className="flex items-end justify-between gap-3 text-[11px]">
          <div className="space-y-0.5 text-neutral-700">
            <p className="tabular">Tel: {formatPhone(s.phone ?? s.parent_phone)}</p>
            <p className="tabular">Qabul: {formatDate(s.enrolled_on)}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] uppercase tracking-wider text-neutral-500">ID</p>
            <p className="tabular font-display text-base font-bold tracking-wider">
              {shortCode(s.id)}
            </p>
          </div>
        </div>
      </div>
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
            <div className="flex justify-center overflow-x-auto rounded-md bg-muted/50 p-4">
              <CardFace s={student} center={center} />
            </div>
            <p className="text-xs text-muted-foreground">
              Karta bank kartasi o'lchamida (85.6 × 54 mm) chop etiladi. Qirqib, plastik g'ilofga
              solib bering.
            </p>
            <DialogFooter>
              <Button onClick={() => window.print()}>
                <Printer className="mr-1.5 h-4 w-4" />
                Chop etish
              </Button>
            </DialogFooter>
            <PrintPortal>
              <CardFace s={student} center={center} />
            </PrintPortal>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
