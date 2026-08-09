/* ============================================================
   site.js — draws the page.

   Reads from Site.state, which starts as the content in seed.js
   and gets replaced by whatever Supabase returns. The edit console
   mutates Site.state and calls Site.render(), so what a coach sees
   while editing is the real page, not a preview of it.
   ============================================================ */

var Site = (function () {

  var state = {
    site: JSON.parse(JSON.stringify(SEED_SITE)),
    teams: JSON.parse(JSON.stringify(SEED_TEAMS)),
    current: 0,
    live: false          /* true once real data has arrived from Supabase */
  };

  var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function el(id) { return document.getElementById(id); }

  /* One live region, four callers. Without it a screen-reader user gets
     silence on every state change the site makes. */
  function announce(message) {
    var node = el("live");
    if (!node) return;
    node.textContent = "";
    setTimeout(function () { node.textContent = message; }, 60);
  }

  /* ---------- text safety ----------
     Everything below goes through esc() before it reaches innerHTML.
     Coaches type this content and parents read it, so untrusted text
     must never be able to become markup. */

  var ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return ESCAPES[c]; });
  }

  /* Lets coaches emphasise a phrase by wrapping it in *asterisks*
     without opening the door to arbitrary HTML. */
  function rich(s) {
    return esc(s).replace(/\*([^*]+)\*/g, "<b>$1</b>");
  }

  function initials(name) {
    return String(name || "")
      .split(/\s+/)
      .map(function (w) { return w.charAt(0); })
      .join("")
      .slice(0, 2)
      .toUpperCase() || "--";
  }

  /* ---------- dates ---------- */

  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  /* Tip-off times are wall-clock at the gym ("2026-08-15T16:30"), so they
     are parsed as local time deliberately — no timezone conversion. */
  function parseLocal(value) {
    if (!value) return null;
    var m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(String(value));
    if (!m) return null;
    var d = new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), 0, 0);
    return isNaN(d.getTime()) ? null : d;
  }

  function clock(d) {
    var h = d.getHours(), m = d.getMinutes();
    var ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return h + ":" + (m < 10 ? "0" : "") + m + " " + ampm;
  }

  function longDate(value) {
    var d = parseLocal(value);
    if (!d) return "—";
    return DAYS[d.getDay()] + ", " + MONTHS[d.getMonth()] + " " + d.getDate() + " · " + clock(d);
  }

  function shortDate(value) {
    var d = parseLocal(value);
    if (!d) return String(value || "");
    return MONTHS[d.getMonth()].toUpperCase() + " " + (d.getDate() < 10 ? "0" : "") + d.getDate();
  }

  /* ---------- shared render helpers ---------- */

  var STATUS_CLASS = { win: "w", loss: "l", upcoming: "up" };

  function team() { return state.teams[state.current] || null; }

  function setText(id, value) {
    var node = el(id);
    if (node) node.textContent = value == null || value === "" ? "—" : value;
  }

  /* Numbers flip like a scoreboard rather than snapping. Each character
     gets its own cell so "18-4" changing to "21-5" rolls per digit, and
     only the characters that actually changed animate. */
  function roll(id, value) {
    var node = el(id);
    if (!node) return;
    var next = value == null || value === "" ? "—" : String(value);
    if (REDUCED || node.textContent === next) { if (node.textContent !== next) node.textContent = next; return; }

    var previous = node.textContent;
    node.textContent = "";
    next.split("").forEach(function (ch, i) {
      var cell = document.createElement("span");
      /* white-space:pre on every cell — splitting into spans otherwise
         collapses the spaces and "18-4 · 7th grade" becomes one word. */
      cell.className = previous[i] !== ch ? "roll-cell roll-digit" : "roll-cell";
      cell.textContent = ch;
      if (previous[i] !== ch) cell.style.animationDelay = (i * 34) + "ms";
      node.appendChild(cell);
    });
  }

  /* ---------- site-wide content ---------- */

  function renderSite() {
    var s = state.site;

    setText("eyebrowLine", s.eyebrow);
    var claim = el("claim");
    if (claim) {
      claim.innerHTML = esc(s.claimLead) + "<br><b>" + esc(s.claimEmphasis) + "</b>";
    }
    setText("footNote", s.footNote);
    setText("joinIntro", s.joinIntro);
    setText("programTitle", s.programTitle);
    setText("proofLabel", s.proofLabel);
    setText("sentBody", s.sentBody);
    setText("plateLine", s.plateLine);

    /* A photograph goes here when there is one. Until then the section
       stands on its own as a floor-navy field with court geometry in it. */
    var plate = el("plate"), media = el("plateMedia");
    if (plate && media) {
      if (s.photo) {
        media.style.backgroundImage = "url('" + String(s.photo).replace(/['"\\]/g, "") + "')";
        plate.classList.add("has-photo");
      } else {
        media.style.backgroundImage = "";
        plate.classList.remove("has-photo");
      }
    }

    var note = el("proofNote");
    if (note) note.innerHTML = rich(s.proofNote);

    var alertSection = el("alerts");
    var alerts = s.alerts || [];
    if (alertSection) alertSection.hidden = alerts.length === 0;
    var alertBody = el("alertBody");
    if (alertBody) {
      alertBody.innerHTML = alerts.map(function (a) {
        return '<div class="alert">' +
          '<div class="alert-tag' + (a.tone === "info" ? " info" : "") + '">' + esc(a.tag) + "</div>" +
          "<div><p>" + esc(a.body) + "</p>" +
          (a.meta ? "<small>" + esc(a.meta) + "</small>" : "") +
          "</div></div>";
      }).join("");
    }

    var gymBody = el("gymBody");
    if (gymBody) {
      gymBody.innerHTML = (s.gyms || []).map(function (g) {
        var line = [g.address, g.note].filter(Boolean).map(esc).join(" · ");
        return '<div class="gym"><b>' + esc(g.name) + "</b>" +
          (line ? "<p>" + line + "</p>" : "") +
          '<a href="' + esc(mapUrl(g.address || g.name)) + '" target="_blank" rel="noopener">Directions<i>&rarr;</i></a>' +
          "</div>";
      }).join("");
    }

    var pillarBody = el("pillarBody");
    if (pillarBody) {
      pillarBody.innerHTML = (s.pillars || []).map(function (p) {
        return '<div class="pillar">' +
          '<div class="pillar-n">' + esc(p.label) + "</div>" +
          "<h3>" + esc(p.title) + "</h3>" +
          "<p>" + esc(p.body) + "</p>" +
          '<a href="#join">' + esc(p.linkText || "Learn more") + "<i>&rarr;</i></a>" +
          "</div>";
      }).join("");
    }

    var proofBody = el("proofBody");
    if (proofBody) {
      proofBody.innerHTML = (s.stats || []).map(function (st) {
        return '<div class="proof-i"><b data-count="' + esc(st.value) + '" data-suffix="' + esc(st.suffix || "") + '">0' +
          esc(st.suffix || "") + "</b><span>" + esc(st.label) + "</span></div>";
      }).join("");
    }

    var contactBody = el("contactBody");
    if (contactBody) {
      contactBody.innerHTML = (s.contactRows || []).map(function (r) {
        return '<div class="prow"><div>' + esc(r.value) + "</div><span>" + esc(r.label) + "</span></div>";
      }).join("");
    }
  }

  function mapUrl(query) {
    return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(query || "");
  }

  /* ---------- team rail ---------- */

  function buildRungs() {
    var rail = el("rungs"), mrail = el("mrungs");
    if (!rail || !mrail) return;

    rail.querySelectorAll(".rung").forEach(function (b) { b.remove(); });
    mrail.innerHTML = "";

    state.teams.forEach(function (t, i) {
      var rung = document.createElement("button");
      rung.className = "rung";
      rung.type = "button";
      rung.textContent = t.id;
      rung.setAttribute("aria-label", t.name);
      rung.addEventListener("click", function () { switchTeam(i); });
      rail.appendChild(rung);

      var chip = document.createElement("button");
      chip.type = "button";
      chip.textContent = t.name;
      chip.addEventListener("click", function () { switchTeam(i); });
      mrail.appendChild(chip);
    });

    var first = state.teams[0], last = state.teams[state.teams.length - 1];
    setText("ladderTop", last ? last.name : "");
    setText("ladderFoot", first ? first.name : "");
  }

  /* ---------- team content ---------- */

  function renderTeam(animate) {
    var t = team();
    if (!t) return;

    document.querySelectorAll(".rung").forEach(function (b, n) {
      b.setAttribute("aria-current", n === state.current ? "true" : "false");
    });
    document.querySelectorAll(".mrail button").forEach(function (b, n) {
      b.setAttribute("aria-current", n === state.current ? "true" : "false");
    });

    var g = t.nextGame || {};
    var hasGame = !!(g.opponent || g.tipoff);

    /* With no fixture the card used to show five em-dashes, a dead countdown,
       a directions button pointing at blank Google Maps, and a calendar button
       that silently did nothing. Say the true thing instead. */
    var card = el("gameCard");
    if (card) card.classList.toggle("no-game", !hasGame);
    var stack = card && card.querySelector(".stack");
    if (stack) stack.hidden = !hasGame;
    var count = card && card.querySelector(".count");
    if (count) count.hidden = !hasGame;

    setText("teamTitle", t.name);
    roll("mRec", t.record);
    setText("mCoach", t.coach);
    setText("mGym", t.homeGym);
    roll("gUs", (t.record || "") + " · " + t.name);
    setText("gOpp", hasGame ? g.opponent : "Not scheduled");
    roll("gOppR", g.opponentRecord);
    setText("oCrest", hasGame ? initials(g.opponent) : "--");
    setText("gTime", g.tipoff ? longDate(g.tipoff) : "Goes up as soon as the bracket lands");
    setText("gArrive", g.arriveBy);
    setText("gVenue", g.venue);
    setText("gJersey", g.jersey);
    setText("schTitle", t.name + " schedule");
    setText("rosTitle", t.name + " roster");
    setText("cCoach", t.coach);
    setText("cMail", t.coachEmail);

    var directions = el("gDirections");
    if (directions) directions.href = mapUrl(g.venue);

    el("schBody").innerHTML = (t.schedule || []).length
      ? t.schedule.map(function (row) {
          return '<div class="row">' +
            '<div class="row-d">' + esc(shortDate(row.date)) + "</div>" +
            '<div class="row-o">' + esc(row.opponent) + "</div>" +
            '<div class="row-v">' + esc(row.venue) + "</div>" +
            '<div class="pill ' + (STATUS_CLASS[row.status] || "up") + '">' + esc(row.result) + "</div>" +
            "</div>";
        }).join("")
      : '<div class="empty">The season schedule is not out yet. It goes up here first.</div>';

    el("practice").innerHTML = (t.practices || []).length
      ? t.practices.map(function (p) {
          return '<div class="prow"><div>' + esc(p.day) + "</div><span>" + esc(p.time) + "</span></div>";
        }).join("")
      : '<div class="empty">Practice times are being set. Your coach will text them out.</div>';

    /* The oversized numeral is texture — at 1.11:1 nobody can read it, so it
       is hidden from assistive tech and the number is repeated legibly below. */
    el("rosBody").innerHTML = (t.roster || []).length
      ? t.roster.map(function (p) {
          var detail = [p.number ? "#" + p.number : "", p.height, p.grade].filter(Boolean).join(" · ");
          return '<div class="pl">' +
            '<div class="pl-no" aria-hidden="true">' + esc(p.number) + "</div>" +
            '<div class="pl-pos">' + esc(p.position) + "</div>" +
            '<div class="pl-n">' + esc(p.name) + "</div>" +
            '<div class="pl-d">' + esc(detail) + "</div>" +
            "</div>";
        }).join("")
      : '<div class="empty">The roster goes up after tryouts.</div>';

    markShown(el("schBody").children);
    markShown(el("rosBody").children);
    markShown(el("practice").children);
    moveMark(state.current);

    tick();
  }

  /* Players reporting to the scorer's table. Signed by direction: climbing the
     ladder toward varsity, cards enter from below; dropping toward 5th grade,
     from above — so the motion carries the depth chart.
     WAAPI rather than CSS so nothing leaves a stale inline delay or a
     permanently promoted layer behind. */
  function checkIn(direction) {
    if (REDUCED) return;
    var nodes = [].slice.call(document.querySelectorAll("#schBody .row, #rosBody .pl"));
    nodes.forEach(function (n, i) {
      n.animate(
        [{ opacity: 0, transform: "translateY(" + (9 * direction) + "px)" },
         { opacity: 1, transform: "none" }],
        /* capped at 14 so a varsity roster does not tail past a full possession */
        { duration: 260, delay: Math.min(i, 14) * 34, easing: "cubic-bezier(.2,0,0,1)", fill: "backwards" }
      );
    });
  }

  function render(animate) {
    renderSite();
    buildRungs();
    renderTeam(!!animate);
    observeCounts();
  }

  /* ---------- countdown ---------- */

  function setDigit(id, value) {
    var node = el(id);
    if (!node || node.textContent === value) return;
    node.textContent = value;
    if (REDUCED) return;
    node.classList.remove("roll");
    void node.offsetWidth;
    node.classList.add("roll");
  }

  function tick() {
    var t = team();
    var tip = t && t.nextGame ? parseLocal(t.nextGame.tipoff) : null;
    var label = el("countLabel");

    if (!tip) {
      if (label) label.textContent = "Next game";
      ["cd", "ch", "cm", "cs"].forEach(function (id) { setDigit(id, "--"); });
      return;
    }

    var seconds = (tip - new Date()) / 1000;
    if (label) label.textContent = seconds <= 0 ? "Tipped off" : "Tip-off in";
    seconds = Math.max(0, seconds);

    setDigit("cd", String(Math.floor(seconds / 86400)).padStart(2, "0"));
    setDigit("ch", String(Math.floor(seconds % 86400 / 3600)).padStart(2, "0"));
    setDigit("cm", String(Math.floor(seconds % 3600 / 60)).padStart(2, "0"));
    setDigit("cs", String(Math.floor(seconds % 60)).padStart(2, "0"));

    shotClock();
  }

  /* ---------- the shot clock ----------
     A hairline draining across the top of the next-game card over 24
     seconds, then resetting in one hard step. It is the sport's own
     rhythm, and it makes the card the most alive thing on the page —
     which is right, because it is what parents came for.
     Rides the countdown's existing 1s interval; no second timer. */

  var shot = 24;

  function shotClock() {
    var card = el("gameCard");
    if (!card || REDUCED) return;
    var box = card.getBoundingClientRect();
    if (box.bottom < 0 || box.top > window.innerHeight) return;   /* off screen, don't bother */

    shot--;
    if (shot <= 0) {
      shot = 24;
      card.classList.add("reset");
      card.style.setProperty("--sc", 1);
      setTimeout(function () { card.classList.remove("reset"); }, 170);
    } else {
      card.style.setProperty("--sc", shot / 24);
    }
  }

  /* ---------- calendar file ---------- */

  function pad(n) { return (n < 10 ? "0" : "") + n; }

  function icsStamp(d) {
    return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) +
      "T" + pad(d.getHours()) + pad(d.getMinutes()) + "00";
  }

  /* Emits a floating (no timezone) event so it lands at the gym's local
     time on whatever device the parent adds it to. */
  function downloadInvite() {
    var t = team();
    var g = t && t.nextGame;
    var start = g ? parseLocal(g.tipoff) : null;
    if (!start) return;
    var end = new Date(start.getTime() + 90 * 60000);

    var lines = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Elevate Basketball//EN",
      "BEGIN:VEVENT",
      "UID:" + start.getTime() + "-" + t.id + "@elevate",
      "DTSTAMP:" + icsStamp(new Date()),
      "DTSTART:" + icsStamp(start),
      "DTEND:" + icsStamp(end),
      "SUMMARY:" + icsText("Elevate " + t.name + " vs " + (g.opponent || "TBD")),
      "LOCATION:" + icsText(g.venue || ""),
      "DESCRIPTION:" + icsText((g.arriveBy ? "Be there by " + g.arriveBy + ". " : "") + (g.jersey || "")),
      "END:VEVENT", "END:VCALENDAR"
    ];

    var blob = new Blob([lines.join("\r\n")], { type: "text/calendar" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "elevate-" + t.id.toLowerCase() + "-next-game.ics";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function icsText(s) {
    return String(s || "").replace(/([,;\\])/g, "\\$1").replace(/\r?\n/g, "\\n");
  }

  /* ---------- motion ---------- */

  function markShown(nodes) {
    Array.prototype.forEach.call(nodes, function (n) {
      n.classList.add("rv", "in");
      n.style.transitionDelay = "";
    });
  }

  function reveal(nodes, step, cls) {
    cls = cls || "rv";
    Array.prototype.forEach.call(nodes, function (n, i) {
      n.classList.add(cls);
      if (REDUCED) { n.classList.add("in"); return; }
      n.style.transitionDelay = (i * (step || 0)) + "ms";
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { n.classList.add("in"); });
      });
    });
  }

  /* Stagger is computed per entering batch, at intersection time. Deriving it
     from document index (as this used to) left the fourth pillar carrying a
     270ms delay forever, even when it scrolled into view alone. */
  var io = new IntersectionObserver(function (entries) {
    entries
      .filter(function (e) { return e.isIntersecting; })
      .sort(function (a, b) { return a.boundingClientRect.top - b.boundingClientRect.top; })
      .forEach(function (e, i) {
        var n = e.target;
        n.style.transitionDelay = Math.min(i * 34, 170) + "ms";
        n.classList.add("in");
        n.addEventListener("transitionend", function () { n.style.transitionDelay = ""; }, { once: true });
        io.unobserve(n);
      });
  }, { threshold: 0.12, rootMargin: "0px 0px -70px 0px" });

  function watch(selector) {
    document.querySelectorAll(selector).forEach(function (node) {
      if (node.classList.contains("in")) return;
      /* Anything already on screen at load is shown outright — hiding it just
         to fade it back in is work nobody sees. */
      var box = node.getBoundingClientRect();
      if (REDUCED || box.top < window.innerHeight) { node.classList.add("rv", "in"); return; }
      node.classList.add("rv");
      io.observe(node);
    });
  }

  /* Cubic-out reaches the target at ~94% of the duration. The old expo curve
     hit "4" after 420ms of 1400 and then animated nothing for a second. */
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  function countUp(node) {
    var target = parseFloat(node.getAttribute("data-count"));
    var suffix = node.getAttribute("data-suffix") || "";
    if (REDUCED || isNaN(target)) { node.textContent = target + suffix; return; }
    /* Counting to a single-digit number is theatre. Just print it. */
    if (target < 10) { node.textContent = target + suffix; return; }
    var duration = 760, t0 = null;
    function frame(ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min((ts - t0) / duration, 1);
      node.textContent = Math.round(target * easeOut(p)) + suffix;
      if (p < 1) requestAnimationFrame(frame);
      else node.textContent = target + suffix;
    }
    requestAnimationFrame(frame);
  }

  var countIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      countUp(e.target);
      countIO.unobserve(e.target);
    });
  }, { threshold: 0.6 });

  function observeCounts() {
    document.querySelectorAll("[data-count]").forEach(function (n) { countIO.observe(n); });
  }

  function moveMark(i) {
    var rung = document.querySelectorAll(".rung")[i], mark = el("rmark");
    if (!rung || !mark) return;
    mark.style.top = (rung.offsetTop + rung.offsetHeight / 2) + "px";
    mark.style.opacity = "1";
  }

  /* ---------- team switching ---------- */

  var vt = null;

  function switchTeam(i) {
    if (i === state.current || !state.teams[i]) return;
    var direction = i > state.current ? 1 : -1;
    state.current = i;

    var run = function () { renderTeam(false); checkIn(direction); };

    if (document.startViewTransition && !REDUCED) {
      /* Rapid taps: drop the in-flight transition rather than letting two
         overlap and leave the root snapshot stranded on screen. */
      if (vt && vt.skipTransition) vt.skipTransition();
      document.documentElement.classList.add("switching");
      vt = document.startViewTransition(run);
      vt.finished.catch(function () {}).then(function () {
        document.documentElement.classList.remove("switching");
        vt = null;
      });
    } else {
      run();
    }

    var chip = document.querySelectorAll(".mrail button")[i];
    if (chip && chip.scrollIntoView) {
      chip.scrollIntoView({ behavior: REDUCED ? "auto" : "smooth", inline: "center", block: "nearest" });
    }

    /* The next ambient shots are the new team's shooting percentage. */
    if (window.ArcSpine && !REDUCED) setTimeout(function () { window.ArcSpine.shoot(); }, 520);

    var t = state.teams[i];
    announce(t.name + ", " + ((t.roster || []).length) + " players");
  }

  /* ---------- boot ---------- */


  function holdFonts() {
    var root = document.documentElement;
    root.classList.add("fonts-loading");
    var clear = function () { root.classList.remove("fonts-loading"); };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(clear);
    setTimeout(clear, 1600);
  }

  function trackNav() {
    var nav = document.querySelector(".nav"), ticking = false;
    window.addEventListener("scroll", function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        nav.classList.toggle("tight", window.scrollY > 140);
        ticking = false;
      });
    }, { passive: true });
  }

  /* The one photograph on the page drifts as you pass it, so it has
     depth instead of sitting flat in the scroll. */
  function trackPlate() {
    var plate = el("plate"), media = el("plateMedia");
    if (!plate || !media || REDUCED) return;
    var pending = false;
    window.addEventListener("scroll", function () {
      if (pending) return;
      pending = true;
      requestAnimationFrame(function () {
        pending = false;
        var box = plate.getBoundingClientRect();
        if (box.bottom < 0 || box.top > window.innerHeight) return;
        var seen = 1 - (box.top + box.height) / (window.innerHeight + box.height);
        media.style.transform = "translate3d(0," + ((seen - 0.5) * 46).toFixed(1) + "px,0) scale(1.14)";
      });
    }, { passive: true });
  }

  function trackPointerGlow() {
    if (REDUCED || !window.matchMedia("(hover:hover)").matches) return;
    var pending = null;
    document.addEventListener("pointermove", function (e) {
      var card = e.target.closest && e.target.closest(".pillar");
      if (!card || pending) return;
      pending = requestAnimationFrame(function () {
        var r = card.getBoundingClientRect();
        card.style.setProperty("--mx", (e.clientX - r.left) + "px");
        card.style.setProperty("--my", (e.clientY - r.top) + "px");
        pending = null;
      });
    }, { passive: true });
  }

  /* Pull live content, then redraw. Any failure leaves the seed content
     on screen — a parent checking the schedule should never see a blank
     page because the database had a bad minute. */
  function loadLive() {
    if (!Backend.configured) return Promise.resolve(false);
    return Backend.loadContent().then(function (data) {
      if (data.teams && data.teams.length) {
        var keep = state.teams[state.current] && state.teams[state.current].id;
        state.teams = data.teams;
        var found = state.teams.findIndex(function (t) { return t.id === keep; });
        state.current = found >= 0 ? found : Math.min(state.current, state.teams.length - 1);
      }
      if (data.site) state.site = Object.assign({}, SEED_SITE, data.site);
      state.siteUpdatedAt = data.siteUpdatedAt;
      state.live = true;
      render(false);
      return true;
    }).catch(function (err) {
      console.warn("Live content unavailable, showing the copy built into the page.", err);
      return false;
    });
  }

  function start() {
    /* Default to the team most people come for, if it is still there. */
    var preferred = state.teams.findIndex(function (t) { return t.id === "7th"; });
    state.current = preferred >= 0 ? preferred : 0;

    holdFonts();
    render(false);

    reveal([el("eyebrowLine"), el("teamTitle")].filter(Boolean), 90);
    reveal(document.querySelectorAll(".claim"), 0);
    reveal(document.querySelectorAll(".cutline"), 0, "draw");
    reveal(document.querySelectorAll(".subline"), 110);

    watch(".alert", 70);
    watch(".game", 0);
    watch(".sec-head", 0);
    watch(".pillar", 90);
    watch(".proof-i", 90);
    watch(".proof-list", 0);
    watch(".two", 0);
    watch(".formwrap", 0);

    trackNav();
    trackPointerGlow();
    trackPlate();
    moveMark(state.current);

    setInterval(tick, 1000);
    window.addEventListener("resize", function () { moveMark(state.current); }, { passive: true });

    var calendar = el("gCalendar");
    if (calendar) {
      calendar.addEventListener("click", function (e) { e.preventDefault(); downloadInvite(); });
    }

    loadLive();
  }

  return {
    state: state,
    reduced: REDUCED,
    announce: announce,
    esc: esc,
    render: render,
    renderTeam: renderTeam,
    renderSite: renderSite,
    buildRungs: buildRungs,
    switchTeam: switchTeam,
    loadLive: loadLive,
    start: start,
    watch: watch,
    parseLocal: parseLocal,
    shortDate: shortDate
  };
})();

Site.start();
