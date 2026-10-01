const pool = require("../config/db");

async function listByUser(userId) {
  const [rows] = await pool.query(
    "SELECT * FROM medical_records WHERE user_id = ? ORDER BY recorded_at DESC",
    [userId]
  );
  return rows;
}

async function listRecent(userId) {
  const [rows] = await pool.query(
    "SELECT condition_name, dietary_restriction, notes FROM medical_records WHERE user_id = ? ORDER BY recorded_at DESC LIMIT 8",
    [userId]
  );
  return rows;
}

// returns the new record_id
async function create({ userId, conditionName, dietaryRestriction, notes }) {
  const [result] = await pool.query(
    "INSERT INTO medical_records (user_id, condition_name, dietary_restriction, notes) VALUES (?, ?, ?, ?)",
    [userId, conditionName, dietaryRestriction, notes || ""]
  );
  return result.insertId;
}

// returns affectedRows
async function remove(recordId, userId) {
  const [result] = await pool.query(
    "DELETE FROM medical_records WHERE record_id = ? AND user_id = ?",
    [recordId, userId]
  );
  return result.affectedRows;
}

module.exports = { listByUser, listRecent, create, remove };
