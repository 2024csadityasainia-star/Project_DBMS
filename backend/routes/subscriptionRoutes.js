const router = require("express").Router();
const subscriptionController = require("../controllers/subscriptionController");

router.get("/access/:userId", subscriptionController.getAccess);
router.get("/subscription-plans", subscriptionController.listPlans);
router.get("/subscriptions/:userId", subscriptionController.getUserSubscription);
router.post("/subscriptions", subscriptionController.createSubscription);
router.patch("/subscriptions/:subscriptionId", subscriptionController.updateSubscription);

module.exports = router;
