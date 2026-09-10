(() => {
  const STORAGE_KEY = "br-entrance-seen";
  const WHIRL_MS = 920;
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
    }, 400);
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
        later(finish, WHIRL_MS);
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

  // Calm start → decisive commit (no muddy ease)
  const easeCommit = (t) => {
    // approx cubic-bezier(0.25, 0.08, 0.12, 1)
    const u = 1 - t;
    return 1 - u * u * u * (1 - 0.35 * t);
  };

  const drawStrokes = (animated, durationMs) => {
    if (!animated.length) return;
    const start = performance.now();
    const max = 72;
    const list =
      animated.length > max
        ? animated.filter((_, i) => i % Math.ceil(animated.length / max) === 0)
        : animated;

    const tick = (now) => {
      if (cancelled) return;
      const t = Math.min(1, (now - start) / durationMs);
      const eased = easeCommit(t);
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

    // Tighter beats — less dwell sludge
    later(() => entrance.classList.add("is-alive"), 520);
    later(() => entrance.classList.add("is-eye"), 880);
    later(() => {
      entrance.classList.add("is-open");
      if (svg) drawStrokes(prepareStrokeDraw(svg), 820);
    }, 1100);
    later(() => entrance.classList.add("is-lock"), 2050);
    later(() => entrance.classList.add("is-whirl"), 2750);
    later(finish, 2750 + WHIRL_MS);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
  } else {
    run();
  }
})();
