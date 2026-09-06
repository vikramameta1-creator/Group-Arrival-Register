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
    { key: "roomNo",     label: "Room No",     keywords: ["room", "rm no", "room no"] },
    { key: "category",   label: "Category",    keywords: ["category", "room type", "type"] },
    { key: "guestName",  label: "Guest Name",  keywords: ["guest", "name", "pax name"] },
    { key: "pax",        label: "Pax",         keywords: ["pax", "adults", "occupancy"] },
    { key: "children",   label: "Children",    keywords: ["child", "kids", "cwb"] },
    { key: "meal",       label: "Meal Plan",   keywords: ["meal", "plan", "mp"] },
    { key: "mobile",     label: "Mobile",      keywords: ["mobile", "phone", "contact"] },
    { key: "agent",      label: "Agent",       keywords: ["agent", "company", "operator"] },
    { key: "ignore",     label: "Ignore this column", keywords: [] }
];

const IMPORT_MEAL_PLANS = ["EP", "CP", "MAP", "AP"];

/* Rows in the first HEADER_SCAN_LIMIT rows are checked
   for header-like content; the highest-scoring row with
   at least HEADER_MIN_SCORE keyword matches wins. Below
   that threshold, row 1 is used and the developer adjusts
   by hand via the "data starts at row" control. */

const HEADER_SCAN_LIMIT = 20;
const HEADER_MIN_SCORE  = 2;


/* =====================================================
   STATE

   Nothing here is persisted - this only exists for the
   duration of one import session, reset every time the
   modal opens fresh.
===================================================== */

let importState = {

    rawRows:     [],   // every row from the file, unmodified
    headerRow:   0,    // index into rawRows treated as headers
    mapping:     {},   // { columnIndex: fieldKey }
    groups:      [],   // built after mapping, before commit
    arrivalDate: ""

};


function resetImportState() {

    importState = {
        rawRows:     [],
        headerRow:   0,
        mapping:     {},
        groups:      [],
        arrivalDate: ""
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

    const groupNameCol  = getMappedColumnIndex("groupName");
    const roomCol        = getMappedColumnIndex("roomNo");
    const categoryCol    = getMappedColumnIndex("category");
    const guestCol       = getMappedColumnIndex("guestName");
    const paxCol         = getMappedColumnIndex("pax");
    const childrenCol    = getMappedColumnIndex("children");
    const mealCol        = getMappedColumnIndex("meal");
    const mobileCol      = getMappedColumnIndex("mobile");
    const agentCol       = getMappedColumnIndex("agent");

    const groupsByKey = {};

    const orderedKeys = [];

    const warnings = [];

    dataRows.forEach((row, rowIndex) => {

        const isBlankRow =
            row.every(cell => String(cell || "").trim() === "");

        if (isBlankRow) return;

        const rawGroupName =
            groupNameCol >= 0
                ? String(row[groupNameCol] || "").trim()
                : "";

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
                duplicateOfExisting: false

            };

            orderedKeys.push(key);
        }

        const roomNo =
            roomCol >= 0 ? String(row[roomCol] || "").trim() : "";

        const pax =
            paxCol >= 0
                ? Number(row[paxCol]) || 1
                : 1;

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

        groupsByKey[key].rooms.push({

            roomNo:            roomNo,
            guestName:
                guestCol >= 0
                    ? String(row[guestCol] || "").trim()
                    : "",
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
            arrivalDate:   importState.arrivalDate,
            departureDate:
                typeof addDaysToDate === "function"
                    ? addDaysToDate(importState.arrivalDate, 1)
                    : "",
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


function changeImportColumnMapping(index, value) {

    importState.mapping[index] = value;
}


function changeImportHeaderRow(value) {

    const rowNumber = Number(value);

    if (isNaN(rowNumber) || rowNumber < 1) return;

    importState.headerRow = rowNumber - 1;

    renderColumnMappingStep();
}


/* =====================================================
   STEP 2 -> 3 : REVIEW
===================================================== */

async function proceedToImportReview() {

    const groupNameCol = getMappedColumnIndex("groupName");

    if (groupNameCol < 0) {

        await showAlert(
            "Map one column to \"Group Name\" before " +
            "continuing - it's what splits the file into " +
            "separate groups."
        );

        return;
    }

    const arrivalDate =
        document.getElementById("importArrivalDate")
            ?.value || "";

    if (!arrivalDate) {

        await showAlert(
            "Set the arrival date to apply to every " +
            "imported group."
        );

        return;
    }

    importState.arrivalDate = arrivalDate;

    const result = buildGroupsFromMapping();

    renderImportReview(result.warnings);

    showImportStep(3);
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

    importState.groups.forEach(group => {

        const pax =
            group.rooms.reduce(
                (t, r) => t + (Number(r.pax) || 0), 0
            );

        if (group.duplicateOfExisting) {

            rows += `
            <tr class="import-row-skipped">
                <td>${group.groupName}</td>
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
                <td>${group.groupName}</td>
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