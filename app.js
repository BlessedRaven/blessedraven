(() => {
  const cardsRoot = document.getElementById("cards");
  const modal = document.getElementById("modal");
  const filterButtons = document.querySelectorAll(".filter-btn");

  let inventions = [];
  let activeFilter = "all";
  let lastFocus = null;

  const glyphFor = (item) => {
    const map = { invention: "Σ", idea: "◇", prototype: "Δ" };
    return map[item.type] || "✶";
  };

  const isExample = (item) =>
    (item.id && String(item.id).startsWith("example-")) ||
    (item.tags || []).includes("example") ||
    (item.description || "").toUpperCase().includes("EXAMPLE");

  const escapeHtml = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  const renderCards = () => {
    const filtered = inventions.filter(
      (item) => activeFilter === "all" || item.type === activeFilter
    );

    if (!filtered.length) {
      cardsRoot.innerHTML = `
        <section class="panel">
          <div class="hero-inner">
            <h2>No matches</h2>
            <p class="lede">Nothing in this filter yet. Try All, or add an entry in inventions.json.</p>
          </div>
        </section>`;
      return;
    }

    cardsRoot.innerHTML = filtered
      .map((item) => {
        const example = isExample(item);
        const tags = (item.tags || [])
          .map((tag) => {
            const cls = tag === "example" ? "tag example-chip" : "tag";
            return `<span class="${cls}">${escapeHtml(tag)}</span>`;
          })
          .join("");

        const visual = item.image
          ? `<img src="${escapeHtml(item.image)}" alt="" loading="lazy" />`
          : `<span class="card-glyph" aria-hidden="true">${glyphFor(item)}</span>`;

        return `
          <article class="card" data-id="${escapeHtml(item.id)}" data-type="${escapeHtml(item.type)}">
            <button type="button" class="card-surface" data-open="${escapeHtml(item.id)}" aria-label="Open ${escapeHtml(item.title)}">
              <div class="card-copy">
                <div class="card-meta">
                  <span class="badge" data-type="${escapeHtml(item.type)}">${escapeHtml(item.type)}</span>
                  <span class="status" data-status="${escapeHtml(item.status)}">${escapeHtml(item.status)}</span>
                  ${example ? '<span class="tag example-chip">example</span>' : ""}
                </div>
                <h2>${escapeHtml(item.title)}</h2>
                <p>${escapeHtml(item.summary)}</p>
                <div class="card-tags">${tags}</div>
                <div class="card-cta">Open details →</div>
              </div>
              <div class="card-visual">${visual}</div>
            </button>
          </article>`;
      })
      .join("");
  };

  const openModal = (id) => {
    const item = inventions.find((entry) => entry.id === id);
    if (!item) return;

    lastFocus = document.activeElement;

    document.getElementById("modal-type").textContent = item.type;
    document.getElementById("modal-type").dataset.type = item.type;
    document.getElementById("modal-status").textContent = item.status;
    document.getElementById("modal-status").dataset.status = item.status;
    document.getElementById("modal-title").textContent = item.title;
    document.getElementById("modal-summary").textContent = item.summary;
    document.getElementById("modal-description").textContent = item.description || "";

    const tags = document.getElementById("modal-tags");
    tags.innerHTML = (item.tags || [])
      .map((tag) => `<li class="tag${tag === "example" ? " example-chip" : ""}">${escapeHtml(tag)}</li>`)
      .join("");

    const links = document.getElementById("modal-links");
    links.innerHTML = (item.links || [])
      .map(
        (link) =>
          `<a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label)}</a>`
      )
      .join("");

    const dates = [];
    if (item.created) dates.push(`Created ${item.created}`);
    if (item.updated) dates.push(`Updated ${item.updated}`);
    document.getElementById("modal-dates").textContent = dates.join(" · ");

    modal.hidden = false;
    document.body.classList.add("modal-open");
    modal.querySelector(".modal-close").focus();
  };

  const closeModal = () => {
    modal.hidden = true;
    document.body.classList.remove("modal-open");
    if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
  };

  cardsRoot.addEventListener("click", (event) => {
    const opener = event.target.closest("[data-open]");
    if (opener) openModal(opener.getAttribute("data-open"));
  });

  modal.addEventListener("click", (event) => {
    if (event.target.closest("[data-close]")) closeModal();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.hidden) closeModal();
  });

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activeFilter = button.dataset.filter;
      filterButtons.forEach((btn) => btn.classList.toggle("is-active", btn === button));
      renderCards();
      const stage = document.querySelector(".scroll-stage");
      const firstCard = cardsRoot.querySelector(".card, .panel");
      if (firstCard) firstCard.scrollIntoView({ behavior: "smooth" });
      else stage.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  fetch("inventions.json", { cache: "no-store" })
    .then((response) => {
      if (!response.ok) throw new Error(`Failed to load inventions.json (${response.status})`);
      return response.json();
    })
    .then((data) => {
      inventions = Array.isArray(data) ? data : [];
      renderCards();
    })
    .catch((error) => {
      cardsRoot.innerHTML = `
        <section class="panel">
          <div class="hero-inner">
            <h2>Could not load inventions</h2>
            <p class="lede">${escapeHtml(error.message)}. Check inventions.json on the site root.</p>
          </div>
        </section>`;
    });
})();
