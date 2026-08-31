// Per-team coaches & trophy case, shown as pop-ups inside the embed.
// Keyed by team slug (see config.js). All fields optional — buttons only
// appear for teams that have data here.
//
// To update (e.g. new coach, new banner): edit this file on GitHub
// (github.com/hepennypacker22/whs-schedules → teaminfo.js → pencil icon),
// commit, and the embeds update within a couple of minutes.

export const TEAM_INFO = {
  gvsoc: {
    coaches: [
      { name: "Wendy Moody", role: "Co-Head Coach" },
      { name: "Jennifer Rupp", role: "Co-Head Coach" },
    ],
    trophies: [
      { label: "State Championships", years: ["2024"] },
      { label: "State Runner-Up", years: ["2023", "2003"] },
      { label: "League Championships", years: ["2025", "2024", "2023"] },
    ],
    history: "First varsity season: 1999.",
  },

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

  jhfh: {
    coaches: [
      { name: "Kaitlyn Gould", role: "Head Coach" },
      { name: "Alyssa Slocum", role: "Assistant Coach" },
      { name: "Kierstin Carvalho", role: "Assistant Coach" },
    ],
  },

  jvfb: {
    coaches: [
      { name: "Jamie Perry", role: "Head Coach" },
      { name: "Zane Burke", role: "Assistant Coach" },
    ],
  },

  jhfb: {
    coaches: [
      { name: "Randy Shambo", role: "Head Coach" },
      { name: "Chris Gould", role: "Assistant Coach" },
    ],
  },

  golf: {
    coaches: [{ name: "Pat Allen", role: "Head Coach" }],
  },

  xc: {
    coaches: [{ name: "Katie Ranney", role: "Head Coach" }],
    trophies: [
      { label: "State Championships", years: ["2005", "2004", "1961"] },
    ],
  },
};
