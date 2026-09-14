# DESIGN.md

> A technical drawing that happens to be a website — hairline grid, ruler marks, one turquoise, and a soft-bodied thing glowing through the middle of it.

---

## 1. Visual Theme & Atmosphere

**Style**: Instrument Grade — Dark Technical, built on a visible engineering grid.

**Keywords**: hairline, ruler-marked, tight-tracked, clinical, weightless, annotated, measured, bioluminescent

**Tone**: precise, confident, quietly technical, hardware-adjacent — NOT playful, NOT gradient-soaked, NOT startup-generic, NOT dark-mode-cyber

**Feel**: an engineer's drafting sheet read on a backlit screen at night. Everything is squared to a grid you can actually see; the only living thing on the page is the jellyfish, and it *glows* over the grid rather than disturbing it.

**The brand tension** — "soft body. hard tech." — is the whole design system in four words. The page is hard: rigid columns, ruler ticks, monospace annotations, zero border radius on structural elements. The jellyfish is soft: translucent, wobbling, pointer-aware. Neither one wins. Do not soften the grid to match the jellyfish, and do not stiffen the jellyfish to match the grid.

**Content posture**: say the least that still earns a meeting. The site is a
door, not a manual — the demo does the explaining. A section that teaches rather
than tells is the wrong section.

**Interaction Tier**: **L2 — flowing scroll**
**Dependencies**: **CSS + vanilla JS only.** No GSAP, no Lenis, no framework, no build step. The site is served straight off GitHub Pages under a strict CSP; every byte is first-party except the two webfonts.

---

## 2. Color Palette & Roles

Deep indigo ground with a turquoise accent. Every text and mark value below was **measured, not chosen** — contrast ratios are stated inline, and the three data-viz marks were validated with OKLab ΔE under simulated protanopia and deuteranopia (see §Charts in README.md). The three jelly hues are the brand trio (james / tess / johnny) and appear only inside the canvas.

```css
:root {
  /* ── Backgrounds ─────────────────────────────────────────────── */
  --bg:            #1C2359;   /* page ground — deep indigo */
  --surface:       #161C49;   /* cards, panels */
  --surface-alt:   #1A2154;   /* alternating sections */
  --surface-hover: #1E2660;   /* card hover — lifts toward the light */
  --surface-ink:   #0E1236;   /* deepest panels: footer band, contact */
  --surface-deep:  #2A2F7A;   /* brand panel */

  /* ── Borders ─────────────────────────────────────────────────── */
  --border:        #2C3472;
  --border-strong: #3E4794;
  --border-hover:  #40E0D0;
  --grid-line:     #262D68;   /* the page-wide column rulers */

  /* ── Text (measured against --bg) ────────────────────────────── */
  --text:            #FFFFFF;  /* 14.6:1 */
  --text-secondary:  #B6BCE4;  /*  7.9:1 */
  --text-tertiary:   #9096C4;  /*  5.1:1 — clears AA at label sizes */
  --text-on-ink:     #FFFFFF;
  --text-on-ink-dim: #9AA1D0;

  /* ── Accent ──────────────────────────────────────────────────── */
  --accent:        #40E0D0;   /* turquoise — 8.9:1 on the ground */
  --accent-hover:  #6BEDE0;
  --accent-soft:   #1B3D5C;   /* deep teal fill; accent on it is 6.9:1 */
  --accent-wash:   #1F2A63;

  /* ── Data viz (validated, see §Charts) ───────────────────────── */
  --viz-series:    var(--accent);
  --viz-up:        #A3E635;
  --viz-down:      #EF5A5A;

  /* ── Jelly trio (canvas + logo tint only) ────────────────────── */
  --jelly-james:   #3FC98D;
  --jelly-tess:    #F0559B;
  --jelly-johnny:  #4A8CF7;

  /* ── Semantic ────────────────────────────────────────────────── */
  --success:       #A3E635;
  --error:         #EF5A5A;
  --warning:       #F0B429;
}
```

**Color Rules:**
- Every colour in CSS references a variable. **Zero hardcoded hex outside this `:root` block.** The one sanctioned exception is `js/jellyfish.js`, which computes `hsl()` per-frame from a hue float — it reads its palette constants from a single `PALETTE` object at the top of the file.
- **One accent, one page.** `--accent` (turquoise) is the only chromatic colour in the layout layer. The jelly hues exist *only* inside the canvas and the logo tint; the lime and coral exist *only* as data-viz status. Never introduce a second UI accent.
- **Never paint text with a border token.** `--border-strong` is 1.8:1 on the ground — it is an edge, not a colour. This rule exists because three elements broke it during the dark conversion.
- **A button is dark ink on turquoise, never white.** White on `--accent` is 1.6:1; `--surface-ink` on it is 11:1.
- **Colour never carries meaning alone.** The blue annotation dots are decorative; anything load-bearing gets a label.
- The deepest panels (`--surface-ink`, `--surface-deep`) are used **at most twice** per page — the engine block and the contact band. More than that and the depth ordering stops meaning anything.
- Hairlines are `--border` at exactly `1px`, never `2px`, never a shadow pretending to be a border.
- **Depth comes from a lighter edge and a soft accent glow, not a drop shadow.** A black shadow on a dark ground is invisible; `--shadow-elevated` carries a `1px` accent-tinted ring for exactly this reason.

---

## 3. Typography Rules

**Font Stack:**

```css
@import url('https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700;800&family=Fragment+Mono:ital@0;1&display=swap');
```

Self-hosting is preferred where possible (`fonts/*.woff2` + `@font-face`, `font-display: swap`) so the strict CSP needs no third-party origin. If self-hosted, the CSP stays `style-src 'self'; font-src 'self'`. If the CDN is used, CSP must add `https://fonts.googleapis.com` to `style-src` and `https://fonts.gstatic.com` to `font-src`.

```css
--font-display: 'Inter Tight', 'Helvetica Neue', Helvetica, Arial, sans-serif;
--font-body:    'Inter Tight', 'Helvetica Neue', Helvetica, Arial, sans-serif;
--font-mono:    'Fragment Mono', ui-monospace, 'SF Mono', Menlo, monospace;
```

| Role | Font | Size | Weight | Line Height | Letter Spacing |
|------|------|------|--------|-------------|----------------|
| Hero H1 | Inter Tight | `clamp(4rem, 13vw, 12.5rem)` | 800 | 0.82 | `-0.055em` |
| Section H2 | Inter Tight | `clamp(2rem, 5vw, 3.75rem)` | 700 | 0.95 | `-0.04em` |
| Statement H2 (marquee) | Inter Tight | `clamp(3rem, 9vw, 8rem)` | 800 | 1 | `-0.05em` |
| H3 / card title | Inter Tight | `1.375rem` | 600 | 1.2 | `-0.02em` |
| Stat numeral | Inter Tight | `clamp(3rem, 7vw, 5.5rem)` | 700 | 1 | `-0.04em` |
| Body | Inter Tight | `1rem` | 400 | 1.65 | `0` |
| Body large (hero ¶) | Inter Tight | `1.0625rem` | 400 | 1.6 | `0` |
| Body small | Inter Tight | `0.875rem` | 400 | 1.6 | `0` |
| Label / eyebrow | Fragment Mono | `0.6875rem` | 400 | 1.4 | `0.18em`, UPPERCASE |
| Ruler tick | Fragment Mono | `0.625rem` | 400 | 1 | `0.08em` |
| Index numeral (01–08) | Fragment Mono | `0.75rem` | 400 | 1 | `0.1em` |
| Code / filename | Fragment Mono | `0.8125rem` | 400 | 1.5 | `0` |

**Typography Rules:**
- Display type gets **negative tracking, always**. At `clamp(...)` sizes above 4rem the letters must nearly touch — `-0.05em` minimum. This is the single most important detail separating this look from generic SaaS.
- Headlines are **lowercase-free**: hero and statement headlines set in UPPERCASE; section H2s in sentence case. Never Title Case.
- **Monospace is for metadata only** — eyebrows, ruler ticks, indices, filenames, spec values. Never a paragraph, never a headline.
- Body copy is `--text-secondary`, not `--text`. Only headlines and numerals earn full-strength ink. The reference's calm comes from body copy being *quieter* than you think is correct.
- Paragraph measure caps at `58ch`. Hero paragraph caps at `34ch` so it sits as a tight block, matching the reference.
- **NEVER use**: Poppins, Montserrat, Raleway, Lato, Open Sans, Roboto, system-ui as a display face, any serif, any script face, variable-width "techy" faces (Orbitron, Rajdhani, Michroma).

**Text Decoration** (per decision table, style = Minimal Pure):
- Hero H1 gradient: **No.** Gradient text would destroy the clinical restraint. The hero wordmark is flat `--text` and stays white — nothing recolours it.
- Hero H1 shadow: **No.**
- Section H2 gradient / shadow: **No.**
- Body paragraph decoration: **No.**
- **Sanctioned decoration, the only one**: labels and eyebrows (Fragment Mono, `letter-spacing: 0.18em`) may take a `border-bottom: 1px solid var(--accent)` or a leading `4px` accent square. That is the entire decorative vocabulary.

---

## 4. Component Stylings

### Buttons

```css
.btn {
  --btn-bg: var(--accent);
  --btn-fg: #FFFFFF;
  display: inline-flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.875rem 1.5rem;
  min-height: 44px;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--btn-fg);
  background: var(--btn-bg);
  border: 1px solid var(--btn-bg);
  border-radius: 0;                      /* structural elements are square */
  cursor: pointer;
  text-decoration: none;
  transition: background 0.25s cubic-bezier(0.4, 0, 0.2, 1),
              border-color 0.25s cubic-bezier(0.4, 0, 0.2, 1),
              color 0.25s cubic-bezier(0.4, 0, 0.2, 1),
              transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.btn:hover  { --btn-bg: var(--accent-hover); }
.btn:active { transform: translateY(1px) scale(0.99); transition-duration: 0.06s; }
.btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}
.btn[disabled], .btn[aria-disabled="true"] {
  --btn-bg: var(--surface-alt);
  --btn-fg: var(--text-tertiary);
  border-color: var(--border);
  cursor: not-allowed;
  pointer-events: none;
}

/* Ghost variant — hairline box, fills on hover */
.btn--ghost {
  --btn-bg: transparent;
  --btn-fg: var(--text);
  border-color: var(--border-strong);
}
.btn--ghost:hover {
  --btn-bg: var(--text);
  --btn-fg: var(--bg);
  border-color: var(--text);
}

/* the arrow slides on hover — the one flourish buttons get */
.btn .btn__arrow { transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1); }
.btn:hover .btn__arrow { transform: translateX(4px); }
```

### Cards

```css
.card {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 2rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 0;
  transition: border-color 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              box-shadow 0.4s cubic-bezier(0.16, 1, 0.3, 1),
              transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.card:hover {
  border-color: var(--border-hover);
  box-shadow: var(--shadow-elevated);
  transform: translateY(-4px);
}
.card:focus-within {
  border-color: var(--accent);
  box-shadow: var(--shadow-elevated);
}

/* the blue annotation dot — the reference's signature callout marker.
   sits in the corner, blooms a soft ring on hover */
.card__dot {
  position: absolute;
  top: 1.25rem; right: 1.25rem;
  width: 8px; height: 8px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 0 0 rgba(var(--accent-rgb), 0.28);
  transition: box-shadow 0.45s cubic-bezier(0.16, 1, 0.3, 1);
}
.card:hover .card__dot { box-shadow: 0 0 0 7px rgba(var(--accent-rgb), 0.14); }

/* index numeral, top-left, monospace */
.card__index {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  letter-spacing: 0.1em;
  color: var(--accent);
}
.card__title { font-size: 1.375rem; font-weight: 600; letter-spacing: -0.02em; color: var(--text); }
.card__meta  { font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-tertiary); }
```

### Navigation

```css
.nav {
  position: fixed;
  inset: 0 0 auto 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2rem;
  padding: 1.125rem var(--gutter);
  background: transparent;
  border-bottom: 1px solid transparent;
  transition: background 0.35s cubic-bezier(0.4, 0, 0.2, 1),
              border-color 0.35s cubic-bezier(0.4, 0, 0.2, 1),
              padding 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}
.nav.is-scrolled {
  background: rgba(var(--bg-rgb), 0.82);
  backdrop-filter: blur(12px) saturate(1.4);
  -webkit-backdrop-filter: blur(12px) saturate(1.4);
  border-bottom-color: var(--border);
  padding-block: 0.75rem;
}
.nav__link {
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--text-tertiary);
  text-decoration: none;
  padding: 0.5rem 0;
  transition: color 0.25s ease;
}
.nav__link:hover,
.nav__link.is-active { color: var(--text); }
.nav__link:focus-visible { outline: 2px solid var(--accent); outline-offset: 4px; }
/* active section marker */
.nav__link.is-active::before { content: "◆ "; color: var(--accent); }
```

### Links

```css
.link {
  position: relative;
  color: var(--text);
  text-decoration: none;
  background-image: linear-gradient(var(--accent), var(--accent));
  background-repeat: no-repeat;
  background-position: 0 100%;
  background-size: 0% 1px;
  transition: background-size 0.4s cubic-bezier(0.16, 1, 0.3, 1), color 0.25s ease;
}
.link:hover { background-size: 100% 1px; color: var(--accent); }
.link:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; background-size: 100% 1px; }
.link:active { color: var(--accent-hover); }
```

### Tags / Badges

```css
.tag {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.3125rem 0.625rem;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  letter-spacing: 0.08em;
  color: var(--text-secondary);
  background: var(--surface-alt);
  border: 1px solid var(--border);
  transition: background 0.25s ease, color 0.25s ease, border-color 0.25s ease;
}
.tag:hover { background: var(--accent-wash); border-color: var(--border-hover); color: var(--accent); }

/* status chip with live pulse */
.chip--live { background: transparent; border-color: var(--border); }
.chip--live .pulse {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--success);
  animation: pulse 2.4s ease-in-out infinite;
}
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
```

### Download row (APK demos)

```css
.dl {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 1.25rem;
  padding: 1.25rem 1.5rem;
  min-height: 44px;
  background: var(--surface);
  border: 1px solid transparent;
  text-decoration: none;
  transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.3s ease;
}
.dl:hover       { transform: translateX(6px); border-color: var(--accent); }
.dl:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.dl:active      { transform: translateX(6px) scale(0.995); }
.dl__badge {
  font-family: var(--font-mono); font-size: 0.6875rem; letter-spacing: 0.14em;
  color: var(--accent); background: var(--accent-soft);
  padding: 0.4375rem 0.625rem;
}
.dl__name { font-family: var(--font-mono); font-size: 0.9375rem; color: var(--text); }
.dl__note { font-size: 0.8125rem; color: var(--text-tertiary); }
```

### Ruler / grid overlay

```css
/* the signature: vertical hairlines running the full page, with px ticks
   labelled in the hero. purely decorative, aria-hidden, pointer-events:none */
.rulers {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}
.rulers__line {
  position: absolute;
  top: 0; bottom: 0;
  width: 1px;
  background: var(--grid-line);
  transform: scaleY(0);
  transform-origin: top;
  transition: transform 1.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.rulers.in-view .rulers__line { transform: scaleY(1); }
.rulers__line:nth-child(2) { transition-delay: 0.08s; }
.rulers__line:nth-child(3) { transition-delay: 0.16s; }
.rulers__line:nth-child(4) { transition-delay: 0.24s; }
.rulers__tick {
  position: absolute;
  top: 0.5rem;
  transform: translateX(0.5rem);
  font-family: var(--font-mono);
  font-size: 0.625rem;
  letter-spacing: 0.08em;
  color: var(--text-tertiary);
}
```

### Annotation callout (hero canvas labels)

```css
.callout {
  position: absolute;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--font-mono);
  font-size: 0.625rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}
.callout__dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 0 5px rgba(var(--accent-rgb), 0.12);
  animation: calloutBreathe 3.2s ease-in-out infinite;
}
@keyframes calloutBreathe {
  50% { box-shadow: 0 0 0 9px rgba(var(--accent-rgb), 0.06); }
}
```

---

## 5. Layout Principles

**Container:**
- Max width: `1440px` (wide — the reference runs edge-heavy, not boxed at 1200)
- Gutter: `--gutter: clamp(1.25rem, 5vw, 5rem)`
- Narrow variant (text-heavy blocks): `680px`
- Hero paragraph block: `34ch`

**Spacing Scale** (8px base, matching the reference's extracted 4/10/20/25/40/120 rhythm):

```css
--s-1: 0.25rem;   /*  4px */
--s-2: 0.5rem;    /*  8px */
--s-3: 0.75rem;   /* 12px */
--s-4: 1rem;      /* 16px */
--s-5: 1.5rem;    /* 24px */
--s-6: 2rem;      /* 32px */
--s-7: 2.5rem;    /* 40px */
--s-8: 4rem;      /* 64px */
--s-9: 6rem;      /* 96px */
--s-10: 7.5rem;   /* 120px */
```

- Section padding-block: `clamp(5rem, 11vw, 9.5rem)`
- Component gap: `var(--s-6)`
- Card internal padding: `var(--s-6)`
- Nothing between sections but a `1px solid var(--border)` rule — no big coloured dividers.

**Grid:**

```css
.container {
  width: 100%;
  max-width: 1440px;
  margin-inline: auto;
  padding-inline: var(--gutter);
}

/* the 12-column skeleton everything snaps to */
.grid12 {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: var(--s-5);
}

/* hero: headline block left, canvas right — the reference's split */
.hero__layout {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
  gap: var(--s-8);
  align-items: center;
}

/* products: deliberately unequal bento, never 4 identical boxes */
.bento {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  grid-auto-rows: minmax(180px, auto);
  gap: 1px;                      /* hairline seams, not gaps */
  background: var(--border);     /* the seam colour shows through */
  border: 1px solid var(--border);
}
.bento > * { background: var(--surface); }
.bento__a { grid-column: span 4; grid-row: span 2; }  /* collectathon — hero tile */
.bento__b { grid-column: span 2; }                    /* price check */
.bento__c { grid-column: span 2; }                    /* streamer overlay */
.bento__d { grid-column: span 6; }                    /* community app — full width */
```

**Layout rules:**
- **Zero border-radius on structural elements** — sections, cards, buttons, inputs, bento tiles. Radius is reserved for dots, pills and the phone-frame stand-ins (`22px`, matching a real handset).
- Grids separate with `1px` seams (`gap: 1px` over a `--border` background), not whitespace gutters. This is what makes it read as a technical drawing.
- Sections carry a monospace index (`01` … `08`) in the top-left of the container, hanging outside the text column on desktop.
- Generous vertical air. When in doubt, add whitespace rather than a divider.

---

## 6. Depth & Elevation

Light editorial: depth comes from **hairlines first, shadow second**. Shadows are near-invisible and multi-layered (copied in spirit from the reference's extracted three-stop shadow).

```css
--shadow-subtle:   0 1px 2px rgba(var(--ink-rgb), 0.04);
--shadow-elevated: 0 0.6px 0.6px -1.25px rgba(var(--ink-rgb), 0.06),
                   0 2.3px 2.3px -2.5px  rgba(var(--ink-rgb), 0.06),
                   0 10px 10px -3.75px   rgba(var(--ink-rgb), 0.03);
--shadow-float:    0 2px 4px -2px rgba(var(--ink-rgb), 0.06),
                   0 12px 28px -8px rgba(var(--ink-rgb), 0.10);
```

| Level | Treatment | Use |
|-------|-----------|-----|
| Flat | `border: 1px solid var(--border)`, no shadow | Default for every card, tile, panel, section |
| Subtle | `--shadow-subtle` | Sticky nav once scrolled |
| Elevated | `--shadow-elevated` + `translateY(-4px)` | Card / bento tile hover |
| Float | `--shadow-float` | Phone-frame stand-ins, the one floating spec panel |
| Inverted | `--surface-ink` / `--surface-deep` fill, no shadow | Engine block, demos/CTA band — depth by value, not shadow |

Rules:
- Never stack a shadow on an un-hovered element. Rest state is flat.
- Never use a shadow to fake a border.
- `backdrop-filter` appears exactly once (the scrolled nav) at `12px`, well under the 14px ceiling.

---

## 7. Animation & Interaction

**Motion Philosophy**: Nothing moves that wasn't asked to. Scroll reveals are short-throw and fast; the only continuous motion on the page is the jellyfish and one marquee. Everything animates `opacity`, `transform` or `clip-path` — never `width`, `height`, `top` or `filter` on a moving element.

**Tier**: **L2**

### Dependencies

```html
<!-- none. vanilla JS + CSS. -->
```

### Base Setup

```js
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* one shared observer for every reveal on the page */
function initReveal(selector = '.reveal', cls = 'in-view') {
  if (reduced) {
    document.querySelectorAll(selector).forEach(el => el.classList.add(cls));
    return;
  }
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add(cls);
      obs.unobserve(e.target);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll(selector).forEach(el => obs.observe(el));
}
```

```css
html { scroll-behavior: smooth; }
[id] { scroll-margin-top: 88px; }
```

### Entrance Animation — Hero (SplitText-style, CSS only)

The hero wordmark and eyebrow rise from behind a mask on load. Word-level, not character-level — character-level on a huge wordmark reads as fussy.

```css
@keyframes maskUp {
  from { transform: translateY(110%); }
  to   { transform: translateY(0); }
}
.mask { overflow: hidden; display: block; }
.mask > * {
  display: block;
  transform: translateY(110%);
  animation: maskUp 1.05s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
.hero__eyebrow .mask > * { animation-delay: 0.15s; }
.hero__mark    .mask > * { animation-delay: 0.28s; }
.hero__body            { opacity: 0; animation: fadeInUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.6s forwards; }
.hero__callouts        { opacity: 0; animation: fadeIn   0.9s ease 1.1s forwards; }

@keyframes fadeInUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: none; } }
@keyframes fadeIn   { to { opacity: 1; } }
```

### Scroll Behavior

```css
/* Section H2 — ScrollFloat */
.reveal {
  opacity: 0;
  transform: translateY(26px);
  transition: opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1),
              transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
}
.reveal.in-view { opacity: 1; transform: none; }

/* Body / list — ScrollReveal with stagger, delay set in JS so it's unbounded */
.stagger > * {
  opacity: 0;
  transform: translateY(18px);
  transition: opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1),
              transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}
.stagger.in-view > * { opacity: 1; transform: none; }
```

```js
/* stagger delays — capped so a long list never crawls */
function initStagger(sel = '.stagger') {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      [...e.target.children].forEach((c, i) => {
        c.style.transitionDelay = `${Math.min(i * 0.07, 0.5)}s`;
      });
      e.target.classList.add('in-view');
      obs.unobserve(e.target);
    });
  }, { threshold: 0.15 });
  document.querySelectorAll(sel).forEach(el => obs.observe(el));
}

/* nav scrolled state + active section — one rAF-throttled scroll listener */
let ticking = false;
addEventListener('scroll', () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    nav.classList.toggle('is-scrolled', scrollY > 40);
    progress.style.transform =
      `scaleX(${scrollY / (document.body.scrollHeight - innerHeight)})`;
    ticking = false;
  });
}, { passive: true });
```

**Parallax** — hero canvas drifts at 0.18× scroll, CSS scroll-driven where supported, JS fallback:

```css
@supports (animation-timeline: scroll()) {
  .hero__canvas-wrap {
    animation: heroDrift linear both;
    animation-timeline: scroll();
    animation-range: 0 100vh;
  }
  @keyframes heroDrift { to { transform: translateY(-54px); } }
}
```

### Hover & Focus States

Covered per-component in §4. Global rules:
- Every interactive element has **both** `:hover` and `:focus-visible`. Focus ring is `2px solid var(--accent)` at `outline-offset: 3px`, never removed.
- Transitions are `0.25s` for colour, `0.35–0.4s` for transform, easing `cubic-bezier(0.16, 1, 0.3, 1)` (expo-out) for movement and `cubic-bezier(0.4, 0, 0.2, 1)` for colour.
- Touch devices get no hover-dependent content — `@media (hover: hover)` guards anything that only appears on hover.

### Special Effects

**1. The jellyfish canvas — light-mode retune (Background / ambient layer).**
The existing `js/jellyfish.js` simulation is kept: Verlet tentacles, pulsing bells, pointer steering, the james / tess / johnny trio, the poke-five-times-to-burst easter egg. The renderer is re-lit for an off-white ground:

- `globalCompositeOperation` flips from `"lighter"` (additive — only reads on black) to `"multiply"` for bells and tentacles, `"source-over"` for highlights.
- Bell fills drop from `hsla(h, 95%, 78%, 0.5)` to `hsla(h, 70%, 62%, 0.16)` — translucent ink on paper rather than glow in the dark.
- Plankton and caustics are removed; the light ground doesn't support them and they fight the grid.
- The canvas is **hero-bounded**, not fixed full-screen, and **pauses via IntersectionObserver** whenever the hero is off-viewport (the single most important performance guard on the page).
- `prefers-reduced-motion` renders one static frame and stops the loop.

**2. Statement marquee (first-scroll hook).** Pure CSS `translateX` on a duplicated track; `will-change: transform` on the track only.

```css
@keyframes marquee { to { transform: translateX(-50%); } }
.marquee__track {
  display: flex;
  width: max-content;
  animation: marquee 38s linear infinite;
}
.marquee:hover .marquee__track { animation-play-state: paused; }
```

**3. Engine pipeline stepper (interactive component).** Tracker → Extractor → Classifier. The active step advances on scroll position within the section and on click; the connecting line draws with `stroke-dashoffset`, and confidence bars fill with `transform: scaleX()`.

**4. Magnet CTA.** The primary CTA drifts up to 6px toward the pointer, rAF-throttled, `@media (hover: hover)` only.

**5. Counting stats.** `∞ / 1 / NPU` — the `1` counts up, the others fade; `IntersectionObserver`-triggered, once.

**6. 巧思 — the easter egg.** The three jellies are named after the team. Hovering the hero canvas reveals their names as annotation labels; poking one five times makes it burst and reform. Nothing announces this.

**Signature moment count**: hero mask-reveal + live canvas · marquee band · pipeline stepper · bento hover system · stat count-up · ruler lines drawing in = **6**. Every 1–2 screens has one.

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
  .mask > *, .hero__body, .hero__callouts { opacity: 1; transform: none; }
  .reveal, .stagger > * { opacity: 1; transform: none; }
  .marquee__track { animation: none; }
}
```
JS additionally checks `matchMedia('(prefers-reduced-motion: reduce)')` and: marks all reveals visible immediately, renders a single canvas frame, disables the magnet and parallax.

---

## 8. Do's and Don'ts

### Do
- Keep the grid **visible**. The vertical hairlines and px ruler ticks are the design — if they're removed, this is just another white landing page.
- Track display type tight and negative (`-0.04em` to `-0.055em`). Bigger type gets tighter tracking, always.
- Set body copy in `--text-secondary`; reserve full-strength `--text` for headlines and numerals.
- Use monospace as a *material* for metadata — indices, ruler ticks, filenames, spec values, eyebrows.
- Separate grid cells with `1px` hairline seams rather than whitespace gutters.
- Let the jellyfish be the only soft, unpredictable thing on the page, and give it room.
- Pause the canvas whenever it's off-screen, and render one frame under `prefers-reduced-motion`.
- Give every interactive element a visible `:focus-visible` ring at `2px solid var(--accent)`.
- Keep contrast above WCAG AA: `--text-secondary` on `--bg` is 7.0:1, `--text-tertiary` on `--bg` is 3.4:1 and is therefore **only** used at ≥11px monospace for non-essential metadata.

### Don't
- ❌ **Never round structural corners.** Cards, sections, buttons, tiles and inputs are square. Radius belongs to dots, pills and phone frames only.
- ❌ **Never add a second UI accent colour.** One royal blue. Green/pink/cyan live inside the canvas and nowhere else.
- ❌ **Never put gradient fill or text-shadow on a headline.** It destroys the clinical read this entire design depends on.
- ❌ **Never set a paragraph in monospace.** Metadata only.
- ❌ **Never use a drop shadow in a rest state** — flat plus a hairline is the default; shadow is a hover-only signal.
- ❌ **Never let the canvas run off-screen or on a reduced-motion device.** One unpaused `requestAnimationFrame` loop is the only thing on this page that can drop frames.
- ❌ **Never apply `filter: blur()` to a moving element**, and never put `backdrop-filter` on a large scrolling surface — the nav bar is the only permitted use, at 12px.
- ❌ **Never introduce a framework, bundler, or CDN script.** No React, no Tailwind CDN, no GSAP. The site must stay a no-build static deploy under a strict CSP.
- ❌ **Never use emoji as an icon.** Inline SVG only, `1.5px` stroke, `currentColor`, square caps to match the hairline language.
- ❌ **Never use a placeholder colour block for an image.** Missing imagery is drawn as real SVG/CSS (phone frames, detection boxes, confidence bars).
- ❌ **Never Title Case a headline**, and never set hero/statement headlines in anything but UPPERCASE.
- ❌ **Never let a section exceed one idea.** If a section needs two headlines, it's two sections.

---

## 9. Responsive Behavior

**Breakpoints:**

| Name | Width | Key Changes |
|------|-------|-------------|
| Wide | `> 1200px` | Full 12-col grid; hero split 1.05fr / 1fr; bento 4+2+2 / 6; 4 ruler lines; section indices hang outside the text column |
| Desktop | `1024–1200px` | Hero split holds, gutter tightens; section indices move inline above the H2 |
| Tablet | `720–1024px` | Hero stacks — headline block over canvas at `52vh`; bento collapses to 3+3 / 3+3; 3 ruler lines |
| Mobile | `< 720px` | Single column throughout; nav collapses to wordmark + hamburger sheet; bento becomes a 1-col hairline-separated stack; 2 ruler lines; canvas at `44vh`; marquee speeds up and shortens |

**Touch Targets:** minimum `44 × 44px` on every link, button, nav item, download row and stepper control. Nav links get vertical padding to reach it even though the text is 11px.

**Collapsing Strategy:**
- Ruler lines reduce in count rather than crowding — 4 → 3 → 2. The px tick labels hide below 720px.
- The hero canvas stays (it's the brand) but shrinks and drops to a lower particle/segment count on narrow viewports.
- Callout annotations hide below 900px — they need space to not overlap the jellyfish.
- The bento's unequal spans flatten to a stack; hairline seams become horizontal rules.
- The inverted engine block keeps its fill but loses the side-by-side diagram, stacking the three modules vertically with the connector line rotated.

```css
@media (max-width: 1024px) {
  .hero__layout { grid-template-columns: minmax(0, 1fr); gap: var(--s-7); }
  .hero__canvas-wrap { height: 52vh; }
  .bento__a, .bento__b, .bento__c, .bento__d { grid-column: span 3; grid-row: auto; }
  .rulers__line:nth-child(4) { display: none; }
  .section__index { position: static; margin-bottom: var(--s-3); }
}

@media (max-width: 900px) {
  .hero__callouts { display: none; }
}

@media (max-width: 720px) {
  :root { --gutter: 1.25rem; }
  .grid12 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .bento { grid-template-columns: minmax(0, 1fr); }
  .bento__a, .bento__b, .bento__c, .bento__d { grid-column: 1 / -1; }
  .hero__canvas-wrap { height: 44vh; }
  .rulers__line:nth-child(3) { display: none; }
  .rulers__tick { display: none; }
  .marquee__track { animation-duration: 22s; }
  .nav__links { display: none; }          /* → hamburger sheet */
  .nav__toggle { display: inline-flex; }
}

@media (hover: none) {
  .card:hover { transform: none; box-shadow: none; }   /* no hover-only affordances */
}
```

**Overflow guard:** every wide element (marquee, bento, pipeline diagram, confidence-bar row) sits in its own `overflow-x: auto` wrapper. `body` must never scroll horizontally at any width — verified at 320px.
