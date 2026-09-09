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

Live page: [`fund.html`](./fund.html) → [www.blessedraven.com/fund.html](https://www.blessedraven.com/fund.html).

The index scroll still has a short **Fund** teaser that links to the full page. Edit [`funding.json`](./funding.json) to control both.

### Authoring raised totals

1. When money comes in, bump `raised.amount` (NZD) in `funding.json`.
2. Commit and push to `main`. The live progress bar updates after Pages rebuilds.
3. Totals are **manually updated** until payment webhooks exist — keep the on-page note honest.

### Payment methods

Leave any URL or address as `""` to **hide** that card in the UI.

| Field | Notes |
| --- | --- |
| `methods.paypal` | Personal PayPal send / Buy Now link (not a charity Donate URL) |
| `methods.paypalEmail` | Copyable PayPal email |
| `methods.bankNz` | NZ bank transfer (`accountName`, `accountNumber`, `bank`, `currency`) |
| `methods.wallets[]` | Crypto wallets — see below |
| `methods.cryptoEth` | Legacy single ETH string (still works if `wallets` empty); prefer `wallets` |
| `methods.revolut` | Revolut.me / payment link |
| `methods.kofi` | Ko-fi URL |
| `methods.buyMeACoffee` | Buy Me a Coffee URL |
| `methods.givealittle` | Givealittle (NZ) campaign URL |
| `methods.stripe` | Stripe Payment Link |
| `methods.discord` | Optional community link — leave `""` to hide |

Adjust `goal` / `raised` and the `projects` cards (each `inventionId` should match an entry in `inventions.json`).

### Add a crypto wallet

1. Open `funding.json` → `methods.wallets`.
2. Find the slot (`eth`, `btc`, `sol`, `usdc`, …) or append a new object:
   ```json
   { "id": "eth", "label": "Ethereum", "symbol": "ETH", "address": "0xYOUR_ADDRESS", "network": "Ethereum" }
   ```
3. Only set `address` when you have a real address you control. Empty `address` strings are **hidden** in the UI (placeholders stay in JSON for later).
4. Do not paste retired or unknown addresses. Commit and push to `main`.

Project cards on `fund.html` deep-link to the gallery via `index.html#<inventionId>` (also supports `index.html?id=<inventionId>`).

Do not invent usernames — only paste real payment links you control. Visa is accepted through PayPal/Revolut; no separate Visa button.


## Local preview

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080`.

## Custom domain

Keep the `CNAME` file exactly as `www.blessedraven.com` for GitHub Pages.
