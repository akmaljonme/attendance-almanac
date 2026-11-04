import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Pencil, Trash2, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, ErrorBox, LoadingRows } from "./ui-bits";
import { supabase } from "@/integrations/supabase/client";
import { listTrustedCenters, manageTrustedCenter } from "@/lib/trusted-centers.functions";
import { trustedCenterSchema, validateLogo } from "@/lib/trusted-centers";

const empty = { id: undefined as string | undefined, name: "", logo_path: "", sort_order: 0 };
export function TrustedCentersEditor() {
  const fetchList = useServerFn(listTrustedCenters);
  const manage = useServerFn(manageTrustedCenter);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["trusted-centers"], queryFn: () => fetchList(), staleTime: 0 });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    let uploaded: string | null = null;
    try {
      let path = form.logo_path;
      if (file) {
        validateLogo(file);
        const ext = file.type === "image/png" ? "png" : file.type === "image/jpeg" ? "jpg" : "webp";
        path = `${crypto.randomUUID()}.${ext}`;
        const result = await supabase.storage.from("trusted-logos").upload(path, file, { contentType: file.type });
        if (result.error) throw new Error("Logo yuklanmadi.");
        uploaded = path;
      }
      await manage({ data: { action: "save", center: trustedCenterSchema.parse({ ...form, logo_path: path }) } });
      await qc.invalidateQueries({ queryKey: ["trusted-centers"] });
      setOpen(false); toast.success("Markaz saqlandi");
    } catch (e) {
      if (uploaded) await supabase.storage.from("trusted-logos").remove([uploaded]);
      toast.error(e instanceof Error ? e.message : "Saqlanmadi");
    } finally { setBusy(false); }
  }
  async function remove(id: string) {
    if (!window.confirm("Markaz bosh sahifadan o'chirilsinmi?")) return;
    setBusy(true);
    try { await manage({ data: { action: "delete", id } }); await qc.invalidateQueries({ queryKey: ["trusted-centers"] }); toast.success("Markaz o'chirildi"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "O'chirilmadi"); }
    finally { setBusy(false); }
  }
  return <section className="mt-12 border-t pt-8">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">Bizga ishonganlar</h2><Button onClick={() => { setForm(empty); setFile(null); setOpen(true); }}><Plus className="mr-2 h-4 w-4"/>LC qo'shish</Button></div>
    {q.error ? <ErrorBox error={q.error}/> : q.isPending ? <LoadingRows/> : q.data.length === 0 ? <p className="border-y py-8 text-sm text-muted-foreground">Hali markaz qo'shilmagan</p> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{q.data.map((row) => <div key={row.id} className="flex items-center gap-4 rounded-lg border bg-card p-4">{row.logo_url && <img src={row.logo_url} alt={row.name} className="h-14 w-14 shrink-0 object-contain"/>}<div className="min-w-0 flex-1"><p className="break-words font-medium">{row.name}</p><p className="text-xs text-muted-foreground">Tartib: {row.sort_order}</p></div><div className="flex"><Button size="icon" variant="ghost" aria-label={`${row.name} tahrirlash`} title="Tahrirlash" disabled={busy} onClick={() => { setForm({ id: row.id, name: row.name, logo_path: row.logo_path, sort_order: row.sort_order }); setFile(null); setOpen(true); }}><Pencil className="h-4 w-4"/></Button><Button size="icon" variant="ghost" aria-label={`${row.name} o'chirish`} title="O'chirish" disabled={busy} onClick={() => remove(row.id)}><Trash2 className="h-4 w-4 text-destructive"/></Button></div></div>)}</div>}
    <Dialog open={open} onOpenChange={(v) => { if (!busy) setOpen(v); }}><DialogContent><DialogHeader><DialogTitle>{form.id ? "LC tahrirlash" : "LC qo'shish"}</DialogTitle></DialogHeader><form onSubmit={save} className="space-y-4"><Field label="Markaz nomi"><Input aria-label="Markaz nomi" required minLength={2} maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}/></Field><Field label="Logo"><div className="flex items-center gap-2"><ImagePlus className="h-5 w-5 shrink-0 text-muted-foreground"/><Input aria-label="Logo" type="file" accept="image/png,image/jpeg,image/webp" required={!form.logo_path} onChange={(e) => { const next = e.target.files?.[0]; if (!next) return; try { validateLogo(next); setFile(next); } catch (err) { e.target.value = ""; toast.error(err instanceof Error ? err.message : "Rasm tanlang"); } }}/></div></Field><Field label="Tartib"><Input aria-label="Tartib" type="number" min={0} max={10000} required value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}/></Field><Button className="w-full" type="submit" disabled={busy}>{busy ? "Saqlanmoqda…" : "Saqlash"}</Button></form></DialogContent></Dialog>
  </section>;
}