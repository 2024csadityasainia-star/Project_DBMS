const asyncHandler = require("../middlewares/asyncHandler");
const { demoUserId } = require("../config/env");
const { requirePlan } = require("../middlewares/planGuard");
const waterLogModel = require("../models/waterLogModel");
const profileModel = require("../models/profileModel");
const { isoDateOrToday } = require("../utilities/dateHelpers");

exports.getWaterLogs = asyncHandler(async (req, res) => {
  const currentPlan = await requirePlan(req.params.userId, "Premium", res, "Water intake tracking");
  if (!currentPlan) return;

  const logDate = isoDateOrToday(req.query.date);

  const totals = await waterLogModel.getDayTotals(req.params.userId, logDate);
  const profile = await profileModel.getWaterTarget(req.params.userId);

  res.json({
    date: logDate,
    totalMl: Number(totals?.total_ml || 0),
    targetMl: Number(profile?.water_target_ml || 2500),
    entries: Number(totals?.entries || 0)
  });
});

exports.createWaterLog = asyncHandler(async (req, res) => {
  const { userId = demoUserId, intakeMl, logDate } = req.body;
  const currentPlan = await requirePlan(userId, "Premium", res, "Water intake tracking");
  if (!currentPlan) return;

  const amount = Number(intakeMl);
  const savedLogDate = isoDateOrToday(logDate);

  if (!amount || amount <= 0 || amount > 5000) {
    return res.status(400).json({ message: "Enter a valid water amount in ml." });
  }

  const waterLogId = await waterLogModel.insert(userId, Math.round(amount), savedLogDate);

  res.status(201).json({ waterLogId, intakeMl: Math.round(amount), logDate: savedLogDate });
});
