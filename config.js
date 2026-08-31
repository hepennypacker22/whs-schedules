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
      { slug: "gvsoc", header: "GVarSoc", name: "Girls Soccer — Varsity",
        maxpreps: "/vt/windsor/windsor-yellowjackets/soccer/girls/fall/26-27/schedule/" },
      { slug: "fh", header: "Var/JV FH", name: "Field Hockey — Varsity/JV",
        maxpreps: "/vt/windsor/windsor-yellowjackets/field-hockey/fall/26-27/schedule/" },
      { slug: "jhfh", header: "JH FH", name: "Field Hockey — Junior High" },
      { slug: "vfb", header: "VarFB", name: "Football — Varsity",
        maxpreps: "/vt/windsor/windsor-yellowjackets/football/fall/26-27/schedule/" },
      { slug: "jvfb", header: "JV FB", name: "Football — JV" },
      { slug: "jhfb", header: "JH FB", name: "Football — Junior High" },
      { slug: "golf", header: "GOLF", name: "Golf" },
      { slug: "xc", header: "XCOUNTRY", name: "Cross Country", venueColumn: true },
    ],
  },
  {
    id: "winter-2026",
    label: "Winter 2026–27",
    sheetId: "1sT4I37o5dlTA_ydyQ3Kcp4zeAbzk-OFBXtrBJMNmG4c",
    gid: 0,
    startYear: 2026,
    teams: [
      { slug: "gvbb", header: "Girls Var Bball", name: "Girls Basketball — Varsity",
        maxpreps: "/vt/windsor/windsor-yellowjackets/basketball/girls/winter/26-27/schedule/" },
      { slug: "gjvbb", header: "Girls JV Bball", name: "Girls Basketball — JV" },
      { slug: "bvbb", header: "Boys Var Bball", name: "Boys Basketball — Varsity",
        maxpreps: "/vt/windsor/windsor-yellowjackets/basketball/winter/26-27/schedule/" },
      { slug: "bjvbb", header: "Boys JV Bball", name: "Boys Basketball — JV" },
      { slug: "bres", header: "Boys Reserve", name: "Boys Basketball — Reserve" },
      { slug: "jhbbb", header: "JH Boys", name: "Boys Basketball — Junior High" },
      { slug: "jhgbb", header: "JH Girls", name: "Girls Basketball — Junior High" },
      { slug: "bowl", header: "Bowling", name: "Bowling" },
      { slug: "intrk", header: "InTrk", name: "Indoor Track" },
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
