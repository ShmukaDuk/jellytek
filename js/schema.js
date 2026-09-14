// jellytek — what is editable, per page.
//
// One entry per page, keyed by <body data-page="…">. Each holds:
//   FIELDS    key → CSS selector for a single string
//   GROUPS    repeating rows: hide-able, re-orderable, with their own fields
//   SECTIONS  whole sections that can be reordered, restyled or deleted
//   LAYOUTS   which layout presets a section understands
//
// Add a line here and it becomes editable on the page — no markup change needed,
// unless the words sit beside an icon, in which case wrap them in <span class="t">.
"use strict";

window.JT = window.JT || {};

/* shared by every page's chrome */
const NAV = {
  "nav.company":  ".nav__links a[href$='#company']",
  "nav.expertise":".nav__links a[href$='#expertise']",
  "nav.products": ".nav__products > .nav__link",
  // NB: point at text-only leaves. A field aimed at the whole <a> flattens the
  // number, title and description into one string — see the guard in hydrate.js.
  "nav.engineName": ".nav__menu a[href$='/tcg-engine/'] b",
  "nav.engineDesc": ".nav__menu a[href$='/tcg-engine/'] .desc",
  "nav.pricesName": ".nav__menu a[href$='/price-monitoring/'] b",
  "nav.pricesDesc": ".nav__menu a[href$='/price-monitoring/'] .desc",
  "nav.cta":      ".nav__cta .t",
};

const FOOT = {
  "foot.tag":       ".foot__tag",
  "foot.chip":      ".chip--live .t",
  "foot.copyright": ".foot__legal .t",
  "foot.l1":        ".foot__nav a:nth-of-type(1)",
  "foot.l2":        ".foot__nav a:nth-of-type(2)",
  "foot.l3":        ".foot__nav a:nth-of-type(3)",
  "foot.l4":        ".foot__nav a:nth-of-type(4)",
};

const CONTACT = {
  "demo.index": "#demo .section__index",
  "demo.title": "#demo .section__title",
  "demo.mail":  ".demo__mail",
  "demo.tel":   ".demo__tel",
  "demo.blurb": ".demo__contact p",
};

const CONTACT_SECTION = { demo: { label: "Contact", sel: "#demo" } };

window.JT.PAGES = {

  /* ══════════════════════════════════════════════════════════════════════
     HOME — the company
     ══════════════════════════════════════════════════════════════════ */
  home: {
    FIELDS: {
      ...NAV,
      "hero.eyebrow": ".hero__eyebrow .mask > span",
      "hero.lede":    ".hero__lede",
      "hero.tagline1":".hero__tagline-a",
      "hero.tagline2":".hero__tagline-b",
      "hero.cta":     ".hero__actions .btn.magnet .t",
      "hero.cta2":    ".hero__actions .btn--ghost .t",
      "hero.callout1":".callout--a .t",
      "hero.callout2":".callout--b .t",
      "hero.foot":    ".hero__foot .label:not(.label--dim)",
      "hero.scroll":  ".hero__foot .label--dim .t",

      "who.index":  "#company .section__index",
      "who.title":  "#company .section__title",
      "who.lede":   "#company .section__lede",
      "who.p1":     ".who__body p:nth-of-type(1)",
      "who.visionLabel": ".who__vision .label",
      "who.vision": ".who__vision blockquote",

      "spec.index": "#expertise .section__index",
      "spec.title": "#expertise .section__title",
      "spec.lede":  "#expertise .section__lede",

      "prod.index": "#products .section__index",
      "prod.title": "#products .section__title",
      "prod.lede":  "#products .section__lede",

      "team.index": "#team .section__index",
      "team.title": "#team .section__title",
      "team.lede":  "#team .section__lede",

      ...CONTACT,
      ...FOOT,
    },
    GROUPS: {
      "spec.items": {
        label: "Expertise", container: ".caps", item: ".cap", name: ".cap__title",
        fields: { n: ".cap__n", title: ".cap__title", text: ".cap__text" },
      },
      "prod.items": {
        label: "Products", container: ".prods", item: ".prod", name: ".prod__title",
        fields: { n: ".prod__n", title: ".prod__title", text: ".prod__text", cta: ".prod__cta .t" },
      },
      "team.members": {
        label: "Team", container: ".team-grid", item: ".member", name: ".member__name",
        fields: { name: ".member__name", role: ".member__role", text: ".member__text" },
      },
    },
    SECTIONS: {
      company:   { label: "01 · Who we are",  sel: "#company" },
      expertise: { label: "02 · Expertise",   sel: "#expertise" },
      products:  { label: "03 · Products",    sel: "#products" },
      team:      { label: "04 · Team",        sel: "#team" },
      ...CONTACT_SECTION,
    },
    LAYOUTS: {
      expertise: { target: ".caps",      options: { "2up": "2 across", "3up": "3 across", stack: "Stacked" } },
      products:  { target: ".prods",     options: { "2up": "2 across", stack: "Stacked" } },
      team:      { target: ".team-grid", options: { "3up": "3 across", "2up": "2 across", stack: "Stacked" } },
      company:   { target: null,         options: { split: "Split", stack: "Stacked" } },
    },
  },

  /* ══════════════════════════════════════════════════════════════════════
     TCG ENGINE — product
     ══════════════════════════════════════════════════════════════════ */
  engine: {
    FIELDS: {
      ...NAV,
      "crumb.root": ".crumb a:nth-of-type(2)",
      "crumb.here": ".crumb__here",

      "hero.eyebrow": ".hero__eyebrow .mask > span",
      "hero.title":   ".hero__title .mask > span",
      "hero.lede":    ".hero__lede",
      "hero.cta":     ".hero__actions .btn.magnet .t",
      "hero.cta2":    ".hero__actions .btn--ghost .t",

      "apps.index": "#apps .section__index",
      "apps.title": "#apps .section__title",
      "apps.lede":  "#apps .section__lede",

      "edge.index":    "#edge .section__index",
      "edge.title":    "#edge .section__title",
      "edge.lede":     "#edge .section__lede",
      "edge.subtitle": ".edge__title",
      "edge.body":     ".edge__copy > p",

      ...CONTACT,
      "demo.note": ".demo__note",
      ...FOOT,
    },
    GROUPS: {
      "apps.tiles": {
        label: "App tiles", container: ".bento", item: ".tile", name: ".card__title",
        fields: { title: ".card__title", text: ".tile__text", meta: ".card__meta" },
      },
      "edge.stats": {
        label: "Edge stats", container: ".stats", item: ".stat", name: ".stat__label",
        fields: { label: ".stat__label" },
      },
      "edge.spec": {
        label: "Edge spec rows", container: ".edge__copy .speclist", item: "li",
        name: "span:first-child", fields: { key: "span:first-child", value: "span:last-child" },
      },
      "demo.builds": {
        label: "APK rows", container: ".dls", item: ".dl", name: ".dl__name",
        fields: { name: ".dl__name", note: ".dl__note" },
      },
    },
    SECTIONS: {
      apps: { label: "01 · Built on it", sel: "#apps" },
      edge: { label: "02 · Edge",        sel: "#edge" },
      ...CONTACT_SECTION,
    },
    LAYOUTS: {
      apps: { target: ".bento", options: { bento: "Bento (unequal)", "2up": "2 across", "3up": "3 across", "4up": "4 across", stack: "Stacked" } },
      edge: { target: null,     options: { "media-right": "Diagram right", "media-left": "Diagram left", stack: "Stacked" } },
      demo: { target: null,     options: { split: "Split", stack: "Stacked" } },
    },
  },

  /* ══════════════════════════════════════════════════════════════════════
     PRICE HISTORY & MONITORING — product
     ══════════════════════════════════════════════════════════════════ */
  prices: {
    FIELDS: {
      ...NAV,
      "crumb.root": ".crumb a:nth-of-type(2)",
      "crumb.here": ".crumb__here",

      "hero.eyebrow": ".hero__eyebrow .mask > span",
      "hero.title":   ".hero__title .mask > span",
      "hero.lede":    ".hero__lede",
      "hero.cta":     ".hero__actions .btn.magnet .t",
      "hero.cta2":    ".hero__actions .btn--ghost .t",

      "what.index": "#what .section__index",
      "what.title": "#what .section__title",
      "what.lede":  "#what .section__lede",
      "what.games": ".gamesrow > .label",

      "hist.index":   "#history .section__index",
      "hist.title":   "#history .section__title",
      "hist.lede":    "#history .section__lede",
      "hist.cardName":".chart__card",
      "hist.cardMeta":".chart__meta",
      "hist.rangeLab":".chart__range .label",
      "hist.note":    ".chart__note",

      "move.index": "#movers .section__index",
      "move.title": "#movers .section__title",
      "move.lede":  "#movers .section__lede",
      "move.colA":  ".movers__head span:nth-child(1)",
      "move.colB":  ".movers__head span:nth-child(2)",
      "move.colC":  ".movers__head span:nth-child(3)",
      "move.colD":  ".movers__head span:nth-child(4)",
      "move.colE":  ".movers__head span:nth-child(5)",

      ...CONTACT,
      "demo.note": ".demo__note",
      ...FOOT,
    },
    GROUPS: {
      "what.items": {
        label: "What it does", container: ".caps", item: ".cap", name: ".cap__title",
        fields: { n: ".cap__n", title: ".cap__title", text: ".cap__text" },
      },
      "move.rows": {
        label: "Market movers", container: ".movers__body", item: ".mover", name: ".mover__name",
        fields: { name: ".mover__name", set: ".mover__set", price: ".mover__price", change: ".mover__pct .t" },
      },
      "what.gameList": {
        label: "Games priced", container: ".gamesrow .chips", item: ".chip-g",
        name: null, fields: { label: null },
      },
      "demo.builds": {
        label: "APK rows", container: ".dls", item: ".dl", name: ".dl__name",
        fields: { name: ".dl__name", note: ".dl__note" },
      },
    },
    SECTIONS: {
      what:    { label: "01 · What it does",  sel: "#what" },
      history: { label: "02 · Price history", sel: "#history" },
      movers:  { label: "03 · Market movers", sel: "#movers" },
      ...CONTACT_SECTION,
    },
    LAYOUTS: {
      what: { target: ".caps", options: { "3up": "3 across", "2up": "2 across", stack: "Stacked" } },
      demo: { target: null,    options: { split: "Split", stack: "Stacked" } },
    },
  },
};
