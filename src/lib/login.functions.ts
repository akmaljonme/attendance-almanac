import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { usernameEmail, usernameSchema } from "./access";

export const captchaConfig = createServerFn({ method: "GET" }).handler(() => ({ siteKey: process.env["TURNSTILE_SITE_KEY"] ?? null }));
export const usernameLogin = createServerFn({ method: "POST" })
  .inputValidator((v: { username: string; password: string; captcha: string }) => z.object({ username: usernameSchema, password: z.string().min(1).max(128), captcha: z.string().min(1).max(4096) }).parse(v))
  .handler(async ({ data }) => {
    const secret = process.env["TURNSTILE_SECRET_KEY"];
    if (!secret) throw new Error("Robot tekshiruvi hali ulanmagan. Administratorga murojaat qiling.");
    const verification = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: new URLSearchParams({ secret, response: data.captcha }) });
    if (!verification.ok) throw new Error("Robot tekshiruvi ishlamadi. Qayta urinib ko'ring.");
    const verdict = await verification.json() as { success: boolean };
    if (!verdict.success) throw new Error("Robot emasligingizni qayta tasdiqlang.");
    const url = process.env["SUPABASE_URL"];
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
    if (!url || !key) throw new Error("Kirish xizmati mavjud emas");
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const r = await client.auth.signInWithPassword({ email: usernameEmail(data.username), password: data.password });
    if (r.error || !r.data.session) throw new Error("Login yoki parol noto'g'ri, yoki hisob bloklangan.");
    const active = await client.rpc("account_active");
    if (active.error || active.data !== true) { await client.auth.signOut(); throw new Error("Hisobga kirish bloklangan."); }
    return { access_token: r.data.session.access_token, refresh_token: r.data.session.refresh_token };
  });