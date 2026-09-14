// jellytek — site content.
//
// Three pages, keyed the same way as <body data-page="…">:
//   home    the company
//   engine  Products → TCG Engine
//   prices  Products → Price History & Monitoring
//
// Edit here and reload, or open /?edit on any page and click it. Key → selector
// mappings live in js/schema.js. "\n" inside a string is a line break.
// `theme` is site-wide; everything else is per page.
window.JT_CONTENT = {

  pages: {

    /* ══════ HOME — the company ══════ */
    home: {
      text: {

        /* Navigation */
        "nav.company":    "Company",
        "nav.expertise":  "Expertise",
        "nav.products":   "Products",
        "nav.engineName": "TCG Engine",
        "nav.engineDesc": "recognition · extraction · classification",
        "nav.pricesName": "Price History & Monitoring",
        "nav.pricesDesc": "market data · alerts · analytics",
        "nav.cta":        "Request a demo",

        /* Hero */
        "hero.eyebrow":  "soft body. hard tech.",
        "hero.lede":     "Edge-native computer vision and market data for trading card games. Our models run on the device in front of you — no cloud round-trip.",
        "hero.tagline1": "soft body.",
        "hero.tagline2": "hard tech.",
        "hero.cta":      "See our products",
        "hero.cta2":     "Book a demo",
        "hero.callout1": "on-device",
        "hero.callout2": "poke me",
        "hero.foot":     "Computer vision · Market data · Edge deployment",
        "hero.scroll":   "Scroll",

        /* Who we are */
        "who.index":       "01 — Who we are",
        "who.title":       "A computer-vision company\nthat works on cards.",
        "who.lede":        "Small team, deep specialism.",
        "who.p1":          "We came out of automotive AI — cameras that have to work on every frame, in bad light, on a tiny power budget, without phoning home. We pointed that discipline at trading cards.",
        "who.visionLabel": "Our vision",
        "who.vision":      "Every card, on every device, recognised instantly and priced honestly — without sending a picture to somebody else's cloud.",

        /* Expertise */
        "spec.index":         "02 — Expertise",
        "spec.title":         "What we\nspecialise in.",
        "spec.lede":          "Four things, all pointed at the same problem.",
        "spec.items.0.n":     "01",
        "spec.items.0.title": "On-device card vision",
        "spec.items.0.text":  "Track, extract and classify every card in frame, in real time, on the device holding the camera.",
        "spec.items.1.n":     "02",
        "spec.items.1.title": "Embedded & NPU deployment",
        "spec.items.1.text":  "Built for mobile silicon and low-cost SoCs, not just a workstation GPU.",
        "spec.items.2.n":     "03",
        "spec.items.2.title": "Synthetic data pipelines",
        "spec.items.2.text":  "We generate the training set rather than annotate it.",
        "spec.items.3.n":     "04",
        "spec.items.3.title": "Market data & pricing",
        "spec.items.3.text":  "Pricing and history wired to the same recogniser that reads the card.",

        /* Products */
        "prod.index":         "03 — Products",
        "prod.title":         "Two products,\none foundation.",
        "prod.lede":          "A recognition engine, and the market data that sits on top of it.",
        "prod.items.0.n":     "01",
        "prod.items.0.title": "TCG Engine",
        "prod.items.0.text":  "Identifies trading cards from a live camera, entirely on-device. Everything else we build sits on it.",
        "prod.items.0.cta":   "Explore the engine",
        "prod.items.1.n":     "02",
        "prod.items.1.title": "Price History & Monitoring",
        "prod.items.1.text":  "What a card is worth, what it was worth, and the moment that changes.",
        "prod.items.1.cta":   "Explore price tooling",

        /* Team */
        "team.index":          "04 — Team",
        "team.title":          "The people\nbehind it.",
        "team.lede":           "Deep embedded machine-learning experience across the team.",
        "team.members.0.name": "johnny",
        "team.members.0.role": "CTO · Engine",
        "team.members.0.text": "Builds the engine — the runtime, the models, and everything that has to survive contact with real hardware.",
        "team.members.1.name": "tess",
        "team.members.1.role": "App Design",
        "team.members.1.text": "Designs the apps that sit on the engine, and the way people actually use them.",
        "team.members.2.name": "james",
        "team.members.2.role": "Business",
        "team.members.2.text": "Partnerships, customers, and getting the thing in front of the people who need it.",

        /* Demo + contact */
        "demo.index": "05 — Demo",
        "demo.title": "Let us show you\nthe real thing.",
        "demo.mail":  "marketing@jellytek.net",
        "demo.tel":   "0439 505 062",
        "demo.blurb": "The short version is on this page. We walk through the rest — live, on real cards — in a demo.",

        /* Footer */
        "foot.tag":       "soft body. hard tech.",
        "foot.chip":      "online — drifting in the current",
        "foot.copyright": "© 2026 jellytek.net",
        "foot.l1":        "TCG Engine",
        "foot.l2":        "Price monitoring",
        "foot.l3":        "Team",
        "foot.l4":        "Contact",
      },
      hidden: [],      // "team", "spec.items.2", … — deleted blocks
      sections: [],    // top-to-bottom order; empty = the order in the html
      order: {},       // row order within a group, as original positions
      bg: {},          // light · tint · dark · brand
      layout: {},      // per-section layout preset
      images: {},      // a real photo dropped into a drawn figure's slot
    },

    /* ══════ PRODUCT 01 — TCG Engine ══════ */
    engine: {
      text: {

        /* Navigation */
        "nav.company":    "Company",
        "nav.expertise":  "Expertise",
        "nav.products":   "Products",
        "nav.engineName": "TCG Engine",
        "nav.engineDesc": "recognition · extraction · classification",
        "nav.pricesName": "Price History & Monitoring",
        "nav.pricesDesc": "market data · alerts · analytics",
        "nav.cta":        "Request a demo",

        /* Breadcrumb */
        "crumb.root": "Products",
        "crumb.here": "TCG Engine",

        /* Hero */
        "hero.eyebrow": "Product 01 · Core technology",
        "hero.title":   "TCG Engine",
        "hero.lede":    "Point a camera at a table of cards. The engine identifies every one of them, frame after frame, entirely on the device in front of you.",
        "hero.cta":     "Book a demo",
        "hero.cta2":    "What runs on it",

        /* Apps */
        "apps.index":         "01 — Built on it",
        "apps.title":         "Four apps,\none set of weights.",
        "apps.lede":          "A new surface is a UI problem, not a model problem.",
        "apps.tiles.0.title": "Collectathon game",
        "apps.tiles.0.text":  "Snap the cards in front of you to catch them. The camera is the controller — the engine scores every frame and the binder fills up as you play.",
        "apps.tiles.0.meta":  "op-tcg · op_snap.apk",
        "apps.tiles.1.title": "Live price check",
        "apps.tiles.1.text":  "Fan them out on the desk and every card wears its market price.",
        "apps.tiles.1.meta":  "pokémon · riftbound · gundam · op",
        "apps.tiles.2.title": "Streamer overlay",
        "apps.tiles.2.text":  "Pack openings, called live. Chase cards light up the second they hit the desk.",
        "apps.tiles.2.meta":  "twitch",
        "apps.tiles.3.title": "Community TCG app",
        "apps.tiles.3.text":  "Snap your cards, watch the collection grow, and find the people who have the one you're missing. Collection tracking and trading, built on the same recogniser.",
        "apps.tiles.3.meta":  "collection + trading · cards_and_friends.apk",

        /* Edge */
        "edge.index":         "02 — Edge",
        "edge.title":         "Edge-native\nfrom the ground up.",
        "edge.lede":          "Designed for NPU acceleration on mobile devices and low-cost SoCs.",
        "edge.subtitle":      "Cross-platform mono-repo",
        "edge.body":          "Linux · Android · iOS · Windows · bare metal — one codebase, one set of weights, no cloud round-trip. The model that ships on a phone is the model that ships on the board.",
        "edge.stats.0.label": "Platform targets",
        "edge.stats.1.label": "Mono-repo",
        "edge.stats.2.label": "Accelerated",
        "edge.spec.0.key":    "Runtime",
        "edge.spec.0.value":  "on-device, NPU accelerated",
        "edge.spec.1.key":    "Reference SoC",
        "edge.spec.1.value":  "TI Sitara AM62A class",
        "edge.spec.2.key":    "Network",
        "edge.spec.2.value":  "none required at inference",
        "edge.spec.3.key":    "Weights",
        "edge.spec.3.value":  "one set, every target",

        /* Demo + contact */
        "demo.index":         "03 — Demo",
        "demo.title":         "See it on\nyour own cards.",
        "demo.mail":          "marketing@jellytek.net",
        "demo.tel":           "0439 505 062",
        "demo.blurb":         "The short version is on this page. We walk through the rest — live, on real cards — in a demo.",
        "demo.note":          "Android builds, ready to sideload — request access below",
        "demo.builds.0.name": "baroque_worths_demo.apk",
        "demo.builds.0.note": "price check demo",
        "demo.builds.1.name": "cards_and_friends.apk",
        "demo.builds.1.note": "community app",
        "demo.builds.2.name": "op_snap.apk",
        "demo.builds.2.note": "collectathon game",

        /* Footer */
        "foot.tag":       "soft body. hard tech.",
        "foot.chip":      "online — drifting in the current",
        "foot.copyright": "© 2026 jellytek.net",
        "foot.l1":        "TCG Engine",
        "foot.l2":        "Price monitoring",
        "foot.l3":        "Team",
        "foot.l4":        "Contact",
      },
      hidden: [],      // "team", "spec.items.2", … — deleted blocks
      sections: [],    // top-to-bottom order; empty = the order in the html
      order: {},       // row order within a group, as original positions
      bg: {},          // light · tint · dark · brand
      layout: {},      // per-section layout preset
      images: {},      // a real photo dropped into a drawn figure's slot
    },

    /* ══════ PRODUCT 02 — Price History & Monitoring ══════ */
    prices: {
      text: {

        /* Navigation */
        "nav.company":    "Company",
        "nav.expertise":  "Expertise",
        "nav.products":   "Products",
        "nav.engineName": "TCG Engine",
        "nav.engineDesc": "recognition · extraction · classification",
        "nav.pricesName": "Price History & Monitoring",
        "nav.pricesDesc": "market data · alerts · analytics",
        "nav.cta":        "Request a demo",

        /* Breadcrumb */
        "crumb.root": "Products",
        "crumb.here": "Price History & Monitoring",

        /* Hero */
        "hero.eyebrow": "Product 02 · Market data",
        "hero.title":   "Price History & Monitoring",
        "hero.lede":    "What a card is worth, what it was worth, and the moment that changes — attached to the exact printing our engine recognises.",
        "hero.cta":     "Book a demo",
        "hero.cta2":    "What it does",

        /* What it does */
        "what.index":            "01 — What it does",
        "what.title":            "Snap a card,\nget its whole history.",
        "what.lede":             "One gesture: the printing, the price and the trend.",
        "what.games":            "Games we price today",
        "what.items.0.n":        "01",
        "what.items.0.title":    "Read the card, then price it",
        "what.items.0.text":     "The recogniser identifies the exact printing, so the price attaches to that — not a fuzzy name match.",
        "what.items.1.n":        "02",
        "what.items.1.title":    "History, not just a number",
        "what.items.1.text":     "Every card carries its own series, so you see the shape rather than a single figure.",
        "what.items.2.n":        "03",
        "what.items.2.title":    "Watch and get told",
        "what.items.2.text":     "Follow a card, a set or a whole binder, and get alerted when something moves.",
        "what.gameList.0.label": "One Piece",
        "what.gameList.1.label": "Pokémon",
        "what.gameList.2.label": "Riftbound",
        "what.gameList.3.label": "Gundam",

        /* Price history */
        "hist.index":    "02 — Price history",
        "hist.title":    "The shape of\na card's market.",
        "hist.lede":     "A single number tells you very little.",
        "hist.cardName": "Otama",
        "hist.cardMeta": "one piece · OP07-089-01 · near mint",
        "hist.rangeLab": "90 days",
        "hist.note":     "Hover for any single day.",

        /* Movers */
        "move.index":         "03 — Movers",
        "move.title":         "What moved\nthis week.",
        "move.lede":          "Direction is carried by the arrow and the number, so it reads the same in greyscale or to a colourblind reader.",
        "move.colA":          "Card",
        "move.colB":          "Set",
        "move.colC":          "90 days",
        "move.colD":          "Price",
        "move.colE":          "7-day",
        "move.rows.0.name":   "Otama",
        "move.rows.0.set":    "OP07-089",
        "move.rows.0.price":  "A$ 44.88",
        "move.rows.0.change": "+6.9%",
        "move.rows.1.name":   "Surfing Pikachu",
        "move.rows.1.set":    "swsh35-6",
        "move.rows.1.price":  "A$ 61.10",
        "move.rows.1.change": "−3.8%",
        "move.rows.2.name":   "Monkey D. Luffy",
        "move.rows.2.set":    "OP01-003",
        "move.rows.2.price":  "A$ 128.40",
        "move.rows.2.change": "+4.2%",

        /* Demo + contact */
        "demo.index":         "04 — Demo",
        "demo.title":         "See it on your\nown collection.",
        "demo.mail":          "marketing@jellytek.net",
        "demo.tel":           "0439 505 062",
        "demo.blurb":         "The short version is on this page. We walk through the rest — live, on real cards — in a demo.",
        "demo.note":          "Android build, ready to sideload — request access below",
        "demo.builds.0.name": "baroque_worths_demo.apk",
        "demo.builds.0.note": "price check demo",

        /* Footer */
        "foot.tag":       "soft body. hard tech.",
        "foot.chip":      "online — drifting in the current",
        "foot.copyright": "© 2026 jellytek.net",
        "foot.l1":        "TCG Engine",
        "foot.l2":        "Price monitoring",
        "foot.l3":        "Team",
        "foot.l4":        "Contact",
      },
      hidden: [],      // "team", "spec.items.2", … — deleted blocks
      sections: [],    // top-to-bottom order; empty = the order in the html
      order: {},       // row order within a group, as original positions
      bg: {},          // light · tint · dark · brand
      layout: {},      // per-section layout preset
      images: {},      // a real photo dropped into a drawn figure's slot
    },
  },

  /* Site-wide design. Anything omitted keeps the value the design specifies. */
  theme: { colors: {}, fonts: {}, knobs: {} },
};
