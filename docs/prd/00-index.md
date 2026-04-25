# Water Ticket Platform — PRD Index

## Summary

An open-source web platform for small agricultural water communities to sell and manage water-usage hour vouchers online. Community members purchase hour blocks via card payment, receive a digital voucher with a unique code, and present it to the pump operator when they want to use the water. The pump operator works from a weekly printed/emailed list — no app required.

Built generically so any irrigation community can deploy their own instance.

---

## Stakeholders

| Role | Person (reference deployment) | Responsibility |
|---|---|---|
| Community head | Federico | Requirements owner, payment contract holder |
| Admin employee | Goiatz | Enters weekly usage data, manages users and seasons |
| Pump operator | Francis | Receives weekly list, verifies users by phone recognition |
| Community members | ~55 users | Buy hours, use voucher codes when requesting water |
| Developer | — | Builds and maintains the platform |

---

## Open decisions (Federico must sign off before build)

- [ ] **Payment gateway**: Stripe vs Caja Rural TPV Virtual (Redsys). See [02-payments.md](./02-payments.md) for full cost and UX comparison.
- [ ] **Subdomain**: `tienda.acequianueva.com` or `compra.acequianueva.com`?
- [ ] **Acequia notification email**: confirm the address that receives a copy of every purchase.
- [ ] **Season dates**: confirm start and end dates for the first season to be loaded.

---

## Document map

| File | Contents |
|---|---|
| [01-product.md](./01-product.md) | Business rules, user stories (MoSCoW) |
| [02-payments.md](./02-payments.md) | Gateway comparison — cost, UX, integration |
| [03-architecture.md](./03-architecture.md) | Tech stack, Cloudflare services, SaaS evaluation |
| [04-data-model.md](./04-data-model.md) | Database schema, balance query, voucher codes |
| [05-user-flows.md](./05-user-flows.md) | Member-facing screens and journeys |
| [06-admin-flows.md](./06-admin-flows.md) | Goiatz admin panel, Francis weekly report, season management |
| [07-notifications.md](./07-notifications.md) | Email and WhatsApp notification strategy |
| [08-security-and-compliance.md](./08-security-and-compliance.md) | Auth, GDPR, infrastructure security |
