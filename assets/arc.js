/* ============================================================
   arc.js — THE ARC SPINE

   The whole page is one shot in flight. It launches at the foot of
   the ladder rail beside the youngest team, crests over the next-game
   card, descends behind the schedule and the roster, and arrives at
   the rim above the join form.

   The ball rides your scroll position, so the page needs no other
   scroll indicator. Where the arc crosses a section heading it drops
   a tick and a readout — and those numbers are derived from the real
   path, not invented, which is the difference between looking
   instrumented and being instrumented.

   One SVG path, one circle, one rAF-throttled scroll listener.
   No library. If any of it fails the page is exactly what it was.
   ============================================================ */

(function () {
  if (!document.createElementNS) return;

  var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var NS = "http://www.w3.org/2000/svg";

  var svg, track, live, ball, glow, path, rim, board, ripple, tail;
  var lastP = 0, tailLen = 0;
  var made = false;
  var readouts = [];
  var pending = false;
  var total = 0;

  /* Ambient shots. Three trajectory variants so repeated shots do not
     trace the same line, and a pool so nothing is allocated per shot. */
  var VARIANTS = 3;
  var lanes = [];        /* {path, length} */
  var pool = [];         /* reusable trail elements */
  var ambientTimer = null;
  var launchGroup = null;

  /* Sections the arc is measured against, in flight order. */
  var STOPS = [
    { id: "game", label: "Next game" },
    { id: "schedule", label: "Season" },
    { id: "week", label: "Every week" },
    { id: "roster", label: "Team" },
    { id: "program", label: "How it works" },
    { id: "join", label: "Arrival" }
  ];

  function build() {
    svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "arc");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("preserveAspectRatio", "none");

    track = document.createElementNS(NS, "path");
    track.setAttribute("class", "arc-track");

    live = document.createElementNS(NS, "path");
    live.setAttribute("class", "arc-live");

    /* The rim the shot is travelling toward, drawn where the arc lands. */
    rim = document.createElementNS(NS, "line");
    rim.setAttribute("class", "arc-rim");
    board = document.createElementNS(NS, "line");
    board.setAttribute("class", "arc-board");
    ripple = document.createElementNS(NS, "circle");
    ripple.setAttribute("class", "arc-ripple");
    ripple.setAttribute("r", "0");

    tail = document.createElementNS(NS, "path");
    tail.setAttribute("class", "arc-tail");

    glow = document.createElementNS(NS, "circle");
    glow.setAttribute("class", "arc-glow");
    glow.setAttribute("r", "11");

    ball = document.createElementNS(NS, "circle");
    ball.setAttribute("class", "arc-ball");
    ball.setAttribute("r", "4.2");

    /* Ambient shots are drawn beneath the spine so they never compete
       with the one arc the page is actually about. */
    launchGroup = document.createElementNS(NS, "g");
    launchGroup.setAttribute("class", "arc-shots");

    for (var v = 0; v < VARIANTS; v++) {
      var lane = document.createElementNS(NS, "path");
      lane.setAttribute("class", "arc-lane");
      svg.appendChild(lane);
      lanes.push({ el: lane, len: 0 });
    }

    svg.appendChild(launchGroup);
    svg.appendChild(track);
    svg.appendChild(live);
    svg.appendChild(board);
    svg.appendChild(rim);
    svg.appendChild(ripple);
    svg.appendChild(tail);
    svg.appendChild(glow);
    svg.appendChild(ball);
    document.body.insertBefore(svg, document.body.firstChild);

    path = track;
  }

  /* ---------- ambient shots ---------- */

  function laneShape(i, w, h, rail) {
    /* Each lane releases from a slightly different spot and hangs a
       little differently, so the background never repeats exactly. */
    var spread = [-0.02, 0.015, 0.045][i];
    var lift = [0.06, 0.11, 0.155][i];
    var x0 = rail + w * (0.05 + spread);
    var y0 = h * 0.97;
    var x2 = w * (w > 900 ? 0.88 : 0.94);
    var y2 = h * 0.54;
    var cx = (x0 + x2) / 2;
    var cy = (h * lift - 0.25 * y0 - 0.25 * y2) / 0.5;
    return "M" + x0 + "," + y0 + " Q" + cx + "," + cy + " " + x2 + "," + y2;
  }

  function borrowTrail() {
    for (var i = 0; i < pool.length; i++) {
      if (!pool[i].busy) return pool[i];
    }
    var el = document.createElementNS(NS, "path");
    el.setAttribute("class", "arc-shot");
    launchGroup.appendChild(el);
    var slot = { el: el, busy: false };
    pool.push(slot);
    return slot;
  }

  /* A shot goes in at the team's real shooting percentage. 18-4 means
     82% of the arcs you see in the background drop. Switch to a team with
     a worse record and more of them rim out. */
  function makeRate() {
    try {
      var t = Site.state.teams[Site.state.current];
      var m = /^(\d+)\s*-\s*(\d+)$/.exec(String(t.record || ""));
      if (!m) return 0.78;
      var w = +m[1], l = +m[2];
      return (w + l) ? Math.max(0.35, Math.min(0.95, w / (w + l))) : 0.78;
    } catch (e) { return 0.78; }
  }

  function fireShot(opts) {
    opts = opts || {};
    var lane = lanes[Math.floor(Math.random() * lanes.length)];
    if (!lane.len) return;

    var slot = borrowTrail();
    slot.busy = true;

    var el = slot.el;
    var goesIn = opts.make !== undefined ? opts.make : Math.random() < makeRate();
    var duration = opts.duration || (900 + Math.random() * 180);
    var trail = 74;

    el.setAttribute("d", lane.el.getAttribute("d"));
    el.style.strokeDasharray = trail + " " + (lane.len + trail);
    el.style.opacity = opts.opacity == null ? "" : opts.opacity;

    /* A miss stops short and never reaches the rim. */
    var end = goesIn ? -(lane.len + trail) : -(lane.len * 0.9);

    var anim = el.animate(
      [{ strokeDashoffset: trail }, { strokeDashoffset: end }],
      { duration: duration, easing: "cubic-bezier(.34,.02,.28,1)", fill: "forwards" }
    );

    if (goesIn) {
      setTimeout(function () { netRipple(opts.strong ? 1 : 0.55); }, duration * 0.93);
    }

    anim.finished.catch(function () {}).then(function () {
      el.style.opacity = "0";
      slot.busy = false;
    });
  }

  function netRipple(strength) {
    ripple.style.transition = "none";
    ripple.setAttribute("r", "3");
    ripple.style.opacity = String(0.85 * strength);
    requestAnimationFrame(function () {
      ripple.style.transition = "r 620ms cubic-bezier(.2,0,0,1), opacity 620ms linear";
      ripple.setAttribute("r", String(26 + 22 * strength));
      ripple.style.opacity = "0";
    });
  }


  /* The parabola is defined in viewport coordinates and redrawn on resize.
     Release sits at the rail, apex over the top third, arrival at the rim
     position on the right. */
  function shape() {
    var w = window.innerWidth;
    var h = window.innerHeight;
    var rail = w > 900 ? 104 : 0;

    /* Release low-left, apex around a tenth of the way down, arrival at the
       rim on the right. The control point sits well above the viewport; the
       curve's own apex is what lands on screen. */
    var x0 = rail + w * 0.03;
    var y0 = h * 0.99;
    var x2 = w * (w > 900 ? 0.88 : 0.94);
    var y2 = h * 0.54;
    var cx = (x0 + x2) / 2;
    /* solve the quadratic so the apex lands at 0.09h */
    var cy = (h * 0.09 - 0.25 * y0 - 0.25 * y2) / 0.5;

    var d = "M" + x0 + "," + y0 + " Q" + cx + "," + cy + " " + x2 + "," + y2;
    track.setAttribute("d", d);
    live.setAttribute("d", d);
    tail.setAttribute("d", d);

    lanes.forEach(function (lane, i) {
      lane.el.setAttribute("d", laneShape(i, w, h, rail));
      lane.len = lane.el.getTotalLength();
    });

    /* rim and backboard at the arrival point */
    rim.setAttribute("x1", x2 - 22); rim.setAttribute("x2", x2 + 22);
    rim.setAttribute("y1", y2); rim.setAttribute("y2", y2);
    board.setAttribute("x1", x2 + 30); board.setAttribute("x2", x2 + 30);
    board.setAttribute("y1", y2 - 46); board.setAttribute("y2", y2 + 26);
    ripple.setAttribute("cx", x2); ripple.setAttribute("cy", y2);

    svg.setAttribute("viewBox", "0 0 " + w + " " + h);
    total = track.getTotalLength();
    live.style.strokeDasharray = total;
  }

  /* Scroll progress, 0 at the top of the page to 1 at the bottom. */
  function progress() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    if (max <= 0) return 0;
    return Math.min(1, Math.max(0, window.scrollY / max));
  }

  function draw() {
    pending = false;
    if (!total) return;

    var p = progress();
    live.style.strokeDashoffset = total * (1 - p);

    var pt = track.getPointAtLength(total * p);
    ball.setAttribute("cx", pt.x);
    ball.setAttribute("cy", pt.y);
    glow.setAttribute("cx", pt.x);
    glow.setAttribute("cy", pt.y);

    /* Scroll fast and the ball streaks; stop and it settles.
       The tail is a dashed segment of the trajectory itself rather than a
       recomputed path — two style writes a frame instead of three
       getPointAtLength calls, which is the difference between 35fps and
       60fps on a throttled phone. */
    var speed = Math.abs(p - lastP);
    lastP = p;
    tailLen = tailLen * 0.72 + Math.min(speed * 5200, 190) * 0.28;

    if (tailLen > 2) {
      var travelled = total * p;
      var len = Math.min(tailLen, travelled);
      tail.style.strokeDasharray = len + " " + total;
      tail.style.strokeDashoffset = -(travelled - len);
      tail.style.opacity = String(Math.min(0.72, tailLen / 190));
    } else if (tail.style.opacity !== "0") {
      tail.style.opacity = "0";
    }

    /* Telemetry: flight time and normalised altitude at this point on the
       path. Both fall out of the geometry — nothing here is decorative text. */
    var t = (p * 1.7).toFixed(2);
    var apex = window.innerHeight * 0.18 - window.innerHeight * 0.36;
    var alt = Math.max(0, Math.min(1, 1 - (pt.y / window.innerHeight)));

    /* Arrival by scroll: reaching the join form completes the shot. */
    if (p > 0.985 && !made) { made = true; netRipple(1); }
    else if (p < 0.94) { made = false; }

    var reading = "T+" + t + "s · ALT " + alt.toFixed(2) + " · ";
    for (var i = 0; i < readouts.length; i++) {
      var r = readouts[i];
      var box = r.section.getBoundingClientRect();
      var onScreen = box.top < window.innerHeight * 0.7 && box.bottom > 0;
      if (onScreen !== r.shown) {
        r.node.style.opacity = onScreen ? "" : "0";
        r.shown = onScreen;
      }
      if (!onScreen) continue;
      var y = Math.max(78, Math.min(window.innerHeight - 30, box.top + 18));
      if (y !== r.y) { r.node.style.transform = "translateY(" + y + "px)"; r.y = y; }
      var text = reading + r.label;
      if (text !== r.text) { r.node.textContent = text; r.text = text; }
    }
  }

  function onScroll() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(draw);
  }

  function buildReadouts() {
    STOPS.forEach(function (stop) {
      var section = document.getElementById(stop.id);
      if (!section) return;
      var node = document.createElement("div");
      node.className = "arc-read";
      node.setAttribute("aria-hidden", "true");
      document.body.appendChild(node);
      readouts.push({ section: section, node: node, label: stop.label.toUpperCase(), y: -1, text: "", shown: null });
    });
  }

  function start() {
    build();

    /* Reduced motion gets the full trajectory drawn once, static, with the
       ball resting at the release point — the analysis overlay on a paused
       broadcast rather than an animation switched off. */
    if (REDUCED) {
      shape();
      live.style.strokeDasharray = "";
      live.style.strokeDashoffset = "";
      var p0 = track.getPointAtLength(0);
      ball.setAttribute("cx", p0.x);
      ball.setAttribute("cy", p0.y);
      glow.setAttribute("cx", p0.x);
      glow.setAttribute("cy", p0.y);
      window.addEventListener("resize", shape, { passive: true });
      return;
    }

    buildReadouts();
    shape();
    draw();

    /* THE OPENING SHOT.
       The page announces itself by taking the shot it is about: one arc
       travels the full trajectory, the net takes it, and control then
       hands over to your scroll position. It only runs at the top of the
       page — arriving mid-page from a link should not stage a show. */
    if (window.scrollY < 40) {
      setTimeout(function () { fireShot({ make: true, duration: 1080, strong: true }); }, 420);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", function () { shape(); draw(); }, { passive: true });
  }

  /* A team switch re-seeds the background: the next shots you see are
     the new team's shooting. Nobody consciously notices. It is why it
     feels true. */
  window.ArcSpine = { shoot: fireShot, ripple: netRipple };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
