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
