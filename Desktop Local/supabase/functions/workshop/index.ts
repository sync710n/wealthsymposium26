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

function findImage(value: unknown, key = ""): { b64: string; url: string } {
  const empty = { b64: "", url: "" };
  if (!value) return empty;
  if (typeof value === "string") {
    if (value.startsWith("data:image/")) return { b64: "", url: value };
    if (key === "b64_json" && value.length > 80) return { b64: value, url: "" };
    if ((key === "url" || key === "image_url" || key === "image") && value.startsWith("http")) return { b64: "", url: value };
    return empty;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findImage(item, key);
      if (found.b64 || found.url) return found;
    }
    return empty;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.b64_json === "string" && record.b64_json.length > 80) return { b64: record.b64_json, url: "" };
    for (const [childKey, child] of Object.entries(record)) {
      const found = findImage(child, childKey);
      if (found.b64 || found.url) return found;
    }
  }
  return empty;
}

async function asDataUrl(found: { b64: string; url: string }) {
  if (found.b64) return `data:image/png;base64,${found.b64}`;
  if (found.url.startsWith("data:image/")) return found.url;
  if (!found.url.startsWith("http")) return "";
  const fetched = await fetch(found.url);
  if (!fetched.ok) return found.url;
  const bytes = new Uint8Array(await fetched.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 32768) binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
  const type = fetched.headers.get("content-type") || "image/png";
  return `data:${type};base64,${btoa(binary)}`;
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
  let body: unknown = null;
  try {
    body = JSON.parse(raw);
  } catch {
    body = null;
  }
  const found = findImage(body);
  if (found.b64 || found.url) {
    const dataUrl = await asDataUrl(found);
    if (dataUrl) return { ok: true, dataUrl };
  }
  if (!response.ok) {
    const parsed = body as { error?: { message?: string } } | null;
    const message = parsed?.error?.message?.slice(0, 180) || raw.slice(0, 180) || "The screen did not come back. Try again.";
    return { ok: false, error: message };
  }
  return { ok: false, error: "The screen did not come back. Try again." };
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
