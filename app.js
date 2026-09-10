(() => {
  const CX = 447.56;
  const CY = 484.96;
  const host = document.querySelector("[data-mark-host]");
  const mark = document.querySelector("[data-mark]");
  if (!host || !mark) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
    svg.style.background = "#fff";

    const defs = src.querySelector("defs");
    if (defs) svg.appendChild(document.importNode(defs, true));

    const center = document.createElementNS("http://www.w3.org/2000/svg", "g");
    center.setAttribute("class", "center");

    const orbit = document.createElementNS("http://www.w3.org/2000/svg", "g");
    orbit.setAttribute("class", "orbit");
    // Explicit SVG origin for browsers that ignore CSS transform-origin on <g>
    orbit.setAttribute("style", `transform-origin: ${CX}px ${CY}px; transform-box: view-box;`);

    const kids = Array.from(src.children).filter((el) => el.tagName.toLowerCase() !== "defs");
    // First graphical group is the central vortex; remainder orbit.
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

    // Outer under center so center stays visually crisp on top
    svg.appendChild(orbit);
    svg.appendChild(center);
    host.innerHTML = "";
    host.appendChild(svg);

    if (!reduced) mark.classList.add("is-ready");
    else mark.classList.add("is-ready"); // still show; CSS disables motion
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount, { once: true });
  } else {
    mount();
  }


  /* Matrix rain — phrases, dark, strictly behind sigil */
  const canvas = document.querySelector("[data-matrix]");
  if (canvas && !reduced) {
    const ctx = canvas.getContext("2d");
    const phrases = [
      "blackhole universe",
      "consciousness carrier wave",
      "quantum resonance",
      "photon",
      "phonon",
      "past",
      "future",
      "co exist",
      "consciousness bridge between universes",
      "wave",
      "quantum",
      "light",
      "lux",
    ];
    let drops = [];
    let w = 0;
    let h = 0;
    let font = 13;
    let colW = 0;
    let raf = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      font = w < 640 ? 11 : 13;
      colW = font * 1.15;
      const n = Math.max(8, Math.ceil(w / colW));
      drops = Array.from({ length: n }, (_, i) => ({
        y: Math.random() * h,
        phrase: phrases[i % phrases.length],
        i: 0,
        speed: 0.55 + Math.random() * 0.75,
      }));
    };

    const tick = () => {
      // fade trail on white — does not cover the sigil (sigil has white plate + higher z)
      ctx.fillStyle = "rgba(255,255,255,0.22)";
      ctx.fillRect(0, 0, w, h);
      ctx.font = `${font}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
      ctx.textBaseline = "top";

      drops.forEach((d, col) => {
        const text = d.phrase;
        const ch = text[d.i % text.length];
        const x = col * colW;
        // darker matrix on white
        ctx.fillStyle = col % 5 === 0 ? "rgba(0, 0, 0, 0.35)" : "rgba(0, 0, 0, 0.2)";
        ctx.fillText(ch, x, d.y);
        d.i += 1;
        d.y += font * d.speed;
        if (d.y > h + font * 2) {
          d.y = -font * (1 + Math.random() * 8);
          d.phrase = phrases[(Math.random() * phrases.length) | 0];
          d.i = 0;
          d.speed = 0.55 + Math.random() * 0.75;
        }
      });
      raf = requestAnimationFrame(tick);
    };

    resize();
    window.addEventListener("resize", resize, { passive: true });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) cancelAnimationFrame(raf);
      else raf = requestAnimationFrame(tick);
    });
    raf = requestAnimationFrame(tick);
  }


})();
