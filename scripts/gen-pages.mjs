// Generate the path-based entry pages: /week/ and /t/<slug>/ for every team.
// These exist because some CMS HTML blocks (SchoolBlocks included) strip
// query strings from iframe src URLs, which broke ?team= / ?view=week embeds.
// Re-run after adding teams in config.js: node scripts/gen-pages.mjs

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SEASONS, SCHOOL } from "../config.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");


function page(title, base) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<base href="${base}">
<link rel="stylesheet" href="styles.css">
</head>
<body>
<div id="app" aria-live="polite">
  <div class="loading">Loading schedule…</div>
</div>
<script type="module" src="app.js"></script>
</body>
</html>
`;
}

mkdirSync(join(root, "week"), { recursive: true });
writeFileSync(join(root, "week", "index.html"), page(`This Week — ${SCHOOL.name} Athletics`, "../"));
console.log("wrote week/index.html");

for (const season of SEASONS) {
  for (const t of season.teams) {
    const dir = join(root, "t", t.slug);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "index.html"), page(`${SCHOOL.name} ${t.name} Schedule`, "../../"));
    console.log(`wrote t/${t.slug}/index.html`);
  }
}
