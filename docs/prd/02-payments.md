# Payment Gateway

## Cost model — assumptions

- ~400 hours sold per season ("several hundreds" stated by community head)
- Price per hour: €12
- Average purchase: 3 hours × €12 = €36
- Estimated transactions per season: ~133
- Total revenue per season: ~€4,800

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
| Apple Pay / Google Pay | Supported out of the box |
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
| Error messages | Generic bank error codes, not user-friendly |
| 3DS handling | Second full-page redirect — higher abandonment on mobile |
| Saved cards | Not supported |

---

## Comparison summary

| | Stripe | Redsys |
|---|---|---|
| Season cost (best case) | ~€105 | ~€47 (if monthly fee sunk) |
| Season cost (worst case) | ~€105 | ~€107 |
| Integration effort | ~1–2 days | ~4–6 days |
| UX quality | Excellent | Poor |
| Existing contract | No | Yes (Federico) |
| Abandonment risk | Low | Higher (mobile redirects) |

**Cost**: if the Caja Rural monthly fee is already paid regardless of this project, Redsys saves ~€58/season in transaction fees. If starting fresh, costs are roughly equal.

**UX**: Stripe is significantly better. Inline checkout, Apple/Google Pay, clean 3DS modal, and Spanish localisation reduce friction — especially for non-technical community members on mobile. Redsys involves two full-page redirects to a generic bank page, which increases abandonment and erodes trust on an unfamiliar community site.

**Recommendation for Federico**: present the UX gap as the primary argument. The €58/season saving from Redsys is ~€0.29 per user — not a meaningful cost advantage over a noticeably worse experience and a significantly harder build.

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
