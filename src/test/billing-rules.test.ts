import { describe, expect, it } from "vitest";
import {
  accessState,
  addMonthsClamped,
  daysBetween,
  daysLeft,
  nextPeriod,
} from "@/lib/billing-rules";

describe("Obuna qoidalari", () => {
  it("muddat tugash kunining o'zida ham markaz faol", () => {
    expect(accessState("2026-11-10", "2026-11-10")).toBe("active");
    expect(accessState("2026-11-10", "2026-11-01")).toBe("active");
  });

  it("tugagandan keyin 3 kun imtiyoz, undan keyin faqat ko'rish", () => {
    expect(accessState("2026-11-10", "2026-11-11")).toBe("grace");
    expect(accessState("2026-11-10", "2026-11-13")).toBe("grace");
    expect(accessState("2026-11-10", "2026-11-14")).toBe("readonly");
  });

  it("muddati belgilanmagan markaz cheklanmaydi", () => {
    expect(accessState(null, "2030-01-01")).toBe("active");
  });

  it("kunlar farqini to'g'ri hisoblaydi", () => {
    expect(daysBetween("2026-10-31", "2026-11-02")).toBe(2);
    expect(daysLeft("2026-11-10", "2026-11-03")).toBe(7);
    expect(daysLeft("2026-11-10", "2026-11-12")).toBe(-2);
  });

  it("oy qo'shishda oy oxiridan oshmaydi", () => {
    expect(addMonthsClamped("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonthsClamped("2028-01-31", 1)).toBe("2028-02-29");
    expect(addMonthsClamped("2026-11-15", 3)).toBe("2027-02-15");
    expect(addMonthsClamped("2026-11-15", 12)).toBe("2027-11-15");
  });

  it("faol obuna oxiridan davom etadi, tugagani bugundan boshlanadi", () => {
    expect(nextPeriod("2026-11-20", 1, "2026-11-05")).toEqual({
      start: "2026-11-20",
      end: "2026-12-20",
    });
    expect(nextPeriod("2026-10-01", 1, "2026-11-05")).toEqual({
      start: "2026-11-05",
      end: "2026-12-05",
    });
    expect(nextPeriod(null, 2, "2026-11-05")).toEqual({ start: "2026-11-05", end: "2027-01-05" });
  });
});
