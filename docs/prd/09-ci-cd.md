# CI/CD and Environments

## Overview

Two environments: **staging** (from day one) and **production** (added when ready to go live). A pull request triggers QA checks and a staging preview. A merge to `main` automatically deploys to production.

---

## Infrastructure as code — decision

### Option A: `wrangler.toml` environments (recommended)

Wrangler's native environment system is effectively IaC for this stack:
- All Cloudflare bindings (D1 database, KV namespace, R2 bucket, cron triggers) are declared in `wrangler.toml` and version-controlled alongside code
- Adding a second environment = one new `[env.production]` block in the same file + provision the resources once via `wrangler` CLI commands
- No extra tooling, no new language to learn, already required for Workers development
- Secrets (API keys) are stored in Cloudflare's secret store, not in the file

**Overhead**: near-zero. `wrangler.toml` is already the entry point for running the project locally.

### Option B: Terraform (Cloudflare provider)

Full declarative IaC — define D1, KV, R2, Workers, DNS all in `.tf` files.

**Why we skip it for now:**
- Significant learning curve and boilerplate for 2 environments
- Cloudflare's Terraform provider is "Level 1" — few helpful abstractions, verbose config
- State management (local or remote) adds another moving part
- Wrangler already does everything Terraform would do here, natively
- Revisit only if the project scales to 5+ environments or a team that already uses Terraform

**Verdict**: `wrangler.toml` environments are the right IaC for this project's size.

---

## Environments

| | Staging | Production |
|---|---|---|
| Purpose | Active development, PR previews, QA | Live user traffic |
| Deployed on | Every PR (preview) + every push to `main` | Every push to `main` (after QA passes) |
| Domain | `staging.tienda.acequianueva.com` | `tienda.acequianueva.com` |
| D1 database | `water-ticket-staging` | `water-ticket-production` |
| KV namespace | `sessions-staging` | `sessions-production` |
| R2 bucket | `vouchers-staging` | `vouchers-production` |
| Stripe / MONEI | Test mode keys | Live keys |
| Resend | Test mode / staging sender | Production sender |
| Data | Synthetic / test data only | Real user data |

Staging and production share no resources — separate databases, separate secrets, separate bindings.

---

## `wrangler.toml` structure

```toml
name            = "water-ticket-worker"
main            = "src/worker/index.ts"
compatibility_date = "2025-01-01"

# ── Staging (default environment) ─────────────────────────────────────────────

[[d1_databases]]
binding      = "DB"
database_name = "water-ticket-staging"
database_id   = "<staging-db-id>"

[[kv_namespaces]]
binding = "SESSIONS"
id      = "<staging-kv-id>"

[[r2_buckets]]
binding     = "VOUCHERS"
bucket_name = "vouchers-staging"

[triggers]
crons = ["0 19 * * 3"]   # Wednesday 21:00 Spain time

# ── Production ────────────────────────────────────────────────────────────────

[env.production]
name = "water-ticket-worker-production"

[[env.production.d1_databases]]
binding      = "DB"
database_name = "water-ticket-production"
database_id   = "<production-db-id>"

[[env.production.kv_namespaces]]
binding = "SESSIONS"
id      = "<production-kv-id>"

[[env.production.r2_buckets]]
binding     = "VOUCHERS"
bucket_name = "vouchers-production"

[env.production.triggers]
crons = ["0 19 * * 3"]
```

Secrets (payment keys, email API key, session secret) are **never** in `wrangler.toml`. They are set once per environment:

```bash
wrangler secret put STRIPE_SECRET_KEY                       # staging
wrangler secret put STRIPE_SECRET_KEY --env production      # production
```

---

## CI/CD pipeline — GitHub Actions

### On pull request

```
push to PR branch
  └── GitHub Actions: qa.yml
        ├── npm ci
        ├── npx tsc --noEmit          (type check)
        ├── npx eslint src            (lint)
        └── npx vitest run            (unit tests)
              │
              ├── PASS → Cloudflare Pages creates preview URL automatically
              │          (via Pages GitHub integration — zero config)
              │
              └── FAIL → PR blocked, no deploy
```

Preview URL format: `https://<branch-slug>.water-ticket-platform.pages.dev`

The Worker backend is **not** separately deployed for PRs — the preview frontend points to the shared staging Worker. For 1–2 developers this is fine; if parallel PR testing of the backend is needed in future, `wrangler deploy --env staging` can be added as a PR step.

### On merge to `main`

```
merge to main
  └── GitHub Actions: deploy.yml
        ├── npm ci
        ├── npx tsc --noEmit
        ├── npx eslint src
        ├── npx vitest run
        │     │
        │     └── FAIL → deploy aborted, alert developer
        │
        ├── wrangler deploy --env production    (Worker)
        └── Cloudflare Pages auto-deploys       (frontend, via Git integration)
```

D1 migrations run as part of the deploy step:

```bash
wrangler d1 migrations apply water-ticket-production --env production
```

---

## GitHub Actions workflow files

### `.github/workflows/qa.yml` (runs on every PR)

```yaml
name: QA
on:
  pull_request:
    branches: [main]

jobs:
  qa:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npx tsc --noEmit
      - run: npx eslint src
      - run: npx vitest run
```

### `.github/workflows/deploy.yml` (runs on push to `main`)

```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npx tsc --noEmit
      - run: npx eslint src
      - run: npx vitest run
      - name: Deploy Worker
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: deploy --env production
      - name: Apply D1 migrations
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: d1 migrations apply water-ticket-production --env production
```

GitHub repository secrets required: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.

---

## QA checks

| Check | Tool | Blocks deploy? |
|---|---|---|
| Type safety | `tsc --noEmit` | Yes |
| Lint | ESLint | Yes |
| Unit tests | Vitest | Yes |
| Integration tests (future) | Vitest + Miniflare | Yes |
| E2E tests (future) | Playwright | Optional |

Integration tests using Miniflare (Cloudflare's local runtime emulator) can test the Worker handlers, D1 queries, and KV interactions without hitting real Cloudflare infrastructure. Add these once the core flows are stable.

---

## Provisioning a new environment (runbook)

When adding a second environment (e.g. promoting staging → production for the first time):

```bash
# 1. Create D1 database
wrangler d1 create water-ticket-production

# 2. Create KV namespace
wrangler kv namespace create sessions-production

# 3. Create R2 bucket
wrangler r2 bucket create vouchers-production

# 4. Paste the generated IDs into wrangler.toml [env.production] block

# 5. Set secrets for production
wrangler secret put STRIPE_SECRET_KEY --env production
wrangler secret put STRIPE_WEBHOOK_SECRET --env production
wrangler secret put RESEND_API_KEY --env production
wrangler secret put SESSION_SECRET --env production

# 6. Run initial migrations
wrangler d1 migrations apply water-ticket-production --env production

# 7. Deploy
wrangler deploy --env production
```

Total time to replicate an environment: ~15 minutes.
