import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCenter } from "@/lib/center";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ErrorBox, LoadingRows, PageHeader, Panel, StatusBadge } from "@/components/app/ui-bits";
import { ROLE_LABELS, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/app/settings/users")({
  head: () => ({ meta: [{ title: "Xodimlar — Markazly" }] }),
  component: UsersPage,
});

const PERMS = [
  ["owner", "To'liq kirish, moliya, xodimlar va sozlamalar"],
  ["admin", "O'quvchilar, kurslar, guruhlar, davomat, to'lovlar va xarajatlar"],
  ["teacher", "Guruhlar, darslar va davomat. Moliyaviy ma'lumotlar yopiq"],
  ["receptionist", "O'quvchilarni ro'yxatga olish va to'lovlarni qayd etish"],
];

function UsersPage() {
  const { centerId } = useCenter();
  const q = useQuery({
    queryKey: ["members", centerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("center_memberships")
        .select("id, user_id, role, created_at")
        .eq("center_id", centerId);
      if (error) throw new Error(error.message);
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in(
          "id",
          data.map((m) => m.user_id),
        );
      return data.map((m) => ({
        ...m,
        name: profs?.find((p) => p.id === m.user_id)?.full_name || "—",
      }));
    },
  });
  return (
    <div className="mx-auto max-w-4xl">
      <Link
        to="/app/settings"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Sozlamalar
      </Link>
      <PageHeader title="Xodimlar va ruxsatlar" />
      <Panel className="mb-4">
        {q.error ? (
          <ErrorBox error={q.error} />
        ) : !q.data ? (
          <LoadingRows />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Xodim</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Qo'shilgan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {q.data.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell>
                    <StatusBadge tone="primary">{ROLE_LABELS[m.role]}</StatusBadge>
                  </TableCell>
                  <TableCell className="tabular text-sm">
                    {formatDate(m.created_at.slice(0, 10))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>
      <Panel title="Rollar">
        <ul className="divide-y text-sm">
          {PERMS.map(([r, t]) => (
            <li key={r} className="flex gap-4 px-5 py-3">
              <span className="w-32 shrink-0 font-medium">{ROLE_LABELS[r]}</span>
              <span className="text-muted-foreground">{t}</span>
            </li>
          ))}
        </ul>
        <p className="flex gap-2 border-t px-5 py-3 text-xs text-muted-foreground">
          <Info className="h-4 w-4 shrink-0" />
          Xodimlarni taklif qilish xavfsiz taklifnoma tizimi ishga tushirilgandan so'ng qo'shiladi.
        </p>
      </Panel>
    </div>
  );
}
