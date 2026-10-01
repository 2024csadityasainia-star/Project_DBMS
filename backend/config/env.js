const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });

module.exports = {
  port: process.env.PORT || 3000,
  demoUserId: 1,
  frontendDir: path.join(__dirname, "..", "..", "frontend", "public")
};
