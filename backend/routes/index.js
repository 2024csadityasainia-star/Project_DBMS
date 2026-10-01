const router = require("express").Router();

router.use(require("./healthRoutes"));
router.use(require("./authRoutes"));
router.use(require("./profileRoutes"));
router.use(require("./foodRoutes"));
router.use(require("./foodLogRoutes"));
router.use(require("./medicalRecordRoutes"));
router.use(require("./recommendationRoutes"));
router.use(require("./subscriptionRoutes"));
router.use(require("./waterRoutes"));
router.use(require("./dashboardRoutes"));

module.exports = router;
