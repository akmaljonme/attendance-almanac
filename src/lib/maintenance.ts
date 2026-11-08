// Set to false to restore the application without changing or deleting its data.
export const maintenanceEnabled = true;

export function maintenanceResponse(request: Request) {
  return new Response(request.method === "HEAD" ? null : `<!doctype html>
<html lang="uz"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Vaqtincha ishlamayapti — Markazly</title>
<meta name="description" content="Markazly vaqtincha yopilgan.">
<meta property="og:title" content="Vaqtincha ishlamayapti — Markazly">
<meta property="og:description" content="Markazly vaqtincha yopilgan.">
<meta property="og:type" content="website"><meta name="twitter:card" content="summary">
<meta name="robots" content="noindex, nofollow">
<style>:root{--background:#f8faf9;--foreground:#202923;--muted:#58645d;--accent:#226748}*{box-sizing:border-box}body{margin:0;background:var(--background);color:var(--foreground);font-family:system-ui,sans-serif}main{min-height:100svh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center}strong{font-size:24px;color:var(--accent)}h1{font-size:32px;line-height:1.25;margin:24px 0 12px;overflow-wrap:anywhere}p{color:var(--muted);line-height:1.6;margin:0}</style>
</head><body><main><strong>Markazly</strong><h1>Vaqtincha ishlamayapti</h1><p>Keyinroq qayta urinib ko‘ring.</p></main></body></html>`, {
    status: 503,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "retry-after": "3600",
      "x-robots-tag": "noindex, nofollow",
    },
  });
}