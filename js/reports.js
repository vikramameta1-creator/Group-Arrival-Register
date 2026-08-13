/* =====================================================
   HOTEL GROUP OPERATIONS SUITE
   File    : js/reports.js
   Version : 1.0.0 RC1

   REPORTS MODULE

   Scopes:
       current  - the group open in the Arrival Register
       all      - every saved group, with filters

   Occupancy rule:
       A room can be reused on different dates, so an
       occupancy percentage is only valid for ONE date.
       Current Group  -> measured on its arrival date.
       All Groups     -> reported per arrival date.

   Depends on app.js for:
       DB, GroupRepository, getRegisterRows(),
       isEmptyRegisterRow(), switchPage()

   Load AFTER room-master.js and BEFORE app.js
===================================================== */


/* =====================================================
   REPORT STATE
===================================================== */

let reportScope = "current";

const reportFilters = {

    dateFrom: "",
    dateTo:   "",
    status:   "",
    agent:    ""

};


/* =====================================================
   SAFE TEXT
===================================================== */

function reportEscape(value) {

    if (typeof escapeHTML === "function") {

        return escapeHTML(value);
    }

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}


/* =====================================================
   SCOPE CONTROL
===================================================== */

function setReportScope(scope) {

    reportScope =
        scope === "all" ? "all" : "current";

    updateReportScopeButtons();

    updateReports();
}


function updateReportScopeButtons() {

    document
        .querySelectorAll(".scope-btn")
        .forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.scope === reportScope
            );

        });

    const panel =
        document.getElementById("reportFilters");

    if (panel) {

        panel.style.display =
            reportScope === "all" ? "block" : "none";
    }
}


/* =====================================================
   FILTERS
===================================================== */

function countActiveFilters() {

    let count = 0;

    if (reportFilters.dateFrom) count++;
    if (reportFilters.dateTo)   count++;
    if (reportFilters.status)   count++;
    if (reportFilters.agent)    count++;

    return count;
}


function readReportFilters() {

    const value = id =>
        document.getElementById(id)?.value || "";

    reportFilters.dateFrom = value("reportFilterFrom");
    reportFilters.dateTo   = value("reportFilterTo");
    reportFilters.status   = value("reportFilterStatus");
    reportFilters.agent    = value("reportFilterAgent");

    updateReports();
}


function clearReportFilters() {

    reportFilters.dateFrom = "";
    reportFilters.dateTo   = "";
    reportFilters.status   = "";
    reportFilters.agent    = "";

    [
        "reportFilterFrom",
        "reportFilterTo",
        "reportFilterStatus",
        "reportFilterAgent"
    ]
    .forEach(id => {

        const el = document.getElementById(id);

        if (el) el.value = "";

    });

    updateReports();
}


function getFilteredGroups() {

    return GroupRepository
        .getAll()
        .filter(group => {

            const arrival =
                group.arrivalDate || "";

            if (reportFilters.dateFrom) {

                if (!arrival) return false;

                if (arrival < reportFilters.dateFrom) {

                    return false;
                }
            }

            if (reportFilters.dateTo) {

                if (!arrival) return false;

                if (arrival > reportFilters.dateTo) {

                    return false;
                }
            }

            if (reportFilters.status) {

                const status =
                    (group.status || "Pending").trim();

                if (status !== reportFilters.status) {

                    return false;
                }
            }

            if (reportFilters.agent) {

                const agent =
                    (group.agent || "").trim();

                if (agent !== reportFilters.agent) {

                    return false;
                }
            }

            return true;

        });
}


/* =====================================================
   AGENT DROPDOWN
===================================================== */

function populateAgentFilter() {

    const select =
        document.getElementById("reportFilterAgent");

    if (!select) return;

    const previous = select.value;

    const agents =
        [...new Set(
            GroupRepository
            .getAll()
            .map(group => (group.agent || "").trim())
            .filter(agent => agent !== "")
        )]
        .sort((a, b) => a.localeCompare(b));

    let html =
        `<option value="">All Agents</option>`;

    agents.forEach(agent => {

        const safe = reportEscape(agent);

        html +=
            `<option value="${safe}">${safe}</option>`;

    });

    select.innerHTML = html;

    select.value =
        agents.indexOf(previous) >= 0 ? previous : "";

    reportFilters.agent = select.value;
}


/* =====================================================
   ROOM MASTER INVENTORY
===================================================== */

function getInventorySnapshot() {

    const snapshot = {

        available: false,
        total:     0,
        byCategory: {}

    };

    if (typeof RoomMasterRepository === "undefined") {

        return snapshot;
    }

    const total =
        RoomMasterRepository.totalRooms();

    if (total === 0) {

        return snapshot;
    }

    snapshot.available = true;

    snapshot.total = total;

    const counts =
        RoomMasterRepository.countByCategory();

    Object.keys(counts).forEach(key => {

        const name = key === "" ? "Unassigned" : key;

        snapshot.byCategory[name] = counts[key];

    });

    return snapshot;
}


/* =====================================================
   NIGHTS IN A STAY (DEP5)

   Arrival date through the night before departure -
   standard hotel convention, checkout morning is not
   an occupied night. Groups saved before departureDate
   existed fall back to a single-night stay on their
   arrival date, same as previous behaviour. Capped at
   90 nights per group as a safety net against a typo'd
   far-future date turning into a runaway loop - this is
   defensive, not a real stay-length limit.
===================================================== */

function buildNightsInRange(arrivalDate, departureDate) {

    const nights = [];

    if (!arrivalDate) return nights;

    const start = new Date(arrivalDate + "T00:00:00");

    if (isNaN(start.getTime())) return nights;

    const end =
        departureDate
            ? new Date(departureDate + "T00:00:00")
            : null;

    if (!end || isNaN(end.getTime()) || end <= start) {

        nights.push(arrivalDate);

        return nights;
    }

    const MAX_NIGHTS = 90;

    const cursor = new Date(start);

    let count = 0;

    while (cursor < end && count < MAX_NIGHTS) {

        nights.push(cursor.toISOString().slice(0, 10));

        cursor.setDate(cursor.getDate() + 1);

        count++;
    }

    return nights;
}


/* =====================================================
   OCCUPANCY BY DATE (DEP5 - full stay, not just arrival)

   Every room in a group counts as occupied on every
   night of that group's actual stay, not only its
   arrival date. Conflict detection follows the same
   expansion - two groups sharing a room now gets caught
   whenever their stays overlap on any night, even if
   their arrival dates differ. Output shape (date / groups
   / rooms per entry) is unchanged, so nothing downstream
   - renderOccupancySummary(), buildReportsCSV() - needs
   to change.
===================================================== */

function buildDateOccupancy(groups) {

    const byDate = {};

    const conflicts = [];

    groups.forEach(group => {

        const nights = buildNightsInRange(
            group.arrivalDate || "",
            group.departureDate || ""
        );

        if (nights.length === 0) return;

        const groupName =
            group.groupName || "Unnamed Group";

        const realRooms =
            (group.rooms || [])
            .filter(room => !isEmptyRegisterRow(room));

        if (realRooms.length === 0) return;

        nights.forEach(date => {

            if (!byDate[date]) {

                byDate[date] = {
                    date:       date,
                    groups:     0,
                    groupsSeen: {},
                    claimed:    {},
                    rooms:      0
                };
            }

            const entry = byDate[date];

            if (!entry.groupsSeen[groupName]) {

                entry.groupsSeen[groupName] = true;

                entry.groups++;
            }

            realRooms.forEach(room => {

                const roomNo =
                    String(room.roomNo || "").trim();

                if (!roomNo) return;

                const owner = entry.claimed[roomNo];

                if (owner === undefined) {

                    entry.claimed[roomNo] = groupName;

                    entry.rooms++;

                    return;
                }

                /* Same room twice inside one group is a
                   shared room and is legitimate.
                   Across two groups, on any overlapping
                   night, it is a conflict. */

                if (owner !== groupName) {

                    conflicts.push({
                        date:  date,
                        room:  roomNo,
                        first: owner,
                        other: groupName
                    });
                }

            });

        });

    });

    const dates =
        Object.keys(byDate)
        .sort()
        .map(key => {

            const entry = byDate[key];

            return {
                date:   entry.date,
                groups: entry.groups,
                rooms:  entry.rooms
            };

        });

    return {
        dates:     dates,
        conflicts: conflicts
    };
}


/* =====================================================
   STATISTICS BUILDER
===================================================== */

function buildReportStats() {

    const stats = {

        scope:        reportScope,
        groupCount:   0,
        totalGroups:  0,
        roomCount:    0,
        pax:          0,
        vip:          0,
        statuses:     {},
        categories:   {},
        meals: {
            EP: 0,
            CP: 0,
            MAP: 0,
            AP: 0,
            NONE: 0
        },
        groupName:    "",
        arrivalDate:  "",
        status:       "",
        filtered:     false,
        empty:        true,

        inventory:    getInventorySnapshot(),
        dateRows:     [],
        conflicts:    [],
        uniqueRooms:  0,
        departureDate: "",
        stayNights:   [],
        stayConflicts: []

    };

    let rows = [];

    if (reportScope === "current") {

        rows =
            getRegisterRows()
            .filter(row => !isEmptyRegisterRow(row));

        const value = id =>
            document.getElementById(id)?.value || "";

        stats.groupName    = value("groupName");
        stats.arrivalDate  = value("arrivalDate");
        stats.departureDate = value("departureDate");
        stats.status       = value("groupStatus");

        if (rows.length > 0) {

            stats.groupCount = 1;

            stats.statuses[stats.status || "Pending"] = 1;
        }

        /* Distinct rooms, so shared rooms are counted once */

        const seen = {};

        rows.forEach(row => {

            const roomNo =
                String(row.roomNo || "").trim();

            if (roomNo) seen[roomNo] = true;

        });

        stats.uniqueRooms = Object.keys(seen).length;

        /* ---------- Hotel-wide occupancy across this stay ----------

           Reuses buildDateOccupancy() (DEP5) unchanged. The live,
           possibly-unsaved on-screen group stands in for itself -
           excluded from "every other saved group" by id, so an
           already-saved group being actively edited doesn't get
           counted twice. A genuine shared-room conflict between the
           live group and another saved group still surfaces via the
           same conflicts array DEP5 already produces. */

        if (stats.arrivalDate && rows.length > 0) {

            const selfId =
                typeof currentGroupId !== "undefined"
                    ? currentGroupId
                    : null;

            const otherGroups =
                (
                    typeof GroupRepository !== "undefined"
                        ? GroupRepository.getAll()
                        : []
                )
                .filter(group => group.id !== selfId);

            const liveGroup = {
                id:            selfId,
                groupName:     stats.groupName ||
                               "Current Group (unsaved)",
                arrivalDate:   stats.arrivalDate,
                departureDate: stats.departureDate,
                rooms:         rows
            };

            const combined =
                buildDateOccupancy(
                    [liveGroup].concat(otherGroups)
                );

            const myNights =
                buildNightsInRange(
                    stats.arrivalDate,
                    stats.departureDate
                );

            const nightMap = {};

            combined.dates.forEach(entry => {

                nightMap[entry.date] = entry.rooms;
            });

            stats.stayNights =
                myNights.map(date => ({
                    date:  date,
                    rooms: nightMap[date] || stats.uniqueRooms
                }));

            stats.stayConflicts =
                combined.conflicts.filter(conflict =>
                    myNights.indexOf(conflict.date) !== -1
                );
        }

    } else {

        const groups = getFilteredGroups();

        stats.totalGroups =
            GroupRepository.count();

        stats.groupCount = groups.length;

        stats.filtered =
            countActiveFilters() > 0;

        groups.forEach(group => {

            const status =
                (group.status || "Pending").trim();

            stats.statuses[status] =
                (stats.statuses[status] || 0) + 1;

            (group.rooms || []).forEach(room => {

                if (!isEmptyRegisterRow(room)) {

                    rows.push(room);
                }

            });

        });

        const occupancy =
            buildDateOccupancy(groups);

        stats.dateRows  = occupancy.dates;

        stats.conflicts = occupancy.conflicts;

    }

    /* ---------- Aggregate ---------- */

    rows.forEach(row => {

        const pax = Number(row.pax) || 0;

        stats.pax += pax;

        if (row.vip) stats.vip++;

        const meal =
            (row.meal || "").toUpperCase();

        if (stats.meals.hasOwnProperty(meal)) {

            stats.meals[meal] += pax;

        } else {

            stats.meals.NONE += pax;
        }

        const category =
            typeof getRoomCategory === "function"
                ? getRoomCategory(row.roomNo)
                : "";

        const key = category || "Unassigned";

        stats.categories[key] =
            (stats.categories[key] || 0) + 1;

    });

    stats.roomCount = rows.length;

    stats.empty = rows.length === 0;

    return stats;
}


/* =====================================================
   HTML HELPERS
===================================================== */

function buildStatRows(pairs) {

    let html =
        `<table class="data-table report-table"><tbody>`;

    pairs.forEach(pair => {

        html += `
        <tr>
            <td>${pair[0]}</td>
            <td class="report-value">${pair[1]}</td>
        </tr>
        `;

    });

    html += `</tbody></table>`;

    return html;
}


function buildOccupancyBar(used, total) {

    const percent =
        total > 0
            ? Math.round((used / total) * 100)
            : 0;

    let level = "bar-low";

    if (percent >= 100) {

        level = "bar-full";

    } else if (percent >= 75) {

        level = "bar-high";

    } else if (percent >= 40) {

        level = "bar-mid";
    }

    const width = Math.min(percent, 100);

    return `
    <div class="occ-row">
        <div class="occ-track">
            <div class="occ-fill ${level}"
                 style="width:${width}%"></div>
        </div>
        <span class="occ-text">
            ${used}/${total} — ${percent}%
        </span>
    </div>
    `;
}


function buildEmptyState(message, actionLabel, actionPage) {

    let html =
        `<div class="report-empty">
            <p>${message}</p>`;

    if (actionLabel && actionPage) {

        html +=
            `<button onclick="switchPage('${actionPage}')">
                ${actionLabel}
            </button>`;
    }

    html += `</div>`;

    return html;
}


/* =====================================================
   SCOPE LABEL
===================================================== */

function renderScopeLabel(stats) {

    const label =
        document.getElementById("reportScopeLabel");

    if (!label) return;

    if (stats.scope === "current") {

        label.textContent =
            "Showing the group open in the Arrival Register";

        label.classList.remove("filter-active");

        return;
    }

    if (stats.filtered) {

        label.textContent =
            "Showing " +
            stats.groupCount +
            " of " +
            stats.totalGroups +
            " groups — " +
            countActiveFilters() +
            " filter(s) active";

        label.classList.add("filter-active");

        return;
    }

    label.textContent =
        "Showing all " +
        stats.totalGroups +
        " saved groups";

    label.classList.remove("filter-active");
}


/* =====================================================
   CARD : ARRIVAL SUMMARY
===================================================== */

function renderArrivalSummary(stats) {

    const target =
        document.getElementById("reportArrivalSummary");

    if (!target) return;

    if (stats.empty) {

        if (stats.scope === "current") {

            target.innerHTML =
                buildEmptyState(
                    "No rows in the Arrival Register.",
                    "Go to Arrival Register",
                    "arrivalPage"
                );

            return;
        }

        if (stats.filtered) {

            target.innerHTML =
                buildEmptyState(
                    "No groups match the current filters."
                );

            return;
        }

        target.innerHTML =
            buildEmptyState(
                "No saved groups yet.",
                "Create a Group",
                "arrivalPage"
            );

        return;
    }

    const pairs = [];

    if (stats.scope === "current") {

        pairs.push([
            "Group",
            reportEscape(stats.groupName) ||
                "<em>Unnamed</em>"
        ]);

        pairs.push([
            "Arrival Date",
            stats.arrivalDate || "—"
        ]);

        pairs.push([
            "Status",
            stats.status || "Pending"
        ]);

    } else {

        pairs.push(["Groups Matched", stats.groupCount]);
    }

    pairs.push(["Total Rooms", stats.roomCount]);
    pairs.push(["Total Pax",   stats.pax]);
    pairs.push(["VIP Guests",  stats.vip]);

    let html = buildStatRows(pairs);

    if (stats.scope === "all") {

        const statusKeys =
            Object.keys(stats.statuses).sort();

        if (statusKeys.length > 0) {

            html +=
                `<h4 class="report-subhead">By Status</h4>`;

            html += buildStatRows(
                statusKeys.map(key => [
                    key,
                    stats.statuses[key]
                ])
            );
        }
    }

    target.innerHTML = html;
}


/* =====================================================
   CARD : MEAL SUMMARY
===================================================== */

function renderMealSummary(stats) {

    const target =
        document.getElementById("reportMealSummary");

    if (!target) return;

    if (stats.empty) {

        target.innerHTML =
            buildEmptyState("No meal data yet.");

        return;
    }

    const pairs = [
        ["EP  — Room Only",  stats.meals.EP],
        ["CP  — Breakfast",  stats.meals.CP],
        ["MAP — Half Board", stats.meals.MAP],
        ["AP  — Full Board", stats.meals.AP]
    ];

    if (stats.meals.NONE > 0) {

        pairs.push(["Not Selected", stats.meals.NONE]);
    }

    const covered =
        stats.meals.EP +
        stats.meals.CP +
        stats.meals.MAP +
        stats.meals.AP;

    pairs.push(["Total Covers", covered]);

    let html = buildStatRows(pairs);

    if (stats.meals.NONE > 0) {

        html +=
            `<p class="muted-note report-warning">
                ${stats.meals.NONE} guest(s) have no meal
                plan set. F&amp;B counts will be short.
            </p>`;
    }

    target.innerHTML = html;
}


/* =====================================================
   CARD : OCCUPANCY SUMMARY
===================================================== */

function renderOccupancySummary(stats) {

    const target =
        document.getElementById("reportOccupancySummary");

    if (!target) return;

    if (stats.empty) {

        target.innerHTML =
            buildEmptyState("No occupancy data yet.");

        return;
    }

    const average =
        stats.roomCount > 0
            ? (stats.pax / stats.roomCount).toFixed(2)
            : "0.00";

    const pairs = [
        ["Rooms Occupied", stats.roomCount],
        ["Total Guests",   stats.pax],
        ["Avg Pax / Room", average]
    ];

    if (stats.scope === "all" && stats.groupCount > 0) {

        pairs.push([
            "Avg Rooms / Group",
            (stats.roomCount / stats.groupCount).toFixed(1)
        ]);
    }

    let html = buildStatRows(pairs);

    /* ---------- Current Group : hotel occupancy ---------- */

    if (
        stats.scope === "current" &&
        stats.inventory.available
    ) {

        if (stats.stayNights.length > 0) {

            html +=
                `<h4 class="report-subhead">
                    Hotel Occupancy Across This Stay
                </h4>`;

            html +=
                `<table class="data-table report-table">
                    <tbody>`;

            stats.stayNights.forEach(night => {

                html += `
                <tr>
                    <td>${night.date}</td>
                    <td class="occ-cell">
                        ${buildOccupancyBar(
                            night.rooms,
                            stats.inventory.total
                        )}
                    </td>
                </tr>
                `;

            });

            html += `</tbody></table>`;

            if (stats.stayConflicts.length > 0) {

                html +=
                    `<p class="muted-note report-danger">
                        <strong>Heads up:</strong>
                        this group shares a room with
                        another saved group on
                        ${stats.stayConflicts.length}
                        night(s) of this stay. Check the
                        Overlapping Rooms report in All
                        Groups scope for details.
                    </p>`;
            }

        } else {

            html +=
                `<h4 class="report-subhead">
                    Hotel Occupancy${
                        stats.arrivalDate
                            ? " — " + stats.arrivalDate
                            : ""
                    }
                </h4>`;

            html += buildOccupancyBar(
                stats.uniqueRooms,
                stats.inventory.total
            );
        }
    }

    /* ---------- All Groups : occupancy per date ---------- */

    if (stats.scope === "all") {

        if (stats.dateRows.length > 0) {

            html +=
                `<h4 class="report-subhead">
                    Occupancy By Arrival Date
                </h4>`;

            html +=
                `<table class="data-table report-table">
                    <tbody>`;

            stats.dateRows.forEach(entry => {

                const detail =
                    stats.inventory.available
                        ? buildOccupancyBar(
                            entry.rooms,
                            stats.inventory.total
                          )
                        : `<span class="occ-text">
                             ${entry.rooms} room(s)
                           </span>`;

                html += `
                <tr>
                    <td>
                        ${entry.date}
                        <div class="muted-note occ-sub">
                            ${entry.groups} group(s)
                        </div>
                    </td>
                    <td class="occ-cell">${detail}</td>
                </tr>
                `;

            });

            html += `</tbody></table>`;
        }

        if (!stats.inventory.available) {

            html +=
                `<p class="muted-note">
                    Set up the Room Master to see
                    occupancy percentages.
                </p>`;
        }
    }

    target.innerHTML = html;
}


/* =====================================================
   CARD : ROOM CATEGORY
===================================================== */

function renderCategoryReport(stats) {

    const target =
        document.getElementById("reportCategorySummary");

    if (!target) return;

    if (!stats.inventory.available) {

        target.innerHTML =
            buildEmptyState(
                "No rooms mapped yet. Set up the Room " +
                "Master to see category occupancy.",
                "Go to Room Master",
                "roomMasterPage"
            );

        return;
    }

    if (stats.empty) {

        /* Still useful: show the inventory itself */

        let html =
            `<h4 class="report-subhead">Hotel Inventory</h4>`;

        html += buildStatRows(
            Object.keys(stats.inventory.byCategory)
            .sort()
            .map(name => [
                reportEscape(name),
                stats.inventory.byCategory[name]
            ])
        );

        html += buildStatRows([
            ["<strong>Total Rooms</strong>",
             "<strong>" + stats.inventory.total + "</strong>"]
        ]);

        target.innerHTML = html;

        return;
    }

    let html = "";

    if (stats.scope === "current") {

        html +=
            `<h4 class="report-subhead">
                Category Occupancy${
                    stats.arrivalDate
                        ? " — " + stats.arrivalDate
                        : ""
                }
            </h4>`;

        Object.keys(stats.inventory.byCategory)
            .sort()
            .forEach(name => {

                const used =
                    stats.categories[name] || 0;

                const total =
                    stats.inventory.byCategory[name];

                if (total === 0 && used === 0) return;

                html +=
                    `<div class="occ-label">
                        ${reportEscape(name)}
                     </div>`;

                html += buildOccupancyBar(used, total);

            });

        target.innerHTML = html;

        return;
    }

    /* ---------- All Groups ---------- */

    html +=
        `<h4 class="report-subhead">Hotel Inventory</h4>`;

    html += buildStatRows(
        Object.keys(stats.inventory.byCategory)
        .sort()
        .map(name => [
            reportEscape(name),
            stats.inventory.byCategory[name]
        ])
    );

    html += buildStatRows([
        ["<strong>Total Rooms</strong>",
         "<strong>" + stats.inventory.total + "</strong>"]
    ]);

    html +=
        `<h4 class="report-subhead">
            Rooms Booked By Category
        </h4>`;

    html += buildStatRows(
        Object.keys(stats.categories)
        .sort()
        .map(name => [
            reportEscape(name),
            stats.categories[name]
        ])
    );

    html +=
        `<p class="muted-note">
            Booked counts are room-nights across every
            matched group. A room reused on different
            dates is counted each time, so this can
            exceed the inventory. Percentages are shown
            per date in Occupancy Summary.
        </p>`;

    target.innerHTML = html;
}


/* =====================================================
   CSV EXPORT

   Exports exactly what the four report cards are
   currently showing - same scope, same active filters,
   same buildReportStats() data used to render them. No
   new data-gathering logic here; this only reformats
   what already gets computed for the screen.
===================================================== */

function csvStripTags(value) {

    return String(value ?? "")
        .replace(/<[^>]*>/g, "")
        .trim();
}


function csvField(value) {

    const text = csvStripTags(value);

    if (/[",\r\n]/.test(text)) {

        return '"' + text.replace(/"/g, '""') + '"';
    }

    return text;
}


function csvSectionLines(title, pairs) {

    const lines = [title];

    pairs.forEach(pair => {

        lines.push(
            csvField(pair[0]) + "," + csvField(pair[1])
        );

    });

    lines.push("");

    return lines;
}


function buildReportsCSV(stats) {

    let lines = [];

    lines.push(
        csvField("Report Scope") + "," +
        csvField(
            stats.scope === "current"
                ? "Current group in the Arrival Register"
                : "All saved groups" +
                  (stats.filtered ? " (filtered)" : "")
        )
    );

    lines.push(
        csvField("Generated") + "," +
        csvField(new Date().toLocaleString())
    );

    lines.push("");

    if (stats.empty) {

        lines.push("No data available for this scope.");

        return lines.join("\r\n");
    }

    /* ---------- Arrival Summary ---------- */

    const arrivalPairs = [];

    if (stats.scope === "current") {

        arrivalPairs.push(["Group", stats.groupName || "Unnamed"]);
        arrivalPairs.push(["Arrival Date", stats.arrivalDate || ""]);
        arrivalPairs.push(["Status", stats.status || "Pending"]);

    } else {

        arrivalPairs.push(["Groups Matched", stats.groupCount]);
    }

    arrivalPairs.push(["Total Rooms", stats.roomCount]);
    arrivalPairs.push(["Total Pax", stats.pax]);
    arrivalPairs.push(["VIP Guests", stats.vip]);

    lines = lines.concat(
        csvSectionLines("ARRIVAL SUMMARY", arrivalPairs)
    );

    if (stats.scope === "all") {

        const statusKeys =
            Object.keys(stats.statuses).sort();

        if (statusKeys.length > 0) {

            lines = lines.concat(
                csvSectionLines(
                    "BY STATUS",
                    statusKeys.map(key =>
                        [key, stats.statuses[key]]
                    )
                )
            );
        }
    }

    /* ---------- Meal Summary ---------- */

    const mealPairs = [
        ["EP - Room Only",   stats.meals.EP],
        ["CP - Breakfast",   stats.meals.CP],
        ["MAP - Half Board", stats.meals.MAP],
        ["AP - Full Board",  stats.meals.AP]
    ];

    if (stats.meals.NONE > 0) {

        mealPairs.push(["Not Selected", stats.meals.NONE]);
    }

    const covered =
        stats.meals.EP +
        stats.meals.CP +
        stats.meals.MAP +
        stats.meals.AP;

    mealPairs.push(["Total Covers", covered]);

    lines = lines.concat(
        csvSectionLines("MEAL SUMMARY", mealPairs)
    );

    /* ---------- Occupancy Summary ---------- */

    const average =
        stats.roomCount > 0
            ? (stats.pax / stats.roomCount).toFixed(2)
            : "0.00";

    const occPairs = [
        ["Rooms Occupied", stats.roomCount],
        ["Total Guests",   stats.pax],
        ["Avg Pax / Room", average]
    ];

    if (stats.scope === "all" && stats.groupCount > 0) {

        occPairs.push([
            "Avg Rooms / Group",
            (stats.roomCount / stats.groupCount).toFixed(1)
        ]);
    }

    lines = lines.concat(
        csvSectionLines("OCCUPANCY SUMMARY", occPairs)
    );

    if (stats.scope === "current" && stats.inventory.available) {

        const percent =
            stats.inventory.total > 0
                ? Math.round(
                    (stats.uniqueRooms / stats.inventory.total) * 100
                  )
                : 0;

        lines = lines.concat(
            csvSectionLines(
                "HOTEL OCCUPANCY" +
                (stats.arrivalDate ? " - " + stats.arrivalDate : ""),
                [
                    ["Rooms Used",  stats.uniqueRooms],
                    ["Total Rooms", stats.inventory.total],
                    ["Percent",     percent + "%"]
                ]
            )
        );
    }

    if (stats.scope === "all") {

        if (stats.dateRows.length > 0) {

            const dateLines =
                ["OCCUPANCY BY ARRIVAL DATE"];

            dateLines.push(
                csvField("Date") + "," +
                csvField("Groups") + "," +
                csvField("Rooms") +
                (
                    stats.inventory.available
                        ? "," + csvField("Percent")
                        : ""
                )
            );

            stats.dateRows.forEach(entry => {

                let row =
                    csvField(entry.date) + "," +
                    csvField(entry.groups) + "," +
                    csvField(entry.rooms);

                if (stats.inventory.available) {

                    const pct =
                        stats.inventory.total > 0
                            ? Math.round(
                                (entry.rooms / stats.inventory.total) * 100
                              )
                            : 0;

                    row += "," + csvField(pct + "%");
                }

                dateLines.push(row);
            });

            dateLines.push("");

            lines = lines.concat(dateLines);
        }

        const conflictSummary =
            buildConflictSummary(stats.conflicts);

        if (conflictSummary.length > 0) {

            const conflictLines =
                ["OVERLAPPING ROOMS"];

            conflictLines.push(
                csvField("Room") + "," +
                csvField("Group 1") + "," +
                csvField("Group 2") + "," +
                csvField("From") + "," +
                csvField("To") + "," +
                csvField("Nights")
            );

            conflictSummary.forEach(entry => {

                conflictLines.push(
                    csvField(entry.room) + "," +
                    csvField(entry.groupA) + "," +
                    csvField(entry.groupB) + "," +
                    csvField(entry.from) + "," +
                    csvField(entry.to) + "," +
                    csvField(entry.nights)
                );
            });

            conflictLines.push("");

            lines = lines.concat(conflictLines);
        }
    }

    /* ---------- Category Summary ---------- */

    if (stats.inventory.available) {

        if (stats.scope === "current") {

            const catLines = [
                "CATEGORY OCCUPANCY" +
                (stats.arrivalDate ? " - " + stats.arrivalDate : "")
            ];

            catLines.push(
                csvField("Category") + "," +
                csvField("Used") + "," +
                csvField("Total")
            );

            Object.keys(stats.inventory.byCategory)
                .sort()
                .forEach(name => {

                    const used = stats.categories[name] || 0;

                    const total =
                        stats.inventory.byCategory[name];

                    if (total === 0 && used === 0) return;

                    catLines.push(
                        csvField(name) + "," +
                        csvField(used) + "," +
                        csvField(total)
                    );
                });

            catLines.push("");

            lines = lines.concat(catLines);

        } else {

            lines = lines.concat(
                csvSectionLines(
                    "HOTEL INVENTORY",
                    Object.keys(stats.inventory.byCategory)
                        .sort()
                        .map(name =>
                            [name, stats.inventory.byCategory[name]]
                        )
                )
            );

            lines = lines.concat(
                csvSectionLines(
                    "ROOMS BOOKED BY CATEGORY",
                    Object.keys(stats.categories)
                        .sort()
                        .map(name =>
                            [name, stats.categories[name]]
                        )
                )
            );
        }
    }

    return lines.join("\r\n");
}


/* =====================================================
   CSV DOWNLOAD
===================================================== */

function exportReportsCSV() {

    const stats = buildReportStats();

    const csv = buildReportsCSV(stats);

    const blob = new Blob(
        [csv],
        { type: "text/csv" }
    );

    const link = document.createElement("a");

    link.href = URL.createObjectURL(blob);

    const scopeLabel =
        stats.scope === "current" ? "CurrentGroup" : "AllGroups";

    const dateStamp =
        new Date().toISOString().slice(0, 10);

    link.download =
        "Reports_" + scopeLabel + "_" + dateStamp + ".csv";

    link.click();

    if (typeof showSaveFlash === "function") {

        showSaveFlash("Reports exported");
    }
}


/* =====================================================
   MAIN ENTRY POINT
===================================================== */

function updateReports() {

    if (reportScope === "all") {

        populateAgentFilter();
    }

    const stats = buildReportStats();

    renderScopeLabel(stats);

    renderArrivalSummary(stats);

    renderMealSummary(stats);

    renderOccupancySummary(stats);

    renderCategoryReport(stats);

    renderConflictReport(stats);

}


/* =====================================================
   CONFLICT SUMMARY (DEP5 follow-up)

   Collapses per-night conflict entries (one per
   overlapping night, from buildDateOccupancy) into one
   row per room + pair-of-groups, spanning the full date
   range of the overlap. A 5-night double booking is one
   row here, not five.
===================================================== */

function buildConflictSummary(conflicts) {

    const grouped = {};

    conflicts.forEach(conflict => {

        const pairKey =
            conflict.room + "|" +
            [conflict.first, conflict.other].sort().join("|");

        if (!grouped[pairKey]) {

            grouped[pairKey] = {
                room:   conflict.room,
                groupA: conflict.first,
                groupB: conflict.other,
                dates:  []
            };
        }

        grouped[pairKey].dates.push(conflict.date);
    });

    return Object.values(grouped).map(entry => {

        const sortedDates =
            entry.dates.slice().sort();

        return {
            room:   entry.room,
            groupA: entry.groupA,
            groupB: entry.groupB,
            from:   sortedDates[0],
            to:     sortedDates[sortedDates.length - 1],
            nights: sortedDates.length
        };

    });
}


/* =====================================================
   CARD : OVERLAPPING ROOMS

   All Groups scope only - conflicts are inherently a
   cross-group comparison. Dedicated card, not buried
   inside Occupancy Summary, so a real double booking
   isn't easy to miss.
===================================================== */

function renderConflictReport(stats) {

    const target =
        document.getElementById("reportConflictSummary");

    if (!target) return;

    if (stats.scope !== "all") {

        target.innerHTML =
            buildEmptyState(
                "Switch to All Groups to check for " +
                "overlapping rooms."
            );

        return;
    }

    const summary =
        buildConflictSummary(stats.conflicts);

    if (summary.length === 0) {

        target.innerHTML =
            buildEmptyState("No overlapping rooms found.");

        return;
    }

    let html =
        `<table class="data-table report-table">
            <thead>
                <tr>
                    <th>Room</th>
                    <th>Groups</th>
                    <th>Dates</th>
                </tr>
            </thead>
            <tbody>`;

    summary
        .sort((a, b) => a.from.localeCompare(b.from))
        .forEach(entry => {

            const dateRange =
                entry.from === entry.to
                    ? entry.from
                    : entry.from + " to " + entry.to;

            html += `
            <tr>
                <td>${reportEscape(entry.room)}</td>
                <td>
                    ${reportEscape(entry.groupA)}
                    <br>
                    ${reportEscape(entry.groupB)}
                </td>
                <td>
                    ${dateRange}
                    <div class="muted-note occ-sub">
                        ${entry.nights} night(s)
                    </div>
                </td>
            </tr>
            `;

        });

    html += `</tbody></table>`;

    target.innerHTML = html;
}


/* =====================================================
   MODULE STARTUP
===================================================== */

function initializeReports() {

    document
        .querySelectorAll(".scope-btn")
        .forEach(button => {

            button.addEventListener(
                "click",
                function () {

                    setReportScope(this.dataset.scope);

                }
            );

        });

    [
        "reportFilterFrom",
        "reportFilterTo",
        "reportFilterStatus",
        "reportFilterAgent"
    ]
    .forEach(id => {

        document
            .getElementById(id)
            ?.addEventListener(
                "change",
                readReportFilters
            );

    });

    document
        .getElementById("btnClearReportFilters")
        ?.addEventListener(
            "click",
            clearReportFilters
        );

    document
        .getElementById("btnExportReportsCSV")
        ?.addEventListener(
            "click",
            exportReportsCSV
        );

    updateReportScopeButtons();

    updateReports();

}
registerModuleVersion("reports.js", "1.0.0");