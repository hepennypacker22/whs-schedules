// Parser smoke test against the live grids: every non-empty cell must become
// a game or a note (no silent drops), and per-team counts are printed for
// eyeballing against the sheet.
import { SEASONS, csvUrl } from "../config.js";
import { parseCSV, parseGrid, normalizeHeader, parseCell } from "../parser.js";

let failures = 0;

for (const season of SEASONS) {
  const res = await fetch(csvUrl(season));
  if (!res.ok) { console.error(`FAIL fetch ${season.id}: HTTP ${res.status}`); failures++; continue; }
  const csv = await res.text();
  const { teams, warnings } = parseGrid(csv, season);
  console.log(`\n=== ${season.label} ===`);
  for (const w of warnings) { console.log(`  WARNING: ${w}`); failures++; }

  // no-silent-drop check: count non-empty cells under each mapped column
  const rows = parseCSV(csv);
  const headerRow = rows[0].map(normalizeHeader);
  for (const team of season.teams) {
    const idx = headerRow.findIndex((h) => h === normalizeHeader(team.header));
    if (idx === -1) continue;
    let nonEmpty = 0;
    for (let r = 1; r < rows.length; r++) {
      const hasDate = /^\d{1,2}\/\d{1,2}$/.test(String(rows[r][1] || "").trim());
      if (hasDate && String(rows[r][idx] || "").trim()) nonEmpty++;
    }
    const entries = teams[team.slug] || [];
    const games = entries.filter((e) => e.kind === "game").length;
    const notes = entries.filter((e) => e.kind === "note").length;
    const status = nonEmpty === entries.length ? "ok" : `MISMATCH cells=${nonEmpty}`;
    if (nonEmpty !== entries.length) failures++;
    console.log(`  ${team.slug.padEnd(6)} ${String(games).padStart(3)} games ${String(notes).padStart(3)} notes  (${status})`);
    for (const e of entries.filter((e) => e.kind === "game").slice(0, 3)) {
      console.log(`         e.g. ${e.date.toDateString()} ${e.away ? "@" : "vs"} ${e.opponent}${e.time ? " " + e.time : ""}${e.venue ? " [" + e.venue + "]" : ""}`);
    }
  }
}

// targeted cell-grammar cases
const cases = [
  ["@ Woodstock 4:00PM", { kind: "game", away: true, opponent: "Woodstock", time: "4:00PM" }],
  ["Hillsboro 10:00", { kind: "game", away: false, opponent: "Hillsboro", time: "10:00" }],
  ["JV @ Bellows Falls 3:30", { kind: "game", away: true, opponent: "Bellows Falls", squad: "JV" }],
  ["@ B&B", { kind: "game", away: true, opponent: "B&B" }],
  ["Sr. Night Bellows Falls 7:00PM", { kind: "game", opponent: "Bellows Falls", note: "Sr. Night" }],
  ["PPD - Woodstock 4:30", { kind: "game", opponent: "Woodstock", status: "postponed" }],
  ["Cancelled - @ Thetford 4:30PM", { kind: "game", away: true, opponent: "Thetford", status: "cancelled" }],
  ["Woodstock 4:30 W 21-14", { kind: "game", opponent: "Woodstock", manualResult: { letter: "W", us: 21, them: 14 } }],
  ["1st Practice", { kind: "note" }],
  ["Labor Day", { kind: "note" }],
  ["OPEN", { kind: "note" }],
  ["Boys Playdowns", { kind: "note" }],
  ["Theater Performances - No Home Scrimages or Games", { kind: "note" }],
  ["@ Crown Point (SVL) TBD", { kind: "game", away: true, time: "TBD" }],
  ["", null],
  ["   ", null],
];
console.log("\n=== cell grammar ===");
for (const [input, want] of cases) {
  const got = parseCell(input);
  let ok = true;
  if (want === null) ok = got === null;
  else if (!got) ok = false;
  else for (const k of Object.keys(want)) {
    const g = got[k], w = want[k];
    if (typeof w === "object" && w !== null) {
      ok = ok && g && Object.keys(w).every((kk) => g[kk] === w[kk]);
    } else ok = ok && g === w;
  }
  if (!ok) failures++;
  console.log(`  ${ok ? "ok  " : "FAIL"} ${JSON.stringify(input)} -> ${JSON.stringify(got)}`);
}

console.log(failures ? `\n${failures} FAILURE(S)` : "\nALL PASS");
process.exit(failures ? 1 : 0);
