import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/app/logo";
import { pageHead } from "@/lib/page-head";
export const Route = createFileRoute("/_authenticated/onboarding")({ head: () => pageHead("Kirish ruxsati", "Markaz hisobiga kirish ruxsati."), component: PendingAccess });
function PendingAccess() {
 const qc = useQueryClient(); const navigate = useNavigate();
 async function exit() { await qc.cancelQueries(); qc.clear(); await supabase.auth.signOut(); navigate({to:"/login",replace:true}); }
 return <main className="mx-auto max-w-lg space-y-6 px-6 py-20"><Logo/><h1 className="text-2xl font-semibold">Markaz biriktirilmagan</h1><p className="text-muted-foreground">Hisobingizni markazga biriktirish uchun administratorga murojaat qiling.</p><div className="flex gap-3"><Button asChild variant="outline"><Link to="/admin">Yaratuvchi paneli</Link></Button><Button onClick={exit}>Chiqish</Button></div></main>;
}
