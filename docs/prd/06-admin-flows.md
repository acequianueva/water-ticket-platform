# Admin & Operator Flows

Admin routes are only accessible to users with `role = 'admin'`. Operator routes require `role = 'operator'`. Every request checks this server-side.

---

## Roles

| Role | Who | Access |
|---|---|---|
| `admin` | Goiatz | Full admin panel |
| `operator` | Francis | Operator panel (`/operator`) — record usage only |
| `member` | ~55 community members | Member portal only |

Developer access for rare user management: direct D1 SQL via Cloudflare dashboard or Wrangler CLI.

---

## Flow 1: Operator — Record usage (Francis)

Francis records hours used in real time from his phone. Two options; both write to `usage_entries`.

### Option A — Mobile web form

**Route**: `/operator`

1. Francis opens `/operator` in his phone browser (bookmarked; no app install required)
2. Logs in with his operator credentials
3. Sees a list of members with their **current remaining balance**, sorted by community number
4. Selects a member, enters hours used, confirms date (defaults to today)
5. Saves → `usage_entries` row created with `recorded_by = 'operator'`
6. Balance-update notification sent to the affected member (email + WhatsApp in v1.5)
7. Confirmation shown on screen; Francis can immediately record the next member

### Option B — WhatsApp bot

Francis sends a message to the community's dedicated WhatsApp Business number:

```
USE 042 2
```

- `042` = member's community number
- `2` = hours used

System flow:
1. Meta Cloud API webhook fires to Worker on incoming message
2. Worker parses command, verifies sender is the registered operator number
3. Deducts hours: inserts into `usage_entries` with `recorded_by = 'operator'`
4. Worker replies via WhatsApp API: "Done — User 042 (María García): 2h used. Remaining: 4h."
5. Balance-update notification sent to the affected member

**Option B** is preferred for Francis's comfort; **Option A** ships first as the fallback if WhatsApp Business API setup is delayed.

---

## Flow 2: Admin — Record usage manually (Goiatz fallback)

**Route**: `/admin/usage`

Used when Francis is unavailable or reports usage retrospectively.

1. Admin panel shows a form:
   - User selector: dropdown sorted by community number and name
   - Hours used: number input (positive integers only)
   - Date of usage: date picker (defaults to today)
   - Optional notes field
2. "Save" creates a row in `usage_entries` with `recorded_by = 'admin'`
3. On save: balance-update notification sent to the affected member
4. The page shows a live tally of all users with their current remaining hours — updated after each entry
5. Multiple entries can be saved in one session

---

## Flow 3: Admin — Record in-office sale (Goiatz)

**Route**: `/admin/sales/new`

Used when a member pays in person using the office card terminal (datáfono), rather than the online store.

1. Goiatz selects the member from a dropdown
2. Enters hours purchased (1–10) and the card terminal receipt/reference number
3. Confirms the amount (pre-filled at €12 × hours)
4. "Save" creates a row in `purchases` with:
   - `payment_ref` = office terminal reference (e.g. `TERMINAL-20260615-001`)
   - `voucher_code` = generated normally (`ACE-YYYYMMDD-XXXXXX`)
5. Purchase confirmation email sent to the member (same template as online purchase)
6. A copy is sent to the acequia admin email

---

## Flow 4: Wednesday weekly report

**Automatic — Cloudflare Cron Trigger**

- Schedule: `0 19 * * 3` (UTC) = 21:00 Spain time (UTC+2)
- Query: all active users with `remaining_hours > 0` for the current season, ordered by `community_no`
- Output: HTML email table + plain-text fallback

Report format (reference deployment — language configurable per instance):

```
ACEQUIA NUEVA — Open hours list
Week of [date]

No  | Name              | Remaining hours
----|-------------------|----------------
001 | María García      | 4
007 | Juan Martínez     | 2
012 | Ana López         | 6
...
```

- Recipients: Francis's email + Goiatz's email
- Also delivered to Francis via WhatsApp (automated, v1) — see [07-notifications.md](./07-notifications.md)
- Live view also available at `/admin/report` (Goiatz can share the link)

---

## Flow 5: Season management

**Route**: `/admin/season`

- **Create season**: name (e.g. "2026"), start date, end date → saved as inactive
- **Activate season**: sets `active = 1` on the selected season, sets `active = 0` on all others
- **Close season**: sets `active = 0`; all unsold/unused hours are treated as expired — shown in member history as "Season closed"
- One active season at a time enforced by the application

---

## Flow 6: User import via CSV

**Route**: `/admin/users/import`

1. Goiatz uploads a CSV file (columns: `community_no`, `name`, `email`, `phone`)
2. System validates the file:
   - Required columns present
   - No duplicate `community_no` within the file or against existing users
3. Preview shown: list of users to be created, list of duplicates/errors
4. Goiatz confirms → system creates user records with random temporary passwords
5. Each new user receives a welcome email with their temporary password and a prompt to change it on first login
6. Import summary shown: N created, M skipped (with reasons)

---

## Flow 7: Add or deactivate a single user

**Route**: `/admin/users`

- List of all users with status (active/inactive)
- "New user" form: community_no, name, email, phone → creates user, sends welcome email
- "Deactivate" button: sets `active = 0`; user can no longer log in
- Editing user details (name, email, phone) supported

---

## Admin/operator screen map

```
/operator                        ← Francis records usage (Option A)

/admin
  ├── /admin/usage               ← Goiatz records usage manually (fallback)
  ├── /admin/sales/new           ← Goiatz records in-office sale
  ├── /admin/report              ← live open-hours list
  ├── /admin/season              ← season management
  └── /admin/users
        └── /admin/users/import
```
