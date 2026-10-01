const pool = require("../config/db");
const asyncHandler = require("../middlewares/asyncHandler");

exports.check = asyncHandler(async (_req, res) => {
  await pool.query("SELECT 1");
  res.json({ status: "ok", database: process.env.DB_NAME || "nutritrack_db" });
});
