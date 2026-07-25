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
  if (stage.mode !== "home") return;   // no poking during the intro sequence
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

// all three the same size; drawn in order, so johnny (green) paints last and
// sits in front.
const jellies = [
  makeJelly("james",  145, 0.22, 0.40, 1.0, 0.7),   // green
  makeJelly("tess",   330, 0.5,  0.52, 1.0, 2.9),   // pink
  makeJelly("johnny", 215, 0.7,  0.36, 1.0, 5.3),   // blue
];

const bellRadius = (j) => Math.min(W, H) * 0.105 * j.scale;

// ── stage machine ───────────────────────────────────────────────────────────
// "intro"  logo centred, waiting for a click
// "scene"  one jelly spotlit centre-stage over its keyword; the others slide off
// "home"   the free-swimming aquarium (pointer steering + timed logo visits on)
const stage = { mode: "intro", focus: null };
const jellyByName = (n) => jellies.find((j) => j.name === n);

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
  if (stage.mode === "intro") centerLogo(false);   // keep the hero logo centred
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
  if (!logoRect || stage.mode !== "home") return;   // logo only recolours on the home screen
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

  // scheduled logo visits only run once we've reached the home screen
  if (j.nextVisit === 0) j.nextVisit = t + Math.random() * 10;
  if (stage.mode === "home" && logoRect) {
    if (!j.visiting && t >= j.nextVisit) j.visiting = true;   // time to go tap the logo
    if (j.visiting && headTouchesLogo(j)) {
      // head reached it — end the visit and come back in ~10s
      j.visiting = false;
      j.nextVisit = t + 9 + Math.random() * 3;
    }
  } else {
    j.visiting = false;
  }

  let tx, ty;
  if (stage.mode === "scene") {
    if (j === stage.focus) {
      tx = W / 2; ty = H * 0.52;                  // spotlight: swim to centre stage
    } else {
      tx = j.x < W / 2 ? -W * 0.4 : W * 1.4;      // the rest slide out the sides
      ty = H * 0.55;
    }
  } else if (stage.mode === "intro") {
    // three jellies orbiting slowly around the centred logo, framing it
    const idx = jellies.indexOf(j);
    const ang = (idx / jellies.length) * Math.PI * 2 - Math.PI / 2 + t * 0.06;
    tx = W / 2 + Math.cos(ang) * Math.min(W, H) * 0.34;
    ty = H * 0.5 + Math.sin(ang) * Math.min(W, H) * 0.2;
  } else if (chaser === j) {
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

  // during the scripted scenes, add a steady glide so jellies hit their marks
  if (stage.mode === "scene") {
    j.vx += (dx / dist) * Math.min(dist, 400) * 0.02;
    j.vy += (dy / dist) * Math.min(dist, 400) * 0.02;
  }

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
    stage.mode === "home" && pointer.x !== null && now < pointer.activeUntil
      ? nearestJelly(pointer.x, pointer.y)
      : null;

  for (const j of jellies) updateJelly(j, t, dt, chaser);
  checkLogoTouch();
  for (const j of jellies) drawJelly(j, t);

  drawSparks(dt);

  // bubbles drift up in the foreground
  drawBubbles(t);
}

// ── intro sequence ──────────────────────────────────────────────────────────
// Logo opens dead-centre; a click glides it to the corner, then three scenes
// spotlight each jelly over its keyword before settling into the home aquarium.
const sceneWord = document.querySelector(".scene-word");
const SCENES = [
  { name: "james",  word: "Innovation" },   // blue
  { name: "tess",   word: "Creativity" },   // pink
  { name: "johnny", word: "Inspire" },      // green
];
const SCENE_HOLD = 3000;   // ms a keyword stays up
const SCENE_GAP = 650;     // ms of darkness between keywords

// Translate a corner-anchored element so its centre lands at the viewport centre.
// The transition must be frozen while measuring, or a mid-flight ease-back would
// report a stale (transformed) box and we'd fail to actually centre it.
function centerElement(el, scale, animate) {
  const prev = el.style.transition;
  el.style.transition = "none";
  el.style.transform = "";
  void el.offsetWidth;                             // commit the untransformed layout
  const r = el.getBoundingClientRect();            // now the true resting box
  const dx = W / 2 - (r.left + r.width / 2);
  const dy = H / 2 - (r.top + r.height / 2);
  if (animate) {                                   // let the recentre ease in
    el.style.transition = prev;
    void el.offsetWidth;
  }
  el.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
  if (!animate) {
    void el.offsetWidth;
    el.style.transition = prev;                    // restore easing for the glide back
  }
}

const tagline = document.querySelector(".tagline");

function centerLogo(animate) {
  if (!wordmark) return;
  centerElement(wordmark, 1.18, animate);
  measureLogo();
}

// Scale a keyword to ~50% of the viewport width (half the old edge-to-edge
// size), capped so it never overruns the height.
function fitWord(el) {
  el.style.fontSize = "200px";
  const w = el.getBoundingClientRect().width || 1;
  let size = 200 * (W * 0.5 / w);
  size = Math.min(size, H * 0.24);
  el.style.fontSize = `${Math.round(size)}px`;
}

let started = false;

function startSequence() {
  if (started || stage.mode !== "intro") return;
  started = true;
  wordmark.style.transform = "";                  // glide back to the corner
  document.body.dataset.stage = "leaving";
  setTimeout(runScene(0), 1150);                  // once it's parked, roll the scenes
}

function runScene(i) {
  return () => {
    if (i >= SCENES.length) return endSequence();
    const sc = SCENES[i];
    const j = jellyByName(sc.name);
    stage.mode = "scene";
    stage.focus = j;
    document.body.dataset.stage = "scene";

    sceneWord.textContent = sc.word;
    sceneWord.style.setProperty("--word", `hsla(${j.hue}, 85%, 65%, 0.5)`);   // halved backlight
    fitWord(sceneWord);            // scale the type to span the viewport, Noomo-style
    sceneWord.classList.remove("show");
    void sceneWord.offsetWidth;
    sceneWord.classList.add("show");

    setTimeout(() => {
      sceneWord.classList.remove("show");
      setTimeout(runScene(i + 1), SCENE_GAP);
    }, SCENE_HOLD);
  };
}

function endSequence() {
  stage.mode = "home";                 // jellies free-swim behind the reveal
  stage.focus = null;
  if (!tagline) { document.body.dataset.stage = "home"; measureLogo(); return; }
  // final beat: "soft body. hard tech." blooms centre-screen, then tucks to corner
  document.body.dataset.stage = "reveal";
  centerElement(tagline, 3, false);
  measureLogo();
  setTimeout(() => {
    tagline.style.transform = "";      // glide down to its resting corner
    document.body.dataset.stage = "home";
    measureLogo();
  }, 1700);
}

if (reducedMotion) {
  // no motion: skip straight to the settled home screen, one static frame
  stage.mode = "home";
  document.body.dataset.stage = "home";
  drawFrame(0.4, 0);
} else {
  wordmark.addEventListener("click", startSequence);
  wordmark.addEventListener("transitionend", measureLogo);
  centerLogo(false);   // open centred, before first paint (no corner flash)
}

// ── loop ───────────────────────────────────────────────────────────────────
let last = performance.now();

function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  drawFrame(now / 1000, dt);
  requestAnimationFrame(loop);
}

if (!reducedMotion) requestAnimationFrame(loop);
