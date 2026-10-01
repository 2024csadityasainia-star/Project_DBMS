const { INDIAN_KEYWORDS } = require("../config/foodSeeds");

const apiCache = new Map();
const CACHE_TTL = 3 * 60 * 1000; // 3 minutes
const STALE_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const pendingApiSearches = new Set();
const EXTERNAL_SEARCH_TIMEOUT_MS = 3200;

function calculateIndianRelevanceScore(food, searchTerm) {
  let score = 0;
  const lowerName = String(food.food_name || "").toLowerCase();
  const lowerSearch = searchTerm.toLowerCase();

  if (lowerName === lowerSearch) score += 300;
  if (lowerName.startsWith(lowerSearch)) score += 180;
  if (lowerName.includes(lowerSearch)) score += 100;

  if (String(food.source || "").toLowerCase().includes("india")) score += 40;
  if (food.source === "local") score += 20;

  for (const keyword of INDIAN_KEYWORDS) {
    if (lowerName.includes(keyword)) {
      score += 30;
      break;
    }
  }

  if (lowerName.includes(lowerSearch) && INDIAN_KEYWORDS.some(k => lowerSearch.includes(k))) {
    score += 20;
  }

  return score;
}

function buildFoodSearchResponse(localFoods, apiFoods, searchTerm) {
  const seen = new Set();
  const allFoods = [...localFoods, ...apiFoods].filter(food => {
    if (!food.food_name || (food.source !== "FatSecret" && !food.calories_per_100g)) return false;
    const key = `${food.food_name}-${food.brand}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const scoredFoods = allFoods.map(food => ({
    ...food,
    score: calculateIndianRelevanceScore(food, searchTerm)
  }));

  scoredFoods.sort((a, b) => b.score - a.score);

  return scoredFoods.map(({ score, ...rest }) => rest).slice(0, 40);
}

function databaseLabel(source) {
  const value = String(source || "Unknown").toLowerCase();

  if (value.includes("open food facts india")) return "Open Food Facts India";
  if (value.includes("open food facts in")) return "Open Food Facts India";
  if (value.includes("open food facts")) return "Open Food Facts";
  if (value.includes("usda")) return "USDA";
  if (value.includes("nutritionix")) return "Nutritionix";
  if (value.includes("calorieninjas")) return "CalorieNinjas";
  if (value.includes("edamam")) return "Edamam";
  if (value.includes("spoonacular")) return "Spoonacular";
  if (value.includes("fatsecret")) return "FatSecret";
  if (value.includes("bon happetee")) return "Bon Happetee";
  if (value.includes("apyflux")) return "Apyflux Indian Food API";
  if (value.includes("indian nutrition")) return "Indian Nutrition API";
  if (value.includes("local")) return "Local Database";

  return source || "Unknown";
}

function buildSearchMeta(foods, searchTerm, startedAt, cacheStatus) {
  const counts = new Map();

  foods.forEach(food => {
    const label = databaseLabel(food.source);
    counts.set(label, (counts.get(label) || 0) + 1);
  });

  const databases = [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  return {
    query: searchTerm,
    totalResults: foods.length,
    databases,
    cacheStatus,
    durationMs: Date.now() - startedAt
  };
}

module.exports = {
  apiCache,
  CACHE_TTL,
  STALE_CACHE_TTL,
  pendingApiSearches,
  EXTERNAL_SEARCH_TIMEOUT_MS,
  calculateIndianRelevanceScore,
  buildFoodSearchResponse,
  databaseLabel,
  buildSearchMeta
};
