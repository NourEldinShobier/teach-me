/* Teach Me runtime. Shipped with the plugin; lessons never rewrite this file.
   Components are elements with data-tm="<name>" holding one <script type="application/json"> config.
   Custom figures register with tm.scene(), tm.sim() or tm.trace() before DOMContentLoaded. */
(() => {
  'use strict';
  const tm = (window.tm = window.tm || {});
  const Q = new URLSearchParams(location.search);
  const REDUCED = Q.get('reduced') === '1' || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const NS = 'http://www.w3.org/2000/svg';
  tm.scenes = tm.scenes || {}; tm.sims = tm.sims || {}; tm.traces = tm.traces || {};
  tm.scene = (name, def) => (tm.scenes[name] = def);
  tm.sim = (name, def) => (tm.sims[name] = def);
  tm.trace = (name, fn) => (tm.traces[name] = fn);
  tm.players = [];
  tm.reduced = REDUCED;
  tm.pageErrors = [];
  addEventListener('error', (e) => tm.pageErrors.push(String(e.message || e.error)));
  addEventListener('unhandledrejection', (e) => tm.pageErrors.push('unhandled rejection: ' + (e.reason?.message || e.reason)));

  /* ---------- small helpers ---------- */
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const h = (tag, attrs = {}, ...kids) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) if (kid != null) el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    return el;
  };
  const svg = (tag, attrs = {}, parent) => {
    const el = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) if (v != null) el.setAttribute(k, v);
    if (parent) parent.append(el);
    return el;
  };
  // Isometric projection: x right-down, y left-down, z up. Unit = px.
  const iso = (x, y, z = 0) => [(x - y) * 0.866, (x + y) * 0.5 - z];
  const hash = (s) => { let x = 2166136261; for (const c of String(s)) x = Math.imul(x ^ c.charCodeAt(0), 16777619); return x >>> 0; };
  const shuffleIdx = (n, seed) => { const a = [...Array(n).keys()]; let s = seed || 1; for (let i = n - 1; i > 0; i--) { s = Math.imul(s ^ (s >>> 15), 2246822507) >>> 0; const j = s % (i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const toast = (msg) => { const t = h('div', { class: 'tm-toast', role: 'status', text: msg }); document.body.append(t); setTimeout(() => t.remove(), 1800); };
  // Lucide icons (ISC licence, lucide.dev), inlined so lessons stay one file.
  const ICON_PATHS = {
    play: '<path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"/>',
    pause: '<rect x="14" y="3" width="5" height="18" rx="1"/><rect x="5" y="3" width="5" height="18" rx="1"/>',
    prev: '<path d="m15 18-6-6 6-6"/>', next: '<path d="m9 18 6-6-6-6"/>',
    reset: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
    volume: '<path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"/><path d="M16 9a5 5 0 0 1 0 6"/><path d="M19.364 18.364a9 9 0 0 0 0-12.728"/>',
    copy: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
    moon: '<path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"/>',
    auto: '<path d="M12 2v2"/><path d="M14.837 16.385a6 6 0 1 1-7.223-7.222c.624-.147.97.66.715 1.248a4 4 0 0 0 5.26 5.259c.589-.255 1.396.09 1.248.715"/><path d="M16 12a4 4 0 0 0-4-4"/><path d="m19 5-1.256 1.256"/><path d="M20 12h2"/>'
  };
  const icon = (n) => '<svg class="tm-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON_PATHS[n] + '</svg>';
  const fillRange = (r) => r.style.setProperty('--v', ((r.value - r.min) / ((r.max - r.min) || 1)) * 100 + '%');
  tm.icon = icon;
  const copy = async (text) => { try { await navigator.clipboard.writeText(text); toast('Copied'); } catch { prompt('Copy this:', text); } };
  const download = (name, text, type = 'application/json') => { const a = h('a', { href: URL.createObjectURL(new Blob([text], { type })), download: name }); document.body.append(a); a.click(); a.remove(); };
  Object.assign(tm, { h, svg, iso, clamp, lerp, ease, hash, copy, toast });

  /* ---------- storage (page must work without it) ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };
  const lessonId = document.querySelector('meta[name="tm-lesson"]')?.content
    || (document.title || 'lesson').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const PKEY = 'tm:' + lessonId;
  const progress = store.get(PKEY, null) || { v: 1, lessonId, title: document.title, steps: {}, quiz: {}, predictions: {}, cards: {}, explain: {} };
  const saveProgress = () => { progress.updated = new Date().toISOString(); store.set(PKEY, progress); };
  tm.progress = progress;
  tm.store = store;

  /* ---------- Player: one clock for steps (scenes, diagrams, steppers) ---------- */
  class Player {
    constructor(o) {
      this.steps = o.steps; this.onFrame = o.onFrame; this.onState = o.onState || (() => {});
      this.i = -1; this.p = 1; this.playing = false; this.auto = !!o.auto; this.speed = 1;
      this.hold = 0; this.holdStep = o.holdStep ?? 0.35; this.loopGap = o.loopGap ?? 3;
      this.visible = true; this.raf = 0; this.id = o.id;
      tm.players.push(this);
    }
    get n() { return this.steps.length; }
    dur(i) { return REDUCED ? 0.001 : Math.max(0.001, this.steps[i]?.dur ?? 1); }
    total() { return this.steps.reduce((s, st) => s + (st.dur ?? 1), 0); }
    render() { this.onFrame(this.i, this.p); this.onState(); }
    goto(i, p = 1) { this.stop(); this.restarting = false; this.hold = 0; this.i = clamp(i, -1, this.n - 1); this.p = p; this.render(); }
    reset() { this.goto(-1, 1); }
    run(i) { this.i = i; this.p = 0; this.hold = 0; this.playing = true; this.render(); this.loop(); }
    next() { if (this.i < this.n - 1) this.run(this.i + 1); }
    play() { this.auto = true; if (this.i >= this.n - 1 && this.p >= 1) this.i = -1, this.p = 1; this.playing = true; this.hold = 0; this.loop(); this.onState(); }
    stop() { this.playing = false; this.onState(); }
    loop() {
      if (this.raf) return;
      let last = performance.now();
      const tick = (now) => {
        const dt = clamp((now - last) / 1000, 0, 1 / 30) * this.speed; last = now;
        if (!this.playing) { this.raf = 0; return; }
        if (this.visible) this.advance(dt);
        this.raf = requestAnimationFrame(tick);
      };
      this.raf = requestAnimationFrame(tick);
    }
    advance(dt) {
      if (this.hold > 0) { this.hold -= dt; return; }
      if (this.i === -1 || (this.p >= 1 && this.auto)) {
        if (this.i >= this.n - 1) { // finished the loop: rest, then start over
          if (this.restarting) { this.restarting = false; this.i = -1; this.p = 1; this.render(); this.hold = 0.5; return; }
          this.restarting = true; this.hold = this.loopGap; return;
        }
        this.i += 1; this.p = 0; this.render();
        return;
      }
      this.p = Math.min(1, this.p + dt / this.dur(this.i));
      this.render();
      if (this.p >= 1) {
        if (this.auto) this.hold = REDUCED ? 1.2 : this.holdStep + (this.steps[this.i]?.hold ?? 0);
        else this.stop();
      }
    }
    seek(t) { // replay the timeline from zero to time t (seconds, real playback time at speed 1)
      this.stop(); let acc = 0;
      for (let i = 0; i < this.n; i++) {
        const d = this.steps[i].dur ?? 1;
        if (t <= acc + d) { this.i = i; this.p = d ? clamp((t - acc) / d, 0, 1) : 1; this.render(); return; }
        acc += d;
      }
      this.i = this.n - 1; this.p = 1; this.render();
    }
  }
  tm.Player = Player;
  tm.seek = (t, idx = 0) => tm.players[idx]?.seek(t);
  // Jump detection for the critic: scrub at dt steps, flag frames whose motion is far above their neighbours.
  tm.scan = (idx = 0, dt = 0.1) => {
    const pl = tm.players[idx]; if (!pl) return { error: 'no player' };
    const root = pl.stage || document;
    let els = [...root.querySelectorAll('[data-track]')];
    if (!els.length) els = [...root.querySelectorAll('svg g, svg circle, svg rect, svg path')].filter((e) => !e.closest('.tm-ico')).slice(0, 200); // UI icons are not figure parts
    // Hidden parts don't count: something that fades out and reappears elsewhere is a cut, not a jump.
    const shown = (e) => { const cs = getComputedStyle(e); return cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.05 && e.getAttribute('opacity') !== '0'; };
    const pos = () => els.map((e) => { if (!shown(e)) return null; const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; });
    const deltas = []; let prev = null;
    for (let t = 0; t <= pl.total() + 1e-9; t += dt) {
      pl.seek(t); const cur = pos();
      if (prev) deltas.push({ t: +t.toFixed(2), d: cur.reduce((s, c, i) => (c && prev[i] ? s + Math.abs(c[0] - prev[i][0]) + Math.abs(c[1] - prev[i][1]) + Math.abs(c[2] - prev[i][2]) + Math.abs(c[3] - prev[i][3]) : s), 0) });
      prev = cur;
    }
    const jumps = deltas.filter((f, i) => {
      const nb = deltas.slice(Math.max(0, i - 3), i).concat(deltas.slice(i + 1, i + 4)).map((x) => x.d).sort((a, b) => a - b);
      const med = nb[Math.floor(nb.length / 2)] || 0;
      return f.d > 40 && f.d > 3 * Math.max(med, 4);
    });
    pl.reset();
    return { frames: deltas.length, tracked: els.length, jumps };
  };

  const watchVisible = (el, pl) => {
    if (!('IntersectionObserver' in window)) return;
    new IntersectionObserver(([e]) => { pl.visible = e.isIntersecting; if (e.isIntersecting && pl.autoStartWhenVisible) { pl.autoStartWhenVisible = false; pl.play(); } }, { threshold: 0.25 }).observe(el);
  };
  const cardKeys = (card, pl, onSpace) => {
    card.tabIndex = 0;
    card.addEventListener('keydown', (e) => {
      if (e.target.closest('input, textarea, select') || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === 'ArrowRight') { pl.goto(pl.i + 1); e.preventDefault(); }
      else if (e.key === 'ArrowLeft') { pl.goto(pl.i - 1); e.preventDefault(); }
      else if (e.key === ' ' || e.key === 'Enter') { if (e.target !== card) return; onSpace(); e.preventDefault(); }
      else if (e.key.toLowerCase() === 'r') pl.reset();
      else if (/^[1-9]$/.test(e.key)) { const b = card.querySelectorAll('.tm-step')[+e.key - 1]; if (b && !b.disabled) { b.click(); e.preventDefault(); } } // digit = press that step button
    });
  };
  let figN = 0, uidN = 0;
  const TONES = ['blue', 'violet', 'emerald', 'amber', 'cyan', 'rose'];
  const figNum = (cfg) => { if (typeof cfg.fig === 'number') figN = Math.max(figN, cfg.fig); return cfg.fig || ++figN; };
  const cardHead = (cfg, extra = []) => h('div', { class: 'tm-card-head' }, h('span', { class: 'tm-fig', text: 'Fig ' + figNum(cfg) }), h('b', { text: cfg.title || '' }), h('span', { class: 'tm-sp' }), ...extra);
  const modeKey = (kind) => 'tm:mode:' + kind;
  const modeToggle = (kind, pl, def) => {
    const forced = Q.get('auto'); let auto = forced != null ? forced === '1' : store.get(modeKey(kind), def) === 'auto';
    const bM = h('button', { type: 'button', text: 'Manual' }), bA = h('button', { type: 'button', text: 'Auto' });
    const seg = h('span', { class: 'tm-seg', role: 'group', 'aria-label': 'Play mode' }, bM, bA);
    const set = (a, persist) => { auto = a; pl.auto = a; bM.setAttribute('aria-pressed', !a); bA.setAttribute('aria-pressed', a); if (persist) store.set(modeKey(kind), a ? 'auto' : 'manual'); if (a) pl.play(); else pl.goto(pl.i, 1); };
    bM.onclick = () => set(false, true); bA.onclick = () => set(true, true);
    bM.setAttribute('aria-pressed', !auto); bA.setAttribute('aria-pressed', auto); pl.auto = auto;
    return { seg, get auto() { return auto; } };
  };
  const speedSeg = (pl) => {
    const opts = [0.5, 1, 2]; const btns = opts.map((s) => h('button', { type: 'button', text: s + '×', 'aria-pressed': s === 1, onclick: () => { pl.speed = s; btns.forEach((b, i) => b.setAttribute('aria-pressed', opts[i] === s)); } }));
    return h('span', { class: 'tm-seg', role: 'group', 'aria-label': 'Speed' }, ...btns);
  };
  const chipsInto = (box, chips) => {
    box.replaceChildren(...(chips || []).map((c) => h('span', { class: 'tm-chip' + (c.hot ? ' tm-hot' : '') }, (c.k ?? c.label) + ' ', h('b', { text: c.v ?? c.value }))));
  };
  const recordStep = (id, i, n) => { const s = (progress.steps[id] ||= { reached: -1, total: n }); if (i > s.reached) { s.reached = i; s.total = n; saveProgress(); } };

  /* ---------- scene: step buttons, manual/auto, hint, chips, speed badge ---------- */
  function mountScene(el, cfg, def) {
    def = def || tm.scenes[cfg.name];
    if (!def) throw new Error('scene "' + cfg.name + '" is not registered (tm.scene)');
    const id = cfg.id || 'scene-' + (cfg.name || cfg.title || ++uidN);
    const steps = cfg.steps.map((s) => ({ ...s, dur: s.dur ?? 1.2 }));
    const stage = h('div', { class: 'tm-stage' });
    const hint = h('div', { class: 'tm-hint', 'aria-live': 'polite' });
    const chips = h('div', { class: 'tm-chips', 'aria-live': 'polite' });
    const badge = h('span', { class: 'tm-badge', hidden: true });
    const startOver = h('button', { class: 'tm-iconbtn', type: 'button', text: 'Start over' });
    const sound = h('div', { class: 'tm-sound', 'aria-hidden': 'true' });
    stage.append(sound);
    const stepBtns = steps.map((s, k) => h('button', { class: 'tm-step', type: 'button' }, h('span', { class: 'tm-num', text: k + 1 }), h('span', { text: s.label })));
    const col = h('div', { class: 'tm-steps', role: 'group', 'aria-label': 'Steps' }, ...stepBtns);
    let pl;
    const ctx = def.setup(stage, { svg, iso, h, cfg });
    const restHint = cfg.restHint || 'Press <b>1</b> to start.';
    const showSound = (s) => {
      if (!s) { sound.style.opacity = 0; return; }
      sound.textContent = s.text; sound.style.left = (s.x ?? 50) + '%'; sound.style.top = (s.y ?? 20) + '%'; sound.style.opacity = 1;
    };
    // Reserve the tallest step hint for the current width, so the figure never shifts when hint length changes.
    let fitW = 0;
    const fitHint = () => {
      const keep = hint.innerHTML; let m = 0; hint.style.minHeight = '';
      for (const t of [restHint, ...steps.map((st) => st.hint || st.label)]) { hint.innerHTML = t; m = Math.max(m, hint.offsetHeight); }
      hint.innerHTML = keep; hint.style.minHeight = m + 'px'; fitW = hint.offsetWidth;
    };
    const onFrame = (i, p) => {
      if (hint.offsetWidth && hint.offsetWidth !== fitW) fitHint();
      const out = def.frame(ctx, i, p) || {};
      chipsInto(chips, out.chips);
      showSound(out.sound ?? (i >= 0 && p < 1 && steps[i].sound ? { text: steps[i].sound, ...(steps[i].soundAt || {}) } : null));
      const s = steps[i];
      hint.innerHTML = out.hint ?? (i < 0 ? restHint : (s.hint || s.label));
      if (s && s.seconds && s.dur && !REDUCED) {
        const r = s.seconds / s.dur;
        badge.textContent = r >= 1 ? '×' + (r >= 10 ? Math.round(r) : +r.toFixed(1)) : '×1/' + Math.round(1 / r);
        badge.hidden = badge.textContent === '×1' || badge.textContent === '×1/1';
        badge.title = 'Real time ' + s.seconds + ' s, shown in ' + s.dur + ' s';
      } else badge.hidden = true;
      stepBtns.forEach((b, k) => b.style.setProperty('--p', k < i ? 1 : k === i ? p : 0));
      if (i >= 0) recordStep(id, i, steps.length);
    };
    const onState = () => {
      stepBtns.forEach((b, k) => {
        const done = k < pl.i || (k === pl.i && pl.p >= 1);
        const now = k === pl.i && pl.p < 1;
        const isNext = !pl.playing && ((pl.i === -1 && k === 0) || (k === pl.i + 1 && pl.p >= 1));
        b.classList.toggle('tm-done', done && !now); b.classList.toggle('tm-now', now); b.classList.toggle('tm-next', isNext);
        b.disabled = pl.auto ? false : !isNext;
        b.setAttribute('aria-current', now ? 'step' : 'false');
      });
    };
    pl = new Player({ steps, onFrame, onState, id, loopGap: cfg.loopGap });
    pl.stage = stage;
    stepBtns.forEach((b, k) => (b.onclick = () => { if (mode.auto) { pl.stop(); mode.seg.children[0].click(); } pl.goto(k - 1); pl.run(k); }));
    startOver.onclick = () => pl.reset();
    const mode = modeToggle('scene', pl, cfg.mode || 'manual');
    const card = h('div', { class: 'tm-card tm-scene-card' },
      cardHead(cfg, [badge, mode.seg, startOver]), hint,
      h('div', { class: 'tm-scene' }, col, stage), chips);
    el.replaceChildren(card);
    cardKeys(card, pl, () => pl.next());
    watchVisible(card, pl);
    const qs = Q.get('step');
    if (qs != null) pl.goto(+qs - 1, 1); else pl.reset();
    if (mode.auto && qs == null) pl.autoStartWhenVisible = true;
    pl.autoOnReveal = () => mode.auto;
    return pl;
  }

  /* ---------- diagram: JSON spec -> SVG boxes and arrows, with a step-through trace ---------- */
  function mountDiagram(el, cfg) {
    const CW = cfg.cellW || 190, CH = cfg.cellH || 110, NW = cfg.nodeW || 150, NH = cfg.nodeH || 56, PAD = 30;
    const nodes = Object.fromEntries(cfg.nodes.map((n) => [n.id, { ...n, cx: PAD + n.col * CW + CW / 2, cy: PAD + 20 + n.row * CH + CH / 2 }]));
    const cols = Math.max(...cfg.nodes.map((n) => n.col)) + 1, rows = Math.max(...cfg.nodes.map((n) => n.row)) + 1;
    const W = PAD * 2 + cols * CW, H = PAD * 2 + 20 + rows * CH;
    const edgeKey = (a, b) => a + '>' + b;
    const def = {
      setup(stage) {
        const s = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'tm-svg', role: 'img', 'aria-label': cfg.title || 'diagram' }, stage);
        const defs = svg('defs', {}, s);
        const mk = (id, cls) => { const m = svg('marker', { id, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, defs); svg('path', { d: 'M0,0 L10,5 L0,10 z', class: cls }, m); };
        const uid = 'd' + hash(cfg.title + Math.random()); mk(uid + 'a', 'tm-arrow'); mk(uid + 'h', 'tm-arrow-hot');
        const st = document.createElement('style'); st.textContent = `.tm-arrow{fill:var(--muted)}.tm-arrow-hot{fill:var(--accent)}`; s.append(st);
        for (const z of cfg.zones || []) {
          const ns = z.nodes.map((id) => nodes[id]);
          const x0 = Math.min(...ns.map((n) => n.cx)) - NW / 2 - 16, x1 = Math.max(...ns.map((n) => n.cx)) + NW / 2 + 16;
          const y0 = Math.min(...ns.map((n) => n.cy)) - NH / 2 - 30, y1 = Math.max(...ns.map((n) => n.cy)) + NH / 2 + 14;
          svg('rect', { x: x0 - (z.pad || 0), y: y0 - (z.pad || 0), width: x1 - x0 + 2 * (z.pad || 0), height: y1 - y0 + 2 * (z.pad || 0), rx: 14, class: 'zone ' + (z.tone ? 'tone-' + z.tone + ' ' : '') + (z.class || '') }, s);
          svg('text', { x: x0 - (z.pad || 0) + 12, y: y0 - (z.pad || 0) + 18, class: 'sub' }, s).textContent = z.label;
        }
        const edges = {};
        const border = (n, tx, ty) => { const dx = tx - n.cx, dy = ty - n.cy; const k = Math.min((NW / 2 + 4) / Math.abs(dx || 1e-9), (NH / 2 + 4) / Math.abs(dy || 1e-9)); return [n.cx + dx * k, n.cy + dy * k]; };
        for (const e of cfg.edges || []) {
          const a = nodes[e.from], b = nodes[e.to];
          const [x1, y1] = border(a, b.cx, b.cy), [x2, y2] = border(b, a.cx, a.cy);
          const g = svg('g', {}, s);
          const line = svg('path', { d: `M${x1},${y1} L${x2},${y2}`, class: 'edge', 'marker-end': `url(#${uid}a)` }, g);
          if (e.label) { const t = svg('text', { x: (x1 + x2) / 2 + (x1 === x2 ? 8 : 0), y: (y1 + y2) / 2 - (y1 === y2 ? 8 : 0), 'text-anchor': x1 === x2 ? 'start' : 'middle', class: 'sub halo' }, g); t.textContent = e.label; }
          edges[edgeKey(e.from, e.to)] = { line, x1, y1, x2, y2, uid };
        }
        const nodeEls = {};
        for (const n of Object.values(nodes)) {
          const g = svg('g', { class: 'node tone-' + (n.tone || TONES[(n.col || 0) % TONES.length]), tabindex: 0, role: 'button', 'aria-label': n.label + (n.tip ? ': ' + n.tip.replace(/<[^>]+>/g, '') : '') }, s);
          svg('rect', { x: n.cx - NW / 2, y: n.cy - NH / 2, width: NW, height: NH, rx: 10 }, g);
          svg('text', { x: n.cx, y: n.cy + (n.sub ? -3 : 5), 'text-anchor': 'middle', class: 'lbl' }, g).textContent = n.label;
          if (n.sub) svg('text', { x: n.cx, y: n.cy + 14, 'text-anchor': 'middle', class: 'sub' }, g).textContent = n.sub;
          const show = () => { if (n.tip && hintEl) hintEl.innerHTML = `<b>${esc(n.label)}</b> ${n.tip}`; };
          g.addEventListener('click', show); g.addEventListener('keydown', (e) => { if (e.key === 'Enter') show(); });
          nodeEls[n.id] = g;
        }
        const packet = svg('circle', { r: 7, class: 'packet', 'data-track': '', opacity: 0 }, s);
        return { s, edges, nodeEls, packet };
      },
      frame(c, i, p) {
        Object.values(c.nodeEls).forEach((g) => g.classList.remove('hot'));
        Object.values(c.edges).forEach((e) => { e.line.classList.remove('hot'); e.line.setAttribute('marker-end', `url(#${e.uid}a)`); });
        c.packet.setAttribute('opacity', 0);
        if (i < 0) return { chips: cfg.restChips };
        const st = cfg.steps[i];
        (st.nodes || []).forEach((id) => c.nodeEls[id]?.classList.add('hot'));
        const path = st.path || [];
        const segs = [];
        for (let k = 0; k < path.length - 1; k++) {
          const e = c.edges[edgeKey(path[k], path[k + 1])], r = c.edges[edgeKey(path[k + 1], path[k])];
          if (e) segs.push([e.x1, e.y1, e.x2, e.y2, e]); else if (r) segs.push([r.x2, r.y2, r.x1, r.y1, r]);
        }
        segs.forEach(([, , , , e]) => { e.line.classList.add('hot'); e.line.setAttribute('marker-end', `url(#${e.uid}h)`); });
        path.forEach((id) => c.nodeEls[id]?.classList.add('hot'));
        if (segs.length && p > 0.04 && p < 0.96) { // hidden at the ends: it is "inside" a box between steps
          const f = ease(p) * segs.length, k = Math.min(segs.length - 1, Math.floor(f)), t = f - k, [x1, y1, x2, y2] = segs[k];
          c.packet.setAttribute('cx', lerp(x1, x2, t)); c.packet.setAttribute('cy', lerp(y1, y2, t)); c.packet.setAttribute('opacity', t > 0.06 && t < 0.94 ? 1 : 0);
        }
        return { chips: st.chips };
      },
    };
    let hintEl;
    const steps = cfg.steps && cfg.steps.length ? cfg.steps : [{ label: 'Explore', hint: 'Click any box to see what it does.', dur: 0.01 }];
    const pl = mountScene(el, { ...cfg, steps: steps.map((s) => ({ dur: 1.6, ...s })), restHint: cfg.restHint || 'Click a box to see what it does, or press <b>1</b> to trace a request.' }, def);
    hintEl = el.querySelector('.tm-hint');
    return pl;
  }

  /* ---------- code stepper: real trace frames, line highlight, variables, console ---------- */
  function mountStepper(el, cfg) {
    const id = cfg.id || 'stepper-' + hash(cfg.code || cfg.trace);
    let params = Object.fromEntries((cfg.params || []).map((p) => [p.id, p.value]));
    const fill = (code) => code.replace(/\{\{(\w+)\}\}/g, (_, k) => (k in params ? params[k] : `{{${k}}}`));
    let frames = cfg.frames || [], lastI = null;
    const recompute = () => {
      lastI = null; if (!cfg.trace) return;
      try { const r = tm.traces[cfg.trace](params); frames = (r.frames || r).slice(0, 400); }
      catch (e) { frames = [{ line: 0, vars: {}, note: 'This value breaks the trace: ' + esc(e.message) }]; }
    };
    recompute();
    const codeBox = h('div', { class: 'tm-code', role: 'region', 'aria-label': 'Code' });
    const vars = h('table', { class: 'tm-vars' });
    const out = h('pre', { class: 'tm-console', 'aria-live': 'polite', 'aria-label': 'Output' });
    const note = h('div', { class: 'tm-note', 'aria-live': 'polite' });
    const side = h('div', { class: 'tm-side' }, h('h4', { text: cfg.varsTitle || 'Variables' }), vars, h('h4', { text: 'Output' }), out);
    let lines = [];
    const drawCode = () => { lines = fill(cfg.code).replace(/\n$/, '').split('\n').map((t) => h('span', { class: 'ln', text: t || ' ' })); codeBox.replaceChildren(...lines); };
    drawCode();
    const counter = h('span', { class: 'tm-badge' });
    const scrub = h('input', { type: 'range', class: 'tm-scrub', min: 0, max: frames.length, value: 0, 'aria-label': 'Step' });
    const onFrame = (i) => {
      if (i === lastI) return; lastI = i;
      const f = frames[i] || { line: 0, vars: {}, note: cfg.restNote || 'Press play to run the code one step at a time.' };
      const prev = frames[i - 1]?.vars || {};
      lines.forEach((l, k) => l.classList.toggle('tm-cur', k + 1 === f.line));
      const cur = lines[f.line - 1]; // scroll only the code panel, never the page
      if (cur && (cur.offsetTop < codeBox.scrollTop || cur.offsetTop > codeBox.scrollTop + codeBox.clientHeight - 30)) codeBox.scrollTop = cur.offsetTop - codeBox.clientHeight / 3;
      vars.replaceChildren(...Object.entries(f.vars || {}).map(([k, v]) => h('tr', { class: i >= 0 && JSON.stringify(prev[k]) !== JSON.stringify(v) ? 'tm-changed' : '' }, h('td', { text: k }), h('td', { text: typeof v === 'string' ? v : JSON.stringify(v) }))));
      out.textContent = frames.slice(0, i + 1).map((x) => x.out || '').join('');
      note.innerHTML = f.note || '';
      counter.textContent = (i + 1) + ' / ' + frames.length;
      scrub.max = frames.length; scrub.value = i + 1; fillRange(scrub);
      if (i >= 0) recordStep(id, i, frames.length);
    };
    const pl = new Player({ steps: frames.map(() => ({ dur: (cfg.stepMs || 900) / 1000 })), onFrame, id, holdStep: 0, loopGap: 2 });
    const bPrev = h('button', { class: 'tm-btn', type: 'button', html: icon('prev'), 'aria-label': 'Previous step', onclick: () => pl.goto(pl.i - 1) });
    const bPlay = h('button', { class: 'tm-btn tm-primary', type: 'button', html: icon('play'), 'aria-label': 'Play' });
    const bNext = h('button', { class: 'tm-btn', type: 'button', html: icon('next'), 'aria-label': 'Next step', onclick: () => pl.goto(pl.i + 1) });
    const bReset = h('button', { class: 'tm-btn', type: 'button', html: icon('reset'), 'aria-label': 'Reset', onclick: () => pl.reset() });
    bPlay.onclick = () => (pl.playing ? pl.stop() : pl.play());
    pl.onState = () => { bPlay.innerHTML = icon(pl.playing ? 'pause' : 'play'); bPlay.setAttribute('aria-label', pl.playing ? 'Pause' : 'Play'); };
    scrub.oninput = () => pl.goto(+scrub.value - 1);
    const paramBox = cfg.params?.length ? h('div', { class: 'tm-params' }, h('span', { class: 'tm-muted', text: 'Try changing:' }), ...cfg.params.map((p) => {
      const inp = h('input', { value: p.value, 'aria-label': p.label || p.id });
      inp.onchange = () => { params[p.id] = isNaN(+inp.value) || inp.value === '' ? inp.value : +inp.value; recompute(); drawCode(); pl.steps = frames.map(() => ({ dur: (cfg.stepMs || 900) / 1000 })); pl.reset(); if (pl.auto) pl.play(); };
      return h('label', {}, (p.label || p.id) + ' =', inp);
    })) : null;
    const card = h('div', { class: 'tm-card tm-stepper-card' }, cardHead(cfg, [h('span', { class: 'tm-badge', text: cfg.lang || 'code' })]),
      h('div', { class: 'tm-stepper' }, codeBox, side), note, paramBox,
      h('div', { class: 'tm-controls' }, bReset, bPrev, bPlay, bNext, scrub, counter, speedSeg(pl)));
    el.replaceChildren(card);
    pl.stage = card;
    cardKeys(card, pl, () => (pl.playing ? pl.stop() : pl.play()));
    watchVisible(card, pl);
    const qs = Q.get('step');
    if (qs != null) pl.goto(+qs - 1); else pl.reset();
    if (cfg.autoplay !== false && Q.get('auto') !== '0' && qs == null) pl.autoStartWhenVisible = true;
    pl.autoOnReveal = () => cfg.autoplay !== false;
    (tm.stepperCfg ||= {})[id] = cfg; el.dataset.tmId = id;
    tm.stepperStdout = tm.stepperStdout || {}; tm.stepperStdout[id] = () => frames.map((x) => x.out || '').join('');
    return pl;
  }

  /* ---------- sim: sliders wired to a pure model ---------- */
  function mountSim(el, cfg) {
    const def = tm.sims[cfg.name];
    if (!def) throw new Error('sim "' + cfg.name + '" is not registered (tm.sim)');
    const stage = h('div', { class: 'tm-stage' });
    const hint = h('div', { class: 'tm-hint', 'aria-live': 'polite' });
    const chips = h('div', { class: 'tm-chips', 'aria-live': 'polite' });
    const values = Object.fromEntries(cfg.inputs.map((i) => [i.id, i.value]));
    const ctx = def.setup(stage, { svg, iso, h, cfg });
    const fmt = (inp, v) => (inp.format ? inp.format.replace('{}', v) : v + (inp.unit ? ' ' + inp.unit : ''));
    const update = () => { const r = def.update(ctx, { ...values }) || {}; chipsInto(chips, r.chips); hint.innerHTML = r.hint || cfg.hint || 'Drag the slider.'; };
    const inputs = h('div', { class: 'tm-sim-inputs' }, ...cfg.inputs.map((inp) => {
      if (inp.options || inp.type === 'text') { // select or text input instead of a slider
        const ctl = inp.options ? h('select', { 'aria-label': inp.label }, ...inp.options.map((o) => h('option', { value: o, text: o, selected: o === inp.value }))) : h('input', { value: inp.value, 'aria-label': inp.label, spellcheck: 'false' });
        ctl.className = inp.options ? 'tm-select' : 'tm-input';
        ctl.oninput = () => { values[inp.id] = ctl.value; update(); };
        return h('label', { style: 'grid-template-columns:minmax(110px,180px) 1fr' }, h('span', { text: inp.label }), ctl);
      }
      const o = h('output', { text: fmt(inp, inp.value) });
      const r = h('input', { type: 'range', min: inp.min, max: inp.max, step: inp.step || 1, value: inp.value, 'aria-label': inp.label });
      fillRange(r);
      r.oninput = () => { fillRange(r); values[inp.id] = +r.value; o.textContent = fmt(inp, r.value); r.setAttribute('aria-valuetext', o.textContent); update(); };
      return h('label', {}, h('span', { text: inp.label }), r, o);
    }));
    el.replaceChildren(h('div', { class: 'tm-card' }, cardHead(cfg), hint, stage, chips, inputs));
    update();
  }

  /* ---------- quiz and predict ---------- */
  let quizN = 0;
  function mountQuiz(el, cfg, kind) {
    const qid = cfg.id || 'q' + hash(cfg.q);
    const n = kind === 'predict' ? 0 : ++quizN;
    const order = cfg.shuffle === false ? cfg.options.map((_, i) => i) : shuffleIdx(cfg.options.length, hash(cfg.q));
    let chosen = null, attempts = 0;
    const why = h('div', { class: 'tm-why', hidden: true, 'aria-live': 'polite' });
    const opts = order.map((oi) => h('button', { class: 'tm-opt', type: 'button', 'aria-pressed': 'false', 'data-i': oi, html: cfg.options[oi] }));
    const check = h('button', { class: 'tm-btn tm-primary', type: 'button', text: kind === 'predict' ? 'Lock in my guess' : 'Check', disabled: true });
    const retry = h('button', { class: 'tm-btn', type: 'button', text: 'Pick again from the rest', hidden: true });
    opts.forEach((b) => (b.onclick = () => { if (b.disabled) return; chosen = +b.dataset.i; opts.forEach((x) => x.setAttribute('aria-pressed', x === b)); check.disabled = false; }));
    const reveal = () => {
      const target = cfg.reveal ? document.querySelector(cfg.reveal) : el.nextElementSibling?.classList.contains('tm-reveal') ? el.nextElementSibling : null;
      if (target) { target.hidden = false; target.querySelectorAll('.tm-card').forEach((c) => { const pl = tm.players.find((p) => p.stage && c.contains(p.stage)); if (pl && pl.autoOnReveal?.()) pl.play(); }); }
    };
    check.onclick = () => {
      if (chosen == null) return; attempts++;
      const ok = cfg.answer == null || chosen === cfg.answer; // predict without an answer: any guess counts
      opts.forEach((b) => { b.disabled = true; const i = +b.dataset.i; if (cfg.answer != null && i === cfg.answer && (ok || kind === 'predict' || attempts >= 2)) b.classList.add('tm-right'); if (i === chosen && !ok) b.classList.add('tm-wrong'); });
      const w = (cfg.why && cfg.why[chosen]) || '';
      why.className = 'tm-why ' + (cfg.answer == null ? '' : ok ? 'tm-good' : 'tm-bad');
      why.innerHTML = (kind === 'predict' ? (ok ? '<b>Your guess holds.</b> ' : '<b>Not quite — watch what happens.</b> ') : (ok ? '<b>Right.</b> ' : '<b>Not this one.</b> ')) + w + (cfg.explain && (ok || kind === 'predict' || attempts >= 2) ? ' ' + cfg.explain : '');
      why.hidden = false; check.hidden = true; retry.hidden = ok || kind === 'predict' || attempts >= 2;
      (kind === 'predict' ? progress.predictions : progress.quiz)[qid] = { q: cfg.q.replace(/<[^>]+>/g, ''), chosen: cfg.options[chosen].replace(/<[^>]+>/g, ''), correct: ok, attempts, ts: Date.now() };
      saveProgress();
      if (kind === 'predict') reveal();
    };
    retry.onclick = () => { chosen = null; opts.forEach((b) => { b.disabled = b.classList.contains('tm-wrong'); b.setAttribute('aria-pressed', 'false'); }); why.hidden = true; retry.hidden = true; check.hidden = false; check.disabled = true; };
    const label = kind === 'predict' ? 'Predict first' : 'Check yourself · ' + n;
    el.replaceChildren(h('div', { class: 'tm-card tm-quiz' }, h('span', { class: 'tm-qn', text: label }), h('p', { class: 'tm-q', html: cfg.q }), h('div', { class: 'tm-opts' }, ...opts), h('div', { class: 'tm-actions' }, check, retry), why));
  }

  /* ---------- spot the bug: click the faulty line ---------- */
  function mountSpotbug(el, cfg) {
    const bugs = [].concat(cfg.bug);
    const why = h('div', { class: 'tm-why', hidden: true, 'aria-live': 'polite' });
    let tries = 0;
    const lines = cfg.code.replace(/\n$/, '').split('\n').map((t, k) => {
      const ln = h('span', { class: 'ln tm-click', text: t || ' ', role: 'button', tabindex: 0 });
      const pick = () => {
        if (why.dataset.done) return; tries++;
        const ok = bugs.includes(k + 1);
        ln.classList.add(ok ? 'tm-right' : 'tm-wrong');
        why.className = 'tm-why ' + (ok ? 'tm-good' : 'tm-bad'); why.hidden = false;
        why.innerHTML = ok ? '<b>Found it.</b> ' + (cfg.why || '') : (cfg.wrong?.[k + 1] || 'This line is fine. Look again.');
        if (ok) { why.dataset.done = 1; progress.quiz['bug-' + hash(cfg.code)] = { q: cfg.q, correct: true, attempts: tries, ts: Date.now() }; saveProgress(); }
      };
      ln.onclick = pick; ln.onkeydown = (e) => { if (e.key === 'Enter') pick(); };
      return ln;
    });
    el.replaceChildren(h('div', { class: 'tm-card' }, h('div', { class: 'tm-quiz' }, h('span', { class: 'tm-qn', text: 'Spot the bug' }), h('p', { class: 'tm-q', html: cfg.q || 'Click the line that causes the problem.' })), h('div', { class: 'tm-code', style: 'border-right:0' }, ...lines), h('div', { class: 'tm-quiz' }, why)));
  }

  /* ---------- flashcards with simple spaced repetition ---------- */
  // shortcut: SM-2 style intervals, not FSRS; swap in ts-fsrs if long-term accuracy matters.
  const DAY = 864e5;
  function schedule(c, grade) { // grade 0 again, 1 hard, 2 good, 3 easy
    const s = { ivl: 0, ease: 2.5, reps: 0, lapses: 0, ...c };
    if (grade === 0) { s.lapses++; s.reps = 0; s.ivl = 0; s.ease = Math.max(1.3, s.ease - 0.2); s.due = Date.now() + 60e3; }
    else {
      s.reps++; s.ease = clamp(s.ease + [0, -0.15, 0, 0.15][grade], 1.3, 3);
      s.ivl = s.reps === 1 ? [0, 0.5, 1, 3][grade] : s.reps === 2 ? [0, 2, 3, 6][grade] : Math.round(s.ivl * (grade === 1 ? 1.2 : s.ease * (grade === 3 ? 1.3 : 1)));
      s.due = Date.now() + Math.max(s.ivl, 0.007) * DAY;
    }
    s.last = Date.now(); return s;
  }
  tm.schedule = schedule;
  const cloze = (t, show) => t.replace(/\{\{c\d+::(.+?)\}\}/g, (_, x) => (show ? `<mark>${esc(x)}</mark>` : '[…]'));
  function mountCards(el, cfg) {
    const deck = cfg.deck || 'deck';
    const cards = cfg.cards.map((c) => ({ ...c, id: deck + ':' + (c.id || hash(c.front)) }));
    const flip = h('div', { class: 'tm-flash', role: 'button', tabindex: 0, 'aria-label': 'Flip card' });
    const inner = h('div', { class: 'tm-flash-inner' }); flip.append(inner);
    const front = h('div', { class: 'tm-face' }), back = h('div', { class: 'tm-face tm-back' }); inner.append(front, back);
    const bar = h('div', { class: 'tm-deckbar', 'aria-live': 'polite' });
    const labels = ['Again', 'Hard', 'Good', 'Easy'];
    const grades = h('div', { class: 'tm-grades' }, ...labels.map((l, g) => h('button', { class: 'tm-btn' + (g === 2 ? ' tm-primary' : ''), type: 'button', text: l, onclick: () => grade(g) })));
    let cur = null;
    // Card schedules live in one shared key, so the same card on a course review page keeps its history.
    const sched = (id) => store.get("tm:cards", {})[id] || progress.cards[id];
    const queue = () => cards.filter((c) => !sched(c.id) || sched(c.id).due <= Date.now()).sort((a, b) => (sched(a.id)?.due || 0) - (sched(b.id)?.due || 0));
    const sayBtn = (text, lang = cfg.lang) => (lang && text ? h('button', { class: 'tm-say', type: 'button', 'aria-label': 'Listen', html: icon('volume'), onclick: (e) => { e.stopPropagation(); speak(text, lang, e.currentTarget); } }) : null);
    const show = () => {
      const q = queue(); const nNew = cards.filter((c) => !sched(c.id)).length;
      bar.replaceChildren(h('span', { text: `${q.length} to review · ${nNew} new · ${cards.length} total` }), h('span', { class: 'tm-sp' }),
        h('button', { class: 'tm-iconbtn', type: 'button', text: 'Export TSV', onclick: () => download(deck + '.tsv', cards.map((c) => [cloze(c.front, true).replace(/<\/?mark>/g, ''), c.back || ''].map((x) => x.replace(/\t|\n/g, ' ')).join('\t')).join('\n'), 'text/tab-separated-values') }));
      flip.classList.remove('tm-flipped'); grades.hidden = true;
      cur = q[0];
      if (!cur) {
        const next = Math.min(...cards.map((c) => sched(c.id)?.due || Infinity));
        front.innerHTML = 'All done for now.<small>Next review ' + (isFinite(next) ? new Date(next).toLocaleString() : 'later') + '</small>'; back.innerHTML = ''; return;
      }
      front.innerHTML = cloze(cur.front, false) + (cur.hint ? `<small>${cur.hint}</small>` : '');
      back.innerHTML = ''; // filled on flip, so the next answer never shows during the flip-back
    };
    const fillBack = () => {
      const isCloze = cur.front.includes('{{c');
      back.innerHTML = (isCloze ? cloze(cur.front, true) + (cur.back ? '<small>' + cur.back + '</small>' : '') : cur.back || '') + (cur.note ? `<small>${cur.note}</small>` : '');
      const text = (cur.say || (isCloze ? cloze(cur.front, true) : cur.back) || '').replace(/<[^>]+>/g, '');
      const sb = cur.say !== false ? sayBtn(text, cur.lang || cfg.lang) : null; if (sb) back.append(sb);
    };
    const doFlip = () => { if (!cur) return; if (!flip.classList.contains('tm-flipped')) fillBack(); flip.classList.toggle('tm-flipped'); grades.hidden = !flip.classList.contains('tm-flipped'); };
    const grade = (g) => { if (!cur) return; const s = schedule(sched(cur.id), g); const all = store.get("tm:cards", {}); all[cur.id] = s; store.set("tm:cards", all); progress.cards[cur.id] = s; saveProgress(); show(); };
    flip.onclick = doFlip;
    flip.onkeydown = (e) => { if (e.key === ' ' || e.key === 'Enter') { doFlip(); e.preventDefault(); } else if (/^[1-4]$/.test(e.key) && !grades.hidden) grade(+e.key - 1); };
    el.replaceChildren(h('div', { class: 'tm-card' }, cardHead({ ...cfg, title: cfg.title || 'Flashcards' }), h('div', { class: 'tm-cards' }, bar, flip, grades, h('p', { class: 'tm-muted', style: 'font-size:13px;text-align:center;margin:10px 0 0', text: 'Click the card or press Space to flip. Keys 1–4 grade it.' }))));
    show();
  }

  /* ---------- text to speech (on click only) ---------- */
  let voicesP;
  const voices = () => (voicesP ||= new Promise((res) => {
    const done = (v) => { if (!v.length) voicesP = null; res(v); }; // don't cache an empty list
    const v = speechSynthesis.getVoices(); if (v.length) return res(v);
    const t = setTimeout(() => done(speechSynthesis.getVoices()), 1500);
    speechSynthesis.addEventListener('voiceschanged', () => { clearTimeout(t); done(speechSynthesis.getVoices()); }, { once: true });
  }));
  async function speak(text, lang, btn, rate = 0.92) {
    if (!('speechSynthesis' in window)) return toast('This browser cannot speak.');
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.lang = lang; u.rate = rate;
    const all = await voices(); const base = lang.slice(0, 2).toLowerCase();
    const v = all.find((x) => x.lang === lang && /natural|online|neural/i.test(x.name)) || all.find((x) => x.lang === lang) || all.find((x) => x.lang.toLowerCase().startsWith(base));
    if (v) u.voice = v; else toast('No ' + lang + ' voice installed; using the default voice.');
    btn?.classList.add('tm-speaking'); u.onend = u.onerror = () => btn?.classList.remove('tm-speaking');
    tm._utterance = u; // keep a reference so Chrome fires onend
    speechSynthesis.speak(u);
  }
  tm.speak = speak;
  function mountSay(el) {
    const lang = el.dataset.say; const text = el.dataset.sayText || el.textContent.trim();
    const b = h('button', { class: 'tm-say', type: 'button', 'aria-label': 'Listen: ' + text, title: 'Listen (Shift+click: slow)', html: icon('volume') });
    b.onclick = (e) => speak(text, lang, b, e.shiftKey ? 0.65 : 0.92);
    el.after(b);
  }

  /* ---------- explain-back, ask, save ---------- */
  function mountExplain(el, cfg) {
    const id = cfg.id || 'x' + hash(cfg.prompt);
    const ta = h('textarea', { 'aria-label': cfg.prompt, placeholder: 'Write it in your own words…' });
    ta.value = progress.explain[id]?.text || '';
    ta.oninput = () => { progress.explain[id] = { prompt: cfg.prompt, text: ta.value }; saveProgress(); };
    el.replaceChildren(h('div', { class: 'tm-card tm-quiz tm-explain' }, h('span', { class: 'tm-qn', text: 'Explain it back' }), h('p', { class: 'tm-q', html: cfg.prompt }), ta,
      h('div', { class: 'tm-actions' }, h('button', { class: 'tm-btn tm-primary', type: 'button', text: 'Copy for Claude', onclick: () => copy(`Here is my explanation for "${cfg.prompt.replace(/<[^>]+>/g, '')}" (lesson: ${document.title}):\n\n${ta.value}\n\nFind the one or two smallest gaps and ask me a question about each. Don't rewrite it for me.`) }))));
  }
  function mountAsk(el, cfg) {
    const prompts = cfg.prompts || ['Explain this with a different analogy.', 'Quiz me harder on this lesson.', 'What would break if this worked the other way?'];
    el.replaceChildren(h('div', { class: 'tm-callout' }, h('b', { text: 'Stuck or curious? Ask your agent.' }), h('p', { class: 'tm-muted', style: 'margin:4px 0 10px', text: 'Claude is your teacher here. Copy a prompt or ask your own.' }),
      h('ul', { class: 'tm-ask' }, ...prompts.map((p) => h('li', {}, h('span', { text: p }), h('button', { class: 'tm-iconbtn', type: 'button', html: icon('copy') + 'Copy', onclick: () => copy(`${p} (lesson: ${document.title})`) }))))));
  }
  const summary = () => {
    const q = Object.values(progress.quiz), pr = Object.values(progress.predictions);
    const lines = [`Progress for lesson "${document.title}" (${lessonId}):`];
    q.forEach((x) => lines.push(`- Quiz: ${x.q} -> chose "${x.chosen ?? ''}" (${x.correct ? 'correct' : 'wrong'}, ${x.attempts} attempt${x.attempts > 1 ? 's' : ''})`));
    pr.forEach((x) => lines.push(`- Prediction: ${x.q} -> guessed "${x.chosen}" (${x.correct ? 'right' : 'wrong'})`));
    Object.values(progress.explain).forEach((x) => x.text && lines.push(`- Explained "${x.prompt.replace(/<[^>]+>/g, '')}": ${x.text}`));
    const cards = Object.values(progress.cards); if (cards.length) lines.push(`- Flashcards reviewed: ${cards.length}, lapses: ${cards.reduce((s, c) => s + (c.lapses || 0), 0)}`);
    lines.push('Treat this as data about my progress. Update my learning records only where it shows understanding or a misconception.');
    return lines.join('\n');
  };
  function mountSave(el) {
    el.replaceChildren(h('div', { class: 'tm-save tm-actions', style: 'display:flex;gap:8px;flex-wrap:wrap' },
      h('button', { class: 'tm-btn', type: 'button', text: 'Copy my progress for Claude', onclick: () => copy(summary()) }),
      h('button', { class: 'tm-btn', type: 'button', text: 'Download progress (.json)', onclick: () => download('tm-progress-' + lessonId + '.json', JSON.stringify(progress, null, 2)) }),
      h('button', { class: 'tm-btn', type: 'button', text: 'Reset this lesson', onclick: () => { if (confirm('Clear your answers and cards for this lesson?')) { try { localStorage.removeItem(PKEY); const all = store.get('tm:cards', {}); for (const k of Object.keys(progress.cards)) delete all[k]; store.set('tm:cards', all); } catch {} location.reload(); } } })));
  }

  /* ---------- theme toggle ---------- */
  const applyTheme = (t) => { if (t === 'auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t; };
  applyTheme(Q.get('theme') || store.get('tm:theme', 'auto'));
  function mountTheme(btn) {
    const order = ['auto', 'light', 'dark'];
    const label = () => { const t = store.get('tm:theme', 'auto'); btn.innerHTML = icon(t) + { auto: 'Auto', light: 'Light', dark: 'Dark' }[t]; btn.title = 'Theme: ' + t; btn.setAttribute('aria-label', 'Theme: ' + t + '. Click to change.'); };
    btn.onclick = () => { const t = order[(order.indexOf(store.get('tm:theme', 'auto')) + 1) % 3]; store.set('tm:theme', t); applyTheme(t); label(); };
    label();
  }

  /* ---------- boot ---------- */
  const MOUNT = { scene: mountScene, diagram: mountDiagram, stepper: mountStepper, sim: mountSim, quiz: (e, c) => mountQuiz(e, c, 'quiz'), predict: (e, c) => mountQuiz(e, c, 'predict'), spotbug: mountSpotbug, cards: mountCards, explain: mountExplain, ask: mountAsk, save: mountSave };
  tm.errors = [];
  function boot() {
    if (Q.get('reveal') === '1') document.querySelectorAll('.tm-reveal[hidden]').forEach((r) => (r.hidden = false)); // test hook
    document.querySelectorAll('[data-tm]').forEach((el) => {
      const kind = el.dataset.tm; const fn = MOUNT[kind];
      try {
        if (!fn) throw new Error('unknown component data-tm="' + kind + '"');
        const js = el.querySelector(':scope > script[type="application/json"]');
        const cfg = js ? JSON.parse(js.textContent) : {};
        fn(el, cfg);
        el.dataset.tmReady = '1';
      } catch (err) {
        tm.errors.push(kind + ': ' + err.message); console.error('[teach-me]', kind, err);
        el.replaceChildren(h('div', { class: 'tm-callout tm-warn', text: 'This widget failed to load: ' + err.message }));
      }
    });
    document.querySelectorAll('[data-say]').forEach(mountSay);
    document.querySelectorAll('.tm-term[data-def]').forEach((t) => (t.tabIndex = 0));
    document.querySelectorAll('[data-tm-theme]').forEach(mountTheme);
    // Phones: a figure never shrinks below its drawn size; .tm-stage scrolls instead (see tm.css).
    document.querySelectorAll('.tm-stage svg[viewBox]').forEach((v) => v.style.setProperty('--vbw', v.viewBox.baseVal.width));
    tm.ready = true; document.documentElement.dataset.tmReady = '1';
    if (Q.get('check') === '1') setTimeout(writeReport, 60);
  }

  /* ---------- self-check report for scripts/check.ts (headless --dump-dom reads #tm-check) ---------- */
  function writeReport() {
    const all = [...document.querySelectorAll('[data-tm]')];
    const vw = document.documentElement.clientWidth;
    const wide = [...document.querySelectorAll('main *')].filter((e) => e.getBoundingClientRect().right > vw + 1 && !e.closest('.tm-code, pre, .tm-steps, svg')).slice(0, 5)
      .map((e) => e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).join('.') : ''));
    const scans = tm.players.map((p, i) => (p.stage?.querySelector('svg') ? { player: i, id: p.id, ...tm.scan(i) } : null)).filter(Boolean);
    const stdout = [...document.querySelectorAll('[data-tm="stepper"]')].map((el) => {
      const id = el.dataset.tmId; const cfg = tm.stepperCfg?.[id] || {};
      if (cfg.expectStdout == null) return { id, expect: null };
      const got = tm.stepperStdout?.[id]?.() ?? '';
      return { id, ok: got === cfg.expectStdout, expect: cfg.expectStdout, got };
    });
    const main = document.querySelector('main'); const cs = main && getComputedStyle(main);
    const col = main ? main.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) : vw;
    const short = main ? [...main.children].filter((e) => !e.hidden && e.offsetWidth && e.offsetWidth < col - 2 && !e.matches('.tm-top, .tm-nav, .tm-save, script, pre')).map((e) => e.tagName.toLowerCase() + (typeof e.className === 'string' && e.className ? '.' + e.className.split(' ')[0] : '') + ' ' + e.offsetWidth + '/' + Math.round(col)).slice(0, 5) : [];
    const sizes = [...document.querySelectorAll('.tm-card svg text')].filter((t) => t.textContent.trim() && t.getScreenCTM()).map((t) => parseFloat(getComputedStyle(t).fontSize) * t.getScreenCTM().a);
    const minText = sizes.length ? +Math.min(...sizes).toFixed(1) : null;
    const report = { short, minText, width: vw, components: all.length, ready: all.filter((e) => e.dataset.tmReady).length, errors: [...tm.errors, ...tm.pageErrors], overflowX: document.documentElement.scrollWidth > vw + 1, wide, scans, stdout };
    const pre = document.createElement('pre'); pre.id = 'tm-check'; pre.hidden = true; pre.textContent = JSON.stringify(report);
    document.body.append(pre);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else queueMicrotask(boot);
})();
