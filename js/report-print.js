/* =====================================================
   HOTEL GROUP OPERATIONS SUITE
   File    : js/report-print.js
   Version : 1.0.0 RC1

   PRINTABLE OPERATIONAL REPORTS

   Front office reports are organised by AUDIENCE and
   BUSINESS DATE, not by data type. Each one is printed,
   handed over at shift change and filed.

       A  Daily Arrival Manifest      front office / duty manager
       B  Housekeeping Allocation     housekeeping
       C  Food & Beverage Covers      kitchen / restaurant
       D  Management Flash            GM / owner

   NOT possible with the current data model:
       revenue, ADR, RevPAR   - no rates
       departure manifest     - no departure date
       housekeeping status    - no room status
       in-house guest list    - no stay dates

   Those need the v1.1 rate and departure-date work.
   Nothing here is estimated or invented.

   Depends on:
       printing.js     openPrintWindow, escapeHTML
       database.js     GroupRepository
       room-master.js  getRoomCategory, RoomMasterRepository
       register.js     isEmptyRegisterRow
       dialog.js       showAlert

   Load AFTER reports.js, BEFORE app.js.
===================================================== */


/* =====================================================
   SHARED HELPERS
===================================================== */

function reportPrintEscape(value) {

    if (typeof escapeHTML === "function") {

        return escapeHTML(value);
    }

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}


function getReportDate() {

    const input =
        document.getElementById("printReportDate");

    const value = input?.value || "";

    if (value) return value;

    return typeof getTodayString === "function"
        ? getTodayString()
        : new Date().toISOString().slice(0, 10);
}


function getReportDateTo() {

    const input =
        document.getElementById("printReportDateTo");

    return input?.value || "";
}


function getHotelName() {

    return (
        typeof DB !== "undefined" &&
        DB.settings &&
        DB.settings.hotelName
    ) || "Hotel Group Operations Suite";
}


function getGroupsForDate(date) {

    return GroupRepository
        .getAll()
        .filter(group =>
            (group.arrivalDate || "") === date &&
            (group.status || "") !== "Cancelled"
        );
}


function getGroupsInRange(from, to) {

    return GroupRepository
        .getAll()
        .filter(group => {

            const arrival = group.arrivalDate || "";

            if (!arrival) return false;

            if (from && arrival < from) return false;

            if (to && arrival > to) return false;

            return true;

        });
}


function getRoomsForDepartureDate(date) {

    /* Filters by ROOM, not group - DEP5c established that
       individual rooms can leave on their own date via
       room.departureOverride, so a group-level filter here
       would miss or wrongly include rooms. Reuses
       getRoomDepartureDate() unchanged, same precedence
       the occupancy report and the automatic Checked-Out
       transition already rely on. */

    const entries = [];

    GroupRepository.getAll().forEach(group => {

        if ((group.status || "") === "Cancelled") return;

        getRealRooms(group).forEach(room => {

            const departure =
                typeof getRoomDepartureDate === "function"
                    ? getRoomDepartureDate(group, room)
                    : (group.departureDate || "");

            if (departure === date) {

                entries.push({ group: group, room: room });
            }

        });

    });

    return entries;
}


function getRealRooms(group) {

    return (group.rooms || []).filter(room =>

        typeof isEmptyRegisterRow === "function"
            ? !isEmptyRegisterRow(room)
            : !!(room.roomNo || room.guestName)
    );
}


function summariseRooms(rooms) {

    const totals = {

        rooms:    rooms.length,
        pax:      0,
        adults:   0,
        children: 0,
        vip:      0,
        EP: 0, CP: 0, MAP: 0, AP: 0, NONE: 0

    };

    rooms.forEach(room => {

        const pax = Number(room.pax) || 0;

        const children = Number(room.children) || 0;

        totals.pax += pax;

        totals.children += children;

        totals.adults += Math.max(pax - children, 0);

        if (room.vip) totals.vip++;

        const meal = (room.meal || "").toUpperCase();

        if (totals.hasOwnProperty(meal) && meal !== "") {

            totals[meal] += pax;

        } else {

            totals.NONE += pax;
        }

    });

    return totals;
}


/* =====================================================
   DOCUMENT HEADER
===================================================== */

function buildReportHeader(title, subtitle) {

    return `

<div class="doc-hotel">${reportPrintEscape(getHotelName())}</div>

<div class="doc-title">${reportPrintEscape(title)}</div>

<table class="doc-meta">

    <tr>
        <td class="label">Period</td>
        <td>${reportPrintEscape(subtitle)}</td>

        <td class="label">Printed</td>
        <td>${reportPrintEscape(new Date().toLocaleString())}</td>

        <td class="label">Page</td>
        <td>1</td>
    </tr>

</table>

`;
}


function buildSignOff(labels) {

    let cells = "";

    labels.forEach((label, index) => {

        if (index > 0) {

            cells += `<td class="spacer"></td>`;
        }

        cells += `<td>${reportPrintEscape(label)}</td>`;

    });

    return `

<table class="doc-signoff">
    <tr>${cells}</tr>
</table>

`;
}


function buildNoDataDocument(title, subtitle, message) {

    return (
        buildReportHeader(title, subtitle) +
        `<p style="text-align:center;padding:40px 0;
                   font-size:14px;">
            ${reportPrintEscape(message)}
         </p>`
    );
}


/* =====================================================
   REPORT A : DAILY ARRIVAL MANIFEST
===================================================== */

/* =====================================================
   BLANK MANIFEST FALLBACK

   If no groups are scheduled for the requested date, a
   blank arrival register is printed instead of a bare
   "no data" page - so front office has a usable, ready
   form in hand rather than a note saying nothing exists.
   The page states plainly why it is blank, so it is
   self-explanatory to anyone who finds it later.
===================================================== */

function printBlankManifestFallback(date) {

    const rowCount = 25;

    let tableRows = "";

    for (let i = 1; i <= rowCount; i++) {

        tableRows += `
        <tr>
            <td>${i}</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
        </tr>
        `;
    }

    const html = `

${buildReportHeader(
    "DAILY GROUP ARRIVAL MANIFEST",
    "Arrivals on " + date
)}

<p class="doc-warning">
    No groups are currently scheduled to arrive on
    ${reportPrintEscape(date)}. A blank register is
    provided below for manual use.
    Printed ${reportPrintEscape(new Date().toLocaleString())}.
</p>

<table class="doc-table">

    <thead>
        <tr>
            <th>Sr</th>
            <th>Room</th>
            <th>Guest Name</th>
            <th>Pax</th>
            <th>Meal</th>
            <th>Mobile No</th>
            <th>Guest Signature</th>
        </tr>
    </thead>

    <tbody>${tableRows}</tbody>

</table>

${buildSignOff(["Front Office", "Duty Manager"])}

`;

    const styles =
        REGISTER_COLUMN_STYLES +
        `
        table.doc-table td{ height:34px; }
        `;

    openPrintWindow(
        "Daily Arrival Manifest — Blank",
        html,
        styles
    );
}


function printArrivalManifest() {

    const date = getReportDate();

    const groups = getGroupsForDate(date);

    const title = "DAILY GROUP ARRIVAL MANIFEST";

    if (groups.length === 0) {

        printBlankManifestFallback(date);

        return;
    }

    const grand = {
        rooms: 0, pax: 0, adults: 0, children: 0, vip: 0,
        EP: 0, CP: 0, MAP: 0, AP: 0
    };

    let rows = "";

    groups.forEach((group, index) => {

        const totals =
            summariseRooms(getRealRooms(group));

        Object.keys(grand).forEach(key => {

            grand[key] += totals[key];

        });

        rows += `
        <tr>
            <td>${index + 1}</td>
            <td><strong>${reportPrintEscape(group.groupName)}</strong></td>
            <td>${reportPrintEscape(group.agent) || "&nbsp;"}</td>
            <td>${reportPrintEscape(group.status || "Pending")}</td>
            <td>${totals.rooms}</td>
            <td>${totals.pax}</td>
            <td>${totals.adults}</td>
            <td>${totals.children}</td>
            <td>${totals.EP || ""}</td>
            <td>${totals.CP || ""}</td>
            <td>${totals.MAP || ""}</td>
            <td>${totals.AP || ""}</td>
            <td>${totals.vip || ""}</td>
        </tr>
        `;

    });

    const html = `

${buildReportHeader(title, "Arrivals on " + date)}

<table class="doc-table">

    <thead>
        <tr>
            <th>Sr</th>
            <th>Group</th>
            <th>Agent / Company</th>
            <th>Status</th>
            <th>Rooms</th>
            <th>Pax</th>
            <th>Adt</th>
            <th>Chd</th>
            <th>EP</th>
            <th>CP</th>
            <th>MAP</th>
            <th>AP</th>
            <th>VIP</th>
        </tr>
    </thead>

    <tbody>${rows}</tbody>

    <tfoot>
        <tr class="total-row">
            <td colspan="4">TOTAL — ${groups.length} group(s)</td>
            <td>${grand.rooms}</td>
            <td>${grand.pax}</td>
            <td>${grand.adults}</td>
            <td>${grand.children}</td>
            <td>${grand.EP}</td>
            <td>${grand.CP}</td>
            <td>${grand.MAP}</td>
            <td>${grand.AP}</td>
            <td>${grand.vip}</td>
        </tr>
    </tfoot>

</table>

${buildSignOff(["Front Office", "Duty Manager", "General Manager"])}

`;

    const styles = `

table.doc-table th,
table.doc-table td{ text-align:center; }

table.doc-table th:nth-child(2),
table.doc-table td:nth-child(2),
table.doc-table th:nth-child(3),
table.doc-table td:nth-child(3){ text-align:left; }

table.doc-table th:nth-child(1),
table.doc-table td:nth-child(1){ width:4%; }

table.doc-table th:nth-child(2),
table.doc-table td:nth-child(2){ width:20%; }

table.doc-table th:nth-child(3),
table.doc-table td:nth-child(3){ width:18%; }

table.doc-table th:nth-child(4),
table.doc-table td:nth-child(4){ width:10%; }

table.doc-table td{ height:24px; }

tfoot .total-row td{
    font-weight:bold;
    background:#e8e8e8;
    text-align:center;
}

tfoot .total-row td:first-child{ text-align:right; }

`;

    openPrintWindow(title, html, styles);
}


/* =====================================================
   REPORT B : HOUSEKEEPING ALLOCATION SHEET
===================================================== */

function printHousekeepingSheet() {

    const date = getReportDate();

    const groups = getGroupsForDate(date);

    const title = "HOUSEKEEPING ALLOCATION SHEET";

    const entries = [];

    groups.forEach(group => {

        getRealRooms(group).forEach(room => {

            entries.push({
                room:     room.roomNo || "",
                category: typeof getRoomCategory === "function"
                              ? getRoomCategory(room.roomNo)
                              : "",
                group:    group.groupName || "",
                guest:    room.guestName || "",
                pax:      Number(room.pax) || 0,
                children: Number(room.children) || 0,
                vip:      !!room.vip,
                request:  room.specialRequest || ""
            });

        });

    });

    if (entries.length === 0) {

        openPrintWindow(
            title,
            buildNoDataDocument(
                title,
                "Arrivals on " + date,
                "No rooms allocated for this date."
            ),
            ""
        );

        return;
    }

    /* Group by category, then by room number */

    const byCategory = {};

    entries.forEach(entry => {

        const key = entry.category || "Unassigned";

        if (!byCategory[key]) byCategory[key] = [];

        byCategory[key].push(entry);

    });

    let body = "";

    let vipTotal = 0;
    let requestTotal = 0;

    Object.keys(byCategory).sort().forEach(category => {

        const list =
            byCategory[category].sort((a, b) => {

                const na = parseInt(a.room, 10);
                const nb = parseInt(b.room, 10);

                if (!isNaN(na) && !isNaN(nb) && na !== nb) {

                    return na - nb;
                }

                return String(a.room).localeCompare(b.room);

            });

        const pax =
            list.reduce((t, e) => t + e.pax, 0);

        body += `
        <tr class="group-row">
            <td colspan="7">
                ${reportPrintEscape(category)}
                &nbsp;—&nbsp; ${list.length} room(s),
                ${pax} guest(s)
            </td>
        </tr>
        `;

        list.forEach(entry => {

            if (entry.vip) vipTotal++;

            if (entry.request) requestTotal++;

            body += `
            <tr>
                <td>${reportPrintEscape(entry.room)}</td>
                <td>${reportPrintEscape(entry.group)}</td>
                <td>${reportPrintEscape(entry.guest)}</td>
                <td>${entry.pax}</td>
                <td>${entry.children || ""}</td>
                <td>${entry.vip ? "VIP" : ""}</td>
                <td>${reportPrintEscape(entry.request)}</td>
            </tr>
            `;

        });

    });

    const html = `

${buildReportHeader(title, "Arrivals on " + date)}

<table class="doc-table">

    <thead>
        <tr>
            <th>Room</th>
            <th>Group</th>
            <th>Guest Name</th>
            <th>Pax</th>
            <th>Chd</th>
            <th>VIP</th>
            <th>Special Request</th>
        </tr>
    </thead>

    <tbody>${body}</tbody>

</table>

<table class="doc-totals">
    <tr>
        <td class="label">Rooms</td>
        <td class="label">Guests</td>
        <td class="label">VIP Rooms</td>
        <td class="label">Special Requests</td>
    </tr>
    <tr>
        <td>${entries.length}</td>
        <td>${entries.reduce((t, e) => t + e.pax, 0)}</td>
        <td>${vipTotal}</td>
        <td>${requestTotal}</td>
    </tr>
</table>

${buildSignOff(["Housekeeping", "Front Office"])}

<div class="doc-footer">
    Internal document — Housekeeping
</div>

`;

    const styles = `

table.doc-table th:nth-child(1),
table.doc-table td:nth-child(1){ width:8%;  text-align:center; }

table.doc-table th:nth-child(2),
table.doc-table td:nth-child(2){ width:18%; }

table.doc-table th:nth-child(3),
table.doc-table td:nth-child(3){ width:22%; }

table.doc-table th:nth-child(4),
table.doc-table td:nth-child(4){ width:6%;  text-align:center; }

table.doc-table th:nth-child(5),
table.doc-table td:nth-child(5){ width:6%;  text-align:center; }

table.doc-table th:nth-child(6),
table.doc-table td:nth-child(6){ width:6%;  text-align:center;
                                 font-weight:bold; }

table.doc-table th:nth-child(7),
table.doc-table td:nth-child(7){ width:34%; }

table.doc-table td{ height:24px; }

tr.group-row td{
    background:#e8e8e8;
    font-weight:bold;
    text-align:left;
}

`;

    openPrintWindow(title, html, styles);
}


/* =====================================================
   REPORT C : FOOD & BEVERAGE COVERS
===================================================== */

function printCoversSheet() {

    const date = getReportDate();

    const groups = getGroupsForDate(date);

    const title = "FOOD & BEVERAGE COVERS SHEET";

    if (groups.length === 0) {

        openPrintWindow(
            title,
            buildNoDataDocument(
                title,
                "Arrivals on " + date,
                "No arrivals recorded for this date."
            ),
            ""
        );

        return;
    }

    const plans = ["EP", "CP", "MAP", "AP"];

    const grandPlan = { EP: 0, CP: 0, MAP: 0, AP: 0, NONE: 0 };

    const grandChild = { EP: 0, CP: 0, MAP: 0, AP: 0, NONE: 0 };

    let rows = "";

    groups.forEach(group => {

        const perPlan =
            { EP: 0, CP: 0, MAP: 0, AP: 0, NONE: 0 };

        const perChild =
            { EP: 0, CP: 0, MAP: 0, AP: 0, NONE: 0 };

        getRealRooms(group).forEach(room => {

            const pax = Number(room.pax) || 0;

            const children = Number(room.children) || 0;

            const meal =
                (room.meal || "").toUpperCase();

            const key =
                plans.indexOf(meal) >= 0 ? meal : "NONE";

            perPlan[key] += pax;

            perChild[key] += children;

        });

        Object.keys(perPlan).forEach(key => {

            grandPlan[key] += perPlan[key];

            grandChild[key] += perChild[key];

        });

        const total =
            perPlan.EP + perPlan.CP +
            perPlan.MAP + perPlan.AP;

        rows += `
        <tr>
            <td>${reportPrintEscape(group.groupName)}</td>
            <td>${perPlan.EP  || ""}</td>
            <td>${perPlan.CP  || ""}</td>
            <td>${perPlan.MAP || ""}</td>
            <td>${perPlan.AP  || ""}</td>
            <td>${total}</td>
            <td>${
                (perChild.EP + perChild.CP +
                 perChild.MAP + perChild.AP) || ""
            }</td>
            <td>${perPlan.NONE || ""}</td>
        </tr>
        `;

    });

    const grandTotal =
        grandPlan.EP + grandPlan.CP +
        grandPlan.MAP + grandPlan.AP;

    const grandChildTotal =
        grandChild.EP + grandChild.CP +
        grandChild.MAP + grandChild.AP;

    let warning = "";

    if (grandPlan.NONE > 0) {

        warning = `
        <p class="doc-warning">
            ${grandPlan.NONE} guest(s) have no meal plan
            recorded. Confirm with the front office before
            ordering.
        </p>
        `;
    }

    const html = `

${buildReportHeader(title, "Arrivals on " + date)}

<table class="doc-table">

    <thead>
        <tr>
            <th>Group</th>
            <th>EP<br><span class="sub">Room only</span></th>
            <th>CP<br><span class="sub">Breakfast</span></th>
            <th>MAP<br><span class="sub">Half board</span></th>
            <th>AP<br><span class="sub">Full board</span></th>
            <th>Total<br><span class="sub">Covers</span></th>
            <th>Of which<br><span class="sub">Children</span></th>
            <th>Not Set</th>
        </tr>
    </thead>

    <tbody>${rows}</tbody>

    <tfoot>
        <tr class="total-row">
            <td>TOTAL — ${groups.length} group(s)</td>
            <td>${grandPlan.EP}</td>
            <td>${grandPlan.CP}</td>
            <td>${grandPlan.MAP}</td>
            <td>${grandPlan.AP}</td>
            <td>${grandTotal}</td>
            <td>${grandChildTotal}</td>
            <td>${grandPlan.NONE}</td>
        </tr>
    </tfoot>

</table>

${warning}

<table class="doc-totals">
    <tr>
        <td class="label">Breakfast covers</td>
        <td class="label">Lunch covers</td>
        <td class="label">Dinner covers</td>
    </tr>
    <tr>
        <td>${grandPlan.CP + grandPlan.MAP + grandPlan.AP}</td>
        <td>${grandPlan.AP}</td>
        <td>${grandPlan.MAP + grandPlan.AP}</td>
    </tr>
</table>

<p class="doc-note">
    Breakfast = CP + MAP + AP &nbsp;·&nbsp;
    Lunch = AP &nbsp;·&nbsp;
    Dinner = MAP + AP
</p>

${buildSignOff(["Food & Beverage", "Front Office"])}

`;

    const styles = `

table.doc-table th,
table.doc-table td{ text-align:center; }

table.doc-table th:nth-child(1),
table.doc-table td:nth-child(1){ width:30%; text-align:left; }

table.doc-table td{ height:26px; }

.sub{ font-weight:normal; font-size:9px; }

tfoot .total-row td{
    font-weight:bold;
    background:#e8e8e8;
}

tfoot .total-row td:first-child{ text-align:left; }

.doc-warning{
    border:1px solid #000;
    padding:8px 10px;
    margin-top:10px;
    font-size:11px;
    font-weight:bold;
}

.doc-note{
    font-size:10px;
    margin-top:8px;
    text-align:center;
}

`;

    openPrintWindow(title, html, styles);
}


/* =====================================================
   REPORT D : MANAGEMENT FLASH
===================================================== */

function printManagementFlash() {

    const from = getReportDate();

    const to = getReportDateTo() || from;

    const groups = getGroupsInRange(from, to);

    const title = "MANAGEMENT FLASH REPORT";

    const period =
        from === to ? from : from + "  to  " + to;

    if (groups.length === 0) {

        openPrintWindow(
            title,
            buildNoDataDocument(
                title,
                period,
                "No groups arriving in this period."
            ),
            ""
        );

        return;
    }

    /* ---------- Aggregate ---------- */

    const statuses = {};
    const agents = {};
    const categories = {};
    const byDate = {};

    let allRooms = [];

    groups.forEach(group => {

        const status =
            (group.status || "Pending").trim();

        statuses[status] = (statuses[status] || 0) + 1;

        const agent =
            (group.agent || "Direct").trim() || "Direct";

        if (!agents[agent]) {

            agents[agent] = { groups: 0, rooms: 0, pax: 0 };
        }

        agents[agent].groups++;

        const rooms = getRealRooms(group);

        allRooms = allRooms.concat(rooms);

        const totals = summariseRooms(rooms);

        agents[agent].rooms += totals.rooms;

        agents[agent].pax += totals.pax;

        const date = group.arrivalDate || "";

        if (date) {

            if (!byDate[date]) {

                byDate[date] = { rooms: {}, groups: 0 };
            }

            byDate[date].groups++;

            rooms.forEach(room => {

                const roomNo =
                    String(room.roomNo || "").trim();

                if (roomNo) {

                    byDate[date].rooms[roomNo] = true;
                }

            });
        }

        rooms.forEach(room => {

            const category =
                typeof getRoomCategory === "function"
                    ? getRoomCategory(room.roomNo)
                    : "";

            const key = category || "Unassigned";

            if (!categories[key]) {

                categories[key] = { rooms: 0, pax: 0 };
            }

            categories[key].rooms++;

            categories[key].pax += Number(room.pax) || 0;

        });

    });

    const grand = summariseRooms(allRooms);

    const inventory =
        typeof RoomMasterRepository !== "undefined"
            ? RoomMasterRepository.totalRooms()
            : 0;

    /* ---------- Blocks ---------- */

    let statusRows = "";

    Object.keys(statuses).sort().forEach(key => {

        statusRows += `
        <tr>
            <td>${reportPrintEscape(key)}</td>
            <td>${statuses[key]}</td>
        </tr>
        `;

    });

    let categoryRows = "";

    Object.keys(categories).sort().forEach(key => {

        categoryRows += `
        <tr>
            <td>${reportPrintEscape(key)}</td>
            <td>${categories[key].rooms}</td>
            <td>${categories[key].pax}</td>
        </tr>
        `;

    });

    let agentRows = "";

    Object.keys(agents)
        .sort((a, b) => agents[b].rooms - agents[a].rooms)
        .forEach(key => {

            agentRows += `
            <tr>
                <td>${reportPrintEscape(key)}</td>
                <td>${agents[key].groups}</td>
                <td>${agents[key].rooms}</td>
                <td>${agents[key].pax}</td>
            </tr>
            `;

        });

    let dateRows = "";

    Object.keys(byDate).sort().forEach(date => {

        const used =
            Object.keys(byDate[date].rooms).length;

        const percent =
            inventory > 0
                ? Math.round((used / inventory) * 100) + "%"
                : "—";

        dateRows += `
        <tr>
            <td>${date}</td>
            <td>${byDate[date].groups}</td>
            <td>${used}</td>
            <td>${inventory || "—"}</td>
            <td>${percent}</td>
        </tr>
        `;

    });

    /* ---------- Warnings ---------- */

    let warnings = "";

    const unassigned =
        categories["Unassigned"]
            ? categories["Unassigned"].rooms
            : 0;

    if (unassigned > 0) {

        warnings +=
            unassigned +
            " room(s) are not mapped to a category.<br>";
    }

    if (grand.NONE > 0) {

        warnings +=
            grand.NONE +
            " guest(s) have no meal plan recorded.<br>";
    }

    if (inventory === 0) {

        warnings +=
            "Room Master is empty — occupancy " +
            "percentages unavailable.<br>";
    }

    const warningBlock = warnings
        ? `<p class="doc-warning">
             <strong>Attention</strong><br>${warnings}
           </p>`
        : "";

    const html = `

${buildReportHeader(title, period)}

<table class="doc-totals">
    <tr>
        <td class="label">Groups</td>
        <td class="label">Rooms</td>
        <td class="label">Guests</td>
        <td class="label">Adults</td>
        <td class="label">Children</td>
        <td class="label">VIP</td>
        <td class="label">Avg Pax / Room</td>
    </tr>
    <tr>
        <td>${groups.length}</td>
        <td>${grand.rooms}</td>
        <td>${grand.pax}</td>
        <td>${grand.adults}</td>
        <td>${grand.children}</td>
        <td>${grand.vip}</td>
        <td>${
            grand.rooms > 0
                ? (grand.pax / grand.rooms).toFixed(2)
                : "0.00"
        }</td>
    </tr>
</table>

<div class="flash-grid">

    <div class="flash-block">
        <h4>Groups By Status</h4>
        <table class="doc-table small">
            <thead>
                <tr><th>Status</th><th>Groups</th></tr>
            </thead>
            <tbody>${statusRows}</tbody>
        </table>
    </div>

    <div class="flash-block">
        <h4>Rooms By Category</h4>
        <table class="doc-table small">
            <thead>
                <tr><th>Category</th><th>Rooms</th><th>Pax</th></tr>
            </thead>
            <tbody>${categoryRows}</tbody>
        </table>
    </div>

</div>

<h4 class="flash-heading">Occupancy By Arrival Date</h4>

<table class="doc-table small">
    <thead>
        <tr>
            <th>Date</th>
            <th>Groups</th>
            <th>Rooms Used</th>
            <th>Inventory</th>
            <th>Occupancy</th>
        </tr>
    </thead>
    <tbody>${dateRows}</tbody>
</table>

<h4 class="flash-heading">Business By Agent</h4>

<table class="doc-table small">
    <thead>
        <tr>
            <th>Agent / Company</th>
            <th>Groups</th>
            <th>Rooms</th>
            <th>Guests</th>
        </tr>
    </thead>
    <tbody>${agentRows}</tbody>
</table>

${warningBlock}

<p class="doc-note">
    Occupancy is measured on each arrival date. Rooms
    reused on different dates are counted once per date.
    Revenue, ADR and RevPAR require rate and departure
    data, which this version does not hold.
</p>

${buildSignOff(["Front Office Manager", "General Manager"])}

`;

    const styles = `

.flash-grid{
    display:flex;
    gap:14px;
    margin-top:12px;
}

.flash-block{ flex:1; }

.flash-block h4,
.flash-heading{
    font-size:11px;
    text-transform:uppercase;
    letter-spacing:.06em;
    margin:12px 0 5px;
    text-align:left;
}

table.doc-table.small th,
table.doc-table.small td{
    font-size:10px;
    padding:4px;
    height:20px;
    text-align:center;
}

table.doc-table.small td:first-child,
table.doc-table.small th:first-child{ text-align:left; }

.doc-warning{
    border:1px solid #000;
    padding:8px 10px;
    margin-top:12px;
    font-size:11px;
}

.doc-note{
    font-size:9px;
    margin-top:10px;
    text-align:left;
}

`;

    openPrintWindow(title, html, styles);
}


/* =====================================================
   REPORT E : DAILY DEPARTURE MANIFEST
===================================================== */

function printBlankDepartureFallback(date) {

    const rowCount = 25;

    let tableRows = "";

    for (let i = 1; i <= rowCount; i++) {

        tableRows += `
        <tr>
            <td>${i}</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
        </tr>
        `;
    }

    const html = `

${buildReportHeader(
    "DAILY DEPARTURE MANIFEST",
    "Departures on " + date
)}

<p class="doc-warning">
    No rooms are currently scheduled to depart on
    ${reportPrintEscape(date)}. A blank checklist is
    provided below for manual use.
    Printed ${reportPrintEscape(new Date().toLocaleString())}.
</p>

<table class="doc-table">

<thead>
    <tr>
        <th>Sr</th>
        <th>Room</th>
        <th>Group</th>
        <th>Guest Name</th>
        <th>Pax</th>
        <th>Mobile No</th>
        <th>Departed</th>
    </tr>
</thead>

<tbody>${tableRows}</tbody>

</table>

${buildSignOff(["Front Office", "Duty Manager"])}

`;

    const styles =
        REGISTER_COLUMN_STYLES +
        `
        table.doc-table td{ height:34px; }
        `;

    openPrintWindow(
        "Daily Departure Manifest — Blank",
        html,
        styles
    );
}


function printDepartureManifest() {

    const date = getReportDate();

    const entries = getRoomsForDepartureDate(date);

    const title = "DAILY DEPARTURE MANIFEST";

    if (entries.length === 0) {

        printBlankDepartureFallback(date);

        return;
    }

    let rows = "";

    let totalPax = 0;

    let departedCount = 0;

    entries
        .sort((a, b) =>
            (a.group.groupName || "").localeCompare(
                b.group.groupName || ""
            )
        )
        .forEach((entry, index) => {

            const room = entry.room;

            const group = entry.group;

            const pax = Number(room.pax) || 0;

            totalPax += pax;

            if (room.checkedOut) departedCount++;

            rows += `
            <tr>
                <td>${index + 1}</td>
                <td>${reportPrintEscape(room.roomNo)}</td>
                <td>${reportPrintEscape(group.groupName)}</td>
                <td>${reportPrintEscape(room.guestName)}</td>
                <td>${pax}</td>
                <td>${reportPrintEscape(room.mobile) || "&nbsp;"}</td>
                <td>${room.meal ? reportPrintEscape(room.meal) : ""}</td>
                <td>${room.vip ? "VIP" : ""}</td>
                <td>${room.checkedOut ? "✓" : ""}</td>
            </tr>
            `;

        });

    const html = `

${buildReportHeader(title, "Departures on " + date)}

<table class="doc-table">

    <thead>
        <tr>
            <th>Sr</th>
            <th>Room</th>
            <th>Group</th>
            <th>Guest Name</th>
            <th>Pax</th>
            <th>Mobile</th>
            <th>Meal</th>
            <th>VIP</th>
            <th>Departed</th>
        </tr>
    </thead>

    <tbody>${rows}</tbody>

    <tfoot>
        <tr class="total-row">
            <td colspan="4">TOTAL — ${entries.length} room(s)</td>
            <td>${totalPax}</td>
            <td colspan="4">
                ${departedCount} of ${entries.length} already checked out
            </td>
        </tr>
    </tfoot>

</table>

<p class="doc-note">
    Departure date reflects each room's own checkout date,
    including any per-room override - not the group's
    general departure date where the two differ.
</p>

${buildSignOff(["Front Office", "Duty Manager"])}

`;

    const styles = `

table.doc-table th,
table.doc-table td{ text-align:center; }

table.doc-table th:nth-child(3),
table.doc-table td:nth-child(3),
table.doc-table th:nth-child(4),
table.doc-table td:nth-child(4){ text-align:left; }

table.doc-table th:nth-child(1),
table.doc-table td:nth-child(1){ width:4%; }

table.doc-table th:nth-child(3),
table.doc-table td:nth-child(3){ width:20%; }

table.doc-table th:nth-child(4),
table.doc-table td:nth-child(4){ width:20%; }

table.doc-table td{ height:24px; }

tfoot .total-row td{
    font-weight:bold;
    background:#e8e8e8;
}

tfoot .total-row td:first-child{ text-align:left; }

.doc-note{
    font-size:9px;
    margin-top:10px;
    text-align:left;
}

`;

    openPrintWindow(title, html, styles);
}


/* =====================================================
   DATE RANGE VISIBILITY
===================================================== */

function updateReportDateMode() {

    const wrap =
        document.getElementById("printReportDateToWrap");

    const select =
        document.getElementById("printReportType");

    if (!wrap || !select) return;

    wrap.style.display =
        select.value === "flash" ? "" : "none";
}


/* =====================================================
   PRINT DISPATCH
===================================================== */

function printSelectedReport() {

    const select =
        document.getElementById("printReportType");

    const type = select?.value || "manifest";

    if (typeof openPrintWindow !== "function") {

        showAlert(
            "Printing module is not loaded.",
            "Cannot Print"
        );

        return;
    }

    switch (type) {

        case "manifest":
            printArrivalManifest();
            break;

        case "housekeeping":
            printHousekeepingSheet();
            break;

        case "covers":
            printCoversSheet();
            break;

        case "flash":
            printManagementFlash();
            break;

        case "departure":
            printDepartureManifest();
            break;
    }
}


/* =====================================================
   STARTUP
===================================================== */

function initializeReportPrinting() {

    const dateInput =
        document.getElementById("printReportDate");

    if (dateInput && !dateInput.value) {

        dateInput.value =
            typeof getTodayString === "function"
                ? getTodayString()
                : new Date().toISOString().slice(0, 10);
    }

    document
        .getElementById("printReportType")
        ?.addEventListener("change", updateReportDateMode);

    document
        .getElementById("btnPrintSelectedReport")
        ?.addEventListener("click", printSelectedReport);

    updateReportDateMode();

}

registerModuleVersion("report-print.js", "1.0.0");