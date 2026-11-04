import { useQuery } from "@tanstack/react-query";
import { useCenter } from "@/lib/center";
import { untyped, useBilling, type SubscriptionPayment } from "@/lib/billing";
import { PLANS } from "@/lib/plans";
import { PAYMENT_METHODS, formatDate, formatUZS } from "@/lib/format";
import { Panel, StatusBadge } from "@/components/app/ui-bits";

const STATE_LABEL = {
  active: { tone: "success", text: "Faol" },
  grace: { tone: "warning", text: "Muddati tugagan (imtiyoz)" },
  readonly: { tone: "danger", text: "Faqat ko'rish" },
} as const;

/** Markaz egasi uchun obuna holati va to'lovlar tarixi. */
export function SubscriptionPanel() {
  const { centerId } = useCenter();
  const billing = useBilling();
  const history = useQuery({
    queryKey: ["billing-history", centerId],
    queryFn: async (): Promise<SubscriptionPayment[]> => {
      const { data, error } = await untyped
        .from("subscription_payments")
        .select("*")
        .eq("center_id", centerId)
        .order("paid_on", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(20);
      return error ? [] : (data ?? []);
    },
  });
  const b = billing.data;
  if (!b) return null;
  const state = STATE_LABEL[b.state];
  const planName = PLANS.find((p) => p.id === b.plan)?.name ?? b.plan;
  return (
    <Panel title="Obuna" className="mb-4">
      <div className="space-y-3 p-5 text-sm">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <span>
            Tarif: <b>{planName}</b>
          </span>
          <span>
            Amal qilish muddati: <b className="tabular">{formatDate(b.paid_until)}</b>
            {b.days_left !== null && b.days_left >= 0 && (
              <span className="text-muted-foreground"> ({b.days_left} kun qoldi)</span>
            )}
          </span>
          <StatusBadge tone={state.tone}>{state.text}</StatusBadge>
        </div>
        <p className="text-xs text-muted-foreground">
          Obunani uzaytirish uchun to'lovni CRM administratoriga amalga oshiring. To'lov
          kiritilgach, muddat avtomatik uzayadi. Muddat tugagach 3 kun hamma narsa ishlaydi, keyin
          tizim faqat ko'rish rejimiga o'tadi (ma'lumotlaringiz saqlanadi).
        </p>
      </div>
      {(history.data?.length ?? 0) > 0 && (
        <div className="overflow-x-auto border-t">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted text-xs text-muted-foreground">
              <tr>
                <th className="px-5 py-2.5 font-medium">Sana</th>
                <th className="px-5 py-2.5 font-medium">Davr</th>
                <th className="px-5 py-2.5 font-medium">Tarif</th>
                <th className="px-5 py-2.5 font-medium">Usul</th>
                <th className="px-5 py-2.5 text-right font-medium">Summa</th>
              </tr>
            </thead>
            <tbody>
              {history.data!.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="tabular px-5 py-2.5">{formatDate(p.paid_on)}</td>
                  <td className="tabular px-5 py-2.5">
                    {formatDate(p.period_start)} — {formatDate(p.period_end)}
                  </td>
                  <td className="px-5 py-2.5">
                    {PLANS.find((x) => x.id === p.plan)?.name ?? p.plan}
                  </td>
                  <td className="px-5 py-2.5">{PAYMENT_METHODS[p.method] ?? p.method}</td>
                  <td className="tabular px-5 py-2.5 text-right font-medium">
                    {formatUZS(p.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
