/* =====================================================
   HOTEL GROUP OPERATIONS SUITE
   File    : js/rates.js
   Version : 1.0.0

   NIGHTLY RATE CALENDAR

   Phase 3 of the rate system. Phases 1-2 (category rate
   matrix, agent rate cards) live in room-master.js and are
   configuration, not application - nothing in this file
   changes them. This file is where those numbers actually
   get APPLIED to a specific group's specific rooms, night
   by night.

   Resolution order for any one room, on any one night:

       1. FOC checked?          -> 0, source "FOC"
       2. Manually overridden?  -> whatever staff typed,
                                    source "Overridden"
       3. Agent has an override
          for this exact combo? -> that figure,
                                    source "Agent"
       4. Otherwise             -> the category default,
                                    source "Default"

   FOC always wins, even over a manual override - marking
   a room complimentary after a rate was typed in is taken
   as staff correcting the room's status, not asking to
   keep charging for it.

   Changing a night's MEAL PLAN re-runs this resolution
   automatically, UNLESS that night's rate was manually
   overridden - an override freezes the number so a later
   meal-plan change can't silently overwrite something
   staff typed in by hand. Only editing the rate number
   itself sets the override; changing the room's FOC flag,
   the agent, or the underlying rate cards elsewhere all
   still flow through automatically for any night that
   hasn't been frozen this way.

   Rates are internal only. Nothing here is ever read by
   printing.js or report-print.js, and it should stay that
   way - see room-master.js for the same rule applied to
   the rate cards this file reads from.

   Depends at runtime on:
       groups.js      currentGroupId, getRegisterRows
       register.js    getRegisterRows, getRoomDepartureDate
       database.js    getRoomDepartureDate
       reports.js     buildNightsInRange
       room-master.js RoomMasterRepository, getRoomCategory
       dialog.js      showAlert

   Load after reports.js (needs buildNightsInRange) and
   after groups.js (needs currentGroupId).
===================================================== */


/* =====================================================
   STATE

   Keyed by room number. Each entry is an array of nightly
   records: {date, mealPlan, rate, overridden}. This is
   deliberately NOT stored on the register row itself -
   a whole calendar per room doesn't fit the row/checkbox
   model the rest of the table uses, so it lives here,
   synced to/from the group object at load and save time,
   the same pattern attachments.js uses for its own
   session state.
===================================================== */

let rateCalendarState = {};


function resetRateCalendarState() {

    rateCalendarState = {};
}


function loadRateCalendarsFromGroup(group) {

    rateCalendarState =
        group && group.rateCalendars
            ? JSON.parse(JSON.stringify(group.rateCalendars))
            : {};
}


function getRateCalendarsForSave() {

    return JSON.parse(JSON.stringify(rateCalendarState));
}


/* =====================================================
   RATE RESOLUTION
===================================================== */

function getLiveGroupDates() {

    return {

        arrivalDate:
            document.getElementById("arrivalDate")
                ?.value || "",

        departureDate:
            document.getElementById("departureDate")
                ?.value || ""

    };
}


function resolveRoomRate(room, mealPlan, date, agent) {

    if (room.foc) {

        return { rate: 0, source: "FOC" };
    }

    const category =
        typeof getRoomCategory === "function"
            ? getRoomCategory(room.roomNo)
            : "";

    if (!category) {

        return { rate: 0, source: "Unassigned" };
    }

    const rule =
        RoomMasterRepository.getRule(category);

    const occupancy =
        Math.min(
            Math.max(Number(room.pax) || 1, 1),
            rule.maxOccupancy || 1
        );

    const cleanAgent = (agent || "").trim();

    /* Seasonal beats the agent's standing rate, which
       beats the category default - checked in that order,
       every time. A night with no date to check against
       (shouldn't normally happen, defensive only) just
       skips straight to the standing rate. */

    if (cleanAgent && date) {

        const season =
            RoomMasterRepository.findSeasonalRate(
                cleanAgent, category, occupancy, mealPlan, date
            );

        if (season) {

            return {
                rate: Number(season.rate) || 0,
                source: "Seasonal"
            };
        }
    }

    if (
        cleanAgent &&
        RoomMasterRepository.hasAgentOverride(
            cleanAgent, category, occupancy, mealPlan
        )
    ) {

        return {
            rate:
                RoomMasterRepository.getAgentRate(
                    cleanAgent, category, occupancy, mealPlan
                ),
            source: "Agent"
        };
    }

    return {
        rate:
            RoomMasterRepository.getRate(
                category, occupancy, mealPlan
            ),
        source: "Default"
    };
}


/* Thin wrapper kept for every existing call site in this
   file - all of them operate on whatever group is currently
   open in the register, so reading the agent straight from
   its own form field is correct there. Reporting on OTHER
   saved groups (buildRevenueStats, for one that has never
   been opened and so never had a calendar built) needs the
   agent to come from the group's own data instead - that's
   what resolveRoomRate() above is for, called directly with
   an explicit agent rather than through this wrapper. */

function resolveNightlyRate(room, mealPlan, date) {

    const agent =
        (
            document.getElementById("agentCompany")
                ?.value || ""
        ).trim();

    return resolveRoomRate(room, mealPlan, date, agent);
}


/* =====================================================
   CALENDAR RECONCILIATION

   Same philosophy as ensureRoomMaster()'s rate reconciler
   in room-master.js: run this every time it might matter,
   rather than trying to catch every single event that
   could invalidate it. Nights that already exist keep
   whatever they have, including any override. Nights that
   no longer apply (stay shortened) are dropped. New nights
   (stay extended, or a room just added) get auto-filled.
===================================================== */

function reconcileRoomCalendar(room, groupDates) {

    const departureDate =
        typeof getRoomDepartureDate === "function"
            ? getRoomDepartureDate(groupDates, room)
            : groupDates.departureDate;

    const nights =
        typeof buildNightsInRange === "function"
            ? buildNightsInRange(
                groupDates.arrivalDate,
                departureDate
            )
            : [];

    const existing =
        rateCalendarState[room.roomNo] || [];

    const byDate = {};

    existing.forEach(entry => {

        byDate[entry.date] = entry;

    });

    const rebuilt = [];

    nights.forEach(date => {

        let entry = byDate[date];

        if (!entry) {

            const resolved =
                resolveNightlyRate(
                    room, room.meal || "EP", date
                );

            entry = {

                date:            date,
                mealPlan:        room.meal || "EP",
                rate:            resolved.rate,
                overridden:      false,
                mealPlanTouched: false

            };

        } else {

            /* Meal plan and rate are tracked separately on
               purpose. A night explicitly changed within
               the rate panel itself (mealPlanTouched) stays
               exactly as staff set it, supporting genuinely
               different meal plans on different nights of
               the same stay. A night that was never touched
               here should keep following the register's
               main Meal dropdown - otherwise the calendar
               silently goes stale the moment the register
               changes after the calendar was first built,
               which is what actually happened here: room
               104 showed CP after the register had already
               moved to MAP. */

            if (!entry.mealPlanTouched) {

                entry.mealPlan = room.meal || entry.mealPlan;
            }

            if (!entry.overridden) {

                const resolved =
                    resolveNightlyRate(
                        room, entry.mealPlan, date
                    );

                entry.rate = resolved.rate;
            }

        }

        rebuilt.push(entry);

    });

    rateCalendarState[room.roomNo] = rebuilt;

}


function reconcileAllRateCalendars() {

    const rows =
        (typeof getRegisterRows === "function"
            ? getRegisterRows()
            : []
        ).filter(row =>
            typeof isEmptyRegisterRow === "function"
                ? !isEmptyRegisterRow(row)
                : !!(row.roomNo || row.guestName)
        );

    const groupDates = getLiveGroupDates();

    const liveRoomNumbers = {};

    rows.forEach(room => {

        if (!room.roomNo) return;

        liveRoomNumbers[room.roomNo] = true;

        reconcileRoomCalendar(room, groupDates);

    });

    /* A room removed from the register (row deleted)
       should not leave an orphaned calendar behind. */

    Object.keys(rateCalendarState).forEach(roomNo => {

        if (!liveRoomNumbers[roomNo]) {

            delete rateCalendarState[roomNo];
        }

    });

    return rows;
}


/* =====================================================
   EDIT HANDLERS
===================================================== */

function findLiveRoom(roomNo) {

    const rows =
        typeof getRegisterRows === "function"
            ? getRegisterRows()
            : [];

    return rows.find(r => r.roomNo === roomNo) || null;
}


function changeNightlyMealPlan(roomNo, date, value) {

    const nights = rateCalendarState[roomNo];

    if (!nights) return;

    const entry = nights.find(n => n.date === date);

    if (!entry) return;

    entry.mealPlan = value;

    entry.mealPlanTouched = true;

    if (!entry.overridden) {

        const room = findLiveRoom(roomNo);

        if (room) {

            const resolved =
                resolveNightlyRate(room, value, date);

            entry.rate = resolved.rate;
        }
    }

    renderRatesPanel();
}


function changeNightlyRate(roomNo, date, value) {

    const nights = rateCalendarState[roomNo];

    if (!nights) return;

    const entry = nights.find(n => n.date === date);

    if (!entry) return;

    let number = Number(value);

    if (isNaN(number) || number < 0) number = 0;

    entry.rate = number;

    entry.overridden = true;

    renderRatesPanel();
}


function resetNightlyOverride(roomNo, date) {

    const nights = rateCalendarState[roomNo];

    if (!nights) return;

    const entry = nights.find(n => n.date === date);

    if (!entry) return;

    entry.overridden = false;

    entry.mealPlanTouched = false;

    const room = findLiveRoom(roomNo);

    if (room) {

        const resolved =
            resolveNightlyRate(room, entry.mealPlan, date);

        entry.rate = resolved.rate;
    }

    renderRatesPanel();
}


/* =====================================================
   RENDER
===================================================== */

function formatRateAmount(amount) {

    const currency =
        typeof RoomMasterRepository !== "undefined"
            ? RoomMasterRepository.getRateCurrency()
            : "INR";

    const symbol =
        (typeof RATE_CURRENCIES !== "undefined" &&
            RATE_CURRENCIES[currency]) ||
        currency;

    return symbol + " " + Number(amount || 0).toLocaleString();
}


function renderRatesPanel() {

    const wrap =
        document.getElementById("ratesPanelBody");

    if (!wrap) return;

    const rows = reconcileAllRateCalendars();

    if (rows.length === 0) {

        wrap.innerHTML =
            `<p class="muted-note">
                No rooms in the register yet.
            </p>`;

        return;
    }

    let grandTotal = 0;

    let body = "";

    rows.forEach(room => {

        if (!room.roomNo) return;

        const nights =
            rateCalendarState[room.roomNo] || [];

        const roomTotal =
            nights.reduce(
                (t, n) => t + (Number(n.rate) || 0), 0
            );

        grandTotal += roomTotal;

        const safeRoom =
            String(room.roomNo).replace(/'/g, "\\'");

        let nightRows = "";

        nights.forEach(entry => {

            const resolvedSource =
                room.foc
                    ? "FOC"
                    : entry.overridden
                        ? "Overridden"
                        : resolveNightlyRate(
                              room, entry.mealPlan, entry.date
                          ).source;

            const source = resolvedSource;

            const badgeClass =
                {
                    "FOC":        "rate-badge-foc",
                    "Overridden": "rate-badge-overridden",
                    "Seasonal":   "rate-badge-seasonal",
                    "Agent":      "rate-badge-agent",
                    "Default":    "rate-badge-default",
                    "Unassigned": "rate-badge-default"
                }[resolvedSource] || "rate-badge-default";

            const mealOptions =
                RATE_MEAL_PLANS
                    .map(plan =>
                        `<option value="${plan}"${
                            entry.mealPlan === plan
                                ? " selected"
                                : ""
                        }>${plan}</option>`
                    )
                    .join("");

            nightRows += `
            <tr>
                <td>${entry.date}</td>
                <td>
                    <select
                        class="rate-plan-select"
                        ${room.foc ? "disabled" : ""}
                        onchange="changeNightlyMealPlan('${safeRoom}','${entry.date}',this.value)">
                        ${mealOptions}
                    </select>
                </td>
                <td>
                    <input
                        type="number"
                        class="rate-input"
                        min="0"
                        step="1"
                        ${room.foc ? "disabled" : ""}
                        value="${entry.rate}"
                        onchange="changeNightlyRate('${safeRoom}','${entry.date}',this.value)">
                </td>
                <td>
                    <span class="rate-source-badge ${badgeClass}">
                        ${source}
                    </span>
                    ${
                        entry.overridden && !room.foc
                            ? `<button type="button"
                                   class="rate-reset-btn"
                                   title="Clear override, go back to automatic"
                                   onclick="resetNightlyOverride('${safeRoom}','${entry.date}')">
                                   ↺
                               </button>`
                            : ""
                    }
                </td>
            </tr>
            `;

        });

        body += `
        <div class="rate-room-block">

            <div class="rate-room-header">
                <strong>Room ${room.roomNo}</strong>
                ${room.guestName ? "— " + room.guestName : ""}
                ${room.foc ? '<span class="rate-badge-foc-tag">FOC</span>' : ""}
                <span class="rate-room-total">
                    ${formatRateAmount(roomTotal)}
                </span>
            </div>

            <table class="data-table rate-calendar-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Meal Plan</th>
                        <th>Rate</th>
                        <th>Source</th>
                    </tr>
                </thead>
                <tbody>${nightRows}</tbody>
            </table>

        </div>
        `;

    });

    body += `
    <div class="rate-grand-total">
        Group Total &nbsp; ${formatRateAmount(grandTotal)}
    </div>
    `;

    wrap.innerHTML = body;
}


/* =====================================================
   STARTUP
===================================================== */

document.addEventListener("DOMContentLoaded", function () {

    document
        .getElementById("btnRefreshRates")
        ?.addEventListener("click", renderRatesPanel);

});


registerModuleVersion("rates.js", "1.0.0");