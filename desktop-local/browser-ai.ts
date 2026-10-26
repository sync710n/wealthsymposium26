export type PrototypeEngine = "grok" | "deepseek";

function settings() {
  const url = window.localStorage.getItem("cya-supabase-fn")?.trim() ?? "";
  const anon = window.localStorage.getItem("cya-supabase-anon")?.trim() ?? "";
  return { url, anon };
}

async function post(action: string, data: unknown) {
  const { url, anon } = settings();
  if (!url) return { ok: false as const, error: "Double-click Wealth Symposium and paste the Supabase function URL." };
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(anon ? { Authorization: `Bearer ${anon}`, apikey: anon } : {}),
      },
      body: JSON.stringify({ action, data }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The Supabase function did not answer.";
    return { ok: false as const, error: message };
  }
  const text = await response.text();
  try {
    return JSON.parse(text) as { ok: boolean; error?: string };
  } catch {
    return { ok: false as const, error: text.slice(0, 280) || `Supabase returned ${response.status}.` };
  }
}

export const coachDraft = (input: { data: unknown }) => post("coach", input.data);
export const generateSceneImage = (input: { data: unknown }) => post("image", input.data);
export const generatePrototype = (input: { data: unknown }) => post("prototype", input.data);
export const refinePrototype = (input: { data: unknown }) => post("refine", input.data);
export const readDebugLog = () => post("log", {});
export const clearServerDebugLog = () => post("clear", {});
