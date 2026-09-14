// jellytek — site behaviour. Vanilla, dependency-free, L2 interaction tier.
// Scroll reveals, nav state, products flyout, tile spotlight, magnet CTA, chart hover.
"use strict";

const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const canHover = matchMedia("(hover: hover)").matches;

/* ── scroll reveal ────────────────────────────────────────────────────────
   One observer per pattern. Everything unobserves after firing — reveals are
   one-shot, so nothing stays subscribed to scroll for the life of the page. */
function revealAll(selector, cls = "in-view") {
  document.querySelectorAll(selector).forEach((el) => el.classList.add(cls));
}

function initReveal(selector = ".reveal") {
  if (reduced) return revealAll(selector);
  const obs = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add("in-view");
        obs.unobserve(e.target);
      }
    },
    { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
  );
  document.querySelectorAll(selector).forEach((el) => obs.observe(el));
}

// stagger delays are set in JS so a list of any length works, capped at 0.5s
// so a long row never crawls in
function initStagger(selector = ".stagger") {
  if (reduced) return revealAll(selector);
  const obs = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        [...e.target.children].forEach((c, i) => {
          c.style.transitionDelay = `${Math.min(i * 0.07, 0.5)}s`;
        });
        e.target.classList.add("in-view");
        obs.unobserve(e.target);
      }
    },
    { threshold: 0.15, rootMargin: "0px 0px -6% 0px" }
  );
  document.querySelectorAll(selector).forEach((el) => obs.observe(el));
}

initReveal();
initStagger();

// the ruler lines draw down the page once the document settles
requestAnimationFrame(() => document.querySelector(".rulers")?.classList.add("in-view"));

/* ── nav: scrolled state, scroll progress, active section ──────────────── */
const nav = document.getElementById("nav");
const progressBar = document.querySelector(".progress__bar");
// Only same-page anchors take part in scroll-spy. Cross-page links ("/#company"
// from a product page) and the products <button> have no in-page target, and
// feeding either to querySelector would throw.
const navLinks = [...document.querySelectorAll(".nav__links .nav__link")];
const spy = navLinks
  .map((a) => {
    const href = a.getAttribute("href") || "";
    const node = href.startsWith("#") ? document.querySelector(href) : null;
    return node ? { link: a, node } : null;
  })
  .filter(Boolean);

let scrollTicking = false;

function onScroll() {
  if (scrollTicking) return;
  scrollTicking = true;
  requestAnimationFrame(() => {
    const y = window.scrollY;
    if (nav) nav.classList.toggle("is-scrolled", y > 40);

    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (progressBar) {
      progressBar.style.transform = `scaleX(${max > 0 ? Math.min(y / max, 1) : 0})`;
    }

    // active nav item = the last section whose top has passed the fold line
    let current = -1;
    spy.forEach((s, i) => {
      if (s.node.getBoundingClientRect().top <= window.innerHeight * 0.4) current = i;
    });
    spy.forEach((s, i) => s.link.classList.toggle("is-active", i === current));

    scrollTicking = false;
  });
}
addEventListener("scroll", onScroll, { passive: true });
onScroll();

/* ── mobile menu ──────────────────────────────────────────────────────── */
const toggle = document.querySelector(".nav__toggle");
const sheet = document.getElementById("navSheet");

if (toggle && sheet) {
  const setOpen = (open) => {
    toggle.setAttribute("aria-expanded", String(open));
    sheet.hidden = !open;
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  };
  toggle.addEventListener("click", () =>
    setOpen(toggle.getAttribute("aria-expanded") !== "true")
  );
  sheet.addEventListener("click", (e) => {
    if (e.target.closest(".sheet__link")) setOpen(false);
  });
  addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !sheet.hidden) { setOpen(false); toggle.focus(); }
  });
}

/* ── tile spotlight — pointer-tracked radial wash, rAF-throttled ───────── */
if (canHover) {
  let spotTicking = false;
  document.querySelectorAll(".spot").forEach((el) => {
    el.addEventListener(
      "pointermove",
      (e) => {
        if (spotTicking) return;
        spotTicking = true;
        requestAnimationFrame(() => {
          const r = el.getBoundingClientRect();
          el.style.setProperty("--mx", `${e.clientX - r.left}px`);
          el.style.setProperty("--my", `${e.clientY - r.top}px`);
          spotTicking = false;
        });
      },
      { passive: true }
    );
  });
}

/* ── magnet CTA — the button leans toward the pointer, max 6px ─────────── */
if (canHover && !reduced) {
  document.querySelectorAll(".magnet").forEach((el) => {
    let ticking = false;
    el.addEventListener(
      "pointermove",
      (e) => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          const r = el.getBoundingClientRect();
          const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
          const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
          el.style.transform = `translate(${dx * 6}px, ${dy * 6}px)`;
          ticking = false;
        });
      },
      { passive: true }
    );
    el.addEventListener("pointerleave", () => { el.style.transform = ""; });
  });
}

/* ── stat count-up ────────────────────────────────────────────────────── */
const counters = document.querySelectorAll("[data-count]");
if (counters.length) {
  const obs = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        obs.unobserve(e.target);
        const target = Number(e.target.dataset.count);
        if (reduced) { e.target.textContent = String(target); continue; }
        const start = performance.now();
        const dur = 900;
        const tick = (now) => {
          const p = Math.min((now - start) / dur, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          e.target.textContent = String(Math.round(target * eased));
          if (p < 1) requestAnimationFrame(tick);
        };
        e.target.textContent = "0";
        requestAnimationFrame(tick);
      }
    },
    { threshold: 0.5 }
  );
  counters.forEach((c) => obs.observe(c));
}

/* ── products flyout ──────────────────────────────────────────────────── */
const prodNav = document.querySelector(".nav__products");
if (prodNav) {
  const trigger = prodNav.querySelector(".nav__link");
  const menu = prodNav.querySelector(".nav__menu");
  const setOpen = (open) => {
    prodNav.dataset.open = String(open);
    trigger.setAttribute("aria-expanded", String(open));
    menu.hidden = !open;
  };
  trigger.addEventListener("click", (e) => {
    e.preventDefault();
    setOpen(prodNav.dataset.open !== "true");
  });
  // hover opens it on pointer devices; click still works for keyboard/touch
  if (canHover) {
    prodNav.addEventListener("pointerenter", () => setOpen(true));
    prodNav.addEventListener("pointerleave", () => setOpen(false));
  }
  document.addEventListener("click", (e) => {
    if (!prodNav.contains(e.target)) setOpen(false);
  });
  addEventListener("keydown", (e) => {
    if (e.key === "Escape" && prodNav.dataset.open === "true") { setOpen(false); trigger.focus(); }
  });
}

/* ── price chart: crosshair + tooltip ─────────────────────────────────────
   The chart is static SVG (no library, strict CSP). This adds the hover layer
   the data deserves: nearest-point snapping, a crosshair, and a readout. */
const chart = document.getElementById("priceChart");
if (chart) {
  const num = (attr) => chart.dataset[attr].split(",").map(Number);
  const xs = num("xs"), ys = num("ys"), vals = num("vals");
  const W = Number(chart.dataset.w);
  const svg = chart.querySelector("svg");
  const cross = chart.querySelector(".chart__cross");
  const dot = chart.querySelector(".chart__dot");
  const tip = chart.querySelector(".chart__tip");
  const hit = chart.querySelector(".chart__hit");
  const DAY = 24 * 60 * 60 * 1000;
  const today = new Date();
  let ticking = false;

  function show(clientX) {
    const box = svg.getBoundingClientRect();
    const xView = ((clientX - box.left) / box.width) * W;
    // nearest sample, not interpolation — the reading must be a real mark
    let i = 0, best = Infinity;
    for (let k = 0; k < xs.length; k++) {
      const d = Math.abs(xs[k] - xView);
      if (d < best) { best = d; i = k; }
    }
    cross.setAttribute("x1", xs[i]); cross.setAttribute("x2", xs[i]);
    dot.setAttribute("cx", xs[i]); dot.setAttribute("cy", ys[i]);

    const when = new Date(today.getTime() - (xs.length - 1 - i) * DAY);
    tip.innerHTML = `<b>A$ ${vals[i].toFixed(2)}</b><br>${when.toLocaleDateString(undefined, { day: "numeric", month: "short" })}`;
    tip.style.left = `${(xs[i] / W) * 100}%`;
    tip.style.top = `${(ys[i] / Number(chart.dataset.h)) * 100}%`;
    chart.classList.add("is-live");
  }

  const onMove = (e) => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { show(e.clientX); ticking = false; });
  };

  hit.addEventListener("pointermove", onMove, { passive: true });
  hit.addEventListener("pointerdown", onMove, { passive: true });
  chart.addEventListener("pointerleave", () => chart.classList.remove("is-live"));

  // keyboard: the chart is focusable and arrow keys step day by day
  let kb = xs.length - 1;
  svg.setAttribute("tabindex", "0");
  svg.addEventListener("keydown", (e) => {
    const step = { ArrowLeft: -1, ArrowRight: 1 }[e.key];
    if (!step) return;
    e.preventDefault();
    kb = Math.max(0, Math.min(xs.length - 1, kb + step));
    const box = svg.getBoundingClientRect();
    show(box.left + (xs[kb] / W) * box.width);
  });
  svg.addEventListener("blur", () => chart.classList.remove("is-live"));
}

/* ── viewfinder zoom ──────────────────────────────────────────────────────
   Drag the marker along the focus scale to zoom the camera. It drives the
   jellyfish renderer through window.JT_CAM, which eases toward the target so
   the change reads as a lens moving rather than a jump. */
const vfScale = document.getElementById("vfZoom");

if (vfScale && window.JT_CAM) {
  const marker = vfScale.querySelector(".vf__zoom");
  const MIN_Z = 0.55, MAX_Z = 2.1;
  let pos = 0;                       // −1 (wide) … 0 (neutral) … 1 (tele)

  const travel = () => vfScale.clientWidth * 0.42;

  function apply() {
    marker.style.transform = `translate(calc(-50% + ${(pos * travel()).toFixed(1)}px), -50%)`;
    window.JT_CAM.zoom = pos >= 0 ? 1 + pos * (MAX_Z - 1) : 1 + pos * (1 - MIN_Z);
    vfScale.setAttribute("aria-valuenow", String(Math.round((pos + 1) * 50)));
  }

  const fromEvent = (e) => {
    const r = vfScale.getBoundingClientRect();
    const x = e.clientX - (r.left + r.width / 2);
    pos = Math.max(-1, Math.min(1, x / travel()));
  };

  let dragging = false;

  vfScale.addEventListener("pointerdown", (e) => {
    // the canvas pokes jellies on window-level pointerdown; this drag is not a poke
    e.stopPropagation();
    e.preventDefault();
    dragging = true;
    vfScale.setPointerCapture(e.pointerId);
    vfScale.classList.add("is-dragging");
    fromEvent(e);
    apply();
  });

  vfScale.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    e.stopPropagation();
    fromEvent(e);
    apply();
  });

  const end = (e) => {
    if (!dragging) return;
    dragging = false;
    vfScale.classList.remove("is-dragging");
    try { vfScale.releasePointerCapture(e.pointerId); } catch (err) {}
  };
  vfScale.addEventListener("pointerup", end);
  vfScale.addEventListener("pointercancel", end);

  // it is a real slider, so the arrow keys have to work
  vfScale.addEventListener("keydown", (e) => {
    const step = { ArrowLeft: -0.08, ArrowRight: 0.08, ArrowDown: -0.08, ArrowUp: 0.08 }[e.key];
    if (step) { e.preventDefault(); pos = Math.max(-1, Math.min(1, pos + step)); apply(); return; }
    if (e.key === "Home")  { e.preventDefault(); pos = -1; apply(); }
    if (e.key === "End")   { e.preventDefault(); pos = 1;  apply(); }
    if (e.key === "Escape") { e.preventDefault(); pos = 0; apply(); }
  });

  addEventListener("resize", apply, { passive: true });
  apply();
}
