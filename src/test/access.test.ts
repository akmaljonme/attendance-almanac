import { describe, expect, it } from "vitest";
import { issuedAccountSchema, requireCreatorRole, usernameEmail } from "@/lib/access";
describe("Admin-issued access", () => {
  it("uses normalized usernames as credentials, not public profile lookups", () => {
    expect(usernameEmail(" Akmal_01 ")).toBe("akmal_01@accounts.markazly.local");
    expect(() => usernameEmail("akmal@example.com")).toThrow();
  });
  it("requires a profile name and carries the phone supplied by admin", () => {
    const value = {username:"akmal",password:"example-password",full_name:"Akmal",phone:"+998901234567",role:"admin"};
    expect(issuedAccountSchema.parse(value).phone).toBe("+998901234567");
    expect(issuedAccountSchema.safeParse({...value,full_name:""}).success).toBe(false);
  });
  it("does not grant creator access to ordinary center administrators", () => {
    expect(() => requireCreatorRole(false)).toThrow();
    expect(() => requireCreatorRole(true)).not.toThrow();
  });
});