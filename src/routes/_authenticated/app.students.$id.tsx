import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Pencil, Wallet, UsersRound, Archive, Plus, Printer } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCenter, can } from "@/lib/center";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  EmptyState,
  ErrorBox,
  Field,
  LoadingRows,
  Panel,
  StatusBadge,
} from "@/components/app/ui-bits";
import { EnrollDialog, PaymentDialog, StudentDialog } from "@/components/app/dialogs";
import {
  ATTENDANCE_LABELS,
  PAYMENT_METHODS,
  STUDENT_STATUS,
  formatDate,
  formatMonth,
  formatPhone,
  formatUZS,
  parseUZS,
} from "@/lib/format";

export const Route = createFileRoute("/_authenticated/app/students/$id")({
  head: () => ({ meta: [{ title: "O'quvchi — Markazly" }] }),
  component: StudentPage,
});

function StudentPage() {
  const { id } = Route.useParams();
  const { role } = useCenter();
  const perms = can(role);
  const qc = useQueryClient();
  const [dlg, setDlg] = useState<"edit" | "pay" | "enroll" | "archive" | "adjust" | null>(null);

  const q = useQuery({
    queryKey: ["student", id],
    queryFn: async () => {
      const [s, enr, att, pay, bal, obl, adj] = await Promise.all([
        supabase.from("students").select("*").eq("id", id).maybeSingle(),
        supabase
          .from("enrollments")
          .select("*, groups(name, courses(name))")
          .eq("student_id", id)
          .order("start_date", { ascending: false }),
        supabase
          .from("attendance_records")
          .select("id, status, class_sessions(session_date, groups(name))")
          .eq("student_id", id)
          .order("created_at", { ascending: false })
          .limit(200),
        perms.recordPayment
          ? supabase
              .from("payments")
              .select("*")
              .eq("student_id", id)
              .order("paid_on", { ascending: false })
          : Promise.resolve({ data: [], error: null }),
        perms.recordPayment
          ? supabase.from("v_student_balances").select("*").eq("student_id", id).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        perms.recordPayment
          ? supabase
              .from("v_tuition_obligations")
              .select("*, groups(name)")
              .eq("student_id", id)
              .order("period_month", { ascending: false })
          : Promise.resolve({ data: [], error: null }),
        perms.recordPayment
          ? supabase
              .from("financial_adjustments")
              .select("*")
              .eq("student_id", id)
              .order("created_at", { ascending: false })
          : Promise.resolve({ data: [], error: null }),
      ]);
      for (const r of [s, enr, att, pay, bal, obl, adj])
        if (r.error) throw new Error(r.error.message);
      return {
        s: s.data,
        enr: enr.data!,
        att: att.data!,
        pay: pay.data as Pay[],
        bal: bal.data as Bal | null,
        obl: obl.data as Obl[],
        adj: adj.data as Adj[],
      };
    },
  });

  async function endEnrollment(eid: string) {
    const { error } = await supabase
      .from("enrollments")
      .update({ status: "ended", end_date: new Date().toISOString().slice(0, 10) })
      .eq("id", eid);
    if (error) return toast.error(error.message);
    toast.success("Guruhdan chiqarildi");
    ["student", "students", "groups", "balances"].forEach((k) =>
      qc.invalidateQueries({ queryKey: [k] }),
    );
  }

  async function archive() {
    const { error } = await supabase.from("students").update({ status: "archived" }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("O'quvchi arxivlandi. Tarixiy ma'lumotlar saqlanadi.");
    setDlg(null);
    ["student", "students", "dashboard"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  }

  if (q.error) return <ErrorBox error={q.error} />;
  if (!q.data) return <LoadingRows rows={8} />;
  const { s, enr, att, pay, bal, obl, adj } = q.data;
  if (!s)
    return (
      <EmptyState
        icon={UsersRound}
        title="O'quvchi topilmadi"
        action={
          <Button asChild variant="outline">
            <Link to="/app/students">Ro'yxatga qaytish</Link>
          </Button>
        }
      />
    );

  const counted = att.length;
  const presentish = att.filter((a) => a.status === "present" || a.status === "late").length;
  const balance = bal?.balance ?? 0;

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        to="/app/students"
        className="no-print mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        O'quvchilar
      </Link>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{s.full_name}</h1>
            <StatusBadge tone={s.status === "active" ? "success" : "muted"}>
              {STUDENT_STATUS[s.status]}
            </StatusBadge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground tabular">
            {formatPhone(s.phone)} · Qabul: {formatDate(s.enrolled_on)}
          </p>
        </div>
        <div className="no-print flex flex-wrap gap-2">
          {perms.recordPayment && (
            <Button onClick={() => setDlg("pay")}>
              <Wallet className="mr-1.5 h-4 w-4" />
              To'lov
            </Button>
          )}
          {perms.manageStudents && (
            <Button variant="outline" onClick={() => setDlg("enroll")}>
              <Plus className="mr-1.5 h-4 w-4" />
              Guruhga qo'shish
            </Button>
          )}
          {perms.manageStudents && (
            <Button variant="outline" onClick={() => setDlg("edit")}>
              <Pencil className="mr-1.5 h-4 w-4" />
              Tahrirlash
            </Button>
          )}
          {perms.recordPayment && (
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="mr-1.5 h-4 w-4" />
              Hisob varaqasi
            </Button>
          )}
          {perms.manageStudents && s.status !== "archived" && (
            <Button variant="outline" onClick={() => setDlg("archive")}>
              <Archive className="mr-1.5 h-4 w-4" />
              Arxivlash
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Ma'lumotlar">
          <dl className="space-y-3 p-5 text-sm">
            <Row k="Telefon" v={formatPhone(s.phone)} />
            <Row k="Ota-ona" v={s.parent_name || "—"} />
            <Row k="Ota-ona telefoni" v={formatPhone(s.parent_phone)} />
            <Row
              k="Davomat"
              v={
                counted
                  ? `${Math.round((presentish / counted) * 100)}% (${presentish}/${counted})`
                  : "—"
              }
            />
            {s.notes && (
              <div>
                <dt className="text-muted-foreground">Izoh</dt>
                <dd className="mt-1 whitespace-pre-wrap">{s.notes}</dd>
              </div>
            )}
          </dl>
        </Panel>
        {perms.recordPayment && (
          <Panel title="Moliyaviy holat" className="lg:col-span-2">
            <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
              <Money label="Hisoblangan" v={bal?.total_due ?? 0} />
              <Money label="To'langan" v={bal?.total_paid ?? 0} tone="success" />
              <Money label="Tuzatishlar" v={bal?.total_adjust ?? 0} />
              <Money
                label={balance > 0 ? "Qarz" : balance < 0 ? "Oldindan to'lov" : "Qoldiq"}
                v={Math.abs(balance)}
                tone={balance > 0 ? "danger" : "success"}
              />
            </div>
            <p className="border-t px-5 py-3 text-xs text-muted-foreground">
              Qoldiq = har oylik hisoblangan to'lovlar − to'lovlar − tasdiqlangan tuzatishlar
              (chegirma va h.k.).
              {perms.voidPayment && (
                <button className="no-print ml-2 text-primary" onClick={() => setDlg("adjust")}>
                  Tuzatish kiritish
                </button>
              )}
            </p>
          </Panel>
        )}
      </div>

      <Tabs defaultValue="groups" className="mt-6">
        <TabsList className="no-print">
          <TabsTrigger value="groups">Guruhlar</TabsTrigger>
          <TabsTrigger value="attendance">Davomat</TabsTrigger>
          {perms.recordPayment && <TabsTrigger value="payments">To'lovlar</TabsTrigger>}
          {perms.recordPayment && <TabsTrigger value="charges">Hisoblashlar</TabsTrigger>}
        </TabsList>
        <TabsContent value="groups">
          <Panel>
            {enr.length === 0 ? (
              <EmptyState icon={UsersRound} title="Guruhlarga yozilmagan" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Guruh</TableHead>
                    <TableHead>Davr</TableHead>
                    <TableHead className="text-right">Oylik</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enr.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>
                        <Link
                          to="/app/groups/$id"
                          params={{ id: e.group_id }}
                          className="font-medium hover:text-primary"
                        >
                          {e.groups?.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">{e.groups?.courses?.name}</p>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(e.start_date)} —{" "}
                        {e.end_date ? formatDate(e.end_date) : "hozirgacha"}{" "}
                        {e.status === "ended" && <StatusBadge tone="muted">Tugagan</StatusBadge>}
                      </TableCell>
                      <TableCell className="text-right tabular text-sm">
                        {formatUZS(e.monthly_fee - e.discount)}
                        {e.discount > 0 && (
                          <p className="text-xs text-muted-foreground">
                            chegirma {formatUZS(e.discount)}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {e.status === "active" && perms.manageStudents && (
                          <Button size="sm" variant="ghost" onClick={() => endEnrollment(e.id)}>
                            Chiqarish
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Panel>
        </TabsContent>
        <TabsContent value="attendance">
          <Panel>
            {att.length === 0 ? (
              <EmptyState icon={UsersRound} title="Davomat yozuvlari yo'q" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sana</TableHead>
                    <TableHead>Guruh</TableHead>
                    <TableHead>Holat</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {att.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="tabular text-sm">
                        {formatDate(a.class_sessions?.session_date)}
                      </TableCell>
                      <TableCell className="text-sm">{a.class_sessions?.groups?.name}</TableCell>
                      <TableCell>
                        <StatusBadge
                          tone={
                            a.status === "present"
                              ? "success"
                              : a.status === "absent"
                                ? "danger"
                                : a.status === "late"
                                  ? "warning"
                                  : "muted"
                          }
                        >
                          {ATTENDANCE_LABELS[a.status]}
                        </StatusBadge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Panel>
        </TabsContent>
        <TabsContent value="payments">
          <Panel>
            {pay.length === 0 ? (
              <EmptyState icon={Wallet} title="To'lovlar yo'q" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sana</TableHead>
                    <TableHead>Davr</TableHead>
                    <TableHead>Usul</TableHead>
                    <TableHead className="text-right">Summa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pay.map((p) => (
                    <TableRow key={p.id} className={p.voided_at ? "opacity-50" : ""}>
                      <TableCell className="tabular text-sm">{formatDate(p.paid_on)}</TableCell>
                      <TableCell className="text-sm">{formatMonth(p.period_month)}</TableCell>
                      <TableCell className="text-sm">
                        {PAYMENT_METHODS[p.method]}
                        {p.voided_at && (
                          <span className="ml-2">
                            <StatusBadge tone="danger">Bekor qilingan</StatusBadge>
                          </span>
                        )}
                      </TableCell>
                      <TableCell
                        className={`text-right tabular font-medium ${p.voided_at ? "line-through" : "text-success"}`}
                      >
                        {formatUZS(p.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Panel>
        </TabsContent>
        <TabsContent value="charges">
          <Panel>
            {obl.length === 0 && adj.length === 0 ? (
              <EmptyState icon={Wallet} title="Hisoblashlar yo'q" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Davr / sana</TableHead>
                    <TableHead>Tavsif</TableHead>
                    <TableHead className="text-right">Summa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adj.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="tabular text-sm">
                        {formatDate(a.created_at.slice(0, 10))}
                      </TableCell>
                      <TableCell className="text-sm">Tuzatish: {a.reason}</TableCell>
                      <TableCell className="text-right tabular text-sm text-success">
                        −{formatUZS(a.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {obl.map((o) => (
                    <TableRow key={o.enrollment_id + o.period_month}>
                      <TableCell className="text-sm">{formatMonth(o.period_month)}</TableCell>
                      <TableCell className="text-sm">{o.groups?.name} — oylik to'lov</TableCell>
                      <TableCell className="text-right tabular text-sm">
                        {formatUZS(o.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Panel>
        </TabsContent>
      </Tabs>

      <StudentDialog open={dlg === "edit"} onOpenChange={(v) => !v && setDlg(null)} student={s} />
      <PaymentDialog open={dlg === "pay"} onOpenChange={(v) => !v && setDlg(null)} studentId={id} />
      <EnrollDialog
        open={dlg === "enroll"}
        onOpenChange={(v) => !v && setDlg(null)}
        studentId={id}
      />
      <AdjustDialog
        open={dlg === "adjust"}
        onOpenChange={(v) => !v && setDlg(null)}
        studentId={id}
        centerId={s.center_id}
      />
      <AlertDialog open={dlg === "archive"} onOpenChange={(v) => !v && setDlg(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>O'quvchini arxivlash</AlertDialogTitle>
            <AlertDialogDescription>
              O'quvchi faol ro'yxatdan chiqadi. To'lov va davomat tarixi o'chirilmaydi. Faol
              guruhlardan chiqarish uchun "Guruhlar" bo'limidan foydalaning.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
            <AlertDialogAction onClick={archive}>Arxivlash</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

type Pay = {
  id: string;
  paid_on: string;
  period_month: string | null;
  method: string;
  amount: number;
  voided_at: string | null;
};
type Bal = {
  total_due: number | null;
  total_paid: number | null;
  total_adjust: number | null;
  balance: number | null;
};
type Obl = {
  enrollment_id: string;
  period_month: string;
  amount: number;
  groups: { name: string } | null;
};
type Adj = { id: string; amount: number; reason: string; created_at: string };

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="text-right tabular">{v}</dd>
    </div>
  );
}
function Money({ label, v, tone }: { label: string; v: number; tone?: "success" | "danger" }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={`mt-1 font-semibold tabular ${tone === "danger" ? "text-destructive" : tone === "success" ? "text-success" : ""}`}
      >
        {formatUZS(v)}
      </p>
    </div>
  );
}

function AdjustDialog({
  open,
  onOpenChange,
  studentId,
  centerId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  studentId: string;
  centerId: string;
}) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  async function save() {
    const a = parseUZS(amount);
    if (isNaN(a) || a <= 0) return toast.error("Summani kiriting");
    if (reason.trim().length < 3) return toast.error("Sababini yozing");
    setBusy(true);
    const { error } = await supabase
      .from("financial_adjustments")
      .insert({ center_id: centerId, student_id: studentId, amount: a, reason: reason.trim() });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Tuzatish saqlandi");
    setAmount("");
    setReason("");
    ["student", "balances", "dashboard"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    onOpenChange(false);
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Moliyaviy tuzatish</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Qarzni kamaytiradi (masalan, bir martalik chegirma yoki kasallik sababli dars qoldirish).
          Tuzatishlar o'chirilmaydi va audit jurnaliga yoziladi.
        </p>
        <Field label="Summa (so'm)">
          <Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" />
        </Field>
        <Field label="Sabab">
          <Input value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Bekor qilish
          </Button>
          <Button onClick={save} disabled={busy}>
            Saqlash
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
