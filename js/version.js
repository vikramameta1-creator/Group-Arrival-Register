/* =====================================================
   HOTEL GROUP OPERATIONS SUITE
   File    : js/version.js
   Version : 1.0.0

   VERSION REGISTRY

   Two purposes:

   1. Identify the release in the footer and on every
      printed document.

   2. Let a patch installer verify what actually loaded.

   EXPECTED_MODULES is the manifest an installer ships.
   Each module appends one line at the end of its own
   file declaring the version it really is:

       registerModuleVersion("register.js", "1.0.0");

   diagnostics.js compares the two. A module that failed
   to update reports as a version mismatch instead of
   silently running old code — which is the difference
   between a rollback trigger and a support call.

   A JavaScript file is atomic: it either loads or it
   does not. What it cannot tell you on its own is
   whether it is the version you think it is. This file
   closes that gap.

   Load FIRST, before dialog.js.
===================================================== */


/* =====================================================
   RELEASE
===================================================== */

const APP_NAME = "Group Arrival Register";

const APP_VERSION = "1.0.0";

const APP_BUILD = "2026-07-30";

const APP_SUITE = "Hotel Operations Suite";


/* =====================================================
   EXPECTED MODULE VERSIONS

   Update this table when a module is patched. An
   installer ships this file alongside the modules it
   replaces.
===================================================== */

const EXPECTED_MODULES = {

    "version.js":      "1.0.0",
    "dialog.js":       "1.0.0",
    "database.js":     "1.0.0",
    "printing.js":     "1.0.0",
    "room-master.js":  "1.0.0",
    "register.js":     "1.0.0",
    "dashboard.js":    "1.0.0",
    "reports.js":      "1.0.0",
    "report-print.js": "1.0.0",
    "groups.js":       "1.0.0",
    "app.js":          "1.0.0",
    "shortcuts.js":    "1.0.0",
    "diagnostics.js":  "1.0.0"

};


/* =====================================================
   WHAT ACTUALLY LOADED
===================================================== */

const loadedModules = {};


function registerModuleVersion(file, version) {

    loadedModules[file] = version;

}


/* =====================================================
   COMPARISON
===================================================== */

function getVersionReport() {

    const report = {

        app:      APP_VERSION,
        build:    APP_BUILD,
        expected: Object.keys(EXPECTED_MODULES).length,
        loaded:   0,
        missing:  [],
        mismatch: [],
        extra:    []

    };

    Object.keys(EXPECTED_MODULES).forEach(file => {

        const want = EXPECTED_MODULES[file];

        const got = loadedModules[file];

        if (got === undefined) {

            report.missing.push(file);

            return;
        }

        report.loaded++;

        if (got !== want) {

            report.mismatch.push({
                file:     file,
                expected: want,
                loaded:   got
            });
        }

    });

    Object.keys(loadedModules).forEach(file => {

        if (!EXPECTED_MODULES.hasOwnProperty(file)) {

            report.extra.push(file);
        }

    });

    report.healthy =
        report.missing.length === 0 &&
        report.mismatch.length === 0;

    return report;
}


function getVersionString() {

    return APP_NAME + " v" + APP_VERSION;
}


function getPrintFooterText() {

    return (
        APP_NAME +
        " v" + APP_VERSION +
        "  ·  " + APP_SUITE
    );
}


/* =====================================================
   FOOTER
===================================================== */

function renderAppVersion() {

    const target =
        document.getElementById("appVersion");

    if (!target) return;

    const report = getVersionReport();

    target.textContent = "v" + APP_VERSION;

    target.title =
        APP_NAME + " v" + APP_VERSION +
        "\nBuild " + APP_BUILD +
        "\nModules " + report.loaded +
        " of " + report.expected;

    target.classList.toggle(
        "version-warning",
        !report.healthy
    );
}


registerModuleVersion("version.js", APP_VERSION);