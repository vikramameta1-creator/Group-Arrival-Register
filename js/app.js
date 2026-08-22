// @ts-nocheck
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

    /* Floating actions only make sense where a group is
       actually being worked on. Showing it everywhere -
       Settings, Dashboard, Reports - saved nothing
       meaningful there and just added visual noise. */

    const floatingPanel =
        document.getElementById("floatingActionPanel");

    if (floatingPanel) {

        const showOnThisPage =
            pageId === "arrivalPage" ||
            pageId === "registerToolsPage";

        /* CSS default is display:none - "" would just
           fall back to that default and never actually
           show the panel, so this needs an explicit
           value to override it. flex, not inline-block,
           since the panel arranges three buttons in a row. */

        floatingPanel.style.display =
            showOnThisPage ? "flex" : "none";

        if (showOnThisPage) {

            updateFloatingSavePosition();
        }
    }

    if (
        pageId === "registerToolsPage" &&
        typeof renderAttachmentsPanel === "function"
    ) {

        renderAttachmentsPanel();
    }
}


/* =====================================================
   FLOATING SAVE - COLLISION AVOIDANCE

   A fixed-position button can't know where page content
   ends up on its own - that depends on how tall the table
   is, the viewport height, and scroll position, none of
   which are knowable from CSS alone. Padding-based
   spacing only helps once the user scrolls past it; it
   does nothing for the resting, un-scrolled view, which
   is exactly the case that was still broken. This checks
   the button's real screen position against the summary
   cards every time either could have changed, and lifts
   the button clear if they'd actually overlap - correct
   regardless of table length or viewport size, rather
   than a guessed spacing value tuned to one screenshot.
===================================================== */

function updateFloatingSavePosition() {

    const floatingPanel =
        document.getElementById("floatingActionPanel");

    if (
        !floatingPanel ||
        floatingPanel.style.display === "none"
    ) {

        return;
    }

    const activePage =
        document.querySelector(".page.active-page");

    const summaryGrid =
        activePage?.querySelector(".summary-grid");

    if (!summaryGrid) {

        floatingPanel.classList.remove(
            "floating-action-panel-lifted"
        );

        return;
    }

    const gridRect =
        summaryGrid.getBoundingClientRect();

    const viewportHeight =
        window.innerHeight;

    /* The panel's own resting footprint - roughly its
       height plus the 24px it sits off the bottom edge,
       plus a small safety margin. Anything from the cards
       poking into this zone counts as a collision. */

    const dangerZoneTop = viewportHeight - 90;

    const collides =
        gridRect.bottom > dangerZoneTop &&
        gridRect.top < viewportHeight;

    floatingPanel.classList.toggle(
        "floating-action-panel-lifted",
        collides
    );
}

window.addEventListener(
    "scroll",
    updateFloatingSavePosition,
    { passive: true }
);

window.addEventListener(
    "resize",
    updateFloatingSavePosition
);


/* =====================================================
   FLOATING ACTION PANEL - PRINT / ATTACHMENTS SHORTCUTS

   Save reuses the existing btnSaveGroup wiring in
   groups.js untouched. These two are new: quick access to
   the two other things Register Tools holds, without
   requiring the tab to be found and clicked first.
===================================================== */

function initializeFloatingActionPanel() {

    document
        .getElementById("floatingPrintBtn")
        ?.addEventListener("click", function () {

            if (typeof printRegister === "function") {

                printRegister();
            }

        });

    document
        .getElementById("floatingAttachBtn")
        ?.addEventListener("click", function () {

            if (typeof switchPage === "function") {

                switchPage("registerToolsPage");
            }

            const panel =
                document.querySelector(".attachments-panel");

            if (panel) {

                panel.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            }

        });
}

document.addEventListener(
    "DOMContentLoaded",
    initializeFloatingActionPanel
);


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

    const overlapInput =
        document.getElementById(
            "settingPreventOverlap"
        );

    if (overlapInput) {

        overlapInput.checked =
            DB.settings.preventCrossGroupOverlap !== false;
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

    document
        .getElementById("settingPreventOverlap")
        ?.addEventListener("change", function () {

            DB.settings.preventCrossGroupOverlap =
                this.checked;

            saveDatabase();

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

    initializeDepartureDateSync();

    initializeStatusReversalGuard();

    if (typeof applyAutomaticStatusTransitions === "function") {

        applyAutomaticStatusTransitions();
    }

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

        /* Arrival changed - departure must stay after it,
           and the night count follows along. */

        syncDepartureFromNights();

    });
}


/* =====================================================
   DEPARTURE DATE / NIGHTS

   Nights is the primary input in most workflows - type a
   number, Departure Date fills itself in. Departure Date
   can also be picked directly, which recalculates Nights
   the other way. Tab from Arrival Date jumps straight
   into Departure Date, skipping Nights, since typing a
   number and picking a date are two routes to the same
   value.

   Departure must be strictly AFTER arrival - hard
   blocked, same pattern as every other validation rule
   in this app. Same-day checkout is not offered; if that
   is ever needed it is a small change to loosen, not a
   hard one, and loosening later is safer than tightening
   a rule after real data exists under it.
===================================================== */

function getNightsInput() {

    return document.getElementById("groupNights");
}

function getDepartureInput() {

    return document.getElementById("departureDate");
}


function syncDepartureFromNights() {

    const arrivalInput =
        document.getElementById("arrivalDate");

    const nightsInput = getNightsInput();

    const departureInput = getDepartureInput();

    if (!arrivalInput || !nightsInput || !departureInput) {

        return;
    }

    const arrival = arrivalInput.value;

    if (!arrival) return;

    let nights = Number(nightsInput.value);

    if (!nights || nights < 1) {

        nights = 1;

        nightsInput.value = 1;
    }

    if (
        typeof addDaysToDate === "function"
    ) {

        departureInput.value =
            addDaysToDate(arrival, nights);
    }

    departureInput.min =
        typeof addDaysToDate === "function"
            ? addDaysToDate(arrival, 1)
            : arrival;
}


async function syncNightsFromDeparture() {

    const arrivalInput =
        document.getElementById("arrivalDate");

    const nightsInput = getNightsInput();

    const departureInput = getDepartureInput();

    if (!arrivalInput || !nightsInput || !departureInput) {

        return;
    }

    const arrival = arrivalInput.value;

    const departure = departureInput.value;

    if (!arrival || !departure) return;

    if (departure <= arrival) {

        await showAlert(
            "Departure date must be after the arrival " +
            "date.\n\n" +
            "It has been reset.",
            "Invalid Departure Date"
        );

        syncDepartureFromNights();

        return;
    }

    if (typeof computeNightsBetween === "function") {

        nightsInput.value =
            computeNightsBetween(arrival, departure) || 1;
    }
}


function initializeDepartureDateSync() {

    const arrivalInput =
        document.getElementById("arrivalDate");

    const nightsInput = getNightsInput();

    const departureInput = getDepartureInput();

    if (!arrivalInput || !nightsInput || !departureInput) {

        return;
    }

    /* Tab from Arrival Date lands directly in Departure
       Date, skipping Nights. */

    arrivalInput.addEventListener("keydown", function (event) {

        if (event.key === "Tab" && !event.shiftKey) {

            event.preventDefault();

            departureInput.focus();
        }

    });

    nightsInput.addEventListener("input", function () {

        syncDepartureFromNights();

        if (typeof scheduleAutoSave === "function") {

            scheduleAutoSave();
        }

    });

    departureInput.addEventListener("change", function () {

        syncNightsFromDeparture();

        if (typeof scheduleAutoSave === "function") {

            scheduleAutoSave();
        }

    });

    /* Seed a sensible default the first time the page
       loads with an arrival date already set but no
       departure date yet (e.g. reopening an old draft). */

    if (arrivalInput.value && !departureInput.value) {

        nightsInput.value = nightsInput.value || 1;

        syncDepartureFromNights();
    }
}




/* =====================================================
   STATUS REVERSAL GUARD

   Two protected states, same Manager PIN mechanism
   (one PIN for both, deliberately, for now - the
   developer has flagged a future need for separate
   authorization levels, logged for v1.1, not built yet).

   No Show:      PIN required only when it was AUTO-set.
                 A status the receptionist picked
                 themselves never needs protection to
                 change again.

   Checked Out:  PIN required ALWAYS, auto-set or
                 manual - reversing a completed checkout
                 is a real correction, not something that
                 should be one accidental dropdown click.
===================================================== */

function initializeStatusReversalGuard() {

    const statusInput =
        document.getElementById("groupStatus");

    if (!statusInput) return;

    let previousValue = statusInput.value;

    async function requirePin(promptMessage, revertTo) {

        const pinIsSet =
            typeof hasRoomMasterPin === "function" &&
            hasRoomMasterPin();

        if (!pinIsSet) {

            await showAlert(
                promptMessage +
                "\n\nNo Manager PIN is set, so this " +
                "cannot be verified - set one in " +
                "Settings first.",
                "Cannot Change Status"
            );

            return false;
        }

        const entered = await showPrompt(
            promptMessage +
            "\n\nEnter the Manager PIN to change it.",
            "",
            "Manager PIN Required",
            {
                inputType: "password",
                maxLength: 4,
                placeholder: "0000"
            }
        );

        if (
            entered === null ||
            typeof hashPin !== "function" ||
            hashPin(entered.trim()) !==
                DB.settings.roomMasterPinHash
        ) {

            if (entered !== null) {

                await showAlert("Incorrect PIN.");
            }

            return false;
        }

        return true;
    }

    /* =====================================================
       OFFER DATE UPDATE AFTER A NO SHOW REVERSAL

       Runs only after a successful PIN-gated reversal of an
       AUTO-set No Show. Offers to update the Arrival Date;
       Nights and Departure Date follow automatically through
       the same change listener that already governs manual
       edits (enforceArrivalDateFloor -> syncDepartureFromNights,
       both above in this file), so no new validation logic is
       added here. Cross-group conflict checking still happens
       later, exactly as normal, the moment the receptionist
       hits Save (see saveCurrentGroup in groups.js).
    ===================================================== */

    async function offerDateUpdateAfterReversal() {

        const wantsUpdate = await showConfirm(
            "No Show status has been reversed.\n\n" +
            "This group's arrival date may be outdated. " +
            "Update it now?",
            "Update Arrival Date?",
            {
                okLabel:     "Update Date",
                cancelLabel: "Not Now"
            }
        );

        if (!wantsUpdate) return;

        const arrivalInput =
            document.getElementById("arrivalDate");

        if (!arrivalInput) return;

        const today =
            typeof getTodayString === "function"
                ? getTodayString()
                : new Date().toISOString().slice(0, 10);

        const entered = await showPrompt(
            "Nights and Departure Date will update " +
            "automatically based on the current Nights " +
            "value.",
            arrivalInput.value || today,
            "New Arrival Date",
            { inputType: "date" }
        );

        if (entered === null || entered === "") return;

        arrivalInput.value = entered;

        arrivalInput.dispatchEvent(new Event("change"));
    }

    statusInput.addEventListener("change", async function () {

        const wasAutoNoShow =
            previousValue === "No Show" &&
            typeof currentGroupNoShowFlag !== "undefined" &&
            currentGroupNoShowFlag;

        const wasCheckedOut =
            previousValue === "Checked Out";

        /* ---------- No Show, only if auto-set ---------- */

        if (
            wasAutoNoShow &&
            this.value !== "No Show"
        ) {

            const ok = await requirePin(
                "This group was automatically marked " +
                "No Show."
            );

            if (!ok) {

                this.value = "No Show";

                return;
            }

            if (typeof currentGroupNoShowFlag !== "undefined") {

                currentGroupNoShowFlag = false;
            }

            if (typeof recordAuditEntry === "function") {

                recordAuditEntry("NO_SHOW_REVERSED", {

                    group:     document.getElementById(
                                   "groupName"
                               )?.value || "",
                    newStatus: this.value

                });
            }

            await offerDateUpdateAfterReversal();

        /* ---------- Checked Out, always ---------- */

        } else if (
            wasCheckedOut &&
            this.value !== "Checked Out"
        ) {

            const ok = await requirePin(
                "This group is marked Checked Out."
            );

            if (!ok) {

                this.value = "Checked Out";

                return;
            }

            if (typeof recordAuditEntry === "function") {

                recordAuditEntry("CHECKED_OUT_REVERSED", {

                    group:     document.getElementById(
                                   "groupName"
                               )?.value || "",
                    newStatus: this.value

                });
            }
        }

        previousValue = this.value;

        if (typeof scheduleAutoSave === "function") {

            scheduleAutoSave();
        }

    });

}