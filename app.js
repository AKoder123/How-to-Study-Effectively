(function () {
  const state = {
    deck: null,
    index: 0,
    slidesEl: [],
  };

  const $ = (sel) => document.querySelector(sel);

  function setCompactMode() {
    // Trigger compact mode for short viewports to avoid any manual zoom.
    const h = window.innerHeight || document.documentElement.clientHeight;
    const compact = h < 720; // tuned for laptops + mobile landscape
    document.documentElement.dataset.compact = compact ? "1" : "0";
  }

  function el(tag, className, attrs = {}) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    for (const [k, v] of Object.entries(attrs)) {
      if (v === null || v === undefined) continue;
      if (k === "text") node.textContent = v;
      else node.setAttribute(k, v);
    }
    return node;
  }

  function renderProgress(total, active) {
    const progress = $("#progress");
    progress.innerHTML = "";
    for (let i = 0; i < total; i++) {
      const pip = el("span", "pip" + (i === active ? " active" : ""));
      progress.appendChild(pip);
    }
  }

  function renderSlide(slide, idx) {
    const wrap = el("section", "slide", { "data-idx": String(idx), role: "group", "aria-label": `Slide ${idx + 1}` });

    const kicker = el("div", "kicker", { text: state.deck?.meta?.title || "Presentation" });
    const headline = el("h1", "headline", { text: slide.headline || "" });

    wrap.appendChild(kicker);
    wrap.appendChild(headline);

    if (slide.subheadline) {
      wrap.appendChild(el("p", "subheadline", { text: slide.subheadline }));
    }

    if (slide.type === "beforeAfter") {
      const grid = el("div", "grid-2");
      const left = el("div", "panel");
      const right = el("div", "panel");

      left.appendChild(el("h3", "", { text: slide.left?.title || "Before" }));
      left.appendChild(renderBullets(slide.left?.bullets || []));

      right.appendChild(el("h3", "", { text: slide.right?.title || "After" }));
      right.appendChild(renderBullets(slide.right?.bullets || []));

      grid.appendChild(left);
      grid.appendChild(right);
      wrap.appendChild(grid);
    } else if (Array.isArray(slide.bullets) && slide.bullets.length) {
      wrap.appendChild(renderBullets(slide.bullets));
    }

    if (slide.note) {
      const note = el("div", "note");
      note.appendChild(el("span", "label", { text: "Speaker" }));
      note.appendChild(el("span", "", { text: slide.note }));
      wrap.appendChild(note);
    }

    return wrap;
  }

  function renderBullets(items) {
    const ul = el("ul", "list");
    for (const txt of items) {
      const li = el("li");
      li.appendChild(el("span", "bdot"));
      li.appendChild(el("div", "", { text: txt }));
      ul.appendChild(li);
    }
    return ul;
  }

  function show(idx) {
    const total = state.slidesEl.length;
    const next = Math.max(0, Math.min(idx, total - 1));
    state.index = next;

    for (const s of state.slidesEl) s.classList.remove("active");
    state.slidesEl[next].classList.add("active");

    renderProgress(total, next);

    // Keep focus on stage for keyboard control
    const stage = $("#stage");
    if (document.activeElement !== stage) stage.focus({ preventScroll: true });

    // Update URL hash for easy sharing
    history.replaceState(null, "", `#${next + 1}`);
  }

  function next() { show(state.index + 1); }
  function prev() { show(state.index - 1); }

  function onKey(e) {
    // Prevent scrolling on Space
    if (e.code === "Space") e.preventDefault();

    const isTyping = ["INPUT", "TEXTAREA"].includes((e.target && e.target.tagName) || "");
    if (isTyping) return;

    if (e.code === "ArrowRight" || e.code === "PageDown") next();
    else if (e.code === "ArrowLeft" || e.code === "PageUp") prev();
    else if (e.code === "Space") (e.shiftKey ? prev() : next());
  }

  function onWheel(e) {
    // Gentle trackpad flicks: small threshold
    const dy = e.deltaY || 0;
    if (Math.abs(dy) < 12) return;
    if (dy > 0) next();
    else prev();
  }

  async function loadDeck() {
    // Load content.json (content separation requirement).
    const res = await fetch("content.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load content.json (${res.status})`);
    return await res.json();
  }

  function initFromHash(total) {
    const n = parseInt((location.hash || "").replace("#", ""), 10);
    if (Number.isFinite(n) && n >= 1 && n <= total) return n - 1;
    return 0;
  }

  async function init() {
    setCompactMode();
    window.addEventListener("resize", setCompactMode);

    try {
      state.deck = await loadDeck();
    } catch (err) {
      // Friendly error for file:// environments where fetch may be blocked.
      const stage = $("#stage");
      stage.innerHTML = "";
      const s = el("section", "slide active");
      s.appendChild(el("div", "kicker", { text: "Setup" }));
      s.appendChild(el("h1", "headline", { text: "This deck needs local file access" }));
      s.appendChild(el("p", "subheadline", { text: "Open with a simple local server so content.json can load." }));
      s.appendChild(renderBullets([
        "VS Code: install “Live Server” and click “Go Live”",
        "Or run: python -m http.server (in this folder)",
        "Then open http://localhost:8000"
      ]));
      stage.appendChild(s);
      console.error(err);
      return;
    }

    $("#deckTitle").textContent = state.deck.meta?.title || "Deck";
    document.title = state.deck.meta?.title || "Deck";

    const stage = $("#stage");
    stage.innerHTML = "";

    const slides = state.deck.slides || [];
    state.slidesEl = slides.map((sl, i) => renderSlide(sl, i));
    for (const node of state.slidesEl) stage.appendChild(node);

    document.addEventListener("keydown", onKey, { passive: false });
    document.addEventListener("wheel", onWheel, { passive: true });

    const start = initFromHash(state.slidesEl.length);
    show(start);
  }

  init();
})();
