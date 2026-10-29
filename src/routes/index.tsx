import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Users,
  CalendarCheck,
  Wallet,
  UserSquare2,
  BarChart3,
  ArrowRight,
  Check,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { PLANS } from "@/lib/plans";
import { Logo } from "@/components/app/logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Markazly — O'quv markazingizni bitta tizimda boshqaring" },
      {
        name: "description",
        content:
          "O'quvchilar, davomat, to'lovlar va qarzdorlikni bir joyda nazorat qiling. O'zbekistondagi o'quv markazlari uchun.",
      },
      { property: "og:title", content: "Markazly — O'quv markazlari uchun boshqaruv tizimi" },
      {
        property: "og:description",
        content: "O'quvchilar, davomat, to'lovlar va qarzdorlikni bir joyda nazorat qiling.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const benefits = [
  {
    icon: Users,
    title: "O'quvchilarni boshqarish",
    text: "Har bir o'quvchining guruhlari, to'lovlari va davomati bitta kartada.",
  },
  {
    icon: CalendarCheck,
    title: "Davomatni nazorat qilish",
    text: "Darsdagi davomatni bir necha soniyada belgilang, tarixini kuzating.",
  },
  {
    icon: Wallet,
    title: "To'lov va qarzdorlik hisobi",
    text: "Qisman to'lovlar, chegirmalar va qarzdorlik aniq hisoblanadi.",
  },
  {
    icon: UserSquare2,
    title: "O'qituvchilar va guruhlar",
    text: "Jadval, xona va o'qituvchi to'qnashuvlari haqida ogohlantirish.",
  },
  {
    icon: BarChart3,
    title: "Moliyaviy hisobotlar",
    text: "Tushum, xarajat va qarzdorlik bo'yicha davriy hisobotlar, CSV eksport.",
  },
];

const steps = [
  "Ro'yxatdan o'ting",
  "Markazingizni sozlang",
  "O'quvchilarni kiriting",
  "Boshqaruvni boshlang",
];

const faqs = [
  {
    q: "Sinov muddati bormi?",
    a: "Ha, ro'yxatdan o'tganingizdan so'ng 14 kunlik bepul sinov davri boshlanadi.",
  },
  {
    q: "Ma'lumotlarim xavfsizmi?",
    a: "Har bir markaz ma'lumotlari alohida saqlanadi va faqat ruxsat berilgan xodimlar ko'ra oladi.",
  },
  {
    q: "Xodimlarga turli ruxsatlar berish mumkinmi?",
    a: "Ha. Egasi, administrator, o'qituvchi va qabulxona rollari mavjud — o'qituvchilar moliyaviy ma'lumotlarni ko'rmaydi.",
  },
  {
    q: "Qarzdorlik qanday hisoblanadi?",
    a: "Har bir guruhga yozilish bo'yicha oylik to'lov, chegirma va to'lovlar asosida. Oy o'rtasida qo'shilgan o'quvchi uchun birinchi oy kunlar bo'yicha hisoblanishi mumkin.",
  },
  { q: "Telefonda ishlaydimi?", a: "Ha, tizim kompyuter, planshet va telefonda qulay ishlaydi." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Logo />
          <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
            <a href="#imkoniyatlar" className="hover:text-foreground">
              Imkoniyatlar
            </a>
            <a href="#qanday" className="hover:text-foreground">
              Qanday ishlaydi
            </a>
            <a href="#tariflar" className="hover:text-foreground">
              Tariflar
            </a>
            <a href="#faq" className="hover:text-foreground">
              FAQ
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link to="/login">Kirish</Link>
            </Button>
            <Button asChild>
              <Link to="/register">Bepul sinab ko'rish</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="hero-grid pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-20 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-success" /> O'zbekistondagi o'quv
            markazlari uchun
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
            O'quv markazingizni bitta tizimda boshqaring
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            O'quvchilar, davomat, to'lovlar va qarzdorlikni bir joyda nazorat qiling. Kundalik
            boshqaruvni soddalashtiring.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button size="lg" asChild>
              <Link to="/register">
                Bepul boshlash <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="#demo">Demoni ko'rish</a>
            </Button>
          </div>
          <div id="demo" className="mx-auto mt-14 max-w-5xl scroll-mt-24">
            <DashboardPreview />
            <p className="mt-3 text-xs text-muted-foreground">
              Namuna ko'rinish — raqamlar faqat misol uchun.
            </p>
          </div>
        </div>
      </section>

      <section id="imkoniyatlar" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20">
        <h2 className="text-3xl font-semibold text-foreground">
          Kundalik ishlar uchun kerakli hamma narsa
        </h2>
        <p className="mt-2 text-muted-foreground">
          Qabulxona xodimi tez o'rganadi, markaz egasi esa hammasini nazorat qiladi.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {benefits.map((b) => (
            <div key={b.title} className="rounded-xl border bg-card p-6 shadow-card">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary-soft text-primary">
                <b.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-semibold text-foreground">{b.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{b.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="qanday" className="scroll-mt-20 border-y bg-card">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="text-3xl font-semibold text-foreground">Qanday ishlaydi</h2>
          <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <li key={s} className="relative">
                <span className="font-display text-4xl font-semibold text-primary/25">
                  0{i + 1}
                </span>
                <p className="mt-2 font-semibold text-foreground">{s}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="tariflar" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20">
        <h2 className="text-3xl font-semibold text-foreground">Tariflar</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Ko'rsatilgan narxlar boshlang'ich taklif bo'lib, o'zgarishi mumkin. Barcha tariflarda 14
          kunlik bepul sinov.
        </p>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {PLANS.map((p) => (
            <div
              key={p.id}
              className={`rounded-xl border bg-card p-6 shadow-card ${p.featured ? "border-primary ring-1 ring-primary" : ""}`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">{p.name}</h3>
                {p.featured && (
                  <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary">
                    Ommabop
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{p.desc}</p>
              <p className="mt-5 font-display text-3xl font-semibold tabular text-foreground">
                {p.price}
                <span className="text-sm font-normal text-muted-foreground"> so'm / oy</span>
              </p>
              <ul className="mt-5 space-y-2 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2 text-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button className="mt-6 w-full" variant={p.featured ? "default" : "outline"} asChild>
                <Link to="/register">Boshlash</Link>
              </Button>
            </div>
          ))}
        </div>
      </section>

      <section id="faq" className="scroll-mt-20 border-t bg-card">
        <div className="mx-auto max-w-3xl px-4 py-20">
          <h2 className="text-3xl font-semibold text-foreground">Ko'p beriladigan savollar</h2>
          <Accordion type="single" collapsible className="mt-8">
            {faqs.map((f) => (
              <AccordionItem key={f.q} value={f.q}>
                <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <footer className="bg-navy">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-10 sm:flex-row">
          <Logo light />
          <p className="text-sm text-navy-foreground/70">© {new Date().getFullYear()} Markazly</p>
        </div>
      </footer>
    </div>
  );
}

function DashboardPreview() {
  const bars = [42, 55, 48, 63, 70, 66, 78, 84, 74, 88, 92, 96];
  return (
    <div className="overflow-hidden rounded-2xl border bg-card text-left shadow-elevated">
      <div className="flex">
        <div className="hidden w-44 shrink-0 space-y-1 bg-navy p-4 sm:block">
          <div className="mb-4">
            <Logo light />
          </div>
          {["Bosh sahifa", "O'quvchilar", "Guruhlar", "Davomat", "To'lovlar", "Qarzdorlik"].map(
            (x, i) => (
              <div
                key={x}
                className={`rounded-md px-2.5 py-1.5 text-xs ${i === 0 ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground"}`}
              >
                {x}
              </div>
            ),
          )}
        </div>
        <div className="flex-1 p-5">
          <p className="text-xs text-muted-foreground">Xayrli kun, Dilnoza</p>
          <p className="font-display font-semibold text-foreground">Namuna o'quv markazi</p>
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { l: "Faol o'quvchilar", v: "248", i: Users },
              { l: "Joriy oy tushumi", v: "61 400 000", i: TrendingUp },
              { l: "Bugungi davomat", v: "92%", i: CalendarCheck },
              { l: "Jami qarzdorlik", v: "7 850 000", i: AlertCircle },
            ].map((k) => (
              <div key={k.l} className="rounded-lg border p-3">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  {k.l}
                  <k.i className="h-3.5 w-3.5" />
                </div>
                <div className="mt-1 text-sm font-semibold tabular text-foreground">{k.v}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-lg border p-4">
            <p className="text-xs font-medium text-muted-foreground">Oylik tushum</p>
            <div className="mt-3 flex h-28 items-end gap-1.5">
              {bars.map((b, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t bg-primary/80"
                  style={{ height: `${b}%` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
