# HOTEL GROUP OPERATIONS SUITE (HRGM)
## PROJECT_TRACKER.md

---

# 1. PROJECT INFORMATION

**Project Name:** Hotel Group Operations Suite (HRGM)

**Current Version:** v1.0 Release Candidate track

**Platform:** HTML / CSS / vanilla JavaScript, 13 modules, no build tools
during development. LocalStorage, schema-versioned (`SCHEMA_VERSION = 4`).

**Scope boundary, permanent:** group bookings only, no non-group/walk-in
data, ever.

---

# 2. MODULE INVENTORY — GENUINELY COMPLETE

All 13 modules now directly reviewed, no exceptions remaining.

- **`version.js`** — release identity (`APP_NAME`/`APP_VERSION`/`APP_BUILD`),
  `EXPECTED_MODULES` manifest (all 13 files, file-level version check),
  `registerModuleVersion()`, `getVersionReport()`. Loads first, before
  `dialog.js`.
- **`diagnostics.js`** — the most thorough file in the project. Checks
  function existence per module (`MODULE_MANIFEST`), global objects
  (`DB`, `GroupRepository`, `RoomMasterRepository`,
  `REGISTER_COLUMNS`, etc.), critical DOM element IDs
  (`CRITICAL_ELEMENTS`), register header/row column-count consistency,
  **duplicate `<script>` tag detection**, version mismatches against
  `version.js`, and localStorage usage — plus a downloadable diagnostic
  report a hotel can email support instead of reading console output
  over the phone. Deliberately excludes itself from `MODULE_MANIFEST`'s
  function-count (a file checking its own existence is circular) — this
  is why the startup banner correctly reads "12 modules checked," not 13.
  Not a bug; confirmed by reading the actual code, not inferred.

Everything else — `database.js`, `dialog.js`, `printing.js`,
`room-master.js`, `register.js`, `dashboard.js`, `reports.js`,
`report-print.js`, `groups.js`, `app.js`, `shortcuts.js` — reviewed
previously, all clean, zero function-name collisions across the entire
project confirmed by direct comparison, not assumption.

---

# 3. COMPLETED THIS SESSION

- **Departure Manifest** (`RPT3`/`RPT3b`/`RPT3c`) — fifth report in
  `report-print.js`. Filters by per-room departure date via
  `getRoomDepartureDate()`, respecting checkout overrides. Grouped by
  group name, matching the Housekeeping sheet's pattern. Dropdown option
  added permanently. Fully tested including the override-specific
  behavior.
- **`diagnostics.js` updated (`DIAG1`)** — `MODULE_MANIFEST` and
  `CRITICAL_ELEMENTS` extended to cover everything built this session:
  `showForm`, `getRoomDepartureDate`, `promptMealBreakdown`,
  `buildNightsInRange`, `buildConflictSummary`, `renderConflictReport`,
  `exportReportsCSV`, `printDepartureManifest`,
  `getRoomsForDepartureDate`, `reportConflictSummary`,
  `appDialogFormWrap`, `appDialogFormFields`. Check logic itself
  untouched — only what gets checked was extended.
- **Regression found and fixed, same session.** The newly-updated
  `diagnostics.js` immediately caught `MISSING ELEMENT
  #reportConflictSummary` on the very next reload — proof the update
  works. Root cause: the Overlapping Rooms card had originally been
  added by the developer manually (the file wasn't available to edit
  directly at the time), and that change was never synced into the
  working copy used for later full-file HTML deliveries — so an
  unrelated, correctly-verified edit (the departure dropdown option)
  silently overwrote it. Restored. New rule added to `CLAUDE.md` (§2.16):
  a manually-requested edit has to be synced into the working copy the
  moment the file becomes available, not left as a gap until the next
  full-file replacement quietly erases it.

---

# 4. KNOWN ISSUES

None. Full module review is complete, every gap found during it —
including the one caught by this session's own diagnostics update — has
been resolved and verified.

---

# 5. NEXT UP

Nothing currently queued. Full module inventory done, all recent feature
work (DEP5/5b/5c, Overlapping Rooms, `showForm`, Departure Manifest,
diagnostics coverage) tested and confirmed working. Bring whatever's next
whenever ready.