// WHS Schedules configuration.
// Adding a new season = add an entry to SEASONS (sheet must be viewable by
// "anyone with the link" for the CSV fetch to work — see README).

export const SCHOOL = {
  name: "Windsor",
  mascot: "Yellowjackets",
  town: "Windsor, VT",
  // Official colors from the school's MaxPreps record.
  green: "#005B34",
  gold: "#C8880A",
};

// Google Docs the AD maintains; the scheduled sync parses these into
// data/teaminfo.json (coaches + trophy case pop-ups). Both docs must be
// shared "Anyone with the link: Viewer".
export const DOCS = {
  coaches: "1HV0UDvkSgF-lQFwMMuHtho4WcT82CC2difNqvVXrArE",
  trophies: "1I3kbWi6V5MOF947EymfofCuMJppNx6rWxrgZjkP9yUA",
};

export function docTxtUrl(docId) {
  return `https://docs.google.com/document/d/${docId}/export?format=txt`;
}

// Each team:
//   slug     — used in the embed URL (?team=vfb)
//   header   — column header in the sheet grid, matched after normalization
//              (trimmed, bracketed counts like "[20]" stripped, spaces collapsed)
//   name     — display name on the page
//   maxpreps — season-schedule path on maxpreps.com whose results feed this
//              team's scores (varsity teams only; omit when MaxPreps doesn't
//              carry the team). The score-sync workflow fetches these.
export const SEASONS = [
  {
    id: "fall-2026",
    label: "Fall 2026",
    sheetId: "1LjKvcnau66Zd19IwLhTvW7FqR0lIJIVAQuN1-ISGaaU",
    gid: 0,
    startYear: 2026,
    teams: [
      { slug: "gvsoc", short: "Girls Soccer", header: "GVarSoc", name: "Girls Soccer — Varsity",
        maxpreps: "/vt/windsor/windsor-yellowjackets/soccer/girls/fall/26-27/schedule/" },
      // aliases: other header spellings this column has carried. "B&B" is
      // temporary — the header cell was accidentally overwritten with an
      // opponent name on 8/31/2026; remove once it's restored to "Var/JV FH".
      { slug: "fh", short: "Field Hockey", header: "Var/JV FH", name: "Field Hockey — Varsity/JV",
        aliases: ["Var FH", "FH", "Field Hockey", "B&B"],
        maxpreps: "/vt/windsor/windsor-yellowjackets/field-hockey/fall/26-27/schedule/" },
      { slug: "clubsoc", short: "Club Soccer", header: "Club Soocer", name: "Club Soccer",
        aliases: ["Club Soccer"] },
      { slug: "jhfh", short: "JH Field Hockey", header: "JH FH", name: "Field Hockey — Junior High" },
      { slug: "vfb", short: "Football", header: "VarFB", name: "Football — Varsity",
        maxpreps: "/vt/windsor/windsor-yellowjackets/football/fall/26-27/schedule/" },
      { slug: "jvfb", short: "JV Football", header: "JV FB", name: "Football — JV" },
      { slug: "jhfb", short: "JH Football", header: "JH FB", name: "Football — Junior High" },
      { slug: "golf", short: "Golf", header: "GOLF", name: "Golf" },
      { slug: "xc", short: "Cross Country", header: "XCOUNTRY", name: "Cross Country", venueColumn: true },
    ],
  },
  {
    id: "winter-2026",
    label: "Winter 2026–27",
    sheetId: "1sT4I37o5dlTA_ydyQ3Kcp4zeAbzk-OFBXtrBJMNmG4c",
    gid: 0,
    startYear: 2026,
    teams: [
      { slug: "gvbb", short: "Girls Basketball", header: "Girls Var Bball", name: "Girls Basketball — Varsity",
        maxpreps: "/vt/windsor/windsor-yellowjackets/basketball/girls/winter/26-27/schedule/" },
      { slug: "gjvbb", short: "JV Girls Bball", header: "Girls JV Bball", name: "Girls Basketball — JV" },
      { slug: "bvbb", short: "Boys Basketball", header: "Boys Var Bball", name: "Boys Basketball — Varsity",
        maxpreps: "/vt/windsor/windsor-yellowjackets/basketball/winter/26-27/schedule/" },
      { slug: "bjvbb", short: "JV Boys Bball", header: "Boys JV Bball", name: "Boys Basketball — JV" },
      { slug: "bres", short: "Reserve Boys", header: "Boys Reserve", name: "Boys Basketball — Reserve" },
      { slug: "jhbbb", short: "JH Boys Bball", header: "JH Boys", name: "Boys Basketball — Junior High" },
      { slug: "jhgbb", short: "JH Girls Bball", header: "JH Girls", name: "Girls Basketball — Junior High" },
      { slug: "bowl", short: "Bowling", header: "Bowling", name: "Bowling" },
      { slug: "intrk", short: "Indoor Track", header: "InTrk", name: "Indoor Track" },
    ],
  },
];

export function csvUrl(season) {
  return `https://docs.google.com/spreadsheets/d/${season.sheetId}/gviz/tq?tqx=out:csv&gid=${season.gid}`;
}

export function findTeam(slug) {
  for (const season of SEASONS) {
    const team = season.teams.find((t) => t.slug === slug);
    if (team) return { season, team };
  }
  return null;
}
