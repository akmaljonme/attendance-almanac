// Set to false to restore the application without changing or deleting its data.
export const maintenanceEnabled = true;

export function maintenanceResponse(request: Request) {
  return new Response(request.method === "HEAD" ? null : "Error 503 — Service Unavailable", {
    status: 503,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      "retry-after": "3600",
      "x-robots-tag": "noindex, nofollow",
    },
  });
}