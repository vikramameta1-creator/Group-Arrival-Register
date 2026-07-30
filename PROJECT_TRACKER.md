# PROJECT_TRACKER.md
## Group Arrival Register — Living Status

**Version:** v1.0.0 RC1
**Last updated:** 30 July 2026
**Completion:** ~93%

Architecture, coding rules and locked decisions live in
`CLAUDE.md`. This file tracks state, progress and open work.

---

# 1. STATE — HEALTHY

```
Suite Diagnostics — 10 modules, 0 problems, storage 0%
```

```
d:\vikram\group arrival\
├── Group_Arrival_Register.html
├── css/style.css
├── js/
│   ├── dialog.js          loads 1st
│   ├── database.js        loads 2nd   owns DB
│   ├── printing.js        loads 3rd
│   ├── room-master.js     loads 4th
│   ├── register.js        loads 5th
│   ├── dashboard.js       loads 6th
│   ├── reports.js         loads 7th
│   ├── report-print.js    loads 8th
│   ├── app.js             loads 9th
│   ├── shortcuts.js       loads 10th
│   └── diagnostics.js     loads LAST
├── CLAUDE.md
├── PROJECT_TRACKER.md
└── jsconfig.json
```

All eleven script tags carry the **same** `?v=N`. Bump every
one after replacing any file. The HTML caches too — use
DevTools → Network → Disable cache while developing.

---

# 2. COMPLETED

| Phase | Work |
|---|---|
| M1–M13 | Printing extracted · unified bootstrap · app.js rebuild · HTML rebuild · print engine · draft banner · input rules · keyboard nav · column map · schema guard |
| RM1–RM5c | Room Master, categories, live lookup, per-date occupancy, double-booking detection, occupancy rules, register capacity, children with ages, hard caps |
| R1–R3 | Reports scope toggle, filters, verified 24/24 against seed data |
| SEC1 | Room Master manager PIN |
| DATA1 | ISO timestamps, schema version, migration framework |
| E1–E6 | Register layout · dialog engine · all native alerts replaced · keyboard shortcuts · register search and single scrollbar · Auto Series consults Room Master · destructive-action protection with one-step restore |
| D1–D3 | `database.js`, `register.js`, `dashboard.js` extracted |
| DIAG1 | Module health check, storage monitoring, sticky summary bar |
| RPT1 | Four printable operational reports |

---

# 3. REMAINING TO v1.0

### Sprint D — Modularization (1 phase left)

| Phase | New file | Moves out |
|---|---|---|
| D4 | `js/groups.js` | `getCurrentGroupData`, `loadGroupToScreen`, save/open/delete, group selector, search, archive, JSON, CSV, bulk import, backup, restore, autosave, draft banner |

Leaves `app.js` at roughly 900 lines: utilities, dates,
navigation, settings, meal analytics, collapsible panels,
event bindings, controllers, bootstrap.

### Sprint F — Packaging (3 phases)

- `F1` README.md + CHANGELOG.md
- `F2` refresh CLAUDE.md and PROJECT_TRACKER.md to final state
- `F3` **per-module `MODULE_VERSION` constants** reported by
  diagnostics, plus `APP_VERSION` in the footer and every
  printed document, then tag `v1.0.0`

`F3` is designed to serve the update mechanism, not just print
a footer string. An installer needs per-module versions to
compare against a manifest.

### Then
RC1 → **soak test on one real group arrival** → v1.0

---

# 4. DISTRIBUTION REQUIREMENTS — recorded, not built

Stated by the developer during v1.0. **All post-v1.0.**

- Software will be **commercially distributed** to properties
- Modules must **not ship as plain-text source** — the ask is
  DLL-like packaging, not obfuscation
- Updates delivered by **server push or patch installer**
- Modules deliverable **individually or as a bundle**
- **Rollback** required — front office software that breaks
  mid-shift needs a way back

## Recommended path: v2.0 = Electron + SQLite

Browser JavaScript has no DLL equivalent. Electron is the
standard commercial answer and solves several stated goals at
once:

| Requirement | Electron mechanism |
|---|---|
| Not plain-text source | **bytenode** — V8 bytecode `.jsc` per module |
| Proper database | **SQLite** via Node, a real file on disk |
| Patch installer | **electron-updater**, differential and signed |
| Individual or bundled modules | Both — files stay separate and swappable |
| Rollback | Built into electron-updater |
| Commercial feel | Signed `.exe` installer, no browser |

**No rewrite required.** Electron runs the existing HTML, CSS
and JavaScript. The eleven modules stay eleven modules. Only
the shell and the storage layer change — and storage is
already isolated behind `GroupRepository` and
`RoomMasterRepository`, which is why that pattern was worth
enforcing.

**Rule change needed:** `CLAUDE.md` currently forbids build
tools. Scope it to **no build tools during development, build
tools at packaging.** Day-to-day editing stays exactly as it
is — edit a file, hard refresh.

**Diagnostics becomes the post-update verification step.** If a
pushed module fails to load, it is caught at boot rather than
at first click. That is the rollback trigger.

Open questions for the v2.0 design session:
- Version manifest format and where it is hosted
- Compatibility matrix between module versions and
  `SCHEMA_VERSION`
- Whether rollback restores modules only, or data as well

---

# 5. OPEN ITEMS

## 🟡 Before v1.0
- `printRoomingList()` column widths never visually verified
  against a real printout
- Cosmetic CSS debt: duplicate selectors (`.app-footer`,
  `.settings-grid`, two `TABLES` headers), dead rules
  (`.dashboard-card:nth-child(5)`–`(7)`, `.no-print`),
  top-level `@page` outside `@media print`, no
  `:focus-visible` styles
- `DB.settings.showRoomCategory` unused since RM3 cancelled

## 🟢 Version 1.1
Ordered so each unlocks the next.

| # | Work | Unlocks |
|---|---|---|
| 1 | **Departure date / nights** | real occupancy, everything financial |
| 2 | **Audit trail** | do early so later features are logged from day one; match HKIM's record shape |
| 3 | **Rate tab** — per category, per occupancy, internal only, never printed | revenue |
| 4 | **ADR / RevPAR / revenue reports** | management reporting |
| 5 | **IndexedDB or SQLite storage** | attachments |
| 6 | **Drag-drop attachments** per group — email, PDF, Word for payment confirmations | reference and audit |
| 7 | **CSV / Excel import** with column mapping and a review step | agent rooming lists |

**Rate model** as described by the developer — group rates are
priced by occupancy, not per room:

```
Category → Single occupancy rate
         → Double occupancy rate
         → Extra adult charge
         → Child with bed
         → Child without bed
```

A room computes itself from the occupancy already entered:
2 adults → double rate; 3 adults → double + extra adult;
2 adults + 1 child → double + child with bed. Auto-populated,
receptionist overrides where the agent negotiated otherwise.

**On PDF import** — text-based PDFs have extractable text but
no reliable structure, and scanned ones need OCR that produces
garbage on transliterated Indian names. Never auto-fill from a
PDF. Attach it for reference, extract to a review grid, require
confirmation. Excel and CSV are trustworthy because they have
real columns. Asking agents for Excel instead of PDF is the
highest-value process change available and costs no code.

**General undo/redo** — declined for v1.0. Cell edits already
have native browser undo; the damage that actually happens is
bulk replacement, which E6 now covers with one-step restore.
Revisit only if the restore bar proves insufficient in use.

## v2.0
- Electron + SQLite + auto-update (section 4)
- Suite merge with HKIM (`CLAUDE.md` §2)

---

# 6. TEST DATA

Seed script plants 3 groups / 25 rooms / 55 pax and a 20-room
master. Verification script checks 24 figures.

**Back up first:** Settings → Data Backup → Download Backup.

| | |
|---|---|
| All Groups | 3 groups · 25 rooms · 55 pax · 3 VIP |
| Meals | EP 8 · CP 18 · MAP 18 · AP 8 · Not Set 3 · Covers 52 |
| Inventory | Deluxe 10 · Super Deluxe 6 · Suite 3 · Unassigned 1 |
| Occupancy | 08-10 → 8/20 40% · 08-15 → 12/20 60% · 08-20 → 5/20 25% |
| Sharma Wedding | 8 rooms · 16 pax · 2 VIP · Deluxe 8/10 |

Deluxe shows 15 room-nights against 10 physical rooms — correct,
because 101–105 are used on two different dates.

---

# 7. PROCESS NOTES

**Roughly a third of phases have lost a round to a patch not
landing.** Causes by frequency:

1. A multi-step patch where one step was skipped
2. A `FIND THIS` block whose whitespace did not match
3. A replacement that took an adjacent function's closing brace
4. The file saved to the wrong place, or not saved at all
5. Browser serving a cached script or HTML
6. A patch inserted outside the object or function it belonged to

**Mitigations in force:**

- Phases touching more than ~4 places in one file get a
  complete file replacement instead of patches
- **New files are announced at the top of the message**, not
  buried at the end
- Verify byte size on disk after every replacement:
  `Get-ChildItem "js\*.js" | Select-Object Name, Length`
- All eleven cache busters bump together
- DevTools → Network → Disable cache while developing
- `logDiagnostics()` after any change — it catches missing
  functions, missing elements and column mismatches at boot

**One syntax error kills a whole file.** When diagnostics
reports many missing functions from one module, look for a
single red parse error above it rather than treating each as a
separate bug.

---

# 8. GIT

One commit per completed phase. Never commit broken code
(violated once during RM5b; recovered).

```
M1 … M13 · RM1 · RM2 · RM4 · RM5a-c · R1 · R2 · R3
SEC1 · DATA1 · E1 · E2a · E2b · E3 · E4 · E5 · E6
D1 · D2 · D3 · DIAG1 · RPT1
```

---

# 9. RESUMING

Next action: **D4** — extract `js/groups.js`, the last
modularization phase.

Before starting, confirm:
- Console shows `10 modules, 0 problems`
- `git status` clean and pushed
- Byte sizes on disk match