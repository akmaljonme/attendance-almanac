import { createContext, useContext, type ReactNode } from "react";

export type CenterRole = "owner" | "admin" | "teacher" | "receptionist";

export interface CenterCtx {
  centerId: string;
  centerName: string;
  role: CenterRole;
  userId: string;
  userName: string;
  email: string;
}

const Ctx = createContext<CenterCtx | null>(null);

export function CenterProvider({ value, children }: { value: CenterCtx; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCenter(): CenterCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCenter must be used inside the app layout");
  return v;
}

/** UI-only permission helpers. Real enforcement is done by database policies. */
export function can(role: CenterRole) {
  return {
    finance: role === "owner" || role === "admin",
    recordPayment: role !== "teacher",
    manageStudents: role !== "teacher",
    manageCatalog: role === "owner" || role === "admin",
    attendance: role !== "receptionist",
    expenses: role === "owner" || role === "admin",
    settings: role === "owner",
    voidPayment: role === "owner" || role === "admin",
  };
}
