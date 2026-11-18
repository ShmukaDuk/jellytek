// jellytek — a small school of doodled jellyfish, dependency-free canvas 2D.
//
// Drawn like the rest of the site's doodles: a few wobbly ink lines, round
// caps, a whisper of fill. The lines "boil" — re-jittered a few times a second
// like hand-drawn animation — and the jellies swim with a cartoon stroke:
// stretch tall (the push), snap flat, relax round. The bell rides a springy
// squash-and-stretch that overshoots, and each tentacle follows the bell a
// beat late from root to tip, so the whole stroke ripples down it.
//
// Lines are drawn additively ("lighter") so they glow faintly on the deep
// indigo ground. The canvas is fixed to the whole viewport behind every
// section and takes no pointer events of its own — window-level listeners feed
// it, so a jelly drifting over a button never swallows the click. It pauses in
// a background tab and renders a single frame under prefers-reduced-motion.
"use strict";

const canvas = document.getElementById("sea");
const ctx = canvas && canvas.getContext("2d", { alpha: true });
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ── palette ──────────────────────────────────────────────────────────── */
const PALETTE = {
  ink:    (h, a) => `hsla(${h}, 85%, 74%, ${a})`,
  glow:   (h, a) => `hsla(${h}, 90%, 68%, ${a})`,
  fill:   (h, a) => `hsla(${h}, 80%, 70%, ${a})`,
  spark:  (h, a) => `hsla(${h}, 95%, 75%, ${a})`,
  ripple: (a)    => `hsla(175, 90%, 70%, ${a})`,
};

/* Camera zoom. Nothing drives it on the simple site, so it sits at 1; any
   script that sets `zoom` gets an eased lens move via `cur`. */
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
const TENTACLES = 5;
const TENTACLE_PTS = 9;
const BOIL_FPS = 7;            // how often the ink lines re-jitter

function makeJelly(name, hue, fx, fy, scale, seed) {
  return {
    name, hue, scale, seed,
    fullScale: scale,          // rebirth shrinks scale; it grows back to this
    clickTimes: [],
    fx, fy,                    // starting position as a fraction of the canvas
    x: 0, y: 0,
    vx: 0, vy: 0,
    phase: seed * 2.1,
    phaseSpeed: 1.6,
    heading: seed * 1.7,       // the way the bell points — and jets
    targetHeading: seed * 1.7,
    swimTimer: 0.4 + (seed % 1) * 2,
    tilt: 0,
    // springy bell size (width, height multipliers) and their velocities
    sw: 1, sh: 1, swv: 0, shv: 0,
  };
}

// named for the team — nothing on the page says so
const jellies = [
  makeJelly("james",  145, 0.22, 0.32, 0.78, 0.7),   // green
  makeJelly("tess",   330, 0.54, 0.62, 0.78, 2.9),   // pink
  makeJelly("johnny", 215, 0.80, 0.28, 0.78, 5.3),   // blue
];

const bellRadius = (j) => Math.min(W, H) * 0.1 * j.scale * window.JT_CAM.cur;

function placeJellies() {
  for (const j of jellies) {
    j.x = W * j.fx;
    j.y = H * j.fy;
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

/* ── the stroke ───────────────────────────────────────────────────────── */

// One swim stroke, posed like a cartoon jelly: stretch tall and narrow with
// the tentacles pulled in (that's the push), snap flat and wide with them
// crumpled, then relax round with them splayed out.
//   s — stretch 0..1   q — squash 0..1   push — thrust 0..1
const ease = (k) => k * k * (3 - 2 * k);
function strokePose(phase) {
  const u = ((phase / (Math.PI * 2)) % 1 + 1) % 1;
  if (u < 0.34) {
    const k = u / 0.34;
    return { s: ease(k), q: 0, push: Math.sin(Math.PI * k) };
  }
  if (u < 0.47) {
    const k = ease((u - 0.34) / 0.13);
    return { s: 1 - k, q: k, push: 0 };
  }
  return { s: 0, q: 1 - ease((u - 0.47) / 0.53), push: 0 };
}

/* ── hand-drawn wobble ────────────────────────────────────────────────── */

// deterministic jitter in -1..1, re-rolled BOIL_FPS times a second
function wob(j, n, boil) {
  const v = Math.sin(j.seed * 917.3 + n * 12.9898 + boil * 78.233) * 43758.5453;
  return (v - Math.floor(v)) * 2 - 1;
}

// a smooth line through points, the way a pen would take them
function smoothPath(pts, closeToStart) {
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2;
    const my = (pts[i][1] + pts[i + 1][1]) / 2;
    ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
  }
  const lastP = pts[pts.length - 1];
  if (closeToStart) ctx.quadraticCurveTo(lastP[0], lastP[1], pts[0][0], pts[0][1]);
  else ctx.lineTo(lastP[0], lastP[1]);
}

// one inked stroke: a soft glow pass under the line itself
function ink(hue, width, alpha) {
  ctx.strokeStyle = PALETTE.glow(hue, 0.07 * alpha);
  ctx.lineWidth = width * 4;
  ctx.stroke();
  ctx.strokeStyle = PALETTE.ink(hue, 0.72 * alpha);
  ctx.lineWidth = width;
  ctx.stroke();
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

/* ── per-jelly update ─────────────────────────────────────────────────── */

// shortest signed turn from angle b to angle a
const angTo = (a, b) => ((a - b + Math.PI * 3) % (Math.PI * 2)) - Math.PI;

function updateJelly(j, t, dt, chaser) {
  const R = bellRadius(j);

  // ── pick a direction: a jelly commits to a heading, swims it for a few
  //    strokes, then wanders off somewhere new ──
  let jetScale = 1;
  if (chaser === j) {
    const dx = pointer.x - j.x, dy = (pointer.y - R * 1.4) - j.y;
    j.targetHeading = Math.atan2(dy, dx);
    jetScale = Math.min(1, Math.hypot(dx, dy) / 140);   // ease up on arrival
  } else {
    j.swimTimer -= dt;
    if (j.swimTimer <= 0) {
      // mostly random; drifted too far out → head back toward open water
      const cx = W * 0.5 - j.x, cy = H * 0.45 - j.y;
      const out = Math.hypot(cx, cy) / (Math.min(W, H) * 0.55);
      j.targetHeading = out > 0.8
        ? Math.atan2(cy, cx) + (Math.random() - 0.5) * 0.8
        : Math.random() * Math.PI * 2;
      j.swimTimer = 2 + Math.random() * 4;
    }
  }
  j.heading += angTo(j.targetHeading, j.heading) * Math.min(1, dt * 0.6);

  // ── jet propulsion: thrust only during the stretch — a lunge, then a
  //    glide through the squash and relax ──
  const pose = strokePose(j.phase);
  const jet = pose.push * pose.push * 150 * dt * jetScale;
  j.vx += Math.cos(j.heading) * jet;
  j.vy += Math.sin(j.heading) * jet;

  // personal space — gentle mutual repulsion keeps the school untangled
  for (const other of jellies) {
    if (other === j) continue;
    const rx = j.x - other.x, ry = j.y - other.y;
    const d = Math.hypot(rx, ry) || 1;
    const minD = (bellRadius(j) + bellRadius(other)) * 1.8;
    if (d < minD) {
      j.vx += (rx / d) * (minD - d) * 0.02;
      j.vy += (ry / d) * (minD - d) * 0.02;
    }
  }

  // heavy water drag — each lunge visibly dies out before the next one
  const drag = Math.max(0, 1 - 2.4 * dt);
  j.vx *= drag;
  j.vy *= drag;
  j.x += j.vx * dt;
  j.y += j.vy * dt;

  // ── the bell springs toward the pose and overshoots: jelly, not rubber ──
  const tw = 1 - 0.26 * pose.s + 0.3 * pose.q;
  const th = 1 + 0.62 * pose.s - 0.42 * pose.q;
  const K = 150, C = 9;
  j.swv += ((tw - j.sw) * K - j.swv * C) * dt;
  j.shv += ((th - j.sh) * K - j.shv * C) * dt;
  j.sw += j.swv * dt;
  j.sh += j.shv * dt;

  // babies grow slowly back to full size
  if (j.scale < j.fullScale - 0.001) {
    j.scale += (j.fullScale - j.scale) * 0.045 * dt;
  }

  // stay inside the frame — a bumped wall means it's time to turn around
  const pad = R * 1.1;
  if (j.x < pad)      { j.x = pad;      if (j.vx < 0) j.vx *= -0.4; j.swimTimer = 0; }
  if (j.x > W - pad)  { j.x = W - pad;  if (j.vx > 0) j.vx *= -0.4; j.swimTimer = 0; }
  if (j.y < pad * 1.4){ j.y = pad * 1.4;if (j.vy < 0) j.vy *= -0.4; j.swimTimer = 0; }
  if (j.y > H - pad)  { j.y = H - pad;  if (j.vy > 0) j.vy *= -0.4; j.swimTimer = 0; }

  j.phaseSpeed += (1.6 - j.phaseSpeed) * 0.02;   // recover after startle
  j.phase += j.phaseSpeed * dt;

  // the bell only leans a little toward its heading — the dome stays roughly
  // up, so a jelly heading down sinks rather than flipping over
  const lean = Math.max(-0.35, Math.min(0.35, angTo(j.heading + Math.PI / 2, 0) * 0.3));
  j.tilt += (lean - j.tilt) * Math.min(1, dt * 0.8);
}

/* ── per-jelly draw (bell-local space: rim on y = 0, dome toward -y) ──── */
function drawJelly(j, t) {
  const R = bellRadius(j);
  const hue = j.hue + 8 * Math.sin(t * 0.3 + j.seed);
  const boil = reducedMotion ? 0 : Math.floor(t * BOIL_FPS);
  const bw = R * j.sw;
  const bh = R * 0.95 * j.sh;
  const lw = Math.max(1.4, R * 0.032);
  const jit = R * 0.025;

  ctx.save();
  ctx.translate(j.x, j.y);
  ctx.rotate(j.tilt);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // body velocity in bell-local space — the tentacle tips drag behind it
  const ca = Math.cos(-j.tilt), sa = Math.sin(-j.tilt);
  const lvx = ca * j.vx - sa * j.vy;
  const lvy = sa * j.vx + ca * j.vy;

  // ── tentacles: five wavy ink lines, each a beat behind the bell ──
  for (let i = 0; i < TENTACLES; i++) {
    const side = (i / (TENTACLES - 1)) * 2 - 1;
    const lenF = 1.15 + 0.5 * Math.cos(side * Math.PI / 2);   // middle ones longest
    const pts = [];
    for (let k = 0; k <= TENTACLE_PTS; k++) {
      const a = k / TENTACLE_PTS;
      // follow-through: further down the line lives further in the past
      const p = strokePose(j.phase - a * 1.1);
      const L = R * lenF * (1 + 0.15 * p.s - 0.38 * p.q);
      const spread = 0.22 + 0.5 * p.q - 0.3 * p.s;
      const wave = Math.sin(t * 2.4 + i * 1.9 - a * 5.5) * R * 0.13 * a * (1 - 0.7 * p.s);
      let x = side * (bw * 0.62 + spread * a * L) + wave;
      let y = a * L;
      // on the squash the tips flick forward and out, like kicked legs
      x += side * p.q * a * a * L * 0.25;
      y -= p.q * a * a * L * 0.4;
      // drag behind the swim
      x -= lvx * a * a * 0.22;
      y -= lvy * a * a * 0.22;
      x += wob(j, i * 31 + k, boil) * jit * (0.4 + a);
      y += wob(j, i * 31 + k + 17, boil) * jit * (0.4 + a);
      pts.push([x, y]);
    }
    ctx.beginPath();
    smoothPath(pts, false);
    ink(hue, lw * 0.85, 0.85);
  }

  // ── bell: a wobbly dome and a scalloped rim ──
  const dome = [];
  const DOME_PTS = 9;
  for (let k = 0; k <= DOME_PTS; k++) {
    const a = Math.PI * (k / DOME_PTS);
    const edge = k === 0 || k === DOME_PTS ? 0.4 : 1;
    dome.push([
      -Math.cos(a) * bw + wob(j, 200 + k, boil) * jit * edge,
      -Math.pow(Math.sin(a), 0.75) * bh + wob(j, 220 + k, boil) * jit,
    ]);
  }
  ctx.beginPath();
  smoothPath(dome, false);
  const scallops = 4;
  for (let k = 1; k <= scallops; k++) {
    const x1 = bw - (2 * bw) * (k - 0.5) / scallops;
    const x2 = bw - (2 * bw) * k / scallops;
    const sag = R * (0.13 + 0.05 * Math.sin(j.phase * 2 + k * 1.7)) + wob(j, 240 + k, boil) * jit;
    ctx.quadraticCurveTo(x1, sag, x2, wob(j, 250 + k, boil) * jit * 0.5);
  }
  ctx.closePath();
  ctx.fillStyle = PALETTE.fill(hue, 0.07);
  ctx.fill();
  ink(hue, lw, 1);

  // a shine stroke on the dome, like the doodles' belly line
  ctx.beginPath();
  ctx.moveTo(-bw * 0.62, -bh * 0.42);
  ctx.quadraticCurveTo(-bw * 0.58 + wob(j, 260, boil) * jit, -bh * 0.82, -bw * 0.22, -bh * 0.9);
  ink(hue, lw * 0.8, 0.55);

  // two little eyes, like the team's avatars
  for (const ex of [-0.27, 0.27]) {
    ctx.beginPath();
    ctx.arc(ex * bw + wob(j, 270 + ex * 10, boil) * jit * 0.4, -bh * 0.38,
      R * 0.085, 0, Math.PI * 2);
    ink(hue, lw * 0.85, 0.9);
  }

  ctx.restore();
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

  // light on a dark sea — overlapping lines brighten
  ctx.globalCompositeOperation = "lighter";
  for (const j of jellies) drawJelly(j, t);
  drawSparks(dt);
  ctx.globalCompositeOperation = "source-over";
}

/* ── run loop ─────────────────────────────────────────────────────────── */
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
      j.phaseSpeed = 6;                              // startled — stroke burst
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
    start();   // the canvas is always on screen; the tab check below is the guard
  }

  // don't burn frames in a background tab either
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else if (!reducedMotion) start();
  });
}
