/* ============================================================
   seed.js — the content that ships inside the page.

   This is what visitors see the instant the page opens, before
   anything loads from the network, and what they keep seeing if
   the network or the database is unreachable.

   Once Supabase is connected (see SETUP.md), coaches edit through
   the console at ?edit and their changes override everything here.
   You never have to hand-edit this file, but it stays readable so
   you always have a plain-text copy of the site's content.
   ============================================================ */

var SEED_SITE = {
  eyebrow: "Elevate Basketball / Prosper, TX",
  claimLead: "Most programs count wins.",
  claimEmphasis: "We count who's still playing in four years.",
  footNote: "Prosper, TX · 5th grade through varsity · © 2026",

  /* Banner strip at the top. tone is "action" (pink) or "info" (blue). */
  alerts: [
    { tone: "action", tag: "Action", body: "Tournament fees are due Friday. $45 per player, Venmo or check to Coach Reyes.", meta: "Posted Aug 4 · All teams" },
    { tone: "info", tag: "Update", body: "Thursday practice moved to Court 2. Same time, enter through the east doors.", meta: "Posted Aug 5 · 7th grade" }
  ],

  gyms: [
    { name: "Prosper Fieldhouse", address: "1301 E Prosper Trail, Prosper, TX 75078", note: "Park in the north lot" },
    { name: "Frisco Athletic Center", address: "5828 Nancy Jane Ln, Frisco, TX 75034", note: "$3 spectator fee at the door" },
    { name: "McKinney Sports Center", address: "2400 Wilson Creek Pkwy, McKinney, TX 75069", note: "Court 4, upstairs" }
  ],

  programTitle: "Three stages, three jobs",
  pillars: [
    { label: "5th – 6th grade", title: "Develop", body: "Footwork, both hands, and a shot that survives contact. Everyone plays real minutes. We do not run a bench at this level, and we do not chase trophies with a six-man rotation.", linkText: "Ask about a 5th–6th spot" },
    { label: "7th – 8th grade", title: "Compete", body: "Tournament schedule, scouting reports, and film every week. Minutes are earned here, and players learn to handle that before high school does it to them.", linkText: "Ask about a 7th–8th spot" },
    { label: "JV – Varsity", title: "Advance", body: "Strength work, position-specific coaching, and honest conversations about where each player fits at the next level. We prepare for the school program, not around it.", linkText: "Ask about JV and varsity" }
  ],

  proofLabel: "What three seasons have produced",
  stats: [
    { value: 31, suffix: "", label: "Players who made their high school roster in the last three seasons" },
    { value: 86, suffix: "%", label: "Of players who start with us at 5th grade are still playing in 9th" },
    { value: 4, suffix: "", label: "Alumni currently on varsity rosters in Prosper, Celina, and Frisco ISD" }
  ],
  /* Wrap a phrase in *asterisks* to make it stand out. */
  proofNote: "Coaching staff has come through *Prosper HS*, *Texas A&M-Commerce*, and *Dallas Showtyme*. Alumni now play at *Prosper*, *Rock Hill*, *Walnut Grove*, and *Celina*.",

  /* Shown after a request is sent. Never point at a channel that
     does not exist — there is no phone number anywhere on this site. */
  sentBody: "Coach Reyes will email you at the address you gave us, within two days. If you have not heard by then, reply to that address and we will chase it.",

  /* Caption under the photo band. Leave photo empty until you have one. */
  photo: "",
  plateLine: "Prosper Fieldhouse · 6:45 AM",

  joinIntro: "Tryouts run twice a year, and we carry a short waitlist between them. Tell us about your player and a coach will follow up within two days. Parents and guardians only, please.",

  contactRows: [
    { value: "Coach Reyes", label: "Director" },
    { value: "director@elevatehoops.com", label: "Email" },
    { value: "Fees, tryouts, uniforms", label: "Ask about" }
  ]
};

/* Teams render top to bottom in this order.
   status on a schedule row is "win", "loss" or "upcoming". */
var SEED_TEAMS = [
  {
    id: "5th", name: "5th grade", record: "9-5",
    coach: "Coach Dawson", coachEmail: "dawson@elevatehoops.com", homeGym: "Prosper Fieldhouse",
    nextGame: {
      opponent: "Celina Storm", opponentRecord: "7-7",
      tipoff: "2026-08-15T09:00", arriveBy: "8:15 AM, warmups",
      venue: "Prosper Fieldhouse, Court 1", jersey: "Home white"
    },
    practices: [
      { day: "Tuesday", time: "6:00 - 7:15 PM" },
      { day: "Thursday", time: "6:00 - 7:15 PM" }
    ],
    schedule: [
      { date: "2026-07-26", opponent: "Frisco Force", venue: "Frisco Athletic Center", status: "win", result: "W 38-31" },
      { date: "2026-08-02", opponent: "Allen Elite", venue: "Prosper Fieldhouse", status: "loss", result: "L 29-34" },
      { date: "2026-08-09", opponent: "McKinney Havoc", venue: "McKinney Sports Center", status: "win", result: "W 41-27" },
      { date: "2026-08-15", opponent: "Celina Storm", venue: "Prosper Fieldhouse", status: "upcoming", result: "9:00 AM" },
      { date: "2026-08-22", opponent: "North Texas Thunder", venue: "Celina HS Gym", status: "upcoming", result: "10:30 AM" }
    ],
    roster: [
      { number: "04", position: "Guard", name: "Micah Dawson", height: "4'10″", grade: "5th" },
      { number: "08", position: "Guard", name: "Ryan Cole", height: "4'11″", grade: "5th" },
      { number: "12", position: "Wing", name: "Josiah Bell", height: "5'0″", grade: "5th" },
      { number: "20", position: "Forward", name: "Ethan Park", height: "5'2″", grade: "5th" },
      { number: "24", position: "Forward", name: "Luca Moretti", height: "5'1″", grade: "5th" },
      { number: "31", position: "Center", name: "Isaiah Grant", height: "5'4″", grade: "5th" }
    ]
  },
  {
    id: "6th", name: "6th grade", record: "12-3",
    coach: "Coach Ellis", coachEmail: "ellis@elevatehoops.com", homeGym: "Prosper Fieldhouse",
    nextGame: {
      opponent: "Allen Elite", opponentRecord: "10-6",
      tipoff: "2026-08-15T11:00", arriveBy: "10:15 AM, warmups",
      venue: "Prosper Fieldhouse, Court 2", jersey: "Away navy"
    },
    practices: [
      { day: "Monday", time: "6:15 - 7:30 PM" },
      { day: "Wednesday", time: "6:15 - 7:30 PM" }
    ],
    schedule: [
      { date: "2026-07-26", opponent: "Frisco Force", venue: "Frisco Athletic Center", status: "win", result: "W 44-36" },
      { date: "2026-08-02", opponent: "Celina Storm", venue: "Prosper Fieldhouse", status: "win", result: "W 51-39" },
      { date: "2026-08-09", opponent: "McKinney Havoc", venue: "McKinney Sports Center", status: "win", result: "W 47-40" },
      { date: "2026-08-15", opponent: "Allen Elite", venue: "Prosper Fieldhouse", status: "upcoming", result: "11:00 AM" },
      { date: "2026-08-22", opponent: "North Texas Thunder", venue: "Celina HS Gym", status: "upcoming", result: "12:30 PM" }
    ],
    roster: [
      { number: "02", position: "Guard", name: "Aiden Reyes", height: "5'1″", grade: "6th" },
      { number: "09", position: "Guard", name: "Noah Vance", height: "5'0″", grade: "6th" },
      { number: "15", position: "Wing", name: "Kai Thompson", height: "5'3″", grade: "6th" },
      { number: "22", position: "Forward", name: "Brady Nolan", height: "5'5″", grade: "6th" },
      { number: "30", position: "Forward", name: "Omar Haddad", height: "5'4″", grade: "6th" },
      { number: "44", position: "Center", name: "Zeke Alvarez", height: "5'7″", grade: "6th" }
    ]
  },
  {
    id: "7th", name: "7th grade", record: "18-4",
    coach: "Coach Whitfield", coachEmail: "whitfield@elevatehoops.com", homeGym: "Prosper Fieldhouse",
    nextGame: {
      opponent: "North Texas Thunder", opponentRecord: "15-7",
      tipoff: "2026-08-15T16:30", arriveBy: "3:45 PM, warmups",
      venue: "Prosper Fieldhouse, Court 3", jersey: "Home white"
    },
    practices: [
      { day: "Tuesday", time: "7:30 - 9:00 PM" },
      { day: "Thursday", time: "7:30 - 9:00 PM" },
      { day: "Saturday", time: "Shooting, 8:00 AM" }
    ],
    schedule: [
      { date: "2026-07-26", opponent: "Frisco Force", venue: "Frisco Athletic Center", status: "win", result: "W 68-51" },
      { date: "2026-08-02", opponent: "Allen Elite", venue: "Prosper Fieldhouse", status: "win", result: "W 71-60" },
      { date: "2026-08-09", opponent: "McKinney Havoc", venue: "McKinney Sports Center", status: "win", result: "W 59-47" },
      { date: "2026-08-15", opponent: "North Texas Thunder", venue: "Prosper Fieldhouse", status: "upcoming", result: "4:30 PM" },
      { date: "2026-08-22", opponent: "Celina Storm", venue: "Celina HS Gym", status: "upcoming", result: "6:00 PM" }
    ],
    roster: [
      { number: "03", position: "Guard", name: "Marcus Hale", height: "5'7″", grade: "7th" },
      { number: "07", position: "Guard", name: "Devin Osei", height: "5'6″", grade: "7th" },
      { number: "11", position: "Wing", name: "Caleb Ruiz", height: "5'9″", grade: "7th" },
      { number: "14", position: "Wing", name: "Jordan Pace", height: "5'10″", grade: "7th" },
      { number: "21", position: "Forward", name: "Eli Brantley", height: "5'11″", grade: "7th" },
      { number: "23", position: "Forward", name: "Tobi Adeyemi", height: "6'0″", grade: "7th" },
      { number: "32", position: "Center", name: "Sam Whitaker", height: "6'2″", grade: "7th" },
      { number: "45", position: "Guard", name: "Andre Coles", height: "5'6″", grade: "7th" }
    ]
  },
  {
    id: "8th", name: "8th grade", record: "15-6",
    coach: "Coach Barrett", coachEmail: "barrett@elevatehoops.com", homeGym: "Prosper Fieldhouse",
    nextGame: {
      opponent: "McKinney Havoc", opponentRecord: "13-8",
      tipoff: "2026-08-15T18:15", arriveBy: "5:30 PM, warmups",
      venue: "McKinney Sports Center, Court 4", jersey: "Away navy"
    },
    practices: [
      { day: "Monday", time: "7:30 - 9:00 PM" },
      { day: "Wednesday", time: "7:30 - 9:00 PM" }
    ],
    schedule: [
      { date: "2026-07-26", opponent: "Celina Storm", venue: "Celina HS Gym", status: "win", result: "W 63-55" },
      { date: "2026-08-02", opponent: "Frisco Force", venue: "Prosper Fieldhouse", status: "loss", result: "L 58-64" },
      { date: "2026-08-09", opponent: "Allen Elite", venue: "Prosper Fieldhouse", status: "win", result: "W 70-52" },
      { date: "2026-08-15", opponent: "McKinney Havoc", venue: "McKinney Sports Center", status: "upcoming", result: "6:15 PM" },
      { date: "2026-08-22", opponent: "North Texas Thunder", venue: "Celina HS Gym", status: "upcoming", result: "7:45 PM" }
    ],
    roster: [
      { number: "01", position: "Guard", name: "Trey Donovan", height: "5'9″", grade: "8th" },
      { number: "05", position: "Guard", name: "Kobe Nwosu", height: "5'8″", grade: "8th" },
      { number: "13", position: "Wing", name: "Landon Fisk", height: "6'0″", grade: "8th" },
      { number: "25", position: "Forward", name: "Ravi Menon", height: "6'1″", grade: "8th" },
      { number: "33", position: "Forward", name: "Gabe Salas", height: "6'2″", grade: "8th" },
      { number: "50", position: "Center", name: "Dre Hollis", height: "6'5″", grade: "8th" }
    ]
  },
  {
    id: "JV", name: "Junior varsity", record: "11-8",
    coach: "Coach Whitfield", coachEmail: "whitfield@elevatehoops.com", homeGym: "Prosper HS Auxiliary",
    nextGame: {
      opponent: "Frisco Force", opponentRecord: "12-9",
      tipoff: "2026-08-14T17:30", arriveBy: "4:30 PM, film first",
      venue: "Prosper HS Auxiliary Gym", jersey: "Home white"
    },
    practices: [
      { day: "Mon - Thu", time: "4:00 - 6:00 PM" },
      { day: "Saturday", time: "Lift, 9:00 AM" }
    ],
    schedule: [
      { date: "2026-07-25", opponent: "Allen Elite", venue: "Allen HS", status: "loss", result: "L 49-57" },
      { date: "2026-08-01", opponent: "McKinney Havoc", venue: "Prosper HS", status: "win", result: "W 66-58" },
      { date: "2026-08-08", opponent: "Celina Storm", venue: "Celina HS Gym", status: "win", result: "W 61-54" },
      { date: "2026-08-14", opponent: "Frisco Force", venue: "Prosper HS", status: "upcoming", result: "5:30 PM" },
      { date: "2026-08-21", opponent: "North Texas Thunder", venue: "Prosper HS", status: "upcoming", result: "5:30 PM" }
    ],
    roster: [
      { number: "06", position: "Guard", name: "Chase Whitfield", height: "5'11″", grade: "Soph" },
      { number: "10", position: "Guard", name: "Nico Ferrara", height: "6'0″", grade: "Fresh" },
      { number: "17", position: "Wing", name: "Malik Boone", height: "6'2″", grade: "Soph" },
      { number: "27", position: "Forward", name: "Ari Feldman", height: "6'3″", grade: "Soph" },
      { number: "34", position: "Forward", name: "Deshawn Pratt", height: "6'4″", grade: "Fresh" },
      { number: "41", position: "Center", name: "Owen Kessler", height: "6'6″", grade: "Soph" }
    ]
  },
  {
    id: "VAR", name: "Varsity", record: "21-5",
    coach: "Coach Barrett", coachEmail: "barrett@elevatehoops.com", homeGym: "Prosper HS Main",
    nextGame: {
      opponent: "Allen Elite", opponentRecord: "19-6",
      tipoff: "2026-08-14T19:30", arriveBy: "5:45 PM, film first",
      venue: "Prosper HS Main Gym", jersey: "Home white"
    },
    practices: [
      { day: "Mon - Thu", time: "6:00 - 8:00 PM" },
      { day: "Saturday", time: "Lift, 7:30 AM" }
    ],
    schedule: [
      { date: "2026-07-25", opponent: "McKinney Havoc", venue: "McKinney Sports Center", status: "win", result: "W 78-61" },
      { date: "2026-08-01", opponent: "Celina Storm", venue: "Prosper HS", status: "win", result: "W 82-70" },
      { date: "2026-08-08", opponent: "Frisco Force", venue: "Prosper HS", status: "win", result: "W 75-68" },
      { date: "2026-08-14", opponent: "Allen Elite", venue: "Prosper HS", status: "upcoming", result: "7:30 PM" },
      { date: "2026-08-21", opponent: "North Texas Thunder", venue: "Allen HS", status: "upcoming", result: "7:30 PM" }
    ],
    roster: [
      { number: "00", position: "Guard", name: "Jalen Crest", height: "6'1″", grade: "Sr" },
      { number: "08", position: "Guard", name: "Rylan Beck", height: "6'0″", grade: "Jr" },
      { number: "12", position: "Wing", name: "Amari Sloan", height: "6'4″", grade: "Sr" },
      { number: "20", position: "Wing", name: "Theo Nakamura", height: "6'3″", grade: "Jr" },
      { number: "31", position: "Forward", name: "Bishop Ellery", height: "6'6″", grade: "Sr" },
      { number: "42", position: "Forward", name: "Cass Delgado", height: "6'5″", grade: "Jr" },
      { number: "55", position: "Center", name: "Kwame Boateng", height: "6'8″", grade: "Sr" }
    ]
  }
];
