/* =====================================================
   HOTEL GROUP OPERATIONS SUITE
   File    : js/diagnostics.js
   Version : 1.0.0 RC1

   MODULE HEALTH CHECK

   Runs at startup and verifies that every cross-module
   dependency actually exists. Nine modules calling each
   other across a global scope means a function can go
   missing and stay invisible until a customer clicks
   something on a Tuesday night.

   Output is one console line when healthy, or a named
   list of problems that a support person can read over
   the phone.

   When the suite moves to the cloud this becomes the
   health endpoint.

   Load LAST, after shortcuts.js.
===================================================== */


/* =====================================================
   EXPECTED MODULE CONTENTS
===================================================== */

const MODULE_MANIFEST = {

    "dialog.js": [
        "showDialog", "showAlert", "showConfirm",
        "showPrompt", "initializeDialogs", "finishDialog"
    ],

    "database.js": [
        "loadDatabase", "saveDatabase", "migrateDatabase",
        "nowISO", "toISOTimestamp", "formatTimestamp",
        "showSaveFlash"
    ],

    "printing.js": [
        "openPrintWindow", "printRegister",
        "printBlankRegister", "printRoomingList",
        "escapeHTML", "buildDocumentHeader",
        "buildTotalsBlock"
    ],

    "room-master.js": [
        "ensureRoomMaster", "parseRoomList",
        "normalizeRoomNumber", "getRoomCategory",
        "getRoomOccupancyRule", "isRoomInMaster",
        "roomMasterHasRooms", "renderRoomMaster",
        "initializeRoomMaster", "hashPin",
        "applyRoomMasterLock"
    ],

    "register.js": [
        "createRowHTML", "getRegisterBody",
        "getRegisterRows", "loadRegisterRows",
        "generateRows", "addRow", "sortRooms",
        "renumberRows", "autoGenerateRoomSeries",
        "clearRegisterFields", "clearRegister",
        "isEmptyRegisterRow", "updateSummary",
        "setSummaryValue", "syncRoomingList",
        "refreshRegisterViews", "updateRegisterCategories",
        "getInvalidRooms", "getRowCapacityError",
        "renderChildAges", "getChildLimit",
        "autoFillPaxFromRoom", "validateRooms",
        "checkDuplicateRooms", "showValidationReport",
        "isRoomNumericOnly", "isRoomMasterEnforced",
        "handleRegisterKeydown", "handleRegisterInput",
        "handleRegisterBeforeInput",
        "handleRegisterCleanup", "placeCaretAtEnd",
        "initializeRegisterEvents",
        "filterRegisterRows", "clearRegisterFilter",
        "initializeRegisterSearch", "snapshotRegister",
        "showRestoreBar", "hideRestoreBar",
        "dismissRestore", "restoreLastRegister",
       "confirmRegisterReplace", "initializeRestoreBar",
        "applyMealToAllRows", "initializeBulkMealPlan",
        "clearRegisterFields"
    ],

    "dashboard.js": [
        "updateDashboard", "updateArrivalControlCenter",
        "getStatusClass", "buildLiveArrivalLists",
        "renderSavedGroups", "updateDashboardFromRegister",
        "refreshEntireDashboard"
    ],

    "reports.js": [
        "updateReports", "buildReportStats",
        "setReportScope", "getFilteredGroups",
        "getInventorySnapshot", "buildDateOccupancy",
        "renderCategoryReport", "initializeReports"
    ],

    "groups.js": [
        "getCurrentGroupData", "loadGroupToScreen",
        "saveCurrentGroup", "openSavedGroup",
        "deleteSavedGroup", "openGroupSelector",
        "searchGroups", "archiveCurrentGroup",
        "exportGroupJSON", "importGroupJSON",
        "processBulkImport", "exportCSV",
        "backupDatabase", "restoreDatabase",
        "autoSaveCurrentWork", "scheduleAutoSave",
        "restoreDraft", "toggleDraftBanner",
        "keepDraft", "discardDraft",
        "initializeGroupEvents"
    ],

    "app.js": [
        "initializeApplication", "refreshApplication",
        "refreshApplicationSettings", "saveApplication",
        "switchPage", "initializeNavigation",
        "loadSettingsToScreen", "updateBranding",
        "saveSettings", "handleLogoUpload", "restoreLogo",
        "getLocalDateString", "getTodayString",
        "getTomorrowString", "updateDateTime",
        "generateId", "qs", "qsa", "formatNumber",
        "showMealAnalytics", "initializeProfessionalTools",
        "togglePanel", "toggleNotes", "toggleBulkImport",
        "initializePrintEvents", "initializeSettingsEvents"
    ],

    "shortcuts.js": [
        "initializeShortcuts", "showShortcutHelp",
        "handleGlobalShortcut", "getActivePageId"
    ],

    "version.js": [
        "registerModuleVersion", "getVersionReport",
        "getVersionString", "getPrintFooterText",
        "renderAppVersion"
    ],

    "report-print.js": [
        "printArrivalManifest", "printHousekeepingSheet",
        "printCoversSheet", "printManagementFlash",
        "printSelectedReport", "initializeReportPrinting",
        "getGroupsForDate", "summariseRooms",
        "buildReportHeader", "getReportDate"
    ]

};


/* Globals that are objects rather than functions */

const EXPECTED_OBJECTS = {

    "DB":                     "database.js",
    "GroupRepository":        "database.js",
    "RoomMasterRepository":   "room-master.js",
    "REGISTER_COLUMNS":       "register.js",
    "REGISTER_LIMITS":        "register.js",
    "DEFAULT_OCCUPANCY_RULE": "room-master.js"

};


/* Element IDs the code looks up by name. A missing one
   means a feature silently does nothing. */

const CRITICAL_ELEMENTS = [

    "hotelTitle", "footerText", "currentDateTime",
    "arrivalRegisterTable", "arrivalRegisterBody",
    "roomingListBody", "savedGroupsBody",
    "groupStatus", "groupName", "arrivalDate",
    "agentCompany", "preparedBy", "groupNotes",
    "summaryRooms", "summaryPax",
    "categoryListBody", "roomInventoryBody",
    "roomMasterSummary", "newRoomCategory",
    "reportArrivalSummary", "reportMealSummary",
    "reportOccupancySummary", "reportCategorySummary",
    "appVersion",
    "appDialog", "appDialogOk", "appDialogCancel",
    "appDialogInput", "appDialogTitle",
    "settingHotelName", "settingFooterText",
    "settingRoomNumbersOnly", "settingRestrictRooms",
    "draftBanner", "bulkImportPanel", "notesPanel",
    "printReportType", "printReportDate",
    "btnPrintSelectedReport",
    "registerSearch", "btnClearRegisterSearch",
    "restoreBar", "restoreBarText",
    "btnRestoreRegister", "btnDismissRestore",
    "diagnosticsSummary", "btnRunDiagnostics"

];


/* =====================================================
   GLOBAL LOOKUP

   Top-level const and let in a classic script do NOT
   become properties of window - only var and function
   declarations do. So window["DB"] is undefined even
   though DB works. new Function() runs in global scope
   and can see the global lexical environment, so it
   reports both kinds correctly.
===================================================== */

function globalTypeOf(name) {

    try {

        return new Function(
            "return typeof " + name
        )();

    } catch (error) {

        return "undefined";
    }
}


/* =====================================================
   CHECKS
===================================================== */

function checkModuleFunctions() {

    const problems = [];

    Object.keys(MODULE_MANIFEST).forEach(file => {

        MODULE_MANIFEST[file].forEach(name => {

            if (globalTypeOf(name) !== "function") {

                problems.push({
                    level: "ERROR",
                    text:
                        "MISSING FUNCTION  " + name +
                        "  (expected in " + file + ")"
                });
            }

        });

    });

    return problems;
}


function checkGlobalObjects() {

    const problems = [];

    Object.keys(EXPECTED_OBJECTS).forEach(name => {

        if (globalTypeOf(name) === "undefined") {

            problems.push({
                level: "ERROR",
                text:
                    "MISSING OBJECT  " + name +
                    "  (expected in " +
                    EXPECTED_OBJECTS[name] + ")"
            });
        }

    });

    return problems;
}


function checkElements() {

    const problems = [];

    CRITICAL_ELEMENTS.forEach(id => {

        if (!document.getElementById(id)) {

            problems.push({
                level: "ERROR",
                text: "MISSING ELEMENT  #" + id
            });
        }

    });

    return problems;
}


/* The register once broke silently because the header
   row and the body row had different cell counts. */

function checkRegisterColumns() {

    const problems = [];

    if (typeof REGISTER_COLUMNS === "undefined") {

        return problems;
    }

    const expected =
        Object.keys(REGISTER_COLUMNS).length;

    const headers =
        document.querySelectorAll(
            "#arrivalRegisterTable thead th"
        ).length;

    if (headers !== expected) {

        problems.push({
            level: "ERROR",
            text:
                "COLUMN MISMATCH  register <thead> has " +
                headers + " columns, REGISTER_COLUMNS " +
                "expects " + expected
        });
    }

    const firstRow =
        document.querySelector(
            "#arrivalRegisterBody tr"
        );

    if (firstRow && firstRow.cells.length !== expected) {

        problems.push({
            level: "ERROR",
            text:
                "COLUMN MISMATCH  register row has " +
                firstRow.cells.length + " cells, expects " +
                expected
        });
    }

    return problems;
}


function checkDuplicateScripts() {

    const problems = [];

    const seen = {};

    [...document.scripts].forEach(script => {

        if (!script.src) return;

        const name =
            script.src.split("/").pop().split("?")[0];

        if (!name.endsWith(".js")) return;

        if (seen[name]) {

            problems.push({
                level: "ERROR",
                text:
                    "DUPLICATE SCRIPT  " + name +
                    " is loaded more than once"
            });

        } else {

            seen[name] = true;
        }

    });

    return problems;
}


function checkModuleVersions() {

    const problems = [];

    if (typeof getVersionReport !== "function") {

        problems.push({
            level: "WARNING",
            text: "VERSION  version.js is not loaded"
        });

        return problems;
    }

    const report = getVersionReport();

    report.missing.forEach(file => {

        problems.push({
            level: "ERROR",
            text:
                "MODULE NOT LOADED  " + file +
                "  (expected v" + EXPECTED_MODULES[file] + ")"
        });

    });

    report.mismatch.forEach(item => {

        problems.push({
            level: "ERROR",
            text:
                "VERSION MISMATCH  " + item.file +
                "  expected v" + item.expected +
                ", loaded v" + item.loaded
        });

    });

    report.extra.forEach(file => {

        problems.push({
            level: "WARNING",
            text:
                "UNKNOWN MODULE  " + file +
                " is not in the expected manifest"
        });

    });

    return problems;
}


/* =====================================================
   STORAGE USAGE

   localStorage fails silently when full. A warning is
   far better than a save that quietly does nothing.
===================================================== */

function getStorageUsage() {

    let bytes = 0;

    try {

        for (let i = 0; i < localStorage.length; i++) {

            const key = localStorage.key(i);

            const value =
                localStorage.getItem(key) || "";

            bytes += key.length + value.length;
        }

    } catch (error) {

        return { bytes: 0, percent: 0, error: true };
    }

    /* Browsers allow roughly 5 MB for localStorage */

    const limit = 5 * 1024 * 1024;

    return {
        bytes:   bytes,
        kb:      Math.round(bytes / 1024),
        percent: Math.round((bytes / limit) * 100),
        error:   false
    };
}


function checkStorage() {

    const problems = [];

    const usage = getStorageUsage();

    if (usage.error) {

        problems.push({
            level: "ERROR",
            text: "STORAGE  cannot be read"
        });

        return problems;
    }

    if (usage.percent >= 90) {

        problems.push({
            level: "ERROR",
            text:
                "STORAGE  " + usage.percent +
                "% full (" + usage.kb + " KB). Saving " +
                "will fail soon. Take a backup and " +
                "delete old groups."
        });

    } else if (usage.percent >= 75) {

        problems.push({
            level: "WARNING",
            text:
                "STORAGE  " + usage.percent +
                "% full (" + usage.kb + " KB). Take a " +
                "backup and consider deleting old groups."
        });
    }

    return problems;
}


/* =====================================================
   RUN EVERYTHING
===================================================== */

function runDiagnostics() {

    const problems = []
        .concat(checkGlobalObjects())
        .concat(checkModuleFunctions())
        .concat(checkElements())
        .concat(checkRegisterColumns())
        .concat(checkDuplicateScripts())
        .concat(checkModuleVersions())
        .concat(checkStorage());

    const errors =
        problems.filter(p => p.level === "ERROR");

    const warnings =
        problems.filter(p => p.level === "WARNING");

    return {
        moduleCount: Object.keys(MODULE_MANIFEST).length,
        problems:    problems,
        errors:      errors,
        warnings:    warnings,
        healthy:     errors.length === 0,
        storage:     getStorageUsage()
    };
}


/* =====================================================
   CONSOLE REPORT
===================================================== */

function logDiagnostics() {

    const result = runDiagnostics();

    if (result.healthy && result.warnings.length === 0) {

        console.log(
            (typeof getVersionString === "function"
                ? getVersionString() + " — "
                : "Suite Diagnostics — ") +
            result.moduleCount +
            " modules, 0 problems, storage " +
            result.storage.percent + "%"
        );

        return result;
    }

    const headline =
        "Suite Diagnostics — " +
        result.errors.length + " PROBLEM(S), " +
        result.warnings.length + " warning(s)";

    if (result.errors.length > 0) {

        console.error(headline);

    } else {

        console.warn(headline);
    }

    result.problems.forEach(problem => {

        if (problem.level === "ERROR") {

            console.error("  " + problem.text);

        } else {

            console.warn("  " + problem.text);
        }

    });

    return result;
}


/* =====================================================
   ON SCREEN REPORT

   For support. Reads out over the phone.
===================================================== */

function showDiagnosticsReport() {

    const result = runDiagnostics();

    let text =
        "Modules checked : " + result.moduleCount + "\n" +
        "Problems        : " + result.errors.length + "\n" +
        "Warnings        : " + result.warnings.length + "\n" +
        "Storage used    : " + result.storage.kb +
        " KB (" + result.storage.percent + "%)\n" +
        "Groups saved    : " +
        (typeof DB !== "undefined" && DB.groups
            ? DB.groups.length
            : "?") + "\n" +
        "Rooms mapped    : " +
        (typeof RoomMasterRepository !== "undefined"
            ? RoomMasterRepository.totalRooms()
            : "?");

    if (result.problems.length === 0) {

        text += "\n\nAll checks passed.";

    } else {

        text += "\n\n";

        result.problems
            .slice(0, 12)
            .forEach(problem => {

                text +=
                    problem.level + ": " +
                    problem.text + "\n";

            });

        if (result.problems.length > 12) {

            text +=
                "\nand " +
                (result.problems.length - 12) +
                " more — see the browser console.";
        }
    }

    if (typeof showAlert === "function") {

        showAlert(text, "System Diagnostics");

    } else {

        console.log(text);
    }

    return result;
}


/* =====================================================
   SETTINGS PANEL SUMMARY
===================================================== */

function renderDiagnosticsSummary() {

    const target =
        document.getElementById("diagnosticsSummary");

    if (!target) return;

    const result = runDiagnostics();

    let level = "diag-ok";
    let label = "All checks passed";

    if (result.errors.length > 0) {

        level = "diag-error";

        label =
            result.errors.length + " problem(s) found";

    } else if (result.warnings.length > 0) {

        level = "diag-warn";

        label =
            result.warnings.length + " warning(s)";
    }

    target.innerHTML =
        `<p class="muted-note ${level}">${label}</p>
         <p class="muted-note">
            ${result.moduleCount} modules ·
            storage ${result.storage.kb} KB
            (${result.storage.percent}%)
         </p>`;
}


/* =====================================================
   STARTUP
===================================================== */

function initializeDiagnostics() {

    document
        .getElementById("btnRunDiagnostics")
        ?.addEventListener(
            "click",
            showDiagnosticsReport
        );

    logDiagnostics();

    renderDiagnosticsSummary();

}


document.addEventListener(
    "DOMContentLoaded",
    function () {

        /* Let every module finish booting first */

        setTimeout(initializeDiagnostics, 400);

    }
);
registerModuleVersion("diagnostics.js", "1.0.0");