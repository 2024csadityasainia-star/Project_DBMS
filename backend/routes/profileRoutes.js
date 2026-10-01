const router = require("express").Router();
const profileController = require("../controllers/profileController");

router.get("/profile/:userId", profileController.getProfile);
router.put("/profile/:userId", profileController.updateProfile);
router.patch("/profile/:userId/calories", profileController.updateCalories);
router.patch("/profile/:userId/macros", profileController.updateMacros);
router.patch("/profile/:userId/water-target", profileController.updateWaterTarget);

module.exports = router;
