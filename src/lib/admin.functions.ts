import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { issuedAccountSchema, requireCreatorRole, usernameEmail } from "./access";

export const creatorStatus = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "creator" });
  if (error) throw new Error(error.message);
  return data === true;
});

export const adminOverview = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const role = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "creator" });
  requireCreatorRole(!role.error && role.data === true);
  const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
  const results = await Promise.all([
    admin.from("centers").select("id,name,phone,city,owner_id,created_at").order("created_at", { ascending: false }),
    admin.from("profiles").select("id,full_name,phone"),
    admin.from("account_access").select("*"),
    admin.from("center_memberships").select("id,center_id,user_id,role"),
    admin.from("creator_audit").select("id,action,target_id,created_at").order("created_at", { ascending: false }).limit(30),
  ]);
  for (const r of results) if (r.error) throw new Error(r.error.message);
  return { centers: results[0].data ?? [], profiles: results[1].data ?? [], access: results[2].data ?? [], memberships: results[3].data ?? [], audit: results[4].data ?? [] };
});

const commandSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create_account"), account: issuedAccountSchema }),
  z.object({ action: z.literal("create_center"), name: z.string().trim().min(2).max(100), phone: z.string().max(30), city: z.string().max(100), owner_id: z.string().uuid() }),
  z.object({ action: z.literal("edit_center"), id: z.string().uuid(), name: z.string().trim().min(2).max(100), phone: z.string().max(30), city: z.string().max(100) }),
  z.object({ action: z.literal("reset_password"), id: z.string().uuid(), password: z.string().min(8).max(128) }),
  z.object({ action: z.literal("block"), id: z.string().uuid(), blocked: z.boolean() }),
  z.object({ action: z.literal("membership"), id: z.string().uuid(), center_id: z.string().uuid(), role: z.enum(["owner", "admin", "teacher", "receptionist"]) }),
  z.object({ action: z.literal("edit_account"), id: z.string().uuid(), full_name: z.string().trim().min(2).max(100), phone: z.string().max(30) }),
]);
export type AdminCommand = z.infer<typeof commandSchema>;

export const adminCommand = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: AdminCommand) => commandSchema.parse(input)).handler(async ({ context, data }) => {
  const role = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "creator" });
  requireCreatorRole(!role.error && role.data === true);
  const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
  const check = (r: { error: { message: string } | null }) => { if (r.error) throw new Error(r.error.message); };
  let target: string | undefined;
  if (data.action === "create_account") {
    const a = data.account;
    const result = await admin.auth.admin.createUser({ email: usernameEmail(a.username), password: a.password, email_confirm: true, app_metadata: { admin_provisioned: true }, user_metadata: { full_name: a.full_name, phone: a.phone } });
    check(result);
    const user = result.data.user;
    if (!user) throw new Error("Hisob yaratilmadi");
    target = user.id;
    try {
      check(await admin.from("account_access").insert({ user_id: user.id, username: a.username }));
      if (a.center_id) check(await admin.from("center_memberships").insert({ user_id: user.id, center_id: a.center_id, role: a.role }));
    } catch (error) {
      await admin.auth.admin.deleteUser(user.id);
      throw error;
    }
  } else if (data.action === "create_center") {
    const r = await admin.rpc("creator_create_center", { _name: data.name, _phone: data.phone, _city: data.city, _owner: data.owner_id });
    check(r); target = r.data ?? undefined;
  } else if (data.action === "edit_center") {
    target = data.id;
    check(await admin.from("centers").update({ name: data.name, phone: data.phone, city: data.city }).eq("id", data.id));
  } else if (data.action === "reset_password") {
    target = data.id;
    check(await admin.auth.admin.updateUserById(data.id, { password: data.password }));
  } else if (data.action === "block") {
    if (data.id === context.userId) throw new Error("O'zingizni bloklay olmaysiz");
    target = data.id;
    const access = await admin.from("account_access").select("user_id").eq("user_id", data.id).maybeSingle();
    if (!access.data) throw new Error("Avval hisobga login biriktirilishi kerak");
    check(await admin.from("account_access").update({ blocked: data.blocked }).eq("user_id", data.id));
    const r = await admin.auth.admin.updateUserById(data.id, { ban_duration: data.blocked ? "876000h" : "none" });
    if (r.error) { await admin.from("account_access").update({ blocked: !data.blocked }).eq("user_id", data.id); check(r); }
  } else if (data.action === "edit_account") {
    target = data.id;
    check(await admin.from("profiles").update({ full_name: data.full_name, phone: data.phone }).eq("id", data.id));
  } else {
    target = data.id;
    const center = await admin.from("centers").select("owner_id").eq("id", data.center_id).single();
    check(center);
    if (center.data?.owner_id === data.id && data.role !== "owner") throw new Error("Markaz egasining rolini pasaytirib bo'lmaydi");
    if (data.role === "owner" && center.data?.owner_id !== data.id) throw new Error("Markazga faqat bitta ega biriktiriladi");
    check(await admin.from("center_memberships").upsert({ user_id: data.id, center_id: data.center_id, role: data.role }, { onConflict: "center_id,user_id" }));
  }
  check(await admin.from("creator_audit").insert({ actor_id: context.userId, action: data.action, target_id: target, details: {} }));
  return { ok: true };
});