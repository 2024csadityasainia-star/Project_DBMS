const router = require("express").Router();
const healthController = require("../controllers/healthController");

router.get("/health", healthController.check);

module.exports = router;
