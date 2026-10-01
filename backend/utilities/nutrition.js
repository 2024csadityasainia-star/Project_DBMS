function calculateTargets(profile) {
  const weight = Number(profile.weight_kg || 65);
  const height = Number(profile.height_cm || 170);
  const age = Number(profile.age || 22);
  const genderOffset = profile.gender === "Female" ? -161 : 5;
  const activityMultiplier = {
    Sedentary: 1.2,
    Moderate: 1.55,
    Active: 1.725
  }[profile.activity_level] || 1.55;

  let calories = Math.round((10 * weight + 6.25 * height - 5 * age + genderOffset) * activityMultiplier);

  if (profile.goal === "Weight Loss") calories -= 400;
  if (profile.goal === "Gain") calories += 350;

  calories = Math.max(calories, 1200);

  return {
    calories,
    protein: Math.round(weight * 1.2),
    carbs: Math.round((calories * 0.5) / 4),
    fat: Math.round((calories * 0.27) / 9)
  };
}

module.exports = { calculateTargets };
