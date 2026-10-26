import { createRoot } from "react-dom/client";
import { Studio } from "@/components/studio";
import "@/styles.css";

const FUNCTION_URL = "https://yquxqmduxotoqusrlfbd.supabase.co/functions/v1/workshop";

try {
  window.localStorage.setItem("cya-desktop", "1");
  if (!window.localStorage.getItem("cya-supabase-fn")?.trim()) {
    window.localStorage.setItem("cya-supabase-fn", FUNCTION_URL);
  }
} catch {
  /* The page still opens. The function URL just cannot be saved. */
}

const root = document.getElementById("root");
if (!root) {
  document.body.insertAdjacentHTML("beforeend", "<p>Could not start: the page has no root.</p>");
} else {
  try {
    createRoot(root).render(<Studio />);
  } catch (error) {
    root.textContent = error instanceof Error ? error.stack || error.message : String(error);
  }
}
