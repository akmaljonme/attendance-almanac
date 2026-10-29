import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Users,
  UserCheck,
  UsersRound,
  TrendingUp,
  AlertCircle,
  CalendarCheck,
  UserPlus,
  Plus,
  Wallet,
  BarChart3,
  Clock,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useCenter, can } from "@/lib/center";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, Panel, StatCard, ErrorBox } from "@/components/app/ui-bits";
import { PaymentDialog, StudentDialog, GroupDialog } from "@/components/app/dialogs";
import {
  MONTHS_SHORT,
  addMonths,
  formatDate,
  formatUZS,
  isoWeekday,
  monthStartISO,
  time5,
  todayISO,
  PAYMENT_METHODS,
} from "@/lib/format";

export const Route = createFileRoute("/_authenticated/app/dashboard")({
  head: () => ({ meta: [{ title: "Bosh sahifa — Markazly" }] }),
  component: Dashboard,
});

function useDashboard(centerId: string, finance: boolean, payments: boolean) {
  return useQuery({
    queryKey: ["dashboard", centerId],
    queryFn: async () => {
      const today = todayISO();
      const from = addMonths(monthStartISO(today), -5);
      const [students, groups, sessions, pays, exps, bals] = await Promise.all([
        supabase
          .from("students")
          .select("id, full_name, phone, status, created_at")
          .eq("center_id", centerId)
          .order("created_at", { ascending: false }),
        supabase
          .from("groups")
          .select("id, name, days, start_time, end_time, room, status, teachers(full_name)")
          .eq("center_id", centerId),
        supabase
          .from("class_sessions")
          .select("session_date, attendance_records(status)")
          .eq("center_id", centerId)
          .gte("session_date", from),
        payments
          ? supabase
              .from("payments")
              .select("id, amount, paid_on, method, voided_at, students(full_name)")
              .eq("center_id", centerId)
              .gte("paid_on", from)
              .is("voided_at", null)
              .order("paid_on", { ascending: false })
              .order("created_at", { ascending: false })
          : Promise.resolve({ data: [], error: null }),
        finance
          ? supabase
              .from("expenses")
              .select("amount, spent_on")
              .eq("center_id", centerId)
              .gte("spent_on", from)
          : Promise.resolve({ data: [], error: null }),
        payments
          ? supabase
              .from("v_student_balances")
              .select("student_id, full_name, balance, last_paid_on")
              .eq("center_id", centerId)
              .gt("balance", 0)
              .order("balance", { ascending: false })
          : Promise.resolve({ data: [], error: null }),
      ]);
      for (const r of [students, groups, sessions, pays, exps, bals])
        if (r.error) throw new Error(r.error.message);
      return {
        today,
        from,
        students: students.data!,
        groups: groups.data!,
        sessions: sessions.data!,
        pays: pays.data as {
          id: string;
          amount: number;
          paid_on: string;
          method: string;
          students: { full_name: string } | null;
        }[],
        exps: exps.data as { amount: number; spent_on: string }[],
        bals: bals.data as {
          student_id: string;
          full_name: string;
          balance: number;
          last_paid_on: string | null;
        }[],
      };
    },
  });
}

function Dashboard() {
  const { centerId, userName, role } = useCenter();
  const perms = can(role);
  const q = useDashboard(centerId, perms.finance, perms.recordPayment);
  const [dlg, setDlg] = useState<"student" | "group" | "payment" | null>(null);
  const hour = parseInt(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Tashkent",
      hour: "2-digit",
      hour12: false,
    }).format(new Date()),
    10,
  );
  const greet = hour < 12 ? "Xayrli tong" : hour < 18 ? "Xayrli kun" : "Xayrli kech";

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{greet},</p>
          <h1 className="text-2xl font-semibold">{userName.split(" ")[0] || "xush kelibsiz"}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {perms.manageStudents && (
            <Button size="sm" onClick={() => setDlg("student")}>
              <UserPlus className="mr-1.5 h-4 w-4" />
              O'quvchi qo'shish
            </Button>
          )}
          {perms.manageCatalog && (
            <Button size="sm" variant="outline" onClick={() => setDlg("group")}>
              <Plus className="mr-1.5 h-4 w-4" />
              Guruh yaratish
            </Button>
          )}
          {perms.recordPayment && (
            <Button size="sm" variant="outline" onClick={() => setDlg("payment")}>
              <Wallet className="mr-1.5 h-4 w-4" />
              To'lovni qayd etish
            </Button>
          )}
          {perms.attendance && (
            <Button size="sm" variant="outline" asChild>
              <Link to="/app/attendance">
                <CalendarCheck className="mr-1.5 h-4 w-4" />
                Davomatni belgilash
              </Link>
            </Button>
          )}
          {perms.finance && (
            <Button size="sm" variant="outline" asChild>
              <Link to="/app/reports">
                <BarChart3 className="mr-1.5 h-4 w-4" />
                Hisobotlar
              </Link>
            </Button>
          )}
        </div>
      </div>

      {q.error ? (
        <ErrorBox error={q.error} />
      ) : !q.data ? (
        <DashSkeleton />
      ) : (
        <DashBody
          d={q.data}
          finance={perms.finance}
          payments={perms.recordPayment}
          onAdd={() => setDlg("student")}
        />
      )}

      <StudentDialog open={dlg === "student"} onOpenChange={(v) => !v && setDlg(null)} />
      <GroupDialog open={dlg === "group"} onOpenChange={(v) => !v && setDlg(null)} />
      <PaymentDialog open={dlg === "payment"} onOpenChange={(v) => !v && setDlg(null)} />
    </div>
  );
}

function DashSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    </div>
  );
}

type D = NonNullable<ReturnType<typeof useDashboard>["data"]>;

function DashBody({
  d,
  finance,
  payments,
  onAdd,
}: {
  d: D;
  finance: boolean;
  payments: boolean;
  onAdd: () => void;
}) {
  const monthStart = monthStartISO(d.today);
  const active = d.students.filter((s) => s.status === "active").length;
  const activeGroups = d.groups.filter((g) => g.status === "active");
  const monthRevenue = d.pays
    .filter((p) => p.paid_on >= monthStart)
    .reduce((a, p) => a + p.amount, 0);
  const totalDebt = d.bals.reduce((a, b) => a + b.balance, 0);
  const todayRecs = d.sessions
    .filter((s) => s.session_date === d.today)
    .flatMap((s) => s.attendance_records);
  const todayPct = todayRecs.length
    ? Math.round(
        (todayRecs.filter((r) => r.status === "present" || r.status === "late").length /
          todayRecs.length) *
          100,
      )
    : null;

  const months = Array.from({ length: 6 }, (_, i) => addMonths(d.from, i));
  const series = months.map((m) => {
    const key = m.slice(0, 7);
    const recs = d.sessions
      .filter((s) => s.session_date.startsWith(key))
      .flatMap((s) => s.attendance_records);
    return {
      name: MONTHS_SHORT[parseInt(m.slice(5, 7), 10) - 1],
      Tushum: d.pays.filter((p) => p.paid_on.startsWith(key)).reduce((a, p) => a + p.amount, 0),
      Xarajat: d.exps.filter((e) => e.spent_on.startsWith(key)).reduce((a, e) => a + e.amount, 0),
      Davomat: recs.length
        ? Math.round(
            (recs.filter((r) => r.status === "present" || r.status === "late").length /
              recs.length) *
              100,
          )
        : null,
    };
  });

  const wd = isoWeekday(d.today);
  const todayClasses = activeGroups
    .filter((g) => g.days.includes(wd))
    .sort((a, b) => (a.start_time ?? "").localeCompare(b.start_time ?? ""));

  if (d.students.length === 0 && d.groups.length === 0) {
    return (
      <Panel>
        <EmptyState
          icon={Users}
          title="Markazingiz hali bo'sh"
          text="Avval kurs va guruh yarating, so'ng o'quvchilarni qo'shing. Ko'rsatkichlar shu yerda paydo bo'ladi."
          action={
            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link to="/app/courses">Kurs yaratish</Link>
              </Button>
              <Button onClick={onAdd}>Birinchi o'quvchini qo'shish</Button>
            </div>
          }
        />
      </Panel>
    );
  }

  const fmtAxis = (v: number) =>
    v >= 1_000_000
      ? `${Math.round(v / 1_000_000)} mln`
      : v >= 1000
        ? `${Math.round(v / 1000)} ming`
        : String(v);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Jami o'quvchilar" value={d.students.length} icon={Users} />
        <StatCard label="Faol o'quvchilar" value={active} icon={UserCheck} tone="success" />
        <StatCard
          label="Faol guruhlar"
          value={activeGroups.length}
          icon={UsersRound}
          tone="primary"
        />
        {payments && (
          <StatCard
            label="Joriy oy tushumi"
            value={formatUZS(monthRevenue, false)}
            hint="so'm, qabul qilingan to'lovlar"
            icon={TrendingUp}
            tone="success"
          />
        )}
        {payments && (
          <StatCard
            label="Jami qarzdorlik"
            value={formatUZS(totalDebt, false)}
            hint={`so'm, ${d.bals.length} o'quvchi`}
            icon={AlertCircle}
            tone="danger"
          />
        )}
        <StatCard
          label="Bugungi davomat"
          value={todayPct == null ? "—" : `${todayPct}%`}
          hint={todayPct == null ? "Hali belgilanmagan" : `${todayRecs.length} ta yozuv`}
          icon={CalendarCheck}
          tone="primary"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {payments && (
          <Panel title={finance ? "Tushum va xarajatlar (6 oy)" : "Oylik tushum (6 oy)"}>
            <div className="h-64 p-4">
              <ResponsiveContainer>
                <BarChart data={series}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis
                    tickFormatter={fmtAxis}
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    width={56}
                  />
                  <Tooltip
                    formatter={(v: number) => formatUZS(v)}
                    cursor={{ fill: "var(--muted)" }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Tushum" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                  {finance && <Bar dataKey="Xarajat" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        )}
        <Panel title="Davomat dinamikasi (%)">
          <div className="h-64 p-4">
            <ResponsiveContainer>
              <LineChart data={series}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis
                  domain={[0, 100]}
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  width={32}
                />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Line
                  dataKey="Davomat"
                  stroke="var(--chart-2)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel
          title="Bugungi darslar"
          action={
            <Link to="/app/schedule" className="text-xs text-primary">
              Jadval
            </Link>
          }
        >
          {todayClasses.length === 0 ? (
            <EmptyState icon={Clock} title="Bugun dars yo'q" />
          ) : (
            <ul className="divide-y">
              {todayClasses.map((g) => (
                <li key={g.id} className="flex items-center justify-between px-5 py-3 text-sm">
                  <div>
                    <Link
                      to="/app/groups/$id"
                      params={{ id: g.id }}
                      className="font-medium hover:text-primary"
                    >
                      {g.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {g.teachers?.full_name ?? "O'qituvchi biriktirilmagan"}
                      {g.room ? ` · ${g.room}` : ""}
                    </p>
                  </div>
                  <span className="tabular text-xs text-muted-foreground">
                    {time5(g.start_time)}–{time5(g.end_time)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        {payments && (
          <Panel
            title="So'nggi to'lovlar"
            action={
              <Link to="/app/payments" className="text-xs text-primary">
                Barchasi
              </Link>
            }
          >
            {d.pays.length === 0 ? (
              <EmptyState icon={Wallet} title="Hali to'lov yo'q" />
            ) : (
              <ul className="divide-y">
                {d.pays.slice(0, 6).map((p) => (
                  <li key={p.id} className="flex items-center justify-between px-5 py-3 text-sm">
                    <div>
                      <p className="font-medium">{p.students?.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(p.paid_on)} · {PAYMENT_METHODS[p.method]}
                      </p>
                    </div>
                    <span className="tabular font-medium text-success">+{formatUZS(p.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}
        {payments ? (
          <Panel
            title="Qarzdor o'quvchilar"
            action={
              <Link to="/app/debts" className="text-xs text-primary">
                Barchasi
              </Link>
            }
          >
            {d.bals.length === 0 ? (
              <EmptyState icon={UserCheck} title="Qarzdorlik yo'q" />
            ) : (
              <ul className="divide-y">
                {d.bals.slice(0, 6).map((b) => (
                  <li
                    key={b.student_id}
                    className="flex items-center justify-between px-5 py-3 text-sm"
                  >
                    <div>
                      <Link
                        to="/app/students/$id"
                        params={{ id: b.student_id }}
                        className="font-medium hover:text-primary"
                      >
                        {b.full_name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        Oxirgi to'lov: {formatDate(b.last_paid_on)}
                      </p>
                    </div>
                    <span className="tabular font-medium text-destructive">
                      {formatUZS(b.balance)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        ) : (
          <Panel title="Yangi o'quvchilar">
            <RecentStudents d={d} />
          </Panel>
        )}
      </div>
      {payments && (
        <Panel title="Yangi qo'shilgan o'quvchilar">
          <RecentStudents d={d} />
        </Panel>
      )}
    </div>
  );
}

function RecentStudents({ d }: { d: D }) {
  if (!d.students.length) return <EmptyState icon={Users} title="O'quvchilar yo'q" />;
  return (
    <ul className="grid divide-y sm:grid-cols-2 sm:divide-y-0">
      {d.students.slice(0, 6).map((s) => (
        <li key={s.id} className="flex items-center justify-between border-b px-5 py-3 text-sm">
          <Link
            to="/app/students/$id"
            params={{ id: s.id }}
            className="font-medium hover:text-primary"
          >
            {s.full_name}
          </Link>
          <span className="text-xs text-muted-foreground">
            {formatDate(s.created_at.slice(0, 10))}
          </span>
        </li>
      ))}
    </ul>
  );
}
