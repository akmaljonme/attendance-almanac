import { describe, expect, it } from "vitest";
import { requireCreatorRole } from "@/lib/access";
import { trustedCenterSchema, validateLogo } from "@/lib/trusted-centers";

describe("Trusted learning centers", () => {
  it("allows only the creator to manage public learning centers", () => {
    expect(() => requireCreatorRole(false)).toThrow();
    expect(() => requireCreatorRole(true)).not.toThrow();
  });
  it("stores a learning center name with a logo", () => {
    expect(trustedCenterSchema.parse({ name: "  Test LC  ", logo_path: "a12-b34.png", sort_order: 0 })).toEqual({ name: "Test LC", logo_path: "a12-b34.png", sort_order: 0 });
    expect(trustedCenterSchema.safeParse({ name: "Test LC", sort_order: 0 }).success).toBe(false);
  });
  it("accepts image logos but rejects executable content and oversized files", () => {
    expect(() => validateLogo({ type: "image/png", size: 1000 })).not.toThrow();
    expect(() => validateLogo({ type: "image/svg+xml", size: 1000 })).toThrow();
    expect(() => validateLogo({ type: "image/png", size: 2097153 })).toThrow();
  });
});