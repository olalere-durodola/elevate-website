/* ============================================================
   shots.js — the gym in the background.

   Shots fly continuously and land on the SAME rim the arc spine
   arrives at, so the page reads as one hoop being shot at rather
   than two unrelated animations. The spine is your shot, tracked
   by scroll; these are everyone else's, all night.

   Canvas rather than SVG on purpose: dozens of short-lived trails,
   droplets and ticks are what canvas is cheap at and what the DOM
   is expensive at.

   Improvements on the original hero animation:
     - real flight time (~1s, not 2.9s)
     - shots miss, at the team's actual record
     - trails batch into 8 strokes instead of 26 per shot
   ============================================================ */

(function () {
  var cv = document.createElement("canvas");
  cv.className = "shotfx";
  cv.setAttribute("aria-hidden", "true");

  var ctx = cv.getContext && cv.getContext("2d");
  if (!ctx) return;

  var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var PINK = "248,10,144", BLUE = "144,187,232";

  var W = 0, H = 0, dpr = 1, rail = 0;
  var running = false, raf = null, last = 0, spawnAt = 0;
  var shots = [], drops = [], ticks = [];

  var host = document.querySelector(".head");
  if (!host) return;
  host.insertBefore(cv, host.firstChild);

  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = cv.clientWidth;
    H = cv.clientHeight;
    cv.width = W * dpr;
    cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    narrow = window.innerWidth <= 900;
    aim();
  }

  /* The canvas hoop is the arc spine's rim, converted into canvas space,
     so every shot on the page is aimed at one hoop rather than two that
     happen to sit near each other. Recomputed on scroll and resize, not
     per frame — one layout read either way, but 60x fewer of them. */
  var hoopX = 0, hoopY = 0;
  function aim() {
    var box = cv.getBoundingClientRect();
    var vw = window.innerWidth, vh = window.innerHeight;
    hoopX = vw * (vw > 900 ? 0.88 : 0.94) - box.left;
    hoopY = vh * 0.54 - box.top;
  }

  /* Same coordinates the arc spine uses, so every shot on the page is
     aimed at one hoop. */
  function hoop() { return { x: hoopX, y: hoopY }; }

  /* Shots fade out over the left of the hero, where the headline is, and
     stay full strength in the open space on the right. On a phone the
     column is the whole width, so it fades toward the top instead. */
  var narrow = false;
  function edge(x, y) {
    return narrow
      ? Math.min(1, Math.max(0, (y - H * 0.12) / (H * 0.34)))
      : Math.min(1, Math.max(0, (x - W * 0.04) / (W * 0.34)));
  }

  function makeRate() {
    try {
      var t = Site.state.teams[Site.state.current];
      var m = /^(\d+)\s*-\s*(\d+)$/.exec(String(t.record || ""));
      if (!m) return 0.78;
      var w = +m[1], l = +m[2];
      return (w + l) ? Math.max(0.35, Math.min(0.95, w / (w + l))) : 0.78;
    } catch (e) { return 0.78; }
  }

  function addShot() {
    if (shots.length >= 4) return;
    var H0 = hoop();
    var made = Math.random() < makeRate();
    var lift = 0.34 + Math.random() * 0.26;

    shots.push({
      t: 0,
      /* ~0.9-1.1s of flight. The original took up to 2.9s, which read as
         a drifting particle rather than a jump shot. */
      speed: 0.92 + Math.random() * 0.2,
      p0: { x: W * (0.02 + Math.random() * 0.12), y: H * (0.92 + Math.random() * 0.1) },
      p1: { x: (W * 0.08 + H0.x) / 2, y: H0.y - H * lift },
      p2: made ? H0 : { x: H0.x - 12 - Math.random() * 26, y: H0.y - 6 },
      made: made,
      done: false
    });
  }

  function bez(t, p0, p1, p2) {
    var u = 1 - t;
    return {
      x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
      y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y
    };
  }

  /* The net taking it: a handful of droplets falling under gravity. */
  function addDrops(at) {
    for (var i = 0; i < 9; i++) {
      drops.push({
        x: at.x - 15 + Math.random() * 30,
        y: at.y + 3,
        vy: 24 + Math.random() * 44,
        life: 1
      });
    }
    if (window.ArcSpine && window.ArcSpine.ripple) window.ArcSpine.ripple(0.5);
  }

  /* A missed shot drops off the rim instead of vanishing. */
  function addBrick(at) {
    drops.push({ x: at.x, y: at.y, vy: -30, life: 1.3, brick: true });
  }

  function addTick() {
    ticks.push({ y: H + 8, life: 1, w: 18 + Math.random() * 64 });
  }

  function frame(ts) {
    if (!running) return;
    var dt = Math.min((ts - last) / 1000, 0.05);
    last = ts;
    ctx.clearRect(0, 0, W, H);

    /* rising altitude ticks along the rail */
    if (Math.random() < 0.03) addTick();
    for (var i = ticks.length - 1; i >= 0; i--) {
      var k = ticks[i];
      k.y -= dt * 24;
      k.life -= dt * 0.22;
      if (k.life <= 0 || k.y < -10) { ticks.splice(i, 1); continue; }
      ctx.strokeStyle = "rgba(" + BLUE + "," + (k.life * 0.14 * edge(W * 0.03, k.y)) + ")";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(W * 0.03, k.y);
      ctx.lineTo(W * 0.03 + k.w, k.y);
      ctx.stroke();
    }

    /* net droplets */
    for (var d = drops.length - 1; d >= 0; d--) {
      var o = drops[d];
      o.y += o.vy * dt;
      o.vy += 150 * dt;
      o.life -= dt * 1.4;
      if (o.life <= 0) { drops.splice(d, 1); continue; }
      ctx.strokeStyle = "rgba(" + (o.brick ? BLUE : PINK) + "," + (o.life * 0.6 * edge(o.x, o.y)) + ")";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(o.x, o.y);
      ctx.lineTo(o.x, o.y + 6);
      ctx.stroke();
    }

    if (ts > spawnAt) { addShot(); spawnAt = ts + 850 + Math.random() * 850; }

    /* shots. The trail batches into 8 alpha buckets rather than stroking
       every segment separately — same look, a fifth of the draw calls. */
    var BUCKETS = 8;
    for (var s = shots.length - 1; s >= 0; s--) {
      var sh = shots[s];
      sh.t += dt * sh.speed;

      if (sh.t >= 1 && !sh.done) {
        sh.done = true;
        sh.made ? addDrops(sh.p2) : addBrick(sh.p2);
      }
      if (sh.t > 1.45) { shots.splice(s, 1); continue; }

      var head = Math.min(sh.t, 1);
      var tail = Math.max(0, head - 0.4);
      var fade = sh.t > 1 ? Math.max(0, 1 - (sh.t - 1) * 2.4) : 1;

      for (var b = 0; b < BUCKETS; b++) {
        var t0 = tail + (head - tail) * (b / BUCKETS);
        var t1 = tail + (head - tail) * ((b + 1) / BUCKETS);
        var a = bez(t0, sh.p0, sh.p1, sh.p2);
        var c = bez(t1, sh.p0, sh.p1, sh.p2);
        ctx.strokeStyle = "rgba(" + PINK + "," + ((b / BUCKETS) * 0.62 * fade * edge(a.x, a.y)) + ")";
        ctx.lineWidth = 1 + (b / BUCKETS) * 1.5;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(c.x, c.y);
        ctx.stroke();
      }

      if (sh.t <= 1) {
        var pt = bez(head, sh.p0, sh.p1, sh.p2);
        var e = edge(pt.x, pt.y);
        ctx.fillStyle = "rgba(" + PINK + "," + (0.14 * e) + ")";
        ctx.beginPath(); ctx.arc(pt.x, pt.y, 9, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(" + PINK + "," + (fade * e) + ")";
        ctx.beginPath(); ctx.arc(pt.x, pt.y, 3.6, 0, Math.PI * 2); ctx.fill();
      }
    }

    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (running || REDUCED) return;
    running = true;
    last = performance.now();
    spawnAt = last + 300;
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = null;
  }

  size();
  if (REDUCED) return;   /* the spine draws a static trajectory instead */

  window.addEventListener("resize", size, { passive: true });
  document.addEventListener("visibilitychange", function () {
    document.hidden ? stop() : start();
  });

  start();

  window.addEventListener("scroll", function () {
    aim();
    var near = window.scrollY < window.innerHeight * 0.9;
    if (near && !running && !document.hidden) start();
    else if (!near && running) { stop(); ctx.clearRect(0, 0, W, H); }
  }, { passive: true });

  window.ShotFX = { start: start, stop: stop };
})();
