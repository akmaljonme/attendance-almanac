import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Building2, Users, Plus, Pencil, KeyRound, ShieldBan, ShieldCheck, LogOut, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { adminCommand, adminOverview, creatorStatus, type AdminCommand } from "@/lib/admin.functions";
import { pageHead } from "@/lib/page-head";
import { ROLE_LABELS } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, PageHeader, ErrorBox, LoadingRows, selectCls, StatusBadge } from "@/components/app/ui-bits";
import { Logo } from "@/components/app/logo";

export const Route = createFileRoute("/_authenticated/admin")({ head: () => pageHead("Yaratuvchi paneli", "Markazly markazlari va foydalanuvchi hisoblarini boshqarish."), component: AdminPage });
type Editor = "account" | "center" | "password" | "membership" | "edit_account" | "edit_center";
const empty = { id: "", username: "", password: "", full_name: "", phone: "", name: "", city: "", owner_id: "", center_id: "", role: "admin" as "owner" | "admin" | "teacher" | "receptionist" };
function AdminPage() {
  const { user } = Route.useRouteContext();
  const fetchStatus = useServerFn(creatorStatus); const fetchOverview = useServerFn(adminOverview); const execute = useServerFn(adminCommand);
  const qc = useQueryClient(); const navigate = useNavigate();
  const status = useQuery({ queryKey: ["creator-status"], queryFn: () => fetchStatus() });
  const q = useQuery({ queryKey: ["creator-overview"], queryFn: () => fetchOverview(), enabled: status.data === true });
  const [tab, setTab] = useState<"centers" | "accounts">("centers"); const [search, setSearch] = useState("");
  const [editor, setEditor] = useState<Editor | null>(null); const [form, setForm] = useState(empty); const [busy, setBusy] = useState(false);
  async function exit() { await qc.cancelQueries(); qc.clear(); await supabase.auth.signOut(); navigate({ to: "/login", replace: true }); }
  async function run(data: AdminCommand) { setBusy(true); try { await execute({ data }); await qc.invalidateQueries({ queryKey: ["creator-overview"] }); toast.success("Saqlandi"); setEditor(null); setForm(empty); } catch (e) { toast.error(e instanceof Error ? e.message : "Amal bajarilmadi"); } finally { setBusy(false); } }
  function open(kind: Editor, values: Partial<typeof empty> = {}) { setForm({ ...empty, ...values }); setEditor(kind); }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (editor === "account") return run({ action: "create_account", account: { username: form.username, password: form.password, full_name: form.full_name, phone: form.phone, role: form.role, ...(form.center_id ? { center_id: form.center_id } : {}) } });
    if (editor === "center") return run({ action: "create_center", name: form.name, phone: form.phone, city: form.city, owner_id: form.owner_id });
    if (editor === "edit_center") return run({ action: "edit_center", id: form.id, name: form.name, phone: form.phone, city: form.city });
    if (editor === "edit_account") return run({ action: "edit_account", id: form.id, full_name: form.full_name, phone: form.phone });
    if (editor === "password") return run({ action: "reset_password", id: form.id, password: form.password });
    return run({ action: "membership", id: form.id, center_id: form.center_id, role: form.role });
  }
  const update = (key: keyof typeof empty, value: string) => setForm((v) => ({ ...v, [key]: value }));
  const name = (id: string) => q.data?.profiles.find((p) => p.id === id)?.full_name || "—";
  const term = search.toLowerCase();
  return <div className="min-h-screen bg-background">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-card px-6 py-4"><Logo/><div className="flex gap-2"><Button variant="outline" asChild><Link to="/app/dashboard">CRM</Link></Button><Button variant="ghost" onClick={exit}><LogOut className="mr-2 h-4 w-4"/>Chiqish</Button></div></header>
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <PageHeader title="Yaratuvchi paneli" description="Markazlar va hisoblar"/>
      {status.error ? <ErrorBox error={status.error}/> : status.isPending ? <LoadingRows/> : status.data !== true ? <div className="border-l-2 border-destructive p-4"><h2 className="font-semibold">Kirishga ruxsat yo'q</h2><p className="mt-2 text-sm text-muted-foreground">Bu sahifa faqat CRM yaratuvchisi uchun.</p></div> : <>
      <div className="mb-6 grid grid-cols-2 gap-4 border-y py-5"><div><p className="text-sm text-muted-foreground">Markazlar</p><p className="mt-1 text-3xl font-semibold">{q.data?.centers.length ?? "—"}</p></div><div><p className="text-sm text-muted-foreground">Hisoblar</p><p className="mt-1 text-3xl font-semibold">{q.data?.profiles.length ?? "—"}</p></div></div>
      <div className="mb-5 flex flex-wrap items-center gap-3"><div className="flex gap-1"><Button variant={tab === "centers" ? "default" : "ghost"} onClick={() => setTab("centers")}><Building2 className="mr-2 h-4 w-4"/>Markazlar</Button><Button variant={tab === "accounts" ? "default" : "ghost"} onClick={() => setTab("accounts")}><Users className="mr-2 h-4 w-4"/>Hisoblar</Button></div><div className="relative min-w-48 flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"/><Input aria-label="Qidirish" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Qidirish"/></div><Button onClick={() => open(tab === "centers" ? "center" : "account")}><Plus className="mr-2 h-4 w-4"/>{tab === "centers" ? "Markaz qo'shish" : "Hisob qo'shish"}</Button></div>
      {q.error ? <ErrorBox error={q.error}/> : !q.data ? <LoadingRows/> : <div className="overflow-x-auto border-y"><table className="w-full text-left text-sm"><thead className="bg-muted"><tr>{(tab === "centers" ? ["Markaz", "Ega", "Shahar", "Telefon", "Amallar"] : ["Xodim / login", "Telefon", "Markaz va rol", "Holat", "Amallar"]).map((h) => <th key={h} className="whitespace-nowrap px-4 py-3 font-medium">{h}</th>)}</tr></thead><tbody>
      {tab === "centers" ? q.data.centers.filter((c) => `${c.name} ${c.city}`.toLowerCase().includes(term)).map((c) => <tr key={c.id} className="border-t"><td className="px-4 py-4 font-medium">{c.name}</td><td className="px-4 py-4">{name(c.owner_id)}</td><td className="px-4 py-4">{c.city || "—"}</td><td className="whitespace-nowrap px-4 py-4">{c.phone || "—"}</td><td className="px-4 py-4"><Button title="Markazni tahrirlash" aria-label={`${c.name} tahrirlash`} size="icon" variant="ghost" onClick={() => open("edit_center", { id: c.id, name: c.name, phone: c.phone ?? "", city: c.city ?? "" })}><Pencil className="h-4 w-4"/></Button></td></tr>) : q.data.profiles.filter((p) => `${p.full_name} ${q.data.access.find((a) => a.user_id === p.id)?.username ?? ""}`.toLowerCase().includes(term)).map((p) => { const access = q.data.access.find((a) => a.user_id === p.id); return <tr key={p.id} className="border-t"><td className="px-4 py-4"><p className="font-medium">{p.full_name || "—"}</p><p className="mt-1 text-xs text-muted-foreground">{access?.username ?? "Login biriktirilmagan"}</p></td><td className="px-4 py-4">{p.phone || "—"}</td><td className="px-4 py-4">{q.data.memberships.filter((m) => m.user_id === p.id).map((m) => <p key={m.id}>{q.data.centers.find((c) => c.id === m.center_id)?.name} · {ROLE_LABELS[m.role]}</p>)}</td><td className="px-4 py-4"><StatusBadge tone={access?.blocked ? "danger" : "success"}>{access?.blocked ? "Bloklangan" : "Faol"}</StatusBadge></td><td className="px-4 py-4"><div className="flex gap-1"><Button title="Hisobni tahrirlash" size="icon" variant="ghost" onClick={() => open("edit_account", {id:p.id,full_name:p.full_name,phone:p.phone ?? ""})}><Pencil className="h-4 w-4"/></Button><Button title="Parol berish" size="icon" variant="ghost" onClick={() => open("password", {id:p.id})}><KeyRound className="h-4 w-4"/></Button><Button title="Markaz va rol" size="icon" variant="ghost" onClick={() => open("membership", {id:p.id})}><Users className="h-4 w-4"/></Button><Button title={access?.blocked ? "Blokdan chiqarish" : "Bloklash"} size="icon" variant="ghost" disabled={busy || !access || p.id === user.id} onClick={() => { if (window.confirm(access?.blocked ? "Hisob blokdan chiqarilsinmi?" : "Hisob bloklansinmi?")) run({action:"block",id:p.id,blocked:!access?.blocked}); }}>{access?.blocked ? <ShieldCheck className="h-4 w-4"/> : <ShieldBan className="h-4 w-4"/>}</Button></div></td></tr>; })}
      </tbody></table>{(tab === "centers" ? q.data.centers.length : q.data.profiles.length) === 0 && <p className="px-4 py-10 text-center text-muted-foreground">{tab === "centers" ? "Markazlar hali yo'q" : "Hisoblar hali yo'q"}</p>}</div>}
      </>}
    </main>
    <Dialog open={editor !== null} onOpenChange={(v) => { if (!v && !busy) { setEditor(null); setForm(empty); } }}><DialogContent><DialogHeader><DialogTitle>{editor === "account" ? "Hisob qo'shish" : editor === "center" ? "Markaz qo'shish" : editor === "password" ? "Yangi parol berish" : editor === "membership" ? "Markaz va rol" : "Tahrirlash"}</DialogTitle></DialogHeader><form onSubmit={submit} className="space-y-4">
      {(editor === "account" || editor === "edit_account") && <Field label="Ism-familiya"><Input required minLength={2} value={form.full_name} onChange={(e) => update("full_name", e.target.value)}/></Field>}
      {editor === "account" && <Field label="Login"><Input required minLength={3} maxLength={40} autoComplete="off" value={form.username} onChange={(e) => update("username", e.target.value)}/></Field>}
      {(editor === "password" || editor === "account") && <Field label="Parol"><Input required minLength={8} type="password" autoComplete="new-password" value={form.password} onChange={(e) => update("password", e.target.value)}/></Field>}
      {(editor === "center" || editor === "edit_center") && <><Field label="Markaz nomi"><Input required minLength={2} value={form.name} onChange={(e) => update("name", e.target.value)}/></Field><Field label="Shahar"><Input value={form.city} onChange={(e) => update("city", e.target.value)}/></Field></>}
      {editor !== "password" && editor !== "membership" && <Field label="Telefon"><Input type="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)}/></Field>}
      {editor === "center" && <Field label="Markaz egasi"><select required className={selectCls} value={form.owner_id} onChange={(e) => update("owner_id", e.target.value)}><option value="">Tanlang</option>{q.data?.profiles.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}</select></Field>}
      {(editor === "account" || editor === "membership") && <><Field label="Markaz"><select required={editor === "membership"} className={selectCls} value={form.center_id} onChange={(e) => update("center_id", e.target.value)}><option value="">{editor === "account" ? "Keyin biriktirish" : "Tanlang"}</option>{q.data?.centers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field><Field label="Rol"><select className={selectCls} value={form.role} onChange={(e) => update("role", e.target.value)}>{Object.entries(ROLE_LABELS).map(([r,l]) => <option key={r} value={r}>{l}</option>)}</select></Field></>}
      <Button type="submit" className="w-full" disabled={busy}>{busy ? "Saqlanmoqda…" : "Saqlash"}</Button>
    </form></DialogContent></Dialog>
  </div>;
}