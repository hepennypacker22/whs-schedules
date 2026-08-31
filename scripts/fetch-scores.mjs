// Fetch final scores from MaxPreps for every team with a `maxpreps` path in
// config.js and write data/scores.json. Runs on a schedule in GitHub Actions;
// the page merges these results into the schedule client-side.
//
// MaxPreps schedule pages are Next.js: game data lives in the __NEXT_DATA__
// JSON blob (props.pageProps.contests). Entries are positional arrays, so we
// extract defensively — anything that doesn't match is skipped, never fatal.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SEASONS } from "../config.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(root, "data", "scores.json");
const UA = "Mozilla/5.0 (compatible; WHS-Schedules/1.0; +https://whs.wsesu.net) school schedule sync";

function extractNextData(html) {
  const m = html.match(/<script id="__NEXT_DATA__" type="application\/json"[^>]*>(.*?)<\/script>/s);
  return m ? JSON.parse(m[1]) : null;
}

// A "team entry" is an array holding [... , "W"|"L"|"T", score, ..., shortName, ...].
function readTeamEntry(entry) {
  if (!Array.isArray(entry)) return null;
  let letter = null, score = null;
  for (let i = 0; i < entry.length - 1; i++) {
    if ((entry[i] === "W" || entry[i] === "L" || entry[i] === "T") && typeof entry[i + 1] === "number") {
      letter = entry[i];
      score = entry[i + 1];
      break;
    }
  }
  // short display name: first string after the schedule-URL element
  let name = null;
  const urlIdx = entry.findIndex((x) => typeof x === "string" && x.includes("/schedule/"));
  if (urlIdx !== -1 && typeof entry[urlIdx + 1] === "string") name = entry[urlIdx + 1];
  if (!name) return null;
  return { name: name.replace(/\*+$/, "").trim(), letter, score };
}

function gameDateFrom(contest) {
  // most reliable: the boxscore URL ends /M-D-YYYY/
  for (const el of contest) {
    if (typeof el === "string" && el.includes("/game/")) {
      const m = el.match(/\/(\d{1,2})-(\d{1,2})-(\d{4})\//);
      if (m) return `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
    }
  }
  // fallback: an ISO datetime that is NOT a creation timestamp is hard to tell
  // apart, so take the last ISO string (game datetime follows created-at).
  const isos = contest.filter((el) => typeof el === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}/.test(el));
  return isos.length ? isos[isos.length - 1].slice(0, 10) : null;
}

function parseContests(nextData) {
  const contests = nextData?.props?.pageProps?.contests;
  if (!Array.isArray(contests)) return [];
  const out = [];
  for (const contest of contests) {
    if (!Array.isArray(contest) || !Array.isArray(contest[0])) continue;
    const entries = contest[0].map(readTeamEntry).filter(Boolean);
    if (entries.length !== 2) continue;
    const us = entries.find((e) => /windsor/i.test(e.name));
    const them = entries.find((e) => !/windsor/i.test(e.name));
    if (!us || !them || !us.letter || typeof us.score !== "number" || typeof them.score !== "number") continue;
    const date = gameDateFrom(contest);
    if (!date) continue;
    out.push({ date, opponent: them.name, letter: us.letter, us: us.score, them: them.score });
  }
  return out;
}

const result = { generated: new Date().toISOString(), teams: {} };
let hadError = false;

for (const season of SEASONS) {
  for (const team of season.teams) {
    if (!team.maxpreps) continue;
    const url = `https://www.maxpreps.com${team.maxpreps}`;
    try {
      const res = await fetch(url, { headers: { "user-agent": UA } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const nextData = extractNextData(await res.text());
      if (!nextData) throw new Error("no __NEXT_DATA__ found (page layout changed?)");
      const scores = parseContests(nextData);
      result.teams[team.slug] = scores;
      console.log(`${team.slug}: ${scores.length} result(s) from ${url}`);
    } catch (err) {
      console.error(`${team.slug}: FAILED ${url} — ${err.message}`);
      hadError = true;
    }
    await new Promise((r) => setTimeout(r, 1500)); // be polite
  }
}

// Never clobber good data with an empty/failed run.
if (hadError && Object.values(result.teams).every((a) => !a.length) && existsSync(OUT)) {
  console.error("All fetches empty/failed — keeping existing scores.json");
  process.exit(1);
}

mkdirSync(dirname(OUT), { recursive: true });

// Skip the write (and the downstream commit) when nothing but the timestamp changed.
if (existsSync(OUT)) {
  try {
    const prev = JSON.parse(readFileSync(OUT, "utf8"));
    if (JSON.stringify(prev.teams) === JSON.stringify(result.teams)) {
      console.log("No score changes.");
      process.exit(0);
    }
  } catch { /* rewrite */ }
}
writeFileSync(OUT, JSON.stringify(result, null, 1) + "\n");
console.log(`Wrote ${OUT}`);
