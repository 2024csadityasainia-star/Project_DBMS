const asyncHandler = require("../middlewares/asyncHandler");
const { demoUserId } = require("../config/env");
const { requirePlan } = require("../middlewares/planGuard");
const medicalRecordModel = require("../models/medicalRecordModel");

exports.listRecords = asyncHandler(async (req, res) => {
  const allowedPlan = await requirePlan(req.params.userId, "Basic", res, "Medical history guidance");
  if (!allowedPlan) return;

  res.json(await medicalRecordModel.listByUser(req.params.userId));
});

exports.createRecord = asyncHandler(async (req, res) => {
  const { userId = demoUserId, conditionName, dietaryRestriction, notes } = req.body;
  const allowedPlan = await requirePlan(userId, "Basic", res, "Medical history guidance");
  if (!allowedPlan) return;

  if (!conditionName || !dietaryRestriction) {
    return res.status(400).json({ message: "Condition and restriction are required." });
  }

  const recordId = await medicalRecordModel.create({ userId, conditionName, dietaryRestriction, notes });

  res.status(201).json({ recordId });
});

exports.deleteRecord = asyncHandler(async (req, res) => {
  const userId = Number(req.query.userId || demoUserId);
  const allowedPlan = await requirePlan(userId, "Basic", res, "Medical history guidance");
  if (!allowedPlan) return;

  const affectedRows = await medicalRecordModel.remove(req.params.recordId, userId);

  if (!affectedRows) {
    return res.status(404).json({ message: "Medical record not found for this user." });
  }

  res.json({ message: "Medical record removed." });
});
