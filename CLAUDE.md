# CLAUDE.md
## Hotel Group Operations Suite — Authoritative Project Context

Read this file completely before suggesting any code change.
This file wins over anything you remember about this project.

---

# 1. WHAT THIS IS

**Group Arrival Register (GAR)** — front office software for
hotel group arrivals, rooming lists, meal plans, room category
mapping, printing and reports.

Target feel: Oracle Opera, IDS Next, eZee FrontDesk, Hotelogix.
Not a generic CRUD app. Software a receptionist uses every day.

**Author:** Vikram
**Version:** v1.0.0 RC1 (in progress)
**Completion:** ~90%
**Platform:** plain HTML / CSS / JavaScript, localStorage, no build step

---

# 2. THIS IS ONE APP IN A SUITE

There is a **second application already in development**:

**Hotel Key Inventory Management (HKIM)** — a key register.
Roughly 20 JS modules, storage key `HKIM_DATABASE`, tracks key
transactions as an immutable ledger with `before`/`after`
balances, plus audit log, business days, shifts and counters.

A **PMS will come much later**, and GAR may become one section
of it. A key module will be folded into the suite.

**HKIM is architecturally ahead of GAR** — `"use strict"`,
frozen constants, `crypto.randomUUID()`, ISO timestamps from
day one, an immutable transaction model and an audit log.
When the suite merges, **HKIM's structure is the template**,
not GAR's.

## The suite decision — LOCKED

**Ship GAR and HKIM as standalone v1.0 first. Merge at v2.0.**

Reason: merging mid-development means neither ships. The merge
needs a migration that reads both localStorage keys and writes
one, and it changes both applications.

## Shared database shape — agreed on paper, not built

```
HOTEL_SUITE_DB
├── meta        schemaVersion, appVersions, created, updated
├── property    hotel name, city, timezone, logo, footer   SHARED
├── rooms       inventory, categories, occupancy rules     SHARED
├── users       accounts, roles, PIN hashes                SHARED
├── audit       one log across all modules                 SHARED
├── arrivals    groups, register data                      GAR owns
└── keys        transactions, businessDays, shifts         HKIM owns
```

**Rooms and property move out of both apps into the shared
core.** HKIM stops hardcoding 76 rooms and reads the Room
Master. Both apps read one hotel name.

## Five collisions to resolve at merge

1. **Two databases** — `HKIM_DATABASE` and `hotel_group_operations_v5`
2. **Two sources of truth for rooms** — HKIM hardcodes
   `ROOM.MIN 1, MAX 76` in `constants.js`; GAR has a full Room
   Master with categories and occupancy rules
3. **Two hotel identities** — HKIM `CONFIG.hotel.name`
   ("Ramada Encore") vs GAR `DB.settings.hotelName`
4. **Global function collisions** — both define `loadDatabase()`,
   `saveDatabase()`, `settings`, `reports`. Both are classic
   scripts in one global scope; on a shared page the later file
   silently wins.
5. **Schema version disagreement** — HKIM `createDatabase()`
   writes `schema: 2` while `constants.js` declares
   `SCHEMA_VERSION: 1`

**Meanwhile:** stop divergence getting worse. Room numbering is
the urgent one — HKIM caps at 76 numeric, GAR allows 3-digit
numeric or 10-char alphanumeric.

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

- Always name the file. Six JS modules are in play.
- Always give COMPLETE functions. Never fragments.
- Never "insert this somewhere" or "add this near".
- Never reference line numbers. Reference SECTION HEADERS.
- Never assume a function exists — check or ask.
- One phase at a time, ending in a test and a commit.
- Syntax error → stop everything and fix it first.

**Hard-won rule:** if a phase touches more than about four
places in one file, **ask for the file and return a complete
verified replacement instead**. Every multi-patch phase in this
project has lost a round to a partially applied patch.

Classify suggestions: 🔴 blocker · 🟡 before v1.0 · 🟢 v1.1
Always explain WHY a change matters to hotel operations.

---

# 4. ACTUAL FILE STRUCTURE

```
d:\vikram\group arrival\
├── Group_Arrival_Register.html    28.6 KB   (NOT index.html)
├── css/style.css                  ~25 KB
├── js/
│   ├── dialog.js         9.2 KB   loads 1st
│   ├── printing.js      14.2 KB   loads 2nd
│   ├── room-master.js   30.3 KB   loads 3rd
│   ├── reports.js       25.5 KB   loads 4th
│   ├── app.js           69.5 KB   loads 5th
│   └── shortcuts.js      6.8 KB   loads LAST
├── CLAUDE.md
├── PROJECT_TRACKER.md
└── jsconfig.json
```

**Load order matters.** `dialog.js` has no dependencies and must
be first. `shortcuts.js` depends on everything and must be last.
`app.js` owns `DB` and the bootstrap.

## Cache busters — critical

Every script tag carries `?v=N`, all the **same number**:

```html
<script src="js/dialog.js?v=9"></script>
...
<script src="js/shortcuts.js?v=9"></script>
```

**After replacing ANY file, change all six to the next number.**
One find-and-replace. Live Server caches scripts aggressively and
several debugging rounds have been lost to stale files.

Also: **the HTML itself caches.** Use DevTools → Network →
Disable cache while developing, or Empty Cache and Hard Reload.

## Verify on disk, not in the editor

```powershell
Get-ChildItem "js\*.js" | Select-Object Name, Length, LastWriteTime
```

The editor can show new code while disk holds the old file.

---

# 5. CODING STYLE

- Vanilla JavaScript only. No frameworks, React, TypeScript,
  build tools or npm.
- Plain `function` declarations, global scope, no modules or IIFEs
- Generous blank lines and vertical spacing
- Section headers everywhere:

```javascript
/* =====================================================
   SECTION NAME
===================================================== */
```

- Minimal nesting, no clever abstractions
- New event bindings go in `initialize*Events()`, not inline
  `onclick` — except where a global is already used that way

---

# 6. ARCHITECTURE

```
DOMContentLoaded
      ↓
initializeApplication()        ← the ONLY bootstrap
      ↓
initializeDialogs()
refreshApplicationSettings()
initializeNavigation()
initializeRegisterEvents()
initializeGroupEvents()
initializePrintEvents()
initializeSettingsEvents()
initializeRoomMaster()
initializeReports()
initializeProfessionalTools()
restoreDraft()
setInterval timers
refreshApplication()
initializeShortcuts()
```

Exactly **one** `DOMContentLoaded` listener, at the bottom of
`app.js`. Never add another.

## Controllers

Never refresh modules individually from UI code.

| Controller | Does |
|---|---|
| `refreshApplication()` | settings + dashboard + register + room master |
| `refreshApplicationSettings()` | branding, logo, clock |
| `refreshEntireDashboard()` | KPIs, control center, arrival cards, saved groups |
| `refreshRegisterViews()` | categories + summary + rooming list + reports |
| `initializeApplication()` | bootstrap, called once |

## Repositories

UI must never touch `DB.groups` or `DB.roomMaster` directly.

```
GroupRepository       .getAll .get .add .update .remove .count
RoomMasterRepository  .getCategories .addCategory .renameCategory
                      .removeCategory .getRule .setRuleField
                      .getRoomNumbers .getCategory .setRoom
                      .setRoomsSilently .removeRoom .removeAllRooms
                      .totalRooms .totalBeds .countByCategory
```

All write methods call `saveDatabase()` internally.
**This layer is what makes the v2.0 merge feasible** — swapping
localStorage for HTTP means rewriting repository internals only.

## Printing

All output goes through `openPrintWindow(title, html, extraStyles)`.
Never `window.print()` from UI code. Three documents, all using
the engine: Print Register, Blank Register, Print Rooming List.

## Dialogs

**No native `alert` / `confirm` / `prompt` anywhere.** All three
are replaced by promise-based in-page dialogs in `dialog.js`:

```javascript
await showAlert("Saved");
if (!await showConfirm("Delete?", null, {danger:true})) return;
const v = await showPrompt("Room number", "101");   // null = cancelled
```

Call sites must be `async`. Destructive actions pass
`{danger:true, okLabel:"Delete"}` for a red button.
`showSaveFlash()` gives a green "✓ Saved" toast on every
`saveDatabase()`.

---

# 7. DATA MODEL

```javascript
DB = {

    schemaVersion: 2,

    groups: [
        {
            id, groupName, arrivalDate, agent, preparedBy,
            status, notes, totalRooms, totalPax,
            createdOn, modifiedOn,        // ISO 8601
            rooms: [
                { roomNo, guestName, pax, children,
                  childAges, meal, mobile, vip,
                  specialRequest }
            ]
        }
    ],

    settings: {
        hotelName, footerText, logo,
        roomNumbersOnly,        // true = digits only, max 3
        restrictRoomsToMaster,  // true = block unmapped rooms
        roomMasterPinHash       // absent when no PIN
    },

    roomMaster: {
        categories: [ "Deluxe", "Suite" ],
        rooms:      { "101": "Deluxe", "401": "" },
        rules:      { "Deluxe": { defaultAdults, maxAdults,
                                  maxChildren, maxOccupancy } }
    },

    archive: []
}
```

localStorage keys: `hotel_group_operations_v5`, `GROUP_DRAFT`

## Timestamps

**ISO 8601 only** (`nowISO()`). `toLocaleString()` produced
`"28/07/2026, 3:49:33 am"`, which sorts by day-of-month and is
unparseable by any API. `formatTimestamp()` renders for display.
`migrateDatabase()` converts legacy records once, on load.

## Schema migration

`SCHEMA_VERSION` in `app.js`. Bump it and add an
`if (from < N)` block in `migrateDatabase()`.

---

# 8. REGISTER MODEL

## Column map — 9 wide

```javascript
REGISTER_COLUMNS = { SR:0, ROOM:1, CATEGORY:2, GUEST:3,
                     PAX:4, CHILDREN:5, MEAL:6, MOBILE:7,
                     EXTRA:8 }
```

**Never use a raw `cells[n]` index.** Always
`cells[REGISTER_COLUMNS.NAME]`. This map exists because a
column shift once silently misaligned the whole register.

## Occupancy — the anti-hack

**Max Occupancy caps the TOTAL people in a room.** Children are
a *subset* of pax, never an addition. `adults = pax − children`.

Raising Children can never raise Pax, so moving a person from
the adult column to the child column cannot create space. The
loophole is structurally impossible, not policed.

The children input's `max` is set live to
`min(maxChildren, pax)` and clamps on entry.

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

Room mode is `DB.settings.roomNumbersOnly`, toggled in
Settings → Register Rules, **applied immediately**.

## Hard blocks on Save

`getInvalidRooms()` returns a numbered problem list. Save is
blocked, never warned, on:

- room not in the Room Master (when enforcement is on)
- duplicate room within the group
- pax over Max Occupancy
- children over Max Children
- adults over Max Adults

Red cell + label in the Category column: `NOT IN MASTER`,
`DUPLICATE`, `MAX n PAX`, `MAX n CHILD`, `MAX n ADULTS`.

## Empty rows

`isEmptyRegisterRow()` — a row counts only once something is
entered. Pax is ignored because new rows default to 1. Used by
summary, rooming list and reports so they can never disagree.

---

# 9. KEYBOARD

| Key | Action |
|---|---|
| `Alt`+`1`–`6` | Switch tab |
| `Ctrl`+`S` | Save group (Save Settings on Settings tab) |
| `Ctrl`+`P` | Print register (rooming list on that tab) |
| `Ctrl`+`Shift`+`B` | Blank register |
| `Ctrl`+`Enter` | Add row, cursor into Room |
| `Ctrl`+`G` | Focus room count |
| `Ctrl`+`D` | Check duplicates |
| `F1` / `?` | Shortcut help |
| `Enter` | Next row, same column |
| `Esc` | Close dialog |

`Ctrl+N` avoided — browsers reserve it. Plain `?` suppressed
while typing. Shortcuts suppressed while a dialog is open or
Room Master is PIN-locked.

---

# 10. BUGS FIXED — DO NOT REINTRODUCE

| Bug | Fix |
|---|---|
| `saveDB()` undefined in GroupRepository | `saveDatabase()` |
| `getRegisterRows()` declared twice, different schemas | one declaration; `roomNo` / `guestName` / `specialRequest` |
| Saved Groups delete removed the wrong group when searching | `renderSavedGroups()` carries the real `DB.groups` index through filter and sort |
| `toISOString()` gave UTC — arrivals wrong before 05:30 IST | `getLocalDateString()` / `getTodayString()` / `getTomorrowString()` |
| `toLocaleString()` timestamps sorted by day-of-month | ISO 8601 + migration |
| Five competing `DOMContentLoaded` blocks | one bootstrap |
| `printBlankRegister()` duplicated in `app.js` | lives only in `printing.js` |
| `addVIPColumn()` / `addSpecialRequestColumn()` appended phantom headers | functions deleted |
| Register `<thead>` 7 cells vs `<tbody>` 8 — everything shifted left | headers must match `REGISTER_COLUMNS` exactly |
| Superseded M8 input filters left in place, hardcoded to old column indexes | removed |
| E1 collapsible block pasted twice | one copy |
| `showMealAnalytics()` lost its closing brace | restored |
| Orphaned `<thead>` with no `<table>`; duplicate `<body>` | removed |

---

# 11. DECISIONS — DO NOT REOPEN

| Decision | Outcome |
|---|---|
| Suite | Ship GAR and HKIM separately at v1.0, merge at v2.0 |
| Folder | `js/`, not `modules/` |
| Entry file | `Group_Arrival_Register.html` |
| Room model | Inventory-first — rooms exist with or without a category |
| Occupancy cap | **Total occupants**, not adults |
| Children | Count per row + one age box each (0–17) |
| Pax auto-fill | From category Default Adults, stops once manually edited |
| Duplicate rooms | **Hard block** on save |
| Over-capacity | **Hard block** on save |
| Category on screen | Arrival Register and Rooming List |
| Category on print | **Never** — Housekeeping knows the property |
| Unmapped rooms | Silent grey dash |
| Room Master PIN | Accident guard only, honestly labelled. Real auth with the v1.1 backend. |
| Guests per room | One row = one room; extra guests in Guest Name |
| Unsaved draft | Restore + Keep/Discard banner, schema-versioned |
| Reports scope | Current Group and All Groups, with filters |
| Report periods | No weekly / monthly / yearly rollups |
| Occupancy percentage | Valid for ONE date only — reported per arrival date |
| Bulk Import panel | Collapsible, starts closed |
| Sprint order | E before D; D limited to 4 modules |

---

# 12. ROADMAP

### Done
Sprint A register rules · Sprint B reports · Sprint C room master
and occupancy · Sprint E dialogs, layout, keyboard

### Sprint D — Modularization (4 phases)
```
D1  js/database.js   DB, load/save, migration, GroupRepository
D2  js/register.js   columns, rows, rules, summary, validation
D3  js/dashboard.js  KPIs, arrival cards, saved groups
D4  js/groups.js     save/open/delete, import/export, autosave
```
`database.js` must load first — it owns `DB`.
`app.js` ends around 550 lines. Settings and utilities stay.
Move one, test, commit, next. Split by responsibility.

### Sprint F — Packaging (3 phases)
`F1` README.md + CHANGELOG.md
`F2` refresh CLAUDE.md + PROJECT_TRACKER.md
`F3` version constant in footer and printed documents, tag `v1.0.0`

### Then
RC1 → soak test on one real group arrival → **Version 1.0**

---

# 13. v1.1 BACKLOG — NOT NOW

- **Departure date / nights** — occupancy is arrival-date only
  without it; a 3-night group reads as one day
- Multi-guest per room as structured data (nested `guests[]`)
- Real authentication with a backend (the PIN is not security)
- Audit trail — child-rate fudging is a management problem, not
  a code one; an audit log makes it visible
- Cloud sync · user accounts · undo · advanced search ·
  database backend · installer · multi-user · ESLint

---

# 14. TESTING

Every phase: **Change → Reload → Console check → Functional test → Commit**

A clean console shows exactly two lines, nothing red:

```
Hotel Professional Tools Ready
Hotel Group Operations Suite Initialized
```

## Regression checklist

1. Six tabs switch
2. Add Row → one row · Generate Rows 5 → five rows
3. Room rejects letters and a 4th digit · Pax caps at 2 digits
4. Enter moves down the same column, cells do not grow
5. Every value under its own header (**9 columns**)
6. Mapped room → category fills and Pax auto-fills
7. Over-capacity, unmapped or duplicate → red cell, Save blocked
8. Children clamps to room capacity; age boxes appear per child
9. Edit any field, wait 2s, F5 → value persists
10. Save Group → F5 → still listed · search then Delete →
    correct group removed
11. Print Register · Blank Register · Print Rooming List —
    **no Category column on any**
12. Export JSON · CSV · Open Group · Bulk Import
13. Room Master: ranges, bulk, rename, delete, occupancy rules,
    PIN lock, F5 persists
14. Reports: four cards, both scopes, filters
15. Settings: logo, footer, both toggles, PIN, backup, restore
16. Dialogs: Esc cancels, Enter confirms, red on destructive
17. Shortcuts: Alt+1–6, Ctrl+S, Ctrl+P, Ctrl+Enter, F1

## Verification prompt for the IDE

Always end with **"Report only — do not change any files."**

---

# 15. NOTE FOR THE ASSISTANT

This project has been worked on by more than one AI assistant.
Past failures came from assuming code existed, giving partial
snippets, and referencing line numbers.

Preserve working code. Refactor in small testable phases.
Prioritise hotel operations over technical elegance.
Version 1.0 is about shipping.