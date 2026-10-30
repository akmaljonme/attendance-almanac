import { createFileRoute, redirect } from "@tanstack/react-router";
import { pageHead } from "@/lib/page-head";
export const Route = createFileRoute("/")({ head: () => pageHead("Markazly hisobiga kirish", "Markazly CRM uchun administrator bergan hisobga kirish."), beforeLoad: () => { throw redirect({ to: "/login", replace: true }); } });
