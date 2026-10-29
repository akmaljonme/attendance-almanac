import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Receipt, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCenter } from "@/lib/center";
import { expensesQ } from "@/lib/queries";
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
  EmptyState,
  ErrorBox,
  LoadingRows,
  PageHeader,
  Panel,
  selectCls,
} from "@/components/app/ui-bits";
import { ExpenseDialog, type ExpenseRow } from "@/components/app/dialogs";
import { EXPENSE_CATEGORIES, formatDate, formatUZS, monthStartISO, todayISO } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/app/expenses")({
  head: () => ({ meta: [{ title: "Xarajatlar — Markazly" }] }),
  component: ExpensesPage,
});

function ExpensesPage() {
  const { centerId, role } = useCenter();
  const qc = useQueryClient();
  const [from, setFrom] = useState(monthStartISO());
  const [to, setTo] = useState(todayISO());
  const [cat, setCat] = useState("");
  const [edit, setEdit] = useState<ExpenseRow | null>(null);
  const [open, setOpen] = useState(false);
  const [del, setDel] = useState<ExpenseRow | null>(null);
  const q = useQuery(expensesQ(centerId, from, to));
  const rows = (q.data ?? []).filter((e) => !cat || e.category === cat);
  const total = rows.reduce((a, e) => a + e.amount, 0);
  const byCat = EXPENSE_CATEGORIES.map((c) => ({
    c,
    v: rows.filter((e) => e.category === c).reduce((a, e) => a + e.amount, 0),
  })).filter((x) => x.v > 0);

  async function remove() {
    if (!del) return;
    const { error } = await supabase.from("expenses").delete().eq("id", del.id);
    if (error) return toast.error(error.message);
    toast.success("Xarajat o'chirildi");
    setDel(null);
    ["expenses", "dashboard", "reports"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Xarajatlar"
        actions={
          <Button
            onClick={() => {
              setEdit(null);
              setOpen(true);
            }}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Xarajat qo'shish
          </Button>
        }
      />
      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <Panel className="p-5">
          <p className="text-xs text-muted-foreground">Davr bo'yicha jami</p>
          <p className="mt-1 text-2xl font-semibold tabular text-destructive">{formatUZS(total)}</p>
        </Panel>
        <Panel className="p-5 lg:col-span-2">
          <p className="mb-3 text-xs text-muted-foreground">Toifalar bo'yicha</p>
          {byCat.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ma'lumot yo'q</p>
          ) : (
            <div className="space-y-2">
              {byCat.map((x) => (
                <div key={x.c} className="text-sm">
                  <div className="flex justify-between">
                    <span>{x.c}</span>
                    <span className="tabular">{formatUZS(x.v)}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-chart-3"
                      style={{ width: `${(x.v / total) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
      <Panel>
        <div className="grid gap-2 border-b p-3 sm:grid-cols-3">
          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            aria-label="Dan"
          />
          <Input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            aria-label="Gacha"
          />
          <select className={selectCls} value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="">Barcha toifalar</option>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        {q.error ? (
          <ErrorBox error={q.error} />
        ) : q.isLoading ? (
          <LoadingRows />
        ) : rows.length === 0 ? (
          <EmptyState icon={Receipt} title="Bu davrda xarajat yo'q" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sana</TableHead>
                <TableHead>Toifa</TableHead>
                <TableHead className="hidden sm:table-cell">Tavsif</TableHead>
                <TableHead className="text-right">Summa</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="tabular text-sm">{formatDate(e.spent_on)}</TableCell>
                  <TableCell className="text-sm">{e.category}</TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                    {e.description ?? "—"}
                  </TableCell>
                  <TableCell className="text-right tabular font-medium">
                    {formatUZS(e.amount)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Tahrirlash"
                      onClick={() => {
                        setEdit(e);
                        setOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {role === "owner" && (
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="O'chirish"
                        onClick={() => setDel(e)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>
      <ExpenseDialog open={open} onOpenChange={setOpen} expense={edit} />
      <AlertDialog open={!!del} onOpenChange={(v) => !v && setDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xarajatni o'chirish</AlertDialogTitle>
            <AlertDialogDescription>
              {del?.category} — {formatUZS(del?.amount)}. Amal audit jurnaliga yoziladi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>O'chirish</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
