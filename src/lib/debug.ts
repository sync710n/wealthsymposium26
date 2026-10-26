export type DebugEntry = {
  at: string;
  side: "client" | "server";
  name: string;
  ms?: number;
  ok?: boolean;
  detail: string;
};

const clientLog: DebugEntry[] = [];
const listeners = new Set<() => void>();

export function debugPush(entry: { name: string; detail: string; ms?: number; ok?: boolean }) {
  clientLog.push({ at: new Date().toISOString(), side: "client", ...entry });
  if (clientLog.length > 80) clientLog.shift();
  listeners.forEach((listen) => listen());
}

export function debugClientLog() {
  return clientLog.slice();
}

export function debugSubscribe(listen: () => void) {
  listeners.add(listen);
  return () => {
    listeners.delete(listen);
  };
}

export function debugClearClient() {
  clientLog.length = 0;
  listeners.forEach((listen) => listen());
}

export function scrub(value: unknown) {
  const seen = new WeakSet<object>();
  try {
    return (
      JSON.stringify(
        value,
        (key, item) => {
          if (/key|authorization|secret|bearer/i.test(key)) return "[redacted]";
          if (typeof item === "string" && item.startsWith("data:")) return `[data ${item.length}]`;
          if (typeof item === "string" && item.length > 2500) return `${item.slice(0, 2500)}…[${item.length}]`;
          if (item && typeof item === "object") {
            if (seen.has(item)) return "[circular]";
            seen.add(item);
          }
          return item;
        },
        2,
      ) ?? ""
    );
  } catch {
    return String(value);
  }
}

export async function traced<T>(name: string, payload: unknown, run: () => Promise<T>): Promise<T> {
  const started = Date.now();
  debugPush({ name, detail: `request\n${scrub(payload)}` });
  try {
    const result = await run();
    const ms = Date.now() - started;
    const ok = !(result && typeof result === "object" && "ok" in result && (result as { ok: boolean }).ok === false);
    debugPush({ name, ms, ok, detail: `response ${ms}ms\n${scrub(result)}` });
    return result;
  } catch (error) {
    const ms = Date.now() - started;
    const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    debugPush({ name, ms, ok: false, detail: `error ${ms}ms\n${message}` });
    throw error;
  }
}

export const MODEL_OPTIONS = {
  coach: ["grok-4-1-fast-non-reasoning", "grok-code-fast-1", "grok-4.5", "grok-4.7"],
  html: ["grok-4.7", "grok-4.5", "grok-4-1-fast-non-reasoning", "grok-code-fast-1"],
  image: ["grok-imagine-image-quality", "grok-imagine-image"],
} as const;

export type DebugModels = { coach: string; html: string; image: string };

export function debugModels(): DebugModels {
  const defaults: DebugModels = {
    coach: "deepseek",
    html: "deepseek",
    image: MODEL_OPTIONS.image[0],
  };
  if (typeof window === "undefined") return defaults;
  try {
    const raw = window.localStorage.getItem("cya-debug-models");
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<DebugModels>;
    return {
      coach:
        (MODEL_OPTIONS.coach as readonly string[]).includes(parsed.coach ?? "") || parsed.coach === "deepseek"
          ? parsed.coach!
          : defaults.coach,
      html:
        (MODEL_OPTIONS.html as readonly string[]).includes(parsed.html ?? "") || parsed.html === "deepseek"
          ? parsed.html!
          : defaults.html,
      image: (MODEL_OPTIONS.image as readonly string[]).includes(parsed.image ?? "") ? parsed.image! : defaults.image,
    };
  } catch {
    return defaults;
  }
}

export function saveDebugModels(next: DebugModels) {
  window.localStorage.setItem("cya-debug-models", JSON.stringify(next));
}
