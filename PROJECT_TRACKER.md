# PROJECT_TRACKER.md
## Group Arrival Register — Living Status

**Version:** v1.0.0 RC1
**Last updated:** 29 July 2026
**Completion:** ~90%

Architecture, coding rules and locked decisions live in
`CLAUDE.md`. This file tracks state, progress and open work.

---

# 1. STATE — HEALTHY

Console clean. No known bugs. All phases through E3 tested.

```
d:\vikram\group arrival\
├── Group_Arrival_Register.html    28,560 b
├── css/style.css                  ~25,000 b
├── js/
│   ├── dialog.js       9,188 b    loads 1st
│   ├── printing.js    14,230 b    loads 2nd
│   ├── room-master.js 30,340 b    loads 3rd
│   ├── reports.js     25,486 b    loads 4th
│   ├── app.js         69,527 b    loads 5th
│   └── shortcuts.js    6,824 b    loads LAST
├── CLAUDE.md
├── PROJECT_TRACKER.md
└── jsconfig.json
```

All six script tags carry the **same** `?v=N`. Bump all of them
after replacing any file. The HTML caches too — use DevTools →
Network → Disable cache while developing.

---

# 2. SUITE CONTEXT

A second application, **HKIM** (Hotel Key Inventory Management),
is in development — a key register with ~20 modules, an immutable
transaction ledger, audit log, business days and shifts.

**Decision: ship both standalone at v1.0, merge at v2.0.**

Shared database shape is agreed on paper (see `CLAUDE.md` §2):
`property`, `rooms`, `users` and `audit` become shared; `arrivals`
and `keys` stay owned by their app.

Five collisions to resolve at merge — two databases, two sources
of truth for rooms, two hotel identities, colliding global
function names, and disagreeing schema versions.

**Do not start the merge before both apps ship.**

---

# 3. COMPLETED PHASES

| Phase | Work |
|---|---|
| M1 | Printing extracted to `js/printing.js` |
| M2 | Unified bootstrap — five startup blocks removed |
| M3 | `app.js` rebuilt — saved-group index bug, UTC date bug, dead code |
| M4 | HTML rebuild — layout, grouped actions, backup UI |
| M5 | Responsive grid fixes |
| M6 | Print engine rewrite — headers, totals, shared form layout |
| M7 | Draft banner, shared-room save warning |
| M8 | Register input rules, numeric room toggle |
| M9 | Register keyboard navigation, whitespace cleanup |
| M10–M13 | Column alignment, room master enforcement, meal dash, debounced autosave, schema guard, guest name limits |
| RM1 | Room Master — categories, inventory, ranges, bulk import |
| RM2 | Live category lookup in register and rooming list |
| RM3 | **Cancelled** — category is screen-only, never printed |
| RM4 | Category occupancy, per-date occupancy, double-booking detection |
| RM5a | Room Master occupancy rules per category |
| RM5b | Register capacity, children with ages, pax auto-fill |
| RM5c | Hard-capped children, save confirmation toast |
| R1 | Reports scope toggle, empty states, empty-row rule |
| R2 | Report filters — date range, status, agent |
| R3 | Reports verified — 24/24 against seed dataset |
| SEC1 | Room Master manager PIN |
| DATA1 | ISO timestamps, schema version, migration framework |
| E1 | Register layout — collapsible panels, toolbar, sticky headers |
| E2a | In-page dialog engine |
| E2b | All native alerts replaced across both files |
| E3 | Keyboard shortcuts |

---

# 4. MODULE STATUS

| Module | State |
|---|---|
| Database + Repositories | Complete |
| Navigation | Complete |
| Settings, branding, backup | Complete |
| Arrival Register | Complete |
| Room Master + occupancy | Complete |
| Rooming List | Complete |
| Dashboard | Complete |
| Printing | Complete |
| Reports | Complete, verified |
| Autosave + draft recovery | Complete |
| Dialogs | Complete |
| Keyboard shortcuts | Complete |
| Manager PIN | Complete |
| Modularization | 5 of 9 modules extracted |
| Documentation | Not started |
| Packaging | Not started |

---

# 5. REMAINING WORK

### Sprint D — Modularization (4 phases) ← NEXT

| Phase | New file | Moves out | Lines |
|---|---|---|---|
| D1 | `js/database.js` | `STORAGE_KEY`, `SCHEMA_VERSION`, `DEFAULT_DB`, `DB`, timestamps, `migrateDatabase`, load/save, `GroupRepository` | ~320 |
| D2 | `js/register.js` | `REGISTER_COLUMNS`, row template, input rules, keyboard nav, children, capacity, summary, rooming sync, validation | ~1100 |
| D3 | `js/dashboard.js` | KPIs, control center, arrival cards, saved groups | ~450 |
| D4 | `js/groups.js` | save/open/delete, JSON, CSV, bulk import, autosave, draft banner | ~520 |

`database.js` must load **first** — it owns `DB`.
`app.js` ends around 550 lines: navigation, settings,
controllers, professional tools, bootstrap.

Move one, test with the full regression checklist, commit, next.

### Sprint F — Packaging (3 phases)

- `F1` README.md (what it does, how to run, browser requirements,
  backup warning) + CHANGELOG.md
- `F2` refresh CLAUDE.md and PROJECT_TRACKER.md to final state
- `F3` `APP_VERSION` constant surfaced in the footer and every
  printed document, then tag `v1.0.0`

### Then
RC1 → **soak test on one real group arrival** → v1.0

---

# 6. OPEN ITEMS

## 🟡 Before v1.0

- `printRoomingList()` column widths were rewritten in M6 but
  never visually verified against a real printout
- Cosmetic CSS debt: duplicate selectors (`.app-footer`,
  `.settings-grid`, two `TABLES` headers, two `PRINT RESET`
  headers), dead rules (`.dashboard-card:nth-child(5)`–`(7)`,
  `.no-print`), top-level `@page` outside `@media print`,
  no `:focus-visible` styles
- `DB.settings.showRoomCategory` is unused since RM3 was cancelled

## 🟢 Version 1.1

- **Departure date / nights** — occupancy is arrival-date only
  without it; a 3-night group reads as occupying rooms for one day
- Multi-guest per room as structured data (nested `guests[]`)
- Real authentication — the Manager PIN is an accident guard,
  not security
- Audit trail — child-rate fudging is a management problem; an
  audit log makes it visible
- Cloud sync · user accounts · undo · advanced search ·
  database backend · installer · multi-user · ESLint

## v2.0

- Suite merge with HKIM (see `CLAUDE.md` §2)

---

# 7. TEST DATA

A seed script plants 3 groups / 25 rooms / 55 pax and a 20-room
master. A verification script checks 24 figures.

**Back up first:** Settings → Data Backup → Download Backup.

Expected headline numbers:

| | |
|---|---|
| All Groups | 3 groups · 25 rooms · 55 pax · 3 VIP |
| Meals | EP 8 · CP 18 · MAP 18 · AP 8 · Not Set 3 · Covers 52 |
| Inventory | Deluxe 10 · Super Deluxe 6 · Suite 3 · Unassigned 1 |
| Occupancy | 08-10 → 8/20 40% · 08-15 → 12/20 60% · 08-20 → 5/20 25% |
| Current Group (Sharma Wedding) | 8 rooms · 16 pax · 2 VIP · Deluxe 8/10 |

Deluxe shows 15 room-nights booked against 10 physical rooms —
correct, because 101–105 are used on two different dates.

---

# 8. PROCESS NOTES — LEARNED THE HARD WAY

**Six of the last twenty phases lost a round to a patch not
landing.** Causes, in order of frequency:

1. A multi-step patch where one step was skipped
2. A `FIND THIS` block whose whitespace didn't match
3. A replacement that took an adjacent function's closing brace
4. The file saved to the wrong place, or not saved at all
5. Browser serving a cached script or HTML

**Mitigations now in force:**

- Phases touching more than ~4 places in one file get a complete
  file replacement instead of patches
- Verify byte size on disk after every replacement:
  `Get-ChildItem "js\*.js" | Select-Object Name, Length`
- All six cache busters bump together
- DevTools → Network → Disable cache while developing
- After any register change, confirm `<thead>` count matches
  `REGISTER_COLUMNS`

---

# 9. GIT

One commit per completed phase. Never commit broken code
(violated once, during RM5b; recovered).

```
M1 … M13 · RM1 · RM2 · RM4 · RM5a · RM5b · RM5c
R1 · R2 · R3 · SEC1 · DATA1 · E1 · E2a · E2b-1 · E2b-2 · E3
```

Next commit: `docs - Rewrite CLAUDE.md and PROJECT_TRACKER.md to current state`

---

# 10. RESUMING

Next action: **Sprint D, phase D1** — extract `js/database.js`.

That file is the one a future PMS or suite merge will care about
most, since it owns `DB`, the schema version, the migration hook
and `GroupRepository`.

Before starting, confirm:
- Console clean, two lines
- `git status` clean and pushed
- Byte sizes on disk match section 1