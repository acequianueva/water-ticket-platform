# Admin Flows

Admin routes are only accessible to users with `role = 'admin'`. Every request checks this server-side.

---

## Roles

| Role | Who | Access |
|---|---|---|
| `admin` | Goiatz | Full admin panel |
| `member` | ~55 community members | Member portal only |

Developer access for rare user management: direct D1 SQL via Cloudflare dashboard or Wrangler CLI.

---

## Flow 1: Enter weekly usage

**Route**: `/admin/uso`

1. Goiatz receives Francis's usage report (WhatsApp message or phone call — e.g. "User 12: 2h, User 7: 1h")
2. Admin panel shows a form:
   - User selector: dropdown sorted by community number and name
   - Hours used: number input (positive integers only)
   - Date of usage: date picker (defaults to today)
   - Optional notes field
3. "Guardar" saves a row to `usage_entries`
4. On save: balance-update notification email sent to the affected member (see [07-notifications.md](./07-notifications.md))
5. The page shows a live tally of all users with their current remaining hours for the active season — updated after each entry
6. Multiple entries can be saved in one session (one per user per usage event)

---

## Flow 2: Wednesday weekly report

**Automatic — Cloudflare Cron Trigger**

- Schedule: `0 19 * * 3` (UTC) = 21:00 Spain time (UTC+2)
- Query: all active users with `remaining_hours > 0` for the current season, ordered by `community_no`
- Output: HTML email table + plain-text fallback

Report format:

```
ACEQUIA NUEVA — Listado de horas abiertas
Semana del [date]

Nº  | Nombre            | Horas restantes
----|-------------------|----------------
001 | María García      | 4
007 | Juan Martínez     | 2
012 | Ana López         | 6
...
```

- Recipients: Francis's email + Goiatz's email
- Also available live at `/admin/reporte` (Goiatz can share the link or forward the email to Francis via WhatsApp manually)

---

## Flow 3: Season management

**Route**: `/admin/temporada`

- **Create season**: name (e.g. "2026"), start date, end date → saved as inactive
- **Activate season**: sets `active = 1` on the selected season, sets `active = 0` on all others
- **Close season**: sets `active = 0`; all unsold/unused hours are treated as expired — shown in member history as "Temporada cerrada"
- One active season at a time enforced by the application

---

## Flow 4: User import via CSV

**Route**: `/admin/usuarios/importar`

1. Goiatz uploads a CSV file (columns: `community_no`, `name`, `email`, `phone`)
2. System validates the file:
   - Required columns present
   - No duplicate `community_no` within the file or against existing users
3. Preview shown: list of users to be created, list of duplicates/errors
4. Goiatz confirms → system creates user records with random temporary passwords
5. Each new user receives a welcome email with their temporary password and a prompt to change it on first login
6. Import summary shown: N created, M skipped (with reasons)

---

## Flow 5: Add or deactivate a single user

**Route**: `/admin/usuarios`

- List of all users with status (active/inactive)
- "Nuevo usuario" form: community_no, name, email, phone → creates user, sends welcome email
- "Desactivar" button: sets `active = 0`; user can no longer log in
- Editing user details (name, email, phone) supported

---

## Admin screen map

```
/admin
  ├── /admin/uso              ← enter weekly usage
  ├── /admin/reporte          ← live open-hours list
  ├── /admin/temporada        ← season management
  └── /admin/usuarios
        └── /admin/usuarios/importar
```
