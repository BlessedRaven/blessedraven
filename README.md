# Blessed Raven

Landing + symbol sandbox for [www.blessedraven.com](https://www.blessedraven.com).

Hub art: `assets/jakel3726.svg` (full-viewport framing). Native Entity/`rAF` game engine drives every BR symbol — spin, colour, size, aura, fling, orbit, vibe. Inspired by Pair’s *play* feel; not a Pair code port.

## Play

- **Themes:** Light / Dark / Vibe (Dark|Light) / Custom saves (A/B/C)
- **Symbol lab:** select · CW/CCW · pulse/breathe/shimmer/shield · colour none/multicolour/spectrum · size · spin & colour speed
- **Motion:** whole-sigil ring CW/CCW
- **Sandbox:** drag + fling/inertia · Repel · Orbit ring (dbl-click hub or Random) · Reset eases home
- **Import:** [`import.html`](import.html) — paste/upload SVG → sanitize → QC → wiring notes

## Symbols

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

`app.js` wraps SVG leaves into `.sym-slot > .sym[data-sym]` by hotspot centroid. `game.js` owns Entity state and renders every frame.
