import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CenterProvider } from "@/lib/center";
import { ReceiptDialog, StudentCardDialog, shortCode } from "@/components/app/receipt";

// Markaz ma'lumotlari so'rovi tarmoqqa chiqmasin.
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: { name: "Namuna markaz", city: "Shovot", address: null, phone: "+998887111401" },
          }),
        }),
      }),
    }),
  },
}));

function wrap(ui: React.ReactNode) {
  return (
    <QueryClientProvider client={new QueryClient()}>
      <CenterProvider
        value={{
          centerId: "c1",
          centerName: "Namuna markaz",
          role: "owner",
          userId: "u1",
          userName: "Admin",
          email: "a@b.c",
        }}
      >
        {ui}
      </CenterProvider>
    </QueryClientProvider>
  );
}

describe("Kvitansiya va o'quvchi kartasi", () => {
  it("kvitansiyada summa, o'quvchi va raqam ko'rinadi", () => {
    render(
      wrap(
        <ReceiptDialog
          onOpenChange={() => {}}
          receipt={{
            id: "abcdef12-0000-0000-0000-000000000000",
            paid_on: "2026-11-01",
            period_month: "2026-11-01",
            method: "cash",
            amount: 1250000,
            reference: null,
            voided_at: null,
            void_reason: null,
            student_name: "Aziza Karimova",
            student_phone: "+998901234567",
            group_name: "Ingliz tili A1",
          }}
        />,
      ),
    );
    expect(screen.getAllByText("Aziza Karimova").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/1 250 000 so'm/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/ABCDEF12/).length).toBeGreaterThan(0);
  });

  it("bekor qilingan to'lov kvitansiyasida belgi chiqadi", () => {
    render(
      wrap(
        <ReceiptDialog
          onOpenChange={() => {}}
          receipt={{
            id: "11111111-0000-0000-0000-000000000000",
            paid_on: "2026-11-01",
            period_month: null,
            method: "card",
            amount: 100000,
            reference: "123",
            voided_at: "2026-11-02T00:00:00Z",
            void_reason: "Xato kiritilgan",
            student_name: "Test",
            student_phone: null,
            group_name: null,
          }}
        />,
      ),
    );
    expect(screen.getAllByText(/BEKOR QILINGAN: Xato kiritilgan/).length).toBeGreaterThan(0);
  });

  it("o'quvchi kartasida ism, guruh va ID ko'rinadi", () => {
    render(
      wrap(
        <StudentCardDialog
          open
          onOpenChange={() => {}}
          student={{
            id: "99aabbcc-0000-0000-0000-000000000000",
            full_name: "Bobur Aliyev",
            phone: null,
            parent_phone: "+998901112233",
            enrolled_on: "2026-09-01",
            groups: ["Matematika"],
          }}
        />,
      ),
    );
    expect(screen.getAllByText("Bobur Aliyev").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Matematika").length).toBeGreaterThan(0);
    expect(screen.getAllByText(shortCode("99aabbcc-0000-0000-0000-000000000000")).length).toBe(2);
  });
});
