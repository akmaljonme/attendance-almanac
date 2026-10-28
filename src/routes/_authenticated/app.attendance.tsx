import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { CalendarCheck, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useCenter } from "@/lib/center";
import { groupsQ } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, ErrorBox, Field, LoadingRows, PageHeader, Panel, selectCls } from "@/components/app/ui-bits";
import { ATTENDANCE_LABELS, formatDate, isoWeekday, todayISO } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/app/attendance")({
  validateSearch: z.object({ group: z.string().optional(), date: z.string().optional() }),
  head: () => ({ meta: [{ title: "Davomat — EduCRM" }] }),
  component: AttendancePage,
});

type Status = "present" | "absent" | "late" | "excused";
const ORDER: Status[] = ["present", "late", "absent", "excused"];
const TONE: Record<Status, string> = {
  present: "border-success bg-success text-success-foreground",
  late: "border-warning bg-warning text-foreground",
  absent: "border-destructive bg-destructive text-destructive-foreground",
  excused: "border-muted-foreground bg-muted-foreground text-primary-foreground",
};

function AttendancePage() {
  const { centerId } = useCenter();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const qc = useQueryClient();
  const groups = useQuery(groupsQ(centerId));
  const groupId = search.group ?? "";
  const date = search.date ?? todayISO();
  const [marks, setMarks] = useState<Record<string, Status>>({});
  const [saving, setSaving] = useState(false);

  const q = useQuery({
    queryKey: ["attendance", groupId, date],
    enabled: !!groupId,
    queryFn: async () => {
      const [enr, sess] = await Promise.all([
        supabase.from("enrollments").select("student_id, start_date, end_date, status, students(full_name, status)").eq("group_id", groupId),
        supabase.from("class_sessions").select("id, attendance_records(student_id, status, updated_at)").eq("group_id", groupId).eq("session_date", date).maybeSingle(),
      ]);
      if (enr.error) throw new Error(enr.error.message);
      if (sess.error) throw new Error(sess.error.message);
      const roster = enr.data.filter((e) => e.start_date <= date && (!e.end_date || e.end_date >= date) && e.students?.status !== "archived")
        .sort((a, b) => (a.students?.full_name ?? "").localeCompare(b.students?.full_name ?? ""));
      return { roster, session: sess.data };
    },
  });

  useEffect(() => {
    if (!q.data) return;
    const m: Record<string, Status> = {};
    q.data.session?.attendance_records.forEach((r) => (m[r.student_id] = r.status as Status));
    setMarks(m);
  }, [q.data]);

  const group = groups.data?.find((g) => g.id === groupId);
  const existing = !!q.data?.session?.attendance_records.length;
  const notScheduled = group && group.days.length > 0 && !group.days.includes(isoWeekday(date));

  async function save() {
    if (!q.data) return;
    const missing = q.data.roster.filter((r) => !marks[r.student_id]);
    if (missing.length) return toast.error(`${missing.length} ta o'quvchi belgilanmagan`);
    if (date > todayISO()) return toast.error("Kelajakdagi sana uchun davomat belgilab bo'lmaydi");
    setSaving(true);
    let sessionId = q.data.session?.id;
    if (!sessionId) {
      const { data, error } = await supabase.from("class_sessions")
        .upsert({ center_id: centerId, group_id: groupId, session_date: date, start_time: group?.start_time, end_time: group?.end_time, room: group?.room }, { onConflict: "group_id,session_date" })
        .select("id").single();
      if (error) { setSaving(false); return toast.error(error.message); }
      sessionId = data.id;
    }
    const rows = q.data.roster.map((r) => ({ center_id: centerId, session_id: sessionId!, student_id: r.student_id, status: marks[r.student_id] }));
    const { error } = await supabase.from("attendance_records").upsert(rows, { onConflict: "session_id,student_id" });
    setSaving(false);
    if (error) return toast.error("Saqlanmadi: " + error.message);
    toast.success(existing ? "Davomat tuzatildi (o'zgarishlar jurnalga yozildi)" : "Davomat saqlandi");
    ["attendance", "dashboard", "group", "student"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  }

  const roster = q.data?.roster ?? [];
  const count = (s: Status) => roster.filter((r) => marks[r.student_id] === s).length;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Davomat" description="Guruh va sanani tanlang, har bir o'quvchini belgilang." />
      <Panel className="mb-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Guruh">
            <select className={selectCls} value={groupId} onChange={(e) => navigate({ search: { group: e.target.value || undefined, date } })}>
              <option value="">— Tanlang —</option>
              {(groups.data ?? []).filter((g) => g.status === "active").map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </Field>
          <Field label="Dars sanasi"><Input type="date" value={date} max={todayISO()} onChange={(e) => navigate({ search: { group: groupId || undefined, date: e.target.value } })} /></Field>
        </div>
        {notScheduled && <p className="mt-3 rounded-md bg-warning-soft px-3 py-2 text-sm">Bu guruhning jadvalida {formatDate(date)} dars kuni emas.</p>}
        {existing && <p className="mt-3 rounded-md bg-primary-soft px-3 py-2 text-sm text-primary">Bu dars uchun davomat avval saqlangan. O'zgartirsangiz, tuzatish sifatida jurnalga yoziladi.</p>}
      </Panel>

      <Panel>
        {!groupId ? <EmptyState icon={CalendarCheck} title="Guruhni tanlang" /> : q.error ? <ErrorBox error={q.error} /> : q.isLoading ? <LoadingRows /> : roster.length === 0 ? (
          <EmptyState icon={CalendarCheck} title="Bu sanada guruhda o'quvchi yo'q" />
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                {ORDER.map((s) => <span key={s}>{ATTENDANCE_LABELS[s]}: <b className="text-foreground">{count(s)}</b></span>)}
              </div>
              <Button size="sm" variant="outline" onClick={() => setMarks(Object.fromEntries(roster.map((r) => [r.student_id, "present" as Status])))}><Check className="mr-1 h-4 w-4" />Hammasi keldi</Button>
            </div>
            <ul className="divide-y">
              {roster.map((r, i) => (
                <li key={r.student_id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm font-medium"><span className="mr-2 tabular text-muted-foreground">{i + 1}.</span>{r.students?.full_name}</span>
                  <div className="flex gap-1.5" role="radiogroup" aria-label={r.students?.full_name ?? ""}>
                    {ORDER.map((s) => (
                      <button key={s} type="button" role="radio" aria-checked={marks[r.student_id] === s}
                        onClick={() => setMarks({ ...marks, [r.student_id]: s })}
                        className={`h-8 rounded-md border px-2.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${marks[r.student_id] === s ? TONE[s] : "bg-card hover:bg-muted"}`}>
                        {ATTENDANCE_LABELS[s]}
                      </button>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex justify-end border-t p-4">
              <Button onClick={save} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{existing ? "Tuzatishni saqlash" : "Davomatni saqlash"}</Button>
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}
