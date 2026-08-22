/* =====================================================
   HOTEL GROUP OPERATIONS SUITE
   File    : js/attachments.js
   Version : 1.0.0

   PER-GROUP REFERENCE ATTACHMENTS

   Owns:
       IndexedDB storage for group attachments
       (booking confirmations, agent emails, and similar
       reference documents)
       Attachment CRUD: add / list / delete / download
       Reconciliation when a brand-new group's temporary
       id becomes its real, saved id
       Drag-and-drop + click-to-browse UI on the
       Register Tools page

   Reference documents only - viewed occasionally, never
   edited in-app. No preview, no versioning, no editing.

   IndexedDB was chosen deliberately over localStorage:
   localStorage has a hard ~5-10MB quota for the WHOLE
   database, shared across every saved group - a single
   PDF could meaningfully eat into that, and if it's ever
   exceeded, saveDatabase() doesn't fail partially, it
   fails for every group, not just the one with too many
   files. IndexedDB stores real Blobs with a far larger
   quota, entirely separate from the localStorage-backed
   DB this app already uses.

   A brand-new group has no real id until it's saved for
   the first time (currentGroupId is null until then - see
   groups.js). Attachments added before that point are
   filed under a temporary id and silently reconciled onto
   the real id the moment saveCurrentGroup() succeeds - the
   developer never sees or manages this, it just works.

   Depends at runtime on:
       groups.js     currentGroupId
       dialog.js     showAlert, showConfirm
       database.js   nowISO, formatTimestamp
       printing.js   escapeHTML

   Load after groups.js, so currentGroupId already exists.
===================================================== */


/* =====================================================
   DATABASE
===================================================== */

const ATTACHMENTS_DB_NAME = "hotel_group_attachments_v1";

const ATTACHMENTS_STORE = "attachments";

const ATTACHMENT_MAX_FILE_SIZE = 15 * 1024 * 1024;

let attachmentsDB = null;


function openAttachmentsDB() {

    if (attachmentsDB) {

        return Promise.resolve(attachmentsDB);
    }

    return new Promise((resolve, reject) => {

        const request =
            indexedDB.open(ATTACHMENTS_DB_NAME, 1);

        request.onupgradeneeded = function (event) {

            const db = event.target.result;

            if (
                !db.objectStoreNames.contains(
                    ATTACHMENTS_STORE
                )
            ) {

                const store =
                    db.createObjectStore(
                        ATTACHMENTS_STORE,
                        { keyPath: "id" }
                    );

                store.createIndex(
                    "groupId",
                    "groupId",
                    { unique: false }
                );
            }
        };

        request.onsuccess = function (event) {

            attachmentsDB = event.target.result;

            resolve(attachmentsDB);
        };

        request.onerror = function () {

            console.error(
                "Attachments DB open error",
                request.error
            );

            reject(request.error);
        };

    });
}


/* =====================================================
   ID GENERATORS
===================================================== */

function generateAttachmentId() {

    return (
        "ATT-" +
        Date.now() +
        "-" +
        Math.floor(Math.random() * 1000)
    );
}


/* =====================================================
   ACTIVE GROUP ID FOR ATTACHMENTS

   Real id once the group is saved (reuses currentGroupId,
   the same identity everything else in the app uses).
   Before that, a temporary id scoped to this editing
   session only - stable across multiple file drops, reset
   whenever a new blank group starts or a different saved
   group is opened.
===================================================== */

let attachmentTempGroupId = null;


function getActiveAttachmentGroupId() {

    if (
        typeof currentGroupId !== "undefined" &&
        currentGroupId
    ) {

        return currentGroupId;
    }

    if (!attachmentTempGroupId) {

        attachmentTempGroupId =
            "TEMP-" +
            Date.now() +
            "-" +
            Math.floor(Math.random() * 1000);
    }

    return attachmentTempGroupId;
}


function resetAttachmentSession() {

    attachmentTempGroupId = null;
}


/* =====================================================
   RECONCILE TEMP ID -> REAL ID

   Called right after a brand-new group is saved for the
   first time. Every attachment filed under the temporary
   id gets moved onto the real one.
===================================================== */

function reconcileAttachmentGroupId(realGroupId) {

    if (!attachmentTempGroupId || !realGroupId) return;

    const tempId = attachmentTempGroupId;

    openAttachmentsDB()
        .then(db => {

            const tx =
                db.transaction(
                    ATTACHMENTS_STORE,
                    "readwrite"
                );

            const store =
                tx.objectStore(ATTACHMENTS_STORE);

            const index = store.index("groupId");

            const request =
                index.openCursor(
                    IDBKeyRange.only(tempId)
                );

            request.onsuccess = function (event) {

                const cursor = event.target.result;

                if (!cursor) return;

                const record = cursor.value;

                record.groupId = realGroupId;

                cursor.update(record);

                cursor.continue();
            };

            tx.oncomplete = function () {

                attachmentTempGroupId = null;

                if (
                    typeof renderAttachmentsPanel ===
                    "function"
                ) {

                    renderAttachmentsPanel();
                }
            };

            tx.onerror = function () {

                console.error(
                    "Attachment reconcile error",
                    tx.error
                );
            };

        })
        .catch(error => {

            console.error(
                "Attachment reconcile error",
                error
            );
        });
}


/* =====================================================
   ADD ATTACHMENT
===================================================== */

function addAttachment(file) {

    if (!file) return Promise.resolve(null);

    if (file.size > ATTACHMENT_MAX_FILE_SIZE) {

        if (typeof showAlert === "function") {

            showAlert(
                "'" + file.name + "' is larger than " +
                "15 MB and was not attached. For very " +
                "large files, keep them on a shared drive " +
                "and note the location in the group notes " +
                "instead.",
                "File Too Large"
            );
        }

        return Promise.resolve(null);
    }

    const groupId = getActiveAttachmentGroupId();

    const record = {

        id:         generateAttachmentId(),
        groupId:    groupId,
        fileName:   file.name,
        fileType:   file.type || "",
        fileSize:   file.size,
        uploadedOn:
            typeof nowISO === "function"
                ? nowISO()
                : new Date().toISOString(),
        blob:       file

    };

    return openAttachmentsDB().then(db => {

        return new Promise((resolve, reject) => {

            const tx =
                db.transaction(
                    ATTACHMENTS_STORE,
                    "readwrite"
                );

            tx.objectStore(ATTACHMENTS_STORE)
              .add(record);

            tx.oncomplete = () => resolve(record);

            tx.onerror = () => reject(tx.error);

        });

    });
}


/* =====================================================
   LIST ATTACHMENTS
===================================================== */

function listAttachments(groupId) {

    if (!groupId) return Promise.resolve([]);

    return openAttachmentsDB().then(db => {

        return new Promise((resolve, reject) => {

            const tx =
                db.transaction(
                    ATTACHMENTS_STORE,
                    "readonly"
                );

            const index =
                tx.objectStore(ATTACHMENTS_STORE)
                  .index("groupId");

            const request =
                index.getAll(
                    IDBKeyRange.only(groupId)
                );

            request.onsuccess = () => {

                const results = request.result || [];

                results.sort((a, b) =>
                    (a.uploadedOn || "").localeCompare(
                        b.uploadedOn || ""
                    )
                );

                resolve(results);
            };

            request.onerror = () =>
                reject(request.error);

        });

    });
}


/* =====================================================
   DELETE ATTACHMENT
===================================================== */

function deleteAttachment(attachmentId) {

    return openAttachmentsDB().then(db => {

        return new Promise((resolve, reject) => {

            const tx =
                db.transaction(
                    ATTACHMENTS_STORE,
                    "readwrite"
                );

            tx.objectStore(ATTACHMENTS_STORE)
              .delete(attachmentId);

            tx.oncomplete = () => resolve();

            tx.onerror = () => reject(tx.error);

        });

    });
}


/* =====================================================
   DOWNLOAD ATTACHMENT
===================================================== */

function downloadAttachment(record) {

    const url = URL.createObjectURL(record.blob);

    const link = document.createElement("a");

    link.href = url;

    link.download = record.fileName;

    link.click();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
}


/* =====================================================
   FORMAT HELPERS
===================================================== */

function formatAttachmentSize(bytes) {

    if (!bytes) return "0 KB";

    const kb = bytes / 1024;

    if (kb < 1024) {

        return Math.round(kb) + " KB";
    }

    return (kb / 1024).toFixed(1) + " MB";
}


function getAttachmentIcon(fileType, fileName) {

    const type = (fileType || "").toLowerCase();

    const name = (fileName || "").toLowerCase();

    if (type.includes("pdf") || name.endsWith(".pdf")) {

        return "📄";
    }

    if (
        type.includes("word") ||
        name.endsWith(".doc") ||
        name.endsWith(".docx")
    ) {

        return "📝";
    }

    if (
        type.includes("sheet") ||
        type.includes("excel") ||
        name.endsWith(".xls") ||
        name.endsWith(".xlsx")
    ) {

        return "📊";
    }

    if (type.startsWith("image/")) {

        return "🖼️";
    }

    if (name.endsWith(".eml") || name.endsWith(".msg")) {

        return "✉️";
    }

    return "📎";
}


function escapeAttachmentText(text) {

    return typeof escapeHTML === "function"
        ? escapeHTML(text || "")
        : String(text || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
}


/* =====================================================
   RENDER PANEL
===================================================== */

function renderAttachmentsPanel() {

    const list =
        document.getElementById("attachmentsList");

    if (!list) return;

    const groupId = getActiveAttachmentGroupId();

    list.innerHTML =
        "<p class='muted-note'>Loading…</p>";

    listAttachments(groupId).then(records => {

        if (records.length === 0) {

            list.innerHTML =
                "<p class='muted-note'>" +
                "No files attached to this group yet." +
                "</p>";

            return;
        }

        list.innerHTML = "";

        records.forEach(record => {

            const row =
                document.createElement("div");

            row.className = "attachment-row";

            row.innerHTML =
                '<span class="attachment-icon">' +
                getAttachmentIcon(
                    record.fileType,
                    record.fileName
                ) +
                '</span>' +
                '<span class="attachment-name">' +
                escapeAttachmentText(record.fileName) +
                '</span>' +
                '<span class="attachment-meta">' +
                formatAttachmentSize(record.fileSize) +
                ' · ' +
                (
                    typeof formatTimestamp === "function"
                        ? formatTimestamp(record.uploadedOn)
                        : record.uploadedOn
                ) +
                '</span>' +
                '<button class="attachment-download" ' +
                'type="button">Download</button>' +
                '<button class="attachment-delete" ' +
                'type="button">Delete</button>';

            row.querySelector(".attachment-download")
                .addEventListener("click", function () {

                    downloadAttachment(record);

                });

            row.querySelector(".attachment-delete")
                .addEventListener(
                    "click",
                    async function () {

                        const ok =
                            typeof showConfirm === "function"
                                ? await showConfirm(
                                    "Delete '" +
                                    record.fileName +
                                    "'?",
                                    "Delete Attachment",
                                    {
                                        danger: true,
                                        okLabel: "Delete"
                                    }
                                )
                                : confirm(
                                    "Delete '" +
                                    record.fileName +
                                    "'?"
                                );

                        if (!ok) return;

                        await deleteAttachment(record.id);

                        renderAttachmentsPanel();

                    }
                );

            list.appendChild(row);

        });

    });
}


/* =====================================================
   DROP ZONE / FILE INPUT EVENTS
===================================================== */

function handleIncomingAttachmentFiles(fileList) {

    const files = Array.from(fileList || []);

    if (files.length === 0) return;

    Promise.all(
        files.map(file => addAttachment(file))
    ).then(() => {

        renderAttachmentsPanel();

    });
}


function initializeAttachmentEvents() {

    const dropZone =
        document.getElementById("attachmentDropZone");

    const fileInput =
        document.getElementById("attachmentFileInput");

    if (!dropZone || !fileInput) return;

    dropZone.addEventListener("click", function () {

        fileInput.click();

    });

    fileInput.addEventListener("change", function () {

        handleIncomingAttachmentFiles(fileInput.files);

        fileInput.value = "";

    });

    dropZone.addEventListener(
        "dragover",
        function (event) {

            event.preventDefault();

            dropZone.classList.add("drag-active");

        }
    );

    dropZone.addEventListener("dragleave", function () {

        dropZone.classList.remove("drag-active");

    });

    dropZone.addEventListener("drop", function (event) {

        event.preventDefault();

        dropZone.classList.remove("drag-active");

        handleIncomingAttachmentFiles(
            event.dataTransfer.files
        );

    });
}


/* =====================================================
   STARTUP
===================================================== */

document.addEventListener("DOMContentLoaded", function () {

    initializeAttachmentEvents();

});


registerModuleVersion("attachments.js", "1.0.0");