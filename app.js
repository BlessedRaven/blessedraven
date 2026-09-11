(() => {
  "use strict";

  const CX = 447.56;
  const CY = 484.96;
  const HOTSPOTS = [
    { id: "n", x: 453.56, y: 145 },
    { id: "nw", x: 148, y: 167 },
    { id: "w", x: 91.8, y: 353 },
    { id: "sw", x: 90, y: 555 },
    { id: "s", x: 462, y: 820 },
    { id: "se", x: 672.71, y: 750.29 },
    { id: "e", x: 821.16, y: 582.19 },
    { id: "ne", x: 820.1, y: 342.59 },
  ];

  const host = document.querySelector("[data-mark-host]");
  const mark = document.querySelector("[data-mark]");
  if (!host || !mark) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const pinOrigin = (el) => {
    try {
      const bb = el.getBBox();
      if (!bb.width && !bb.height) return;
      el.style.transformBox = "fill-box";
      el.style.transformOrigin = "center";
    } catch {}
  };

  const makeSlot = (id) => {
    const slot = document.createElementNS("http://www.w3.org/2000/svg", "g");
    slot.setAttribute("class", "sym-slot");
    slot.setAttribute("data-sym-slot", id);
    return slot;
  };

  const centroidOf = (el) => {
    try {
      const bb = el.getBBox();
      if (!bb.width && !bb.height) return null;
      return { cx: bb.x + bb.width / 2, cy: bb.y + bb.height / 2, bb };
    } catch {
      return null;
    }
  };

  const flattenOrbitLeaves = (orbit) => {
    const leaves = [];
    Array.from(orbit.children).forEach((el) => {
      const tag = el.tagName.toLowerCase();
      if (tag !== "g") {
        leaves.push(el);
        return;
      }
      const kids = Array.from(el.children);
      if (kids.length <= 1) {
        leaves.push(el);
        return;
      }
      const centers = kids
        .map((k) => {
          const c = centroidOf(k);
          return c ? { k, ...c } : null;
        })
        .filter(Boolean);
      if (centers.length <= 1) {
        leaves.push(el);
        return;
      }
      let maxD = 0;
      for (let i = 0; i < centers.length; i++) {
        for (let j = i + 1; j < centers.length; j++) {
          maxD = Math.max(
            maxD,
            Math.hypot(centers[i].cx - centers[j].cx, centers[i].cy - centers[j].cy)
          );
        }
      }
      if (maxD > 140) kids.forEach((k) => leaves.push(k));
      else leaves.push(el);
    });
    leaves.forEach((el) => orbit.appendChild(el));
    Array.from(orbit.querySelectorAll(":scope > g")).forEach((g) => {
      if (!g.childNodes.length) g.remove();
    });
  };

  const wrapOrbitSyms = (orbit, centerWrap) => {
    centerWrap.setAttribute("data-sym", "center");
    pinOrigin(centerWrap);
    flattenOrbitLeaves(orbit);

    const items = [];
    Array.from(orbit.children).forEach((el) => {
      const c = centroidOf(el);
      if (!c) return;
      items.push({ el, cx: c.cx, cy: c.cy });
    });

    const pairs = [];
    items.forEach((it, i) => {
      HOTSPOTS.forEach((h) => {
        pairs.push({ i, id: h.id, d: Math.hypot(it.cx - h.x, it.cy - h.y) });
      });
    });
    pairs.sort((a, b) => a.d - b.d);

    const usedItems = new Set();
    const usedIds = new Set();
    const itemId = new Map();
    for (const p of pairs) {
      if (usedItems.has(p.i) || usedIds.has(p.id)) continue;
      if (p.d > 200) continue;
      usedItems.add(p.i);
      usedIds.add(p.id);
      itemId.set(p.i, p.id);
    }

    items.forEach((it, i) => {
      const id = itemId.get(i) || `_x${i}`;
      const slot = makeSlot(id);
      const wrap = document.createElementNS("http://www.w3.org/2000/svg", "g");
      wrap.setAttribute("class", "sym");
      wrap.setAttribute("data-sym", id);
      if (id.startsWith("_x")) wrap.setAttribute("data-deco", "1");
      orbit.insertBefore(slot, it.el);
      slot.appendChild(wrap);
      wrap.appendChild(it.el);
      pinOrigin(wrap);
    });
  };

  const installShapeHits = (wrap) => {
    if (!wrap || wrap.querySelector(".sym-shape-hit")) return;
    const nodes = wrap.querySelectorAll("path, circle, ellipse, line, polyline, polygon, rect");
    nodes.forEach((node) => {
      if (node.classList.contains("sym-shape-hit") || node.classList.contains("sym-aura")) return;
      try {
        const clone = node.cloneNode(true);
        clone.setAttribute("class", "sym-shape-hit");
        clone.removeAttribute("style");
        const f = (node.getAttribute("fill") || "").trim().toLowerCase();
        let hasFill = f && f !== "none" && f !== "transparent";
        if (!hasFill) {
          try {
            const cs = window.getComputedStyle(node);
            hasFill = cs.fill && cs.fill !== "none" && cs.fill !== "rgba(0, 0, 0, 0)";
          } catch {}
        }
        if (hasFill) clone.setAttribute("data-hit-fill", "1");
        wrap.appendChild(clone);
      } catch {}
    });
  };

  const mount = async () => {
    let raw;
    try {
      const res = await fetch("assets/jakel3726.svg", { cache: "no-cache" });
      if (!res.ok) throw new Error("svg missing");
      raw = await res.text();
    } catch (err) {
      console.warn("[br-landing]", err);
      host.innerHTML =
        '<img class="sigil-fallback" src="assets/jakel3726.svg" alt="Blessed Raven sigil" width="924" height="886" draggable="false" />';
      mark.classList.add("is-ready");
      return;
    }

    const doc = new DOMParser().parseFromString(raw, "image/svg+xml");
    const src = doc.querySelector("svg");
    if (!src || src.querySelector("parsererror")) {
      host.innerHTML =
        '<img class="sigil-fallback" src="assets/jakel3726.svg" alt="Blessed Raven sigil" width="924" height="886" draggable="false" />';
      mark.classList.add("is-ready");
      return;
    }

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "sigil");
    svg.setAttribute("viewBox", src.getAttribute("viewBox") || "0 0 923.86 886.31");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "Blessed Raven sigil");
    svg.setAttribute("focusable", "false");

    const defs = src.querySelector("defs");
    if (defs) svg.appendChild(document.importNode(defs, true));

    const centerSlot = makeSlot("center");
    const center = document.createElementNS("http://www.w3.org/2000/svg", "g");
    center.setAttribute("class", "center");
    center.setAttribute("data-sym", "center");
    centerSlot.appendChild(center);

    const orbit = document.createElementNS("http://www.w3.org/2000/svg", "g");
    orbit.setAttribute("class", "orbit");
    orbit.setAttribute("style", `transform-origin: ${CX}px ${CY}px; transform-box: view-box;`);

    const kids = Array.from(src.children).filter((el) => el.tagName.toLowerCase() !== "defs");
    let sawCenter = false;
    kids.forEach((el) => {
      const node = document.importNode(el, true);
      if (!sawCenter && el.tagName.toLowerCase() === "g") {
        center.appendChild(node);
        sawCenter = true;
      } else {
        orbit.appendChild(node);
      }
    });

    const free = document.createElementNS("http://www.w3.org/2000/svg", "g");
    free.setAttribute("class", "free-layer");

    svg.appendChild(orbit);
    svg.appendChild(free);
    svg.appendChild(centerSlot);
    host.innerHTML = "";
    host.appendChild(svg);

    wrapOrbitSyms(orbit, center);
    document.querySelectorAll(".sym, .center").forEach(installShapeHits);
    mark.classList.add("is-ready");
    if (reduced) mark.classList.add("reduced");
    document.dispatchEvent(new CustomEvent("br:syms-ready"));
  };

  // Zoom (empty-space drag when Zoom mode on)
  const ZOOM_KEY = "br-mark-zoom-v1";
  const ZOOM_INV_KEY = "br-mark-zoom-invert-v1";
  const ZOOM_MIN = 0.28;
  const ZOOM_MAX = 2.4;
  const readZoom = () => {
    try {
      const n = Number(localStorage.getItem(ZOOM_KEY));
      if (Number.isFinite(n) && n >= ZOOM_MIN && n <= ZOOM_MAX) return n;
    } catch {}
    return 1;
  };
  let markZoom = readZoom();
  let zoomMode = false;
  let zoomInvert = false;
  try {
    zoomInvert = localStorage.getItem(ZOOM_INV_KEY) === "1";
  } catch {}
  let zoomDrag = null;

  const zoomBtn = document.querySelector("[data-zoom-toggle]");
  const zoomMenu = document.querySelector("[data-zoom-menu]");
  const zoomInvertBtn = document.querySelector("[data-zoom-invert]");
  const zoomResetBtn = document.querySelector("[data-zoom-reset]");
  const sandboxBtn = document.querySelector("[data-sandbox-toggle]");

  const applyZoom = () => {
    mark.style.setProperty("--mark-zoom", String(markZoom));
    try {
      localStorage.setItem(ZOOM_KEY, String(markZoom));
    } catch {}
  };

  const setZoomMode = (on) => {
    zoomMode = !!on;
    document.documentElement.setAttribute("data-zoom-mode", zoomMode ? "on" : "off");
    if (zoomBtn) {
      zoomBtn.setAttribute("aria-pressed", zoomMode ? "true" : "false");
      zoomBtn.setAttribute("aria-expanded", zoomMode && zoomMenu && !zoomMenu.hidden ? "true" : "false");
    }
  };

  const zoomMenuOpen = (open) => {
    if (!zoomMenu || !zoomBtn) return;
    zoomMenu.hidden = !open;
    zoomBtn.setAttribute("aria-expanded", open ? "true" : "false");
  };

  applyZoom();
  setZoomMode(false);
  if (zoomInvertBtn) zoomInvertBtn.setAttribute("aria-pressed", zoomInvert ? "true" : "false");

  if (zoomBtn) {
    zoomBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const next = !zoomMode;
      setZoomMode(next);
      zoomMenuOpen(next);
    });
  }
  if (zoomInvertBtn) {
    zoomInvertBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      zoomInvert = !zoomInvert;
      try {
        localStorage.setItem(ZOOM_INV_KEY, zoomInvert ? "1" : "0");
      } catch {}
      zoomInvertBtn.setAttribute("aria-pressed", zoomInvert ? "true" : "false");
    });
  }
  if (zoomResetBtn) {
    zoomResetBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      markZoom = 1;
      applyZoom();
    });
  }
  document.addEventListener("click", (e) => {
    if (!zoomMenu || zoomMenu.hidden) return;
    if (e.target.closest("[data-zoom-wrap]")) return;
    zoomMenuOpen(false);
  });

  mark.addEventListener("pointerdown", (e) => {
    if (!zoomMode) return;
    if (e.target.closest("a.hotspot, .sym, .center, [data-motion-panel], header")) return;
    e.preventDefault();
    zoomDrag = { y0: e.clientY, z0: markZoom, pid: e.pointerId };
    try {
      mark.setPointerCapture(e.pointerId);
    } catch {}
  });
  mark.addEventListener("pointermove", (e) => {
    if (!zoomDrag) return;
    const dy = e.clientY - zoomDrag.y0;
    const sens = zoomInvert ? 0.0045 : -0.0045;
    markZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoomDrag.z0 * Math.exp(dy * sens)));
    applyZoom();
  });
  const endZoomDrag = () => {
    zoomDrag = null;
  };
  mark.addEventListener("pointerup", endZoomDrag);
  mark.addEventListener("pointercancel", endZoomDrag);

  let sandboxFrame = false;
  const setSandboxFrame = (on) => {
    sandboxFrame = !!on;
    document.documentElement.setAttribute("data-sandbox-frame", sandboxFrame ? "on" : "off");
    if (sandboxBtn) sandboxBtn.setAttribute("aria-pressed", sandboxFrame ? "true" : "false");
  };
  if (sandboxBtn) {
    sandboxBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      setSandboxFrame(!sandboxFrame);
    });
  }
  setSandboxFrame(false);

  const linkBtn = document.querySelector("[data-link-toggle]");
  const dragBtn = document.querySelector("[data-drag-toggle]");
  let clickMode = "link";
  const syncClickModeUi = () => {
    if (linkBtn) linkBtn.setAttribute("aria-pressed", clickMode === "link" ? "true" : "false");
    if (dragBtn) dragBtn.setAttribute("aria-pressed", clickMode === "drag" ? "true" : "false");
    document.documentElement.setAttribute("data-click-mode", clickMode);
  };
  if (linkBtn) linkBtn.addEventListener("click", () => {
    clickMode = "link";
    syncClickModeUi();
  });
  if (dragBtn) dragBtn.addEventListener("click", () => {
    clickMode = "drag";
    syncClickModeUi();
  });
  syncClickModeUi();

  fetch("symbols.json?v=2")
    .then((r) => (r.ok ? r.json() : null))
    .then((reg) => {
      if (reg && Array.isArray(reg.symbols)) window.__BR_SYMBOLS__ = reg;
    })
    .catch(() => {});

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount, { once: true });
  } else {
    mount();
  }
})();
