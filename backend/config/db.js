const mysql = require("mysql2/promise");
require("./env"); // makes sure .env is loaded before the pool reads process.env

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "nutritrack_db",
  port: Number(process.env.DB_PORT || 3306),
  connectTimeout: 5000,
  waitForConnections: true,
  connectionLimit: 10
});

module.exports = pool;
