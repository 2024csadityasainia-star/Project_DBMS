const asyncHandler = require("../middlewares/asyncHandler");
const { demoUserId } = require("../config/env");
const { planBenefits, planLimits } = require("../config/plans");
const subscriptionModel = require("../models/subscriptionModel");
const { normalizePlanName, planAccessPayload } = require("../utilities/planHelpers");

exports.getAccess = asyncHandler(async (req, res) => {
  const currentPlan = await subscriptionModel.getUserPlan(req.params.userId);
  res.json(planAccessPayload(currentPlan));
});

exports.listPlans = asyncHandler(async (_req, res) => {
  const rows = await subscriptionModel.listPlans();
  res.json(rows.map(row => ({
    ...row,
    benefits: planBenefits[normalizePlanName(row.plan_name)],
    limits: planLimits[normalizePlanName(row.plan_name)]
  })));
});

exports.getUserSubscription = asyncHandler(async (req, res) => {
  res.json(await subscriptionModel.getCurrentForUser(req.params.userId));
});

exports.createSubscription = asyncHandler(async (req, res) => {
  const { userId = demoUserId, planName, paymentMethod = "Demo Payment" } = req.body;
  const plan = await subscriptionModel.findPlanByName(planName);

  if (!plan) return res.status(400).json({ message: "Plan not found." });

  await subscriptionModel.create(userId, plan);
  const subscriptionId = await subscriptionModel.getLatestIdForUser(userId);
  await subscriptionModel.createPayment(subscriptionId, plan.price, paymentMethod);

  res.status(201).json({ message: "Subscription updated." });
});

exports.updateSubscription = asyncHandler(async (req, res) => {
  const fields = [];
  const values = [];

  if (typeof req.body.autoRenew === "boolean") {
    fields.push("auto_renew = ?");
    values.push(req.body.autoRenew);
  }

  if (req.body.renewDays) {
    fields.push("end_date = DATE_ADD(GREATEST(end_date, CURRENT_DATE), INTERVAL ? DAY)");
    values.push(req.body.renewDays);
  }

  if (!fields.length) return res.status(400).json({ message: "No subscription update provided." });

  await subscriptionModel.update(req.params.subscriptionId, fields, values);
  res.json({ message: "Subscription saved." });
});
