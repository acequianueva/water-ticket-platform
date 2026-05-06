# User Flows (Member-facing)

All pages are behind login. There are no public-facing routes.

---

## Flow 1: Login

**Route**: `/login`

1. Member enters community number + password
2. On success → Worker creates session token (128-bit random, 24h TTL) in KV → sets HttpOnly cookie → redirects to `/dashboard`
3. On failure → error message shown inline
4. After 5 failed attempts from the same IP within 15 minutes → 15-minute lockout (KV counter)

**Passwordless option (open decision)**: instead of a password, the system can send a one-time magic link to the member's email or WhatsApp number. Reduces support burden (no forgotten passwords in a non-technical community). Trade-off: member must have access to their registered email or phone at login time. Evaluate before build — either path works with the same session model.

---

## Flow 2: Dashboard

**Route**: `/dashboard`

Displays after login:

- Member name and community number
- **Remaining hours** for the current season (large, prominent)
- "Buy hours" button → `/buy`
- Purchase history table: date | hours | amount | voucher code (link)

---

## Flow 3: Buy hours

**Route**: `/buy`

1. Number picker: select 1–10 hours
2. Live total shown: `X hours × €12 = €Y`
3. "Pay" button → initiates payment

**Stripe path**:
- Worker creates Stripe Checkout Session → browser redirects to Stripe hosted page
- On success: Stripe webhook fires → Worker creates `purchases` record + voucher code + sends emails → redirects to `/confirmation?code=ACE-...`
- On cancel: user returned to `/buy`

**Redsys path**:
- Worker builds signed `Ds_MerchantParameters` → form POST to Redsys hosted page
- On success: Redsys POSTs notification to Worker → Worker validates signature + creates record + sends emails → user redirected to `/confirmation?code=ACE-...`
- On failure: user redirected to `/buy` with error message

**MONEI path**:
- Worker creates a MONEI Payment via REST API → browser redirects to MONEI hosted checkout (or embedded component)
- On success: MONEI webhook fires → Worker verifies signature + creates `purchases` record + voucher code + sends emails → redirects to `/confirmation?code=ACE-...`
- On cancel/failure: user returned to `/buy` with error message

---

## Flow 4: Confirmation & voucher screen

**Route**: `/confirmation?code=ACE-...` and permalink `/voucher/:code`

Displays:
- Member full name
- Community number
- Hours purchased in this transaction
- **Total remaining hours** for the current season (purchased − used)
- Purchase date and time
- Voucher code — large, high-contrast, readable on a phone screen

Action buttons:
- **Print** — triggers browser print (print-specific CSS hides nav/buttons)
- **Share via WhatsApp** — opens `wa.me/?text=...` deep link with pre-filled message containing the voucher details (no API required)
- **Send by email** — triggers the confirmation email to be re-sent (or opens `mailto:` with voucher text)

The voucher permalink `/voucher/:code` is accessible to the owner while logged in, so it can be bookmarked or reopened later.

**Worker → WhatsApp**: in v1, WhatsApp sharing is member-initiated via `wa.me` deep links — no Worker API call needed. In v1.5, the Worker sends automated notifications directly via the Meta Cloud API (a standard REST call from a Cloudflare Worker); no infrastructure change is required, only Meta account setup.

---

## Flow 5: View a past voucher

**Route**: `/voucher/:code`

- Only accessible if the logged-in user owns the voucher code
- Shows the same voucher screen as Flow 4
- Useful for retrieving a code before calling Francis

---

## Screen map

```
/login
  └── /dashboard
        ├── /buy
        │     └── [Stripe / Redsys / MONEI payment page]
        │           └── /confirmation?code=ACE-...
        └── /voucher/:code
```
