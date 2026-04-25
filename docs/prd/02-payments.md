# Payment Gateway

## Cost model — assumptions

- ~400 hours sold per season ("several hundreds" stated by community head)
- Price per hour: €12
- Average purchase: 3 hours × €12 = €36
- Estimated transactions per season: ~133
- Total revenue per season: ~€4,800
- User base: ~55 members, predominantly Spanish bank cards (national rate applies)

---

## Option A — Stripe

| Item | Detail |
|---|---|
| Setup | €0 |
| Monthly fee | €0 |
| Per transaction | 1.5% + €0.25 (domestic EEA cards) |
| On avg €36 transaction | €0.79 |
| Season total (~133 tx) | **~€105** |
| Integration complexity | Low — REST API, official SDK, native Cloudflare Workers support |

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
| Per transaction | ~0.5–1.0% + €0.05–0.15 (bank-negotiated; use ~0.7% as estimate) |
| On avg €36 transaction | ~€0.35 |
| Season transaction fees | ~€47 |
| Monthly fee (3 active months) | €60 — or €0 if already a sunk cost |
| Season total | **€47–€107** |
| Integration complexity | High — HMAC-SHA256 parameter signing, Redsys redirect flow, 3DS redirect |

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
| On avg €36 transaction (national) | **~€0.16** |
| Season total — national cards (~133 tx) | **~€22** |
| Season total — mixed cards (est. 80% national) | **~€30** |
| Integration complexity | Medium — REST API, less mature SDK than Stripe |

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

**Why MONEI is relevant here**: almost all ~55 community members will hold Spanish bank cards, meaning virtually every transaction hits the 0.45% national rate — roughly 3× cheaper than Stripe per transaction.

---

## Summary comparison

| | Stripe | Redsys | MONEI |
|---|---|---|---|
| **Season cost — best case** | ~€105 | ~€47 (monthly fee sunk) | **~€22** |
| **Season cost — worst case** | ~€105 | ~€107 | **~€30** |
| **Cost per transaction (avg €36)** | €0.79 | €0.35–€0.50 | **€0.16** |
| **Setup cost** | €0 | €0–€150 | €0 |
| **Monthly fee** | €0 | €0–€20 | €0 |
| **Integration effort** | ~1–2 days | ~4–6 days | ~2–3 days |
| **Checkout UX** | Excellent | Poor | Good |
| **Apple Pay / Google Pay** | Yes | No | Yes |
| **Bizum (Spain)** | No | No | **Yes** |
| **3DS UX** | Inline modal | Full redirect | Inline modal |
| **SDK / docs quality** | Excellent | Poor | Adequate |
| **Existing contract** | No | Yes (Federico) | No |
| **Spain-optimised** | No | Yes (Redsys is Spanish) | **Yes** |
| **Abandonment risk** | Low | High | Low |

---

## Recommendation for Federico

**MONEI** offers the best combination of cost and UX for this specific deployment:
- At 0.45% for national cards, it is ~5× cheaper than Stripe per transaction (~€22 vs ~€105/season)
- It supports Apple Pay, Google Pay, and **Bizum** — the latter being the most widely used mobile payment method among Spanish consumers
- Modern inline checkout comparable in quality to Stripe
- No monthly fee, no setup cost

The only trade-off versus Stripe is a less mature developer ecosystem — MONEI's documentation and SDK are adequate but not as polished. For the narrow integration surface this project needs (one product, one checkout flow, one webhook), this is an acceptable trade-off.

**If Federico insists on Caja Rural**: the Redsys integration is feasible but adds ~3–4 extra developer days and delivers a significantly worse checkout experience.

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

Reference: [MONEI API docs](https://docs.monei.com)
