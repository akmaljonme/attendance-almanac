import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/app/ui-bits";
import { AuthShell } from "@/components/app/auth-shell";
import { usernameLogin } from "@/lib/login.functions";
import { creatorStatus } from "@/lib/admin.functions";
import { usernameSchema } from "@/lib/access";
import { pageHead } from "@/lib/page-head";

export const Route = createFileRoute("/login")({
  head: () => pageHead("Kirish", "Markazly hisobingizga administrator bergan login bilan kiring."),
  component: LoginPage,
});

const schema = z.object({
  username: usernameSchema,
  password: z.string().min(1, "Parolni kiriting"),
});

function LoginPage() {
  const navigate = useNavigate();
  const [err, setErr] = useState<string | null>(null);
  const login = useServerFn(usernameLogin);
  const status = useServerFn(creatorStatus);
  const { register, handleSubmit, formState } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
  });

  const onSubmit = handleSubmit(async (v) => {
    setErr(null);
    try {
      const tokens = await login({ data: v });
      const { error } = await supabase.auth.setSession(tokens);
      if (error) throw error;
      const creator = await status();
      navigate({ to: creator ? "/admin" : "/app/dashboard" });
    } catch (error) { setErr(error instanceof Error ? error.message : "Kirish amalga oshmadi"); }
  });

  return (
    <AuthShell
      title="Hisobga kirish"
      subtitle="Administrator bergan login va parol"
      footer="Parolni unutdingizmi? Administratorga murojaat qiling."
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field label="Login" error={formState.errors.username?.message}>
          <Input
            aria-label="Login"
            autoComplete="username"
            placeholder="Login"
            {...register("username")}
          />
        </Field>
        <Field label="Parol" error={formState.errors.password?.message}>
          <Input aria-label="Parol" type="password" autoComplete="current-password" {...register("password")} />
        </Field>
        {err && (
          <p className="rounded-md bg-destructive-soft px-3 py-2 text-sm text-destructive">{err}</p>
        )}
        <Button type="submit" className="w-full" disabled={formState.isSubmitting}>
          {formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Kirish
        </Button>
      </form>
    </AuthShell>
  );
}
