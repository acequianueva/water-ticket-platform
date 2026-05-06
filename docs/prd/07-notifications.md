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

### v1 — Member voucher sharing (wa.me deep links, no API required)

On the voucher screen, the "Share via WhatsApp" button opens:

```
https://wa.me/?text=Hello%20Francis%2C%20this%20is%20[name]%20(no.%20[community_no]).%0AMy%20voucher%20code%3A%20ACE-XXXXXX%0AHours%3A%20X
```

This opens WhatsApp with a pre-filled message. The member sends it to Francis (or saves it for reference). No WhatsApp Business API account required.

### v1 — Weekly report to Francis via WhatsApp (automated)

The Wednesday 9pm cron also sends the open-hours list to Francis's WhatsApp number via the WhatsApp Business API (Meta Cloud API). This is a v1 requirement (US-07) — Francis must receive the report via WhatsApp, not only email.

- Worker calls Meta Cloud API REST endpoint after sending the email
- Message: the same plain-text report table sent in the email
- Meta Cloud API free tier: 1,000 user-initiated conversations/month — sufficient for this scale
- Requires a verified WhatsApp Business account and phone number set up before v1 launch

### v1.5 — Automated balance-update notifications (deferred)

When there is capacity for broader WhatsApp notifications:

- Balance-update notification after usage is recorded: "Hello [name], X hours have been recorded. You have Y hours remaining this season."
- Users must have opted in (phone number stored in `users.phone`).

Deferred to v1.5 to limit WhatsApp API scope at launch — only the weekly report to Francis requires v1 API setup.

---

## Notification summary by version

| Notification | v1 | v1.5 |
|---|---|---|
| Purchase confirmation email | Yes | Yes |
| Voucher WhatsApp share (manual, wa.me) | Yes | Yes |
| Usage update email to member | Yes | Yes |
| Weekly report email to Francis + Goiatz | Yes | Yes |
| Welcome email to new user | Yes | Yes |
| Weekly report WhatsApp to Francis (automated) | Yes | Yes |
| Balance update WhatsApp to member | No | Yes |
