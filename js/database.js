/* =====================================================
   HOTEL GROUP OPERATIONS SUITE
   File    : js/database.js
   Version : 1.0.0 RC1

   DATABASE + REPOSITORY LAYER

   Owns:
       STORAGE_KEY, SCHEMA_VERSION, DEFAULT_DB, DB
       ISO timestamp helpers
       migrateDatabase()
       loadDatabase() / saveDatabase()
       showSaveFlash()
       GroupRepository

   This file MUST load FIRST. It declares DB with let and
   GroupRepository with const; neither is hoisted, and a
   const cannot be redeclared. Nothing here may also exist
   in app.js.

   When the suite moves to a shared database or an API,
   this is the only file that changes.
===================================================== */


/* =====================================================
   DATABASE
===================================================== */

const STORAGE_KEY = "hotel_group_operations_v5";

/* Bump when the stored shape changes, then add a
   migration step in migrateDatabase(). */

const SCHEMA_VERSION = 4;

const DEFAULT_DB = {

    schemaVersion: SCHEMA_VERSION,

    groups: [],

    settings: {

        hotelName: "Hotel Group Operations Suite",

        footerText: "Powered by Group Operations Suite",

        logo: "",

        roomNumbersOnly: true,

        showRoomCategory: true
    },

    roomMaster: {

        categories: [],

        rooms: {}
    },

    /* One flat, append-only log for the whole app. Every
       feature that needs to record "what happened" writes
       through recordAuditEntry() below, rather than
       inventing its own storage. actor is a placeholder
       string until real user accounts exist - the shape
       does not change when that arrives, the field just
       starts holding a real username instead of
       "Front Office". */

    auditLog: []
};

let DB = loadDatabase();
/* =====================================================
   TIMESTAMPS

   Stored as ISO 8601 (2026-07-28T03:49:33.000Z) so they
   sort correctly, survive any locale, and can be handed
   to an API or SQL column unchanged.
===================================================== */

function nowISO() {

    return new Date().toISOString();
}


function toISOTimestamp(value) {

    if (!value) return nowISO();

    /* Already ISO */

    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {

        return value;
    }

    /* Legacy en-IN format: 28/07/2026, 3:49:33 am */

    const match =
        String(value).match(
            /^(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s+(\d{1,2}):(\d{2}):(\d{2})\s*(am|pm)?/i
        );

    if (match) {

        let hour = Number(match[4]);

        const suffix = (match[7] || "").toLowerCase();

        if (suffix === "pm" && hour < 12) hour += 12;

        if (suffix === "am" && hour === 12) hour = 0;

        const parsed =
            new Date(
                Number(match[3]),
                Number(match[2]) - 1,
                Number(match[1]),
                hour,
                Number(match[5]),
                Number(match[6])
            );

        if (!isNaN(parsed.getTime())) {

            return parsed.toISOString();
        }
    }

    const fallback = new Date(value);

    return isNaN(fallback.getTime())
        ? nowISO()
        : fallback.toISOString();
}


function formatTimestamp(value) {

    if (!value) return "";

    const date = new Date(value);

    return isNaN(date.getTime())
        ? String(value)
        : date.toLocaleString();
}


/* =====================================================
   DEPARTURE DATE HELPERS

   A group carries one default departure date. Any room
   can override it individually - same pattern already
   used for Pax and Children. Everything that needs "when
   does this room actually leave" calls
   getRoomDepartureDate() rather than re-deriving the
   precedence itself.
===================================================== */

function addDaysToDate(dateString, days) {

    if (!dateString) return "";

    const date = new Date(dateString);

    if (isNaN(date.getTime())) return "";

    date.setDate(date.getDate() + days);

    return date.toISOString().slice(0, 10);
}


function computeNightsBetween(arrivalDate, departureDate) {

    if (!arrivalDate || !departureDate) return 0;

    const arrival = new Date(arrivalDate);

    const departure = new Date(departureDate);

    if (
        isNaN(arrival.getTime()) ||
        isNaN(departure.getTime())
    ) {

        return 0;
    }

    const nights =
        Math.round(
            (departure.getTime() - arrival.getTime()) /
            86400000
        );

    return nights > 0 ? nights : 0;
}


function getRoomDepartureDate(group, room) {

    if (!group) return "";

    return (
        (room && room.departureOverride) ||
        group.departureDate ||
        ""
    );
}


/* =====================================================
   AUDIT TRAIL

   One entry point for the whole application. Every
   feature that needs to record an action - not just this
   phase's override approvals - calls recordAuditEntry()
   rather than writing its own note somewhere. This is
   what makes it a single audit trail across the app
   instead of a pile of unrelated logs.

   actor is a placeholder until real user accounts exist.
   Nothing about this shape needs to change when they do.
===================================================== */

function generateAuditId() {

    return (
        "AUD-" +
        Date.now() +
        "-" +
        Math.floor(Math.random() * 1000)
    );
}


function recordAuditEntry(action, details) {

    if (!Array.isArray(DB.auditLog)) {

        DB.auditLog = [];
    }

    const entry = Object.assign(
        {
            id:        generateAuditId(),
            action:    action,
            actor:     "Front Office",
            createdAt: nowISO()
        },
        details || {}
    );

    DB.auditLog.push(entry);

    saveDatabase();

    return entry;
}


function getAuditLog() {

    return Array.isArray(DB.auditLog) ? DB.auditLog : [];
}


/* =====================================================
   SCHEMA MIGRATION
===================================================== */

function migrateDatabase(db) {

    const from = Number(db.schemaVersion) || 1;

    if (from === SCHEMA_VERSION) return db;

    /* ---------- 1 -> 2 : ISO timestamps ---------- */

    if (from < 2) {

        (db.groups || []).forEach(group => {

            group.createdOn =
                toISOTimestamp(group.createdOn);

            group.modifiedOn =
                toISOTimestamp(group.modifiedOn);

        });

        console.log(
            "Migrated " +
            (db.groups || []).length +
            " group(s) to ISO timestamps."
        );
    }

    /* ---------- 2 -> 3 : Departure dates ---------- */

    if (from < 3) {

        (db.groups || []).forEach(group => {

            if (!group.departureDate) {

                group.departureDate =
                    addDaysToDate(group.arrivalDate, 1);
            }

            if (typeof group.nights !== "number") {

                group.nights =
                    computeNightsBetween(
                        group.arrivalDate,
                        group.departureDate
                    ) || 1;
            }

            if (typeof group.noShowFlag !== "boolean") {

                group.noShowFlag = false;
            }

            (group.rooms || []).forEach(room => {

                if (typeof room.departureOverride !== "string") {

                    room.departureOverride = "";
                }

                if (typeof room.checkedOut !== "boolean") {

                    room.checkedOut = false;
                }

            });

        });

        console.log(
            "Migrated " +
            (db.groups || []).length +
            " group(s) to include departure dates."
        );
    }

    /* ---------- 3 -> 4 : Audit log ---------- */

    if (from < 4) {

        if (!Array.isArray(db.auditLog)) {

            db.auditLog = [];
        }

        console.log("Migrated database to include the audit log.");
    }

    db.schemaVersion = SCHEMA_VERSION;

    return db;
}

/* =====================================================
   LOAD DATABASE
===================================================== */

function loadDatabase() {

    try {

        const saved =
            localStorage.getItem(STORAGE_KEY);

        if (!saved) {

            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(DEFAULT_DB)
            );

            return structuredClone(DEFAULT_DB);
        }

        const parsed =
            JSON.parse(saved);

        /* ---------- Repair Missing Structure ---------- */

        if (!Array.isArray(parsed.groups)) {

            parsed.groups = [];
        }

        if (!parsed.settings) {

            parsed.settings =
                structuredClone(DEFAULT_DB.settings);
        }

        return migrateDatabase(parsed);

    } catch (error) {

        console.error(
            "Database Load Error",
            error
        );

        return structuredClone(DEFAULT_DB);
    }
}


/* =====================================================
   SAVE DATABASE
===================================================== */

function saveDatabase() {

    try {

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(DB)
        );

        showSaveFlash("Saved");

    } catch (error) {

        console.error(
            "Database Save Error",
            error
        );

        showSaveFlash("Save failed", true);

        showAlert(
            "Unable to save. Browser storage may be full.\n\n" +
            "Take a backup from Settings and clear old data.",
            "Save Failed"
        );
    }
}


/* =====================================================
   SAVE INDICATOR
===================================================== */

let saveFlashTimer = null;

function showSaveFlash(message, isError) {

    let flash =
        document.getElementById("saveFlash");

    if (!flash) {

        flash = document.createElement("div");

        flash.id = "saveFlash";

        flash.className = "save-flash";

        document.body.appendChild(flash);
    }

    flash.textContent =
        (isError ? "✕  " : "✓  ") + (message || "Saved");

    flash.classList.toggle("error", !!isError);

    flash.classList.add("show");

    clearTimeout(saveFlashTimer);

    saveFlashTimer =
        setTimeout(function () {

            flash.classList.remove("show");

        }, 1800);
}

/* =====================================================
   GROUP REPOSITORY
===================================================== */

const GroupRepository = {

    getAll() {

        return DB.groups;

    },

    get(index) {

        return DB.groups[index];

    },

    add(group) {

        DB.groups.push(group);

        saveDatabase();

    },

    update(index, group) {

        DB.groups[index] = group;

        saveDatabase();

    },

    remove(index) {

        if (
            index < 0 ||
            index >= DB.groups.length
        ) {

            return false;
        }

        DB.groups.splice(index, 1);

        saveDatabase();

        return true;

    },

    count() {

        return DB.groups.length;

    }

};
registerModuleVersion("database.js", "1.0.0");