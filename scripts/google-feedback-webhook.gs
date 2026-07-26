/**
 * Google Apps Script web app for the Reaches of Altharion feedback sheet.
 * Set a Script Property named WEBHOOK_SECRET before deploying.
 */
const SHEET_NAME = "Feedback";
const HEADERS = ["Submission ID", "Submitted", "Display name", "Feedback", "Source"];

function safeCell(value) {
  const text = String(value == null ? "" : value);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(event) {
  const lock = LockService.getScriptLock();
  try {
    const payload = JSON.parse((event && event.postData && event.postData.contents) || "{}");
    const expectedSecret = PropertiesService.getScriptProperties().getProperty("WEBHOOK_SECRET");
    if (!expectedSecret || payload.secret !== expectedSecret) {
      return jsonResponse({ ok: false, error: "Unauthorized" });
    }
    if (!payload.submissionId || !payload.feedback) {
      return jsonResponse({ ok: false, error: "Missing required fields" });
    }

    lock.waitLock(10000);
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME);
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      sheet.setFrozenRows(1);
    }

    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      const ids = sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues().flat();
      if (ids.includes(String(payload.submissionId))) {
        return jsonResponse({ ok: true, duplicate: true });
      }
    }

    sheet.appendRow([
      safeCell(payload.submissionId),
      new Date(payload.submittedAt),
      safeCell(payload.displayName),
      safeCell(payload.feedback),
      safeCell(payload.source),
    ]);
    return jsonResponse({ ok: true });
  } catch (error) {
    return jsonResponse({ ok: false, error: String(error) });
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}
