# Security and Compliance

## Authentication

- Passwords hashed with **bcrypt**, cost factor 12
- Session tokens: **128-bit cryptographically random**, stored in Cloudflare KV with 24-hour TTL
- Session cookie: `HttpOnly`, `Secure`, `SameSite=Strict`
- Login rate limiting: 5 failed attempts per IP per 15 minutes → temporary lockout (KV counter, auto-expires)
- No "remember me" / persistent sessions in v1

---

## Authorisation

- Every API route checks the session cookie server-side before responding
- Admin routes additionally check `users.role = 'admin'`
- A member cannot access another member's vouchers, purchase history, or balance

---

## Payment security

**Stripe**:
- Webhook endpoint verifies the `Stripe-Signature` header using the webhook signing secret before processing any event
- No card data is ever sent to or stored by the application

**Redsys**:
- Notification endpoint validates the HMAC-SHA256 signature on `Ds_Signature` before processing
- No card data is ever sent to or stored by the application

Both gateways are PCI-DSS compliant on their side; the application has no PCI scope.

---

## Infrastructure security

- All traffic over HTTPS — Cloudflare terminates TLS (minimum TLS 1.2)
- D1 database is only accessible from Workers; not publicly exposed
- Secrets (Stripe API key, Resend API key, session secret) stored in **Cloudflare Workers Secrets** — never in code or environment files
- `.env` and `.env.*` files are gitignored
- Admin panel served at the same domain but all routes protected server-side (no security by obscurity)

---

## GDPR (Reglamento General de Protección de Datos)

**Data controller**: the acequia community organisation (Federico's entity).

**Data processed**:
| Field | Purpose | Retention |
|---|---|---|
| Name | Identify buyer on voucher and reports | Duration of membership |
| Email | Send purchase confirmations and notifications | Duration of membership |
| Phone | WhatsApp notifications (v1.5) | Duration of membership |
| Community number | Login credential, report identifier | Duration of membership |
| Purchase history | Record of transactions | 5 years (Spanish fiscal law — Ley 58/2003) |
| Usage entries | Balance tracking | Duration of season + 1 year |

**Legal basis**: contractual necessity — users are community members who have agreed to the community's terms of service.

**Rights**:
- Right of access: admin can export a user's data on request
- Right to erasure: admin can deactivate account and anonymise personal data (name → "Usuario eliminado", email/phone → null) while retaining purchase records required for fiscal compliance
- No automated decision-making or profiling

**Required before launch**:
- [ ] Privacy policy page linked from login screen
- [ ] Confirm data controller legal entity with Federico
- [ ] Inform CSV-imported users of data processing via welcome email

---

## Open-source considerations

When other communities deploy this platform:
- Each deployment is its own data controller
- Community must provide its own privacy policy
- Secrets (API keys, session secret) must be generated fresh per deployment — never shared or committed
- The repository must not contain any real user data from any deployment
