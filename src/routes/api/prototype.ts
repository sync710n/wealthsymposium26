import { createFileRoute } from "@tanstack/react-router";
import { WORKSHOP_URL } from "@/lib/workshop-api";

export const Route = createFileRoute("/api/prototype")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const data = await request.json();
        const upstream = await fetch(WORKSHOP_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "prototype-stream", data }),
        });
        return new Response(upstream.body, {
          status: upstream.status,
          headers: {
            "Content-Type": upstream.headers.get("content-type") || "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
          },
        });
      },
    },
  },
});