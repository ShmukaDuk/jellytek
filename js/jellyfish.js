// jellytek — a school of bioluminescent jellyfish, dependency-free canvas 2D.
// Verlet-integrated tentacles, pulsing bells, plankton field, pointer steering.
"use strict";

const canvas = document.getElementById("sea");
const ctx = canvas.getContext("2d");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

let W = 0, H = 0, DPR = 1;

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 1.5);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = Math.round(W * DPR);
  canvas.height = Math.round(H * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
resize();

// ── pointer ────────────────────────────────────────────────────────────────
const pointer = { x: null, y: null, activeUntil: 0 };

window.addEventListener("pointermove", (e) => {
  pointer.x = e.clientX;
  pointer.y = e.clientY;
  pointer.activeUntil = performance.now() + 3500;
});
window.addEventListener("pointerdown", (e) => {
  pointer.x = e.clientX;
  pointer.y = e.clientY;
  pointer.activeUntil = performance.now() + 3500;
  ripples.push({ x: e.clientX, y: e.clientY, r: 8, alpha: 0.5 });

  const j = nearestJelly(e.clientX, e.clientY);
  const d = Math.hypot(j.x - e.clientX, j.y - e.clientY);
  if (d < bellRadius(j) * 3.2) {
    j.phaseSpeed = 6;                                  // startled — pulse burst
    j.vx += ((j.x - e.clientX) / (d || 1)) * 340;      // poke bounces it away
    j.vy += ((j.y - e.clientY) / (d || 1)) * 340;
    const now = performance.now();
    j.clickTimes = j.clickTimes.filter((ts) => now - ts < 2200);
    j.clickTimes.push(now);
    if (j.clickTimes.length >= 5) {
      j.clickTimes = [];
      explode(j);
    }
  }
});

// ── the school ─────────────────────────────────────────────────────────────
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
    fullScale: scale,               // rebirth shrinks scale; it grows back to this
    clickTimes: [],
    x: W * fx, y: H * fy,
    vx: 0, vy: 0,
    phase: seed * 2.1,
    phaseSpeed: 1.4,
    tilt: 0,
    tentacles: [],
    oralArms: [],
    nextVisit: 0,      // time (s) of this jelly's next scheduled logo visit
    visiting: false,   // currently swimming up to tap the logo
  };
}

const jellies = [
  makeJelly("james",  215, 0.25, 0.38, 1.05, 0.7),
  makeJelly("tess",   330, 0.55, 0.5,  0.9,  2.9),
  makeJelly("johnny", 145, 0.78, 0.34, 1.0,  5.3),
];

const bellRadius = (j) => Math.min(W, H) * 0.105 * j.scale;

// Middle tentacles run longest, the rim ones stay short — a real bell
// silhouette instead of uniform noodles.
const tentacleLenF = (along) => 0.55 + 0.5 * Math.sin(along * Math.PI);

function rebuildJellyRopes(j) {
  const R = bellRadius(j);
  j.tentacles = Array.from({ length: TENTACLES }, (_, i) =>
    makeRope(SEGS, R * 0.24 * tentacleLenF(i / (TENTACLES - 1)), j.x, j.y));
  j.oralArms = Array.from({ length: ORAL_ARMS }, () =>
    makeRope(ORAL_SEGS, R * 0.17, j.x, j.y));
}

function buildRopes() {
  for (const j of jellies) rebuildJellyRopes(j);
}
buildRopes();

window.addEventListener("resize", () => {
  resize();
  buildRopes();
  measureLogo();
  if (reducedMotion) drawFrame(0.4, 0);
});

// ── logo tinting: the wordmark takes the colour of whichever jelly last brushed it
const wordmark = document.querySelector(".wordmark");
let logoRect = null;
let logoJelly = null;

function measureLogo() {
  logoRect = wordmark ? wordmark.getBoundingClientRect() : null;
}
measureLogo();
window.addEventListener("load", measureLogo);

function tintLogo(j) {
  if (!wordmark || logoJelly === j) return;   // hold colour until a *different* jelly touches
  logoJelly = j;
  wordmark.style.setProperty("--logo", `hsl(${j.hue}, 88%, 74%)`);
  wordmark.style.setProperty("--logo-glow", `hsla(${j.hue}, 90%, 66%, 0.5)`);
}

// True only when the bell (the jelly's head) overlaps the logo — not its
// trailing tentacles, and not merely being nearby.
function headTouchesLogo(j) {
  if (!logoRect) return false;
  const R = bellRadius(j);
  const hx = j.x;
  const hy = j.y - R * 0.55;          // centre of the dome, up above the rim
  const nx = Math.max(logoRect.left, Math.min(hx, logoRect.right));
  const ny = Math.max(logoRect.top, Math.min(hy, logoRect.bottom));
  return Math.hypot(hx - nx, hy - ny) < R * 0.8;   // dome radius
}

function checkLogoTouch() {
  if (!logoRect) return;
  for (const j of jellies) {
    if (headTouchesLogo(j)) { tintLogo(j); break; }
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

// ── rope physics + rendering ───────────────────────────────────────────────
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
    // two superposed waves, amplitude growing toward the tip — flutter, not noodle
    const along = i / pts.length;
    const wave =
      Math.sin(t * 1.1 + idx * 1.7 + i * 0.35) +
      0.5 * Math.sin(t * 2.3 + idx * 2.9 + i * 0.5);
    p.x += vx + wave * sway * (0.25 + 0.75 * along) + flare * along;
    p.y += vy + 0.09;                 // buoyant-drag settle
  }

  // distance constraints, two relaxation passes
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

// Glow is faked with a wide translucent halo stroke under a bright core —
// canvas shadowBlur is catastrophically slow without GPU accel. The core is
// stroked in three width steps so ropes taper from base to a fine tip.
function tracePath(pts, a, b) {
  ctx.beginPath();
  ctx.moveTo(pts[a].x, pts[a].y);
  for (let i = a + 1; i < b; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2;
    const my = (pts[i].y + pts[i + 1].y) / 2;
    ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
  }
}

function drawRope(rope, width, color, glow) {
  const pts = rope.pts;
  const n = pts.length;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  tracePath(pts, 0, n - 1);
  ctx.strokeStyle = glow;
  ctx.globalAlpha = 0.09;
  ctx.lineWidth = width * 3.2;
  ctx.stroke();

  ctx.strokeStyle = color;
  const steps = [
    [0, Math.floor(n * 0.45), 1, 0.55],
    [Math.floor(n * 0.45), Math.floor(n * 0.75), 0.55, 0.4],
    [Math.floor(n * 0.75), n - 1, 0.3, 0.26],
  ];
  for (const [a, b, wf, alpha] of steps) {
    tracePath(pts, a, b);
    ctx.globalAlpha = alpha;
    ctx.lineWidth = Math.max(0.5, width * wf);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// ── plankton + ripples ─────────────────────────────────────────────────────
const plankton = Array.from({ length: 90 }, () => ({
  x: Math.random() * 4000,
  y: Math.random() * 4000,
  r: 0.4 + Math.random() * 1.6,
  vy: 0.06 + Math.random() * 0.25,
  tw: 0.5 + Math.random() * 2,
  seed: Math.random() * Math.PI * 2,
}));

const ripples = [];

// ── explosions: 5 quick pokes pops a jelly; a baby regrows in its place ────
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
  ripples.push({ x: j.x, y: j.y - R * 0.5, r: R * 0.4, alpha: 0.8 });
  j.scale = j.fullScale * 0.28;      // reborn as a baby
  j.vx = 0;
  j.vy = 0;
  j.phaseSpeed = 3.5;                // babies flutter fast, then calm down
  rebuildJellyRopes(j);
}

function drawSparks(dt) {
  ctx.globalCompositeOperation = "lighter";
  for (let i = sparks.length - 1; i >= 0; i--) {
    const s = sparks[i];
    s.age += dt;
    if (s.age >= s.life) { sparks.splice(i, 1); continue; }
    s.vx *= 1 - 1.6 * dt;
    s.vy = s.vy * (1 - 1.6 * dt) - 50 * dt;    // buoyant embers drift upward
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    const a = 1 - s.age / s.life;
    ctx.fillStyle = `hsla(${s.hue}, 95%, 75%, ${0.7 * a})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r * (0.5 + a * 0.8), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";
}

// ── water surface (top 15% is air; everything lives below the waterline) ────
const SURFACE_FRAC = 0.15;

function surfaceLevel(x, t) {
  return (
    H * SURFACE_FRAC +
    Math.sin(x * 0.008 + t * 0.9) * 3 +
    Math.sin(x * 0.017 - t * 1.3) * 2
  );
}

function drawSurface(t) {
  // hazy air above the waterline
  ctx.fillStyle = "rgba(190, 215, 235, 0.04)";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(W, 0);
  ctx.lineTo(W, surfaceLevel(W, t));
  for (let x = W; x >= 0; x -= 16) ctx.lineTo(x, surfaceLevel(x, t));
  ctx.closePath();
  ctx.fill();

  // glowing waterline
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = "hsla(195, 80%, 80%, 0.22)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let x = 0; x <= W; x += 12) {
    const y = surfaceLevel(x, t);
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.globalCompositeOperation = "source-over";
}

// ── god rays (crepuscular light shafts drifting down from the surface) ───────
const rays = Array.from({ length: 7 }, (_, i) => ({
  base: 0.08 + i * 0.13,          // horizontal anchor as a fraction of width
  width: 0.05 + Math.random() * 0.06,
  drift: 0.2 + Math.random() * 0.5,
  seed: Math.random() * Math.PI * 2,
  hue: 190 + Math.random() * 30,
}));

function drawRays(t) {
  ctx.globalCompositeOperation = "lighter";
  for (const r of rays) {
    const sway = Math.sin(t * r.drift + r.seed) * 0.06;
    const topX = W * (r.base + sway);
    const botX = W * (r.base + sway + 0.14);
    const w = W * r.width * (0.85 + 0.15 * Math.sin(t * 0.7 + r.seed));
    const a = 0.03 + 0.025 * (0.5 + 0.5 * Math.sin(t * 0.5 + r.seed));

    const surfY = H * SURFACE_FRAC;
    const grad = ctx.createLinearGradient(topX, surfY, botX, H);
    grad.addColorStop(0, `hsla(${r.hue}, 95%, 78%, ${a})`);
    grad.addColorStop(1, `hsla(${r.hue}, 90%, 70%, 0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(topX - w * 0.4, surfY);
    ctx.lineTo(topX + w * 0.4, surfY);
    ctx.lineTo(botX + w, H);
    ctx.lineTo(botX - w, H);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";
}

// ── rising bubbles ───────────────────────────────────────────────────────────
const bubbles = Array.from({ length: 30 }, () => ({
  x: Math.random() * 4000,
  y: H * (0.2 + Math.random() * 0.8),
  r: 1 + Math.random() * 4,
  vy: 0.4 + Math.random() * 1.1,
  wobble: 0.4 + Math.random() * 1.4,
  seed: Math.random() * Math.PI * 2,
}));

function drawBubbles(t) {
  ctx.globalCompositeOperation = "lighter";
  for (const b of bubbles) {
    b.y -= b.vy;
    // pop at the waterline, respawn at the sea floor
    if (b.y < H * SURFACE_FRAC + 4) { b.y = H + 10; b.x = Math.random() * W; }
    const x = ((b.x + Math.sin(t * b.wobble + b.seed) * 14) % W + W) % W;
    const y = b.y;
    ctx.strokeStyle = `hsla(195, 90%, 82%, 0.28)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, b.r, 0, Math.PI * 2);
    ctx.stroke();
    // little highlight glint
    ctx.fillStyle = `hsla(195, 100%, 90%, 0.35)`;
    ctx.beginPath();
    ctx.arc(x - b.r * 0.3, y - b.r * 0.3, b.r * 0.28, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";
}

// ── per-jelly update + draw ────────────────────────────────────────────────
function updateJelly(j, t, dt, chaser) {
  const R = bellRadius(j);

  // schedule the first visit lazily, staggered so the three don't arrive together
  if (j.nextVisit === 0) j.nextVisit = t + Math.random() * 10;

  if (logoRect) {
    if (!j.visiting && t >= j.nextVisit) j.visiting = true;   // time to go tap the logo
    if (j.visiting && headTouchesLogo(j)) {
      // head reached it — end the visit and come back in ~10s
      j.visiting = false;
      j.nextVisit = t + 9 + Math.random() * 3;
    }
  }

  let tx, ty;
  if (chaser === j) {
    tx = pointer.x;
    ty = pointer.y - R * 1.6;         // hover above the cursor, tentacles reach it
  } else if (j.visiting && logoRect) {
    tx = (logoRect.left + logoRect.right) / 2;   // make a beeline for the wordmark
    ty = (logoRect.top + logoRect.bottom) / 2;
  } else {
    tx = W * (0.5 + 0.30 * Math.sin(t * (0.10 + j.seed * 0.009) + j.seed));
    ty = H * (0.55 + 0.20 * Math.sin(t * (0.07 + j.seed * 0.011) + j.seed * 2.3));
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
    const minD = (bellRadius(j) + bellRadius(other)) * 2.2;
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

  // never above the waterline
  const minY = H * SURFACE_FRAC + R * 1.9;
  if (j.y < minY) {
    j.y = minY;
    if (j.vy < 0) j.vy *= -0.35;
  }

  j.phaseSpeed += (1.4 - j.phaseSpeed) * 0.02;   // recover after startle
  j.phase += j.phaseSpeed * dt;
  j.tilt += (Math.max(-0.5, Math.min(0.5, j.vx * 0.004)) - j.tilt) * 0.05;
}

function drawJelly(j, t) {
  const R = bellRadius(j);
  const pulse = Math.sin(j.phase);
  const hue = j.hue + 8 * Math.sin(t * 0.3 + j.seed);
  const bw = R * (1 + 0.10 * pulse);
  const bh = R * (1.15 - 0.22 * pulse);

  // tentacles (behind the bell)
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < TENTACLES; i++) {
    const along = i / (TENTACLES - 1);            // 0..1 across the rim
    // segLen tracks the current bell size, so tentacles grow with a baby
    j.tentacles[i].segLen = R * 0.24 * tentacleLenF(along);
    const ax = j.x + Math.cos(j.tilt) * (along * 2 - 1) * bw * 0.82;
    const ay = j.y + Math.sin(j.tilt) * (along * 2 - 1) * bw * 0.82 + bh * 0.05;
    simulateRope(j.tentacles[i], ax, ay, t, i + j.seed, 0.55, (along * 2 - 1) * 0.22);
    drawRope(j.tentacles[i], 1.4, `hsla(${hue + 20}, 85%, 72%, 0.55)`, `hsla(${hue}, 90%, 70%, 0.8)`);
  }
  for (let i = 0; i < ORAL_ARMS; i++) {
    const ax = j.x + ((i / (ORAL_ARMS - 1)) * 2 - 1) * bw * 0.3;
    j.oralArms[i].segLen = R * 0.17;
    simulateRope(j.oralArms[i], ax, j.y + bh * 0.1, t, i + 20 + j.seed, 0.6,
      ((i / (ORAL_ARMS - 1)) * 2 - 1) * 0.22);
    drawRope(j.oralArms[i], 4, `hsla(${hue + 40}, 70%, 78%, 0.30)`, `hsla(${hue + 40}, 80%, 70%, 0.6)`);
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
  grad.addColorStop(0, `hsla(${hue}, 95%, 78%, 0.50)`);
  grad.addColorStop(0.45, `hsla(${hue + 25}, 85%, 65%, 0.22)`);
  grad.addColorStop(1, `hsla(${hue + 50}, 80%, 60%, 0.03)`);
  ctx.fillStyle = grad;
  ctx.fill();

  // rim light — halo pass + bright core, no shadowBlur
  ctx.strokeStyle = `hsla(${hue}, 100%, 70%, 0.14)`;
  ctx.lineWidth = 9;
  ctx.stroke();
  ctx.strokeStyle = `hsla(${hue}, 100%, 82%, 0.55)`;
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // inner organs — four glowing gonad rings
  for (let i = 0; i < 4; i++) {
    const gx = Math.cos((i / 4) * Math.PI * 2 + 0.6) * bw * 0.3;
    const gy = -bh * 0.45 + Math.sin((i / 4) * Math.PI * 2 + 0.6) * bh * 0.18;
    ctx.strokeStyle = `hsla(${hue + 60}, 80%, 75%, 0.4)`;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(gx, gy, bw * 0.11 * (1 + 0.08 * pulse), 0, Math.PI * 2);
    ctx.stroke();
  }

  // core glow
  const core = ctx.createRadialGradient(0, -bh * 0.5, 0, 0, -bh * 0.5, bw * 0.6);
  core.addColorStop(0, `hsla(${hue + 30}, 100%, 85%, ${0.28 + 0.1 * pulse})`);
  core.addColorStop(1, "transparent");
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(0, -bh * 0.5, bw * 0.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // name tag, drifting just above the bell
  ctx.globalCompositeOperation = "lighter";
  ctx.font = "600 13px ui-monospace, Menlo, monospace";
  ctx.textAlign = "center";
  ctx.fillStyle = `hsla(${hue}, 85%, 80%, 0.75)`;
  ctx.fillText(j.name, j.x, j.y - bh * 1.45 - 12 + 3 * Math.sin(t * 1.1 + j.seed));
  ctx.globalCompositeOperation = "source-over";
}

// ── main draw ──────────────────────────────────────────────────────────────
function drawFrame(t, dt) {
  ctx.clearRect(0, 0, W, H);

  drawSurface(t);

  // god rays sink behind everything else
  drawRays(t);

  // plankton field (screen-wrapped)
  ctx.globalCompositeOperation = "lighter";
  for (const p of plankton) {
    const x = (p.x + Math.sin(t * 0.3 + p.seed) * 12) % W;
    p.y -= p.vy;
    if (p.y < -5) p.y = H + 5 + Math.random() * 40;
    const y = p.y % (H + 10);
    if (y < H * SURFACE_FRAC + 4) continue;   // plankton stays underwater
    const a = 0.10 + 0.14 * (0.5 + 0.5 * Math.sin(t * p.tw + p.seed));
    ctx.fillStyle = `hsla(${190 + 40 * Math.sin(p.seed)}, 90%, 75%, ${a})`;
    ctx.beginPath();
    ctx.arc((x + W) % W, y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // click ripples
  for (let i = ripples.length - 1; i >= 0; i--) {
    const r = ripples[i];
    r.r += 140 * dt;
    r.alpha -= 0.6 * dt;
    if (r.alpha <= 0) { ripples.splice(i, 1); continue; }
    ctx.strokeStyle = `hsla(200, 90%, 75%, ${r.alpha})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalCompositeOperation = "source-over";

  // the jelly nearest the pointer gets curious; the others keep wandering
  const now = performance.now();
  const chaser =
    pointer.x !== null && now < pointer.activeUntil
      ? nearestJelly(pointer.x, pointer.y)
      : null;

  for (const j of jellies) updateJelly(j, t, dt, chaser);
  checkLogoTouch();
  for (const j of jellies) drawJelly(j, t);

  drawSparks(dt);

  // bubbles drift up in the foreground
  drawBubbles(t);
}

// ── loop ───────────────────────────────────────────────────────────────────
let last = performance.now();

function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  drawFrame(now / 1000, dt);
  requestAnimationFrame(loop);
}

if (reducedMotion) {
  drawFrame(0.4, 0);                  // a single serene frame, no animation
} else {
  requestAnimationFrame(loop);
}
