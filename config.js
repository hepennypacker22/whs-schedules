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
    // page: the team's own page on whs.wsesu.net — team chips on the week
    // view link there (teams without one fall back to their schedule page).
    teams: [
      { slug: "gvsoc", short: "Girls Soccer", header: "GVarSoc", name: "Girls Soccer — Varsity",
        page: "https://whs.wsesu.net/en-US/pages/a9d5fab4-2f2c-4692-957c-0b34e6415496",
        maxpreps: "/vt/windsor/windsor-yellowjackets/soccer/girls/fall/26-27/schedule/" },
      // aliases: other header spellings this column has carried. "B&B" is
      // temporary — the header cell was accidentally overwritten with an
      // opponent name on 8/31/2026; remove once it's restored to "Var/JV FH".
      { slug: "fh", short: "Field Hockey", header: "Var/JV FH", name: "Field Hockey — Varsity/JV",
        aliases: ["Var FH", "FH", "Field Hockey", "B&B"],
        page: "https://whs.wsesu.net/en-US/pages/3cbfeced-1844-410c-90d4-d60de7ce5f59",
        maxpreps: "/vt/windsor/windsor-yellowjackets/field-hockey/fall/26-27/schedule/" },
      { slug: "clubsoc", short: "Club Soccer", header: "Club Soocer", name: "Club Soccer",
        aliases: ["Club Soccer"] },
      { slug: "jhfh", short: "JH Field Hockey", header: "JH FH", name: "Field Hockey — Junior High",
        page: "https://whs.wsesu.net/en-US/pages/e8dd74ae-246f-4188-8cf3-c197663db72e" },
      { slug: "vfb", short: "Football", header: "VarFB", name: "Football — Varsity",
        page: "https://whs.wsesu.net/en-US/pages/b36aca1d-7820-414a-9eb6-9133fa3827b5",
        maxpreps: "/vt/windsor/windsor-yellowjackets/football/fall/26-27/schedule/" },
      { slug: "jvfb", short: "JV Football", header: "JV FB", name: "Football — JV",
        page: "https://whs.wsesu.net/en-US/pages/b3a0761d-ef03-424c-9c91-06574ea122dd" },
      { slug: "jhfb", short: "JH Football", header: "JH FB", name: "Football — Junior High",
        page: "https://whs.wsesu.net/en-US/fall-sports-33aacda7/football-jh-3e56b465" },
      { slug: "golf", short: "Golf", header: "GOLF", name: "Golf",
        page: "https://whs.wsesu.net/en-US/pages/dc892c59-bc88-4de7-8106-7ea1279ef2ff" },
      { slug: "xc", short: "Cross Country", header: "XCOUNTRY", name: "Cross Country", venueColumn: true,
        page: "https://whs.wsesu.net/en-US/pages/b176179d-ac9c-44ff-b9c3-80f5eb8d093d" },
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
        page: "https://whs.wsesu.net/en-US/pages/d590e724-48f3-4250-8653-586fc57c8164",
        maxpreps: "/vt/windsor/windsor-yellowjackets/basketball/girls/winter/26-27/schedule/" },
      { slug: "gjvbb", short: "JV Girls Bball", header: "Girls JV Bball", name: "Girls Basketball — JV",
        page: "https://whs.wsesu.net/en-US/pages/d94def14-0834-4b1e-8144-20ceb237b46a" },
      { slug: "bvbb", short: "Boys Basketball", header: "Boys Var Bball", name: "Boys Basketball — Varsity",
        page: "https://whs.wsesu.net/en-US/pages/943e0d2c-636f-4663-9c6e-2c484c32443c",
        maxpreps: "/vt/windsor/windsor-yellowjackets/basketball/winter/26-27/schedule/" },
      { slug: "bjvbb", short: "JV Boys Bball", header: "Boys JV Bball", name: "Boys Basketball — JV",
        page: "https://whs.wsesu.net/en-US/pages/e0901ff4-ea3d-4fc8-bef1-269ddebf2c26" },
      { slug: "bres", short: "Reserve Boys", header: "Boys Reserve", name: "Boys Basketball — Reserve",
        page: "https://whs.wsesu.net/en-US/pages/9ae4887d-44e1-4abb-ba46-649487a8e78b" },
      { slug: "jhbbb", short: "JH Boys Bball", header: "JH Boys", name: "Boys Basketball — Junior High",
        page: "https://whs.wsesu.net/en-US/pages/4bc92c96-76e7-490c-bc8f-73f60247b77b" },
      { slug: "jhgbb", short: "JH Girls Bball", header: "JH Girls", name: "Girls Basketball — Junior High",
        page: "https://whs.wsesu.net/en-US/pages/2385e4cd-10d7-4d22-afc8-9383991a4854" },
      { slug: "bowl", short: "Bowling", header: "Bowling", name: "Bowling",
        page: "https://whs.wsesu.net/en-US/pages/534c4d0b-c183-4b7e-9384-6bbf0cecdecf" },
      { slug: "intrk", short: "Indoor Track", header: "InTrk", name: "Indoor Track",
        page: "https://whs.wsesu.net/en-US/pages/42461861-0987-4afc-8a96-c3a36bc74807" },
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
