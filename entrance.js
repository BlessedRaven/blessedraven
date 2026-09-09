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
    } catch (_) {
      /* private mode / blocked storage */
    }
  };

  const finish = () => {
    markSeen();
    root.classList.remove("raven-entrance-pending");
    root.classList.add("raven-entrance-done");
    entrance.classList.add("is-exit", "is-gone");
    entrance.setAttribute("aria-hidden", "true");
    window.setTimeout(() => {
      if (entrance.parentNode) entrance.parentNode.removeChild(entrance);
    }, 650);
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

  const prepareStrokeDraw = (svg) => {
    const nodes = svg.querySelectorAll("path, circle, ellipse, line, polyline, polygon");
    const animated = [];
    nodes.forEach((node) => {
      try {
        if (typeof node.getTotalLength !== "function") return;
        const len = node.getTotalLength();
        if (!Number.isFinite(len) || len < 2) return;
        // Skip pure fills (cls-7) — no meaningful stroke draw
        if (node.classList && node.classList.contains("cls-7")) return;
        node.style.strokeDasharray = String(len);
        node.style.strokeDashoffset = String(len);
        animated.push({ node, len });
      } catch (_) {
        /* some browsers choke on degenerate geometry */
      }
    });
    return animated;
  };

  const drawStrokes = (animated, durationMs) => {
    if (!animated.length) return;
    const start = performance.now();
    // Cap work on low-end phones: animate a subset if huge
    const max = 90;
    const list =
      animated.length > max
        ? animated.filter((_, i) => i % Math.ceil(animated.length / max) === 0)
        : animated;

    // Instantly show non-animated leftover strokes at end via opacity on parent
    const tick = (now) => {
      if (cancelled) return;
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      for (const { node, len } of list) {
        node.style.strokeDashoffset = String(len * (1 - eased));
      }
      if (t < 1) requestAnimationFrame(tick);
      else {
        for (const { node } of animated) {
          node.style.strokeDashoffset = "0";
        }
      }
    };
    requestAnimationFrame(tick);
  };

  const run = async () => {
    entrance.setAttribute("aria-hidden", "false");
    root.classList.add("raven-entrance-pending");

    // 1) Crow silhouette
    entrance.classList.add("is-crow");

    // 2) Load sacred-geometry eye SVG
    let svg = null;
    try {
      const res = await fetch("assets/jakel3726.svg", { cache: "force-cache" });
      if (!res.ok) throw new Error("eye asset missing");
      const raw = await res.text();
      if (eyeHost) {
        eyeHost.innerHTML = raw;
        svg = eyeHost.querySelector("svg");
        if (svg) {
          svg.classList.add("raven-eye-svg");
          svg.removeAttribute("width");
          svg.removeAttribute("height");
          svg.setAttribute("aria-hidden", "true");
          svg.setAttribute("focusable", "false");
        }
      }
    } catch (err) {
      console.warn("[raven-entrance]", err);
    }

    later(() => {
      entrance.classList.add("is-eye");
    }, 420);

    later(() => {
      entrance.classList.add("is-open");
      if (svg) {
        const animated = prepareStrokeDraw(svg);
        drawStrokes(animated, 1300);
      }
    }, 780);

    later(() => {
      entrance.classList.add("is-lock");
    }, 2100);

    later(() => {
      entrance.classList.add("is-whirl");
    }, 3100);

    later(finish, 4750);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
  } else {
    run();
  }
})();
