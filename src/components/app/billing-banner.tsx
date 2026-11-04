import { AlertTriangle, Ban } from "lucide-react";
import { billingNotice, useBilling } from "@/lib/billing";
import { useCenter } from "@/lib/center";

/** Obuna muddati yaqinlashganda yoki tugaganda ko'rinadigan ogohlantirish. */
export function BillingBanner() {
  const { role } = useCenter();
  const q = useBilling();
  const notice = billingNotice(q.data);
  if (!notice) return null;
  const Icon = q.data?.state === "readonly" ? Ban : AlertTriangle;
  const tone =
    notice.tone === "danger"
      ? "border-destructive/40 bg-destructive-soft text-destructive"
      : "border-warning/40 bg-warning-soft text-foreground";
  return (
    <div
      role="status"
      className={`no-print mb-4 flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${tone}`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <p>
        {notice.text}
        {role !== "owner" && role !== "admin" && " Bu haqda markaz egasiga xabar bering."}
      </p>
    </div>
  );
}
