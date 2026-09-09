(() => {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isMobile = () => window.matchMedia("(max-width: 860px)").matches;

  const chaptersRoot = document.getElementById("chapters");
  const detail = document.getElementById("detail");
  const chips = document.querySelectorAll(".nav-chip");
  const canvas = document.getElementById("field");
  const ctx = canvas.getContext("2d", { alpha: true });

  let inventions = [];
  let activeFilter = "all";
  let lastFocus = null;
  let scrollTriggers = [];
  let morphT = 0; // 0..1 global morph scrubbed by page scroll
  let raf = 0;

  const escapeHtml = (v) =>
    String(v ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  const isExample = (item) =>
    (item.id && String(item.id).startsWith("example-")) ||
    (item.tags || []).includes("example") ||
    (item.description || "").toUpperCase().includes("EXAMPLE");

  const glyph = (type) => ({ invention: "Σ", idea: "◇", prototype: "Δ" }[type] || "·");

  /* ---------- Particle field (scroll-scrubbed morph) ---------- */
  const shapes = {
    cloud: (i, n, r) => {
      const a = (i / n) * Math.PI * 2;
      const wobble = 0.65 + ((i * 17) % 7) * 0.05;
      return { x: Math.cos(a) * r * wobble, y: Math.sin(a) * r * wobble * 0.72 };
    },
    ring: (i, n, r) => {
      const a = (i / n) * Math.PI * 2;
      return { x: Math.cos(a) * r, y: Math.sin(a) * r };
    },
    raven: (i, n, r) => {
      // Stylized wing / chevron silhouette points
      const t = i / (n - 1);
      const wing = Math.sin(t * Math.PI);
      const x = (t - 0.5) * r * 2.1;
      const y = -wing * r * 0.55 + Math.abs(t - 0.5) * r * 0.35;
      const layer = i % 3;
      return { x: x * (0.85 + layer * 0.08), y: y + layer * r * 0.06 };
    },
    lattice: (i, n, r) => {
      const cols = Math.ceil(Math.sqrt(n));
      const row = Math.floor(i / cols);
      const col = i % cols;
      const x = ((col / (cols - 1)) - 0.5) * r * 1.8;
      const y = ((row / (cols - 1)) - 0.5) * r * 1.8;
      return { x, y };
    },
  };

  const shapeKeys = ["cloud", "ring", "raven", "lattice"];

  const particles = [];
  let W = 0;
  let H = 0;
  let dpr = 1;

  const resizeCanvas = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seedParticles();
  };

  const seedParticles = () => {
    const count = reduced ? 0 : isMobile() ? 90 : 180;
    const r = Math.min(W, H) * 0.28;
    particles.length = 0;
    for (let i = 0; i < count; i++) {
      const targets = shapeKeys.map((key) => shapes[key](i, count, r));
      particles.push({
        targets,
        ox: (Math.random() - 0.5) * W * 0.15,
        oy: (Math.random() - 0.5) * H * 0.15,
        size: 0.6 + Math.random() * 1.6,
        accent: Math.random() < 0.08,
        phase: Math.random() * Math.PI * 2,
      });
    }
  };

  const lerp = (a, b, t) => a + (b - a) * t;
  const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

  const sampleShape = (p, t) => {
    const segs = shapeKeys.length - 1;
    const x = t * segs;
    const i0 = Math.min(Math.floor(x), segs - 1);
    const i1 = i0 + 1;
    const local = easeInOut(x - i0);
    const a = p.targets[i0];
    const b = p.targets[i1];
    return { x: lerp(a.x, b.x, local), y: lerp(a.y, b.y, local) };
  };

  const drawField = (time) => {
    ctx.clearRect(0, 0, W, H);
    if (!particles.length) return;

    const cx = W * 0.58;
    const cy = H * 0.48;
    const breath = Math.sin(time * 0.00035) * 0.015;

    // Soft void glow
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(W, H) * 0.45);
    g.addColorStop(0, "rgba(255,255,255,0.035)");
    g.addColorStop(0.55, "rgba(255,90,42,0.025)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    for (const p of particles) {
      const pos = sampleShape(p, Math.min(1, Math.max(0, morphT + breath)));
      const driftX = Math.cos(time * 0.0004 + p.phase) * 6;
      const driftY = Math.sin(time * 0.00035 + p.phase) * 6;
      const x = cx + pos.x + p.ox * 0.25 + driftX;
      const y = cy + pos.y + p.oy * 0.25 + driftY;

      ctx.beginPath();
      ctx.fillStyle = p.accent
        ? `rgba(255, 90, 42, ${0.45 + Math.sin(time * 0.002 + p.phase) * 0.2})`
        : `rgba(245, 245, 245, ${0.28 + p.size * 0.12})`;
      ctx.arc(x, y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // faint connecting lines for nearby accents (sparse)
    ctx.strokeStyle = "rgba(255,90,42,0.08)";
    ctx.lineWidth = 1;
    let links = 0;
    for (let i = 0; i < particles.length && links < 18; i++) {
      if (!particles[i].accent) continue;
      const a = sampleShape(particles[i], morphT);
      for (let j = i + 1; j < particles.length && links < 18; j++) {
        if (!particles[j].accent) continue;
        const b = sampleShape(particles[j], morphT);
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        if (dx * dx + dy * dy < 90 * 90) {
          ctx.beginPath();
          ctx.moveTo(cx + a.x, cy + a.y);
          ctx.lineTo(cx + b.x, cy + b.y);
          ctx.stroke();
          links++;
        }
      }
    }
  };

  const loop = (time) => {
    drawField(time || 0);
    raf = requestAnimationFrame(loop);
  };

  /* ---------- Detail panel ---------- */
  const openDetail = (id) => {
    const item = inventions.find((e) => e.id === id);
    if (!item) return;
    lastFocus = document.activeElement;
    document.getElementById("d-type").textContent = item.type;
    document.getElementById("d-status").textContent = item.status;
    document.getElementById("d-title").textContent = item.title;
    document.getElementById("d-summary").textContent = item.summary;
    document.getElementById("d-body").textContent = item.description || "";
    const ex = document.getElementById("d-example");
    ex.hidden = !isExample(item);

    document.getElementById("d-tags").innerHTML = (item.tags || [])
      .map((t) => `<li class="${t === "example" ? "accent" : ""}">${escapeHtml(t)}</li>`)
      .join("");

    document.getElementById("d-links").innerHTML = (item.links || [])
      .map(
        (l) =>
          `<a href="${escapeHtml(l.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(l.label)}</a>`
      )
      .join("");

    const dates = [];
    if (item.created) dates.push(`Created ${item.created}`);
    if (item.updated) dates.push(`Updated ${item.updated}`);
    document.getElementById("d-dates").textContent = dates.join(" · ");

    detail.hidden = false;
    document.body.classList.add("detail-open");
    detail.querySelector(".detail-x").focus();
  };

  const closeDetail = () => {
    detail.hidden = true;
    document.body.classList.remove("detail-open");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  };

  detail.addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) closeDetail();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !detail.hidden) closeDetail();
  });

  /* ---------- Chapters ---------- */
  const killTriggers = () => {
    scrollTriggers.forEach((t) => t.kill());
    scrollTriggers = [];
  };

  const observeReveals = (root) => {
    const nodes = root.querySelectorAll(".reveal");
    if (reduced) {
      nodes.forEach((n) => n.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2, rootMargin: "0px 0px -8% 0px" }
    );
    nodes.forEach((n, i) => {
      n.style.setProperty("--delay", `${Math.min(i, 6) * 80}ms`);
      io.observe(n);
    });
  };

  const setupScrollMotion = () => {
    killTriggers();
    if (reduced || typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
      morphT = 0.35;
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    // Global morph scrubbed across whole page
    const global = ScrollTrigger.create({
      trigger: document.body,
      start: "top top",
      end: "bottom bottom",
      scrub: 0.6,
      onUpdate: (self) => {
        morphT = self.progress;
      },
    });
    scrollTriggers.push(global);

    // Hero progress rail
    const hero = document.querySelector(".hero-chapter");
    const fill = document.getElementById("hero-progress");
    if (hero && fill) {
      const st = ScrollTrigger.create({
        trigger: hero,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.4,
        onUpdate: (self) => {
          fill.style.width = `${self.progress * 100}%`;
        },
      });
      scrollTriggers.push(st);
    }

    // Per-chapter subtle art parallax
    document.querySelectorAll(".chapter[data-id]").forEach((chapter) => {
      const art = chapter.querySelector(".inv-art");
      if (!art) return;
      const tween = gsap.fromTo(
        art,
        { y: 40, opacity: 0.55 },
        {
          y: -20,
          opacity: 1,
          ease: "none",
          scrollTrigger: {
            trigger: chapter,
            start: "top bottom",
            end: "bottom top",
            scrub: 0.5,
          },
        }
      );
      if (tween.scrollTrigger) scrollTriggers.push(tween.scrollTrigger);
    });

    ScrollTrigger.refresh();
  };

  const renderChapters = () => {
    const list = inventions.filter(
      (item) => activeFilter === "all" || item.type === activeFilter
    );

    if (!list.length) {
      chaptersRoot.innerHTML = `
        <section class="chapter">
          <div class="chapter-pin">
            <div class="empty-note">
              <p class="eyebrow reveal">Empty</p>
              <h2 class="headline sm reveal">Nothing in this filter.</h2>
              <p class="lede reveal">Try All, or add an entry in inventions.json.</p>
            </div>
          </div>
        </section>`;
      observeReveals(chaptersRoot);
      setupScrollMotion();
      return;
    }

    chaptersRoot.innerHTML = list
      .map((item, index) => {
        const example = isExample(item);
        const tags = (item.tags || [])
          .map((t) => `<li class="${t === "example" ? "accent" : ""}">${escapeHtml(t)}</li>`)
          .join("");
        const art = item.image
          ? `<img src="${escapeHtml(item.image)}" alt="" loading="lazy" />`
          : `<span class="inv-glyph" aria-hidden="true">${glyph(item.type)}</span>`;

        return `
          <section class="chapter" data-id="${escapeHtml(item.id)}" data-type="${escapeHtml(item.type)}">
            <div class="chapter-pin">
              <div class="inv-layout">
                <div class="inv-copy">
                  <p class="inv-index reveal">${String(index + 1).padStart(2, "0")} / ${String(list.length).padStart(2, "0")}</p>
                  <div class="inv-meta reveal">
                    <span class="tag">${escapeHtml(item.type)}</span>
                    <span class="tag soft">${escapeHtml(item.status)}</span>
                    ${example ? '<span class="tag accent">example</span>' : ""}
                  </div>
                  <h2 class="inv-title reveal">${escapeHtml(item.title)}</h2>
                  <p class="inv-summary reveal">${escapeHtml(item.summary)}</p>
                  <ul class="inv-tags reveal">${tags}</ul>
                  <button type="button" class="inv-open reveal" data-open="${escapeHtml(item.id)}">Open details</button>
                </div>
                <div class="inv-art reveal" aria-hidden="true">
                  ${art}
                  <div class="inv-art-frame"></div>
                  <span class="inv-corner tl"></span>
                  <span class="inv-corner tr"></span>
                  <span class="inv-corner bl"></span>
                  <span class="inv-corner br"></span>
                </div>
              </div>
            </div>
          </section>`;
      })
      .join("");

    chaptersRoot.querySelectorAll("[data-open]").forEach((btn) => {
      btn.addEventListener("click", () => openDetail(btn.getAttribute("data-open")));
    });

    observeReveals(chaptersRoot);
    setupScrollMotion();
  };

  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      activeFilter = chip.dataset.filter;
      chips.forEach((c) => c.classList.toggle("is-on", c === chip));
      renderChapters();
      const first = chaptersRoot.querySelector(".chapter");
      if (first) first.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
    });
  });

  // Hero reveals
  observeReveals(document.querySelector(".hero-chapter"));
  observeReveals(document.querySelector(".close-chapter"));

  resizeCanvas();
  window.addEventListener("resize", () => {
    resizeCanvas();
    if (typeof ScrollTrigger !== "undefined") ScrollTrigger.refresh();
  });
  if (!reduced) raf = requestAnimationFrame(loop);
  else {
    morphT = 0.4;
    drawField(0);
  }

  fetch("inventions.json", { cache: "no-store" })
    .then((r) => {
      if (!r.ok) throw new Error(`Failed to load inventions.json (${r.status})`);
      return r.json();
    })
    .then((data) => {
      inventions = Array.isArray(data) ? data : [];
      renderChapters();
    })
    .catch((err) => {
      chaptersRoot.innerHTML = `
        <section class="chapter">
          <div class="chapter-pin">
            <div class="empty-note">
              <h2 class="headline sm reveal">Could not load inventions</h2>
              <p class="lede reveal">${escapeHtml(err.message)}</p>
            </div>
          </div>
        </section>`;
      observeReveals(chaptersRoot);
    });
})();
