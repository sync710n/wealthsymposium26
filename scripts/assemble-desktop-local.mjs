import { readFileSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";

const dir = join(import.meta.dirname, "..", "Desktop Local");
const jsPath = join(dir, "workshop.js");
const cssPath = join(dir, "workshop.css");
if (!existsSync(jsPath) || !existsSync(cssPath)) {
  console.error("Build the desktop page before assembling it.");
  process.exit(1);
}

const js = readFileSync(jsPath, "utf8").replace(/<\/script/gi, "<\\/script");
const css = readFileSync(cssPath, "utf8").replace(/<\/style/gi, "<\\/style");

const page = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Wealth Symposium</title>
    <style>${css}</style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module">${js}</script>
  </body>
</html>
`;

writeFileSync(join(dir, "index.html"), page);
rmSync(jsPath, { force: true });
rmSync(cssPath, { force: true });
console.log(`Wrote ${join(dir, "index.html")} (${page.length} bytes)`);
