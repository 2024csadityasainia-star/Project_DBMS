const pool = require("../config/db");

// returns the new recommendation_id
async function insert(userId, calories, protein, carbs, fat) {
  const [result] = await pool.query(
    `INSERT INTO nutrition_recommendations (user_id, recommended_calories, protein_g, carbs_g, fat_g)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, calories, protein, carbs, fat]
  );
  return result.insertId;
}

async function getLatest(userId) {
  const [rows] = await pool.query(
    `SELECT * FROM nutrition_recommendations
     WHERE user_id = ?
     ORDER BY generated_at DESC
     LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

async function getNotes(recommendationId) {
  const [rows] = await pool.query(
    "SELECT note_text FROM recommendation_notes WHERE recommendation_id = ?",
    [recommendationId]
  );
  return rows;
}

module.exports = { insert, getLatest, getNotes };
