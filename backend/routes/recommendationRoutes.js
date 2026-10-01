const router = require("express").Router();
const recommendationController = require("../controllers/recommendationController");

router.get("/recommendations/:userId", recommendationController.getRecommendations);

module.exports = router;
