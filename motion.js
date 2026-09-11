(() => {
  const STORE_KEY = "br-sym-motion-v1"; // legacy fallback
  const STORE_DARK = "br-sym-motion-dark-v1";
  const STORE_LIGHT = "br-sym-motion-light-v1";
  const STORE_CUSTOM = "br-sym-motion-custom-v1"; // legacy → slot A
  const CUSTOM_SEEDED = "br-custom-seeded-v1";
  const CUSTOM_SLOT_KEY = "br-custom-slot-v1";
  const customStoreKey = (slot) => "br-sym-motion-custom-" + slot + "-v1";
  const readCustomSlot = () => {
    try {
      const s = localStorage.getItem(CUSTOM_SLOT_KEY) || "A";
      return s === "B" || s === "C" ? s : "A";
    } catch {
      return "A";
    }
  };
  const writeCustomSlot = (slot) => {
    try {
      localStorage.setItem(CUSTOM_SLOT_KEY, slot);
    } catch {}
  };
  const SELECTED_KEY = "br-motion-selected-v1";
  const RING_KEY = "br-motion-ring-v1";
  const RING_SPIN_KEY = "br-motion-ring-spin-v1";

  const readBrMode = () => {
    try {
      const m = localStorage.getItem("br-theme") || "dark";
      if (m === "custom") return "custom";
      if (m === "light" || m === "vibe-light") return "light";
      return "dark";
    } catch {
      return "dark";
    }
  };

  const storeKeyForMode = (mode) => {
    if (mode === "custom") return customStoreKey(readCustomSlot());
    if (mode === "light") return STORE_LIGHT;
    return STORE_DARK;
  };

  const SYMBOLS = [
    { id: "n", label: "Crow" },
    { id: "nw", label: "Archive" },
    { id: "w", label: "Orbit" },
    { id: "sw", label: "Wings" },
    { id: "s", label: "Fund" },
    { id: "se", label: "Nest" },
    { id: "e", label: "Lattice" },
    { id: "ne", label: "Bloom" },
    { id: "center", label: "Home" },
  ];

  const ANIMS = [
    { id: "off", label: "None" },
    { id: "cw", label: "Clockwise" },
    { id: "ccw", label: "Anti-clockwise" },
    { id: "pulse", label: "Pulse" },
    { id: "breathe", label: "Breathe" },
    { id: "shimmer", label: "Shimmer" },
    { id: "shield", label: "Shield aura" },
  ];

  // Named hues on the spectrum bar (cleaner gold yellow included)
  const HUE_PRESETS = {
    red: 0,
    orange: 28,
    gold: 46,
    yellow: 52,
    lime: 85,
    green: 145,
    teal: 175,
    cyan: 190,
    blue: 210,
    indigo: 250,
    violet: 290,
    magenta: 320,
  };
  const COLOUR_IDS = new Set(["off", "vibe", "hue", ...Object.keys(HUE_PRESETS)]);
  const namedToHue = (id) => (id in HUE_PRESETS ? HUE_PRESETS[id] : 28);
  const parseColour = (raw) => {
    if (!raw || raw === "off") return { mode: "off", hue: 28 };
    if (raw === "vibe") return { mode: "vibe", hue: 28 };
    if (typeof raw === "string" && raw.startsWith("hue:")) {
      const n = Number(raw.slice(4));
      return { mode: "hue", hue: Number.isFinite(n) ? ((n % 360) + 360) % 360 : 28 };
    }
    if (raw in HUE_PRESETS) return { mode: "hue", hue: HUE_PRESETS[raw] };
    return { mode: "off", hue: 28 };
  };
  const colourToken = (mode, hue) => {
    if (mode === "off") return "off";
    if (mode === "vibe") return "vibe";
    return "hue:" + Math.round(((hue % 360) + 360) % 360);
  };

  const panel = document.querySelector("[data-motion-panel]");
  const toggle = document.querySelector("[data-motion-toggle]");
  const symbolOpen = document.querySelector('[data-panel-open="symbol"]');
  const symList = document.querySelector("[data-motion-symbols]");
  const animList = document.querySelector("[data-motion-anims]");
  const speedEl = document.querySelector("[data-motion-speed]");
  const speedVal = document.querySelector("[data-motion-speed-val]");
  const colourSpeedEl = document.querySelector("[data-motion-colour-speed]");
  const colourSpeedVal = document.querySelector("[data-motion-colour-speed-val]");
  const sizeEl = document.querySelector("[data-motion-size]");
  const sizeVal = document.querySelector("[data-motion-size-val]");
  const colourList = document.querySelector("[data-motion-colours]");
  if (!panel || !toggle || !symList || !animList || !speedEl || !speedVal || !colourList || !colourSpeedEl || !colourSpeedVal || !sizeEl || !sizeVal) return;

  panel.addEventListener("click", (e) => e.stopPropagation());
  panel.addEventListener("pointerdown", (e) => e.stopPropagation());

  const readStoreRaw = (key) => {
    try {
      return JSON.parse(localStorage.getItem(key) || "{}") || {};
    } catch {
      return {};
    }
  };

  const readStore = () => {
    const mode = readBrMode();
    const key = storeKeyForMode(mode);
    let data = readStoreRaw(key);
    // Migrate legacy single store into current mode once if empty
    if (!Object.keys(data).length) {
      const legacy = readStoreRaw(STORE_KEY);
      if (Object.keys(legacy).length) data = legacy;
    }
    return data;
  };

  const writeStore = (store) => {
    try {
      const key = storeKeyForMode(readBrMode());
      localStorage.setItem(key, JSON.stringify(store));
      // Keep legacy key in sync for older tabs
      localStorage.setItem(STORE_KEY, JSON.stringify(store));
    } catch {}
  };

  const readSelected = () => {
    try {
      const raw = JSON.parse(localStorage.getItem(SELECTED_KEY) || "[]");
      if (Array.isArray(raw) && raw.length) {
        return new Set(raw.filter((id) => SYMBOLS.some((s) => s.id === id)));
      }
    } catch {}
    return new Set();
  };

  const writeSelected = (set) => {
    try {
      localStorage.setItem(SELECTED_KEY, JSON.stringify([...set]));
    } catch {}
  };

  const readRing = () => {
    try {
      return localStorage.getItem(RING_KEY) === "on";
    } catch {
      return false;
    }
  };

  const writeRing = (on) => {
    try {
      localStorage.setItem(RING_KEY, on ? "on" : "off");
    } catch {}
  };

  let store = readStore();
  let selected = readSelected();
  let ringOn = readRing();
  const readRingSpin = () => {
    try {
      const v = localStorage.getItem(RING_SPIN_KEY);
      if (v === "cw" || v === "ccw") return v;
    } catch {}
    return "off";
  };
  const writeRingSpin = (v) => {
    try {
      localStorage.setItem(RING_SPIN_KEY, v === "cw" || v === "ccw" ? v : "off");
    } catch {}
  };
  let ringSpin = readRingSpin(); // off | cw | ccw — global Motion shape spin

  const clampPct = (sp) => {
    let n = Number(sp);
    if (!Number.isFinite(n)) n = 1;
    if (n > 100) n = Math.round(n / 2);
    return Math.max(1, Math.min(100, Math.round(n)));
  };

  const clampSize = (sp) => {
    let n = Number(sp);
    if (!Number.isFinite(n)) n = 100;
    return Math.max(25, Math.min(320, Math.round(n)));
  };

  const ensure = (id) => {
    if (!store[id]) store[id] = { anim: "off", speed: 1, colour: "off", colourSpeed: 1, size: 100, x: 0, y: 0, pinned: false, ax: 0, ay: 0, orb: false, orbFn: "shield", orbField: false, hubWeight: 1, ink: false, colourDepth: 70, spiral: false };
    const a = store[id].anim;
    const ALLOWED_ANIMS = new Set(["off", "cw", "ccw", "pulse", "breathe", "shimmer", "shield"]);
    if (!ALLOWED_ANIMS.has(a)) store[id].anim = "off";
    const pc = parseColour(store[id].colour);
    store[id].colour = colourToken(pc.mode, pc.hue);
    store[id].hue = pc.hue;
    store[id].speed = clampPct(store[id].speed == null ? 1 : store[id].speed);
    store[id].colourSpeed = clampPct(store[id].colourSpeed == null ? 1 : store[id].colourSpeed);
    let hw = Number(store[id].hubWeight);
    store[id].hubWeight = Number.isFinite(hw) ? Math.max(1, Math.min(100, Math.round(hw))) : 1;
    store[id].ink = !!store[id].ink;
    let dep = Number(store[id].colourDepth);
    store[id].colourDepth = Number.isFinite(dep) ? Math.max(0, Math.min(100, Math.round(dep))) : 70;
    store[id].spiral = !!store[id].spiral;
    store[id].size = clampSize(store[id].size == null ? 100 : store[id].size);
    let x = Number(store[id].x);
    let y = Number(store[id].y);
    store[id].x = Number.isFinite(x) ? x : 0;
    store[id].y = Number.isFinite(y) ? y : 0;
    store[id].pinned = !!store[id].pinned;
    let ax = Number(store[id].ax);
    let ay = Number(store[id].ay);
    store[id].ax = Number.isFinite(ax) ? ax : 0;
    store[id].ay = Number.isFinite(ay) ? ay : 0;
    store[id].orb = !!store[id].orb;
    const ofn = store[id].orbFn;
    store[id].orbFn = ofn === "orbit" || ofn === "cloud" ? ofn : "shield";
    store[id].orbField = !!store[id].orbField;
    return store[id];
  };
  SYMBOLS.forEach((s) => ensure(s.id));

  const periodSec = (speedPct) => {
    const pct = clampPct(speedPct);
    return Math.max(0.35, 75 / pct);
  };

  // Colour cycle: slower curve so 100% ≈ 8s, 50% ≈ 16s, 1% ≈ soft crawl
  const glowPeriodSec = (speedPct) => {
    const pct = clampPct(speedPct);
    return Math.max(1.2, 48 / pct);
  };

  const formatPct = (pct) => clampPct(pct) + "%";

  const findEl = (id) => {
    if (id === "center") {
      return document.querySelector('.mark-host svg.sigil .center[data-sym="center"]');
    }
    return document.querySelector('.mark-host svg.sigil .sym[data-sym="' + id + '"]');
  };

  // BR layout is sparse — allow Motion spin for all; isolation is one-active via panel
  const MOTION_SPIN_NEVER = new Set();
  // Soft-gated shapes may spin only when zoomed out enough if they overlay others
  const MOTION_SPIN_ZOOM_MAX = 0.82; // at or below this zoom, overlapping soft shapes may spin

  const readMarkZoom = () => {
    const raw = getComputedStyle(document.querySelector("[data-mark]") || document.documentElement)
      .getPropertyValue("--mark-zoom")
      .trim();
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : 1;
  };

  const artScreenRect = (el) => {
    return withArtOnly(el, () => el.getBoundingClientRect());
  };

  const rectsOverlap = (a, b, pad) => {
    if (!a || !b) return false;
    return !(
      a.right < b.left - pad ||
      a.left > b.right + pad ||
      a.bottom < b.top - pad ||
      a.top > b.bottom + pad
    );
  };

  const shapeOverlapsNeighbor = (id, rects) => {
    const mine = rects[id];
    if (!mine) return false;
    for (const other of Object.keys(rects)) {
      if (other === id) continue;
      if (rectsOverlap(mine, rects[other], 4)) return true;
    }
    return false;
  };

  const syncMotionSpinUi = () => {
    document.documentElement.setAttribute("data-ring-spin", ringOn ? ringSpin : "off");
    document.querySelectorAll("[data-motion-menu] [data-motion-spin]").forEach((btn) => {
      const dir = btn.getAttribute("data-motion-spin");
      btn.setAttribute("aria-pressed", ringOn && ringSpin === dir ? "true" : "false");
    });
  };

  const applyMotionSpin = () => {
    const dir = ringOn && (ringSpin === "cw" || ringSpin === "ccw") ? ringSpin : "off";
    const zoom = readMarkZoom();
    const els = {};
    SYMBOLS.forEach((s) => {
      const el = findEl(s.id);
      if (el) els[s.id] = el;
    });
    const rects = {};
    Object.keys(els).forEach((id) => {
      try {
        rects[id] = artScreenRect(els[id]);
      } catch (err) {
        rects[id] = null;
      }
    });

    Object.keys(els).forEach((id) => {
      const el = els[id];
      let allow = false;
      if (dir !== "off" && !MOTION_SPIN_NEVER.has(id)) {
        const overlaps = shapeOverlapsNeighbor(id, rects);
        if (!overlaps) allow = true;
        else allow = zoom <= MOTION_SPIN_ZOOM_MAX;
      }
      if (allow) {
        el.setAttribute("data-motion-spin", dir);
        el.style.removeProperty("animation");
      } else {
        el.removeAttribute("data-motion-spin");
      }
    });
    syncMotionSpinUi();
  };

  const syncRing = () => {
    document.documentElement.setAttribute("data-ring", ringOn ? "on" : "off");
    toggle.setAttribute("aria-pressed", ringOn ? "true" : "false");
    applyMotionSpin();
  };

  const findSlot = (id) =>
    document.querySelector('.mark-host svg.sigil [data-sym-slot="' + id + '"]');

  const findHit = (id) => document.querySelector('.hits [data-sym="' + id + '"]');

  const orbitLayer = () => document.querySelector(".mark-host svg.sigil .orbit");
  const freeLayer = () => document.querySelector(".mark-host svg.sigil .free-layer");
  const hitsOrbit = () => document.querySelector(".hits .hits-orbit");
  const hitsFree = () => document.querySelector(".hits .hits-free");

  // Hide hit clones / orbs so bbox + screen rect match painted art (fixes Pin repel)
  const withArtOnly = (el, fn) => {
    if (!el) return fn();
    const hidden = [];
    el.querySelectorAll(".sym-shape-hit, .sym-orb, .sym-hitpad").forEach((n) => {
      hidden.push([n, n.style.display, n.getAttribute("visibility")]);
      n.style.display = "none";
      n.setAttribute("visibility", "hidden");
    });
    try {
      return fn();
    } finally {
      hidden.forEach(([n, disp, vis]) => {
        n.style.display = disp || "";
        if (vis == null) n.removeAttribute("visibility");
        else n.setAttribute("visibility", vis);
      });
    }
  };

  const artCenter = (el) => {
    return withArtOnly(el, () => {
      try {
        const bb = el.getBBox();
        return { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2 };
      } catch (err) {
        return { x: 0, y: 0 };
      }
    });
  };

  const svgPoint = (svg, clientX, clientY) => {
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    return pt.matrixTransform(ctm.inverse());
  };

  const worldCenter = (el) => {
    const svg = el.ownerSVGElement;
    if (!svg) return { x: 0, y: 0 };
    return withArtOnly(el, () => {
      const r = el.getBoundingClientRect();
      return svgPoint(svg, r.left + r.width / 2, r.top + r.height / 2);
    });
  };

  const setSlotAbs = (slot, el, ax, ay) => {
    const c = artCenter(el);
    slot.setAttribute("transform", "translate(" + (ax - c.x) + " " + (ay - c.y) + ")");
  };

  // Eased layout tweens (Reset / Orbit ring) — avoid Pair's harsh snap
  const tweens = new Map(); // id -> {raf, fromX, fromY, toX, toY, t0, dur}
  const easeOutCubic = (u) => 1 - Math.pow(1 - u, 3);
  const syncHitAt = (id, ax, ay) => {
    const hit = findHit(id);
    if (!hit) return;
    const hc = hit.querySelector("circle.hit");
    if (!hc) return;
    const hx = Number(hc.getAttribute("cx")) || 0;
    const hy = Number(hc.getAttribute("cy")) || 0;
    hit.setAttribute("transform", "translate(" + (ax - hx) + " " + (ay - hy) + ")");
  };
  const cancelTween = (id) => {
    const tw = tweens.get(id);
    if (tw && tw.raf) cancelAnimationFrame(tw.raf);
    tweens.delete(id);
  };
  const tweenTo = (id, ax, ay, dur) => {
    const cfg = ensure(id);
    const el = findEl(id);
    const slot = findSlot(id);
    if (!el || !slot) {
      cfg.ax = ax;
      cfg.ay = ay;
      return;
    }
    cancelTween(id);
    cancelInertia(id);
    const fromX = cfg.ax;
    const fromY = cfg.ay;
    const dist = Math.hypot(ax - fromX, ay - fromY);
    if (dist < 0.5) {
      cfg.ax = ax;
      cfg.ay = ay;
      placeAbs(id);
      return;
    }
    const ms = dur == null ? Math.min(520, 180 + dist * 0.55) : dur;
    const tw = { fromX, fromY, toX: ax, toY: ay, t0: performance.now(), dur: ms, raf: 0 };
    const step = (now) => {
      const u = Math.min(1, (now - tw.t0) / tw.dur);
      const e = easeOutCubic(u);
      cfg.ax = tw.fromX + (tw.toX - tw.fromX) * e;
      cfg.ay = tw.fromY + (tw.toY - tw.fromY) * e;
      setSlotAbs(slot, el, cfg.ax, cfg.ay);
      syncHitAt(id, cfg.ax, cfg.ay);
      if (u < 1) tw.raf = requestAnimationFrame(step);
      else {
        cfg.ax = tw.toX;
        cfg.ay = tw.toY;
        tweens.delete(id);
        writeStore(store);
      }
    };
    tweens.set(id, tw);
    tw.raf = requestAnimationFrame(step);
  };

  // Momentum / fling after Sandbox drag
  const inertias = new Map();
  const cancelInertia = (id) => {
    const it = inertias.get(id);
    if (it && it.raf) cancelAnimationFrame(it.raf);
    inertias.delete(id);
  };
  const startInertia = (id, vx, vy) => {
    cancelInertia(id);
    cancelTween(id);
    const speed = Math.hypot(vx, vy);
    if (speed < 0.35) return;
    const cfg = ensure(id);
    const el = findEl(id);
    const slot = findSlot(id);
    if (!el || !slot) return;
    const it = { vx, vy, raf: 0, last: performance.now() };
    const friction = 0.92;
    const step = (now) => {
      const dt = Math.min(32, now - it.last) / 16.67;
      it.last = now;
      it.vx *= Math.pow(friction, dt);
      it.vy *= Math.pow(friction, dt);
      cfg.ax += it.vx * dt;
      cfg.ay += it.vy * dt;
      setSlotAbs(slot, el, cfg.ax, cfg.ay);
      syncHitAt(id, cfg.ax, cfg.ay);
      if (repelOn) resolveRepel(id);
      resolveShieldBarriers(id);
      if (Math.hypot(it.vx, it.vy) > 0.08) {
        it.raf = requestAnimationFrame(step);
      } else {
        inertias.delete(id);
        writeStore(store);
        if (cloudOrbitOn && id !== hubId && ringIds.indexOf(id) >= 0) {
          rebuildCloudMoons();
        }
      }
    };
    inertias.set(id, it);
    it.raf = requestAnimationFrame(step);
  };

  // Detach from orbit into free-layer so Motion no longer carries it
  const releaseToFree = (id) => {
    const el = findEl(id);
    const slot = findSlot(id);
    const free = freeLayer();
    if (!el || !slot || !free) return;
    const cfg = ensure(id);
    if (slot.parentNode !== free) {
      const w = worldCenter(el);
      cfg.pinned = true;
      cfg.ax = w.x;
      cfg.ay = w.y;
      free.appendChild(slot);
    }
    setSlotAbs(slot, el, cfg.ax, cfg.ay);
    const hit = findHit(id);
    const hf = hitsFree();
    if (hit && hf && hit.parentNode !== hf) {
      hf.appendChild(hit);
    }
    if (hit) {
      const c = artCenter(el);
      // hotspot uses its own circle center — translate so hit center ~= ax,ay
      const hc = hit.querySelector("circle.hit");
      if (hc) {
        const hx = Number(hc.getAttribute("cx")) || 0;
        const hy = Number(hc.getAttribute("cy")) || 0;
        hit.setAttribute("transform", "translate(" + (cfg.ax - hx) + " " + (cfg.ay - hy) + ")");
      }
    }
  };

  const restoreToOrbit = (id) => {
    const slot = findSlot(id);
    const orbit = orbitLayer();
    const hit = findHit(id);
    const ho = hitsOrbit();
    if (slot && orbit && id !== "center" && slot.parentNode !== orbit) {
      orbit.appendChild(slot);
    }
    if (slot) slot.removeAttribute("transform");
    if (hit && ho && id !== "center" && hit.parentNode !== ho) {
      ho.appendChild(hit);
    }
    if (hit) hit.removeAttribute("transform");
    const cfg = ensure(id);
    cfg.pinned = false;
    cfg.ax = 0;
    cfg.ay = 0;
    cfg.x = 0;
    cfg.y = 0;
  };

  const applyPose = (id) => {
    const cfg = ensure(id);
    const el = findEl(id);
    const slot = findSlot(id);
    if (el) {
      el.style.setProperty("--sym-scale", String(clampSize(cfg.size) / 100));
      el.style.removeProperty("--sym-x");
      el.style.removeProperty("--sym-y");
    }
    if (!slot || !el) return;
    // Motion (ring) needs artist SVG seats inside .orbit — never free-layer transforms
    if (ringOn) {
      if (id !== "center") {
        const orbit = orbitLayer();
        const ho = hitsOrbit();
        if (orbit && slot.parentNode !== orbit) orbit.appendChild(slot);
        const hit = findHit(id);
        if (hit && ho && hit.parentNode !== ho) ho.appendChild(hit);
        if (hit) hit.removeAttribute("transform");
      }
      slot.removeAttribute("transform");
      return;
    }
    if (cfg.pinned) {
      releaseToFree(id);
      setSlotAbs(slot, el, cfg.ax, cfg.ay);
      const hit = findHit(id);
      if (hit) {
        const hc = hit.querySelector("circle.hit");
        if (hc) {
          const hx = Number(hc.getAttribute("cx")) || 0;
          const hy = Number(hc.getAttribute("cy")) || 0;
          hit.setAttribute("transform", "translate(" + (cfg.ax - hx) + " " + (cfg.ay - hy) + ")");
        }
      }
    } else if (id === "center" && (cfg.x || cfg.y)) {
      slot.setAttribute("transform", "translate(" + cfg.x + " " + cfg.y + ")");
    } else {
      slot.removeAttribute("transform");
      const hit = findHit(id);
      if (hit) hit.removeAttribute("transform");
    }
  };

  const ORB_FIELD_COLORS = {
    shield: { inner: "rgba(140, 210, 255, 0.08)", mid: "rgba(100, 180, 255, 0.28)", edge: "rgba(80, 160, 255, 0.42)", fade: "rgba(80, 160, 255, 0)" },
    orbit: { inner: "rgba(255, 220, 140, 0.06)", mid: "rgba(255, 190, 80, 0.26)", edge: "rgba(255, 170, 50, 0.4)", fade: "rgba(255, 170, 50, 0)" },
    cloud: { inner: "rgba(200, 180, 255, 0.1)", mid: "rgba(160, 140, 255, 0.3)", edge: "rgba(130, 110, 255, 0.45)", fade: "rgba(130, 110, 255, 0)" },
  };

  const syncOrbOn = (id) => {
    const el = findEl(id);
    if (!el) return;
    const cfg = ensure(id);
    let orb = el.querySelector(":scope > .sym-orb");
    if (!cfg.orb) {
      if (orb) orb.remove();
      return;
    }
    const ns = "http://www.w3.org/2000/svg";
    if (!orb || orb.tagName.toLowerCase() !== "g") {
      if (orb) orb.remove();
      orb = document.createElementNS(ns, "g");
      orb.setAttribute("class", "sym-orb");
      const firstArt = [...el.children].find(
        (c) => !c.classList.contains("sym-shape-hit") && !c.classList.contains("sym-hitpad") && !c.classList.contains("sym-orb")
      );
      if (firstArt) el.insertBefore(orb, firstArt);
      else el.appendChild(orb);
    }

    const bb = withArtOnly(el, () => {
      try {
        return el.getBBox();
      } catch (err) {
        return { x: 0, y: 0, width: 40, height: 40 };
      }
    });
    const fn = cfg.orbFn || "shield";
    const pad = fn === "cloud" ? 1.28 : fn === "orbit" ? 1.72 : 1.14;
    const cx = bb.x + bb.width / 2;
    const cy = bb.y + bb.height / 2;
    const r = Math.max(12, (Math.max(bb.width, bb.height) / 2) * pad);

    orb.setAttribute("data-orb-fn", fn);
    orb.setAttribute("data-orb-field", cfg.orbField ? "on" : "off");

    // Optional translucent field
    let field = orb.querySelector(".sym-orb-field");
    let defs = orb.querySelector("defs");
    if (cfg.orbField) {
      const gradId = "orb-field-grad-" + id;
      if (!defs) {
        defs = document.createElementNS(ns, "defs");
        orb.insertBefore(defs, orb.firstChild);
      }
      let grad = document.getElementById(gradId);
      if (!grad || grad.parentNode !== defs) {
        defs.innerHTML = "";
        grad = document.createElementNS(ns, "radialGradient");
        grad.setAttribute("id", gradId);
        for (let i = 0; i < 4; i++) {
          grad.appendChild(document.createElementNS(ns, "stop"));
        }
        defs.appendChild(grad);
      }
      const cols = ORB_FIELD_COLORS[fn] || ORB_FIELD_COLORS.shield;
      const stops = [
        [0, cols.inner],
        [0.45, cols.mid],
        [0.78, cols.edge],
        [1, cols.fade],
      ];
      [...grad.querySelectorAll("stop")].forEach((stop, i) => {
        const [off, col] = stops[i];
        stop.setAttribute("offset", off);
        stop.setAttribute("stop-color", col);
      });
      if (!field) {
        field = document.createElementNS(ns, "circle");
        field.setAttribute("class", "sym-orb-field");
        orb.appendChild(field);
      }
      field.setAttribute("cx", cx);
      field.setAttribute("cy", cy);
      field.setAttribute("r", r);
      field.setAttribute("fill", "url(#" + gradId + ")");
    } else if (field) {
      field.remove();
      if (defs) defs.remove();
    }

    // Rim circle (always)
    let rim = orb.querySelector(".sym-orb-rim");
    if (!rim) {
      rim = document.createElementNS(ns, "circle");
      rim.setAttribute("class", "sym-orb-rim");
      orb.appendChild(rim);
    }
    rim.setAttribute("cx", cx);
    rim.setAttribute("cy", cy);
    rim.setAttribute("r", r);
  };

  const applyToDom = (id) => {
    const cfg = ensure(id);
    const el = findEl(id);
    if (!el) return;
    const pc = parseColour(cfg.colour);
    el.dataset.anim = cfg.anim;
    el.dataset.colour = pc.mode === "off" ? "off" : pc.mode === "vibe" ? "vibe" : "hue";
    // Spectrum = paint actual SVG strokes (black → hue). No separate Ink mode.
    el.dataset.line = pc.mode === "hue" ? "on" : "off";
    el.dataset.ink = "off";
    if (pc.mode === "hue") {
      el.style.setProperty("--sym-hue", String(pc.hue));
      el.style.setProperty("--sym-sat", "78%");
      el.style.setProperty("--sym-lit", "48%");
    } else {
      el.style.removeProperty("--sym-hue");
      el.style.removeProperty("--sym-sat");
      el.style.removeProperty("--sym-lit");
    }
    applyPose(id);
    syncOrbOn(id);
    // Pi spiral: only when Motion ring on, Vibe theme, or explicit Symbol toggle — never default idle
    if (id === "pi") {
      const spiral = el.querySelector("path");
      if (spiral) {
        const vibeOn = (() => {
          try {
            const t = document.documentElement.getAttribute("data-theme") || "";
            return t === "vibe-dark" || t === "vibe-light" || t === "vibe";
          } catch (err) {
            return false;
          }
        })();
        const on = !!(ringOn || vibeOn || cfg.spiral);
        spiral.classList.toggle("pi-spiral", on);
      }
    }
    if (cfg.anim === "off" && pc.mode !== "vibe") {
      el.style.animation = "none";
      el.style.removeProperty("--spin-dur");
      el.style.removeProperty("--glow-dur");
      return;
    }
    el.style.animation = "";
    if (cfg.anim !== "off") {
      const effect = cfg.anim === "pulse" || cfg.anim === "breathe" || cfg.anim === "shimmer" || cfg.anim === "shield";
      const dur = effect ? Math.max(0.8, 12 / Math.max(1, clampPct(cfg.speed))) : periodSec(cfg.speed);
      el.style.setProperty("--spin-dur", dur + "s");
    } else {
      el.style.removeProperty("--spin-dur");
    }
    if (pc.mode === "vibe") {
      el.style.setProperty("--glow-dur", glowPeriodSec(cfg.colourSpeed) + "s");
    } else {
      el.style.removeProperty("--glow-dur");
    }
  };

  let applying = false;
  const applyAll = () => {
    if (applying) return;
    applying = true;
    try {
      document.querySelectorAll(".mark-host svg.sigil .sym, .mark-host svg.sigil .center").forEach((el) => {
        const id = el.getAttribute("data-sym");
        if (!SYMBOLS.some((s) => s.id === id)) {
          el.dataset.anim = "off";
          el.dataset.colour = "off";
          el.style.animation = "none";
        }
      });
      SYMBOLS.forEach((s) => applyToDom(s.id));
      syncRing();
      let anyLine = false;
      SYMBOLS.forEach((s) => {
        const pc = parseColour(ensure(s.id).colour);
        if (pc.mode === "hue") anyLine = true;
      });
      document.documentElement.setAttribute("data-line-any", anyLine ? "on" : "off");
      document.documentElement.setAttribute("data-ink-any", "off");
    } finally {
      applying = false;
    }
  };

  const selectedList = () => [...selected];

  const primaryCfg = () => {
    const ids = selectedList();
    if (!ids.length) return { anim: "off", speed: 1, colour: "off", colourSpeed: 1, size: 100, hue: 28 };
    return ensure(ids[ids.length - 1]);
  };

  const renderLists = () => {
    const cfg = primaryCfg();
    symList.innerHTML = SYMBOLS.map(function (s) {
      const on = selected.has(s.id);
      return (
        '<button type="button" role="option" class="motion-opt" data-sym-pick="' +
        s.id +
        '" aria-selected="' +
        (on ? "true" : "false") +
        '">' +
        s.label +
        "</button>"
      );
    }).join("");
    animList.innerHTML = ANIMS.map(function (a) {
      return (
        '<button type="button" role="option" class="motion-opt" data-anim-pick="' +
        a.id +
        '" aria-selected="' +
        (a.id === cfg.anim ? "true" : "false") +
        '">' +
        a.label +
        "</button>"
      );
    }).join("");
    const pc = parseColour(cfg.colour);
    const modePick = pc.mode === "off" ? "off" : pc.mode === "vibe" ? "vibe" : "bar";
    colourList.querySelectorAll("[data-colour-pick]").forEach((btn) => {
      btn.setAttribute("aria-selected", btn.getAttribute("data-colour-pick") === modePick ? "true" : "false");
    });
    const barWrap = document.querySelector("[data-colour-bar-wrap]");
    const barHint = document.querySelector("[data-colour-bar-hint]");
    const bar = document.querySelector("[data-colour-bar]");
    const swatch = document.querySelector("[data-colour-swatch]");
    const showBar = modePick === "bar";
    if (barWrap) barWrap.hidden = !showBar;
    if (barHint) barHint.hidden = !showBar;
    if (bar) {
      bar.value = String(Math.round(pc.hue * 10));
      bar.disabled = !selected.size || !showBar;
    }
    if (swatch) swatch.style.background = "hsl(" + pc.hue + ", 78%, 48%)";
    const slot = readCustomSlot();
    document.querySelectorAll("[data-custom-slot]").forEach((btn) => {
      btn.setAttribute("aria-selected", btn.getAttribute("data-custom-slot") === slot ? "true" : "false");
    });
    const piWrap = document.querySelector("[data-pi-spiral-wrap]");
    const piBtn = document.querySelector("[data-pi-spiral]");
    const piSel = selected.has("pi");
    if (piWrap) piWrap.hidden = !piSel;
    if (piBtn) piBtn.setAttribute("aria-pressed", piSel && ensure("pi").spiral ? "true" : "false");
    sizeEl.value = String(cfg.size);
    sizeVal.textContent = clampSize(cfg.size) + "%";
    sizeEl.disabled = !selected.size;
    speedEl.value = String(cfg.speed);
    speedVal.textContent = formatPct(cfg.speed);
    speedEl.disabled = !selected.size || cfg.anim === "off";
    colourSpeedEl.value = String(cfg.colourSpeed);
    colourSpeedVal.textContent = formatPct(cfg.colourSpeed);
    colourSpeedEl.disabled = !selected.size || pc.mode === "off";

    const projectOrbBtn = document.querySelector('[data-project-pick="orb"]');
    const projectDetail = document.querySelector('[data-project-detail="orb"]');
    const anyOrb = selectedList().some((id) => ensure(id).orb);
    if (projectOrbBtn) projectOrbBtn.setAttribute("aria-selected", anyOrb ? "true" : "false");
    if (projectDetail) projectDetail.hidden = !selected.size;
    document.querySelectorAll("[data-orb-fn]").forEach((btn) => {
      const fn = btn.getAttribute("data-orb-fn");
      btn.setAttribute("aria-selected", selected.size && fn === cfg.orbFn ? "true" : "false");
    });
    const fieldBtn = document.querySelector("[data-orb-field]");
    if (fieldBtn) {
      const anyField = selectedList().some((id) => ensure(id).orbField);
      fieldBtn.setAttribute("aria-pressed", selected.size && anyField ? "true" : "false");
    }
  };

  const setPanelOpen = (open) => {
    panel.hidden = !open;
    if (symbolOpen) {
      symbolOpen.setAttribute("aria-pressed", open ? "true" : "false");
      symbolOpen.setAttribute("aria-expanded", open ? "true" : "false");
    }
  };

  const restoreNativeRing = () => {
    SYMBOLS.forEach((s) => {
      restoreToOrbit(s.id);
      const cfg = ensure(s.id);
      cfg.pinned = false;
      cfg.ax = 0;
      cfg.ay = 0;
      cfg.x = 0;
      cfg.y = 0;
    });
    writeStore(store);
  };

  const motionMenu = document.querySelector("[data-motion-menu]");
  const motionMenuOpen = (open) => {
    if (!motionMenu || !toggle) return;
    motionMenu.hidden = !open;
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  };

  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    ringOn = !ringOn;
    if (ringOn) {
      if (typeof pinOn !== "undefined" && pinOn) setPin(false);
      restoreNativeRing();
      motionMenuOpen(true);
    } else {
      motionMenuOpen(false);
    }
    writeRing(ringOn);
    syncRing();
    applyAll();
  });

  if (motionMenu) {
    motionMenu.addEventListener("click", (e) => {
      e.stopPropagation();
      const btn = e.target.closest("[data-motion-spin]");
      if (!btn) return;
      const dir = btn.getAttribute("data-motion-spin");
      if (dir !== "cw" && dir !== "ccw") return;
      // Toggle off if pressing the active direction
      ringSpin = ringSpin === dir ? "off" : dir;
      if (!ringOn) {
        ringOn = true;
        if (typeof pinOn !== "undefined" && pinOn) setPin(false);
        restoreNativeRing();
        writeRing(true);
      }
      writeRingSpin(ringSpin);
      syncRing();
      applyAll();
    });
  }

  document.addEventListener("click", (e) => {
    if (!motionMenu || motionMenu.hidden) return;
    if (e.target.closest("[data-motion-wrap]")) return;
    motionMenuOpen(false);
  });

  document.addEventListener("br:zoom", () => {
    if (ringOn && ringSpin !== "off") applyMotionSpin();
  });

  if (symbolOpen) {
    symbolOpen.addEventListener("click", (e) => {
      e.stopPropagation();
      setPanelOpen(panel.hidden);
    });
  }

  document.addEventListener("click", (e) => {
    if (panel.hidden) return;
    if (
      e.target.closest("[data-motion-panel]") ||
      e.target.closest("[data-panel-open]") ||
      e.target.closest("[data-motion-toggle]")
    ) {
      return;
    }
    setPanelOpen(false);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !panel.hidden) setPanelOpen(false);
  });

  symList.addEventListener("click", (e) => {
    e.stopPropagation();
    const btn = e.target.closest("[data-sym-pick]");
    if (!btn) return;
    const id = btn.getAttribute("data-sym-pick");
    if (selected.has(id)) selected.delete(id);
    else selected.add(id);
    writeSelected(selected);
    ensure(id);
    renderLists();
  });

  const selectAllBtn = document.querySelector("[data-sym-select-all]");
  const selectNoneBtn = document.querySelector("[data-sym-select-none]");
  if (selectAllBtn) {
    selectAllBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      selected = new Set(SYMBOLS.map((s) => s.id));
      writeSelected(selected);
      selected.forEach((id) => ensure(id));
      renderLists();
    });
  }
  if (selectNoneBtn) {
    selectNoneBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      selected = new Set();
      writeSelected(selected);
      renderLists();
    });
  }

  const projectList = document.querySelector("[data-project-list]");
  if (projectList) {
    projectList.addEventListener("click", (e) => {
      e.stopPropagation();
      const btn = e.target.closest("[data-project-pick]");
      if (!btn) return;
      if (btn.getAttribute("data-project-pick") !== "orb") return;
      const ids = selectedList();
      if (!ids.length) return;
      const turnOn = !ids.every((id) => ensure(id).orb);
      ids.forEach((id) => {
        const cfg = ensure(id);
        cfg.orb = turnOn;
        if (turnOn) cfg.orbFn = cfg.orbFn || "shield";
      });
      writeStore(store);
      ids.forEach((id) => applyToDom(id));
      renderLists();
    });
  }

  const orbFnList = document.querySelector("[data-orb-fn-list]");
  if (orbFnList) {
    orbFnList.addEventListener("click", (e) => {
      e.stopPropagation();
      const btn = e.target.closest("[data-orb-fn]");
      if (!btn) return;
      const fn = btn.getAttribute("data-orb-fn");
      if (fn !== "shield" && fn !== "orbit" && fn !== "cloud") return;
      const ids = selectedList();
      if (!ids.length) return;
      ids.forEach((id) => {
        const cfg = ensure(id);
        cfg.orb = true;
        cfg.orbFn = fn;
      });
      writeStore(store);
      ids.forEach((id) => applyToDom(id));
      renderLists();
      // Soft link: single Cloud-fn pick can become Cloud-orbit hub when that mode is live
      if (fn === "cloud" && ids.length === 1) {
        document.dispatchEvent(new CustomEvent("br:orb-hub", { detail: { id: ids[0] } }));
      }
    });
  }

  const orbFieldBtn = document.querySelector("[data-orb-field]");
  if (orbFieldBtn) {
    orbFieldBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const ids = selectedList();
      if (!ids.length) return;
      const turnOn = !ids.every((id) => ensure(id).orbField);
      ids.forEach((id) => {
        const cfg = ensure(id);
        cfg.orb = true;
        cfg.orbField = turnOn;
      });
      writeStore(store);
      ids.forEach((id) => applyToDom(id));
      renderLists();
    });
  }


  const forSelected = (fn) => {
    const ids = selectedList();
    if (!ids.length) return;
    ids.forEach((id) => {
      ensure(id);
      fn(id, store[id]);
    });
    writeStore(store);
    ids.forEach((id) => applyToDom(id));
    renderLists();
    if (typeof scheduleCustomAutosave === "function") scheduleCustomAutosave();
  };

  animList.addEventListener("click", (e) => {
    e.stopPropagation();
    const btn = e.target.closest("[data-anim-pick]");
    if (!btn) return;
    const anim = btn.getAttribute("data-anim-pick");
    forSelected((id, cfg) => {
      cfg.anim = anim;
    });
  });

  colourList.addEventListener("click", (e) => {
    e.stopPropagation();
    const btn = e.target.closest("[data-colour-pick]");
    if (!btn) return;
    const raw = btn.getAttribute("data-colour-pick") || "off";
    const bar = document.querySelector("[data-colour-bar]");
    forSelected((id, cfg) => {
      if (raw === "off") {
        cfg.colour = "off";
      } else if (raw === "vibe") {
        cfg.colour = cfg.colour === "vibe" ? "off" : "vibe";
      } else if (raw === "bar") {
        const hue = bar ? Number(bar.value) / 10 : cfg.hue || 28;
        cfg.colour = colourToken("hue", hue);
        cfg.hue = hue;
      }
    });
  });

  const colourBar = document.querySelector("[data-colour-bar]");
  if (colourBar) {
    colourBar.addEventListener("input", () => {
      const hue = Number(colourBar.value) / 10;
      const swatch = document.querySelector("[data-colour-swatch]");
      if (swatch) swatch.style.background = "hsl(" + hue + ", 78%, 48%)";
      forSelected((id, cfg) => {
        cfg.colour = colourToken("hue", hue);
        cfg.hue = hue;
      });
    });
  }
  const piSpiralBtn = document.querySelector("[data-pi-spiral]");
  if (piSpiralBtn) {
    piSpiralBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!selected.has("pi")) return;
      const cfg = ensure("pi");
      cfg.spiral = !cfg.spiral;
      writeStore(store);
      applyToDom("pi");
      renderLists();
    });
  }

  const saveActiveCustom = () => {
    try {
      const key = customStoreKey(readCustomSlot());
      // strip ephemeral pin pose from save — keep look (anim/colour/orb/…)
      const snap = {};
      SYMBOLS.forEach((s) => {
        const c = ensure(s.id);
        snap[s.id] = {
          anim: c.anim,
          speed: c.speed,
          colour: c.colour,
          colourSpeed: c.colourSpeed,
          size: c.size,
          hue: c.hue,
          orb: c.orb,
          orbFn: c.orbFn,
          orbField: c.orbField,
          spiral: c.spiral,
          x: 0,
          y: 0,
          pinned: false,
          ax: 0,
          ay: 0,
        };
      });
      localStorage.setItem(key, JSON.stringify(snap));
      // legacy mirror
      if (readCustomSlot() === "A") localStorage.setItem(STORE_CUSTOM, JSON.stringify(snap));
      localStorage.setItem(CUSTOM_SEEDED, "1");
    } catch (err) {}
  };

  const loadActiveCustom = () => {
    const saved = readStoreRaw(customStoreKey(readCustomSlot()));
    store = Object.keys(saved).length ? saved : customPreset();
    SYMBOLS.forEach((s) => {
      restoreToOrbit(s.id);
      ensure(s.id);
    });
    writeStore(store);
    applyAll();
    renderLists();
  };

  document.querySelectorAll("[data-custom-slot]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const slot = btn.getAttribute("data-custom-slot");
      if (slot !== "A" && slot !== "B" && slot !== "C") return;
      // If currently in custom, persist live edits into previous slot first
      if (readBrMode() === "custom") saveActiveCustom();
      writeCustomSlot(slot);
      if (readBrMode() === "custom") loadActiveCustom();
      else renderLists();
    });
  });
  const saveBtn = document.querySelector("[data-custom-save]");
  if (saveBtn) {
    saveBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      saveActiveCustom();
      saveBtn.textContent = "Saved";
      setTimeout(() => {
        saveBtn.textContent = "Save to Custom";
      }, 900);
    });
  }
  const loadBtn = document.querySelector("[data-custom-load]");
  if (loadBtn) {
    loadBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      loadActiveCustom();
    });
  }
  const clearBtn = document.querySelector("[data-custom-clear]");
  if (clearBtn) {
    clearBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const slot = readCustomSlot();
      const key = customStoreKey(slot);
      try {
        localStorage.removeItem(key);
        if (slot === "A") localStorage.removeItem(STORE_CUSTOM);
      } catch (err) {}
      if (readBrMode() === "custom") {
        store = {};
        SYMBOLS.forEach((s) => {
          restoreToOrbit(s.id);
          store[s.id] = {
            anim: "off",
            speed: 1,
            colour: "off",
            colourSpeed: 1,
            size: 100,
            x: 0,
            y: 0,
            pinned: false,
            ax: 0,
            ay: 0,
            orb: false,
            orbFn: "shield",
            orbField: false,
            spiral: false,
          };
        });
        writeStore(store);
        applyAll();
      }
      clearBtn.textContent = "Cleared " + slot;
      setTimeout(() => {
        clearBtn.textContent = "Clear slot";
      }, 900);
      renderLists();
    });
  }

  // Auto-save Custom slot when symbol look changes (debounced) — not on Reset
  let customSaveTimer = 0;
  const scheduleCustomAutosave = () => {
    if (readBrMode() !== "custom") return;
    clearTimeout(customSaveTimer);
    customSaveTimer = setTimeout(saveActiveCustom, 700);
  };

  sizeEl.addEventListener("input", () => {
    const size = clampSize(sizeEl.value);
    const ids = selectedList();
    if (!ids.length) return;
    ids.forEach((id) => {
      ensure(id);
      store[id].size = size;
      applyPose(id);
      syncOrbOn(id);
    });
    writeStore(store);
    sizeVal.textContent = size + "%";
    scheduleCustomAutosave();
  });

  speedEl.addEventListener("input", () => {
    const speed = clampPct(speedEl.value);
    forSelected((id, cfg) => {
      cfg.speed = speed;
    });
    speedVal.textContent = formatPct(speed);
  });

  colourSpeedEl.addEventListener("input", () => {
    const colourSpeed = clampPct(colourSpeedEl.value);
    forSelected((id, cfg) => {
      cfg.colourSpeed = colourSpeed;
    });
    colourSpeedVal.textContent = formatPct(colourSpeed);
  });

  const doFullReset = () => {
    // Custom mode: Reset restores the last *saved* Custom slot — never wipes A/B/C
    if (readBrMode() === "custom") {
      const saved = readStoreRaw(customStoreKey(readCustomSlot()));
      store = Object.keys(saved).length ? saved : customPreset();
      SYMBOLS.forEach((s) => {
        restoreToOrbit(s.id);
        ensure(s.id);
        const cfg = store[s.id];
        if (cfg) {
          cfg.pinned = false;
          cfg.ax = 0;
          cfg.ay = 0;
          cfg.x = 0;
          cfg.y = 0;
        }
      });
    } else {
      store = {};
      SYMBOLS.forEach((s) => {
        restoreToOrbit(s.id);
        store[s.id] = {
          anim: "off",
          speed: 1,
          colour: "off",
          colourSpeed: 1,
          size: 100,
          x: 0,
          y: 0,
          pinned: false,
          ax: 0,
          ay: 0,
          orb: false,
          orbFn: "shield",
          orbField: false,
          hubWeight: 1,
          ink: false,
          colourDepth: 70,
          spiral: false,
        };
      });
      writeStore(store);
    }
    document.querySelectorAll(".mark-host svg.sigil .sym-orb").forEach((n) => n.remove());
    selected = new Set();
    writeSelected(selected);
    ringOn = false;
    writeRing(false);
    ringSpin = "off";
    writeRingSpin("off");
    repelOn = false;
    setPin(false);
    syncPinUi();
    applyAll();
    renderLists();
  };
  document.querySelectorAll("[data-motion-reset]").forEach((resetBtn) => {
    resetBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      doFullReset();
    });
  });


  // Pause Blessed Raven orbit while hovering a symbol (same as blessedraven.com)
  const markEl = document.querySelector("[data-mark]");
  if (markEl) {
    markEl.addEventListener("pointerover", (e) => {
      if (e.target.closest(".sym, .center")) markEl.classList.add("is-hovering");
    });
    markEl.addEventListener("pointerout", (e) => {
      if (!e.relatedTarget || !markEl.contains(e.relatedTarget)) markEl.classList.remove("is-hovering");
      else if (!e.relatedTarget.closest(".sym, .center")) markEl.classList.remove("is-hovering");
    });
  }

  // —— Pin: fluid drag + optional hard repel + Cloud-orbit prototype ——
  const SVG_CX = 447.56;
  const SVG_CY = 484.96;
  const CLOUD_ID = "center"; // default hub = Home
  const REPEL_PAD = 1.12; // radii must not overlap (extra padding)
  const CLOUD_ORBIT_GAP = 36;
  const CLOUD_ORBIT_PERIOD = 60; // seconds for one clean revolution (rigid ring)
  const ORBIT_RING_MIN = 160;
  const ORBIT_RING_MAX = 390; // room for even ring without packing moons on top of each other

  let pinOn = false;
  let repelOn = false;
  let cloudOrbitOn = false;
  let drag = null;
  // hubId is Cloud for now; later any selected symbol can become the hub
  let hubId = CLOUD_ID;
  let ringIds = []; // moons in even angular order
  let ringRadius = 0; // single shared radius — perfect circle
  let ringPhase = -Math.PI / 2; // shared rotation phase
  let cloudRaf = 0;
  let cloudLastTs = 0;

  const pinBtn = document.querySelector("[data-motion-pin]");
  const pinMenu = document.querySelector("[data-pin-menu]");
  const repelBtn = document.querySelector("[data-pin-repel]");
  const cloudOrbitBtn = document.querySelector("[data-pin-cloud-orbit]");
  const pinLayoutResetBtn = document.querySelector("[data-pin-layout-reset]");

  const pinMenuOpen = (open) => {
    if (!pinMenu || !pinBtn) return;
    pinMenu.hidden = !open;
    pinBtn.setAttribute("aria-expanded", open ? "true" : "false");
  };

  const syncPinUi = () => {
    if (pinBtn) pinBtn.setAttribute("aria-pressed", pinOn ? "true" : "false");
    document.documentElement.setAttribute("data-pin", pinOn ? "on" : "off");
    if (repelBtn) repelBtn.setAttribute("aria-pressed", repelOn ? "true" : "false");
    if (cloudOrbitBtn) cloudOrbitBtn.setAttribute("aria-pressed", cloudOrbitOn ? "true" : "false");
    document.documentElement.setAttribute("data-cloud-orbit", cloudOrbitOn && pinOn ? "on" : "off");
  };

  const artRadius = (id) => {
    const el = findEl(id);
    if (!el) return 40;
    return withArtOnly(el, () => {
      try {
        const bb = el.getBBox();
        const scale = clampSize(ensure(id).size) / 100;
        return (Math.max(bb.width, bb.height) / 2) * scale;
      } catch (err) {
        return 40;
      }
    });
  };

  const placeAbs = (id) => {
    const el = findEl(id);
    const slot = findSlot(id);
    if (!el || !slot) return;
    cancelTween(id);
    const cfg = ensure(id);
    cfg.pinned = true;
    releaseToFree(id);
    setSlotAbs(slot, el, cfg.ax, cfg.ay);
    const hit = findHit(id);
    if (hit) {
      const hc = hit.querySelector("circle.hit");
      if (hc) {
        const hx = Number(hc.getAttribute("cx")) || 0;
        const hy = Number(hc.getAttribute("cy")) || 0;
        hit.setAttribute("transform", "translate(" + (cfg.ax - hx) + " " + (cfg.ay - hy) + ")");
      }
    }
  };

  const ensurePinnedAtWorld = (id) => {
    const el = findEl(id);
    if (!el) return null;
    const cfg = ensure(id);
    if (!cfg.pinned) {
      try {
        const w = worldCenter(el);
        cfg.ax = w.x;
        cfg.ay = w.y;
      } catch (err) {
        cfg.ax = SVG_CX;
        cfg.ay = SVG_CY;
      }
      cfg.pinned = true;
    }
    placeAbs(id);
    return cfg;
  };


  // Match syncOrbOn rim pads (Orbit line is the capture path)
  const orbRimRadius = (id) => {
    const c = ensure(id);
    const fn = c.orbFn || "shield";
    const pad = fn === "cloud" ? 1.28 : fn === "orbit" ? 1.72 : 1.14;
    return artRadius(id) * pad;
  };

  // Double-click / Orbit hub: grow until this symbol is the biggest (size-gate never collapses)
  const ensureHubLargest = (id) => {
    if (!id || !findEl(id)) return;
    const cfg = ensure(id);
    const sizeNow = clampSize(cfg.size) || 100;
    const rNow = artRadius(id);
    const base = rNow / (sizeNow / 100);
    if (!(base > 0.01)) return;
    let maxOther = 0;
    SYMBOLS.forEach((s) => {
      if (s.id === id || !findEl(s.id)) return;
      maxOther = Math.max(maxOther, artRadius(s.id));
    });
    const target = maxOther * 1.12;
    if (rNow >= target) {
      applyToDom(id);
      return;
    }
    cfg.size = clampSize(Math.ceil((target / base) * 100));
    applyToDom(id);
    if (selected.has(id)) renderLists();
  };

  // Keep oversized / unused shapes off the ring so Torus etc. don't sit on the hub
  const parkNonMoons = () => {
    if (!hubId || !findEl(hubId)) return;
    const hub = ensure(hubId);
    const hubR = artRadius(hubId);
    const basePark = Math.max(ringRadius || 0, hubR + 90) + 70;
    let i = 0;
    SYMBOLS.forEach((s) => {
      if (s.id === hubId) return;
      if (ringIds.indexOf(s.id) >= 0) return;
      if (!findEl(s.id)) return;
      const cfg = ensurePinnedAtWorld(s.id);
      const or = artRadius(s.id);
      const need = basePark + or + (i % 6) * 18;
      let dx = cfg.ax - hub.ax;
      let dy = cfg.ay - hub.ay;
      let d = Math.hypot(dx, dy);
      if (d < 0.001) {
        const ang = -Math.PI / 2 + (i * 2 * Math.PI) / 8;
        dx = Math.cos(ang);
        dy = Math.sin(ang);
        d = 1;
      }
      const ux = dx / d;
      const uy = dy / d;
      if (d < need) {
        cfg.ax = Math.round((hub.ax + ux * need) * 10) / 10;
        cfg.ay = Math.round((hub.ay + uy * need) * 10) / 10;
        cfg.pinned = true;
        placeAbs(s.id);
      }
      i++;
    });
  };

  // Orb Shield: soft bubble — other symbols cannot cross the rim (gentle outward push)
  const resolveShieldBarriers = (priorityId) => {
    const hosts = SYMBOLS.map((s) => s.id).filter((id) => {
      const c = ensure(id);
      return c.orb && (c.orbFn || "shield") === "shield" && findEl(id);
    });
    if (!hosts.length) return;
    const others = SYMBOLS.map((s) => s.id).filter((id) => findEl(id));
    hosts.forEach((hid) => {
      if (!ensure(hid).pinned) ensurePinnedAtWorld(hid);
      const hc = ensure(hid);
      const rim = orbRimRadius(hid);
      others.forEach((oid) => {
        if (oid === hid) return;
        // Don't fight active Sandbox orbit moons/hub
        if (cloudOrbitOn && (oid === hubId || ringIds.indexOf(oid) >= 0)) return;
        if (!ensure(oid).pinned) ensurePinnedAtWorld(oid);
        const oc = ensure(oid);
        const or = artRadius(oid);
        let dx = oc.ax - hc.ax;
        let dy = oc.ay - hc.ay;
        let d = Math.hypot(dx, dy);
        if (d < 0.001) {
          dx = 1;
          dy = 0;
          d = 1;
        }
        const need = rim + or * 0.92;
        if (d >= need) return;
        const ux = dx / d;
        const uy = dy / d;
        const push = need - d;
        if (priorityId === hid || priorityId === oid) {
          oc.ax = Math.round((hc.ax + ux * need) * 10) / 10;
          oc.ay = Math.round((hc.ay + uy * need) * 10) / 10;
        } else {
          oc.ax = Math.round((oc.ax + ux * push * 0.85) * 10) / 10;
          oc.ay = Math.round((oc.ay + uy * push * 0.85) * 10) / 10;
        }
        oc.pinned = true;
        placeAbs(oid);
      });
    });
  };

  // Orbit-orb dashed line = capture path. Any shape (or Shield) touching it starts orbiting that host.
  let orbitCaptureLock = false;
  const tryOrbitLineCapture = (visitorId) => {
    if (orbitCaptureLock) return false;
    if (!visitorId || !findEl(visitorId)) return false;
    const vc = ensure(visitorId);
    if (!vc.pinned) ensurePinnedAtWorld(visitorId);
    const vr = artRadius(visitorId);
    let best = null;
    let bestD = Infinity;
    SYMBOLS.forEach((s) => {
      if (s.id === visitorId) return;
      const c = ensure(s.id);
      if (!c.orb || c.orbFn !== "orbit") return;
      if (!findEl(s.id)) return;
      if (cloudOrbitOn && s.id === hubId && ringIds.indexOf(visitorId) >= 0) return; // already moon of this hub
      if (!c.pinned) ensurePinnedAtWorld(s.id);
      const h = ensure(s.id);
      const rim = orbRimRadius(s.id);
      const d = Math.hypot(vc.ax - h.ax, vc.ay - h.ay);
      // Touch the orbit line (band around rim) or cross inside it
      const outer = rim + vr * 0.35;
      const inner = Math.max(0, rim - vr * 0.85);
      if (d <= outer && d >= inner * 0.15 && d < bestD) {
        bestD = d;
        best = s.id;
      }
      // Also: fully inside the orbit circle counts as contact
      if (d < rim + vr * 0.2 && d < bestD) {
        bestD = d;
        best = s.id;
      }
    });
    if (!best) return false;
    if (cloudOrbitOn && best === hubId) return false; // already around this host
    orbitCaptureLock = true;
    try {
      startOrbitAround(best, { forceAll: false, center: false, shuffle: false });
    } finally {
      orbitCaptureLock = false;
    }
    return true;
  };

  const tryOrbitGravityCapture = (droppedId) => tryOrbitLineCapture(droppedId);

  // Soft/hard separation. In Orbit: friendly push then snap moons back onto the ring.
  const resolveRepel = (priorityId) => {
    if (!repelOn) return;
    // Orbit owns ring seats — never shove moons off the circle mid-spin
    if (cloudOrbitOn && !drag) return;
    const ids = SYMBOLS.map((s) => s.id).filter((id) => findEl(id));
    ids.forEach((id) => {
      if (!ensure(id).pinned) ensurePinnedAtWorld(id);
    });
    const soft = cloudOrbitOn ? 0.35 : 1; // gentler while dragging in orbit
    for (let pass = 0; pass < (cloudOrbitOn ? 2 : 5); pass++) {
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const a = ids[i];
          const b = ids[j];
          const ca = ensure(a);
          const cb = ensure(b);
          const orbPad = (id) => (ensure(id).orb ? 1.18 : 1);
          const need =
            (artRadius(a) * orbPad(a) + artRadius(b) * orbPad(b)) * (cloudOrbitOn ? 1.06 : REPEL_PAD);
          let dx = cb.ax - ca.ax;
          let dy = cb.ay - ca.ay;
          let d = Math.hypot(dx, dy);
          if (d < 0.001) {
            dx = 0.01;
            dy = 0;
            d = 0.01;
          }
          if (d >= need) continue;
          const push = ((need - d) / 2) * soft;
          const ux = dx / d;
          const uy = dy / d;
          let wa = 1;
          let wb = 1;
          if (priorityId === a) {
            wa = 0.08;
            wb = 1.92;
          } else if (priorityId === b) {
            wa = 1.92;
            wb = 0.08;
          }
          if (cloudOrbitOn && a === hubId) {
            wa = 0;
            wb = 2;
          } else if (cloudOrbitOn && b === hubId) {
            wa = 2;
            wb = 0;
          }
          const sum = wa + wb || 1;
          ca.ax = Math.round((ca.ax - ux * push * (wa / sum) * 2) * 10) / 10;
          ca.ay = Math.round((ca.ay - uy * push * (wa / sum) * 2) * 10) / 10;
          cb.ax = Math.round((cb.ax + ux * push * (wb / sum) * 2) * 10) / 10;
          cb.ay = Math.round((cb.ay + uy * push * (wb / sum) * 2) * 10) / 10;
          ca.pinned = true;
          cb.pinned = true;
        }
      }
    }
    // Orbit: project moons back onto the circle (dragged moon keeps free pose until release)
    if (cloudOrbitOn && hubId && ringRadius) {
      const hub = ensure(hubId);
      ringIds.forEach((id) => {
        if (drag && drag.id === id) return;
        if (id === hubId) return;
        const cfg = ensure(id);
        const ang = Math.atan2(cfg.ay - hub.ay, cfg.ax - hub.ax);
        cfg.ax = hub.ax + Math.cos(ang) * ringRadius;
        cfg.ay = hub.ay + Math.sin(ang) * ringRadius;
        cfg.pinned = true;
      });
    }
    ids.forEach((id) => placeAbs(id));
  };

  const stopCloudOrbit = () => {
    if (cloudRaf) {
      cancelAnimationFrame(cloudRaf);
      cloudRaf = 0;
    }
    cloudLastTs = 0;
    ringIds = [];
    ringRadius = 0;
    document.querySelectorAll(".mark-host svg.sigil [data-cloud-hub]").forEach((el) => {
      el.removeAttribute("data-cloud-hub");
      el.style.removeProperty("--tidal-rot");
    });
    document.querySelectorAll(".mark-host svg.sigil [data-cloud-moon]").forEach((el) => {
      el.removeAttribute("data-cloud-moon");
      el.style.removeProperty("--tidal-rot");
    });
  };

  const layoutRing = (opts) => {
    const ease = !!(opts && opts.ease);
    const hub = ensure(hubId);
    const n = ringIds.length;
    if (!n || !ringRadius) return;
    ringIds.forEach((id, i) => {
      if (drag && drag.id === id) return;
      if (inertias.has(id)) return;
      const ang = ringPhase + (i * 2 * Math.PI) / n;
      const ax = hub.ax + Math.cos(ang) * ringRadius;
      const ay = hub.ay + Math.sin(ang) * ringRadius;
      const cfg = ensure(id);
      cfg.pinned = true;
      const el = findEl(id);
      if (el) {
        el.setAttribute("data-cloud-moon", "true");
        el.style.setProperty("--tidal-rot", ang + Math.PI / 2 + "rad");
      }
      if (ease) {
        // Ensure free-layer seat, then ease into ring slot
        if (!cfg.ax && !cfg.ay) {
          const w = worldCenter(findEl(id) || el);
          if (w) { cfg.ax = w.x; cfg.ay = w.y; }
        }
        releaseToFree(id);
        tweenTo(id, ax, ay, 420);
      } else {
        cfg.ax = ax;
        cfg.ay = ay;
        placeAbs(id);
      }
    });
  };

  let cloudForceAll = false; // All shapes on ring (ignore size gate)
  let orbitShuffle = false; // Random matrix reorders moon slots

  const rebuildCloudMoons = () => {
    const hubEl = findEl(hubId);
    if (!hubEl) return;
    const hub = ensurePinnedAtWorld(hubId);
    hubEl.setAttribute("data-cloud-hub", "true");
    document.querySelectorAll(".mark-host svg.sigil [data-cloud-moon]").forEach((el) => {
      el.removeAttribute("data-cloud-moon");
      el.style.removeProperty("--tidal-rot");
    });

    const hubR = artRadius(hubId);
    let moons = [];
    SYMBOLS.forEach((s) => {
      if (s.id === hubId) return;
      if (!findEl(s.id)) return;
      const r = artRadius(s.id);
      // Motion-style: only smaller-than-hub moons, unless forceAll (Random / All shapes)
      if (cloudForceAll || r < hubR * 1.02) moons.push({ id: s.id, r });
    });
    if (!orbitShuffle) {
      moons.sort((a, b) => a.r - b.r || a.id.localeCompare(b.id));
    } else {
      for (let i = moons.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = moons[i];
        moons[i] = moons[j];
        moons[j] = tmp;
      }
    }

    const fitRadius = (list) => {
      const n = list.length;
      if (!n) return 0;
      const radii = list.map((m) => m.r).sort((a, b) => a - b);
      const maxMoonR = radii[radii.length - 1];
      const midMoonR = radii[Math.floor(radii.length / 2)];
      const clearHub = hubR + midMoonR + CLOUD_ORBIT_GAP;
      const sinHalf = Math.sin(Math.PI / n);
      const clearMoons = sinHalf > 0.001 ? (midMoonR * REPEL_PAD) / sinHalf : clearHub;
      let R = Math.max(clearHub, clearMoons, ORBIT_RING_MIN);
      R = Math.max(R, hubR + Math.min(maxMoonR, 100) + CLOUD_ORBIT_GAP);
      return R;
    };

    // If forceAll packed too tight for the stage, drop largest moons until the ring fits
    if (cloudForceAll) {
      moons = moons.slice().sort((a, b) => a.r - b.r || a.id.localeCompare(b.id));
      while (moons.length > 2 && fitRadius(moons) > ORBIT_RING_MAX) {
        moons.pop(); // drop largest
      }
      if (orbitShuffle) {
        for (let i = moons.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          const tmp = moons[i];
          moons[i] = moons[j];
          moons[j] = tmp;
        }
      }
    }

    ringIds = moons.map((m) => m.id);
    const n = ringIds.length;
    if (!n) {
      ringRadius = 0;
      writeStore(store);
      return;
    }

    let R = fitRadius(moons);
    ringRadius = Math.min(ORBIT_RING_MAX, R);

    layoutRing({ ease: true });
    parkNonMoons();
    writeStore(store);
  };

  const tickCloudOrbit = (ts) => {
    if (!pinOn || !cloudOrbitOn) {
      stopCloudOrbit();
      return;
    }
    if (!cloudLastTs) cloudLastTs = ts;
    const dt = Math.min(0.05, (ts - cloudLastTs) / 1000);
    cloudLastTs = ts;

    // Rigid ring: one shared omega — perfect spacing stays perfect
    if (!(drag && (drag.id === hubId || ringIds.indexOf(drag.id) >= 0))) {
      const omega = (Math.PI * 2) / CLOUD_ORBIT_PERIOD;
      ringPhase += omega * dt;
      layoutRing();
    } else if (drag && drag.id === hubId) {
      // Hub moving — moons stay locked relative via layoutRing
      layoutRing();
    }
    cloudRaf = requestAnimationFrame(tickCloudOrbit);
  };

  const startCloudOrbit = (opts) => {
    if (cloudRaf) cancelAnimationFrame(cloudRaf);
    cloudLastTs = 0;
    if (!hubId || !findEl(hubId)) hubId = CLOUD_ID;
    if (!(opts && opts.keepPhase)) ringPhase = -Math.PI / 2;
    rebuildCloudMoons();
    cloudRaf = requestAnimationFrame(tickCloudOrbit);
  };

  // Park hub at SVG stage center so the ring always matches the screenshot look
  const centerHubAtStage = (id) => {
    const cfg = ensurePinnedAtWorld(id);
    cfg.ax = SVG_CX;
    cfg.ay = SVG_CY;
    cfg.pinned = true;
    placeAbs(id);
    return cfg;
  };

  const startOrbitAround = (id, opts) => {
    // Default: size-gated moons (Motion / teach-demo feel). forceAll only for Random / All shapes.
    const forceAll = opts && opts.forceAll !== undefined ? !!opts.forceAll : false;
    const center = opts && opts.center !== undefined ? !!opts.center : true;
    const shuffle = !!(opts && opts.shuffle);
    const keepPhase = !!(opts && opts.keepPhase);
    if (!id || !findEl(id)) return;
    if (ringOn) {
      ringOn = false;
      writeRing(false);
      syncRing();
    }
    if (!pinOn) {
      pinOn = true;
      SYMBOLS.forEach((s) => ensurePinnedAtWorld(s.id));
    }
    hubId = id;
    cloudForceAll = forceAll;
    orbitShuffle = shuffle;
    cloudOrbitOn = true;
    ensureHubLargest(id);
    if (center) centerHubAtStage(id);
    else ensurePinnedAtWorld(id);
    startCloudOrbit({ keepPhase: keepPhase });
    orbitShuffle = false; // one-shot shuffle
    syncPinUi();
  };

  const setCloudOrbit = (on) => {
    cloudOrbitOn = !!on;
    if (cloudOrbitOn) {
      // Sandbox → Orbit: Motion-like even ring — Cloud hub, only smaller moons
      const hub = CLOUD_ID;
      startOrbitAround(hub, { forceAll: false, center: true, shuffle: false });
    } else {
      stopCloudOrbit();
      cloudForceAll = false;
      orbitShuffle = false;
    }
    syncPinUi();
  };

  const randomOrbit = () => {
    const ids = SYMBOLS.map((s) => s.id).filter((id) => findEl(id));
    if (!ids.length) return;
    // True uniform: each symbol equal 1/n chance
    const hub = ids[Math.floor(Math.random() * ids.length)];
    ringPhase = Math.random() * Math.PI * 2;
    startOrbitAround(hub, {
      forceAll: false,
      center: true,
      shuffle: true,
      keepPhase: true,
    });
    pinMenuOpen(true);
    applyAll();
  };

  document.addEventListener("br:orb-hub", (e) => {
    const id = e.detail && e.detail.id;
    if (!id || !findEl(id)) return;
    if (!cloudOrbitOn) return;
    hubId = id;
    ensurePinnedAtWorld(id);
    rebuildCloudMoons();
  });

  const setRepel = (on) => {
    repelOn = !!on;
    syncPinUi();
    if (repelOn && pinOn) {
      resolveRepel(drag ? drag.id : null);
      writeStore(store);
    }
  };

  const setPin = (on) => {
    pinOn = !!on;
    if (!pinOn) {
      pinMenuOpen(false);
      cloudOrbitOn = false;
      stopCloudOrbit();
      // Leaving Sandbox never leaves Repel latched for the next enter
      repelOn = false;
    } else {
      // Freeze at current artist seats — never auto-run Repel on enter
      SYMBOLS.forEach((s) => ensurePinnedAtWorld(s.id));
      writeStore(store);
      // Orbit armed keeps normal seats until double-click / Random starts a hub
    }
    syncPinUi();
  };

  setPin(false);
  syncPinUi();

  if (pinBtn) {
    pinBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const next = !pinOn;
      if (next && ringOn) {
        ringOn = false;
        writeRing(false);
        syncRing();
      }
      setPin(next);
      if (next) pinMenuOpen(true);
      applyAll();
    });
  }

  if (repelBtn) {
    repelBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      // Repel is independent of Sandbox menu — never auto-enter Sandbox
      setRepel(!repelOn);
      applyAll();
    });
  }

  const randomBtn = document.querySelector("[data-pin-orbit-random]");
  if (randomBtn) {
    randomBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      randomOrbit();
    });
  }

  if (cloudOrbitBtn) {
    cloudOrbitBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!pinOn) {
        if (ringOn) {
          ringOn = false;
          writeRing(false);
          syncRing();
        }
        setPin(true);
        pinMenuOpen(true);
      }
      setCloudOrbit(!cloudOrbitOn);
      applyAll();
    });
  }

  // Pin → Reset: put every symbol back to artist baseline seats
  if (pinLayoutResetBtn) {
    pinLayoutResetBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      setCloudOrbit(false);
      stopCloudOrbit();
      cloudForceAll = false;
      repelOn = false;
      hubId = CLOUD_ID;
      SYMBOLS.forEach((s) => {
        restoreToOrbit(s.id);
        store[s.id] = {
          anim: (store[s.id] && store[s.id].anim) || "off",
          speed: (store[s.id] && store[s.id].speed) || 100,
          colour: (store[s.id] && store[s.id].colour) || "off",
          colourSpeed: (store[s.id] && store[s.id].colourSpeed) || 100,
          size: 100,
          x: 0,
          y: 0,
          pinned: false,
          ax: 0,
          ay: 0,
        orb: false,
        orbFn: "shield",
        orbField: false,
        };
      });
      writeStore(store);
      syncPinUi();
      applyAll();
      renderLists();
    });
  }

  document.addEventListener("click", (e) => {
    if (!pinMenu || pinMenu.hidden) return;
    if (e.target.closest("[data-pin-wrap]")) return;
    pinMenuOpen(false);
  });

  // Cloud orbit: tap a shape → action menu (hub / reset shape / reset / all shapes)
  const cloudMenu = document.querySelector("[data-cloud-shape-menu]");
  let cloudMenuSym = null;
  const cloudMenuOpen = (open, id, clientX, clientY) => {
    if (!cloudMenu) return;
    cloudMenu.hidden = !open;
    cloudMenuSym = open ? id : null;
    if (open && Number.isFinite(clientX) && Number.isFinite(clientY)) {
      const pad = 8;
      const x = Math.min(window.innerWidth - 180, Math.max(pad, clientX + 6));
      const y = Math.min(window.innerHeight - 160, Math.max(pad, clientY + 6));
      cloudMenu.style.left = x + "px";
      cloudMenu.style.top = y + "px";
    }
    document.documentElement.setAttribute("data-cloud-menu", open ? "on" : "off");
  };

  const resetOneShape = (id) => {
    if (!id) return;
    restoreToOrbit(id);
    store[id] = {
      anim: (store[id] && store[id].anim) || "off",
      speed: (store[id] && store[id].speed) || 100,
      colour: (store[id] && store[id].colour) || "off",
      colourSpeed: (store[id] && store[id].colourSpeed) || 100,
      size: 100,
      x: 0,
      y: 0,
      pinned: false,
      ax: 0,
      ay: 0,
      orb: false,
      orbFn: "shield",
    };
    writeStore(store);
    if (cloudOrbitOn) {
      ensurePinnedAtWorld(id);
      rebuildCloudMoons();
    }
    applyAll();
    renderLists();
  };

  const resetAllShapes = () => {
    setCloudOrbit(false);
    stopCloudOrbit();
    cloudForceAll = false;
    repelOn = false;
    hubId = CLOUD_ID;
    SYMBOLS.forEach((s) => {
      restoreToOrbit(s.id);
      store[s.id] = {
        anim: (store[s.id] && store[s.id].anim) || "off",
        speed: (store[s.id] && store[s.id].speed) || 100,
        colour: (store[s.id] && store[s.id].colour) || "off",
        colourSpeed: (store[s.id] && store[s.id].colourSpeed) || 100,
        size: 100,
        x: 0,
        y: 0,
        pinned: false,
        ax: 0,
        ay: 0,
        orb: false,
        orbFn: "shield",
      orbField: false,
      };
    });
    writeStore(store);
    applyAll();
    renderLists();
  };

  if (cloudMenu) {
    cloudMenu.addEventListener("click", (e) => {
      e.stopPropagation();
      const btn = e.target.closest("[data-cloud-act]");
      if (!btn) return;
      const act = btn.getAttribute("data-cloud-act");
      const id = cloudMenuSym;
      cloudMenuOpen(false);
      if (act === "hub" && id) {
        startOrbitAround(id, { forceAll: false });
        applyAll();
      } else if (act === "reset-shape" && id) {
        resetOneShape(id);
      } else if (act === "reset-all") {
        resetAllShapes();
      } else if (act === "all-shapes") {
        const hub = hubId && findEl(hubId) ? hubId : CLOUD_ID;
        startOrbitAround(hub, { forceAll: true });
        applyAll();
      }
    });
    document.addEventListener("click", (e) => {
      if (!cloudMenu || cloudMenu.hidden) return;
      if (e.target.closest("[data-cloud-shape-menu]")) return;
      cloudMenuOpen(false);
    });
  }


  // Double-click a shape → start / retarget Orbit hub (default seats stay until this or Random)
  document.addEventListener(
    "dblclick",
    (e) => {
      const el = e.target.closest(".mark-host svg.sigil .sym, .mark-host svg.sigil .center");
      if (!el) return;
      const id = el.getAttribute("data-sym");
      if (!id || !SYMBOLS.some((s) => s.id === id)) return;
      e.preventDefault();
      e.stopPropagation();
      startOrbitAround(id, { forceAll: false });
      pinMenuOpen(true);
      applyAll();
    },
    true
  );

  // Shape drag is native site-wide (same feel as Pin). Pin only adds repel/orbit/reset.
  const canvasDragOn = () => true;

  const onPointerDown = (e) => {
    // Zoom mode owns empty-space gestures; still allow grabbing a shape
    if (document.documentElement.getAttribute("data-zoom-mode") === "on") {
      const maybe = e.target.closest(".mark-host svg.sigil .sym, .mark-host svg.sigil .center");
      if (!maybe) return;
    }
    const el = e.target.closest(".mark-host svg.sigil .sym, .mark-host svg.sigil .center");
    if (!el) return;
    const id = el.getAttribute("data-sym");
    if (!SYMBOLS.some((s) => s.id === id)) return;
    e.preventDefault();
    e.stopPropagation();
    const svg = el.ownerSVGElement;
    const p = svgPoint(svg, e.clientX, e.clientY);
    ensurePinnedAtWorld(id);
    cancelInertia(id);
    cancelTween(id);
    drag = {
      id,
      el,
      svg,
      lastX: p.x,
      lastY: p.y,
      moved: false,
      startX: p.x,
      startY: p.y,
      vx: 0,
      vy: 0,
      lastT: performance.now(),
    };
    selected = new Set([id]);
    writeSelected(selected);
    renderLists();
    try {
      el.setPointerCapture(e.pointerId);
    } catch (err) {}
  };

  const onPointerMove = (e) => {
    if (!drag) return;
    e.preventDefault();
    const p = svgPoint(drag.svg, e.clientX, e.clientY);
    if (Math.hypot(p.x - drag.startX, p.y - drag.startY) > 3) drag.moved = true;
    const now = performance.now();
    const dt = Math.max(8, now - (drag.lastT || now));
    const dx = p.x - drag.lastX;
    const dy = p.y - drag.lastY;
    drag.vx = dx / (dt / 16.67);
    drag.vy = dy / (dt / 16.67);
    drag.lastT = now;
    drag.lastX = p.x;
    drag.lastY = p.y;
    const cfg = ensure(drag.id);
    cfg.pinned = true;
    cfg.ax = Math.round((cfg.ax + dx) * 10) / 10;
    cfg.ay = Math.round((cfg.ay + dy) * 10) / 10;
    placeAbs(drag.id);

    if (cloudOrbitOn && drag.id === hubId) {
      layoutRing();
    }
    // While dragging a moon, allow free move; ring snaps even again on release

    if (repelOn) resolveRepel(drag.id);
    resolveShieldBarriers(drag.id);
    // Orbit-orb line capture while dragging (Sandbox or free)
    if (!(cloudOrbitOn && drag.id === hubId)) {
      tryOrbitLineCapture(drag.id);
    }
    writeStore(store);
  };

  const onPointerUp = (e) => {
    if (!drag) return;
    const id = drag.id;
    const wasTap = !drag.moved;
    const wasMoved = !!drag.moved;
    const flingVx = drag.vx || 0;
    const flingVy = drag.vy || 0;
    drag = null;
    if (cloudOrbitOn) {
      if (wasTap) {
        // Tap in Cloud mode → shape actions (hub / reset / all)
        cloudMenuOpen(true, id, e && e.clientX, e && e.clientY);
      } else {
        // Snap back to perfect even circular spacing (phase from drop angle if a moon was dragged)
        if (id !== hubId && ringIds.indexOf(id) >= 0) {
          const hub = ensure(hubId);
          const cfg = ensure(id);
          const dropAng = Math.atan2(cfg.ay - hub.ay, cfg.ax - hub.ax);
          const idx = ringIds.indexOf(id);
          const n = ringIds.length;
          if (n > 0 && idx >= 0) {
            ringPhase = dropAng - (idx * 2 * Math.PI) / n;
          }
        }
        rebuildCloudMoons();
      }
      if (!cloudRaf) cloudRaf = requestAnimationFrame(tickCloudOrbit);
    } else {
      // Not in Sandbox Orbit: Orbit-orb hosts can capture a smaller drop
      if (wasMoved && tryOrbitGravityCapture(id)) {
        writeStore(store);
        return;
      }
      if (repelOn) resolveRepel(id);
      resolveShieldBarriers(id);
      if (wasMoved) startInertia(id, flingVx, flingVy);
    }
    writeStore(store);
  };

  document.addEventListener("pointerdown", onPointerDown, true);
  document.addEventListener("pointermove", onPointerMove, true);
  document.addEventListener("pointerup", onPointerUp, true);
  document.addEventListener("pointercancel", onPointerUp, true);

  const customPreset = () => {
    const o = {};
    SYMBOLS.forEach((s) => {
      o[s.id] = {
        anim: "off",
        speed: 1,
        colour: "off",
        colourSpeed: 1,
        size: 100,
        x: 0,
        y: 0,
        pinned: false,
        ax: 0,
        ay: 0,
        orb: false,
        orbFn: "shield",
        orbField: false,
        hubWeight: 1,
        ink: false,
        colourDepth: 70,
        spiral: false,
      };
    });
    // BR Custom "Carousel" seed — outer CW + vibe, Home gold
    o.n = { ...o.n, anim: "cw", speed: 35, colour: "vibe" };
    o.nw = { ...o.nw, anim: "ccw", speed: 28, colour: "vibe" };
    o.w = { ...o.w, anim: "cw", speed: 22, colour: colourToken("hue", HUE_PRESETS.cyan), hue: HUE_PRESETS.cyan };
    o.sw = { ...o.sw, anim: "breathe", speed: 40, colour: "vibe" };
    o.s = { ...o.s, anim: "pulse", speed: 45, colour: colourToken("hue", HUE_PRESETS.gold), hue: HUE_PRESETS.gold };
    o.se = { ...o.se, anim: "cw", speed: 30, colour: "vibe" };
    o.e = { ...o.e, anim: "shimmer", speed: 50, colour: colourToken("hue", HUE_PRESETS.indigo), hue: HUE_PRESETS.indigo };
    o.ne = { ...o.ne, anim: "ccw", speed: 25, colour: "vibe" };
    o.center = { ...o.center, colour: colourToken("hue", HUE_PRESETS.gold), hue: HUE_PRESETS.gold, anim: "shield", speed: 20, orb: true, orbFn: "shield", orbField: true };
    return o;
  };

  const ensureCustomSeeded = () => {
    try {
      const slotA = customStoreKey("A");
      let existing = readStoreRaw(slotA);
      if (!Object.keys(existing).length) existing = readStoreRaw(STORE_CUSTOM);
      if (Object.keys(existing).length && localStorage.getItem(CUSTOM_SEEDED) === "1") {
        if (!Object.keys(readStoreRaw(slotA)).length) localStorage.setItem(slotA, JSON.stringify(existing));
        return;
      }
      const preset = customPreset();
      localStorage.setItem(slotA, JSON.stringify(preset));
      localStorage.setItem(STORE_CUSTOM, JSON.stringify(preset));
      localStorage.setItem(CUSTOM_SEEDED, "1");
    } catch (err) {}
  };
  ensureCustomSeeded();

  // If Custom mode is active on load, reload store from custom key
  if (readBrMode() === "custom") {
    store = readStore();
    SYMBOLS.forEach((s) => ensure(s.id));
  }

  document.addEventListener("br:theme", (e) => {
    const detail = e.detail || {};
    const prev = detail.prev;
    const next = detail.theme;
    // Persist current symbols into previous mode bucket
    try {
      const prevMode = prev === "custom" ? "custom" : prev === "light" || prev === "vibe-light" ? "light" : "dark";
      localStorage.setItem(storeKeyForMode(prevMode), JSON.stringify(store));
    } catch (err) {}
    if (next === "custom") ensureCustomSeeded();
    store = readStore();
    SYMBOLS.forEach((s) => ensure(s.id));
    writeStore(store);
    applyAll();
    renderLists();
  });

  document.documentElement.setAttribute("data-colour", "off");
  renderLists();
  setPanelOpen(false);
  syncRing();

  const tryApply = () => {
    if (applying) return;
    if (document.querySelector(".mark-host svg.sigil .sym, .mark-host svg.sigil .center")) {
      applyAll();
    }
  };
  tryApply();
  document.addEventListener("br:syms-ready", tryApply);
  const host = document.querySelector("[data-mark-host]");
  if (host) {
    new MutationObserver(tryApply).observe(host, { childList: true, subtree: true });
  }
})();
