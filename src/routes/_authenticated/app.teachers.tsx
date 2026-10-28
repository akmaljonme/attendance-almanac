import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { UserSquare2, Plus, Pencil } from "lucide-react";
import { useCenter, can } from "@/lib/center";
import { groupsQ, teachersQ } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorBox, LoadingRows, PageHeader, Panel, StatusBadge } from "@/components/app/ui-bits";
import { TeacherDialog, type TeacherRow } from "@/components/app/dialogs";
import { WEEKDAYS_SHORT, formatPhone, time5 } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/app/teachers")({
  head: () => ({ meta: [{ title: "O'qituvchilar — EduCRM" }] }),
  component: TeachersPage,
});

function TeachersPage() {
  const { centerId, role } = useCenter();
  const perms = can(role);
  const q = useQuery(teachersQ(centerId));
  const groups = useQuery(groupsQ(centerId));
  const [edit, setEdit] = useState<TeacherRow | null>(null);
  const [open, setOpen] = useState(false);
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="O'qituvchilar" actions={perms.manageCatalog && <Button onClick={() => { setEdit(null); setOpen(true); }}><Plus className="mr-1.5 h-4 w-4" />O'qituvchi qo'shish</Button>} />
      {q.error ? <ErrorBox error={q.error} /> : q.isLoading ? <LoadingRows /> : !q.data?.length ? (
        <Panel><EmptyState icon={UserSquare2} title="Hali o'qituvchilar yo'q" action={perms.manageCatalog && <Button onClick={() => setOpen(true)}>O'qituvchi qo'shish</Button>} /></Panel>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {q.data.map((t) => {
            const tg = (groups.data ?? []).filter((g) => g.teacher_id === t.id && g.status === "active");
            const studentsCount = tg.reduce((a, g) => a + g.enrollments.filter((e) => e.status === "active").length, 0);
            return (
              <Panel key={t.id} className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{t.full_name}</p>
                    <p className="text-sm text-muted-foreground">{t.specialization || "—"}</p>
                    <p className="mt-1 text-xs tabular text-muted-foreground">{formatPhone(t.phone)}{t.email ? ` · ${t.email}` : ""}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <StatusBadge tone={t.status === "active" ? "success" : "muted"}>{t.status === "active" ? "Ishlamoqda" : "Ishlamaydi"}</StatusBadge>
                    {perms.manageCatalog && <Button size="icon" variant="ghost" aria-label="Tahrirlash" onClick={() => { setEdit(t); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>}
                  </div>
                </div>
                <div className="mt-4 border-t pt-3 text-sm">
                  <p className="mb-2 text-xs text-muted-foreground">{tg.length} guruh · {studentsCount} o'quvchi</p>
                  {tg.length === 0 ? <p className="text-xs text-muted-foreground">Guruh biriktirilmagan</p> : (
                    <ul className="space-y-1">
                      {tg.map((g) => (
                        <li key={g.id} className="flex justify-between gap-2">
                          <Link to="/app/groups/$id" params={{ id: g.id }} className="hover:text-primary">{g.name}</Link>
                          <span className="text-xs tabular text-muted-foreground">{g.days.map((d) => WEEKDAYS_SHORT[d - 1]).join(", ")} {time5(g.start_time)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </Panel>
            );
          })}
        </div>
      )}
      <TeacherDialog open={open} onOpenChange={setOpen} teacher={edit} />
    </div>
  );
}
