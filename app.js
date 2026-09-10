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

  const host = document.querySelector("[data-mark-host]");
  const mark = document.querySelector("[data-mark]");
  if (!host || !mark) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const nearestSym = (cx, cy) => {
    let best = HOTSPOTS[0];
    let bestD = Infinity;
    for (const h of HOTSPOTS) {
      const d = Math.hypot(cx - h.x, cy - h.y);
      if (d < bestD) {
        bestD = d;
        best = h;
      }
    }
    return best.id;
  };

  const wrapOrbitSyms = (svg, orbit, center) => {
    center.setAttribute("data-sym", "center");

    // One .sym group per hotspot id (merge near-duplicates). Hover scales only that group.
    const wraps = new Map();
    Array.from(orbit.children).forEach((el) => {
      let bb;
      try {
        bb = el.getBBox();
      } catch (err) {
        return;
      }
      if (!bb.width && !bb.height) return;
      const id = nearestSym(bb.x + bb.width / 2, bb.y + bb.height / 2);
      let wrap = wraps.get(id);
      if (!wrap) {
        wrap = document.createElementNS("http://www.w3.org/2000/svg", "g");
        wrap.setAttribute("class", "sym");
        wrap.setAttribute("data-sym", id);
        orbit.insertBefore(wrap, el);
        wraps.set(id, wrap);
      }
      wrap.appendChild(el);
    });
  };

  const wireHotspots = (svg) => {
    const orbitSyms = () => svg.querySelectorAll(".orbit > .sym");
    const centerSym = svg.querySelector('.center[data-sym="center"]');

    const clear = () => {
      mark.classList.remove("is-hovering");
      orbitSyms().forEach((s) => s.classList.remove("is-active", "is-dim"));
      if (centerSym) centerSym.classList.remove("is-active", "is-dim");
    };

    // Isolation: animate ONLY the single matched .sym (never .sigil / whole .orbit).
    const retrigger = (el) => {
      if (!el) return;
      el.classList.remove("is-active");
      void el.getBoundingClientRect();
      el.classList.add("is-active");
    };

    const activate = (id) => {
      clear();
      mark.classList.add("is-hovering");
      if (id === "center") {
        retrigger(centerSym);
        orbitSyms().forEach((s) => s.classList.add("is-dim"));
        return;
      }
      const match = svg.querySelector(`.orbit > .sym[data-sym="${id}"]`);
      orbitSyms().forEach((s) => {
        if (s === match) retrigger(s);
        else s.classList.add("is-dim");
      });
    };

    document.querySelectorAll(".hits .hotspot[data-sym]").forEach((hot) => {
      const id = hot.getAttribute("data-sym");
      hot.addEventListener("pointerenter", () => activate(id));
      hot.addEventListener("pointerleave", clear);
      hot.addEventListener("focusin", () => activate(id));
      hot.addEventListener("focusout", clear);
    });
  };

  const mount = async () => {
    let raw;
    try {
      const res = await fetch("assets/jakel3726.svg", { cache: "force-cache" });
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

    // getBBox requires the SVG to be in the document
    wrapOrbitSyms(svg, orbit, center);
    wireHotspots(svg);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount, { once: true });
  } else {
    mount();
  }
})();
