import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { issuedAccountSchema, requireCreatorRole, usernameEmail } from "./access";
import { nextPeriod } from "./billing-rules";
import { todayISO } from "./format";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

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
  // Obuna jadvallari (0003_center_billing.sql) hali yaratilmagan bo'lsa, panel baribir ishlaydi.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = admin as any;
  const [subs, subPays] = await Promise.all([
    raw.from("subscriptions").select("center_id,plan,status,paid_until"),
    raw
      .from("subscription_payments")
      .select("id,center_id,plan,amount,months,period_start,period_end,paid_on,method,note")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  const billingReady = !subs.error && !subPays.error && (subs.data ?? []).every((x: { paid_until?: unknown }) => "paid_until" in x);
  const billing = {
    ready: billingReady,
    subscriptions: (billingReady ? subs.data : []) as BillingSub[],
    payments: (billingReady ? subPays.data : []) as BillingPayment[],
  };
  return { billing, centers: results[0].data ?? [], profiles: results[1].data ?? [], access: results[2].data ?? [], memberships: results[3].data ?? [], audit: results[4].data ?? [] };
});

function friendlyError(message: string) {
  if (message.includes("centers_owner_id_key")) return "Bu hisob allaqachon boshqa markazning egasi. Har bir markaz uchun alohida hisob yarating.";
  if (message.includes("already been registered") || message.includes("already registered")) return "Bu login band. Boshqa login tanlang.";
  if (message.includes("account_access_username_key")) return "Bu login band. Boshqa login tanlang.";
  return message;
}

export type BillingSub = { center_id: string; plan: string; status: string; paid_until: string | null };
export type BillingPayment = {
  id: string; center_id: string; plan: string; amount: number; months: number;
  period_start: string; period_end: string; paid_on: string; method: string; note: string | null;
};

const commandSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create_account"), account: issuedAccountSchema }),
  z.object({ action: z.literal("create_center"), name: z.string().trim().min(2).max(100), phone: z.string().max(30), city: z.string().max(100), owner_id: z.string().uuid() }),
  z.object({ action: z.literal("edit_center"), id: z.string().uuid(), name: z.string().trim().min(2).max(100), phone: z.string().max(30), city: z.string().max(100) }),
  z.object({ action: z.literal("reset_password"), id: z.string().uuid(), password: z.string().min(8).max(128) }),
  z.object({ action: z.literal("block"), id: z.string().uuid(), blocked: z.boolean() }),
  z.object({ action: z.literal("membership"), id: z.string().uuid(), center_id: z.string().uuid(), role: z.enum(["owner", "admin", "teacher", "receptionist"]) }),
  z.object({
    action: z.literal("subscription_payment"),
    center_id: z.string().uuid(),
    plan: z.enum(["start", "pro", "business"]),
    months: z.number().int().min(1).max(36),
    amount: z.number().int().min(0).max(1_000_000_000),
    paid_on: isoDate,
    method: z.enum(["cash", "card", "transfer", "other"]),
    note: z.string().trim().max(200),
  }),
  z.object({ action: z.literal("set_paid_until"), center_id: z.string().uuid(), paid_until: isoDate, note: z.string().trim().min(3).max(200) }),
  z.object({ action: z.literal("edit_account"), id: z.string().uuid(), full_name: z.string().trim().min(2).max(100), phone: z.string().max(30) }),
]);
export type AdminCommand = z.infer<typeof commandSchema>;

/** Audit jurnaliga yoziladigan qo'shimcha ma'lumot (parol kabi maxfiy narsalar yozilmaydi). */
function auditDetails(data: AdminCommand): Record<string, string | number> {
  if (data.action === "subscription_payment") return { plan: data.plan, months: data.months, amount: data.amount };
  if (data.action === "set_paid_until") return { paid_until: data.paid_until, note: data.note };
  return {};
}

export const adminCommand = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: AdminCommand) => commandSchema.parse(input)).handler(async ({ context, data }) => {
  const role = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "creator" });
  requireCreatorRole(!role.error && role.data === true);
  const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
  const check = (r: { error: { message: string } | null }) => { if (r.error) throw new Error(friendlyError(r.error.message)); };
  let target: string | undefined;
  if (data.action === "create_account") {
    const a = data.account;
    if (a.center_id && a.role === "owner") throw new Error("Markaz egasi markaz yaratilganda biriktiriladi");
    // Bir martalik token: Auth hisobni yozayotganda app_metadata trigger'ga ko'rinmasligi mumkin.
    const provisionToken = crypto.randomUUID();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const issued = await (admin as any).from("provision_tokens").insert({ token: provisionToken, expires_at: new Date(Date.now() + 60_000).toISOString() });
    const result = await admin.auth.admin.createUser({ email: usernameEmail(a.username), password: a.password, email_confirm: true, app_metadata: { admin_provisioned: true }, user_metadata: { full_name: a.full_name, phone: a.phone, ...(issued.error ? {} : { provision_token: provisionToken }) } });
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
    const owner = await admin.from("profiles").select("id").eq("id", data.owner_id).single();
    check(owner);
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
  } else if (data.action === "subscription_payment") {
    target = data.center_id;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = admin as any;
    const sub = await db.from("subscriptions").select("paid_until").eq("center_id", data.center_id).maybeSingle();
    check(sub);
    if (!sub.data) throw new Error("Markazning obunasi topilmadi");
    const period = nextPeriod(sub.data.paid_until, data.months, todayISO());
    const ins = await db.from("subscription_payments").insert({
      center_id: data.center_id, plan: data.plan, amount: data.amount, months: data.months,
      period_start: period.start, period_end: period.end, paid_on: data.paid_on,
      method: data.method, note: data.note || null, recorded_by: context.userId,
    }).select("id").single();
    check(ins);
    const upd = await db.from("subscriptions").update({ plan: data.plan, status: "active", paid_until: period.end }).eq("center_id", data.center_id);
    if (upd.error) {
      await db.from("subscription_payments").delete().eq("id", ins.data.id);
      check(upd);
    }
  } else if (data.action === "set_paid_until") {
    target = data.center_id;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    check(await (admin as any).from("subscriptions").update({ paid_until: data.paid_until }).eq("center_id", data.center_id));
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
  check(await admin.from("creator_audit").insert({ actor_id: context.userId, action: data.action, target_id: target, details: auditDetails(data) }));
  return { ok: true };
});