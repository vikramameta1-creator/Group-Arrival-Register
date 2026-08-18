# CLAUDE.md
## AI Collaboration Rules — Hotel Group Operations Suite (HRGM)

Read fully before touching any file. Every rule exists because of a real
incident, not written speculatively.

---

# 1. WHAT THIS PROJECT IS

**HRGM** — vanilla JavaScript, 13 modules, group hotel bookings only.
Sister app **HKIM**, separate codebase. **Scope is permanent**: no
non-group/walk-in/individual reservation data, ever, not just for v1.0.

The developer works by **copy-pasting code into VS Code**. No CI, no
linter, no automated tests. Every safeguard below is manual.

---

# 2. NON-NEGOTIABLE RULES

## 2.1 Never assume a function exists, or where it lives
Confirm the current file before referencing anything in it.

## 2.2 Full file replacements are the default, not patches

## 2.3 Always verify before handing back a file
`node --check`, exactly-one-definition grep check, confirm call sites.

## 2.4 Ask for a fresh upload if there's any doubt about currency

## 2.5 Confirm before building, especially for ambiguous or
architecturally significant asks

## 2.6 Group identity is matched by `id`, never by `groupName`

## 2.7 Repository and audit-trail patterns are mandatory
All storage through `GroupRepository` (owned by `database.js` — see 2.15).
All status changes through `recordAuditEntry()`.

## 2.8 Dialog system, not native browser dialogs
`showAlert`/`showConfirm`/`showPrompt`/`showForm`. Backdrop-click never
cancels a `showForm` dialog — only explicit Cancel or Escape.

## 2.9 Strict v1.0 feature freeze

## 2.10 New files announced up top; function-level changes tracked
the same way file-level changes are.

## 2.11 Test instructions name the exact page and exact element

## 2.12 When a change increases data volume, reconsider the display

## 2.13 When a bug's root cause isn't 100% certain, fix defensively too

## 2.14 A "conflict" report claim needs a DOM-scoping check, not a guess
Verify what each handler is actually attached to before concluding either
side is at fault.

## 2.15 Verify a claim against the real file before repeating it again
This file previously stated `groups.js` owns `GroupRepository`. It
doesn't — `database.js` does, and always did; the note was wrong,
carried forward from a stale pre-modularization file and never
re-checked against the real, current code. The fix wasn't a code change,
it was re-reading the actual file before writing the claim down a second
time. Documentation drift is a real failure mode here, same as a stray
paste — don't let something written once become "true" just because it
was written before.

## 2.16 A manual edit you asked the developer to make is still your
responsibility to track
If a change gets described as "add this yourself" rather than edited
directly (because the file wasn't available at the time), the exact same
change must be applied to the working copy the moment the file does
become available — not left as a silent gap. A later full-file
replacement from that stale copy will erase the developer's manual work
with no warning, even though every anchor-match safety check passes
cleanly. Those checks only prove the specific text being touched hasn't
drifted; they say nothing about the rest of the file. This is exactly how
`reportConflictSummary` got silently deleted by an unrelated, correctly
verified edit two files later — caught only because the just-updated
`diagnostics.js` flagged it immediately. Fixed: verify every
manually-requested change actually landed in the working copy before
treating that copy as trustworthy for a future full-file delivery.

## 2.17 A function's exact signature is a real clue, not decoration
`getRoomDepartureDate(group, room)` taking a specific room — not just a
group — was the tell that per-room departure overrides existed, a full
session before the file that proved it got reviewed. When a signature
implies more than the current mental model accounts for, that's worth
flagging out loud rather than building against the simpler assumption and
finding out later.

---

# 3. SESSION WORKFLOW

1. Confirm the exact file(s) needed before writing any code.
2. Small, scoped phases.
3. Verify before handing anything back.
4. State assumptions explicitly when ambiguous; proceed once confirmed.
5. Test steps with exact navigation (§2.11).
6. **Every session ends with `CLAUDE.md` and `PROJECT_TRACKER.md` fully
   rewritten.**

---

# 4. ARCHITECTURE SUMMARY

All 13 modules reviewed as of this session — see `PROJECT_TRACKER.md` §2
for the complete, corrected inventory and what each one actually owns.
Load order: `version.js, dialog.js, database.js, printing.js,
room-master.js, register.js, dashboard.js, reports.js, report-print.js,
groups.js, app.js, shortcuts.js, diagnostics.js`.

`database.js` loads first by design and is the single file that changes
when this project eventually moves to SQL — the repository pattern was
deliberately built with that migration in mind from the start.

See `PROJECT_TRACKER.md` for current feature status and the open roadmap.