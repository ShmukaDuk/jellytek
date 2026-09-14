// jellytek — the editor. Loads only on ?edit.
//
// Text, design, layout and images, edited on the page itself. Hover any block
// to get its own toolbar: move it up, move it down, drag it, or delete it.
// Every change writes to a local draft immediately; Publish is the separate,
// deliberate step that commits content.js to GitHub.
"use strict";

(() => {
  if (!/[?&]edit\b/.test(location.search)) return;

  const J = window.JT;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };

  const PAGE = J.page;                       // "home" | "engine" | "prices"
  const DRAFT_KEY = "jt.draft.v2." + PAGE;   // one draft per page
  const TOKEN_KEY = "jt.gh.token";
  const UPLOAD_DIR = "assets/uploads";

  const ICON = {
    up:   '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 10V2M2.5 5.5 6 2l3.5 3.5"/></svg>',
    down: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 2v8M2.5 6.5 6 10l3.5-3.5"/></svg>',
    del:  '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 3.5h7M5 3.5V2.5h2v1M3.5 3.5l.5 6h4l.5-6"/></svg>',
  };

  /* ── where publishing goes ───────────────────────────────────────────────
     Read off the footer's commit link so this travels with the repo. */
  const REPO = (() => {
    const a = $("#commit");
    const m = a && a.getAttribute("href") &&
      a.getAttribute("href").match(/github\.com\/([^/]+)\/([^/]+)/);
    return m ? { owner: m[1], repo: m[2], branch: "main" }
             : { owner: "ShmukaDuk", repo: "jellytek", branch: "main" };
  })();

  /* ── state: a saved draft wins over the published file ───────────────── */
  const FILE = window.JT_CONTENT || {};
  const filePage = (FILE.pages && FILE.pages[PAGE]) || {};
  let draft = null;
  try { draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null"); } catch (e) { draft = null; }

  const src = (draft && draft.data) || filePage;
  const srcTheme = (draft && draft.theme) || FILE.theme || {};
  const state = {
    text: { ...(src.text || {}) },
    hidden: new Set(src.hidden || []),
    order: { ...(src.order || {}) },
    sections: [...(src.sections || [])],
    bg: { ...(src.bg || {}) },
    layout: { ...(src.layout || {}) },
    images: { ...(src.images || {}) },
    // theme is shared across the whole site, not per page
    theme: {
      colors: { ...(srcTheme.colors || {}) },
      fonts:  { ...(srcTheme.fonts || {}) },
      knobs:  { ...(srcTheme.knobs || {}) },
    },
  };

  document.documentElement.classList.add("editing");
  const sheet = el("link");
  sheet.rel = "stylesheet";
  sheet.href = "/css/edit.css";   // root-relative: product pages are nested
  document.head.appendChild(sheet);

  /* ── panel shell ─────────────────────────────────────────────────────── */
  const panel = el("aside", "jt-panel");
  panel.innerHTML = `
    <header class="jt-panel__head">
      <strong>Editing <span class="jt-page">${PAGE}</span></strong>
      <button class="jt-btn jt-btn--quiet jt-x" type="button">Exit</button>
    </header>
    <nav class="jt-tabs">
      <button class="jt-tab is-on" data-tab="content" type="button">Content</button>
      <button class="jt-tab" data-tab="design" type="button">Design</button>
      <button class="jt-tab" data-tab="layout" type="button">Layout</button>
      <button class="jt-tab" data-tab="publish" type="button">Publish</button>
    </nav>
    <div class="jt-scroll">
      <div class="jt-pane" data-pane="content"></div>
      <div class="jt-pane" data-pane="design" hidden></div>
      <div class="jt-pane" data-pane="layout" hidden></div>
      <div class="jt-pane" data-pane="publish" hidden></div>
    </div>
    <footer class="jt-panel__foot">
      <span class="jt-status"></span>
      <span class="jt-draftbar"></span>
    </footer>`;
  document.body.appendChild(panel);

  const pane = (n) => $(`.jt-pane[data-pane="${n}"]`, panel);
  const statusEl = $(".jt-status", panel);
  const setStatus = (msg, cls) => {
    statusEl.textContent = msg;
    statusEl.className = "jt-status " + (cls || "");
  };

  $$(".jt-tab", panel).forEach((t) => t.addEventListener("click", () => {
    $$(".jt-tab", panel).forEach((x) => x.classList.toggle("is-on", x === t));
    $$(".jt-pane", panel).forEach((p) => { p.hidden = p.dataset.pane !== t.dataset.tab; });
  }));
  $(".jt-x", panel).addEventListener("click", () => { location.search = ""; });

  const showTab = (name) => $$(".jt-tab", panel).find((t) => t.dataset.tab === name).click();

  /* ── draft autosave ──────────────────────────────────────────────────── */
  let saveTimer = 0;
  let lastSaved = draft ? draft.at : null;

  const snapshot = () => ({
    text: state.text,
    hidden: [...state.hidden],
    order: state.order,
    sections: state.sections,
    bg: state.bg,
    layout: state.layout,
    images: state.images,
  });

  function touch() {
    clearTimeout(saveTimer);
    setStatus("saving…", "");
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ at: Date.now(), data: snapshot(), theme: state.theme }));
        lastSaved = Date.now();
        setStatus("draft saved " + new Date(lastSaved).toLocaleTimeString(), "is-ok");
      } catch (e) {
        // almost always the quota, from a large uploaded image
        setStatus("draft too big to store locally — publish, or remove an image", "is-warn");
      }
      renderDraftBar();
    }, 400);
  }

  function renderDraftBar() {
    const bar = $(".jt-draftbar", panel);
    bar.innerHTML = "";
    if (!lastSaved) return;
    const b = el("button", "jt-link", "Discard draft");
    b.type = "button";
    b.addEventListener("click", () => {
      if (!confirm("Throw away every unpublished change and go back to the published site?")) return;
      localStorage.removeItem(DRAFT_KEY);
      location.reload();
    });
    bar.appendChild(b);
  }

  /* ── toast, for undoing a delete ─────────────────────────────────────── */
  let toastTimer = 0;
  const toast = el("div", "jt-toast");
  toast.hidden = true;
  document.body.appendChild(toast);

  function say(message, undo) {
    clearTimeout(toastTimer);
    toast.innerHTML = "";
    toast.appendChild(el("span", null, message));
    if (undo) {
      const b = el("button", "jt-toast__undo", "Undo");
      b.type = "button";
      b.addEventListener("click", () => { undo(); toast.hidden = true; });
      toast.appendChild(b);
    }
    toast.hidden = false;
    toastTimer = setTimeout(() => { toast.hidden = true; }, 6000);
  }

  /* ═══ one registry for everything that can be hidden ═════════════════
     A delete on the page, a checkbox in the panel and a Restore button all
     go through here, so the three can never disagree. */
  const blocks = new Map();   // key → { label, node, onChange[] }

  function register(key, label, node) {
    blocks.set(key, { key, label, node, onChange: [] });
  }

  function isHidden(key) { return state.hidden.has(key); }

  function setHidden(key, hide, opts = {}) {
    const b = blocks.get(key);
    if (!b) return;
    if (hide) state.hidden.add(key); else state.hidden.delete(key);
    if (b.node) b.node.hidden = hide;
    b.onChange.forEach((fn) => fn(hide));
    renderDeleted();
    touch();
    if (hide && !opts.quiet) {
      say(`“${b.label}” deleted.`, () => setHidden(key, false, { quiet: true }));
    }
  }

  /* ── moving a node among its siblings ────────────────────────────────── */
  function siblings(container, selector) {
    return [...container.children].filter((n) => n.matches(selector));
  }

  function move(node, dir, container, selector, commit) {
    const sibs = siblings(container, selector);
    const i = sibs.indexOf(node);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= sibs.length) return false;
    if (dir < 0) container.insertBefore(node, sibs[j]);
    else container.insertBefore(sibs[j], node);
    commit();
    node.classList.remove("jt-flash");
    void node.offsetWidth;
    node.classList.add("jt-flash");
    return true;
  }

  /* ── the on-page toolbar every block gets ────────────────────────────── */
  function toolbar(node, opts) {
    node.classList.add("jt-blk");
    const bar = el("div", "jt-tools" + (opts.variant ? " jt-tools--" + opts.variant : ""));

    if (opts.label) {
      const tag = el("span", "jt-tools__label", opts.label);
      if (opts.draggable) {
        tag.classList.add("jt-tools__label--grab");
        tag.innerHTML = '<span class="jt-grip">⠿</span>' + opts.label;
        tag.draggable = true;
        tag.addEventListener("dragstart", opts.onDragStart);
        tag.addEventListener("dragend", opts.onDragEnd);
      }
      bar.appendChild(tag);
    }

    const btn = (cls, title, icon, fn) => {
      const b = el("button", "jt-tool " + cls, icon);
      b.type = "button";
      b.title = title;
      b.setAttribute("aria-label", title);
      b.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); fn(); });
      bar.appendChild(b);
      return b;
    };

    btn("", "Move up", ICON.up, () => opts.onMove(-1));
    btn("", "Move down", ICON.down, () => opts.onMove(1));
    btn("jt-tool--danger", "Delete", ICON.del, opts.onDelete);

    node.prepend(bar);
    return bar;
  }

  /* ═══ TEXT — click anything on the page ══════════════════════════════ */
  let editableCount = 0;

  const registerText = (key, target) => {
    if (!target) return;
    const node = J.textNode(target);
    node.setAttribute("contenteditable", "plaintext-only");
    node.classList.add("jt-ed");
    node.dataset.jtKey = key;
    editableCount++;
    node.addEventListener("input", () => { state.text[key] = J.getText(node); touch(); });
    node.addEventListener("blur", () => {
      if (state.text[key] != null) J.setText(node, state.text[key]);
    });
    node.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { e.preventDefault(); node.blur(); }
    });
  };

  for (const [key, sel] of Object.entries(J.FIELDS)) registerText(key, $(sel));
  for (const [gk, g] of Object.entries(J.GROUPS)) {
    for (const [orig, item] of J.byOriginal(g)) {
      for (const [fk, fsel] of Object.entries(g.fields)) {
        registerText(`${gk}.${orig}.${fk}`, fsel ? $(fsel, item) : item);
      }
    }
  }

  /* ═══ sections: page toolbars + order ═══════════════════════════════ */
  const main = $("main");
  const sectionList = Object.entries(J.SECTIONS)
    .map(([key, spec]) => ({ key, spec, node: $(spec.sel) }))
    .filter((x) => x.node && x.node.parentElement === main);
  sectionList.sort((a, b) => (a.node.compareDocumentPosition(b.node) & 4 ? -1 : 1));

  let orderList = null;

  function commitSectionOrder() {
    state.sections = $$(".jt-sec", main)
      .map((n) => sectionList.find((s) => s.node === n))
      .filter(Boolean).map((s) => s.key);
    if (orderList) {
      for (const k of state.sections) {
        const row = $$(".jt-row--drag", orderList).find((r) => r.dataset.idx === k);
        if (row) orderList.appendChild(row);
      }
    }
    touch();
  }

  for (const { key, spec, node } of sectionList) {
    node.classList.add("jt-sec");
    register(key, spec.label, node);
    toolbar(node, {
      variant: "section",
      label: spec.label,
      draggable: true,
      onDragStart: (e) => {
        node.classList.add("jt-sec--moving");
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", key);
      },
      onDragEnd: () => { node.classList.remove("jt-sec--moving"); commitSectionOrder(); },
      onMove: (dir) => {
        if (!move(node, dir, main, ".jt-sec", commitSectionOrder)) return;
        node.scrollIntoView({ block: "nearest", behavior: "smooth" });
      },
      onDelete: () => setHidden(key, true),
    });
  }

  main.addEventListener("dragover", (e) => {
    const moving = $(".jt-sec--moving", main);
    if (!moving) return;
    e.preventDefault();
    const after = $$(".jt-sec:not(.jt-sec--moving)", main)
      .find((n) => e.clientY < n.getBoundingClientRect().top + n.offsetHeight / 2);
    main.insertBefore(moving, after || null);
  });

  /* ═══ rows inside groups: page toolbars + order ═════════════════════ */
  const groupLists = {};   // gk → the panel list, so page and panel stay in step

  function commitGroupOrder(gk, g) {
    const container = $(g.container);
    const order = siblings(container, g.item).map((n) => Number(n.dataset.jtOrig));
    if (order.every((v, i) => v === i)) delete state.order[gk];
    else state.order[gk] = order;
    const list = groupLists[gk];
    if (list) {
      for (const o of order) {
        const row = $$(".jt-row--drag", list).find((r) => Number(r.dataset.idx) === o);
        if (row) list.appendChild(row);
      }
    }
    touch();
  }

  for (const [gk, g] of Object.entries(J.GROUPS)) {
    const container = $(g.container);
    if (!container) continue;
    // Where a group's editable text IS the item itself (the data tags), a
    // toolbar inside it would end up inside the text we read back. Those stay
    // panel-only.
    const textIsItem = Object.values(g.fields).some((v) => v === null);

    for (const [orig, item] of J.byOriginal(g)) {
      const key = `${gk}.${orig}`;
      const nameEl = g.name && $(g.name, item);
      const label = (nameEl || item).textContent.replace(/\s+/g, " ").trim().slice(0, 28) || `item ${orig + 1}`;
      register(key, label, item);
      if (textIsItem) continue;
      toolbar(item, {
        variant: "row",
        onMove: (dir) => move(item, dir, container, g.item, () => commitGroupOrder(gk, g)),
        onDelete: () => setHidden(key, true),
      });
    }
  }

  /* ═══ CONTENT PANE ══════════════════════════════════════════════════ */
  let deletedBlock = null;

  {
    const p = pane("content");
    p.appendChild(el("p", "jt-hint",
      "Click any outlined text to rewrite it. Hover a block for its own move and delete controls."));

    const mk = (key, label) => {
      const row = el("label", "jt-row", `<input type="checkbox"><span>${label}</span>`);
      const box = $("input", row);
      box.checked = !isHidden(key);
      box.addEventListener("change", () => setHidden(key, !box.checked, { quiet: true }));
      const b = blocks.get(key);
      if (b) b.onChange.push((hidden) => { box.checked = !hidden; });
      return row;
    };

    const secBlock = el("div", "jt-block", "<h4>Sections</h4>");
    for (const { key, spec } of sectionList) secBlock.appendChild(mk(key, spec.label));
    p.appendChild(secBlock);

    for (const [gk, g] of Object.entries(J.GROUPS)) {
      const items = J.items(g);
      if (!items.length) continue;
      const block = el("div", "jt-block", `<h4>${g.label}</h4>`);
      const list = el("div", "jt-list");
      groupLists[gk] = list;

      items.forEach((item) => {
        const orig = Number(item.dataset.jtOrig);
        const key = `${gk}.${orig}`;
        const b = blocks.get(key);
        const row = el("div", "jt-row jt-row--drag",
          `<span class="jt-grip">⠿</span><label><input type="checkbox"><span>${b ? b.label : key}</span></label>`);
        row.draggable = true;
        row.dataset.idx = String(orig);
        const box = $("input", row);
        box.checked = !isHidden(key);
        box.addEventListener("change", () => setHidden(key, !box.checked, { quiet: true }));
        if (b) b.onChange.push((hidden) => { box.checked = !hidden; });

        row.addEventListener("dragstart", (e) => {
          row.classList.add("is-dragging");
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", String(orig));
        });
        row.addEventListener("dragend", () => {
          row.classList.remove("is-dragging");
          const order = $$(".jt-row--drag", list).map((r) => Number(r.dataset.idx));
          const container = $(g.container);
          const byOrig = J.byOriginal(g);
          for (const o of order) { const n = byOrig.get(o); if (n && container) container.appendChild(n); }
          commitGroupOrder(gk, g);
        });
        list.appendChild(row);
      });

      list.addEventListener("dragover", (e) => {
        e.preventDefault();
        const moving = $(".is-dragging", list);
        if (!moving) return;
        const after = $$(".jt-row--drag:not(.is-dragging)", list)
          .find((r) => e.clientY < r.getBoundingClientRect().top + r.offsetHeight / 2);
        list.insertBefore(moving, after || null);
      });

      block.appendChild(list);
      p.appendChild(block);
    }

    deletedBlock = el("div", "jt-block jt-block--deleted");
    p.appendChild(deletedBlock);
  }

  function renderDeleted() {
    if (!deletedBlock) return;
    const keys = [...state.hidden].filter((k) => blocks.has(k));
    deletedBlock.hidden = !keys.length;
    deletedBlock.innerHTML = `<h4>Deleted · ${keys.length}</h4>`;
    deletedBlock.appendChild(el("p", "jt-hint jt-hint--tight",
      "Gone from the live site. Nothing is destroyed — restore any of them here."));
    for (const key of keys) {
      const b = blocks.get(key);
      const row = el("div", "jt-row jt-row--field", `<span>${b.label}</span>`);
      const btn = el("button", "jt-btn jt-btn--tiny", "Restore");
      btn.type = "button";
      btn.addEventListener("click", () => setHidden(key, false, { quiet: true }));
      row.appendChild(btn);
      deletedBlock.appendChild(row);
    }
  }

  /* ═══ DESIGN PANE ═══════════════════════════════════════════════════ */
  const colInputs = {};

  function syncColorInputs() {
    const cs = getComputedStyle(document.documentElement);
    for (const [key, input] of Object.entries(colInputs)) {
      const cur = state.theme.colors[key] || cs.getPropertyValue(J.COLORS[key].v).trim();
      if (/^#[0-9a-f]{3}$/i.test(cur)) {
        input.value = "#" + cur.slice(1).split("").map((c) => c + c).join("");
      } else if (/^#[0-9a-f]{6}$/i.test(cur)) {
        input.value = cur;
      }
    }
  }

  // wipe everything we might have set, then re-apply, so clearing a value
  // actually reverts to the designed one rather than sticking
  function reapplyTheme() {
    const root = document.documentElement.style;
    for (const spec of Object.values(J.COLORS)) root.removeProperty(spec.v);
    for (const v of Object.values(J.COLOR_RGB)) root.removeProperty(v);
    for (const spec of Object.values(J.KNOBS)) root.removeProperty(spec.v);
    root.removeProperty("--font-display");
    root.removeProperty("--font-body");
    root.removeProperty("--font-mono");
    J.applyTheme(state.theme);
  }

  {
    const p = pane("design");
    p.appendChild(el("p", "jt-hint", "Changes land on the page as you make them."));

    const pal = el("div", "jt-block", "<h4>Palette</h4>");
    const chips = el("div", "jt-chips");
    for (const [name, colors] of Object.entries(J.PALETTES)) {
      const c = el("button", "jt-chip", `<i style="background:${colors.accent}"></i>${name}`);
      c.type = "button";
      c.addEventListener("click", () => {
        state.theme.colors = { ...state.theme.colors, ...colors };
        reapplyTheme(); syncColorInputs(); touch();
      });
      chips.appendChild(c);
    }
    pal.appendChild(chips);
    p.appendChild(pal);

    const colBlock = el("div", "jt-block", "<h4>Colours</h4>");
    for (const [key, spec] of Object.entries(J.COLORS)) {
      const row = el("label", "jt-row jt-row--field", `<span>${spec.label}</span>`);
      const input = el("input", "jt-color");
      input.type = "color";
      colInputs[key] = input;
      input.addEventListener("input", () => {
        state.theme.colors[key] = input.value;
        reapplyTheme(); touch();
      });
      row.appendChild(input);
      colBlock.appendChild(row);
    }
    p.appendChild(colBlock);

    const fontBlock = el("div", "jt-block", "<h4>Typefaces</h4>");
    for (const kind of ["display", "mono"]) {
      const row = el("label", "jt-row jt-row--field",
        `<span>${kind === "display" ? "Headings + body" : "Labels + code"}</span>`);
      const sel = el("select", "jt-select");
      for (const f of J.FONTS[kind]) {
        const o = el("option", null, f); o.value = f; sel.appendChild(o);
      }
      sel.value = state.theme.fonts[kind] || J.FONTS[kind][0];
      sel.addEventListener("change", () => {
        state.theme.fonts[kind] = sel.value;
        reapplyTheme(); touch();
      });
      row.appendChild(sel);
      fontBlock.appendChild(row);
    }
    p.appendChild(fontBlock);

    const knobBlock = el("div", "jt-block", "<h4>Proportions</h4>");
    for (const [key, spec] of Object.entries(J.KNOBS)) {
      const dp = key === "track" ? 3 : 2;
      const row = el("div", "jt-field");
      const head = el("div", "jt-field__head", `<span>${spec.label}</span><b></b>`);
      const out = $("b", head);
      const input = el("input", "jt-range");
      input.type = "range";
      input.min = spec.min; input.max = spec.max; input.step = spec.step;
      input.value = state.theme.knobs[key] != null ? state.theme.knobs[key] : (key === "track" ? -0.04 : 1);
      out.textContent = Number(input.value).toFixed(dp);
      input.addEventListener("input", () => {
        state.theme.knobs[key] = Number(input.value);
        out.textContent = Number(input.value).toFixed(dp);
        reapplyTheme(); touch();
      });
      row.append(head, input);
      knobBlock.appendChild(row);
    }
    const reset = el("button", "jt-btn jt-btn--quiet", "Reset design to default");
    reset.type = "button";
    reset.addEventListener("click", () => {
      state.theme = { colors: {}, fonts: {}, knobs: {} };
      reapplyTheme(); syncColorInputs(); touch();
      setStatus("design reset — reload to redraw the sliders", "is-ok");
    });
    knobBlock.appendChild(reset);
    p.appendChild(knobBlock);
  }

  /* ═══ LAYOUT PANE ═══════════════════════════════════════════════════ */
  const defaultBg = (node) =>
    node.classList.contains("section--ink") ? "dark"
      : node.classList.contains("section--alt") ? "tint" : "light";

  {
    const p = pane("layout");
    p.appendChild(el("p", "jt-hint",
      "Use the ↑ ↓ buttons on a block, drag it by its ⠿ handle, or reorder here."));

    const ordBlock = el("div", "jt-block", "<h4>Section order</h4>");
    orderList = el("div", "jt-list");
    for (const { key, spec } of sectionList) {
      const row = el("div", "jt-row jt-row--drag",
        `<span class="jt-grip">⠿</span><span>${spec.label}</span>`);
      row.draggable = true;
      row.dataset.idx = key;
      row.addEventListener("dragstart", (e) => {
        row.classList.add("is-dragging");
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", key);
      });
      row.addEventListener("dragend", () => {
        row.classList.remove("is-dragging");
        for (const k of $$(".jt-row--drag", orderList).map((r) => r.dataset.idx)) {
          const node = $(J.SECTIONS[k].sel);
          if (node && main) main.appendChild(node);
        }
        commitSectionOrder();
      });
      orderList.appendChild(row);
    }
    orderList.addEventListener("dragover", (e) => {
      e.preventDefault();
      const moving = $(".is-dragging", orderList);
      if (!moving) return;
      const after = $$(".jt-row--drag:not(.is-dragging)", orderList)
        .find((r) => e.clientY < r.getBoundingClientRect().top + r.offsetHeight / 2);
      orderList.insertBefore(moving, after || null);
    });
    ordBlock.appendChild(orderList);
    p.appendChild(ordBlock);

    for (const { key, spec, node } of sectionList) {
      const block = el("div", "jt-block", `<h4>${spec.label}</h4>`);

      const bgRow = el("label", "jt-row jt-row--field", "<span>Background</span>");
      const bgSel = el("select", "jt-select");
      for (const [v, lab] of Object.entries(J.BACKGROUNDS)) {
        const o = el("option", null, lab); o.value = v; bgSel.appendChild(o);
      }
      bgSel.value = state.bg[key] || defaultBg(node);
      bgSel.addEventListener("change", () => {
        state.bg[key] = bgSel.value;
        node.classList.remove("bg-light", "bg-tint", "bg-dark", "bg-brand");
        node.classList.add("bg-" + bgSel.value);
        touch();
      });
      bgRow.appendChild(bgSel);
      block.appendChild(bgRow);

      const lay = J.LAYOUTS[key];
      if (lay) {
        const row = el("label", "jt-row jt-row--field", "<span>Layout</span>");
        const sel = el("select", "jt-select");
        for (const [v, lab] of Object.entries(lay.options)) {
          const o = el("option", null, lab); o.value = v; sel.appendChild(o);
        }
        sel.value = state.layout[key] || Object.keys(lay.options)[0];
        sel.addEventListener("change", () => {
          state.layout[key] = sel.value;
          J.applyPresentation({ layout: { [key]: sel.value } });
          touch();
        });
        row.appendChild(sel);
        block.appendChild(row);
      }
      p.appendChild(block);
    }

    const imgBlock = el("div", "jt-block", "<h4>Images</h4>");
    imgBlock.appendChild(el("p", "jt-hint jt-hint--tight",
      "Every drawn diagram is a slot. Put a real screenshot in and the drawing steps aside."));
    for (const slot of $$("[data-img]")) {
      const key = slot.dataset.img;
      const row = el("div", "jt-row jt-row--field", `<span>${key}</span>`);
      const btn = el("button", "jt-btn jt-btn--tiny", state.images[key] ? "Replace" : "Upload");
      btn.type = "button";
      btn.addEventListener("click", () => pickImage(key));
      const clr = el("button", "jt-btn jt-btn--tiny jt-btn--quiet", "×");
      clr.type = "button";
      clr.title = "Remove the image and bring the drawing back";
      clr.hidden = !state.images[key];
      clr.addEventListener("click", () => {
        delete state.images[key];
        J.applyImages(state.images);
        btn.textContent = "Upload";
        clr.hidden = true;
        touch();
      });
      row.append(btn, clr);
      imgBlock.appendChild(row);
      slot._jtSet = () => { btn.textContent = "Replace"; clr.hidden = false; };
    }
    p.appendChild(imgBlock);
  }

  /* ── images ──────────────────────────────────────────────────────────── */
  const filePicker = el("input");
  filePicker.type = "file";
  filePicker.accept = "image/png,image/jpeg,image/webp";
  filePicker.hidden = true;
  document.body.appendChild(filePicker);
  let pickTarget = null;

  function pickImage(key) {
    pickTarget = key;
    filePicker.value = "";
    filePicker.click();
  }

  filePicker.addEventListener("change", async () => {
    const file = filePicker.files && filePicker.files[0];
    if (!file || !pickTarget) return;
    const key = pickTarget;
    pickTarget = null;
    setStatus("processing image…", "");
    try {
      state.images[key] = await downscale(file, 1600);
      J.applyImages(state.images);
      const slot = $(`[data-img="${key}"]`);
      if (slot && slot._jtSet) slot._jtSet();
      touch();
    } catch (err) {
      setStatus("could not read that image", "is-warn");
    }
  });

  // Downscale through a canvas before storing: keeps the draft inside the
  // localStorage quota, and keeps 8-megapixel phone photos out of the repo.
  function downscale(file, maxEdge) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
        const c = el("canvas");
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        const png = file.type === "image/png";
        resolve(c.toDataURL(png ? "image/png" : "image/jpeg", png ? undefined : 0.86));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("decode failed")); };
      img.src = url;
    });
  }

  /* ═══ PUBLISH PANE ══════════════════════════════════════════════════ */
  {
    const p = pane("publish");
    p.innerHTML = `
      <p class="jt-hint">Edits are saved on this browser as you work. Publishing commits
        <code>content.js</code> to <b>${REPO.owner}/${REPO.repo}</b>; GitHub Pages then
        rebuilds, so the live site catches up in about a minute.</p>
      <div class="jt-block">
        <h4>GitHub token</h4>
        <p class="jt-hint jt-hint--tight">A fine-grained token with <b>Contents: read and write</b>
          on this one repository. It is kept in this browser only, and you can revoke it from
          GitHub at any time. <a class="jt-a" href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">Create one →</a></p>
        <input class="jt-input jt-token" type="password" placeholder="github_pat_…" autocomplete="off">
        <label class="jt-row"><input type="checkbox" class="jt-remember" checked><span>Remember on this browser</span></label>
      </div>
      <div class="jt-block">
        <button class="jt-btn jt-btn--primary jt-publish" type="button">Publish to the live site</button>
        <button class="jt-btn jt-btn--quiet jt-download" type="button">Download content.js instead</button>
        <div class="jt-log"></div>
      </div>`;

    const tokenInput = $(".jt-token", p);
    const remember = $(".jt-remember", p);
    const log = $(".jt-log", p);
    try { tokenInput.value = localStorage.getItem(TOKEN_KEY) || ""; } catch (e) {}

    const persistToken = () => {
      try {
        if (remember.checked && tokenInput.value) localStorage.setItem(TOKEN_KEY, tokenInput.value);
        else localStorage.removeItem(TOKEN_KEY);
      } catch (e) {}
    };
    tokenInput.addEventListener("change", persistToken);
    remember.addEventListener("change", persistToken);

    const line = (msg, cls) => {
      log.appendChild(el("div", "jt-log__line " + (cls || ""), msg));
      log.scrollTop = log.scrollHeight;
    };

    $(".jt-download", p).addEventListener("click", () => download(serialise(), "content.js"));

    $(".jt-publish", p).addEventListener("click", async () => {
      const token = tokenInput.value.trim();
      if (!token) { line("Paste a token first.", "is-warn"); tokenInput.focus(); return; }
      const btn = $(".jt-publish", p);
      btn.disabled = true;
      log.innerHTML = "";
      try {
        // images still held as data: URLs become real files in the repo first,
        // so content.js only ever references paths
        const pending = Object.entries(state.images).filter(([, v]) => v.startsWith("data:"));
        for (const [key, dataURL] of pending) {
          const mime = dataURL.slice(5, dataURL.indexOf(";"));
          const ext = mime.split("/")[1].replace("jpeg", "jpg");
          const name = `${key.replace(/[^a-z0-9]+/gi, "-")}-${Date.now().toString(36)}.${ext}`;
          const path = `${UPLOAD_DIR}/${name}`;
          line(`uploading ${name}…`);
          await putFile(token, path, dataURL.slice(dataURL.indexOf(",") + 1), `Add ${name} via site editor`);
          state.images[key] = path;
          J.applyImages(state.images);
        }
        line("committing content.js…");
        await putFile(token, "content.js", b64(serialise()), "Update site content via editor");
        line("published — Pages is rebuilding, live in about a minute", "is-ok");
        touch();
      } catch (err) {
        line(String((err && err.message) || err), "is-warn");
      } finally {
        btn.disabled = false;
      }
    });

    function gh(token, path, opts = {}) {
      return fetch(`https://api.github.com/repos/${REPO.owner}/${REPO.repo}/contents/${path}`, {
        ...opts,
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: "Bearer " + token,
          ...(opts.headers || {}),
        },
      });
    }

    async function putFile(token, path, contentB64, message) {
      // updating an existing file requires its current blob sha
      let sha;
      const head = await gh(token, `${path}?ref=${REPO.branch}`);
      if (head.status === 200) sha = (await head.json()).sha;
      else if (head.status === 401) throw new Error("Token rejected (401) — check it is valid and not expired.");
      else if (head.status === 403) throw new Error("Forbidden (403) — the token needs Contents: read and write on this repo.");
      else if (head.status !== 404) throw new Error(`GitHub returned ${head.status} while reading ${path}`);

      const res = await gh(token, path, {
        method: "PUT",
        body: JSON.stringify({ message, content: contentB64, branch: REPO.branch, ...(sha ? { sha } : {}) }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (res.status === 409) throw new Error("Conflict — the file changed on GitHub since this page loaded. Reload, then publish again.");
        throw new Error(`${res.status} writing ${path}: ${body.message || "unknown error"}`);
      }
      return res.json();
    }
  }

  const b64 = (str) => btoa(String.fromCharCode(...new TextEncoder().encode(str)));

  function download(text, name) {
    const url = URL.createObjectURL(new Blob([text], { type: "text/javascript" }));
    const a = el("a");
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /* ═══ serialise to content.js ═══════════════════════════════════════ */
  const q = (v) => JSON.stringify(v);

  function objBlock(name, obj, comment, indent = "  ") {
    const out = [];
    const ks = Object.keys(obj || {});
    if (comment) out.push(`${indent}/* ${comment} */`);
    if (!ks.length) { out.push(`${indent}${name}: {},`); return out; }
    out.push(`${indent}${name}: {`);
    for (const k of ks) {
      const v = obj[k];
      const rendered = Array.isArray(v) ? `[${v.join(", ")}]` : typeof v === "number" ? String(v) : q(v);
      out.push(`${indent}  ${q(k)}: ${rendered},`);
    }
    out.push(`${indent}},`);
    return out;
  }

  function serialise() {
    const GROUPINGS = [
      ["nav.", "Navigation"], ["crumb.", "Breadcrumb"], ["hero.", "Hero"],
      ["who.", "Who we are"], ["spec.", "Expertise"], ["prod.", "Products"],
      ["part.", "Partners"], ["team.", "Team"],
      ["engine.", "Pipeline"], ["apps.", "Apps"], ["edge.", "Edge"], ["data.", "Synthetic data"],
      ["what.", "What it does"], ["hist.", "Price history"], ["move.", "Movers"],
      ["alert.", "Monitoring"], ["cover.", "Coverage"],
      ["demo.", "Demo + contact"], ["foot.", "Footer"],
    ];
    const TITLES = {
      home: "HOME — the company",
      engine: "PRODUCT 01 — TCG Engine",
      prices: "PRODUCT 02 — Price History & Monitoring",
    };

    // This page's edits; every other page is carried through from the file
    // untouched, so editing one page can never blank out another.
    const slice = {
      text: state.text,
      hidden: [...state.hidden],
      sections: state.sections,
      order: state.order,
      bg: state.bg,
      layout: state.layout,
      images: state.images,
    };
    const allPages = { ...(FILE.pages || {}) };
    allPages[PAGE] = slice;

    const out = [
      "// jellytek — site content.",
      "//",
      "// Three pages, keyed the same way as <body data-page=\"…\">:",
      "//   home    the company",
      "//   engine  Products → TCG Engine",
      "//   prices  Products → Price History & Monitoring",
      "//",
      "// Edit here and reload, or use /?edit on any page and click it. Key → selector",
      '// mappings live in js/schema.js. "\\n" inside a string is a line break.',
      "// `theme` is site-wide; everything else is per page.",
      `// Last saved ${new Date().toISOString().slice(0, 16).replace("T", " ")} from the ${PAGE} page.`,
      "window.JT_CONTENT = {",
      "",
      "  pages: {",
    ];

    for (const key of ["home", "engine", "prices"]) {
      const pg = allPages[key];
      if (!pg) continue;
      out.push("", `    /* ══════ ${TITLES[key] || key} ══════ */`, `    ${key}: {`);
      out.push("      text: {");
      const text = pg.text || {};
      const keys = Object.keys(text);
      const used = new Set();
      for (const [prefix, title] of GROUPINGS) {
        const ks = keys.filter((k) => k.startsWith(prefix));
        if (!ks.length) continue;
        out.push("", `        /* ${title} */`);
        const w = Math.max(...ks.map((k) => k.length)) + 3;
        for (const k of ks) { used.add(k); out.push(`        ${(q(k) + ":").padEnd(w)} ${q(text[k])},`); }
      }
      for (const k of keys) if (!used.has(k)) out.push(`        ${q(k)}: ${q(text[k])},`);
      out.push("      },");
      out.push(`      hidden: [${(pg.hidden || []).map(q).join(", ")}],`);
      out.push(`      sections: [${(pg.sections || []).map(q).join(", ")}],`);
      out.push(...objBlock("order", pg.order, null, "      "));
      out.push(...objBlock("bg", pg.bg, null, "      "));
      out.push(...objBlock("layout", pg.layout, null, "      "));
      out.push(...objBlock("images", pg.images, null, "      "));
      out.push("    },");
    }

    out.push("  },", "");
    out.push("  /* Site-wide design. Anything omitted keeps its designed value. */");
    out.push("  theme: {");
    out.push(...objBlock("colors", state.theme.colors, null, "    "));
    out.push(...objBlock("fonts", state.theme.fonts, null, "    "));
    out.push(...objBlock("knobs", state.theme.knobs, null, "    "));
    out.push("  },", "};", "");
    return out.join("\n");
  }

  J.serialise = serialise;   // lets the output be checked without driving the UI

  /* ── boot ────────────────────────────────────────────────────────────── */
  if (draft && draft.data) {
    // the draft is already folded into `state`; put it on the page
    reapplyTheme();
    J.apply({ text: state.text, order: state.order, hidden: [] });
    J.applyPresentation({ bg: state.bg, layout: state.layout });
    J.applySectionOrder(state.sections);
    J.applyImages(state.images);
    for (const key of state.hidden) {
      const b = blocks.get(key);
      if (b && b.node) { b.node.hidden = true; b.onChange.forEach((fn) => fn(true)); }
    }
    setStatus("restored your draft from " + new Date(draft.at).toLocaleString(), "is-ok");
  } else {
    for (const key of state.hidden) {
      const b = blocks.get(key);
      if (b && b.node) b.node.hidden = true;
    }
    setStatus(editableCount + " editable strings", "");
  }
  syncColorInputs();
  renderDeleted();
  renderDraftBar();

  addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); showTab("publish"); }
  });
})();
