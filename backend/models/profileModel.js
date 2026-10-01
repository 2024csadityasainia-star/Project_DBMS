const pool = require("../config/db");

async function getWithUser(userId) {
  const [rows] = await pool.query(
    `SELECT u.user_id, u.full_name, u.email, p.age, p.gender, p.height_cm, p.weight_kg,
      p.activity_level, p.goal, p.daily_calorie_target
     FROM users u
     LEFT JOIN user_profiles p ON p.user_id = u.user_id
     WHERE u.user_id = ?`,
    [userId]
  );
  return rows[0] || null;
}

async function upsert(userId, profile, calorieTarget) {
  await pool.query(
    `INSERT INTO user_profiles
      (user_id, age, gender, height_cm, weight_kg, activity_level, goal, daily_calorie_target)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
      age = VALUES(age),
      gender = VALUES(gender),
      height_cm = VALUES(height_cm),
      weight_kg = VALUES(weight_kg),
      activity_level = VALUES(activity_level),
      goal = VALUES(goal),
      daily_calorie_target = VALUES(daily_calorie_target)`,
    [
      userId,
      profile.age || null,
      profile.gender || "Other",
      profile.height_cm || null,
      profile.weight_kg || null,
      profile.activity_level || "Moderate",
      profile.goal || "Maintain",
      calorieTarget
    ]
  );
}

async function updateCalorieTarget(userId, dailyCalorieTarget) {
  await pool.query(
    `UPDATE user_profiles SET daily_calorie_target = ? WHERE user_id = ?`,
    [Number(dailyCalorieTarget), userId]
  );
}

async function getFull(userId) {
  const [rows] = await pool.query("SELECT * FROM user_profiles WHERE user_id = ?", [userId]);
  return rows[0] || null;
}

async function getCalorieTarget(userId) {
  const [rows] = await pool.query("SELECT daily_calorie_target FROM user_profiles WHERE user_id = ?", [userId]);
  return rows[0] || null;
}

async function updateMacroTargets(userId, proteinTarget, carbsTarget, fatTarget) {
  await pool.query(
    `UPDATE user_profiles
     SET protein_target_g = ?, carbs_target_g = ?, fat_target_g = ?
     WHERE user_id = ?`,
    [proteinTarget, carbsTarget, fatTarget, userId]
  );
}

// returns affectedRows
async function updateWaterTarget(userId, waterTargetMl) {
  const [result] = await pool.query(
    "UPDATE user_profiles SET water_target_ml = ? WHERE user_id = ?",
    [waterTargetMl, userId]
  );
  return result.affectedRows;
}

async function getWaterTarget(userId) {
  const [rows] = await pool.query(
    "SELECT water_target_ml FROM user_profiles WHERE user_id = ?",
    [userId]
  );
  return rows[0] || null;
}

async function getDashboardTargets(userId) {
  const [rows] = await pool.query(
    `SELECT daily_calorie_target, weight_kg, goal,
      protein_target_g, carbs_target_g, fat_target_g, water_target_ml
     FROM user_profiles
     WHERE user_id = ?`,
    [userId]
  );
  return rows[0] || null;
}

module.exports = {
  getWithUser,
  upsert,
  updateCalorieTarget,
  getFull,
  getCalorieTarget,
  updateMacroTargets,
  updateWaterTarget,
  getWaterTarget,
  getDashboardTargets
};
