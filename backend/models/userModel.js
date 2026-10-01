const pool = require("../config/db");

async function findIdByEmail(email) {
  const [rows] = await pool.query("SELECT user_id FROM users WHERE email = ?", [email]);
  return rows[0] || null;
}

async function create({ fullName, email, password }) {
  const [result] = await pool.query(
    "INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?)",
    [fullName, email, password]
  );
  return result.insertId;
}

async function createEmptyProfile(userId) {
  await pool.query("INSERT INTO user_profiles (user_id) VALUES (?)", [userId]);
}

async function findByCredentials(email, password) {
  const [rows] = await pool.query(
    "SELECT user_id, full_name, email FROM users WHERE email = ? AND password_hash = ?",
    [email, password]
  );
  return rows[0] || null;
}

async function updateFullName(userId, fullName) {
  await pool.query("UPDATE users SET full_name = ? WHERE user_id = ?", [fullName, userId]);
}

module.exports = { findIdByEmail, create, createEmptyProfile, findByCredentials, updateFullName };
