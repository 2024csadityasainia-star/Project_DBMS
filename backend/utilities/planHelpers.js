const { planRank, planBenefits, planLimits } = require("../config/plans");

function normalizePlanName(planName) {
  return planRank[planName] !== undefined ? planName : "Free";
}

function canUsePlan(planName, requiredPlan) {
  return planRank[normalizePlanName(planName)] >= planRank[requiredPlan];
}

function planAccessPayload(planName) {
  const normalizedPlan = normalizePlanName(planName);

  return {
    currentPlan: normalizedPlan,
    rank: planRank[normalizedPlan],
    limits: planLimits[normalizedPlan],
    benefits: planBenefits[normalizedPlan],
    allPlans: Object.entries(planBenefits).map(([name, benefits]) => ({
      name,
      rank: planRank[name],
      benefits,
      limits: planLimits[name]
    }))
  };
}

module.exports = { normalizePlanName, canUsePlan, planAccessPayload };
