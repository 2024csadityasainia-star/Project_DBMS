const pool = require("../config/db");
const { normalizePlanName } = require("../utilities/planHelpers");

async function getUserPlan(userId) {
  const [rows] = await pool.query(
    `SELECT sp.plan_name
     FROM subscriptions s
     JOIN subscription_plans sp ON sp.plan_id = s.plan_id
     WHERE s.user_id = ? AND s.payment_status = 'Active' AND s.end_date >= CURRENT_DATE
     ORDER BY s.subscription_id DESC
     LIMIT 1`,
    [userId]
  );

  return normalizePlanName(rows[0]?.plan_name || "Free");
}

async function listPlans() {
  const [rows] = await pool.query("SELECT * FROM subscription_plans ORDER BY price");
  return rows;
}

async function findPlanByName(planName) {
  const [rows] = await pool.query("SELECT * FROM subscription_plans WHERE plan_name = ?", [planName]);
  return rows[0] || null;
}

async function getCurrentForUser(userId) {
  const [rows] = await pool.query(
    `SELECT s.*, sp.plan_name, sp.price, sp.duration_days, sp.description,
       CASE
         WHEN s.payment_status = 'Active' AND s.end_date >= CURRENT_DATE THEN 1
         ELSE 0
       END AS is_active
     FROM subscriptions s
     JOIN subscription_plans sp ON sp.plan_id = s.plan_id
     WHERE s.user_id = ?
     ORDER BY is_active DESC, s.subscription_id DESC
     LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

async function create(userId, plan) {
  await pool.query(
    `INSERT INTO subscriptions (user_id, plan_id, start_date, end_date, payment_status, auto_renew)
     VALUES (?, ?, CURRENT_DATE, DATE_ADD(CURRENT_DATE, INTERVAL ? DAY), 'Active', TRUE)`,
    [userId, plan.plan_id, plan.duration_days]
  );
}

async function getLatestIdForUser(userId) {
  const [rows] = await pool.query(
    "SELECT subscription_id FROM subscriptions WHERE user_id = ? ORDER BY subscription_id DESC LIMIT 1",
    [userId]
  );
  return rows[0].subscription_id;
}

async function createPayment(subscriptionId, amount, paymentMethod) {
  await pool.query(
    "INSERT INTO payments (subscription_id, amount, payment_method, payment_status) VALUES (?, ?, ?, 'Success')",
    [subscriptionId, amount, paymentMethod]
  );
}

async function update(subscriptionId, fields, values) {
  await pool.query(
    `UPDATE subscriptions SET ${fields.join(", ")} WHERE subscription_id = ?`,
    [...values, subscriptionId]
  );
}

module.exports = {
  getUserPlan,
  listPlans,
  findPlanByName,
  getCurrentForUser,
  create,
  getLatestIdForUser,
  createPayment,
  update
};
