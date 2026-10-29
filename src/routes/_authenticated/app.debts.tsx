import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AlertCircle, UserCheck, Download, Printer } from "lucide-react";
import { useCenter, can } from "@/lib/center";
import { balancesQ, groupsQ, studentsQ } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, ErrorBox, LoadingRows, PageHeader, Panel, StatCard, selectCls } from "@/components/app/ui-bits";
import { PaymentDialog } from "@/components/app/dialogs";
import { formatDate, formatMonth, formatPhone, formatUZS, parseUZS } from "@/lib/format";
import { downloadCSV } from "@/lib/csv";

export const Route = createFileRoute("/_authenticated/app/debts")({
  head: () => ({ meta: [{ title: "Qarzdorlik — Markazly" }] }),
  component: DebtsPage,
});

function DebtsPage() {
  const { centerId, role } = useCenter();
  const perms = can(role);
  const bals = useQuery(balancesQ(centerId));
  const students = useQuery(studentsQ(centerId));
  const groups = useQuery(groupsQ(centerId));
  const [group, setGroup] = useState("");
  const [min, setMin] = useState("");
  const [sort, setSort] = useState("oldest");
  const [pay, setPay] = useState<string | null>(null);

  const sMap = useMemo(() => new Map((students.data ?? []).map((s) => [s.id, s])), [students.data]);
  const rows = useMemo(() => {
    const m = parseUZS(min);
    const r = (bals.data ?? []).filter((b) => (b.balance ?? 0) > 0)
      .filter((b) => !group || sMap.get(b.student_id!)?.enrollments.some((e) => e.status === "active" && e.group_id === group))
      .filter((b) => isNaN(m) || (b.balance ?? 0) >= m);
    return r.sort((a, b) => sort === "amount" ? (b.balance ?? 0) - (a.balance ?? 0) : (a.last_paid_on ?? a.first_period ?? "").localeCompare(b.last_paid_on ?? b.first_period ?? ""));
  }, [bals.data, group, min, sort, sMap]);
  const total = rows.reduce((a, b) => a + (b.balance ?? 0), 0);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Qarzdorlik" description="To'lanmagan o'qish to'lovlari" actions={<>
        {perms.finance && <Button variant="outline" onClick={() => downloadCSV("qarzdorlik.csv", [["O'quvchi", "Telefon", "Hisoblangan", "To'langan", "Qarz", "Oxirgi to'lov"], ...rows.map((b) => [b.full_name, b.phone, b.total_due, b.total_paid, b.balance, formatDate(b.last_paid_on)])])}><Download className="mr-1.5 h-4 w-4" />CSV</Button>}
        <Button variant="outline" onClick={() => window.print()}><Printer className="mr-1.5 h-4 w-4" />Chop etish</Button>
      </>} />
      <div className="mb-4 grid grid-cols-2 gap-3">
        <StatCard label="Umumiy qarz" value={formatUZS(total)} icon={AlertCircle} tone="danger" />
        <StatCard label="Qarzdor o'quvchilar" value={rows.length} icon={AlertCircle} />
      </div>
      <Panel>
        <div className="no-print grid gap-2 border-b p-3 sm:grid-cols-3">
          <select className={selectCls} value={group} onChange={(e) => setGroup(e.target.value)}><option value="">Barcha guruhlar</option>{(groups.data ?? []).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
          <Input placeholder="Minimal qarz, so'm" value={min} onChange={(e) => setMin(e.target.value)} inputMode="numeric" />
          <select className={selectCls} value={sort} onChange={(e) => setSort(e.target.value)}><option value="oldest">Eng eski qarz avval</option><option value="amount">Summa bo'yicha</option></select>
        </div>
        {bals.error ? <ErrorBox error={bals.error} /> : bals.isLoading ? <LoadingRows /> : rows.length === 0 ? <EmptyState icon={UserCheck} title="Qarzdorlik yo'q" text="Barcha o'quvchilar to'lovlari o'z vaqtida." /> : (
          <Table>
            <TableHeader><TableRow><TableHead>O'quvchi</TableHead><TableHead className="hidden md:table-cell">Hisob davri</TableHead><TableHead className="hidden sm:table-cell">Oxirgi to'lov</TableHead><TableHead className="text-right">Qarz</TableHead><TableHead className="no-print" /></TableRow></TableHeader>
            <TableBody>
              {rows.map((b) => (
                <TableRow key={b.student_id}>
                  <TableCell><Link to="/app/students/$id" params={{ id: b.student_id! }} className="font-medium hover:text-primary">{b.full_name}</Link><p className="text-xs tabular text-muted-foreground">{formatPhone(b.phone)}</p></TableCell>
                  <TableCell className="hidden text-sm md:table-cell">{formatMonth(b.first_period)} — hozirgacha</TableCell>
                  <TableCell className="hidden tabular text-sm sm:table-cell">{formatDate(b.last_paid_on)}</TableCell>
                  <TableCell className="text-right tabular font-semibold text-destructive">{formatUZS(b.balance)}</TableCell>
                  <TableCell className="no-print text-right"><Button size="sm" variant="outline" onClick={() => setPay(b.student_id!)}>To'lov</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>
      <PaymentDialog open={!!pay} onOpenChange={(v) => !v && setPay(null)} studentId={pay ?? undefined} />
    </div>
  );
}
