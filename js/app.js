/* =====================================================
   HOTEL GROUP OPERATIONS SUITE
   File    : js/app.js
   Version : 1.0.0 RC1
   Project : Group Arrival Register
   Author  : Vikram Ameta

   BOOTSTRAP AND SHARED SERVICES

   What remains here after modularization:
       utilities and id generation
       local date helpers
       the clock
       tab navigation
       settings, branding, logo
       meal analytics
       professional tools
       collapsible panels
       print and settings event bindings
       application controllers
       the single application bootstrap

   LOAD ORDER
       dialog.js
       database.js       owns DB and GroupRepository
       printing.js
       room-master.js    owns RoomMasterRepository
       register.js       owns REGISTER_COLUMNS
       dashboard.js
       reports.js
       report-print.js
       groups.js         owns the group lifecycle
       app.js            this file
       shortcuts.js
       diagnostics.js    verifies all of the above

   There is exactly ONE DOMContentLoaded listener in the
   application, at the bottom of this file. diagnostics.js
   adds a second on purpose, delayed, so it can check that
   every module finished booting.
===================================================== */


/* =====================================================
   UTILITIES
===================================================== */

function generateId() {

    return (
        "GRP-" +
        Date.now() +
        "-" +
        Math.floor(Math.random() * 1000)
    );
}

function qs(selector) {

    return document.querySelector(selector);
}

function qsa(selector) {

    return document.querySelectorAll(selector);
}

function formatNumber(value) {

    return Number(value || 0);
}


/* =====================================================
   LOCAL DATE HELPER
===================================================== */

function getLocalDateString(date) {

    const d = date || new Date();

    const year = d.getFullYear();

    const month =
        String(d.getMonth() + 1)
        .padStart(2, "0");

    const day =
        String(d.getDate())
        .padStart(2, "0");

    return (
        year + "-" + month + "-" + day
    );
}

function getTodayString() {

    return getLocalDateString(new Date());
}

function getTomorrowString() {

    const d = new Date();

    d.setDate(d.getDate() + 1);

    return getLocalDateString(d);
}


/* =====================================================
   DATE TIME HEADER
===================================================== */

function updateDateTime() {

    const target =
        document.getElementById(
            "currentDateTime"
        );

    if (!target) return;

    target.textContent =
        new Date().toLocaleString();
}


/* =====================================================
   TAB NAVIGATION
===================================================== */

function initializeNavigation() {

    qsa(".tab-btn").forEach(tab => {

        tab.addEventListener(
            "click",
            function () {

                switchPage(this.dataset.tab);

            }
        );

    });
}

function switchPage(pageId) {

    qsa(".page").forEach(page => {

        page.classList.remove("active-page");

    });

    qsa(".tab-btn").forEach(tab => {

        tab.classList.remove("active");

    });

    const page =
        document.getElementById(pageId);

    if (page) {

        page.classList.add("active-page");
    }

    const activeTab =
        document.querySelector(
            `[data-tab="${pageId}"]`
        );

  if (activeTab) {

        activeTab.classList.add("active");
    }

    if (
        pageId === "roomMasterPage" &&
        typeof applyRoomMasterLock === "function"
    ) {

        applyRoomMasterLock();
    }
}


/* =====================================================
   SETTINGS DISPLAY
===================================================== */

function loadSettingsToScreen() {

    const hotelNameInput =
        document.getElementById(
            "settingHotelName"
        );

    const footerInput =
        document.getElementById(
            "settingFooterText"
        );

    if (hotelNameInput) {

        hotelNameInput.value =
            DB.settings.hotelName || "";
    }

   if (footerInput) {

        footerInput.value =
            DB.settings.footerText || "";
    }

    const roomModeInput =
        document.getElementById(
            "settingRoomNumbersOnly"
        );

    if (roomModeInput) {

        roomModeInput.checked =
            DB.settings.roomNumbersOnly !== false;
    }

    const restrictInput =
        document.getElementById(
            "settingRestrictRooms"
        );

    if (restrictInput) {

        restrictInput.checked =
            DB.settings.restrictRoomsToMaster !== false;
    }

    updateBranding();
}


/* =====================================================
   BRANDING
===================================================== */

function updateBranding() {

    const hotelTitle =
        document.getElementById("hotelTitle");

    const footer =
        document.getElementById("footerText");

    if (hotelTitle) {

        hotelTitle.textContent =
            DB.settings.hotelName ||
            "Hotel Group Operations Suite";
    }

 if (footer) {

        footer.textContent =
            DB.settings.footerText || "";
    }

    if (typeof renderAppVersion === "function") {

        renderAppVersion();
    }
}

/* =====================================================
   SAVE SETTINGS
===================================================== */

function saveSettings() {

    const hotelNameInput =
        document.getElementById(
            "settingHotelName"
        );

    const footerInput =
        document.getElementById(
            "settingFooterText"
        );

    DB.settings.hotelName =
        hotelNameInput?.value || "";

    DB.settings.footerText =
        footerInput?.value || "";

    DB.settings.roomNumbersOnly =
        document.getElementById(
            "settingRoomNumbersOnly"
        )?.checked !== false;

    saveDatabase();

    updateBranding();

   showAlert("Settings saved.");
}


/* =====================================================
   LOGO UPLOAD
===================================================== */

function handleLogoUpload(file) {

    const reader = new FileReader();

    reader.onload = function (event) {

        DB.settings.logo =
            event.target.result;

        saveDatabase();

        restoreLogo();

    };

    reader.readAsDataURL(file);
}


/* =====================================================
   RESTORE LOGO
===================================================== */

function restoreLogo() {

    const logo =
        document.getElementById(
            "hotelLogoPreview"
        );

    if (logo && DB.settings.logo) {

        logo.src =
            DB.settings.logo;

        logo.style.display = "block";
    }
}


/* =====================================================
   SETTINGS CONTROLLER
===================================================== */

function refreshApplicationSettings() {

    loadSettingsToScreen();

    restoreLogo();

    updateDateTime();

}

/* =====================================================
   MEAL ANALYTICS
===================================================== */

function showMealAnalytics() {

    const rows = getRegisterRows();

    let EP = 0;
    let CP = 0;
    let MAP = 0;
    let AP = 0;

    rows.forEach(row => {

        switch (row.meal) {

            case "EP":
                EP += row.pax;
                break;

            case "CP":
                CP += row.pax;
                break;

            case "MAP":
                MAP += row.pax;
                break;

            case "AP":
                AP += row.pax;
                break;
        }

    });

 showAlert(
`EP   ${EP}
CP   ${CP}
MAP  ${MAP}
AP   ${AP}`,
        "Meal Covers"
    );
}


/* =====================================================
   PROFESSIONAL TOOLS
===================================================== */

function initializeProfessionalTools() {

    window.hotelTools = {

        validate:      showValidationReport,

        autoRooms:     autoGenerateRoomSeries,

        search:        searchGroups,

        archive:       archiveCurrentGroup,

        backup:        backupDatabase,

        mealAnalytics: showMealAnalytics
    };

    console.log("Hotel Professional Tools Ready");
}
/* =====================================================
   COLLAPSIBLE PANELS
===================================================== */

function togglePanel(panelId, buttonId, labelWhenOpen, labelWhenShut) {

    const panel =
        document.getElementById(panelId);

    const button =
        document.getElementById(buttonId);

    if (!panel) return;

    const isOpen =
        panel.classList.toggle("panel-open");

    if (button) {

        button.textContent =
            isOpen ? labelWhenOpen : labelWhenShut;

        button.classList.toggle("toggle-on", isOpen);
    }
}


function toggleNotes() {

    togglePanel(
        "notesPanel",
        "btnToggleNotes",
        "▴ Hide Notes",
        "▾ Notes"
    );
}


function toggleBulkImport() {

    togglePanel(
        "bulkImportPanel",
        "btnToggleBulkImport",
        "▴ Hide Bulk Import",
        "▾ Bulk Import"
    );
}
/* =====================================================
   PRINT EVENTS
===================================================== */

function initializePrintEvents() {

    document
        .getElementById("btnPrintRegister")
        ?.addEventListener("click", printRegister);

    document
        .getElementById("btnPrintBlank")
        ?.addEventListener("click", printBlankRegister);

    document
        .getElementById("btnPrintRoomingList")
        ?.addEventListener("click", printRoomingList);

    document
        .getElementById("btnExportRoomingList")
        ?.addEventListener("click", exportCSV);
}


/* =====================================================
   SETTINGS EVENTS
===================================================== */

function initializeSettingsEvents() {

    document
        .getElementById("btnSaveSettings")
        ?.addEventListener("click", saveSettings);

    document
        .getElementById("settingHotelLogo")
        ?.addEventListener("change", function (event) {

            if (event.target.files[0]) {

                handleLogoUpload(event.target.files[0]);
            }

        });

    /* ---------- Room Mode Applies Immediately ---------- */

 document
        .getElementById("settingRoomNumbersOnly")
        ?.addEventListener("change", function () {

            DB.settings.roomNumbersOnly = this.checked;

            saveDatabase();

            refreshRegisterViews();

        });

    document
        .getElementById("settingRestrictRooms")
        ?.addEventListener("change", function () {

            DB.settings.restrictRoomsToMaster = this.checked;

            saveDatabase();

            refreshRegisterViews();

        });
}


/* =====================================================
   APPLICATION REFRESH
===================================================== */

function refreshApplication() {

    refreshApplicationSettings();

    refreshEntireDashboard();

    refreshRegisterViews();

    if (typeof renderRoomMaster === "function") {

        renderRoomMaster();
    }

}


/* =====================================================
   APPLICATION SAVE
===================================================== */

function saveApplication() {

    saveCurrentGroup();

}


/* =====================================================
   APPLICATION BOOTSTRAP
===================================================== */

function initializeApplication() {

    /* ---------- Dialogs ---------- */

    initializeDialogs();

    /* ---------- Settings & Branding ---------- */

    refreshApplicationSettings();

    /* ---------- Navigation ---------- */

    initializeNavigation();

    /* ---------- Event Bindings ---------- */

    initializeRegisterEvents();

 if (typeof initializeRegisterSearch === "function") {

        initializeRegisterSearch();
    }

   if (typeof initializeRestoreBar === "function") {

        initializeRestoreBar();
    }

   if (typeof initializeBulkMealPlan === "function") {

        initializeBulkMealPlan();
    }

    enforceArrivalDateFloor();

    if (typeof initializeGroupEvents === "function") {

        initializeGroupEvents();
    }

    initializePrintEvents();

  initializeSettingsEvents();

   /* ---------- Room Master ---------- */

    initializeRoomMaster();

    /* ---------- Reports ---------- */

   initializeReports();

    if (typeof initializeReportPrinting === "function") {

        initializeReportPrinting();
    }

    if (typeof initializeReportPrinting === "function") {

        initializeReportPrinting();
    }
    /* ---------- Professional Tools ---------- */

    initializeProfessionalTools();

    /* ---------- Restore Work In Progress ---------- */

    restoreDraft();

    /* ---------- Timers ---------- */

    setInterval(updateDateTime, 1000);

    setInterval(autoSaveCurrentWork, 15000);

    /* ---------- Full Refresh ---------- */

    refreshApplication();

    if (typeof initializeShortcuts === "function") {

        initializeShortcuts();
    }

    console.log(
        "Hotel Group Operations Suite Initialized"
    );

}


/* =====================================================
   APPLICATION LAUNCH
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    initializeApplication
);
registerModuleVersion("app.js", "1.0.0");
/* =====================================================
   ARRIVAL DATE — NO PAST DATES

   A group cannot arrive in the past. The field's native
   min= attribute blocks the calendar picker; the change
   listener catches typed or pasted dates the picker
   can't prevent.
===================================================== */

function enforceArrivalDateFloor() {

    const input =
        document.getElementById("arrivalDate");

    if (!input) return;

    const today =
        typeof getTodayString === "function"
            ? getTodayString()
            : new Date().toISOString().slice(0, 10);

    input.min = today;

    input.addEventListener("change", async function () {

        if (this.value && this.value < today) {

            await showAlert(
                "Arrival date cannot be in the past.\n\n" +
                "It has been reset to today.",
                "Invalid Date"
            );

            this.value = today;

            if (typeof scheduleAutoSave === "function") {

                scheduleAutoSave();
            }
        }

    });
}