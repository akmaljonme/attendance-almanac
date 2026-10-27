import { GraduationCap } from "lucide-react";

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className={`flex items-center gap-2 font-display text-lg font-semibold ${light ? "text-navy-foreground" : "text-foreground"}`}>
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
        <GraduationCap className="h-4 w-4" />
      </span>
      EduCRM
    </span>
  );
}
