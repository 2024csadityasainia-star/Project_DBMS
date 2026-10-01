const subscriptionModel = require("../models/subscriptionModel");
const { canUsePlan } = require("../utilities/planHelpers");

// Returns the user's current plan if it satisfies requiredPlan.
// Otherwise sends a 403 response and returns null (callers must `return` when null).
async function requirePlan(userId, requiredPlan, res, featureName) {
  const currentPlan = await subscriptionModel.getUserPlan(userId);

  if (canUsePlan(currentPlan, requiredPlan)) {
    return currentPlan;
  }

  res.status(403).json({
    message: `${featureName} is included in ${requiredPlan}. Upgrade your plan to continue.`,
    currentPlan,
    requiredPlan,
    upgradeRequired: true
  });

  return null;
}

module.exports = { requirePlan };
