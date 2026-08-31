// WHS Schedules — fetch grid CSV live, merge MaxPreps scores, render.
import { SCHOOL, SEASONS, csvUrl, findTeam } from "./config.js";
import { parseGrid, mergeScores, computeRecord, dateKey } from "./parser.js";

const app = document.getElementById("app");
const params = new URLSearchParams(location.search);

// Routing: query params (?team=vfb, ?view=week) OR path-based URLs
// (/t/vfb/, /week/) — the paths exist because some CMS HTML blocks strip
// query strings from iframe src attributes.
const pathTeam = location.pathname.match(/\/t\/([a-z]+)\/?$/);
const teamSlug = params.get("team") || (pathTeam ? pathTeam[1] : null);
const weekView = params.get("view") === "week" || /\/week\/?$/.test(location.pathname);

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DOWS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

async function fetchJson(path) {
  try {
    const res = await fetch(`${path}?cb=${Math.floor(Date.now() / 300000)}`);
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

const fetchScores = () => fetchJson("data/scores.json");
// Coaches & trophy case, synced from the AD's Google Docs by the scheduled Action.
const fetchTeamInfo = () => fetchJson("data/teaminfo.json");

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

  const [scores, teamInfo] = await Promise.all([fetchScores(), fetchTeamInfo()]);
  const { teams } = parseGrid(csv, season);
  const entries = teams[team.slug] || [];
  mergeScores(entries, scores?.teams?.[team.slug] || null);
  const record = computeRecord(entries.filter((e) => e.kind === "game"));

  document.title = `${SCHOOL.name} ${team.name} — ${season.label} Schedule`;

  const games = entries.filter((e) => e.kind === "game");
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const nextGame = games.find((g) => g.date >= today && !g.result && g.status !== "cancelled");

  const info = teamInfo?.teams?.[team.slug] || {};
  const infoButtons =
    (info.coaches?.length ? `<button class="hdr-btn" data-modal="coaches">Coaches</button>` : "") +
    (info.trophies?.length || info.history
      ? `<button class="hdr-btn" data-modal="trophies">Trophy Case &amp; History</button>` : "");

  let html = `
  <header class="sched-header">
    <div class="eyebrow">${esc(SCHOOL.name)} ${esc(SCHOOL.mascot)} &bull; ${esc(season.label)}</div>
    <h1>${esc(team.name)} Schedule</h1>
    <div class="sub">${esc(SCHOOL.town)}</div>
    ${infoButtons ? `<div class="hdr-actions">${infoButtons}</div>` : ""}
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

  // Note cells (merged banners like "Theater Performances", "1st Practice",
  // "OPEN") are not shown — the page lists games only. The sheet's merged
  // full-row notes land in the first team column of the CSV, so rendering
  // them would wrongly pin them to that one team anyway. Add &notes=1 to
  // the URL to preview what's being skipped.
  const showNotes = params.get("notes") === "1";
  const visible = showNotes ? entries : games;
  if (!visible.length) {
    html += `</ul><div class="empty-msg">Schedule coming soon — check back!</div>`;
  } else {
    for (const e of visible) {
      html += e.kind === "game" ? gameRow(e, e === nextGame, today) : noteRow(e);
    }
    html += `</ul>`;
  }

  html += `<div class="footer-note">Schedule updates live from the WHS Athletics grid.` +
    (scores?.generated ? ` Scores via MaxPreps, updated ${esc(new Date(scores.generated).toLocaleDateString())}.` : "") +
    `</div>`;

  app.innerHTML = html;

  // Coaches / Trophy Case pop-ups
  app.querySelectorAll(".hdr-btn").forEach((btn) => {
    btn.addEventListener("click", () => openModal(btn.dataset.modal, team, info));
  });

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

// ------------------------------------------------------------------- modals

function openModal(kind, team, info) {
  closeModal();
  let title, body;
  if (kind === "coaches") {
    title = "Coaches";
    body = `<ul class="coach-list">${info.coaches
      .map((c) => `<li><span class="coach-name">${esc(c.name)}</span><span class="coach-role">${esc(c.role)}</span></li>`)
      .join("")}</ul>`;
  } else {
    title = "Trophy Case & History";
    body =
      (info.trophies || [])
        .map((t) => `<div class="trophy-group">
          <div class="trophy-label">🏆 ${esc(t.label)} <span class="trophy-count">(${t.years.length})</span></div>
          <div class="trophy-years">${t.years.map((y) => `<span class="trophy-year">${esc(y)}</span>`).join("")}</div>
        </div>`)
        .join("") +
      (info.history ? `<p class="history-text">${esc(info.history)}</p>` : "");
  }

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="${esc(team.name)} ${esc(title)}">
      <div class="modal-head">
        <span class="modal-title">${esc(title)}</span>
        <button class="modal-close" aria-label="Close">&times;</button>
      </div>
      <div class="modal-body">${body}</div>
    </div>`;
  overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });
  overlay.querySelector(".modal-close").addEventListener("click", closeModal);
  document.addEventListener("keydown", escToClose);
  document.body.appendChild(overlay);
  overlay.querySelector(".modal-close").focus();
}

function closeModal() {
  document.querySelector(".modal-overlay")?.remove();
  document.removeEventListener("keydown", escToClose);
}

function escToClose(e) {
  if (e.key === "Escape") closeModal();
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

  // Path-based URLs in embed snippets: some CMS HTML blocks strip query
  // strings from iframe src attributes.
  const weekUrl = `${base}week/`;
  const weekIframe = `<iframe src="${weekUrl}" style="width:100%;height:820px;border:none;" title="${esc(SCHOOL.name)} Athletics — This Week" loading="lazy"></iframe>`;
  html += `<h2>All Teams</h2><table><tbody><tr>
    <td><a href="?view=week"><strong>This Week (all teams, today highlighted)</strong></a></td>
    <td><code>${esc(weekIframe)}</code></td>
    <td><button class="copy-btn" data-embed="${esc(weekIframe)}">Copy embed</button></td>
  </tr></tbody></table>`;

  for (const season of SEASONS) {
    html += `<h2>${esc(season.label)}</h2><table><tbody>`;
    for (const t of season.teams) {
      const url = `${base}t/${t.slug}/`;
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

// ----------------------------------------------------------------- week view

// All teams' games for one week, today highlighted. Embedded on the main
// Athletics page (?view=week).
async function renderWeek() {
  document.title = "This Week — Windsor Athletics";
  let allGames = [];
  try {
    const [scores, ...csvs] = await Promise.all([
      fetchScores(),
      ...SEASONS.map((s) => fetch(csvUrl(s)).then((r) => (r.ok ? r.text() : null))),
    ]);
    SEASONS.forEach((season, i) => {
      if (!csvs[i]) return;
      const { teams } = parseGrid(csvs[i], season);
      for (const team of season.teams) {
        const entries = (teams[team.slug] || []).filter((e) => e.kind === "game");
        mergeScores(entries, scores?.teams?.[team.slug] || null);
        for (const g of entries) allGames.push({ ...g, team });
      }
    });
  } catch (err) {
    app.innerHTML = `<div class="error">Couldn't load the schedule right now. Please try again in a minute.</div>`;
    console.error("week view fetch failed", err);
    return;
  }

  const today = new Date(); today.setHours(0, 0, 0, 0);
  let offset = parseInt(params.get("w"), 10) || 0;

  const draw = () => {
    // week starts Monday
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7) + offset * 7);
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
    const rangeLabel = `${MONTHS[days[0].getMonth()]} ${days[0].getDate()} – ${MONTHS[days[6].getMonth()]} ${days[6].getDate()}`;

    let html = `
    <header class="sched-header">
      <div class="eyebrow">${esc(SCHOOL.name)} ${esc(SCHOOL.mascot)} Athletics</div>
      <h1>This Week</h1>
    </header>
    <div class="controls week-nav">
      <button class="filter-btn" data-nav="-1" aria-label="Previous week">&lsaquo; Prev</button>
      <span class="week-range">${rangeLabel}${offset ? "" : " &bull; this week"}</span>
      <button class="filter-btn" data-nav="1" aria-label="Next week">Next &rsaquo;</button>
      ${offset ? `<button class="filter-btn" data-nav="0">Today</button>` : ""}
    </div>`;

    for (const day of days) {
      const isToday = day.getTime() === today.getTime();
      const games = allGames
        .filter((g) => g.date.getTime() === day.getTime())
        .sort((a, b) => timeSortKey(a.time) - timeSortKey(b.time));
      html += `<section class="week-day${isToday ? " today" : ""}">
        <div class="week-day-head">
          <span class="wd-name">${["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][day.getDay()]}</span>
          <span class="wd-date">${MONTHS[day.getMonth()]} ${day.getDate()}</span>
          ${isToday ? '<span class="next-tag">Today</span>' : ""}
        </div>`;
      if (!games.length) {
        html += `<div class="week-empty">No games</div>`;
      } else {
        for (const g of games) {
          let right;
          if (g.status === "postponed" || g.status === "cancelled") {
            right = `<span class="status-badge">${g.status === "postponed" ? "Postponed" : "Cancelled"}</span>`;
          } else if (g.status === "delayed") {
            right = `<span class="status-badge delayed">Delayed</span>`;
          } else if (g.result) {
            right = `<span class="result ${esc(g.result.letter)}"><span class="letter">${esc(g.result.letter)}</span> ${g.result.us}-${g.result.them}</span>`;
          } else {
            right = `<span class="time">${esc(g.time || "TBD")}</span>`;
          }
          html += `<div class="week-game">
            <a class="team-chip" href="?team=${g.team.slug}" target="_top">${esc(g.team.short || g.team.name)}</a>
            <span class="wg-opp">${g.away ? "at" : "vs"} <strong>${esc(g.opponent)}</strong>${g.venue ? ` <span class="wg-venue">· ${esc(g.venue)}</span>` : ""}</span>
            <span class="wg-right">${right}</span>
          </div>`;
        }
      }
      html += `</section>`;
    }
    html += `<div class="footer-note">Schedule updates live from the WHS Athletics grid.</div>`;
    app.innerHTML = html;
    app.querySelectorAll("[data-nav]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const n = +btn.dataset.nav;
        offset = n === 0 ? 0 : offset + n;
        draw();
      });
    });
    postHeight();
  };
  draw();
}

// "4:30PM" / "10:00" / "TBD" -> sortable minutes. Bare times: 8–11 read as
// AM (morning meets), 12 and 1–7 as PM (afternoon games). TBD sorts last.
function timeSortKey(t) {
  if (!t || /TB[DA]/.test(t)) return 24 * 60 + 1;
  const m = t.match(/(\d{1,2}):(\d{2})\s*([AP])?/i);
  if (!m) return 24 * 60;
  let h = +m[1];
  const mer = m[3] ? m[3].toUpperCase() : null;
  if (mer === "P" && h !== 12) h += 12;
  else if (mer === "A" && h === 12) h = 0;
  else if (!mer && h <= 7) h += 12;
  return h * 60 + +m[2];
}

// ---------------------------------------------------------------------- main

if (weekView) renderWeek();
else if (teamSlug) renderTeam(teamSlug);
else renderLanding();
