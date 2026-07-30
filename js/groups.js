/* =====================================================
   HOTEL GROUP OPERATIONS SUITE
   File    : js/groups.js
   Version : 1.0.0 RC1

   GROUP LIFECYCLE

   Owns:
       getCurrentGroupData / loadGroupToScreen
       save, open, delete, group selector, search, archive
       JSON export and import
       CSV export
       bulk import
       database backup and restore
       autosave and the unsaved-draft banner
       group event bindings

   Depends at runtime on:
       database.js     DB, GroupRepository, saveDatabase,
                       nowISO, SCHEMA_VERSION
       register.js     getRegisterRows, loadRegisterRows,
                       getRegisterBody, createRowHTML,
                       refreshRegisterViews, getInvalidRooms,
                       isEmptyRegisterRow,
                       confirmRegisterReplace
       dashboard.js    updateDashboardFromRegister
       dialog.js       showAlert, showConfirm, showPrompt
       app.js          refreshApplication, switchPage,
                       getTodayString

   Save is HARD BLOCKED by getInvalidRooms(). Rooms not in
   the Room Master, duplicate rooms and over-capacity rows
   all prevent a save rather than warning about it.

   Load AFTER register.js and dashboard.js,
   BEFORE app.js.
===================================================== */


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

async function processBulkImport() {

    const text =
        document.getElementById(
            "bulkImportText"
        )?.value;

    if (!text || !text.trim()) {

        showAlert(
            "Paste some rows before importing.",
            "Nothing To Import"
        );

        return;
    }

    const body = getRegisterBody();

    if (!body) return;

    if (typeof confirmRegisterReplace === "function") {

        const proceed =
            await confirmRegisterReplace("Bulk Import");

        if (!proceed) return;
    }

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

    if (typeof updateDashboardFromRegister === "function") {

        updateDashboardFromRegister();
    }
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