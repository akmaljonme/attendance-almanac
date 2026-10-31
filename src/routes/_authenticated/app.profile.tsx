import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCenter } from "@/lib/center";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, PageHeader, Panel } from "@/components/app/ui-bits";
import { ROLE_LABELS } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/app/profile")({
  head: () => ({ meta: [{ title: "Profil — Markazly" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { userId, userName, role } = useCenter();
  const qc = useQueryClient();
  const [name, setName] = useState(userName);

  async function saveName() {
    if (name.trim().length < 2) return toast.error("Ismni kiriting");
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: name.trim() })
      .eq("id", userId);
    if (error) return toast.error(error.message);
    toast.success("Profil yangilandi");
    qc.invalidateQueries({ queryKey: ["ctx"] });
  }
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Profil" description={ROLE_LABELS[role]} />
      <Panel title="Shaxsiy ma'lumotlar" className="mb-4">
        <div className="space-y-4 p-5">
          <Field label="Ism-familiya">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Button onClick={saveName}>Saqlash</Button>
        </div>
      </Panel>
      <p className="text-sm text-muted-foreground">Yangi parol olish uchun administratorga murojaat qiling.</p>
    </div>
  );
}
