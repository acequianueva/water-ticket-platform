# Product Requirements

## Business rules

- Closed community: ~55 registered users. No public sign-up.
- Single product: **1-hour block at €12**. Minimum 1, maximum 10 per transaction.
- Hours are valid within the current season only — they expire at season end.
- Pump operates **Friday to Sunday**. The platform must be available 24/7 for purchases.
- Proof of purchase is a **voucher code**. Francis (pump operator) trusts caller identity by recognising their phone number — no app or QR scan required.
- Usage is always consumed in **whole-hour increments**.
- No partial refunds or hour splitting.

---

## User stories

### Must (v1)

| ID | As a… | I want to… | So that… |
|---|---|---|---|
| US-01 | Member | Log in with my community number and password | I can access the purchase portal |
| US-02 | Member | Buy 1–10 hours, pay by card, and receive a confirmation | I have water hours available for the season |
| US-03 | Member | Receive a voucher with a unique code, my name, hours, and date | I can show it to Francis when I request water |
| US-04 | Member | Share my voucher via WhatsApp or email directly from the browser | Francis or I can refer back to it easily |
| US-05 | Member | See my remaining hour balance on my dashboard | I know how many hours I have left without calling Goiatz |
| US-06 | Admin (Goiatz) | Enter weekly usage from Francis's WhatsApp/call report | The system balance stays accurate |
| US-07 | System | Auto-generate a Wednesday 9pm report of open hours per user and email it to Francis and Goiatz | Francis always has an up-to-date list for the weekend |
| US-08 | System | Send a copy of every purchase to the acequia email address | The community keeps a record of all transactions |
| US-09 | Admin (Goiatz) | Import users from a CSV file at season start | All 55 members are onboarded in one step |

### Should (v1)

| ID | As a… | I want to… | So that… |
|---|---|---|---|
| US-10 | Member | Receive an email notification when my balance is updated | I know how many hours remain after each usage entry |
| US-11 | Admin (Goiatz) | Open and close a season | Hours correctly expire and the new season starts cleanly |
| US-12 | Admin (Goiatz) | Add or deactivate a single user via the admin UI | Rare mid-season changes don't require developer access |

### Won't (v1)

| ID | Decision |
|---|---|
| US-13 | Francis does not need any app — the emailed weekly list is sufficient |
| US-14 | No public-facing pages; the entire site is behind login |
| US-15 | No WhatsApp-automated balance notifications in v1 (deferred to v1.5 — see notifications doc) |
| US-16 | No partial-hour purchases (Federico confirmed: hours only, no 30-min blocks) |
