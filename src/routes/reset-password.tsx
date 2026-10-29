import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/app/ui-bits";
import { AuthShell, authErrorUz } from "@/components/app/auth-shell";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Yangi parol — Markazly" },
      { name: "description", content: "Markazly uchun yangi parol o'rnating." },
      { property: "og:title", content: "Yangi parol — Markazly" },
      { property: "og:description", content: "Markazly uchun yangi parol o'rnating." },
    ],
  }),
  component: ResetPage,
});

function ResetPage() {
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return setErr("Parol kamida 8 ta belgidan iborat bo'lsin");
    if (pw !== pw2) return setErr("Parollar mos emas");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setErr(authErrorUz(error.message));
    navigate({ to: "/app/dashboard" });
  }

  return (
    <AuthShell title="Yangi parol o'rnatish">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Yangi parol"><Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} /></Field>
        <Field label="Parolni takrorlang"><Input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} /></Field>
        {err && <p className="rounded-md bg-destructive-soft px-3 py-2 text-sm text-destructive">{err}</p>}
        <Button type="submit" className="w-full" disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Saqlash</Button>
      </form>
    </AuthShell>
  );
}
