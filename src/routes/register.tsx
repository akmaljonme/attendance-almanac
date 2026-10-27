import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, MailCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/app/ui-bits";
import { AuthShell, authErrorUz } from "@/components/app/auth-shell";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Ro'yxatdan o'tish — EduCRM" },
      { name: "description", content: "EduCRM'da markazingiz uchun bepul hisob yarating." },
      { property: "og:title", content: "Ro'yxatdan o'tish — EduCRM" },
      { property: "og:description", content: "EduCRM'da markazingiz uchun bepul hisob yarating." },
    ],
  }),
  component: RegisterPage,
});

const schema = z
  .object({
    full_name: z.string().trim().min(2, "Ismingizni kiriting").max(100),
    email: z.string().trim().email("To'g'ri email kiriting"),
    password: z.string().min(8, "Parol kamida 8 ta belgidan iborat bo'lsin"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Parollar mos emas" });

function RegisterPage() {
  const [err, setErr] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async (v) => {
    setErr(null);
    const { data, error } = await supabase.auth.signUp({
      email: v.email,
      password: v.password,
      options: { emailRedirectTo: `${window.location.origin}/onboarding`, data: { full_name: v.full_name } },
    });
    if (error) return setErr(authErrorUz(error.message));
    if (data.session) window.location.assign("/onboarding");
    else setSentTo(v.email);
  });

  if (sentTo) {
    return (
      <AuthShell title="Emailingizni tasdiqlang">
        <div className="rounded-xl border bg-card p-6 text-center shadow-card">
          <MailCheck className="mx-auto h-10 w-10 text-primary" />
          <p className="mt-3 text-sm text-foreground"><b>{sentTo}</b> manziliga tasdiqlash havolasi yuborildi.</p>
          <p className="mt-2 text-sm text-muted-foreground">Havolani bosgach, markazingizni sozlash bosqichiga o'tasiz. Xat kelmasa, "Spam" papkasini tekshiring.</p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Bepul boshlash"
      subtitle="1-qadam: hisob ma'lumotlari. Keyin markazingizni sozlaysiz."
      footer={<>Hisobingiz bormi? <Link to="/login" className="font-medium text-primary">Kirish</Link></>}
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field label="Ism va familiya" error={formState.errors.full_name?.message}>
          <Input autoComplete="name" placeholder="Dilnoza Karimova" {...register("full_name")} />
        </Field>
        <Field label="Email" error={formState.errors.email?.message}>
          <Input type="email" autoComplete="email" placeholder="siz@markaz.uz" {...register("email")} />
        </Field>
        <Field label="Parol" error={formState.errors.password?.message}>
          <Input type="password" autoComplete="new-password" {...register("password")} />
        </Field>
        <Field label="Parolni takrorlang" error={formState.errors.confirm?.message}>
          <Input type="password" autoComplete="new-password" {...register("confirm")} />
        </Field>
        {err && <p className="rounded-md bg-destructive-soft px-3 py-2 text-sm text-destructive">{err}</p>}
        <Button type="submit" className="w-full" disabled={formState.isSubmitting}>
          {formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Ro'yxatdan o'tish
        </Button>
      </form>
    </AuthShell>
  );
}
