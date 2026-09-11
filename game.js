(() => {
  "use strict";

  const CX = 447.56;
  const CY = 484.96;
  const FRICTION = 0.94;
  const MIN_V = 0.08;
  const EASE = 0.14;
  const ORBIT_PERIOD = 48; // seconds per revolution
  const STORE_KEY = "br-game-v2";
  const SELECT_KEY = "br-game-selected-v2";

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

  /** @type {Map<string, any>} */
  const entities = new Map();
  /** @type {Set<string>} */
  let selected = new Set();
  let ready = false;
  let sandboxOn = false;
  let orbitOn = false;
  let repelOn = false;
  let ringSpin = "off"; // off | cw | ccw
  let orbitAngle = 0;
  let hubId = "center";
  let resetting = false;
  let lastT = 0;
  let drag = null;
  let vibeHue = 0;

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const findEl = (id) =>
    id === "center"
      ? $('.mark-host svg.sigil .center[data-sym="center"]')
      : $(`.mark-host svg.sigil .sym[data-sym="${id}"]`);
  const findSlot = (id) => $(`.mark-host svg.sigil [data-sym-slot="${id}"]`);
  const findHit = (id) => $(`.hits [data-sym="${id}"]`);

  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const lerp = (a, b, t) => a + (b - a) * t;

  const defaultCfg = () => ({
    anim: "off",
    spinSpeed: 35,
    colour: "off",
    hue: 210,
    colourSpeed: 60,
    size: 100,
  });

  const loadStore = () => {
    try {
      const raw = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
      return raw && typeof raw === "object" ? raw : {};
    } catch {
      return {};
    }
  };

  const saveStore = () => {
    const out = {};
    entities.forEach((e, id) => {
      out[id] = {
        anim: e.anim,
        spinSpeed: e.spinSpeed,
        colour: e.colour,
        hue: Math.round(e.hue),
        colourSpeed: e.colourSpeed,
        size: Math.round(e.size * 100),
      };
    });
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(out));
    } catch {}
  };

  const loadSelected = () => {
    try {
      const arr = JSON.parse(localStorage.getItem(SELECT_KEY) || "[]");
      if (Array.isArray(arr)) selected = new Set(arr.filter((id) => entities.has(id)));
    } catch {
      selected = new Set();
    }
  };

  const saveSelected = () => {
    try {
      localStorage.setItem(SELECT_KEY, JSON.stringify([...selected]));
    } catch {}
  };

  const centroid = (el) => {
    try {
      const b = el.getBBox();
      if (!b.width && !b.height) return { cx: CX, cy: CY, r: 40 };
      return {
        cx: b.x + b.width / 2,
        cy: b.y + b.height / 2,
        r: Math.max(28, Math.hypot(b.width, b.height) * 0.28),
      };
    } catch {
      return { cx: CX, cy: CY, r: 40 };
    }
  };

  const ensureAura = (e) => {
    if (!e.el) return;
    let aura = e.el.querySelector(":scope > .sym-aura");
    if (!aura) {
      aura = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      aura.setAttribute("class", "sym-aura");
      aura.setAttribute("fill", "none");
      aura.setAttribute("pointer-events", "none");
      e.el.insertBefore(aura, e.el.firstChild);
    }
    const c = centroid(e.el);
    // aura is in local space after transform-origin center — use bbox center relative
    try {
      const b = e.el.getBBox();
      aura.setAttribute("cx", String(b.x + b.width / 2));
      aura.setAttribute("cy", String(b.y + b.height / 2));
      aura.setAttribute("r", String(Math.max(b.width, b.height) * 0.62));
    } catch {
      aura.setAttribute("cx", "0");
      aura.setAttribute("cy", "0");
      aura.setAttribute("r", String(e.radius * 1.4));
    }
    e.auraEl = aura;
  };

  const buildEntities = () => {
    entities.clear();
    const store = loadStore();
    SYMBOLS.forEach((s) => {
      const el = findEl(s.id);
      const slot = findSlot(s.id);
      if (!el || !slot) {
        console.warn("[br-game] missing wrap for", s.id);
        return;
      }
      const c = centroid(el);
      const cfg = { ...defaultCfg(), ...(store[s.id] || {}) };
      const size = clamp(Number(cfg.size) || 100, 25, 320) / 100;
      const e = {
        id: s.id,
        label: s.label,
        el,
        slot,
        hit: findHit(s.id),
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        rot: 0,
        size,
        hue: Number(cfg.hue) || 210,
        colour: cfg.colour === "vibe" || cfg.colour === "hue" ? cfg.colour : "off",
        colourSpeed: clamp(Number(cfg.colourSpeed) || 60, 1, 100),
        anim: ANIMS.some((a) => a.id === cfg.anim) ? cfg.anim : "off",
        spinSpeed: clamp(Number(cfg.spinSpeed) || 35, 1, 100),
        homeCx: c.cx,
        homeCy: c.cy,
        radius: c.r,
        phase: Math.random() * Math.PI * 2,
        orbitSlot: 0,
        auraEl: null,
      };
      pinOrigin(el);
      ensureAura(e);
      entities.set(s.id, e);
      applyColourDom(e);
      syncAuraDom(e);
    });
    loadSelected();
    if (!selected.size && entities.has("ne")) selected.add("ne");
    saveSelected();
  };

  const pinOrigin = (el) => {
    try {
      el.style.transformBox = "fill-box";
      el.style.transformOrigin = "center";
    } catch {}
  };

  const targetsFor = () => (selected.size ? [...selected] : []);

  const forSelected = (fn) => {
    targetsFor().forEach((id) => {
      const e = entities.get(id);
      if (e) fn(e);
    });
  };

  // —— DOM render (batched per entity) ——
  const applyColourDom = (e) => {
    e.el.dataset.colour = e.colour;
    if (e.colour === "off") {
      e.el.style.removeProperty("--sym-hue");
      e.el.querySelectorAll("[data-br-stroke]").forEach((n) => {
        n.style.removeProperty("stroke");
        n.style.removeProperty("fill");
        n.removeAttribute("data-br-stroke");
      });
      if (selected.has(e.id)) {
        e.el.style.filter = "drop-shadow(0 0 6px color-mix(in srgb, var(--accent) 70%, white)) drop-shadow(0 0 14px color-mix(in srgb, var(--accent) 45%, transparent))";
      } else {
        e.el.style.removeProperty("filter");
      }
      return;
    }
    const h = e.hue;
    e.el.style.setProperty("--sym-hue", String(((h % 360) + 360) % 360));
    // Glow aura via filter — works with dark invert better than stroke paint alone
    const sel = selected.has(e.id);
    const glow = sel
      ? `drop-shadow(0 0 4px hsl(${h}, 95%, 62%)) drop-shadow(0 0 12px hsl(${h}, 90%, 55%)) drop-shadow(0 0 22px hsl(${h}, 80%, 50%))`
      : `drop-shadow(0 0 5px hsl(${h}, 90%, 58%)) drop-shadow(0 0 14px hsl(${h}, 85%, 48%))`;
    e.el.style.filter = glow;
    // Spectrum also tints strokes when hue mode
    if (e.colour === "hue") {
      const stroke = `hsl(${e.hue}, 78%, 46%)`;
      e.el.querySelectorAll("path, circle, ellipse, line, polyline, polygon, rect").forEach((n) => {
        if (n.classList.contains("sym-aura") || n.classList.contains("sym-shape-hit")) return;
        const f = (n.getAttribute("fill") || "").trim().toLowerCase();
        const s = (n.getAttribute("stroke") || "").trim().toLowerCase();
        if (s && s !== "none") {
          n.style.stroke = stroke;
          n.setAttribute("data-br-stroke", "1");
        } else if (!f || f === "none" || f === "#000" || f === "#000000" || f === "black") {
          // many BR shapes are fill-based black ink
          if (f && f !== "none") {
            n.style.fill = stroke;
            n.setAttribute("data-br-stroke", "1");
          }
        }
      });
    }
  };

  const syncAuraDom = (e) => {
    ensureAura(e);
    if (!e.auraEl) return;
    const on = e.anim === "shield";
    e.auraEl.style.display = on ? "" : "none";
    if (on) {
      const h = e.colour === "off" ? 200 : e.colour === "vibe" ? vibeHue : e.hue;
      e.auraEl.setAttribute("stroke", `hsla(${h}, 90%, 60%, 0.85)`);
      e.auraEl.style.filter = `drop-shadow(0 0 8px hsl(${h}, 90%, 55%))`;
    }
  };

  const renderEntity = (e, t) => {
    const spinDir = e.anim === "cw" ? 1 : e.anim === "ccw" ? -1 : 0;
    if (spinDir) {
      const degPerSec = 20 + e.spinSpeed * 3.4;
      e.rot = (e.rot + spinDir * degPerSec * t) % 360;
    }

    let scaleMul = e.size;
    let opacity = 1;
    if (e.anim === "pulse") {
      scaleMul *= 1 + Math.sin(performance.now() * 0.006 + e.phase) * 0.08;
    } else if (e.anim === "breathe") {
      scaleMul *= 1 + Math.sin(performance.now() * 0.0025 + e.phase) * 0.05;
    } else if (e.anim === "shimmer") {
      opacity = 0.72 + Math.sin(performance.now() * 0.01 + e.phase) * 0.28;
    }

    // Depth-ish scale while orbiting
    if (orbitOn && e.id !== hubId && !e.dragging) {
      const ang = Math.atan2(e.homeCy + e.y - CY, e.homeCx + e.x - CX);
      const depth = 0.88 + 0.14 * Math.sin(ang + orbitAngle);
      scaleMul *= depth;
    }

    e.slot.style.transform = `translate(${e.x.toFixed(2)}px, ${e.y.toFixed(2)}px)`;
    e.el.style.transform = `rotate(${e.rot.toFixed(2)}deg) scale(${scaleMul.toFixed(4)})`;
    e.el.style.opacity = String(opacity);

    if (e.hit) {
      e.hit.style.transform = `translate(${e.x.toFixed(2)}px, ${e.y.toFixed(2)}px)`;
    }

    if (e.colour === "vibe") {
      e.hue = (e.hue + t * (18 + e.colourSpeed * 3.2)) % 360;
      applyColourDom(e);
    }

    if (e.anim === "shield") syncAuraDom(e);

    e.el.classList.toggle("is-selected", selected.has(e.id));
  };

  const anyColour = () => {
    for (const e of entities.values()) {
      if (e.colour !== "off") return true;
    }
    return false;
  };

  // —— Physics ——
  const stepPhysics = (dt) => {
    const t = Math.min(dt, 0.05);

    if (ringSpin !== "off") {
      const dir = ringSpin === "cw" ? 1 : -1;
      const orbit = $(".mark-host svg.sigil .orbit");
      const hitsOrbit = $(".hits .hits-orbit");
      // degrees — slow majestic ring
      const step = dir * (360 / 80) * t;
      // accumulate on dataset
      const cur = Number((orbit && orbit.dataset.ringRot) || 0) + step;
      if (orbit) {
        orbit.dataset.ringRot = String(cur);
        orbit.style.transform = `rotate(${cur.toFixed(3)}deg)`;
        orbit.style.transformOrigin = `${CX}px ${CY}px`;
        orbit.style.transformBox = "view-box";
      }
      if (hitsOrbit) {
        hitsOrbit.style.transform = `rotate(${cur.toFixed(3)}deg)`;
        hitsOrbit.style.transformOrigin = `${CX}px ${CY}px`;
        hitsOrbit.style.transformBox = "view-box";
      }
    }

    if (orbitOn) {
      orbitAngle += ((Math.PI * 2) / ORBIT_PERIOD) * t;
      const moons = [...entities.keys()].filter((id) => id !== hubId);
      const hub = entities.get(hubId);
      const hubX = hub ? hub.homeCx + hub.x : CX;
      const hubY = hub ? hub.homeCy + hub.y : CY;
      const n = Math.max(1, moons.length);
      const baseR = 250;
      moons.forEach((id, i) => {
        const e = entities.get(id);
        if (!e || e.dragging) return;
        const ang = orbitAngle + (i / n) * Math.PI * 2 + e.orbitSlot;
        const tx = hubX + Math.cos(ang) * baseR - e.homeCx;
        const ty = hubY + Math.sin(ang) * baseR - e.homeCy;
        e.x = lerp(e.x, tx, 0.08);
        e.y = lerp(e.y, ty, 0.08);
        e.vx = 0;
        e.vy = 0;
      });
      // hub eases toward slight float at center offset 0 if it's home seat
      if (hub && !hub.dragging) {
        hub.x = lerp(hub.x, 0, 0.06);
        hub.y = lerp(hub.y, 0, 0.06);
      }
    }

    entities.forEach((e) => {
      if (e.dragging) return;
      if (resetting) {
        e.x = lerp(e.x, 0, EASE);
        e.y = lerp(e.y, 0, EASE);
        e.vx = 0;
        e.vy = 0;
        if (Math.hypot(e.x, e.y) < 0.4) {
          e.x = 0;
          e.y = 0;
        }
        return;
      }
      if (orbitOn) return; // orbit handles moons
      // inertia / fling
      if (Math.abs(e.vx) > MIN_V || Math.abs(e.vy) > MIN_V) {
        e.x += e.vx;
        e.y += e.vy;
        e.vx *= FRICTION;
        e.vy *= FRICTION;
        if (Math.hypot(e.vx, e.vy) < MIN_V) {
          e.vx = 0;
          e.vy = 0;
        }
      }
      // soft playfield bounds — nudge back if flung too far
      const ax = e.homeCx + e.x;
      const ay = e.homeCy + e.y;
      const pad = 40;
      if (ax < pad) e.vx += (pad - ax) * 0.02;
      if (ay < pad) e.vy += (pad - ay) * 0.02;
      if (ax > 923.86 - pad) e.vx -= (ax - (923.86 - pad)) * 0.02;
      if (ay > 886.31 - pad) e.vy -= (ay - (886.31 - pad)) * 0.02;
    });

    if (resetting) {
      let done = true;
      entities.forEach((e) => {
        if (Math.hypot(e.x, e.y) > 0.5) done = false;
      });
      if (done) resetting = false;
    }

    // soft repel while sandbox
    if (sandboxOn && repelOn && !orbitOn && !resetting) {
      const list = [...entities.values()];
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const a = list[i];
          const b = list[j];
          if (a.dragging || b.dragging) continue;
          const ax = a.homeCx + a.x;
          const ay = a.homeCy + a.y;
          const bx = b.homeCx + b.x;
          const by = b.homeCy + b.y;
          const dx = bx - ax;
          const dy = by - ay;
          const dist = Math.hypot(dx, dy) || 0.01;
          const minD = (a.radius + b.radius) * 1.15;
          if (dist < minD) {
            const push = ((minD - dist) / dist) * 0.35;
            if (!a.dragging) {
              a.x -= dx * push * 0.5;
              a.y -= dy * push * 0.5;
            }
            if (!b.dragging) {
              b.x += dx * push * 0.5;
              b.y += dy * push * 0.5;
            }
          }
        }
      }
    }
  };

  const tick = (now) => {
    if (!ready) {
      requestAnimationFrame(tick);
      return;
    }
    const dt = lastT ? (now - lastT) / 1000 : 0.016;
    lastT = now;
    vibeHue = (vibeHue + dt * 40) % 360;

    stepPhysics(dt);
    document.documentElement.setAttribute("data-line-any", anyColour() ? "on" : "off");

    entities.forEach((e) => renderEntity(e, dt));
    requestAnimationFrame(tick);
  };

  // —— Panel UI ——
  const panel = $("[data-motion-panel]");
  const symList = $("[data-motion-symbols]");
  const animList = $("[data-motion-anims]");
  const sizeInput = $("[data-motion-size]");
  const sizeVal = $("[data-motion-size-val]");
  const speedInput = $("[data-motion-speed]");
  const speedVal = $("[data-motion-speed-val]");
  const colourSpeedInput = $("[data-motion-colour-speed]");
  const colourSpeedVal = $("[data-motion-colour-speed-val]");
  const colourBar = $("[data-colour-bar]");
  const colourSwatch = $("[data-colour-swatch]");
  const colourBarWrap = $("[data-colour-bar-wrap]");

  const consensus = () => {
    const ids = targetsFor();
    if (!ids.length) return defaultCfg();
    const first = entities.get(ids[0]);
    if (!first) return defaultCfg();
    const cfg = {
      anim: first.anim,
      spinSpeed: first.spinSpeed,
      colour: first.colour,
      hue: first.hue,
      colourSpeed: first.colourSpeed,
      size: Math.round(first.size * 100),
    };
    ids.forEach((id) => {
      const e = entities.get(id);
      if (!e) return;
      if (e.anim !== cfg.anim) cfg.anim = "off";
      if (e.colour !== cfg.colour) cfg.colour = "off";
    });
    return cfg;
  };

  const paintPanel = () => {
    if (!symList) return;
    symList.innerHTML = SYMBOLS.map((s) => {
      const on = selected.has(s.id);
      const missing = !entities.has(s.id);
      return `<button type="button" role="option" class="motion-opt${on ? " is-on" : ""}${missing ? " is-missing" : ""}" data-sym-pick="${s.id}" aria-selected="${on ? "true" : "false"}"${missing ? " disabled" : ""}>${s.label}</button>`;
    }).join("");

    if (animList) {
      const cfg = consensus();
      animList.innerHTML = ANIMS.map((a) => {
        const on = cfg.anim === a.id;
        return `<button type="button" role="option" class="motion-opt${on ? " is-on" : ""}" data-anim-pick="${a.id}" aria-selected="${on ? "true" : "false"}">${a.label}</button>`;
      }).join("");
    }

    const cfg = consensus();
    $$("[data-colour-pick]").forEach((btn) => {
      const mode = btn.getAttribute("data-colour-pick");
      const map = { off: "off", vibe: "vibe", bar: "hue" };
      const on = cfg.colour === map[mode];
      btn.setAttribute("aria-selected", on ? "true" : "false");
      btn.classList.toggle("is-on", on);
    });
    if (colourBarWrap) colourBarWrap.hidden = cfg.colour !== "hue";
    if (colourBar) colourBar.value = String(Math.round(cfg.hue * 10));
    if (colourSwatch) colourSwatch.style.background = `hsl(${cfg.hue}, 78%, 48%)`;
    if (sizeInput) sizeInput.value = String(cfg.size);
    if (sizeVal) sizeVal.textContent = cfg.size + "%";
    if (speedInput) speedInput.value = String(cfg.spinSpeed);
    if (speedVal) speedVal.textContent = cfg.spinSpeed + "%";
    if (colourSpeedInput) colourSpeedInput.value = String(cfg.colourSpeed);
    if (colourSpeedVal) colourSpeedVal.textContent = cfg.colourSpeed + "%";
  };

  const setPanelOpen = (open) => {
    if (!panel) return;
    panel.hidden = !open;
    const btn = $('[data-panel-open="symbol"]');
    if (btn) {
      btn.setAttribute("aria-pressed", open ? "true" : "false");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    }
  };

  const selectSymbol = (id, { additive } = {}) => {
    if (!entities.has(id)) return;
    if (additive) {
      if (selected.has(id)) selected.delete(id);
      else selected.add(id);
    } else {
      selected = new Set([id]);
    }
    saveSelected();
    entities.forEach((ent) => applyColourDom(ent));
    paintPanel();
  };

  // —— Controls wiring ——
  document.addEventListener("click", (e) => {
    const openBtn = e.target.closest('[data-panel-open="symbol"]');
    if (openBtn) {
      e.stopPropagation();
      setPanelOpen(panel ? panel.hidden : true);
      return;
    }
    if (panel && !panel.hidden && !e.target.closest("[data-motion-panel]") && !e.target.closest('[data-panel-open="symbol"]')) {
      // keep panel open while working — only close via button toggle
    }

    const pick = e.target.closest("[data-sym-pick]");
    if (pick) {
      e.stopPropagation();
      selectSymbol(pick.getAttribute("data-sym-pick"), { additive: e.metaKey || e.ctrlKey || e.shiftKey });
      return;
    }

    const animPick = e.target.closest("[data-anim-pick]");
    if (animPick) {
      e.stopPropagation();
      const anim = animPick.getAttribute("data-anim-pick");
      forSelected((ent) => {
        ent.anim = anim;
        syncAuraDom(ent);
      });
      saveStore();
      paintPanel();
      return;
    }

    const colourPick = e.target.closest("[data-colour-pick]");
    if (colourPick) {
      e.stopPropagation();
      const raw = colourPick.getAttribute("data-colour-pick");
      const mode = raw === "vibe" ? "vibe" : raw === "bar" ? "hue" : "off";
      forSelected((ent) => {
        ent.colour = mode;
        applyColourDom(ent);
      });
      saveStore();
      paintPanel();
      return;
    }

    if (e.target.closest("[data-sym-select-all]")) {
      selected = new Set(entities.keys());
      saveSelected();
      paintPanel();
      return;
    }
    if (e.target.closest("[data-sym-select-none]")) {
      selected = new Set();
      saveSelected();
      paintPanel();
      return;
    }

    // Motion ring
    const spinBtn = e.target.closest("[data-motion-spin]");
    if (spinBtn) {
      e.stopPropagation();
      const dir = spinBtn.getAttribute("data-motion-spin");
      ringSpin = ringSpin === dir ? "off" : dir;
      document.documentElement.setAttribute("data-ring", ringSpin === "off" ? "off" : "on");
      document.documentElement.setAttribute("data-ring-spin", ringSpin);
      $$("[data-motion-spin]").forEach((b) =>
        b.setAttribute("aria-pressed", b.getAttribute("data-motion-spin") === ringSpin ? "true" : "false")
      );
      const mt = $("[data-motion-toggle]");
      if (mt) mt.setAttribute("aria-pressed", ringSpin !== "off" ? "true" : "false");
      return;
    }

    const motionToggle = e.target.closest("[data-motion-toggle]");
    if (motionToggle) {
      e.stopPropagation();
      const menu = $("[data-motion-menu]");
      if (menu) {
        menu.hidden = !menu.hidden;
        motionToggle.setAttribute("aria-expanded", menu.hidden ? "false" : "true");
      }
      return;
    }

    // Sandbox
    const pinBtn = e.target.closest("[data-motion-pin]");
    if (pinBtn) {
      e.stopPropagation();
      sandboxOn = !sandboxOn;
      document.documentElement.setAttribute("data-pin", sandboxOn ? "on" : "off");
      pinBtn.setAttribute("aria-pressed", sandboxOn ? "true" : "false");
      const menu = $("[data-pin-menu]");
      if (menu) {
        menu.hidden = !sandboxOn;
        pinBtn.setAttribute("aria-expanded", sandboxOn ? "true" : "false");
      }
      if (!sandboxOn) {
        orbitOn = false;
        document.documentElement.setAttribute("data-cloud-orbit", "off");
        const ob = $("[data-pin-cloud-orbit]");
        if (ob) ob.setAttribute("aria-pressed", "false");
      }
      return;
    }

    if (e.target.closest("[data-pin-cloud-orbit]")) {
      e.stopPropagation();
      if (!sandboxOn) {
        sandboxOn = true;
        document.documentElement.setAttribute("data-pin", "on");
        const pb = $("[data-motion-pin]");
        if (pb) pb.setAttribute("aria-pressed", "true");
      }
      orbitOn = !orbitOn;
      document.documentElement.setAttribute("data-cloud-orbit", orbitOn ? "on" : "off");
      const ob = $("[data-pin-cloud-orbit]");
      if (ob) ob.setAttribute("aria-pressed", orbitOn ? "true" : "false");
      // kill ring spin while orbiting — clearer physics
      if (orbitOn) {
        ringSpin = "off";
        document.documentElement.setAttribute("data-ring", "off");
      }
      return;
    }

    if (e.target.closest("[data-pin-orbit-random]")) {
      e.stopPropagation();
      if (!sandboxOn) {
        sandboxOn = true;
        document.documentElement.setAttribute("data-pin", "on");
      }
      orbitOn = true;
      document.documentElement.setAttribute("data-cloud-orbit", "on");
      const keys = [...entities.keys()];
      hubId = keys[Math.floor(Math.random() * keys.length)] || "center";
      orbitAngle = Math.random() * Math.PI * 2;
      entities.forEach((ent) => {
        ent.orbitSlot = (Math.random() - 0.5) * 0.2;
      });
      const ob = $("[data-pin-cloud-orbit]");
      if (ob) ob.setAttribute("aria-pressed", "true");
      return;
    }

    if (e.target.closest("[data-pin-layout-reset]") || e.target.closest("[data-motion-reset]")) {
      e.stopPropagation();
      softReset(e.target.closest("[data-motion-reset]") ? "all" : "layout");
      return;
    }

    if (e.target.closest("[data-pin-repel]")) {
      e.stopPropagation();
      repelOn = !repelOn;
      const rb = $("[data-pin-repel]");
      if (rb) rb.setAttribute("aria-pressed", repelOn ? "true" : "false");
      return;
    }

    // close menus on outside click
    if (!e.target.closest("[data-motion-wrap]")) {
      const mm = $("[data-motion-menu]");
      if (mm) mm.hidden = true;
    }
    if (!e.target.closest("[data-pin-wrap]")) {
      const pm = $("[data-pin-menu]");
      if (pm && !sandboxOn) pm.hidden = true;
    }
  });

  const softReset = (mode) => {
    orbitOn = false;
    document.documentElement.setAttribute("data-cloud-orbit", "off");
    const ob = $("[data-pin-cloud-orbit]");
    if (ob) ob.setAttribute("aria-pressed", "false");
    hubId = "center";
    resetting = true;
    entities.forEach((e) => {
      e.vx = 0;
      e.vy = 0;
      if (mode === "all") {
        e.anim = "off";
        e.colour = "off";
        e.size = 1;
        e.spinSpeed = 35;
        e.colourSpeed = 60;
        e.rot = 0;
        applyColourDom(e);
        syncAuraDom(e);
      }
    });
    if (mode === "all") {
      saveStore();
      paintPanel();
    }
  };

  if (sizeInput) {
    sizeInput.addEventListener("input", () => {
      const v = clamp(Number(sizeInput.value) || 100, 25, 320);
      if (sizeVal) sizeVal.textContent = v + "%";
      forSelected((e) => {
        e.size = v / 100;
      });
      saveStore();
    });
  }
  if (speedInput) {
    speedInput.addEventListener("input", () => {
      const v = clamp(Number(speedInput.value) || 1, 1, 100);
      if (speedVal) speedVal.textContent = v + "%";
      forSelected((e) => {
        e.spinSpeed = v;
      });
      saveStore();
    });
  }
  if (colourSpeedInput) {
    colourSpeedInput.addEventListener("input", () => {
      const v = clamp(Number(colourSpeedInput.value) || 1, 1, 100);
      if (colourSpeedVal) colourSpeedVal.textContent = v + "%";
      forSelected((e) => {
        e.colourSpeed = v;
      });
      saveStore();
    });
  }
  if (colourBar) {
    colourBar.addEventListener("input", () => {
      const hue = clamp(Number(colourBar.value) / 10, 0, 360);
      if (colourSwatch) colourSwatch.style.background = `hsl(${hue}, 78%, 48%)`;
      forSelected((e) => {
        e.colour = "hue";
        e.hue = hue;
        applyColourDom(e);
      });
      saveStore();
      paintPanel();
    });
  }

  // —— Pointer: select + sandbox drag/fling ——
  const svgPoint = (clientX, clientY) => {
    const svg = $(".mark-host svg.sigil");
    if (!svg) return { x: clientX, y: clientY };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: clientX, y: clientY };
    const p = pt.matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  };

  document.addEventListener(
    "pointerdown",
    (ev) => {
      const wrap = ev.target.closest(".mark-host svg.sigil .sym, .mark-host svg.sigil .center");
      if (!wrap) return;
      const id = wrap.getAttribute("data-sym");
      if (!id || !entities.has(id)) return;

      // Always select on click
      selectSymbol(id, { additive: ev.metaKey || ev.ctrlKey || ev.shiftKey });

      if (!sandboxOn) return;
      ev.preventDefault();
      const e = entities.get(id);
      const p = svgPoint(ev.clientX, ev.clientY);
      e.dragging = true;
      e.vx = 0;
      e.vy = 0;
      drag = {
        id,
        pid: ev.pointerId,
        lx: p.x,
        ly: p.y,
        samples: [],
      };
      try {
        wrap.setPointerCapture(ev.pointerId);
      } catch {}
    },
    true
  );

  document.addEventListener(
    "pointermove",
    (ev) => {
      if (!drag || ev.pointerId !== drag.pid) return;
      const e = entities.get(drag.id);
      if (!e) return;
      const p = svgPoint(ev.clientX, ev.clientY);
      const dx = p.x - drag.lx;
      const dy = p.y - drag.ly;
      e.x += dx;
      e.y += dy;
      drag.lx = p.x;
      drag.ly = p.y;
      const now = performance.now();
      drag.samples.push({ t: now, dx, dy });
      if (drag.samples.length > 6) drag.samples.shift();
    },
    true
  );

  const endDrag = (ev) => {
    if (!drag || (ev && ev.pointerId !== drag.pid)) return;
    const e = entities.get(drag.id);
    if (e) {
      e.dragging = false;
      // fling from recent samples (Pair-simple inertia)
      const samples = drag.samples;
      if (samples.length >= 1) {
        const last = samples.slice(-4);
        let sx = 0;
        let sy = 0;
        last.forEach((s) => {
          sx += s.dx;
          sy += s.dy;
        });
        e.vx = (sx / last.length) * 1.85;
        e.vy = (sy / last.length) * 1.85;
        const sp = Math.hypot(e.vx, e.vy);
        if (sp > 56) {
          e.vx = (e.vx / sp) * 56;
          e.vy = (e.vy / sp) * 56;
        }
      }
    }
    drag = null;
  };

  document.addEventListener("pointerup", endDrag, true);
  document.addEventListener("pointercancel", endDrag, true);

  // Double-click hub for orbit
  document.addEventListener("dblclick", (ev) => {
    const wrap = ev.target.closest(".mark-host svg.sigil .sym, .mark-host svg.sigil .center");
    if (!wrap || !sandboxOn) return;
    const id = wrap.getAttribute("data-sym");
    if (!id) return;
    hubId = id;
    orbitOn = true;
    document.documentElement.setAttribute("data-cloud-orbit", "on");
    const ob = $("[data-pin-cloud-orbit]");
    if (ob) ob.setAttribute("aria-pressed", "true");
  });

  // Custom save slots (simple)
  let customSlot = "A";
  const customKey = (slot) => `br-game-custom-${slot}-v2`;

  document.addEventListener("click", (e) => {
    const slotBtn = e.target.closest("[data-custom-slot]");
    if (slotBtn) {
      customSlot = slotBtn.getAttribute("data-custom-slot") || "A";
      $$("[data-custom-slot]").forEach((b) =>
        b.setAttribute("aria-selected", b.getAttribute("data-custom-slot") === customSlot ? "true" : "false")
      );
      return;
    }
    if (e.target.closest("[data-custom-save]")) {
      const out = {};
      entities.forEach((ent, id) => {
        out[id] = {
          anim: ent.anim,
          spinSpeed: ent.spinSpeed,
          colour: ent.colour,
          hue: ent.hue,
          colourSpeed: ent.colourSpeed,
          size: Math.round(ent.size * 100),
        };
      });
      try {
        localStorage.setItem(customKey(customSlot), JSON.stringify(out));
      } catch {}
      return;
    }
    if (e.target.closest("[data-custom-load]")) {
      try {
        const raw = JSON.parse(localStorage.getItem(customKey(customSlot)) || "null");
        if (!raw) return;
        entities.forEach((ent, id) => {
          const c = raw[id];
          if (!c) return;
          ent.anim = c.anim || "off";
          ent.spinSpeed = clamp(c.spinSpeed || 35, 1, 100);
          ent.colour = c.colour === "vibe" || c.colour === "hue" ? c.colour : "off";
          ent.hue = Number(c.hue) || 210;
          ent.colourSpeed = clamp(c.colourSpeed || 60, 1, 100);
          ent.size = clamp((c.size || 100) / 100, 0.25, 3.2);
          applyColourDom(ent);
          syncAuraDom(ent);
        });
        saveStore();
        paintPanel();
      } catch {}
      return;
    }
    if (e.target.closest("[data-custom-clear]")) {
      try {
        localStorage.removeItem(customKey(customSlot));
      } catch {}
    }
  });

  const boot = () => {
    buildEntities();
    ready = entities.size > 0;
    document.documentElement.setAttribute("data-pin", "off");
    document.documentElement.setAttribute("data-ring", "off");
    document.documentElement.setAttribute("data-cloud-orbit", "off");
    paintPanel();
    console.info("[br-game] entities", [...entities.keys()].join(","));
  };

  document.addEventListener("br:syms-ready", boot);
  if ($(".mark-host svg.sigil .sym, .mark-host svg.sigil .center")) boot();

  requestAnimationFrame(tick);
})();
