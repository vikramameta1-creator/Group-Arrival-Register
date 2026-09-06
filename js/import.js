/* =====================================================
   HOTEL GROUP OPERATIONS SUITE
   File    : js/import.js
   Version : 1.0.0

   CSV / EXCEL GROUP IMPORT

   Last item on the original 1.1.0 plan. Splits a single
   spreadsheet into MULTIPLE separate saved groups, keyed
   by whichever column gets mapped to Group Name - not an
   import into the currently open group (that's what the
   existing Bulk Import panel already does, unchanged).

   Flow: upload -> detect header row -> map columns ->
   review -> confirm. Nothing is written to the database
   until the developer explicitly confirms at the review
   step - every step before that only touches in-memory
   state (importState below).

   This is the one place in the whole project with an
   external dependency (SheetJS, loaded via CDN in the
   HTML, global as `XLSX`) - every other module is plain,
   dependency-free JavaScript. That's deliberate and
   confirmed: Excel files are a real binary format, not
   plain text, and there is no way to read one without
   either a library or writing a binary parser by hand.
   CSV alone would have kept the project dependency-free;
   both formats were explicitly requested anyway.

   Depends at runtime on:
       database.js   generateId, GroupRepository
       dialog.js     showAlert, showConfirm
       Global XLSX   from the SheetJS CDN script tag

   Load after database.js and dialog.js.
===================================================== */


/* =====================================================
   FIELD DEFINITIONS

   What a column can be mapped to. Keywords are used only
   to suggest a mapping automatically - the developer can
   always override any suggestion before confirming.
===================================================== */

const IMPORT_FIELDS = [
    { key: "groupName",  label: "Group Name",  keywords: ["group", "booking", "party"] },
    { key: "roomNo",     label: "Room No",     keywords: ["room no", "rm no", "room number"] },
    { key: "category",   label: "Category",    keywords: ["category", "room type"] },
    { key: "guestName",  label: "Guest Name",  keywords: ["guest", "pax name", "dealer name"] },
    { key: "firstName",  label: "First Name",  keywords: ["first name", "fname"] },
    { key: "lastName",   label: "Last Name",   keywords: ["last name", "lname", "surname"] },
    { key: "pax",        label: "Pax",         keywords: ["pax", "adults", "no of pax"] },
    { key: "occupancy",  label: "Occupancy Type (Single/Double/Triple)",
                                                keywords: ["occupancy type", "room pairing", "occupancy"] },
    { key: "children",   label: "Children",    keywords: ["child", "kids", "cwb"] },
    { key: "meal",       label: "Meal Plan (EP/CP/MAP/AP)",
                                                keywords: ["meal plan", "mp"] },
    { key: "mobile",     label: "Mobile",      keywords: ["mobile", "phone", "contact"] },
    { key: "agent",      label: "Agent",       keywords: ["agent", "company", "operator"] },
    { key: "checkIn",    label: "Check-in Date", keywords: ["check in", "checkin", "arrival"] },
    { key: "checkOut",   label: "Check-out Date", keywords: ["check out", "checkout", "departure"] },
    { key: "serialNo",   label: "Serial No (reference only)",
                                                keywords: ["sr no", "s.no", "sl no", "serial"] },
    { key: "ignore",     label: "Ignore this column", keywords: [] }
];

/* Occupancy Type values map to a pax count when there's no
   separate numeric Pax column - "SINGLE"/"SGL" both mean 1
   the same way "DOUBLE"/"DBL"/"TWIN"/"TWN" both mean 2,
   since different agents abbreviate the same thing
   differently (confirmed directly from two real rooming
   lists using different words for the same occupancy). */

const OCCUPANCY_TYPE_TO_PAX = {

    "SINGLE": 1, "SGL": 1,
    "DOUBLE": 2, "DBL": 2, "TWIN": 2, "TWN": 2,
    "TRIPLE": 3, "TRP": 3, "TRPL": 3,
    "QUAD": 4, "QUADRUPLE": 4

};

const IMPORT_MEAL_PLANS = ["EP", "CP", "MAP", "AP"];

/* Rows in the first HEADER_SCAN_LIMIT rows are checked
   for header-like content; the highest-scoring row with
   at least HEADER_MIN_SCORE keyword matches wins. Below
   that threshold, row 1 is used and the developer adjusts
   by hand via the "data starts at row" control. */

const HEADER_SCAN_LIMIT = 20;
const HEADER_MIN_SCORE  = 2;


/* =====================================================
   VALUE NORMALIZATION HELPERS
===================================================== */

function occupancyTypeToPax(rawValue) {

    const text =
        String(rawValue || "").trim().toUpperCase();

    return OCCUPANCY_TYPE_TO_PAX[text] || null;
}


function normalizeImportDate(rawValue) {

    const text = String(rawValue || "").trim();

    if (!text) return "";

    /* Already a plain YYYY-MM-DD - nothing to do. */

    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

    /* SheetJS is asked to return formatted values
       (raw:false in readImportFile), so a bare Excel date
       serial number shouldn't normally reach here - this
       is a defensive fallback in case a cell has no
       number format applied in the source file, which
       happens more often than it should in real agent
       spreadsheets. Excel's day-zero is 1899-12-30. */

    if (/^\d{4,6}$/.test(text)) {

        const serial = Number(text);

        if (serial > 0 && serial < 60000) {

            const epoch = new Date(1899, 11, 30);

            epoch.setDate(epoch.getDate() + serial);

            return epoch.toISOString().slice(0, 10);
        }
    }

    const parsed = new Date(text);

    if (!isNaN(parsed.getTime())) {

        return parsed.toISOString().slice(0, 10);
    }

    return "";
}


/* =====================================================
   STATE

   Nothing here is persisted - this only exists for the
   duration of one import session, reset every time the
   modal opens fresh.
===================================================== */

let importState = {

    rawRows:         [],   // every row from the file, unmodified
    headerRow:       0,    // index into rawRows treated as headers
    mapping:         {},   // { columnIndex: fieldKey }
    groups:          [],   // built after mapping, before commit
    warnings:        [],   // persisted so a rename re-render doesn't lose them
    arrivalDate:     "",   // batch fallback, used when a group has no per-row dates
    singleGroupName: ""    // used only when no column maps to Group Name

};


function resetImportState() {

    importState = {
        rawRows:         [],
        headerRow:       0,
        mapping:         {},
        groups:          [],
        warnings:        [],
        arrivalDate:     "",
        singleGroupName: ""
    };
}


/* =====================================================
   FILE READING

   CSV is parsed by hand - it's plain text, no library
   needed, same reasoning Export CSV already relies on.
   Excel needs SheetJS (global XLSX), since .xlsx is a
   real binary/zip format, not text.
===================================================== */

function parseCSVText(text) {

    const rows = [];

    /* Handles quoted fields containing commas or embedded
       quotes ("") - a naive split(",") would break on any
       real-world exported spreadsheet the moment a guest
       name or address contains a comma. */

    const lines = text.split(/\r\n|\n|\r/);

    lines.forEach(line => {

        if (line.trim() === "" && rows.length === lines.length - 1) {

            return;
        }

        const cells = [];

        let current = "";

        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {

            const char = line[i];

            if (inQuotes) {

                if (char === '"' && line[i + 1] === '"') {

                    current += '"';

                    i++;

                } else if (char === '"') {

                    inQuotes = false;

                } else {

                    current += char;
                }

            } else if (char === '"') {

                inQuotes = true;

            } else if (char === ",") {

                cells.push(current);

                current = "";

            } else {

                current += char;
            }

        }

        cells.push(current);

        rows.push(cells.map(c => c.trim()));

    });

    /* Drop fully blank trailing rows a text file commonly
       ends with. */

    while (
        rows.length > 0 &&
        rows[rows.length - 1].every(c => c === "")
    ) {

        rows.pop();
    }

    return rows;
}


function readImportFile(file) {

    const isExcel =
        /\.xlsx?$/i.test(file.name);

    return new Promise((resolve, reject) => {

        const reader = new FileReader();

        reader.onerror = () => reject(reader.error);

        if (isExcel) {

            reader.onload = function (event) {

                try {

                    if (typeof XLSX === "undefined") {

                        reject(new Error(
                            "Excel support did not load. " +
                            "Check your internet connection " +
                            "and try again, or use a CSV " +
                            "file instead."
                        ));

                        return;
                    }

                    const workbook =
                        XLSX.read(
                            event.target.result,
                            { type: "array" }
                        );

                    const firstSheetName =
                        workbook.SheetNames[0];

                    const sheet =
                        workbook.Sheets[firstSheetName];

                    const rows =
                        XLSX.utils.sheet_to_json(sheet, {
                            header: 1,
                            defval: "",
                            raw: false
                        });

                    resolve(
                        rows.map(row =>
                            row.map(cell =>
                                String(cell || "").trim()
                            )
                        )
                    );

                } catch (error) {

                    reject(error);
                }

            };

            reader.readAsArrayBuffer(file);

        } else {

            reader.onload = function (event) {

                try {

                    resolve(
                        parseCSVText(event.target.result)
                    );

                } catch (error) {

                    reject(error);
                }

            };

            reader.readAsText(file);
        }

    });
}


/* =====================================================
   HEADER ROW DETECTION
===================================================== */

function scoreRowAsHeader(row) {

    let score = 0;

    row.forEach(cell => {

        const text = String(cell || "").toLowerCase();

        if (!text) return;

        IMPORT_FIELDS.forEach(field => {

            field.keywords.forEach(keyword => {

                if (text.includes(keyword)) score++;

            });

        });

    });

    return score;
}


function detectHeaderRow(rows) {

    let bestIndex = 0;

    let bestScore = -1;

    const limit = Math.min(rows.length, HEADER_SCAN_LIMIT);

    for (let i = 0; i < limit; i++) {

        const score = scoreRowAsHeader(rows[i]);

        if (score > bestScore) {

            bestScore = score;

            bestIndex = i;
        }

    }

    return bestScore >= HEADER_MIN_SCORE ? bestIndex : 0;
}


/* =====================================================
   COLUMN MAPPING SUGGESTION
===================================================== */

function suggestFieldForHeader(headerText) {

    const text = String(headerText || "").toLowerCase();

    if (!text) return "ignore";

    let best = "ignore";

    let bestScore = 0;

    IMPORT_FIELDS.forEach(field => {

        field.keywords.forEach(keyword => {

            if (text.includes(keyword) && keyword.length > bestScore) {

                bestScore = keyword.length;

                best = field.key;
            }

        });

    });

    return best;
}


function buildSuggestedMapping(headerRowCells) {

    const mapping = {};

    headerRowCells.forEach((header, index) => {

        mapping[index] = suggestFieldForHeader(header);

    });

    return mapping;
}


/* =====================================================
   BUILD GROUPS FROM MAPPED DATA

   Runs entirely in memory - nothing here touches
   GroupRepository or saveDatabase(). Splits data rows by
   whatever value lands in the mapped Group Name column,
   trimmed and compared case-insensitively so "Mehta
   Group" and "mehta group" don't accidentally become two
   separate groups from inconsistent typing - the first
   spelling seen becomes the group's actual saved name.
===================================================== */

function getMappedColumnIndex(fieldKey) {

    const entry =
        Object.entries(importState.mapping)
            .find(([, key]) => key === fieldKey);

    return entry ? Number(entry[0]) : -1;
}


function buildGroupsFromMapping() {

    const dataRows =
        importState.rawRows.slice(
            importState.headerRow + 1
        );

    const groupNameCol   = getMappedColumnIndex("groupName");
    const roomCol         = getMappedColumnIndex("roomNo");
    const categoryCol     = getMappedColumnIndex("category");
    const guestCol        = getMappedColumnIndex("guestName");
    const firstNameCol    = getMappedColumnIndex("firstName");
    const lastNameCol     = getMappedColumnIndex("lastName");
    const paxCol          = getMappedColumnIndex("pax");
    const occupancyCol    = getMappedColumnIndex("occupancy");
    const childrenCol     = getMappedColumnIndex("children");
    const mealCol         = getMappedColumnIndex("meal");
    const mobileCol       = getMappedColumnIndex("mobile");
    const agentCol        = getMappedColumnIndex("agent");
    const checkInCol      = getMappedColumnIndex("checkIn");
    const checkOutCol     = getMappedColumnIndex("checkOut");

    const groupsByKey = {};

    const orderedKeys = [];

    const warnings = [];

    /* No column mapped to Group Name at all - both real
       sample rooming lists this was built against had this
       exact case, since the whole file already represents
       one group implicitly (one hotel, one stay). Rather
       than blocking the import, the whole file becomes a
       single group under whatever name was typed in for
       this case at Step 2. */

    const noGroupColumnMapped = groupNameCol < 0;

    dataRows.forEach((row, rowIndex) => {

        const isBlankRow =
            row.every(cell => String(cell || "").trim() === "");

        if (isBlankRow) return;

        const rawGroupName =
            noGroupColumnMapped
                ? (importState.singleGroupName || "").trim()
                : String(row[groupNameCol] || "").trim();

        if (!rawGroupName) {

            warnings.push(
                "Row " + (rowIndex + importState.headerRow + 2) +
                ": no group name, skipped."
            );

            return;
        }

        const key = rawGroupName.toLowerCase();

        if (!groupsByKey[key]) {

            groupsByKey[key] = {

                groupName: rawGroupName,
                agent:
                    agentCol >= 0
                        ? String(row[agentCol] || "").trim()
                        : "",
                rooms: [],
                checkInDates:  [],
                checkOutDates: [],
                duplicateOfExisting: false,
                originalGroupName: rawGroupName

            };

            orderedKeys.push(key);
        }

        const roomNo =
            roomCol >= 0 ? String(row[roomCol] || "").trim() : "";

        /* Pax wins if it's actually mapped and has a real
           value on this row; Occupancy Type is the
           fallback, converting SINGLE/DOUBLE/TRIPLE-style
           words into a count - confirmed necessary
           directly from two different real rooming lists
           that had no numeric Pax column at all. */

        let pax = 1;

        if (paxCol >= 0 && Number(row[paxCol])) {

            pax = Number(row[paxCol]);

        } else if (occupancyCol >= 0) {

            const converted =
                occupancyTypeToPax(row[occupancyCol]);

            if (converted) pax = converted;
        }

        const children =
            childrenCol >= 0
                ? Number(row[childrenCol]) || 0
                : 0;

        const rawMeal =
            mealCol >= 0
                ? String(row[mealCol] || "").trim().toUpperCase()
                : "";

        const meal =
            IMPORT_MEAL_PLANS.indexOf(rawMeal) >= 0
                ? rawMeal
                : "";

        /* Guest Name wins if mapped directly; otherwise
           First + Last combine into one, confirmed
           necessary from a real rooming list that split
           them ("Name as per Aadhar" style columns). */

        let guestName = "";

        if (guestCol >= 0) {

            guestName = String(row[guestCol] || "").trim();

        } else if (firstNameCol >= 0 || lastNameCol >= 0) {

            const first =
                firstNameCol >= 0
                    ? String(row[firstNameCol] || "").trim()
                    : "";

            const last =
                lastNameCol >= 0
                    ? String(row[lastNameCol] || "").trim()
                    : "";

            guestName = (first + " " + last).trim();
        }

        if (checkInCol >= 0 && row[checkInCol]) {

            const date = normalizeImportDate(row[checkInCol]);

            if (date) groupsByKey[key].checkInDates.push(date);
        }

        if (checkOutCol >= 0 && row[checkOutCol]) {

            const date = normalizeImportDate(row[checkOutCol]);

            if (date) groupsByKey[key].checkOutDates.push(date);
        }

        groupsByKey[key].rooms.push({

            roomNo:            roomNo,
            guestName:         guestName,
            pax:               pax,
            children:          children,
            meal:              meal,
            mobile:
                mobileCol >= 0
                    ? String(row[mobileCol] || "").trim()
                    : "",
            vip:               false,
            foc:               false,
            checkedOut:        false,
            departureOverride: "",
            _category:
                categoryCol >= 0
                    ? String(row[categoryCol] || "").trim()
                    : ""

        });

    });

    /* Per-row check-in/out dates, when present, become
       that GROUP's own arrival/departure - the earliest
       check-in seen and the latest check-out seen across
       all its rows - rather than forcing every imported
       group through one batch-wide date regardless of what
       the source file actually said. Falls back to the
       batch date when a group's rows had no per-row dates
       at all. */

    orderedKeys.forEach(key => {

        const group = groupsByKey[key];

        group.arrivalDate =
            group.checkInDates.length > 0
                ? group.checkInDates.slice().sort()[0]
                : importState.arrivalDate;

        group.departureDate =
            group.checkOutDates.length > 0
                ? group.checkOutDates.slice().sort().pop()
                : "";

    });

    /* Duplicate room numbers WITHIN one detected group are
       flagged, but never block the import - staff review
       and fix inside the register afterward, same as a
       manually built one would let them. */

    orderedKeys.forEach(key => {

        const group = groupsByKey[key];

        const seen = {};

        group.rooms.forEach(room => {

            if (!room.roomNo) return;

            if (seen[room.roomNo]) {

                warnings.push(

                    group.groupName +
                    ": duplicate room number " +
                    room.roomNo + "."
                );

            } else {

                seen[room.roomNo] = true;
            }

        });

        const existingNames =
            (typeof GroupRepository !== "undefined"
                ? GroupRepository.getAll()
                : []
            ).map(g => (g.groupName || "").toLowerCase());

        group.duplicateOfExisting =
            existingNames.indexOf(key) >= 0;

    });

    importState.groups =
        orderedKeys.map(key => groupsByKey[key]);

    return { warnings: warnings };
}


/* =====================================================
   COMMIT

   Only step that actually touches the database. A group
   already matching an existing saved name is skipped
   entirely, not overwritten and not renamed - the
   existing saved group stays exactly as it was.
===================================================== */

function commitImportedGroups() {

    const created = [];

    const skipped = [];

    importState.groups.forEach(group => {

        if (group.duplicateOfExisting) {

            skipped.push(group.groupName);

            return;
        }

        const rooms =
            group.rooms.map(room => {

                const clean = Object.assign({}, room);

                delete clean._category;

                return clean;
            });

        const totalPax =
            rooms.reduce(
                (t, r) => t + (Number(r.pax) || 0), 0
            );

        const now =
            typeof nowISO === "function"
                ? nowISO()
                : new Date().toISOString();

        const newGroup = {

            id:
                typeof generateId === "function"
                    ? generateId()
                    : "GRP-" + Date.now() + "-" +
                      Math.floor(Math.random() * 1000),
            status:        "Pending",
            groupName:     group.groupName,
            arrivalDate:   group.arrivalDate || importState.arrivalDate,
            departureDate:
                group.departureDate ||
                (
                    typeof addDaysToDate === "function"
                        ? addDaysToDate(
                            group.arrivalDate ||
                                importState.arrivalDate, 1
                        )
                        : ""
                ),
            agent:         group.agent || "",
            preparedBy:    "Front Office",
            notes:         "Imported from spreadsheet.",
            totalRooms:    rooms.length,
            totalPax:      totalPax,
            rooms:         rooms,
            rateCalendars: {},
            createdOn:     now,
            modifiedOn:    now

        };

        GroupRepository.add(newGroup);

        if (typeof recordAuditEntry === "function") {

            recordAuditEntry("Group Imported", {
                groupId:   newGroup.id,
                groupName: newGroup.groupName,
                rooms:     rooms.length
            });
        }

        created.push(group.groupName);

    });

    return { created: created, skipped: skipped };
}


/* =====================================================
   MODAL NAVIGATION
===================================================== */

function openImportModal() {

    resetImportState();

    const overlay =
        document.getElementById("importModal");

    if (!overlay) return;

    overlay.style.display = "flex";

    showImportStep(1);

    const fileInput =
        document.getElementById("importFileInput");

    if (fileInput) fileInput.value = "";

    const statusEl =
        document.getElementById("importUploadStatus");

    if (statusEl) statusEl.textContent = "";
}


function closeImportModal() {

    const overlay =
        document.getElementById("importModal");

    if (overlay) overlay.style.display = "none";
}


function showImportStep(stepNumber) {

    [1, 2, 3, 4].forEach(n => {

        const el =
            document.getElementById("importStep" + n);

        if (el) {

            el.style.display =
                n === stepNumber ? "block" : "none";
        }

    });
}


/* =====================================================
   STEP 1 -> 2 : FILE UPLOAD
===================================================== */

async function handleImportFileSelected(file) {

    const statusEl =
        document.getElementById("importUploadStatus");

    if (!file) return;

    if (statusEl) {

        statusEl.textContent = "Reading file...";
    }

    try {

        const rows = await readImportFile(file);

        if (rows.length === 0) {

            if (statusEl) {

                statusEl.textContent =
                    "That file appears to be empty.";
            }

            return;
        }

        importState.rawRows = rows;

        importState.headerRow = detectHeaderRow(rows);

        renderColumnMappingStep();

        updateSingleGroupNameVisibility();

        showImportStep(2);

    } catch (error) {

        console.error("Import file read error", error);

        if (statusEl) {

            statusEl.textContent =
                "Could not read that file: " +
                (error.message || error);
        }

    }
}


/* =====================================================
   STEP 2 : HEADER ROW + COLUMN MAPPING
===================================================== */

function renderColumnMappingStep() {

    const headerRowInput =
        document.getElementById("importHeaderRowInput");

    if (headerRowInput) {

        headerRowInput.value = importState.headerRow + 1;

        headerRowInput.max = importState.rawRows.length;
    }

    const headerCells =
        importState.rawRows[importState.headerRow] || [];

    /* Preserve any mapping choice the developer already
       made for a column that still exists after the
       header row changes; only re-suggest for genuinely
       new columns. */

    const suggested =
        buildSuggestedMapping(headerCells);

    Object.keys(suggested).forEach(index => {

        if (!(index in importState.mapping)) {

            importState.mapping[index] = suggested[index];
        }

    });

    const wrap =
        document.getElementById("importMappingBody");

    if (!wrap) return;

    if (headerCells.length === 0) {

        wrap.innerHTML =
            `<p class="muted-note">
                No columns found at this row.
            </p>`;

        return;
    }

    let rows = "";

    headerCells.forEach((header, index) => {

        const current =
            importState.mapping[index] || "ignore";

        const options =
            IMPORT_FIELDS
                .map(field =>
                    `<option value="${field.key}"${
                        field.key === current ? " selected" : ""
                    }>${field.label}</option>`
                )
                .join("");

        rows += `
        <tr>
            <td>${header || "(blank)"}</td>
            <td>
                <select
                    onchange="changeImportColumnMapping(${index}, this.value)">
                    ${options}
                </select>
            </td>
        </tr>
        `;

    });

    wrap.innerHTML = `
    <table class="data-table category-table">
        <thead>
            <tr>
                <th>Column in your file</th>
                <th>Maps to</th>
            </tr>
        </thead>
        <tbody>${rows}</tbody>
    </table>
    `;
}


function updateSingleGroupNameVisibility() {

    const wrap =
        document.getElementById("importSingleGroupNameWrap");

    if (!wrap) return;

    const hasGroupColumn =
        getMappedColumnIndex("groupName") >= 0;

    wrap.style.display = hasGroupColumn ? "none" : "";
}


function changeImportColumnMapping(index, value) {

    importState.mapping[index] = value;

    updateSingleGroupNameVisibility();
}


function changeImportHeaderRow(value) {

    const rowNumber = Number(value);

    if (isNaN(rowNumber) || rowNumber < 1) return;

    importState.headerRow = rowNumber - 1;

    renderColumnMappingStep();

    updateSingleGroupNameVisibility();
}


/* =====================================================
   STEP 2 -> 3 : REVIEW
===================================================== */

async function proceedToImportReview() {

    const groupNameCol = getMappedColumnIndex("groupName");

    if (groupNameCol < 0) {

        const singleName =
            document.getElementById("importSingleGroupName")
                ?.value.trim() || "";

        if (!singleName) {

            await showAlert(
                "No column is mapped to \"Group Name\" - " +
                "either map one, or enter a name for the " +
                "whole file above (it will become one group)."
            );

            return;
        }

        importState.singleGroupName = singleName;
    }

    const arrivalDate =
        document.getElementById("importArrivalDate")
            ?.value || "";

    if (!arrivalDate) {

        await showAlert(
            "Set the fallback arrival date - used for any " +
            "group whose rows don't have their own " +
            "Check-in Date mapped."
        );

        return;
    }

    importState.arrivalDate = arrivalDate;

    const result = buildGroupsFromMapping();

    importState.warnings = result.warnings;

    renderImportReview(importState.warnings);

    showImportStep(3);
}


function renameImportGroup(index, newName) {

    const group = importState.groups[index];

    if (!group) return;

    const clean = String(newName || "").trim();

    if (!clean) return;

    group.groupName = clean;

    const existingNames =
        (typeof GroupRepository !== "undefined"
            ? GroupRepository.getAll()
            : []
        ).map(g => (g.groupName || "").toLowerCase());

    group.duplicateOfExisting =
        existingNames.indexOf(clean.toLowerCase()) >= 0;

    /* Also guard against the renamed group now colliding
       with ANOTHER group already detected in this same
       import batch, not just previously-saved ones. */

    const collidesWithinBatch =
        importState.groups.some((other, otherIndex) =>
            otherIndex !== index &&
            other.groupName.toLowerCase() === clean.toLowerCase()
        );

    if (collidesWithinBatch) {

        group.duplicateOfExisting = true;
    }

    renderImportReview(importState.warnings);
}


function renderImportReview(warnings) {

    const wrap =
        document.getElementById("importReviewBody");

    if (!wrap) return;

    if (importState.groups.length === 0) {

        wrap.innerHTML =
            `<p class="muted-note">
                No groups detected - check the Group Name
                column mapping and try again.
            </p>`;

        return;
    }

    let rows = "";

    let willCreate = 0;

    importState.groups.forEach((group, index) => {

        const pax =
            group.rooms.reduce(
                (t, r) => t + (Number(r.pax) || 0), 0
            );

        if (group.duplicateOfExisting) {

            rows += `
            <tr class="import-row-skipped">
                <td>
                    <input
                        type="text"
                        class="import-rename-input"
                        value="${escapeHTML(group.groupName)}"
                        onchange="renameImportGroup(${index}, this.value)">
                </td>
                <td>${group.rooms.length}</td>
                <td>${pax}</td>
                <td>
                    <span class="rate-badge-overridden">
                        SKIPPED — already exists
                    </span>
                </td>
            </tr>
            `;

        } else {

            willCreate++;

            rows += `
            <tr>
                <td>${escapeHTML(group.groupName)}</td>
                <td>${group.rooms.length}</td>
                <td>${pax}</td>
                <td>
                    <span class="rate-badge-agent">
                        Will be created
                    </span>
                </td>
            </tr>
            `;
        }

    });

    let warningsHtml = "";

    if (warnings.length > 0) {

        warningsHtml =
            `<p class="doc-warning">` +
            warnings.map(w => escapeHTML(w)).join("<br>") +
            `</p>`;
    }

    wrap.innerHTML = `
    ${warningsHtml}
    <table class="data-table category-table">
        <thead>
            <tr>
                <th>Group</th>
                <th>Rooms</th>
                <th>Pax</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>${rows}</tbody>
    </table>
    <p class="muted-note" style="margin-top:10px;">
        ${willCreate} of ${importState.groups.length}
        group(s) will actually be created.
    </p>
    `;
}


/* =====================================================
   STEP 3 -> 4 : CONFIRM
===================================================== */

async function confirmImportGroups() {

    const ok = await showConfirm(
        "Create these groups now? This cannot be undone " +
        "automatically - review the list above first.",
        "Confirm Import",
        { okLabel: "Import" }
    );

    if (!ok) return;

    const result = commitImportedGroups();

    const doneEl =
        document.getElementById("importDoneBody");

    if (doneEl) {

        doneEl.innerHTML = `
        <p><strong>${result.created.length}</strong>
           group(s) created:
           ${result.created.join(", ") || "none"}</p>
        ${
            result.skipped.length > 0
                ? "<p><strong>" + result.skipped.length +
                  "</strong> group(s) skipped (already " +
                  "existed): " + result.skipped.join(", ") +
                  "</p>"
                : ""
        }
        `;
    }

    showImportStep(4);

    if (typeof refreshEntireDashboard === "function") {

        refreshEntireDashboard();
    }
}


/* =====================================================
   EVENT BINDINGS
===================================================== */

function initializeImportEvents() {

    document
        .getElementById("btnOpenImportModal")
        ?.addEventListener("click", openImportModal);

    document
        .getElementById("btnCloseImportModal")
        ?.addEventListener("click", closeImportModal);

    document
        .getElementById("importFileInput")
        ?.addEventListener("change", function () {

            handleImportFileSelected(this.files[0]);

        });

    document
        .getElementById("importHeaderRowInput")
        ?.addEventListener("change", function () {

            changeImportHeaderRow(this.value);

        });

    document
        .getElementById("btnImportToReview")
        ?.addEventListener("click", proceedToImportReview);

    document
        .getElementById("btnImportBackToMapping")
        ?.addEventListener("click", function () {

            showImportStep(2);

        });

    document
        .getElementById("btnConfirmImport")
        ?.addEventListener("click", confirmImportGroups);

    document
        .getElementById("btnFinishImport")
        ?.addEventListener("click", closeImportModal);

    document
        .getElementById("importModal")
        ?.addEventListener("click", function (event) {

            if (event.target === this) {

                closeImportModal();
            }

        });

}

document.addEventListener(
    "DOMContentLoaded",
    initializeImportEvents
);


registerModuleVersion("import.js", "1.0.0");