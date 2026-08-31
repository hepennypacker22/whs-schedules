// WHS Schedules — fetch grid CSV live, merge MaxPreps scores, render.
import { SCHOOL, SEASONS, csvUrl, findTeam } from "./config.js";
import { parseGrid, mergeScores, computeRecord, dateKey } from "./parser.js";

const app = document.getElementById("app");
const params = new URLSearchParams(location.search);
const teamSlug = params.get("team");

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DOWS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

async function fetchScores() {
  try {
    const res = await fetch(`data/scores.json?cb=${Math.floor(Date.now() / 300000)}`);
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

// ---------------------------------------------------------------- team page

async function renderTeam(slug) {
  const found = findTeam(slug);
  if (!found) {
    app.innerHTML = `<div class="error">Unknown team "${esc(slug)}". <a href="./">See all teams</a>.</div>`;
    return;
  }
  const { season, team } = found;

  let csv;
  try {
    const res = await fetch(csvUrl(season));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    csv = await res.text();
  } catch (err) {
    app.innerHTML = `<div class="error">Couldn't load the schedule right now. Please try again in a minute.</div>`;
    console.error("CSV fetch failed", err);
    return;
  }

  const scores = await fetchScores();
  const { teams } = parseGrid(csv, season);
  const entries = teams[team.slug] || [];
  mergeScores(entries, scores?.teams?.[team.slug] || null);
  const record = computeRecord(entries.filter((e) => e.kind === "game"));

  document.title = `${SCHOOL.name} ${team.name} — ${season.label} Schedule`;

  const games = entries.filter((e) => e.kind === "game");
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const nextGame = games.find((g) => g.date >= today && !g.result && g.status !== "cancelled");

  let html = `
  <header class="sched-header">
    <div class="eyebrow">${esc(SCHOOL.name)} ${esc(SCHOOL.mascot)} &bull; ${esc(season.label)}</div>
    <h1>${esc(team.name)} Schedule</h1>
    <div class="sub">${esc(SCHOOL.town)}</div>
  </header>
  <div class="record-strip" role="group" aria-label="Season record">
    ${recordCell("Overall", `${record.w}-${record.l}${record.t ? "-" + record.t : ""}`)}
    ${recordCell("Home", `${record.homeW}-${record.homeL}`)}
    ${recordCell("Away", `${record.awayW}-${record.awayL}`)}
    ${recordCell("Streak", record.streak || "—")}
  </div>
  <div class="controls">
    <div class="filter-group" role="tablist" aria-label="Filter games">
      <button class="filter-btn active" data-filter="all">All</button>
      <button class="filter-btn" data-filter="home">Home</button>
      <button class="filter-btn" data-filter="away">Away</button>
    </div>
    <span class="spacer"></span>
    <button class="print-link" onclick="window.print()">Print</button>
  </div>
  <ul class="game-list">`;

  if (!entries.length) {
    html += `</ul><div class="empty-msg">Schedule coming soon — check back!</div>`;
  } else {
    for (const e of entries) {
      html += e.kind === "game" ? gameRow(e, e === nextGame, today) : noteRow(e);
    }
    html += `</ul>`;
  }

  html += `<div class="footer-note">Schedule updates live from the WHS Athletics grid.` +
    (scores?.generated ? ` Scores via MaxPreps, updated ${esc(new Date(scores.generated).toLocaleDateString())}.` : "") +
    `</div>`;

  app.innerHTML = html;

  // Home/Away filter
  const rows = app.querySelectorAll(".game-row, .note-row");
  app.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      app.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const f = btn.dataset.filter;
      rows.forEach((r) => {
        const show = f === "all" || r.dataset.ha === f || !r.dataset.ha;
        r.style.display = show ? "" : "none";
      });
    });
  });

  postHeight();
}

function recordCell(label, value) {
  return `<div class="record-cell"><div class="value">${esc(value)}</div><div class="label">${esc(label)}</div></div>`;
}

function gameRow(g, isNext, today) {
  const past = g.date < today;
  const classes = ["game-row"];
  if (past && !isNext) classes.push("past");
  if (isNext) classes.push("next-game");

  const md = `${MONTHS[g.date.getMonth()]} ${g.date.getDate()}`;
  const dow = DOWS[g.date.getDay()];

  let statusHtml;
  if (g.status === "postponed" || g.status === "cancelled") {
    statusHtml = `<span class="status-badge">${g.status === "postponed" ? "Postponed" : "Cancelled"}</span>`;
  } else if (g.status === "delayed") {
    statusHtml = `<span class="status-badge delayed">Delayed</span>`;
  } else if (g.result) {
    const r = g.result;
    statusHtml = `<span class="result ${esc(r.letter)}"><span class="letter">${esc(r.letter)}</span> ${r.us}-${r.them}</span>`;
  } else {
    statusHtml = `<span class="time">${esc(g.time || "TBD")}</span>`;
  }

  const tags =
    (g.squad ? `<span class="squad-tag">${esc(g.squad)}</span>` : "") +
    (g.note ? `<span class="game-note-tag">${esc(g.note)}</span>` : "");
  const loc = g.venue ? g.venue : g.away ? "Away" : `Home — ${SCHOOL.town}`;
  const oppName = g.status === "cancelled" ? `<span class="struck">${esc(g.opponent)}</span>` : esc(g.opponent);

  return `<li class="${classes.join(" ")}" data-ha="${g.away ? "away" : "home"}">
    <div class="date-block"><div class="md">${md}${isNext ? '<span class="next-tag">Next</span>' : ""}</div><div class="dow">${dow}</div></div>
    <span class="ha-badge${g.away ? " away" : ""}">${g.away ? "AT" : "VS"}</span>
    <div class="opp-block">
      <div class="opp-name"><span class="vsat">${g.away ? "at" : "vs"}</span> ${oppName}</div>
      <div class="opp-meta">${tags}${esc(loc)}</div>
    </div>
    <div class="status-block">${statusHtml}</div>
  </li>`;
}

function noteRow(e) {
  const md = `${MONTHS[e.date.getMonth()]} ${e.date.getDate()}`;
  return `<li class="note-row">
    <div class="date-block"><div class="md">${md}</div><div class="dow">${DOWS[e.date.getDay()]}</div></div>
    <div class="note-text">${esc(e.text)}</div>
  </li>`;
}

// -------------------------------------------------------------- landing page

function renderLanding() {
  document.title = "Windsor Yellowjackets Schedules";
  const base = location.origin + location.pathname.replace(/index\.html$/, "");
  let html = `
  <header class="sched-header">
    <div class="eyebrow">${esc(SCHOOL.name)} ${esc(SCHOOL.mascot)} Athletics</div>
    <h1>Team Schedules</h1>
    <div class="sub">Pick a team, or copy its embed code for the school website.</div>
  </header>
  <div class="landing">`;

  for (const season of SEASONS) {
    html += `<h2>${esc(season.label)}</h2><table><tbody>`;
    for (const t of season.teams) {
      const url = `${base}?team=${t.slug}`;
      const iframe = `<iframe src="${url}" style="width:100%;height:900px;border:none;" title="${esc(SCHOOL.name)} ${esc(t.name)} Schedule" loading="lazy"></iframe>`;
      html += `<tr>
        <td><a href="?team=${t.slug}"><strong>${esc(t.name)}</strong></a></td>
        <td><code>${esc(iframe)}</code></td>
        <td><button class="copy-btn" data-embed="${esc(iframe)}">Copy embed</button></td>
      </tr>`;
    }
    html += `</tbody></table>`;
  }
  html += `</div>`;
  app.innerHTML = html;

  app.querySelectorAll(".copy-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.embed);
        btn.textContent = "Copied!";
        setTimeout(() => (btn.textContent = "Copy embed"), 1500);
      } catch { /* clipboard unavailable, e.g. http */ }
    });
  });
}

// ------------------------------------------------------------- iframe height

function postHeight() {
  try {
    const h = document.documentElement.scrollHeight;
    parent.postMessage({ whsSchedHeight: h, team: teamSlug }, "*");
  } catch { /* not embedded */ }
}
window.addEventListener("resize", postHeight);

// ---------------------------------------------------------------------- main

if (teamSlug) renderTeam(teamSlug);
else renderLanding();
