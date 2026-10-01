const router = require("express").Router();
const medicalRecordController = require("../controllers/medicalRecordController");

router.get("/medical-records/:userId", medicalRecordController.listRecords);
router.post("/medical-records", medicalRecordController.createRecord);
router.delete("/medical-records/:recordId", medicalRecordController.deleteRecord);

module.exports = router;
