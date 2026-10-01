const asyncHandler = require("../middlewares/asyncHandler");
const userModel = require("../models/userModel");
const profileModel = require("../models/profileModel");
const recommendationModel = require("../models/recommendationModel");
const { calculateTargets } = require("../utilities/nutrition");

exports.getProfile = asyncHandler(async (req, res) => {
  const profile = await profileModel.getWithUser(req.params.userId);

  if (!profile) return res.status(404).json({ message: "User not found." });

  res.json(profile);
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const profile = req.body;
  const targets = calculateTargets(profile);
  const calorieTarget = (profile.daily_calorie_target && Number(profile.daily_calorie_target) > 0)
    ? Number(profile.daily_calorie_target)
    : targets.calories;

  await userModel.updateFullName(req.params.userId, profile.full_name || "NutriTrack User");
  await profileModel.upsert(req.params.userId, profile, calorieTarget);
  await recommendationModel.insert(req.params.userId, calorieTarget, targets.protein, targets.carbs, targets.fat);

  res.json({ message: "Profile saved.", targets: { ...targets, calories: calorieTarget } });
});

exports.updateCalories = asyncHandler(async (req, res) => {
  const { dailyCalorieTarget } = req.body;
  if (!dailyCalorieTarget || Number(dailyCalorieTarget) <= 0) {
    return res.status(400).json({ message: "A valid daily calorie target is required." });
  }

  await profileModel.updateCalorieTarget(req.params.userId, dailyCalorieTarget);

  const profile = (await profileModel.getFull(req.params.userId)) || {};
  const weight = Number(profile.weight_kg || 65);

  const protein = Math.round(weight * 1.2);
  const carbs = Math.round((Number(dailyCalorieTarget) * 0.5) / 4);
  const fat = Math.round((Number(dailyCalorieTarget) * 0.27) / 9);

  await recommendationModel.insert(req.params.userId, Number(dailyCalorieTarget), protein, carbs, fat);

  res.json({ message: "Calorie target updated successfully.", dailyCalorieTarget });
});

exports.updateMacros = asyncHandler(async (req, res) => {
  const proteinTarget = Math.round(Number(req.body.proteinTarget));
  const carbsTarget = Math.round(Number(req.body.carbsTarget));
  const fatTarget = Math.round(Number(req.body.fatTarget));

  if (proteinTarget <= 0 || carbsTarget <= 0 || fatTarget <= 0) {
    return res.status(400).json({ message: "Valid protein, carbs and fat targets are required." });
  }

  if (proteinTarget > 1000 || carbsTarget > 1500 || fatTarget > 1000) {
    return res.status(400).json({ message: "Macro targets are too high. Please enter realistic gram values." });
  }

  const profileRow = await profileModel.getCalorieTarget(req.params.userId);
  if (!profileRow) {
    return res.status(404).json({ message: "User profile not found." });
  }

  await profileModel.updateMacroTargets(req.params.userId, proteinTarget, carbsTarget, fatTarget);

  await recommendationModel.insert(
    req.params.userId,
    Number(profileRow.daily_calorie_target || 2000),
    proteinTarget,
    carbsTarget,
    fatTarget
  );

  res.json({
    message: "Macro targets updated successfully.",
    targets: { proteinTarget, carbsTarget, fatTarget }
  });
});

exports.updateWaterTarget = asyncHandler(async (req, res) => {
  const waterTargetMl = Math.round(Number(req.body.waterTargetMl));

  if (!waterTargetMl || waterTargetMl < 500 || waterTargetMl > 10000) {
    return res.status(400).json({ message: "Enter a valid water target between 500 and 10000 ml." });
  }

  const affectedRows = await profileModel.updateWaterTarget(req.params.userId, waterTargetMl);

  if (!affectedRows) {
    return res.status(404).json({ message: "User profile not found." });
  }

  res.json({ message: "Water target updated successfully.", waterTargetMl });
});
