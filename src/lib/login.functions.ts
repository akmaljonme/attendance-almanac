import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { usernameEmail, usernameSchema } from "./access";

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
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const r = await client.auth.signInWithPassword({ email: usernameEmail(data.username), password: data.password });
    if (r.error || !r.data.session) throw new Error("Login yoki parol noto'g'ri, yoki hisob bloklangan.");
    const active = await client.rpc("account_active");
    if (active.error || active.data !== true) { await client.auth.signOut(); throw new Error("Hisobga kirish bloklangan."); }
    return { access_token: r.data.session.access_token, refresh_token: r.data.session.refresh_token };
  });
