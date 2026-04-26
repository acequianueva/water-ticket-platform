# Architecture

## Infrastructure: Cloudflare-first

The platform runs entirely on Cloudflare's edge network. No traditional server or VPS required.

- **Domain**: `acequianueva.com` (existing) — new subdomain e.g. `tienda.acequianueva.com`
- **DNS & CDN**: Cloudflare (already managing the domain)

---

## Cloudflare services

| Service | Purpose | Free tier |
|---|---|---|
| **Pages** | Frontend hosting (React + Vite, TypeScript) | Unlimited requests |
| **Workers** | Backend API + webhook handlers | 100k req/day |
| **D1** | SQLite relational database | 500 MB, 5M rows read/day |
| **KV** | Server-side session storage, rate-limit counters | 100k reads/day |
| **Cron Triggers** | Wednesday 9pm weekly report job | Free |
| **R2** | PDF voucher storage | 10 GB/month free |

All free tiers are orders of magnitude above what ~55 users with seasonal traffic will generate. The Workers paid plan ($5/month) is available if limits are approached.

---

## Third-party services

| Service | Purpose | Cost |
|---|---|---|
| **Stripe** or **Redsys** | Payment processing | See [02-payments.md](./02-payments.md) |
| **Resend** | Transactional email | Free (3,000 emails/month) |

---

## Runtime stack

| Layer | Technology |
|---|---|
| Language | TypeScript throughout |
| Frontend | React + Vite, deployed to Cloudflare Pages |
| Backend | [Hono](https://hono.dev) on Cloudflare Workers — lightweight, edge-native |
| Database ORM | [Drizzle ORM](https://orm.drizzle.team) on Cloudflare D1 |
| PDF generation | `pdf-lib` (runs in Worker, no Node.js required) |
| Email | Resend REST API |
| Auth | Session tokens in KV + HttpOnly cookies |

---

## Vite toolset

Vite is the build tool and dev server for the frontend. The full toolset it brings:

| Tool | Role |
|---|---|
| **Vite** | Dev server with HMR, orchestrates the toolchain |
| **Rolldown** | Production bundler — Rust-based replacement for Rollup/esbuild, ships as part of Vite+ |
| **OXC (Oxlint + Oxfmt)** | Linting and formatting — Rust-based, ESLint/Prettier-compatible, order-of-magnitude faster |
| **Vitest** | Unit and integration testing — same config as Vite, no Jest setup needed |
| **tsgo** | Type checking — faster TypeScript checker, replaces `tsc --noEmit` in CI |
| **vite-plugin-cloudflare** | Runs the Hono Worker locally inside Vite's dev server via Miniflare — single `vite dev` command runs the full stack |
| **@vitejs/plugin-react** | React fast refresh |

### Why this matters

`vite-plugin-cloudflare` is the key piece: it embeds the Worker runtime (Miniflare) directly into Vite's dev server. This means:
- One command (`vite dev`) starts frontend + backend + D1 + KV locally
- No separate `wrangler dev` process to manage
- Hot module replacement on frontend changes; Worker reloads on backend changes
- The same Vitest runner used in CI runs locally with identical Cloudflare bindings

### Scripts (package.json)

```json
{
  "scripts": {
    "dev":       "vite dev",
    "build":     "vite build",
    "preview":   "vite preview",
    "typecheck": "tsgo --noEmit",
    "lint":      "oxlint src",
    "format":    "oxfmt src",
    "test":      "vitest run",
    "test:watch": "vitest"
  }
}
```

---

## Why not an off-the-shelf SaaS?

**Shopify**
- ~€32/month base + transaction fees
- Generic public storefront requires heavy customisation for: closed-community login, usage tracking, weekly operator reports
- Cannot model the "bucket of hours" concept natively
- Verdict: overcomplicated and over-priced for this use case

**WooCommerce (WordPress)**
- Requires WordPress hosting + ongoing maintenance
- Redsys plugin available (~€60 one-time) but adds another dependency
- Same customisation problems as Shopify for the admin/operator workflow
- Verdict: brings significant accidental complexity

**SuperSaaS / Bookeo / generic booking SaaS**
- Built for appointment/time-slot booking, not prepaid-hour vouchers
- Would need workarounds for the usage-deduction and weekly-report flows
- Adds a monthly SaaS fee for a workflow that doesn't quite fit
- Verdict: wrong category of product

**Conclusion**: a custom build on Cloudflare is cheaper long-term (infrastructure near-zero), fits the specific workflow precisely, and keeps the codebase in one place. The generic open-source structure means other communities benefit too.

---

## Deployment topology

```
User browser
    │
    ▼
Cloudflare CDN  ──►  Pages (React frontend)
    │
    ▼
Cloudflare Worker (Hono API)
    ├── D1 (SQLite — users, purchases, usage, seasons)
    ├── KV (sessions, rate-limit counters)
    ├── R2 (PDF voucher files)
    ├── Stripe / Redsys (payment redirect / webhook)
    └── Resend (email)

Cron Trigger (Wed 19:00 UTC)
    └── Worker job → D1 query → Resend email to Francis + Goiatz
```
