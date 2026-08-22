/* =====================================================
   HOTEL GROUP OPERATIONS SUITE
   File    : js/shortcuts.js
   Version : 1.0.0 RC1

   KEYBOARD SHORTCUTS

   A receptionist entering forty rooms should not have
   to reach for the mouse.

   Global
       Alt + 1..6      switch tab
       Ctrl + S        save group
       Ctrl + P        print register
       Ctrl + Shift + B  print blank register
       F1  or  ?       shortcut help

   Arrival Register
       Ctrl + Enter    add a row
       Ctrl + G        focus the room count box
       Ctrl + D        check duplicates

   Enter and Escape inside dialogs are handled by
   dialog.js and are not touched here.

   Depends on dialog.js and app.js. Load LAST.
===================================================== */


/* =====================================================
   CONTEXT HELPERS
===================================================== */

function getActivePageId() {

    const page =
        document.querySelector(".page.active-page");

    return page ? page.id : "";
}


function isDialogOpen() {

    const overlay =
        document.getElementById("appDialog");

    return !!(
        overlay &&
        overlay.style.display !== "none" &&
        overlay.style.display !== ""
    );
}


function isRoomMasterBlocked() {

    return (
        getActivePageId() === "roomMasterPage" &&
        typeof isRoomMasterLocked === "function" &&
        isRoomMasterLocked()
    );
}


/* Plain single-key shortcuts must not fire while the
   person is typing. Ctrl combinations are safe. */

function isTypingContext(event) {

    const target = event.target;

    if (!target) return false;

    if (target.isContentEditable) return true;

    const tag = (target.tagName || "").toUpperCase();

    return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT"
    );
}


function clickIfPresent(id) {

    const element = document.getElementById(id);

    if (element) {

        element.click();

        return true;
    }

    return false;
}


/* =====================================================
   TAB SWITCHING
===================================================== */

const SHORTCUT_PAGES = [
    "dashboardPage",
    "arrivalPage",
    "registerToolsPage",
    "roomingPage",
    "roomMasterPage",
    "reportsPage",
    "settingsPage"
];


function switchPageByNumber(number) {

    const pageId = SHORTCUT_PAGES[number - 1];

    if (pageId && typeof switchPage === "function") {

        switchPage(pageId);
    }
}


/* =====================================================
   REGISTER ACTIONS
===================================================== */

function focusRoomCount() {

    if (typeof switchPage === "function") {

        switchPage("arrivalPage");
    }

    const input =
        document.getElementById("roomCount");

    if (input) {

        input.focus();

        input.select();
    }
}


function focusFirstEmptyCell() {

    const body = getRegisterBody?.();

    if (!body || body.rows.length === 0) return;

    const lastRow = body.rows[body.rows.length - 1];

    const cell =
        lastRow.cells[REGISTER_COLUMNS.ROOM];

    if (cell && typeof placeCaretAtEnd === "function") {

        placeCaretAtEnd(cell);
    }
}


/* =====================================================
   HELP
===================================================== */

function showShortcutHelp() {

    showAlert(

`Alt + 1 … 7        Switch tab
Ctrl + S           Save group
Ctrl + P           Print register
Ctrl + Shift + B   Blank register
Ctrl + Enter       Add a row
Ctrl + G           Room count box
Ctrl + D           Check duplicates
F1  or  ?          This list

Enter              Next row, same column
Esc                Close a dialog

A floating Save button stays visible on every
page - Ctrl+S uses it, no tab switch needed.`,

        "Keyboard Shortcuts"
    );
}


/* =====================================================
   MAIN HANDLER
===================================================== */

function handleGlobalShortcut(event) {

    /* dialog.js owns the keyboard while a dialog is up */

    if (isDialogOpen()) return;

    const key = (event.key || "").toLowerCase();

    /* ---------- Alt + number : tabs ---------- */

    if (
        event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        /^[1-7]$/.test(event.key)
    ) {

        event.preventDefault();

        switchPageByNumber(Number(event.key));

        return;
    }

    /* ---------- Help ---------- */

    if (
        event.key === "F1" ||
        (event.key === "?" && !isTypingContext(event))
    ) {

        event.preventDefault();

        showShortcutHelp();

        return;
    }

    const control = event.ctrlKey || event.metaKey;

    if (!control) return;

    /* ---------- Ctrl + S : save ---------- */

    if (key === "s" && !event.shiftKey) {

        event.preventDefault();

        if (isRoomMasterBlocked()) return;

        if (getActivePageId() === "settingsPage") {

            clickIfPresent("btnSaveSettings");

            return;
        }

        /* The floating Save button is visible on every
           page now, so this no longer needs to switch
           pages first to prove the save happened - the
           save flash and the floating button itself are
           feedback enough regardless of which tab is
           open. */

        clickIfPresent("floatingSaveBtn");

        return;
    }

    /* ---------- Ctrl + Shift + B : blank register ---------- */

    if (key === "b" && event.shiftKey) {

        event.preventDefault();

        clickIfPresent("btnPrintBlank");

        return;
    }

    /* ---------- Ctrl + P : print ---------- */

    if (key === "p" && !event.shiftKey) {

        event.preventDefault();

        const page = getActivePageId();

        if (page === "roomingPage") {

            clickIfPresent("btnPrintRoomingList");

            return;
        }

        clickIfPresent("btnPrintRegister");

        return;
    }

    /* ---------- Ctrl + Enter : add row ---------- */

    if (key === "enter") {

        event.preventDefault();

        if (typeof switchPage === "function") {

            switchPage("arrivalPage");
        }

        clickIfPresent("btnAddRow");

        setTimeout(focusFirstEmptyCell, 40);

        return;
    }

    /* ---------- Ctrl + G : room count ---------- */

    if (key === "g") {

        event.preventDefault();

        focusRoomCount();

        return;
    }

    /* ---------- Ctrl + D : duplicates ---------- */

    if (key === "d") {

        event.preventDefault();

        if (typeof showValidationReport === "function") {

            showValidationReport();
        }

        return;
    }
}


/* =====================================================
   STARTUP
===================================================== */

function initializeShortcuts() {

    document.addEventListener(
        "keydown",
        handleGlobalShortcut
    );

    document
        .getElementById("btnShortcutHelp")
        ?.addEventListener("click", showShortcutHelp);

}
registerModuleVersion("shortcuts.js", "1.0.0");