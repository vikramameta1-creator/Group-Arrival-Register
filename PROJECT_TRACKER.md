# PROJECT_TRACKER.md
## Hotel Group Operations Suite — Living Status

**Version:** v1.0.0 RC1 (in progress)
**Last updated:** 27 July 2026
**Completion:** ~82%

Spec and coding rules live in `CLAUDE.md`.
This file tracks state, progress and open work.

---

# 1. CURRENT STATE

## Files

```
d:\vikram\group arrival\
├── Group_Arrival_Register.html
├── css/style.css                  ~1050 lines
├── js/
│   ├── printing.js                ~717 lines   loads 1st
│   ├── room-master.js             ~1002 lines  loads 2nd
│   └── app.js                     ~2600 lines  loads 3rd
├── CLAUDE.md
├── PROJECT_TRACKER.md
└── jsconfig.json
```

## Health

- Console clean: `Hotel Professional Tools Ready` +
  `Hotel Group Operations Suite Initialized`
- No JavaScript errors
- Cell-index audit: all accesses use `REGISTER_COLUMNS`
  (the one dynamic read in `handleRegisterKeydown` is intentional)
- Saved group data verified clean, 0 corrupt rows
- All manual regression tests passing

---

# 2. COMPLETED PHASES

| Phase | Work |
|---|---|
| M1 | Printing module extracted to `js/printing.js` |
| M2 | Unified application bootstrap, five startup blocks removed |
| M3 | `app.js` rebuilt: saved-group index bug, local-date bug, dead code removed |
| M4 | HTML rebuild: layout fixes, grouped actions, backup UI |
| M5 | Responsive grid fixes |
| M6 | Print engine rewrite: document headers, totals, shared form layout |
| M7 | Draft banner, shared-room save warning |
| M8 | Register input rules, numeric room toggle |
| M9 | Register keyboard navigation, whitespace cleanup |
| M10 | Column alignment, room master enforcement, meal dash |
| M11 | Header alignment, room master toggle, debounced autosave |
| M12 | Register column mapping fix, draft schema guard |
| RM1 | Room Master module: categories, inventory, range and bulk assignment |
| RM2 | Live room category lookup in register and rooming list |
| RM3 | **Cancelled** — category is screen-only, never printed |

---

# 3. MODULE STATUS

| Module | State |
|---|---|
| Database + Repository | Complete |
| Navigation | Complete |
| Settings + Branding + Backup | Complete |
| Arrival Register | Complete |
| Room Master | Complete |
| Rooming List | Complete |
| Dashboard | Complete |
| Printing | Complete |
| Autosave + Draft recovery | Complete |
| Reports | **Not started** |
| Modularization | 2 of 8 modules extracted |
| Professional dialogs | Not started |
| Keyboard shortcuts | Partial (Enter only) |
| Documentation | Not started |
| Packaging | Not started |

---

# 4. REMAINING WORK

### Sprint B — Reports (3 phases) ← NEXT
- `R1` Current Group / All Groups toggle, empty states
- `R2` filters: arrival date range, status, agent
- `R3` verify every card against hand-calculated numbers

### Sprint C — Room Master (1 phase left)
- `RM4` category report card + true occupancy
  (`Deluxe 6/10 — 60%`) — depends on R1

### Sprint D — Modularization (6 phases)
`database.js` → `utilities.js` → `settings.js` → `reports.js`
→ `register.js` → `dashboard.js` → `groups.js`
Target: `app.js` becomes bootstrap only, ~200 lines.
Move one, test, commit, next.

### Sprint E — UI + Workflow QA (3 phases)
- `Q1` **Arrival Register page restructure** — group info and row
  generation into one compact header strip; collapse Bulk Import;
  bring the register table above the fold
- `Q2` replace `alert` / `prompt` / `confirm` with in-page dialogs
- `Q3` keyboard shortcuts: Ctrl+S save, Ctrl+P print, Tab across

### Sprint F — Packaging (3 phases)
- `P1` README.md + CHANGELOG.md
- `P2` tracker refresh
- `P3` version constant + `v1.0.0` tag

### Then
RC1 → soak test on one real group arrival → **Version 1.0**

---

# 5. OPEN ITEMS

## 🟡 Important before v1.0

**Empty rows appear in the Rooming List.**
`syncRoomingList()` renders every register row including blanks.
Decision needed: hide only fully-empty rows, or also hide rows
with a room number but no guest name yet? Recommended: hide only
fully-empty rows, so in-progress entries stay visible.

**Arrival Register page layout.**
Group info sits above three action-group boxes, then Bulk Import
occupies a full panel before the register table, pushing the table
below the fold. Scheduled as `Q1`.

**`printRoomingList()` column widths.**
Rebuilt in M6 but never visually verified against a real print.

## 🟢 Version 1.1

Multi-guest per room (nested `guests[]`) · cloud sync ·
user accounts · audit trail · undo · advanced search ·
database backend · installer · multi-user · ESLint

## Cosmetic debt (Sprint E)

- Duplicate CSS selectors: `.app-footer`, `.settings-grid`,
  two `TABLES` section headers, two `PRINT RESET` headers
- Dead rules: `.dashboard-card:nth-child(5)` to `(7)`, `.no-print`
- Top-level `@page` outside `@media print`
- No `:focus-visible` styles anywhere
- `DB.settings.showRoomCategory` now unused (RM3 cancelled)

---

# 6. DECISIONS LOG

| Decision | Outcome |
|---|---|
| Folder naming | `js/`, not `modules/` |
| Entry file | `Group_Arrival_Register.html` |
| Room model | Inventory-first — rooms exist with or without a category |
| Room category on screen | Arrival Register **and** Rooming List |
| Room category on print | **Never** — Housekeeping knows the property |
| Unmapped rooms | Silent grey dash |
| Rooms outside Room Master | Red cell, `NOT IN MASTER`, Save blocked |
| Room master enforcement | Toggleable; auto-off when master is empty |
| Room numbers | Numeric, max 3 digits; toggleable to free text |
| Duplicate rooms on Save | Warn and allow — shared rooms are legitimate |
| Guests per room | One row = one room; extra guests go in Guest Name |
| Unsaved draft | Restore + Keep / Discard banner; schema-versioned |
| Reports scope | Current Group and All Groups, with filters |
| Report periods | No weekly / monthly / yearly rollups |
| Bulk Import panel | Permanently visible, no toggle button |

---

# 7. REGRESSION CHECKLIST

Run before every commit that touches the register or groups.

1. Console clean — two lines, nothing red
2. All six tabs switch
3. Add Row → one row · Generate Rows 5 → five rows
4. Room rejects letters and a 4th digit · Pax caps at 2 digits
5. Enter moves down the same column, cells do not grow
6. Every value sits under its own header (8 columns)
7. Type a mapped room → category fills · unmapped → red + blocked Save
8. Edit any field, wait 2s, F5 → value persists
9. Save Group → F5 → still listed · search then Delete → correct group
10. Print Register · Blank Register · Print Rooming List — no Category column
11. Export JSON · Export CSV · Open Group · Bulk Import
12. Room Master: add range, bulk import, rename, delete, F5 persists
13. Settings: logo, footer, both toggles, backup, restore

---

# 8. GIT HISTORY

```
M1  - Printing module extracted
M2  - Unified application bootstrap
M3  - Rebuilt app.js
M4  - HTML rebuild
M5  - Responsive grid fixes
M6  - Print engine rewrite
M7  - Draft banner and shared-room save warning
M8  - Register input rules with numeric room toggle
M9  - Register keyboard navigation
M10 - Column alignment fix, room master enforcement, meal dash
M11 - Header alignment, room master toggle, debounced autosave
M12 - Fix register column mapping and add draft schema guard
RM1 - Room Master module
RM2 - Live room category lookup
```

---

# 9. RESUMING

Next action: **Sprint B, phase R1** — add the
Current Group / All Groups toggle to the Reports page,
plus empty states for all three cards.

Before resuming, confirm:
- Console is still clean
- `git status` is clean and everything is pushed