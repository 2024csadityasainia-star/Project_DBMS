const router = require("express").Router();
const foodLogController = require("../controllers/foodLogController");

router.get("/food-logs/:userId", foodLogController.listFoodLogs);
router.post("/food-logs", foodLogController.createFoodLog);

module.exports = router;
