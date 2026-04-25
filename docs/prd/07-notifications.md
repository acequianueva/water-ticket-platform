# Notifications

## Email (v1 — via Resend)

All transactional email is sent from `no-reply@acequianueva.com` using [Resend](https://resend.com).

**Why Resend**: simple REST API, works natively from Cloudflare Workers (no Node.js SMTP dependencies), free tier covers 3,000 emails/month — well above the ~55 users × low frequency this system generates.

### Triggered events

| Trigger | Recipient(s) | Content |
|---|---|---|
| Purchase complete | Member + acequia admin email | Voucher code, hours purchased, amount paid, date, link to voucher permalink |
| Usage recorded (Goiatz saves an entry) | Affected member | "Se han registrado X horas el [date]. Te quedan Y horas esta temporada." |
| Wednesday 9pm cron | Francis + Goiatz | Weekly open-hours list (HTML table + plain text) |
| New user created (import or manual) | New member | Welcome message, temporary password, login URL |

### Email templates (Spanish, plain HTML)

All templates must include:
- Community name/logo
- Clear subject line
- Unsubscribe not required (transactional, not marketing)
- Footer with community contact

---

## WhatsApp

### v1 — wa.me deep links (no API required)

On the voucher screen, the "Enviar por WhatsApp" button opens:

```
https://wa.me/?text=Hola%20Francis%2C%20soy%20[name]%20(nº%20[community_no]).%0AMi%20código%20de%20reserva%3A%20ACE-XXXXXX%0AHoras%3A%20X
```

This opens WhatsApp with a pre-filled message. The member sends it to Francis (or saves it for reference). No WhatsApp Business API account required.

Goiatz can also forward the Wednesday weekly report email to Francis via WhatsApp manually in v1.

### v1.5 — Automated WhatsApp notifications (deferred)

When there is capacity to set up WhatsApp Business API (Meta Cloud API):

- Balance-update notification after Goiatz records usage: "Hola [name], se han registrado X horas. Te quedan Y horas esta temporada."
- Meta Cloud API free tier: 1,000 user-initiated conversations/month — sufficient for this scale.
- Requires a verified WhatsApp Business account and phone number.
- Users must have opted in (phone number stored in `users.phone`).

Defer to v1.5 to avoid blocking the v1 build on Meta account verification.

---

## Notification summary by version

| Notification | v1 | v1.5 |
|---|---|---|
| Purchase confirmation email | Yes | Yes |
| Voucher WhatsApp share (manual, wa.me) | Yes | Yes |
| Usage update email to member | Yes | Yes |
| Weekly report email to Francis + Goiatz | Yes | Yes |
| Welcome email to new user | Yes | Yes |
| Balance update WhatsApp to member | No | Yes |
| Weekly report WhatsApp to Francis (automated) | No | Yes |
