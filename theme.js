(() => {
  const THEME_KEY = "br-theme";
  const VIBE_LAST_KEY = "br-vibe-last";
  const allowed = new Set(["custom", "dark", "light", "vibe-dark", "vibe-light"]);

  const migrate = (t) => {
    if (t === "vibe") return "vibe-dark";
    return allowed.has(t) ? t : "light";
  };

  const readTheme = () => {
    try {
      return migrate(localStorage.getItem(THEME_KEY));
    } catch {
      return "light";
    }
  };

  const readLastVibe = () => {
    try {
      const v = migrate(localStorage.getItem(VIBE_LAST_KEY));
      return v === "vibe-light" ? "vibe-light" : "vibe-dark";
    } catch {
      return "vibe-dark";
    }
  };

  // Visual chrome theme (Custom uses light look)
  const chromeTheme = (t) => (t === "custom" ? "light" : t);

  const vibeOpen = (open) => {
    const menu = document.querySelector("[data-vibe-menu]");
    const btn = document.querySelector("[data-vibe-toggle]");
    if (!menu || !btn) return;
    menu.hidden = !open;
    btn.setAttribute("aria-expanded", open ? "true" : "false");
  };

  const applyTheme = (theme, opts) => {
    const keepMenu = !!(opts && opts.keepMenu);
    const prev = readTheme();
    const t = migrate(theme);
    const chrome = chromeTheme(t);
    document.documentElement.setAttribute("data-theme", chrome);
    document.documentElement.setAttribute("data-br-mode", t);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute("content", chrome === "light" || chrome === "vibe-light" ? "#f7f5f0" : "#0a0a0c");
    }
    document.querySelectorAll("[data-theme-set]").forEach((btn) => {
      const on = btn.getAttribute("data-theme-set") === t;
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
    const vibeBtn = document.querySelector("[data-vibe-toggle]");
    if (vibeBtn) {
      const vibeOn = t === "vibe-dark" || t === "vibe-light";
      vibeBtn.setAttribute("aria-pressed", vibeOn ? "true" : "false");
      vibeBtn.textContent = "Vibe";
    }
    try {
      localStorage.setItem(THEME_KEY, t);
      if (t === "vibe-dark" || t === "vibe-light") {
        localStorage.setItem(VIBE_LAST_KEY, t);
      }
    } catch {}
    if (!keepMenu) vibeOpen(false);
    document.dispatchEvent(
      new CustomEvent("br:theme", { detail: { theme: t, prev, chrome } })
    );
  };

  applyTheme(readTheme());

  document.addEventListener("click", (e) => {
    const vibeToggle = e.target.closest("[data-vibe-toggle]");
    if (vibeToggle) {
      e.preventDefault();
      e.stopPropagation();
      const cur = readTheme();
      const vibeOn = cur === "vibe-dark" || cur === "vibe-light";
      if (!vibeOn) applyTheme(readLastVibe(), { keepMenu: true });
      const menu = document.querySelector("[data-vibe-menu]");
      const open = menu ? menu.hidden : true;
      vibeOpen(open);
      return;
    }

    const themeBtn = e.target.closest("[data-theme-set]");
    if (themeBtn) {
      e.stopPropagation();
      const next = themeBtn.getAttribute("data-theme-set");
      const isVibePick = next === "vibe-dark" || next === "vibe-light";
      applyTheme(next, { keepMenu: isVibePick });
      if (isVibePick) vibeOpen(true);
      else vibeOpen(false);
      return;
    }

    if (
      e.target.closest("[data-motion-toggle]") ||
      e.target.closest("[data-motion-panel]") ||
      e.target.closest("[data-panel-open]")
    ) {
      vibeOpen(false);
      return;
    }

    if (!e.target.closest("[data-vibe-wrap]")) vibeOpen(false);
  });
})();
