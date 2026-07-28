/* =====================================================
   HOTEL GROUP OPERATIONS SUITE
   File    : js/app.js
   Version : 1.0.0 RC1
   Build   : 2026-07-27
   Project : Group Arrival Register
   Author  : Vikram Ameta

   NOTE
   Printing lives in js/printing.js
   This file must load AFTER printing.js
===================================================== */


/* =====================================================
   DATABASE
===================================================== */

const STORAGE_KEY = "hotel_group_operations_v5";

const DEFAULT_DB = {

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
    }
};

let DB = loadDatabase();


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

        return parsed;

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

    } catch (error) {

        console.error(
            "Database Save Error",
            error
        );

        alert(
            "Unable to save data. Storage may be full."
        );
    }
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

    alert("Settings Saved");
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
   REGISTER COLUMN MAP

   Every cells[n] reference in this file uses these
   names. If a column is ever added or moved, change
   the numbers here and nothing else breaks.
===================================================== */

const REGISTER_COLUMNS = {

    SR:       0,
    ROOM:     1,
    CATEGORY: 2,
    GUEST:    3,
    PAX:      4,
    MEAL:     5,
    MOBILE:   6,
    EXTRA:    7

};


/* =====================================================
   REGISTER ROW TEMPLATE
===================================================== */

function createRowHTML(
    sr,
    room = "",
    guest = "",
    pax = 1,
    meal = "",
    mobile = ""
) {

    return `
    <tr>

        <td>${sr}</td>

        <td contenteditable="true">${room}</td>

        <td class="roomCategory category-unmapped">—</td>

        <td contenteditable="true">${guest}</td>

        <td contenteditable="true">${pax}</td>

        <td>
            <select class="meal-plan">
              <option value=""    ${meal === ""    ? "selected" : ""}>Not Set</option>
                <option value="EP"  ${meal === "EP"  ? "selected" : ""}>EP</option>
                <option value="CP"  ${meal === "CP"  ? "selected" : ""}>CP</option>
                <option value="MAP" ${meal === "MAP" ? "selected" : ""}>MAP</option>
                <option value="AP"  ${meal === "AP"  ? "selected" : ""}>AP</option>
            </select>
        </td>

        <td contenteditable="true">${mobile}</td>

        <td>

            <label>

                <input
                    type="checkbox"
                    class="vipGuest">

                VIP

            </label>

            <br>

            <input
                type="text"
                class="specialRequest"
                maxlength="80"
                placeholder="Special Request"
                style="width:95%;margin-top:5px;">

        </td>

    </tr>
    `;
}


/* =====================================================
   REGISTER BODY
===================================================== */

function getRegisterBody() {

    return document.getElementById(
        "arrivalRegisterBody"
    );
}


/* =====================================================
   REGISTER DATA EXTRACTOR
===================================================== */

function getRegisterRows() {

    const body = getRegisterBody();

    if (!body) return [];

    const rows = [];

    [...body.rows].forEach(row => {

        const roomNo =
            row.cells[REGISTER_COLUMNS.ROOM]
            ?.innerText
            .trim() || "";

        rows.push({

            roomNo: roomNo,

            category:
                typeof getRoomCategory === "function"
                    ? getRoomCategory(roomNo)
                    : "",

            guestName:
                row.cells[REGISTER_COLUMNS.GUEST]
                ?.innerText
                .trim() || "",

            pax:
                Number(
                    row.cells[REGISTER_COLUMNS.PAX]
                    ?.innerText
                ) || 0,

            meal:
                row.querySelector(".meal-plan")
                ?.value
                ?.toUpperCase() || "",

            mobile:
                row.cells[REGISTER_COLUMNS.MOBILE]
                ?.innerText
                .trim() || "",

            vip:
                row.querySelector(".vipGuest")
                ?.checked || false,

            specialRequest:
                row.querySelector(".specialRequest")
                ?.value
                ?.trim() || ""

        });

    });

    return rows;
}

/* =====================================================
   LOAD REGISTER ROWS
===================================================== */

function loadRegisterRows(rows = []) {

    const body = getRegisterBody();

    if (!body) return;

    body.innerHTML = "";

    rows.forEach((row, index) => {

        body.insertAdjacentHTML(
            "beforeend",
            createRowHTML(
                index + 1,
                row.roomNo || "",
                row.guestName || "",
                row.pax || 1,
                row.meal || "",
                row.mobile || ""
            )
        );

        const currentRow = body.rows[index];

        if (!currentRow) return;

        const vip =
            currentRow.querySelector(".vipGuest");

        if (vip) {

            vip.checked = !!row.vip;
        }

        const request =
            currentRow.querySelector(".specialRequest");

        if (request) {

            request.value =
                row.specialRequest || "";
        }

    });

    refreshRegisterViews();
}


/* =====================================================
   GENERATE ROWS
===================================================== */

function generateRows() {

    const body = getRegisterBody();

    if (!body) return;

    const count =
        Number(
            document.getElementById(
                "roomCount"
            )?.value || 0
        );

    if (count <= 0) {

        alert("Enter number of rooms");

        return;
    }

    body.innerHTML = "";

    for (let i = 1; i <= count; i++) {

        body.insertAdjacentHTML(
            "beforeend",
            createRowHTML(i)
        );
    }

    refreshRegisterViews();
}


/* =====================================================
   ADD SINGLE ROW
===================================================== */

function addRow() {

    const body = getRegisterBody();

    if (!body) return;

    body.insertAdjacentHTML(
        "beforeend",
        createRowHTML(body.rows.length + 1)
    );

    refreshRegisterViews();
}


/* =====================================================
   RENUMBER SERIALS
===================================================== */

function renumberRows() {

    const body = getRegisterBody();

    if (!body) return;

    [...body.rows].forEach((row, index) => {

       row.cells[REGISTER_COLUMNS.SR].innerText = index + 1;

    });
}


/* =====================================================
   SORT ROOMS
===================================================== */

function sortRooms() {

    const body = getRegisterBody();

    if (!body) return;

    const rows = [...body.rows];

    rows.sort((a, b) => {

        const roomA =
            parseInt(
                a.cells[REGISTER_COLUMNS.ROOM]
                ?.innerText.trim()
            ) || 0;

        const roomB =
            parseInt(
                b.cells[REGISTER_COLUMNS.ROOM]
                ?.innerText.trim()
            ) || 0;

        return roomA - roomB;

    });

    rows.forEach(row => body.appendChild(row));

    renumberRows();

    refreshRegisterViews();
}


/* =====================================================
   AUTO ROOM SERIES
===================================================== */

function autoGenerateRoomSeries() {

    const startRoom =
        prompt("Starting Room Number");

    if (!startRoom) return;

    const body = getRegisterBody();

    if (!body) return;

    [...body.rows].forEach((row, index) => {

       row.cells[REGISTER_COLUMNS.ROOM].innerText =
            Number(startRoom) + index;

    });

    refreshRegisterViews();
}


/* =====================================================
   CLEAR REGISTER
===================================================== */

function clearRegisterFields() {

    const fields = [
        "groupName",
        "arrivalDate",
        "agentCompany",
        "preparedBy",
        "groupNotes"
    ];

    fields.forEach(id => {

        const el =
            document.getElementById(id);

        if (el) el.value = "";

    });

    const status =
        document.getElementById("groupStatus");

    if (status) status.value = "Pending";

    const body = getRegisterBody();

    if (body) body.innerHTML = "";

    refreshRegisterViews();
}


function clearRegister() {

    if (!confirm("Clear current register?")) {

        return;
    }

    clearRegisterFields();

    toggleDraftBanner(false);
}

/* =====================================================
   EMPTY ROW RULE

   A row counts only once something has been entered.
   Pax is ignored because new rows default to 1.
===================================================== */

function isEmptyRegisterRow(row) {

    return !(
        row.roomNo ||
        row.guestName ||
        row.mobile ||
        row.meal ||
        row.specialRequest ||
        row.vip
    );
}
/* =====================================================
   REGISTER SUMMARY
===================================================== */

function updateSummary() {

   const rows =
        getRegisterRows()
        .filter(row => !isEmptyRegisterRow(row));

    let totalPax = 0;

    let ep = 0;
    let cp = 0;
    let map = 0;
    let ap = 0;

    rows.forEach(row => {

        const pax = Number(row.pax) || 0;

        totalPax += pax;

        switch (row.meal) {

            case "EP":
                ep += pax;
                break;

            case "CP":
                cp += pax;
                break;

            case "MAP":
                map += pax;
                break;

            case "AP":
                ap += pax;
                break;
        }

    });

    setSummaryValue("summaryRooms", rows.length);
    setSummaryValue("summaryPax",   totalPax);
    setSummaryValue("summaryEP",    ep);
    setSummaryValue("summaryCP",    cp);
    setSummaryValue("summaryMAP",   map);
    setSummaryValue("summaryAP",    ap);
}

function setSummaryValue(id, value) {

    const el = document.getElementById(id);

    if (el) {

        el.textContent = value;
    }
}


/* =====================================================
   ROOMING LIST SYNC
===================================================== */

function syncRoomingList() {

    const roomingBody =
        document.getElementById(
            "roomingListBody"
        );

    if (!roomingBody) return;

    roomingBody.innerHTML = "";

    getRegisterRows()
    .filter(row => !isEmptyRegisterRow(row))
    .forEach(row => {

        roomingBody.insertAdjacentHTML(

            "beforeend",

            `
            <tr>

               <td>${row.roomNo}</td>

                <td>${row.category || "—"}</td>

                <td>${row.guestName}</td>

                <td>${row.pax}</td>

                <td>${row.meal || "—"}</td>

                <td>${row.mobile}</td>

                <td>${row.vip ? "YES" : ""}</td>

                <td>${row.specialRequest}</td>

            </tr>
            `
        );

    });
}

/* =====================================================
   REGISTER VIEW REFRESH
===================================================== */

function isRoomMasterEnforced() {

    if (DB.settings.restrictRoomsToMaster === false) {

        return false;
    }

    return (
        typeof roomMasterHasRooms === "function" &&
        roomMasterHasRooms()
    );
}


function getInvalidRooms() {

    if (!isRoomMasterEnforced()) return [];

    const bad = [];

    getRegisterRows().forEach(row => {

        if (
            row.roomNo &&
            typeof isRoomInMaster === "function" &&
            !isRoomInMaster(row.roomNo)
        ) {

            bad.push(row.roomNo);
        }

    });

    return [...new Set(bad)];
}


function updateRegisterCategories() {

    const body = getRegisterBody();

    if (!body) return;

    const enforce = isRoomMasterEnforced();

    [...body.rows].forEach(row => {

        const roomCell =
            row.cells[REGISTER_COLUMNS.ROOM];

        const categoryCell =
            row.cells[REGISTER_COLUMNS.CATEGORY];

        if (!roomCell || !categoryCell) return;

        const room =
            roomCell.innerText.trim();

        const category =
            typeof getRoomCategory === "function"
                ? getRoomCategory(room)
                : "";

        const invalid =
            enforce &&
            room !== "" &&
            typeof isRoomInMaster === "function" &&
            !isRoomInMaster(room);

        if (invalid) {

            categoryCell.textContent = "NOT IN MASTER";

            categoryCell.className =
                "roomCategory category-invalid";

            roomCell.classList.add("room-invalid");

            return;
        }

        categoryCell.textContent = category || "—";

        categoryCell.className =
            "roomCategory" +
            (category ? "" : " category-unmapped");

        roomCell.classList.remove("room-invalid");

    });
}


function refreshRegisterViews() {

    updateRegisterCategories();

    updateSummary();

    syncRoomingList();

    updateReports();

}
/* =====================================================
   ROOM VALIDATION
===================================================== */

function validateRooms() {

    const rows = getRegisterRows();

    const roomMap = {};
    const guestMap = {};

    const duplicateRooms = [];
    const duplicateGuests = [];

    rows.forEach(row => {

        const room =
            String(row.roomNo || "").trim();

        const guest =
            String(row.guestName || "")
            .trim()
            .toUpperCase();

        if (room) {

            if (roomMap[room]) {

                duplicateRooms.push(room);

            } else {

                roomMap[room] = true;
            }
        }

        if (guest) {

            if (guestMap[guest]) {

                duplicateGuests.push(guest);

            } else {

                guestMap[guest] = true;
            }
        }

    });

    return {

        duplicateRooms,

        duplicateGuests
    };
}


/* =====================================================
   DUPLICATE ROOM CHECK
===================================================== */

function checkDuplicateRooms() {

    return validateRooms().duplicateRooms;
}


/* =====================================================
   VALIDATION REPORT
===================================================== */

function showValidationReport() {

    const report = validateRooms();

    let text = "";

    if (report.duplicateRooms.length) {

        text +=
            "Duplicate Rooms:\n" +
            report.duplicateRooms.join(", ") +
            "\n\n";
    }

    if (report.duplicateGuests.length) {

        text +=
            "Duplicate Guests:\n" +
            report.duplicateGuests.join(", ") +
            "\n\n";
    }

    if (!text) {

        text = "No Duplicates Found";
    }

    alert(text);
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

function saveCurrentGroup() {

    const group = getCurrentGroupData();

    if (!group.groupName) {

        alert("Enter Group Name");

        return;
    }
/* ---------- Room Master Check ---------- */

    const invalidRooms = getInvalidRooms();

    if (invalidRooms.length > 0) {

        alert(
            "These rooms are not in the Room Master:\n\n" +
            invalidRooms.join(", ") +
            "\n\nAdd them under Room Master, or turn off\n" +
            "room checking in Settings → Register Rules."
        );

        return;
    }
    /* ---------- Duplicate Room Warning ---------- */

    const duplicates = checkDuplicateRooms();

    if (duplicates.length > 0) {

        const proceed = confirm(
            "Room number used more than once:\n\n" +
            duplicates.join(", ") +
            "\n\nThis is normal for shared rooms.\n" +
            "Save anyway?"
        );

        if (!proceed) return;
    }

    const now = new Date().toLocaleString();

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

    alert("Group Saved Successfully");
}


/* =====================================================
   OPEN SAVED GROUP
===================================================== */

function openSavedGroup(index) {

    const group = GroupRepository.get(index);

    if (!group) {

        alert("Group not found.");

        return;
    }

    loadGroupToScreen(group);

    switchPage("arrivalPage");
}


/* =====================================================
   DELETE SAVED GROUP
===================================================== */

function deleteSavedGroup(index) {

    const group = GroupRepository.get(index);

    if (!group) {

        alert("Group not found.");

        return;
    }

    const ok = confirm(
        "Delete '" +
        (group.groupName || "Unnamed Group") +
        "' permanently?"
    );

    if (!ok) return;

    GroupRepository.remove(index);

    refreshApplication();
}


/* =====================================================
   GROUP SELECTOR
===================================================== */

function openGroupSelector() {

    if (GroupRepository.count() === 0) {

        alert("No Saved Groups");

        return;
    }

    let listText = "Saved Groups:\n\n";

    GroupRepository
        .getAll()
        .forEach((group, index) => {

            listText +=
                (index + 1) +
                ". " +
                (group.groupName || "Unnamed Group") +
                "\n";

        });

    const selected =
        prompt(listText + "\nEnter Number");

    if (!selected) return;

    const index = Number(selected) - 1;

    if (
        isNaN(index) ||
        index < 0 ||
        index >= GroupRepository.count()
    ) {

        alert("Invalid Selection");

        return;
    }

    openSavedGroup(index);
}


/* =====================================================
   SEARCH GROUPS
===================================================== */

function searchGroups() {

    const search = prompt("Search Group");

    if (!search) return;

    const results =
        GroupRepository
        .getAll()
        .filter(group =>
            (group.groupName || "")
            .toLowerCase()
            .includes(search.toLowerCase())
        );

    if (results.length === 0) {

        alert("No Groups Found");

        return;
    }

    let text = "Matches:\n\n";

    results.forEach(group => {

        text += (group.groupName || "") + "\n";

    });

    alert(text);
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

    alert("Group Archived");
}


/* =====================================================
   EXPORT JSON
===================================================== */

function exportGroupJSON() {

    const duplicates = checkDuplicateRooms();

    if (duplicates.length > 0) {

        alert(
            "Duplicate Room Numbers Found:\n\n" +
            duplicates.join(", ")
        );

        return;
    }

    const group = getCurrentGroupData();

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

            alert("Invalid JSON File");
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

        alert("Nothing to import");

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

            alert("Database Restored");

        } catch (error) {

            console.error(error);

            alert("Invalid Backup");
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
   DASHBOARD
===================================================== */

function updateDashboard() {

    let totalRooms = 0;
    let totalPax = 0;

    let confirmed = 0;
    let checkedIn = 0;
    let cancelled = 0;

    let todayArrivals = 0;

    const today = getTodayString();

    DB.groups.forEach(group => {

        totalRooms +=
            Number(group.totalRooms || 0);

        totalPax +=
            Number(group.totalPax || 0);

        if (group.arrivalDate === today) {

            todayArrivals++;
        }

        switch ((group.status || "Pending").trim()) {

            case "Confirmed":
                confirmed++;
                break;

            case "Checked In":
                checkedIn++;
                break;

            case "Cancelled":
                cancelled++;
                break;
        }

    });

    setSummaryValue(
        "dashboardTotalGroups",
        DB.groups.length
    );

    setSummaryValue(
        "dashboardTotalRooms",
        totalRooms
    );

    setSummaryValue(
        "dashboardTotalPax",
        totalPax
    );

    setSummaryValue(
        "dashboardTodayArrivals",
        todayArrivals
    );

    setSummaryValue(
        "dashboardConfirmed",
        confirmed
    );

    setSummaryValue(
        "dashboardCheckedIn",
        checkedIn
    );

    setSummaryValue(
        "dashboardCancelled",
        cancelled
    );
}


/* =====================================================
   ARRIVAL CONTROL CENTER
===================================================== */

function updateArrivalControlCenter() {

    let pending = 0;
    let confirmed = 0;
    let checkedIn = 0;
    let cancelled = 0;

    let vipGuests = 0;
    let mealCovers = 0;
    let allocatedRooms = 0;

    DB.groups.forEach(group => {

        switch ((group.status || "Pending").trim()) {

            case "Pending":
                pending++;
                break;

            case "Confirmed":
                confirmed++;
                break;

            case "Checked In":
                checkedIn++;
                break;

            case "Cancelled":
                cancelled++;
                break;
        }

        const rooms = group.rooms || [];

        allocatedRooms += rooms.length;

        rooms.forEach(room => {

            mealCovers += Number(room.pax) || 0;

            if (room.vip) {

                vipGuests++;
            }

        });

    });

    setSummaryValue("dashboardPending",   pending);
    setSummaryValue("dashboardConfirmed", confirmed);
    setSummaryValue("dashboardCheckedIn", checkedIn);
    setSummaryValue("dashboardCancelled", cancelled);

    setSummaryValue("dashboardVIP",       vipGuests);
    setSummaryValue("dashboardMeals",     mealCovers);
    setSummaryValue("dashboardAllocated", allocatedRooms);
}


/* =====================================================
   STATUS BADGE CLASS
===================================================== */

function getStatusClass(status) {

    return (
        "status-" +
        (status || "Pending")
        .toLowerCase()
        .replace(/\s+/g, "-")
    );
}


/* =====================================================
   LIVE ARRIVAL CARDS
===================================================== */

function buildLiveArrivalLists() {

    const todayContainer =
        document.getElementById(
            "todayArrivalCards"
        );

    const tomorrowContainer =
        document.getElementById(
            "tomorrowArrivalCards"
        );

    if (!todayContainer || !tomorrowContainer) {

        return;
    }

    todayContainer.innerHTML = "";
    tomorrowContainer.innerHTML = "";

    const today = getTodayString();
    const tomorrow = getTomorrowString();

    DB.groups.forEach((group, index) => {

        const arrival = group.arrivalDate || "";

        if (
            arrival !== today &&
            arrival !== tomorrow
        ) {

            return;
        }

        const card = `

<div
    class="arrival-card"
    onclick="openSavedGroup(${index})">

    <h4>${group.groupName || "Unnamed Group"}</h4>

    <div class="arrival-card-grid">

        <div>
            <strong>Date</strong><br>
            ${arrival || "-"}
        </div>

        <div>
            <strong>Status</strong><br>
            <span class="${getStatusClass(group.status)}">
                ${group.status || "Pending"}
            </span>
        </div>

        <div>
            <strong>Rooms</strong><br>
            ${group.totalRooms || 0}
        </div>

        <div>
            <strong>Pax</strong><br>
            ${group.totalPax || 0}
        </div>

        <div>
            <strong>Agent</strong><br>
            ${group.agent || "-"}
        </div>

        <div>
            <strong>Prepared By</strong><br>
            ${group.preparedBy || "-"}
        </div>

    </div>

    <div class="arrival-open">► OPEN GROUP</div>

</div>

`;

        if (arrival === today) {

            todayContainer.insertAdjacentHTML(
                "beforeend",
                card
            );
        }

        if (arrival === tomorrow) {

            tomorrowContainer.insertAdjacentHTML(
                "beforeend",
                card
            );
        }

    });

    if (!todayContainer.innerHTML.trim()) {

        todayContainer.innerHTML =
            "<p>No arrivals today.</p>";
    }

    if (!tomorrowContainer.innerHTML.trim()) {

        tomorrowContainer.innerHTML =
            "<p>No arrivals tomorrow.</p>";
    }
}


/* =====================================================
   SAVED GROUPS PANEL
===================================================== */

function renderSavedGroups() {

    const body =
        document.getElementById(
            "savedGroupsBody"
        );

    if (!body) return;

    const search =
        (
            document.getElementById(
                "groupSearch"
            )?.value || ""
        )
        .trim()
        .toLowerCase();

    body.innerHTML = "";

    /* ---------- Keep The Real Database Index ---------- */

    const entries =
        DB.groups.map((group, realIndex) => ({
            group,
            realIndex
        }));

    entries
        .filter(entry =>
            (entry.group.groupName || "")
            .toLowerCase()
            .includes(search)
        )
        .sort((a, b) =>
            (b.group.modifiedOn || "")
            .localeCompare(a.group.modifiedOn || "")
        )
        .forEach(entry => {

            const group = entry.group;

            body.insertAdjacentHTML(

                "beforeend",

                `
<tr>

    <td>${group.groupName || ""}</td>

    <td>${group.arrivalDate || ""}</td>

    <td>
        <span class="${getStatusClass(group.status)}">
            ${group.status || "Pending"}
        </span>
    </td>

    <td>${group.totalRooms || 0}</td>

    <td>
        <button onclick="openSavedGroup(${entry.realIndex})">
            Open
        </button>

        <button onclick="deleteSavedGroup(${entry.realIndex})">
            Delete
        </button>
    </td>

</tr>
`
            );

        });

    if (!body.innerHTML.trim()) {

        body.innerHTML =
            `<tr><td colspan="5">No saved groups.</td></tr>`;
    }
}


/* =====================================================
   DASHBOARD LINK FROM REGISTER
===================================================== */

function updateDashboardFromRegister() {

    const rows = getRegisterRows();

    let pax = 0;

    rows.forEach(row => {

        pax += Number(row.pax) || 0;

    });

    setSummaryValue("summaryRooms", rows.length);

    setSummaryValue("summaryPax", pax);
}


/* =====================================================
   DASHBOARD CONTROLLER
===================================================== */

function refreshEntireDashboard() {

    updateDashboard();

    updateArrivalControlCenter();

    buildLiveArrivalLists();

    renderSavedGroups();

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

    alert(

`Meal Analytics

EP  : ${EP}
CP  : ${CP}
MAP : ${MAP}
AP  : ${AP}`
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
   REGISTER INPUT RESTRICTIONS

   Set ROOM_NUMBERS_ONLY to false if your hotel uses
   room names or letters (A101, Lake View 2, PH-1).
===================================================== */

const ROOM_NUMBERS_ONLY = true;

const REGISTER_CELL_FILTERS = {

    /* Room */
    1: ROOM_NUMBERS_ONLY
        ? /[^0-9]/g
        : /[^0-9A-Za-z\- ]/g,

    /* Pax */
    3: /[^0-9]/g,

    /* Mobile */
    5: /[^0-9+\- ]/g

};


function getRegisterCellFilter(target) {

    const cell =
        target && target.closest
            ? target.closest("td")
            : null;

    if (!cell) return null;

    return REGISTER_CELL_FILTERS[cell.cellIndex] || null;
}


/* ---------- Block Disallowed Typing And Pasting ---------- */

function handleRegisterBeforeInput(event) {

    const filter =
        getRegisterCellFilter(event.target);

    if (!filter) return;

    let text = event.data;

    if (text == null && event.dataTransfer) {

        text = event.dataTransfer.getData("text");
    }

    if (!text) return;

    if (text.replace(filter, "") !== text) {

        event.preventDefault();
    }
}


/* ---------- Clean Anything That Slipped Through ---------- */

function handleRegisterCleanup(event) {

    const cell =
        event.target && event.target.closest
            ? event.target.closest(
                'td[contenteditable="true"]'
              )
            : null;

    if (!cell) return;

    const rule =
        getRegisterCellRule(cell.cellIndex);

    const original = cell.innerText;

    /* Always collapse line breaks and double spaces */

    let cleaned =
        original
        .replace(/\s+/g, " ")
        .trim();

    /* Apply the column rule where one exists */

    if (rule) {

        cleaned =
            cleaned
            .replace(rule.pattern, "")
            .slice(0, rule.maxLength);
    }

    if (cleaned !== original) {

        cell.innerText = cleaned;

        refreshRegisterViews();
    }
}/* =====================================================
   REGISTER INPUT RESTRICTIONS

   Room mode is controlled from Settings.
   Numeric mode  : digits only, max 3  (001 - 999)
   Free mode     : letters, digits, hyphen, space, max 10
===================================================== */

const REGISTER_LIMITS = {

    roomNumeric: {
        pattern:   /[^0-9]/g,
        maxLength: 3
    },

    roomFree: {
        pattern:   /[^0-9A-Za-z\- ]/g,
        maxLength: 10
    },

    guest: {
        pattern:   /[\r\n\t]/g,
        maxLength: 60
    },

    pax: {
        pattern:   /[^0-9]/g,
        maxLength: 2
    },
    mobile: {
        pattern:   /[^0-9+\- ]/g,
        maxLength: 15
    }

};


function isRoomNumericOnly() {

    return DB.settings.roomNumbersOnly !== false;
}


function getRegisterCellRule(cellIndex) {

   switch (cellIndex) {

        case REGISTER_COLUMNS.ROOM:
            return isRoomNumericOnly()
                ? REGISTER_LIMITS.roomNumeric
                : REGISTER_LIMITS.roomFree;

      case REGISTER_COLUMNS.GUEST:
            return REGISTER_LIMITS.guest;

        case REGISTER_COLUMNS.PAX:
            return REGISTER_LIMITS.pax;

        case REGISTER_COLUMNS.MOBILE:
            return REGISTER_LIMITS.mobile;

        default:
            return null;
    }
}


function getRuleForEvent(event) {

    const cell =
        event.target && event.target.closest
            ? event.target.closest("td")
            : null;

    if (!cell) return null;

    const rule =
        getRegisterCellRule(cell.cellIndex);

    return rule ? { cell, rule } : null;
}


/* ---------- Block Disallowed Typing And Pasting ---------- */

function handleRegisterBeforeInput(event) {

    const found = getRuleForEvent(event);

    if (!found) return;

    /* Deletions are always allowed */

    if (
        event.inputType &&
        event.inputType.indexOf("delete") === 0
    ) {
        return;
    }

    let text = event.data;

    if (text == null && event.dataTransfer) {

        text = event.dataTransfer.getData("text");
    }

    if (!text) return;

    /* ---------- Character Check ---------- */

    if (
        text.replace(found.rule.pattern, "") !== text
    ) {

        event.preventDefault();

        return;
    }

    /* ---------- Length Check ---------- */

    const selection = window.getSelection();

    let selectedLength = 0;

    if (
        selection &&
        selection.rangeCount > 0 &&
        !selection.isCollapsed
    ) {

        selectedLength =
            selection.toString().length;
    }

    const currentLength =
        found.cell.innerText.trim().length;

    if (
        currentLength -
        selectedLength +
        text.length > found.rule.maxLength
    ) {

        event.preventDefault();
    }
}


/* ---------- Clean Anything That Slipped Through ---------- */

function handleRegisterCleanup(event) {

    const found = getRuleForEvent(event);

    if (!found) return;

    const original =
        found.cell.innerText;

    const cleaned =
        original
        .replace(found.rule.pattern, "")
        .trim()
        .slice(0, found.rule.maxLength);

    if (cleaned !== original) {

        found.cell.innerText = cleaned;

        refreshRegisterViews();
    }
}
/* =====================================================
   REGISTER KEYBOARD NAVIGATION

   Enter moves down the same column instead of
   inserting a line break and growing the cell.
===================================================== */

function placeCaretAtEnd(element) {

    element.focus();

    const range = document.createRange();

    range.selectNodeContents(element);

    range.collapse(false);

    const selection = window.getSelection();

    selection.removeAllRanges();

    selection.addRange(range);
}


function handleRegisterKeydown(event) {

    if (event.key !== "Enter") return;

    const cell =
        event.target && event.target.closest
            ? event.target.closest(
                'td[contenteditable="true"]'
              )
            : null;

    if (!cell) return;

    /* Never allow a line break inside a register cell */

    event.preventDefault();

    const row = cell.parentElement;

    const nextRow = row.nextElementSibling;

    if (!nextRow) {

        cell.blur();

        return;
    }

    const nextCell =
        nextRow.cells[cell.cellIndex];

    if (
        nextCell &&
        nextCell.isContentEditable
    ) {

        placeCaretAtEnd(nextCell);
    }
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
   REGISTER EVENTS
===================================================== */

function initializeRegisterEvents() {

    const body = getRegisterBody();

  if (body) {

       body.addEventListener(
            "keydown",
            handleRegisterKeydown
        );

        body.addEventListener(
            "beforeinput",
            handleRegisterBeforeInput
        );

        body.addEventListener(
            "input",
            handleRegisterInput
        );

        body.addEventListener(
            "change",
            handleRegisterInput
        );

        body.addEventListener(
            "focusout",
            handleRegisterCleanup
        );
    }

    document
        .getElementById("btnGenerateRows")
        ?.addEventListener("click", generateRows);

    document
        .getElementById("btnAddRow")
        ?.addEventListener("click", addRow);

    document
        .getElementById("btnProcessImport")
        ?.addEventListener("click", processBulkImport);
}
function handleRegisterInput() {

    refreshRegisterViews();

    scheduleAutoSave();

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

    /* ---------- Settings & Branding ---------- */

    refreshApplicationSettings();

    /* ---------- Navigation ---------- */

    initializeNavigation();

    /* ---------- Event Bindings ---------- */

    initializeRegisterEvents();

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