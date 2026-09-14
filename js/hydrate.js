// jellytek — content layer.
//
// index.html carries the real copy inline (so the page works with no JS and
// reads fine to a crawler). content.js is the editable record on top of it:
// whatever it defines wins. Edit mode (?edit) writes content.js; this file
// applies it.
//
// Everything editable is declared in js/schema.js, once, as a CSS selector —
// per page. Nothing in the markup needs a data- attribute; add a line to that
// page's FIELDS or GROUPS and it becomes editable.
//
// The site is three pages (home · engine · prices). <body data-page="…"> picks
// which schema and which slice of content.js applies.
"use strict";

window.JT = window.JT || {};

/* ── which page are we on ────────────────────────────────────────────────── */
window.JT.page = (document.body && document.body.dataset.page) || "home";

const SCHEMA = (window.JT.PAGES && window.JT.PAGES[window.JT.page]) || {};
window.JT.FIELDS   = SCHEMA.FIELDS   || {};
window.JT.GROUPS   = SCHEMA.GROUPS   || {};
window.JT.SECTIONS = SCHEMA.SECTIONS || {};
window.JT.LAYOUTS  = SCHEMA.LAYOUTS  || {};

// this page's slice of content.js
window.JT.pageContent = (c) => {
  if (!c) return null;
  return (c.pages && c.pages[window.JT.page]) || null;
};

/* ══ Design tokens — shared by every page ═══════════════════════════════ */

/* COLORS map a friendly name to the CSS custom property it drives. Anything
   listed here gets a picker; anything not listed keeps its designed value. */
window.JT.COLORS = {
  accent:     { label: "Accent",          v: "--accent" },
  ground:     { label: "Page ground",     v: "--bg" },
  ink:        { label: "Ink",             v: "--text" },
  body:       { label: "Body copy",       v: "--text-secondary" },
  surface:    { label: "Card surface",    v: "--surface" },
  tint:       { label: "Tinted sections", v: "--surface-alt" },
  line:       { label: "Hairlines",       v: "--border" },
  rule:       { label: "Grid rulers",     v: "--grid-line" },
  inkPanel:   { label: "Dark sections",   v: "--surface-ink" },
  brandPanel: { label: "Brand panel",     v: "--surface-deep" },
};

// accent needs its rgb triple kept in step for the rgba() washes
window.JT.COLOR_RGB = { accent: "--accent-rgb", ground: "--bg-rgb", ink: "--text-rgb" };

/* Dark presets. `ink` is the text colour, so it stays light in every one of
   these — swapping to a light theme means more than this object (the figure
   fills and the canvas blend mode assume a dark ground). */
window.JT.PALETTES = {
  "Cloudy":    { accent: "#40E0D0", ground: "#1C2359", ink: "#FFFFFF", body: "#B6BCE4", surface: "#161C49", tint: "#1A2154", line: "#2C3472", rule: "#262D68", inkPanel: "#0E1236", brandPanel: "#2A2F7A" },
  "Midnight":  { accent: "#6EA8FF", ground: "#0F1424", ink: "#FFFFFF", body: "#AEB8D4", surface: "#151B2E", tint: "#131829", line: "#252D45", rule: "#1F2739", inkPanel: "#090C16", brandPanel: "#1E2A4D" },
  "Nebula":    { accent: "#C084FC", ground: "#1A1330", ink: "#FFFFFF", body: "#C7BBE0", surface: "#221936", tint: "#1E1633", line: "#372A55", rule: "#2C2148", inkPanel: "#110B22", brandPanel: "#3B2566" },
  "Reactor":   { accent: "#A3E635", ground: "#141A14", ink: "#FFFFFF", body: "#BCC8B6", surface: "#1A211A", tint: "#171E17", line: "#2C3729", rule: "#232B21", inkPanel: "#0B0F0B", brandPanel: "#25331F" },
  "Ember":     { accent: "#FF8A4C", ground: "#1E1620", ink: "#FFFFFF", body: "#D8C4C8", surface: "#261C28", tint: "#221924", line: "#3D2C3B", rule: "#31232F", inkPanel: "#140E16", brandPanel: "#40233A" },
};

window.JT.FONTS = {
  display: ["Inter Tight", "Space Grotesk", "Archivo", "Manrope"],
  mono:    ["Fragment Mono", "JetBrains Mono", "IBM Plex Mono"],
};

// numeric knobs → the :root custom property, with a sane range for the slider
window.JT.KNOBS = {
  head:   { label: "Headline size",   v: "--scale-head",    min: 0.7,   max: 1.4, step: 0.05,  unit: "" },
  track:  { label: "Tracking",        v: "--track-display", min: -0.07, max: 0,   step: 0.005, unit: "em" },
  space:  { label: "Section rhythm",  v: "--scale-space",   min: 0.5,   max: 1.6, step: 0.05,  unit: "" },
  gutter: { label: "Page margins",    v: "--scale-gutter",  min: 0.4,   max: 1.6, step: 0.05,  unit: "" },
};

window.JT.BACKGROUNDS = { light: "Light", tint: "Tinted", dark: "Dark", brand: "Brand" };

/* ── helpers shared with the editor ──────────────────────────────────── */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// The element whose words we actually write into: a .t wrapper if present,
// otherwise the element itself.
window.JT.textNode = (el) => (el && $(":scope > .t", el)) || el;

/* Line breaks are content, not markup: the section titles are deliberately set
   over two lines. A newline in a string is the break; these two keep <br> and
   "\n" in sync so reading and writing round-trip exactly. */
window.JT.getText = (el) => {
  const node = window.JT.textNode(el);
  let out = "";
  for (const n of node.childNodes) {
    // whitespace inside a text node is source formatting — collapse it.
    // ONLY a <br> counts as a line break.
    if (n.nodeType === 3) out += n.nodeValue.replace(/\s+/g, " ");
    else if (n.nodeName === "BR") out += "\n";
    else out += n.textContent.replace(/\s+/g, " ");
  }
  return out.replace(/ *\n */g, "\n").trim();
};

window.JT.setText = (el, value) => {
  const node = window.JT.textNode(el);
  // A field must point at a leaf that holds only words. Pointing one at an
  // element with structural children used to silently flatten them — it cost us
  // the section <br>s, the tagline separator and the whole products menu before
  // this guard existed. Refuse, loudly, instead of destroying markup.
  if (node.querySelector("*:not(br)")) {
    console.warn("JT.setText refused:", node,
      "contains elements. Point the field at a text-only leaf, or wrap the words in <span class=\"t\">.");
    return;
  }
  node.textContent = "";
  String(value).split("\n").forEach((line, i) => {
    if (i) node.appendChild(document.createElement("br"));
    node.appendChild(document.createTextNode(line));
  });
};

// Items in current DOM order. Each is stamped once with its position in the
// ORIGINAL html — every index saved to content.js refers to that, so applying a
// saved order is idempotent instead of re-permuting on each reload.
window.JT.items = (g) => {
  const box = $(g.container);
  if (!box) return [];
  const items = [...box.children].filter((el) => el.matches(g.item));
  items.forEach((el, i) => {
    if (el.dataset.jtOrig == null) el.dataset.jtOrig = String(i);
  });
  return items;
};

// original index → element
window.JT.byOriginal = (g) => {
  const m = new Map();
  for (const el of window.JT.items(g)) m.set(Number(el.dataset.jtOrig), el);
  return m;
};

// stamp everything up front, before anything can reorder the DOM
window.JT.stamp = () => { for (const g of Object.values(window.JT.GROUPS)) window.JT.items(g); };

/* ── apply ───────────────────────────────────────────────────────────── */
window.JT.apply = (c) => {
  if (!c) return;

  // 1 · text
  for (const [key, sel] of Object.entries(window.JT.FIELDS)) {
    const val = c.text && c.text[key];
    if (val == null) continue;
    const el = $(sel);
    if (el) window.JT.setText(el, val);
  }

  // 2 · per-item text inside groups, keyed by original position
  for (const [gk, g] of Object.entries(window.JT.GROUPS)) {
    for (const [orig, el] of window.JT.byOriginal(g)) {
      for (const [fk, fsel] of Object.entries(g.fields)) {
        const val = c.text && c.text[`${gk}.${orig}.${fk}`];
        if (val == null) continue;
        const target = fsel ? $(fsel, el) : el;
        if (target) window.JT.setText(target, val);
      }
    }
  }

  // 3 · order, as a list of original positions
  for (const [gk, order] of Object.entries(c.order || {})) {
    const g = window.JT.GROUPS[gk];
    if (!g || !Array.isArray(order)) continue;
    const box = $(g.container);
    if (!box) continue;
    const byOrig = window.JT.byOriginal(g);
    for (const orig of order) {
      const el = byOrig.get(orig);
      if (el) box.appendChild(el);
    }
  }

  // 4 · visibility
  for (const key of c.hidden || []) {
    if (window.JT.SECTIONS[key]) {
      const el = $(window.JT.SECTIONS[key].sel);
      if (el) el.hidden = true;
      continue;
    }
    const m = key.match(/^(.+)\.(\d+)$/);           // e.g. "apps.tiles.2"
    if (!m) continue;
    const g = window.JT.GROUPS[m[1]];
    if (!g) continue;
    const el = window.JT.byOriginal(g).get(Number(m[2]));
    if (el) el.hidden = true;
  }
};

/* ── design: colours, fonts, knobs ───────────────────────────────────── */
const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const rgbTriple = (hex) => {
  let h = hex.slice(1);
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
};

window.JT.applyTheme = (theme) => {
  if (!theme) return;
  const root = document.documentElement.style;

  for (const [key, hex] of Object.entries(theme.colors || {})) {
    const spec = window.JT.COLORS[key];
    if (!spec || !HEX.test(hex)) continue;       // ignore anything malformed
    root.setProperty(spec.v, hex);
    const rgbVar = window.JT.COLOR_RGB[key];
    if (rgbVar) root.setProperty(rgbVar, rgbTriple(hex));
  }

  if (theme.fonts) {
    const stack = (name, fallback) => `"${String(name).replace(/"/g, "")}", ${fallback}`;
    if (theme.fonts.display) {
      const v = stack(theme.fonts.display, '"Helvetica Neue", Helvetica, Arial, sans-serif');
      root.setProperty("--font-display", v);
      root.setProperty("--font-body", v);
    }
    if (theme.fonts.mono) {
      root.setProperty("--font-mono", stack(theme.fonts.mono, 'ui-monospace, Menlo, monospace'));
    }
  }

  for (const [key, val] of Object.entries(theme.knobs || {})) {
    const spec = window.JT.KNOBS[key];
    if (!spec || !isFinite(val)) continue;
    root.setProperty(spec.v, val + (spec.unit || ""));
  }
};

/* ── per-section background + layout preset ──────────────────────────── */
window.JT.applyPresentation = (c) => {
  for (const [key, bg] of Object.entries(c.bg || {})) {
    const spec = window.JT.SECTIONS[key];
    const el = spec && $(spec.sel);
    if (!el || !window.JT.BACKGROUNDS[bg]) continue;
    el.classList.remove("bg-light", "bg-tint", "bg-dark", "bg-brand");
    el.classList.add("bg-" + bg);
  }

  for (const [key, preset] of Object.entries(c.layout || {})) {
    const spec = window.JT.LAYOUTS[key];
    const section = window.JT.SECTIONS[key] && $(window.JT.SECTIONS[key].sel);
    if (!spec || !section || !spec.options[preset]) continue;
    const el = spec.target ? $(spec.target, section) : section;
    if (!el) continue;
    for (const opt of Object.keys(spec.options)) el.classList.remove("lay-" + opt);
    el.classList.add("lay-" + preset);
  }
};

/* ── order of the top-level sections ─────────────────────────────────── */
window.JT.applySectionOrder = (order) => {
  if (!Array.isArray(order) || !order.length) return;
  const main = $("main");
  if (!main) return;
  for (const key of order) {
    const spec = window.JT.SECTIONS[key];
    const el = spec && $(spec.sel);
    if (el && el.parentElement === main) main.appendChild(el);
  }
};

/* ── images dropped into the drawn figures' slots ────────────────────── */
window.JT.applyImages = (images) => {
  for (const slot of $$("[data-img]")) {
    const src = images && images[slot.dataset.img];
    const existing = $(":scope > .figslot__img", slot);
    if (!src) {
      if (existing) existing.remove();
      slot.classList.remove("has-img");
      continue;
    }
    const img = existing || document.createElement("img");
    img.className = "figslot__img";
    img.alt = "";
    img.loading = "lazy";
    if (img.getAttribute("src") !== src) img.setAttribute("src", src);
    if (!existing) slot.appendChild(img);
    slot.classList.add("has-img");
  }
};

window.JT.stamp();                      // before anything reorders

// theme is site-wide; everything else is per page
window.JT.applyTheme(window.JT_CONTENT && window.JT_CONTENT.theme);

const PAGE = window.JT.pageContent(window.JT_CONTENT);
if (PAGE) {
  window.JT.apply(PAGE);
  window.JT.applyPresentation(PAGE);
  window.JT.applySectionOrder(PAGE.sections);
  window.JT.applyImages(PAGE.images);
}
