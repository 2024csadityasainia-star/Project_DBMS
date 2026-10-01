const { conditionGuidanceRules, generalGuidance } = require("../config/healthRules");

function uniqueItems(items) {
  return [...new Set(items.filter(Boolean).map(item => String(item).trim()).filter(Boolean))];
}

function getConditionGuidance(records) {
  const matched = [];

  records.forEach(record => {
    const text = `${record.condition_name || ""} ${record.dietary_restriction || ""} ${record.notes || ""}`.toLowerCase();
    conditionGuidanceRules.forEach(rule => {
      if (rule.keywords.some(keyword => text.includes(keyword)) && !matched.some(item => item.title === rule.title)) {
        matched.push(rule);
      }
    });
  });

  const conditionGuidance = matched.length ? matched : [generalGuidance];

  return {
    conditionGuidance,
    foodsToPrefer: uniqueItems(conditionGuidance.flatMap(rule => rule.prefer)).slice(0, 14),
    foodsToLimit: uniqueItems(conditionGuidance.flatMap(rule => rule.limit)).slice(0, 14),
    notes: uniqueItems(conditionGuidance.flatMap(rule => rule.notes))
  };
}

function buildDashboardHealthSummary(records) {
  const guidance = getConditionGuidance(records);
  const matchedTitles = guidance.conditionGuidance
    .map(rule => rule.title)
    .filter(title => title !== generalGuidance.title);
  const savedConditionNames = uniqueItems(records.map(record => record.condition_name));
  const titles = matchedTitles.length ? matchedTitles : savedConditionNames;
  const conditionText = titles.length
    ? titles.join(", ")
    : "your general health profile";
  const prefer = guidance.foodsToPrefer.slice(0, 3).join(", ");
  const limit = guidance.foodsToLimit.slice(0, 3).join(", ");

  return {
    focus: titles.length
      ? `Today's focus for ${conditionText}: prefer ${prefer || "balanced meals"} and limit ${limit || "processed foods"}.`
      : "Add your medical history to get a condition-specific health summary on the dashboard.",
    details: titles.length
      ? `Based on your saved medical history, keep meals aligned with ${conditionText}. Prefer ${prefer || "whole foods"} and be careful with ${limit || "highly processed foods"}.`
      : "No medical condition is saved yet. Add diabetes, heart issues, thyroid, acidity, anemia, kidney concerns, or other history to personalize this summary.",
    focusPoints: guidance.notes.slice(0, 3)
  };
}

module.exports = { uniqueItems, getConditionGuidance, buildDashboardHealthSummary };
