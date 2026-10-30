import { z } from "zod";

export const usernameSchema = z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9._-]{2,39}$/, "Login 3–40 ta lotin harfi, raqam, nuqta, _ yoki - dan iborat bo'lsin");
export const issuedAccountSchema = z.object({
  username: usernameSchema,
  password: z.string().min(8, "Parol kamida 8 ta belgi").max(128),
  full_name: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(30),
  center_id: z.string().uuid().optional(),
  role: z.enum(["owner", "admin", "teacher", "receptionist"]),
});
export function usernameEmail(username: string) {
  return `${usernameSchema.parse(username)}@accounts.markazly.local`;
}
export function requireCreatorRole(allowed: boolean) {
  if (!allowed) throw new Error("Bu amal faqat CRM yaratuvchisi uchun.");
}