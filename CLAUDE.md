# CLAUDE.md
## Hotel Group Operations Suite — Authoritative Project Context

Read this file completely before suggesting any code change.
This file is the single source of truth. If anything you remember
about this project contradicts this file, this file wins.

---

# 1. WHAT THIS IS

A Hotel Group Operations Suite for hotel Front Office staff.

It replaces manual registers and Excel sheets used for:

- Group arrivals
- Rooming lists
- Meal plans
- Room category mapping
- Register printing
- Dashboard
- Reports

Target feel: Oracle Opera, IDS Next, eZee FrontDesk, Hotelogix.

**Not** a generic CRUD app. Software a receptionist uses every day.

**Author:** Vikram
**Current version:** v1.0.0 RC1 (in progress)
**Completion:** ~78% (Room Master added to v1.0 scope)

---

# 2. HOW TO ANSWER — NON-NEGOTIABLE

The developer is not a professional JavaScript developer and works
entirely by copy and paste.

**Always use this format for every code change:**

> **FILE:** `js/app.js`
> **FIND THIS:** *(exact text to search for)*
> **REPLACE WITH THIS:** *(complete replacement)*
> or **DELETE ALL OF IT**

Rules:

- Always name the file. Multiple JS files are in play.
- Always give COMPLETE functions. Never fragments.
- Never say "insert this somewhere" or "add this near".
- Never reference line numbers. Reference SECTION HEADERS.
- Never assume a function exists — check or ask.
- One phase at a time. Every phase ends with a test and a commit.
- If a syntax error appears, stop everything and fix it first.

Classify every suggestion:

- 🔴 Release blocker
- 🟡 Important before v1.0
- 🟢 Version 1.1

Always explain WHY a change matters to hotel operations.

---

# 3. ACTUAL FILE STRUCTURE

```
d:\vikram\group arrival\
├── Group_Arrival_Register.html    ← entry file (NOT index.html)
├── css/
│   └── style.css                  ~950 lines
├── js/
│   ├── printing.js  
     room-master.js    
     printing.js          ~717 lines  (loads FIRST)
│   └── app.js                     ~2500 lines (loads SECOND)
├── CLAUDE.md
├── PROJECT_TRACKER.md
└── jsconfig.json
```

Script order in the HTML — this matters:

```html
<script src="js/printing.js"></script>
<script src="js/app.js"></script>
```

The folder is **`js/`**, not `modules/`. Earlier documents said
`modules/`; that was superseded.

---

# 4. CODING STYLE

Deliberately simple. Preserve it exactly.

- Vanilla JavaScript only
- No frameworks, no React, no TypeScript, no build tools, no npm
- Plain `function` declarations, global scope, no modules or IIFEs
- Generous blank lines and vertical spacing
- Section headers everywhere:

```javascript
/* =====================================================
   SECTION NAME
===================================================== */
```

- Minimal nesting, no clever abstractions
- HTML event handlers use inline `onclick` only for globals
  already used that way; new bindings go in `initialize*Events()`

---

# 5. ARCHITECTURE

```
DOMContentLoaded
      ↓
initializeApplication()      ← the ONLY bootstrap
      ↓
refreshApplicationSettings()
initializeNavigation()
initializeRegisterEvents()
initializeGroupEvents()
initializePrintEvents()
initializeSettingsEvents()
initializeProfessionalTools()
restoreDraft()
refreshApplication()
```

There is exactly **one** `DOMContentLoaded` listener, at the bottom
of `app.js`. Never add another. The five "App.js Part N Loaded"
startup blocks were removed — do not reintroduce them.

## Controllers

Never refresh modules individually from UI code. Use:

| Controller | Does |
|---|---|
| `refreshApplication()` | settings + dashboard + register views |
| `refreshApplicationSettings()` | branding, logo, clock |
| `refreshEntireDashboard()` | KPIs, control center, arrival cards, saved groups |
| `refreshRegisterViews()` | summary + rooming list + reports |
| `initializeApplication()` | bootstrap, called once |

## Repository

UI must never touch `DB.groups` directly. Always:

```
GroupRepository.getAll() / get() / add() / update() / remove() / count()
```

All write methods call `saveDatabase()` internally.

## Printing

All print output goes through:

```javascript
openPrintWindow(title, bodyHtml, extraStyles)
```

Never call `window.print()` from UI code. `extraStyles` is the third
argument — each document passes its own column widths. All three
print documents use the engine; none bypasses it.

---

# 6. DATA MODEL

```javascript
DB = {

    groups: [
        {
            id, groupName, arrivalDate, agent, preparedBy,
            status, notes, totalRooms, totalPax,
            createdOn, modifiedOn,
            rooms: [
                { roomNo, guestName, pax, meal,
                  mobile, vip, specialRequest }
            ]
        }
    ],

    settings: {
        hotelName, footerText, logo,
        roomNumbersOnly,      // true = digits only, max 3
        showRoomCategory      // print/report toggle
    },

    roomMaster: {             // Sprint C, in progress
        categories: [ "Deluxe", "Suite" ],
        rooms: { "101": "Deluxe" }
    },

    archive: []
}
```

localStorage keys: `hotel_group_operations_v5`, `GROUP_DRAFT`

**One row = one room = one guest name.** Pax carries the headcount.
Multiple guests sharing a room go in Guest Name as free text
("Sharma, Rajesh + Sharma, Priya"). Duplicate room numbers are
therefore legitimate — Save warns, never blocks.

Proper multi-guest-per-room (nested `guests[]`) is 🟢 v1.1.

---

# 7. REGISTER INPUT RULES

| Column | Cell index | Accepts | Max |
|---|---|---|---|
| Room (numeric mode) | 1 | digits | 3 |
| Room (free mode) | 1 | letters, digits, `-`, space | 10 |
| Pax | 3 | digits | 2 |
| Mobile | 5 | digits, `+`, `-`, space | 15 |
| Guest Name | 2 | anything, whitespace collapsed | — |

Mode is `DB.settings.roomNumbersOnly`, toggled in Settings →
Register Rules, applied immediately (no Save press needed).

Enter moves down the same column. Line breaks are never allowed
inside a register cell.

---

# 8. BUGS ALREADY FIXED — DO NOT REINTRODUCE

| Bug | Fix |
|---|---|
| `saveDB()` undefined in GroupRepository | use `saveDatabase()` |
| `getRegisterRows()` declared twice, different schemas | one declaration; schema is `roomNo` / `guestName` / `specialRequest` |
| Saved Groups delete removed the wrong group when searching | `renderSavedGroups()` carries the real `DB.groups` index through filter and sort |
| `toISOString()` gave UTC — arrivals wrong before 05:30 IST | `getLocalDateString()` / `getTodayString()` / `getTomorrowString()` |
| Five competing `DOMContentLoaded` blocks | one bootstrap |
| `printBlankRegister()` duplicated in `app.js` | lives only in `printing.js` |
| `addVIPColumn()` / `addSpecialRequestColumn()` appended phantom headers | functions deleted |
| Orphaned `<thead>` with no `<table>` in dashboard panels | removed |
| Duplicate `<body>` tag | removed |

---

# 9. DECISIONS ALREADY MADE — DO NOT REOPEN

- Folder is `js/`, entry file is `Group_Arrival_Register.html`
- Bulk Import panel is permanently visible; there is no toggle button
- Print Register is guest-facing and carries a Signature column.
  VIP appears inline as `[VIP]` next to the name, never as a column.
- Rooming List is internal (Housekeeping / F&B) and carries VIP and
  Special Request columns
- **Room category shows on the Rooming List only, never on the
  guest-signed Arrival Register**
- Unmapped room numbers show a silent dash, no warning
- Room category feeds occupancy percentages in Reports
- Duplicate rooms on Save: warn and allow
- Unsaved draft: restore it and show a Keep / Discard banner
- Reports support both Current Group and All Groups, with filters.
  No weekly / monthly / yearly rollups.

---

# 10. ROADMAP TO v1.0

### Sprint A — Register rules ✅ complete
`M8` numeric room toggle · `M9` keyboard navigation

### Sprint B — Reports (3 phases)
`R1` Current Group / All Groups toggle + empty states
`R2` filters: date range, status, agent
`R3` verify every card against hand-calculated numbers

### Sprint C — Room Master (4 phases) ← in v1.0 scope
`RM1` data model + Room Master page (categories, range assign, bulk paste)
`RM2` category lookup in register, silent dash when unmapped
`RM3` Rooming List print integration + `showRoomCategory` checkbox
`RM4` Reports: category breakdown and occupancy percentage

### Sprint D — Modularization (7 phases, one file each)
`database.js` → `utilities.js` → `settings.js` → `reports.js`
→ `register.js` → `dashboard.js` → `groups.js`
`app.js` ends as bootstrap only, ~200 lines.
Move one, test, commit, next. Split by responsibility, never by line count.

### Sprint E — Workflow QA (2 phases)
`Q1` replace `alert` / `prompt` / `confirm` with in-page dialogs
`Q2` keyboard workflow: Ctrl+S save, Ctrl+P print, Tab across

### Sprint F — Packaging (3 phases)
`P1` README.md + CHANGELOG.md
`P2` PROJECT_TRACKER.md refresh
`P3` version constant + `v1.0.0` tag

### Then
RC1 → soak test on one real group arrival → Version 1.0

---

# 11. v1.1 BACKLOG — NOT NOW

Multi-guest per room · cloud sync · user accounts · audit trail ·
undo · advanced search · database backend · installer · multi-user ·
ESLint

---

# 12. TESTING

Every phase ends with:

```
Change → Reload → Console check → Functional test → Commit
```

A clean console shows exactly two lines and nothing red:

```
Hotel Professional Tools Ready
Hotel Group Operations Suite Initialized
```

Regression checklist for any change touching the register or groups:

1. All tabs switch
2. Add Row → one row · Generate Rows 5 → five rows
3. Room rejects letters and a 4th digit · Pax caps at 2 · Enter moves down
4. Save Group → F5 → still listed
5. Search Saved Groups, then Delete → correct group removed
6. Print Register · Blank Register · Print Rooming List
7. Export JSON · Export CSV · Open Group · Bulk Import
8. Settings: logo, footer, room mode toggle, backup, restore

---

# 13. GIT

One commit per completed phase. Never commit broken code.

```
M1 - Printing module extracted
M2 - Unified application bootstrap
M3 - Rebuilt app.js
M4 - HTML rebuild
M5 - Responsive grid fixes
M6 - Print engine rewrite
M7 - Draft banner and shared-room save warning
M8 - Register input rules with numeric room toggle
M9 - Register keyboard navigation
```

---

# 14. NOTE FOR THE ASSISTANT

This project has been worked on by more than one AI assistant.
Previous failures came from assuming code existed, giving partial
snippets, and referencing line numbers.

When verifying in the IDE, always end the prompt with
**"Report only — do not change any files."**

Preserve working code. Refactor in small testable phases.
Prioritise hotel operations over technical elegance.
Version 1.0 is about shipping.