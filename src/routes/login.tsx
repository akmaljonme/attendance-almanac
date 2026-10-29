import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/app/ui-bits";
import { AuthShell, authErrorUz } from "@/components/app/auth-shell";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Kirish — Markazly" },
      { name: "description", content: "Markazly hisobingizga kiring." },
      { property: "og:title", content: "Kirish — Markazly" },
      { property: "og:description", content: "Markazly hisobingizga kiring." },
    ],
  }),
  component: LoginPage,
});

const schema = z.object({
  email: z.string().trim().email("To'g'ri email kiriting"),
  password: z.string().min(1, "Parolni kiriting"),
});

function LoginPage() {
  const navigate = useNavigate();
  const [err, setErr] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async (v) => {
    setErr(null);
    const { error } = await supabase.auth.signInWithPassword(v);
    if (error) return setErr(authErrorUz(error.message));
    navigate({ to: "/app/dashboard" });
  });

  return (
    <AuthShell
      title="Hisobga kirish"
      subtitle="Markazingiz boshqaruv paneliga kiring"
      footer={<>Hisobingiz yo'qmi? <Link to="/register" className="font-medium text-primary">Ro'yxatdan o'ting</Link></>}
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field label="Email" error={formState.errors.email?.message}>
          <Input type="email" autoComplete="email" placeholder="siz@markaz.uz" {...register("email")} />
        </Field>
        <Field label="Parol" error={formState.errors.password?.message}>
          <Input type="password" autoComplete="current-password" {...register("password")} />
        </Field>
        <div className="text-right text-sm">
          <Link to="/forgot-password" className="text-primary">Parolni unutdingizmi?</Link>
        </div>
        {err && <p className="rounded-md bg-destructive-soft px-3 py-2 text-sm text-destructive">{err}</p>}
        <Button type="submit" className="w-full" disabled={formState.isSubmitting}>
          {formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Kirish
        </Button>
      </form>
    </AuthShell>
  );
}
