import { describe, it, expect } from "vitest";
import { formatUZS, normalizePhone, parseUZS, formatDate } from "@/lib/format";

describe("UZS and Uzbek formats", () => {
  it("formats integer so'm with spaces", () => expect(formatUZS(1250000)).toBe("1 250 000 so'm"));
  it("parses typed money to integer", () => expect(parseUZS("1 200 000")).toBe(1200000));
  it("normalizes Uzbek phone numbers", () => expect(normalizePhone("90 123 45 67")).toBe("+998901234567"));
  it("rejects non-Uzbek phone numbers", () => expect(normalizePhone("+7 900 123 45 67")).toBeNull());
  it("shows dates as DD.MM.YYYY", () => expect(formatDate("2026-10-27")).toBe("27.10.2026"));
});
