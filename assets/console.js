/* ============================================================
   console.js — the coach's edit console.

   Opens only when the page URL has ?edit, or on Ctrl+Shift+E.
   Everything a coach types mutates Site.state and redraws the real
   page immediately, so there is no separate preview to trust.
   Nothing reaches the database until Save is pressed.
   ============================================================ */

(function () {

  var POSITIONS = ["Guard", "Wing", "Forward", "Center"];
  var STATUSES = [
    { value: "upcoming", label: "Not played yet" },
    { value: "win", label: "Won" },
    { value: "loss", label: "Lost" }
  ];

  var state = {
    open: false,
    tab: "team",
    dirty: false,
    removedTeamIds: [],
    leads: null,
    user: null,
    busy: false
  };

  var root = null;

  /* ---------- small DOM helpers ---------- */

  function h(tag, attrs, kids) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === "class") node.className = v;
      else if (k === "text") node.textContent = v;
      else if (k.slice(0, 2) === "on") node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v === true ? "" : v);
    });
    (kids || []).filter(Boolean).forEach(function (kid) {
      node.appendChild(typeof kid === "string" ? document.createTextNode(kid) : kid);
    });
    return node;
  }

  /* A labelled control bound to obj[key]. Redraws the page on every
     keystroke so the coach sees the result, not a description of it. */
  function field(label, obj, key, opts) {
    opts = opts || {};
    var control;

    if (opts.options) {
      control = h("select", {});
      opts.options.forEach(function (o) {
        var value = typeof o === "string" ? o : o.value;
        var text = typeof o === "string" ? o : o.label;
        control.appendChild(h("option", { value: value, text: text }));
      });
      control.value = obj[key] == null ? "" : obj[key];
    } else if (opts.multiline) {
      control = h("textarea", { rows: opts.rows || 3 });
      control.value = obj[key] == null ? "" : obj[key];
    } else {
      control = h("input", { type: opts.type || "text", placeholder: opts.placeholder || "" });
      control.value = obj[key] == null ? "" : obj[key];
    }

    control.addEventListener("input", function () {
      var value = control.value;
      if (opts.number) value = value === "" ? "" : Number(value);
      obj[key] = value;
      touch();
      if (opts.onchange) opts.onchange(value);
      else redrawPage();
    });
    if (opts.options) {
      control.addEventListener("change", function () { redrawPage(); });
    }

    if (!label) return control;
    return h("div", { class: "ed-f" }, [h("label", { text: label }), control]);
  }

  /* A reorderable, removable list of records.
     Up/down buttons rather than drag, so it works with a thumb and
     with a keyboard, not just a mouse. */
  function list(items, buildFields, opts) {
    opts = opts || {};
    var wrap = h("div", { class: "ed-list" });

    function rerender() {
      wrap.innerHTML = "";
      paint();
    }

    function move(from, to) {
      if (to < 0 || to >= items.length) return;
      var moved = items.splice(from, 1)[0];
      items.splice(to, 0, moved);
      touch();
      redrawPage();
      rerender();
    }

    function paint() {
      if (!items.length) {
        wrap.appendChild(h("div", { class: "ed-empty", text: opts.empty || "Nothing here yet." }));
      }
      items.forEach(function (item, i) {
        var move_ = h("div", { class: "ed-move" }, [
          h("button", {
            class: "ed-nudge", type: "button", title: "Move up",
            "aria-label": "Move up", disabled: i === 0,
            onclick: function () { move(i, i - 1); }
          }, ["▲"]),
          h("button", {
            class: "ed-nudge", type: "button", title: "Move down",
            "aria-label": "Move down", disabled: i === items.length - 1,
            onclick: function () { move(i, i + 1); }
          }, ["▼"])
        ]);

        var fields = h("div", { class: "ed-item-fields" }, buildFields(item, i));

        var remove = h("button", {
          class: "ed-del", type: "button",
          title: "Remove", "aria-label": opts.removeLabel || "Remove",
          onclick: function () {
            items.splice(i, 1);
            if (opts.onremove) opts.onremove(item);
            touch();
            redrawPage();
            rerender();
          }
        }, ["✕"]);

        wrap.appendChild(h("div", { class: "ed-item" }, [move_, fields, remove]));
      });
    }

    paint();

    var box = h("div", {}, [wrap]);
    if (opts.add) {
      box.appendChild(h("button", {
        class: "ed-add", type: "button",
        onclick: function () {
          items.push(opts.blank());
          touch();
          redrawPage();
          rerender();
          /* Drop the cursor straight into the new row so adding a player
             is one tap and then typing, not one tap and then aiming. */
          var rows = wrap.querySelectorAll(".ed-item");
          var last = rows[rows.length - 1];
          var firstInput = last && last.querySelector("input, textarea, select");
          if (firstInput) {
            firstInput.focus();
            last.scrollIntoView({ block: "nearest" });
          }
        }
      }, ["+ " + opts.add]));
    }
    return box;
  }

  function group(legend, count, kids) {
    var head = h("div", { class: "ed-legend" }, [
      h("span", { text: legend }),
      count != null ? h("em", { text: String(count) }) : null
    ]);
    return h("div", { class: "ed-group" }, [head].concat(kids));
  }

  /* ---------- state plumbing ---------- */

  function touch() {
    state.dirty = true;
    paintFoot();
  }

  function redrawPage() {
    Site.renderSite();
    Site.buildRungs();
    Site.renderTeam(false);
  }

  function team() {
    return Site.state.teams[Site.state.current];
  }

  function say(message, tone) {
    var node = root && root.querySelector(".ed-status");
    if (!node) return;
    node.textContent = message;
    node.className = "ed-status" + (tone ? " " + tone : "");
  }

  /* ---------- tabs ---------- */

  var TABS = [
    { id: "team", label: "Team" },
    { id: "game", label: "Next game" },
    { id: "schedule", label: "Schedule" },
    { id: "roster", label: "Roster" },
    { id: "practice", label: "Practice" },
    { id: "site", label: "Site" },
    { id: "leads", label: "Requests" }
  ];

  function paintTab() {
    var body = root.querySelector(".ed-body");
    body.innerHTML = "";
    body.scrollTop = 0;

    root.querySelectorAll(".ed-tab").forEach(function (b) {
      b.setAttribute("aria-selected", b.dataset.tab === state.tab ? "true" : "false");
    });

    var picker = root.querySelector(".ed-pick");
    if (picker) picker.hidden = (state.tab === "site" || state.tab === "leads");

    var view = ({
      team: viewTeam, game: viewGame, schedule: viewSchedule,
      roster: viewRoster, practice: viewPractice, site: viewSite, leads: viewLeads
    })[state.tab];

    body.appendChild(view());
  }

  /* ---------- views ---------- */

  function viewTeam() {
    var t = team();
    if (!t) return h("div", { class: "ed-empty", text: "Add a team to get started." });

    return h("div", {}, [
      group("This team", null, [
        field("Team name", t, "name", { placeholder: "7th grade" }),
        field("Rail label", t, "id", {
          placeholder: "7th",
          onchange: function (value) { renameTeam(t, value); }
        }),
        h("div", { class: "ed-pair" }, [
          field("Record", t, "record", { placeholder: "18-4" }),
          field("Home gym", t, "homeGym", { placeholder: "Prosper Fieldhouse" })
        ]),
        field("Head coach", t, "coach", { placeholder: "Coach Whitfield" }),
        field("Coach email", t, "coachEmail", { type: "email", placeholder: "coach@elevatehoops.com" })
      ]),
      group("All teams", Site.state.teams.length, [
        h("p", { class: "ed-note", text: "The rail label is the short tag shown on the left edge of the site. Keep it to four characters or so." }),
        h("button", {
          class: "ed-add", type: "button",
          onclick: addTeam
        }, ["+ Add a team"]),
        Site.state.teams.length > 1 ? h("button", {
          class: "ed-add danger", type: "button",
          onclick: removeTeam
        }, ["✕ Remove " + (t.name || "this team")]) : null
      ])
    ]);
  }

  function viewGame() {
    var t = team();
    if (!t) return h("div", { class: "ed-empty", text: "Add a team first." });
    t.nextGame = t.nextGame || {};
    var g = t.nextGame;

    return h("div", {}, [
      group("Next game", null, [
        h("div", { class: "ed-pair" }, [
          field("Opponent", g, "opponent", { placeholder: "Allen Elite" }),
          field("Their record", g, "opponentRecord", { placeholder: "10-6" })
        ]),
        field("Tip-off", g, "tipoff", { type: "datetime-local" }),
        field("Be there by", g, "arriveBy", { placeholder: "3:45 PM, warmups" }),
        field("Venue", g, "venue", { placeholder: "Prosper Fieldhouse, Court 3" }),
        field("Jersey", g, "jersey", { placeholder: "Home white" }),
        h("p", { class: "ed-note", text: "Tip-off drives the countdown on the page, the directions link, and the calendar file parents download. Times are the gym's local time." })
      ])
    ]);
  }

  function viewSchedule() {
    var t = team();
    if (!t) return h("div", { class: "ed-empty", text: "Add a team first." });
    t.schedule = t.schedule || [];

    return h("div", {}, [
      group("Season", t.schedule.length, [
        list(t.schedule, function (row) {
          return [
            h("div", { class: "ed-pair" }, [
              field("Date", row, "date", { type: "date" }),
              field("Result", row, "status", { options: STATUSES })
            ]),
            field("Opponent", row, "opponent", { placeholder: "Frisco Force" }),
            field("Venue", row, "venue", { placeholder: "Prosper Fieldhouse" }),
            field(row.status === "upcoming" ? "Tip-off time" : "Score", row, "result", {
              placeholder: row.status === "upcoming" ? "5:30 PM" : "W 68-51"
            })
          ];
        }, {
          add: "Add a game",
          empty: "No games on the schedule yet.",
          removeLabel: "Remove game",
          blank: function () {
            return { date: "", opponent: "", venue: t.homeGym || "", status: "upcoming", result: "" };
          }
        }),
        h("p", { class: "ed-note", text: "Switch a game to Won or Lost and the last box becomes the score." })
      ])
    ]);
  }

  function viewRoster() {
    var t = team();
    if (!t) return h("div", { class: "ed-empty", text: "Add a team first." });
    t.roster = t.roster || [];

    return h("div", {}, [
      group("Players", t.roster.length, [
        list(t.roster, function (p) {
          return [
            h("div", { class: "ed-pair tight" }, [
              field("No.", p, "number", { placeholder: "00" }),
              field("Name", p, "name", { placeholder: "Player name" })
            ]),
            h("div", { class: "ed-pair" }, [
              field("Position", p, "position", { options: POSITIONS }),
              field("Height", p, "height", { placeholder: "5'7″" })
            ]),
            field("Grade or year", p, "grade", { placeholder: "7th" })
          ];
        }, {
          add: "Add a player",
          empty: "No players on this roster yet.",
          removeLabel: "Remove player",
          blank: function () {
            return { number: "", position: "Guard", name: "", height: "", grade: t.id || "" };
          }
        })
      ])
    ]);
  }

  function viewPractice() {
    var t = team();
    if (!t) return h("div", { class: "ed-empty", text: "Add a team first." });
    t.practices = t.practices || [];

    return h("div", {}, [
      group("Every week", t.practices.length, [
        list(t.practices, function (p) {
          return [
            field("Day", p, "day", { placeholder: "Tuesday" }),
            field("Time", p, "time", { placeholder: "7:30 - 9:00 PM" })
          ];
        }, {
          add: "Add a practice",
          empty: "No practices listed yet.",
          removeLabel: "Remove practice",
          blank: function () { return { day: "", time: "" }; }
        })
      ])
    ]);
  }

  function viewSite() {
    var s = Site.state.site;
    s.alerts = s.alerts || [];
    s.gyms = s.gyms || [];
    s.pillars = s.pillars || [];
    s.stats = s.stats || [];
    s.contactRows = s.contactRows || [];

    return h("div", {}, [
      group("Announcements", s.alerts.length, [
        h("p", { class: "ed-note", text: "These sit at the very top of the page, above everything. Use them for the thing you need every parent to see this week, then delete them when they are stale." }),
        list(s.alerts, function (a) {
          return [
            h("div", { class: "ed-pair" }, [
              field("Label", a, "tag", { placeholder: "Action" }),
              field("Colour", a, "tone", {
                options: [{ value: "action", label: "Pink, needs doing" }, { value: "info", label: "Blue, good to know" }]
              })
            ]),
            field("Message", a, "body", { multiline: true, rows: 2, placeholder: "Tournament fees are due Friday." }),
            field("Footnote", a, "meta", { placeholder: "Posted Aug 4 · All teams" })
          ];
        }, {
          add: "Post an announcement",
          empty: "No announcements. The strip is hidden on the page.",
          removeLabel: "Delete announcement",
          blank: function () { return { tone: "action", tag: "Update", body: "", meta: "" }; }
        })
      ]),

      group("Headline", null, [
        field("Eyebrow", s, "eyebrow", { placeholder: "Elevate Basketball / Prosper, TX" }),
        field("Claim, first line", s, "claimLead", { placeholder: "Most programs count wins." }),
        field("Claim, emphasis", s, "claimEmphasis", { placeholder: "We count who's still playing in four years." })
      ]),

      group("Gyms", s.gyms.length, [
        list(s.gyms, function (g) {
          return [
            field("Name", g, "name", { placeholder: "Prosper Fieldhouse" }),
            field("Address", g, "address", { placeholder: "1301 E Prosper Trail, Prosper, TX 75078" }),
            field("Good to know", g, "note", { placeholder: "Park in the north lot" })
          ];
        }, {
          add: "Add a gym",
          empty: "No gyms listed.",
          removeLabel: "Remove gym",
          blank: function () { return { name: "", address: "", note: "" }; }
        }),
        h("p", { class: "ed-note", text: "The Directions link is built from the address, so keep it something a map can find." })
      ]),

      group("How it works", s.pillars.length, [
        field("Section heading", s, "programTitle", { placeholder: "Three years, three jobs" }),
        list(s.pillars, function (p) {
          return [
            h("div", { class: "ed-pair" }, [
              field("Age range", p, "label", { placeholder: "7th – 8th grade" }),
              field("Title", p, "title", { placeholder: "Compete" })
            ]),
            field("Description", p, "body", { multiline: true, rows: 4 }),
            field("Link text", p, "linkText", { placeholder: "Explore competition" })
          ];
        }, {
          add: "Add a stage",
          empty: "No stages listed.",
          removeLabel: "Remove stage",
          blank: function () { return { label: "", title: "", body: "", linkText: "Learn more" }; }
        })
      ]),

      group("Numbers", s.stats.length, [
        field("Heading above the numbers", s, "proofLabel", {}),
        list(s.stats, function (st) {
          return [
            h("div", { class: "ed-pair tight" }, [
              field("Number", st, "value", { type: "number", number: true, placeholder: "31" }),
              field("Suffix", st, "suffix", { placeholder: "%" })
            ]),
            field("What it means", st, "label", { multiline: true, rows: 2 })
          ];
        }, {
          add: "Add a number",
          empty: "No numbers listed.",
          removeLabel: "Remove number",
          blank: function () { return { value: 0, suffix: "", label: "" }; }
        }),
        field("Closing line", s, "proofNote", { multiline: true, rows: 3 }),
        h("p", { class: "ed-note", text: "Wrap a phrase in *asterisks* in the closing line to make it stand out." })
      ]),

      group("Join form", null, [
        field("Intro paragraph", s, "joinIntro", { multiline: true, rows: 4 })
      ]),

      group("Program contact", s.contactRows.length, [
        list(s.contactRows, function (r) {
          return [
            field("Detail", r, "value", { placeholder: "director@elevatehoops.com" }),
            field("Label", r, "label", { placeholder: "Email" })
          ];
        }, {
          add: "Add a contact line",
          empty: "No contact details listed.",
          removeLabel: "Remove line",
          blank: function () { return { value: "", label: "" }; }
        })
      ]),

      group("Footer", null, [
        field("Footer line", s, "footNote", {})
      ])
    ]);
  }

  function viewLeads() {
    if (!Backend.configured) {
      return h("div", { class: "ed-empty", text: "Connect Supabase to collect tryout requests. See SETUP.md." });
    }
    if (state.leads === null) {
      loadLeads();
      return h("div", { class: "ed-empty", text: "Loading requests…" });
    }
    if (!state.leads.length) {
      return h("div", { class: "ed-empty", text: "No requests yet. They land here the moment a parent sends the form." });
    }

    var box = h("div", { class: "ed-group" }, [
      h("div", { class: "ed-legend" }, [
        h("span", { text: "Tryout requests" }),
        h("em", { text: String(state.leads.length) })
      ])
    ]);

    state.leads.forEach(function (lead) {
      var when = lead.created_at ? new Date(lead.created_at).toLocaleDateString() : "";
      var card = h("div", { class: "ed-lead" + (lead.handled ? " handled" : "") }, [
        h("div", { class: "ed-lead-k", text: (lead.reason || "Request") + (when ? " · " + when : "") }),
        h("b", { text: lead.name || "No name given" }),
        h("a", { href: "mailto:" + (lead.email || ""), text: lead.email || "" }),
        lead.phone ? h("p", { text: lead.phone }) : null,
        lead.player ? h("p", { text: "Player: " + lead.player + (lead.grade ? " · " + lead.grade : "") }) : null,
        lead.message ? h("p", { text: lead.message }) : null,
        h("div", { class: "ed-lead-foot" }, [
          (function () {
            var check = h("input", { type: "checkbox" });
            check.checked = !!lead.handled;
            check.addEventListener("change", function () {
              lead.handled = check.checked;
              card.classList.toggle("handled", check.checked);
              Backend.markLeadHandled(lead.id, check.checked).catch(function (err) {
                say("Could not update that request: " + err.message, "warn");
              });
            });
            return h("label", {}, [check, document.createTextNode("Followed up")]);
          })()
        ])
      ]);
      box.appendChild(card);
    });

    return box;
  }

  function loadLeads() {
    Backend.loadLeads().then(function (rows) {
      state.leads = rows || [];
      if (state.tab === "leads") paintTab();
    }).catch(function (err) {
      state.leads = [];
      say("Could not load requests: " + err.message, "warn");
      if (state.tab === "leads") paintTab();
    });
  }

  /* ---------- team add / remove / rename ---------- */

  function uniqueId(base) {
    var id = base, n = 2;
    var taken = function (candidate) {
      return Site.state.teams.some(function (t) { return t.id === candidate; });
    };
    while (taken(id)) { id = base + n; n++; }
    return id;
  }

  function renameTeam(t, value) {
    var next = String(value || "").trim();
    if (!next) return;                       /* wait until they finish typing */
    if (t._originalId === undefined) t._originalId = t.id;
    var clash = Site.state.teams.some(function (o) { return o !== t && o.id === next; });
    if (clash) {
      say("Another team already uses the label " + next + ".", "warn");
      return;
    }
    t.id = next;
    say("");
    redrawPage();
  }

  function addTeam() {
    var id = uniqueId("NEW");
    Site.state.teams.push({
      id: id, name: "New team", record: "0-0",
      coach: "", coachEmail: "", homeGym: "",
      nextGame: { opponent: "", opponentRecord: "", tipoff: "", arriveBy: "", venue: "", jersey: "" },
      practices: [], schedule: [], roster: []
    });
    Site.state.current = Site.state.teams.length - 1;
    touch();
    redrawPage();
    paintPicker();
    paintTab();
  }

  function removeTeam() {
    var t = team();
    if (!t || Site.state.teams.length < 2) return;
    if (!confirm("Remove " + (t.name || "this team") + " and everything on it? This cannot be undone once you save.")) return;

    var storedId = t._originalId !== undefined ? t._originalId : t.id;
    if (state.removedTeamIds.indexOf(storedId) === -1) state.removedTeamIds.push(storedId);

    Site.state.teams.splice(Site.state.current, 1);
    Site.state.current = Math.max(0, Site.state.current - 1);
    touch();
    redrawPage();
    paintPicker();
    paintTab();
  }

  /* ---------- saving ---------- */

  function save() {
    if (state.busy || !state.dirty) return;
    if (!Backend.configured) {
      say("Connect Supabase in assets/config.js before saving. See SETUP.md.", "warn");
      return;
    }

    state.busy = true;
    paintFoot();
    say("Saving…");

    /* Renames create a new row, so the row under the old key goes too. */
    var removed = state.removedTeamIds.slice();
    Site.state.teams.forEach(function (t) {
      if (t._originalId !== undefined && t._originalId !== t.id && removed.indexOf(t._originalId) === -1) {
        removed.push(t._originalId);
      }
    });

    Backend.staleTeams(Site.state.teams).then(function (stale) {
      if (stale.length) {
        var names = stale.join(", ");
        if (!confirm("Someone else has saved changes to " + names + " since you opened this.\n\nSaving now replaces their version with yours. Continue?")) {
          throw new Error("__cancelled__");
        }
      }
      return Promise.all([
        Backend.saveTeams(Site.state.teams, removed),
        Backend.saveSite(Site.state.site)
      ]);
    }).then(function () {
      state.dirty = false;
      state.removedTeamIds = [];
      Site.state.teams.forEach(function (t) { delete t._originalId; });
      return Site.loadLive();
    }).then(function () {
      say("Saved. Parents see this now.", "ok");
    }).catch(function (err) {
      if (err.message === "__cancelled__") { say("Nothing saved."); return; }
      if (err.status === 401 || err.status === 403) {
        say("Your sign-in expired. Sign in again to save.", "warn");
        state.user = null;
        paint();
        return;
      }
      say("Could not save: " + err.message, "warn");
    }).then(function () {
      state.busy = false;
      paintFoot();
    });
  }

  /* ---------- chrome ---------- */

  function paintFoot() {
    var foot = root && root.querySelector(".ed-foot");
    if (!foot) return;
    var button = foot.querySelector(".ed-save");
    if (button) {
      button.disabled = state.busy || !state.dirty;
      button.textContent = state.busy ? "Saving…" : (state.dirty ? "Save changes" : "Saved");
    }
  }

  function paintPicker() {
    var picker = root && root.querySelector(".ed-pick select");
    if (!picker) return;
    picker.innerHTML = "";
    Site.state.teams.forEach(function (t, i) {
      picker.appendChild(h("option", { value: String(i), text: t.name || t.id }));
    });
    picker.value = String(Site.state.current);
  }

  /* ---------- sign in ---------- */

  function gate(message, tone) {
    var input = h("input", { type: "email", placeholder: "coach@elevatehoops.com", autocomplete: "email" });
    var status = h("p", { class: "ed-note", text: message || "" });
    if (tone) status.style.color = tone === "warn" ? "var(--ion)" : "var(--peri)";

    function send() {
      var email = input.value.trim();
      if (!email || email.indexOf("@") === -1) {
        status.textContent = "Enter the email address your program director added for you.";
        status.style.color = "var(--ion)";
        return;
      }
      status.textContent = "Sending…";
      status.style.color = "";
      Backend.sendLoginLink(email).then(function () {
        status.textContent = "Check " + email + ". The link signs you in and works once.";
        status.style.color = "var(--peri)";
      }).catch(function (err) {
        status.textContent = err.status === 400 || err.status === 422
          ? "That address is not set up to edit this site. Ask your program director to add it."
          : "Could not send the link: " + err.message;
        status.style.color = "var(--ion)";
      });
    }

    input.addEventListener("keydown", function (e) { if (e.key === "Enter") send(); });

    return h("div", { class: "ed-gate" }, [
      h("h2", { text: "Coach sign-in" }),
      h("p", { text: "We email you a link that signs you in. No password to remember, and nothing to share with anyone else." }),
      h("div", { class: "ed-f" }, [h("label", { text: "Your email" }), input]),
      h("button", { class: "ed-btn", type: "button", onclick: send }, ["Email me a link"]),
      status,
      h("p", { class: "ed-note", text: "Only addresses your program director has added can sign in." })
    ]);
  }

  function setupNotice() {
    return h("div", { class: "ed-gate" }, [
      h("h2", { text: "Not connected yet" }),
      h("p", { text: "The console works, and every change you make below shows up on the page straight away. But there is nowhere to save it to yet, so it is gone when you refresh." }),
      h("p", { text: "Open SETUP.md and follow the Supabase steps, then paste your two project values into assets/config.js. Takes about fifteen minutes, once." }),
      h("button", {
        class: "ed-btn ghost", type: "button",
        onclick: function () { state.preview = true; paint(); }
      }, ["Try it out anyway"])
    ]);
  }

  /* ---------- open / close ---------- */

  function paint() {
    if (!root) return;
    root.innerHTML = "";

    var head = h("div", { class: "ed-head" }, [
      h("div", { class: "ed-mark", text: "Edit" }),
      h("div", { class: "ed-who", text: state.user ? state.user.email : (state.preview ? "Preview, nothing saves" : "") }),
      h("button", { class: "ed-x", type: "button", title: "Close", "aria-label": "Close the console", onclick: close }, ["✕"])
    ]);
    root.appendChild(head);

    var body = h("div", { class: "ed-body" });

    if (!Backend.configured && !state.preview) {
      body.appendChild(setupNotice());
      root.appendChild(body);
      return;
    }
    if (Backend.configured && !state.user) {
      body.appendChild(gate(state.gateMessage, state.gateTone));
      root.appendChild(body);
      return;
    }

    var tabs = h("div", { class: "ed-tabs", role: "tablist" });
    TABS.forEach(function (t) {
      var button = h("button", {
        class: "ed-tab", type: "button", role: "tab",
        "aria-selected": t.id === state.tab ? "true" : "false",
        onclick: function () { state.tab = t.id; paintTab(); }
      }, [t.label]);
      button.dataset.tab = t.id;
      tabs.appendChild(button);
    });
    root.appendChild(tabs);

    var select = h("select", { "aria-label": "Team being edited" });
    select.addEventListener("change", function () {
      Site.state.current = Number(select.value);
      Site.renderTeam(false);
      paintTab();
    });
    root.appendChild(h("div", { class: "ed-pick" }, [
      h("span", {
        class: "ed-pick-k",
        text: "Team"
      }),
      select
    ]));

    root.appendChild(body);

    root.appendChild(h("div", { class: "ed-foot" }, [
      h("div", { class: "ed-status", text: "" }),
      h("button", { class: "ed-btn ed-save", type: "button", disabled: true, onclick: save }, ["Saved"])
    ]));

    paintPicker();
    paintTab();
    paintFoot();
  }

  function open() {
    if (state.open) return;
    state.open = true;
    document.body.classList.add("ed-open");
    root = h("div", { class: "ed", role: "region", "aria-label": "Edit console" });
    document.body.appendChild(root);

    if (Backend.configured && Backend.signedIn() && !state.user) {
      Backend.currentUser().then(function (user) {
        state.user = user;
        paint();
      }).catch(function () {
        state.user = null;
        paint();
      });
    }
    paint();

    if (history.replaceState && location.search.indexOf("edit") === -1) {
      var sep = location.search ? "&" : "?";
      history.replaceState(null, "", location.pathname + location.search + sep + "edit");
    }
  }

  function close() {
    if (!state.open) return;
    if (state.dirty && !confirm("You have changes that are not saved yet. Close anyway?")) return;
    state.open = false;
    state.dirty = false;
    document.body.classList.remove("ed-open");
    if (root) { root.remove(); root = null; }
    history.replaceState(null, "", location.pathname);
    Site.loadLive();
  }

  /* ---------- boot ---------- */

  function boot() {
    var arrived = Backend.configured && Backend.captureRedirect();
    var failure = Backend.configured && Backend.authError();
    if (failure) {
      state.gateMessage = failure;
      state.gateTone = "warn";
    }

    var wanted = /(^|[?&])edit(=|&|$)/.test(location.search) || arrived || !!failure;
    if (wanted) open();

    var entry = document.getElementById("coachEntry");
    if (entry) entry.addEventListener("click", open);

    document.addEventListener("keydown", function (e) {
      if (e.key && e.key.toLowerCase() === "e" && e.ctrlKey && e.shiftKey) {
        e.preventDefault();
        state.open ? close() : open();
      }
    });

    window.addEventListener("beforeunload", function (e) {
      if (!state.dirty) return;
      e.preventDefault();
      e.returnValue = "";
    });
  }

  boot();
})();
