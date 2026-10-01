const pool = require("../config/db");

async function listAll() {
  const [rows] = await pool.query("SELECT * FROM foods ORDER BY food_name");
  return rows;
}

async function searchLocal(searchTerm) {
  const [rows] = await pool.query(
    `SELECT food_id, food_name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g,
        'Local Database' AS brand, 'local' AS source
       FROM foods
       WHERE food_name LIKE ?
       ORDER BY
        CASE
          WHEN LOWER(food_name) = LOWER(?) THEN 0
          WHEN LOWER(food_name) LIKE LOWER(?) THEN 1
          ELSE 2
        END,
        food_name
       LIMIT 20`,
    [`%${searchTerm}%`, searchTerm, `${searchTerm}%`]
  );
  return rows;
}

async function upsertExternal(name, calories, protein, carbs, fat) {
  await pool.query(
    `INSERT INTO foods
        (food_name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        calories_per_100g = VALUES(calories_per_100g),
        protein_per_100g = VALUES(protein_per_100g),
        carbs_per_100g = VALUES(carbs_per_100g),
        fat_per_100g = VALUES(fat_per_100g)`,
    [name, calories, protein, carbs, fat]
  );
}

async function findIdByName(name) {
  const [rows] = await pool.query("SELECT food_id FROM foods WHERE food_name = ?", [name]);
  return rows[0]?.food_id;
}

async function findById(foodId) {
  const [rows] = await pool.query("SELECT * FROM foods WHERE food_id = ?", [foodId]);
  return rows[0] || null;
}

module.exports = { listAll, searchLocal, upsertExternal, findIdByName, findById };
