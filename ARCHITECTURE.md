# Architecture

## Now (v1)

- Static site on GitHub Pages (repo root, custom domain via `CNAME`).
- `inventions.json` is the single source of truth for cards.
- `index.html` + `styles.css` + `app.js` render a full-viewport snap-scroll gallery and a detail modal.
- No backend, no auth, no build tooling.

## Later (not built)

These are intentional future directions — not present in v1:

1. **Multi-user posts** — accounts can publish inventions/ideas to shared or personal feeds.
2. **Linked accounts** — connect GitHub / social / professional profiles to an inventor identity.
3. **Education & industry networking** — match learners, labs, and companies around prototypes and open problems.
4. **Cloud processing** — heavier jobs (simulations, CAD previews, media pipelines) off the static edge.

Keep the JSON schema stable when evolving so existing entries remain portable.
