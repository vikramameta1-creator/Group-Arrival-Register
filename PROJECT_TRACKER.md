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

# 2. MODULE INVENTORY — COMPLETE

All 13 modules reviewed. See `CLAUDE.md` §4 for the list.

---

# 3. COMPLETED LAST SESSION

- **CSS grid fix** — `.action-groups` was missing `display:grid`, silently
  disabling the whole layout. Fixed.
- **UI restructure (`UI1`)** — Arrival Register split into two pages: table
  + Build Register + Panels stay together; Meal Plan, Group, Print & Checks
  moved to a new **Register Tools** page. Alt+1…7 and Ctrl+S updated to match.
- **Floating Save button** — built, works correctly for saving from any
  page, bound to the same `saveCurrentGroup()` the original button uses.
  Ctrl+S simplified back to saving in place, no longer needs to force a
  page switch now that the button is visible everywhere.

---

# 4. TWO CONFIRMED BUGS, NOT YET FIXED

Developer tested and confirmed both. Diagnosed, not yet patched — do these
first next session, before anything else.

1. **Floating Save button shows on every page, shouldn't.** It only ever
   saves group data, so it has no reason to appear on Settings, Dashboard,
   Reports, or Room Master. Needs to show only on **Arrival Register** and
   **Register Tools** — the two pages that actually deal with a group.

2. **Floating Save button visually overlaps the summary cards row**
   (Total Rooms/Pax/EP/CP/MAP/AP) at the bottom of Arrival Register.
   Root cause: `position:fixed; bottom:24px; right:24px` anchors the
   button to the viewport, but nothing reserves space for it in the page
   content below — so on shorter viewports the summary cards scroll
   directly underneath it. Fix is bottom padding on the page content
   (roughly the button's height plus a margin), not a repositioning
   patch — needs doing properly, not just nudged a few pixels.

---

# 5. STILL UNCONFIRMED — DO NOT BUILD WITHOUT REVISITING

**Per-group file attachments (reference documents).** Use case confirmed
as reference-only — booking confirmations, agent emails, viewed
occasionally, never edited. Proposed plan, **not yet approved**:

- Storage: **IndexedDB**, not localStorage — can actually hold Blobs, far
  larger quota, no server or Electron needed yet
- Data shape: `{id, groupId, fileName, fileType, fileSize, uploadedOn, blob}`
- Location: new panel on **Register Tools**, not Arrival Register
- Behavior: drag-and-drop, simple list (name/type/size/date), download,
  delete — no in-app preview, no editing
- Open question flagged, not resolved: a brand-new unsaved group has no
  `id` yet — attachments need the group saved at least once first, or a
  temporary id reconciled on first save

Developer has not said "build it this way" yet. Confirm before writing
any of this.

---

# 6. NEXT UP, IN ORDER

1. Fix the floating Save button's page-scoping (§4.1)
2. Fix the floating Save button's overlap with summary cards (§4.2)
3. Revisit and confirm (or adjust) the attachment feature plan (§5) before
   building any of it