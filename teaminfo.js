// Per-team coaches & trophy case, shown as pop-ups inside the embed.
// Keyed by team slug (see config.js). All fields optional — buttons only
// appear for teams that have data here.
//
// To update (e.g. new coach, new banner): edit this file on GitHub
// (github.com/hepennypacker22/whs-schedules → teaminfo.js → pencil icon),
// commit, and the embeds update within a couple of minutes.

export const TEAM_INFO = {
  fh: {
    coaches: [
      { name: "Blake Holden", role: "Head Coach" },
      { name: "Kate Mouser", role: "Assistant Coach" },
    ],
    trophies: [
      { label: "State Championships", years: ["2024", "2021", "2019", "2009", "2001", "1998", "1993", "1990 (tie)"] },
      { label: "State Runner-Up", years: ["2023", "1992"] },
      { label: "League Championships", years: ["2024", "2012", "2005", "2001"] },
    ],
  },

  vfb: {
    coaches: [
      { name: "Jamie Richardson", role: "Co-Head Coach" },
      { name: "Matt Meagher", role: "Co-Head Coach" },
      { name: "James Perry", role: "Assistant Coach" },
      { name: "Zane Burke", role: "Assistant Coach" },
      { name: "Colby Hodgson", role: "Assistant Coach" },
      { name: "Greg Balch", role: "Advisor" },
    ],
    trophies: [
      { label: "State Championships", years: ["2023", "2022", "2021", "2017", "2016", "2009", "1999"] },
      { label: "State Runner-Up", years: ["2011", "2010", "2008", "2007", "2001", "1979", "1975", "1971"] },
    ],
  },
};
