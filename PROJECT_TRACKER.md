# PROJECT_TRACKER.md
## Hotel Group Operations Suite — Living Status

**Version:** v1.0.0 RC1 (in progress)
**Last updated:** 28 July 2026
**Completion:** ~88%

Spec and coding rules live in `CLAUDE.md`.

---

# ⚠️ 1. RESUME HERE — BROKEN STATE

`js/app.js` currently throws:

```
Uncaught ReferenceError: initializeRegisterEvents is not defined
```

**Cause:** during RM5b Patch 7, the replacement of
`handleRegisterInput()` also removed `initializeRegisterEvents()`.
Both live in the `REGISTER EVENTS` section.

**Fix:** restore the complete `REGISTER EVENTS` section
(`initializeRegisterEvents` + `handleRegisterInput`).

**Then verify** every RM5b function exists:

```javascript
["initializeRegisterEvents","handleRegisterInput","handleRegisterKeydown",
 "handleRegisterBeforeInput","handleRegisterCleanup","renderChildAges",
 "autoFillPaxFromRoom","getRowCapacityError","getInvalidRooms",
 "updateRegisterCategories","scheduleAutoSave"]
.forEach(f => console.log(typeof window[f] === "function" ? "OK   " : "MISS ", f));
```

All must read OK. If any MISS, replace `app.js` wholesale
rather than patching further.

**Note:** this broken state was committed. Fix and commit
again before starting new work.

---

# 2. CURRENT FILES

```
d:\vikram\group arrival\
├── Group_Arrival_Register.html
├── css/style.css                  ~1400 lines
├── js/
│   ├── printing.js     14,230 b   loads 1st
│   ├── room-master.js  24,336 b   loads 2nd
│   ├── reports.js      26,676 b   loads 3rd
│   └── app.js          ~63,000 b  loads 4th   ⚠ BROKEN
├── CLAUDE.md
├── PROJECT_TRACKER.md
└── jsconfig.json
```

Script tags carry cache busters (`?v=1`). **Bump the number
every time a module file is replaced** — Live Server caches
scripts aggressively.

---

# 3. COMPLETED PHASES

| Phase | Work |
|---|---|
| M1–M13 | Printing extracted · unified bootstrap · app.js rebuild · HTML rebuild · print engine rewrite · draft banner · input rules · keyboard nav · column mapping · schema guard |
| RM1 | Room Master: categories, inventory, ranges, bulk import |
| RM2 | Live category lookup in register and rooming list |
| RM3 | **Cancelled** — category is screen-only, never printed |
| RM4 | Category occupancy, per-date occupancy, double-booking detection |
| RM5a | Room Master occupancy rules per category |
| RM5b | **INCOMPLETE** — register capacity, children, auto-fill |
| R1 | Reports scope toggle, empty states, empty-row rule |
| R2 | Report filters: date range, status, agent |
| R3 | Reports verified — 24/24 against seed dataset |
| E1 | Register layout: collapsible panels, toolbar, sticky headers |

---

# 4. RM5b — WHAT IT DOES (once fixed)

**Column map is now 9 wide:**

```
SR 0 · ROOM 1 · CATEGORY 2 · GUEST 3 · PAX 4
CHILDREN 5 · MEAL 6 · MOBILE 7 · EXTRA 8
```

**Occupancy model — the anti-hack:**
Max Occupancy caps the TOTAL people in a room. Children are a
subset of pax, never an addition. `adults = pax − children`.
Raising Children can never raise Pax, so moving a person from
the adult column to the child column cannot create space.

**Behaviour:**
- Type a room → Pax auto-fills from that category's Default Adults
- Editing Pax sets `row.dataset.paxTouched` so auto-fill stops
- Children count N → N age boxes appear (0–17), values preserved
- Red cell + blocked Save on: NOT IN MASTER, DUPLICATE,
  MAX n PAX, MAX n CHILD, MAX n ADULTS

**Test once fixed** (Deluxe: Default 2 / Max Adults 2 /
Max Children 1 / Max Occupancy 3):

1. Type `101` → Pax auto-fills to 2
2. Pax 3, Children 1 → valid
3. Pax 4 → red, MAX 3 PAX
4. Pax 3, Children 2 → red, MAX 1 CHILD
5. Pax 3, Children 0 → red, MAX 2 ADULTS
6. Children 2 → two age boxes; enter 7 and 11; F5 → persist
7. Two rows both `101` → second shows DUPLICATE
8. Save with any error → blocked with numbered list
9. Print, CSV, Reports still correct

---

# 5. REMAINING WORK

### Immediate
- Fix `initializeRegisterEvents`, test RM5b, commit

### Sprint E — UI and workflow (2 phases)
- `E2` replace all 24 `alert` / `prompt` / `confirm` with
  in-page dialogs. One `showDialog()` helper returning a
  promise, then swap call sites in batches.
- `E3` keyboard shortcuts: Ctrl+S save, Ctrl+P print,
  Ctrl+N add row, Esc close dialog

### Sprint D — Modularization (4 phases, option B)
```
D1  js/database.js    DB, load/save, GroupRepository   ~180
D2  js/register.js    columns, rows, rules, summary    ~1000
D3  js/dashboard.js   KPIs, cards, saved groups        ~450
D4  js/groups.js      save/open/delete, import/export  ~520
```
`database.js` must load first. `app.js` ends around 550 lines.
Settings and utilities stay in `app.js` — small and stable.

### Sprint F — Packaging (3 phases)
- `F1` README.md + CHANGELOG.md
- `F2` refresh PROJECT_TRACKER.md and CLAUDE.md
- `F3` version constant in footer and printed documents,
  tag `v1.0.0`

### Then
RC1 → soak test on one real group arrival → **Version 1.0**

---

# 6. OPEN ITEMS

## 🟡 Before v1.0
- `printRoomingList()` column widths never visually verified
- Cosmetic CSS debt: duplicate selectors (`.app-footer`,
  `.settings-grid`, two `TABLES` headers), dead rules
  (`.dashboard-card:nth-child(5)`–`(7)`, `.no-print`),
  top-level `@page` outside `@media print`,
  no `:focus-visible` styles

## 🟢 Version 1.1
- **Departure date / nights** — occupancy is arrival-date only
  without it; a 3-night group reads as one day
- Multi-guest per room as structured data (nested `guests[]`)
- Child rate fraud is a management/audit problem, not a code
  one — the v1.1 audit trail addresses it
- Cloud sync · user accounts · undo · advanced search ·
  database backend · installer · multi-user · ESLint

---

# 7. DECISIONS LOG

| Decision | Outcome |
|---|---|
| Folder | `js/`, not `modules/` |
| Entry file | `Group_Arrival_Register.html` |
| Room model | Inventory-first — rooms exist with or without a category |
| Occupancy cap | **Total occupants**, not adults — children are a subset of pax |
| Children | Count per row + one age box each (0–17) |
| Pax auto-fill | From category Default Adults, stops once manually edited |
| Duplicate rooms | **Hard block** on save (reversed from earlier warn-and-allow) |
| Over-capacity | **Hard block** on save |
| Category on screen | Arrival Register and Rooming List |
| Category on print | **Never** |
| Unmapped rooms | Silent grey dash |
| Rooms outside master | Red cell, `NOT IN MASTER`, blocked |
| Room numbers | Numeric max 3 digits; toggleable to free text |
| Guest name | Max 60 chars; Special Request max 80 |
| Unsaved draft | Restore + Keep/Discard banner, schema-versioned |
| Reports scope | Current Group and All Groups, with filters |
| Report periods | No weekly / monthly / yearly rollups |
| Sprint order | E before D; D limited to 4 modules |

---

# 8. REGRESSION CHECKLIST

Run before every commit touching the register or groups.

1. Console clean — two lines, nothing red
2. Six tabs switch
3. Add Row → one row · Generate Rows 5 → five rows
4. Room rejects letters and a 4th digit · Pax caps at 2 digits
5. Enter moves down the same column, cells do not grow
6. Every value under its own header (**9 columns** after RM5b)
7. Mapped room → category fills and Pax auto-fills
8. Over-capacity or duplicate → red cell, Save blocked
9. Edit any field, wait 2s, F5 → value persists
10. Save Group → F5 → still listed · search then Delete → correct group
11. Print Register · Blank Register · Print Rooming List — no Category column
12. Export JSON · CSV · Open Group · Bulk Import
13. Room Master: ranges, bulk, rename, delete, occupancy rules, F5 persists
14. Reports: four cards, both scopes, filters, 24/24 seed check
15. Settings: logo, footer, both toggles, backup, restore

---

# 9. TEST DATA

A seed script exists that plants 3 groups / 25 rooms /
55 pax and a 20-room master, with a verification script that
checks 24 figures. Expected headline numbers:

- All Groups: 3 groups · 25 rooms · 55 pax · 3 VIP
- Meals: EP 8 · CP 18 · MAP 18 · AP 8 · Not Set 3 · Covers 52
- Inventory: Deluxe 10 · Super Deluxe 6 · Suite 3 · Unassigned 1
- Occupancy: 08-10 → 8/20 40% · 08-15 → 12/20 60% · 08-20 → 5/20 25%

Back up via Settings → Download Backup before re-seeding.

---

# 10. GIT

One commit per completed phase. Never commit broken code
(violated once — see section 1).

```
M1 … M13, RM1, RM2, RM4, R1, R2, R3, E1, RM5a
RM5 - Room occupancy rules, capacity enforcement, children  ⚠ broken
```