import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, UserPlus, Users, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { useCenter, can } from "@/lib/center";
import { balancesQ, groupsQ, studentsQ, coursesQ } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, ErrorBox, LoadingRows, PageHeader, Panel, StatusBadge, selectCls } from "@/components/app/ui-bits";
import { StudentDialog } from "@/components/app/dialogs";
import { STUDENT_STATUS, formatDate, formatPhone, formatUZS } from "@/lib/format";
import { downloadCSV } from "@/lib/csv";

export const Route = createFileRoute("/_authenticated/app/students/")({
  head: () => ({ meta: [{ title: "O'quvchilar — EduCRM" }] }),
  component: StudentsPage,
});

const PAGE = 20;

function StudentsPage() {
  const { centerId, role } = useCenter();
  const perms = can(role);
  const students = useQuery(studentsQ(centerId));
  const groups = useQuery(groupsQ(centerId));
  const courses = useQuery(coursesQ(centerId));
  const balances = useQuery({ ...balancesQ(centerId), enabled: perms.recordPayment });
  const [qText, setQ] = useState("");
  const [status, setStatus] = useState("active");
  const [group, setGroup] = useState("");
  const [course, setCourse] = useState("");
  const [debt, setDebt] = useState("");
  const [sort, setSort] = useState("new");
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState(false);

  const balMap = useMemo(() => new Map((balances.data ?? []).map((b) => [b.student_id, b.balance ?? 0])), [balances.data]);

  const rows = useMemo(() => {
    const t = qText.trim().toLowerCase();
    const digits = t.replace(/\D/g, "");
    let r = (students.data ?? []).filter((s) => {
      if (status && s.status !== status) return false;
      if (t && !(s.full_name.toLowerCase().includes(t) || (digits.length >= 3 && s.phone.replace(/\D/g, "").includes(digits)))) return false;
      const act = s.enrollments.filter((e) => e.status === "active");
      if (group && !act.some((e) => e.group_id === group)) return false;
      if (course && !act.some((e) => e.groups?.course_id === course)) return false;
      const b = balMap.get(s.id) ?? 0;
      if (debt === "debt" && b <= 0) return false;
      if (debt === "clear" && b > 0) return false;
      return true;
    });
    r = [...r].sort((a, b) =>
      sort === "name" ? a.full_name.localeCompare(b.full_name) : sort === "debt" ? (balMap.get(b.id) ?? 0) - (balMap.get(a.id) ?? 0) : b.created_at.localeCompare(a.created_at),
    );
    return r;
  }, [students.data, qText, status, group, course, debt, sort, balMap]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const view = rows.slice(page * PAGE, page * PAGE + PAGE);
  const reset = () => setPage(0);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="O'quvchilar"
        description={students.data ? `${students.data.length} ta o'quvchi` : undefined}
        actions={<>
          {perms.finance && <Button variant="outline" onClick={() => downloadCSV("oquvchilar.csv", [["Ism", "Telefon", "Ota-ona", "Ota-ona tel.", "Holati", "Qabul sanasi", "Qoldiq"], ...rows.map((s) => [s.full_name, s.phone, s.parent_name, s.parent_phone, STUDENT_STATUS[s.status], formatDate(s.enrolled_on), balMap.get(s.id) ?? 0])])}><Download className="mr-1.5 h-4 w-4" />CSV</Button>}
          {perms.manageStudents && <Button onClick={() => setOpen(true)}><UserPlus className="mr-1.5 h-4 w-4" />O'quvchi qo'shish</Button>}
        </>}
      />
      <Panel>
        <div className="grid gap-2 border-b p-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Ism yoki telefon bo'yicha qidirish" value={qText} onChange={(e) => { setQ(e.target.value); reset(); }} />
          </div>
          <select className={selectCls} value={status} onChange={(e) => { setStatus(e.target.value); reset(); }}>
            <option value="">Barcha holatlar</option>{Object.entries(STUDENT_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select className={selectCls} value={course} onChange={(e) => { setCourse(e.target.value); reset(); }}>
            <option value="">Barcha kurslar</option>{(courses.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className={selectCls} value={group} onChange={(e) => { setGroup(e.target.value); reset(); }}>
            <option value="">Barcha guruhlar</option>{(groups.data ?? []).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <div className="flex gap-2">
            {perms.recordPayment && (
              <select className={selectCls} value={debt} onChange={(e) => { setDebt(e.target.value); reset(); }}>
                <option value="">Qarz: barchasi</option><option value="debt">Qarzdorlar</option><option value="clear">Qarzsiz</option>
              </select>
            )}
            <select className={selectCls} value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Saralash">
              <option value="new">Yangilari</option><option value="name">Ism (A–Z)</option>{perms.recordPayment && <option value="debt">Qarz bo'yicha</option>}
            </select>
          </div>
        </div>
        {students.error ? <ErrorBox error={students.error} /> : students.isLoading ? <LoadingRows /> : rows.length === 0 ? (
          <EmptyState icon={Users} title={students.data?.length ? "Hech narsa topilmadi" : "Hali o'quvchilar yo'q"} text={students.data?.length ? "Filtrlarni o'zgartirib ko'ring." : "Birinchi o'quvchini qo'shing."}
            action={!students.data?.length && perms.manageStudents ? <Button onClick={() => setOpen(true)}>O'quvchi qo'shish</Button> : undefined} />
        ) : (
          <>
            <Table>
              <TableHeader><TableRow>
                <TableHead>O'quvchi</TableHead><TableHead className="hidden md:table-cell">Guruhlar</TableHead><TableHead className="hidden sm:table-cell">Holati</TableHead>
                {perms.recordPayment && <TableHead className="text-right">Qoldiq</TableHead>}
              </TableRow></TableHeader>
              <TableBody>
                {view.map((s) => {
                  const b = balMap.get(s.id) ?? 0;
                  return (
                    <TableRow key={s.id}>
                      <TableCell>
                        <Link to="/app/students/$id" params={{ id: s.id }} className="font-medium hover:text-primary">{s.full_name}</Link>
                        <p className="text-xs text-muted-foreground tabular">{formatPhone(s.phone)}</p>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {s.enrollments.filter((e) => e.status === "active").map((e) => e.groups?.name).join(", ") || "—"}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <StatusBadge tone={s.status === "active" ? "success" : "muted"}>{STUDENT_STATUS[s.status]}</StatusBadge>
                      </TableCell>
                      {perms.recordPayment && (
                        <TableCell className={`text-right tabular text-sm font-medium ${b > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                          {b > 0 ? formatUZS(b) : b < 0 ? `+${formatUZS(-b)}` : "0"}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {pages > 1 && (
              <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
                <span>{page * PAGE + 1}–{Math.min(rows.length, page * PAGE + PAGE)} / {rows.length}</span>
                <div className="flex gap-1">
                  <Button size="icon" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)} aria-label="Oldingi"><ChevronLeft className="h-4 w-4" /></Button>
                  <Button size="icon" variant="outline" disabled={page >= pages - 1} onClick={() => setPage(page + 1)} aria-label="Keyingi"><ChevronRight className="h-4 w-4" /></Button>
                </div>
              </div>
            )}
          </>
        )}
      </Panel>
      <StudentDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
