const planRank = { Free: 0, Basic: 1, Premium: 2 };

const planBenefits = {
  Free: [
    "Profile setup",
    "Basic food search",
    "Daily calorie dashboard",
    "Up to 5 food logs per day"
  ],
  Basic: [
    "Everything in Free",
    "Up to 30 food logs per day",
    "Medical history based guidance",
    "Personalized calorie and macro targets",
    "Food recommendations to prefer and limit"
  ],
  Premium: [
    "Everything in Basic",
    "Water intake tracking",
    "Detailed macro progress panel",
    "Unlimited-style daily food logging",
    "Advanced health focus insights"
  ]
};

const planLimits = {
  Free: { dailyFoodLogs: 5, waterTracking: false, recommendations: false, medicalHistory: false, advancedMacros: false },
  Basic: { dailyFoodLogs: 30, waterTracking: false, recommendations: true, medicalHistory: true, advancedMacros: false },
  Premium: { dailyFoodLogs: 999, waterTracking: true, recommendations: true, medicalHistory: true, advancedMacros: true }
};

module.exports = { planRank, planBenefits, planLimits };
