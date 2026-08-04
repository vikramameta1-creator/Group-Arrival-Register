/* =====================================================
   HOTEL GROUP OPERATIONS SUITE
   File    : js/printing.js
   Version : 1.0.0 RC1

   PRINT ENGINE + PRINT DOCUMENTS

   Depends on app.js for:
       getRegisterRows()
       DB.settings

   This file must load BEFORE app.js
===================================================== */


/* =====================================================
   HTML ESCAPE
===================================================== */

function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}


/* =====================================================
   PRINT ENGINE

   openPrintWindow(title, bodyHtml, extraStyles)

   extraStyles is optional and is appended after the
   shared base styles, so each document can set its
   own column widths and row heights.
===================================================== */

function openPrintWindow(title, bodyHtml, extraStyles) {

    const html = `
<!DOCTYPE html>
<html>

<head>

<meta charset="UTF-8">

<title>${escapeHTML(title)}</title>

<style>

@page{
    size:A4 landscape;
    margin:10mm;
}

*{
    box-sizing:border-box;
}

body{
    font-family:Arial,Helvetica,sans-serif;
    font-size:12px;
    color:#000;
    margin:0;
    padding:0;
}

/* ---------- DOCUMENT HEADER ---------- */

.doc-hotel{
    text-align:center;
    font-size:18px;
    font-weight:bold;
    margin:0 0 2px;
}

.doc-title{
    text-align:center;
    font-size:14px;
    font-weight:bold;
    letter-spacing:.08em;
    margin:0 0 10px;
}

.doc-meta{
    width:100%;
    border:1px solid #000;
    border-collapse:collapse;
    margin-bottom:10px;
}

.doc-meta td{
    border:1px solid #000;
    padding:5px 7px;
    font-size:11px;
}

.doc-meta .label{
    font-weight:bold;
    width:12%;
    background:#f0f0f0;
}

/* ---------- DATA TABLE ---------- */

table.doc-table{
    width:100%;
    border-collapse:collapse;
}

table.doc-table th{
    border:1px solid #000;
    padding:6px 5px;
    font-size:11px;
    font-weight:bold;
    text-align:center;
    background:#f0f0f0;
}

table.doc-table td{
    border:1px solid #000;
    padding:5px;
    vertical-align:top;
}

table.doc-table thead{
    display:table-header-group;
}

table.doc-table tr{
    page-break-inside:avoid;
}

/* ---------- TOTALS ---------- */

.doc-totals{
    width:100%;
    border:1px solid #000;
    border-collapse:collapse;
    margin-top:10px;
}

.doc-totals td{
    border:1px solid #000;
    padding:5px 7px;
    font-size:11px;
    text-align:center;
}

.doc-totals .label{
    font-weight:bold;
    background:#f0f0f0;
}

/* ---------- SIGN OFF ---------- */

.doc-signoff{
    margin-top:22px;
    width:100%;
    font-size:11px;
}

.doc-signoff td{
    padding-top:18px;
    border-top:1px solid #000;
    width:30%;
    text-align:center;
}

.doc-signoff .spacer{
    border:none;
    width:5%;
}

.doc-footer{
    margin-top:14px;
    font-size:10px;
    color:#333;
    text-align:right;
}

.print-version{
    margin-top:10px;
    padding-top:5px;
    border-top:1px solid #999;
    font-size:8px;
    color:#555;
    text-align:center;
}

</style>

<style>
${extraStyles || ""}
</style>

</head>

<body>

${bodyHtml}

<div class="print-version">
${
    typeof getPrintFooterText === "function"
        ? escapeHTML(getPrintFooterText())
        : ""
}
</div>

</body>

</html>
`;

    /* ---------- Print Via A Hidden Iframe ----------

       No separate browser window is opened. Chrome has a
       well-documented bug where a popup window used for
       printing can fail to hand real OS-level keyboard
       focus back to the tab that opened it, and no amount
       of window.focus() from either side can reliably force
       it back - it sits below what JavaScript controls.

       An iframe never leaves the page at all, so there is
       no second window and no focus handoff to fail. This
       is the standard, robust pattern for "print this one
       piece of content" and is what most professional web
       apps use instead of window.open() for printing. */

    const existing =
        document.getElementById("printFrame");

    if (existing) existing.remove();

    const frame = document.createElement("iframe");

    frame.id = "printFrame";

    frame.style.position = "fixed";

    frame.style.right = "0";

    frame.style.bottom = "0";

    frame.style.width = "0";

    frame.style.height = "0";

    frame.style.border = "0";

    frame.style.visibility = "hidden";

    document.body.appendChild(frame);

    frame.addEventListener("load", function () {

        setTimeout(function () {

            try {

                frame.contentWindow.focus();

                frame.contentWindow.print();

            } catch (error) {

                console.error("Print failed", error);

                showAlert(
                    "Unable to print. Please try again, " +
                    "or check your browser's print settings.",
                    "Print Failed"
                );
            }

        }, 250);

    });

    let cleaned = false;

    function cleanup() {

        if (cleaned) return;

        cleaned = true;

        if (frame && frame.parentNode) {

            frame.remove();
        }
    }

    try {

        frame.contentWindow.addEventListener(
            "afterprint",
            function () {

                cleanup();

                if (typeof showSaveFlash === "function") {

                    showSaveFlash("Print complete");
                }

            }
        );

    } catch (error) {

        /* ignore - the fallback timeout below covers this */
    }

    /* Not every browser fires afterprint reliably inside an
       iframe, so the frame is removed on a delay regardless. */

    setTimeout(cleanup, 30000);

    frame.srcdoc = html;

}


/* =====================================================
   PRINT HEADER DATA
===================================================== */

function getPrintHeaderData() {

    const value = id =>
        document.getElementById(id)?.value || "";

    return {

        hotelName:
            (typeof DB !== "undefined" &&
             DB.settings &&
             DB.settings.hotelName) ||
            "Hotel Group Operations Suite",

        groupName:   value("groupName"),
        arrivalDate: value("arrivalDate"),
        agent:       value("agentCompany"),
        preparedBy:  value("preparedBy"),
        status:      value("groupStatus"),
        notes:       value("groupNotes")
    };
}


/* =====================================================
   DOCUMENT HEADER BLOCK
===================================================== */

function buildDocumentHeader(title) {

    const info = getPrintHeaderData();

    return `

<div class="doc-hotel">${escapeHTML(info.hotelName)}</div>

<div class="doc-title">${escapeHTML(title)}</div>

<table class="doc-meta">

    <tr>
        <td class="label">Group</td>
        <td>${escapeHTML(info.groupName) || "&nbsp;"}</td>

        <td class="label">Arrival</td>
        <td>${escapeHTML(info.arrivalDate) || "&nbsp;"}</td>

        <td class="label">Status</td>
        <td>${escapeHTML(info.status) || "&nbsp;"}</td>
    </tr>

    <tr>
        <td class="label">Agent</td>
        <td>${escapeHTML(info.agent) || "&nbsp;"}</td>

        <td class="label">Prepared By</td>
        <td>${escapeHTML(info.preparedBy) || "&nbsp;"}</td>

        <td class="label">Printed</td>
        <td>${escapeHTML(new Date().toLocaleString())}</td>
    </tr>

</table>

`;
}


/* =====================================================
   TOTALS BLOCK
===================================================== */

function buildTotalsBlock(rows) {

    let pax = 0;

    let ep = 0;
    let cp = 0;
    let map = 0;
    let ap = 0;

    rows.forEach(row => {

        const p = Number(row.pax) || 0;

        pax += p;

        switch (row.meal) {

            case "EP":
                ep += p;
                break;

            case "CP":
                cp += p;
                break;

            case "MAP":
                map += p;
                break;

            case "AP":
                ap += p;
                break;
        }

    });

    return `

<table class="doc-totals">

    <tr>
        <td class="label">Total Rooms</td>
        <td class="label">Total Pax</td>
        <td class="label">EP</td>
        <td class="label">CP</td>
        <td class="label">MAP</td>
        <td class="label">AP</td>
    </tr>

    <tr>
        <td>${rows.length}</td>
        <td>${pax}</td>
        <td>${ep}</td>
        <td>${cp}</td>
        <td>${map}</td>
        <td>${ap}</td>
    </tr>

</table>

`;
}


/* =====================================================
   SIGN OFF BLOCK
===================================================== */

function buildSignOffBlock() {

    return `

<table class="doc-signoff">

    <tr>
        <td>Group Leader</td>
        <td class="spacer"></td>
        <td>Front Office</td>
        <td class="spacer"></td>
        <td>Duty Manager</td>
    </tr>

</table>

`;
}


/* =====================================================
   REGISTER COLUMN WIDTHS
   Shared by Print Register and Blank Register so both
   documents look like the same form.
===================================================== */

const REGISTER_COLUMN_STYLES = `

table.doc-table th:nth-child(1),
table.doc-table td:nth-child(1){ width:5%;  text-align:center; }

table.doc-table th:nth-child(2),
table.doc-table td:nth-child(2){ width:8%;  text-align:center; }

table.doc-table th:nth-child(3),
table.doc-table td:nth-child(3){ width:32%; }

table.doc-table th:nth-child(4),
table.doc-table td:nth-child(4){ width:6%;  text-align:center; }

table.doc-table th:nth-child(5),
table.doc-table td:nth-child(5){ width:8%;  text-align:center; }

table.doc-table th:nth-child(6),
table.doc-table td:nth-child(6){ width:13%; }

table.doc-table th:nth-child(7),
table.doc-table td:nth-child(7){ width:28%; }

`;


/* =====================================================
   PRINT REGISTER

   Guest facing document.
   Names are pre-printed, guests sign on arrival.
===================================================== */

async function printRegister() {

    const rows = getRegisterRows();

    if (rows.length === 0) {

        await showAlert(
            "Add rows first, or use Blank Register.",
            "Register Is Empty"
        );

        return;
    }

    /* Save is blocked on unresolved problems - printing
       must refuse the same way. A duplicate or over-
       capacity room that a receptionist can't save should
       never end up on a signed, printed document either. */

    if (typeof getInvalidRooms === "function") {

        const problems = getInvalidRooms();

        if (problems.length > 0) {

            await showAlert(
                problems.slice(0, 10).join("\n") +
                (problems.length > 10
                    ? "\n\nand " + (problems.length - 10) + " more"
                    : ""),
                "Cannot Print — Fix These First"
            );

            return;
        }
    }

    let tableRows = "";

    rows.forEach((row, index) => {

        tableRows += `
        <tr>
            <td>${index + 1}</td>
            <td>${escapeHTML(row.roomNo)}</td>
            <td>${escapeHTML(row.guestName)}${row.vip ? " <strong>[VIP]</strong>" : ""}</td>
            <td>${escapeHTML(row.pax)}</td>
            <td>${escapeHTML(row.meal)}</td>
            <td>${escapeHTML(row.mobile)}</td>
            <td></td>
        </tr>
        `;

    });

    const html = `

${buildDocumentHeader("GROUP ARRIVAL REGISTER")}

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

    <tbody>
        ${tableRows}
    </tbody>

</table>

${buildTotalsBlock(rows)}

${buildSignOffBlock()}

`;

    const styles =
        REGISTER_COLUMN_STYLES +
        `
        table.doc-table td{ height:34px; }
        `;

    openPrintWindow(
        "Group Arrival Register",
        html,
        styles
    );
}


/* =====================================================
   PRINT BLANK REGISTER

   Same form, empty, for handwritten entry.
===================================================== */

async function printBlankRegister() {

    const input = await showPrompt(
        "How many rows should the blank register have?",
        "30",
        "Blank Register Rows",
        { inputType: "number", placeholder: "20 / 30 / 40 / 50" }
    );

    if (input === null) return;

    const rows = Number(input);

    if (!rows || rows < 1 || rows > 200) {

        await showAlert(
            "Enter a row count between 1 and 200.",
            "Invalid Row Count"
        );

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

<div class="doc-hotel">
    ${escapeHTML(
        (typeof DB !== "undefined" &&
         DB.settings &&
         DB.settings.hotelName) ||
        "Hotel Group Operations Suite"
    )}
</div>

<div class="doc-title">GROUP ARRIVAL REGISTER</div>

<table class="doc-meta">

    <tr>
        <td class="label">Group</td>
        <td>&nbsp;</td>

        <td class="label">Arrival</td>
        <td>&nbsp;</td>

        <td class="label">Agent</td>
        <td>&nbsp;</td>
    </tr>

</table>

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

    <tbody>
        ${tableRows}
    </tbody>

</table>

${buildSignOffBlock()}

`;

    const styles =
        REGISTER_COLUMN_STYLES +
        `
        table.doc-table td{ height:62px; }
        `;

    openPrintWindow(
        "Blank Arrival Register",
        html,
        styles
    );
}


/* =====================================================
   PRINT ROOMING LIST

   Internal document for Housekeeping and F&B.
   Carries VIP flags and special requests.
===================================================== */

async function printRoomingList() {

    const rows = getRegisterRows();

    if (rows.length === 0) {

        await showAlert(
            "Add rows on the Arrival Register first.",
            "Rooming List Is Empty"
        );

        return;
    }

    /* Same rule as printRegister() - an unresolved
       duplicate or over-capacity room must not reach
       Housekeeping's printed copy either. */

    if (typeof getInvalidRooms === "function") {

        const problems = getInvalidRooms();

        if (problems.length > 0) {

            await showAlert(
                problems.slice(0, 10).join("\n") +
                (problems.length > 10
                    ? "\n\nand " + (problems.length - 10) + " more"
                    : ""),
                "Cannot Print — Fix These First"
            );

            return;
        }
    }

    let tableRows = "";

    rows.forEach(row => {

        tableRows += `
        <tr>
            <td>${escapeHTML(row.roomNo)}</td>
            <td>${escapeHTML(row.guestName)}</td>
            <td>${escapeHTML(row.pax)}</td>
            <td>${escapeHTML(row.meal)}</td>
            <td>${escapeHTML(row.mobile)}</td>
            <td>${row.vip ? "VIP" : ""}</td>
            <td>${escapeHTML(row.specialRequest)}</td>
        </tr>
        `;

    });

    const html = `

${buildDocumentHeader("ROOMING LIST")}

<table class="doc-table">

    <thead>
        <tr>
            <th>Room</th>
            <th>Guest Name</th>
            <th>Pax</th>
            <th>Meal</th>
            <th>Mobile No</th>
            <th>VIP</th>
            <th>Special Request</th>
        </tr>
    </thead>

    <tbody>
        ${tableRows}
    </tbody>

</table>

${buildTotalsBlock(rows)}

<div class="doc-footer">
    Internal document — Housekeeping / Food &amp; Beverage
</div>

`;

    const styles = `

table.doc-table th:nth-child(1),
table.doc-table td:nth-child(1){ width:8%;  text-align:center; }

table.doc-table th:nth-child(2),
table.doc-table td:nth-child(2){ width:26%; }

table.doc-table th:nth-child(3),
table.doc-table td:nth-child(3){ width:6%;  text-align:center; }

table.doc-table th:nth-child(4),
table.doc-table td:nth-child(4){ width:8%;  text-align:center; }

table.doc-table th:nth-child(5),
table.doc-table td:nth-child(5){ width:14%; }

table.doc-table th:nth-child(6),
table.doc-table td:nth-child(6){ width:6%;  text-align:center; font-weight:bold; }

table.doc-table th:nth-child(7),
table.doc-table td:nth-child(7){ width:32%; }

table.doc-table td{ height:26px; }

`;

    openPrintWindow(
        "Rooming List",
        html,
        styles
    );
}
registerModuleVersion("printing.js", "1.0.0");