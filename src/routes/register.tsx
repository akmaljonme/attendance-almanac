import { createFileRoute, redirect } from "@tanstack/react-router";
import { pageHead } from "@/lib/page-head";
export const Route = createFileRoute("/register")({ head: () => pageHead("Hisob olish", "Markazly hisoblari faqat administrator tomonidan beriladi."), beforeLoad: () => { throw redirect({ to: "/login", replace: true }); } });
