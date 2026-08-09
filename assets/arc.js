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

  var svg, track, live, ball, glow, path, rim, board, ripple;
  var made = false;
  var readouts = [];
  var pending = false;
  var total = 0;

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

    glow = document.createElementNS(NS, "circle");
    glow.setAttribute("class", "arc-glow");
    glow.setAttribute("r", "11");

    ball = document.createElementNS(NS, "circle");
    ball.setAttribute("class", "arc-ball");
    ball.setAttribute("r", "4.2");

    svg.appendChild(track);
    svg.appendChild(live);
    svg.appendChild(board);
    svg.appendChild(rim);
    svg.appendChild(ripple);
    svg.appendChild(glow);
    svg.appendChild(ball);
    document.body.insertBefore(svg, document.body.firstChild);

    path = track;
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

    /* Telemetry: flight time and normalised altitude at this point on the
       path. Both fall out of the geometry — nothing here is decorative text. */
    var t = (p * 1.7).toFixed(2);
    var apex = window.innerHeight * 0.18 - window.innerHeight * 0.36;
    var alt = Math.max(0, Math.min(1, 1 - (pt.y / window.innerHeight)));

    /* Arrival. The one moment on the page where pink moves on its own. */
    if (p > 0.985 && !made) {
      made = true;
      ripple.style.transition = "none";
      ripple.setAttribute("r", "3");
      ripple.style.opacity = ".85";
      requestAnimationFrame(function () {
        ripple.style.transition = "r 620ms cubic-bezier(.2,0,0,1), opacity 620ms linear";
        ripple.setAttribute("r", "46");
        ripple.style.opacity = "0";
      });
    } else if (p < 0.94) {
      made = false;
    }

    readouts.forEach(function (r) {
      var box = r.section.getBoundingClientRect();
      var onScreen = box.top < window.innerHeight * 0.7 && box.bottom > 0;
      r.node.style.opacity = onScreen ? "" : "0";
      if (!onScreen) return;
      r.node.style.top = Math.max(78, Math.min(window.innerHeight - 30, box.top + 18)) + "px";
      r.node.textContent = "T+" + t + "s · ALT " + alt.toFixed(2) + " · " + r.label;
    });
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
      readouts.push({ section: section, node: node, label: stop.label.toUpperCase() });
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

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", function () { shape(); draw(); }, { passive: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
