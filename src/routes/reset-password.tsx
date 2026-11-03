import { createFileRoute, redirect } from "@tanstack/react-router";
import { pageHead } from "@/lib/page-head";
export const Route = createFileRoute("/reset-password")({ head: () => pageHead("Parolni tiklash", "Markazly hisobiga yangi parolni administrator beradi."), beforeLoad: () => { throw redirect({ to: "/login", replace: true }); } });
