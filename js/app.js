/* =====================================================
   HOTEL GROUP OPERATIONS SUITE
   File    : js/app.js
   Version : 1.0.0 RC1
   Project : Group Arrival Register
   Author  : Vikram Ameta

   LOAD ORDER
       dialog.js
       database.js     <- owns DB and GroupRepository
       printing.js
       room-master.js
       reports.js
       app.js          <- this file
       shortcuts.js
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
   COLLECT CURRENT GROUP
===================================================== */

function getCurrentGroupData() {

    return {

        id: generateId(),

        status:
            document.getElementById(
                "groupStatus"
            )?.value || "Pending",

        groupName:
            document.getElementById(
                "groupName"
            )?.value.trim() || "",

        arrivalDate:
            document.getElementById(
                "arrivalDate"
            )?.value || "",

        agent:
            document.getElementById(
                "agentCompany"
            )?.value || "",

        preparedBy:
            document.getElementById(
                "preparedBy"
            )?.value || "",

        notes:
            document.getElementById(
                "groupNotes"
            )?.value || "",

        totalRooms:
            Number(
                document.getElementById(
                    "summaryRooms"
                )?.textContent || 0
            ),

        totalPax:
            Number(
                document.getElementById(
                    "summaryPax"
                )?.textContent || 0
            ),

        rooms: getRegisterRows()
    };
}


/* =====================================================
   LOAD GROUP TO SCREEN
===================================================== */

function loadGroupToScreen(group) {

    if (!group) return;

    const fields = {

        groupStatus:  group.status       || "Pending",
        groupName:    group.groupName    || "",
        arrivalDate:  group.arrivalDate  || "",
        agentCompany: group.agent        || "",
        preparedBy:   group.preparedBy   || "",
        groupNotes:   group.notes        || ""

    };

    Object.entries(fields).forEach(([id, value]) => {

        const element =
            document.getElementById(id);

        if (element) {

            element.value = value;
        }

    });

    loadRegisterRows(group.rooms || []);

    updateDashboardFromRegister();
}


/* =====================================================
   SAVE CURRENT GROUP
===================================================== */

async function saveCurrentGroup() {

    const group = getCurrentGroupData();

    if (!group.groupName) {

        await showAlert(
            "Enter a group name before saving.",
            "Group Name Required"
        );

        return;
    }

    /* ---------- Hard Block ---------- */

    const problems = getInvalidRooms();

    if (problems.length > 0) {

        await showAlert(
            "Fix these before saving:\n\n" +
            problems.slice(0, 10).join("\n") +
            (problems.length > 10
                ? "\n\nand " + (problems.length - 10) + " more"
                : "")
        );

        return;
    }

   const now = nowISO();

    const existing =
        GroupRepository
        .getAll()
        .findIndex(
            g => g.groupName === group.groupName
        );

    if (existing >= 0) {

        const previous =
            GroupRepository.get(existing);

        group.id =
            previous.id || group.id;

        group.createdOn =
            previous.createdOn || now;

        group.modifiedOn = now;

        GroupRepository.update(existing, group);

    } else {

        group.createdOn = now;

        group.modifiedOn = now;

        GroupRepository.add(group);
    }

    refreshApplication();

    showAlert(
        "'" + group.groupName + "' has been saved.",
        "Group Saved"
    );
}/* =====================================================
   OPEN SAVED GROUP
===================================================== */

function openSavedGroup(index) {

    const group = GroupRepository.get(index);

    if (!group) {

        showAlert("Group not found.");

        return;
    }

    loadGroupToScreen(group);

    switchPage("arrivalPage");
}


/* =====================================================
   DELETE SAVED GROUP
===================================================== */

async function deleteSavedGroup(index) {

    const group = GroupRepository.get(index);

    if (!group) {

        await showAlert("Group not found.");

        return;
    }

    const ok = await showConfirm(
        "Delete '" +
        (group.groupName || "Unnamed Group") +
        "' permanently?\n\n" +
        "This cannot be undone.",
        "Delete Group",
        { danger: true, okLabel: "Delete" }
    );

    if (!ok) return;

    GroupRepository.remove(index);

    refreshApplication();
}

/* =====================================================
   GROUP SELECTOR
===================================================== */

async function openGroupSelector() {

    if (GroupRepository.count() === 0) {

        await showAlert(
            "There are no saved groups yet.",
            "Nothing To Open"
        );

        return;
    }

    let listText = "";

    GroupRepository
        .getAll()
        .forEach((group, index) => {

            listText +=
                (index + 1) + ". " +
                (group.groupName || "Unnamed Group") +
                "\n";

        });

    const selected = await showPrompt(
        listText + "\nEnter a number:",
        "",
        "Open Saved Group",
        { inputType: "number" }
    );

    if (selected === null) return;

    const index = Number(selected) - 1;

    if (
        isNaN(index) ||
        index < 0 ||
        index >= GroupRepository.count()
    ) {

        await showAlert("That is not a valid number.");

        return;
    }

    openSavedGroup(index);
}

/* =====================================================
   SEARCH GROUPS
===================================================== */

async function searchGroups() {

    const search = await showPrompt(
        "Type part of a group name.",
        "",
        "Search Groups"
    );

    if (search === null || !search.trim()) return;

    const results =
        GroupRepository
        .getAll()
        .filter(group =>
            (group.groupName || "")
            .toLowerCase()
            .includes(search.toLowerCase())
        );

    if (results.length === 0) {

        await showAlert(
            "No group matched '" + search + "'.",
            "No Matches"
        );

        return;
    }

    let text = "";

    results.forEach(group => {

        text +=
            (group.groupName || "") +
            "  —  " +
            (group.arrivalDate || "no date") +
            "\n";

    });

    await showAlert(
        text.trim(),
        results.length + " Match(es)"
    );
}

/* =====================================================
   ARCHIVE GROUP
===================================================== */

function archiveCurrentGroup() {

    const group = getCurrentGroupData();

    if (!DB.archive) {

        DB.archive = [];
    }

    DB.archive.push(group);

    saveDatabase();

    showAlert("Group copied to the archive.", "Archived");
}


/* =====================================================
   EXPORT JSON
===================================================== */

function exportGroupJSON() {

    const duplicates = checkDuplicateRooms();

    if (duplicates.length > 0) {

       showAlert(
            "These rooms appear more than once:\n\n" +
            duplicates.join(", "),
            "Duplicate Rooms"
        );

        return;
    }

   const group = getCurrentGroupData();

    group.schemaVersion = SCHEMA_VERSION;

    group.exportedAt = nowISO();

    const blob =
        new Blob(
            [JSON.stringify(group, null, 2)],
            { type: "application/json" }
        );

    const safeDate =
        group.arrivalDate || getTodayString();

    const link =
        document.createElement("a");

    link.href =
        URL.createObjectURL(blob);

    link.download =
        (group.groupName || "Group") +
        "_" +
        safeDate +
        ".json";

    link.click();

    URL.revokeObjectURL(link.href);
}


/* =====================================================
   IMPORT GROUP JSON
===================================================== */

function importGroupJSON(file) {

    const reader = new FileReader();

    reader.onload = function (event) {

        try {

            loadGroupToScreen(
                JSON.parse(event.target.result)
            );

            switchPage("arrivalPage");

        } catch (error) {

            console.error(error);

            showAlert("That file could not be read as a group.", "Invalid File");
        }
    };

    reader.readAsText(file);
}


/* =====================================================
   BULK IMPORT
===================================================== */

function processBulkImport() {

    const text =
        document.getElementById(
            "bulkImportText"
        )?.value;

    if (!text || !text.trim()) {

        showAlert("Paste some rows before importing.", "Nothing To Import");

        return;
    }

    const body = getRegisterBody();

    if (!body) return;

    body.innerHTML = "";

    text
        .trim()
        .split("\n")
        .forEach((line, index) => {

            const parts = line.split(",");

            body.insertAdjacentHTML(

                "beforeend",

                createRowHTML(

                    index + 1,

                    parts[0]?.trim() || "",

                    parts[1]?.trim() || "",

                    parts[2]?.trim() || 1,

                    (parts[3]?.trim() || "EP")
                    .toUpperCase()
                )
            );

        });

    refreshRegisterViews();

    updateDashboardFromRegister();
}


/* =====================================================
   EXPORT CSV
===================================================== */

function exportCSV() {

    const rows = getRegisterRows();

    let csv =
        "Room No,Guest Name,Pax,Meal Plan,Mobile No,VIP,Special Request\n";

    rows.forEach(row => {

        csv +=
            `"${row.roomNo || ""}",` +
            `"${row.guestName || ""}",` +
            `"${row.pax || 0}",` +
            `"${row.meal || ""}",` +
            `"${row.mobile || ""}",` +
            `"${row.vip ? "YES" : ""}",` +
            `"${row.specialRequest || ""}"\n`;

    });

    const blob =
        new Blob([csv], { type: "text/csv" });

    const link =
        document.createElement("a");

    link.href =
        URL.createObjectURL(blob);

    link.download =
        (
            document.getElementById(
                "groupName"
            )?.value || "Group"
        ) + "_RoomingList.csv";

    link.click();

    URL.revokeObjectURL(link.href);
}


/* =====================================================
   BACKUP DATABASE
===================================================== */

function backupDatabase() {

    const blob =
        new Blob(
            [JSON.stringify(DB, null, 2)],
            { type: "application/json" }
        );

    const link =
        document.createElement("a");

    link.href =
        URL.createObjectURL(blob);

    link.download =
        "hotel_database_backup_" +
        getTodayString() +
        ".json";

    link.click();

    URL.revokeObjectURL(link.href);
}


/* =====================================================
   RESTORE DATABASE
===================================================== */

function restoreDatabase(file) {

    const reader = new FileReader();

    reader.onload = function (event) {

        try {

            DB = JSON.parse(event.target.result);

            if (!Array.isArray(DB.groups)) {

                DB.groups = [];
            }

            if (!DB.settings) {

                DB.settings =
                    structuredClone(DEFAULT_DB.settings);
            }

            saveDatabase();

            refreshApplication();

            showAlert("Backup restored successfully.", "Restore Complete");

        } catch (error) {

            console.error(error);

            showAlert("That file is not a valid backup.", "Restore Failed");
        }
    };

    reader.readAsText(file);
}


/* =====================================================
   AUTOSAVE
===================================================== */
let autoSaveTimer = null;

function scheduleAutoSave() {

    clearTimeout(autoSaveTimer);

    autoSaveTimer =
        setTimeout(autoSaveCurrentWork, 800);

}

function autoSaveCurrentWork() {

    const draft = {

        schema: 2,

        status:
            document.getElementById(
                "groupStatus"
            )?.value || "Pending",

        groupName:
            document.getElementById(
                "groupName"
            )?.value || "",

        arrivalDate:
            document.getElementById(
                "arrivalDate"
            )?.value || "",

        agent:
            document.getElementById(
                "agentCompany"
            )?.value || "",

        preparedBy:
            document.getElementById(
                "preparedBy"
            )?.value || "",

        notes:
            document.getElementById(
                "groupNotes"
            )?.value || "",

        rooms: getRegisterRows()
    };

    localStorage.setItem(
        "GROUP_DRAFT",
        JSON.stringify(draft)
    );
}


/* =====================================================
   RESTORE DRAFT
===================================================== */

function restoreDraft() {

    const raw =
        localStorage.getItem("GROUP_DRAFT");

    if (!raw) return;

    try {

        const draft = JSON.parse(raw);

        /* Discard drafts written under an older layout */

        if (draft.schema !== 2) {

            localStorage.removeItem("GROUP_DRAFT");

            return;
        }

        const hasContent =
            (draft.groupName || "").trim() !== "" ||
            (draft.rooms || []).length > 0;

        if (!hasContent) return;

        loadGroupToScreen(draft);

        toggleDraftBanner(true);

    } catch (error) {

        console.error(error);
    }
}


/* =====================================================
   DRAFT BANNER
===================================================== */

function toggleDraftBanner(show) {

    const banner =
        document.getElementById("draftBanner");

    if (banner) {

        banner.style.display =
            show ? "flex" : "none";
    }
}

function keepDraft() {

    toggleDraftBanner(false);

}

function discardDraft() {

    localStorage.removeItem("GROUP_DRAFT");

    clearRegisterFields();

    toggleDraftBanner(false);

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
   GROUP EVENTS
===================================================== */

function initializeGroupEvents() {

    document
        .getElementById("btnSaveGroup")
        ?.addEventListener("click", saveCurrentGroup);

    document
        .getElementById("btnExportJson")
        ?.addEventListener("click", exportGroupJSON);

    document
        .getElementById("btnOpenGroup")
        ?.addEventListener("click", function () {

            document
                .getElementById("openGroupFile")
                ?.click();

        });

    document
        .getElementById("openGroupFile")
        ?.addEventListener("change", function (event) {

            if (event.target.files[0]) {

                importGroupJSON(event.target.files[0]);
            }

            event.target.value = "";

        });

 document
        .getElementById("groupSearch")
        ?.addEventListener("input", renderSavedGroups);

    /* ---------- Autosave Group Header Fields ---------- */

    [
        "groupStatus",
        "groupName",
        "arrivalDate",
        "agentCompany",
        "preparedBy",
        "groupNotes"
    ]
    .forEach(id => {

        const el = document.getElementById(id);

        if (!el) return;

        el.addEventListener("input", scheduleAutoSave);

        el.addEventListener("change", scheduleAutoSave);

    });
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

    initializeGroupEvents();

    initializePrintEvents();

  initializeSettingsEvents();

   /* ---------- Room Master ---------- */

    initializeRoomMaster();

    /* ---------- Reports ---------- */

    initializeReports();
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