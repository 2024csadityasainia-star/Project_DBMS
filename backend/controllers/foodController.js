const asyncHandler = require("../middlewares/asyncHandler");
const foodModel = require("../models/foodModel");
const {
  apiCache,
  CACHE_TTL,
  STALE_CACHE_TTL,
  buildFoodSearchResponse,
  buildSearchMeta
} = require("../utilities/foodSearch");
const {
  fetchExternalFoodResults,
  refreshExternalFoodCache
} = require("../utilities/externalFoodProviders");

exports.listFoods = asyncHandler(async (_req, res) => {
  res.json(await foodModel.listAll());
});

exports.searchFoods = asyncHandler(async (req, res) => {
  const startedAt = Date.now();
  const searchTerm = String(req.query.q || "").trim();
  const includeLocal = String(req.query.includeLocal || "").toLowerCase() === "true";
  const fallbackLocal = String(req.query.fallbackLocal || "").toLowerCase() === "true";
  const includeMeta = String(req.query.meta || "").toLowerCase() === "true";

  if (searchTerm.length < 2) {
    return res.json(includeMeta
      ? { foods: [], meta: buildSearchMeta([], searchTerm, startedAt, "skipped") }
      : []);
  }

  const cacheKey = searchTerm.toLowerCase();
  let localFoods = [];
  let apiFoods = [];
  let cacheStatus = "miss";

  const cached = apiCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    console.log(`[Search] "${searchTerm}" => Cache HIT (api: ${cached.data.length})`);
    apiFoods = cached.data;
    cacheStatus = "fresh-cache";
  } else if (cached && (Date.now() - cached.timestamp < STALE_CACHE_TTL)) {
    console.log(`[Search] "${searchTerm}" => Stale cache HIT. Refreshing external APIs in background...`);
    apiFoods = cached.data;
    cacheStatus = "stale-cache";
    refreshExternalFoodCache(searchTerm, cacheKey);
  } else {
    console.log(`[Search] "${searchTerm}" => Internet API MISS. Querying external APIs...`);
    apiFoods = await fetchExternalFoodResults(searchTerm);

    if (apiCache.size > 200) {
      const oldestKey = apiCache.keys().next().value;
      apiCache.delete(oldestKey);
    }
    apiCache.set(cacheKey, { data: apiFoods, timestamp: Date.now() });
    cacheStatus = "internet";
  }

  if (includeLocal || (fallbackLocal && !apiFoods.length)) {
    localFoods = await foodModel.searchLocal(searchTerm);
  }

  console.log(`[Search] "${searchTerm}" => local: ${localFoods.length}, api: ${apiFoods.length}`);

  const foods = buildFoodSearchResponse(localFoods, apiFoods, searchTerm);

  res.json(includeMeta
    ? { foods, meta: buildSearchMeta(foods, searchTerm, startedAt, cacheStatus) }
    : foods);
});
