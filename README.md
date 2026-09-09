# BlessedRaven — Inventions & Ideas Hub

Personal GitHub Pages site for inventions, ideas, and prototypes.
Live at [www.blessedraven.com](https://www.blessedraven.com).

Vanilla HTML / CSS / JS. No build step. GitHub Pages serves from the repo root on `main`.

## Add an invention in under a minute

1. Open [`inventions.json`](./inventions.json).
2. Copy an existing object and paste it as a new array item.
3. Fill in the fields (see schema below). Use a unique `id`.
4. Commit and push to `main` (or merge a PR). GitHub Pages will update shortly.

Example entry:

```json
{
  "id": "my-new-thing",
  "title": "My New Thing",
  "type": "idea",
  "summary": "One-line hook shown on the card.",
  "description": "Full write-up shown in the detail panel.",
  "status": "draft",
  "tags": ["hardware", "notes"],
  "created": "2026-09-09",
  "updated": "2026-09-09",
  "image": "",
  "links": [
    { "label": "Sketch", "url": "https://example.com" }
  ]
}
```

### Field reference

| Field | Required | Notes |
| --- | --- | --- |
| `id` | yes | Unique slug (used in the UI) |
| `title` | yes | Display name |
| `type` | yes | `invention` \| `idea` \| `prototype` |
| `summary` | yes | Short card text |
| `description` | yes | Full detail (plain text; newlines kept) |
| `status` | yes | `draft` \| `exploring` \| `prototype` \| `built` |
| `tags` | yes | Array of strings |
| `created` | yes | ISO date `YYYY-MM-DD` |
| `updated` | yes | ISO date `YYYY-MM-DD` |
| `image` | no | URL or path to an image |
| `links` | no | Array of `{ "label", "url" }` |

Seed entries with `id` starting with `example-` (and/or tag `example`) are clearly marked as examples in the UI — replace or delete them when you add real work.

## Local preview

Any static server from the repo root works, for example:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Custom domain

The `CNAME` file must stay as `www.blessedraven.com` for GitHub Pages.
