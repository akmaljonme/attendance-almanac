import { createFileRoute, redirect } from "@tanstack/react-router";
import { pageHead } from "@/lib/page-head";

export const Route = createFileRoute("/_authenticated/app/")({
  head: () => pageHead("Markaz boshqaruvi", "Markazly o‘quv markazi boshqaruv paneli."),
  beforeLoad: () => {
    throw redirect({ to: "/app/dashboard" });
  },
});
