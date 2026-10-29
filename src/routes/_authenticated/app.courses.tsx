import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { BookOpen, Plus, Pencil } from "lucide-react";
import { useCenter, can } from "@/lib/center";
import { coursesQ, groupsQ } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  EmptyState,
  ErrorBox,
  LoadingRows,
  PageHeader,
  Panel,
  StatusBadge,
} from "@/components/app/ui-bits";
import { CourseDialog, type CourseRow } from "@/components/app/dialogs";
import { formatUZS } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/app/courses")({
  head: () => ({ meta: [{ title: "Kurslar — Markazly" }] }),
  component: CoursesPage,
});

function CoursesPage() {
  const { centerId, role } = useCenter();
  const perms = can(role);
  const q = useQuery(coursesQ(centerId));
  const groups = useQuery(groupsQ(centerId));
  const [edit, setEdit] = useState<CourseRow | null>(null);
  const [open, setOpen] = useState(false);
  const count = (id: string) =>
    (groups.data ?? []).filter((g) => g.course_id === id && g.status === "active").length;
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Kurslar"
        description="Fanlar va o'quv dasturlari"
        actions={
          perms.manageCatalog && (
            <Button
              onClick={() => {
                setEdit(null);
                setOpen(true);
              }}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Kurs qo'shish
            </Button>
          )
        }
      />
      <Panel>
        {q.error ? (
          <ErrorBox error={q.error} />
        ) : q.isLoading ? (
          <LoadingRows />
        ) : !q.data?.length ? (
          <EmptyState
            icon={BookOpen}
            title="Hali kurslar yo'q"
            text="Masalan: Ingliz tili, IELTS, Matematika."
            action={
              perms.manageCatalog && <Button onClick={() => setOpen(true)}>Kurs qo'shish</Button>
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kurs</TableHead>
                <TableHead>Faol guruhlar</TableHead>
                <TableHead className="text-right">Standart to'lov</TableHead>
                <TableHead>Holati</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {q.data.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <p className="font-medium">{c.name}</p>
                    {c.description && (
                      <p className="text-xs text-muted-foreground">{c.description}</p>
                    )}
                  </TableCell>
                  <TableCell className="tabular">{count(c.id)}</TableCell>
                  <TableCell className="text-right tabular">{formatUZS(c.default_fee)}</TableCell>
                  <TableCell>
                    <StatusBadge tone={c.status === "active" ? "success" : "muted"}>
                      {c.status === "active" ? "Faol" : "Arxivlangan"}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-right">
                    {perms.manageCatalog && (
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Tahrirlash"
                        onClick={() => {
                          setEdit(c);
                          setOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>
      <CourseDialog open={open} onOpenChange={setOpen} course={edit} />
    </div>
  );
}
