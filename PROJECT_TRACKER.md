# PROJECT_TRACKER.md
## Group Arrival Register — Living Status

**Version:** v1.0.0 RC1
**Last updated:** 2 August 2026
**Completion:** ~97%

Architecture, coding rules and locked decisions live in
`CLAUDE.md`. This file tracks state, progress and open work.

---

# 1. STATE — HEALTHY

```
Suite Diagnostics — 12 modules, 0 problems, storage 0%
```

```
d:\vikram\group arrival\
├── Group_Arrival_Register.html
├── css/style.css              2,995 lines, reorganized into
│                               22 named sections, zero
│                               duplicate selectors
├── js/
│   ├── dialog.js          loads 1st
│   ├── database.js        loads 2nd   owns DB, schema v3
│   ├── printing.js        loads 3rd
│   ├── room-master.js     loads 4th
│   ├── register.js        loads 5th
│   ├── dashboard.js       loads 6th
│   ├── reports.js         loads 7th
│   ├── report-print.js    loads 8th
│   ├── groups.js          loads 9th   owns group lifecycle
│   ├── app.js              735 lines  loads 10th, bootstrap only
│   ├── shortcuts.js       loads 11th
│   └── diagnostics.js     loads LAST
├── CLAUDE.md
├── PROJECT_TRACKER.md
├── README.md
├── CHANGELOG.md
└── jsconfig.json
```

`app.js` is now genuinely just bootstrap and shared services —
utilities, dates, navigation, settings, meal analytics,
collapsible panels, print/settings event bindings, controllers,
the single `DOMContentLoaded`. Everything else has its own file.

All twelve script tags carry the **same** cache-buster
convention. DevTools → Network → Disable cache while
developing; the app also carries a dev-only
`<meta http-equiv="Cache-Control" content="no-store">` in the
HTML head — **remove this before packaging**, it is
development-only.

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
| D1–D4 | `database.js`, `register.js`, `dashboard.js`, `groups.js` extracted — **modularization complete** |
| DIAG1 | Module health check, storage monitoring, sticky summary bar |
| RPT1 | Four printable operational reports |
| F1–F3 | README, CHANGELOG, version registry, `MODULE_VERSION` per file |
| E7 | Bulk meal plan, arrival-date past-date block |
| E8 | Print focus-lock fixed — root cause: Chrome popup-window input focus bug. Fixed by replacing `window.open()` print windows with hidden-iframe printing entirely. |
| E9 | Blank register fallback when a printed manifest date has no groups |
| E10 | Fixed asymmetric duplicate-room detection — the *first* occurrence of a repeated room was never flagged, only the second. Both `getInvalidRooms()` and `updateRegisterCategories()` now count occurrences and flag every row involved. |
| E11 | **Print now validates before printing** — `printRegister()` and `printRoomingList()` previously read the live register with no check at all; a duplicate correctly blocked from Save could still be printed. Both now call `getInvalidRooms()` first. All native `alert`/`prompt` in `printing.js` (including a second, previously-unnoticed one in `printBlankRegister()`) converted to the app's dialog system. |
| DEP1 | Departure-date data model in `database.js` — schema v3, `departureDate`/`nights`/`noShowFlag` on groups, `departureOverride`/`checkedOut` per room, migration for existing saved groups, `getRoomDepartureDate()` helper |
| REG1 | Multi-line Guest Name — real `.guestEditable` text area + real `.addGuestBtn` button, capped by room occupancy, guaranteed append-at-end ordering (fixes an earlier version where a line could land mid-name depending on caret position) |
| E14 | `css/style.css` fully deduplicated and reorganized — 43 duplicate selectors resolved, 3 dead `guestCell::after` rules removed, 22 named sections |
| — | Removed a harmless-but-redundant duplicate call to `initializeReportPrinting()` in the bootstrap |

---

# 3. MODULARIZATION — COMPLETE

All four phases of Sprint D are done. `app.js` reduced from its
original single-file size to 735 lines of bootstrap and shared
services only. No further extraction planned for v1.0.

---

# 4. REMAINING TO v1.0

### RC1 gate
- Full regression per §16 of `CLAUDE.md` after tonight's six
  fixes (E8–E14, DEP1, REG1)
- Remove the dev-only `no-store` meta tag before tagging

### Then
RC1 → **soak test on one real group arrival** → v1.0

---

# 5. DEPARTURE DATE PHASE — IN PROGRESS

Full spec agreed and locked (see `CLAUDE.md` §14 for the
authoritative version). **DEP1 (data model) is done.**

| Phase | Work | Status |
|---|---|---|
| DEP1 | `database.js` — schema, migration, `getRoomDepartureDate()` | ✅ Done |
| DEP2 | `groups.js` — new groups get the new fields; `register.js` — departure date / nights UI, Tab from Arrival → Departure, per-room override control | Next |
| DEP3 | Overlap detection rewritten for date ranges (not single-date matching); Settings toggle; PIN-overridable exception — **only ever across groups, never within one group** | Pending |
| DEP4 | Auto-checkout on load; Confirmed→No Show flagging (arrival date passed, never checked in); dashboard flag for overdue/no-show | Pending |
| DEP5 | Reports and print documents use real occupancy across the full stay, not just arrival date | Pending |

---

# 6. DISTRIBUTION REQUIREMENTS — recorded, not built

Stated by the developer during v1.0. **All post-v1.0.**

- Software will be **commercially distributed** to properties
- Modules must **not ship as plain-text source** — the ask is
  DLL-like packaging, not obfuscation
- Updates delivered by **server push or patch installer**
- Modules deliverable **individually or as a bundle**
- **Rollback** required — front office software that breaks
  mid-shift needs a way back

## Recommended path: v2.0 = Electron + SQLite

| Requirement | Electron mechanism |
|---|---|
| Not plain-text source | **bytenode** — V8 bytecode `.jsc` per module |
| Proper database | **SQLite** via Node, a real file on disk |
| Patch installer | **electron-updater**, differential and signed |
| Individual or bundled modules | Both — files stay separate and swappable |
| Rollback | Built into electron-updater |
| Commercial feel | Signed `.exe` installer, no browser |

**No rewrite required.** The twelve modules stay twelve modules.
Only the shell and storage layer change — storage is already
isolated behind `GroupRepository` and `RoomMasterRepository`.

**Rule already scoped in `CLAUDE.md`:** no build tools during
development, build tools allowed at packaging only.

`js/version.js` already gives an installer what it needs —
`EXPECTED_MODULES`, per-file `registerModuleVersion()` calls,
and `diagnostics.js` comparing loaded vs. expected versions at
boot. That comparison is the rollback trigger.

Open questions for the v2.0 design session:
- Version manifest format and where it is hosted
- Compatibility matrix between module versions and
  `SCHEMA_VERSION`
- Whether rollback restores modules only, or data as well

---

# 7. OPEN ITEMS

## 🟡 Before v1.0
- `printRoomingList()` column widths never visually verified
  against a real printout
- `DB.settings.showRoomCategory` unused since RM3 cancelled
  (category is screen-only, never printed, by design)

## 🟢 Version 1.1
Ordered so each unlocks the next.

| # | Work | Unlocks |
|---|---|---|
| 1 | **Departure date / nights** | in progress — see §5 above |
| 2 | **Audit trail** | do early so later features are logged from day one; match HKIM's record shape |
| 3 | **Rate tab** — per category, per occupancy, internal only, never printed | revenue |
| 4 | **ADR / RevPAR / revenue reports** | management reporting |
| 5 | **Names-first import + drag-drop Room Allocation screen** — agent sends names with no room numbers; register accepts blank rooms; a dedicated allocation screen lets staff search/drag names onto Room Master inventory. Allocation is a human decision, never automatic. | agent rooming lists without a room column |
| 6 | **Excel/CSV import with column mapping** — auto-suggest based on header text, always shown to staff for confirmation before import, mapping remembered per agent | feeds #5 |
| 7 | IndexedDB or SQLite storage | attachments |
| 8 | Drag-drop attachments per group — email, PDF, Word for payment confirmations | reference and audit |

**Rate model** — group rates priced by occupancy, not per room:

```
Category → Single occupancy rate
         → Double occupancy rate
         → Extra adult charge
         → Child with bed
         → Child without bed
```

A room computes itself from the occupancy already entered.
Auto-populated, receptionist overrides where the agent
negotiated otherwise.

**On PDF/OCR import** — never auto-fill from a PDF or scanned
document. Text-based PDFs have no reliable structure across
agents; scans need OCR that mangles transliterated Indian
names. A confidently wrong guest name is worse than a blank
one, since nobody re-checks a field the software already
filled in. Attach for reference; any extraction goes through
the same confirm-before-commit review as Excel import.

**General undo/redo** — declined for v1.0. Cell edits already
have native browser undo; the damage that actually happens is
bulk replacement, which E6's one-step restore already covers.

## v2.0
- Electron + SQLite + auto-update (§6)
- Suite merge with HKIM (`CLAUDE.md` §2)

---

# 8. TEST DATA

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

**Note:** since DEP1's migration, every group in this seed data
(and any pre-existing saved group) now also carries
`departureDate` (arrival + 1 night by default), `nights`, and
`noShowFlag: false`. This does not change any of the figures
above — DEP2–DEP5 are what will start using these fields.

---

# 9. PROCESS NOTES

**Roughly a third of phases have lost a round to a patch not
landing.** Causes by frequency:

1. A multi-step patch where one step was skipped
2. A `FIND THIS` block whose whitespace did not match
3. A replacement that took an adjacent function's closing brace
4. The file saved to the wrong place, or not saved at all
5. Browser serving a cached script or HTML
6. A patch inserted outside the object or function it belonged to
7. **New (tonight):** a step pasted twice into the same
   function — caught in `initializeApplication()`'s duplicate
   `initializeReportPrinting()` call

**Mitigations in force:**

- Phases touching more than ~4 places in one file get a
  complete file replacement instead of patches
- New files are announced at the **top** of the message
- Verify byte size on disk after every replacement
- `logDiagnostics()` after any change
- For large, cross-cutting changes (like tonight's CSS
  reorganization), work from the actual uploaded file,
  programmatically parsed and verified — not reconstructed
  from memory across many prior messages

**One syntax error kills a whole file.** When diagnostics
reports many missing functions from one module, look for a
single red parse error above it rather than treating each as a
separate bug.

**`addEventListener` with a stable, named function reference is
a documented no-op on the second identical call.** A function
being bound twice in a bootstrap is dead/wasteful code, not
automatically a live double-firing bug — check before assuming
the worst.

---

# 10. GIT

One commit per completed phase. Never commit broken code
(violated once during RM5b; recovered).

```
M1 … M13 · RM1 · RM2 · RM4 · RM5a-c · R1 · R2 · R3
SEC1 · DATA1 · E1 · E2a · E2b · E3 · E4 · E5 · E6
D1 · D2 · D3 · D4 · DIAG1 · RPT1 · F1 · F2 · F3
E7 · E8 · E9 · E10 · E11 · DEP1 · REG1 · E14
```

---

# 11. RESUMING

Next action: **DEP2** — `groups.js` gets the new departure
fields on group creation; `register.js` gets the Departure
Date / Nights inputs, Tab-to-Departure-Date, and the per-room
override control.

Before starting, confirm:
- Console shows `12 modules, 0 problems`
- `git status` clean and pushed
- Byte sizes on disk match