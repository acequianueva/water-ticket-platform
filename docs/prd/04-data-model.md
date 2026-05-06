# Data Model

## Entities

### `users`
```sql
CREATE TABLE users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  community_no  TEXT    UNIQUE NOT NULL,  -- e.g. "042"
  name          TEXT    NOT NULL,
  email         TEXT,
  phone         TEXT,                     -- used for WhatsApp notifications
  password_hash TEXT    NOT NULL,         -- bcrypt, cost factor 12
  role          TEXT    NOT NULL DEFAULT 'member', -- 'member' | 'admin' | 'operator'
  active        INTEGER NOT NULL DEFAULT 1,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### `seasons`
```sql
CREATE TABLE seasons (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL,            -- e.g. "2026"
  start_date DATE    NOT NULL,
  end_date   DATE    NOT NULL,
  active     INTEGER NOT NULL DEFAULT 0   -- only one row active at a time
);
```

### `purchases`
```sql
CREATE TABLE purchases (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER NOT NULL REFERENCES users(id),
  season_id    INTEGER NOT NULL REFERENCES seasons(id),
  hours        INTEGER NOT NULL,          -- 1–10
  amount_eur   REAL    NOT NULL,          -- e.g. 36.00
  payment_ref  TEXT    NOT NULL,          -- Stripe PaymentIntent ID or Redsys order ref
  voucher_code TEXT    UNIQUE NOT NULL,   -- ACE-YYYYMMDD-XXXXXX
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### `usage_entries`
```sql
CREATE TABLE usage_entries (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id),
  season_id   INTEGER NOT NULL REFERENCES seasons(id),
  hours_used  INTEGER NOT NULL,           -- always a positive whole number
  entry_date  DATE    NOT NULL,           -- date of actual water usage
  recorded_by TEXT    NOT NULL DEFAULT 'admin',
  notes       TEXT,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

---

## Derived balance

Balance is computed on read — never stored — to avoid sync bugs.

```sql
SELECT
  u.id,
  u.name,
  u.community_no,
  COALESCE(SUM(p.hours), 0)              AS hours_purchased,
  COALESCE(SUM(ue.hours_used), 0)        AS hours_used,
  COALESCE(SUM(p.hours), 0)
    - COALESCE(SUM(ue.hours_used), 0)    AS remaining_hours
FROM users u
LEFT JOIN purchases    p  ON p.user_id  = u.id AND p.season_id  = :season_id
LEFT JOIN usage_entries ue ON ue.user_id = u.id AND ue.season_id = :season_id
WHERE u.active = 1
GROUP BY u.id
ORDER BY u.community_no;
```

**Season-end handling**: both `purchases` and `usage_entries` carry a `season_id` foreign key. Filtering by `season_id = :season_id` in the query above automatically scopes the balance to that season — no data migration is needed when a season closes. Historical balances for past seasons remain queryable by passing the old `season_id`.

---

## Voucher code format

`ACE-YYYYMMDD-XXXXXX`

- `ACE` — fixed prefix (can be configured per deployment)
- `YYYYMMDD` — purchase date
- `XXXXXX` — 6 random uppercase alphanumeric characters (A–Z, 0–9)

Example: `ACE-20260615-R4T7KZ`

Generation: draw 6 random chars, attempt INSERT, retry on unique constraint violation (collision probability negligible at this scale).

---

## CSV import format

For the initial user import at season start:

```
community_no,name,email,phone
001,María García,maria@example.com,+34612345678
002,Juan Martínez,juan@example.com,+34698765432
```

- `community_no`: required, unique
- `name`: required
- `email`: optional but strongly recommended (needed for notifications)
- `phone`: optional (needed for WhatsApp notifications in v1.5)

Rows with a duplicate `community_no` are rejected and reported back to the admin.
