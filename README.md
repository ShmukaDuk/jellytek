# jellytek.net

The JellyTek site, the simple version: one page that says who we are and shows
the two products, plus the Cards and Friends privacy policy. Static — no build
step, no dependencies, no framework. Hosted on GitHub Pages behind GitHub's
Fastly CDN.

## Structure

```
/                 Name & logo → the three of us → one picture → the two
                  products (Cards & Friends, TCG Stream Tool) → contact
/privacy.html     Cards and Friends privacy policy (linked from the app
                  stores — keep this URL stable)
/projects/        standalone project pages (own CSS, independent of the site)
```

The two products are real and live elsewhere:

- **Cards & Friends** — `cards/apps/mobile/cards_and_friends` (free mobile
  app: on-device card recognition, offline-first collection, chat).
- **TCG Stream Tool** — `cards/apps/computer/tcg_stream_tool` (paid streamer
  tool: live card recognition + prices on stream, OBS overlay).

When editing the product cards, the test is: *would a collector or a streamer
understand the product from five bullets?* Anything deeper belongs in the apps
themselves.

## The jellyfish

`js/jellyfish.js` draws the school that swims behind the page — dependency-free
canvas 2D, lit additively for the dark indigo ground (`--bg` in
`css/style.css`). It pauses in background tabs and renders a single frame under
`prefers-reduced-motion`. It is the only script on the site.

## History

The previous site was a three-page "Instrument Grade" design with an in-page
content editor (`?edit`), product subpages, and a schema/hydrate content layer.
It was deliberately replaced with this single page; the whole system is in git
history before this commit if anything needs digging up (see `DESIGN.md` and
`README.md` there).

## Deploy

Push to `main`. GitHub Pages serves the repo root (`.nojekyll` disables the
Jekyll pipeline, `CNAME` pins the custom domain).
