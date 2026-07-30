/* =====================================================
   HOTEL GROUP OPERATIONS SUITE
   File    : js/dashboard.js
   Version : 1.0.0 RC1

   DASHBOARD

   Owns:
       KPI cards
       Arrival Control Center
       status badge class names
       today / tomorrow arrival cards
       Saved Groups panel
       register -> dashboard totals
       refreshEntireDashboard()

   Depends at runtime on:
       database.js   DB, GroupRepository
       register.js   getRegisterRows, setSummaryValue
       app.js        getTodayString, getTomorrowString,
                     openSavedGroup, deleteSavedGroup,
                     formatTimestamp

   Saved Groups carries the REAL DB.groups index through
   the filter and sort. Never pass a filtered position to
   openSavedGroup() or deleteSavedGroup() - that once
   deleted the wrong group whenever the search box was
   used.

   Load AFTER register.js, BEFORE app.js.
===================================================== */


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
registerModuleVersion("dashboard.js", "1.0.0");