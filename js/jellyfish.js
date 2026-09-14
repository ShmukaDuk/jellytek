// jellytek — a small school of jellyfish, dependency-free canvas 2D.
// Verlet-integrated tentacles, pulsing bells, pointer steering, poke physics.
//
// Lit for the dark site: bells and tentacles are drawn additively ("lighter"),
// so they read as bioluminescence against the deep indigo ground rather than as
// ink on paper. Every colour comes from PALETTE below — if the site ever goes
// light again, that object and the composite mode are the two things to flip.
// The canvas is fixed to the whole viewport and sits behind every section, so
// the school roams the entire page. It takes no pointer events of its own —
// window-level listeners feed it instead, so a jelly drifting over a button
// never swallows the click. It pauses in a background tab and renders a single
// frame under prefers-reduced-motion.
"use strict";

const canvas = document.getElementById("sea");
const ctx = canvas && canvas.getContext("2d", { alpha: true });
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ── palette ──────────────────────────────────────────────────────────────
   Every colour the renderer can produce, in one place. Tuned for the deep
   indigo ground: high lightness, drawn additively so overlaps brighten. */
const PALETTE = {
  bellCore:    (h, a) => `hsla(${h}, 95%, 78%, ${a})`,
  bellMid:     (h, a) => `hsla(${h + 25}, 85%, 66%, ${a})`,
  bellEdge:    (h, a) => `hsla(${h + 50}, 80%, 60%, ${a})`,
  rim:         (h, a) => `hsla(${h}, 100%, 78%, ${a})`,
  organ:       (h, a) => `hsla(${h + 60}, 85%, 76%, ${a})`,
  tentacle:    (h, a) => `hsla(${h + 20}, 88%, 72%, ${a})`,
  tentacleHalo:(h, a) => `hsla(${h}, 92%, 70%, ${a})`,
  oral:        (h, a) => `hsla(${h + 40}, 75%, 76%, ${a})`,
  spark:       (h, a) => `hsla(${h}, 95%, 75%, ${a})`,
  ripple:      (a)    => `hsla(175, 90%, 70%, ${a})`,
  name:        (h, a) => `hsla(${h}, 85%, 80%, ${a})`,
};

/* Camera zoom, driven by the viewfinder's zoom slider in site.js. `zoom` is
   the target the control writes; `cur` eases toward it so a drag reads as a
   lens moving rather than a jump. */
window.JT_CAM = window.JT_CAM || { zoom: 1, cur: 1 };

let W = 0, H = 0, DPR = 1;

function resize() {
  if (!canvas) return;
  const r = canvas.getBoundingClientRect();
  DPR = Math.min(window.devicePixelRatio || 1, 1.5);
  W = Math.max(1, Math.round(r.width));
  H = Math.max(1, Math.round(r.height));
  canvas.width = Math.round(W * DPR);
  canvas.height = Math.round(H * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}

/* ── pointer (canvas-local coordinates) ───────────────────────────────── */
const pointer = { x: null, y: null, activeUntil: 0 };

function localPoint(e) {
  const r = canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

/* ── the school ───────────────────────────────────────────────────────── */
const TENTACLES = 11;
const SEGS = 14;
const ORAL_ARMS = 4;
const ORAL_SEGS = 9;

function makeRope(segments, segLen, x, y) {
  const pts = [];
  for (let i = 0; i <= segments; i++) {
    pts.push({ x, y: y + i * segLen, px: x, py: y + i * segLen });
  }
  return { pts, segLen };
}

function makeJelly(name, hue, fx, fy, scale, seed) {
  return {
    name, hue, scale, seed,
    fullScale: scale,          // rebirth shrinks scale; it grows back to this
    clickTimes: [],
    fx, fy,                    // resting position as a fraction of the canvas
    x: 0, y: 0,
    vx: 0, vy: 0,
    phase: seed * 2.1,
    phaseSpeed: 1.4,
    tilt: 0,
    tentacles: [],
    oralArms: [],
  };
}

// named for the team — nothing on the page says so
const jellies = [
  makeJelly("james",  145, 0.22, 0.32, 0.78, 0.7),   // green
  makeJelly("tess",   330, 0.54, 0.62, 0.78, 2.9),   // pink
  makeJelly("johnny", 215, 0.80, 0.28, 0.78, 5.3),   // blue
];

const bellRadius = (j) => Math.min(W, H) * 0.105 * j.scale * window.JT_CAM.cur;

const tentacleLenF = (along) => 0.55 + 0.5 * Math.sin(along * Math.PI);

function rebuildJellyRopes(j) {
  const R = bellRadius(j);
  j.tentacles = Array.from({ length: TENTACLES }, (_, i) =>
    makeRope(SEGS, R * 0.24 * tentacleLenF(i / (TENTACLES - 1)), j.x, j.y));
  j.oralArms = Array.from({ length: ORAL_ARMS }, () =>
    makeRope(ORAL_SEGS, R * 0.17, j.x, j.y));
}

function placeJellies() {
  for (const j of jellies) {
    j.x = W * j.fx;
    j.y = H * j.fy;
    rebuildJellyRopes(j);
  }
}

function nearestJelly(x, y) {
  let best = jellies[0], bestD = Infinity;
  for (const j of jellies) {
    const d = Math.hypot(j.x - x, j.y - y);
    if (d < bestD) { bestD = d; best = j; }
  }
  return best;
}

/* ── rope physics ─────────────────────────────────────────────────────── */
function simulateRope(rope, anchorX, anchorY, t, idx, sway, flare = 0) {
  const pts = rope.pts;
  pts[0].x = anchorX;
  pts[0].y = anchorY;

  for (let i = 1; i < pts.length; i++) {
    const p = pts[i];
    const vx = (p.x - p.px) * 0.92;   // heavy water drag — hang, don't streak
    const vy = (p.y - p.py) * 0.92;
    p.px = p.x;
    p.py = p.y;
    const along = i / pts.length;
    const wave =
      Math.sin(t * 1.1 + idx * 1.7 + i * 0.35) +
      0.5 * Math.sin(t * 2.3 + idx * 2.9 + i * 0.5);
    p.x += vx + wave * sway * (0.25 + 0.75 * along) + flare * along;
    p.y += vy + 0.09;                 // buoyant-drag settle
  }

  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.hypot(dx, dy) || 1e-6;
      const diff = (dist - rope.segLen) / dist;
      const ax = dx * 0.5 * diff, ay = dy * 0.5 * diff;
      if (i === 0) { b.x -= dx * diff; b.y -= dy * diff; }
      else { a.x += ax; a.y += ay; b.x -= ax; b.y -= ay; }
    }
  }
}

function tracePath(pts, a, b) {
  ctx.beginPath();
  ctx.moveTo(pts[a].x, pts[a].y);
  for (let i = a + 1; i < b; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2;
    const my = (pts[i].y + pts[i + 1].y) / 2;
    ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
  }
}

// A soft wide pass under a finer core, stroked in three width steps so the
// rope tapers from base to tip. canvas shadowBlur is far too slow for this.
function drawRope(rope, width, color, halo) {
  const pts = rope.pts;
  const n = pts.length;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  tracePath(pts, 0, n - 1);
  ctx.strokeStyle = halo;
  ctx.globalAlpha = 0.09;
  ctx.lineWidth = width * 3.2;
  ctx.stroke();

  ctx.strokeStyle = color;
  const steps = [
    [0, Math.floor(n * 0.45), 1, 0.40],
    [Math.floor(n * 0.45), Math.floor(n * 0.75), 0.55, 0.28],
    [Math.floor(n * 0.75), n - 1, 0.3, 0.18],
  ];
  for (const [a, b, wf, alpha] of steps) {
    tracePath(pts, a, b);
    ctx.globalAlpha = alpha;
    ctx.lineWidth = Math.max(0.5, width * wf);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/* ── ripples + the poke-five-times burst ──────────────────────────────── */
const ripples = [];
const sparks = [];

function explode(j) {
  const R = bellRadius(j);
  for (let i = 0; i < 60; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 40 + Math.random() * 260;
    sparks.push({
      x: j.x, y: j.y - R * 0.5,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 30,
      life: 0.8 + Math.random() * 0.9,
      age: 0,
      hue: j.hue + Math.random() * 40 - 20,
      r: 1 + Math.random() * 2.5,
    });
  }
  ripples.push({ x: j.x, y: j.y - R * 0.5, r: R * 0.4, alpha: 0.6 });
  j.scale = j.fullScale * 0.28;      // reborn as a baby
  j.vx = 0;
  j.vy = 0;
  j.phaseSpeed = 3.5;                // babies flutter fast, then calm down
  rebuildJellyRopes(j);
}

function drawSparks(dt) {
  for (let i = sparks.length - 1; i >= 0; i--) {
    const s = sparks[i];
    s.age += dt;
    if (s.age >= s.life) { sparks.splice(i, 1); continue; }
    s.vx *= 1 - 1.6 * dt;
    s.vy = s.vy * (1 - 1.6 * dt) - 50 * dt;    // buoyant embers drift upward
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    const a = 1 - s.age / s.life;
    ctx.fillStyle = PALETTE.spark(s.hue, 0.7 * a);
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r * (0.5 + a * 0.8), 0, Math.PI * 2);
    ctx.fill();
  }
}

/* ── per-jelly update + draw ──────────────────────────────────────────── */
function updateJelly(j, t, dt, chaser) {
  const R = bellRadius(j);

  let tx, ty;
  if (chaser === j) {
    tx = pointer.x;
    ty = pointer.y - R * 1.4;         // hover above the cursor, tentacles reach
  } else {
    // a slow lazy orbit around its resting spot
    // a wide, slow wander over the whole viewport
    tx = W * (0.5 + 0.38 * Math.sin(t * (0.055 + j.seed * 0.006) + j.seed));
    ty = H * (0.5 + 0.34 * Math.sin(t * (0.041 + j.seed * 0.007) + j.seed * 2.3));
  }

  // contraction (falling edge of the pulse) provides thrust toward target
  const thrust = Math.max(0, -Math.cos(j.phase)) * 0.016;
  const dx = tx - j.x, dy = ty - j.y;
  const dist = Math.hypot(dx, dy) || 1;
  j.vx += (dx / dist) * thrust * Math.min(dist, 90);
  j.vy += (dy / dist) * thrust * Math.min(dist, 90);

  // personal space — gentle mutual repulsion keeps the school untangled
  for (const other of jellies) {
    if (other === j) continue;
    const rx = j.x - other.x, ry = j.y - other.y;
    const d = Math.hypot(rx, ry) || 1;
    const minD = (bellRadius(j) + bellRadius(other)) * 1.6;
    if (d < minD) {
      j.vx += (rx / d) * (minD - d) * 0.02;
      j.vy += (ry / d) * (minD - d) * 0.02;
    }
  }

  j.vx *= 0.98;
  j.vy *= 0.98;
  j.x += j.vx * dt;
  j.y += j.vy * dt;

  // babies grow slowly back to full size
  if (j.scale < j.fullScale - 0.001) {
    j.scale += (j.fullScale - j.scale) * 0.045 * dt;
  }

  // stay inside the frame
  const pad = R * 0.9;
  if (j.x < pad)      { j.x = pad;      if (j.vx < 0) j.vx *= -0.4; }
  if (j.x > W - pad)  { j.x = W - pad;  if (j.vx > 0) j.vx *= -0.4; }
  if (j.y < pad * 1.4){ j.y = pad * 1.4;if (j.vy < 0) j.vy *= -0.4; }
  if (j.y > H - pad)  { j.y = H - pad;  if (j.vy > 0) j.vy *= -0.4; }

  j.phaseSpeed += (1.4 - j.phaseSpeed) * 0.02;   // recover after startle
  j.phase += j.phaseSpeed * dt;
  j.tilt += (Math.max(-0.5, Math.min(0.5, j.vx * 0.004)) - j.tilt) * 0.05;
}

function drawJelly(j, t, showNames) {
  const R = bellRadius(j);
  const pulse = Math.sin(j.phase);
  const hue = j.hue + 8 * Math.sin(t * 0.3 + j.seed);
  const bw = R * (1 + 0.10 * pulse);
  const bh = R * (1.15 - 0.22 * pulse);

  // tentacles (behind the bell)
  for (let i = 0; i < TENTACLES; i++) {
    const along = i / (TENTACLES - 1);
    j.tentacles[i].segLen = R * 0.24 * tentacleLenF(along);
    const ax = j.x + Math.cos(j.tilt) * (along * 2 - 1) * bw * 0.82;
    const ay = j.y + Math.sin(j.tilt) * (along * 2 - 1) * bw * 0.82 + bh * 0.05;
    simulateRope(j.tentacles[i], ax, ay, t, i + j.seed, 0.55, (along * 2 - 1) * 0.22);
    drawRope(j.tentacles[i], 1.4, PALETTE.tentacle(hue, 1), PALETTE.tentacleHalo(hue, 1));
  }
  for (let i = 0; i < ORAL_ARMS; i++) {
    const ax = j.x + ((i / (ORAL_ARMS - 1)) * 2 - 1) * bw * 0.3;
    j.oralArms[i].segLen = R * 0.17;
    simulateRope(j.oralArms[i], ax, j.y + bh * 0.1, t, i + 20 + j.seed, 0.6,
      ((i / (ORAL_ARMS - 1)) * 2 - 1) * 0.22);
    drawRope(j.oralArms[i], 4, PALETTE.oral(hue, 1), PALETTE.oral(hue, 1));
  }

  // bell
  ctx.save();
  ctx.translate(j.x, j.y);
  ctx.rotate(j.tilt);

  const lobes = 7;
  ctx.beginPath();
  ctx.moveTo(-bw, 0);
  ctx.bezierCurveTo(-bw * 0.98, -bh * 1.25, bw * 0.98, -bh * 1.25, bw, 0);
  for (let i = 1; i <= lobes; i++) {
    const x1 = bw - (2 * bw) * (i - 0.5) / lobes;
    const x2 = bw - (2 * bw) * i / lobes;
    const lift = R * 0.07 + R * 0.04 * Math.sin(j.phase * 2 + i * 1.3);
    ctx.quadraticCurveTo(x1, lift, x2, R * 0.02);
  }
  ctx.closePath();

  const grad = ctx.createRadialGradient(0, -bh * 0.4, bw * 0.1, 0, -bh * 0.25, bw * 1.35);
  grad.addColorStop(0,    PALETTE.bellCore(hue, 0.32));
  grad.addColorStop(0.45, PALETTE.bellMid(hue, 0.14));
  grad.addColorStop(1,    PALETTE.bellEdge(hue, 0.02));
  ctx.fillStyle = grad;
  ctx.fill();

  // rim — a wide soft pass under a fine bright one
  ctx.strokeStyle = PALETTE.rim(hue, 0.10);
  ctx.lineWidth = 9;
  ctx.stroke();
  ctx.strokeStyle = PALETTE.rim(hue, 0.38);
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // inner organs — four rings
  for (let i = 0; i < 4; i++) {
    const gx = Math.cos((i / 4) * Math.PI * 2 + 0.6) * bw * 0.3;
    const gy = -bh * 0.45 + Math.sin((i / 4) * Math.PI * 2 + 0.6) * bh * 0.18;
    ctx.strokeStyle = PALETTE.organ(hue, 0.30);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(gx, gy, bw * 0.11 * (1 + 0.08 * pulse), 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();

  // name tag — only while the pointer is in the water. nothing announces it.
  if (showNames) {
    ctx.font = "11px 'Fragment Mono', ui-monospace, Menlo, monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = PALETTE.name(hue, 0.75);
    ctx.fillText(j.name, j.x, j.y - bh * 1.35 - 10 + 3 * Math.sin(t * 1.1 + j.seed));
  }
}

/* ── main draw ────────────────────────────────────────────────────────── */
function drawFrame(t, dt) {
  ctx.clearRect(0, 0, W, H);

  const cam = window.JT_CAM;
  cam.cur += (cam.zoom - cam.cur) * Math.min(1, dt * 6);

  const now = performance.now();
  const pointerLive = pointer.x !== null && now < pointer.activeUntil;
  const chaser = pointerLive ? nearestJelly(pointer.x, pointer.y) : null;

  // ripples sit under everything
  for (let i = ripples.length - 1; i >= 0; i--) {
    const r = ripples[i];
    r.r += 140 * dt;
    r.alpha -= 0.6 * dt;
    if (r.alpha <= 0) { ripples.splice(i, 1); continue; }
    ctx.strokeStyle = PALETTE.ripple(r.alpha * 0.8);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
    ctx.stroke();
  }

  for (const j of jellies) updateJelly(j, t, dt, chaser);

  // ink settles on paper — the whole school is drawn multiplied
  ctx.globalCompositeOperation = "lighter";
  for (const j of jellies) drawJelly(j, t, pointerLive);
  drawSparks(dt);
  ctx.globalCompositeOperation = "source-over";
}

/* ── run loop: only while the hero is actually on screen ──────────────── */
let running = false;
let rafId = 0;
let last = performance.now();

function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  drawFrame(now / 1000, dt);
  rafId = requestAnimationFrame(loop);
}

function start() {
  if (running || reducedMotion) return;
  running = true;
  last = performance.now();
  rafId = requestAnimationFrame(loop);
}

function stop() {
  running = false;
  cancelAnimationFrame(rafId);
}

if (canvas && ctx) {
  resize();
  placeJellies();

  // pointer
  addEventListener("pointermove", (e) => {
    const p = localPoint(e);
    pointer.x = p.x;
    pointer.y = p.y;
    pointer.activeUntil = performance.now() + 3500;
  }, { passive: true });

  document.addEventListener("pointerleave", () => { pointer.activeUntil = 0; });

  // a poke passes through to the page as well — the canvas is only listening,
  // never intercepting
  addEventListener("pointerdown", (e) => {
    const p = localPoint(e);
    pointer.x = p.x;
    pointer.y = p.y;
    pointer.activeUntil = performance.now() + 3500;
    ripples.push({ x: p.x, y: p.y, r: 8, alpha: 0.45 });

    const j = nearestJelly(p.x, p.y);
    const d = Math.hypot(j.x - p.x, j.y - p.y);
    if (d < bellRadius(j) * 2.4) {
      j.phaseSpeed = 6;                              // startled — pulse burst
      j.vx += ((j.x - p.x) / (d || 1)) * 300;        // poke bounces it away
      j.vy += ((j.y - p.y) / (d || 1)) * 300;
      const now = performance.now();
      j.clickTimes = j.clickTimes.filter((ts) => now - ts < 2200);
      j.clickTimes.push(now);
      if (j.clickTimes.length >= 5) {
        j.clickTimes = [];
        explode(j);                                  // five quick pokes: pop
      }
    }
  }, { passive: true });

  addEventListener("resize", () => {
    resize();
    placeJellies();
    if (reducedMotion) drawFrame(0.4, 0);
  }, { passive: true });

  if (reducedMotion) {
    // settle the school, then paint exactly one frame and stop
    for (let i = 0; i < 120; i++) drawFrame(i * 0.05, 0.05);
  } else {
    start();   // the canvas is always on screen now; the tab check below is the guard
  }

  // don't burn frames in a background tab either
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else if (!reducedMotion) start();
  });
}
