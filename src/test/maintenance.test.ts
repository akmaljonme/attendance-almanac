import { describe, expect, it } from "vitest";
import { maintenanceEnabled, maintenanceResponse } from "../lib/maintenance";

describe("temporary closure", () => {
  it("is enabled", () => {
    expect(maintenanceEnabled).toBe(true);
  });
  for (const path of ["/", "/login", "/admin", "/app/dashboard", "/_serverFn/test", "/api/public/test"]) {
    it(`blocks ${path} with 503`, () => {
      const response = maintenanceResponse(new Request(`https://example.com${path}`, { method: "POST" }));
      expect(response.status).toBe(503);
      expect(response.headers.get("cache-control")).toBe("no-store");
    });
  }
  it("returns no body for HEAD requests", async () => {
    const response = maintenanceResponse(new Request("https://example.com", { method: "HEAD" }));
    expect(response.status).toBe(503);
    expect(await response.text()).toBe("");
  });
});