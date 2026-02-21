/* Deck runtime — no slide text is hardcoded here. */
(() => {
  const $ = (sel) => document.querySelector(sel);

  const state = {
    deck: null,
    i: 0,
    lastNavAt: 0,
  };

  function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

  function setCompactClass(){
    const h = window.innerHeight || 800;
    document.body.classList.toggle('compact', h < 740);
    document.body.classList.toggle('ultra', h < 640);
  }

  function toast(msg){
    const el = $('#toast');
    if(!el) return;
    el.textContent = msg;
    el.classList.add('show');
    window.clearTimeout(toast._t);
    toast._t = window.setTimeout(() => el.classList.remove('show'), 950);
  }

  function render(){
    const { deck, i } = state;
    if(!deck) return;

    const slide = deck.slides[i];
    $('#deckTitle').textContent = deck.meta?.title ?? 'Deck';
    $('#slideIndex').textContent = String(i + 1);
    $('#slideTotal').textContent = String(deck.slides.length);

    const host = $('#slide');
    host.innerHTML = '';

    const inner = document.createElement('div');
    inner.className = 'slide-inner';
    host.appendChild(inner);

    // Header area (headline + subheadline)
    const top = document.createElement('div');
    top.className = 'topline';
    inner.appendChild(top);

    const left = document.createElement('div');
    left.style.minWidth = '0';
    top.appendChild(left);

    const kicker = document.createElement('div');
    kicker.className = 'kicker fade-in';
    kicker.textContent = slide.type === 'title' ? 'A 2‑minute system' :
                         slide.type === 'closing' ? 'Takeaway' :
                         slide.type === 'beforeAfter' ? 'Swap the method' : 'Key idea';
    left.appendChild(kicker);

    const h1 = document.createElement('h1');
    h1.className = 'h1 fade-in delay1';
    h1.textContent = slide.headline ?? '';
    left.appendChild(h1);

    if(slide.subheadline){
      const h2 = document.createElement('p');
      h2.className = 'h2 fade-in delay2';
      h2.textContent = slide.subheadline;
      left.appendChild(h2);
    }

    const right = document.createElement('div');
    right.style.display = 'flex';
    right.style.alignItems = 'flex-start';
    right.style.gap = '10px';
    top.appendChild(right);

    // Notes badge (if present)
    if(slide.note){
      const b = document.createElement('span');
      b.className = 'badge warn fade-in delay2';
      b.textContent = 'Speaker';
      b.title = slide.note;
      right.appendChild(b);
    }

    const divider = document.createElement('div');
    divider.className = 'divider fade-in delay2';
    inner.appendChild(divider);

    const content = document.createElement('div');
    content.className = 'content';
    inner.appendChild(content);

    // Render by slide type
    if(slide.type === 'title'){
      content.appendChild(renderTitle(slide));
    } else if(slide.type === 'beforeAfter'){
      content.appendChild(renderBeforeAfter(slide));
    } else {
      content.appendChild(renderBullets(slide));
    }

    // Fit guard (very defensive): if content is too tall, enable compact.
    window.requestAnimationFrame(() => {
      const over = host.scrollHeight - host.clientHeight;
      if(over > 1){
        document.body.classList.add('compact');
      }
      // If still overflowing, apply ultra
      window.requestAnimationFrame(() => {
        const over2 = host.scrollHeight - host.clientHeight;
        if(over2 > 1){
          document.body.classList.add('ultra');
        }
      });
    });
  }

  function renderTitle(slide){
    const wrap = document.createElement('div');
    wrap.className = 'hero';

    const chips = document.createElement('div');
    chips.className = 'chips fade-in delay2';

    (slide.bullets || []).slice(0, 6).forEach((t) => {
      const c = document.createElement('span');
      c.className = 'chip';
      c.innerHTML = '<strong>•</strong> ' + escapeHtml(t);
      chips.appendChild(c);
    });

    const cta = document.createElement('div');
    cta.className = 'hero-cta fade-in delay3';
    const spark = document.createElement('div');
    spark.className = 'spark';
    const p = document.createElement('div');
    p.style.minWidth = '0';
    p.innerHTML = '<div style="font-size:13px;color:rgba(234,240,255,.78);line-height:1.35;">' +
      (slide.note ? escapeHtml(slide.note) : 'Press Space to advance') +
      '</div>';
    cta.appendChild(spark);
    cta.appendChild(p);

    wrap.appendChild(chips);
    wrap.appendChild(cta);
    return wrap;
  }

  function renderBullets(slide){
    const ul = document.createElement('ul');
    ul.className = 'bullets';
    (slide.bullets || []).slice(0, 6).forEach((t, idx) => {
      const li = document.createElement('li');
      li.className = 'fade-in ' + (idx === 0 ? 'delay1' : idx === 1 ? 'delay2' : idx === 2 ? 'delay3' : '');
      const m = document.createElement('span');
      m.className = 'mark';
      const tx = document.createElement('div');
      tx.className = 'txt';
      tx.textContent = t;
      li.appendChild(m);
      li.appendChild(tx);
      ul.appendChild(li);
    });

    // Optional: if note exists and not title, show as subtle card
    if(slide.note){
      const card = document.createElement('div');
      card.className = 'card fade-in delay3';
      const ct = document.createElement('div');
      ct.className = 'ct';
      ct.innerHTML = '<div class="title">Say this</div><span class="badge good">Line</span>';
      const body = document.createElement('div');
      body.style.color = 'rgba(234,240,255,.82)';
      body.style.fontSize = 'var(--b)';
      body.style.lineHeight = '1.35';
      body.textContent = slide.note;
      card.appendChild(ct);
      card.appendChild(body);

      const stack = document.createElement('div');
      stack.style.display = 'grid';
      stack.style.gridTemplateColumns = '1fr';
      stack.style.gap = 'var(--gap)';
      stack.appendChild(ul);
      stack.appendChild(card);
      return stack;
    }

    return ul;
  }

  function renderBeforeAfter(slide){
    const grid = document.createElement('div');
    grid.className = 'grid2';

    const a = buildSide(slide.left, 'warn', 'Before');
    const b = buildSide(slide.right, 'good', 'After');

    grid.appendChild(a);
    grid.appendChild(b);

    return grid;
  }

  function buildSide(obj, badgeKind, fallbackLabel){
    const card = document.createElement('div');
    card.className = 'card fade-in delay1';

    const ct = document.createElement('div');
    ct.className = 'ct';

    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = obj?.title || fallbackLabel;

    const badge = document.createElement('span');
    badge.className = 'badge ' + (badgeKind || '');
    badge.textContent = badgeKind === 'good' ? 'Do this' : 'Avoid';

    ct.appendChild(title);
    ct.appendChild(badge);
    card.appendChild(ct);

    const ul = document.createElement('ul');
    ul.className = 'mini';
    (obj?.bullets || []).slice(0, 6).forEach((t, idx) => {
      const li = document.createElement('li');
      li.className = 'fade-in ' + (idx === 0 ? 'delay1' : idx === 1 ? 'delay2' : 'delay3');
      const d = document.createElement('span');
      d.className = 'dot';
      const tx = document.createElement('div');
      tx.className = 'txt';
      tx.textContent = t;
      li.appendChild(d);
      li.appendChild(tx);
      ul.appendChild(li);
    });

    card.appendChild(ul);
    return card;
  }

  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, (m) => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[m]));
  }

  function nav(delta){
    const now = Date.now();
    if(now - state.lastNavAt < 110) return; // debounce
    state.lastNavAt = now;

    const deck = state.deck;
    if(!deck) return;

    const next = clamp(state.i + delta, 0, deck.slides.length - 1);
    if(next === state.i){
      toast(delta > 0 ? 'End' : 'Start');
      return;
    }
    state.i = next;
    render();
  }

  function onKey(e){
    // Ignore typing in inputs (future-proof)
    const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
    if(tag === 'input' || tag === 'textarea') return;

    if(e.code === 'Space'){
      e.preventDefault();
      if(e.shiftKey) nav(-1);
      else nav(1);
    } else if(e.code === 'ArrowRight' || e.code === 'PageDown'){
      e.preventDefault(); nav(1);
    } else if(e.code === 'ArrowLeft' || e.code === 'PageUp'){
      e.preventDefault(); nav(-1);
    } else if(e.code === 'Home'){
      e.preventDefault(); state.i = 0; render();
    } else if(e.code === 'End'){
      e.preventDefault(); state.i = state.deck.slides.length - 1; render();
    }
  }

  async function boot(){
    setCompactClass();
    window.addEventListener('resize', () => {
      setCompactClass();
      render();
    }, { passive: true });

    document.addEventListener('keydown', onKey);

    // Tap/click to advance on mobile
    document.addEventListener('click', (e) => {
      // avoid advancing if clicking on kbd or HUD
      const t = e.target;
      if(t && t.closest && (t.closest('.hud') || t.closest('.toast'))) return;
      nav(1);
    });

    try{
      const res = await fetch('./content.json', { cache: 'no-store' });
      if(!res.ok) throw new Error('Failed to load content.json');
      state.deck = await res.json();
      state.i = 0;
      render();
    } catch (err){
      console.error(err);
      $('#slide').innerHTML = '<div class="slide-inner"><h1 class="h1">Could not load deck</h1><p class="h2">Make sure content.json is next to index.html.</p></div>';
    }
  }

  boot();
})();
