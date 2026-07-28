/* =====================================================
   HOTEL GROUP OPERATIONS SUITE
   File    : js/room-master.js
   Version : 1.0.0 RC1

   ROOM CATEGORY MASTER

   Inventory first model:
       A room exists in the master whether or not it
       has a category. Unassigned rooms are visible.

   Depends on app.js for:
       DB, saveDatabase(), isRoomNumericOnly(),
       switchPage(), refreshApplication()

   Load AFTER printing.js and BEFORE app.js
===================================================== */


/* =====================================================
   STRUCTURE GUARD
===================================================== */

function ensureRoomMaster() {

    if (!DB.roomMaster) {

        DB.roomMaster = {
            categories: [],
            rooms: {}
        };
    }

    if (!Array.isArray(DB.roomMaster.categories)) {

        DB.roomMaster.categories = [];
    }

    if (
        !DB.roomMaster.rooms ||
        typeof DB.roomMaster.rooms !== "object"
    ) {

        DB.roomMaster.rooms = {};
    }

    return DB.roomMaster;
}


/* =====================================================
   ROOM NUMBER HELPERS
===================================================== */

function normalizeRoomNumber(value) {

    let room = String(value || "").trim();

    if (typeof isRoomNumericOnly === "function" &&
        isRoomNumericOnly()) {

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

    const bothNumeric =
        !isNaN(numA) && !isNaN(numB);

    if (bothNumeric && numA !== numB) {

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

                /* Guard against a runaway range */

                if (end - start > 500) {

                    end = start + 500;
                }

                const width = range[1].length;

                for (let i = start; i <= end; i++) {

                    const room =
                        String(i).padStart(width, "0");

                    const clean =
                        normalizeRoomNumber(room);

                    if (clean) result.push(clean);
                }

                return;
            }

            const single =
                normalizeRoomNumber(chunk);

            if (single) result.push(single);

        });

    /* Remove duplicates, keep order */

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

        ensureRoomMaster().categories.push(clean);

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

        /* Rooms stay in inventory, become unassigned */

        Object.keys(master.rooms).forEach(room => {

            if (master.rooms[room] === name) {

                master.rooms[room] = "";
            }

        });

        saveDatabase();

        return true;

    },

    getRoomNumbers() {

        return Object
            .keys(ensureRoomMaster().rooms)
            .sort(compareRoomNumbers);

    },

    getCategory(roomNo) {

        const room =
            normalizeRoomNumber(roomNo);

        if (!room) return "";

        return ensureRoomMaster().rooms[room] || "";

    },

    setRoom(roomNo, category) {

        const room =
            normalizeRoomNumber(roomNo);

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

        const room =
            normalizeRoomNumber(roomNo);

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
   GLOBAL CATEGORY LOOKUP

   Used by the register, printing and reports.
===================================================== */

function getRoomCategory(roomNo) {

    return RoomMasterRepository.getCategory(roomNo);

}


/* =====================================================
   ROOM MASTER VALIDATION
===================================================== */

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

    const category =
        categoryInput?.value || "";

    const added =
        RoomMasterRepository.setRoomsSilently(
            rooms,
            category
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
       201-206,Super Deluxe
       301,Suite
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

        /* Category is the LAST field, rooms are the rest */

        const category =
            (parts.length > 1
                ? parts[parts.length - 1]
                : ""
            ).trim();

        const roomText =
            (parts.length > 1
                ? parts.slice(0, -1).join(",")
                : parts[0]
            );

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
   RENDER : CATEGORY LIST
===================================================== */

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
            `<tr><td colspan="3">
                No categories yet. Add one above.
            </td></tr>`;

        return;
    }

    categories.forEach(name => {

        const safe =
            name.replace(/'/g, "\\'");

        body.insertAdjacentHTML(

            "beforeend",

            `
<tr>

    <td>${name}</td>

    <td>${counts[name] || 0}</td>

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
            `<tr><td colspan="3">
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

            const percent =
                total > 0
                    ? Math.round((count / total) * 100)
                    : 0;

            cards += `
            <div class="summary-card">
                <div>${name}</div>
                <strong>${count}</strong>
                <div class="muted-note">${percent}%</div>
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
        <div class="muted-note">rooms</div>
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

    renderRoomMaster();

}