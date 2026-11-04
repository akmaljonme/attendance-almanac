import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowUpRight, ArrowRight, Users, CalendarCheck, Wallet, ChartNoAxesCombined } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/app/logo";
import { listTrustedCenters } from "@/lib/trusted-centers.functions";
import classroom from "@/assets/markazly-classroom.jpg";
import { pageHead } from "@/lib/page-head";

const trustedQuery = queryOptions({ queryKey: ["trusted-centers"], queryFn: () => listTrustedCenters(), staleTime: 5 * 60 * 1000 });
export const Route = createFileRoute("/")({
  head: () => pageHead("Markazly — O'quv markazlari uchun CRM", "Markazly bilan o'quvchilar, davomat, to'lovlar va qarzdorlikni boshqaring. Bizga ishongan o'quv markazlari bilan tanishing."),
  loader: ({ context }) => context.queryClient.ensureQueryData(trustedQuery),
  component: LandingPage,
});
function LandingPage() {
  const { data: centers } = useSuspenseQuery(trustedQuery);
  return <div className="bg-background">
    <header className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8"><Link to="/" aria-label="Markazly bosh sahifa"><Logo/></Link><Button variant="outline" asChild><Link to="/login">Hisobga kirish<ArrowUpRight className="ml-2 h-4 w-4"/></Link></Button></header>
    <main>
      <section className="landing-hero relative isolate overflow-hidden">
        <img src={classroom} width={1920} height={1024} alt="O'quv markazida ustoz va o'quvchilar" className="absolute inset-0 -z-20 h-full w-full object-cover object-right" fetchPriority="high"/>
        <div className="absolute inset-0 -z-10 bg-landing-ink/65 md:bg-landing-ink/45"/>
        <div className="mx-auto flex h-full max-w-7xl items-center px-5 py-12 sm:px-8"><div className="max-w-xl text-landing-paper"><p className="mb-6 flex items-center gap-3 text-xs font-semibold uppercase"><span className="h-px w-8 bg-landing-lime"/>O'quv markazlari uchun CRM</p><h1 className="text-5xl font-semibold leading-tight sm:text-6xl">Markazly<span className="text-landing-lime">.</span></h1><p className="mt-5 max-w-md text-xl leading-relaxed sm:text-2xl">Ta'limga e'tibor bering.<br/>Boshqaruvni bizga qoldiring.</p><p className="mt-4 max-w-sm text-sm leading-7 text-landing-paper/80">O'quvchilar, davomat va to'lovlar — markazingizning kundalik ishlari bitta tizimda.</p><Button asChild size="lg" className="mt-8 bg-landing-lime text-landing-ink hover:bg-landing-lime/90"><Link to="/login">Tizimga kirish<ArrowRight className="ml-4 h-4 w-4"/></Link></Button></div></div>
      </section>
      <section className="border-b bg-card"><div className="mx-auto max-w-7xl px-5 py-12 sm:px-8"><div className="flex flex-wrap items-end justify-between gap-3"><h2 className="text-2xl font-semibold">Bizga ishonganlar</h2><p className="text-sm text-muted-foreground">Biz bilan birga rivojlanayotgan o'quv markazlari</p></div>{centers.length ? <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">{centers.map((center) => <div key={center.id} className="flex min-w-0 flex-col items-center gap-3 text-center">{center.logo_url && <img loading="lazy" src={center.logo_url} alt={center.name} width={160} height={80} className="h-20 w-40 max-w-full object-contain"/>}<p className="break-words text-sm font-semibold">{center.name}</p></div>)}</div> : <p className="mt-7 text-sm text-muted-foreground">Markazlar ro'yxati tez orada e'lon qilinadi.</p>}</div></section>
      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8"><p className="text-xs font-semibold uppercase text-muted-foreground">Aniqlik. Tartib. Nazorat.</p><h2 className="mt-3 max-w-lg text-3xl font-semibold leading-snug">Markazingizning har bir kuni nazoratda.</h2><div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">{[{ icon: Users, title: "O'quvchilar", desc: "Guruhlar, kurslar va o'quvchi ma'lumotlari bir joyda." }, { icon: CalendarCheck, title: "Davomat", desc: "Darslar jadvali va har bir o'quvchining davomati." }, { icon: Wallet, title: "To'lovlar", desc: "Tushumlar, xarajatlar va qarzdorlikning aniq hisobi." }, { icon: ChartNoAxesCombined, title: "Hisobotlar", desc: "Markaz holatini ko'rsatadigan tushunarli hisobotlar." }].map(({ icon: Icon, title, desc }, i) => <div key={title} className="border-t pt-5"><div className="flex items-center justify-between"><Icon className="h-6 w-6 text-primary"/><span className="text-xs text-muted-foreground">0{i + 1}</span></div><h3 className="mt-5 text-lg font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{desc}</p></div>)}</div></section>
      <section className="bg-landing-ink text-landing-paper"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-8 px-5 py-12 sm:px-8"><h2 className="max-w-lg text-2xl font-semibold leading-relaxed">Bir markaz. Bir tizim.<br/>Barcha jarayonlar bir joyda.</h2><Button size="lg" asChild className="bg-landing-lime text-landing-ink hover:bg-landing-lime/90"><Link to="/login">Hisobga kirish<ArrowUpRight className="ml-4 h-4 w-4"/></Link></Button></div></section>
    </main><footer className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-7 sm:px-8"><Logo/><p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Markazly</p></footer>
  </div>;
}
