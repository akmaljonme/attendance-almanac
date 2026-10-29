import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Pencil, Plus, UsersRound, CalendarCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCenter, can } from "@/lib/center";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, ErrorBox, LoadingRows, Panel, StatusBadge } from "@/components/app/ui-bits";
import { EnrollDialog, GroupDialog, type GroupRow } from "@/components/app/dialogs";
import { WEEKDAYS_UZ, formatDate, formatPhone, formatUZS, time5, todayISO } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/app/groups/$id")({
  head: () => ({ meta: [{ title: "Guruh — Markazly" }] }),
  component: GroupPage,
});

function GroupPage() {
  const { id } = Route.useParams();
  const { role } = useCenter();
  const perms = can(role);
  const qc = useQueryClient();
  const [dlg, setDlg] = useState<"edit" | "enroll" | null>(null);
  const q = useQuery({
    queryKey: ["group", id],
    queryFn: async () => {
      const [g, e, s] = await Promise.all([
        supabase.from("groups").select("*, courses(name), teachers(full_name)").eq("id", id).maybeSingle(),
        supabase.from("enrollments").select("*, students(id, full_name, phone, status)").eq("group_id", id).order("start_date"),
        supabase.from("class_sessions").select("id, session_date, attendance_records(status)").eq("group_id", id).order("session_date", { ascending: false }).limit(30),
      ]);
      for (const r of [g, e, s]) if (r.error) throw new Error(r.error.message);
      return { g: g.data, e: e.data!, s: s.data! };
    },
  });

  async function remove(eid: string) {
    const { error } = await supabase.from("enrollments").update({ status: "ended", end_date: todayISO() }).eq("id", eid);
    if (error) return toast.error(error.message);
    toast.success("O'quvchi guruhdan chiqarildi");
    ["group", "groups", "students", "balances", "student"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  }

  if (q.error) return <ErrorBox error={q.error} />;
  if (!q.data) return <LoadingRows rows={8} />;
  const { g, e, s } = q.data;
  if (!g) return <EmptyState icon={UsersRound} title="Guruh topilmadi" />;
  const active = e.filter((x) => x.status === "active");

  return (
    <div className="mx-auto max-w-6xl">
      <Link to="/app/groups" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Guruhlar</Link>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{g.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{g.courses?.name} · {g.teachers?.full_name ?? "O'qituvchi biriktirilmagan"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {perms.attendance && <Button variant="outline" asChild><Link to="/app/attendance" search={{ group: id }}><CalendarCheck className="mr-1.5 h-4 w-4" />Davomat</Link></Button>}
          {perms.manageStudents && <Button onClick={() => setDlg("enroll")}><Plus className="mr-1.5 h-4 w-4" />O'quvchi qo'shish</Button>}
          {perms.manageCatalog && <Button variant="outline" onClick={() => setDlg("edit")}><Pencil className="mr-1.5 h-4 w-4" />Tahrirlash</Button>}
        </div>
      </div>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Info k="O'quvchilar" v={`${active.length} / ${g.capacity}`} danger={active.length > g.capacity} />
        <Info k="Dars kunlari" v={g.days.map((d) => WEEKDAYS_UZ[d - 1].slice(0, 3)).join(", ") || "—"} />
        <Info k="Vaqt / xona" v={`${time5(g.start_time)}–${time5(g.end_time)}${g.room ? " · " + g.room : ""}`} />
        <Info k="Oylik to'lov" v={formatUZS(g.monthly_fee)} />
      </div>
      {active.length > g.capacity && <p className="mb-4 rounded-md bg-warning-soft px-3 py-2 text-sm">⚠ Guruh sig'imidan oshib ketdi.</p>}
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="O'quvchilar ro'yxati" className="lg:col-span-2">
          {active.length === 0 ? <EmptyState icon={UsersRound} title="Guruhda o'quvchi yo'q" /> : (
            <Table>
              <TableHeader><TableRow><TableHead>O'quvchi</TableHead><TableHead>Qo'shilgan</TableHead><TableHead className="text-right">Oylik</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {active.map((x) => (
                  <TableRow key={x.id}>
                    <TableCell><Link to="/app/students/$id" params={{ id: x.student_id }} className="font-medium hover:text-primary">{x.students?.full_name}</Link><p className="text-xs tabular text-muted-foreground">{formatPhone(x.students?.phone)}</p></TableCell>
                    <TableCell className="tabular text-sm">{formatDate(x.start_date)}</TableCell>
                    <TableCell className="text-right tabular text-sm">{formatUZS(x.monthly_fee - x.discount)}</TableCell>
                    <TableCell className="text-right">{perms.manageStudents && <Button size="sm" variant="ghost" onClick={() => remove(x.id)}>Chiqarish</Button>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Panel>
        <Panel title="So'nggi darslar">
          {s.length === 0 ? <EmptyState icon={CalendarCheck} title="Davomat hali belgilanmagan" /> : (
            <ul className="divide-y text-sm">
              {s.map((x) => {
                const n = x.attendance_records.length; const p = x.attendance_records.filter((r) => r.status === "present" || r.status === "late").length;
                return <li key={x.id} className="flex justify-between px-5 py-2.5"><span className="tabular">{formatDate(x.session_date)}</span><StatusBadge tone={n && p / n >= 0.8 ? "success" : "warning"}>{n ? `${Math.round((p / n) * 100)}%` : "—"}</StatusBadge></li>;
              })}
            </ul>
          )}
        </Panel>
      </div>
      <GroupDialog open={dlg === "edit"} onOpenChange={(v) => !v && setDlg(null)} group={g as unknown as GroupRow} />
      <EnrollDialog open={dlg === "enroll"} onOpenChange={(v) => !v && setDlg(null)} groupId={id} />
    </div>
  );
}

function Info({ k, v, danger }: { k: string; v: string; danger?: boolean }) {
  return <div className="rounded-xl border bg-card p-4 shadow-card"><p className="text-xs text-muted-foreground">{k}</p><p className={`mt-1 font-semibold tabular ${danger ? "text-destructive" : ""}`}>{v}</p></div>;
}
