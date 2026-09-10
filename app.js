(() => {
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

  // One spin controller — only ONE element animates at a time.
  const SPIN = {
    n: { ms: 4250, dir: 1 },
    nw: { ms: 3750, dir: -1 },
    w: { ms: 5500, dir: 1 },
    sw: { ms: 4000, dir: -1 },
    s: { ms: 4750, dir: 1 },
    se: { ms: 6000, dir: -1 },
    e: { ms: 3500, dir: 1 },
    ne: { ms: 5250, dir: -1 }, // quatrefoil / Bloom ~5× slow
    center: { ms: 5750, dir: 1 },
  };

  const host = document.querySelector("[data-mark-host]");
  const mark = document.querySelector("[data-mark]");
  if (!host || !mark) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const pinOrigin = (el) => {
    try {
      const bb = el.getBBox();
      if (!bb.width && !bb.height) return;
      el.style.transformBox = "view-box";
      el.style.transformOrigin = `${bb.x + bb.width / 2}px ${bb.y + bb.height / 2}px`;
    } catch (err) {
      /* ignore */
    }
  };

  const centroidOf = (el) => {
    try {
      const bb = el.getBBox();
      if (!bb.width && !bb.height) return null;
      return { cx: bb.x + bb.width / 2, cy: bb.y + bb.height / 2, bb };
    } catch (err) {
      return null;
    }
  };

  // If a group has far-apart children, split so they never spin as one blob.
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
      if (maxD > 140) {
        kids.forEach((k) => leaves.push(k));
      } else {
        leaves.push(el);
      }
    });
    // Reparent leaves directly under orbit in order
    leaves.forEach((el) => orbit.appendChild(el));
    // Drop empty groups left behind
    Array.from(orbit.querySelectorAll(":scope > g")).forEach((g) => {
      if (!g.childNodes.length) g.remove();
    });
  };

  const wrapOrbitSyms = (svg, orbit, center) => {
    center.setAttribute("data-sym", "center");
    pinOrigin(center);

    flattenOrbitLeaves(orbit);

    const items = [];
    Array.from(orbit.children).forEach((el) => {
      const c = centroidOf(el);
      if (!c) return;
      items.push({ el, cx: c.cx, cy: c.cy });
    });

    // Strict 1:1 — each hotspot owns at most one leaf; no merging.
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
      const wrap = document.createElementNS("http://www.w3.org/2000/svg", "g");
      wrap.setAttribute("class", "sym");
      const id = itemId.get(i) || `_x${i}`;
      wrap.setAttribute("data-sym", id);
      // Orphans never receive pointer spins
      if (id.startsWith("_x")) wrap.setAttribute("data-deco", "1");
      orbit.insertBefore(wrap, it.el);
      wrap.appendChild(it.el);
      pinOrigin(wrap);
    });
  };

  const wireHotspots = (svg) => {
    const byId = (id) =>
      id === "center"
        ? svg.querySelector('.center[data-sym="center"]')
        : svg.querySelector(`.orbit > .sym[data-sym="${id}"]`);

    let activeId = null;
    let pressed = false;
    let spinAnim = null;
    let spinEl = null;

    const hardStop = (el) => {
      if (!el) return;
      el.getAnimations().forEach((a) => a.cancel());
      el.style.transition = "";
      el.style.transform = "";
      el.classList.remove("is-active");
    };

    const stopSpin = ({ ease } = { ease: false }) => {
      const el = spinEl;
      const anim = spinAnim;
      spinAnim = null;
      spinEl = null;
      if (!el) return;

      if (!ease || reduced) {
        hardStop(el);
        return;
      }

      let matrix = "none";
      try {
        matrix = getComputedStyle(el).transform;
      } catch (err) {
        /* ignore */
      }
      if (anim) anim.cancel();
      el.classList.remove("is-active");
      el.style.transition = "none";
      el.style.transform = matrix === "none" ? "rotate(0deg)" : matrix;
      void el.getBoundingClientRect();
      el.style.transition = "transform 0.55s ease-out";
      el.style.transform = "rotate(0deg)";
      const finish = (e) => {
        if (e && e.propertyName && e.propertyName !== "transform") return;
        if (spinEl === el) return; // restarted
        el.style.transition = "";
        el.style.transform = "";
        el.removeEventListener("transitionend", finish);
      };
      el.addEventListener("transitionend", finish);
    };

    const startSpin = (id) => {
      const el = byId(id);
      if (!el || el.getAttribute("data-deco") === "1") return;
      hardStop(el);
      el.classList.add("is-active");
      spinEl = el;
      if (reduced) return;
      const cfg = SPIN[id] || { ms: 4500, dir: 1 };
      const deg = 360 * cfg.dir;
      spinAnim = el.animate(
        [{ transform: "rotate(0deg)" }, { transform: `rotate(${deg}deg)` }],
        { duration: cfg.ms, iterations: Infinity, easing: "linear" }
      );
    };

    const clear = ({ ease } = { ease: true }) => {
      activeId = null;
      pressed = false;
      mark.classList.remove("is-hovering");
      stopSpin({ ease });
    };

    const activate = (id) => {
      if (!id) return;
      if (activeId === id) {
        mark.classList.add("is-hovering");
        return;
      }
      // Switching targets: hard-stop previous so two never animate together.
      stopSpin({ ease: false });
      activeId = id;
      mark.classList.add("is-hovering");
      startSpin(id);
    };

    // Single hit-test path: whichever hotspot is under the pointer wins (only one).
    const hits = document.querySelector(".hits");
    if (!hits) return;

    const idFromEvent = (e) => {
      const t = e.target && e.target.closest ? e.target.closest(".hotspot[data-sym]") : null;
      return t ? t.getAttribute("data-sym") : null;
    };

    hits.addEventListener("pointerover", (e) => {
      const id = idFromEvent(e);
      if (id) activate(id);
    });
    hits.addEventListener("pointerout", (e) => {
      const to = e.relatedTarget && e.relatedTarget.closest
        ? e.relatedTarget.closest(".hotspot[data-sym]")
        : null;
      if (to) {
        // Moving to another hotspot — activate that one (pointerover will also fire).
        return;
      }
      const from = idFromEvent(e);
      if (!from) return;
      if (!pressed) clear({ ease: true });
    });
    hits.addEventListener("pointerdown", (e) => {
      if (e.button != null && e.button !== 0) return;
      const id = idFromEvent(e);
      if (!id) return;
      pressed = true;
      activate(id);
    });
    hits.addEventListener("pointerup", (e) => {
      pressed = false;
      const id = idFromEvent(e);
      if (!id) clear({ ease: true });
    });
    hits.addEventListener("pointercancel", () => clear({ ease: false }));

    hits.querySelectorAll(".hotspot[data-sym]").forEach((hot) => {
      hot.addEventListener("focusin", () => activate(hot.getAttribute("data-sym")));
      hot.addEventListener("focusout", () => {
        if (!pressed) clear({ ease: true });
      });
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

    const center = document.createElementNS("http://www.w3.org/2000/svg", "g");
    center.setAttribute("class", "center");

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

    svg.appendChild(orbit);
    svg.appendChild(center);
    host.innerHTML = "";
    host.appendChild(svg);
    mark.classList.add("is-ready");

    wrapOrbitSyms(svg, orbit, center);
    wireHotspots(svg);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount, { once: true });
  } else {
    mount();
  }
})();
