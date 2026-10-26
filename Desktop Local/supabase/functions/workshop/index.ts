const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const env = {
  OPENROUTER_API_KEY: Deno.env.get("OPENROUTER_API_KEY") ?? "",
  XAI_API_KEY: Deno.env.get("XAI_API_KEY") ?? "",
};

(globalThis as unknown as { process: { env: Record<string, string> } }).process = { env };

const app = await import("./server.js");

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function firstDataUrl(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value.startsWith("data:image/") ? value : "";
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstDataUrl(item);
      if (found) return found;
    }
    return "";
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.url === "string" && record.url.startsWith("data:image/")) return record.url;
    for (const item of Object.values(record)) {
      const found = firstDataUrl(item);
      if (found) return found;
    }
  }
  return "";
}

async function openRouterImage(data: { index?: number; paragraph?: string; context?: string; others?: string }) {
  if (!env.OPENROUTER_API_KEY) return { ok: false, error: "Set OPENROUTER_API_KEY on the Supabase function." };
  const paragraph = (data.paragraph ?? "").trim();
  if (paragraph.length < 8) return { ok: false, error: "Write the screen first." };
  const prompt = app.prompts.sceneImage.build(data.index ?? 0, paragraph, (data.context ?? "").slice(0, 400), (data.others ?? "").slice(0, 700));
  const response = await fetch("https://openrouter.ai/api/v1/images", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "black-forest-labs/flux-3-image-klein",
      prompt,
      aspect_ratio: "16:9",
    }),
  });
  const raw = await response.text();
  if (!response.ok) {
    let message = "The picture did not come back. Try again.";
    try {
      const parsed = JSON.parse(raw) as { error?: { message?: string } };
      if (parsed.error?.message) message = parsed.error.message.slice(0, 180);
    } catch {
      if (raw) message = raw.slice(0, 180);
    }
    return { ok: false, error: message };
  }
  const body = JSON.parse(raw) as { data?: { b64_json?: string; media_type?: string }[] };
  const first = body.data?.[0];
  if (!first?.b64_json) return { ok: false, error: "The picture did not come back. Try again." };
  return { ok: true, dataUrl: `data:${first.media_type || "image/png"};base64,${first.b64_json}` };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (request.method !== "POST") return json({ ok: false, error: "POST only." }, 405);
  let body: { action?: string; data?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "The request was not JSON." }, 400);
  }
  const action = body.action ?? "";
  const data = body.data ?? {};
  try {
    if (action === "prototype-stream") {
      return new Response(app.openPrototypeStream(data), {
        headers: { ...cors, "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache" },
      });
    }
    if (action === "image") {
      if (env.XAI_API_KEY) return json(await app.generateSceneImage({ data }));
      return json(await openRouterImage(data));
    }
    if (action === "coach") return json(await app.coachDraft({ data }));
    if (action === "prototype") return json(await app.generatePrototype({ data }));
    if (action === "refine") return json(await app.refinePrototype({ data }));
    if (action === "log") return json(await app.readDebugLog({ data }));
    if (action === "clear") return json(await app.clearServerDebugLog({ data }));
    return json({ ok: false, error: "Unknown action." }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "The function failed.";
    return json({ ok: false, error: message }, 500);
  }
});
