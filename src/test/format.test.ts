import { describe, it, expect } from "vitest";
import { amountInWordsUz, formatUZS, normalizePhone, parseUZS, formatDate } from "@/lib/format";

describe("UZS and Uzbek formats", () => {
  it("formats integer so'm with spaces", () => expect(formatUZS(1250000)).toBe("1 250 000 so'm"));
  it("parses typed money to integer", () => expect(parseUZS("1 200 000")).toBe(1200000));
  it("normalizes Uzbek phone numbers", () =>
    expect(normalizePhone("90 123 45 67")).toBe("+998901234567"));
  it("rejects non-Uzbek phone numbers", () =>
    expect(normalizePhone("+7 900 123 45 67")).toBeNull());
  it("shows dates as DD.MM.YYYY", () => expect(formatDate("2026-10-27")).toBe("27.10.2026"));

  it("writes amounts in Uzbek words", () => {
    expect(amountInWordsUz(0)).toBe("Nol so'm");
    expect(amountInWordsUz(1250000)).toBe("Bir million ikki yuz ellik ming so'm");
    expect(amountInWordsUz(305000)).toBe("Uch yuz besh ming so'm");
    expect(amountInWordsUz(1000)).toBe("Bir ming so'm");
    expect(amountInWordsUz(2000000000, false)).toBe("Ikki milliard");
  });
});
