import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import type { Database } from "@/integrations/supabase/types";

const enabled = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
describe.skipIf(!enabled)("Durable admin lockout rules", () => {
  it("locks on exactly five consecutive failures for fifteen minutes, resets on success and unlocks after expiry", async () => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Missing integration configuration");
    const admin = createClient<Database>(url, key, { auth: { persistSession: false }, global: { fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
      headers.set("apikey", key);
      return fetch(input, { ...init, headers });
    } } });
    const username = `guard-test-${crypto.randomUUID().slice(0, 8)}`;
    const provision = crypto.randomUUID();
    const issued = await admin.from("provision_tokens").insert({ token: provision, expires_at: new Date(Date.now() + 60000).toISOString() });
    if (issued.error) throw issued.error;
    const created = await admin.auth.admin.createUser({ email: `${username}@accounts.markazly.local`, password: crypto.randomUUID(), email_confirm: true, app_metadata: { admin_provisioned: true }, user_metadata: { full_name: "Guard integration test", provision_token: provision } });
    if (created.error || !created.data.user) throw new Error("Test account creation failed");
    const uid = created.data.user.id;
    try {
      const access = await admin.from("account_access").insert({ user_id: uid, username });
      if (access.error) throw access.error;
      const role = await admin.from("user_roles").insert({ user_id: uid, role: "creator" });
      if (role.error) throw role.error;
      const begin = async () => {
        const r = await admin.rpc("begin_admin_login", { _username: username });
        if (r.error) throw r.error;
        return r.data as { token?: string; busy?: boolean; locked_until?: string };
      };
      const finish = async (token: string | undefined, outcome: string) => {
        if (!token) throw new Error("Missing reservation");
        const r = await admin.rpc("finish_admin_login", { _username: username, _token: token, _outcome: outcome });
        if (r.error) throw r.error;
        return r.data as { locked_until?: string | null };
      };
      const first = await begin();
      expect((await begin()).busy).toBe(true);
      await finish(first.token, "failure");
      await finish((await begin()).token, "success");
      expect((await admin.from("admin_login_guards").select("failures").eq("username", username).single()).data?.failures).toBe(0);
      for (let i = 1; i <= 5; i++) {
        const before = Date.now();
        const result = await finish((await begin()).token, "failure");
        if (i < 5) expect(result.locked_until).toBeNull();
        else {
          expect(result.locked_until).toBeTruthy();
          const duration = Date.parse(result.locked_until ?? "") - before;
          expect(duration).toBeGreaterThanOrEqual(15 * 60 * 1000 - 1000);
          expect(duration).toBeLessThan(15 * 60 * 1000 + 10000);
        }
      }
      expect((await begin()).locked_until).toBeTruthy();
      const expire = await admin.from("admin_login_guards").update({ locked_until: new Date(Date.now() - 1000).toISOString() }).eq("username", username);
      if (expire.error) throw expire.error;
      expect((await begin()).token).toBeTruthy();
      expect((await admin.from("admin_login_guards").select("failures").eq("username", username).single()).data?.failures).toBe(0);
    } finally {
      await admin.from("account_access").delete().eq("user_id", uid);
      await admin.auth.admin.deleteUser(uid);
      await admin.from("provision_tokens").delete().eq("token", provision);
    }
  }, 60000);
});