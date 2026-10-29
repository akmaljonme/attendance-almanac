import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/app/ui-bits";
import { AuthShell, authErrorUz } from "@/components/app/auth-shell";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Parolni tiklash — Markazly" },
      { name: "description", content: "Markazly parolingizni tiklash." },
      { property: "og:title", content: "Parolni tiklash — Markazly" },
      { property: "og:description", content: "Markazly parolingizni tiklash." },
    ],
  }),
  component: ForgotPage,
});

function ForgotPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setMsg({ ok: false, text: "To'g'ri email kiriting" });
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    setMsg(
      error
        ? { ok: false, text: authErrorUz(error.message) }
        : { ok: true, text: "Agar bu email ro'yxatdan o'tgan bo'lsa, tiklash havolasi yuborildi." },
    );
  }

  return (
    <AuthShell
      title="Parolni tiklash"
      subtitle="Emailingizni kiriting — tiklash havolasini yuboramiz."
      footer={
        <Link to="/login" className="text-primary">
          Kirish sahifasiga qaytish
        </Link>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        {msg && (
          <p
            className={`rounded-md px-3 py-2 text-sm ${msg.ok ? "bg-success-soft text-success" : "bg-destructive-soft text-destructive"}`}
          >
            {msg.text}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Havola yuborish
        </Button>
      </form>
    </AuthShell>
  );
}
