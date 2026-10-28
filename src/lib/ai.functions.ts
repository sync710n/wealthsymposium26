import { createServerFn } from "@tanstack/react-start";
import { BRIEF_FIELDS, type Brief, type BriefKey } from "@/lib/content";
import { prompts } from "@/lib/prompts";

type Ok<T> = { ok: true } & T;
type Err = { ok: false; error: string };

const PROTOTYPE_MODELS = ["grok-4.5", "grok-4.7"];
const HTML_MODELS = ["grok-4.7", "grok-4.5"];
const COACH_MODELS = ["grok-4-1-fast-non-reasoning", "grok-code-fast-1", "grok-4.5"];

type ServerNote = { at: string; name: string; ms?: number; ok?: boolean; detail: string };
const shared = globalThis as typeof globalThis & { __cyaServerNotes?: ServerNote[]; __cyaOpenRouterKey?: string };
const serverNotes: ServerNote[] = (shared.__cyaServerNotes ??= []);

function debugNote(name: string, detail: unknown, extra?: { ms?: number; ok?: boolean }) {
  let text = "";
  try {
    text = typeof detail === "string" ? detail : JSON.stringify(detail);
  } catch {
    text = String(detail);
  }
  serverNotes.push({ at: new Date().toISOString(), name, detail: text.slice(0, 12000), ...extra });
  if (serverNotes.length > 60) serverNotes.shift();
}

function modelList(preferred: string | undefined, fallback: string[]) {
  const name = (preferred ?? "").trim();
  if (!name) return fallback;
  return [name, ...fallback.filter((item) => item !== name)];
}

function summarizeMessages(messages: unknown[]) {
  return messages.map((message) => {
    if (!message || typeof message !== "object") return message;
    const role = "role" in message ? String((message as { role?: string }).role ?? "") : "";
    const content = "content" in message ? (message as { content?: unknown }).content : "";
    if (typeof content === "string") return { role, length: content.length, text: content.slice(0, 1800) };
    if (!Array.isArray(content)) return { role };
    return {
      role,
      parts: content.map((part) => {
        if (!part || typeof part !== "object") return "part";
        if ("text" in part) {
          const text = String((part as { text?: string }).text ?? "");
          return { length: text.length, text: text.slice(0, 1200) };
        }
        if ("image_url" in part) return { image: true };
        return "part";
      }),
    };
  });
}

export const readDebugLog = createServerFn({ method: "POST" }).handler(async () => serverNotes.slice());

export const clearServerDebugLog = createServerFn({ method: "POST" }).handler(async () => {
  serverNotes.length = 0;
  return { ok: true as const };
});

function modelFields(model: string) {
  return model === "grok-4.7" ? { reasoning_effort: "low" as const } : {};
}

function keyOrError(): string | Err {
  const xai = process.env.XAI_API_KEY?.trim();
  if (xai) return xai;
  const open = process.env.OPENROUTER_API_KEY?.trim() || shared.__cyaOpenRouterKey || "";
  if (open) return open;
  return { ok: false, error: "AI is not available in this environment. Ask a facilitator." };
}

function routeModel(apiKey: string, model: string) {
  const xai = process.env.XAI_API_KEY?.trim();
  if (xai && apiKey === xai) {
    return { url: "https://api.x.ai/v1/chat/completions", model, extra: modelFields(model) };
  }
  const known: Record<string, string> = {
    "grok-4.7": "x-ai/grok-4.7",
    "grok-4.5": "x-ai/grok-4.5",
    "grok-4-1-fast-non-reasoning": "x-ai/grok-4.5",
    "grok-code-fast-1": "x-ai/grok-4.5",
  };
  return {
    url: "https://openrouter.ai/api/v1/chat/completions",
    model: model.includes("/") ? model : (known[model] ?? "x-ai/grok-4.5"),
    extra: {},
  };
}

async function readError(res: Response) {
  const text = await res.text().catch(() => "");
  if (res.status === 429) return "AI is busy. Wait a few seconds and try again.";
  if (res.status >= 500) return "AI had a server error. Try once more.";
  return text.slice(0, 180) || `AI error ${res.status}`;
}

async function postJson(url: string, apiKey: string, body: unknown) {
  const run = () =>
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(180000),
    });
  try {
    let res = await run();
    if (res.status === 429 || res.status >= 500) {
      await new Promise((resolve) => setTimeout(resolve, 700));
      res = await run();
    }
    return res;
  } catch (error) {
    const reason = error instanceof Error ? error.message : "network";
    await new Promise((resolve) => setTimeout(resolve, 700));
    try {
      return await run();
    } catch (again) {
      const second = again instanceof Error ? again.message : reason;
      throw new Error(/timeout|aborted|abort/i.test(second) ? `timeout: ${second}` : second);
    }
  }
}

function parseJsonObject(text: string): Record<string, unknown> {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : trimmed;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("The coach did not return a draft.");
  const value = JSON.parse(raw.slice(start, end + 1)) as unknown;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("The coach did not return a draft.");
  }
  return value as Record<string, unknown>;
}

function asText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function readable(value: unknown, max: number) {
  const text = asText(value, max).replace(/^(?:agentDoes|rmSees|benefits|name|text)\s*:\s*/i, "").trim();
  if (!text || text.startsWith("{") || text.startsWith("[") || text.includes('"painpoint"') || text.includes('"brief"')) return "";
  return text;
}

function asAgentName(value: unknown) {
  let text = asText(value, 200).replace(/^(?:call it|it's called|it is called|the name is|name)\b:?\s+/i, "");
  text = (text.split(/[.!?]/)[0] ?? text).replace(/[^\w\s'-]/g, " ");
  const words = text.trim().split(/\s+/).filter(Boolean).slice(0, 4);
  return words.join(" ").slice(0, 40);
}

function needsMoreThought(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return false;
  const stubs = words.filter((word) => word.length <= 2).length;
  if (stubs / words.length > 0.45) return true;
  const long = words.filter((word) => word.replace(/[^a-z]/gi, "").length >= 5);
  const mashed = long.filter((word) => {
    const chars = word.toLowerCase().replace(/[^a-z]/g, "");
    const unique = new Set(chars).size;
    return unique <= 3 || /(.)\1{3,}/.test(chars) || /asd|asdf|qwer|zxcv|hjkl|dfgh/.test(chars);
  });
  return long.length > 0 && mashed.length / long.length >= 0.5;
}

function holdNote(question: string) {
  return `Give this more thought before I refine “${question}”. Write a real sentence about this painpoint. A mash of letters, or a line that could fit any job, is not enough yet.`;
}

function field(source: Record<string, unknown>, names: string[]) {
  for (const name of names) {
    const value = asText(source[name], 800);
    if (value) return value;
  }
  return "";
}

async function chat(apiKey: string, messages: unknown[], maxTokens: number, temperature: number, models = PROTOTYPE_MODELS) {
  let last = "AI request failed";
  for (let i = 0; i < models.length; i++) {
    const started = Date.now();
    debugNote("chat", { model: models[i], maxTokens, temperature, messages: summarizeMessages(messages) });
    const route = routeModel(apiKey, models[i]);
    const res = await postJson(route.url, apiKey, {
      model: route.model,
      ...route.extra,
      temperature,
      max_tokens: maxTokens,
      messages,
    });
    if (res.ok) {
      const body = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const text = body.choices?.[0]?.message?.content ?? "";
      debugNote("chat", { model: models[i], status: res.status, text: text.slice(0, 4000) }, { ms: Date.now() - started, ok: Boolean(text.trim()) });
      if (!text.trim()) return { ok: false as const, error: "AI returned an empty answer." };
      return { ok: true as const, text };
    }
    last = await readError(res);
    debugNote("chat", { model: models[i], status: res.status, error: last }, { ms: Date.now() - started, ok: false });
    const tryNext = (res.status === 400 || res.status === 404) && i < models.length - 1;
    if (!tryNext) break;
  }
  return { ok: false as const, error: last };
}

const DEEPSEEK_MODEL = "~deepseek/deepseek-flash-latest";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export type PrototypeEngine = "grok" | "deepseek";

let openRouterKeyProblem = "";

async function openRouterKey(pasted?: string) {
  const fromClient = pasted?.trim();
  if (fromClient) {
    shared.__cyaOpenRouterKey = fromClient;
    return fromClient;
  }
  if (shared.__cyaOpenRouterKey) return shared.__cyaOpenRouterKey;
  const env = process.env as Record<string, string | undefined>;
  const fromEnv = env["OPENROUTER_API_KEY"]?.trim();
  if (fromEnv) {
    shared.__cyaOpenRouterKey = fromEnv;
    return fromEnv;
  }
  const paths = ["/workspace/.grok/openrouter-inference-key", "/workspace/.grok/openrouter-key"];
  const errors: string[] = [];
  const readers: Array<(path: string) => string> = [];
  if (typeof process.getBuiltinModule === "function") {
    try {
      const fs = process.getBuiltinModule("fs");
      readers.push((path) => fs.readFileSync(path, "utf8"));
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "builtin fs failed");
    }
  } else errors.push("no builtin fs");
  try {
    const fs = await new Function("return import('node:fs')")();
    readers.push((path: string) => fs.readFileSync(path, "utf8"));
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "node:fs import failed");
  }
  for (const read of readers) {
    for (const path of paths) {
      try {
        const text = read(path).trim();
        if (!text) {
          errors.push(`${path} empty`);
          continue;
        }
        shared.__cyaOpenRouterKey = text;
        try {
          env["OPENROUTER_API_KEY"] = text;
        } catch {
          /* The key is already cached. Saving it on the process is optional. */
        }
        return text;
      } catch (error) {
        errors.push(`${path}: ${error instanceof Error ? error.message : "unreadable"}`);
      }
    }
  }
  openRouterKeyProblem = errors.join(" | ") || "OpenRouter key missing";
  debugNote("deepseek", { error: openRouterKeyProblem });
  return "";
}

function textOnly(messages: unknown[]) {
  return messages.map((message) => {
    if (!message || typeof message !== "object" || !("content" in message)) return message;
    const content = (message as { content?: unknown }).content;
    if (!Array.isArray(content)) return message;
    const text = content
      .map((part) => (part && typeof part === "object" && "text" in part ? String((part as { text?: string }).text ?? "") : ""))
      .filter(Boolean)
      .join("\n");
    return { ...(message as object), content: text };
  });
}

async function readStream(res: Response, onDelta: (delta: string) => void) {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      try {
        const json = JSON.parse(data) as { choices?: { delta?: { content?: string } }[] };
        const delta = json.choices?.[0]?.delta?.content ?? "";
        if (!delta) continue;
        text += delta;
        onDelta(delta);
      } catch {
        /* A partial SSE line is finished on the next read. */
      }
    }
  }
  return text;
}

async function streamChat(
  apiKey: string,
  messages: unknown[],
  maxTokens: number,
  temperature: number,
  onDelta: (delta: string) => void,
  models = PROTOTYPE_MODELS,
) {
  let last = "AI request failed";
  for (let i = 0; i < models.length; i++) {
    const started = Date.now();
    debugNote("stream", { model: models[i], maxTokens, temperature, messages: summarizeMessages(messages) });
    const route = routeModel(apiKey, models[i]);
    const res = await postJson(route.url, apiKey, {
      model: route.model,
      ...route.extra,
      temperature,
      max_tokens: maxTokens,
      stream: true,
      messages,
    });
    if (!res.ok || !res.body) {
      last = res.ok ? "AI returned an empty answer." : await readError(res);
      debugNote("stream", { model: models[i], status: res.status, error: last }, { ms: Date.now() - started, ok: false });
      const tryNext = (res.status === 400 || res.status === 404) && i < models.length - 1;
      if (!tryNext) break;
      continue;
    }
    const text = await readStream(res, onDelta);
    debugNote("stream", { model: models[i], status: res.status, length: text.length, text: text.slice(0, 2000) }, { ms: Date.now() - started, ok: Boolean(text.trim()) });
    if (text.trim()) return { ok: true as const, text };
    last = "AI returned an empty answer.";
    break;
  }
  return { ok: false as const, error: last };
}

async function streamHtml(
  engine: PrototypeEngine,
  messages: unknown[],
  maxTokens: number,
  temperature: number,
  onDelta: (delta: string) => void,
  htmlModel?: string,
  openRouter?: string,
) {
  if (engine === "deepseek") {
    const key = await openRouterKey(openRouter);
    if (!key) {
      debugNote("deepseek", { fallback: "grok", reason: openRouterKeyProblem || "OpenRouter key missing" });
      const keyed = keyOrError();
      if (typeof keyed !== "string") return keyed;
      return streamChat(keyed, messages, maxTokens, temperature, onDelta, modelList(htmlModel, HTML_MODELS));
    }
    const ask = (body: unknown[]) =>
      postJson(OPENROUTER_URL, key, {
        model: DEEPSEEK_MODEL,
        temperature,
        max_tokens: maxTokens,
        stream: true,
        reasoning: { effort: "none" },
        messages: body,
      });
    const started = Date.now();
    debugNote("deepseek", { model: DEEPSEEK_MODEL, messages: summarizeMessages(messages) });
    let res = await ask(messages);
    if (!res.ok) res = await ask(textOnly(messages));
    if (!res.ok || !res.body) {
      const error = res.ok ? "DeepSeek returned nothing." : await readError(res);
      debugNote("deepseek", { status: res.status, error }, { ms: Date.now() - started, ok: false });
      return { ok: false as const, error };
    }
    const text = await readStream(res, onDelta);
    debugNote("deepseek", { status: res.status, length: text.length, text: text.slice(0, 1500) }, { ms: Date.now() - started, ok: Boolean(text.trim()) });
    if (!text.trim()) return { ok: false as const, error: "DeepSeek returned an empty answer." };
    return { ok: true as const, text };
  }
  const keyed = keyOrError();
  if (typeof keyed !== "string") return keyed;
  return streamChat(keyed, messages, maxTokens, temperature, onDelta, modelList(htmlModel, HTML_MODELS));
}

async function chatHtml(engine: PrototypeEngine, messages: unknown[], maxTokens: number, temperature: number, htmlModel?: string, openRouter?: string) {
  if (engine === "deepseek") {
    const key = await openRouterKey(openRouter);
    if (!key) {
      debugNote("deepseek", { fallback: "grok", reason: openRouterKeyProblem || "OpenRouter key missing" });
      const keyed = keyOrError();
      if (typeof keyed !== "string") return keyed;
      return chat(keyed, messages, maxTokens, temperature, modelList(htmlModel, HTML_MODELS));
    }
    const ask = (body: unknown[]) =>
      postJson(OPENROUTER_URL, key, {
        model: DEEPSEEK_MODEL,
        temperature,
        max_tokens: maxTokens,
        reasoning: { effort: "none" },
        messages: body,
      });
    let res = await ask(messages);
    if (!res.ok) res = await ask(textOnly(messages));
    if (!res.ok) return { ok: false as const, error: await readError(res) };
    const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = body.choices?.[0]?.message?.content ?? "";
    if (!text.trim()) return { ok: false as const, error: "DeepSeek returned an empty answer." };
    return { ok: true as const, text };
  }
  const keyed = keyOrError();
  if (typeof keyed !== "string") return keyed;
  return chat(keyed, messages, maxTokens, temperature, modelList(htmlModel, HTML_MODELS));
}

export type CoachInput = {
  target: "pain" | "brief" | "field" | "scene" | "scenes";
  field?: BriefKey;
  sceneIndex?: number;
  direction: string;
  pain: string;
  brief: Brief;
  scenes: string[];
  model?: string;
  openRouterKey?: string;
};

export const coachDraft = createServerFn({ method: "POST" })
  .validator((input: CoachInput) => input)
  .handler(async ({ data }): Promise<Ok<{ pain?: string; brief?: Brief; text?: string; paragraph?: string; paragraphs?: string[] }> | Err> => {
    const keyed = data.model === "deepseek" ? "" : keyOrError();
    if (typeof keyed !== "string") return keyed;
    const direction = (data.direction ?? "").slice(0, 400);
    const pain = (data.pain ?? "").slice(0, 500);
    const scenes = (data.scenes ?? []).slice(0, 3).map((scene) => scene.slice(0, 1000));
    const system = prompts.coach.system;

    const shared = {
      painpoint: pain || "(not chosen yet)",
      direction: direction || "(none)",
      brief: data.brief,
      scenes,
    };

    let user = "";
    if (data.target === "pain") {
      user = prompts.coach.pain(pain, direction);
    } else if (data.target === "brief") {
      user = prompts.coach.brief(shared);
    } else if (data.target === "field") {
      const key = data.field ?? "agentDoes";
      const question = BRIEF_FIELDS.find((item) => item.key === key)?.label ?? key;
      const current = key === "name" ? data.brief.name : (data.brief[key] ?? "");
      const written = current.trim().split(/\s+/).filter(Boolean).length;
      if (written < 10) return { ok: false, error: "Write at least 10 words in this box before I refine it." };
      if (needsMoreThought(current)) return { ok: true, text: holdNote(question), hold: true };
      const voice =
        key === "rmSees" || key === "benefits"
          ? "Voice: first person, as the relationship manager. Use I and my. Do not start with The agent."
          : key === "agentDoes"
            ? "Voice: third person. The assistant you want does the job that fixes the scenario. It does not cause the problem. Do not use I or you."
            : "";
      user =
        key === "name"
          ? prompts.coach.agentName(current, direction, pain)
          : prompts.coach.field(question, current, direction, pain, voice);
    } else if (data.target === "scenes") {
      user = prompts.coach.scenes(scenes, direction, pain, data.brief);
    } else {
      const index = data.sceneIndex ?? 0;
      user = prompts.coach.scene(index, scenes[index] ?? "", direction, pain, data.brief);
    }

    const messages = [
      { role: "system", content: system },
      { role: "user", content: user },
    ];

    const coachModels = modelList(data.model, COACH_MODELS);
    const askCoach = (msgs: unknown[], max: number, temperature: number, models = coachModels) =>
      data.model === "deepseek" ? chatHtml("deepseek", msgs, max, temperature, undefined, data.openRouterKey) : chat(keyed, msgs, max, temperature, models);
    let result = await askCoach(messages, 700, 0.4);
    if (!result.ok) return result;

    let parsed: Record<string, unknown>;
    try {
      parsed = parseJsonObject(result.text);
    } catch {
      const again = await askCoach(
        [
          ...messages,
          { role: "assistant", content: result.text.slice(0, 1500) },
          { role: "user", content: prompts.coach.jsonRetry },
        ],
        700,
        0.2,
      );
      if (!again.ok) return { ok: false, error: "The coach draft could not be read. Try again." };
      try {
        parsed = parseJsonObject(again.text);
      } catch {
        return { ok: false, error: "The coach draft could not be read. Try again." };
      }
    }

    if (data.target === "pain") {
      const next = readable(parsed.pain ?? parsed.text, 220);
      if (!next) return { ok: false, error: "The coach returned an empty painpoint." };
      return { ok: true, pain: next };
    }
    if (data.target === "scene") {
      const paragraph = readable(parsed.paragraph ?? parsed.scene ?? parsed.text, 500);
      if (!paragraph) return { ok: false, error: "The coach returned an empty scene." };
      return { ok: true, paragraph };
    }
    if (data.target === "field") {
      const question = BRIEF_FIELDS.find((item) => item.key === (data.field ?? "agentDoes"))?.label ?? "this box";
      const holding = parsed.hold === true || parsed.hold === "true";
      if (holding) {
        const note = readable(parsed.text ?? parsed.note, 320) || holdNote(question);
        return { ok: true, text: note, hold: true };
      }
      const pick = () =>
        data.field === "name"
          ? asAgentName(readable(parsed.text ?? parsed.value ?? parsed.name, 80))
          : readable(parsed.text ?? parsed.value ?? parsed.paragraph, 400);
      let text = pick();
      if (!text) {
        const again = await askCoach(
          [...messages, { role: "user", content: 'That copied the notes. Return only {"text":"the sentence"}.' }],
          400,
          0.2,
        );
        if (again.ok) {
          try {
            parsed = parseJsonObject(again.text);
            text = pick();
          } catch {
            text = "";
          }
        }
      }
      if (!text) return { ok: false, error: "The assistant came back empty. Try once more." };
      if (data.field === "name" && /\b(thief|killer|burden|pain|chaos|nightmare|enemy)\b/i.test(text)) {
        const again = await askCoach(
          [...messages, { role: "user", content: 'That name is negative. Return a positive helper name only, JSON: {"text":"..."}' }],
          80,
          0.2,
        );
        if (again.ok) {
          try {
            parsed = parseJsonObject(again.text);
            const renamed = pick();
            if (renamed && !/\b(thief|killer|burden|pain|chaos|nightmare|enemy)\b/i.test(renamed)) text = renamed;
          } catch {
            /* Keep the first name only if the retry cannot be read. */
          }
        }
      }
      return { ok: true, text };
    }
    if (data.target === "scenes") {
      const raw = Array.isArray(parsed.scenes) ? parsed.scenes : Array.isArray(parsed.paragraphs) ? parsed.paragraphs : [];
      const paragraphs = [0, 1, 2].map((index) => readable(raw[index], 500));
      if (paragraphs.some((item) => !item)) {
        return { ok: false, error: "The coach left a scene empty. Try again." };
      }
      return { ok: true, paragraphs };
    }
    const source =
      parsed.brief && typeof parsed.brief === "object" && !Array.isArray(parsed.brief)
        ? (parsed.brief as Record<string, unknown>)
        : parsed;
    const brief: Brief = {
      name: asAgentName(readable(field(source, ["name", "agentName", "title"]), 80)),
      agentDoes: readable(field(source, ["agentDoes", "agent", "whatTheAgentShouldDo", "does"]), 400),
      rmSees: readable(field(source, ["rmSees", "sees", "whatTheRmSees", "output"]), 400),
      benefits: readable(field(source, ["benefits", "benefit", "conversation", "value"]), 400),
    };
    const missing = (["name", "agentDoes", "rmSees", "benefits"] as const).filter((key) => !brief[key]);
    if (missing.length > 0) {
      return { ok: false, error: "The coach left part of the brief empty. Try again." };
    }
    return { ok: true, brief };
  });

export const generateSceneImage = createServerFn({ method: "POST" })
  .validator((input: { index: number; paragraph: string; context?: string; others?: string; model?: string }) => input)
  .handler(async ({ data }): Promise<Ok<{ dataUrl: string }> | Err> => {
    const keyed = keyOrError();
    if (typeof keyed !== "string") return keyed;
    const paragraph = (data.paragraph ?? "").trim().slice(0, 1000);
    if (paragraph.length < 8) return { ok: false, error: "Write the scene paragraph first." };
    const context = (data.context ?? "").trim().slice(0, 400);
    const others = (data.others ?? "").trim().slice(0, 700);
    const prompt = prompts.sceneImage.build(data.index ?? 0, paragraph, context, others);

    const attempts: { model: string; resolution: "1k" | "2k" }[] = [
      { model: (data.model ?? "").trim() || "grok-imagine-image-quality", resolution: "1k" },
      { model: "grok-imagine-image", resolution: "1k" },
    ];

    let last = "Image generation failed.";
    for (const attempt of attempts) {
      const started = Date.now();
      debugNote("image", { model: attempt.model, prompt: prompt.slice(0, 2000) });
      const res = await postJson("https://api.x.ai/v1/images/generations", keyed, {
        model: attempt.model,
        prompt,
        n: 1,
        resolution: attempt.resolution,
        response_format: "b64_json",
      });
      if (res.ok) {
        const body = (await res.json()) as { data?: { b64_json?: string; url?: string }[] };
        const first = body.data?.[0];
        if (first?.b64_json) {
          debugNote("image", { model: attempt.model, status: res.status, bytes: first.b64_json.length }, { ms: Date.now() - started, ok: true });
          return { ok: true, dataUrl: `data:image/png;base64,${first.b64_json}` };
        }
        if (first?.url) {
          const fetched = await fetch(first.url);
          if (!fetched.ok) return { ok: false, error: "The image link could not be saved. Try again." };
          const bytes = new Uint8Array(await fetched.arrayBuffer());
          let binary = "";
          const chunk = 0x8000;
          for (let i = 0; i < bytes.length; i += chunk) {
            binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
          }
          const type = fetched.headers.get("content-type") || "image/png";
          return { ok: true, dataUrl: `data:${type};base64,${btoa(binary)}` };
        }
        return { ok: false, error: "Image generation returned nothing. Try again." };
      }
      last = await readError(res);
      debugNote("image", { model: attempt.model, status: res.status, error: last }, { ms: Date.now() - started, ok: false });
      const tryNext = res.status === 400 || res.status === 404;
      if (!tryNext) break;
    }
    return { ok: false, error: last };
  });

type PrototypeInput = {
  pain: string;
  brief: Brief;
  scenes: string[];
  step: number;
  previousHtml?: string;
  image?: string;
  images?: string[];
  engine?: PrototypeEngine;
  htmlModel?: string;
  openRouterKey?: string;
};

function engineOf(value: string | undefined): PrototypeEngine {
  return value === "deepseek" ? "deepseek" : "grok";
}

function prototypeRequest(data: PrototypeInput) {
  const step = data.step === 2 || data.step === 3 ? data.step : 1;
  const scene = data.scenes[step - 1] ?? "";
  const previous = data.previousHtml ?? "";
  const others = [0, 1, 2]
    .filter((index) => index !== step - 1)
    .map((index) => `Step ${index + 1}: ${data.scenes[index] ?? ""}`)
    .join("\n");
  const already = [1, 2, 3]
    .filter((item) => item !== step)
    .map((item) => {
      const text = plainText(findSection(previous, item)).slice(0, 700);
      return text ? `Step ${item} already shows: ${text}` : "";
    })
    .filter(Boolean)
    .join("\n");
  const prior = step > 1 ? shellOf(previous) : "";
  const instruction = prompts.prototype.instruction({
    step,
    style: styleHint(previous),
    pain: data.pain,
    brief: data.brief,
    scene,
    others,
    already,
    prior,
    agent: step > 1 ? agentOf(previous) : "",
  });
  const shot = (data.image || data.images?.[step - 1] || "").trim();
  const shots = shot.startsWith("data:image/") ? [shot] : [];
  const messages = (extra: string) => [
    { role: "system", content: prompts.prototype.system },
    {
      role: "user",
      content: shots.length
        ? [
            ...shots.flatMap((url) => [
              { type: "text", text: "This picture is the work area. Draw its chart as inline SVG if it has one, and still include one chart, inline SVG icons, and a progress bar. Keep the cards, numbers, and names." },
              { type: "image_url", image_url: { url, detail: "high" } },
            ]),
            { type: "text", text: `${instruction}\n${extra}` },
          ]
        : `${instruction}\n${extra}`,
    },
  ];
  return { step, previous, messages };
}

function assemblePrototype(text: string, data: PrototypeInput, step: number, previous: string, strict = true) {
  const section = cleanFragment(extractSection(text, step));
  const stripped = cleanFragment(stripOtherSteps(section, step));
  const chosen = plainText(stripped).length >= 40 ? stripped : section;
  if (plainText(chosen).length < 40) return "";
  if (strict && previous && tooSimilar(chosen, previous)) return "";
  const assembled = previous.includes("<")
    ? rebuildPrototype(previous, chosen, step)
    : `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${chosen}</body></html>`;
  return sanitizeHtml(assembled);
}

export const generatePrototype = createServerFn({ method: "POST" })
  .validator((input: PrototypeInput) => input)
  .handler(async ({ data }): Promise<Ok<{ html: string }> | Err> => {
    const engine = engineOf(data.engine);
    const { step, previous, messages } = prototypeRequest(data);
    const ask = (extra: string) => chatHtml(engine, messages(extra), 8000, step === 1 ? 0.3 : 0.5, data.htmlModel, data.openRouterKey);
    let result = await ask("");
    if (!result.ok) return result;
    let html = assemblePrototype(result.text, data, step, previous);
    if (!html) {
      const again = await ask(plainText(extractSection(result.text, step)).length < 40 ? prompts.prototype.emptyRetry : prompts.prototype.repeatRetry);
      if (again.ok) html = assemblePrototype(again.text, data, step, previous);
    }
    if (!html) return { ok: false, error: `Step ${step} repeated an earlier screen. Generate again.` };
    return { ok: true, html };
  });

export function openPrototypeStream(data: PrototypeInput) {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (payload: object) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      try {
        const engine = engineOf(data.engine);
        const { step, previous, messages } = prototypeRequest(data);
        const temperature = step === 1 ? 0.3 : 0.5;
        let result = await streamHtml(engine, messages(""), 8000, temperature, (delta) => send({ delta }), data.htmlModel, data.openRouterKey);
        if (!result.ok) {
          send({ error: result.error });
          return;
        }
        let html = assemblePrototype(result.text, data, step, previous);
        if (!html) {
          send({ reset: true });
          const extra = plainText(extractSection(result.text, step)).length < 40 ? prompts.prototype.emptyRetry : prompts.prototype.repeatRetry;
          result = await streamHtml(engine, messages(extra), 8000, temperature, (delta) => send({ delta }), data.htmlModel, data.openRouterKey);
          if (result.ok) html = assemblePrototype(result.text, data, step, previous);
        }
        if (!html) {
          send({ error: `Step ${step} repeated an earlier screen. Generate again.` });
          return;
        }
        send({ html });
      } catch {
        send({ error: "The demo did not come back. Try again." });
      } finally {
        controller.close();
      }
    },
  });
}

function sanitizeHtml(raw: string) {
  let html = raw.trim();
  const fenced = html.match(/```(?:html)?\s*([\s\S]*?)```/i);
  if (fenced) html = fenced[1].trim();
  if (!html.includes("<")) return "";
  if (!/^<!doctype html>|^<html/i.test(html)) {
    html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${html}</body></html>`;
  }
  html = html.replace(/<script\b[^>]*\bsrc\s*=[^>]*>\s*<\/script>/gi, "");
  html = html.replace(/<link\b[^>]*>/gi, "");
  html = html.replace(/<iframe\b[\s\S]*?<\/iframe>/gi, "");
  html = html.replace(/<iframe\b[^>]*\/?>/gi, "");
  html = html.replace(/<object\b[\s\S]*?<\/object>/gi, "");
  html = html.replace(/<embed\b[^>]*\/?>/gi, "");
  html = html.replace(/<img\b[^>]*>/gi, "");
  const csp =
    '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; script-src \'unsafe-inline\';">';
  const fit =
    "<style>html,body{height:100%;margin:0;overflow:auto;background:#fff;color:#161616;font-family:system-ui,sans-serif}[hidden]{display:none!important}[data-step]{box-sizing:border-box;min-height:100%}[data-step][hidden]{display:none!important}*{box-sizing:border-box}</style>";
  if (!html.includes("data-step]{box-sizing")) {
    if (/<head[^>]*>/i.test(html)) html = html.replace(/<head[^>]*>/i, (match) => `${match}${csp}${fit}`);
    else html = html.replace(/<html[^>]*>/i, (match) => `${match}<head>${csp}${fit}</head>`);
  }
  const stepper = `<script>(function(){function show(step){var nodes=document.querySelectorAll("[data-step]");var note=document.getElementById("cya-missing");var found=false;nodes.forEach(function(el){var on=el.getAttribute("data-step")===String(step);el.hidden=!on;if(on)found=true;});if(!found){if(!note){note=document.createElement("p");note.id="cya-missing";note.style.cssText="margin:0;padding:24px;font:18px/1.4 system-ui,sans-serif";document.body.appendChild(note);}note.hidden=false;note.textContent="Step "+step+" is not ready yet.";}else if(note){note.hidden=true;}}show(1);window.addEventListener("message",function(event){if(!event.data||event.data.type!=="cya-step")return;show(event.data.step);});})();</script>`;
  if (!html.includes("cya-step")) {
    if (/<\/body>/i.test(html)) html = html.replace(/<\/body>/i, `${stepper}</body>`);
    else html += stepper;
  }
  return html;
}

function findSection(html: string, step: number) {
  const open = new RegExp(`<section\\b[^>]*\\bdata-step\\s*=\\s*["']${step}["'][^>]*>`, "i");
  const start = html.search(open);
  if (start < 0) return "";
  const openTag = html.slice(start).match(/^<section\b[^>]*>/i)?.[0] ?? "";
  let depth = 1;
  const rest = html.slice(start + openTag.length);
  const token = /<\/?section\b[^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = token.exec(rest))) {
    const isClose = match[0].startsWith("</");
    if (!isClose && depth === 1 && /data-step\s*=/i.test(match[0])) {
      return `${html.slice(start, start + openTag.length + match.index)}</section>`;
    }
    depth += isClose ? -1 : 1;
    if (depth === 0) return html.slice(start, start + openTag.length + match.index + match[0].length);
  }
  const bodyEnd = rest.search(/<\/body>/i);
  const cut = bodyEnd >= 0 ? bodyEnd : rest.length;
  return `${html.slice(start, start + openTag.length + cut)}</section>`;
}

function extractSection(raw: string, step: number) {
  let html = raw.trim();
  const fenced = html.match(/```(?:html)?\s*([\s\S]*?)```/i);
  if (fenced) html = fenced[1].trim();
  const exact = findSection(html, step);
  if (exact && plainText(exact).length >= 40) return exact;
  let rest = html;
  for (const other of [1, 2, 3]) {
    if (other === step) continue;
    let nested = findSection(rest, other);
    while (nested) {
      rest = rest.replace(nested, "");
      nested = findSection(rest, other);
    }
  }
  const inner = rest
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^<!doctype html>|<html\b[^>]*>|<\/html>|<head\b[\s\S]*?<\/head>|<body\b[^>]*>|<\/body>/gi, " ")
    .trim();
  if (plainText(inner).length >= 40) return `<section data-step="${step}">${inner}</section>`;
  if (plainText(html).length >= 40 && !/data-step\s*=/i.test(html)) return `<section data-step="${step}">${html}</section>`;
  return exact || "";
}

function lostChat(before: string, after: string) {
  if (!/chat|assistant|message/i.test(before)) return false;
  return !/chat|assistant|message/i.test(after);
}

function stripOtherSteps(section: string, step: number) {
  let out = section;
  for (const other of [1, 2, 3]) {
    if (other === step) continue;
    let nested = findSection(out, other);
    while (nested) {
      out = out.replace(nested, "");
      nested = findSection(out, other);
    }
  }
  return out;
}

function plainText(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function agentOf(html: string) {
  const section = extractSection(html, 1);
  const at = section.search(/placeholder="[^"]*(ask|reply|message|chat)/i);
  if (at < 0) return section.slice(-900);
  const start = section.lastIndexOf("<div", at);
  return section.slice(start < 0 ? Math.max(0, at - 600) : start, (start < 0 ? at : start) + 1400);
}

function shellOf(html: string) {
  const section = extractSection(html, 1);
  const header = section.match(/<header\b[^>]*>[\s\S]*?<\/header>/i)?.[0];
  return (header || section).slice(0, 700);
}

function tooSimilar(section: string, previousHtml: string) {
  const nextWords = new Set(plainText(section).toLowerCase().split(" ").filter((word) => word.length > 4));
  if (nextWords.size < 12) return false;
  let prior = "";
  for (const step of [3, 2, 1]) {
    prior = plainText(findSection(previousHtml, step));
    if (prior.length > 40) break;
  }
  const priorWords = prior.toLowerCase().split(" ").filter((word) => word.length > 4);
  if (priorWords.length < 12) return false;
  const priorSet = new Set(priorWords);
  let shared = 0;
  for (const word of nextWords) if (priorSet.has(word)) shared += 1;
  const union = nextWords.size + priorSet.size - shared;
  return union > 0 && shared / union > 0.72;
}

function styleHint(html: string) {
  if (!html) return prompts.prototype.styleFallback;
  const colors = [...new Set([...html.matchAll(/#[0-9a-fA-F]{3,8}/g)].map((match) => match[0].toLowerCase()))].slice(0, 6);
  return prompts.prototype.styleWithColors(colors);
}

function cleanFragment(section: string) {
  return section
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<img\b[^>]*>/gi, "")
    .replace(/<iframe\b[\s\S]*?<\/iframe>/gi, "")
    .replace(/<iframe\b[^>]*\/?>/gi, "")
    .replace(/<link\b[^>]*>/gi, "");
}

function rebuildPrototype(previous: string, section: string, step: number) {
  const parts: string[] = [];
  for (let item = 1; item <= 3; item += 1) {
    if (item === step) {
      parts.push(section);
      continue;
    }
    const prior = findSection(previous, item);
    if (plainText(prior).length >= 40) parts.push(prior);
  }
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${parts.join("")}</body></html>`;
}

function upsertSection(doc: string, step: number, section: string) {
  let next = doc;
  for (let guard = 0; guard < 6; guard += 1) {
    const existing = findSection(next, step);
    if (!existing) break;
    next = next.replace(existing, "");
  }
  if (/<body[^>]*>/i.test(next)) return next.replace(/<body[^>]*>/i, (match) => `${match}${section}`);
  return `${next}${section}`;
}

export const refinePrototype = createServerFn({ method: "POST" })
  .validator(
    (input: {
      html: string;
      direction: string;
      pain: string;
      brief: Brief;
      scenes: string[];
      step: number;
      image?: string;
      images?: string[];
      engine?: PrototypeEngine;
      htmlModel?: string;
      openRouterKey?: string;
    }) => input,
  )
  .handler(async ({ data }): Promise<Ok<{ html: string }> | Err> => {
    const current = (data.html ?? "").slice(0, 80_000);
    if (!current.includes("<")) return { ok: false, error: "Generate a demo before asking for an edit." };
    const direction = (data.direction ?? "").trim().slice(0, 400);
    if (direction.length < 3) return { ok: false, error: "Say what to change." };
    const step = data.step === 2 || data.step === 3 ? data.step : 1;
    const before = extractSection(current, step);
    const instruction = prompts.refine.instruction({
      step,
      direction,
      pain: data.pain,
      brief: data.brief,
      scene: data.scenes[step - 1] ?? "",
      current: before || current.slice(0, 8000),
    });
    const shots = (data.images ?? []).map((url) => (url ?? "").trim()).slice(0, 3);
    const picture = (shots[step - 1] || data.image || "").trim();
    const userContent = picture.startsWith("data:image/")
      ? [
          { type: "text", text: instruction },
          { type: "text", text: `Original screen for step ${step}. Match this picture's content. Keep the same visual style as the other steps.` },
          { type: "image_url", image_url: { url: picture, detail: "high" } },
          ...shots.flatMap((url, index) =>
            !url.startsWith("data:image/") || index + 1 === step
              ? []
              : [
                  { type: "text", text: `Step ${index + 1}, for visual continuity only. Do not copy its work area.` },
                  { type: "image_url", image_url: { url, detail: "low" } },
                ],
          ),
        ]
      : instruction;
    const ask = (extra: string) =>
      chatHtml(
        engineOf(data.engine),
        [
          { role: "system", content: prompts.refine.system },
          {
            role: "user",
            content: extra && Array.isArray(userContent) ? [...userContent, { type: "text", text: extra }] : extra ? `${instruction}\n${extra}` : userContent,
          },
        ],
        8000,
        0.4,
        data.htmlModel,
        data.openRouterKey,
      );
    let result = await ask("");
    if (!result.ok) return result;
    let section = cleanFragment(stripOtherSteps(extractSection(result.text, step), step));
    if (section && lostChat(before, section)) {
      result = await ask("You removed the agent chat. Put that pane back on the right, in the same row as the main screen, then apply the edit.");
      if (!result.ok) return result;
      section = cleanFragment(stripOtherSteps(extractSection(result.text, step), step));
    }
    if (!section) return { ok: false, error: "That edit was not usable HTML. Try again." };
    const html = sanitizeHtml(upsertSection(current, step, section));
    if (!html) return { ok: false, error: "That edit was not usable HTML. Try again." };
    return { ok: true, html };
  });

