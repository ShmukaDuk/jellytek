// jellytek — a school of bioluminescent jellyfish, dependency-free canvas 2D.
// Verlet-integrated tentacles, pulsing bells, plankton field, pointer steering.
"use strict";

const canvas = document.getElementById("sea");
const ctx = canvas.getContext("2d");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

let W = 0, H = 0, DPR = 1;

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
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
  nearestJelly(e.clientX, e.clientY).phaseSpeed = 7;   // startled — pulse burst
  ripples.push({ x: e.clientX, y: e.clientY, r: 8, alpha: 0.5 });
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
    x: W * fx, y: H * fy,
    vx: 0, vy: 0,
    phase: seed * 2.1,
    phaseSpeed: 2.2,
    tilt: 0,
    tentacles: [],
    oralArms: [],
  };
}

const jellies = [
  makeJelly("james",  330, 0.25, 0.38, 1.05, 0.7),
  makeJelly("tess",   215, 0.55, 0.5,  0.9,  2.9),
  makeJelly("johnny", 145, 0.78, 0.34, 1.0,  5.3),
];

const bellRadius = (j) => Math.min(W, H) * 0.105 * j.scale;

function buildRopes() {
  for (const j of jellies) {
    const R = bellRadius(j);
    j.tentacles = Array.from({ length: TENTACLES }, () =>
      makeRope(SEGS, R * 0.24, j.x, j.y));
    j.oralArms = Array.from({ length: ORAL_ARMS }, () =>
      makeRope(ORAL_SEGS, R * 0.2, j.x, j.y));
  }
}
buildRopes();

window.addEventListener("resize", () => {
  resize();
  buildRopes();
  if (reducedMotion) drawFrame(0.4, 0);
});

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
    p.x += vx + Math.sin(t * 1.4 + idx * 1.7 + i * 0.28) * sway + flare * (i / pts.length);
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

function drawRope(rope, width, color, glow) {
  const pts = rope.pts;
  ctx.strokeStyle = color;
  ctx.shadowColor = glow;
  ctx.shadowBlur = 8;
  ctx.lineCap = "round";
  for (let i = 0; i < pts.length - 1; i++) {
    const taper = 1 - i / pts.length;
    ctx.lineWidth = Math.max(0.4, width * taper);
    ctx.globalAlpha = 0.36 + 0.42 * taper;
    ctx.beginPath();
    ctx.moveTo(pts[i].x, pts[i].y);
    ctx.lineTo(pts[i + 1].x, pts[i + 1].y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
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

// ── per-jelly update + draw ────────────────────────────────────────────────
function updateJelly(j, t, dt, chaser) {
  const R = bellRadius(j);

  let tx, ty;
  if (chaser === j) {
    tx = pointer.x;
    ty = pointer.y - R * 1.6;         // hover above the cursor, tentacles reach it
  } else {
    tx = W * (0.5 + 0.34 * Math.sin(t * (0.17 + j.seed * 0.013) + j.seed));
    ty = H * (0.4 + 0.15 * Math.sin(t * (0.11 + j.seed * 0.017) + j.seed * 2.3));
  }

  // contraction (falling edge of the pulse) provides thrust toward target
  const thrust = Math.max(0, -Math.cos(j.phase)) * 0.035;
  const dx = tx - j.x, dy = ty - j.y;
  const dist = Math.hypot(dx, dy) || 1;
  j.vx += (dx / dist) * thrust * Math.min(dist, 120);
  j.vy += (dy / dist) * thrust * Math.min(dist, 120);

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

  j.vx *= 0.985;
  j.vy *= 0.985;
  j.x += j.vx * dt;
  j.y += j.vy * dt;

  j.phaseSpeed += (2.2 - j.phaseSpeed) * 0.02;   // recover after startle
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
    const ax = j.x + Math.cos(j.tilt) * (along * 2 - 1) * bw * 0.82;
    const ay = j.y + Math.sin(j.tilt) * (along * 2 - 1) * bw * 0.82 + bh * 0.05;
    simulateRope(j.tentacles[i], ax, ay, t, i + j.seed, 0.5, (along * 2 - 1) * 0.3);
    drawRope(j.tentacles[i], 1.6, `hsla(${hue + 20}, 85%, 72%, 0.55)`, `hsla(${hue}, 90%, 70%, 0.8)`);
  }
  for (let i = 0; i < ORAL_ARMS; i++) {
    const ax = j.x + ((i / (ORAL_ARMS - 1)) * 2 - 1) * bw * 0.3;
    simulateRope(j.oralArms[i], ax, j.y + bh * 0.1, t, i + 20 + j.seed, 0.6,
      ((i / (ORAL_ARMS - 1)) * 2 - 1) * 0.22);
    drawRope(j.oralArms[i], 4.5, `hsla(${hue + 40}, 70%, 78%, 0.30)`, `hsla(${hue + 40}, 80%, 70%, 0.6)`);
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

  // rim light
  ctx.strokeStyle = `hsla(${hue}, 100%, 82%, 0.55)`;
  ctx.lineWidth = 1.6;
  ctx.shadowColor = `hsla(${hue}, 100%, 70%, 0.9)`;
  ctx.shadowBlur = 18;
  ctx.stroke();
  ctx.shadowBlur = 0;

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
  ctx.shadowColor = `hsla(${hue}, 90%, 70%, 0.9)`;
  ctx.shadowBlur = 10;
  ctx.fillText(j.name, j.x, j.y - bh * 1.45 - 12 + 3 * Math.sin(t * 1.1 + j.seed));
  ctx.shadowBlur = 0;
  ctx.globalCompositeOperation = "source-over";
}

// ── main draw ──────────────────────────────────────────────────────────────
function drawFrame(t, dt) {
  ctx.clearRect(0, 0, W, H);

  // plankton field (screen-wrapped)
  ctx.globalCompositeOperation = "lighter";
  for (const p of plankton) {
    const x = (p.x + Math.sin(t * 0.3 + p.seed) * 12) % W;
    p.y -= p.vy;
    if (p.y < -5) p.y = H + 5 + Math.random() * 40;
    const y = p.y % (H + 10);
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
  for (const j of jellies) drawJelly(j, t);
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
