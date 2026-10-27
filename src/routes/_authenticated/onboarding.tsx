import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Loader2, Check } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Field, selectCls } from "@/components/app/ui-bits";
import { Logo } from "@/components/app/logo";
import { normalizePhone } from "@/lib/format";
import { PLANS } from "@/lib/plans";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Markazni sozlash — EduCRM" }, { name: "description", content: "O'quv markazingizni sozlang." }] }),
  component: Onboarding,
});

const TYPES = ["Ingliz tili markazi", "IELTS / CEFR tayyorlov", "Matematika markazi", "Dasturlash akademiyasi", "Ko'p fanli markaz", "Boshqa"];
const CITIES = ["Toshkent", "Samarqand", "Buxoro", "Andijon", "Farg'ona", "Namangan", "Qarshi", "Nukus", "Urganch", "Jizzax", "Navoiy", "Termiz", "Guliston", "Boshqa"];

function Onboarding() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState(1);
  const [checking, setChecking] = useState(true);
  const [form, setForm] = useState({ name: "", phone: "", city: "Toshkent", type: TYPES[0], plan: "pro", prorate: true });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const inflight = useRef(false);

  useEffect(() => {
    supabase.from("center_memberships").select("id").limit(1).then(({ data }) => {
      if (data && data.length) navigate({ to: "/app/dashboard", replace: true });
      else setChecking(false);
    });
  }, [navigate]);

  function next() {
    const e: Record<string, string> = {};
    if (form.name.trim().length < 2) e.name = "Markaz nomini kiriting";
    if (!normalizePhone(form.phone)) e.phone = "Telefon raqam: +998 90 123 45 67 ko'rinishida";
    setErrors(e);
    if (!Object.keys(e).length) setStep(2);
  }

  async function finish() {
    if (inflight.current) return;
    inflight.current = true;
    setBusy(true);
    const { error } = await supabase.rpc("create_center", {
      _name: form.name, _phone: normalizePhone(form.phone)!, _city: form.city, _type: form.type, _plan: form.plan, _prorate: form.prorate,
    });
    setBusy(false);
    inflight.current = false;
    if (error) return toast.error("Markazni yaratib bo'lmadi: " + error.message);
    await qc.invalidateQueries();
    toast.success("Markazingiz tayyor!");
    navigate({ to: "/app/dashboard", replace: true });
  }

  if (checking) return <div className="grid min-h-screen place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-xl px-4 py-12">
        <Logo />
        <div className="mt-8 flex items-center gap-2 text-xs font-medium">
          {["Markaz ma'lumotlari", "Sozlamalar va tarif"].map((l, i) => (
            <div key={l} className="flex items-center gap-2">
              <span className={`grid h-6 w-6 place-items-center rounded-full ${step > i ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {step > i + 1 ? <Check className="h-3.5 w-3.5" /> : i + 2}
              </span>
              <span className={step > i ? "text-foreground" : "text-muted-foreground"}>{l}</span>
              {i === 0 && <span className="mx-2 h-px w-8 bg-border" />}
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-xl border bg-card p-6 shadow-card">
          {step === 1 ? (
            <div className="space-y-4">
              <h1 className="text-xl font-semibold">O'quv markazingiz haqida</h1>
              <Field label="Markaz nomi" error={errors.name}><Input value={form.name} onChange={set("name")} placeholder="Bilim Plus o'quv markazi" /></Field>
              <Field label="Telefon raqami" error={errors.phone}><Input value={form.phone} onChange={set("phone")} placeholder="+998 90 123 45 67" inputMode="tel" /></Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Shahar"><select className={selectCls} value={form.city} onChange={set("city")}>{CITIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
                <Field label="Markaz turi"><select className={selectCls} value={form.type} onChange={set("type")}>{TYPES.map((c) => <option key={c}>{c}</option>)}</select></Field>
              </div>
              <Button className="w-full" onClick={next}>Davom etish</Button>
            </div>
          ) : (
            <div className="space-y-5">
              <h1 className="text-xl font-semibold">Asosiy sozlamalar</h1>
              <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
                <div>
                  <p className="text-sm font-medium">Birinchi oyni kunlar bo'yicha hisoblash</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Oy o'rtasida qo'shilgan o'quvchi qolgan kunlar uchungina to'laydi.</p>
                </div>
                <Switch checked={form.prorate} onCheckedChange={(v) => setForm({ ...form, prorate: v })} />
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">Tarif (14 kun bepul)</p>
                <div className="grid gap-2">
                  {PLANS.map((p) => (
                    <button key={p.id} type="button" onClick={() => setForm({ ...form, plan: p.id })}
                      className={`flex items-center justify-between rounded-lg border p-3 text-left text-sm transition ${form.plan === p.id ? "border-primary bg-primary-soft" : "hover:bg-muted"}`}>
                      <span><b>{p.name}</b> <span className="text-muted-foreground">— {p.desc}</span></span>
                      <span className="tabular">{p.price} so'm</span>
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Narxlar boshlang'ich taklif bo'lib, o'zgarishi mumkin.</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)}>Orqaga</Button>
                <Button className="flex-1" onClick={finish} disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Markazni yaratish</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
