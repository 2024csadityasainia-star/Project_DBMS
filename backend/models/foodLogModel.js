const pool = require("../config/db");

async function listByUser(userId) {
  const [rows] = await pool.query(
    `SELECT fl.log_id, f.food_name, fl.meal_type, fl.quantity_g, fl.calories,
      fl.protein_g, fl.carbs_g, fl.fat_g, fl.log_date
     FROM food_logs fl
     JOIN foods f ON f.food_id = fl.food_id
     WHERE fl.user_id = ?
     ORDER BY fl.log_date DESC, fl.created_at DESC`,
    [userId]
  );
  return rows;
}

async function countForDate(userId, logDate) {
  const [rows] = await pool.query(
    "SELECT COUNT(*) AS count FROM food_logs WHERE user_id = ? AND log_date = ?",
    [userId, logDate]
  );
  return Number(rows[0]?.count || 0);
}

// returns the new log_id
async function insert({ userId, foodId, mealType, quantityG, calories, protein, carbs, fat, logDate }) {
  const [result] = await pool.query(
    `INSERT INTO food_logs
      (user_id, food_id, meal_type, quantity_g, calories, protein_g, carbs_g, fat_g, log_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, foodId, mealType, quantityG, calories, protein, carbs, fat, logDate]
  );
  return result.insertId;
}

async function getDaySummary(userId, date) {
  const [rows] = await pool.query(
    `SELECT
      COALESCE(SUM(calories), 0) AS consumed_calories,
      COUNT(*) AS meals_logged,
      COALESCE(SUM(protein_g), 0) AS protein_g,
      COALESCE(SUM(carbs_g), 0) AS carbs_g,
      COALESCE(SUM(fat_g), 0) AS fat_g
     FROM food_logs
     WHERE user_id = ? AND log_date = ?`,
    [userId, date]
  );
  return rows[0];
}

module.exports = { listByUser, countForDate, insert, getDaySummary };
