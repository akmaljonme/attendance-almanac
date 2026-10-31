import { useEffect, useRef } from "react";

type Turnstile = { render: (element: HTMLElement, options: Record<string, unknown>) => string; remove: (id: string) => void };
declare global { interface Window { turnstile?: Turnstile } }
export function RobotCheck({ siteKey, onVerify }: { siteKey: string; onVerify: (token: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let widget: string | undefined;
    let disposed = false;
    function render() {
      if (!disposed && ref.current && window.turnstile && !widget) widget = window.turnstile.render(ref.current, { sitekey: siteKey, callback: onVerify, "expired-callback": () => onVerify(""), "error-callback": () => onVerify(""), theme: "auto" });
    }
    let script = document.querySelector<HTMLScriptElement>('script[data-markazly-turnstile]');
    if (!script) { script = document.createElement("script"); script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"; script.dataset.markazlyTurnstile = "true"; script.async = true; document.head.appendChild(script); }
    script.addEventListener("load", render); render();
    return () => { disposed = true; script?.removeEventListener("load", render); if (widget) window.turnstile?.remove(widget); };
  }, [siteKey, onVerify]);
  return <div ref={ref} className="min-h-16" />;
}