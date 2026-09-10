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
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount, { once: true });
  } else {
    mount();
  }

  /* Floating phrases — not Matrix columns; z-index keeps them behind the sigil */
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
    let items = [];
    let w = 0;
    let h = 0;
    let raf = 0;

    const spawn = (partial) => {
      const text = phrases[(Math.random() * phrases.length) | 0];
      return {
        text,
        x: Math.random() * (w || 300),
        y: partial ? Math.random() * (h || 300) : (h || 300) + 20 + Math.random() * 80,
        vx: (Math.random() - 0.5) * 0.25,
        vy: -(0.25 + Math.random() * 0.45),
        rot: (Math.random() - 0.5) * 0.4,
        vr: (Math.random() - 0.5) * 0.002,
        size: 11 + Math.random() * 7,
        alpha: 0.14 + Math.random() * 0.14,
      };
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = w < 640 ? 18 : 28;
      items = Array.from({ length: n }, () => spawn(true));
    };

    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      items.forEach((it, idx) => {
        it.x += it.vx;
        it.y += it.vy;
        it.rot += it.vr;
        if (it.y < -40 || it.x < -120 || it.x > w + 120) {
          items[idx] = spawn(false);
          return;
        }
        ctx.save();
        ctx.translate(it.x, it.y);
        ctx.rotate(it.rot);
        ctx.font = `${it.size}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
        ctx.fillStyle = `rgba(0,0,0,${it.alpha})`;
        ctx.fillText(it.text, 0, 0);
        ctx.restore();
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
