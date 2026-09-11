# Blessed Raven

Landing + symbol sandbox for [www.blessedraven.com](https://www.blessedraven.com).

Hub art: `assets/jakel3726.svg` (full-viewport framing). Themes, Symbol lab, Motion ring, and Sandbox physics are adapted from the Pair portal model — rebranded for BR, no pair.co.nz runtime dependency.

## Quick tour

- **Themes:** Light / Dark / Vibe (Dark|Light) / Custom saves (A/B/C)
- **Symbol lab:** multi-select · CW/CCW/off · pulse/breathe/shimmer/shield · colour none/multicolour/spectrum · size · spin & colour speed
- **Motion:** whole-sigil CSS orbit (CW/CCW) — mutually exclusive with Sandbox Pin
- **Sandbox:** drag + fling/inertia · Repel · Orbit-around-hub (default hub = Home/`center`) · Random · Reset (eased)
- **Import:** [`import.html`](import.html) — paste/upload SVG → sanitize → QC → AI wiring instructions

## Symbol registry

`symbols.json` maps slot ids → labels/defaults:

| id | label |
|----|--------|
| n | Crow |
| nw | Archive |
| w | Orbit |
| sw | Wings |
| s | Fund |
| se | Nest |
| e | Lattice |
| ne | Bloom |
| center | Home |

Hotspots in `index.html` use `data-sym` matching these ids. `app.js` wraps SVG leaves into `.sym-slot > .sym[data-sym]` by nearest hotspot centroid.

## How an AI imports + gamifies a symbol

1. Open **Import** (`import.html`), paste/upload SVG, run **Sanitize & QC**.
2. Fix any viewBox / complexity warnings. Note the auto-detected center.
3. Save SVG under `assets/<id>.svg` (or merge a `<g>` into the hub SVG).
4. Add an entry to `symbols.json` and a hotspot (`data-sym="<id>"`) if it is a new seat.
5. Ensure wrap assigns `data-sym` (centroid mapping or explicit order). `transform-origin` should be the art center so spin/glow/physics balance.
6. In Symbol lab: select the symbol → animation + colour + size/speed. Optionally enable **Orb** (Projects → Orb) for shield/orbit aura.
7. Sandbox: drag/fling; **Orbit** with this symbol as hub (double-click) or keep Home as hub.
8. Bump cache `?v=` on `styles.css` / `*.js` / assets, commit, push `main`.

## Dev notes

- Physics: free-layer `ax`/`ay` + `requestAnimationFrame` (Pin/Orbit). Do not mix CSS Motion ring transforms with free-layer Pin.
- Orbit ring: one shared `ringRadius` + `ringPhase`; Repel does not shove moons off the circle while Orbit is on.
- `prefers-reduced-motion` disables breathe/orbit animations.
- Fund / inventions hooks stay simple placeholders (`#soon`).

## Cache bust

Scripts and CSS load with `?v=` — increment after each deploy.
