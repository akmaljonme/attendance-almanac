import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Logo } from "./logo";

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-navy p-10 lg:flex">
        <Link to="/"><Logo light /></Link>
        <div>
          <p className="font-display text-3xl font-semibold leading-snug text-navy-foreground">
            O'quvchilar, davomat va to'lovlar — bitta tizimda.
          </p>
          <p className="mt-3 max-w-md text-navy-foreground/70">Kundalik boshqaruvni soddalashtiring va markazingiz moliyasini aniq kuzating.</p>
        </div>
        <p className="text-xs text-navy-foreground/50">© {new Date().getFullYear()} Markazly</p>
      </div>
      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden"><Link to="/"><Logo /></Link></div>
          <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>}
          <div className="mt-6">{children}</div>
          {footer && <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

export function authErrorUz(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login")) return "Email yoki parol noto'g'ri.";
  if (m.includes("email not confirmed")) return "Email hali tasdiqlanmagan. Pochtangizdagi havolani bosing.";
  if (m.includes("already registered") || m.includes("already been registered")) return "Bu email bilan hisob allaqachon mavjud.";
  if (m.includes("password") && m.includes("at least")) return "Parol juda qisqa.";
  if (m.includes("weak") || m.includes("pwned")) return "Bu parol xavfsiz emas, boshqasini tanlang.";
  if (m.includes("rate limit")) return "Juda ko'p urinish. Birozdan so'ng qayta urinib ko'ring.";
  return "Xatolik yuz berdi: " + msg;
}
