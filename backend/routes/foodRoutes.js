const router = require("express").Router();
const foodController = require("../controllers/foodController");

router.get("/foods", foodController.listFoods);
router.get("/foods/search", foodController.searchFoods);

module.exports = router;
