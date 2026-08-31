// Sync coaches & trophy-case data from the AD's two Google Docs into
// data/teaminfo.json. Runs in the same scheduled GitHub Action as the
// MaxPreps score sync.
//
// Doc format (see the docs themselves for the AD-facing instructions):
//   Team heading lines end with the team's [slug], e.g. "Football - Varsity [vfb]"
//   Coaches doc:  one coach per line under a heading:  Name - Role
//   Trophy doc:   one category per line:  Category: year, year, year
//                 optional free text:      History: ...
// Anything that doesn't match is ignored, never fatal.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SEASONS, DOCS, docTxtUrl } from "../config.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(root, "data", "teaminfo.json");
const UA = "Mozilla/5.0 (compatible; WHS-Schedules/1.0; +https://whs.wsesu.net) school schedule sync";

const validSlugs = new Set(SEASONS.flatMap((s) => s.teams.map((t) => t.slug)));

const HEADING_RE = /\[([a-z]+)\]\s*$/;

// Google Docs txt export can carry a BOM (U+FEFF) and non-breaking spaces (U+00A0).
function cleanLine(rawLine) {
  return rawLine.replace(/﻿/g, "").replace(/ /g, " ").trim();
}

export function parseCoachesDoc(text, teams = {}) {
  let slug = null;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = cleanLine(rawLine);
    if (!line) continue;
    const heading = line.match(HEADING_RE);
    if (heading) {
      // Keep data for codes not (yet) in config — e.g. spring teams whose
      // schedule grid isn't connected yet. The app only reads slugs it knows.
      slug = heading[1];
      if (!validSlugs.has(slug)) console.warn(`note: [${slug}] not in config yet — keeping its data`);
      continue;
    }
    if (!slug) continue; // instructions / season dividers before or between headings
    const m = line.match(/^(.+?)\s+[-–—]\s+(.+)$/);
    if (!m) continue;
    (teams[slug] ??= {});
    (teams[slug].coaches ??= []).push({ name: m[1].trim(), role: m[2].trim() });
  }
  return teams;
}

export function parseTrophiesDoc(text, teams = {}) {
  let slug = null;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = cleanLine(rawLine);
    if (!line) continue;
    const heading = line.match(HEADING_RE);
    if (heading) {
      slug = heading[1];
      if (!validSlugs.has(slug)) console.warn(`note: [${slug}] not in config yet — keeping its data`);
      continue;
    }
    if (!slug) continue;
    const m = line.match(/^(.+?):\s*(.+)$/);
    if (!m) continue;
    const label = m[1].trim();
    const value = m[2].trim();
    (teams[slug] ??= {});
    if (/^history$/i.test(label)) {
      teams[slug].history = value;
    } else {
      const years = value.split(",").map((y) => y.trim()).filter(Boolean);
      if (years.length) (teams[slug].trophies ??= []).push({ label, years });
    }
  }
  return teams;
}

async function fetchDoc(name, docId) {
  const res = await fetch(docTxtUrl(docId), { headers: { "user-agent": UA }, redirect: "follow" });
  if (!res.ok) throw new Error(`${name} doc: HTTP ${res.status} (is it shared "Anyone with the link: Viewer"?)`);
  return await res.text();
}

// Script entry (skipped when imported by tests).
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const teams = {};
    parseCoachesDoc(await fetchDoc("coaches", DOCS.coaches), teams);
    parseTrophiesDoc(await fetchDoc("trophies", DOCS.trophies), teams);

    const teamCount = Object.keys(teams).length;
    if (!teamCount) throw new Error("parsed zero teams — doc format problem? keeping existing teaminfo.json");
    for (const [slug, t] of Object.entries(teams)) {
      console.log(`${slug}: ${t.coaches?.length ?? 0} coach(es), ${t.trophies?.length ?? 0} trophy group(s)${t.history ? ", history" : ""}`);
    }

    mkdirSync(dirname(OUT), { recursive: true });
    if (existsSync(OUT)) {
      try {
        const prev = JSON.parse(readFileSync(OUT, "utf8"));
        if (JSON.stringify(prev.teams) === JSON.stringify(teams)) {
          console.log("No team info changes.");
          process.exit(0);
        }
      } catch { /* rewrite */ }
    }
    writeFileSync(OUT, JSON.stringify({ generated: new Date().toISOString(), teams }, null, 1) + "\n");
    console.log(`Wrote ${OUT}`);
  } catch (err) {
    console.error(`teaminfo sync FAILED: ${err.message}`);
    process.exit(1); // existing data/teaminfo.json is left untouched
  }
}
