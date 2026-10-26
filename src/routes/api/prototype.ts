import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/prototype")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { openPrototypeStream } = await import("@/lib/ai.functions");
        const data = (await request.json()) as Parameters<typeof openPrototypeStream>[0];
        return new Response(openPrototypeStream(data), {
          headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
          },
        });
      },
    },
  },
});
