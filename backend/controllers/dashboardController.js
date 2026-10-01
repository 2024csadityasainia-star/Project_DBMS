const asyncHandler = require("../middlewares/asyncHandler");
const foodLogModel = require("../models/foodLogModel");
const profileModel = require("../models/profileModel");
const subscriptionModel = require("../models/subscriptionModel");
const medicalRecordModel = require("../models/medicalRecordModel");
const waterLogModel = require("../models/waterLogModel");
const { canUsePlan, planAccessPayload } = require("../utilities/planHelpers");
const { buildDashboardHealthSummary } = require("../utilities/healthHelpers");
const { isoDateOrToday } = require("../utilities/dateHelpers");

exports.getDashboard = asyncHandler(async (req, res) => {
  const dashboardDate = isoDateOrToday(req.query.date);

  const row = await foodLogModel.getDaySummary(req.params.userId, dashboardDate);
  const profile = await profileModel.getDashboardTargets(req.params.userId);
  const currentPlan = await subscriptionModel.getUserPlan(req.params.userId);
  const medical = await medicalRecordModel.listRecent(req.params.userId);
  const healthSummary = buildDashboardHealthSummary(medical);

  const recommended = profile?.daily_calorie_target || 2000;
  const proteinTarget = Number(profile?.protein_target_g) || Math.round(Number(profile?.weight_kg || 65) * 1.2);
  const carbsTarget = Number(profile?.carbs_target_g) || Math.round((recommended * 0.5) / 4);
  const fatTarget = Number(profile?.fat_target_g) || Math.round((recommended * 0.27) / 9);
  const waterTargetMl = Number(profile?.water_target_ml) || 2500;

  const water = await waterLogModel.getDayTotals(req.params.userId, dashboardDate);

  res.json({
    consumedCalories: Number(row.consumed_calories || 0),
    recommendedCalories: recommended,
    mealsLogged: Number(row.meals_logged || 0),
    proteinG: Number(row.protein_g || 0),
    carbsG: Number(row.carbs_g || 0),
    fatG: Number(row.fat_g || 0),
    proteinTarget,
    carbsTarget,
    fatTarget,
    waterMl: Number(water?.total_ml || 0),
    waterTargetMl,
    plan: currentPlan,
    access: planAccessPayload(currentPlan),
    date: dashboardDate,
    summary: canUsePlan(currentPlan, "Basic")
      ? healthSummary.focus
      : "Upgrade to Basic to unlock medical-history based daily focus and personalized recommendations.",
    healthSummary: canUsePlan(currentPlan, "Basic")
      ? healthSummary.details
      : "Free includes calorie tracking. Basic adds medical history and personalized diet guidance; Premium adds macro and water insights.",
    healthFocusPoints: canUsePlan(currentPlan, "Premium")
      ? healthSummary.focusPoints
      : []
  });
});
