// Returns the given YYYY-MM-DD string if valid, otherwise today's date (YYYY-MM-DD).
function isoDateOrToday(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))
    ? value
    : new Date().toISOString().slice(0, 10);
}

module.exports = { isoDateOrToday };
