import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, selectCls } from "./ui-bits";
import { useCenter } from "@/lib/center";
import { coursesQ, groupsQ, studentsQ, teachersQ, balancesQ } from "@/lib/queries";
import {
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
  WEEKDAYS_SHORT,
  formatUZS,
  monthStartISO,
  normalizePhone,
  parseUZS,
  todayISO,
} from "@/lib/format";

type Base = { open: boolean; onOpenChange: (v: boolean) => void };

function Shell({
  open,
  onOpenChange,
  title,
  desc,
  children,
  onSubmit,
  busy,
  submitLabel = "Saqlash",
}: Base & {
  title: string;
  desc?: string;
  children: ReactNode;
  onSubmit: () => void;
  busy: boolean;
  submitLabel?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {desc && <DialogDescription>{desc}</DialogDescription>}
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!busy) onSubmit();
          }}
          noValidate
        >
          {children}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Bekor qilish
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function useInvalidate() {
  const qc = useQueryClient();
  return (...keys: string[]) =>
    Promise.all(keys.map((k) => qc.invalidateQueries({ queryKey: [k] })));
}

/* ---------------- Student ---------------- */
export type StudentRow = {
  id: string;
  full_name: string;
  phone: string;
  parent_name: string | null;
  parent_phone: string | null;
  enrolled_on: string;
  status: string;
  notes: string | null;
};

export function StudentDialog({
  open,
  onOpenChange,
  student,
}: Base & { student?: StudentRow | null }) {
  const { centerId } = useCenter();
  const inv = useInvalidate();
  const groups = useQuery(groupsQ(centerId));
  const students = useQuery(studentsQ(centerId));
  const [f, setF] = useState({
    full_name: "",
    phone: "",
    parent_name: "",
    parent_phone: "",
    enrolled_on: todayISO(),
    status: "active",
    notes: "",
    group_id: "",
    fee: "",
  });
  const [err, setErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErr({});
    setF(
      student
        ? {
            full_name: student.full_name,
            phone: student.phone,
            parent_name: student.parent_name ?? "",
            parent_phone: student.parent_phone ?? "",
            enrolled_on: student.enrolled_on,
            status: student.status,
            notes: student.notes ?? "",
            group_id: "",
            fee: "",
          }
        : {
            full_name: "",
            phone: "",
            parent_name: "",
            parent_phone: "",
            enrolled_on: todayISO(),
            status: "active",
            notes: "",
            group_id: "",
            fee: "",
          },
    );
  }, [open, student]);

  const activeGroups = (groups.data ?? []).filter((g) => g.status === "active");

  async function submit() {
    const e: Record<string, string> = {};
    if (f.full_name.trim().length < 2) e.full_name = "Ism-familiyani kiriting";
    const phone = normalizePhone(f.phone);
    if (!phone) e.phone = "Telefon: +998 90 123 45 67";
    const pphone = f.parent_phone ? normalizePhone(f.parent_phone) : null;
    if (f.parent_phone && !pphone) e.parent_phone = "Telefon raqami noto'g'ri";
    const fee = f.group_id ? parseUZS(f.fee) : 0;
    if (f.group_id && (isNaN(fee) || fee < 0)) e.fee = "Oylik to'lovni kiriting";
    if (
      !student &&
      phone &&
      (students.data ?? []).some(
        (s) =>
          s.phone === phone &&
          s.full_name.trim().toLowerCase() === f.full_name.trim().toLowerCase(),
      )
    )
      e.full_name = "Bu o'quvchi allaqachon mavjud";
    setErr(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    const payload = {
      full_name: f.full_name.trim(),
      phone: phone!,
      parent_name: f.parent_name.trim() || null,
      parent_phone: pphone,
      enrolled_on: f.enrolled_on,
      status: f.status,
      notes: f.notes.trim() || null,
    };
    if (student) {
      const { error } = await supabase.from("students").update(payload).eq("id", student.id);
      setBusy(false);
      if (error) return toast.error(error.message);
      toast.success("O'quvchi ma'lumotlari yangilandi");
    } else {
      const { data, error } = await supabase
        .from("students")
        .insert({ ...payload, center_id: centerId })
        .select("id")
        .single();
      if (error) {
        setBusy(false);
        return toast.error(error.message);
      }
      if (f.group_id) {
        const { error: e2 } = await supabase.from("enrollments").insert({
          center_id: centerId,
          student_id: data.id,
          group_id: f.group_id,
          start_date: f.enrolled_on,
          monthly_fee: fee,
        });
        if (e2) toast.error("Guruhga qo'shib bo'lmadi: " + e2.message);
      }
      setBusy(false);
      toast.success("O'quvchi qo'shildi");
    }
    await inv("students", "balances", "groups", "student", "dashboard");
    onOpenChange(false);
  }

  const s =
    (k: keyof typeof f) =>
    (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setF({ ...f, [k]: ev.target.value });

  return (
    <Shell
      open={open}
      onOpenChange={onOpenChange}
      title={student ? "O'quvchini tahrirlash" : "Yangi o'quvchi"}
      onSubmit={submit}
      busy={busy}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Ism-familiya" error={err.full_name}>
          <Input value={f.full_name} onChange={s("full_name")} placeholder="Azizbek Rahimov" />
        </Field>
        <Field label="Telefon" error={err.phone}>
          <Input
            value={f.phone}
            onChange={s("phone")}
            placeholder="+998 90 123 45 67"
            inputMode="tel"
          />
        </Field>
        <Field label="Ota-ona ismi (ixtiyoriy)">
          <Input value={f.parent_name} onChange={s("parent_name")} />
        </Field>
        <Field label="Ota-ona telefoni (ixtiyoriy)" error={err.parent_phone}>
          <Input value={f.parent_phone} onChange={s("parent_phone")} inputMode="tel" />
        </Field>
        <Field label="Qabul sanasi">
          <Input type="date" value={f.enrolled_on} onChange={s("enrolled_on")} />
        </Field>
        <Field label="Holati">
          <select className={selectCls} value={f.status} onChange={s("status")}>
            <option value="active">Faol</option>
            <option value="paused">To'xtatilgan</option>
            <option value="archived">Arxivlangan</option>
          </select>
        </Field>
      </div>
      {!student && (
        <div className="grid gap-4 rounded-lg border bg-muted/40 p-3 sm:grid-cols-2">
          <Field label="Guruh (ixtiyoriy)">
            <select
              className={selectCls}
              value={f.group_id}
              onChange={(ev) => {
                const g = activeGroups.find((x) => x.id === ev.target.value);
                setF({ ...f, group_id: ev.target.value, fee: g ? String(g.monthly_fee) : "" });
              }}
            >
              <option value="">— Tanlanmagan —</option>
              {activeGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Oylik to'lov (so'm)" error={err.fee}>
            <Input value={f.fee} onChange={s("fee")} disabled={!f.group_id} inputMode="numeric" />
          </Field>
        </div>
      )}
      <Field label="Izoh">
        <Textarea rows={2} value={f.notes} onChange={s("notes")} />
      </Field>
    </Shell>
  );
}

/* ---------------- Payment ---------------- */
export function PaymentDialog({ open, onOpenChange, studentId }: Base & { studentId?: string }) {
  const { centerId } = useCenter();
  const inv = useInvalidate();
  const students = useQuery(studentsQ(centerId));
  const balances = useQuery(balancesQ(centerId));
  const [f, setF] = useState({
    student_id: "",
    group_id: "",
    amount: "",
    paid_on: todayISO(),
    method: "cash",
    period_month: monthStartISO().slice(0, 7),
    reference: "",
    notes: "",
  });
  const [token, setToken] = useState(() => crypto.randomUUID());
  const [err, setErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setToken(crypto.randomUUID());
    setErr({});
    setF({
      student_id: studentId ?? "",
      group_id: "",
      amount: "",
      paid_on: todayISO(),
      method: "cash",
      period_month: monthStartISO().slice(0, 7),
      reference: "",
      notes: "",
    });
  }, [open, studentId]);

  const student = (students.data ?? []).find((s) => s.id === f.student_id);
  const studentGroups = (student?.enrollments ?? []).filter((e) => e.status === "active");
  const bal = (balances.data ?? []).find((b) => b.student_id === f.student_id);
  const activeStudents = useMemo(
    () => (students.data ?? []).filter((s) => s.status !== "archived" || s.id === studentId),
    [students.data, studentId],
  );

  async function submit() {
    const e: Record<string, string> = {};
    const amount = parseUZS(f.amount);
    if (!f.student_id) e.student_id = "O'quvchini tanlang";
    if (isNaN(amount) || amount <= 0) e.amount = "Summani kiriting";
    if (amount > 1_000_000_000) e.amount = "Summa juda katta";
    if (f.paid_on > todayISO()) e.paid_on = "Kelajakdagi sana bo'lishi mumkin emas";
    setErr(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    const { error } = await supabase.from("payments").insert({
      center_id: centerId,
      student_id: f.student_id,
      group_id: f.group_id || null,
      amount,
      paid_on: f.paid_on,
      method: f.method,
      period_month: f.period_month ? f.period_month + "-01" : null,
      reference: f.reference.trim() || null,
      notes: f.notes.trim() || null,
      client_token: token,
    });
    setBusy(false);
    if (error && !error.message.includes("client_token")) return toast.error(error.message);
    toast.success(`${formatUZS(amount)} to'lov qayd etildi`);
    await inv("payments", "balances", "student", "dashboard", "reports");
    onOpenChange(false);
  }

  const s =
    (k: keyof typeof f) =>
    (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setF({ ...f, [k]: ev.target.value });

  return (
    <Shell
      open={open}
      onOpenChange={onOpenChange}
      title="To'lovni qayd etish"
      desc="Bu yozuv qo'lda kiritiladi va bank tomonidan tasdiqlangan tranzaksiya hisoblanmaydi."
      onSubmit={submit}
      busy={busy}
      submitLabel="To'lovni saqlash"
    >
      <Field label="O'quvchi" error={err.student_id}>
        <select
          className={selectCls}
          value={f.student_id}
          onChange={(ev) => setF({ ...f, student_id: ev.target.value, group_id: "" })}
          disabled={!!studentId}
        >
          <option value="">— Tanlang —</option>
          {activeStudents.map((s) => (
            <option key={s.id} value={s.id}>
              {s.full_name} · {s.phone}
            </option>
          ))}
        </select>
      </Field>
      {bal && (
        <p
          className={`rounded-md px-3 py-2 text-sm ${(bal.balance ?? 0) > 0 ? "bg-destructive-soft text-destructive" : "bg-success-soft text-success"}`}
        >
          Joriy qoldiq:{" "}
          {(bal.balance ?? 0) > 0
            ? `${formatUZS(bal.balance)} qarz`
            : (bal.balance ?? 0) < 0
              ? `${formatUZS(-(bal.balance ?? 0))} oldindan to'langan`
              : "qarz yo'q"}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Summa (so'm)" error={err.amount}>
          <Input
            value={f.amount}
            onChange={s("amount")}
            inputMode="numeric"
            placeholder="500 000"
          />
        </Field>
        <Field label="To'lov usuli">
          <select className={selectCls} value={f.method} onChange={s("method")}>
            {Object.entries(PAYMENT_METHODS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field label="To'lov sanasi" error={err.paid_on}>
          <Input type="date" value={f.paid_on} onChange={s("paid_on")} max={todayISO()} />
        </Field>
        <Field label="Qaysi oy uchun">
          <Input type="month" value={f.period_month} onChange={s("period_month")} />
        </Field>
        <Field label="Guruh (ixtiyoriy)">
          <select className={selectCls} value={f.group_id} onChange={s("group_id")}>
            <option value="">— Umumiy —</option>
            {studentGroups.map((e) => (
              <option key={e.id} value={e.group_id}>
                {e.groups?.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Chek / havola raqami">
          <Input value={f.reference} onChange={s("reference")} />
        </Field>
      </div>
      <Field label="Izoh">
        <Textarea rows={2} value={f.notes} onChange={s("notes")} />
      </Field>
    </Shell>
  );
}

/* ---------------- Course ---------------- */
export type CourseRow = {
  id: string;
  name: string;
  description: string | null;
  default_fee: number;
  status: string;
};
export function CourseDialog({ open, onOpenChange, course }: Base & { course?: CourseRow | null }) {
  const { centerId } = useCenter();
  const inv = useInvalidate();
  const [f, setF] = useState({ name: "", description: "", fee: "", status: "active" });
  const [err, setErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) {
      setErr({});
      setF(
        course
          ? {
              name: course.name,
              description: course.description ?? "",
              fee: String(course.default_fee),
              status: course.status,
            }
          : { name: "", description: "", fee: "", status: "active" },
      );
    }
  }, [open, course]);
  async function submit() {
    const e: Record<string, string> = {};
    const fee = parseUZS(f.fee || "0");
    if (f.name.trim().length < 2) e.name = "Kurs nomini kiriting";
    if (isNaN(fee)) e.fee = "Summani kiriting";
    setErr(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    const payload = {
      name: f.name.trim(),
      description: f.description.trim() || null,
      default_fee: fee,
      status: f.status,
    };
    const { error } = course
      ? await supabase.from("courses").update(payload).eq("id", course.id)
      : await supabase.from("courses").insert({ ...payload, center_id: centerId });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(course ? "Kurs yangilandi" : "Kurs qo'shildi");
    await inv("courses");
    onOpenChange(false);
  }
  return (
    <Shell
      open={open}
      onOpenChange={onOpenChange}
      title={course ? "Kursni tahrirlash" : "Yangi kurs"}
      onSubmit={submit}
      busy={busy}
    >
      <Field label="Kurs nomi" error={err.name}>
        <Input
          value={f.name}
          onChange={(e) => setF({ ...f, name: e.target.value })}
          placeholder="IELTS tayyorlov"
        />
      </Field>
      <Field label="Tavsif">
        <Textarea
          rows={2}
          value={f.description}
          onChange={(e) => setF({ ...f, description: e.target.value })}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Standart oylik to'lov (so'm)" error={err.fee}>
          <Input
            value={f.fee}
            onChange={(e) => setF({ ...f, fee: e.target.value })}
            inputMode="numeric"
          />
        </Field>
        <Field label="Holati">
          <select
            className={selectCls}
            value={f.status}
            onChange={(e) => setF({ ...f, status: e.target.value })}
          >
            <option value="active">Faol</option>
            <option value="archived">Arxivlangan</option>
          </select>
        </Field>
      </div>
    </Shell>
  );
}

/* ---------------- Teacher ---------------- */
export type TeacherRow = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  specialization: string | null;
  status: string;
  notes: string | null;
};
export function TeacherDialog({
  open,
  onOpenChange,
  teacher,
}: Base & { teacher?: TeacherRow | null }) {
  const { centerId } = useCenter();
  const inv = useInvalidate();
  const empty = {
    full_name: "",
    phone: "",
    email: "",
    specialization: "",
    status: "active",
    notes: "",
  };
  const [f, setF] = useState(empty);
  const [err, setErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) {
      setErr({});
      setF(
        teacher
          ? {
              full_name: teacher.full_name,
              phone: teacher.phone ?? "",
              email: teacher.email ?? "",
              specialization: teacher.specialization ?? "",
              status: teacher.status,
              notes: teacher.notes ?? "",
            }
          : empty,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, teacher]);
  async function submit() {
    const e: Record<string, string> = {};
    if (f.full_name.trim().length < 2) e.full_name = "Ism-familiyani kiriting";
    const phone = f.phone ? normalizePhone(f.phone) : null;
    if (f.phone && !phone) e.phone = "Telefon raqami noto'g'ri";
    if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) e.email = "Email noto'g'ri";
    setErr(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    const payload = {
      full_name: f.full_name.trim(),
      phone,
      email: f.email.trim() || null,
      specialization: f.specialization.trim() || null,
      status: f.status,
      notes: f.notes.trim() || null,
    };
    const { error } = teacher
      ? await supabase.from("teachers").update(payload).eq("id", teacher.id)
      : await supabase.from("teachers").insert({ ...payload, center_id: centerId });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(teacher ? "O'qituvchi yangilandi" : "O'qituvchi qo'shildi");
    await inv("teachers", "groups");
    onOpenChange(false);
  }
  const s =
    (k: keyof typeof f) =>
    (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setF({ ...f, [k]: ev.target.value });
  return (
    <Shell
      open={open}
      onOpenChange={onOpenChange}
      title={teacher ? "O'qituvchini tahrirlash" : "Yangi o'qituvchi"}
      onSubmit={submit}
      busy={busy}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Ism-familiya" error={err.full_name}>
          <Input value={f.full_name} onChange={s("full_name")} placeholder="Malika Yusupova" />
        </Field>
        <Field label="Telefon" error={err.phone}>
          <Input value={f.phone} onChange={s("phone")} inputMode="tel" />
        </Field>
        <Field label="Email (ixtiyoriy)" error={err.email}>
          <Input value={f.email} onChange={s("email")} />
        </Field>
        <Field label="Mutaxassislik">
          <Input
            value={f.specialization}
            onChange={s("specialization")}
            placeholder="Ingliz tili"
          />
        </Field>
        <Field label="Holati">
          <select className={selectCls} value={f.status} onChange={s("status")}>
            <option value="active">Ishlamoqda</option>
            <option value="inactive">Ishlamaydi</option>
          </select>
        </Field>
      </div>
      <Field label="Izoh">
        <Textarea rows={2} value={f.notes} onChange={s("notes")} />
      </Field>
    </Shell>
  );
}

/* ---------------- Group ---------------- */
export type GroupRow = {
  id: string;
  name: string;
  course_id: string;
  teacher_id: string | null;
  days: number[];
  start_time: string | null;
  end_time: string | null;
  room: string | null;
  start_date: string;
  end_date: string | null;
  capacity: number;
  monthly_fee: number;
  status: string;
};
export function GroupDialog({ open, onOpenChange, group }: Base & { group?: GroupRow | null }) {
  const { centerId } = useCenter();
  const inv = useInvalidate();
  const courses = useQuery(coursesQ(centerId));
  const teachers = useQuery(teachersQ(centerId));
  const allGroups = useQuery(groupsQ(centerId));
  const empty = {
    name: "",
    course_id: "",
    teacher_id: "",
    days: [] as number[],
    start_time: "14:00",
    end_time: "15:30",
    room: "",
    start_date: todayISO(),
    end_date: "",
    capacity: "15",
    fee: "",
    status: "active",
  };
  const [f, setF] = useState(empty);
  const [err, setErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    setErr({});
    setF(
      group
        ? {
            name: group.name,
            course_id: group.course_id,
            teacher_id: group.teacher_id ?? "",
            days: group.days ?? [],
            start_time: group.start_time?.slice(0, 5) ?? "",
            end_time: group.end_time?.slice(0, 5) ?? "",
            room: group.room ?? "",
            start_date: group.start_date,
            end_date: group.end_date ?? "",
            capacity: String(group.capacity),
            fee: String(group.monthly_fee),
            status: group.status,
          }
        : empty,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, group]);

  const conflicts = useMemo(() => {
    if (!f.start_time || !f.end_time || !f.days.length) return [];
    return (allGroups.data ?? [])
      .filter(
        (g) =>
          g.id !== group?.id &&
          g.status === "active" &&
          g.start_time &&
          g.end_time &&
          g.days.some((d) => f.days.includes(d)) &&
          g.start_time.slice(0, 5) < f.end_time &&
          f.start_time < g.end_time.slice(0, 5) &&
          ((f.teacher_id && g.teacher_id === f.teacher_id) ||
            (f.room.trim() && g.room?.trim().toLowerCase() === f.room.trim().toLowerCase())),
      )
      .map((g) => `${g.name} (${g.teacher_id === f.teacher_id ? "o'qituvchi band" : "xona band"})`);
  }, [f, allGroups.data, group]);

  async function submit() {
    const e: Record<string, string> = {};
    const fee = parseUZS(f.fee || "0");
    const cap = parseInt(f.capacity, 10);
    if (f.name.trim().length < 1) e.name = "Guruh nomini kiriting";
    if (!f.course_id) e.course_id = "Kursni tanlang";
    if (isNaN(fee)) e.fee = "Summani kiriting";
    if (!(cap > 0)) e.capacity = "Sig'imni kiriting";
    if (f.start_time && f.end_time && f.start_time >= f.end_time)
      e.end_time = "Tugash vaqti boshlanishidan keyin bo'lsin";
    if (f.end_date && f.end_date < f.start_date) e.end_date = "Tugash sanasi noto'g'ri";
    setErr(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    const payload = {
      name: f.name.trim(),
      course_id: f.course_id,
      teacher_id: f.teacher_id || null,
      days: [...f.days].sort(),
      start_time: f.start_time || null,
      end_time: f.end_time || null,
      room: f.room.trim() || null,
      start_date: f.start_date,
      end_date: f.end_date || null,
      capacity: cap,
      monthly_fee: fee,
      status: f.status,
    };
    const { error } = group
      ? await supabase.from("groups").update(payload).eq("id", group.id)
      : await supabase.from("groups").insert({ ...payload, center_id: centerId });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(group ? "Guruh yangilandi" : "Guruh yaratildi");
    await inv("groups", "group");
    onOpenChange(false);
  }
  const s = (k: keyof typeof f) => (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: ev.target.value });
  const activeCourses = (courses.data ?? []).filter(
    (c) => c.status === "active" || c.id === f.course_id,
  );
  return (
    <Shell
      open={open}
      onOpenChange={onOpenChange}
      title={group ? "Guruhni tahrirlash" : "Yangi guruh"}
      onSubmit={submit}
      busy={busy}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Guruh nomi" error={err.name}>
          <Input value={f.name} onChange={s("name")} placeholder="IELTS-1 (ertalabki)" />
        </Field>
        <Field label="Kurs" error={err.course_id}>
          <select
            className={selectCls}
            value={f.course_id}
            onChange={(ev) => {
              const c = activeCourses.find((x) => x.id === ev.target.value);
              setF({
                ...f,
                course_id: ev.target.value,
                fee: f.fee || (c ? String(c.default_fee) : ""),
              });
            }}
          >
            <option value="">— Tanlang —</option>
            {activeCourses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="O'qituvchi">
          <select className={selectCls} value={f.teacher_id} onChange={s("teacher_id")}>
            <option value="">— Biriktirilmagan —</option>
            {(teachers.data ?? [])
              .filter((t) => t.status === "active" || t.id === f.teacher_id)
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.full_name}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Xona">
          <Input value={f.room} onChange={s("room")} placeholder="201-xona" />
        </Field>
      </div>
      <Field label="Dars kunlari">
        <div className="flex flex-wrap gap-1.5">
          {WEEKDAYS_SHORT.map((d, i) => {
            const v = i + 1;
            const on = f.days.includes(v);
            return (
              <button
                key={d}
                type="button"
                onClick={() =>
                  setF({ ...f, days: on ? f.days.filter((x) => x !== v) : [...f.days, v] })
                }
                className={`h-8 min-w-11 rounded-md border px-2 text-xs font-medium ${on ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted"}`}
              >
                {d}
              </button>
            );
          })}
        </div>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Boshlanish vaqti">
          <Input type="time" value={f.start_time} onChange={s("start_time")} />
        </Field>
        <Field label="Tugash vaqti" error={err.end_time}>
          <Input type="time" value={f.end_time} onChange={s("end_time")} />
        </Field>
        <Field label="Boshlanish sanasi">
          <Input type="date" value={f.start_date} onChange={s("start_date")} />
        </Field>
        <Field label="Tugash sanasi (ixtiyoriy)" error={err.end_date}>
          <Input type="date" value={f.end_date} onChange={s("end_date")} />
        </Field>
        <Field label="Sig'im" error={err.capacity}>
          <Input value={f.capacity} onChange={s("capacity")} inputMode="numeric" />
        </Field>
        <Field label="Oylik to'lov (so'm)" error={err.fee}>
          <Input value={f.fee} onChange={s("fee")} inputMode="numeric" />
        </Field>
        <Field label="Holati">
          <select className={selectCls} value={f.status} onChange={s("status")}>
            <option value="active">Faol</option>
            <option value="archived">Arxivlangan</option>
          </select>
        </Field>
      </div>
      {conflicts.length > 0 && (
        <p className="rounded-md bg-warning-soft px-3 py-2 text-sm text-foreground">
          ⚠ Jadval to'qnashuvi: {conflicts.join(", ")}
        </p>
      )}
    </Shell>
  );
}

/* ---------------- Enroll ---------------- */
export function EnrollDialog({
  open,
  onOpenChange,
  groupId,
  studentId,
}: Base & { groupId?: string; studentId?: string }) {
  const { centerId } = useCenter();
  const inv = useInvalidate();
  const groups = useQuery(groupsQ(centerId));
  const students = useQuery(studentsQ(centerId));
  const [f, setF] = useState({
    group_id: "",
    student_id: "",
    start_date: todayISO(),
    fee: "",
    discount: "",
  });
  const [err, setErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    setErr({});
    const g = groups.data?.find((x) => x.id === groupId);
    setF({
      group_id: groupId ?? "",
      student_id: studentId ?? "",
      start_date: todayISO(),
      fee: g ? String(g.monthly_fee) : "",
      discount: "",
    });
  }, [open, groupId, studentId, groups.data]);

  const group = groups.data?.find((g) => g.id === f.group_id);
  const activeCount = group?.enrollments.filter((e) => e.status === "active").length ?? 0;
  const enrolledIds = new Set(
    (students.data ?? [])
      .filter((s) => s.enrollments.some((e) => e.status === "active" && e.group_id === f.group_id))
      .map((s) => s.id),
  );

  async function submit() {
    const e: Record<string, string> = {};
    const fee = parseUZS(f.fee || "0");
    const disc = parseUZS(f.discount || "0");
    if (!f.group_id) e.group_id = "Guruhni tanlang";
    if (!f.student_id) e.student_id = "O'quvchini tanlang";
    if (isNaN(fee)) e.fee = "Summani kiriting";
    if (disc > fee) e.discount = "Chegirma to'lovdan katta bo'lmasin";
    if (enrolledIds.has(f.student_id)) e.student_id = "O'quvchi bu guruhda allaqachon bor";
    setErr(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    const { error } = await supabase.from("enrollments").insert({
      center_id: centerId,
      group_id: f.group_id,
      student_id: f.student_id,
      start_date: f.start_date,
      monthly_fee: fee,
      discount: disc || 0,
    });
    setBusy(false);
    if (error)
      return toast.error(
        error.message.includes("enrollments_one_active")
          ? "O'quvchi bu guruhda allaqachon bor"
          : error.message,
      );
    toast.success("O'quvchi guruhga qo'shildi");
    await inv("groups", "group", "students", "student", "balances", "dashboard");
    onOpenChange(false);
  }
  return (
    <Shell
      open={open}
      onOpenChange={onOpenChange}
      title="Guruhga qo'shish"
      onSubmit={submit}
      busy={busy}
      submitLabel="Qo'shish"
    >
      <Field label="Guruh" error={err.group_id}>
        <select
          className={selectCls}
          value={f.group_id}
          disabled={!!groupId}
          onChange={(ev) => {
            const g = groups.data?.find((x) => x.id === ev.target.value);
            setF({ ...f, group_id: ev.target.value, fee: g ? String(g.monthly_fee) : "" });
          }}
        >
          <option value="">— Tanlang —</option>
          {(groups.data ?? [])
            .filter((g) => g.status === "active")
            .map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
        </select>
      </Field>
      <Field label="O'quvchi" error={err.student_id}>
        <select
          className={selectCls}
          value={f.student_id}
          disabled={!!studentId}
          onChange={(ev) => setF({ ...f, student_id: ev.target.value })}
        >
          <option value="">— Tanlang —</option>
          {(students.data ?? [])
            .filter((s) => s.status !== "archived" && !enrolledIds.has(s.id))
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name} · {s.phone}
              </option>
            ))}
        </select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Boshlanish sanasi">
          <Input
            type="date"
            value={f.start_date}
            onChange={(e) => setF({ ...f, start_date: e.target.value })}
          />
        </Field>
        <Field label="Oylik to'lov" error={err.fee}>
          <Input
            value={f.fee}
            onChange={(e) => setF({ ...f, fee: e.target.value })}
            inputMode="numeric"
          />
        </Field>
        <Field label="Oylik chegirma" error={err.discount}>
          <Input
            value={f.discount}
            onChange={(e) => setF({ ...f, discount: e.target.value })}
            inputMode="numeric"
            placeholder="0"
          />
        </Field>
      </div>
      {group && activeCount >= group.capacity && (
        <p className="rounded-md bg-warning-soft px-3 py-2 text-sm text-foreground">
          ⚠ Guruh to'lgan: {activeCount}/{group.capacity}. Baribir qo'shish mumkin.
        </p>
      )}
    </Shell>
  );
}

/* ---------------- Expense ---------------- */
export type ExpenseRow = {
  id: string;
  category: string;
  amount: number;
  spent_on: string;
  description: string | null;
  reference: string | null;
};
export function ExpenseDialog({
  open,
  onOpenChange,
  expense,
}: Base & { expense?: ExpenseRow | null }) {
  const { centerId } = useCenter();
  const inv = useInvalidate();
  const [f, setF] = useState({
    category: EXPENSE_CATEGORIES[0],
    amount: "",
    spent_on: todayISO(),
    description: "",
    reference: "",
  });
  const [err, setErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) {
      setErr({});
      setF(
        expense
          ? {
              category: expense.category,
              amount: String(expense.amount),
              spent_on: expense.spent_on,
              description: expense.description ?? "",
              reference: expense.reference ?? "",
            }
          : {
              category: EXPENSE_CATEGORIES[0],
              amount: "",
              spent_on: todayISO(),
              description: "",
              reference: "",
            },
      );
    }
  }, [open, expense]);
  async function submit() {
    const e: Record<string, string> = {};
    const amount = parseUZS(f.amount);
    if (isNaN(amount) || amount <= 0) e.amount = "Summani kiriting";
    setErr(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    const payload = {
      category: f.category,
      amount,
      spent_on: f.spent_on,
      description: f.description.trim() || null,
      reference: f.reference.trim() || null,
    };
    const { error } = expense
      ? await supabase.from("expenses").update(payload).eq("id", expense.id)
      : await supabase.from("expenses").insert({ ...payload, center_id: centerId });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(expense ? "Xarajat yangilandi" : "Xarajat qo'shildi");
    await inv("expenses", "dashboard", "reports");
    onOpenChange(false);
  }
  return (
    <Shell
      open={open}
      onOpenChange={onOpenChange}
      title={expense ? "Xarajatni tahrirlash" : "Yangi xarajat"}
      onSubmit={submit}
      busy={busy}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Toifa">
          <select
            className={selectCls}
            value={f.category}
            onChange={(e) => setF({ ...f, category: e.target.value })}
          >
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Summa (so'm)" error={err.amount}>
          <Input
            value={f.amount}
            onChange={(e) => setF({ ...f, amount: e.target.value })}
            inputMode="numeric"
          />
        </Field>
        <Field label="Sana">
          <Input
            type="date"
            value={f.spent_on}
            onChange={(e) => setF({ ...f, spent_on: e.target.value })}
          />
        </Field>
        <Field label="Chek raqami (ixtiyoriy)">
          <Input value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} />
        </Field>
      </div>
      <Field label="Tavsif">
        <Textarea
          rows={2}
          value={f.description}
          onChange={(e) => setF({ ...f, description: e.target.value })}
        />
      </Field>
    </Shell>
  );
}
