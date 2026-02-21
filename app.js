(() => {
  const state = {
    deck: null,
    index: 0,
    compact: false
  };

  const qs = (sel, el = document) => el.querySelector(sel);
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));

  function computeCompactMode() {
    const h = window.innerHeight || document.documentElement.clientHeight;
    // Compact for small heights (laptops, split view, mobile landscape)
    const compact = h < 720;
    if (compact !== state.compact) {
      state.compact = compact;
      document.body.classList.toggle("compact", compact);
    }
  }

  async function loadDeck() {
    const res = await fetch("./content.json", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load content.json");
    return await res.json();
  }

  function esc(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (v == null) return;
      if (k === "class") node.className = v;
      else if (k === "html") node.innerHTML = v;
      else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, String(v));
    });
    for (const ch of children) node.appendChild(ch);
    return node;
  }

  function buildTopbar(meta, total, idx) {
    const brand = el("div", { class: "brand" }, [
      el("span", { class: "pip", "aria-hidden": "true" }),
      el("span", { html: esc(meta?.title ?? "") })
    ]);

    const progress = el("div", { class: "progress", "aria-hidden": "true" });
    for (let i = 0; i < total; i++) {
      progress.appendChild(el("span", { class: i === idx ? "active" : "" }));
    }

    const hint = el("div", { class: "hint", html: esc("Space / ← →") });

    return el("header", { class: "topbar" }, [brand, progress, hint]);
  }

  function buildBullets(items = []) {
    const ul = el("ul", { class: "bullets fadeIn" });
    items.forEach(t => {
      ul.appendChild(
        el("li", {}, [
          el("span", { class: "dot", "aria-hidden": "true" }),
          el("span", { html: esc(t) })
        ])
      );
    });
    return ul;
  }

  function slideTitle(s) {
    const inner = el("div", { class: "inner" });

    inner.appendChild(el("div", { class: "sectionCenter" }, [
      el("div", { class: "kicker", html: esc("Presentation") }),
      el("h1", { class: "headline fadeIn", html: esc(s.headline || "") }),
      ...(s.subheadline ? [el("p", { class: "subheadline fadeIn", html: esc(s.subheadline) })] : []),
      ...(Array.isArray(s.bullets) && s.bullets.length ? [buildBullets(s.bullets)] : [])
    ]));

    return inner;
  }

  function slideSection(s) {
    return el("div", { class: "inner" }, [
      el("div", { class: "sectionCenter" }, [
        el("div", { class: "kicker", html: esc("Section") }),
        el("h1", { class: "headline fadeIn", html: esc(s.headline || "") }),
        ...(s.subheadline ? [el("p", { class: "subheadline fadeIn", html: esc(s.subheadline) })] : [])
      ])
    ]);
  }

  function slideContent(s) {
    const inner = el("div", { class: "inner" });

    inner.appendChild(el("div", { class: "kicker", html: esc(s.subheadline ? "Concept" : "Slide") }));
    inner.appendChild(el("h1", { class: "rule fadeIn", html: esc(s.headline || "") }));
    if (s.subheadline) inner.appendChild(el("p", { class: "subheadline fadeIn", html: esc(s.subheadline) }));
    if (Array.isArray(s.bullets) && s.bullets.length) inner.appendChild(buildBullets(s.bullets));

    return inner;
  }

  function slideBeforeAfter(s) {
    const inner = el("div", { class: "inner" });
    inner.appendChild(el("div", { class: "kicker", html: esc("Compare") }));
    inner.appendChild(el("h1", { class: "rule fadeIn", html: esc(s.headline || "") }));
    if (s.subheadline) inner.appendChild(el("p", { class: "subheadline fadeIn", html: esc(s.subheadline) }));

    const wrap = el("div", { class: "twocol fadeIn" }, [
      el("section", { class: "card" }, [
        el("h3", { class: "cardTitle", html: esc(s.left?.title || "") }),
        buildBullets(s.left?.bullets || [])
      ]),
      el("section", { class: "card" }, [
        el("h3", { class: "cardTitle", html: esc(s.right?.title || "") }),
        buildBullets(s.right?.bullets || [])
      ])
    ]);

    inner.appendChild(wrap);
    return inner;
  }

  function slideClosing(s) {
    const inner = el("div", { class: "inner" });
    inner.appendChild(el("div", { class: "kicker", html: esc("Closing") }));
    inner.appendChild(el("h1", { class: "headline fadeIn", html: esc(s.headline || "") }));
    if (s.subheadline) inner.appendChild(el("p", { class: "subheadline fadeIn", html: esc(s.subheadline) }));
    if (Array.isArray(s.bullets) && s.bullets.length) inner.appendChild(buildBullets(s.bullets));
    return inner;
  }

  function buildSlide(slide) {
    switch (slide.type) {
      case "title": return slideTitle(slide);
      case "section": return slideSection(slide);
      case "beforeAfter": return slideBeforeAfter(slide);
      case "closing": return slideClosing(slide);
      case "content":
      default: return slideContent(slide);
    }
  }

  function render() {
    const app = qs("#app");
    app.innerHTML = "";

    const deck = state.deck;
    const slides = deck?.slides || [];
    const total = slides.length;
    state.index = clamp(state.index, 0, Math.max(0, total - 1));
    const s = slides[state.index] || {};

    document.title = deck?.meta?.title ? `${deck.meta.title}` : "Deck";

    const deckEl = el("div", { class: "deck" });

    deckEl.appendChild(buildTopbar(deck.meta || {}, total, state.index));

    const stage = el("div", { class: "stage" });
    const slide = el("article", {
      class: "slide",
      role: "group",
      "aria-roledescription": "slide",
      "aria-label": `${state.index + 1} of ${total}`
    });

    slide.appendChild(buildSlide(s));
    stage.appendChild(slide);
    deckEl.appendChild(stage);

    app.appendChild(deckEl);

    // Speaker note to console only (never rendered)
    if (s.note) {
      // eslint-disable-next-line no-console
      console.log(`Speaker note (slide ${state.index + 1}/${total}): ${s.note}`);
    }
  }

  function next() {
    state.index = Math.min(state.index + 1, state.deck.slides.length - 1);
    render();
  }
  function prev() {
    state.index = Math.max(state.index - 1, 0);
    render();
  }

  function onKey(e) {
    if (e.key === " " || e.code === "Space") {
      e.preventDefault();
      if (e.shiftKey) prev();
      else next();
      return;
    }
    if (e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); next(); return; }
    if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); prev(); return; }
    if (e.key === "Home") { e.preventDefault(); state.index = 0; render(); return; }
    if (e.key === "End") { e.preventDefault(); state.index = state.deck.slides.length - 1; render(); return; }
  }

  function bind() {
    window.addEventListener("keydown", onKey, { passive: false });
    window.addEventListener("resize", () => { computeCompactMode(); }, { passive: true });

    // Basic swipe support (mobile)
    let sx = null, sy = null;
    window.addEventListener("touchstart", (e) => {
      const t = e.touches?.[0];
      if (!t) return;
      sx = t.clientX; sy = t.clientY;
    }, { passive: true });

    window.addEventListener("touchend", (e) => {
      const t = e.changedTouches?.[0];
      if (!t || sx == null || sy == null) return;
      const dx = t.clientX - sx;
      const dy = t.clientY - sy;
      sx = sy = null;

      if (Math.abs(dx) < 55) return;
      if (Math.abs(dx) < Math.abs(dy)) return;
      if (dx < 0) next();
      else prev();
    }, { passive: true });
  }

  async function init() {
    computeCompactMode();
    bind();
    state.deck = await loadDeck();
    render();
  }

  init().catch(err => {
    const app = qs("#app");
    app.innerHTML = "";
    const msg = document.createElement("pre");
    msg.textContent = String(err?.message || err);
    msg.style.whiteSpace = "pre-wrap";
    msg.style.color = "rgba(234,240,255,.9)";
    msg.style.padding = "24px";
    app.appendChild(msg);
  });
})();
