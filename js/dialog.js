/* =====================================================
   HOTEL GROUP OPERATIONS SUITE
   File    : js/dialog.js
   Version : 1.0.0 RC1

   IN-PAGE DIALOGS

   Replaces alert() / confirm() / prompt().

   All three return a Promise, so call sites must be
   awaited inside an async function:

       await showAlert("Saved");

       if (!await showConfirm("Delete this?")) return;

       const name = await showPrompt("Group name");
       if (name === null) return;      // cancelled

   No dependencies. Load FIRST.
===================================================== */


/* =====================================================
   STATE
===================================================== */

let dialogQueue = [];

let dialogActive = false;

let dialogResolve = null;

let dialogPreviousFocus = null;


/* =====================================================
   SAFE TEXT
===================================================== */

function dialogEscape(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}


/* =====================================================
   MAIN ENTRY POINT
===================================================== */

function showDialog(options) {

    return new Promise(function (resolve) {

        dialogQueue.push({
            options: options || {},
            resolve: resolve
        });

        if (!dialogActive) {

            openNextDialog();
        }

    });
}


/* =====================================================
   OPEN NEXT IN QUEUE
===================================================== */

function openNextDialog() {

    if (dialogQueue.length === 0) {

        dialogActive = false;

        return;
    }

    dialogActive = true;

    const entry = dialogQueue.shift();

    dialogResolve = entry.resolve;

    renderDialog(entry.options);
}


/* =====================================================
   RENDER
===================================================== */

function renderDialog(options) {

    const overlay =
        document.getElementById("appDialog");

    if (!overlay) {

        /* Fall back to the browser so nothing is lost */

        console.error("Dialog markup missing");

        finishDialog(
            options.type === "confirm"
                ? window.confirm(options.message)
                : options.type === "prompt"
                    ? window.prompt(
                        options.message,
                        options.inputValue || ""
                      )
                    : options.type === "form"
                        ? (
                            window.alert(
                                "This dialog needs the in-page " +
                                "dialog markup, which is missing."
                            ),
                            null
                          )
                        : (window.alert(options.message), true)
        );

        return;
    }

    const type = options.type || "alert";

    const titleEl =
        document.getElementById("appDialogTitle");

    const messageEl =
        document.getElementById("appDialogMessage");

    const inputWrap =
        document.getElementById("appDialogInputWrap");

    const input =
        document.getElementById("appDialogInput");

    const okButton =
        document.getElementById("appDialogOk");

    const cancelButton =
        document.getElementById("appDialogCancel");

    const box =
        document.getElementById("appDialogBox");

    const errorEl =
        document.getElementById("appDialogError");

    /* ---------- Title ---------- */

    const defaultTitles = {
        alert:   "Notice",
        confirm: "Please Confirm",
        prompt:  "Enter Value",
        form:    "Enter Details"
    };

    titleEl.textContent =
        options.title || defaultTitles[type];

    /* ---------- Message ---------- */

    messageEl.textContent = options.message || "";

    messageEl.style.display =
        options.message ? "block" : "none";

    /* ---------- Error line ---------- */

    errorEl.textContent = "";

    /* ---------- Input ---------- */

    const formWrap =
        document.getElementById("appDialogFormWrap");

    const formFields =
        document.getElementById("appDialogFormFields");

    if (type === "prompt") {

        inputWrap.style.display = "block";

        if (formWrap) formWrap.style.display = "none";

        input.type = options.inputType || "text";

        input.value = options.inputValue || "";

        input.placeholder = options.placeholder || "";

        if (options.maxLength) {

            input.maxLength = options.maxLength;

        } else {

            input.removeAttribute("maxlength");
        }

    } else if (type === "form" && formWrap && formFields) {

        inputWrap.style.display = "none";

        formWrap.style.display = "block";

        formFields.innerHTML = "";

        (options.fields || []).forEach(function (field) {

            const row = document.createElement("div");

            row.className = "form-group dialog-form-row";

            const label = document.createElement("label");

            label.setAttribute(
                "for",
                "appDialogField_" + field.id
            );

            label.textContent = field.label || field.id;

            const fieldInput = document.createElement("input");

            fieldInput.type = field.type || "number";

            fieldInput.id = "appDialogField_" + field.id;

            fieldInput.className = "dialog-form-input";

            fieldInput.value =
                field.value != null ? field.value : "";

            if (field.min != null) fieldInput.min = field.min;

            if (field.max != null) fieldInput.max = field.max;

            if (field.placeholder) {

                fieldInput.placeholder = field.placeholder;
            }

            row.appendChild(label);

            row.appendChild(fieldInput);

            formFields.appendChild(row);

        });

    } else {

        inputWrap.style.display = "none";

        if (formWrap) formWrap.style.display = "none";

        input.value = "";
    }

    /* ---------- Buttons ---------- */

    okButton.textContent =
        options.okLabel ||
        (type === "alert" ? "OK" : "Confirm");

    okButton.className =
        "dialog-btn dialog-ok" +
        (options.danger ? " danger" : "");

    cancelButton.textContent =
        options.cancelLabel || "Cancel";

    cancelButton.style.display =
        type === "alert" ? "none" : "";

    /* ---------- Style ---------- */

    box.className =
        "dialog-box" +
        (options.danger ? " dialog-danger" : "");

    /* ---------- Show ---------- */

    dialogPreviousFocus = document.activeElement;

    overlay.style.display = "flex";

    requestAnimationFrame(function () {

        overlay.classList.add("show");

    });

    setTimeout(function () {

        if (type === "prompt") {

            input.focus();

            input.select();

        } else if (type === "form" && formFields) {

            const firstField =
                formFields.querySelector(".dialog-form-input");

            if (firstField) {

                firstField.focus();

            } else {

                okButton.focus();
            }

        } else {

            okButton.focus();
        }

    }, 60);
}


/* =====================================================
   CLOSE
===================================================== */

function finishDialog(result) {

    const overlay =
        document.getElementById("appDialog");

    if (overlay) {

        overlay.classList.remove("show");

        setTimeout(function () {

            overlay.style.display = "none";

        }, 160);
    }

    const resolve = dialogResolve;

    dialogResolve = null;

    if (
        dialogPreviousFocus &&
        dialogPreviousFocus.focus
    ) {

        try {

            dialogPreviousFocus.focus();

        } catch (error) {

            /* element may have been removed */
        }
    }

    dialogPreviousFocus = null;

    if (resolve) resolve(result);

    setTimeout(openNextDialog, 170);
}


/* =====================================================
   BUTTON ACTIONS
===================================================== */

function confirmDialog() {

    const overlay =
        document.getElementById("appDialog");

    if (!overlay) return;

    const input =
        document.getElementById("appDialogInput");

    const inputWrap =
        document.getElementById("appDialogInputWrap");

    const formWrap =
        document.getElementById("appDialogFormWrap");

    const formFields =
        document.getElementById("appDialogFormFields");

    const isPrompt =
        inputWrap && inputWrap.style.display !== "none";

    const isForm =
        formWrap && formWrap.style.display !== "none";

    if (isForm) {

        const result = {};

        formFields
            .querySelectorAll(".dialog-form-input")
            .forEach(function (fieldInput) {

                const fieldId =
                    fieldInput.id.replace(
                        "appDialogField_",
                        ""
                    );

                result[fieldId] = fieldInput.value;

            });

        finishDialog(result);

        return;
    }

    if (isPrompt) {

        finishDialog(input.value);

        return;
    }

    finishDialog(true);
}


function cancelDialog() {

    const inputWrap =
        document.getElementById("appDialogInputWrap");

    const formWrap =
        document.getElementById("appDialogFormWrap");

    const isPrompt =
        inputWrap && inputWrap.style.display !== "none";

    const isForm =
        formWrap && formWrap.style.display !== "none";

    finishDialog((isPrompt || isForm) ? null : false);
}


/* =====================================================
   CONVENIENCE WRAPPERS
===================================================== */

function showAlert(message, title) {

    return showDialog({
        type: "alert",
        message: message,
        title: title
    });
}


function showConfirm(message, title, options) {

    return showDialog(
        Object.assign(
            {
                type: "confirm",
                message: message,
                title: title
            },
            options || {}
        )
    );
}


function showPrompt(message, defaultValue, title, options) {

    return showDialog(
        Object.assign(
            {
                type: "prompt",
                message: message,
                inputValue: defaultValue,
                title: title
            },
            options || {}
        )
    );
}


function showForm(fields, title, options) {

    return showDialog(
        Object.assign(
            {
                type:   "form",
                fields: fields,
                title:  title
            },
            options || {}
        )
    );
}


/* =====================================================
   STARTUP
===================================================== */

function initializeDialogs() {

    document
        .getElementById("appDialogOk")
        ?.addEventListener("click", confirmDialog);

    document
        .getElementById("appDialogCancel")
        ?.addEventListener("click", cancelDialog);

    /* Click the backdrop to cancel */

    document
        .getElementById("appDialog")
        ?.addEventListener("click", function (event) {

            if (
                event.target === this &&
                currentDialogType !== "form"
            ) {

                cancelDialog();
            }

        });

    /* Keyboard */

    document.addEventListener("keydown", function (event) {

        if (!dialogActive) return;

        const overlay =
            document.getElementById("appDialog");

        if (
            !overlay ||
            overlay.style.display === "none"
        ) {
            return;
        }

        if (event.key === "Escape") {

            event.preventDefault();

            cancelDialog();

            return;
        }

        if (event.key === "Enter") {

            const target = event.target;

            /* Let Enter work normally inside a textarea */

            if (
                target &&
                target.tagName === "TEXTAREA"
            ) {
                return;
            }

            /* Inside a multi-field form, Enter moves to the
               next field instead of submitting immediately -
               only the Confirm button, or Enter on the LAST
               field, actually submits. Without this, pressing
               Enter out of habit between fields submitted the
               whole form early with the remaining fields still
               at their default value - the "no time to finish
               typing" bug. */

            if (
                target &&
                target.classList &&
                target.classList.contains("dialog-form-input")
            ) {

                const allFields =
                    Array.prototype.slice.call(
                        document.querySelectorAll(
                            "#appDialogFormFields .dialog-form-input"
                        )
                    );

                const currentIndex =
                    allFields.indexOf(target);

                const isLastField =
                    currentIndex === allFields.length - 1;

                if (!isLastField) {

                    event.preventDefault();

                    const nextField =
                        allFields[currentIndex + 1];

                    if (nextField) nextField.focus();

                    return;
                }

                /* Last field - fall through, Enter here
                   really does mean "I'm done". */
            }

            event.preventDefault();

            confirmDialog();
        }

    });

}
registerModuleVersion("dialog.js", "1.0.0");