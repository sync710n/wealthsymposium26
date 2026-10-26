export const WORKSHOP_URL = "https://yquxqmduxotoqusrlfbd.supabase.co/functions/v1/workshop";

export async function workshopCall<T>(action: string, data: unknown): Promise<T> {
  const response = await fetch(WORKSHOP_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, data }),
  });
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    return { ok: false, error: text.slice(0, 280) || `Supabase returned ${response.status}.` } as T;
  }
}

export function workshopAction<T>(action: string) {
  return (input?: { data?: unknown }) => workshopCall<T>(action, input?.data ?? {});
}
