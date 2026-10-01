const router = require("express").Router();
const waterController = require("../controllers/waterController");

router.get("/water-logs/:userId", waterController.getWaterLogs);
router.post("/water-logs", waterController.createWaterLog);

module.exports = router;
