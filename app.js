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
  let morphT = 0;
  let raf = 0;
  const plateAnims = [];

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

  const lerp = (a, b, t) => a + (b - a) * t;
  const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

  /* ---------- B&W research outline shapes (unit space ~ -1..1) ---------- */
  const ptsCircle = (n, r = 1, ox = 0, oy = 0) => {
    const out = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      out.push({ x: ox + Math.cos(a) * r, y: oy + Math.sin(a) * r });
    }
    return out;
  };

  const ptsRing = (n) => ptsCircle(n, 0.92);

  const ptsTorus = (n) => {
    const out = [];
    const R = 0.58;
    const r = 0.28;
    for (let i = 0; i < n; i++) {
      const t = (i / n) * Math.PI * 2;
      // figure-8 / torus silhouette projection
      const x = (R + r * Math.cos(2 * t)) * Math.cos(t);
      const y = (R + r * Math.cos(2 * t)) * Math.sin(t) * 0.72;
      out.push({ x, y });
    }
    return out;
  };

  const ptsConstellation = (n) => {
    const hubs = [
      [0, -0.75], [0.55, -0.35], [-0.55, -0.3], [0.2, 0.15],
      [-0.35, 0.4], [0.65, 0.45], [-0.7, 0.1], [0, 0.8],
      [0.35, -0.7], [-0.2, -0.15],
    ];
    const out = [];
    for (let i = 0; i < n; i++) {
      const h0 = hubs[i % hubs.length];
      const h1 = hubs[(i + 3) % hubs.length];
      const t = (i % 7) / 6;
      out.push({
        x: lerp(h0[0], h1[0], t) + Math.sin(i * 1.7) * 0.04,
        y: lerp(h0[1], h1[1], t) + Math.cos(i * 1.3) * 0.04,
      });
    }
    return out;
  };

  const ptsSeed = (n) => {
    const out = [];
    const petals = 6;
    for (let i = 0; i < n; i++) {
      const ring = Math.floor((i / n) * petals);
      const local = ((i / n) * petals) % 1;
      const a = (ring / petals) * Math.PI * 2;
      const cx = Math.cos(a) * 0.38;
      const cy = Math.sin(a) * 0.38;
      const pa = local * Math.PI * 2;
      out.push({ x: cx + Math.cos(pa) * 0.38, y: cy + Math.sin(pa) * 0.38 });
    }
    return out;
  };

  const ptsPyramid = (n) => {
    const verts = [
      [0, -0.85], [-0.75, 0.7], [0.75, 0.7], [0, 0.15], [-0.35, 0.7], [0.35, 0.7],
    ];
    const edges = [[0,1],[0,2],[1,2],[0,3],[1,3],[2,3],[1,4],[4,5],[5,2]];
    const out = [];
    for (let i = 0; i < n; i++) {
      const e = edges[i % edges.length];
      const t = (Math.floor(i / edges.length) + (i % 5) / 4) % 1;
      const a = verts[e[0]];
      const b = verts[e[1]];
      out.push({ x: lerp(a[0], b[0], t), y: lerp(a[1], b[1], t) });
    }
    return out;
  };

  const ptsHelix = (n) => {
    const out = [];
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const a = t * Math.PI * 6;
      const strand = i % 2 === 0 ? 1 : -1;
      out.push({
        x: Math.cos(a) * 0.42 * strand,
        y: (t - 0.5) * 1.7,
      });
    }
    return out;
  };

  const ptsRaven = (n) => {
    // Stylized wing / perched silhouette (nice-to-have brand accent)
    const out = [];
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const wing = Math.sin(t * Math.PI);
      const x = (t - 0.5) * 1.85;
      const y = -wing * 0.55 + Math.abs(t - 0.5) * 0.32 + (i % 3) * 0.05;
      out.push({ x, y });
    }
    return out;
  };

  const shapeFns = {
    ring: ptsRing,
    torus: ptsTorus,
    constellation: ptsConstellation,
    seed: ptsSeed,
    pyramid: ptsPyramid,
    helix: ptsHelix,
    raven: ptsRaven,
  };

  const motifForItem = (item) => {
    const id = String(item.id || "");
    const tags = (item.tags || []).join(" ").toLowerCase();
    if (id.includes("torus") || tags.includes("torus") || tags.includes("energy")) return ["torus", "ring", "seed"];
    if (id.includes("dna") || tags.includes("biotech") || tags.includes("light")) return ["helix", "constellation", "ring"];
    if (id.includes("pyramid") || tags.includes("architecture")) return ["pyramid", "seed", "ring"];
    if (id.includes("astral") || tags.includes("vr") || tags.includes("consciousness")) return ["constellation", "seed", "raven"];
    if (id.includes("med") || tags.includes("healing") || tags.includes("bci")) return ["ring", "helix", "seed"];
    if (item.type === "invention") return ["torus", "seed", "ring"];
    if (item.type === "prototype") return ["constellation", "raven", "ring"];
    return ["seed", "constellation", "pyramid"];
  };

  /* ---------- Global ambient field (faint B&W strokes) ---------- */
  let W = 0;
  let H = 0;
  let dpr = 1;
  let fieldPaths = [];

  const buildFieldPaths = () => {
    const count = reduced ? 48 : isMobile() ? 72 : 110;
    const keys = ["ring", "torus", "constellation", "seed", "raven"];
    fieldPaths = keys.map((k) => shapeFns[k](count));
  };

  const resizeCanvas = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildFieldPaths();
  };

  const samplePath = (paths, t) => {
    const segs = paths.length - 1;
    const x = Math.min(1, Math.max(0, t)) * segs;
    const i0 = Math.min(Math.floor(x), segs - 1);
    const i1 = i0 + 1;
    const local = easeInOut(x - i0);
    const a = paths[i0];
    const b = paths[i1];
    const n = Math.min(a.length, b.length);
    const out = [];
    for (let i = 0; i < n; i++) {
      out.push({ x: lerp(a[i].x, b[i].x, local), y: lerp(a[i].y, b[i].y, local) });
    }
    return out;
  };

  const drawPolyline = (c, pts, cx, cy, scale, strokeStyle, lineWidth, close = true) => {
    if (!pts.length) return;
    c.beginPath();
    c.moveTo(cx + pts[0].x * scale, cy + pts[0].y * scale);
    for (let i = 1; i < pts.length; i++) {
      c.lineTo(cx + pts[i].x * scale, cy + pts[i].y * scale);
    }
    if (close) c.closePath();
    c.strokeStyle = strokeStyle;
    c.lineWidth = lineWidth;
    c.lineJoin = "round";
    c.lineCap = "round";
    c.stroke();
  };

  const drawField = (time) => {
    ctx.clearRect(0, 0, W, H);
    if (!fieldPaths.length) return;

    const cx = W * 0.62;
    const cy = H * 0.48;
    const scale = Math.min(W, H) * (isMobile() ? 0.28 : 0.34);
    const breath = Math.sin((time || 0) * 0.0004) * 0.02;
    const pts = samplePath(fieldPaths, morphT + breath);

    // faint construction arcs
    ctx.save();
    ctx.globalAlpha = 0.35;
    drawPolyline(ctx, pts, cx, cy, scale, "rgba(18,18,18,0.22)", 1.1, true);

    // sparse node ticks
    const step = isMobile() ? 8 : 5;
    for (let i = 0; i < pts.length; i += step) {
      const p = pts[i];
      const x = cx + p.x * scale;
      const y = cy + p.y * scale;
      ctx.beginPath();
      ctx.arc(x, y, 1.35, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(18,18,18,0.28)";
      ctx.fill();
    }

    // crosshair research marks
    ctx.strokeStyle = "rgba(18,18,18,0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - scale * 1.05, cy);
    ctx.lineTo(cx + scale * 1.05, cy);
    ctx.moveTo(cx, cy - scale * 1.05);
    ctx.lineTo(cx, cy + scale * 1.05);
    ctx.stroke();
    ctx.restore();
  };

  let fieldRunning = false;

  const loop = (time) => {
    if (!fieldRunning) return;
    drawField(time || 0);
    // update visible invention plates
    for (const plate of plateAnims) {
      if (plate.visible) plate.draw(time || 0);
    }
    raf = requestAnimationFrame(loop);
  };

  const startField = () => {
    if (reduced || fieldRunning) return;
    fieldRunning = true;
    raf = requestAnimationFrame(loop);
  };

  const stopField = () => {
    fieldRunning = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };

  /* ---------- Per-chapter large outline plates ---------- */
  const makePlate = (el, item) => {
    const cnv = el.querySelector("canvas.inv-plate");
    if (!cnv) return null;
    const c = cnv.getContext("2d", { alpha: true });
    const motifs = motifForItem(item);
    const count = reduced ? 64 : isMobile() ? 90 : 140;
    const paths = motifs.map((k) => shapeFns[k](count));
    let localT = Math.random() * 0.2;
    let visible = false;
    let pw = 0;
    let ph = 0;
    let pdpr = 1;

    const resize = () => {
      const rect = el.getBoundingClientRect();
      pdpr = Math.min(window.devicePixelRatio || 1, 2);
      pw = Math.max(1, Math.floor(rect.width));
      ph = Math.max(1, Math.floor(rect.height));
      cnv.width = Math.floor(pw * pdpr);
      cnv.height = Math.floor(ph * pdpr);
      cnv.style.width = `${pw}px`;
      cnv.style.height = `${ph}px`;
      c.setTransform(pdpr, 0, 0, pdpr, 0, 0);
    };

    const draw = (time) => {
      if (!pw || !ph) return;
      c.clearRect(0, 0, pw, ph);

      const cx = pw * 0.5;
      const cy = ph * 0.5;
      const scale = Math.min(pw, ph) * 0.38;
      const breath = reduced ? 0 : Math.sin(time * 0.00055 + localT * 10) * 0.025;
      const t = easeInOut((Math.sin(time * 0.00018 + localT * 6) * 0.5 + 0.5) * 0.85 + morphT * 0.15);
      const pts = samplePath(paths, Math.min(0.999, t + breath));

      // plate grid whisper
      c.strokeStyle = "rgba(18,18,18,0.045)";
      c.lineWidth = 1;
      const g = 36;
      for (let x = g; x < pw; x += g) {
        c.beginPath();
        c.moveTo(x, 0);
        c.lineTo(x, ph);
        c.stroke();
      }
      for (let y = g; y < ph; y += g) {
        c.beginPath();
        c.moveTo(0, y);
        c.lineTo(pw, y);
        c.stroke();
      }

      // outer construction circle
      c.beginPath();
      c.arc(cx, cy, scale * 1.05, 0, Math.PI * 2);
      c.strokeStyle = "rgba(18,18,18,0.12)";
      c.lineWidth = 1;
      c.stroke();

      c.beginPath();
      c.arc(cx, cy, scale * 0.72, 0, Math.PI * 2);
      c.strokeStyle = "rgba(18,18,18,0.07)";
      c.lineWidth = 1;
      c.stroke();

      // main morphing outline
      drawPolyline(c, pts, cx, cy, scale, "rgba(18,18,18,0.78)", isMobile() ? 1.25 : 1.55, true);

      // secondary offset ghost stroke
      drawPolyline(c, pts, cx + 1.5, cy + 1.5, scale * 0.985, "rgba(18,18,18,0.12)", 1, true);

      // nodes
      const step = isMobile() ? 7 : 4;
      for (let i = 0; i < pts.length; i += step) {
        const p = pts[i];
        c.beginPath();
        c.arc(cx + p.x * scale, cy + p.y * scale, 1.6, 0, Math.PI * 2);
        c.fillStyle = "rgba(18,18,18,0.55)";
        c.fill();
      }

      // motif caption ticks
      c.fillStyle = "rgba(18,18,18,0.35)";
      c.font = "10px Inter, system-ui, sans-serif";
      c.fillText("PLATE / " + motifs[0].toUpperCase(), 18, 28);
    };

    resize();
    draw(0);

    return {
      resize,
      draw,
      get visible() { return visible; },
      set visible(v) { visible = v; },
      el,
    };
  };

  const clearPlates = () => {
    plateAnims.length = 0;
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
    if (!root) return;
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

  const observePlates = () => {
    if (!("IntersectionObserver" in window)) {
      plateAnims.forEach((p) => { p.visible = true; });
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const plate = plateAnims.find((p) => p.el === entry.target);
          if (plate) plate.visible = entry.isIntersecting;
        });
      },
      { threshold: 0.15 }
    );
    plateAnims.forEach((p) => io.observe(p.el));
  };

  const setupScrollMotion = () => {
    killTriggers();
    if (reduced || typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
      morphT = 0.35;
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

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

    document.querySelectorAll(".chapter[data-id]").forEach((chapter) => {
      const art = chapter.querySelector(".inv-art");
      if (!art) return;
      const tween = gsap.fromTo(
        art,
        { y: 28, opacity: 0.7 },
        {
          y: -12,
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

    clearPlates();

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
        const artInner = item.image
          ? `<img src="${escapeHtml(item.image)}" alt="" loading="lazy" />`
          : `<canvas class="inv-plate" aria-hidden="true"></canvas>
             <span class="inv-glyph" aria-hidden="true">${glyph(item.type)}</span>
             <span class="inv-plate-label">research outline · ${escapeHtml(item.type)}</span>`;

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
                  ${artInner}
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

    list.forEach((item) => {
      const art = chaptersRoot.querySelector(`.chapter[data-id="${CSS.escape(item.id)}"] .inv-art`);
      if (!art || item.image) return;
      const plate = makePlate(art, item);
      if (plate) plateAnims.push(plate);
    });

    observePlates();
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

  /* ---------- Funding ---------- */
  const fundRoot = document.getElementById("fund-root");
  const fundMethods = document.getElementById("fund-methods");
  const fundProjects = document.getElementById("fund-projects");
  let funding = null;

  const formatMoney = (amount, currency) => {
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: currency || "NZD",
        maximumFractionDigits: 0,
      }).format(Number(amount) || 0);
    } catch {
      return `${currency || "NZD"} ${Number(amount) || 0}`;
    }
  };

  const copyText = async (text, btn) => {
    const value = String(text || "");
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      if (btn) {
        const prev = btn.textContent;
        btn.textContent = "Copied";
        btn.classList.add("is-copied");
        setTimeout(() => {
          btn.textContent = prev;
          btn.classList.remove("is-copied");
        }, 1600);
      }
    } catch {
      const ta = document.createElement("textarea");
      ta.value = value;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        if (btn) {
          const prev = btn.textContent;
          btn.textContent = "Copied";
          setTimeout(() => {
            btn.textContent = prev;
          }, 1600);
        }
      } finally {
        ta.remove();
      }
    }
  };

  const goToInvention = (id) => {
    const chapter = document.querySelector(`.chapter[data-id="${CSS.escape(id)}"]`);
    if (chapter) {
      chapter.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
      setTimeout(() => openDetail(id), reduced ? 0 : 450);
      return;
    }
    openDetail(id);
  };

  const deepLinkId = () => {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get("id");
    if (fromQuery) return fromQuery;
    const hash = (window.location.hash || "").replace(/^#/, "");
    if (!hash || hash === "top" || hash === "fund") return "";
    return hash;
  };

  const openDeepLink = () => {
    const id = deepLinkId();
    if (!id) return;
    requestAnimationFrame(() => {
      setTimeout(() => goToInvention(id), reduced ? 0 : 80);
    });
  };

  const renderFunding = (data) => {
    funding = data || {};
    const headline = document.getElementById("fund-headline");
    const lede = document.getElementById("fund-lede");
    if (headline && funding.headline) headline.textContent = funding.headline;
    if (lede) lede.textContent = funding.lede || "";

    const goalEl = document.getElementById("fund-goal");
    const goal = funding.goal || {};
    const raised = funding.raised || {};
    if (goalEl && goal.amount != null) {
      goalEl.hidden = false;
      const label = document.getElementById("fund-goal-label");
      const nums = document.getElementById("fund-goal-nums");
      const fill = document.getElementById("fund-rail-fill");
      if (label) label.textContent = goal.label || "Goal";
      const raisedAmt = Number(raised.amount) || 0;
      const goalAmt = Number(goal.amount) || 0;
      const cur = raised.currency || goal.currency || "NZD";
      if (nums) {
        nums.textContent = `${formatMoney(raisedAmt, cur)} / ${formatMoney(goalAmt, goal.currency || cur)}`;
      }
      if (fill) {
        const pct = goalAmt > 0 ? Math.min(100, Math.max(0, (raisedAmt / goalAmt) * 100)) : 0;
        fill.style.width = `${pct}%`;
      }
    }

    const methods = funding.methods || {};
    const methodNodes = [];

    const liveWallets = () => {
      const list = Array.isArray(methods.wallets) ? methods.wallets : [];
      const withAddr = list.filter((w) => w && String(w.address || "").trim());
      if (withAddr.length) return withAddr;
      if (methods.cryptoEth) {
        return [{
          id: "eth",
          label: "Ethereum",
          symbol: "ETH",
          address: methods.cryptoEth,
          network: "Ethereum",
        }];
      }
      return [];
    };

    if (methods.paypal) {
      methodNodes.push(`
        <a class="fund-method fund-method-paypal" href="${escapeHtml(methods.paypal)}" target="_blank" rel="noopener noreferrer">
          <span class="fund-method-kicker">Primary</span>
          <span class="fund-method-title">PayPal</span>
          <span class="fund-method-hint">Send with PayPal (personal)</span>
        </a>`);
    }

    if (methods.paypalEmail) {
      methodNodes.push(`
        <div class="fund-method">
          <span class="fund-method-kicker">PayPal</span>
          <span class="fund-method-title">Email</span>
          <code class="fund-addr" title="${escapeHtml(methods.paypalEmail)}">${escapeHtml(methods.paypalEmail)}</code>
          <button type="button" class="fund-copy" data-copy="${escapeHtml(methods.paypalEmail)}">Copy email</button>
          <span class="fund-method-hint">Friends &amp; family / send money</span>
        </div>`);
    }

    const bank = methods.bankNz;
    if (bank && bank.accountNumber) {
      const bankLabel = [bank.bank, bank.currency].filter(Boolean).join(" · ");
      const nameLine = bank.accountName ? escapeHtml(bank.accountName) : "";
      methodNodes.push(`
        <div class="fund-method fund-bank">
          <span class="fund-method-kicker">NZ transfer</span>
          <span class="fund-method-title">${escapeHtml(bank.bank || "Bank")}</span>
          ${nameLine ? `<span class="fund-method-hint">${nameLine}</span>` : ""}
          <code class="fund-addr" title="${escapeHtml(bank.accountNumber)}">${escapeHtml(bank.accountNumber)}</code>
          <button type="button" class="fund-copy" data-copy="${escapeHtml(bank.accountNumber)}">Copy account</button>
          <span class="fund-method-hint">${escapeHtml(bankLabel || "NZD")}</span>
        </div>`);
    }

    liveWallets().forEach((w) => {
      const symbol = w.symbol || w.label || "Crypto";
      const title = w.label || symbol;
      const network = w.network ? escapeHtml(w.network) : "";
      methodNodes.push(`
        <div class="fund-method fund-crypto" data-wallet="${escapeHtml(w.id || symbol)}">
          <span class="fund-method-kicker">${escapeHtml(symbol)}</span>
          <span class="fund-method-title">${escapeHtml(title)}</span>
          <code class="fund-addr" title="${escapeHtml(w.address)}">${escapeHtml(w.address)}</code>
          <button type="button" class="fund-copy" data-copy="${escapeHtml(w.address)}">Copy address</button>
          ${network ? `<span class="fund-method-hint">${network}</span>` : ""}
        </div>`);
    });

    [
      { key: "revolut", title: "Revolut", kicker: "Link", hint: "Pay / donate · Visa via Revolut" },
      { key: "kofi", title: "Ko-fi", kicker: "Tips", hint: "Support on Ko-fi" },
      { key: "buyMeACoffee", title: "Buy Me a Coffee", kicker: "Tips", hint: "Global tip jar" },
      { key: "givealittle", title: "Givealittle", kicker: "NZ", hint: "NZ crowdfunding" },
      { key: "stripe", title: "Card (Stripe)", kicker: "Card", hint: "Pay by card" },
    ].forEach(({ key, title, kicker, hint }) => {
      const url = methods[key];
      if (!url) return;
      methodNodes.push(`
        <a class="fund-method" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">
          <span class="fund-method-kicker">${escapeHtml(kicker)}</span>
          <span class="fund-method-title">${escapeHtml(title)}</span>
          <span class="fund-method-hint">${escapeHtml(hint)}</span>
        </a>`);
    });

    if (methods.discord) {
      methodNodes.push(`
        <a class="fund-method" href="${escapeHtml(methods.discord)}" target="_blank" rel="noopener noreferrer">
          <span class="fund-method-kicker">Community</span>
          <span class="fund-method-title">Discord</span>
          <span class="fund-method-hint">Ask how to back a project</span>
        </a>`);
    }

    if (fundMethods) {
      fundMethods.innerHTML = methodNodes.join("");
      fundMethods.querySelectorAll("[data-copy]").forEach((btn) => {
        btn.addEventListener("click", () => copyText(btn.getAttribute("data-copy"), btn));
      });
    }

    const projects = Array.isArray(funding.projects) ? funding.projects : [];
    if (fundProjects) {
      fundProjects.innerHTML = projects
        .map(
          (p) => `
        <button type="button" class="fund-project" data-back="${escapeHtml(p.inventionId || "")}">
          <span class="fund-project-label">${escapeHtml(p.label || "Back project")}</span>
          <span class="fund-project-blurb">${escapeHtml(p.blurb || "")}</span>
        </button>`
        )
        .join("");
      fundProjects.querySelectorAll("[data-back]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.getAttribute("data-back");
          if (id) goToInvention(id);
        });
      });
    }

    if (fundRoot) observeReveals(fundRoot);
    if (typeof ScrollTrigger !== "undefined") ScrollTrigger.refresh();
  };

  window.addEventListener("hashchange", () => {
    if (inventions.length) openDeepLink();
  });

  observeReveals(document.querySelector(".hero-chapter"));
  observeReveals(document.querySelector(".close-chapter"));
  if (fundRoot) observeReveals(fundRoot);

  const siteNav = document.getElementById("site-nav");
  const navToggle = document.getElementById("nav-toggle");
  if (siteNav && navToggle) {
    navToggle.addEventListener("click", () => {
      const open = !siteNav.classList.contains("is-open");
      siteNav.classList.toggle("is-open", open);
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
      navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });
    siteNav.querySelectorAll(".nav-chip, .nav-fund").forEach((el) => {
      el.addEventListener("click", () => {
        if (!siteNav.classList.contains("is-open")) return;
        siteNav.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
        navToggle.setAttribute("aria-label", "Open menu");
      });
    });
  }

  resizeCanvas();
  window.addEventListener("resize", () => {
    resizeCanvas();
    plateAnims.forEach((p) => p.resize());
    if (typeof ScrollTrigger !== "undefined") ScrollTrigger.refresh();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopField();
    else startField();
  });

  if (!reduced) startField();
  else {
    morphT = 0.4;
    drawField(0);
  }

  Promise.all([
    fetch("inventions.json", { cache: "no-store" }).then((r) => {
      if (!r.ok) throw new Error(`Failed to load inventions.json (${r.status})`);
      return r.json();
    }),
    fetch("funding.json", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load funding.json (${r.status})`);
        return r.json();
      })
      .catch((err) => {
        console.warn(err);
        return null;
      }),
  ])
    .then(([invData, fundData]) => {
      inventions = Array.isArray(invData) ? invData : [];
      renderChapters();
      if (fundData) renderFunding(fundData);
      openDeepLink();
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
