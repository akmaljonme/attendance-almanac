import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { useCenter } from "@/lib/center";
import { groupsQ } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorBox, LoadingRows, PageHeader, Panel } from "@/components/app/ui-bits";
import { WEEKDAYS_UZ, addDays, formatDate, isoWeekday, time5, todayISO } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/app/schedule")({
  head: () => ({ meta: [{ title: "Dars jadvali — Markazly" }] }),
  component: SchedulePage,
});

function SchedulePage() {
  const { centerId } = useCenter();
  const q = useQuery(groupsQ(centerId));
  const today = todayISO();
  const [weekStart, setWeekStart] = useState(addDays(today, 1 - isoWeekday(today)));
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const active = (q.data ?? []).filter((g) => g.status === "active" && g.start_time);

  function conflictsFor(g: (typeof active)[number], wd: number) {
    return active.some(
      (o) =>
        o.id !== g.id &&
        o.days.includes(wd) &&
        o.start_time! < g.end_time! &&
        g.start_time! < o.end_time! &&
        ((g.teacher_id && o.teacher_id === g.teacher_id) ||
          (g.room && o.room?.toLowerCase() === g.room.toLowerCase())),
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Dars jadvali"
        description={`${formatDate(days[0])} — ${formatDate(days[6])} (Toshkent vaqti)`}
        actions={
          <>
            <Button
              variant="outline"
              size="icon"
              aria-label="Oldingi hafta"
              onClick={() => setWeekStart(addDays(weekStart, -7))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => setWeekStart(addDays(today, 1 - isoWeekday(today)))}
            >
              Bu hafta
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Keyingi hafta"
              onClick={() => setWeekStart(addDays(weekStart, 7))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        }
      />
      {q.error ? (
        <ErrorBox error={q.error} />
      ) : q.isLoading ? (
        <LoadingRows />
      ) : active.length === 0 ? (
        <Panel>
          <EmptyState
            icon={CalendarDays}
            title="Jadval bo'sh"
            text="Guruhlarga dars kunlari va vaqtini belgilang."
            action={
              <Button asChild>
                <Link to="/app/groups">Guruhlar</Link>
              </Button>
            }
          />
        </Panel>
      ) : (
        <div className="grid gap-3 md:grid-cols-7">
          {days.map((d, i) => {
            const wd = i + 1;
            const list = active
              .filter(
                (g) => g.days.includes(wd) && g.start_date <= d && (!g.end_date || g.end_date >= d),
              )
              .sort((a, b) => a.start_time!.localeCompare(b.start_time!));
            return (
              <Panel key={d} className={d === today ? "border-primary" : ""}>
                <div className="border-b px-3 py-2">
                  <p className="text-xs font-semibold">{WEEKDAYS_UZ[i]}</p>
                  <p className="text-xs tabular text-muted-foreground">{formatDate(d)}</p>
                </div>
                <div className="space-y-2 p-2">
                  {list.length === 0 && (
                    <p className="px-1 py-3 text-center text-xs text-muted-foreground">—</p>
                  )}
                  {list.map((g) => {
                    const c = conflictsFor(g, wd);
                    return (
                      <Link
                        key={g.id}
                        to="/app/attendance"
                        search={{ group: g.id, date: d }}
                        className={`block rounded-md border-l-2 p-2 text-xs transition hover:bg-muted ${c ? "border-destructive bg-destructive-soft" : "border-primary bg-primary-soft/60"}`}
                      >
                        <p className="tabular font-semibold">
                          {time5(g.start_time)}–{time5(g.end_time)}
                        </p>
                        <p className="font-medium">{g.name}</p>
                        <p className="text-muted-foreground">
                          {g.teachers?.full_name ?? "—"}
                          {g.room ? ` · ${g.room}` : ""}
                        </p>
                        {c && <p className="mt-0.5 font-medium text-destructive">To'qnashuv!</p>}
                      </Link>
                    );
                  })}
                </div>
              </Panel>
            );
          })}
        </div>
      )}
    </div>
  );
}
