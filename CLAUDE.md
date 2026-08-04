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
├── css/style.css         2,995 lines, 22 named sections,
│                          zero duplicate selectors
├── js/
│   ├── version.js         1st   APP_VERSION, EXPECTED_MODULES
│   ├── dialog.js          2nd   no dependencies
│   ├── database.js        3rd   owns DB, GroupRepository,
│   │                             schema v3 (departure dates)
│   ├── printing.js        4th   print engine (hidden-iframe,
│   │                             not window.open — see §13)
│   ├── room-master.js     5th   owns RoomMasterRepository
│   ├── register.js        6th   owns REGISTER_COLUMNS
│   ├── dashboard.js       7th
│   ├── reports.js         8th   on-screen reports
│   ├── report-print.js    9th   printable reports
│   ├── groups.js         10th   group lifecycle
│   ├── app.js             11th  bootstrap only, 735 lines
│   ├── shortcuts.js       12th  depends on everything
│   └── diagnostics.js    LAST   verifies all of the above
├── CLAUDE.md
├── PROJECT_TRACKER.md
├── README.md
├── CHANGELOG.md
└── jsconfig.json
```

**Load order is fixed.** `version.js` first — every other
module registers its own version against it on load.
`dialog.js` second because nothing else depends on it.
`database.js` third because it declares `DB` with `let` and
`GroupRepository` with `const` — neither is hoisted.
`diagnostics.js` last so it can verify the rest, including
comparing every loaded module's version against
`EXPECTED_MODULES`.

**`app.js` is bootstrap and shared services only** — utilities,
dates, navigation, settings, meal analytics, collapsible
panels, print/settings event bindings, controllers, the single
`DOMContentLoaded`. All four Sprint D modularization phases are
complete; no further extraction is planned for v1.0.

## Cache busters — critical

Every script tag carries `?v=N`, all the **same number**.
**After replacing ANY file, change all thirteen to the next
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

**`openPrintWindow()` uses a hidden `<iframe>`, never
`window.open()`.** Chrome has a documented bug where a popup
window used for printing can fail to hand real OS-level
keyboard/mouse focus back to the tab that opened it —
confirmed via `document.hasFocus()` returning `false` after a
print, with no console error and no visible extra window. No
amount of `.focus()` called from either side fixed it
reliably. An invisible iframe on the same page never creates a
second window, so there is nothing for focus to get lost
between. **Do not reintroduce `window.open()` for printing.**

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
    schemaVersion: 3,
    groups: [{
        id, groupName, arrivalDate, agent, preparedBy,
        status, notes, totalRooms, totalPax,
        createdOn, modifiedOn,              // ISO 8601

        departureDate,      // ISO date, group default
        nights,              // derived from arrival<->departure
        noShowFlag,          // auto-set, PIN to reverse

        rooms: [{ roomNo, guestName, pax, children,
                  childAges, meal, mobile, vip,
                  specialRequest,

                  departureOverride,   // "" = follows group
                  checkedOut           // per-room, not per-time
                }]
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

## Departure date helpers (database.js)

- `addDaysToDate(dateString, days)` — plain date arithmetic
- `computeNightsBetween(arrival, departure)` — always ≥ 0
- `getRoomDepartureDate(group, room)` — **the single source of
  truth** for "when does this room actually leave":
  `room.departureOverride || group.departureDate || ""`.
  Every file that needs a departure date calls this rather than
  re-deriving the precedence itself.

Full departure-date business rules are in §14, under
**Departure Dates — Full Spec**.

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
| Guest Name | anything, `\r`/`\t` stripped, `\n` allowed | 220 |
| Pax | digits | 2 |
| Children | digits, clamped to room capacity | — |
| Mobile | digits, `+`, `-`, space | 15 |
| Special Request | anything | 80 |

## Guest Name — multiple guests per room (LOCKED PATTERN)

**Do not rebuild this with a CSS pseudo-element hint.** An
earlier version put a `::after` hint on the cell itself; it
collided visually and semantically with a later real-button
version and had to be torn out. The current structure is final:

```html
<td class="guestCell">
    <div class="guestCellHeader">
        <button type="button" class="addGuestBtn"
                tabindex="-1">+ Guest</button>
    </div>
    <div class="guestEditable" contenteditable="true">
        ...guest text...
    </div>
</td>
```

- **`.guestEditable`**, not the `<td>`, is the real editable
  surface. `getRuleForEvent()` resolves to this element
  specifically for the Guest column via `getGuestEditTarget()`
  — every downstream function (`handleRegisterBeforeInput`,
  `handleRegisterCleanup`) already reads `found.cell`
  generically and needed **zero changes** when this was built,
  because the targeting fix was isolated to one function.
- **`getRegisterRows()` reads `.guestEditable`'s `innerText`
  specifically**, never the whole `<td>` — the `<td>` also
  contains the button's own text, which must never leak into a
  saved guest name.
- **The button lives in its own header strip above the text**,
  never floating in a corner. A floating corner button
  overlapped multi-line text as guests were added; the header
  strip cannot collide regardless of content height.
- **Adding a guest always moves the caret to the true end of
  the text first**, via `placeCaretAtEnd()`, before inserting
  the line break — via the button click or the **Down Arrow**
  key, both call the same `addGuestLine()`. Without this, a
  line break could land wherever the caret happened to be,
  splitting a name mid-word. Guests must always append in
  order.
- **Capped by the room's Max Occupancy** from Room Master
  (`getGuestLineLimit()`), same source of truth as the Children
  cap. At the limit the button becomes disabled and reads
  "Full" — driven directly by JavaScript
  (`button.disabled` / `button.textContent`), not by CSS
  `content` swapping.
- **Enter still means "next row," unchanged, everywhere** —
  including inside Guest Name. Only Down Arrow is special-cased
  for this one column.
- One known limitation, not yet closed: a **paste** of
  multi-line text bypasses the occupancy cap (only the button
  and Down Arrow enforce it). Low priority — flagged, not
  blocking.

## Hard blocks on Save AND Print

`getInvalidRooms()` returns a numbered list. **Both** Save and
Print are blocked on the same list — room not in the Room
Master, duplicate room within the group, pax over Max
Occupancy, children over Max Children, adults over Max Adults.

**Print was originally NOT validated** — `printRegister()` and
`printRoomingList()` read the live register directly with no
check at all, so a duplicate correctly blocked from Save could
still be printed and signed. Both now call `getInvalidRooms()`
first, using the identical numbered-list message Save already
shows. Any new print path added later must do the same.

**Duplicate-room flagging must be symmetric.** An earlier
version only flagged the *second* occurrence of a repeated room
— the first one looked completely valid, silently "winning."
Both `getInvalidRooms()` and `updateRegisterCategories()` now
count occurrences first, then flag **every** row involved.
Never revert to a "have I seen this before" single-pass check
for duplicate detection.

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
manifest exists, six global objects exist, element IDs are
present, register columns match, no module loaded twice,
storage usage (warn 75%, error 90%), and — via `version.js` —
every module's `registerModuleVersion()` call matches what
`EXPECTED_MODULES` expects.

```
Suite Diagnostics — 12 modules, 0 problems, storage 0%
```

**When it reports many missing functions from one module, look
for a single parse error above it** — one syntax error kills a
whole file and every function in it.

**Keep the manifest current.** When a function moves between
modules, update `MODULE_MANIFEST` in `diagnostics.js` in the
same phase. When a module's actual content changes, its
`registerModuleVersion()` call at the bottom of that file
should be bumped too, matched against `EXPECTED_MODULES` in
`version.js`.

**Version mismatch is the rollback trigger.** A module that
loads but reports the wrong version means a patch update did
not apply cleanly — this is different from a module missing
entirely, and diagnostics reports the two cases separately.

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
| Chrome popup print window | keyboard/mouse input frozen on the whole app after printing until manual Alt+Tab | print via hidden `<iframe>`, never `window.open()` — see §6 Printing |
| Print functions never validated | a duplicate room correctly blocked from Save could still be printed and signed | `printRegister()`/`printRoomingList()` call `getInvalidRooms()` first, same as Save |
| Duplicate-room flagging was asymmetric | the *first* occurrence of a repeated room was never flagged, only the second — looked like the system "favoured" whichever room was typed first | count occurrences first, flag every row involved — never a single-pass "have I seen this" check |
| Guest Name `::after` CSS hint | collided visually with a later real `<button>` version — two "+ Guest" indicators rendered on top of each other | `::after` hint removed entirely; the button is a real element in its own header strip — see §8 Guest Name |
| `initializeReportPrinting()` called twice in bootstrap | wasteful but not user-visible — `addEventListener` with a stable named function reference is a documented no-op on the second identical call | duplicate call removed anyway, for clarity |

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
| Duplicate rooms, same group | **Hard block, no override, ever** — not physically possible, this is not a restaurant reservation |
| Duplicate rooms, different groups, overlapping dates | Hard block by default; **PIN-overridable** for a genuine authorized exception — see Departure Dates below |
| Over-capacity | **Hard block** on save AND print |
| Category on screen | Arrival Register and Rooming List |
| Category on print | **Never** — Housekeeping knows the property |
| Unmapped rooms | Silent grey dash |
| Room Master PIN | Accident guard only, honestly labelled |
| Guests per room | One row = one room; extra guests as additional lines inside Guest Name (see §8), never a second row |
| Unsaved draft | Restore + Keep/Discard banner, schema-versioned |
| Destructive actions | Confirm + one-step restore, not general undo |
| Reports scope | Current Group and All Groups, with filters |
| Report periods | No weekly / monthly / yearly rollups |
| Occupancy percentage | Valid for ONE date only |
| Storage | localStorage for v1.0; real database at v2.0 |
| Printing mechanism | Hidden iframe, never `window.open()` — see §6 |

## Departure Dates — Full Spec (authoritative)

Referenced by `PROJECT_TRACKER.md`. DEP1 (data model) is done;
DEP2–DEP5 (UI, overlap, auto-checkout, reports) are in progress.

**Checkout is per-room, not per-group, and has no time field.**
A group has one default `departureDate`; any room can override
it via `departureOverride` when part of a group leaves on a
different day. There is no checkout *time* anywhere — a real
PMS handles that precision; this app only needs dates.
`checkedOut` is a boolean per room. **Check out one room** flips
that room's flag. **Check out the whole group** flips every
room's flag in one action. The group's own status only becomes
`Checked Out` once every room in it is.

**Nights is the primary input, not departure date.** Type `3`
in Nights, Departure Date fills itself as Arrival + 3.
Departure Date can also be picked directly on the calendar,
which recalculates Nights the other way. **Tab from Arrival
Date jumps straight into Departure Date.**

**Status auto-behavior:**

| Status | Auto-behavior |
|---|---|
| Pending | Never auto-changes. Manual checkout or delete only. |
| Confirmed | Auto-flags **No Show** once arrival date passes with no check-in. Reversing requires the Manager PIN. |
| Checked In | Auto-transitions to **Checked Out** once departure date passes. No PIN needed — this is the normal end of a stay, not a correction. |
| Arrived / Checked Out / Cancelled | Settled states, no further auto-change. |

**Overlap — the rule that matters for accounting:**

- Same room, **same group** → the existing `DUPLICATE` check.
  Hard block, **no override, ever**. Not physically possible —
  a group cannot occupy one room twice on one reservation.
- Same room, **different groups**, overlapping date ranges →
  new check, not yet built (DEP3). Hard block by default,
  **PIN-overridable** for a genuine authorized exception (e.g.
  an agreed late checkout overlapping an early arrival).
  **Overrides only ever apply across groups, never within one.**

---

# 15. ROADMAP

### Done
Sprints A–F3 · **all four Sprint D modularization phases
complete** · reports verified · dialogs · shortcuts ·
diagnostics · printable reports · version registry ·
README + CHANGELOG

### Remaining for v1.0
- RC1 → **soak test on one real group arrival** → v1.0
- Remove the dev `no-store` meta tag before tagging

### Departure dates — IN PROGRESS, not deferred

Full spec is in §14. **DEP1 (data model) is done** — schema v3,
migration, `getRoomDepartureDate()`. DEP2 (UI) is next; see
`PROJECT_TRACKER.md` §5 for live phase status. This moved ahead
of the rest of the v1.1 list below because occupancy accuracy
and the overlap/no-show rules depend on it.

### v1.1 — remaining items, ordered so each unlocks the next
1. ~~Departure date / nights~~ — in progress, see above
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
Suite Diagnostics — 12 modules, 0 problems, storage 0%
```

## Regression checklist

1. Six tabs switch
2. Add Row → one row · Generate 5 → five rows
3. Room rejects letters and a 4th digit · Pax caps at 2
4. Enter moves down the column; cells do not grow
5. Nine columns, every value under its own header
6. Mapped room → category fills, Pax auto-fills
7. Unmapped, duplicate or over-capacity → red, **Save AND
   Print both blocked**
8. Duplicate room → **both** rows flag red, not just the second
9. Children clamps to capacity; age boxes appear per child
10. Guest Name: button and Down Arrow both append at the true
    end regardless of caret position; button disables at the
    room's occupancy limit
11. Edit, wait 2s, F5 → value persists
12. Save → F5 → listed · search then Delete → correct group
13. Clear / Generate / Bulk Import → confirm + restore bar works
14. Print Register · Blank · Rooming List — **no Category
    column**; app stays fully responsive immediately after
    printing, no Alt+Tab needed
15. Four printed reports for a seeded date; a manifest date
    with zero groups prints a blank register with a note,
    not a bare "no data" message
16. Export JSON / CSV · Open Group · Bulk Import
17. Room Master: ranges, bulk, rename, delete, rules, PIN
18. Reports: four cards, both scopes, filters
19. Settings: logo, footer, toggles, PIN, backup, restore,
    diagnostics
20. Shortcuts: `Alt+1`–`6`, `Ctrl+S`, `Ctrl+P`, `Ctrl+Enter`, `F1`
21. Arrival Date rejects any date before today

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