/* =====================================================
   HOTEL GROUP OPERATIONS SUITE
   Version : 1.0.0
   Build   : 2026-07-27
   Project : Group Arrival Register
   Author  : Vikram 

   PHASE C1
   Database & Core Utilities
===================================================== */

/* =====================================================
   DATABASE
===================================================== */

const STORAGE_KEY = "hotel_group_operations_v5";
/* =====================================================
   DEFAULT DATABASE
===================================================== */

const DEFAULT_DB = {
    groups: [],
    settings: {
        hotelName: "Hotel Group Operations Suite",
        footerText: "Powered by Group Operations Suite",
        logo: ""
    }
};

let DB = loadDatabase();

/* =====================================================
   LOAD / SAVE
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

        return JSON.parse(saved);

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
    }
}

/* =====================================================
   ID GENERATOR
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
/* =====================================================
   NUMBER HELPERS
===================================================== */

function formatNumber(value) {

    return Number(value || 0);
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

    const now = new Date();

    target.textContent =
        now.toLocaleString();
}

setInterval(
    updateDateTime,
    1000
);

/* =====================================================
   TAB NAVIGATION
===================================================== */

function initializeNavigation() {

    const tabs =
        qsa(".tab-btn");

    tabs.forEach(tab => {

        tab.addEventListener(
            "click",
            function () {

                const targetPage =
                    this.dataset.tab;

                switchPage(targetPage);

            }
        );

    });
}

function switchPage(pageId) {

    qsa(".page")
        .forEach(page => {

            page.classList.remove(
                "active-page"
            );

        });

    qsa(".tab-btn")
        .forEach(tab => {

            tab.classList.remove(
                "active"
            );

        });

    const page =
        document.getElementById(
            pageId
        );

    if (page) {

        page.classList.add(
            "active-page"
        );
    }

    const activeTab =
        document.querySelector(
            `[data-tab="${pageId}"]`
        );

    if (activeTab) {

        activeTab.classList.add(
            "active"
        );
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

    updateBranding();
}

function updateBranding() {

    const hotelTitle =
        document.getElementById(
            "hotelTitle"
        );

    const footer =
        document.getElementById(
            "footerText"
        );

    if (hotelTitle) {

        hotelTitle.textContent =
            DB.settings.hotelName ||
            "Hotel Group Operations Suite";
    }

    if (footer) {

        footer.textContent =
            DB.settings.footerText ||
            "";
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

    saveDatabase();

    updateBranding();

    alert(
        "Settings Saved"
    );
}
/* =====================================================
   DASHBOARD STATISTICS
===================================================== */

function refreshDashboardStatistics() {

    updateDashboard();

    buildDashboardGroupList();

}
/********************************************************
 * DASHBOARD CONTROLLER
 ********************************************************/

function refreshEntireDashboard() {

    /* ---------- Dashboard ---------- */

    refreshDashboardStatistics();

    /* ---------- Saved Groups ---------- */

    renderSavedGroups();

    /* ---------- Arrival Widgets ---------- */

    updateArrivalControlCenter();

    buildUpcomingArrivals();

}
/* =====================================================
   DASHBOARD
===================================================== */

function updateDashboard() {

    let totalGroups = 0;
    let totalRooms = 0;
    let totalPax = 0;

    let confirmed = 0;
    let checkedIn = 0;
    let cancelled = 0;

    totalGroups = DB.groups.length;

    DB.groups.forEach(group => {

        totalRooms +=
            Number(group.totalRooms || 0);

        totalPax +=
            Number(group.totalPax || 0);

        switch (
            (group.status || "Pending").trim()
        ) {

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

    const totalGroupsEl =
        document.getElementById(
            "dashboardTotalGroups"
        );

    const totalRoomsEl =
        document.getElementById(
            "dashboardTotalRooms"
        );

    const totalPaxEl =
        document.getElementById(
            "dashboardTotalPax"
        );

    const confirmedEl =
        document.getElementById(
            "dashboardConfirmed"
        );

    const checkedInEl =
        document.getElementById(
            "dashboardCheckedIn"
        );

    const cancelledEl =
        document.getElementById(
            "dashboardCancelled"
        );

    if (totalGroupsEl)
        totalGroupsEl.textContent =
            totalGroups;

    if (totalRoomsEl)
        totalRoomsEl.textContent =
            totalRooms;

    if (totalPaxEl)
        totalPaxEl.textContent =
            totalPax;

    if (confirmedEl)
        confirmedEl.textContent =
            confirmed;

    if (checkedInEl)
        checkedInEl.textContent =
            checkedIn;

    if (cancelledEl)
        cancelledEl.textContent =
            cancelled;
buildLiveArrivalLists();
updateArrivalControlCenter();
}
/* =====================================================
   LIVE ARRIVALS
===================================================== */

function buildLiveArrivalLists() {

    const todayContainer =
        document.getElementById("todayArrivalCards");

    const tomorrowContainer =
        document.getElementById("tomorrowArrivalCards");

    if (!todayContainer || !tomorrowContainer)
        return;

    todayContainer.innerHTML = "";
    tomorrowContainer.innerHTML = "";

    const today =
        new Date().toISOString().slice(0,10);

    const tomorrow =
        new Date(Date.now()+86400000)
            .toISOString()
            .slice(0,10);

    DB.groups.forEach((group,index)=>{

        const arrival =
            group.arrivalDate || "";

        const card = `

<div
class="arrival-card"
onclick="openSavedGroup(${index})">

<h4>

${group.groupName || "Unnamed Group"}

</h4>

<div class="arrival-card-grid">

<div>

<strong>Date</strong><br>

${arrival || "-"}

</div>

<div>

<strong>Status</strong><br>

<span class="status-${(group.status||"Pending").toLowerCase().replace(/\s+/g,"-")}">

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

<div class="arrival-open">

► OPEN GROUP

</div>

</div>

`;

        if(arrival===today){

            todayContainer.insertAdjacentHTML(
                "beforeend",
                card
            );

        }

        if(arrival===tomorrow){

            tomorrowContainer.insertAdjacentHTML(
                "beforeend",
                card
            );

        }

    });

}
/* =====================================================
   APPLICATION STARTUP
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        updateDateTime();

        initializeNavigation();

        loadSettingsToScreen();

        updateDashboard();

        const saveSettingsButton =
            document.getElementById(
                "btnSaveSettings"
            );

        if (saveSettingsButton) {

            saveSettingsButton
                .addEventListener(
                    "click",
                    saveSettings
                );
        }

        console.log(
            "App.js Part 1 Loaded"
        );
    }
);
/* =====================================================
   APP.JS PART 2
   ARRIVAL REGISTER ENGINE
===================================================== */

/* =====================================================
   REGISTER HELPERS
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

        <td contenteditable="true">
            ${room}
        </td>

        <td contenteditable="true">
            ${guest}
        </td>

        <td contenteditable="true">
            ${pax}
        </td>

        <td>
            <select class="meal-plan">
                <option value="" ${meal === "" ? "selected" : ""}>Select</option>
                <option value="EP" ${meal === "EP" ? "selected" : ""}>EP</option>
                <option value="CP" ${meal === "CP" ? "selected" : ""}>CP</option>
                <option value="MAP" ${meal === "MAP" ? "selected" : ""}>MAP</option>
                <option value="AP" ${meal === "AP" ? "selected" : ""}>AP</option>
            </select>
        </td>

        <td contenteditable="true">
            ${mobile}
        </td>

        <td><td>

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
        placeholder="Special Request"
        style="width:95%;margin-top:5px;">

</td></td>

    </tr>
    `;
}

/* =====================================================
   ARRIVAL REGISTER LOADER
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

    updateSummary();

    syncRoomingList();

    updateReports();

    updateDashboardFromRegister();
}
/* =====================================================
   GENERATE ROWS
===================================================== */

function generateRows() {

    const body =
        getRegisterBody();

    if (!body) return;

    const count =
        Number(
            document.getElementById(
                "roomCount"
            )?.value || 0
        );

    if (count <= 0) {

        alert(
            "Enter number of rooms"
        );

        return;
    }

    body.innerHTML = "";

    for (
        let i = 1;
        i <= count;
        i++
    ) {

        body.insertAdjacentHTML(
            "beforeend",
            createRowHTML(i)
        );
    }

    updateSummary();
    syncRoomingList();
}

/* =====================================================
   ADD SINGLE ROW
===================================================== */

function addRow() {

    const body =
        getRegisterBody();

    if (!body) return;

    const sr =
        body.rows.length + 1;

    body.insertAdjacentHTML(
        "beforeend",
        createRowHTML(sr)
    );

    updateSummary();
    syncRoomingList();
}

/* =====================================================
   REGISTER DATA
===================================================== */

function getRegisterBody() {

    return document.getElementById(
        "arrivalRegisterBody"
    );

}

function getRegisterRows() {

    const body =
        getRegisterBody();

    if (!body)
        return [];

    const rows = [];

    [...body.rows].forEach(row => {

        rows.push({

            roomNo:
                row.cells[1]
                ?.innerText
                .trim(),

            guestName:
                row.cells[2]
                ?.innerText
                .trim(),

            pax:
                Number(
                    row.cells[3]
                    ?.innerText
                ) || 0,

            meal:
                row.cells[4]
                ?.querySelector(".meal-plan")
                ?.value
                ?.toUpperCase() || "",

            mobile:
                row.cells[5]
                ?.innerText
                .trim(),

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
   SUMMARY
===================================================== */

function updateSummary() {

    const rows =
        getRegisterRows();

    let totalRooms = 0;
    let totalPax = 0;

    let ep = 0;
    let cp = 0;
    let map = 0;
    let ap = 0;

    totalRooms =
        rows.length;

    rows.forEach(row => {

        const pax =
            Number(row.pax) || 0;

        totalPax += pax;

        switch (
            row.meal
        ) {

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

    setSummaryValue(
        "summaryRooms",
        totalRooms
    );

    setSummaryValue(
        "summaryPax",
        totalPax
    );

    setSummaryValue(
        "summaryEP",
        ep
    );

    setSummaryValue(
        "summaryCP",
        cp
    );

    setSummaryValue(
        "summaryMAP",
        map
    );

    setSummaryValue(
        "summaryAP",
        ap
    );
}

function setSummaryValue(
    id,
    value
) {

    const el =
        document.getElementById(
            id
        );

    if (el) {

        el.textContent =
            value;
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

    if (!roomingBody)
        return;

    roomingBody.innerHTML = "";

    const rows =
        getRegisterRows();

    rows.forEach(row => {

        roomingBody
            .insertAdjacentHTML(
                "beforeend",

                `
                <tr>

                    <td>
                        ${row.roomNo}
                    </td>

                    <td>
                        ${row.guestName}
                    </td>

                    <td>
                        ${row.pax}
                    </td>

                    <td>
                        ${row.meal}
                    </td>

                    <td>
                        ${row.mobile}
                    </td>

                    <td>
                        No
                    </td>

                    <td>
                    </td>

                </tr>
                `
            );

    });

    updateReports();
}

/* =====================================================
   REPORTS
===================================================== */

function updateReports() {

    const rows =
        getRegisterRows();

    let totalRooms =
        rows.length;

    let totalPax = 0;

    let ep = 0;
    let cp = 0;
    let map = 0;
    let ap = 0;

    rows.forEach(row => {

        totalPax +=
            row.pax;

        switch (
            row.meal
        ) {

            case "EP":
                ep += row.pax;
                break;

            case "CP":
                cp += row.pax;
                break;

            case "MAP":
                map += row.pax;
                break;

            case "AP":
                ap += row.pax;
                break;
        }
    });

    const arrivalSummary =
        document.getElementById(
            "reportArrivalSummary"
        );

    const mealSummary =
        document.getElementById(
            "reportMealSummary"
        );

    const occupancySummary =
        document.getElementById(
            "reportOccupancySummary"
        );

    if (arrivalSummary) {

        arrivalSummary.innerHTML =
        `
        Rooms: ${totalRooms}<br>
        Pax: ${totalPax}
        `;
    }

    if (mealSummary) {

        mealSummary.innerHTML =
        `
        EP: ${ep}<br>
        CP: ${cp}<br>
        MAP: ${map}<br>
        AP: ${ap}
        `;
    }

    if (occupancySummary) {

        occupancySummary.innerHTML =
        `
        Total Rooms:
        ${totalRooms}<br>

        Total Pax:
        ${totalPax}
        `;
    }
}

/* =====================================================
   TABLE EVENT LISTENERS
===================================================== */

function initializeRegisterEvents() {

    const body =
        getRegisterBody();

    if (!body)
        return;

    body.addEventListener(
        "input",
        function () {

            updateSummary();

            syncRoomingList();
        }
    );

    document
        .getElementById(
            "btnGenerateRows"
        )
        ?.addEventListener(
            "click",
            generateRows
        );

    document
        .getElementById(
            "btnAddRow"
        )
        ?.addEventListener(
            "click",
            addRow
        );
}

/* =====================================================
   DASHBOARD LINK
===================================================== */

function updateDashboardFromRegister() {

    const rows =
        getRegisterRows();

    document.getElementById(
        "dashboardTotalRooms"
    ).textContent =
        rows.length;

    let pax = 0;

    rows.forEach(row => {

        pax +=
            Number(
                row.pax
            ) || 0;
    });

    document.getElementById(
        "dashboardTotalPax"
    ).textContent =
        pax;
}
document.addEventListener(
    "change",
    function(e) {

        if (
            e.target.classList.contains(
                "meal-plan"
            )
        ) {

            updateSummary();
        }

    }
);

/* =====================================================
   STARTUP EXTENSION
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        initializeRegisterEvents();

        updateSummary();

        syncRoomingList();

        updateReports();

        updateDashboardFromRegister();

        console.log(
            "App.js Part 2 Loaded"
        );
    }
);
/* =====================================================
   APP.JS PART 3
   IMPORT / EXPORT / AUTOSAVE
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

        rooms:
            getRegisterRows()
    };
}


/* =====================================================
   EXPORT JSON
===================================================== */

function exportGroupJSON() {

    const group =
        getCurrentGroupData();
        const duplicates =
    checkDuplicateRooms();

if (
    duplicates.length > 0
) {

    alert(
        "Duplicate Room Numbers Found:\n\n" +
        duplicates.join(", ")
    );

    return;
}

    const blob =
        new Blob(
            [
                JSON.stringify(
                    group,
                    null,
                    2
                )
            ],
            {
                type:
                "application/json"
            }
        );

    const link =
        document.createElement("a");

    link.href =
        URL.createObjectURL(blob);

    const safeDate =
    (
        group.arrivalDate ||
        new Date()
        .toISOString()
        .split("T")[0]
    );

link.download =
    (
        group.groupName ||
        "Group"
    )
    + "_"
    + safeDate
    + ".json";

    link.click();
}

/* =====================================================
   IMPORT GROUP JSON
===================================================== */

function importGroupJSON(file) {

    const reader =
        new FileReader();

    reader.onload =
        function(event) {

            try {

                const data =
                    JSON.parse(
                        event.target.result
                    );

                loadGroupToScreen(
                    data
                );

            } catch(error) {

                alert(
                    "Invalid JSON File"
                );
            }
        };

    reader.readAsText(file);
}



/* =====================================================
   LOAD GROUP TO SCREEN
===================================================== */

function loadGroupToScreen(group) {

    if (!group) return;

    const fields = {

        groupStatus: group.status || "Pending",
        groupName: group.groupName || "",
        arrivalDate: group.arrivalDate || "",
        agentCompany: group.agent || "",
        preparedBy: group.preparedBy || "",
        groupNotes: group.notes || ""

    };

    Object.entries(fields).forEach(([id, value]) => {

        const element = document.getElementById(id);

        if (element) {
            element.value = value;
        }

    });

    loadRegisterRows(group.rooms || []);

}
/* =====================================================
   BULK IMPORT
===================================================== */

function processBulkImport() {

    const text =
        document.getElementById(
            "bulkImportText"
        )?.value;

    if (!text)
        return;

    const lines =
        text
        .trim()
        .split("\n");

    const body =
        getRegisterBody();

    body.innerHTML = "";

    lines.forEach(
        (
            line,
            index
        ) => {

            const parts =
                line.split(",");

            body.insertAdjacentHTML(
                "beforeend",

                createRowHTML(

                    index + 1,

                    parts[0]?.trim() || "",

                    parts[1]?.trim() || "",

                    parts[2]?.trim() || 1,

                    (
                        parts[3]
                        ?.trim()
                        || "EP"
                    )
                    .toUpperCase()
                )
            );
        }
    );

    updateSummary();
    syncRoomingList();
}

/* =====================================================
   AUTOSAVE
===================================================== */

function autoSaveCurrentWork() {

    const draft = {

        groupName:
            document.getElementById(
                "groupName"
            )?.value,

        arrivalDate:
            document.getElementById(
                "arrivalDate"
            )?.value,

        agent:
            document.getElementById(
                "agentCompany"
            )?.value,

        preparedBy:
            document.getElementById(
                "preparedBy"
            )?.value,

        notes:
            document.getElementById(
                "groupNotes"
            )?.value,

        rooms:
            getRegisterRows()
    };

    localStorage.setItem(
        "GROUP_DRAFT",
        JSON.stringify(draft)
    );
}

function restoreDraft() {

    const draft =
        localStorage.getItem(
            "GROUP_DRAFT"
        );

    if (!draft)
        return;

    try {

        loadGroupToScreen(
            JSON.parse(
                draft
            )
        );

    } catch(error) {

        console.error(
            error
        );
    }
}

setInterval(
    autoSaveCurrentWork,
    15000
);

/* =====================================================
   LOGO UPLOAD
===================================================== */

function handleLogoUpload(file) {

    const reader =
        new FileReader();

    reader.onload =
        function(event) {

            DB.settings.logo =
                event.target.result;

            saveDatabase();

            const logo =
                document.getElementById(
                    "hotelLogoPreview"
                );

            if (logo) {

                logo.src =
                    DB.settings.logo;

                logo.style.display =
                    "block";
            }
        };

    reader.readAsDataURL(
        file
    );
}

/* =====================================================
   SETTINGS RESTORE
===================================================== */

function restoreLogo() {

    const logo =
        document.getElementById(
            "hotelLogoPreview"
        );

    if (
        logo &&
        DB.settings.logo
    ) {

        logo.src =
            DB.settings.logo;

        logo.style.display =
            "block";
    }
}

/* =====================================================
   EVENT BINDINGS
===================================================== */

function initializePart3Events() {

    document
        .getElementById(
            "btnSaveGroup"
        )
        ?.addEventListener(
            "click",
            saveCurrentGroup
        );

    document
        .getElementById(
            "btnExportJson"
        )
        ?.addEventListener(
            "click",
            exportGroupJSON
        );

    document
        .getElementById(
            "btnOpenGroup"
        )
        ?.addEventListener(
            "click",
            function() {

                document
                    .getElementById(
                        "openGroupFile"
                    )
                    .click();
            }
        );

    document
        .getElementById(
            "openGroupFile"
        )
        ?.addEventListener(
            "change",
            function(event) {

                if (
                    event.target.files[0]
                ) {

                    importGroupJSON(
                        event.target.files[0]
                    );
                }
            }
        );

    document
        .getElementById(
            "btnProcessImport"
        )
        ?.addEventListener(
            "click",
            processBulkImport
        );

    document
        .getElementById(
            "settingHotelLogo"
        )
        ?.addEventListener(
            "change",
            function(event) {

                if (
                    event.target.files[0]
                ) {

                    handleLogoUpload(
                        event.target.files[0]
                    );
                }
            }
        );
}

/* =====================================================
   STARTUP
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    function() {

        initializePart3Events();

        restoreDraft();

        restoreLogo();

        console.log(
            "App.js Part 3 Loaded"
        );
    }
);
/* =====================================================
   APP.JS PART 4
   PRINT ENGINE
   GROUP MANAGER
===================================================== */
/* =====================================================
   PRINT BLANK REGISTER
===================================================== */

function printBlankRegister() {

    const rows = Number(

        prompt(
            "Blank Register Rows (20 / 30 / 40 / 50)",
            30
        )

    );

    if (!rows || rows < 1) {
        return;
    }

    let tableRows = "";

    for (let i = 1; i <= rows; i++) {

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

<h2>GROUP ARRIVAL REGISTER</h2>

<h4>BLANK REGISTER</h4>

<table>

<thead>

<tr>

<th style="width:5%">SR</th>

<th style="width:10%">ROOM</th>

<th style="width:40%">GUEST NAME</th>

<th style="width:8%">PAX</th>

<th style="width:10%">MEAL</th>

<th style="width:12%">MOBILE</th>

<th style="width:20%">SIGNATURE</th>

</tr>

</thead>

<tbody>

${tableRows}

</tbody>

</table>

`;

openPrintWindow(
    "Blank Arrival Register",
    html
);
}

/* =====================================================
   SAVED GROUP LIST
===================================================== */

function buildDashboardGroupList() {
    const search =
(
    document.getElementById(
        "groupSearch"
    )?.value || ""
)
.toLowerCase();

    const target =
        document.getElementById(
            "dashboardGroupList"
        );

    if (!target)
        return;

    target.innerHTML = "";

   DB.groups
.filter(group =>
    (group.groupName || "")
    .toLowerCase()
    .includes(search)
)
.forEach((group)=>{

        target.insertAdjacentHTML(
            "beforeend",

            `
            <tr>

                <td>
                    ${group.groupName}
                </td>

                <td>
                    ${group.arrivalDate}
                </td>

                <td>
  ${group.rows ? group.rows.length : 0}
</td>

<td>
  ${group.modifiedOn || "-"}
</td>

<td>
                    ${group.totalPax}
                </td>

            </tr>
            `
        );

    });

}

/* =====================================================
   LOAD SAVED GROUP
===================================================== */

function loadSavedGroup(groupId) {

    const group =
        DB.groups.find(
            g => g.id === groupId
        );

    if (!group)
        return;

    loadGroupToScreen(
        group
    );

    switchPage(
        "arrivalPage"
    );
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

    if (!group) return;

    const ok = confirm(
        "Delete '" +
        group.groupName +
        "' permanently?"
    );

    if (!ok) return;

    GroupRepository.remove(index);

    refreshApplication();

}
/* =====================================================
   REFRESH DASHBOARD
===================================================== */

function refreshDashboard() {

    refreshDashboardStatistics();

}
/* =====================================================
   GROUP SELECTOR
===================================================== */

function openGroupSelector() {

    if (
        DB.groups.length === 0
    ) {

        alert(
            "No Saved Groups"
        );

        return;
    }

    let listText =
        "Saved Groups:\n\n";

    DB.groups.forEach(
        (
            group,
            index
        ) => {

            listText +=
                (
                    index + 1
                )
                + ". "
                + group.groupName
                + "\n";
        }
    );

    const selected =
        prompt(
            listText +
            "\nEnter Number"
        );

    if (!selected)
        return;

    const index =
        Number(selected) - 1;

    if (
        index < 0 ||
        index >= DB.groups.length
    ) {

        alert(
            "Invalid Selection"
        );

        return;
    }

    loadGroupToScreen(
        DB.groups[index]
    );

    switchPage(
        "arrivalPage"
    );
}

/* =====================================================
   UPDATE SAVE GROUP
===================================================== */

function saveCurrentGroup() {

    const group = getCurrentGroupData();

    if (!group.groupName) {

        alert("Enter Group Name");

        return;

    }

    const now = new Date().toLocaleString();

    const existing = GroupRepository
        .getAll()
        .findIndex(
            g => g.groupName === group.groupName
        );

    if (existing >= 0) {

        group.createdOn =
            GroupRepository
                .get(existing)
                .createdOn;

        group.modifiedOn = now;

        GroupRepository.update(
            existing,
            group
        );

    } else {

        group.createdOn = now;

        group.modifiedOn = now;

        GroupRepository.add(group);

    }

    refreshApplication();

    alert(
        "Group Saved Successfully"
    );

}
/* =====================================================
   DASHBOARD TODAY ARRIVALS
===================================================== */

function updateTodayArrivals() {

    const today =
        new Date()
        .toISOString()
        .split("T")[0];

    const arrivals =
        DB.groups.filter(
            g =>
            g.arrivalDate ===
            today
        );

    const target =
        document.getElementById(
            "dashboardTodayArrivals"
        );

    if (target) {

        target.textContent =
            arrivals.length;
    }
}

/* =====================================================
   DASHBOARD ENHANCEMENT
===================================================== */

const originalUpdateDashboard =
    updateDashboard;

updateDashboard = function() {

    originalUpdateDashboard();

    updateTodayArrivals();

    buildDashboardGroupList();

    buildUpcomingArrivals();
}
/* =====================================================
   BUTTON EVENTS
===================================================== */

function initializePart4Events() {

    document
        .getElementById(
            "btnPrintRegister"
        )
        ?.addEventListener(
            "click",
            printRegister
        );

    document
        .getElementById(
            "btnPrintBlank"
        )
        ?.addEventListener(
            "click",
            printBlankRegister
        );

    document
        .getElementById(
            "btnPrintRoomingList"
        )
        ?.addEventListener(
            "click",
            printRoomingList
        );

    document
        .getElementById(
            "btnOpenGroup"
        )
        ?.addEventListener(
            "dblclick",
            openGroupSelector
        );
}

/* =====================================================
   STARTUP
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    function() {
        renderSavedGroups();

        initializePart4Events();

        refreshDashboard();

        console.log(
            "App.js Part 4 Loaded"
        );
    }
);
/* =====================================================
   APP.JS PART 5
   PROFESSIONAL HOTEL FEATURES
===================================================== */
/* =====================================================
   SORT ROOMS
===================================================== */

function sortRooms() {

    const body =
        getRegisterBody();

    if (!body)
        return;

    const rows =
        [...body.rows];

    rows.sort(
        (a, b) => {

            const roomA =
                parseInt(
                    a.cells[1]
                    ?.innerText
                    .trim()
                ) || 0;

            const roomB =
                parseInt(
                    b.cells[1]
                    ?.innerText
                    .trim()
                ) || 0;

            return (
                roomA - roomB
            );
        }
    );

    body.innerHTML = "";

    rows.forEach(
        row => body.appendChild(row)
    );

    renumberRows();

    updateSummary();

}
/* =====================================================
   RENUMBER SERIALS
===================================================== */

function renumberRows() {

    const rows =
        [...getRegisterBody().rows];

    rows.forEach(
        (row, index) => {

            row.cells[0].innerText =
                index + 1;

        }
    );
}
/* =====================================================
   ROOM VALIDATION
===================================================== */

function validateRooms() {

    const rows =
        getRegisterRows();

    const roomMap = {};
    const guestMap = {};

    const duplicateRooms = [];
    const duplicateGuests = [];

    rows.forEach(row => {

        const room =
            String(
                row.roomNo || ""
            ).trim();

        const guest =
            String(
                row.guestName || ""
            )
            .trim()
            .toUpperCase();

        if (room) {

            if (roomMap[room]) {

                duplicateRooms.push(
                    room
                );

            } else {

                roomMap[room] = true;
            }
        }

        if (guest) {

            if (guestMap[guest]) {

                duplicateGuests.push(
                    guest
                );

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
   SHOW VALIDATION
===================================================== */

function showValidationReport() {

    const report =
        validateRooms();

    let text = "";

    if (
        report.duplicateRooms.length
    ) {

        text +=
            "Duplicate Rooms:\n";

        text +=
            report.duplicateRooms.join(
                ", "
            );

        text += "\n\n";
    }

    if (
        report.duplicateGuests.length
    ) {

        text +=
            "Duplicate Guests:\n";

        text +=
            report.duplicateGuests.join(
                ", "
            );

        text += "\n\n";
    }

    if (!text) {

        text =
            "No Duplicates Found";
    }

    alert(text);
}

/* =====================================================
   AUTO ROOM SERIES
===================================================== */

function autoGenerateRoomSeries() {

    const startRoom =
        prompt(
            "Starting Room Number"
        );

    if (!startRoom)
        return;

    const body =
        getRegisterBody();

    [...body.rows]
        .forEach(
            (
                row,
                index
            ) => {

                row.cells[1]
                    .innerText =
                    Number(
                        startRoom
                    ) + index;
            }
        );

    updateSummary();
    syncRoomingList();
}

/* =====================================================
   VIP FLAG
===================================================== */

function addVIPColumn() {

    const table =
        document.getElementById(
            "roomingListTable"
        );

    if (!table)
        return;

    const headerRow =
        table.querySelector(
            "thead tr"
        );

    if (
        headerRow.children.length < 8
    ) {

        const vipHeader =
            document.createElement(
                "th"
            );

        vipHeader.textContent =
            "VIP";

        headerRow.appendChild(
            vipHeader
        );
    }
}

/* =====================================================
   SPECIAL REQUESTS
===================================================== */

function addSpecialRequestColumn() {

    const table =
        document.getElementById(
            "roomingListTable"
        );

    if (!table)
        return;

    const headerRow =
        table.querySelector(
            "thead tr"
        );

    if (
        headerRow.children.length < 9
    ) {

        const requestHeader =
            document.createElement(
                "th"
            );

        requestHeader.textContent =
            "Special Request";

        headerRow.appendChild(
            requestHeader
        );
    }
}

/* =====================================================
   SEARCH GROUPS
===================================================== */

function searchGroups() {

    const search =
        prompt(
            "Search Group"
        );

    if (!search)
        return;

    const results =
        DB.groups.filter(
            group =>
            group.groupName
            .toLowerCase()
            .includes(
                search
                .toLowerCase()
            )
        );

    if (
        results.length === 0
    ) {

        alert(
            "No Groups Found"
        );

        return;
    }

    let text =
        "Matches:\n\n";

    results.forEach(
        group => {

            text +=
                group.groupName +
                "\n";
        }
    );

    alert(text);
}

/* =====================================================
   ARCHIVE GROUP
===================================================== */

function archiveCurrentGroup() {

    const group =
        getCurrentGroupData();

    if (
        !DB.archive
    ) {

        DB.archive = [];
    }

    DB.archive.push(
        group
    );

    saveDatabase();

    alert(
        "Group Archived"
    );
}

/* =====================================================
   BACKUP DATABASE
===================================================== */

function backupDatabase() {

    const blob =
        new Blob(

            [
                JSON.stringify(
                    DB,
                    null,
                    2
                )
            ],

            {
                type:
                "application/json"
            }
        );

    const link =
        document.createElement(
            "a"
        );

    link.href =
        URL.createObjectURL(
            blob
        );

    link.download =
        "hotel_database_backup.json";

    link.click();
}

/* =====================================================
   RESTORE DATABASE
===================================================== */

function restoreDatabase(file) {

    const reader =
        new FileReader();

    reader.onload =
        function(event) {

            try {

                DB =
                    JSON.parse(
                        event.target
                        .result
                    );

                saveDatabase();

                refreshDashboard();

                alert(
                    "Database Restored"
                );

            } catch(error) {

                alert(
                    "Invalid Backup"
                );
            }
        };

    reader.readAsText(
        file
    );
}

/* =====================================================
   MEAL ANALYTICS
===================================================== */

function showMealAnalytics() {

    const rows =
        getRegisterRows();

    let EP = 0;
    let CP = 0;
    let MAP = 0;
    let AP = 0;

    rows.forEach(
        row => {

            switch(
                row.meal
            ) {

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
        }
    );

    alert(

`Meal Analytics

EP : ${EP}
CP : ${CP}
MAP : ${MAP}
AP : ${AP}`
    );
}

/* =====================================================
   QUICK ACTIONS
===================================================== */

function initializeProfessionalTools() {

    window.hotelTools = {

        validate:
            showValidationReport,

        autoRooms:
            autoGenerateRoomSeries,

        search:
            searchGroups,

        archive:
            archiveCurrentGroup,

        backup:
            backupDatabase,

        mealAnalytics:
            showMealAnalytics
    };

    console.log(

        "Hotel Professional Tools Ready"
    );
}

/* =====================================================
   STARTUP
===================================================== */

document.addEventListener(

    "DOMContentLoaded",

    function() {

        addVIPColumn();

        addSpecialRequestColumn();

        initializeProfessionalTools();

        console.log(
            "App.js Part 5 Loaded"
        );
    }
);
/* =====================================================
   SAVED GROUPS PANEL
===================================================== */

function renderSavedGroups() {

const search =
(
    document.getElementById("groupSearch")?.value || ""
).trim().toLowerCase();

    const body =
        document.getElementById(
            "savedGroupsBody"
        );

    if (!body) return;

    body.innerHTML = "";

    DB.groups

        .filter(group =>

            (group.groupName || "")
            .toLowerCase()
            .includes(search)

        )

        .sort((a,b)=>

            (b.modifiedOn || "")
            .localeCompare(a.modifiedOn || "")

        )

        .forEach((group,index)=>{

            let badgeClass="status-pending";

            switch(group.status){

                case "Confirmed":
                    badgeClass="status-confirmed";
                    break;

                case "Arrived":
                    badgeClass="status-arrived";
                    break;

                case "Checked In":
                    badgeClass="status-checkedin";
                    break;

                case "Checked Out":
                    badgeClass="status-checkedout";
                    break;

                case "Cancelled":
                    badgeClass="status-cancelled";
                    break;
            }

            body.insertAdjacentHTML(

                "beforeend",

                `
<tr>

<td>${group.groupName || ""}</td>

<td>${group.arrivalDate || ""}</td>

<td>

<span class="${badgeClass}">
${group.status || "Pending"}
</span>

</td>

<td>${group.totalRooms || 0}</td>

<td>${group.modifiedOn || ""}</td>

<td>

<button
onclick="openSavedGroup(${index})">
Open
</button>

<button
onclick="deleteSavedGroup(${index})">
Delete
</button>

</td>

</tr>

`
            );

        });

}
/* =====================================================
   EXPORT CSV
===================================================== */

function exportCSV() {

    const rows =
        getRegisterRows();

    let csv =
        "Room No,Guest Name,Pax,Meal Plan,Mobile No\n";

    rows.forEach(row => {

        csv +=
            `"${row.roomNo || ""}",` +
            `"${row.guestName || ""}",` +
            `"${row.pax || 0}",` +
            `"${row.meal || ""}",` +
            `"${row.mobile || ""}"\n`;

    });

    const blob =
        new Blob(
            [csv],
            {
                type:
                "text/csv"
            }
        );

    const link =
        document.createElement("a");

    link.href =
        URL.createObjectURL(blob);

    link.download =
        (
            document.getElementById(
                "groupName"
            )?.value ||
            "Group"
        ) +
        "_RoomingList.csv";

    link.click();
}
/* =====================================================
   DUPLICATE ROOM CHECK
===================================================== */

function checkDuplicateRooms() {

    const rows =
        getRegisterRows();

    const seen =
        new Set();

    const duplicates =
        [];

    rows.forEach(row => {

        const room =
            (row.roomNo || "")
            .trim();

        if (!room)
            return;

        if (
            seen.has(room)
        ) {

            duplicates.push(
                room
            );

        } else {

            seen.add(
                room
            );
        }

    });

    return duplicates;
}
/* =====================================================
   ARRIVAL DASHBOARD
===================================================== */

function updateArrivalDashboard() {

    const today =
        new Date()
        .toISOString()
        .split("T")[0];

    const tomorrowDate =
        new Date();

    tomorrowDate.setDate(
        tomorrowDate.getDate() + 1
    );

    const tomorrow =
        tomorrowDate
        .toISOString()
        .split("T")[0];

    let todayCount = 0;
    let tomorrowCount = 0;
    let futureCount = 0;

    DB.groups.forEach(group => {

        const arrival =
            group.arrivalDate;

        if (!arrival)
            return;

        if (arrival === today) {

            todayCount++;

        } else if (
            arrival === tomorrow
        ) {

            tomorrowCount++;

        } else if (
            arrival > tomorrow
        ) {

            futureCount++;
        }

    });

    document.getElementById(
        "todayArrivals"
    ).textContent =
        todayCount;

    document.getElementById(
        "tomorrowArrivals"
    ).textContent =
        tomorrowCount;

    document.getElementById(
        "futureArrivals"
    ).textContent =
        futureCount;
}
function clearRegister() {

    if (
        !confirm(
            "Clear current register?"
        )
    ) {
        return;
    }

    document.getElementById(
        "groupName"
    ).value = "";

    document.getElementById(
        "arrivalDate"
    ).value = "";

    document.getElementById(
        "agentCompany"
    ).value = "";

    document.getElementById(
        "preparedBy"
    ).value = "";

    document.getElementById(
        "groupNotes"
    ).value = "";

    getRegisterBody().innerHTML = "";

    updateSummary();
}
function buildUpcomingArrivals() {

    const body =
        document.getElementById(
            "upcomingArrivalsBody"
        );

    if (!body)
        return;

    body.innerHTML = "";

    const groups =
        [...DB.groups]
        .sort(
            (a,b) =>
            (
                a.arrivalDate || ""
            )
            .localeCompare(
                b.arrivalDate || ""
            )
        );

    groups.forEach(group => {

        body.insertAdjacentHTML(

            "beforeend",

            `
            <tr>

                <td>
                    ${group.arrivalDate || ""}
                </td>

                <td>
                    ${group.groupName || ""}
                </td>

                <td>
                    ${group.totalRooms || 0}
                </td>

            </tr>
            `
        );

    });
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

        const status = (group.status || "Pending").trim();

        switch(status){

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

        rooms.forEach(room=>{

            mealCovers += Number(room.pax) || 0;

            if(room.vip){
                vipGuests++;
            }

        });

    });

    const setValue = (id,value)=>{

        const el = document.getElementById(id);

        if(el){
            el.textContent = value;
        }

    };

    setValue("dashboardPending",pending);
    setValue("dashboardConfirmed",confirmed);
    setValue("dashboardCheckedIn",checkedIn);
    setValue("dashboardCancelled",cancelled);

    setValue("dashboardVIP",vipGuests);
    setValue("dashboardMeals",mealCovers);
    setValue("dashboardAllocated",allocatedRooms);

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

    initializePart3Events();

    initializePart4Events();

    const saveSettingsButton =
        document.getElementById(
            "btnSaveSettings"
        );

    if (saveSettingsButton) {

        saveSettingsButton
            .addEventListener(
                "click",
                saveSettings
            );
    }

    /* ---------- Professional Tools ---------- */

    addVIPColumn();

    addSpecialRequestColumn();

    initializeProfessionalTools();

    /* ---------- Restore Work In Progress ---------- */

    restoreDraft();

    /* ---------- Full Refresh ---------- */

    refreshApplication();

    console.log(
        "Hotel Group Operations Suite Initialized"
    );

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
   APPLICATION REFRESH
===================================================== */

function refreshApplication() {

    /* ---------- Settings ---------- */

    refreshApplicationSettings();

    /* ---------- Dashboard ---------- */

    refreshEntireDashboard();

    /* ---------- Register ---------- */

    updateSummary();

    syncRoomingList();

    updateReports();

    updateDashboardFromRegister();

}
/* =====================================================
   APPLICATION SAVE
===================================================== */

function saveApplication() {

    saveCurrentGroup();

    refreshApplication();

}
/* =====================================================
   APPLICATION RESET
===================================================== */

function resetApplication() {

    refreshApplication();

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