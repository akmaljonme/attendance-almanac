import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireCreatorRole } from "./access";
import { trustedCenterSchema } from "./trusted-centers";

export const listTrustedCenters = createServerFn({ method: "GET" }).handler(async () => {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const client = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
      headers.set("apikey", key);
      return fetch(input, { ...init, headers });
    } },
  });
  const { data, error } = await client.from("trusted_centers").select("id,name,logo_path,sort_order").order("sort_order").order("created_at");
  if (error) throw new Error("Markazlar ro'yxati yuklanmadi.");
  return Promise.all((data ?? []).map(async (row) => {
    const signed = await client.storage.from("trusted-logos").createSignedUrl(row.logo_path, 3600);
    const url = signed.data?.signedUrl;
    // Storage requests use the internal server host; image URLs must use the browser host.
    const browserBase = import.meta.env.VITE_SUPABASE_URL;
    const logo_url = url && browserBase ? `${browserBase}${new URL(url).pathname}${new URL(url).search}` : null;
    return { ...row, logo_url };
  }));
});

const command = z.discriminatedUnion("action", [
  z.object({ action: z.literal("save"), center: trustedCenterSchema }),
  z.object({ action: z.literal("delete"), id: z.string().uuid() }),
]);
export const manageTrustedCenter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: z.infer<typeof command>) => command.parse(input))
  .handler(async ({ context, data }) => {
    const role = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "creator" });
    requireCreatorRole(!role.error && role.data === true);
    if (data.action === "delete") {
      const row = await context.supabase.from("trusted_centers").select("logo_path").eq("id", data.id).single();
      if (row.error) throw new Error("Markaz topilmadi.");
      const removed = await context.supabase.from("trusted_centers").delete().eq("id", data.id);
      if (removed.error) throw new Error("Markaz o'chirilmadi.");
      await context.supabase.storage.from("trusted-logos").remove([row.data.logo_path]);
    } else {
      const { id, ...values } = data.center;
      const old = id ? await context.supabase.from("trusted_centers").select("logo_path").eq("id", id).single() : null;
      if (old?.error) throw new Error("Markaz topilmadi.");
      const file = await context.supabase.storage.from("trusted-logos").createSignedUrl(values.logo_path, 60);
      if (file.error) throw new Error("Avval markaz logosini yuklang.");
      const saved = id
        ? await context.supabase.from("trusted_centers").update(values).eq("id", id)
        : await context.supabase.from("trusted_centers").insert(values);
      if (saved.error) throw new Error("Markaz saqlanmadi.");
      if (old?.data && old.data.logo_path !== values.logo_path) await context.supabase.storage.from("trusted-logos").remove([old.data.logo_path]);
    }
    return { ok: true };
  });