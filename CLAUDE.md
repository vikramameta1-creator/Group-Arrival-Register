# CLAUDE.md
## Group Arrival Register — Authoritative Project Context

Read this file completely before suggesting any code change.
This file wins over anything you remember about this project.

---

# 1. WHAT THIS IS

Front office software for hotel group arrivals — rooming lists,
meal plans, room categories, occupancy control, printing and
operational reports.

Target feel: Oracle Opera, IDS Next, eZee FrontDesk, Hotelogix.
Not a generic CRUD app. Software a receptionist uses every day.

**Author:** Vikram Ameta
**Version:** v1.0.0 RC1
**Completion:** ~96% — packaging remains
**Platform:** plain HTML / CSS / JavaScript, localStorage, no
build step during development

---

# 2. THIS IS ONE APP IN A SUITE

A second application exists: **Hotel Key Inventory Management
(HKIM)** — a key register. About 20 modules, storage key
`HKIM_DATABASE`, an immutable transaction ledger with
`before`/`after` balances, plus audit log, business days,
shifts and counters.

A **PMS comes later**; this app may become one section of it.

**HKIM is architecturally ahead** — `"use strict"`, frozen
constants, `crypto.randomUUID()`, ISO timestamps from day one,
an immutable transaction model and an audit log. At merge,
**HKIM's structure is the template**, not this app's.

## Suite decision — LOCKED

**Ship both standalone at v1.0. Merge at v2.0.** Merging
mid-development means neither ships.

## Shared database shape — agreed, not built

```
HOTEL_SUITE_DB
├── meta        schemaVersion, appVersions, created, updated
├── property    hotel name, city, timezone, logo, footer  SHARED
├── rooms       inventory, categories, occupancy rules    SHARED
├── users       accounts, roles, PIN hashes               SHARED
├── audit       one log across all modules                SHARED
├── arrivals    groups, register data                     GAR owns
└── keys        transactions, businessDays, shifts        HKIM owns
```

**Rooms and property move out of both apps into the shared
core.** HKIM stops hardcoding 76 rooms and reads the Room
Master. Both apps read one hotel name.

## Five collisions to resolve at merge

1. **Two databases** — `HKIM_DATABASE` and
   `hotel_group_operations_v5`
2. **Two sources of truth for rooms** — HKIM hardcodes
   `ROOM.MIN 1, MAX 76`; GAR has a full Room Master
3. **Two hotel identities** — HKIM `CONFIG.hotel.name`
   ("Ramada Encore") vs GAR `DB.settings.hotelName`
4. **Global function collisions** — both define
   `loadDatabase()`, `saveDatabase()`, `settings`, `reports`.
   On a shared page the later file silently wins.
5. **Schema version disagreement** — HKIM `createDatabase()`
   writes `schema: 2` while its `constants.js` says `1`

Meanwhile: stop divergence getting worse. Room numbering is
urgent — HKIM caps at 76 numeric, GAR allows 3-digit numeric
or 10-char alphanumeric.

---

# 3. HOW TO ANSWER — NON-NEGOTIABLE

The developer is not a professional JavaScript developer and
works entirely by copy and paste.

**Format for every change:**

> **FILE:** `js/app.js`
> **FIND THIS:** *(exact text)*
> **REPLACE WITH THIS:** *(complete replacement)*
> or **DELETE ALL OF IT**

Rules:

- Always name the file. Eleven JS modules are in play.
- Always give COMPLETE functions. Never fragments.
- Never "insert this somewhere" or "add this near".
- Never reference line numbers. Reference SECTION HEADERS.
- Never assume a function exists — check or ask.
- One phase at a time, ending in a test and a commit.
- Syntax error → stop everything and fix it first.

**Two hard-won rules:**

1. **If a phase touches more than about four places in one
   file, ask for the file and return a complete verified
   replacement.** Every multi-patch phase has lost a round to
   a partially applied patch.
2. **Announce new files at the TOP of the message**, not at
   the end. They get missed otherwise.

Classify suggestions: 🔴 blocker · 🟡 before v1.0 · 🟢 v1.1
Always explain WHY a change matters to hotel operations.

---

# 4. FILE STRUCTURE

```
d:\vikram\group arrival\
├── Group_Arrival_Register.html    (NOT index.html)
├── css/style.css
├── js/
│   ├── dialog.js         1st   no dependencies
│   ├── database.js       2nd   owns DB, GroupRepository
│   ├── printing.js       3rd   print engine
│   ├── room-master.js    4th   owns RoomMasterRepository
│   ├── register.js       5th   owns REGISTER_COLUMNS
│   ├── dashboard.js      6th
│   ├── reports.js        7th   on-screen reports
│   ├── report-print.js   8th   printable reports
│   ├── groups.js         9th   group lifecycle
│   ├── app.js           10th   bootstrap, settings, nav
│   ├── shortcuts.js     11th   depends on everything
│   └── diagnostics.js   LAST   verifies all of the above
├── CLAUDE.md
├── PROJECT_TRACKER.md
├── README.md
├── CHANGELOG.md
└── jsconfig.json
```

**Load order is fixed.** `dialog.js` first because nothing
depends on it. `database.js` second because it declares `DB`
with `let` and `GroupRepository` with `const` — neither is
hoisted. `diagnostics.js` last so it can verify the rest.

## Cache busters — critical

Every script tag carries `?v=N`, all the **same number**.
**After replacing ANY file, change all twelve to the next
number.** One find-and-replace.

The HTML itself also caches. A `<meta http-equiv="Cache-Control"
content="no-store">` sits in the head for development —
**remove it before packaging.** Also use DevTools → Network →
Disable cache.

## Verify on disk, not in the editor

```powershell
Get-ChildItem "js\*.js" | Select-Object Name, Length
```

The editor can show new code while disk holds the old file.
Windows CRLF adds one byte per line, so on-disk size is
LF size + line count.

---

# 5. CODING STYLE

- Vanilla JavaScript only. No frameworks, React or TypeScript.
- **No build tools during development. Build tools are allowed
  at packaging only** — see §12 on distribution.
- Plain `function` declarations, global scope, no ES modules
- Generous blank lines and vertical spacing
- Section headers everywhere:

```javascript
/* =====================================================
   SECTION NAME
===================================================== */
```

- Minimal nesting, no clever abstractions
- New event bindings go in `initialize*Events()`

---

# 6. ARCHITECTURE

```
DOMContentLoaded  →  initializeApplication()
      initializeDialogs()
      refreshApplicationSettings()
      initializeNavigation()
      initializeRegisterEvents()
      initializeRegisterSearch()
      initializeRestoreBar()
      initializeGroupEvents()
      initializePrintEvents()
      initializeSettingsEvents()
      initializeRoomMaster()
      initializeReports()
      initializeReportPrinting()
      initializeProfessionalTools()
      restoreDraft()
      timers
      refreshApplication()
      initializeShortcuts()
```

**Exactly one `DOMContentLoaded` for the application**, at the
bottom of `app.js`. `diagnostics.js` adds a second on purpose,
delayed 400 ms, so it can check that every module booted. That
is the only exception.

## Controllers

Never refresh modules individually from UI code.

| Controller | Does |
|---|---|
| `refreshApplication()` | settings + dashboard + register + room master |
| `refreshApplicationSettings()` | branding, logo, clock |
| `refreshEntireDashboard()` | KPIs, control center, arrival cards, saved groups |
| `refreshRegisterViews()` | categories + summary + rooming list + reports |

## Repositories

UI must never touch `DB.groups` or `DB.roomMaster` directly.

```
GroupRepository       getAll get add update remove count
RoomMasterRepository  getCategories addCategory renameCategory
                      removeCategory getRule setRuleField
                      getRoomNumbers getCategory setRoom
                      setRoomsSilently removeRoom
                      removeAllRooms totalRooms totalBeds
                      countByCategory
```

All write methods call `saveDatabase()` internally.
**This layer is what makes v2.0 feasible** — moving to SQLite
or an API rewrites repository internals and nothing else.

## Printing

All output goes through
`openPrintWindow(title, html, extraStyles)`.
Never `window.print()` from UI code.

## Dialogs

**No native `alert` / `confirm` / `prompt` anywhere.**

```javascript
await showAlert("Saved");
if (!await showConfirm("Delete?", null, {danger:true})) return;
const v = await showPrompt("Room", "101");   // null = cancelled
```

Call sites must be `async`. Destructive actions pass
`{danger:true, okLabel:"Delete"}`.

---

# 7. DATA MODEL

```javascript
DB = {
    schemaVersion: 2,
    groups: [{
        id, groupName, arrivalDate, agent, preparedBy,
        status, notes, totalRooms, totalPax,
        createdOn, modifiedOn,              // ISO 8601
        rooms: [{ roomNo, guestName, pax, children,
                  childAges, meal, mobile, vip,
                  specialRequest }]
    }],
    settings: {
        hotelName, footerText, logo,
        roomNumbersOnly, restrictRoomsToMaster,
        roomMasterPinHash
    },
    roomMaster: {
        categories: [ "Deluxe" ],
        rooms:      { "101": "Deluxe", "401": "" },
        rules:      { "Deluxe": { defaultAdults, maxAdults,
                                  maxChildren, maxOccupancy } }
    },
    archive: []
}
```

Keys: `hotel_group_operations_v5`, `GROUP_DRAFT`

**ISO 8601 timestamps only** (`nowISO()`). `toLocaleString()`
produced `"28/07/2026, 3:49:33 am"`, which sorts by day-of-month
and is unparseable by any API. `formatTimestamp()` renders for
display. `migrateDatabase()` converts legacy records once.

Bump `SCHEMA_VERSION` and add an `if (from < N)` block to
migrate.

---

# 8. REGISTER MODEL

## Column map — 9 wide

```javascript
REGISTER_COLUMNS = { SR:0, ROOM:1, CATEGORY:2, GUEST:3,
                     PAX:4, CHILDREN:5, MEAL:6, MOBILE:7,
                     EXTRA:8 }
```

**Never a raw `cells[n]` index.** Always
`cells[REGISTER_COLUMNS.NAME]`. A column shift once
misaligned the entire register silently. The `<thead>` count
must always equal `Object.keys(REGISTER_COLUMNS).length` —
diagnostics checks this at boot.

## Occupancy — the anti-hack

**Max Occupancy caps the TOTAL people in a room.** Children are
a *subset* of pax, never an addition. `adults = pax − children`.

Raising Children can never raise Pax, so moving a person from
the adult column to the child column cannot create space. The
loophole is structurally impossible, not policed. The children
input's `max` is set live to `min(maxChildren, pax)`.

## Input rules

| Column | Accepts | Max |
|---|---|---|
| Room (numeric mode) | digits | 3 |
| Room (free mode) | letters, digits, `-`, space | 10 |
| Guest Name | anything, whitespace collapsed | 60 |
| Pax | digits | 2 |
| Children | digits, clamped to room capacity | — |
| Mobile | digits, `+`, `-`, space | 15 |
| Special Request | anything | 80 |

## Hard blocks on Save

`getInvalidRooms()` returns a numbered list. Save is **blocked,
never warned**, on: room not in the Room Master, duplicate room
within the group, pax over Max Occupancy, children over Max
Children, adults over Max Adults.

## One-step restore

Clear Register, Generate Rows and Bulk Import snapshot the
register before wiping and offer **Restore**. Session-only,
deliberately not persisted — it would compete with the draft
banner.

General undo/redo was **declined**: cell edits already have
native browser undo, and the damage that actually happens is
bulk replacement.

## Empty rows

`isEmptyRegisterRow()` — a row counts only once something is
entered. Pax is ignored because new rows default to 1. Used by
summary, rooming list and reports so they cannot disagree.

---

# 9. REPORTS

**On screen** — Current Group / All Groups scopes, four cards,
filters by arrival date range, status and agent.

**Printed** — four documents through `openPrintWindow()`:
Daily Arrival Manifest, Housekeeping Allocation, F&B Covers,
Management Flash.

**Occupancy is valid for ONE date only.** A room reused on
different dates cannot be summed into a single percentage, so
occupancy is reported per arrival date. Cross-group
double-booking is detected and named.

**Not possible without v1.1 data:** revenue, ADR, RevPAR (no
rates), departure manifest (no departure date), housekeeping
status. Reports say so in print rather than showing a
fabricated number.

---

# 10. KEYBOARD

`Alt`+`1`–`6` tabs · `Ctrl`+`S` save · `Ctrl`+`P` print ·
`Ctrl`+`Shift`+`B` blank register · `Ctrl`+`Enter` add row ·
`Ctrl`+`G` room count · `Ctrl`+`D` duplicates · `F1`/`?` help ·
`Enter` next row same column · `Esc` close dialog

`Ctrl+N` avoided — browsers reserve it. Plain `?` suppressed
while typing. All shortcuts suppressed while a dialog is open
or Room Master is PIN-locked.

---

# 11. DIAGNOSTICS

`diagnostics.js` verifies at boot: every function in the
manifest exists, six global objects exist, 45 element IDs are
present, register columns match, no module loaded twice, and
storage usage (warn 75%, error 90%).

```
Suite Diagnostics — 10 modules, 0 problems, storage 0%
```

**When it reports many missing functions from one module, look
for a single parse error above it** — one syntax error kills a
whole file and every function in it.

**Keep the manifest current.** When a function moves between
modules, update `MODULE_MANIFEST` in the same phase.

This becomes the post-update verification step and the cloud
health endpoint.

---

# 12. DISTRIBUTION — recorded, post-v1.0

Developer requirements:

- Commercially distributed to properties
- Modules must **not ship as plain-text source** — the ask is
  DLL-like packaging, not obfuscation
- Updates by **server push or patch installer**
- Modules deliverable **individually or bundled**
- **Rollback** required — front office software that breaks
  mid-shift needs a way back

## Recommended: v2.0 = Electron + SQLite

Browser JavaScript has no DLL equivalent. Electron solves
several stated goals at once:

| Requirement | Mechanism |
|---|---|
| Not plain-text source | **bytenode** — V8 bytecode `.jsc` per module |
| Proper database | **SQLite** via Node |
| Patch installer | **electron-updater**, differential, signed |
| Individual or bundled | Both — files stay swappable |
| Rollback | Built into electron-updater |
| Commercial feel | Signed `.exe`, no browser |

**No rewrite required.** Electron runs the existing HTML, CSS
and JavaScript. Eleven modules stay eleven modules. Only the
shell and storage layer change — and storage is already behind
the repositories.

Open for the v2.0 design session: manifest format and hosting,
module-version to `SCHEMA_VERSION` compatibility matrix,
whether rollback restores data as well as code.

---

# 13. BUGS FIXED — DO NOT REINTRODUCE

| Bug | Effect | Fix |
|---|---|---|
| `saveDB()` undefined in repository | every saved group lost on reload | `saveDatabase()` |
| Filtered index passed to delete | searching then deleting removed the **wrong group** | carry the real `DB.groups` index through filter and sort |
| `toISOString()` for local dates | arrivals wrong before 05:30 IST, during night audit | `getLocalDateString()` |
| `toLocaleString()` timestamps | groups sorted by day-of-month | ISO 8601 + migration |
| `getRegisterRows()` declared twice | blank guest names on print and CSV | one declaration |
| `<thead>` one column short of body | every value under the wrong heading | headers must match `REGISTER_COLUMNS` |
| Five competing startup blocks | duplicate bindings | one bootstrap |
| `printBlankRegister()` duplicated | wrong version ran | lives only in `printing.js` |
| `addVIPColumn()` appending headers | two empty columns on Rooming List | functions deleted |
| `clearRegisterFields()` never declared | Clear Register did nothing | declared in `register.js` |
| Superseded input filters kept | would break the room-mode toggle | removed |
| Nested scrollbar | two scrollbars on long groups | page scrolls, header sticks to viewport |
| `window[name]` to detect globals | 6 false "missing object" reports | `new Function("return typeof x")` — top-level `const`/`let` are not on `window` |

---

# 14. DECISIONS — DO NOT REOPEN

| Decision | Outcome |
|---|---|
| Suite | Ship separately at v1.0, merge at v2.0 |
| Folder | `js/`, not `modules/` |
| Entry file | `Group_Arrival_Register.html` |
| Room model | Inventory-first — rooms exist with or without a category |
| Occupancy cap | **Total occupants**, not adults |
| Children | Count per row + one age box each (0–17) |
| Pax auto-fill | From category Default Adults, stops once manually edited |
| Auto Room Series | Walks real Room Master inventory; a single number means "start here" |
| Duplicate rooms | **Hard block** on save |
| Over-capacity | **Hard block** on save |
| Category on screen | Arrival Register and Rooming List |
| Category on print | **Never** — Housekeeping knows the property |
| Unmapped rooms | Silent grey dash |
| Room Master PIN | Accident guard only, honestly labelled |
| Guests per room | One row = one room; extra guests in Guest Name |
| Unsaved draft | Restore + Keep/Discard banner, schema-versioned |
| Destructive actions | Confirm + one-step restore, not general undo |
| Reports scope | Current Group and All Groups, with filters |
| Report periods | No weekly / monthly / yearly rollups |
| Occupancy percentage | Valid for ONE date only |
| Storage | localStorage for v1.0; real database at v2.0 |

---

# 15. ROADMAP

### Done
Sprints A–F1 · four modules extracted · reports verified ·
dialogs · shortcuts · diagnostics · printable reports

### Remaining for v1.0
- `F2` this refresh
- `F3` per-module `MODULE_VERSION` reported by diagnostics,
  `APP_VERSION` in footer and printed documents, remove the
  dev `no-store` meta tag, tag `v1.0.0`
- RC1 → **soak test on one real group arrival** → v1.0

### v1.1 — ordered so each unlocks the next
1. **Departure date / nights** — real occupancy, everything
   financial
2. **Audit trail** — early, so later features are logged from
   day one; match HKIM's record shape
3. **Rate tab** — per occupancy per category, internal only:
   single, double, extra adult, child with bed, child without
   bed. A room computes itself from occupancy already entered.
4. ADR / RevPAR / revenue reports
5. Attachment storage (IndexedDB or SQLite)
6. Drag-drop attachments per group — email, PDF, Word
7. **Import and room allocation workflow** — three parts,
   designed together as one flow:

   a. **Excel import with column mapping.** Read the file, show
      the actual header row. Auto-suggest a mapping using simple
      heuristics (a column headed "Name"/"Guest" pre-selects as
      Guest Name; "Mobile"/"Phone"/"Contact" pre-selects as
      Mobile) but the suggestion is always shown to staff for
      confirmation before anything imports — never committed
      silently. Remember the mapping per agent, since most reuse
      their own template. Requires **SheetJS** as a dependency —
      the first exception to the no-library rule, needs an
      explicit decision when this phase starts.

   b. **Names load with rooms deliberately blank.** Many agent
      lists carry guest names with no room numbers at all. The
      register accepts this rather than blocking on it.

   c. **A separate Room Allocation screen** — not the main
      register. Unassigned names on one side, live Room Master
      inventory on the other, search both, drag a name onto a
      room or assign by click. This is explicitly a **human
      decision, not a smart/automatic allocation** — the
      software's job is making the assignment fast, not making
      the assignment.

   **Never auto-fill from a PDF or scanned document.** Text PDFs
   have no reliable structure across agents and scans need OCR
   that mangles transliterated Indian names — a confidently wrong
   guest name is worse than a blank one, since nobody re-checks a
   field the software already filled in. If a document must be
   used, attach it for reference and require full manual entry
   through the allocation screen above, never automated
   extraction into a saved group.

### v2.0
Electron + SQLite + auto-update (§12) · suite merge with
HKIM (§2)

---

# 16. TESTING

**Change → Reload → Console check → Functional test → Commit**

Clean console:

```
Hotel Professional Tools Ready
Hotel Group Operations Suite Initialized
Suite Diagnostics — 10 modules, 0 problems, storage 0%
```

## Regression checklist

1. Six tabs switch
2. Add Row → one row · Generate 5 → five rows
3. Room rejects letters and a 4th digit · Pax caps at 2
4. Enter moves down the column; cells do not grow
5. Nine columns, every value under its own header
6. Mapped room → category fills, Pax auto-fills
7. Unmapped, duplicate or over-capacity → red, Save blocked
8. Children clamps to capacity; age boxes appear per child
9. Edit, wait 2s, F5 → value persists
10. Save → F5 → listed · search then Delete → correct group
11. Clear / Generate / Bulk Import → confirm + restore bar works
12. Print Register · Blank · Rooming List — **no Category column**
13. Four printed reports for a seeded date
14. Export JSON / CSV · Open Group · Bulk Import
15. Room Master: ranges, bulk, rename, delete, rules, PIN
16. Reports: four cards, both scopes, filters
17. Settings: logo, footer, toggles, PIN, backup, restore,
    diagnostics
18. Shortcuts: `Alt+1`–`6`, `Ctrl+S`, `Ctrl+P`, `Ctrl+Enter`, `F1`

## Test data

Seed script plants 3 groups / 25 rooms / 55 pax / 20-room
master. Verification script checks 24 figures.
All Groups: 3 groups · 25 rooms · 55 pax · 3 VIP ·
EP 8 CP 18 MAP 18 AP 8 Not Set 3 · occupancy 40% / 60% / 25%.

---

# 17. NOTE FOR THE ASSISTANT

More than one AI assistant has worked on this. Past failures
came from assuming code existed, giving partial snippets, and
referencing line numbers.

Roughly a third of phases lost a round to a patch not landing.
Causes by frequency: a skipped step in a multi-step patch; a
`FIND THIS` block whose whitespace did not match; a replacement
that took an adjacent closing brace; a file not saved; a cached
script or HTML; a patch inserted outside its object.

Preserve working code. Refactor in small testable phases.
Prioritise hotel operations over technical elegance.
Version 1.0 is about shipping.