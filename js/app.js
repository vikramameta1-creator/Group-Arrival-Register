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

/* Bump when the stored shape changes, then add a
   migration step in migrateDatabase(). */

const SCHEMA_VERSION = 2;

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
    }
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
    CHILDREN: 5,
    MEAL:     6,
    MOBILE:   7,
    EXTRA:    8

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
    mobile = "",
    children = 0
) {

    return `
    <tr>

        <td>${sr}</td>

        <td contenteditable="true">${room}</td>

        <td class="roomCategory category-unmapped">—</td>

        <td contenteditable="true">${guest}</td>

        <td contenteditable="true">${pax}</td>

        <td class="children-cell">

            <input
                type="number"
                class="childCount"
                min="0"
                max="9"
                value="${children}">

            <div class="childAges"></div>

        </td>

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
            ?.innerText.trim() || "";

        const pax =
            Number(
                row.cells[REGISTER_COLUMNS.PAX]
                ?.innerText
            ) || 0;

        const children =
            Number(
                row.querySelector(".childCount")?.value
            ) || 0;

        const childAges =
            [...row.querySelectorAll(".childAge")]
            .map(input => input.value.trim())
            .filter(value => value !== "");

        rows.push({

            roomNo:   roomNo,

            category:
                typeof getRoomCategory === "function"
                    ? getRoomCategory(roomNo)
                    : "",

            guestName:
                row.cells[REGISTER_COLUMNS.GUEST]
                ?.innerText.trim() || "",

            pax:      pax,

            children: children,

            adults:   Math.max(pax - children, 0),

            childAges: childAges,

            meal:
                row.querySelector(".meal-plan")
                ?.value?.toUpperCase() || "",

            mobile:
                row.cells[REGISTER_COLUMNS.MOBILE]
                ?.innerText.trim() || "",

            vip:
                row.querySelector(".vipGuest")
                ?.checked || false,

            specialRequest:
                row.querySelector(".specialRequest")
                ?.value?.trim() || ""

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
                row.mobile || "",
                row.children || 0
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

        renderChildAges(currentRow, row.childAges || []);

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

        showAlert(
            "Enter how many rooms this group needs.",
            "Room Count Required"
        );

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

async function autoGenerateRoomSeries() {

    const startRoom = await showPrompt(
        "Rooms will be numbered upward from here.",
        "",
        "Starting Room Number",
        { inputType: "number", placeholder: "101" }
    );

    if (startRoom === null) return;

    if (!startRoom.trim()) return;

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

async function clearRegister() {

    const ok = await showConfirm(
        "Clear the current register?\n\n" +
        "Unsaved rows will be lost.",
        "Clear Register",
        { danger: true, okLabel: "Clear" }
    );

    if (!ok) return;

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

    const problems = [];

    const seen = {};

    const enforce = isRoomMasterEnforced();

    getRegisterRows().forEach((row, index) => {

        const line = "Row " + (index + 1) + " — ";

        if (!row.roomNo) return;

        if (
            enforce &&
            typeof isRoomInMaster === "function" &&
            !isRoomInMaster(row.roomNo)
        ) {

            problems.push(
                line + "room " + row.roomNo +
                " is not in the Room Master"
            );
        }

        if (seen[row.roomNo]) {

            problems.push(
                line + "room " + row.roomNo +
                " is already used in row " + seen[row.roomNo]
            );

        } else {

            seen[row.roomNo] = index + 1;
        }

        const capacity = getRowCapacityError(row);

        if (capacity) {

            problems.push(
                line + "room " + row.roomNo +
                " exceeds occupancy (" + capacity + ")"
            );
        }

    });

    return problems;
}


function updateRegisterCategories() {

    const body = getRegisterBody();

    if (!body) return;

    const enforce = isRoomMasterEnforced();

    const rows = getRegisterRows();

    const seen = {};

    [...body.rows].forEach((element, index) => {

        const roomCell =
            element.cells[REGISTER_COLUMNS.ROOM];

        const categoryCell =
            element.cells[REGISTER_COLUMNS.CATEGORY];

        const paxCell =
            element.cells[REGISTER_COLUMNS.PAX];

        if (!roomCell || !categoryCell) return;

        const data = rows[index] || {};

        const room = data.roomNo || "";

        let error = "";

        if (room) {

            if (
                enforce &&
                typeof isRoomInMaster === "function" &&
                !isRoomInMaster(room)
            ) {

                error = "NOT IN MASTER";

            } else if (seen[room]) {

                error = "DUPLICATE";

            } else {

                error = getRowCapacityError(data);
            }

            if (!seen[room]) seen[room] = index + 1;
        }

        if (error) {

            categoryCell.textContent = error;

            categoryCell.className =
                "roomCategory category-invalid";

            roomCell.classList.add("room-invalid");

            if (paxCell) {

                paxCell.classList.toggle(
                    "pax-invalid",
                    error !== "NOT IN MASTER" &&
                    error !== "DUPLICATE"
                );
            }

            return;
        }

        const category = data.category || "";

        categoryCell.textContent = category || "—";

        categoryCell.className =
            "roomCategory" +
            (category ? "" : " category-unmapped");

        roomCell.classList.remove("room-invalid");

        if (paxCell) {

            paxCell.classList.remove("pax-invalid");
        }

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

async function showValidationReport() {

    const report = validateRooms();

    let text = "";

    if (report.duplicateRooms.length) {

        text +=
            "Duplicate rooms:\n" +
            report.duplicateRooms.join(", ") +
            "\n\n";
    }

    if (report.duplicateGuests.length) {

        text +=
            "Duplicate guest names:\n" +
            report.duplicateGuests.join(", ");
    }

    if (!text) {

        await showAlert(
            "No duplicate rooms or guest names found.",
            "Register Looks Good"
        );

        return;
    }

    await showAlert(text.trim(), "Duplicates Found");
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

    <td class="timestamp-cell">
        ${formatTimestamp(group.modifiedOn)}
    </td>

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
            `<tr><td colspan="6">No saved groups.</td></tr>`;
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
   CHILD AGE FIELDS

   One age box per child. Adding a child adds a box.
===================================================== */

function getChildLimit(row) {

    const roomNo =
        row.cells[REGISTER_COLUMNS.ROOM]
        ?.innerText.trim() || "";

    const pax =
        Number(
            row.cells[REGISTER_COLUMNS.PAX]?.innerText
        ) || 0;

    let limit = 9;

    if (
        roomNo &&
        typeof getRoomCategory === "function" &&
        getRoomCategory(roomNo) &&
        typeof getRoomOccupancyRule === "function"
    ) {

        limit = getRoomOccupancyRule(roomNo).maxChildren;
    }

    /* Children can never exceed the total in the room */

    limit = Math.min(limit, pax);

    return limit < 0 ? 0 : limit;
}


function renderChildAges(row, existingAges) {

    if (!row) return;

    const container =
        row.querySelector(".childAges");

    const countInput =
        row.querySelector(".childCount");

    if (!container || !countInput) return;

    const limit = getChildLimit(row);

    let count = Number(countInput.value) || 0;

    if (count < 0) count = 0;

    if (count > limit) count = limit;

    countInput.value = count;

    countInput.max = limit;

    countInput.title =
        limit === 0
            ? "No children allowed for this room"
            : "Maximum " + limit + " child(ren)";

    countInput.classList.toggle("input-capped", limit === 0);

    const previous =
        existingAges ||
        [...container.querySelectorAll(".childAge")]
        .map(input => input.value);

    container.innerHTML = "";

    for (let i = 0; i < count; i++) {

        container.insertAdjacentHTML(

            "beforeend",

            `<input
                type="number"
                class="childAge"
                min="0"
                max="17"
                placeholder="Age"
                value="${previous[i] || ""}">`
        );

    }
}
/* =====================================================
   AUTO FILL PAX FROM ROOM CATEGORY
===================================================== */

function autoFillPaxFromRoom(row) {

    if (
        !row ||
        typeof getRoomOccupancyRule !== "function"
    ) {
        return;
    }

    const roomCell =
        row.cells[REGISTER_COLUMNS.ROOM];

    const paxCell =
        row.cells[REGISTER_COLUMNS.PAX];

    if (!roomCell || !paxCell) return;

    const roomNo = roomCell.innerText.trim();

    if (!roomNo) return;

    if (
        typeof isRoomInMaster === "function" &&
        !isRoomInMaster(roomNo)
    ) {
        return;
    }

    /* Only fill an untouched cell */

    if (row.dataset.paxTouched === "1") return;

    const rule = getRoomOccupancyRule(roomNo);

    paxCell.innerText = rule.defaultAdults;
}


/* =====================================================
   ROW CAPACITY CHECK
===================================================== */

function getRowCapacityError(row) {

    if (typeof getRoomOccupancyRule !== "function") {

        return "";
    }

    if (!row.roomNo) return "";

    const category =
        typeof getRoomCategory === "function"
            ? getRoomCategory(row.roomNo)
            : "";

    if (!category) return "";

    const rule = getRoomOccupancyRule(row.roomNo);

    if (row.pax > rule.maxOccupancy) {

        return "MAX " + rule.maxOccupancy + " PAX";
    }

    if (row.children > rule.maxChildren) {

        return "MAX " + rule.maxChildren + " CHILD";
    }

    if (row.adults > rule.maxAdults) {

        return "MAX " + rule.maxAdults + " ADULTS";
    }

    return "";
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


function handleRegisterInput(event) {

    const row =
        event?.target?.closest
            ? event.target.closest("tr")
            : null;

    if (row) {

        const cell =
            event.target.closest("td");

        if (
            cell &&
            cell.cellIndex === REGISTER_COLUMNS.PAX
        ) {

            row.dataset.paxTouched = "1";
        }

        if (
            cell &&
            cell.cellIndex === REGISTER_COLUMNS.ROOM
        ) {

            autoFillPaxFromRoom(row);
        }

        if (
            event.target.classList &&
            event.target.classList.contains("childCount")
        ) {

            renderChildAges(row);
        }

        /* Pax changed — children may now exceed the room */

        if (
            cell &&
            cell.cellIndex === REGISTER_COLUMNS.PAX
        ) {

            renderChildAges(row);
        }

        /* Room changed — occupancy rule changed with it */

        if (
            cell &&
            cell.cellIndex === REGISTER_COLUMNS.ROOM
        ) {

            renderChildAges(row);
        }

    }

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

    /* ---------- Dialogs ---------- */

    initializeDialogs();

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