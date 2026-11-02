import { describe, expect, it } from "vitest";
import { assertLoginAllowed } from "@/lib/login-guard";

describe("Admin login enforcement", () => {
  it("rejects a locked admin even if another attempt token exists", () => {
    expect(() => assertLoginAllowed({ protected: true, token: "attempt", locked_until: "2026-11-02T11:00:00Z" })).toThrow();
  });
  it("does not allow simultaneous admin password attempts", () => {
    expect(() => assertLoginAllowed({ protected: true, busy: true })).toThrow();
  });
  it("fails closed when a protected admin has no reservation", () => {
    expect(() => assertLoginAllowed({ protected: true })).toThrow();
    expect(() => assertLoginAllowed({ protected: true, token: "attempt" })).not.toThrow();
  });
});