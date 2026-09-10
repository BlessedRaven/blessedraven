(() => {
  const STORAGE_KEY = "br-entrance-seen";
  const root = document.documentElement;
  const entrance = document.getElementById("raven-entrance");
  if (!entrance) return;

  const reduced =
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    root.classList.contains("raven-entrance-done");

  const markSeen = () => {
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch (_) {}
  };

  const finish = () => {
    markSeen();
    root.classList.remove("raven-entrance-pending");
    root.classList.add("raven-entrance-done");
    entrance.classList.add("is-exit", "is-gone");
    entrance.setAttribute("aria-hidden", "true");
    window.setTimeout(() => {
      if (entrance.parentNode) entrance.parentNode.removeChild(entrance);
    }, 750);
  };

  if (reduced || root.classList.contains("raven-entrance-done")) {
    finish();
    return;
  }

  const skipBtn = entrance.querySelector("[data-raven-skip]");
  const eyeHost = entrance.querySelector("[data-raven-eye-svg]");
  const timers = [];
  let cancelled = false;

  const later = (fn, ms) => {
    const id = window.setTimeout(() => {
      if (!cancelled) fn();
    }, ms);
    timers.push(id);
    return id;
  };

  const cancelAll = () => {
    cancelled = true;
    timers.forEach((id) => window.clearTimeout(id));
    timers.length = 0;
  };

  const skip = () => {
    cancelAll();
    finish();
  };

  if (skipBtn) skipBtn.addEventListener("click", skip, { once: true });
  entrance.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "Escape") skip();
    },
    { passive: true }
  );

  entrance.addEventListener(
    "click",
    (e) => {
      if (e.target.closest("[data-raven-skip]")) return;
      if (entrance.classList.contains("is-open") && !entrance.classList.contains("is-whirl")) {
        cancelAll();
        entrance.classList.add("is-whirl");
        later(finish, 1550);
      }
    },
    { passive: true }
  );

  const prepareStrokeDraw = (svg) => {
    const nodes = svg.querySelectorAll("path, circle, ellipse, line, polyline, polygon");
    const animated = [];
    nodes.forEach((node) => {
      try {
        if (typeof node.getTotalLength !== "function") return;
        const len = node.getTotalLength();
        if (!Number.isFinite(len) || len < 2) return;
        if (node.classList && node.classList.contains("cls-7")) return;
        node.style.strokeDasharray = String(len);
        node.style.strokeDashoffset = String(len);
        animated.push({ node, len });
      } catch (_) {}
    });
    return animated;
  };

  const drawStrokes = (animated, durationMs) => {
    if (!animated.length) return;
    const start = performance.now();
    const max = 80;
    const list =
      animated.length > max
        ? animated.filter((_, i) => i % Math.ceil(animated.length / max) === 0)
        : animated;

    const tick = (now) => {
      if (cancelled) return;
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      for (const { node, len } of list) {
        node.style.strokeDashoffset = String(len * (1 - eased));
      }
      if (t < 1) requestAnimationFrame(tick);
      else {
        for (const { node } of animated) node.style.strokeDashoffset = "0";
      }
    };
    requestAnimationFrame(tick);
  };

  const mountEye = (raw) => {
    if (!eyeHost) return null;
    const parser = new DOMParser();
    const doc = parser.parseFromString(raw, "image/svg+xml");
    const src = doc.querySelector("svg");
    if (!src) return null;

    // Nest geometry into crow SVG, centered on third-eye origin (0,0 of host group)
    const geo = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    geo.setAttribute("class", "raven-eye-svg");
    geo.setAttribute("viewBox", src.getAttribute("viewBox") || "0 0 924 886");
    geo.setAttribute("width", "108");
    geo.setAttribute("height", "108");
    geo.setAttribute("x", "-54");
    geo.setAttribute("y", "-54");
    geo.setAttribute("overflow", "visible");
    geo.setAttribute("aria-hidden", "true");
    geo.setAttribute("focusable", "false");

    // Copy children (skip nested <defs> style conflicts by keeping defs)
    Array.from(src.childNodes).forEach((n) => {
      geo.appendChild(document.importNode(n, true));
    });

    eyeHost.innerHTML = "";
    eyeHost.appendChild(geo);
    return geo;
  };

  const run = async () => {
    entrance.setAttribute("aria-hidden", "false");
    root.classList.add("raven-entrance-pending");
    entrance.classList.add("is-crow");

    let svg = null;
    try {
      const res = await fetch("assets/jakel3726.svg", { cache: "force-cache" });
      if (!res.ok) throw new Error("eye asset missing");
      svg = mountEye(await res.text());
    } catch (err) {
      console.warn("[raven-entrance]", err);
    }

    later(() => entrance.classList.add("is-alive"), 900);
    later(() => entrance.classList.add("is-eye"), 1500);
    later(() => {
      entrance.classList.add("is-open");
      if (svg) drawStrokes(prepareStrokeDraw(svg), 1400);
    }, 2000);
    later(() => entrance.classList.add("is-lock"), 3400);
    later(() => entrance.classList.add("is-whirl"), 6400);
    later(finish, 8000);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
  } else {
    run();
  }
})();
