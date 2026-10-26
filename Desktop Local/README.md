# Desktop Local

Double-click `index.html`. Safari opens the workshop from this file. The styles and the program are inside it, because Safari will not run a separate script from a folder you downloaded.

The AI calls go to Supabase, and Supabase calls OpenRouter. The key stays in Supabase.

## 1. Put the function on Supabase

The function is in `supabase/functions/workshop/`.

```bash
supabase functions deploy workshop --no-verify-jwt
supabase secrets set OPENROUTER_API_KEY=sk-or-v1-your-key
```

Do not publish the function URL. Anyone with it can spend the key.

Optional: `supabase secrets set XAI_API_KEY=...` uses Grok Imagine for the pictures. Without it, pictures go through OpenRouter.

Keep Text generation and Prototype on DeepSeek. That is the default, and it uses the OpenRouter key.

## 2. Open the page

Copy this whole folder to the laptop. Double-click `index.html`.

If macOS says the file is from the internet, right-click it, choose Open, then Open again.

Double-click **Wealth Symposium** and paste:

`https://YOUR-PROJECT.supabase.co/functions/v1/workshop`

Leave the anon key empty if you used `--no-verify-jwt`. If the call is rejected, paste the project anon key too.

## 3. Check from the company network

The laptop must be able to open `supabase.co`. It does not need to open `openrouter.ai`.

A long prototype can be cut off if the Supabase function hits its time limit.
