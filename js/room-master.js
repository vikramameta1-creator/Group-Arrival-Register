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
   STRUCTURE GUARD
===================================================== */

function ensureRoomMaster() {

    if (!DB.roomMaster) {

        DB.roomMaster = {
            categories: [],
            rooms: {},
            rules: {}
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

    /* Every category must have a rule */

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

function addRoomCategory() {

    const input =
        document.getElementById("newCategoryName");

    if (!input) return;

    const name = input.value.trim();

    if (!name) {

        alert("Enter a category name.");

        return;
    }

    if (!RoomMasterRepository.addCategory(name)) {

        alert("That category already exists.");

        return;
    }

    input.value = "";

    renderRoomMaster();
}


function renameRoomCategory(name) {

    const updated =
        prompt("Rename category", name);

    if (updated === null) return;

    if (!updated.trim()) {

        alert("Category name cannot be empty.");

        return;
    }

    if (
        updated.trim().toLowerCase() !==
            name.toLowerCase() &&
        RoomMasterRepository.hasCategory(updated)
    ) {

        alert("That category already exists.");

        return;
    }

    RoomMasterRepository.renameCategory(name, updated);

    renderRoomMaster();
}


function deleteRoomCategory(name) {

    const counts =
        RoomMasterRepository.countByCategory();

    const affected = counts[name] || 0;

    const message =
        affected > 0
            ? "Delete category '" + name + "'?\n\n" +
              affected + " room(s) will become Unassigned.\n" +
              "The rooms themselves are not deleted."
            : "Delete category '" + name + "'?";

    if (!confirm(message)) return;

    RoomMasterRepository.removeCategory(name);

    renderRoomMaster();
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
   ROOM ACTIONS
===================================================== */

function addRoomsToMaster() {

    const roomInput =
        document.getElementById("newRoomNumbers");

    const categoryInput =
        document.getElementById("newRoomCategory");

    if (!roomInput) return;

    const rooms =
        parseRoomList(roomInput.value);

    if (rooms.length === 0) {

        alert(
            "Enter a room number or range.\n\n" +
            "Examples:  101      101-110      101,105,107"
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

    alert(
        rooms.length + " room(s) processed.\n" +
        added + " new room(s) added to inventory."
    );
}


function changeRoomCategory(roomNo, category) {

    RoomMasterRepository.setRoom(roomNo, category);

    renderRoomMasterSummary();

    if (typeof refreshRegisterViews === "function") {

        refreshRegisterViews();
    }
}


function deleteRoomFromMaster(roomNo) {

    if (
        !confirm(
            "Remove room " + roomNo + " from inventory?"
        )
    ) {
        return;
    }

    RoomMasterRepository.removeRoom(roomNo);

    renderRoomMaster();
}


function clearRoomMaster() {

    if (
        !confirm(
            "Remove ALL rooms from inventory?\n\n" +
            "Categories are kept. This cannot be undone."
        )
    ) {
        return;
    }

    RoomMasterRepository.removeAllRooms();

    renderRoomMaster();
}


/* =====================================================
   BULK SETUP

   One line per entry:
       101-110,Deluxe
===================================================== */

function processRoomMasterBulk() {

    const textarea =
        document.getElementById("roomMasterBulkText");

    if (!textarea) return;

    const text = textarea.value.trim();

    if (!text) {

        alert("Nothing to import.");

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

    alert(
        "Import complete.\n\n" +
        totalRooms + " room(s) processed.\n" +
        newCategories + " new category(ies) created."
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

function setRoomMasterPin() {

    const first =
        prompt("Enter a new 4-digit Manager PIN:");

    if (first === null) return;

    const pin = first.trim();

    if (!/^\d{4}$/.test(pin)) {

        alert("The PIN must be exactly 4 digits.");

        return;
    }

    const confirmPin =
        prompt("Re-enter the PIN to confirm:");

    if (confirmPin === null) return;

    if (confirmPin.trim() !== pin) {

        alert("The two PINs did not match.");

        return;
    }

    DB.settings.roomMasterPinHash = hashPin(pin);

    saveDatabase();

    roomMasterUnlocked = true;

    renderPinStatus();

    alert(
        "Manager PIN set.\n\n" +
        "Room Master will ask for it after every reload."
    );
}


function removeRoomMasterPin() {

    if (!hasRoomMasterPin()) return;

    const entered =
        prompt("Enter the current PIN to remove it:");

    if (entered === null) return;

    if (
        hashPin(entered.trim()) !==
        DB.settings.roomMasterPinHash
    ) {

        alert("Incorrect PIN.");

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