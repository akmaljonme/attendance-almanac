import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  LayoutDashboard, Users, BookOpen, UsersRound, UserSquare2, CalendarCheck, Wallet, AlertCircle,
  Receipt, CalendarDays, BarChart3, Settings, LogOut, Loader2, UserCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Logo } from "@/components/app/logo";
import { CenterProvider, can, type CenterCtx, type CenterRole } from "@/lib/center";
import { ROLE_LABELS, formatLongDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/app")({
  component: AppLayout,
});

function AppLayout() {
  const navigate = useNavigate();
  const { user } = Route.useRouteContext();
  const q = useQuery({
    queryKey: ["ctx", user.id],
    queryFn: async () => {
      const { data: m, error } = await supabase
        .from("center_memberships")
        .select("role, center_id, centers(name)")
        .eq("user_id", user.id)
        .order("created_at")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      const { data: p } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
      return { m, name: p?.full_name || (user.user_metadata?.full_name as string) || user.email || "" };
    },
  });

  useEffect(() => {
    if (q.data && !q.data.m) navigate({ to: "/onboarding", replace: true });
  }, [q.data, navigate]);

  if (q.isLoading || !q.data?.m) {
    return <div className="grid min-h-screen place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  const ctx: CenterCtx = {
    centerId: q.data.m.center_id,
    centerName: (q.data.m.centers as { name: string } | null)?.name ?? "",
    role: q.data.m.role as CenterRole,
    userId: user.id,
    userName: q.data.name,
    email: user.email ?? "",
  };

  return (
    <CenterProvider value={ctx}>
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AppSidebar role={ctx.role} />
          <div className="flex min-w-0 flex-1 flex-col">
            <TopBar ctx={ctx} />
            <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
              <Outlet />
            </main>
          </div>
        </div>
      </SidebarProvider>
    </CenterProvider>
  );
}

type NavItem = { title: string; url: string; icon: typeof Users; show?: (r: CenterRole) => boolean };
const groups: { label: string; items: NavItem[] }[] = [
  {
    label: "Asosiy",
    items: [
      { title: "Bosh sahifa", url: "/app/dashboard", icon: LayoutDashboard },
      { title: "O'quvchilar", url: "/app/students", icon: Users },
      { title: "Kurslar", url: "/app/courses", icon: BookOpen },
      { title: "Guruhlar", url: "/app/groups", icon: UsersRound },
      { title: "O'qituvchilar", url: "/app/teachers", icon: UserSquare2 },
    ],
  },
  {
    label: "Darslar",
    items: [
      { title: "Davomat", url: "/app/attendance", icon: CalendarCheck, show: (r) => can(r).attendance },
      { title: "Dars jadvali", url: "/app/schedule", icon: CalendarDays },
    ],
  },
  {
    label: "Moliya",
    items: [
      { title: "To'lovlar", url: "/app/payments", icon: Wallet, show: (r) => can(r).recordPayment },
      { title: "Qarzdorlik", url: "/app/debts", icon: AlertCircle, show: (r) => can(r).recordPayment },
      { title: "Xarajatlar", url: "/app/expenses", icon: Receipt, show: (r) => can(r).expenses },
      { title: "Hisobotlar", url: "/app/reports", icon: BarChart3, show: (r) => can(r).finance },
    ],
  },
  {
    label: "Boshqaruv",
    items: [{ title: "Sozlamalar", url: "/app/settings", icon: Settings, show: (r) => can(r).settings }],
  },
];

function AppSidebar({ role }: { role: CenterRole }) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 py-4">
        {collapsed ? <span className="mx-auto"><Logo light /></span> : <Logo light />}
      </SidebarHeader>
      <SidebarContent>
        {groups.map((g) => {
          const items = g.items.filter((i) => !i.show || i.show(role));
          if (!items.length) return null;
          return (
            <SidebarGroup key={g.label}>
              <SidebarGroupLabel>{g.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((i) => (
                    <SidebarMenuItem key={i.url}>
                      <SidebarMenuButton asChild isActive={path === i.url || path.startsWith(i.url + "/")} tooltip={i.title}>
                        <Link to={i.url}><i.icon className="h-4 w-4" /><span>{i.title}</span></Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  );
}

function TopBar({ ctx }: { ctx: CenterCtx }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }
  const initials = ctx.userName.split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase() || "U";
  return (
    <header className="no-print sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-card/90 px-4 backdrop-blur">
      <SidebarTrigger />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{ctx.centerName}</p>
        <p className="hidden truncate text-xs text-muted-foreground sm:block">{formatLongDate()}</p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-primary-soft text-xs font-semibold text-primary">{initials}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <p className="truncate">{ctx.userName}</p>
            <p className="truncate text-xs font-normal text-muted-foreground">{ROLE_LABELS[ctx.role]}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild><Link to="/app/profile"><UserCircle className="mr-2 h-4 w-4" />Profil</Link></DropdownMenuItem>
          <DropdownMenuItem onClick={signOut}><LogOut className="mr-2 h-4 w-4" />Chiqish</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
