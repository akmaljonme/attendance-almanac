import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { UsersRound, Plus } from "lucide-react";
import { useCenter, can } from "@/lib/center";
import { groupsQ } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorBox, LoadingRows, PageHeader, Panel, StatusBadge, selectCls } from "@/components/app/ui-bits";
import { GroupDialog } from "@/components/app/dialogs";
import { WEEKDAYS_SHORT, formatUZS, time5 } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/app/groups/")({
  head: () => ({ meta: [{ title: "Guruhlar — EduCRM" }] }),
  component: GroupsPage,
});

function GroupsPage() {
  const { centerId, role } = useCenter();
  const perms = can(role);
  const q = useQuery(groupsQ(centerId));
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("active");
  const rows = (q.data ?? []).filter((g) => !status || g.status === status);
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Guruhlar" actions={<>
        <select className={selectCls + " w-40"} value={status} onChange={(e) => setStatus(e.target.value)}><option value="active">Faol</option><option value="archived">Arxivlangan</option><option value="">Barchasi</option></select>
        {perms.manageCatalog && <Button onClick={() => setOpen(true)}><Plus className="mr-1.5 h-4 w-4" />Guruh yaratish</Button>}
      </>} />
      {q.error ? <ErrorBox error={q.error} /> : q.isLoading ? <LoadingRows /> : rows.length === 0 ? (
        <Panel><EmptyState icon={UsersRound} title="Guruhlar yo'q" text="Guruh yaratishdan oldin kamida bitta kurs qo'shing." action={perms.manageCatalog && <Button onClick={() => setOpen(true)}>Guruh yaratish</Button>} /></Panel>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((g) => {
            const n = g.enrollments.filter((e) => e.status === "active").length;
            const pct = Math.min(100, Math.round((n / g.capacity) * 100));
            return (
              <Link key={g.id} to="/app/groups/$id" params={{ id: g.id }} className="rounded-xl border bg-card p-5 shadow-card transition hover:border-primary/40">
                <div className="flex items-start justify-between gap-2">
                  <div><p className="font-semibold">{g.name}</p><p className="text-sm text-muted-foreground">{g.courses?.name}</p></div>
                  {g.status === "archived" && <StatusBadge tone="muted">Arxiv</StatusBadge>}
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{g.teachers?.full_name ?? "O'qituvchi yo'q"}</p>
                <p className="text-xs tabular text-muted-foreground">{g.days.map((d) => WEEKDAYS_SHORT[d - 1]).join(", ") || "Kunlar belgilanmagan"} · {time5(g.start_time)}–{time5(g.end_time)}{g.room ? ` · ${g.room}` : ""}</p>
                <div className="mt-4">
                  <div className="flex justify-between text-xs"><span className={n > g.capacity ? "text-destructive" : "text-muted-foreground"}>{n}/{g.capacity} o'quvchi</span><span className="tabular">{formatUZS(g.monthly_fee)}</span></div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-muted"><div className={`h-full rounded-full ${n > g.capacity ? "bg-destructive" : "bg-primary"}`} style={{ width: `${pct}%` }} /></div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
      <GroupDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
