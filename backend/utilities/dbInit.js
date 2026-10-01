const pool = require("../config/db");
const { demoUserId } = require("../config/env");
const { INDIAN_FOOD_SEEDS } = require("../config/foodSeeds");

async function ensureColumn(tableName, columnName, definition) {
  const [columns] = await pool.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [tableName, columnName]
  );

  if (!columns.length) {
    await pool.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

async function ensureDemoUser() {
  await pool.query("ALTER TABLE medical_records MODIFY dietary_restriction TEXT NOT NULL");
  await ensureColumn("user_profiles", "protein_target_g", "INT DEFAULT NULL");
  await ensureColumn("user_profiles", "carbs_target_g", "INT DEFAULT NULL");
  await ensureColumn("user_profiles", "fat_target_g", "INT DEFAULT NULL");
  await ensureColumn("user_profiles", "water_target_ml", "INT DEFAULT 2500");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS water_logs (
      water_log_id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      intake_ml INT NOT NULL,
      log_date DATE NOT NULL DEFAULT (CURRENT_DATE),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_water_logs_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
    )
  `);

  await pool.query(
    `INSERT INTO subscription_plans (plan_name, price, duration_days, description) VALUES
      ('Free', 0, 30, 'Starter tracking with profile setup, daily calories, and up to 5 food logs per day.'),
      ('Basic', 199, 30, 'Guided nutrition with 30 daily food logs, medical history, and personalized diet recommendations.'),
      ('Premium', 499, 30, 'Complete health panel with unlimited-style logging, macro insights, water tracking, and advanced guidance.')
     ON DUPLICATE KEY UPDATE
      price = VALUES(price),
      duration_days = VALUES(duration_days),
      description = VALUES(description)`
  );

  await pool.query(
    "INSERT IGNORE INTO users (user_id, full_name, email, password_hash) VALUES (?, ?, ?, ?)",
    [demoUserId, "Demo User", "demo@nutritrack.local", "demo123"]
  );

  await pool.query(
    `INSERT IGNORE INTO user_profiles
      (user_id, age, gender, height_cm, weight_kg, activity_level, goal, daily_calorie_target)
      VALUES (?, 22, 'Other', 170, 65, 'Moderate', 'Maintain', 2000)`,
    [demoUserId]
  );

  await pool.query(
    `INSERT INTO foods (food_name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g)
     VALUES ?
     ON DUPLICATE KEY UPDATE
      calories_per_100g = VALUES(calories_per_100g),
      protein_per_100g = VALUES(protein_per_100g),
      carbs_per_100g = VALUES(carbs_per_100g),
      fat_per_100g = VALUES(fat_per_100g)`,
    [INDIAN_FOOD_SEEDS]
  );
}

module.exports = { ensureColumn, ensureDemoUser };
