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

  const accentPalette = [
    { rgb: "212, 168, 90", w: 0.45 }, // gold
    { rgb: "255, 90, 42", w: 0.35 },  // ember
    { rgb: "155, 140, 245", w: 0.2 }, // violet
  ];

  const pickAccent = () => {
    const r = Math.random();
    let acc = 0;
    for (const a of accentPalette) {
      acc += a.w;
      if (r <= acc) return a.rgb;
    }
    return accentPalette[0].rgb;
  };

  const seedParticles = () => {
    // Perf-safe: fewer on mobile; none when reduced-motion
    const count = reduced ? 0 : isMobile() ? 55 : 140;
    const r = Math.min(W, H) * 0.28;
    particles.length = 0;
    for (let i = 0; i < count; i++) {
      const targets = shapeKeys.map((key) => shapes[key](i, count, r));
      const isAccent = Math.random() < 0.1;
      particles.push({
        targets,
        ox: (Math.random() - 0.5) * W * 0.15,
        oy: (Math.random() - 0.5) * H * 0.15,
        size: 0.55 + Math.random() * 1.45,
        accent: isAccent,
        accentRgb: isAccent ? pickAccent() : null,
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
    const mobile = isMobile();

    // Soft void glow — gold / violet / ember wash
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(W, H) * 0.48);
    g.addColorStop(0, "rgba(244,241,234,0.04)");
    g.addColorStop(0.35, "rgba(212,168,90,0.03)");
    g.addColorStop(0.65, "rgba(155,140,245,0.022)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    for (const p of particles) {
      const pos = sampleShape(p, Math.min(1, Math.max(0, morphT + breath)));
      const driftX = Math.cos(time * 0.0004 + p.phase) * 6;
      const driftY = Math.sin(time * 0.00035 + p.phase) * 6;
      const x = cx + pos.x + p.ox * 0.25 + driftX;
      const y = cy + pos.y + p.oy * 0.25 + driftY;

      if (p.accent) {
        const pulse = 0.4 + Math.sin(time * 0.002 + p.phase) * 0.22;
        // Soft glow halo (skip on mobile for FPS)
        if (!mobile) {
          const glow = ctx.createRadialGradient(x, y, 0, x, y, p.size * 5);
          glow.addColorStop(0, `rgba(${p.accentRgb}, ${pulse * 0.35})`);
          glow.addColorStop(1, `rgba(${p.accentRgb}, 0)`);
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(x, y, p.size * 5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.beginPath();
        ctx.fillStyle = `rgba(${p.accentRgb}, ${pulse})`;
        ctx.arc(x, y, p.size * 1.15, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.fillStyle = `rgba(244, 241, 234, ${0.24 + p.size * 0.11})`;
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Faint connecting lines for nearby accents (sparse; fewer on mobile)
    if (!mobile) {
      ctx.lineWidth = 1;
      let links = 0;
      const maxLinks = 14;
      for (let i = 0; i < particles.length && links < maxLinks; i++) {
        if (!particles[i].accent) continue;
        const a = sampleShape(particles[i], morphT);
        for (let j = i + 1; j < particles.length && links < maxLinks; j++) {
          if (!particles[j].accent) continue;
          const b = sampleShape(particles[j], morphT);
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          if (dx * dx + dy * dy < 90 * 90) {
            ctx.strokeStyle = `rgba(${particles[i].accentRgb}, 0.1)`;
            ctx.beginPath();
            ctx.moveTo(cx + a.x, cy + a.y);
            ctx.lineTo(cx + b.x, cy + b.y);
            ctx.stroke();
            links++;
          }
        }
      }
    }
  };

  let fieldRunning = false;

  const loop = (time) => {
    if (!fieldRunning) return;
    drawField(time || 0);
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
      // Fallback: select a temporary input
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
      // Open detail shortly after scroll starts so the chapter is findable
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
    // Wait a tick so sticky chapters / ScrollTrigger layout settle
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

  // Hero / close / fund reveals
  observeReveals(document.querySelector(".hero-chapter"));
  observeReveals(document.querySelector(".close-chapter"));
  if (fundRoot) observeReveals(fundRoot);

  // Mobile nav hamburger
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
    if (typeof ScrollTrigger !== "undefined") ScrollTrigger.refresh();
  });

  // Pause particles when tab hidden (perf)
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
