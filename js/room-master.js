/* =====================================================
   HOTEL GROUP OPERATIONS SUITE
   File    : js/room-master.js
   Version : 1.0.0 RC1

   ROOM CATEGORY MASTER + OCCUPANCY RULES

   Inventory first model:
       A room exists in the master whether or not it
       has a category. Unassigned rooms are visible.

   Occupancy rule:
       Max Occupancy caps the TOTAL people in a room.
       Children are a subset of that total, never an
       addition to it, so moving a person from the
       adult column to the child column can never
       create extra space.

   Depends on app.js for:
       DB, saveDatabase(), isRoomNumericOnly(),
       switchPage()

   Load AFTER printing.js and BEFORE app.js
===================================================== */


/* =====================================================
   DEFAULT OCCUPANCY RULE
===================================================== */

const DEFAULT_OCCUPANCY_RULE = {

    defaultAdults: 2,
    maxAdults:     2,
    maxChildren:   1,
    maxOccupancy:  3

};

const OCCUPANCY_FIELDS = [
    "defaultAdults",
    "maxAdults",
    "maxChildren",
    "maxOccupancy"
];


/* =====================================================
   CATEGORY RATES

   Internal reference only - never printed, never shown
   on any guest-facing document. Rate is per room, per
   night, and varies by occupancy count within a category
   (a Deluxe room at 1 pax is priced separately from the
   same Deluxe room at 2 or 3 pax) rather than one flat
   rate per category. Feeds the planned ADR/RevPAR/revenue
   reports (1.1.0) - this phase is data entry only, no
   report reads these numbers yet.
===================================================== */

const RATE_CURRENCIES = {

    INR: "₹",
    USD: "$",
    EUR: "€",
    GBP: "£",
    AED: "AED",
    SGD: "S$",
    AUD: "A$",
    CAD: "C$"

};

const DEFAULT_RATE_CURRENCY = "INR";

/* Rates vary by meal plan, not just category and
   occupancy - the same room at the same occupancy costs
   a different amount on CP than on MAP. */

const RATE_MEAL_PLANS = ["EP", "CP", "MAP", "AP"];


/* =====================================================
   STRUCTURE GUARD
===================================================== */

function ensureRoomMaster() {

    if (!DB.roomMaster) {

        DB.roomMaster = {
            categories: [],
            rooms: {},
            rules: {},
            rates: {},
            rateCurrency: DEFAULT_RATE_CURRENCY,
            agents: [],
            agentRates: {}
        };
    }

    const master = DB.roomMaster;

    if (!Array.isArray(master.categories)) {

        master.categories = [];
    }

    if (
        !master.rooms ||
        typeof master.rooms !== "object"
    ) {

        master.rooms = {};
    }

    if (
        !master.rules ||
        typeof master.rules !== "object"
    ) {

        master.rules = {};
    }

    if (
        !master.rates ||
        typeof master.rates !== "object"
    ) {

        master.rates = {};
    }

    if (!RATE_CURRENCIES[master.rateCurrency]) {

        master.rateCurrency = DEFAULT_RATE_CURRENCY;
    }

    if (!Array.isArray(master.agents)) {

        master.agents = [];
    }

    if (
        !master.agentRates ||
        typeof master.agentRates !== "object"
    ) {

        master.agentRates = {};
    }

    /* Agent rate cards stay deliberately SPARSE, unlike
       category rates above. An agent with no entry for a
       given category/occupancy/meal-plan combination is
       not "0" - it means "no override, use the category
       default." Force-filling every combination with 0
       would make every agent look like they get every
       room free, which is the opposite of what an empty
       card means. */

    master.agents.forEach(name => {

        if (
            !master.agentRates[name] ||
            typeof master.agentRates[name] !== "object"
        ) {

            master.agentRates[name] = {};
        }

    });

    /* Every category must have a rule, and a rate entry
       for every occupancy level from 1 up to that
       category's CURRENT max occupancy - reconciled every
       time this runs, same as the rule fields above, so
       raising or lowering Max Occupancy automatically
       grows or shrinks the rate fields to match on the
       very next render. */

    master.categories.forEach(name => {

        if (!master.rules[name]) {

            master.rules[name] =
                Object.assign({}, DEFAULT_OCCUPANCY_RULE);
        }

        OCCUPANCY_FIELDS.forEach(field => {

            const value =
                Number(master.rules[name][field]);

            master.rules[name][field] =
                isNaN(value) || value < 0
                    ? DEFAULT_OCCUPANCY_RULE[field]
                    : value;

        });

        if (
            !master.rates[name] ||
            typeof master.rates[name] !== "object"
        ) {

            master.rates[name] = {};
        }

        const maxOcc = master.rules[name].maxOccupancy;

        for (let occ = 1; occ <= maxOcc; occ++) {

            /* Each occupancy level holds one rate per meal
               plan, not a single number. A pre-existing
               plain-number entry (from before meal plans
               were tracked) is discarded rather than
               guessed into one specific plan - starts
               fresh at 0 across all four. */

            if (
                typeof master.rates[name][occ] !== "object" ||
                master.rates[name][occ] === null
            ) {

                master.rates[name][occ] = {};
            }

            RATE_MEAL_PLANS.forEach(plan => {

                const value =
                    Number(master.rates[name][occ][plan]);

                master.rates[name][occ][plan] =
                    isNaN(value) || value < 0 ? 0 : value;

            });

        }

        Object.keys(master.rates[name]).forEach(occ => {

            if (Number(occ) > maxOcc) {

                delete master.rates[name][occ];
            }

        });

    });

    return master;
}


/* =====================================================
   ROOM NUMBER HELPERS
===================================================== */

function normalizeRoomNumber(value) {

    let room = String(value || "").trim();

    if (
        typeof isRoomNumericOnly === "function" &&
        isRoomNumericOnly()
    ) {

        room = room.replace(/[^0-9]/g, "").slice(0, 3);

    } else {

        room = room
            .replace(/[^0-9A-Za-z\- ]/g, "")
            .slice(0, 10);
    }

    return room;
}


function compareRoomNumbers(a, b) {

    const numA = parseInt(a, 10);
    const numB = parseInt(b, 10);

    if (
        !isNaN(numA) &&
        !isNaN(numB) &&
        numA !== numB
    ) {

        return numA - numB;
    }

    return String(a).localeCompare(String(b));
}


/* =====================================================
   RANGE PARSER

   Accepts:
       101
       101-110
       101,102,105-107
===================================================== */

function parseRoomList(text) {

    const result = [];

    String(text || "")
        .split(",")
        .forEach(part => {

            const chunk = part.trim();

            if (!chunk) return;

            const range =
                chunk.match(/^(\d+)\s*-\s*(\d+)$/);

            if (range) {

                let start = parseInt(range[1], 10);
                let end   = parseInt(range[2], 10);

                if (start > end) {

                    const swap = start;
                    start = end;
                    end = swap;
                }

                if (end - start > 500) {

                    end = start + 500;
                }

                const width = range[1].length;

                for (let i = start; i <= end; i++) {

                    const clean =
                        normalizeRoomNumber(
                            String(i).padStart(width, "0")
                        );

                    if (clean) result.push(clean);
                }

                return;
            }

            const single =
                normalizeRoomNumber(chunk);

            if (single) result.push(single);

        });

    return [...new Set(result)];
}


/* =====================================================
   ROOM MASTER REPOSITORY

   The UI must never touch DB.roomMaster directly.
===================================================== */

const RoomMasterRepository = {

    getCategories() {

        return ensureRoomMaster().categories;

    },

    hasCategory(name) {

        return this
            .getCategories()
            .some(c =>
                c.toLowerCase() ===
                String(name).trim().toLowerCase()
            );

    },

    addCategory(name) {

        const clean = String(name || "").trim();

        if (!clean) return false;

        if (this.hasCategory(clean)) return false;

        const master = ensureRoomMaster();

        master.categories.push(clean);

        master.rules[clean] =
            Object.assign({}, DEFAULT_OCCUPANCY_RULE);

        saveDatabase();

        return true;

    },

    renameCategory(oldName, newName) {

        const master = ensureRoomMaster();

        const clean = String(newName || "").trim();

        if (!clean) return false;

        const index =
            master.categories.indexOf(oldName);

        if (index < 0) return false;

        master.categories[index] = clean;

        master.rules[clean] =
            master.rules[oldName] ||
            Object.assign({}, DEFAULT_OCCUPANCY_RULE);

        delete master.rules[oldName];

        master.rates[clean] =
            master.rates[oldName] || {};

        delete master.rates[oldName];

        Object.keys(master.rooms).forEach(room => {

            if (master.rooms[room] === oldName) {

                master.rooms[room] = clean;
            }

        });

        saveDatabase();

        return true;

    },

    removeCategory(name) {

        const master = ensureRoomMaster();

        const index =
            master.categories.indexOf(name);

        if (index < 0) return false;

        master.categories.splice(index, 1);

        delete master.rules[name];

        delete master.rates[name];

        Object.keys(master.rooms).forEach(room => {

            if (master.rooms[room] === name) {

                master.rooms[room] = "";
            }

        });

        saveDatabase();

        return true;

    },

    /* ---------- Occupancy Rules ---------- */

    getRule(category) {

        const master = ensureRoomMaster();

        if (
            !category ||
            !master.rules[category]
        ) {

            return Object.assign(
                {},
                DEFAULT_OCCUPANCY_RULE
            );
        }

        return Object.assign(
            {},
            master.rules[category]
        );

    },

    setRuleField(category, field, value) {

        const master = ensureRoomMaster();

        if (
            !master.rules[category] ||
            OCCUPANCY_FIELDS.indexOf(field) < 0
        ) {

            return false;
        }

        let number = Number(value);

        if (isNaN(number) || number < 0) number = 0;

        if (number > 20) number = 20;

        master.rules[category][field] = number;

        /* Keep the rule internally consistent */

        const rule = master.rules[category];

        if (rule.maxOccupancy < 1) {

            rule.maxOccupancy = 1;
        }

        if (rule.maxAdults > rule.maxOccupancy) {

            rule.maxAdults = rule.maxOccupancy;
        }

        if (rule.maxChildren > rule.maxOccupancy) {

            rule.maxChildren = rule.maxOccupancy;
        }

        if (rule.defaultAdults > rule.maxAdults) {

            rule.defaultAdults = rule.maxAdults;
        }

        if (rule.defaultAdults < 1) {

            rule.defaultAdults = 1;
        }

        saveDatabase();

        return true;

    },

    /* ---------- Category Rates ---------- */

    getRates(category) {

        const master = ensureRoomMaster();

        return Object.assign(
            {},
            master.rates[category] || {}
        );

    },

    getRate(category, occupancy, mealPlan) {

        const master = ensureRoomMaster();

        const bucket =
            (master.rates[category] || {})[occupancy] ||
            {};

        const value = Number(bucket[mealPlan]);

        return isNaN(value) ? 0 : value;

    },

    setRate(category, occupancy, mealPlan, value) {

        const master = ensureRoomMaster();

        if (
            !master.rates[category] ||
            !master.rates[category][occupancy] ||
            RATE_MEAL_PLANS.indexOf(mealPlan) < 0
        ) {

            return false;
        }

        let number = Number(value);

        if (isNaN(number) || number < 0) number = 0;

        master.rates[category][occupancy][mealPlan] =
            number;

        saveDatabase();

        return true;

    },

    getRateCurrency() {

        return ensureRoomMaster().rateCurrency;

    },

    setRateCurrency(code) {

        const master = ensureRoomMaster();

        if (!RATE_CURRENCIES[code]) return false;

        master.rateCurrency = code;

        saveDatabase();

        return true;

    },

    /* ---------- Agents ---------- */

    getAgents() {

        return ensureRoomMaster().agents;

    },

    hasAgent(name) {

        return this
            .getAgents()
            .some(a =>
                a.toLowerCase() ===
                String(name).trim().toLowerCase()
            );

    },

    addAgent(name) {

        const clean = String(name || "").trim();

        if (!clean) return false;

        if (this.hasAgent(clean)) return false;

        const master = ensureRoomMaster();

        master.agents.push(clean);

        master.agentRates[clean] = {};

        saveDatabase();

        return true;

    },

    renameAgent(oldName, newName) {

        const master = ensureRoomMaster();

        const clean = String(newName || "").trim();

        if (!clean) return false;

        const index =
            master.agents.indexOf(oldName);

        if (index < 0) return false;

        master.agents[index] = clean;

        master.agentRates[clean] =
            master.agentRates[oldName] || {};

        delete master.agentRates[oldName];

        saveDatabase();

        return true;

    },

    removeAgent(name) {

        const master = ensureRoomMaster();

        const index =
            master.agents.indexOf(name);

        if (index < 0) return false;

        master.agents.splice(index, 1);

        delete master.agentRates[name];

        saveDatabase();

        return true;

    },

    /* ---------- Agent Rate Overrides ----------

       An agent's card only holds what actually differs
       from the category default - absence means "use the
       default," not zero. getAgentRate() always resolves
       to a real, usable number by falling back to the
       category default itself; hasAgentOverride() is the
       only way to tell whether a specific figure came from
       the agent's own card or fell through to the default,
       which is what the Overridden/Default/Agent badge in
       the rate calendar (phase 3) will read. */

    hasAgentOverride(agent, category, occupancy, mealPlan) {

        const master = ensureRoomMaster();

        const bucket =
            (
                (
                    (master.agentRates[agent] || {})
                    [category] || {}
                )
                [occupancy] || {}
            );

        return (
            bucket[mealPlan] !== undefined &&
            bucket[mealPlan] !== null
        );

    },

    getAgentRate(agent, category, occupancy, mealPlan) {

        if (
            this.hasAgentOverride(
                agent, category, occupancy, mealPlan
            )
        ) {

            const master = ensureRoomMaster();

            const value =
                master.agentRates[agent]
                    [category][occupancy][mealPlan];

            const number = Number(value);

            if (!isNaN(number)) return number;
        }

        return this.getRate(category, occupancy, mealPlan);

    },

    setAgentRate(agent, category, occupancy, mealPlan, value) {

        const master = ensureRoomMaster();

        if (!master.agentRates[agent]) return false;

        if (RATE_MEAL_PLANS.indexOf(mealPlan) < 0) {

            return false;
        }

        if (!master.agentRates[agent][category]) {

            master.agentRates[agent][category] = {};
        }

        if (
            !master.agentRates[agent][category][occupancy]
        ) {

            master.agentRates[agent][category][occupancy] =
                {};
        }

        /* An empty value clears the override, falling
           back to the category default again - not the
           same as setting it to 0, which means this agent
           genuinely gets this exact combination free. */

        if (value === "" || value === null) {

            delete master.agentRates[agent]
                [category][occupancy][mealPlan];

        } else {

            let number = Number(value);

            if (isNaN(number) || number < 0) number = 0;

            master.agentRates[agent]
                [category][occupancy][mealPlan] = number;
        }

        saveDatabase();

        return true;

    },

    /* ---------- Rooms ---------- */

    getRoomNumbers() {

        return Object
            .keys(ensureRoomMaster().rooms)
            .sort(compareRoomNumbers);

    },

    getCategory(roomNo) {

        const room = normalizeRoomNumber(roomNo);

        if (!room) return "";

        return ensureRoomMaster().rooms[room] || "";

    },

    setRoom(roomNo, category) {

        const room = normalizeRoomNumber(roomNo);

        if (!room) return false;

        ensureRoomMaster().rooms[room] =
            category || "";

        saveDatabase();

        return true;

    },

    setRoomsSilently(roomList, category) {

        const master = ensureRoomMaster();

        let added = 0;

        roomList.forEach(room => {

            if (!(room in master.rooms)) added++;

            master.rooms[room] = category || "";

        });

        saveDatabase();

        return added;

    },

    removeRoom(roomNo) {

        const master = ensureRoomMaster();

        const room = normalizeRoomNumber(roomNo);

        if (!(room in master.rooms)) return false;

        delete master.rooms[room];

        saveDatabase();

        return true;

    },

    removeAllRooms() {

        ensureRoomMaster().rooms = {};

        saveDatabase();

    },

    totalRooms() {

        return this.getRoomNumbers().length;

    },

    totalBeds() {

        const master = ensureRoomMaster();

        let beds = 0;

        Object.values(master.rooms).forEach(category => {

            if (!category) return;

            beds += this.getRule(category).maxOccupancy;

        });

        return beds;

    },

    countByCategory() {

        const master = ensureRoomMaster();

        const counts = {};

        master.categories.forEach(c => {

            counts[c] = 0;

        });

        counts[""] = 0;

        Object.values(master.rooms).forEach(c => {

            const key =
                c && counts.hasOwnProperty(c) ? c : "";

            counts[key]++;

        });

        return counts;

    }

};


/* =====================================================
   GLOBAL LOOKUPS

   Used by the register, reports and validation.
===================================================== */

function getRoomCategory(roomNo) {

    return RoomMasterRepository.getCategory(roomNo);

}


function getRoomOccupancyRule(roomNo) {

    const category =
        RoomMasterRepository.getCategory(roomNo);

    return RoomMasterRepository.getRule(category);

}


function roomMasterHasRooms() {

    return RoomMasterRepository.totalRooms() > 0;

}


function isRoomInMaster(roomNo) {

    const room = normalizeRoomNumber(roomNo);

    if (!room) return true;

    return room in ensureRoomMaster().rooms;

}


/* =====================================================
   CATEGORY ACTIONS
===================================================== */

async function addRoomCategory() {

    const input =
        document.getElementById("newCategoryName");

    if (!input) return;

    const name = input.value.trim();

    if (!name) {

        await showAlert("Enter a category name.");

        return;
    }

    if (!RoomMasterRepository.addCategory(name)) {

        await showAlert("That category already exists.");

        return;
    }

    input.value = "";

    renderRoomMaster();
}


async function renameRoomCategory(name) {

    const updated =
        await showPrompt(
            "New name for this category",
            name,
            "Rename Category"
        );

    if (updated === null) return;

    if (!updated.trim()) {

        await showAlert("Category name cannot be empty.");

        return;
    }

    if (
        updated.trim().toLowerCase() !==
            name.toLowerCase() &&
        RoomMasterRepository.hasCategory(updated)
    ) {

        await showAlert("That category already exists.");

        return;
    }

    RoomMasterRepository.renameCategory(name, updated);

    renderRoomMaster();
}


async function deleteRoomCategory(name) {

    const counts =
        RoomMasterRepository.countByCategory();

    const affected = counts[name] || 0;

    const message =
        affected > 0
            ? "Delete category '" + name + "'?\n\n" +
              affected + " room(s) will become Unassigned.\n" +
              "The rooms themselves are not deleted."
            : "Delete category '" + name + "'?";

    const ok = await showConfirm(
        message,
        "Delete Category",
        { danger: true, okLabel: "Delete" }
    );

    if (!ok) return;

    RoomMasterRepository.removeCategory(name);

    renderRoomMaster();
}


async function addMasterAgent() {

    const input =
        document.getElementById("newAgentName");

    if (!input) return;

    const name = input.value.trim();

    if (!name) {

        await showAlert("Enter an agent name.");

        return;
    }

    if (!RoomMasterRepository.addAgent(name)) {

        await showAlert("That agent already exists.");

        return;
    }

    input.value = "";

    renderAgentPanels();
}


async function renameMasterAgent(name) {

    const updated =
        await showPrompt(
            "New name for this agent",
            name,
            "Rename Agent"
        );

    if (updated === null) return;

    if (!updated.trim()) {

        await showAlert("Agent name cannot be empty.");

        return;
    }

    if (
        updated.trim().toLowerCase() !==
            name.toLowerCase() &&
        RoomMasterRepository.hasAgent(updated)
    ) {

        await showAlert("That agent already exists.");

        return;
    }

    RoomMasterRepository.renameAgent(name, updated);

    renderAgentPanels();
}


async function deleteMasterAgent(name) {

    const ok = await showConfirm(
        "Delete agent '" + name + "'?\n\n" +
        "Any rate overrides on this agent's card are " +
        "removed. Groups already using this agent's name " +
        "are not affected - Agent/Company on a group is " +
        "free text, not linked to this list.",
        "Delete Agent",
        { danger: true, okLabel: "Delete" }
    );

    if (!ok) return;

    RoomMasterRepository.removeAgent(name);

    renderAgentPanels();
}


function changeCategoryRule(category, field, value) {

    RoomMasterRepository.setRuleField(
        category,
        field,
        value
    );

    renderRoomMaster();

    /* Register validation depends on these numbers */

    if (typeof refreshRegisterViews === "function") {

        refreshRegisterViews();
    }
}


/* =====================================================
   RATE ACTIONS
===================================================== */

function changeCategoryRate(category, occupancy, mealPlan, value) {

    RoomMasterRepository.setRate(
        category,
        occupancy,
        mealPlan,
        value
    );

    renderCategoryRates();
}


function changeRateCurrency(code) {

    RoomMasterRepository.setRateCurrency(code);

    renderCategoryRates();
}


/* =====================================================
   ROOM ACTIONS
===================================================== */

async function addRoomsToMaster() {

    const roomInput =
        document.getElementById("newRoomNumbers");

    const categoryInput =
        document.getElementById("newRoomCategory");

    if (!roomInput) return;

    const rooms =
        parseRoomList(roomInput.value);

    if (rooms.length === 0) {

        await showAlert(
            "Enter a room number or range.\n\n" +
            "Examples:\n101\n101-110\n101,105,107",
            "Nothing To Add"
        );

        return;
    }

    const added =
        RoomMasterRepository.setRoomsSilently(
            rooms,
            categoryInput?.value || ""
        );

    roomInput.value = "";

    renderRoomMaster();

    await showAlert(
        rooms.length + " room(s) processed.\n" +
        added + " new room(s) added to inventory.",
        "Rooms Added"
    );
}


function changeRoomCategory(roomNo, category) {

    RoomMasterRepository.setRoom(roomNo, category);

    renderRoomMasterSummary();

    if (typeof refreshRegisterViews === "function") {

        refreshRegisterViews();
    }
}


async function deleteRoomFromMaster(roomNo) {

    const ok = await showConfirm(
        "Remove room " + roomNo + " from inventory?",
        "Remove Room",
        { danger: true, okLabel: "Remove" }
    );

    if (!ok) return;

    RoomMasterRepository.removeRoom(roomNo);

    renderRoomMaster();
}


async function clearRoomMaster() {

    const ok = await showConfirm(
        "Remove ALL rooms from inventory?\n\n" +
        "Categories are kept. This cannot be undone.",
        "Clear Inventory",
        { danger: true, okLabel: "Delete All" }
    );

    if (!ok) return;

    RoomMasterRepository.removeAllRooms();

    renderRoomMaster();
}


/* =====================================================
   BULK SETUP

   One line per entry:
       101-110,Deluxe
===================================================== */

async function processRoomMasterBulk() {

    const textarea =
        document.getElementById("roomMasterBulkText");

    if (!textarea) return;

    const text = textarea.value.trim();

    if (!text) {

        await showAlert("Nothing to import.");

        return;
    }

    let totalRooms = 0;
    let newCategories = 0;

    text.split("\n").forEach(line => {

        if (!line.trim()) return;

        const parts = line.split(",");

        const category =
            (parts.length > 1
                ? parts[parts.length - 1]
                : ""
            ).trim();

        const roomText =
            parts.length > 1
                ? parts.slice(0, -1).join(",")
                : parts[0];

        const rooms = parseRoomList(roomText);

        if (rooms.length === 0) return;

        if (
            category &&
            RoomMasterRepository.addCategory(category)
        ) {

            newCategories++;
        }

        RoomMasterRepository.setRoomsSilently(
            rooms,
            category
        );

        totalRooms += rooms.length;

    });

    textarea.value = "";

    renderRoomMaster();

    await showAlert(
        totalRooms + " room(s) processed.\n" +
        newCategories + " new category(ies) created.",
        "Import Complete"
    );
}


/* =====================================================
   RENDER : CATEGORY TABLE
===================================================== */

function buildRuleInput(category, field, value) {

    const safe = category.replace(/'/g, "\\'");

    return `
    <input
        type="number"
        class="rule-input"
        min="0"
        max="20"
        value="${value}"
        onchange="changeCategoryRule('${safe}','${field}',this.value)">
    `;
}


function renderCategoryList() {

    const body =
        document.getElementById("categoryListBody");

    if (!body) return;

    const counts =
        RoomMasterRepository.countByCategory();

    body.innerHTML = "";

    const categories =
        RoomMasterRepository.getCategories();

    if (categories.length === 0) {

        body.innerHTML =
            `<tr><td colspan="7">
                No categories yet. Add one above.
            </td></tr>`;

        return;
    }

    categories.forEach(name => {

        const rule =
            RoomMasterRepository.getRule(name);

        const safe = name.replace(/'/g, "\\'");

        body.insertAdjacentHTML(

            "beforeend",

            `
<tr>

    <td><strong>${name}</strong></td>

    <td>${counts[name] || 0}</td>

    <td>${buildRuleInput(name,"defaultAdults",rule.defaultAdults)}</td>

    <td>${buildRuleInput(name,"maxAdults",rule.maxAdults)}</td>

    <td>${buildRuleInput(name,"maxChildren",rule.maxChildren)}</td>

    <td>${buildRuleInput(name,"maxOccupancy",rule.maxOccupancy)}</td>

    <td>
        <button onclick="renameRoomCategory('${safe}')">
            Rename
        </button>

        <button onclick="deleteRoomCategory('${safe}')">
            Delete
        </button>
    </td>

</tr>
`
        );

    });
}


/* =====================================================
   RENDER : CATEGORY DROPDOWN
===================================================== */

/* =====================================================
   RENDER : CATEGORY RATES
===================================================== */

function buildRateOccupancyBlock(category, occupancy, rateRow) {

    const safe = category.replace(/'/g, "\\'");

    let planInputs = "";

    RATE_MEAL_PLANS.forEach(plan => {

        const value = (rateRow || {})[plan] || 0;

        planInputs += `
        <label class="rate-plan-label">
            <span class="rate-plan-tag">${plan}</span>
            <input
                type="number"
                class="rate-input"
                min="0"
                step="1"
                value="${value}"
                onchange="changeCategoryRate('${safe}',${occupancy},'${plan}',this.value)">
        </label>
        `;

    });

    return `
    <div class="rate-occupancy-block">
        <div class="rate-occ-tag">${occupancy} pax</div>
        <div class="rate-plan-row">${planInputs}</div>
    </div>
    `;
}


function renderCategoryRates() {

    const wrap =
        document.getElementById("categoryRatesBody");

    const currencySelect =
        document.getElementById("rateCurrencySelect");

    if (!wrap) return;

    const categories =
        RoomMasterRepository.getCategories();

    const currency =
        RoomMasterRepository.getRateCurrency();

    if (currencySelect) {

        currencySelect.value = currency;
    }

    const symbol =
        RATE_CURRENCIES[currency] || currency;

    wrap.innerHTML = "";

    if (categories.length === 0) {

        wrap.innerHTML =
            `<p class="muted-note">
                No categories yet. Add one above before
                setting rates.
            </p>`;

        return;
    }

    categories.forEach(name => {

        const rule =
            RoomMasterRepository.getRule(name);

        const rates =
            RoomMasterRepository.getRates(name);

        let blocks = "";

        for (
            let occ = 1;
            occ <= rule.maxOccupancy;
            occ++
        ) {

            blocks += buildRateOccupancyBlock(
                name,
                occ,
                rates[occ]
            );

        }

        wrap.insertAdjacentHTML(

            "beforeend",

            `
<div class="rate-category-row">

    <div class="rate-category-name">
        ${name}
        <span class="rate-currency-tag">${symbol}</span>
    </div>

    <div class="rate-occupancy-list">
        ${blocks}
    </div>

</div>
`
        );

    });
}


/* =====================================================
   RENDER : AGENTS

   Deleting or renaming an agent here does NOT touch any
   group already saved with that name in its free-text
   Agent/Company field - that field has never been linked
   to this list, only matched against it by name when the
   rate calendar (phase 3) looks up which card to use. A
   rename here means groups saved under the old name stop
   matching this card until the group itself is updated.
===================================================== */

function renderAgentList() {

    const body =
        document.getElementById("agentListBody");

    if (!body) return;

    const agents =
        RoomMasterRepository.getAgents();

    body.innerHTML = "";

    if (agents.length === 0) {

        body.innerHTML =
            `<tr><td colspan="2">
                No agents yet. Add one above.
            </td></tr>`;

        return;
    }

    agents.forEach(name => {

        const safe = name.replace(/'/g, "\\'");

        body.insertAdjacentHTML(

            "beforeend",

            `
<tr>

    <td><strong>${name}</strong></td>

    <td>
        <button onclick="renameMasterAgent('${safe}')">
            Rename
        </button>

        <button onclick="deleteMasterAgent('${safe}')">
            Delete
        </button>
    </td>

</tr>
`
        );

    });
}


function renderAgentSelector() {

    const select =
        document.getElementById("agentRateSelect");

    if (!select) return;

    const current = select.value;

    const agents =
        RoomMasterRepository.getAgents();

    select.innerHTML =
        agents.length === 0
            ? '<option value="">No agents yet</option>'
            : agents
                .map(name =>
                    `<option value="${name}">${name}</option>`
                )
                .join("");

    if (agents.indexOf(current) >= 0) {

        select.value = current;
    }
}


function buildAgentRateOccupancyBlock(
    agent, category, occupancy, rule
) {

    const safeAgent = agent.replace(/'/g, "\\'");

    const safeCategory =
        category.replace(/'/g, "\\'");

    let planInputs = "";

    RATE_MEAL_PLANS.forEach(plan => {

        const isOverridden =
            RoomMasterRepository.hasAgentOverride(
                agent, category, occupancy, plan
            );

        const resolved =
            RoomMasterRepository.getAgentRate(
                agent, category, occupancy, plan
            );

        const inputValue =
            isOverridden ? resolved : "";

        const placeholder =
            isOverridden ? "" : String(resolved);

        planInputs += `
        <label class="rate-plan-label">
            <span class="rate-plan-tag">${plan}</span>
            <input
                type="number"
                class="rate-input${
                    isOverridden
                        ? " rate-input-overridden"
                        : ""
                }"
                min="0"
                step="1"
                placeholder="${placeholder}"
                value="${inputValue}"
                title="${
                    isOverridden
                        ? "Overridden for this agent"
                        : "Using category default"
                }"
                onchange="changeAgentRate('${safeAgent}','${safeCategory}',${occupancy},'${plan}',this.value)">
        </label>
        `;

    });

    return `
    <div class="rate-occupancy-block">
        <div class="rate-occ-tag">${occupancy} pax</div>
        <div class="rate-plan-row">${planInputs}</div>
    </div>
    `;
}


function renderAgentRateCard() {

    const wrap =
        document.getElementById("agentRateCardBody");

    const select =
        document.getElementById("agentRateSelect");

    if (!wrap) return;

    const agent = select?.value || "";

    const categories =
        RoomMasterRepository.getCategories();

    if (!agent) {

        wrap.innerHTML =
            `<p class="muted-note">
                No agent selected.
            </p>`;

        return;
    }

    if (categories.length === 0) {

        wrap.innerHTML =
            `<p class="muted-note">
                No categories yet - add one before setting
                agent rates.
            </p>`;

        return;
    }

    const currency =
        RoomMasterRepository.getRateCurrency();

    const symbol =
        RATE_CURRENCIES[currency] || currency;

    wrap.innerHTML = "";

    categories.forEach(name => {

        const rule =
            RoomMasterRepository.getRule(name);

        let blocks = "";

        for (
            let occ = 1;
            occ <= rule.maxOccupancy;
            occ++
        ) {

            blocks += buildAgentRateOccupancyBlock(
                agent, name, occ, rule
            );

        }

        wrap.insertAdjacentHTML(

            "beforeend",

            `
<div class="rate-category-row">

    <div class="rate-category-name">
        ${name}
        <span class="rate-currency-tag">${symbol}</span>
    </div>

    <div class="rate-occupancy-list">
        ${blocks}
    </div>

</div>
`
        );

    });
}


function renderAgentPanels() {

    renderAgentList();

    renderAgentSelector();

    renderAgentRateCard();
}


function changeAgentRate(
    agent, category, occupancy, mealPlan, value
) {

    RoomMasterRepository.setAgentRate(
        agent, category, occupancy, mealPlan, value
    );

    renderAgentRateCard();
}


/* =====================================================
   RENDER : CATEGORY DROPDOWN
===================================================== */

function renderCategoryDropdown() {

    const select =
        document.getElementById("newRoomCategory");

    if (!select) return;

    const previous = select.value;

    select.innerHTML =
        `<option value="">Unassigned</option>`;

    RoomMasterRepository
        .getCategories()
        .forEach(name => {

            select.insertAdjacentHTML(
                "beforeend",
                `<option value="${name}">${name}</option>`
            );

        });

    select.value = previous;
}


/* =====================================================
   RENDER : INVENTORY TABLE
===================================================== */

function renderRoomInventory() {

    const body =
        document.getElementById("roomInventoryBody");

    if (!body) return;

    const search =
        (
            document.getElementById("roomMasterSearch")
            ?.value || ""
        )
        .trim()
        .toLowerCase();

    const categories =
        RoomMasterRepository.getCategories();

    body.innerHTML = "";

    const rooms =
        RoomMasterRepository
        .getRoomNumbers()
        .filter(room => {

            if (!search) return true;

            const category =
                RoomMasterRepository
                .getCategory(room)
                .toLowerCase();

            return (
                room.toLowerCase().includes(search) ||
                category.includes(search)
            );

        });

    if (rooms.length === 0) {

        body.innerHTML =
            `<tr><td colspan="4">
                No rooms in inventory.
            </td></tr>`;

        return;
    }

    rooms.forEach(room => {

        const current =
            RoomMasterRepository.getCategory(room);

        let options =
            `<option value=""${
                current === "" ? " selected" : ""
            }>Unassigned</option>`;

        categories.forEach(name => {

            options +=
                `<option value="${name}"${
                    current === name ? " selected" : ""
                }>${name}</option>`;

        });

        const rule =
            RoomMasterRepository.getRule(current);

        const capacity =
            current
                ? rule.defaultAdults +
                  " default · max " +
                  rule.maxOccupancy
                : "—";

        body.insertAdjacentHTML(

            "beforeend",

            `
<tr>

    <td>${room}</td>

    <td>
        <select onchange="changeRoomCategory('${room}', this.value)">
            ${options}
        </select>
    </td>

    <td class="capacity-cell">${capacity}</td>

    <td>
        <button onclick="deleteRoomFromMaster('${room}')">
            Remove
        </button>
    </td>

</tr>
`
        );

    });
}


/* =====================================================
   RENDER : SUMMARY
===================================================== */

function renderRoomMasterSummary() {

    const target =
        document.getElementById("roomMasterSummary");

    if (!target) return;

    const counts =
        RoomMasterRepository.countByCategory();

    const total =
        RoomMasterRepository.totalRooms();

    if (total === 0) {

        target.innerHTML =
            `<p class="muted-note">
                No rooms mapped yet.
            </p>`;

        return;
    }

    let cards = "";

    RoomMasterRepository
        .getCategories()
        .forEach(name => {

            const count = counts[name] || 0;

            const rule =
                RoomMasterRepository.getRule(name);

            const percent =
                total > 0
                    ? Math.round((count / total) * 100)
                    : 0;

            cards += `
            <div class="summary-card">
                <div>${name}</div>
                <strong>${count}</strong>
                <div class="muted-note">
                    ${percent}% · sleeps ${rule.maxOccupancy}
                </div>
            </div>
            `;

        });

    const unassigned = counts[""] || 0;

    if (unassigned > 0) {

        cards += `
        <div class="summary-card unassigned-card">
            <div>Unassigned</div>
            <strong>${unassigned}</strong>
            <div class="muted-note">needs a category</div>
        </div>
        `;
    }

    cards += `
    <div class="summary-card total-card">
        <div>Total Inventory</div>
        <strong>${total}</strong>
        <div class="muted-note">
            ${RoomMasterRepository.totalBeds()} beds
        </div>
    </div>
    `;

    target.innerHTML =
        `<div class="summary-grid">${cards}</div>`;
}


/* =====================================================
   RENDER : EVERYTHING
===================================================== */

function renderRoomMaster() {

    renderCategoryList();

    renderCategoryDropdown();

    renderCategoryRates();

    renderAgentPanels();

    renderRoomInventory();

    renderRoomMasterSummary();

}


/* =====================================================
   EVENT BINDINGS
===================================================== */

function initializeRoomMasterEvents() {

    document
        .getElementById("btnAddCategory")
        ?.addEventListener("click", addRoomCategory);

    document
        .getElementById("newCategoryName")
        ?.addEventListener("keydown", function (event) {

            if (event.key === "Enter") {

                event.preventDefault();

                addRoomCategory();
            }

        });

    document
        .getElementById("btnAddRooms")
        ?.addEventListener("click", addRoomsToMaster);

    document
        .getElementById("newRoomNumbers")
        ?.addEventListener("keydown", function (event) {

            if (event.key === "Enter") {

                event.preventDefault();

                addRoomsToMaster();
            }

        });

    document
        .getElementById("btnRoomMasterBulk")
        ?.addEventListener("click", processRoomMasterBulk);

    document
        .getElementById("btnClearRoomMaster")
        ?.addEventListener("click", clearRoomMaster);

    document
        .getElementById("roomMasterSearch")
        ?.addEventListener("input", renderRoomInventory);

    document
        .getElementById("rateCurrencySelect")
        ?.addEventListener("change", function () {

            changeRateCurrency(this.value);

        });

    document
        .getElementById("btnAddAgent")
        ?.addEventListener("click", addMasterAgent);

    document
        .getElementById("newAgentName")
        ?.addEventListener("keydown", function (event) {

            if (event.key === "Enter") {

                event.preventDefault();

                addMasterAgent();
            }

        });

    document
        .getElementById("agentRateSelect")
        ?.addEventListener(
            "change",
            renderAgentRateCard
        );

}


/* =====================================================
   MODULE STARTUP
===================================================== */

function initializeRoomMaster() {

    ensureRoomMaster();

    initializeRoomMasterEvents();

    initializeRoomMasterLock();

    renderRoomMaster();

}


/* =====================================================
   ROOM MASTER ACCESS GUARD

   Accident prevention, not security. The PIN lives in
   localStorage and is readable by anyone with DevTools.
   Real authentication arrives with the v1.1 backend.
===================================================== */

let roomMasterUnlocked = false;


function hashPin(pin) {

    let hash = 5381;

    const text = "hgos:" + String(pin || "");

    for (let i = 0; i < text.length; i++) {

        hash = ((hash << 5) + hash + text.charCodeAt(i)) >>> 0;
    }

    return "p" + hash.toString(36);
}


function hasRoomMasterPin() {

    return !!(DB.settings && DB.settings.roomMasterPinHash);
}


function isRoomMasterLocked() {

    return hasRoomMasterPin() && !roomMasterUnlocked;
}


function applyRoomMasterLock() {

    const page =
        document.getElementById("roomMasterPage");

    const lock =
        document.getElementById("roomMasterLock");

    if (!page || !lock) return;

    const locked = isRoomMasterLocked();

    page.classList.toggle("page-locked", locked);

    lock.style.display = locked ? "block" : "none";

    if (locked) {

        const input =
            document.getElementById("roomMasterPinInput");

        if (input) {

            input.value = "";

            setTimeout(() => input.focus(), 60);
        }
    }
}


function submitRoomMasterPin() {

    const input =
        document.getElementById("roomMasterPinInput");

    const message =
        document.getElementById("roomMasterPinMessage");

    if (!input) return;

    const entered = input.value.trim();

    if (
        hashPin(entered) === DB.settings.roomMasterPinHash
    ) {

        roomMasterUnlocked = true;

        if (message) message.textContent = "";

        applyRoomMasterLock();

        renderRoomMaster();

        return;
    }

    if (message) {

        message.textContent = "Incorrect PIN.";
    }

    input.value = "";

    input.focus();
}


function lockRoomMaster() {

    roomMasterUnlocked = false;

    applyRoomMasterLock();
}


/* ---------- Settings Actions ---------- */

async function setRoomMasterPin() {

    /* Changing an existing PIN requires the current one
       first - without this check, anyone at the keyboard
       could silently replace the PIN with their own,
       making it worthless as any kind of guard at all. */

    if (
        typeof hasRoomMasterPin === "function" &&
        hasRoomMasterPin()
    ) {

        const current = await showPrompt(
            "Enter the current PIN to change it.",
            "",
            "Confirm Current PIN",
            {
                inputType: "password",
                maxLength: 4,
                placeholder: "0000"
            }
        );

        if (current === null) return;

        if (
            typeof hashPin !== "function" ||
            hashPin(current.trim()) !==
                DB.settings.roomMasterPinHash
        ) {

            await showAlert(
                "Incorrect PIN. The PIN was not changed.",
                "Incorrect PIN"
            );

            return;
        }
    }

    const first = await showPrompt(
        "Enter a new 4-digit Manager PIN.",
        "",
        "Set Manager PIN",
        {
            inputType: "password",
            maxLength: 4,
            placeholder: "0000"
        }
    );

    if (first === null) return;

    const pin = first.trim();

    if (!/^\d{4}$/.test(pin)) {

        await showAlert("The PIN must be exactly 4 digits.");

        return;
    }

    const again = await showPrompt(
        "Re-enter the PIN to confirm.",
        "",
        "Confirm PIN",
        {
            inputType: "password",
            maxLength: 4,
            placeholder: "0000"
        }
    );

    if (again === null) return;

    if (again.trim() !== pin) {

        await showAlert("The two PINs did not match.");

        return;
    }

    DB.settings.roomMasterPinHash = hashPin(pin);

    saveDatabase();

    roomMasterUnlocked = true;

    renderPinStatus();

    await showAlert(
        "Room Master will ask for this PIN after every reload.",
        "Manager PIN Set"
    );
}


async function removeRoomMasterPin() {

    if (!hasRoomMasterPin()) return;

    const entered = await showPrompt(
        "Enter the current PIN to remove it.",
        "",
        "Remove Manager PIN",
        {
            inputType: "password",
            maxLength: 4,
            placeholder: "0000"
        }
    );

    if (entered === null) return;

    if (
        hashPin(entered.trim()) !==
        DB.settings.roomMasterPinHash
    ) {

        await showAlert("Incorrect PIN.");

        return;
    }

    delete DB.settings.roomMasterPinHash;

    saveDatabase();

    roomMasterUnlocked = false;

    renderPinStatus();

    applyRoomMasterLock();
}


function renderPinStatus() {

    const status =
        document.getElementById("pinStatus");

    const setButton =
        document.getElementById("btnSetPin");

    const removeButton =
        document.getElementById("btnRemovePin");

    if (status) {

        status.textContent =
            hasRoomMasterPin()
                ? "PIN is set. Room Master is protected."
                : "No PIN set. Room Master is open to everyone.";

        status.className =
            "muted-note " +
            (hasRoomMasterPin() ? "pin-on" : "pin-off");
    }

    if (setButton) {

        setButton.textContent =
            hasRoomMasterPin() ? "Change PIN" : "Set PIN";
    }

    if (removeButton) {

        removeButton.style.display =
            hasRoomMasterPin() ? "" : "none";
    }
}


function initializeRoomMasterLock() {

    document
        .getElementById("btnUnlockRoomMaster")
        ?.addEventListener("click", submitRoomMasterPin);

    document
        .getElementById("roomMasterPinInput")
        ?.addEventListener("keydown", function (event) {

            if (event.key === "Enter") {

                event.preventDefault();

                submitRoomMasterPin();
            }

        });

    document
        .getElementById("btnLockRoomMaster")
        ?.addEventListener("click", lockRoomMaster);

    document
        .getElementById("btnSetPin")
        ?.addEventListener("click", setRoomMasterPin);

    document
        .getElementById("btnRemovePin")
        ?.addEventListener("click", removeRoomMasterPin);

    renderPinStatus();

    applyRoomMasterLock();
}
registerModuleVersion("room-master.js", "1.0.0");