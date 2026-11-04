import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCenter } from "@/lib/center";
import { GRACE_DAYS, WARN_DAYS, type AccessState } from "@/lib/billing-rules";

/**
 * Obuna jadvali va funksiyalari (drizzle/migrations/0003_center_billing.sql) generatsiya qilingan
 * tiplarda hali bo'lmasligi mumkin, shuning uchun tipsiz mijoz orqali murojaat qilamiz.
 */
export const untyped = supabase as unknown as {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rpc: (fn: string, args?: Record<string, unknown>) => any;
};

export interface CenterBilling {
  state: AccessState;
  paid_until: string | null;
  days_left: number | null;
  plan: string;
}

export interface SubscriptionPayment {
  id: string;
  center_id: string;
  plan: string;
  amount: number;
  months: number;
  period_start: string;
  period_end: string;
  paid_on: string;
  method: string;
  note: string | null;
}

/** Joriy markazning obuna holati. Migratsiya bajarilmagan bo'lsa, null (cheklovsiz). */
export function useBilling() {
  const { centerId } = useCenter();
  return useQuery({
    queryKey: ["billing", centerId],
    staleTime: 60_000,
    queryFn: async (): Promise<CenterBilling | null> => {
      const { data, error } = await untyped.rpc("center_billing", { _center: centerId });
      if (error) return null;
      const row = Array.isArray(data) ? data[0] : data;
      return row ?? null;
    },
  });
}

export type BillingNotice = { tone: "warning" | "danger"; text: string } | null;

/** Banner matni: muddat yaqinlashganda ogohlantirish, tugagach — cheklov haqida. */
export function billingNotice(b: CenterBilling | null | undefined): BillingNotice {
  if (!b || !b.paid_until) return null;
  const left = b.days_left ?? 0;
  if (b.state === "readonly")
    return {
      tone: "danger",
      text: "Obuna muddati tugagan: tizim faqat ko'rish rejimida. Yangi ma'lumot kiritish uchun obunani to'lang va administratorga murojaat qiling.",
    };
  if (b.state === "grace")
    return {
      tone: "danger",
      text: `Obuna muddati tugagan. Yana ${Math.max(1, GRACE_DAYS + 1 + left)} kundan keyin tizim faqat ko'rish rejimiga o'tadi. Obunani to'lang.`,
    };
  if (left <= WARN_DAYS)
    return {
      tone: "warning",
      text:
        left === 0
          ? "Obuna muddati bugun tugaydi. Uzluksiz ishlash uchun obunani uzaytiring."
          : `Obuna muddati ${left} kundan keyin tugaydi. Uzluksiz ishlash uchun obunani uzaytiring.`,
    };
  return null;
}
