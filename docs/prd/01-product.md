# Product Requirements

## Business rules

- Closed community: ~55 registered users. No public sign-up.
- Single product: **1-hour block at €12**. Minimum 1, maximum 10 per transaction.
- Hours are valid within the current season only — they expire at season end.
- Pump operates **daily**. The platform must be available 24/7 for purchases.
- Usage is always consumed in **whole-hour increments**.
- No partial refunds or hour splitting.
- The system must generate sufficient email and WhatsApp records so that if the platform goes offline, the community can continue operating manually from those records alone.

---

## User stories

### Must (v1)

| ID | As a… | I want to… | So that… |
|---|---|---|---|
| US-01 | Member | Log in with my community number | I can access the purchase portal |
| US-02 | Member | Buy 1–10 hours, pay by card, and receive a confirmation | I have water hours available for the season |
| US-03 | Member | Receive a voucher with my name, hours purchased, total remaining hours, date, and unique code | I can show it to the operator when I request water |
| US-04 | Member | Share my voucher via WhatsApp or email directly from the browser | The operator or I can refer back to it easily |
| US-05 | Member | See my remaining hour balance on my dashboard | I know how many hours I have left |
| US-06 | Operator (Francis) | View a member's available balance and record hours used in real time from my phone | Usage is logged live without going through Goiatz |
| US-07 | System | Send the weekly open-hours list every Wednesday at 9pm via both email and WhatsApp to Francis and Goiatz | Francis always has an up-to-date list and an offline backup going into the weekend |
| US-08 | System | Send a copy of every purchase to the acequia admin email and WhatsApp | The community keeps a full transaction record that works even if the system is down |
| US-09 | Admin (Goiatz) | Import users from a CSV file at season start | All members are onboarded in one step |
| US-10 | Admin (Goiatz) | Record an in-office sale (paid via the office card terminal) as a purchase on a user's account | Members who pay in person get their hours credited without using the online store |

### Should (v1)

| ID | As a… | I want to… | So that… |
|---|---|---|---|
| US-11 | Member | Receive an email (and WhatsApp if configured) notification when my balance is updated | I know my remaining hours after each usage entry |
| US-12 | Admin (Goiatz) | Open and close a season | Hours correctly expire and the new season starts cleanly |
| US-13 | Admin (Goiatz) | Add or deactivate a single user via the admin UI | Rare mid-season changes don't require developer access |
| US-14 | Admin (Goiatz) | View a full event log — all purchases and usages globally and per user, with timestamps | I have an audit trail and can resolve disputes |

### Won't (v1)

| ID | Decision |
|---|---|
| US-15 | No public-facing pages — the entire site is behind login |
| US-16 | No partial-hour purchases (whole hours only) |

---

## Operator flow options (Francis)

Two options for how Francis records usage. Both are technically feasible; the final choice depends on Francis's comfort level and is an open decision before build.

**Option A — Mobile web form (simpler to build)**
Francis opens a mobile-friendly URL (`/operator`), sees a list of members with current balances, selects a member, enters hours used, and saves. No app install — works in any phone browser.

**Option B — WhatsApp bot (more operator-friendly)**
Francis sends a WhatsApp message (e.g. `USE 042 2`) to a dedicated number. The system parses it, deducts hours, and replies with a confirmation. No URL, no login — entirely within WhatsApp, matching Francis's existing habits. Requires WhatsApp Business API setup (Meta Cloud API).

Option B is preferred if WhatsApp API can be set up early. Option A ships first as the fallback.

---

## Offline resilience

The system must generate sufficient documentation that it can be operated manually if the platform goes offline:
- Every purchase triggers an email to the member + acequia admin
- Every usage entry triggers a notification (email + WhatsApp) to the member
- Wednesday 9pm weekly report delivered via email **and** WhatsApp to Francis and Goiatz
- In the worst case, Goiatz can reconstruct all balances from the email thread alone
