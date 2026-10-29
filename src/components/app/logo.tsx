export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span
      className={`flex items-center gap-2 font-display text-lg font-semibold ${light ? "text-navy-foreground" : "text-foreground"}`}
    >
      <img src="/logo.png" alt="Markazly logo" className="h-8 w-8 rounded-lg" />
      Markazly
    </span>
  );
}
