(() => {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isMobile = () => window.matchMedia("(max-width: 860px)").matches;

  const canvas = document.getElementById("field");
  const ctx = canvas.getContext("2d", { alpha: true });

  const escapeHtml = (v) =>
    String(v ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  /* ---------- Soft particle field (ambient, no scroll morph) ---------- */
  let W = 0;
  let H = 0;
  let dpr = 1;
  let raf = 0;
  const particles = [];

  const seedParticles = () => {
    const count = reduced ? 0 : isMobile() ? 70 : 140;
    particles.length = 0;
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        size: 0.5 + Math.random() * 1.5,
        accent: Math.random() < 0.08,
        phase: Math.random() * Math.PI * 2,
        speed: 0.15 + Math.random() * 0.35,
      });
    }
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
    seedParticles();
  };

  const drawField = (time) => {
    ctx.clearRect(0, 0, W, H);
    if (!particles.length) return;

    const cx = W * 0.5;
    const cy = H * 0.42;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(W, H) * 0.5);
    g.addColorStop(0, "rgba(255,255,255,0.03)");
    g.addColorStop(0.55, "rgba(255,90,42,0.02)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    for (const p of particles) {
      const driftX = Math.cos(time * 0.00025 * p.speed + p.phase) * 8;
      const driftY = Math.sin(time * 0.0002 * p.speed + p.phase) * 8;
      const x = ((p.x + driftX) % W + W) % W;
      const y = ((p.y + driftY) % H + H) % H;
      ctx.beginPath();
      ctx.fillStyle = p.accent
        ? `rgba(255, 90, 42, ${0.4 + Math.sin(time * 0.002 + p.phase) * 0.2})`
        : `rgba(245, 245, 245, ${0.22 + p.size * 0.1})`;
      ctx.arc(x, y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const loop = (time) => {
    drawField(time || 0);
    raf = requestAnimationFrame(loop);
  };

  /* ---------- Reveals ---------- */
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
      { threshold: 0.15, rootMargin: "0px 0px -6% 0px" }
    );
    nodes.forEach((n, i) => {
      n.style.setProperty("--delay", `${Math.min(i, 8) * 70}ms`);
      io.observe(n);
    });
  };

  /* ---------- Funding UI ---------- */
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

  const renderFunding = (data) => {
    const funding = data || {};
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
      const rail = document.getElementById("fund-rail");
      if (label) label.textContent = goal.label || "Goal";
      const raisedAmt = Number(raised.amount) || 0;
      const goalAmt = Number(goal.amount) || 0;
      const cur = raised.currency || goal.currency || "NZD";
      const pct = goalAmt > 0 ? Math.min(100, Math.max(0, (raisedAmt / goalAmt) * 100)) : 0;
      if (nums) {
        nums.innerHTML = `<strong>${escapeHtml(formatMoney(raisedAmt, cur))}</strong><span> / ${escapeHtml(formatMoney(goalAmt, goal.currency || cur))}</span>`;
      }
      if (fill) fill.style.width = `${pct}%`;
      if (rail) rail.setAttribute("aria-valuenow", String(Math.round(pct)));
    }

    const methods = funding.methods || {};
    const fundMethods = document.getElementById("fund-methods");
    const methodNodes = [];

    const liveWallets = () => {
      const list = Array.isArray(methods.wallets) ? methods.wallets : [];
      const withAddr = list.filter((w) => w && String(w.address || "").trim());
      if (withAddr.length) return withAddr;
      // Backward compat: single cryptoEth string
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
          <span class="fund-method-title">Send with PayPal</span>
          <span class="fund-method-hint">Personal send · NZD</span>
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

    const wallets = liveWallets();
    wallets.forEach((w) => {
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

    // Optional tip / payment links — only when URL is non-empty
    const tipLinks = [
      { key: "revolut", title: "Revolut", kicker: "Link", hint: "Pay / donate · Visa via Revolut" },
      { key: "kofi", title: "Ko-fi", kicker: "Tips", hint: "Support on Ko-fi" },
      { key: "buyMeACoffee", title: "Buy Me a Coffee", kicker: "Tips", hint: "Global tip jar" },
      { key: "givealittle", title: "Givealittle", kicker: "NZ", hint: "NZ crowdfunding" },
      { key: "stripe", title: "Card (Stripe)", kicker: "Card", hint: "Pay by card" },
    ];
    tipLinks.forEach(({ key, title, kicker, hint }) => {
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

    // Soft empty-state only when we have other methods but no live wallets yet
    const pendingWallets = (Array.isArray(methods.wallets) ? methods.wallets : [])
      .filter((w) => w && !String(w.address || "").trim());
    if (methodNodes.length && wallets.length === 0 && pendingWallets.length) {
      methodNodes.push(`
        <div class="fund-method fund-method-note is-muted">
          <span class="fund-method-kicker">Crypto</span>
          <span class="fund-method-title">More wallets coming</span>
          <span class="fund-method-hint">BTC, SOL, USDC slots are ready — addresses land in funding.json</span>
        </div>`);
    }

    if (fundMethods) {
      fundMethods.innerHTML = methodNodes.join("") || `<p class="lede">No payment methods set yet — edit funding.json.</p>`;
      fundMethods.querySelectorAll("[data-copy]").forEach((btn) => {
        btn.addEventListener("click", () => copyText(btn.getAttribute("data-copy"), btn));
      });
    }

    const projects = Array.isArray(funding.projects) ? funding.projects : [];
    const fundProjects = document.getElementById("fund-projects");
    if (fundProjects) {
      fundProjects.innerHTML = projects
        .map((p) => {
          const id = p.inventionId || "";
          const href = id ? `index.html#${encodeURIComponent(id)}` : "index.html";
          return `
        <a class="fund-project fund-project-link" href="${escapeHtml(href)}">
          <span class="fund-project-label">${escapeHtml(p.label || "Back project")}</span>
          <span class="fund-project-blurb">${escapeHtml(p.blurb || "")}</span>
        </a>`;
        })
        .join("");
    }

    observeReveals(document.querySelector(".fund-page-main"));
  };

  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
  if (!reduced) raf = requestAnimationFrame(loop);
  else {
    drawField(0);
  }

  observeReveals(document.querySelector(".fund-page-main"));

  fetch("funding.json", { cache: "no-store" })
    .then((r) => {
      if (!r.ok) throw new Error(`Failed to load funding.json (${r.status})`);
      return r.json();
    })
    .then(renderFunding)
    .catch((err) => {
      const lede = document.getElementById("fund-lede");
      if (lede) lede.textContent = err.message || "Could not load funding.json";
      observeReveals(document.querySelector(".fund-page-main"));
    });
})();
