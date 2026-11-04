import { useState } from "react";
import { CalendarClock, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, StatusBadge, selectCls } from "@/components/app/ui-bits";
import type { AdminCommand, BillingPayment, BillingSub } from "@/lib/admin.functions";
import { accessState, daysLeft, nextPeriod } from "@/lib/billing-rules";
import { PLANS } from "@/lib/plans";
import { PAYMENT_METHODS, formatDate, formatUZS, parseUZS, todayISO } from "@/lib/format";

type CenterRow = { id: string; name: string; city: string | null };
type Billing = { ready: boolean; subscriptions: BillingSub[]; payments: BillingPayment[] };

const STATE = {
  active: { tone: "success", text: "Faol" },
  grace: { tone: "warning", text: "Imtiyoz" },
  readonly: { tone: "danger", text: "Cheklangan" },
} as const;

const planName = (id: string) => PLANS.find((p) => p.id === id)?.name ?? id;
const planPrice = (id: string) => {
  const p = PLANS.find((x) => x.id === id);
  return p ? parseUZS(p.price) : 0;
};

export function AdminBilling({
  centers,
  billing,
  term,
  busy,
  run,
}: {
  centers: CenterRow[];
  billing: Billing;
  term: string;
  busy: boolean;
  run: (cmd: AdminCommand) => Promise<boolean>;
}) {
  const today = todayISO();
  const [payFor, setPayFor] = useState<CenterRow | null>(null);
  const [untilFor, setUntilFor] = useState<CenterRow | null>(null);
  const subOf = (id: string) => billing.subscriptions.find((s) => s.center_id === id);
  const nameOf = (id: string) => centers.find((c) => c.id === id)?.name ?? "—";

  if (!billing.ready)
    return (
      <div className="border-l-2 border-warning p-4 text-sm">
        <p className="font-semibold">Obuna jadvallari hali yaratilmagan</p>
        <p className="mt-1 text-muted-foreground">
          Bazada <code>drizzle/migrations/0003_center_billing.sql</code> faylidagi SQL'ni ishga
          tushiring, keyin sahifani yangilang.
        </p>
      </div>
    );

  const rows = centers.filter((c) => `${c.name} ${c.city ?? ""}`.toLowerCase().includes(term));
  return (
    <>
      <div className="overflow-x-auto border-y">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted">
            <tr>
              {["Markaz", "Tarif", "Amal qilish muddati", "Holat", "Amallar"].map((h) => (
                <th key={h} className="whitespace-nowrap px-4 py-3 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => {
              const s = subOf(c.id);
              const st = accessState(s?.paid_until, today);
              const left = s?.paid_until ? daysLeft(s.paid_until, today) : null;
              return (
                <tr key={c.id} className="border-t">
                  <td className="px-4 py-4">
                    <p className="font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.city || "—"}</p>
                  </td>
                  <td className="px-4 py-4">{s ? planName(s.plan) : "—"}</td>
                  <td className="whitespace-nowrap px-4 py-4">
                    {s?.paid_until ? formatDate(s.paid_until) : "Cheklovsiz"}
                    {left !== null && (
                      <p className="text-xs text-muted-foreground">
                        {left >= 0 ? `${left} kun qoldi` : `${-left} kun o'tgan`}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge tone={STATE[st].tone}>{STATE[st].text}</StatusBadge>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!s}
                        onClick={() => setPayFor(c)}
                      >
                        <Wallet className="mr-1.5 h-4 w-4" />
                        To'lov kiritish
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Muddatni qo'lda o'zgartirish"
                        aria-label={`${c.name} muddatini o'zgartirish`}
                        disabled={!s}
                        onClick={() => setUntilFor(c)}
                      >
                        <CalendarClock className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="px-4 py-10 text-center text-muted-foreground">Markazlar hali yo'q</p>
        )}
      </div>

      <h2 className="mb-3 mt-8 text-base font-semibold">So'nggi obuna to'lovlari</h2>
      {billing.payments.length === 0 ? (
        <p className="text-sm text-muted-foreground">Hali to'lov kiritilmagan.</p>
      ) : (
        <div className="overflow-x-auto border-y">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted">
              <tr>
                {["Sana", "Markaz", "Davr", "Tarif", "Usul", "Summa"].map((h) => (
                  <th key={h} className="whitespace-nowrap px-4 py-3 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {billing.payments.slice(0, 15).map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="tabular whitespace-nowrap px-4 py-3">{formatDate(p.paid_on)}</td>
                  <td className="px-4 py-3">{nameOf(p.center_id)}</td>
                  <td className="tabular whitespace-nowrap px-4 py-3">
                    {formatDate(p.period_start)} — {formatDate(p.period_end)}
                  </td>
                  <td className="px-4 py-3">{planName(p.plan)}</td>
                  <td className="px-4 py-3">{PAYMENT_METHODS[p.method] ?? p.method}</td>
                  <td className="tabular px-4 py-3 font-medium">{formatUZS(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {payFor && (
        <PayDialog
          center={payFor}
          sub={subOf(payFor.id)}
          busy={busy}
          onClose={() => setPayFor(null)}
          run={run}
        />
      )}
      {untilFor && (
        <UntilDialog
          center={untilFor}
          sub={subOf(untilFor.id)}
          busy={busy}
          onClose={() => setUntilFor(null)}
          run={run}
        />
      )}
    </>
  );
}

function PayDialog({
  center,
  sub,
  busy,
  onClose,
  run,
}: {
  center: CenterRow;
  sub: BillingSub | undefined;
  busy: boolean;
  onClose: () => void;
  run: (cmd: AdminCommand) => Promise<boolean>;
}) {
  const today = todayISO();
  const [plan, setPlan] = useState<"start" | "pro" | "business">(
    (PLANS.some((p) => p.id === sub?.plan) ? sub?.plan : "start") as "start" | "pro" | "business",
  );
  const [months, setMonths] = useState(1);
  const [amountText, setAmountText] = useState<string | null>(null);
  const [paidOn, setPaidOn] = useState(today);
  const [method, setMethod] = useState<"cash" | "card" | "transfer" | "other">("card");
  const [note, setNote] = useState("");
  const suggested = planPrice(plan) * months;
  const amount = amountText === null ? suggested : parseUZS(amountText);
  const period = nextPeriod(sub?.paid_until, months, today);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (Number.isNaN(amount)) return;
    const ok = await run({
      action: "subscription_payment",
      center_id: center.id,
      plan,
      months,
      amount,
      paid_on: paidOn,
      method,
      note,
    });
    if (ok) onClose();
  }

  return (
    <Dialog open onOpenChange={(v) => !v && !busy && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Obuna to'lovi: {center.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tarif">
              <select
                className={selectCls}
                value={plan}
                onChange={(e) => setPlan(e.target.value as typeof plan)}
              >
                {PLANS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.price} so'm/oy
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Necha oyga">
              <select
                className={selectCls}
                value={months}
                onChange={(e) => setMonths(Number(e.target.value))}
              >
                {[1, 2, 3, 6, 12].map((m) => (
                  <option key={m} value={m}>
                    {m} oy
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Summa (so'm)">
            <Input
              required
              inputMode="numeric"
              value={amountText ?? formatUZS(suggested, false)}
              onChange={(e) => setAmountText(e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="To'langan sana">
              <Input
                required
                type="date"
                max={today}
                value={paidOn}
                onChange={(e) => setPaidOn(e.target.value)}
              />
            </Field>
            <Field label="Usul">
              <select
                className={selectCls}
                value={method}
                onChange={(e) => setMethod(e.target.value as typeof method)}
              >
                {Object.entries(PAYMENT_METHODS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Izoh (ixtiyoriy)">
            <Input maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <p className="rounded-md bg-muted px-3 py-2 text-sm">
            Yangi muddat: <b className="tabular">{formatDate(period.end)}</b>
            <span className="text-muted-foreground">
              {" "}
              ({formatDate(period.start)} dan {months} oy)
            </span>
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={busy} onClick={onClose}>
              Bekor qilish
            </Button>
            <Button type="submit" disabled={busy || Number.isNaN(amount)}>
              {busy ? "Saqlanmoqda…" : "To'lovni saqlash"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function UntilDialog({
  center,
  sub,
  busy,
  onClose,
  run,
}: {
  center: CenterRow;
  sub: BillingSub | undefined;
  busy: boolean;
  onClose: () => void;
  run: (cmd: AdminCommand) => Promise<boolean>;
}) {
  const [until, setUntil] = useState(sub?.paid_until ?? todayISO());
  const [note, setNote] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const ok = await run({
      action: "set_paid_until",
      center_id: center.id,
      paid_until: until,
      note,
    });
    if (ok) onClose();
  }
  return (
    <Dialog open onOpenChange={(v) => !v && !busy && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Muddatni o'zgartirish: {center.name}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Xato kiritilgan to'lovni tuzatish yoki sovg'a muddat berish uchun. O'zgarish audit
          jurnaliga sababi bilan yoziladi.
        </p>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Obuna amal qiladigan oxirgi kun">
            <Input required type="date" value={until} onChange={(e) => setUntil(e.target.value)} />
          </Field>
          <Field label="Sabab">
            <Input
              required
              minLength={3}
              maxLength={200}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={busy} onClick={onClose}>
              Bekor qilish
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saqlanmoqda…" : "Saqlash"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
