/* =====================================================
   HOTEL GROUP OPERATIONS SUITE
   File    : js/register.js
   Version : 1.0.0 RC1

   ARRIVAL REGISTER

   Owns:
       REGISTER_COLUMNS  - the single source of truth for
                           every table cell index
       row template, data extractor, row generation
       input rules (room / guest / pax / children / mobile)
       keyboard navigation
       children count and age fields
       pax auto-fill from room category
       capacity and duplicate validation
       summary, rooming list sync
       register event bindings

   Depends at runtime on:
       database.js     DB, saveDatabase
       room-master.js  getRoomCategory, getRoomOccupancyRule,
                       isRoomInMaster, roomMasterHasRooms
       reports.js      updateReports
       dialog.js       showAlert, showPrompt
       app.js          scheduleAutoSave, toggleDraftBanner

   Load AFTER database.js and room-master.js,
   BEFORE app.js.

   NEVER use a raw cells[n] index anywhere. Always
   cells[REGISTER_COLUMNS.NAME]. A column shift once
   misaligned the entire register silently.
===================================================== */


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

async function generateRows() {

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

    /* Never wipe existing rows without asking */

    if (typeof confirmRegisterReplace === "function") {

        const proceed =
            await confirmRegisterReplace("Generate Rows");

        if (!proceed) return;
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

    /* A new row must never be hidden by an active filter */

    if (typeof clearRegisterFilter === "function") {

        clearRegisterFilter();
    }

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

    const body = getRegisterBody();

    if (!body || body.rows.length === 0) {

        await showAlert(
            "Generate or add rows first.",
            "No Rows"
        );

        return;
    }

    const input = await showPrompt(

        "Enter the room range to assign.\n\n" +
        "101-110          a range\n" +
        "101,105,107-109  a mixed list\n\n" +
        "Only rooms that exist in the Room Master " +
        "will be used.",

        "",
        "Auto Room Series",
        { placeholder: "101-110" }
    );

    if (input === null || !input.trim()) return;

    /* parseRoomList() lives in room-master.js and already
       handles ranges, lists and zero padding. */

    if (typeof parseRoomList !== "function") {

        await showAlert(
            "Room Master module is not loaded.",
            "Cannot Continue"
        );

        return;
    }

  let requested = parseRoomList(input);

    /* ---------- Single Room Means "Start Here" ---------- */

    if (
        requested.length === 1 &&
        body.rows.length > 1 &&
        typeof RoomMasterRepository !== "undefined" &&
        RoomMasterRepository.totalRooms() > 0
    ) {

        const inventory =
            RoomMasterRepository.getRoomNumbers();

        const startAt =
            inventory.indexOf(requested[0]);

        if (startAt >= 0) {

            /* Walk forward through real rooms only, so
               gaps in the inventory are skipped rather
               than invented. */

            requested =
                inventory.slice(
                    startAt,
                    startAt + body.rows.length
                );
        }
    }

    if (requested.length === 0) {

        await showAlert(
            "That range could not be read.",
            "Invalid Range"
        );

        return;
    }

    /* ---------- Keep only real rooms ---------- */

    const useMaster =
        typeof roomMasterHasRooms === "function" &&
        roomMasterHasRooms();

    const available = [];
    const skipped = [];

    requested.forEach(room => {

        if (
            !useMaster ||
            (typeof isRoomInMaster === "function" &&
             isRoomInMaster(room))
        ) {

            available.push(room);

        } else {

            skipped.push(room);
        }

    });

    if (available.length === 0) {

        await showAlert(
            "None of those rooms exist in the Room Master.\n\n" +
            "Add them under Room Master first.",
            "No Matching Rooms"
        );

        return;
    }

    /* ---------- Assign in order ---------- */

    const rows = [...body.rows];

    const count =
        Math.min(rows.length, available.length);

    for (let i = 0; i < count; i++) {

        const cell =
            rows[i].cells[REGISTER_COLUMNS.ROOM];

        if (!cell) continue;

        cell.innerText = available[i];

        /* Let pax auto-fill from the new category */

        delete rows[i].dataset.paxTouched;

        if (typeof autoFillPaxFromRoom === "function") {

            autoFillPaxFromRoom(rows[i]);
        }

        if (typeof renderChildAges === "function") {

            renderChildAges(rows[i]);
        }
    }

    refreshRegisterViews();

    /* ---------- Report what happened ---------- */

    let message =
        count + " room(s) assigned.";

    if (rows.length > available.length) {

        message +=
            "\n\n" + (rows.length - available.length) +
            " row(s) left blank — not enough rooms in " +
            "the range.";
    }

    if (available.length > rows.length) {

        message +=
            "\n\n" + (available.length - rows.length) +
            " room(s) unused — more rooms than rows.";
    }

    if (skipped.length > 0) {

        message +=
            "\n\nSkipped, not in Room Master:\n" +
            skipped.slice(0, 15).join(", ") +
            (skipped.length > 15
                ? " and " + (skipped.length - 15) + " more"
                : "");
    }

    await showAlert(message, "Auto Room Series");
}
/* =====================================================
   CLEAR REGISTER
===================================================== */
function clearRegisterFields() {

    [
        "groupName",
        "arrivalDate",
        "agentCompany",
        "preparedBy",
        "groupNotes"
    ]
    .forEach(id => {

        const el = document.getElementById(id);

        if (el) el.value = "";

    });

    const status =
        document.getElementById("groupStatus");

    if (status) status.value = "Pending";

    const body = getRegisterBody();

    if (body) body.innerHTML = "";

    if (typeof clearRegisterFilter === "function") {

        clearRegisterFilter();
    }

    refreshRegisterViews();

    if (typeof updateDashboardFromRegister === "function") {

        updateDashboardFromRegister();
    }
}
async function clearRegister() {

    const ok = await showConfirm(
        "Clear the current register?\n\n" +
        "Unsaved rows will be lost.",
        "Clear Register",
        { danger: true, okLabel: "Clear" }
    );

   if (!ok) return;

    snapshotRegister("cleared");

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
   REGISTER SEARCH

   Visual filter only. Rows are hidden, never removed,
   so getRegisterRows() still reads every row and the
   summary, reports and printing stay correct.
===================================================== */

function filterRegisterRows() {

    const input =
        document.getElementById("registerSearch");

    const body = getRegisterBody();

    const status =
        document.getElementById("registerSearchStatus");

    if (!body) return;

    const term =
        (input?.value || "").trim().toLowerCase();

    let shown = 0;

    [...body.rows].forEach(row => {

        if (!term) {

            row.style.display = "";

            shown++;

            return;
        }

        const room =
            row.cells[REGISTER_COLUMNS.ROOM]
            ?.innerText.toLowerCase() || "";

        const guest =
            row.cells[REGISTER_COLUMNS.GUEST]
            ?.innerText.toLowerCase() || "";

        const mobile =
            row.cells[REGISTER_COLUMNS.MOBILE]
            ?.innerText.toLowerCase() || "";

        const request =
            row.querySelector(".specialRequest")
            ?.value.toLowerCase() || "";

        const match =
            room.includes(term) ||
            guest.includes(term) ||
            mobile.includes(term) ||
            request.includes(term);

        row.style.display = match ? "" : "none";

        if (match) shown++;

    });

    if (status) {

        if (!term) {

            status.textContent = "";

            status.classList.remove("filter-on");

        } else {

            status.textContent =
                shown + " of " + body.rows.length + " rows";

            status.classList.add("filter-on");
        }
    }
}


function clearRegisterFilter() {

    const input =
        document.getElementById("registerSearch");

    if (input) input.value = "";

    filterRegisterRows();
}


function initializeRegisterSearch() {

    document
        .getElementById("registerSearch")
        ?.addEventListener("input", filterRegisterRows);

    document
        .getElementById("btnClearRegisterSearch")
        ?.addEventListener("click", clearRegisterFilter);

}
/* =====================================================
   ONE STEP RESTORE

   Generate Rows and Bulk Import replace every row.
   Before they do, the register is snapshotted so a
   mistyped room count cannot destroy a shift's work.

   This is deliberately NOT a general undo stack.
   Cell edits already have native browser undo; the
   damage that actually happens is bulk replacement.
===================================================== */

let registerSnapshot = null;


function snapshotRegister(reason) {

    const rows = getRegisterRows();

    const real =
        rows.filter(row => !isEmptyRegisterRow(row));

    if (real.length === 0) {

        registerSnapshot = null;

        hideRestoreBar();

        return 0;
    }

    registerSnapshot = {
        rows:   rows,
        count:  real.length,
        reason: reason || "replaced",
        at:     Date.now()
    };

    showRestoreBar();

    return real.length;
}


function showRestoreBar() {

    const bar =
        document.getElementById("restoreBar");

    const text =
        document.getElementById("restoreBarText");

    if (!bar || !registerSnapshot) return;

    if (text) {

        text.innerHTML =
            "<strong>" +
            registerSnapshot.count +
            " row(s) " +
            registerSnapshot.reason +
            ".</strong> The previous register can be " +
            "restored until you leave this page.";
    }

    bar.style.display = "flex";
}


function hideRestoreBar() {

    const bar =
        document.getElementById("restoreBar");

    if (bar) bar.style.display = "none";
}


function dismissRestore() {

    registerSnapshot = null;

    hideRestoreBar();
}


async function restoreLastRegister() {

    if (!registerSnapshot) {

        hideRestoreBar();

        return;
    }

    const ok = await showConfirm(
        "Restore the previous " +
        registerSnapshot.count +
        " row(s)?\n\n" +
        "Anything entered since will be replaced.",
        "Restore Register",
        { okLabel: "Restore" }
    );

    if (!ok) return;

    loadRegisterRows(registerSnapshot.rows);

    registerSnapshot = null;

    hideRestoreBar();

    if (typeof showSaveFlash === "function") {

        showSaveFlash("Register restored");
    }
}


/* ---------- Guard For Bulk Replacement ---------- */

async function confirmRegisterReplace(actionLabel) {

    const rows = getRegisterRows();

    const real =
        rows.filter(row => !isEmptyRegisterRow(row));

    if (real.length === 0) return true;

    const ok = await showConfirm(
        real.length +
        " row(s) already contain data.\n\n" +
        actionLabel +
        " will replace all of them.",
        "Replace Register",
        { danger: true, okLabel: "Replace" }
    );

    if (!ok) return false;

    snapshotRegister("replaced");

    return true;
}


function initializeRestoreBar() {

    document
        .getElementById("btnRestoreRegister")
        ?.addEventListener("click", restoreLastRegister);

    document
        .getElementById("btnDismissRestore")
        ?.addEventListener("click", dismissRestore);

}
registerModuleVersion("register.js", "1.0.0");