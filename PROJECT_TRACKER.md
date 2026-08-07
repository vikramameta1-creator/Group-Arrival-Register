# PROJECT_TRACKER.md
## Group Arrival Register — Living Status

**Version:** v1.0.0 RC1
**Last updated:** 4 August 2026
**Completion:** ~98%

Architecture, coding rules and locked decisions live in
`CLAUDE.md`. This file tracks state, progress and open work.

---

# 1. STATE — ONE KNOWN BUG, DIAGNOSTIC PENDING

```
Suite Diagnostics — 12 modules, 0 problems, storage 0%
```

```
d:\vikram\group arrival\
├── Group_Arrival_Register.html
├── css/style.css              22 named sections
├── js/
│   ├── version.js         loads 1st
│   ├── dialog.js          loads 2nd
│   ├── database.js        loads 3rd   schema v4 (audit log)
│   ├── printing.js        loads 4th   hidden-iframe printing
│   ├── room-master.js     loads 5th   PIN change now secure
│   ├── register.js        loads 6th   checkout mechanism
│   ├── dashboard.js       loads 7th
│   ├── reports.js         loads 8th
│   ├── report-print.js    loads 9th   ⚠ CSV export requested,
│   │                                    not yet built
│   ├── groups.js          loads 10th  id-based identity,
│   │                                    auto status transitions
│   ├── app.js             loads 11th  No Show PIN guard
│   ├── shortcuts.js       loads 12th
│   └── diagnostics.js     loads LAST  + downloadable report
├── CLAUDE.md
├── PROJECT_TRACKER.md
├── README.md
├── CHANGELOG.md
└── jsconfig.json
```

**⚠ Open bug, diagnostic requested, awaiting result:** Check Out
Group does not appear to update the group's status. Diagnostic
script given to the developer — do not patch again until the
result comes back. See §5.

---

# 2. MASTER CHECKLIST

## v1.0 Foundation — complete
- [x] Database, repositories, schema versioning, migration
- [x] Arrival Register — rows, validation, occupancy caps,
      children, keyboard nav
- [x] Room Master — categories, inventory, occupancy rules, PIN
- [x] Dashboard, Reports (screen + 4 printable), Rooming List
- [x] In-page dialogs, keyboard shortcuts, one-step restore,
      draft recovery
- [x] Full modularization — 13 focused modules
- [x] Diagnostics + version registry + downloadable report
- [x] README, CHANGELOG, `CLAUDE.md`, `PROJECT_TRACKER.md`

## Hardening pass — complete
- [x] Print focus-lock (hidden-iframe printing)
- [x] Asymmetric duplicate-room detection fixed
- [x] Print validates the same as Save
- [x] Multi-line Guest Name — real button, ordering, capped
- [x] `style.css` deduplicated (43 duplicates resolved)
- [x] Downloadable diagnostic report

## Departure Date Phase
- [x] **DEP1** — schema v4 (bumped again for audit log),
      migration, `getRoomDepartureDate()`
- [x] **DEP2** — Nights/Departure Date UI, Tab navigation,
      per-room checkout override
- [x] **DEP3** — cross-group overlap detection, PIN override,
      **audit trail foundation** (`recordAuditEntry()`)
- [x] **DEP4a** — automatic No Show / Checked Out transitions,
      PIN-gated reversal, No Show as a real selectable status
- [x] **DEP4b** — manual per-room and per-group checkout,
      built as one clean function pair
      (`checkOutRoom` / `checkOutEntireGroup`) so a future
      PMS integration calls the same code the UI does —
      **currently has one open bug, see §5**
- [ ] **DEP5** — Reports and print documents use real occupancy
      across the full stay, not just arrival date

## Security / data-integrity fixes found during DEP3–4
- [x] **SEC2** — Change PIN required no verification of the
      current PIN; anyone could silently overwrite it. Fixed:
      current PIN now required first.
- [x] **Group identity switched from name-based to id-based**
      throughout save/load/draft. Two groups sharing a display
      name (different tour codes, same client) could silently
      overwrite each other on save. Real, pre-existing data-loss
      bug, surfaced by a business question, not a bug report.

## Release gate
- [ ] Fix the checkout-status bug (§5)
- [ ] Build CSV export for the four printable reports (§6)
- [ ] Decide report-tab status filter UI — dropdown (built) vs.
      separate quick-filter buttons (§6)
- [ ] Full regression per `CLAUDE.md` §16 once DEP5 lands
- [ ] Remove dev-only `no-store` meta tag
- [ ] Soak test — one real group arrival
- [ ] Tag `v1.0.0`

## v1.1 backlog (not started)
- [ ] Audit trail UI/reporting — the *data layer* exists and is
      recording real entries now (DEP3/DEP4); a screen to
      actually browse it does not exist yet
- [ ] **Active / Departed / All filter for Saved Groups** —
      researched tonight, see §7. Filtered view, never deletes
      or hides data permanently.
- [ ] Manager PIN reset/recovery mechanism — a hotel that
      forgets its PIN currently has no recovery path except
      editing localStorage directly, which nobody at a front
      desk should be doing
- [ ] Rate tab — per occupancy per category, internal only.
      **No Show must generate a chargeable line** (typically one
      night) — confirmed by the developer as a real revenue/
      reporting requirement, not just a status label
- [ ] ADR / RevPAR / revenue reports
- [ ] Attachment storage (IndexedDB or SQLite)
- [ ] Drag-drop attachments per group
- [ ] Excel/CSV **import** with column mapping (different from
      the CSV *export* requested for reports — export is
      buildable now with no new dependency; import needs
      SheetJS, a real new dependency)
- [ ] Names-first import + drag-drop Room Allocation screen

## v2.0
- [ ] Electron + SQLite + auto-update
- [ ] Suite merge with HKIM

---

# 3. AUDIT TRAIL — WHAT ACTUALLY EXISTS NOW

Built tonight as a genuine foundation, not a one-off. One
function, `recordAuditEntry(action, details)` in `database.js`,
is the single door everything writes through. `DB.auditLog` is
a flat array; `actor` is a placeholder (`"Front Office"`) until
real user accounts exist — the shape does not change when they
do, the field just starts holding a real username.

**Currently logging, for real, right now:**
- Cross-group overlap overrides (PIN-verified or not)
- Automatic No Show transitions
- Automatic Checked Out transitions
- No Show manually reversed
- Manual per-room checkout (both directions — checking and
  unchecking are both logged)
- Manual per-group checkout

**What does not exist yet:** any screen to browse
`DB.auditLog`. Right now it is `console.log`-accessible only
via `getAuditLog()`. A real audit trail UI is v1.1 scope.

---

# 4. DEPARTURE DATE PHASE — DETAIL

Full spec is authoritative in `CLAUDE.md` §14.

**DEP1–DEP4b are done.** The full spec — Nights/Departure Date
input, per-room override, cross-group overlap with PIN
override, automatic No Show and Checked Out transitions, manual
checkout — is built and (apart from the one open bug in §5)
working.

**DEP5 (last piece):** RM4's existing occupancy-by-date logic
only knows a room is occupied on its *arrival* date. With real
departure dates now in the data, occupancy should span the full
stay. This touches `reports.js` and `report-print.js`'s
date-range logic. Also: RM4's double-booking detector has no
idea DEP3's override system exists — an approved cross-group
overlap currently still shows as a plain, unexplained conflict
in reports rather than "Approved — Manager PIN, [timestamp]".
DEP5 should fix this too.

---

# 5. OPEN BUG — CHECK OUT NOT UPDATING STATUS

Reported at end of session. Diagnostic script given to the
developer, **result not yet received.** Do not patch blind —
three guesses tonight already cost real time; this one needs
the console output first.

**Diagnostic given:**
```javascript
console.log("button exists:", !!document.getElementById("btnCheckOutGroup"));
console.log("function exists:", typeof checkOutEntireGroup);
console.log("status dropdown value:", document.getElementById("groupStatus")?.value);
const rows = getRegisterRows().filter(r => !isEmptyRegisterRow(r));
console.log("real rows:", rows.length);
console.log("checkedOut per row:", rows.map(r => r.checkedOut));
console.log("all checked out?", rows.length > 0 && rows.every(r => r.checkedOut));
```

**Also requested, not yet built (waiting on the bug fix first,
since both touch the same code):**
- The "✓ Checked out" checkbox needs to visually stand out —
  currently looks like a normal form control, staff could miss
  it or confuse it with something else
- Per-room checkout currently has **no acknowledgment** —
  only the whole-group button shows a confirmation. Real gap,
  confirmed, not yet fixed.

---

# 6. REPORTS — TWO OPEN ITEMS

**CSV export "everywhere," described as a must-have.** No new
dependency needed — this is *export*, not import, so it's the
same Blob+download pattern already used three times in this
codebase (register CSV, diagnostic report, group JSON export).
Scoped to the four printable reports (Manifest, Housekeeping,
Covers, Flash), reusing their existing data-gathering
functions, output as CSV instead of HTML.
**`js/report-print.js` was uploaded but not yet built against —
ran out of session time.** Build this first next session.

**Status filter UI — needs one decision.** The Reports Status
dropdown already includes all seven values including No Show
(built in DEP4a). Open question: is a single dropdown enough,
or does the developer want separate one-click quick-filter
buttons instead? Asked, not yet answered.

**Explicitly deferred by the developer, mid-message
self-correction:** a separate report-tab *section* (not filter)
showing per-status audit-style reports. Developer said "I got
it wrong... don't initiate now." No action — logged only so it
isn't lost, not scheduled.

---

# 7. RESEARCH — ACTIVE/DEPARTED SEPARATION (PMS PATTERN)

Developer asked for real research into how PMS software
separates in-house from departed guests, before any design
decision. Findings:

- Real PMS systems <cite>show all checkouts scheduled for
  today, separated from in-house guests</cite> on the daily
  view — confirming the developer's instinct that something
  needs to change here.
- Critically, the *mechanism* is **filtered views over one
  dataset**, not physical relocation — <cite>color coding and
  filters allow staff to quickly switch between arrivals,
  departures, and in-house stays</cite>. Nothing disappears or
  moves to a hidden store; it's a lens change.

**Recommendation for the future design conversation** (not
built, not scheduled): Saved Groups gains an **Active / Departed
/ All** filter, defaulting to Active. Checked Out and Cancelled
groups stop cluttering the daily list but stay one click away —
deliberately avoiding a "did I lose my data" scare, which this
project has had genuine false alarms about before.

---

# 8. TEST DATA

Seed script plants 3 groups / 25 rooms / 55 pax and a 20-room
master. Verification script checks 24 figures.

**Note:** since DEP1's migration, every group also carries
`departureDate`, `nights`, `noShowFlag`. Since DEP3, `DB` also
carries `auditLog: []`. Neither changes any of the original
seed figures — DEP5 is what starts making occupancy figures
reflect the full stay rather than arrival date only.

Back up first: Settings → Data Backup → Download Backup.

---

# 9. PROCESS NOTES

**New this session — a real workflow correction, requested
explicitly by the developer:**

> "Like this file — when you gave me the full new file, upload
> it in your memory as well, because that's what I will do
> next step. And for functions as well — when you say you
> change something and it's confirmed, amend your file
> accordingly, and do this for all the projects that I have."

**Standing rule going forward:** any file handed over and
confirmed applied becomes the working copy in memory
immediately — not re-derived from an older copy later in the
same session. When a file has NOT been touched recently, or
there is any doubt, **ask for a fresh upload rather than assume**
— this is what caught two real bugs tonight (the PIN check
and the stale `room-master.js`) before they compounded further.

**Every session ends with `CLAUDE.md` and `PROJECT_TRACKER.md`
rewritten, without fail** — this is what makes the "ask before
assuming" rule actually work across sessions, since memory does
not persist between them on its own.

**This session's failure mode, for the record:** building
against an in-memory copy of `room-master.js` that predated a
later phase (missing its version-registration line), and
guessing at the underlying cause of a PIN mismatch instead of
running the deterministic hash check first. Both cost a round
each. Both are now covered by the rule above.

**Recurring failure modes and mitigations, cumulative:**
1. A multi-step patch where one step was skipped
2. A `FIND THIS` block whose whitespace did not match
3. A replacement that took an adjacent function's closing brace
4. The file saved to the wrong place, or not saved at all
5. Browser serving a cached script or HTML
6. A patch inserted outside the object or function it belonged
   to
7. A step pasted twice into the same function
8. An edit anchor matching more than one function with similar
   field names — caught by exact-match assertions before
   writing anything
9. A module missing its own trailing `registerModuleVersion()`
   call
10. **New:** building against a stale in-memory file instead of
    the confirmed current one
11. **New:** guessing at a bug's cause instead of running a
    deterministic check first, when one was available

---

# 10. GIT

```
M1 … M13 · RM1 · RM2 · RM4 · RM5a-c · R1 · R2 · R3
SEC1 · DATA1 · E1 · E2a · E2b · E3 · E4 · E5 · E6
D1 · D2 · D3 · D4 · DIAG1 · RPT1 · F1 · F2 · F3
E7 · E8 · E9 · E10 · E11 · DEP1 · REG1 · E14
DEP2 · DIAG2 · DEP3 · SEC2 · DEP4a · DEP4b
```

Commit tonight's work before closing, if not already done:
```
DEP4a - Automatic No Show and Checked Out status transitions with PIN-gated reversal
DEP4b - Manual per-room and per-group checkout, PMS-integration-ready
SEC2 - PIN change requires current PIN; group identity fixed from name-based to id-based
```

---

# 11. RESUMING TOMORROW — IN ORDER

1. **Get the checkout-status diagnostic result first.** Do not
   touch that code until the console output is in hand.
2. Fix the bug once diagnosed; add checkbox visual distinction
   and per-room acknowledgment toast in the same pass, since
   they touch the same area
3. Upload `js/report-print.js` fresh (already provided once,
   but per the new rule, confirm it's still current before
   building against it) — build CSV export for the four
   printable reports
4. Get an answer on the report-tab status filter question
   (dropdown vs. quick-filter buttons)
5. **DEP5** — real occupancy across the full stay in reports,
   plus approved-override labeling in the double-booking
   detector

Before starting, confirm:
- Console shows `12 modules, 0 problems`
- `git status` clean and pushed
- Byte sizes on disk match