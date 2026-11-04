import { z } from "zod";

export const trustedCenterSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(100),
  logo_path: z.string().regex(/^[a-f0-9-]+\.(png|jpg|webp)$/),
  sort_order: z.number().int().min(0).max(10000),
});
export const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"];
export function validateLogo(file: { type: string; size: number }) {
  if (!LOGO_TYPES.includes(file.type)) throw new Error("PNG, JPG yoki WebP rasm tanlang.");
  if (file.size > 2 * 1024 * 1024) throw new Error("Logo hajmi 2 MB dan oshmasin.");
}