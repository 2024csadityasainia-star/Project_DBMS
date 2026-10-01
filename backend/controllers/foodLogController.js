const asyncHandler = require("../middlewares/asyncHandler");
const { demoUserId } = require("../config/env");
const { planLimits } = require("../config/plans");
const foodModel = require("../models/foodModel");
const foodLogModel = require("../models/foodLogModel");
const subscriptionModel = require("../models/subscriptionModel");
const { isoDateOrToday } = require("../utilities/dateHelpers");

exports.listFoodLogs = asyncHandler(async (req, res) => {
  res.json(await foodLogModel.listByUser(req.params.userId));
});

exports.createFoodLog = asyncHandler(async (req, res) => {
  const { userId = demoUserId, foodId, food: incomingFood, mealType, quantityG, logDate } = req.body;
  let selectedFoodId = foodId;
  const savedLogDateString = isoDateOrToday(logDate);
  const currentPlan = await subscriptionModel.getUserPlan(userId);
  const limits = planLimits[currentPlan];

  const dailyCount = await foodLogModel.countForDate(userId, savedLogDateString);

  if (dailyCount >= limits.dailyFoodLogs) {
    return res.status(403).json({
      message: `${currentPlan} plan allows ${limits.dailyFoodLogs} food logs per day. Upgrade to continue logging more meals today.`,
      currentPlan,
      requiredPlan: currentPlan === "Free" ? "Basic" : "Premium",
      upgradeRequired: true
    });
  }

  if (!selectedFoodId && incomingFood?.food_name) {
    const storedName = incomingFood.brand
      ? `${incomingFood.food_name} - ${incomingFood.brand}`.slice(0, 100)
      : incomingFood.food_name.slice(0, 100);

    await foodModel.upsertExternal(
      storedName,
      Number(incomingFood.calories_per_100g || 0),
      Number(incomingFood.protein_per_100g || 0),
      Number(incomingFood.carbs_per_100g || 0),
      Number(incomingFood.fat_per_100g || 0)
    );

    selectedFoodId = await foodModel.findIdByName(storedName);
  }

  const food = await foodModel.findById(selectedFoodId);

  if (!food || !mealType || Number(quantityG) <= 0) {
    return res.status(400).json({ message: "Valid food, meal type and quantity are required." });
  }

  const factor = Number(quantityG) / 100;
  const calories = Number(food.calories_per_100g) * factor;
  const protein = Number(food.protein_per_100g) * factor;
  const carbs = Number(food.carbs_per_100g) * factor;
  const fat = Number(food.fat_per_100g) * factor;

  const logId = await foodLogModel.insert({
    userId,
    foodId: selectedFoodId,
    mealType,
    quantityG,
    calories,
    protein,
    carbs,
    fat,
    logDate: savedLogDateString
  });

  res.status(201).json({ logId, calories, protein, carbs, fat });
});
