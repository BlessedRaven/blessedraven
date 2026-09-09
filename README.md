# BlessedRaven — Inventions & Ideas Hub

Personal GitHub Pages site for inventions, ideas, and prototypes.
Live at [www.blessedraven.com](https://www.blessedraven.com).

Vanilla HTML / CSS / JS (GSAP + ScrollTrigger via CDN). No build step.
GitHub Pages serves from the repo root on `main`.

The experience is a cinematic sticky-scroll gallery: a particle field morphs as you scroll, and each invention is a full-viewport chapter. Click **Open details** for the full write-up.

## Add an invention in under a minute

1. Open [`inventions.json`](./inventions.json).
2. Copy an existing object and paste it as a new array item.
3. Fill in the fields (see schema below). Use a unique `id`.
4. Commit and push to `main` (or merge a PR). GitHub Pages updates shortly.

Example entry:

```json
{
  "id": "my-new-thing",
  "title": "My New Thing",
  "type": "idea",
  "summary": "One-line hook shown in the chapter.",
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
| `id` | yes | Unique slug |
| `title` | yes | Display name |
| `type` | yes | `invention` \| `idea` \| `prototype` |
| `summary` | yes | Short chapter text |
| `description` | yes | Full detail (plain text; newlines kept) |
| `status` | yes | `draft` \| `exploring` \| `prototype` \| `built` |
| `tags` | yes | Array of strings |
| `created` | yes | ISO date `YYYY-MM-DD` |
| `updated` | yes | ISO date `YYYY-MM-DD` |
| `image` | no | URL or path to an image |
| `links` | no | Array of `{ "label", "url" }` |

Seed entries with `id` starting with `example-` (and/or tag `example`) are marked as examples — replace or delete them when you add real work.


## Funding / donate

Edit [`funding.json`](./funding.json) to control the **Fund** chapter.

1. Set `methods.paypal` to your PayPal.me or PayPal Donate URL (live now if set).
2. Set `methods.revolut` to your Revolut.me / payment link when ready.
3. Leave either field as `""` to **hide** that button in the UI.
4. `methods.cryptoEth` and `methods.discord` are shown when non-empty.
5. Adjust `goal` / `raised` and the `projects` cards (each `inventionId` should match an entry in `inventions.json`).

Do not invent usernames — only paste real payment links you control. Visa is accepted through PayPal/Revolut; no separate Visa button.

## Local preview

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080`.

## Custom domain

Keep the `CNAME` file exactly as `www.blessedraven.com` for GitHub Pages.
