const pool = require("../config/db");

async function getDayTotals(userId, logDate) {
  const [rows] = await pool.query(
    `SELECT COALESCE(SUM(intake_ml), 0) AS total_ml, COUNT(*) AS entries
     FROM water_logs
     WHERE user_id = ? AND log_date = ?`,
    [userId, logDate]
  );
  return rows[0];
}

// returns the new water_log_id
async function insert(userId, intakeMl, logDate) {
  const [result] = await pool.query(
    "INSERT INTO water_logs (user_id, intake_ml, log_date) VALUES (?, ?, ?)",
    [userId, intakeMl, logDate]
  );
  return result.insertId;
}

module.exports = { getDayTotals, insert };
