const asyncHandler = require("../middlewares/asyncHandler");
const { requirePlan } = require("../middlewares/planGuard");
const profileModel = require("../models/profileModel");
const recommendationModel = require("../models/recommendationModel");
const medicalRecordModel = require("../models/medicalRecordModel");
const { calculateTargets } = require("../utilities/nutrition");
const { getConditionGuidance } = require("../utilities/healthHelpers");

exports.getRecommendations = asyncHandler(async (req, res) => {
  const currentPlan = await requirePlan(req.params.userId, "Basic", res, "Diet recommendations");
  if (!currentPlan) return;

  let recommendation = await recommendationModel.getLatest(req.params.userId);

  if (!recommendation) {
    const profile = await profileModel.getFull(req.params.userId);
    const targets = calculateTargets(profile || {});
    const recommendationId = await recommendationModel.insert(
      req.params.userId,
      targets.calories,
      targets.protein,
      targets.carbs,
      targets.fat
    );
    recommendation = {
      recommendation_id: recommendationId,
      user_id: Number(req.params.userId),
      recommended_calories: targets.calories,
      protein_g: targets.protein,
      carbs_g: targets.carbs,
      fat_g: targets.fat
    };
  }

  const notes = await recommendationModel.getNotes(recommendation.recommendation_id);
  const medical = await medicalRecordModel.listRecent(req.params.userId);
  const healthGuidance = getConditionGuidance(medical);

  res.json({
    ...recommendation,
    notes: [
      ...notes.map(note => note.note_text),
      ...medical.map(record => `For ${record.condition_name}, consider: ${record.dietary_restriction}.`),
      ...healthGuidance.notes
    ],
    conditionGuidance: healthGuidance.conditionGuidance.map(rule => ({
      title: rule.title,
      summary: rule.summary
    })),
    foodsToPrefer: healthGuidance.foodsToPrefer,
    foodsToLimit: healthGuidance.foodsToLimit
  });
});
