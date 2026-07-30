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
   OCCUPANCY BY ARRIVAL DATE

   Also detects the same room booked on the same date
   by two different groups.
===================================================== */

function buildDateOccupancy(groups) {

    const byDate = {};

    const conflicts = [];

    groups.forEach(group => {

        const date = group.arrivalDate || "";

        if (!date) return;

        if (!byDate[date]) {

            byDate[date] = {
                date:    date,
                groups:  0,
                claimed: {},
                rooms:   0
            };
        }

        const entry = byDate[date];

        entry.groups++;

        const groupName =
            group.groupName || "Unnamed Group";

        (group.rooms || []).forEach(room => {

            if (isEmptyRegisterRow(room)) return;

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
               Across two groups it is a conflict. */

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

    const dates =
        Object.keys(byDate)
        .sort()
        .map(key => byDate[key]);

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
        uniqueRooms:  0

    };

    let rows = [];

    if (reportScope === "current") {

        rows =
            getRegisterRows()
            .filter(row => !isEmptyRegisterRow(row));

        const value = id =>
            document.getElementById(id)?.value || "";

        stats.groupName   = value("groupName");
        stats.arrivalDate = value("arrivalDate");
        stats.status      = value("groupStatus");

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

        /* ---------- Double booking ---------- */

        if (stats.conflicts.length > 0) {

            html +=
                `<p class="muted-note report-danger">
                    <strong>Double booking:</strong><br>`;

            stats.conflicts
                .slice(0, 8)
                .forEach(conflict => {

                    html +=
                        "Room " +
                        reportEscape(conflict.room) +
                        " on " +
                        conflict.date +
                        " — " +
                        reportEscape(conflict.first) +
                        " and " +
                        reportEscape(conflict.other) +
                        "<br>";

                });

            if (stats.conflicts.length > 8) {

                html +=
                    "and " +
                    (stats.conflicts.length - 8) +
                    " more<br>";
            }

            html += `</p>`;
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

    updateReportScopeButtons();

    updateReports();

}
registerModuleVersion("reports.js", "1.0.0");