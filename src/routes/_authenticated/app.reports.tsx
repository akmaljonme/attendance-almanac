import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Download, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCenter } from "@/lib/center";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ErrorBox, LoadingRows, PageHeader, Panel, StatCard, selectCls } from "@/components/app/ui-bits";
import { EXPENSE_CATEGORIES, PAYMENT_METHODS, formatUZS, monthStartISO, todayISO, addMonths } from "@/lib/format";
import { downloadCSV } from "@/lib/csv";
import { TrendingUp, TrendingDown, AlertCircle, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/reports")({
  head: () => ({ meta: [{ title: "Hisobotlar — EduCRM" }] }),
  component: ReportsPage,
});

function ReportsPage() {
  const { centerId } = useCenter();
  const [from, setFrom] = useState(addMonths(monthStartISO(), -2));
  const [to, setTo] = useState(todayISO());
  const [teacher, setTeacher] = useState("");

  const q = useQuery({
    queryKey: ["reports", centerId, from, to],
    queryFn: async () => {
      const [pays, exps, groups, students, sessions, bals, teachers] = await Promise.all([
        supabase.from("payments").select("amount, method, group_id, paid_on").eq("center_id", centerId).is("voided_at", null).gte("paid_on", from).lte("paid_on", to),
        supabase.from("expenses").select("amount, category").eq("center_id", centerId).gte("spent_on", from).lte("spent_on", to),
        supabase.from("groups").select("id, name, capacity, status, teacher_id, enrollments(status)").eq("center_id", centerId),
        supabase.from("students").select("status, enrolled_on").eq("center_id", centerId),
        supabase.from("class_sessions").select("group_id, attendance_records(status)").eq("center_id", centerId).gte("session_date", from).lte("session_date", to),
        supabase.from("v_student_balances").select("balance").eq("center_id", centerId).gt("balance", 0),
        supabase.from("teachers").select("id, full_name").eq("center_id", centerId),
      ]);
      for (const r of [pays, exps, groups, students, sessions, bals, teachers]) if (r.error) throw new Error(r.error.message);
      return { pays: pays.data!, exps: exps.data!, groups: groups.data!, students: students.data!, sessions: sessions.data!, bals: bals.data!, teachers: teachers.data! };
    },
  });

  if (q.error) return <ErrorBox error={q.error} />;
  const d = q.data;
  const collected = d?.pays.reduce((a, p) => a + p.amount, 0) ?? 0;
  const spent = d?.exps.reduce((a, e) => a + e.amount, 0) ?? 0;
  const debt = d?.bals.reduce((a, b) => a + (b.balance ?? 0), 0) ?? 0;
  const groups = (d?.groups ?? []).filter((g) => !teacher || g.teacher_id === teacher);
  const groupRows = groups.map((g) => {
    const recs = (d?.sessions ?? []).filter((s) => s.group_id === g.id).flatMap((s) => s.attendance_records);
    const pres = recs.filter((r) => r.status === "present" || r.status === "late").length;
    const n = g.enrollments.filter((e) => e.status === "active").length;
    return { name: g.name, n, cap: g.capacity, att: recs.length ? Math.round((pres / recs.length) * 100) : null, paid: (d?.pays ?? []).filter((p) => p.group_id === g.id).reduce((a, p) => a + p.amount, 0) };
  });
  const newStudents = (d?.students ?? []).filter((s) => s.enrolled_on >= from && s.enrolled_on <= to).length;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Hisobotlar" actions={<>
        <Button variant="outline" onClick={() => downloadCSV(`guruhlar_${from}_${to}.csv`, [["Guruh", "O'quvchilar", "Sig'im", "Davomat %", "To'lovlar"], ...groupRows.map((r) => [r.name, r.n, r.cap, r.att ?? "", r.paid])])}><Download className="mr-1.5 h-4 w-4" />CSV</Button>
        <Button variant="outline" onClick={() => window.print()}><Printer className="mr-1.5 h-4 w-4" />Chop etish</Button>
      </>} />
      <Panel className="no-print mb-4 grid gap-2 p-3 sm:grid-cols-3">
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Dan" />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Gacha" />
        <select className={selectCls} value={teacher} onChange={(e) => setTeacher(e.target.value)}><option value="">Barcha o'qituvchilar</option>{(d?.teachers ?? []).map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}</select>
      </Panel>
      {!d ? <LoadingRows rows={8} /> : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Yig'ilgan to'lovlar" value={formatUZS(collected)} icon={TrendingUp} tone="success" />
            <StatCard label="Xarajatlar" value={formatUZS(spent)} icon={TrendingDown} tone="danger" />
            <StatCard label="To'lovlar − xarajatlar" value={formatUZS(collected - spent)} hint="Kassa oqimi, foyda emas" icon={TrendingUp} tone="primary" />
            <StatCard label="Joriy qarzdorlik" value={formatUZS(debt)} icon={AlertCircle} tone="danger" />
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <Panel title="O'quvchilar">
              <dl className="space-y-2 p-5 text-sm">
                {[["Faol", d.students.filter((s) => s.status === "active").length], ["To'xtatilgan", d.students.filter((s) => s.status === "paused").length], ["Arxivlangan", d.students.filter((s) => s.status === "archived").length], ["Davrda qabul qilingan", newStudents]].map(([k, v]) => (
                  <div key={k} className="flex justify-between"><dt className="text-muted-foreground">{k}</dt><dd className="tabular font-medium"><Users className="mr-1 inline h-3 w-3" />{v}</dd></div>
                ))}
              </dl>
            </Panel>
            <Panel title="To'lov usullari">
              <dl className="space-y-2 p-5 text-sm">
                {Object.entries(PAYMENT_METHODS).map(([k, v]) => <div key={k} className="flex justify-between"><dt className="text-muted-foreground">{v}</dt><dd className="tabular">{formatUZS(d.pays.filter((p) => p.method === k).reduce((a, p) => a + p.amount, 0))}</dd></div>)}
              </dl>
            </Panel>
            <Panel title="Xarajat toifalari">
              <dl className="space-y-2 p-5 text-sm">
                {EXPENSE_CATEGORIES.map((c) => <div key={c} className="flex justify-between"><dt className="text-muted-foreground">{c}</dt><dd className="tabular">{formatUZS(d.exps.filter((e) => e.category === c).reduce((a, e) => a + e.amount, 0))}</dd></div>)}
              </dl>
            </Panel>
          </div>
          <Panel title="Guruhlar: bandlik, davomat va to'lovlar">
            <Table>
              <TableHeader><TableRow><TableHead>Guruh</TableHead><TableHead>Bandlik</TableHead><TableHead>Davomat</TableHead><TableHead className="text-right">To'lovlar</TableHead></TableRow></TableHeader>
              <TableBody>
                {groupRows.map((r) => (
                  <TableRow key={r.name}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="tabular text-sm">{r.n}/{r.cap} ({Math.round((r.n / r.cap) * 100)}%)</TableCell>
                    <TableCell className="tabular text-sm">{r.att == null ? "—" : `${r.att}%`}</TableCell>
                    <TableCell className="text-right tabular text-sm">{formatUZS(r.paid)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Panel>
        </div>
      )}
    </div>
  );
}
