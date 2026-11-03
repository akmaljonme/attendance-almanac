import { createFileRoute, redirect } from "@tanstack/react-router";
import { pageHead } from "@/lib/page-head";
export const Route = createFileRoute("/forgot-password")({ head: () => pageHead("Parol bo‘yicha yordam", "Markazly hisobining parolini administrator orqali tiklash."), beforeLoad: () => { throw redirect({ to: "/login", replace: true }); } });
