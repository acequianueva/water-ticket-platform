# User Flows (Member-facing)

All pages are behind login. There are no public-facing routes.

---

## Flow 1: Login

**Route**: `/login`

1. Member enters community number + password
2. On success → Worker creates session token (128-bit random, 24h TTL) in KV → sets HttpOnly cookie → redirects to `/dashboard`
3. On failure → Spanish error message shown inline
4. After 5 failed attempts from the same IP within 15 minutes → 15-minute lockout (KV counter)

---

## Flow 2: Dashboard

**Route**: `/dashboard`

Displays after login:

- Member name and community number
- **Remaining hours** for the current season (large, prominent)
- "Comprar horas" button → `/comprar`
- Purchase history table: date | hours | amount | voucher code (link)

---

## Flow 3: Buy hours

**Route**: `/comprar`

1. Number picker: select 1–10 hours
2. Live total shown: `X horas × €12 = €Y`
3. "Pagar" button → initiates payment

**Stripe path**:
- Worker creates Stripe Checkout Session → browser redirects to Stripe hosted page
- On success: Stripe webhook fires → Worker creates `purchases` record + voucher code + sends emails → redirects to `/confirmacion?code=ACE-...`
- On cancel: user returned to `/comprar`

**Redsys path**:
- Worker builds signed `Ds_MerchantParameters` → form POST to Redsys hosted page
- On success: Redsys POSTs notification to Worker → Worker validates signature + creates record + sends emails → user redirected to `/confirmacion?code=ACE-...`
- On failure: user redirected to `/comprar` with error message

---

## Flow 4: Confirmation & voucher screen

**Route**: `/confirmacion?code=ACE-...` and permalink `/voucher/:code`

Displays:
- Member full name
- Community number
- Hours purchased
- Purchase date and time
- Voucher code — large, high-contrast, readable on a phone screen

Action buttons:
- **Imprimir** — triggers browser print (print-specific CSS hides nav/buttons)
- **Enviar por WhatsApp** — opens `wa.me/?text=...` deep link with pre-filled message containing the voucher details (no API required)
- **Enviar por email** — triggers the confirmation email to be re-sent (or opens `mailto:` with voucher text)

The voucher permalink `/voucher/:code` is accessible to the owner while logged in, so it can be bookmarked or reopened later.

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
        ├── /comprar
        │     └── [Stripe / Redsys payment page]
        │           └── /confirmacion?code=ACE-...
        └── /voucher/:code
```
