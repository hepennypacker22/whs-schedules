// Grid parser: turns the season grid CSV into per-team schedules.
// Tolerant by design — a cell that can't be read as a game becomes a visible
// note row; nothing in the sheet can break the page.

// --- CSV ---------------------------------------------------------------

export function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field); field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      rows.push(row); row = [];
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// --- headers & dates ---------------------------------------------------

// "Girls Var Bball [20]  " -> "girls var bball"
export function normalizeHeader(h) {
  return String(h || "")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

// "8/31" + startYear -> Date. Months Aug–Dec belong to startYear,
// Jan–Jul roll over to startYear + 1 (winter grid crosses New Year).
export function parseGridDate(raw, startYear) {
  const m = String(raw || "").trim().match(/^(\d{1,2})\/(\d{1,2})$/);
  if (!m) return null;
  const month = +m[1], day = +m[2];
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const year = month >= 8 ? startYear : startYear + 1;
  return new Date(year, month - 1, day);
}

// --- cell grammar ------------------------------------------------------

const STATUS_RE = /\b(PPD|POSTPONED|CANCELLED|CANCELED|CXL|DELAYED|WEATHER DELAY|RESCHEDULED)\b\.?/i;
const RESULT_RE = /\b([WLT])\s*,?\s+(\d{1,3})\s*-\s*(\d{1,3})\b/;
const TIME_RE = /\b(?:time\s+)?(\d{1,2}:\d{2}\s*(?:[AP]\.?M\.?)?|TBD|TBA)\s*$/i;
const SQUAD_RE = /^(JV|V|FR|FRESH|VAR)\b[.:]?\s+(?=@|\S)/i;

// Words that mark a cell as a note even if nothing else matches.
// (Games are recognized positively — by an "@" or a time — so this list only
// documents intent; any unrecognized cell already falls back to a note.)

export function parseCell(raw) {
  const original = String(raw || "").replace(/\s+/g, " ").trim();
  if (!original) return null;

  let text = original;
  let status = null;
  let result = null;
  let time = null;
  let squad = null;

  const statusMatch = text.match(STATUS_RE);
  if (statusMatch) {
    const word = statusMatch[1].toUpperCase();
    status = word === "PPD" || word === "POSTPONED" || word === "RESCHEDULED" ? "postponed"
      : word === "DELAYED" || word === "WEATHER DELAY" ? "delayed"
      : "cancelled";
    text = text.replace(STATUS_RE, " ").replace(/\s+/g, " ").trim();
    text = text.replace(/^[-–—:]\s*/, "").replace(/\s*[-–—:]$/, "");
  }

  const resultMatch = text.match(RESULT_RE);
  if (resultMatch) {
    result = { letter: resultMatch[1].toUpperCase(), us: +resultMatch[2], them: +resultMatch[3] };
    text = text.replace(RESULT_RE, " ").replace(/\s+/g, " ").trim();
  }

  const timeMatch = text.match(TIME_RE);
  if (timeMatch) {
    time = timeMatch[1].toUpperCase().replace(/\s+/g, "");
    text = text.slice(0, timeMatch.index).trim();
  }

  const squadMatch = text.match(SQUAD_RE);
  if (squadMatch) {
    squad = squadMatch[1].toUpperCase();
    text = text.slice(squadMatch[0].length).trim();
  }

  let away = false;
  if (text.startsWith("@")) {
    away = true;
    text = text.slice(1).trim();
  }

  // Leading note before the opponent, e.g. "Sr. Night Bellows Falls 7:00PM".
  let note = null;
  const noteMatch = text.match(/^((?:Sr\.?|Senior)\s+Night|Picture Day|Homecoming|Youth Night)\s+/i);
  if (noteMatch) {
    note = noteMatch[1];
    text = text.slice(noteMatch[0].length).trim();
  }

  const opponent = text.replace(/^[-–—:]\s*/, "").replace(/[.,;]$/, "").trim();

  // A game needs an opponent plus at least one game-ish signal (@, time,
  // result, or postponement of something concrete). Everything else is a note.
  const isGame = opponent && (away || time || result || (status && opponent));
  if (!isGame) {
    return { kind: "note", text: original };
  }
  return {
    kind: "game",
    opponent,
    away,
    time: time && /TB[DA]/.test(time) ? "TBD" : time,
    squad,
    note,
    status,          // null | postponed | cancelled | delayed
    manualResult: result, // {letter, us, them} typed in the sheet, if any
    raw: original,
  };
}

// --- grid --------------------------------------------------------------

// Returns { teams: {slug: [entry...]}, headerRow, warnings }.
// entry = {date, dow, kind: "game"|"note", ...parseCell fields, venue}
export function parseGrid(csvText, season) {
  const rows = parseCSV(csvText);
  const warnings = [];
  if (!rows.length) return { teams: {}, warnings: ["empty CSV"] };

  const headerRow = rows[0].map(normalizeHeader);
  const columns = {}; // slug -> column index
  for (const team of season.teams) {
    const want = normalizeHeader(team.header);
    const idx = headerRow.findIndex((h) => h === want);
    if (idx === -1) {
      warnings.push(`column not found for ${team.slug} ("${team.header}")`);
      continue;
    }
    columns[team.slug] = idx;
  }

  const teams = {};
  for (const team of season.teams) teams[team.slug] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const dow = String(row[0] || "").replace(/\./g, "").trim();
    const date = parseGridDate(row[1], season.startYear);
    if (!date) continue; // blank/section rows

    for (const team of season.teams) {
      const idx = columns[team.slug];
      if (idx == null) continue;
      const cell = parseCell(row[idx]);
      if (!cell) continue;
      const entry = { ...cell, date, dow };
      if (team.venueColumn) {
        // venue lives in the column immediately after this team's column
        const venue = String(row[idx + 1] || "").trim();
        if (venue) entry.venue = venue;
      }
      teams[team.slug].push(entry);
    }
  }
  return { teams, warnings };
}

// --- scores merge & record ---------------------------------------------

export function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function simplifyName(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

// scores: [{date:"2026-09-05", opponent, letter, us, them}] from MaxPreps.
// Attaches .result = {letter, us, them, source} to matching game entries.
export function mergeScores(entries, scores) {
  if (!scores || !scores.length) {
    for (const e of entries) {
      if (e.kind === "game" && e.manualResult) {
        e.result = { ...e.manualResult, source: "sheet" };
      }
    }
    return entries;
  }
  const byDate = new Map();
  for (const s of scores) {
    if (!byDate.has(s.date)) byDate.set(s.date, []);
    byDate.get(s.date).push(s);
  }
  for (const e of entries) {
    if (e.kind !== "game") continue;
    const candidates = byDate.get(dateKey(e.date)) || [];
    let match = null;
    if (candidates.length === 1) match = candidates[0];
    else if (candidates.length > 1) {
      const target = simplifyName(e.opponent);
      match = candidates.find((c) => {
        const n = simplifyName(c.opponent);
        return n.includes(target) || target.includes(n);
      }) || null;
    }
    if (match && match.letter) {
      e.result = { letter: match.letter, us: match.us, them: match.them, source: "maxpreps" };
    } else if (e.manualResult) {
      e.result = { ...e.manualResult, source: "sheet" };
    }
  }
  return entries;
}

export function computeRecord(entries) {
  const rec = { w: 0, l: 0, t: 0, homeW: 0, homeL: 0, awayW: 0, awayL: 0, streak: "" };
  let streakLetter = null, streakLen = 0;
  for (const e of entries) {
    if (e.kind !== "game" || !e.result) continue;
    const L = e.result.letter;
    if (L === "W") { rec.w++; e.away ? rec.awayW++ : rec.homeW++; }
    else if (L === "L") { rec.l++; e.away ? rec.awayL++ : rec.homeL++; }
    else if (L === "T") rec.t++;
    if (L === streakLetter) streakLen++;
    else { streakLetter = L; streakLen = 1; }
  }
  if (streakLetter && streakLen) rec.streak = `${streakLetter}${streakLen}`;
  rec.games = rec.w + rec.l + rec.t;
  return rec;
}
