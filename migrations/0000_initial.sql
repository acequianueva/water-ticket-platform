-- Migration 0000: initial schema

CREATE TABLE users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  community_no  TEXT    UNIQUE NOT NULL,
  name          TEXT    NOT NULL,
  email         TEXT,
  phone         TEXT,
  password_hash TEXT    NOT NULL,
  role          TEXT    NOT NULL DEFAULT 'member',
  active        INTEGER NOT NULL DEFAULT 1,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE seasons (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL,
  start_date DATE    NOT NULL,
  end_date   DATE    NOT NULL,
  active     INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE purchases (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER NOT NULL REFERENCES users(id),
  season_id    INTEGER NOT NULL REFERENCES seasons(id),
  hours        INTEGER NOT NULL,
  amount_eur   REAL    NOT NULL,
  payment_ref  TEXT    NOT NULL,
  voucher_code TEXT    UNIQUE NOT NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE usage_entries (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id),
  season_id   INTEGER NOT NULL REFERENCES seasons(id),
  hours_used  INTEGER NOT NULL,
  entry_date  DATE    NOT NULL,
  recorded_by TEXT    NOT NULL DEFAULT 'admin',
  notes       TEXT,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
