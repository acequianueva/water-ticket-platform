# Payment Gateway

## Cost model — assumptions

- ~400 hours sold per season
- Price per hour: €12
- Average purchase: 3 hours × €12 = €36
- Estimated transactions per season: ~133
- Total revenue per season: ~€4,800
- User base: ~55 members — predominantly Spanish bank cards, some British (non-EEA post-Brexit)

---

## UK / non-EEA cards — cost and legal note

Post-Brexit, UK-issued cards are treated as **international non-EEA** by all processors. This has two implications:

**Higher fees**: the EU interchange cap no longer applies to UK cards, so processors charge more:

| Gateway | Spanish card | EU card | UK / non-EEA card |
|---|---|---|---|
| Stripe | 1.5% + €0.25 | 1.5% + €0.25 | **3.0% + €0.25** (+1.5% international surcharge) |
| Redsys | ~0.7% + €0.10 | ~0.7% + €0.10 | ~1.5–2.0% (bank-negotiated) |
| MONEI | 0.45% | 1.65% | **2.95%** |

On a €36 transaction with a UK card:
- Stripe: ~**€1.33**
- Redsys: ~**€0.65** (bank-negotiated; cheaper but adds full-page redirect friction)
- MONEI: ~**€1.06**

**Cannot surcharge UK members**: EU PSD2 prohibits merchants in Spain from adding a surcharge for any card payment regardless of origin. British community members cannot legally be charged a higher price. The fee difference is absorbed by the community — at this scale (~few British members) it is negligible.

---

## Option A — Stripe

| Item | Detail |
|---|---|
| Setup | €0 |
| Monthly fee | €0 |
| Per transaction (EEA cards) | 1.5% + €0.25 |
| Per transaction (UK / non-EEA) | 3.0% + €0.25 |
| On avg €36 transaction (Spanish) | €0.79 |
| On avg €36 transaction (UK) | €1.33 |
| Season total — all Spanish cards | ~€105 |
| Season total — mixed incl. some UK | ~€110 |
| Integration complexity | Low — REST API, official SDK, native Cloudflare Workers support |
| **Sandbox / test environment** | **Excellent** — instant test mode toggle in dashboard, unlimited test API keys (`sk_test_...`), full suite of test card numbers, webhook testing via Stripe CLI, no time limit |

**UX**

| Dimension | Stripe |
|---|---|
| Checkout page | Polished, mobile-optimised, on-brand |
| Card form | Inline — user never leaves the app |
| Apple Pay / Google Pay | Supported out of the box, same rate |
| Bizum | Not supported |
| Error messages | Clear, user-friendly, Spanish localised |
| 3DS handling | Seamless inline modal, no full-page redirect |
| Saved cards | Optional — reduces friction on repeat purchases |

---

## Option B — Caja Rural TPV Virtual (Redsys)

| Item | Detail |
|---|---|
| Setup | ~€150 one-time (likely waived — existing contract) |
| Monthly fee | ~€20/month if monthly billing exceeds €300 |
| Per transaction (Spanish cards) | ~0.5–1.0% + €0.05–0.15 (bank-negotiated; ~0.7% estimate) |
| Per transaction (UK / non-EEA) | ~1.5–2.0% (bank-negotiated international rate) |
| On avg €36 transaction (Spanish) | ~€0.35 |
| Season transaction fees | ~€47–€107 |
| Integration complexity | High — HMAC-SHA256 parameter signing, Redsys redirect flow, 3DS redirect |
| **Sandbox / test environment** | **Poor** — test account must be manually created, expires after **7 days**, separate test portal URL, test cards provided but limited; no CLI tooling |

**UX**

| Dimension | Redsys |
|---|---|
| Checkout page | Full-page redirect to dated bank-hosted page |
| Card form | Separate domain — breaks the flow, can feel untrustworthy |
| Apple Pay / Google Pay | Not supported |
| Bizum | Not supported |
| Error messages | Generic bank error codes, not user-friendly |
| 3DS handling | Second full-page redirect — higher abandonment on mobile |
| Saved cards | Not supported |

---

## Option C — MONEI

Spanish-founded payment gateway, specifically optimised for the Spanish market. PCI DSS Level 1 compliant.

| Item | Detail |
|---|---|
| Setup | €0 |
| Monthly fee | €0 |
| Per transaction (national Spanish cards) | 0.45% |
| Per transaction (EU international cards) | 1.65% |
| Per transaction (UK / non-EEA cards) | 2.95% |
| On avg €36 transaction (Spanish) | ~€0.16 |
| On avg €36 transaction (UK) | ~€1.06 |
| Season total — all Spanish cards | ~€22 |
| Season total — mixed incl. some UK | ~€30 |
| Integration complexity | Medium — REST API, Node.js SDK available, less mature than Stripe |
| **Sandbox / test environment** | **Good** — test mode toggle in dashboard, separate test API keys (`pk_test_...`), test card numbers with fixed expiry (12/34), test webhooks supported; no time limit |

**UX**

| Dimension | MONEI |
|---|---|
| Checkout page | Modern, customisable, mobile-optimised |
| Card form | Inline/hosted, clean design |
| Apple Pay / Google Pay | Supported |
| Bizum | Supported — dominant Spanish mobile payment method |
| Error messages | Reasonable, improving |
| 3DS handling | Inline modal (3DS 2.0) |
| Saved cards | Not supported in v1 |

---

## Summary comparison

| | Stripe | Redsys | MONEI |
|---|---|---|---|
| **Season cost — Spanish cards only** | ~€105 | ~€47–€107 | **~€22** |
| **Season cost — mixed incl. UK** | ~€110 | ~€55–€115 | **~€30** |
| **Gateway fee on a €36 purchase (Spanish card)** — what the gateway keeps | €0.79 | €0.35–€0.50 | **€0.16** |
| **Gateway fee on a €36 purchase (UK card)** — what the gateway keeps | €1.33 | ~€0.65 | €1.06 |
| **Community receives per €36 purchase (Spanish card)** | €35.21 | €35.50–€35.65 | **€35.84** |
| **Community receives per €36 purchase (UK card)** | €34.67 | ~€35.35 | €34.94 |
| **Setup cost** | €0 | €0–€150 | €0 |
| **Monthly fee** | €0 | €0–€20 | €0 |
| **Integration effort** | ~1–2 days | ~4–6 days | ~2–3 days |
| **Checkout UX** | Excellent | Poor | Good |
| **Apple Pay / Google Pay** | Yes | No | Yes |
| **Bizum (Spain)** | No | No | **Yes** |
| **3DS UX** | Inline modal | Full redirect | Inline modal |
| **SDK / docs quality** | Excellent | Poor | Adequate |
| **Sandbox / test environment** | **Excellent** | Poor (7-day expiry) | **Good** |
| **Existing contract** | No | Yes (Federico) | No |
| **Spain-optimised** | No | Yes | **Yes** |
| **Non-EEA (UK) card support** | Yes, at higher rate | Yes, at higher rate | Yes, at higher rate |
| **Can surcharge non-EEA members** | No (illegal in ES) | No (illegal in ES) | No (illegal in ES) |
| **Abandonment risk** | Low | High | Low |

---

## Recommendation for Federico

**MONEI** remains the best fit:
- Cheapest for the majority of transactions (0.45% for Spanish cards)
- British members cost slightly more to process (~€1.06 per €36 tx) — comparable to Stripe and unavoidable under EU law
- Good test/sandbox environment for development
- Bizum support, modern checkout UX, no monthly fees

**Stripe** is the best choice if developer experience is the priority — its sandbox tooling (Stripe CLI, instant test mode, webhook replay) is significantly better than MONEI's and will save development time, particularly for testing the payment→voucher→email flow end-to-end.

**Redsys** sandbox is the weakest — 7-day test accounts are a material obstacle for iterative development and future maintenance.

**Decision required from Federico before build begins.**

---

## Integration overview

### Stripe path
1. User selects hours → Worker creates a Stripe Checkout Session with line item
2. User completes payment on Stripe-hosted (or embedded) checkout
3. Stripe fires `payment_intent.succeeded` webhook to Worker
4. Worker verifies `stripe-signature` header, creates purchase record, generates voucher, sends emails
5. User redirected to `/confirmacion?code=ACE-...`

### Redsys path
1. User selects hours → Worker builds `Ds_MerchantParameters` (Base64 JSON), signs with HMAC-SHA256
2. Form POST redirects user to Redsys hosted page
3. Redsys POSTs notification to merchant URL and redirects user back
4. Worker validates response signature, creates purchase record, generates voucher, sends emails
5. User lands on success/failure page

Reference: [Redsys integration notes](https://github.com/anibalsanchez/Notas-Integracion-Redsys-TPV-Virtual)

### MONEI path
1. User selects hours → Worker creates a MONEI Payment via REST API
2. User completes payment on MONEI-hosted checkout (or embedded component)
3. MONEI fires webhook to Worker on payment completion
4. Worker verifies webhook signature, creates purchase record, generates voucher, sends emails
5. User redirected to `/confirmacion?code=ACE-...`

Reference: [MONEI API docs](https://docs.monei.com) · [MONEI test mode](https://docs.monei.com/testing/)

---

## Redsys TPV Virtual — official documentation

- **Developer portal**: https://pagosonline.redsys.es/desarrolladores-inicio/documentacion-operativa/autorizacion/
- **Signing algorithm**: https://pagosonline.redsys.es/desarrolladores-inicio/documentacion-operativa/firmar-una-operacion/

### Key conclusions from reading the official documentation

- The current Redsys signing standard is **`HMAC_SHA512_V2`** (not `HMAC_SHA256_V1` as described earlier in this PRD). The older `HMAC_SHA256_V1` scheme is documented in a migration guide PDF but is superseded.
- `Ds_MerchantParameters` must be encoded as **base64URL** (no `+`, `/`, or `=`), not standard base64.
- `Ds_Signature` is also **base64URL**.
- Key derivation: take the **first 16 characters** of the merchant secret key (right-padded with zeros if shorter); use those as the AES-128-CBC key (zero IV) to encrypt the order number (zero-padded to 16-byte multiple). The AES output is **base64-encoded** and that base64 string is used as the HMAC-SHA512 key.
- The merchant secret key stored in Cloudflare is used **raw** (not base64-decoded) — only its first 16 characters matter for key derivation.
- Integration type: **redirection** (HTTP POST form to the Redsys hosted page). Does not require PCI DSS certification.
- Test URL: `https://sis-t.redsys.es:25443/sis/realizarPago`
- Live URL: `https://sis.redsys.es/sis/realizarPago`

---

## Redsys TPV Virtual — concrete implementation (v1, credit/debit card only)

**Decision**: Redsys via Federico's existing Caja Rural contract. v1 supports credit/debit card only. Apple Pay and Google Pay are deferred to v2 (see below).

### Prerequisites (before writing code)

- [ ] Federico confirms TPV Virtual is active on the Caja Rural contract
- [ ] Obtain from Caja Rural: `Ds_Merchant_MerchantCode`, `Ds_Merchant_Terminal`, and the HMAC_SHA512_V2 secret key
- [ ] Request test/sandbox credentials (7-day window — coordinate with sprint start)
- [ ] Confirm the live and test TPV URLs with Caja Rural:
  - Test: `https://sis-t.redsys.es:25443/sis/realizarPago`
  - Live: `https://sis.redsys.es/sis/realizarPago`
- [ ] Store all credentials in Cloudflare Workers Secrets (see [Secrets management](#secrets-management) below)

### Step 1 — Build the payment request (Worker, `POST /api/pay`)

The frontend POSTs `{ hours: number }` to the Worker. The Worker:

1. Looks up the authenticated user from the session cookie
2. Computes `amount = hours × 1200` (Redsys amounts are in cents with no decimal separator — €12.00 → `1200`)
3. Generates a unique `Ds_Merchant_Order`: 12-char alphanumeric, must start with 4 digits — use `YYYYMMDD` + 4 random chars, e.g. `20260615R4TK`
4. Builds the merchant parameters JSON:

```json
{
  "DS_MERCHANT_AMOUNT": "1200",
  "DS_MERCHANT_ORDER": "20260615R4TK",
  "DS_MERCHANT_MERCHANTCODE": "<from secret>",
  "DS_MERCHANT_CURRENCY": "978",
  "DS_MERCHANT_TRANSACTIONTYPE": "0",
  "DS_MERCHANT_TERMINAL": "<from secret>",
  "DS_MERCHANT_MERCHANTURL": "https://tienda.acequianueva.com/api/redsys/notify",
  "DS_MERCHANT_URLOK": "https://tienda.acequianueva.com/confirmacion",
  "DS_MERCHANT_URLKO": "https://tienda.acequianueva.com/buy?error=payment_failed"
}
```

5. Base64URL-encodes the JSON → `Ds_MerchantParameters`
6. Signs with HMAC_SHA512_V2:
   - AES key = first 16 chars of merchant secret (zero-padded to 16 bytes)
   - Derive order key: AES-128-CBC(order zero-padded to 16 bytes, key=above, IV=zeros) → base64-encode the result
   - Signature: HMAC-SHA512(`Ds_MerchantParameters`, derived key) → base64URL → `Ds_Signature`
7. Returns `{ Ds_MerchantParameters, Ds_SignatureVersion: "HMAC_SHA512_V2", Ds_Signature, tpvUrl }` to the frontend

The frontend auto-submits a hidden HTML form POST to `tpvUrl` — the browser redirects to the Redsys hosted page.

### Step 2 — Server-to-server notification handler (Worker, `POST /api/redsys/notify`)

This endpoint is called by Redsys after payment, independently of the browser. It must respond `200 OK` quickly.

1. Parse `Ds_MerchantParameters`, `Ds_Signature`, `Ds_SignatureVersion` from the POST body (URL-encoded form)
2. **Validate signature**: re-derive the key from `Ds_Merchant_Order` inside the decoded parameters, recompute HMAC-SHA256 — reject with `400` if it does not match
3. Decode `Ds_MerchantParameters` (Base64 → JSON)
4. Check `Ds_Response`: values `0000`–`0099` are approved; anything else is a declined or error state — log and return `200` without writing to DB
5. Check for duplicate: look up `purchases.payment_ref = Ds_Merchant_Order` — if found, return `200` (idempotent)
6. Resolve the user: look up the pending order (stored in KV at step 1 keyed by `Ds_Merchant_Order`) to get `user_id`, `season_id`, `hours`
7. In a single D1 transaction:
   - Insert into `purchases` (`user_id`, `season_id`, `hours`, `amount_eur`, `payment_ref = Ds_Merchant_Order`, `voucher_code`)
   - Generate `voucher_code` (`ACE-YYYYMMDD-XXXXXX`) — retry on unique constraint collision
8. Dispatch emails via Resend (member confirmation + admin copy) — fire-and-forget; do not block the 200 response
9. Return `200 OK`

**Pending order in KV**: at step 1, before returning to the frontend, write a KV entry:
```
key:   redsys:order:<Ds_Merchant_Order>
value: { userId, seasonId, hours, amountEur }
TTL:   1 hour
```
The notification handler reads this to resolve which user the order belongs to. Delete the key after a successful insert.

### Step 3 — Browser return URLs

`DS_MERCHANT_URLOK` (`/confirmacion`) and `DS_MERCHANT_URLKO` (`/buy?error=...`) are browser redirects only — Redsys may append query parameters but these must **not** be used to confirm payment. The DB write happens exclusively in the notification handler.

On `/confirmacion`:
- The Worker queries D1 for the most recent purchase for the logged-in user (or accepts a `?order=` param matched against `payment_ref`)
- If found, renders the voucher screen
- If not yet found (notification handler still in flight), poll once after 1 second then show the voucher or an error

### Step 4 — Error and edge cases

| Scenario | Handling |
|---|---|
| User closes browser before Redsys redirects back | Notification handler still fires → purchase is written; user sees it on dashboard next login |
| Notification arrives before `DS_MERCHANT_URLOK` redirect | Idempotency check in step 2.5 handles duplicate notifications |
| `Ds_Response` outside 0000–0099 | Log the code, do not write purchase, user sees error page |
| KV pending-order entry expired (>1h) | Log, return `200`, do not write purchase — should not happen in normal flow |
| Network error sending emails | Log, do not block `200` response; admin can resend manually from dashboard |

### Step 5 — Testing against Redsys sandbox

> Sandbox credentials expire after **7 days** — request them at the start of the integration sprint and complete testing within that window.

Test flow:
1. Use the test TPV URL (`sis-t.redsys.es`)
2. Use Redsys-provided test card numbers (Visa `4548812049400004`, any future expiry, CVV `123`)
3. Verify the full round-trip: form POST → hosted page → notification → DB insert → email → confirmation screen
4. Test declined card: use `Ds_Response` outside approved range
5. Test duplicate notification: POST the same notification twice, confirm idempotency

---

## Secrets management

All credentials are stored in **Cloudflare Workers Secrets** — never in code, `.env` files, or `wrangler.toml`. Secrets are encrypted at rest and injected into the Worker at runtime as environment variables.

### Required secrets

| Secret name | Value |
|---|---|
| `REDSYS_SECRET_KEY-SHA_512` | HMAC_SHA512_V2 signing key provided by Caja Rural |
| `REDSYS_MERCHANT_CODE` | Merchant code from TPV contract |
| `REDSYS_TERMINAL` | Terminal number from TPV contract |
| `RESEND_API_KEY` | Resend API key for transactional email |
| `SESSION_SECRET` | 32-byte random hex — used to sign session tokens |

### Setting secrets (Wrangler CLI)

```bash
# Set each secret interactively (value is never echoed to the terminal)
wrangler secret put REDSYS_SECRET_KEY
wrangler secret put REDSYS_MERCHANT_CODE
wrangler secret put REDSYS_TERMINAL
wrangler secret put RESEND_API_KEY
wrangler secret put SESSION_SECRET

# Verify (lists names only — values are never returned)
wrangler secret list
```

Secrets are scoped per environment. Use a separate set for `staging` vs `production`:

```bash
wrangler secret put REDSYS_SECRET_KEY --env staging
wrangler secret put REDSYS_SECRET_KEY --env production
```

### Local development

For local `vite dev` (Miniflare), secrets go in a `.dev.vars` file at the project root:

```
REDSYS_SECRET_KEY=<test key from Caja Rural sandbox>
REDSYS_MERCHANT_CODE=<test merchant code>
REDSYS_TERMINAL=<test terminal>
RESEND_API_KEY=<test key>
SESSION_SECRET=<any 32-byte hex string>
```

`.dev.vars` is gitignored. Never commit it. Each developer generates their own `SESSION_SECRET` locally:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Accessing secrets in the Worker

Secrets are available on the `env` object passed to every Hono handler:

```typescript
app.post('/api/pay', async (c) => {
  const { REDSYS_SECRET_KEY, REDSYS_MERCHANT_CODE, REDSYS_TERMINAL } = c.env
  // ...
})
```

Type them in `worker-configuration.d.ts` (generated by `wrangler types`):

```typescript
interface Env {
  REDSYS_SECRET_KEY: string
  REDSYS_MERCHANT_CODE: string
  REDSYS_TERMINAL: string
  RESEND_API_KEY: string
  SESSION_SECRET: string
  DB: D1Database
  KV: KVNamespace
  R2: R2Bucket
}
```

---

## Deferred: Apple Pay and Google Pay (v2)

Both wallet methods are supported by Redsys TPV Virtual but require additional setup before they can be used. Deferred from v1 to keep the initial build focused.

### Apple Pay — additional requirements

- Apple Developer account + Merchant ID registration
- Two certificates generated via OpenSSL and uploaded to Apple Developer console:
  - **Merchant Identity Certificate** (RSA 2048) — used for server-side merchant validation
  - **Payment Processing Certificate** (EC key) — used to decrypt the payment token
- Domain verification: host Apple's `.well-known` verification file under `tienda.acequianueva.com`
- The `ApplePaySession` JS API handles button rendering and user authentication in the browser
- Server-side: Worker calls Apple's merchant validation URL, then forwards the session to the browser
- Token (`DS_XPAYDATA` in hex, `DS_XPAYTYPE = "Apple"`, `DS_XPAYORIGEN = "WEB"`) sent to Redsys instead of card data
- Button only shown on Apple devices/browsers — falls back silently to card form elsewhere

### Google Pay — additional requirements

- Google Pay Business Console registration and approval
- `DS_XPAYTYPE = "Google"` with equivalent token parameters
- `PaymentRequest` JS API or Google Pay JS library for button and token acquisition
- Similar server-side token forwarding to Redsys

Both paths converge at the Redsys notification handler (Step 2 above) — the signature validation and DB write logic is identical.
