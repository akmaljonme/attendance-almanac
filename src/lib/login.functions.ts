import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { usernameEmail, usernameSchema } from "./access";
import { assertLoginAllowed, type LoginGuard } from "./login-guard";
import type { Database } from "@/integrations/supabase/types";

export const usernameLogin = createServerFn({ method: "POST" })
  .inputValidator((v: { username: string; password: string }) => z.object({ username: usernameSchema, password: z.string().min(1).max(128) }).parse(v))
  .handler(async ({ data }) => {
    // Server muhitida o'zgaruvchi bo'lmasa, build vaqtida kiritilgan VITE_ qiymatlariga tayanamiz.
    const url =
      process.env["SUPABASE_URL"] ||
      process.env["VITE_SUPABASE_URL"] ||
      import.meta.env["VITE_SUPABASE_URL"];
    const key =
      process.env["SUPABASE_PUBLISHABLE_KEY"] ||
      process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
      import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
    if (!url || !key) throw new Error("Kirish xizmati mavjud emas");
    // Narrow public-login exception: privileged access is limited to the guard RPCs
    // and a temporary Auth ban, never account lists or privileged user data.
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    const reservation = await admin.rpc("begin_admin_login", { _username: data.username });
    if (reservation.error) throw new Error("Kirish himoyasi mavjud emas. Keyinroq qayta urinib ko'ring.");
    const guard = reservation.data as LoginGuard | null;
    if (!guard) throw new Error("Kirish himoyasi mavjud emas.");
    assertLoginAllowed(guard);
    const finish = async (outcome: "success" | "failure" | "cancel") => {
      if (!guard.token) return;
      const result = await admin.rpc("finish_admin_login", { _username: data.username, _token: guard.token, _outcome: outcome });
      if (result.error) throw new Error("Kirish himoyasi mavjud emas. Keyinroq qayta urinib ko'ring.");
      const state = result.data as { locked_until?: string | null; user_id?: string | null } | null;
      if (state?.locked_until && state.user_id) {
        // Also block the direct password endpoint; never shorten an existing ban.
        const current = await admin.auth.admin.getUserById(state.user_id);
        if (current.error || !current.data.user) throw new Error("Kirish himoyasi mavjud emas.");
        const existing = current.data.user.banned_until;
        if (!existing || Date.parse(existing) < Date.parse(state.locked_until)) {
          const remaining = Math.max(1, Math.ceil((Date.parse(state.locked_until) - Date.now()) / 1000));
          const ban = await admin.auth.admin.updateUserById(state.user_id, { ban_duration: `${remaining}s` });
          if (ban.error) throw new Error("Kirish vaqtincha cheklangan. Keyinroq qayta urinib ko'ring.");
        }
        assertLoginAllowed({ protected: true, locked_until: state.locked_until });
      }
    };
    const client = createClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      } },
    });
    let r: Awaited<ReturnType<typeof client.auth.signInWithPassword>>;
    try { r = await client.auth.signInWithPassword({ email: usernameEmail(data.username), password: data.password }); }
    catch { await finish("cancel"); throw new Error("Kirish xizmati bilan aloqa yo'q. Qayta urinib ko'ring."); }
    if (r.error || !r.data.session) {
      await finish(r.error?.code === "invalid_credentials" ? "failure" : "cancel");
      throw new Error("Login yoki parol noto'g'ri, yoki hisob bloklangan.");
    }
    const active = await client.rpc("account_active");
    if (active.error || active.data !== true) { await finish("cancel"); await client.auth.signOut(); throw new Error("Hisobga kirish bloklangan."); }
    await finish("success");
    return { access_token: r.data.session.access_token, refresh_token: r.data.session.refresh_token };
  });
