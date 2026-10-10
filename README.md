# jellytek.net

Marketing site for JellyTek — TCG card tracking and classification that runs
on-device. Static: no build step, no dependencies, no framework. Hosted on
GitHub Pages behind GitHub's Fastly CDN (which provides the network-level DDoS
absorption).

## Structure

Three pages. Hierarchy is **Company → Expertise → Products → individual
product**, and the nav mirrors it.

```
/                            Home — the company
  #company                     Who we are
  #expertise                   What we specialise in
  #products                    the two products, linking out
  #team                        the people
/products/tcg-engine/        Product 01 — what it is, what runs on it, edge
/products/price-monitoring/  Product 02 — what it does, price history, movers
```

**The site is deliberately shallow.** It exists to tell someone what JellyTek
does and get them into a demo — not to explain the technology. Depth lives in
the live demo presentation. When adding anything here, the test is: *does a
stranger need this to decide whether to book a call?* If not, it belongs in the
deck.

That is why there is no pipeline walkthrough, no partner wall, and no
monitoring/alerting deep-dive — all three were built and then removed on
purpose. Don't re-add them without a reason.

`<body data-page="home|engine|prices">` ties a page to its schema in
`js/schema.js` and its slice of `content.js`. Paths are root-relative
(`/css/style.css`) so the nested product pages resolve the same as the root.

The home hero is framed as a **camera viewfinder** (`.vf`) — corner brackets,
hairlines, and a zoom scale along the bottom. It states the product visually:
the page is what the engine sees when you point it at something.

The frame is inert (`pointer-events: none`, decorative parts `aria-hidden`) with
one exception: the **zoom scale is a real control**. Drag the marker, or use the
arrow keys / Home / End / Escape, and it drives `window.JT_CAM.zoom`, which
`js/jellyfish.js` eases toward so the school grows and shrinks like a lens
moving. Because it is focusable it must *not* sit inside an `aria-hidden`
subtree — that is why `.vf` itself is not hidden and its inert children are
marked individually. It hides below 720px.

The jellyfish canvas lives on the **home page only** — it is the company's
signature, and keeping it off the product pages is what makes them read as
products rather than as more brand site. There it is a **fixed, full-viewport
layer behind every section**, which is why the section fills carry alpha
(`rgba(var(--surface-alt-rgb), 0.86)` and friends) — an opaque section would
hide the school completely.

## Design

[`DESIGN.md`](DESIGN.md) is the spec — palette, type scale, component states,
motion tier, responsive rules, and the do's/don'ts. **Read it before changing
anything visual.** The short version:

- Dark technical on a visible engineering grid. Deep-indigo ground (`#1C2359`),
  white ink, one turquoise accent (`#40E0D0`).
- Inter Tight for display (tight negative tracking), Fragment Mono for all
  metadata — ruler ticks, indices, filenames, spec values.
- Zero border-radius on structural elements. Grids separate with 1px hairline
  seams, not whitespace gutters.
- Interaction tier L2: scroll reveals, sticky nav, parallax. CSS + vanilla JS
  only — adding a framework or a CDN script is out of scope by design.

### Charts

The price charts are hand-built inline SVG (no library — the CSP forbids one,
and there is no build step). Their colours were **computed, not chosen**,
against the data-viz six-checks: OKLCH lightness band, chroma floor, WCAG
contrast vs the surface, and OKLab ΔE separation under simulated
protanopia/deuteranopia, all pairs, on all three surfaces.

The dark theme was re-validated from scratch rather than flipped. Two findings
worth keeping:

- The obvious "up" green (`#5BE3A8`) sat **ΔE 5.8 from the turquoise series
  under normal vision** — two marks on the same page that most readers could not
  tell apart. Re-stepping to lime **`#A3E635`** clears every pair (17.5 vs the
  series, 18.9 vs down under deuteranopia).
- `--viz-up` and `--accent` are deliberately **above** the dark-mode lightness
  band (L 0.85 / 0.82 vs a 0.67 ceiling). That band exists to keep a multi-series
  categorical palette mutually consistent; here there are three marks that never
  share a chart, every pair separation passes with a wide margin, and contrast is
  8.4–11.6:1. Dropping them into the band would kill the glow the design is built
  on. Deliberate, and noted so nobody "fixes" it.

Direction is still carried by a **▲/▼ glyph and the signed number**, never by
colour alone, so the movers table reads the same in greyscale or to a
colourblind reader. Keep it that way if you touch it.

## Editing the site

Append **`?edit`** to any of the three pages — `/?edit`,
`/products/tcg-engine/?edit`, `/products/price-monitoring/?edit`. Each page
edits its own content; the draft and the published slice are per page, so
editing one can never blank out another. **Design is site-wide**: change the
accent on any page and all three follow.

**Hover any block on the page** — a section, an app tile, a spec row, an APK
row — and its own toolbar appears: **↑ move up · ↓ move down · 🗑 delete**.
Sections also get a ⠿ grip to drag. A deleted block flashes an *Undo* toast,
and everything you delete is listed under **Deleted** in the Content tab with a
Restore button, so nothing is ever actually lost.

The panel has four tabs:

| Tab | What it does |
|-----|--------------|
| **Content** | Click any outlined text and type over it — Enter makes a line break. Checkboxes and drag handles for every section and row, plus the **Deleted** list. |
| **Design** | Palette presets and a picker for each colour token, the display and mono typefaces, and sliders for headline size, tracking, section rhythm and page margins. Applies live. |
| **Layout** | Section order, each section's background (light / tint / dark / brand) and layout preset, and image uploads. |
| **Publish** | Commits to GitHub. |

**Nothing is lost.** Every change writes to a draft in your browser within half
a second, so you can close the tab mid-sentence and pick it up later. The draft
is yours alone — visitors keep seeing the published site until you publish.

**Publishing** commits `content.js` (and any uploaded images) to the repo via
the GitHub API, and Pages rebuilds — live in about a minute. It needs a
[fine-grained token](https://github.com/settings/personal-access-tokens/new)
with **Contents: read and write** on this one repository, pasted in once and
kept in that browser's local storage. Revoke it from GitHub at any time. If
you'd rather not use a token at all, *Download content.js instead* still works —
drop the file in the repo and push.

### What the editor can and can't do

It can rewrite every string, retheme the whole site, reorder and hide things,
switch layouts, and swap any drawn diagram for a real screenshot.

It **cannot add new tiles, rows or sections** — that is still markup. Add the
element to `index.html` and it becomes editable, movable and deletable
automatically, as long as it sits inside a group container listed in
`js/hydrate.js`.

**Delete removes a block from the live site but does not rewrite `index.html`.**
The block is recorded in `hidden` and stops rendering for everyone; the markup
stays in the file so you can restore it later. If you want something gone from
the source for good, delete it from `index.html` by hand.

The data tags in section 04 are panel-only — their editable text *is* the chip
itself, so a toolbar inside one would end up inside the text being saved.

Layout is deliberately **preset-based rather than freeform**: you choose from
arrangements that hold together, instead of dragging elements to arbitrary
coordinates. Freeform positioning would mean maintaining a second layout for
mobile and would drift the moment text got longer than planned.

### Editing the file directly

`content.js` is a plain, commented config and hand-editing it is equally valid —
change a value and reload.

```js
text:     { "hero.lede": "…" },        // "\n" is a line break
hidden:   ["data", "apps.tiles.2"],    // hide section 04 and the 3rd tile
sections: ["marquee", "apps", "engine", "edge", "data", "team", "demo"],
bg:       { "engine": "dark" },        // light · tint · dark · brand
layout:   { "apps": "4up" },           // bento · 2up · 3up · 4up · stack
images:   { "apps.1": "assets/uploads/shot.png" },
theme:    { colors: { accent: "#E8442E" }, fonts: { display: "Space Grotesk" } },
```

Two rules worth remembering:

- Row indices are **0-based and count from the order in `index.html`**, never
  from what's currently on screen. That is what makes a saved reorder stable
  across reloads instead of re-permuting itself each time.
- `index.html` keeps its own copy of the copy as the no-JS/crawler fallback;
  `content.js` wins wherever it defines something. Delete `content.js` and the
  page falls back cleanly.

To make something editable that isn't yet, add one line to `FIELDS` in
[`js/hydrate.js`](js/hydrate.js) — a key and a CSS selector. No markup change is
needed unless the text sits beside an icon, in which case wrap the words in
`<span class="t">` so a keystroke can't eat the icon.

## Layout

```
index.html                          home — the company
products/tcg-engine/index.html      product 01
products/price-monitoring/index.html product 02
privacy.html        Cards and Friends privacy policy (fixed copy, not in the editor)
css/style.css       the whole design system; every colour is a :root token
content.js          all three pages' text + site-wide theme — the file you edit
js/schema.js        what is editable on each page (key → CSS selector)
css/edit.css        editor chrome; loaded only on ?edit
js/boot.js          sets html.js before first paint (gates scroll-reveal CSS)
js/hydrate.js       design tokens + applies content.js onto the page
js/edit.js          the ?edit editor: click-to-type, design, drag, publish
js/jellyfish.js     the canvas simulation — light-mode renderer, hero-bounded
js/site.js          reveals, nav state, engine stepper, spotlight, counters
js/version.js       footer commit hash, via the GitHub API
fonts/*.woff2       7 self-hosted faces, latin subset (~180KB; only
                    the selected one is ever fetched)
assets/uploads/     images added through the editor
```

### The jellyfish

`js/jellyfish.js` is the signature element and the one thing on the page that
can cost frames. Three rules when touching it:

1. **It is fixed to the whole viewport**, behind every section, and takes
   `pointer-events: none`. Window-level listeners feed it instead, so a jelly
   drifting over a button never swallows the click.
2. **It pauses in a background tab** (`visibilitychange`). Since the canvas is
   always on screen there is nothing else to pause against — do not remove that
   check, it is the only guard left.
3. **It draws with `multiply`, not `lighter`.** The original renderer was
   additive, which only reads against black. Every colour comes from the
   `PALETTE` object at the top of the file — tuned for an off-white ground.

Under `prefers-reduced-motion` it settles the school and paints a single frame.

Poke a jelly five times inside two seconds and it bursts, then regrows. The
three are named after the team; their names show while the pointer is in the
water. Nothing on the page announces either.

The wordmark is **not** tinted by passing jellies — that easter egg was removed
deliberately, so the logo always reads white. Don't reintroduce it.

### Content security

The CSP is strict (`default-src 'self'`), which has one consequence worth
knowing: **`style="…"` attributes are blocked.** Anything positional — ruler
columns, callout anchors — must be a CSS class, not an inline style. Setting
`element.style.x` from JS is fine; CSP only blocks style attributes in markup.

## Local dev

```sh
python3 -m http.server 3100
# → http://localhost:3100
```

Edit and refresh. No watcher, no build.

## Deploy

Push to `main`. GitHub Pages serves the repo root (`.nojekyll` disables the
Jekyll pipeline, `CNAME` pins the custom domain).

One-time setup on GitHub:
1. Repo → Settings → Pages → Source: **Deploy from a branch**, branch `main`, folder `/ (root)`.
2. Custom domain: `jellytek.net` (pre-filled from the CNAME file) → wait for the
   DNS check → tick **Enforce HTTPS**.

DNS at the registrar for jellytek.net:

| Type  | Name | Value                                        |
|-------|------|----------------------------------------------|
| A     | @    | 185.199.108.153                              |
| A     | @    | 185.199.109.153                              |
| A     | @    | 185.199.110.153                              |
| A     | @    | 185.199.111.153                              |
| CNAME | www  | shmukaduk.github.io                          |
