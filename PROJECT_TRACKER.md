# HOTEL GROUP OPERATIONS SUITE (HRGM)
## PROJECT_TRACKER.md

---

# 1. PROJECT INFORMATION

**Project Name:** Hotel Group Operations Suite (HRGM — Hotel Arrival Group
Management)

**Current Version:** v1.0 Release Candidate track

**Platform:** HTML / CSS / vanilla JavaScript, 13 modules, no build tools
during development. LocalStorage-based persistence, schema-versioned
(`SCHEMA_VERSION = 4`, with a working migration chain already carrying
groups through ISO timestamps → departure dates → the audit log).

**Planned v2.0:** Electron + SQLite + bytenode, auto-update. Deliberately
not started early. `database.js`'s own header already states the intent
plainly: "When the suite moves to a shared database or an API, this is
the only file that changes" — the repository pattern was built for this
migration from the start.

**Sister project:** HKIM (Hotel Key Inventory Manager), separate codebase.

**Scope boundary, permanent:** one job — group bookings — no non-group /
walk-in / individual reservation data, ever.

---

# 2. MODULE INVENTORY — COMPLETE

All 13 modules now reviewed. Load order:
`version.js, dialog.js, database.js, printing.js, room-master.js,
register.js, dashboard.js, reports.js, report-print.js, groups.js, app.js,
shortcuts.js, diagnostics.js`.

- **`database.js`** — loads FIRST by design. Owns `DB`, `GroupRepository`
  (see correction below), `recordAuditEntry()`, `nowISO()`/timestamp
  helpers, `migrateDatabase()`, `saveDatabase()`/`showSaveFlash()`, and
  **`getRoomDepartureDate(group, room)`** — the function the whole module
  review was ultimately searching for.
- **`dialog.js`** — `showAlert`/`showConfirm`/`showPrompt`/`showForm`
  (new this session).
- **`printing.js`** — Print Register/Rooming List/Blank Register, meal
  auto-fill via `showForm`.
- **`room-master.js`** — `RoomMasterRepository`, category + occupancy
  rules (children are a subset of `maxOccupancy`, never additive), the
  Manager PIN system (`hashPin`, `hasRoomMasterPin`, `isRoomMasterLocked`)
  — the same PIN the No Show/Checked Out reversal guard in `app.js` reuses
  on purpose.
- **`register.js`** — arrival register engine, `REGISTER_COLUMNS` map,
  per-room checkout override UI (`.checkoutOverrideCheck` /
  `.checkoutOverrideDate` → `room.departureOverride`), snapshot/restore,
  search/filter. Reviewed in full while diagnosing the meal-form bug —
  clean, its `keydown` handler is properly scoped to the register table
  only.
- **`dashboard.js`** — KPI cards, Arrival Control Center, Saved Groups
  panel. Own documented incident: Saved Groups must carry the *real*
  `DB.groups` index through filter/sort, never a filtered position — a
  parallel lesson to the id-vs-name matching rule elsewhere.
- **`reports.js`** — five dashboard cards, CSV export, night-by-night
  occupancy (DEP5/5b/5c, see below).
- **`report-print.js`** — the actual "four printable reports": Daily
  Arrival Manifest, Housekeeping Allocation, F&B Covers, Management Flash.
  Its own header still says "no departure date" is a data-model
  limitation — that's now stale, DEP5 added it. A Departure Manifest is
  technically buildable now if ever wanted; not built.
- **`groups.js`** — GroupRepository *consumer*, not owner (see correction).
  Save/load/delete, automatic status transitions, cross-group conflicts.
- **`app.js`** — bootstrap, status-reversal guard, autosave.
- **`shortcuts.js`** — global keyboard shortcuts. Reviewed in full,
  `isDialogOpen()` guard correctly implemented, cleared as a suspect
  during the meal-form bug hunt.
- **`diagnostics.js`** — version registry, startup diagnostic report.
  Referenced throughout, never directly opened — nothing has ever
  required it.

## Correction to prior tracker versions

Earlier notes in this file credited `groups.js` with owning
`GroupRepository`. **That was wrong** — carried forward from the original
pre-modularization file at the very start of this project's AI-assisted
work, never re-verified against the real, current `groups.js`. Checked
directly: `groups.js` only ever calls `GroupRepository.*` methods, never
declares it. `database.js` is the sole, correct owner, confirmed with a
zero-collision check across all 13 modules. The actual code was never
wrong — only this document was.

---

# 3. COMPLETED THIS SESSION

DEP5 (night-by-night occupancy, All Groups) → dedicated Overlapping Rooms
report → DEP5b (Current Group scope made hotel-wide) → `showForm()` added
to `dialog.js` → meal-prompt polish closed → Enter-key premature-submit
bug fixed → backdrop-click-cancels-form bug fixed (CSS gap closed +
structural fix) → `register.js`/`shortcuts.js` reviewed and cleared →
`dashboard.js`/`report-print.js`/`room-master.js` reviewed, clean →
**DEP5c** — `buildDateOccupancy()` now computes each room's occupied
nights individually via `getRoomDepartureDate(group, room)` instead of
one date range applied to every room in a group. A room with its own
"Different checkout" override now correctly leaves the occupancy count,
and the Overlapping Rooms report, on its own date — not the group's
general one. Fixes both DEP5 and DEP5b at once, since both share this one
function. `database.js` reviewed, completing full module coverage.

---

# 4. LOGGED, NOT YET BUILT

Nothing currently open.

---

# 5. DEFERRED

SQL database migration — v2.0, `database.js` already built with this
migration in mind (see §1).

---

# 6. KNOWN ISSUES

None. Full module review is complete and every gap found during it has
been resolved.

---

# 7. NEXT UP

No feature work or bug currently queued. Options if wanted: a Departure
Manifest report (technically buildable now, per §2); nothing else is
outstanding.