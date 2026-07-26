/* =====================================================
   PRINT ENGINE
===================================================== */

function openPrintWindow(title, html) {

    const printWindow = window.open("", "_blank");

    if (!printWindow) {
        alert("Unable to open print window.");
        return;
    }

    printWindow.document.write(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${title}</title>

<style>

body{
    font-family:Arial,sans-serif;
    margin:20px;
    color:#000;
}

table{
    width:100%;
    border-collapse:collapse;
}

th,td{
    border:1px solid #000;
    padding:4px;
    font-size:12px;
}

h1,h2,h3{
    margin:4px 0;
    text-align:center;
}

@page{
    size:A4 landscape;
    margin:10mm;
}

</style>

</head>

<body>

${html}

</body>

</html>
`);

    printWindow.document.close();

    printWindow.focus();

    printWindow.print();

}

/* =====================================================
   PRINT ROOMING LIST
===================================================== */

function printRoomingList() {

    const roomingList = document.getElementById("roomingPage");

    if (!roomingList) {

        alert("Rooming List not found.");

        return;

    }

    openPrintWindow(
        "Rooming List",
        roomingList.innerHTML
    );

}
/* =====================================================
   PRINT REGISTER
===================================================== */

function printRegister() {

    const rows = getRegisterRows();

    let html = "";

    html += `
        <h2>${DB.settings.hotelName || "Hotel Group Operations Suite"}</h2>

        <h3>GROUP ARRIVAL REGISTER</h3>

        <table>

            <thead>

                <tr>

                    <th>Sr</th>
                    <th>Room</th>
                    <th>Guest Name</th>
                    <th>Pax</th>
                    <th>Meal</th>
                    <th>Mobile</th>
                    <th>VIP</th>
                    <th>Special Request</th>

                </tr>

            </thead>

            <tbody>
    `;

    rows.forEach((r, index) => {

        html += `

            <tr>

                <td>${index + 1}</td>

                <td>${r.roomNo || ""}</td>

                <td>${r.guestName || ""}</td>

                <td>${r.pax || ""}</td>

                <td>${r.meal || ""}</td>

                <td>${r.mobile || ""}</td>

                <td>${r.vip ? "YES" : ""}</td>

                <td>${r.specialRequest || ""}</td>

            </tr>

        `;

    });

    html += `

            </tbody>

        </table>

    `;

    openPrintWindow(
        "Group Arrival Register",
        html
    );

}
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

    const printWindow =
        window.open(
            "",
            "_blank"
        );

    printWindow.document.write(`

<!DOCTYPE html>
<html>

<head>

<title>
Group Arrival Register
</title>

<style>

@page{
    size:A4 landscape;
    margin:10mm;
}

body{
    font-family:Arial,sans-serif;
    font-size:12px;
    margin:0;
    padding:0;
}

h2{
    text-align:center;
    margin-bottom:5px;
}

h4{
    text-align:center;
    margin-top:0;
    margin-bottom:15px;
    font-weight:normal;
}

table{
    width:100%;
    border-collapse:collapse;
}

th{
    border:1px solid #000;
    padding:8px;
    text-align:center;
    font-weight:bold;
    height:30px;
}

td{
    border:1px solid #000;
    height:75px;
    padding:6px;
    vertical-align:top;
}

th:nth-child(1),
td:nth-child(1){
    width:5%;
    text-align:center;
}

th:nth-child(2),
td:nth-child(2){
    width:8%;
}

th:nth-child(3),
td:nth-child(3){
    width:35%;
}

th:nth-child(4),
td:nth-child(4){
    width:8%;
    text-align:center;
}

th:nth-child(5),
td:nth-child(5){
    width:10%;
    text-align:center;
}

th:nth-child(6),
td:nth-child(6){
    width:14%;
}

th:nth-child(7),
td:nth-child(7){
    width:20%;
}

</style>

</head>

<body>

<h2>
GROUP ARRIVAL REGISTER
</h2>

<h4>
Date: _____________________
&nbsp;&nbsp;&nbsp;&nbsp;
Group: ______________________________________
</h4>

<table>

<thead>

<tr>

<th>Sr</th>

<th>Room No</th>

<th>Guest Name</th>

<th>Pax</th>

<th>Meal</th>

<th>Mobile No</th>

<th>Signature</th>

</tr>

</thead>

<tbody>

${tableRows}

</tbody>

</table>

</body>

</html>

    `);

    printWindow.document.close();

    printWindow.focus();

    setTimeout(() => {

        printWindow.print();

    }, 500);
}