import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCenter } from "@/lib/center";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ErrorBox, Field, LoadingRows, PageHeader, Panel } from "@/components/app/ui-bits";
import { formatDate, normalizePhone } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/app/settings/")({
  head: () => ({ meta: [{ title: "Sozlamalar — EduCRM" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { centerId } = useCenter();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["center", centerId],
    queryFn: async () => {
      const [c, s] = await Promise.all([
        supabase.from("centers").select("*").eq("id", centerId).single(),
        supabase.from("subscriptions").select("*").eq("center_id", centerId).maybeSingle(),
      ]);
      if (c.error) throw new Error(c.error.message);
      return { c: c.data, s: s.data };
    },
  });
  const [f, setF] = useState({ name: "", phone: "", city: "", address: "", contact_email: "", prorate: true });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (q.data) setF({ name: q.data.c.name, phone: q.data.c.phone ?? "", city: q.data.c.city ?? "", address: q.data.c.address ?? "", contact_email: q.data.c.contact_email ?? "", prorate: q.data.c.prorate_first_month });
  }, [q.data]);

  async function save() {
    if (f.name.trim().length < 2) return toast.error("Markaz nomini kiriting");
    const phone = f.phone ? normalizePhone(f.phone) : null;
    if (f.phone && !phone) return toast.error("Telefon raqami noto'g'ri");
    setBusy(true);
    const { error } = await supabase.from("centers").update({ name: f.name.trim(), phone, city: f.city || null, address: f.address || null, contact_email: f.contact_email || null, prorate_first_month: f.prorate }).eq("id", centerId);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Sozlamalar saqlandi");
    qc.invalidateQueries();
  }

  if (q.error) return <ErrorBox error={q.error} />;
  if (!q.data) return <LoadingRows />;
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Markaz sozlamalari" actions={<Button variant="outline" asChild><Link to="/app/settings/users"><Users className="mr-1.5 h-4 w-4" />Xodimlar</Link></Button>} />
      <Panel title="Asosiy ma'lumotlar" className="mb-4">
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Markaz nomi"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Telefon"><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
          <Field label="Shahar"><Input value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></Field>
          <Field label="Aloqa uchun email"><Input value={f.contact_email} onChange={(e) => setF({ ...f, contact_email: e.target.value })} /></Field>
          <div className="sm:col-span-2"><Field label="Manzil"><Input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field></div>
        </div>
      </Panel>
      <Panel title="To'lov hisoblash qoidalari" className="mb-4">
        <div className="flex items-start justify-between gap-4 p-5">
          <div>
            <p className="text-sm font-medium">Birinchi oyni kunlar bo'yicha hisoblash</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Yoqilgan bo'lsa, oy o'rtasida qo'shilgan o'quvchi birinchi oy uchun qolgan kunlarga mutanosib to'laydi. Valyuta: UZS, vaqt zonasi: Asia/Tashkent.</p>
          </div>
          <Switch checked={f.prorate} onCheckedChange={(v) => setF({ ...f, prorate: v })} />
        </div>
      </Panel>
      {q.data.s && (
        <Panel title="Obuna" className="mb-4">
          <p className="p-5 text-sm">Tarif: <b className="capitalize">{q.data.s.plan}</b> · Holat: {q.data.s.status === "trial" ? "Sinov davri" : q.data.s.status} · Sinov tugashi: {formatDate(q.data.s.trial_ends_at.slice(0, 10))}</p>
        </Panel>
      )}
      <div className="flex justify-end"><Button onClick={save} disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Saqlash</Button></div>
    </div>
  );
}
