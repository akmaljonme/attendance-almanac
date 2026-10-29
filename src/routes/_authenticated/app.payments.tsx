import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Wallet, Plus, Download, Printer, Ban } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCenter, can } from "@/lib/center";
import { paymentsQ, groupsQ } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState, ErrorBox, Field, LoadingRows, PageHeader, Panel, StatCard, StatusBadge, selectCls } from "@/components/app/ui-bits";
import { PaymentDialog } from "@/components/app/dialogs";
import { PAYMENT_METHODS, formatDate, formatMonth, formatPhone, formatUZS, monthStartISO, todayISO } from "@/lib/format";
import { downloadCSV } from "@/lib/csv";

export const Route = createFileRoute("/_authenticated/app/payments")({
  head: () => ({ meta: [{ title: "To'lovlar — Markazly" }] }),
  component: PaymentsPage,
});

type P = Awaited<ReturnType<NonNullable<ReturnType<typeof paymentsQ>["queryFn"]>>>[number];

function PaymentsPage() {
  const { centerId, centerName, role } = useCenter();
  const perms = can(role);
  const qc = useQueryClient();
  const [from, setFrom] = useState(monthStartISO());
  const [to, setTo] = useState(todayISO());
  const [method, setMethod] = useState("");
  const [group, setGroup] = useState("");
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [receipt, setReceipt] = useState<P | null>(null);
  const [voiding, setVoiding] = useState<P | null>(null);
  const [reason, setReason] = useState("");
  const q = useQuery(paymentsQ(centerId, from, to));
  const groups = useQuery(groupsQ(centerId));

  const rows = useMemo(() => (q.data ?? []).filter((p) => (!method || p.method === method) && (!group || p.group_id === group) && (!text || p.students?.full_name.toLowerCase().includes(text.toLowerCase()))), [q.data, method, group, text]);
  const valid = rows.filter((p) => !p.voided_at);
  const total = valid.reduce((a, p) => a + p.amount, 0);
  const today = valid.filter((p) => p.paid_on === todayISO()).reduce((a, p) => a + p.amount, 0);

  async function doVoid() {
    if (!voiding) return;
    if (reason.trim().length < 3) return toast.error("Sababini yozing");
    const { error } = await supabase.from("payments").update({ voided_at: new Date().toISOString(), void_reason: reason.trim() }).eq("id", voiding.id);
    if (error) return toast.error(error.message);
    toast.success("To'lov bekor qilindi (tarixda saqlanadi)");
    setVoiding(null); setReason("");
    ["payments", "balances", "student", "dashboard", "reports"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="To'lovlar" description="Qo'lda qayd etilgan to'lovlar" actions={<>
        {perms.finance && <Button variant="outline" onClick={() => downloadCSV(`tolovlar_${from}_${to}.csv`, [["Sana", "O'quvchi", "Telefon", "Guruh", "Davr", "Usul", "Summa", "Chek", "Holat"], ...rows.map((p) => [formatDate(p.paid_on), p.students?.full_name, p.students?.phone, p.groups?.name, formatMonth(p.period_month), PAYMENT_METHODS[p.method], p.amount, p.reference, p.voided_at ? "Bekor qilingan" : "Faol"])])}><Download className="mr-1.5 h-4 w-4" />CSV</Button>}
        <Button onClick={() => setOpen(true)}><Plus className="mr-1.5 h-4 w-4" />To'lovni qayd etish</Button>
      </>} />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Tanlangan davr tushumi" value={formatUZS(total)} icon={Wallet} tone="success" />
        <StatCard label="Bugungi tushum" value={formatUZS(today)} icon={Wallet} tone="primary" />
        <StatCard label="To'lovlar soni" value={valid.length} icon={Wallet} />
      </div>
      <Panel>
        <div className="grid gap-2 border-b p-3 sm:grid-cols-2 lg:grid-cols-5">
          <Input placeholder="O'quvchi ismi" value={text} onChange={(e) => setText(e.target.value)} />
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Dan" />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Gacha" />
          <select className={selectCls} value={method} onChange={(e) => setMethod(e.target.value)}><option value="">Barcha usullar</option>{Object.entries(PAYMENT_METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <select className={selectCls} value={group} onChange={(e) => setGroup(e.target.value)}><option value="">Barcha guruhlar</option>{(groups.data ?? []).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
        </div>
        {q.error ? <ErrorBox error={q.error} /> : q.isLoading ? <LoadingRows /> : rows.length === 0 ? <EmptyState icon={Wallet} title="Bu davrda to'lovlar yo'q" /> : (
          <Table>
            <TableHeader><TableRow><TableHead>Sana</TableHead><TableHead>O'quvchi</TableHead><TableHead className="hidden md:table-cell">Davr</TableHead><TableHead className="hidden sm:table-cell">Usul</TableHead><TableHead className="text-right">Summa</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {rows.map((p) => (
                <TableRow key={p.id} className={p.voided_at ? "opacity-60" : ""}>
                  <TableCell className="tabular text-sm">{formatDate(p.paid_on)}</TableCell>
                  <TableCell><Link to="/app/students/$id" params={{ id: p.student_id }} className="font-medium hover:text-primary">{p.students?.full_name}</Link>{p.groups && <p className="text-xs text-muted-foreground">{p.groups.name}</p>}</TableCell>
                  <TableCell className="hidden text-sm md:table-cell">{formatMonth(p.period_month)}</TableCell>
                  <TableCell className="hidden text-sm sm:table-cell">{PAYMENT_METHODS[p.method]} {p.voided_at && <StatusBadge tone="danger">Bekor qilingan</StatusBadge>}</TableCell>
                  <TableCell className={`text-right tabular font-medium ${p.voided_at ? "line-through" : "text-success"}`}>{formatUZS(p.amount)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button size="icon" variant="ghost" aria-label="Kvitansiya" onClick={() => setReceipt(p)}><Printer className="h-4 w-4" /></Button>
                    {perms.voidPayment && !p.voided_at && <Button size="icon" variant="ghost" aria-label="Bekor qilish" onClick={() => setVoiding(p)}><Ban className="h-4 w-4" /></Button>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>
      <PaymentDialog open={open} onOpenChange={setOpen} />

      <Dialog open={!!receipt} onOpenChange={(v) => !v && setReceipt(null)}>
        <DialogContent className="sm:max-w-md">
          {receipt && (
            <div id="receipt" className="space-y-3 text-sm">
              <div className="text-center"><p className="font-display text-lg font-semibold">{centerName}</p><p className="text-muted-foreground">To'lov kvitansiyasi</p></div>
              <dl className="space-y-1.5 border-y py-3">
                {[["Sana", formatDate(receipt.paid_on)], ["O'quvchi", receipt.students?.full_name], ["Telefon", formatPhone(receipt.students?.phone)], ["Guruh", receipt.groups?.name ?? "—"], ["Davr", formatMonth(receipt.period_month)], ["Usul", PAYMENT_METHODS[receipt.method]], ["Chek raqami", receipt.reference ?? "—"], ["Kvitansiya №", receipt.id.slice(0, 8).toUpperCase()]].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4"><dt className="text-muted-foreground">{k}</dt><dd className="text-right">{v}</dd></div>
                ))}
              </dl>
              <div className="flex justify-between text-base font-semibold"><span>Summa</span><span className="tabular">{formatUZS(receipt.amount)}</span></div>
              {receipt.voided_at && <p className="text-center font-semibold text-destructive">BEKOR QILINGAN: {receipt.void_reason}</p>}
              <p className="text-xs text-muted-foreground">Ushbu kvitansiya markaz tomonidan qo'lda qayd etilgan to'lovni tasdiqlaydi.</p>
              <DialogFooter className="no-print"><Button onClick={() => window.print()}><Printer className="mr-1.5 h-4 w-4" />Chop etish</Button></DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!voiding} onOpenChange={(v) => !v && setVoiding(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>To'lovni bekor qilish</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">{voiding?.students?.full_name} — {formatUZS(voiding?.amount)}. To'lov o'chirilmaydi, balki bekor qilingan deb belgilanadi va qarz qayta hisoblanadi.</p>
          <Field label="Sabab"><Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Xato kiritilgan" /></Field>
          <DialogFooter><Button variant="outline" onClick={() => setVoiding(null)}>Yopish</Button><Button variant="destructive" onClick={doVoid}>Bekor qilish</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
